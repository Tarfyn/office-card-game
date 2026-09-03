const SAFE_STATES = new Set([
  "HEALTHY", "READY", "CURRENT", "WARNING", "OVERDUE", "DEGRADED",
  "UNAVAILABLE", "NOT_CONFIGURED", "NOT_APPLICABLE", "PENDING", "FAILED"
]);

function state(value, fallback = "UNAVAILABLE") {
  const normalized = String(value ?? "").toUpperCase();
  return SAFE_STATES.has(normalized) ? normalized : fallback;
}

function safeReleaseIdentifier(value) {
  const identifier = String(value ?? "").trim();
  return /^v[0-9]+\.[0-9]+\.[0-9]+-[0-9a-f]{8}$/.test(identifier) ? identifier : null;
}

export function buildOperationsOverview(input) {
  const generatedAt = Number(input.generatedAt ?? Date.now());
  const postgres = input.persistence?.database ?? {};
  const migrations = input.persistence?.migrations ?? {};
  const dbRequired = input.backend === "POSTGRES";
  const databaseState = !postgres.configured
    ? "NOT_CONFIGURED"
    : postgres.reachable
      ? "HEALTHY"
      : "DEGRADED";
  const migrationState = (migrations.changed?.length ?? 0) > 0
    ? "FAILED"
    : migrations.current === true
    ? "CURRENT"
    : migrations.current === false
      ? (postgres.reachable ? "PENDING" : "UNKNOWN")
      : "UNAVAILABLE";
  const appReady = input.shuttingDown !== true && (!dbRequired || input.persistence?.readiness?.ok === true);
  const backups = {
    database:{ status:state(input.backups?.database?.status), lastSuccessfulAt:input.backups?.database?.lastSuccessfulAt ?? null, ageSeconds:input.backups?.database?.ageSeconds ?? null, sizeBytes:input.backups?.database?.sizeBytes ?? null, nextRunAt:input.backups?.database?.nextRunAt ?? null, lastFailureCategory:input.backups?.database?.lastFailureCategory ?? null },
    legacy:{ status:state(input.backups?.legacy?.status), lastSuccessfulAt:input.backups?.legacy?.lastSuccessfulAt ?? null },
    retentionDays:Number(input.backups?.retentionDays ?? 30),
    timerStatus:state(input.backups?.timerStatus)
  };
  const diagnostics = (input.persistence?.diagnostics ?? []).map((item) => ({ code:String(item.code ?? "UNKNOWN"), at:Number(item.at ?? 0) }));
  if (input.backend === "POSTGRES" && input.databaseRequired !== true) diagnostics.push({ code:"POSTGRES_BACKEND_NOT_REQUIRED_BY_CONFIG", at:generatedAt });
  if (input.backend === "FILE_JSON_LOCAL" && input.databaseRequired === true) diagnostics.push({ code:"FILE_BACKEND_WITH_DATABASE_REQUIRED", at:generatedAt });
  return {
    generatedAt,
    overall:{
      app:input.shuttingDown ? "DEGRADED" : "HEALTHY",
      postgres:dbRequired ? databaseState : (postgres.configured ? databaseState : "NOT_APPLICABLE"),
      migrations:dbRequired ? migrationState : "NOT_APPLICABLE",
      backup:backups.database.status,
      readiness:appReady ? "READY" : "DEGRADED"
    },
    system:{
      version:String(input.version), releaseIdentifier:safeReleaseIdentifier(input.releaseIdentifier),
      environment:input.environment === "Production" ? "Production" : "Local",
      uptimeSeconds:Math.max(0, Math.round(Number(input.uptimeSeconds ?? 0))), nodeVersion:String(input.nodeVersion),
      health:input.shuttingDown ? "DEGRADED" : "HEALTHY", readiness:appReady ? "READY" : "DEGRADED"
    },
    persistence:{
      backend:input.backend,
      sourceOfTruth:input.backend === "POSTGRES" ? "AUTHENTICATED_ACCOUNT_POSTGRES" : "GUEST_FILE_JSON_LOCAL",
      postgresConfigured:Boolean(postgres.configured), postgresReachable:postgres.reachable ?? null,
      databaseRequired:input.databaseRequired === true,
      legacyStorePresent:Boolean(input.legacyStorePresent), legacyWrites:input.backend === "POSTGRES" ? "DISABLED" : "ENABLED",
      legacyImportState:String(input.persistence?.legacyImport?.state ?? "UNAVAILABLE"),
      automaticFallback:false
    },
    database:{
      status:databaseState, reachable:postgres.reachable ?? null, version:postgres.version ?? null,
      schemaReady:postgres.schemaReady ?? null,
      migrations:{ state:migrationState, applied:migrations.applied ?? null, required:migrations.required ?? null, pending:migrations.pending ?? [], changed:migrations.changed ?? [], unknown:migrations.unknown ?? [] },
      pool:postgres.pool ?? { active:null, idle:null, waiting:null, max:null }
    },
    backups,
    cutover:{
      state:input.backend === "POSTGRES" ? (input.persistence?.readiness?.ok === true ? "POSTGRES_ACTIVE" : "POSTGRES_NOT_READY") : "FILE_JSON_AUTHORITATIVE",
      activeStore:input.backend,
      marker:input.cutoverMarkerPresent ? "SET" : "NOT_SET",
      postgresWrites:input.backend === "POSTGRES" ? "ENABLED" : "DISABLED",
      legacyPlayerProgress:"NOT_MIGRATED_ALPHA_RESET",
      readyForCutover:input.backend === "POSTGRES" && input.databaseRequired === true && input.persistence?.readiness?.ok === true && postgres.reachable === true && migrations.current === true && input.cutoverMarkerPresent === true ? "YES" : "NO"
    },
    accounts:input.persistence?.accounts ?? { total:null, profiles:null, activeSessions:null, expiredSessions:null, revokedSessions:null, disabled:null, registrationsLast7Days:null, recent:[], recentProfiles:[] },
    progression:input.persistence?.progression ?? { levels:[], rankedTiers:[], achievementsCompleted:null, rewardGrants:null, economy:{ officeCredits:null, scrap:null } },
    diagnostics:diagnostics.slice(-20)
  };
}

export function operationsSection(overview, section) {
  const allowed = new Set(["system", "persistence", "database", "backups", "accounts", "progression", "diagnostics", "cutover"]);
  if (!allowed.has(section)) return null;
  return { generatedAt:overview.generatedAt, [section]:overview[section] };
}
