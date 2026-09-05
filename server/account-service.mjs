import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import argon2 from "argon2";
import pg from "pg";
import { discoverMigrations, migrationStatus } from "./storage/migration-files.mjs";
import { parseOfficeCardGameDatabaseUrl } from "./storage/database-url.mjs";

const { Pool } = pg;
export const SESSION_COOKIE_NAME = "ocg_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_WORK_CONCURRENCY = 2;
export const PASSWORD_WORK_QUEUE_LIMIT = 20;

export class AccountError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = "AccountError";
    this.code = code;
  }
}

export class PasswordWorkGate {
  constructor({ concurrency = PASSWORD_WORK_CONCURRENCY, queueLimit = PASSWORD_WORK_QUEUE_LIMIT } = {}) {
    this.concurrency = Math.max(1, Math.floor(Number(concurrency) || PASSWORD_WORK_CONCURRENCY));
    this.queueLimit = Math.max(0, Math.floor(Number(queueLimit) || 0));
    this.active = 0;
    this.queue = [];
  }

  run(work) {
    return new Promise((resolve, reject) => {
      const item = { work, resolve, reject };
      if (this.active < this.concurrency) this.start(item);
      else if (this.queue.length < this.queueLimit) this.queue.push(item);
      else reject(new AccountError("AUTH_BUSY", "Authentication is temporarily busy. Try again shortly."));
    });
  }

  start(item) {
    this.active += 1;
    Promise.resolve()
      .then(item.work)
      .then(item.resolve, item.reject)
      .finally(() => {
        this.active -= 1;
        const next = this.queue.shift();
        if (next) this.start(next);
      });
  }
}

export function normalizeEmail(value) {
  const email = String(value ?? "").trim().toLowerCase();
  if (email.length < 3 || email.length > EMAIL_MAX_LENGTH || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AccountError("EMAIL_INVALID", "Enter a valid email address.");
  }
  return email;
}

export function validatePassword(value) {
  if (typeof value !== "string" || value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) {
    throw new AccountError("PASSWORD_INVALID", `Password must be ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters.`);
  }
  return value;
}

export function hashOpaqueToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

export function parseCookies(header) {
  const result = new Map();
  for (const part of String(header ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name) result.set(name, value);
  }
  return result;
}

export function sessionTokenFromRequest(req) {
  return parseCookies(req?.headers?.cookie).get(SESSION_COOKIE_NAME) ?? "";
}

export function sessionCookie(token, options = {}) {
  const secure = options.secure === true ? "; Secure" : "";
  const maxAge = options.clear === true ? 0 : Math.max(0, Math.floor((options.ttlMs ?? SESSION_TTL_MS) / 1000));
  const value = options.clear === true ? "" : String(token);
  return `${SESSION_COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${maxAge}`;
}

function safeDbError(error) {
  const code = String(error?.code ?? "");
  if (code === "ECONNREFUSED") return "DB_CONNECTION_REFUSED";
  if (code === "28P01") return "DB_AUTH_FAILED";
  if (code === "57P01") return "DB_SHUTTING_DOWN";
  if (code === "42P01") return "DB_SCHEMA_MISSING";
  return "DB_OPERATION_FAILED";
}

function accountView(row) {
  const view = {
    id:String(row.user_id ?? row.id),
    email:String(row.email),
    status:String(row.status),
    role:String(row.role ?? "PLAYER"),
    createdAt:new Date(row.created_at).getTime()
  };
  if (row.last_active_at != null) view.lastActiveAt = new Date(row.last_active_at).getTime();
  return view;
}

export function isOperationsRole(role) {
  return role === "OPS" || role === "ADMIN";
}

