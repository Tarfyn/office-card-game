import { strict as assert } from "node:assert";
import pg from "pg";
import { PostgresAccountService } from "../server/account-service.mjs";
import { PlayerProfileService } from "../dist/src/profile.js";
import { createPlayerMetaProfile } from "../dist/src/economy.js";
import { createEmptyPlayerStats } from "../dist/src/match-history.js";
import { createRankedProfile } from "../dist/src/ranked.js";
import { discoverMigrations } from "../server/storage/migration-files.mjs";
import { runMigrations } from "./db-migrate.mjs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const databaseUrl = String(process.env.OCG_TEST_DATABASE_URL ?? "");
if (!databaseUrl) throw new Error("OCG_TEST_DATABASE_URL is required");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationDir = join(root, "db", "migrations");
const { Client } = pg;
const admin = new Client({ connectionString:databaseUrl, application_name:"office-card-game-alpha-reset-regression" });
await admin.connect();
await admin.query("DROP TABLE IF EXISTS public.match_settlements, public.achievement_progress, public.reward_grants, public.player_decks, public.player_profiles, public.sessions, public.users, public.persistence_metadata, public.schema_migrations CASCADE");
await runMigrations({ databaseUrl, testDatabase:true });
const profileFactory = (id) => ({ playerId:id, profileId:id, displayName:"Reset Test", meta:createPlayerMetaProfile([], 500), stats:createEmptyPlayerStats(1000), ranked:createRankedProfile(), matchHistory:[], decks:[], selectedDeckId:null, createdAt:Date.now(), updatedAt:Date.now() });
const service = await new PostgresAccountService({ databaseUrl, testDatabase:true, migrationDir, profileFactory,
  profileScopeFactory:(savedProfiles) => {
    const scoped = new PlayerProfileService({ playerIdFactory:() => [...savedProfiles.keys()][0], tokenFactory:() => "transaction-token", persistence:undefined,
      playerPersistence:{ load:() => ({ version:3, players:[...savedProfiles.values()].map((item) => structuredClone(item)) }), save:(snapshot) => { savedProfiles.clear(); for (const item of snapshot.players) savedProfiles.set(item.playerId, structuredClone(item)); } },
      credentialPersistence:{ load:() => ({ version:1, credentials:[] }), save:() => {} }, rankedConfig:{}, deckDefinitions:{} });
    return { service:scoped };
  }
}).initialize();
try {
  const first = await service.register("reset-a@example.test", "valid-password-1");
  const second = await service.register("reset-b@example.test", "valid-password-2");
  const before = await service.session(first.sessionToken);
  const cutoff = new Date(Date.now() + 60_000);
  const epochId = `alpha-${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`;
  const dry = await service.alphaReset({ epochId, cutoffAt:cutoff.toISOString(), dryRun:true, resetProfile:({ profile }) => profile });
  assert.equal(dry.status, "DRY_RUN");
  const afterDry = await admin.query("SELECT revision, profile_data FROM public.player_profiles WHERE user_id = $1", [first.account.id]);
  assert.equal(Number(afterDry.rows[0].revision), Number(before.revision));
  assert.equal(afterDry.rows[0].profile_data.displayName, before.profile.displayName);
  const applied = await service.alphaReset({ epochId, cutoffAt:cutoff.toISOString(), backupReference:"test-backup", legacySnapshotReference:"test-snapshot", resetProfile:({ profile, now }) => ({ ...profile, matchHistory:[], decks:[], selectedDeckId:null, updatedAt:now }) });
  assert.equal(applied.status, "APPLIED");
  const marker = await service.getAlphaResetMetadata();
  assert.equal(marker.epochId, epochId);
  const sessions = await admin.query("SELECT count(*)::int AS count FROM public.sessions WHERE revoked_at IS NULL");
  assert.equal(Number(sessions.rows[0].count), 0);
  await assert.rejects(() => service.settleMatchCompletion({ settlementId:"pre-epoch", matchId:"pre-epoch", mode:"RANKED", originatedAt:cutoff.getTime() - 1, entries:[{ playerId:first.account.id, entry:{ roomId:"old", matchId:"old", mode:"RANKED", outcome:"WIN", opponentName:"x", deckName:"x", opponentDeckName:"x", turns:1, reason:"DONE", finishedAt:Date.now() } }] }), (error) => error.code === "ALPHA_EPOCH_FENCE");
  const post = await service.settleMatchCompletion({ settlementId:"post-epoch", matchId:"post-epoch", mode:"RANKED", originatedAt:cutoff.getTime() + 1, entries:[{ playerId:first.account.id, entry:{ roomId:"new", matchId:"new", mode:"RANKED", outcome:"WIN", opponentName:"x", deckName:"x", opponentDeckName:"x", turns:1, reason:"DONE", finishedAt:Date.now() } }] });
  assert.equal(post.replayed, false);
  const repeated = await service.alphaReset({ epochId, cutoffAt:cutoff.toISOString(), dryRun:false, resetProfile:({ profile }) => profile });
  assert.equal(repeated.status, "ALREADY_APPLIED");
  console.log("ALPHA_RESET_REGRESSION_OK");
} finally {
  await service.close();
  await admin.query("DROP TABLE IF EXISTS public.match_settlements, public.achievement_progress, public.reward_grants, public.player_decks, public.player_profiles, public.sessions, public.users, public.persistence_metadata, public.schema_migrations CASCADE");
  await admin.end();
}