export class PostgresAccountService {
  constructor(options) {
    parseOfficeCardGameDatabaseUrl(options.databaseUrl, { test:options.testDatabase === true });
    this.profileFactory = options.profileFactory;
    this.firstSessionGuideUpdater = options.firstSessionGuideUpdater ?? ((meta) => meta);
    this.preserveMutationError = options.preserveMutationError ?? (() => false);
    this.migrations = discoverMigrations(options.migrationDir);
    this.passwordWork = new PasswordWorkGate({
      concurrency:options.passwordWorkConcurrency,
      queueLimit:options.passwordWorkQueueLimit
    });
    this.pool = options.pool ?? new Pool({
      connectionString:options.databaseUrl,
      max:Math.max(1, Math.min(20, Number(options.poolMax ?? 10))),
      connectionTimeoutMillis:Math.max(1000, Number(options.connectionTimeoutMs ?? 5000)),
      idleTimeoutMillis:Math.max(1000, Number(options.idleTimeoutMs ?? 30000)),
      application_name:"office-card-game-accounts"
    });
    this.readyState = { ok:false, status:"NOT_CHECKED", migrations:{ current:false, applied:0, required:this.migrations.length }, database:{ reachable:false, version:null } };
    this.lastError = null;
    this.operationsCache = null;
    this.pool.on?.("error", (error) => {
      this.lastError = { code:safeDbError(error), at:Date.now() };
      console.error("PostgreSQL account pool failure", this.lastError.code);
    });
  }

  async initialize() {
    const readiness = await this.checkReadiness();
    if (!readiness.ok) console.error("PostgreSQL account persistence initialization failed", this.lastError?.code ?? readiness.status);
    return this;
  }

  async checkReadiness() {
    try {
      const client = await this.pool.connect();
      try {
        const version = await client.query("SHOW server_version");
        const migrations = await migrationStatus(client, this.migrations);
        const schema = await client.query("SELECT to_regclass('public.users') AS users, to_regclass('public.sessions') AS sessions, to_regclass('public.player_profiles') AS profiles");
        const schemaReady = Boolean(schema.rows[0]?.users && schema.rows[0]?.sessions && schema.rows[0]?.profiles);
        this.readyState = {
          ok:Boolean(migrations.current && schemaReady),
          status:migrations.current && schemaReady ? "READY" : "DATABASE_NOT_READY",
          database:{ reachable:true, version:String(version.rows[0]?.server_version ?? "unknown") },
          migrations:{ current:migrations.current, exact:migrations.exact, applied:migrations.applied, required:migrations.required, pending:migrations.missing ?? [], changed:migrations.changed ?? [], unknown:migrations.unknown ?? [] },
          schemaReady
        };
      } finally {
        client.release();
      }
    } catch (error) {
      this.lastError = { code:safeDbError(error), at:Date.now() };
      this.readyState = { ok:false, status:"DATABASE_UNAVAILABLE", database:{ reachable:false, version:null }, migrations:{ current:false, applied:0, required:this.migrations.length }, schemaReady:false };
    }
    return structuredClone(this.readyState);
  }

  requireReady() {
    if (!this.readyState.ok) throw new AccountError("ACCOUNT_PERSISTENCE_UNAVAILABLE", "Account persistence is unavailable.");
  }

  async register(emailValue, passwordValue) {
    this.requireReady();
    const email = normalizeEmail(emailValue);
    const password = validatePassword(passwordValue);
    const passwordHash = await this.passwordWork.run(() => argon2.hash(password, { type:argon2.argon2id, memoryCost:65536, timeCost:3, parallelism:1 }));
    const userId = randomUUID();
    const profile = this.profileFactory(userId, email);
    const session = this.newSession(userId);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO public.users(id, email, email_normalized, password_hash, password_algorithm) VALUES ($1, $2, $3, $4, 'ARGON2ID')", [userId, email, email, passwordHash]);
      await client.query("INSERT INTO public.player_profiles(user_id, profile_data) VALUES ($1, $2::jsonb)", [userId, JSON.stringify(profile)]);
      await this.syncProfileProjections(client, userId, profile);
      await this.insertSession(client, session);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      if (String(error?.code) === "23505") throw new AccountError("EMAIL_ALREADY_REGISTERED", "An account already exists for this email.");
      console.error("PostgreSQL account creation failed", safeDbError(error));
      throw new AccountError("ACCOUNT_CREATE_FAILED", "Account creation failed.");
    } finally {
      client.release();
    }
    return { account:{ id:userId, email, status:"ACTIVE", role:"PLAYER", createdAt:session.createdAt }, profile, sessionToken:session.token, expiresAt:session.expiresAt };
  }

  async login(emailValue, passwordValue) {
    this.requireReady();
    let email;
    try {
      email = normalizeEmail(emailValue);
      validatePassword(passwordValue);
    } catch {
      throw new AccountError("AUTH_INVALID", "Email or password is incorrect.");
    }
    const result = await this.pool.query("SELECT id, email, status, role, password_hash, created_at FROM public.users WHERE email_normalized = $1", [email]);
    const row = result.rows[0];
    // A valid fixed-cost hash keeps unknown-account checks on the same established
    // verification path without revealing whether an email exists.
    const fallbackHash = "$argon2id$v=19$m=65536,t=3,p=1$Sxj6Sr5Mfw/7Ma4JYuKp9g$Qe+nVE57JnAcMN20mNhz+Avtw3JQwsO2tNM54MnxNlA";
    const verified = await this.passwordWork.run(() => argon2.verify(row?.password_hash ?? fallbackHash, passwordValue)).catch((error) => {
      if (error instanceof AccountError) throw error;
      return false;
    });
    if (!row || row.status !== "ACTIVE" || !verified) throw new AccountError("AUTH_INVALID", "Email or password is incorrect.");
    const session = this.newSession(String(row.id));
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM public.sessions WHERE expires_at <= now() - interval '7 days' OR revoked_at <= now() - interval '7 days'");
      await this.insertSession(client, session);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw new AccountError("SESSION_CREATE_FAILED", "Session creation failed.");
    } finally {
      client.release();
    }
    return { account:accountView(row), sessionToken:session.token, expiresAt:session.expiresAt };
  }

  newSession(userId) {
    const createdAt = Date.now();
    const token = randomBytes(32).toString("base64url");
    return { id:randomUUID(), userId, token, tokenHash:hashOpaqueToken(token), createdAt, expiresAt:createdAt + SESSION_TTL_MS };
  }

  async insertSession(client, session) {
    await client.query("INSERT INTO public.sessions(id, user_id, token_hash, created_at, last_used_at, expires_at) VALUES ($1, $2, $3, $4, $4, $5)", [session.id, session.userId, session.tokenHash, new Date(session.createdAt), new Date(session.expiresAt)]);
  }

  async session(token, options = {}) {
    this.requireReady();
    if (!token) throw new AccountError("AUTH_REQUIRED", "Sign in is required.");
    const tokenHash = hashOpaqueToken(token);
    const result = await this.pool.query(`SELECT s.id AS session_id, s.user_id, s.created_at AS session_created_at, s.last_used_at, s.expires_at,
      u.email, u.status, u.role, u.created_at, p.profile_data, p.revision
      FROM public.sessions s
      JOIN public.users u ON u.id = s.user_id
      JOIN public.player_profiles p ON p.user_id = u.id
      WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status = 'ACTIVE'`, [tokenHash]);
    const row = result.rows[0];
    if (!row) throw new AccountError("AUTH_REQUIRED", "Session is invalid or expired.");
    if (options.touch !== false && Date.now() - new Date(row.last_used_at).getTime() > 5 * 60 * 1000) {
      await this.pool.query("UPDATE public.sessions SET last_used_at = now() WHERE id = $1 AND revoked_at IS NULL", [row.session_id]);
    }
    return { account:accountView(row), profile:row.profile_data, session:{ id:String(row.session_id), createdAt:new Date(row.session_created_at).getTime(), expiresAt:new Date(row.expires_at).getTime() }, revision:Number(row.revision) };
  }

  async logout(token) {
    this.requireReady();
    if (!token) return;
    await this.pool.query("UPDATE public.sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL", [hashOpaqueToken(token)]);
  }

  async cleanupExpiredSessions() {
    this.requireReady();
    const result = await this.pool.query("DELETE FROM public.sessions WHERE expires_at <= now() - interval '7 days' OR revoked_at <= now() - interval '7 days'");
    return Number(result.rowCount ?? 0);
  }

  async requireOperationsSession(token) {
    const current = await this.session(token);
    if (!isOperationsRole(current.account.role)) throw new AccountError("OPS_FORBIDDEN", "Operations access is not permitted for this account.");
    return current;
  }

  async mutateProfile(token, mutation) {
    this.requireReady();
    const tokenHash = hashOpaqueToken(token);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(`SELECT s.user_id, s.expires_at, u.email, u.status, u.role, u.created_at, p.profile_data, p.revision
        FROM public.sessions s
        JOIN public.users u ON u.id = s.user_id
        JOIN public.player_profiles p ON p.user_id = u.id
        WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status = 'ACTIVE'
        FOR UPDATE OF p, s`, [tokenHash]);
      const row = result.rows[0];
      if (!row) throw new AccountError("AUTH_REQUIRED", "Session is invalid or expired.");
      const changed = await mutation(structuredClone(row.profile_data));
      const profile = changed.profile ?? changed;
      await client.query("UPDATE public.player_profiles SET profile_data = $2::jsonb, revision = revision + 1, updated_at = now() WHERE user_id = $1", [row.user_id, JSON.stringify(profile)]);
      await client.query("UPDATE public.sessions SET last_used_at = now() WHERE token_hash = $1", [tokenHash]);
      await this.syncProfileProjections(client, String(row.user_id), profile);
      await client.query("COMMIT");
      return { ...changed, profile, revision:Number(row.revision) + 1, account:accountView(row) };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      if (error instanceof AccountError || this.preserveMutationError(error)) throw error;
      console.error("PostgreSQL profile mutation failed", safeDbError(error));
      throw new AccountError("PROFILE_MUTATION_FAILED", "Profile update failed.");
    } finally {
      client.release();
    }
  }

  async mutateFirstSessionGuide(token, update) {
    this.requireReady();
    const tokenHash = hashOpaqueToken(token);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(`SELECT s.user_id, s.expires_at, u.email, u.status, u.role, u.created_at, p.profile_data, p.revision
        FROM public.sessions s
        JOIN public.users u ON u.id = s.user_id
        JOIN public.player_profiles p ON p.user_id = u.id
        WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status = 'ACTIVE'
        FOR UPDATE OF p, s`, [tokenHash]);
      const row = result.rows[0];
      if (!row) throw new AccountError("AUTH_REQUIRED", "Sign in is required.");
      const beforeGuide = row.profile_data?.meta?.firstSessionGuide ?? null;
      const meta = this.firstSessionGuideUpdater(structuredClone(row.profile_data?.meta ?? {}), update, Date.now());
      const nextGuide = meta?.firstSessionGuide ?? null;
      const changed = JSON.stringify(beforeGuide) !== JSON.stringify(nextGuide);
      if (changed) {
        const updated = await client.query(`UPDATE public.player_profiles
          SET profile_data = jsonb_set(COALESCE(profile_data, '{}'::jsonb), '{meta,firstSessionGuide}', $2::jsonb, true), revision = revision + 1, updated_at = now()
          WHERE user_id = $1
          RETURNING profile_data, revision`, [row.user_id, JSON.stringify(nextGuide)]);
        row.profile_data = updated.rows[0].profile_data;
        row.revision = updated.rows[0].revision;
      }
      await client.query("UPDATE public.sessions SET last_used_at = now() WHERE token_hash = $1", [tokenHash]);
      await client.query("COMMIT");
      return { profile:row.profile_data, revision:Number(row.revision), account:accountView(row) };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      if (error instanceof AccountError || this.preserveMutationError(error)) throw error;
      console.error("PostgreSQL first-session guide mutation failed", safeDbError(error));
      throw new AccountError("PROFILE_MUTATION_FAILED", "Profile update failed.");
    } finally {
      client.release();
    }
  }

  async mutateProfileByPlayerId(playerId, mutation) {
    this.requireReady();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query("SELECT profile_data, revision FROM public.player_profiles WHERE user_id = $1 FOR UPDATE", [playerId]);
      if (!result.rows[0]) throw new AccountError("PLAYER_NOT_FOUND");
      const changed = await mutation(structuredClone(result.rows[0].profile_data));
      const profile = changed.profile ?? changed;
      await client.query("UPDATE public.player_profiles SET profile_data = $2::jsonb, revision = revision + 1, updated_at = now() WHERE user_id = $1", [playerId, JSON.stringify(profile)]);
      await this.syncProfileProjections(client, playerId, profile);
      await client.query("COMMIT");
      return { ...changed, profile, revision:Number(result.rows[0].revision) + 1 };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      if (error instanceof AccountError || this.preserveMutationError(error)) throw error;
      console.error("PostgreSQL profile mutation by player failed", safeDbError(error));
      throw new AccountError("PROFILE_MUTATION_FAILED");
    } finally {
      client.release();
    }
  }

  async mutateProfilesByPlayerIds(playerIds, mutation) {
    this.requireReady();
    const ids = [...new Set(playerIds.map(String))].sort();
    if (ids.length < 2) throw new AccountError("PROFILE_MUTATION_FAILED");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query("SELECT user_id, profile_data, revision FROM public.player_profiles WHERE user_id = ANY($1::uuid[]) ORDER BY user_id FOR UPDATE", [ids]);
      if (result.rows.length !== ids.length) throw new AccountError("PLAYER_NOT_FOUND");
      const before = new Map(result.rows.map((row) => [String(row.user_id), structuredClone(row.profile_data)]));
      const changed = await mutation(before);
      const profiles = changed.profiles ?? changed;
      for (const id of ids) {
        const profile = profiles instanceof Map ? profiles.get(id) : profiles[id];
        if (!profile) throw new AccountError("PROFILE_MUTATION_FAILED");
        await client.query("UPDATE public.player_profiles SET profile_data = $2::jsonb, revision = revision + 1, updated_at = now() WHERE user_id = $1", [id, JSON.stringify(profile)]);
        await this.syncProfileProjections(client, id, profile);
      }
      await client.query("COMMIT");
      return { ...changed, profiles };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      if (error instanceof AccountError || this.preserveMutationError(error)) throw error;
      console.error("PostgreSQL multi-profile mutation failed", safeDbError(error));
      throw new AccountError("PROFILE_MUTATION_FAILED");
    } finally {
      client.release();
    }
  }

  async syncProfileProjections(client, userId, profile) {
    await client.query("DELETE FROM public.player_decks WHERE user_id = $1", [userId]);
    const decks = (profile.decks ?? []).map((deck) => ({ id:String(deck.id), deckData:deck, revision:Math.max(1, Number(deck.revision ?? 1)), createdAt:Number(deck.createdAt) || Date.now(), updatedAt:Number(deck.updatedAt) || Date.now() }));
    if (decks.length) await client.query(`INSERT INTO public.player_decks(user_id, deck_id, deck_data, revision, created_at, updated_at)
      SELECT $1, item.id, item.deck_data, item.revision, to_timestamp(item.created_at / 1000.0), to_timestamp(item.updated_at / 1000.0)
      FROM jsonb_to_recordset($2::jsonb) AS item(id text, deck_data jsonb, revision integer, created_at bigint, updated_at bigint)`, [userId, JSON.stringify(decks.map((item) => ({ id:item.id, deck_data:item.deckData, revision:item.revision, created_at:item.createdAt, updated_at:item.updatedAt })))]);
    await client.query("DELETE FROM public.reward_grants WHERE user_id = $1", [userId]);
    const grants = (profile.meta?.rewardGrants ?? []).map((grant) => ({ source_ref:String(grant.sourceRef), grant_data:grant, granted_at:Number(grant.grantedAt) || Date.now() }));
    if (grants.length) await client.query(`INSERT INTO public.reward_grants(user_id, source_ref, grant_data, granted_at)
      SELECT $1, item.source_ref, item.grant_data, to_timestamp(item.granted_at / 1000.0)
      FROM jsonb_to_recordset($2::jsonb) AS item(source_ref text, grant_data jsonb, granted_at bigint)`, [userId, JSON.stringify(grants)]);
    await client.query("DELETE FROM public.achievement_progress WHERE user_id = $1", [userId]);
    const achievements = Object.entries(profile.meta?.achievements ?? {}).map(([achievementId, progress]) => ({ achievement_id:achievementId, progress_data:progress }));
    if (achievements.length) await client.query(`INSERT INTO public.achievement_progress(user_id, achievement_id, progress_data, updated_at)
      SELECT $1, item.achievement_id, item.progress_data, now()
      FROM jsonb_to_recordset($2::jsonb) AS item(achievement_id text, progress_data jsonb)`, [userId, JSON.stringify(achievements)]);
  }

  async operationsStatus(options = {}) {
    const now = Date.now();
    if (!options.fresh && this.operationsCache?.expiresAt > now) return structuredClone(this.operationsCache.value);
    const readiness = await this.checkReadiness();
    let accounts = { total:null, profiles:null, activeSessions:null, expiredSessions:null, revokedSessions:null, disabled:null, registrationsLast7Days:null, recent:[], recentProfiles:[] };
    let progression = { levels:[], rankedTiers:[], achievementsCompleted:null, rewardGrants:null, economy:{ officeCredits:null, scrap:null } };
    if (readiness.ok) {
      const [countsResult, recentResult, profileSampleResult, levelResult, rankedResult, aggregateResult] = await Promise.all([
        this.pool.query(`SELECT
          (SELECT count(*)::integer FROM public.users) AS accounts,
          (SELECT count(*)::integer FROM public.player_profiles) AS profiles,
          (SELECT count(*)::integer FROM public.sessions WHERE revoked_at IS NULL AND expires_at > now()) AS active_sessions,
          (SELECT count(*)::integer FROM public.sessions WHERE expires_at <= now()) AS expired_sessions,
          (SELECT count(*)::integer FROM public.sessions WHERE revoked_at IS NOT NULL) AS revoked_sessions,
          (SELECT count(*)::integer FROM public.users WHERE status = 'DISABLED') AS disabled,
          (SELECT count(*)::integer FROM public.users WHERE created_at >= now() - interval '7 days') AS registrations_7d`),
        this.pool.query(`SELECT u.id, u.email, u.status, u.role, u.created_at,
          (SELECT max(s.last_used_at) FROM public.sessions s WHERE s.user_id = u.id) AS last_active_at
          FROM public.users u
          ORDER BY last_active_at DESC NULLS LAST, u.created_at DESC
          LIMIT 20`),
        this.pool.query(`SELECT u.email, p.user_id, p.updated_at, p.profile_data
          FROM public.player_profiles p
          JOIN public.users u ON u.id = p.user_id
          ORDER BY p.updated_at DESC
          LIMIT 20`),
        this.pool.query("SELECT COALESCE(profile_data #>> '{meta,progression,level}', '1') AS level, count(*)::integer AS count FROM public.player_profiles GROUP BY 1 ORDER BY (COALESCE(profile_data #>> '{meta,progression,level}', '1'))::integer"),
        this.pool.query("SELECT COALESCE(profile_data #>> '{ranked,tierId}', 'UNRANKED') AS tier, count(*)::integer AS count FROM public.player_profiles GROUP BY 1 ORDER BY 1"),
        this.pool.query(`SELECT
          (SELECT count(*)::integer FROM public.achievement_progress WHERE progress_data->>'completedAt' IS NOT NULL) AS achievements_completed,
          (SELECT count(*)::integer FROM public.reward_grants) AS reward_grants,
          COALESCE(sum((profile_data #>> '{meta,balances,OFFICE_CREDITS}')::bigint),0)::text AS office_credits,
          COALESCE(sum((profile_data #>> '{meta,balances,SHREDDER_SCRAPS}')::bigint),0)::text AS scrap
          FROM public.player_profiles`)
      ]);
      const row = countsResult.rows[0];
      accounts = {
        total:Number(row.accounts), profiles:Number(row.profiles), activeSessions:Number(row.active_sessions),
        expiredSessions:Number(row.expired_sessions), revokedSessions:Number(row.revoked_sessions), disabled:Number(row.disabled),
        registrationsLast7Days:Number(row.registrations_7d), recent:recentResult.rows.map(accountView),
        recentProfiles:profileSampleResult.rows.map((item) => {
          const profile = item.profile_data ?? {};
          const selectedDeckId = String(profile.selectedDeckId ?? "");
          const selectedDeck = (profile.decks ?? []).find((deck) => String(deck.id) === selectedDeckId);
          const departmentUsage = Object.entries(profile.stats?.departmentUsage ?? {}).sort(([, first], [, second]) => Number(second?.matches ?? 0) - Number(first?.matches ?? 0));
          return {
            playerId:String(item.user_id), email:String(item.email), displayName:String(profile.displayName ?? "Unknown"),
            level:Number(profile.meta?.progression?.level ?? 1), selectedDeck:selectedDeck?.name ?? (selectedDeckId || null),
            primaryDepartment:departmentUsage[0]?.[0] ?? null, rankedStatus:String(profile.ranked?.status ?? "PLACEMENT"),
            rankedTier:profile.ranked?.tierId == null ? null : String(profile.ranked.tierId), lastActiveAt:new Date(item.updated_at).getTime()
          };
        })
      };
      const aggregate = aggregateResult.rows[0];
      progression = {
        levels:levelResult.rows.map((item) => ({ level:Number(item.level), count:Number(item.count) })),
        rankedTiers:rankedResult.rows.map((item) => ({ tier:String(item.tier), count:Number(item.count) })),
        achievementsCompleted:Number(aggregate.achievements_completed), rewardGrants:Number(aggregate.reward_grants),
        economy:{ officeCredits:Number(aggregate.office_credits), scrap:Number(aggregate.scrap) }
      };
    }
    const value = {
      backend:"POSTGRES",
      database:{
        configured:true, reachable:readiness.database.reachable, version:readiness.database.version,
        schemaReady:Boolean(readiness.schemaReady),
        pool:{ active:Math.max(0, this.pool.totalCount - this.pool.idleCount), idle:this.pool.idleCount, waiting:this.pool.waitingCount, max:this.pool.options?.max ?? null }
      },
      migrations:readiness.migrations,
      readiness:{ ok:readiness.ok, status:readiness.status },
      legacyImport:{ state:"NOT_REQUIRED_ALPHA_RESET" },
      accounts,
      progression,
      diagnostics:[this.lastError].filter(Boolean)
    };
    this.operationsCache = { expiresAt:now + 15_000, value };
    return structuredClone(value);
  }

  async close() {
    await this.pool.end();
  }
}

export function constantTimeEqualText(first, second) {
  const a = Buffer.from(String(first));
  const b = Buffer.from(String(second));
  return a.length === b.length && timingSafeEqual(a, b);
}
