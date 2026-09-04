import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import pg from "pg";
import { PostgresAccountService, hashOpaqueToken, sessionCookie } from "../server/account-service.mjs";
import { discoverMigrations, migrationStatus } from "../server/storage/migration-files.mjs";
import { parseOfficeCardGameDatabaseUrl } from "../server/storage/database-url.mjs";
import { grantInitialOperationsRole } from "./account-role.mjs";
import { runMigrations } from "./db-migrate.mjs";

const databaseUrl = String(process.env.OCG_TEST_DATABASE_URL ?? "");
if (!databaseUrl) throw new Error("OCG_TEST_DATABASE_URL is required; no PostgreSQL integration test was run");
parseOfficeCardGameDatabaseUrl(databaseUrl, { test:true });
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationDir = join(root, "db", "migrations");
const { Client } = pg;
const admin = new Client({ connectionString:databaseUrl, application_name:"office-card-game-integration-cleanup" });
await admin.connect();

async function resetSchema() {
  await admin.query("DROP TABLE IF EXISTS public.achievement_progress, public.reward_grants, public.player_decks, public.player_profiles, public.sessions, public.users, public.persistence_metadata, public.schema_migrations CASCADE");
}

function profileFactory(id) {
  const now = Date.now();
  return {
    playerId:id, profileId:id, displayName:"Employee TEST",
    meta:{ profileVersion:2, balances:{ OFFICE_CREDITS:100, SHREDDER_SCRAPS:0 }, ownedCards:{ "CS-001":3 }, ownedCardVariants:{}, ownedPacks:{}, collectionMode:"OWNED_COPIES", claimedRewardRooms:[], rewardGrants:[], achievements:{}, progression:{ level:1, xp:0, matchesCompleted:0, boostersOpened:0, cardsScrapped:0, cardsCrafted:0 }, cosmetics:{ owned:[], loadout:{ boardSkinId:"COS-BOARD-001", avatarId:"COS-AVA-001", avatarFrameId:"COS-FRAME-006", avatarDecorationId:null, cardBackId:"COS-BACK-001", badgeId:null, titleId:null } } },
    stats:{ matchesPlayed:0 }, ranked:{ status:"PLACEMENT", tierId:"BRONZE", rating:1000 }, matchHistory:[], decks:[], selectedDeckId:null, createdAt:now, updatedAt:now
  };
}

try {
  await resetSchema();
  const lockedMigrations = await Promise.all([
    runMigrations({ databaseUrl, testDatabase:true }),
    runMigrations({ databaseUrl, testDatabase:true })
  ]);
  assert.equal(lockedMigrations.reduce((sum, result) => sum + result.applied, 0), 1);
  const repeatedMigration = await runMigrations({ databaseUrl, testDatabase:true });
  assert.equal(repeatedMigration.applied, 0);

  const service = await new PostgresAccountService({ databaseUrl, testDatabase:true, migrationDir, profileFactory, preserveMutationError:(error) => ["INSUFFICIENT_FUNDS","DECK_CONFLICT"].includes(error?.message) }).initialize();
  try {
    assert.equal((await service.checkReadiness()).ok, true);
    await assert.rejects(() => service.register("invalid", "valid-password-1"), (error) => error.code === "EMAIL_INVALID");
    const first = await service.register(" First@Example.test ", "valid-password-1");
    assert.equal(first.account.email, "first@example.test");
    assert.equal(first.account.role, "PLAYER");
    const storedSecrets = (await admin.query(`SELECT u.password_hash, s.token_hash
      FROM public.users u JOIN public.sessions s ON s.user_id = u.id WHERE u.id = $1`, [first.account.id])).rows[0];
    assert.match(storedSecrets.password_hash, /^\$argon2id\$/);
    assert.equal(storedSecrets.password_hash.includes("valid-password-1"), false);
    assert.equal(storedSecrets.token_hash, hashOpaqueToken(first.sessionToken));
    assert.equal(storedSecrets.token_hash.includes(first.sessionToken), false);
    assert.equal(JSON.stringify(first).includes(storedSecrets.password_hash), false);
    await assert.rejects(() => service.register("FIRST@example.test", "valid-password-1"), (error) => error.code === "EMAIL_ALREADY_REGISTERED");
    await assert.rejects(() => service.login("first@example.test", "incorrect-password"), (error) => error.code === "AUTH_INVALID");
    const login = await service.login("FIRST@example.test", "valid-password-1");
    const current = await service.session(login.sessionToken);
    assert.equal(current.profile.playerId, first.account.id);
    assert.match(sessionCookie(login.sessionToken, { secure:true }), /HttpOnly.*SameSite=Lax.*Secure/);

    const second = await service.register("second@example.test", "valid-password-2");
    const administrator = await service.register("administrator@example.test", "valid-password-3");
    assert.notEqual((await service.session(second.sessionToken)).profile.playerId, current.profile.playerId);
    await assert.rejects(() => service.requireOperationsSession(first.sessionToken), (error) => error.code === "OPS_FORBIDDEN");
    await service.mutateProfile(first.sessionToken, (profile) => ({ profile:{ ...profile, role:"ADMIN", meta:{ ...profile.meta, role:"ADMIN" } } }));
    await assert.rejects(() => service.requireOperationsSession(first.sessionToken), (error) => error.code === "OPS_FORBIDDEN");
    const opsGrant = await grantInitialOperationsRole({ databaseUrl, testDatabase:true, command:"grant-ops", email:"FIRST@example.test" });
    assert.equal(opsGrant.changed, true);
    assert.equal((await grantInitialOperationsRole({ databaseUrl, testDatabase:true, command:"grant-ops", email:"first@example.test" })).changed, false);
    await assert.rejects(
      () => grantInitialOperationsRole({ databaseUrl, testDatabase:true, command:"grant-admin", email:"first@example.test" }),
      /ACCOUNT_ALREADY_PRIVILEGED/
    );
    const adminGrant = await grantInitialOperationsRole({ databaseUrl, testDatabase:true, command:"grant-admin", email:administrator.account.email });
    assert.equal(adminGrant.changed, true);
    assert.equal((await service.requireOperationsSession(first.sessionToken)).account.role, "OPS");
    assert.equal((await service.requireOperationsSession(administrator.sessionToken)).account.role, "ADMIN");

    await service.mutateProfile(first.sessionToken, (profile) => ({ profile:{ ...profile, decks:[{ id:"deck-1", name:"Test", cards:[{ definitionId:"CS-001", copies:3 }, { definitionId:"CS-001", variantId:"CS-001-EXEC", copies:1 }], revision:1, createdAt:Date.now(), updatedAt:Date.now() }], selectedDeckId:"deck-1", meta:{ ...profile.meta, balances:{ OFFICE_CREDITS:100, SHREDDER_SCRAPS:20 }, ownedCards:{ "CS-001":3, "IT-001":2 }, ownedCardVariants:{ "CS-001-EXEC":1 }, ownedPacks:{ "EXECUTIVE_EDITION_PACK":1 }, cosmetics:{ ...profile.meta.cosmetics, owned:[...(profile.meta.cosmetics?.owned ?? []), { cosmeticId:"COS-AVA-003", source:"test", grantedAt:Date.now() }], loadout:{ ...profile.meta.cosmetics.loadout, avatarId:"COS-AVA-003" } }, achievements:{ "ACH-1":{ value:1, completedAt:Date.now() } }, rewardGrants:[{ source:"test", sourceRef:"once:1", cards:[], officeCredits:0, scrap:0, cosmetics:[], packs:[], grantedAt:Date.now() }] }, ranked:{ ...profile.ranked, status:"RATED", tierId:"SILVER" } } }));
    const persisted = await service.session(first.sessionToken);
    assert.equal(persisted.profile.selectedDeckId, "deck-1");
    assert.equal(persisted.profile.meta.balances.SHREDDER_SCRAPS, 20);
    assert.equal(persisted.profile.ranked.tierId, "SILVER");

    await service.mutateProfile(login.sessionToken, (profile) => ({ profile:{ ...profile, displayName:"Device B" } }));
    assert.equal((await service.session(first.sessionToken)).profile.displayName, "Device B");
    await service.mutateProfile(first.sessionToken, (profile) => {
      profile.meta.balances.SHREDDER_SCRAPS += 1;
      return { profile };
    });
    assert.equal((await service.session(login.sessionToken)).profile.meta.balances.SHREDDER_SCRAPS, 21);

    const rewardMutation = () => service.mutateProfile(first.sessionToken, (profile) => {
      if (!profile.meta.rewardGrants.some((grant) => grant.sourceRef === "concurrent:once")) profile.meta.rewardGrants.push({ source:"test", sourceRef:"concurrent:once", cards:[], officeCredits:1, scrap:0, cosmetics:[], packs:[], grantedAt:Date.now() });
      return { profile };
    });
    await Promise.all([rewardMutation(), rewardMutation()]);
    assert.equal((await service.session(first.sessionToken)).profile.meta.rewardGrants.filter((grant) => grant.sourceRef === "concurrent:once").length, 1);

    const purchase = () => service.mutateProfile(first.sessionToken, (profile) => {
      if (profile.meta.balances.OFFICE_CREDITS < 80) throw new Error("INSUFFICIENT_FUNDS");
      profile.meta.balances.OFFICE_CREDITS -= 80;
      return { profile };
    });
    const purchases = await Promise.allSettled([purchase(), purchase()]);
    assert.equal(purchases.filter((item) => item.status === "fulfilled").length, 1);
    assert.equal((await service.session(first.sessionToken)).profile.meta.balances.OFFICE_CREDITS, 20);

    const increment = () => service.mutateProfile(first.sessionToken, (profile) => { profile.meta.progression.xp += 1; return { profile }; });
    const xpBefore = (await service.session(first.sessionToken)).profile.meta.progression.xp;
    await Promise.all([increment(), increment()]);
    assert.equal((await service.session(first.sessionToken)).profile.meta.progression.xp, xpBefore + 2);

    const staleDeckSave = () => service.mutateProfile(first.sessionToken, (profile) => {
      const deck = profile.decks.find((item) => item.id === "deck-1");
      if (deck.revision !== 1) throw new Error("DECK_CONFLICT");
      deck.revision += 1;
      return { profile };
    });
    const deckSaves = await Promise.allSettled([staleDeckSave(), staleDeckSave()]);
    assert.equal(deckSaves.filter((item) => item.status === "fulfilled").length, 1);

    const restart = await new PostgresAccountService({ databaseUrl, testDatabase:true, migrationDir, profileFactory }).initialize();
    const restarted = await restart.session(first.sessionToken);
    assert.equal(restarted.profile.decks[0].revision, 2);
    assert.equal(restarted.profile.selectedDeckId, "deck-1");
    assert.equal(restarted.profile.meta.ownedCards["IT-001"], 2);
    assert.equal(restarted.profile.meta.ownedCardVariants["CS-001-EXEC"], 1);
    assert.equal(restarted.profile.meta.ownedPacks.EXECUTIVE_EDITION_PACK, 1);
    assert.equal(restarted.profile.decks[0].cards.some((card) => card.variantId === "CS-001-EXEC"), true);
    assert.equal(restarted.profile.meta.cosmetics.owned.some((item) => item.cosmeticId === "COS-AVA-003"), true);
    assert.equal(restarted.profile.meta.cosmetics.loadout.avatarId, "COS-AVA-003");
    assert.equal(restarted.profile.meta.cosmetics.loadout.boardSkinId, "COS-BOARD-001");
    assert.equal(restarted.profile.meta.balances.OFFICE_CREDITS, 20);
    assert.equal(restarted.profile.meta.balances.SHREDDER_SCRAPS, 21);
    assert.equal(restarted.profile.meta.achievements["ACH-1"].value, 1);
    assert.equal(restarted.profile.ranked.tierId, "SILVER");
    assert.equal(restarted.profile.meta.rewardGrants.some((grant) => grant.sourceRef === "concurrent:once"), true);
    assert.equal((await admin.query("SELECT count(*)::integer AS count FROM public.player_decks WHERE user_id = $1", [first.account.id])).rows[0].count, 1);
    assert.equal((await admin.query("SELECT count(*)::integer AS count FROM public.reward_grants WHERE user_id = $1", [first.account.id])).rows[0].count, 2);
    assert.equal((await admin.query("SELECT count(*)::integer AS count FROM public.achievement_progress WHERE user_id = $1", [first.account.id])).rows[0].count, 1);
    await restart.close();

    const ops = await service.operationsStatus({ fresh:true });
    assert.equal(ops.accounts.total, 3);
    assert.equal(ops.accounts.recentProfiles.some((profile) => profile.playerId === first.account.id && profile.email === "first@example.test"), true);
    const safeOps = JSON.stringify(ops);
    for (const secret of [databaseUrl, "valid-password-1", first.sessionToken, hashOpaqueToken(first.sessionToken), "password_hash", "token_hash"]) assert.equal(safeOps.includes(secret), false);

    const port = 23000 + Math.floor(Math.random() * 10000);
    const runtimeDir = mkdtempSync(join(tmpdir(), "ocg-server-integration-"));
    const legacyPlayersPath = join(runtimeDir, "players.local.json");
    const legacyCredentialsPath = join(runtimeDir, "guest-credentials.local.json");
    const legacyPlayersSentinel = '{"version":3,"players":[{"preserved":"legacy"}]}\n';
    const legacyCredentialsSentinel = '{"version":1,"credentials":[{"preserved":"legacy"}]}\n';
    writeFileSync(legacyPlayersPath, legacyPlayersSentinel);
    writeFileSync(legacyCredentialsPath, legacyCredentialsSentinel);
    const child = spawn(process.execPath, [join(root, "server", "server.mjs"), `--port=${port}`, "--host=127.0.0.1", `--runtime-dir=${runtimeDir}`], {
      cwd:root,
      env:{ ...process.env, NODE_ENV:"test", PROFILE_STORAGE_BACKEND:"POSTGRES", DATABASE_REQUIRED:"1", DATABASE_URL:databaseUrl, PUBLIC_BASE_URL:`http://127.0.0.1:${port}`, REQUIRE_HTTPS:"0", ADMIN_TOKEN:"integration-only-admin-token" },
      stdio:["ignore", "pipe", "pipe"]
    });
    let childOutput = "";
    child.stdout.on("data", (chunk) => { childOutput += chunk; });
    child.stderr.on("data", (chunk) => { childOutput += chunk; });
    try {
      await new Promise((resolveStart, rejectStart) => {
        const timeout = setTimeout(() => rejectStart(new Error(`Test server did not start: ${childOutput}`)), 15000);
        const inspect = () => {
          if (childOutput.includes("server running")) { clearTimeout(timeout); resolveStart(); }
          else if (child.exitCode != null) { clearTimeout(timeout); rejectStart(new Error(`Test server exited: ${childOutput}`)); }
        };
        child.stdout.on("data", inspect);
        child.stderr.on("data", inspect);
        child.once("exit", inspect);
      });
      const base = `http://127.0.0.1:${port}`;
      const healthyResponse = await fetch(`${base}/api/health`);
      const healthyBody = await healthyResponse.json();
      assert.equal(healthyResponse.status, 200);
      assert.equal(healthyBody.persistenceBackend, "POSTGRES");
      assert.equal(healthyBody.database.status, "READY");
      assert.equal(healthyBody.ranked.timerActive, false);
      const readyResponse = await fetch(`${base}/api/ready`);
      const readyBody = await readyResponse.json();
      assert.equal(readyResponse.status, 200);
      assert.equal(readyBody.status, "READY");
      assert.equal(readyBody.database.reachable, true);
      assert.equal(readyBody.database.migrations.current, true);
      const postAuth = (path, body, cookie = "") => fetch(`${base}${path}`, {
        method:"POST",
        headers:{ "content-type":"application/json", origin:base, ...(cookie ? { cookie } : {}) },
        body:JSON.stringify(body)
      });
      const registeredHttp = await postAuth("/api/auth/register", { email:"http@example.test", password:"valid-password-http" });
      assert.equal(registeredHttp.status, 201);
      const registerCookie = String(registeredHttp.headers.get("set-cookie") ?? "");
      assert.match(registerCookie, /^ocg_session=[A-Za-z0-9_-]+;/);
      assert.match(registerCookie, /Path=\/.*HttpOnly.*SameSite=Lax.*Secure/);
      const registeredHttpBody = await registeredHttp.json();
      assert.equal(registeredHttpBody.profile.selectedDeckId, null);
      assert.equal(registeredHttpBody.profile.meta.balances.OFFICE_CREDITS, 500);
      assert.deepEqual(registeredHttpBody.profile.meta.ownedCards, {});
      assert.equal(registeredHttpBody.profile.meta.alphaPlaytestAccess.enabled, true);
      assert.equal(registeredHttpBody.profile.meta.starterOnboarding.status, "PENDING");
      assert.equal(registeredHttpBody.profile.ranked.status, "PLACEMENT");
      assert.ok(registeredHttpBody.profile.meta.achievements);
      const currentHttp = await (await fetch(`${base}/api/auth/current`, { headers:{ cookie:registerCookie.split(";")[0] } })).json();
      assert.equal(currentHttp.mode, "ACCOUNT");
      assert.equal(currentHttp.account.email, "http@example.test");
      assert.equal((await postAuth("/api/auth/register", { email:"HTTP@example.test", password:"valid-password-http" })).status, 409);
      const loginHttp = await postAuth("/api/auth/login", { email:"http@example.test", password:"valid-password-http" });
      assert.equal(loginHttp.status, 200);
      const loginCookie = String(loginHttp.headers.get("set-cookie") ?? "").split(";")[0];
      const httpSessionToken = registerCookie.split(";")[0].split("=")[1];

      const onboardingResponse = await postAuth("/api/onboarding/department", { department:"CUSTOMER_SERVICE" }, registerCookie.split(";")[0]);
      assert.equal(onboardingResponse.status, 200);
      const onboardingBody = await onboardingResponse.json();
      assert.equal(onboardingBody.profile.meta.starterOnboarding.status, "IN_PROGRESS");
      assert.equal(onboardingBody.profile.meta.starterOnboarding.selectedDepartment, "CUSTOMER_SERVICE");
      assert.equal(onboardingBody.profile.meta.starterOnboarding.boosterCount, 8);
      assert.equal(onboardingBody.profile.meta.starterOnboarding.boosterPresentationCount, 0);
      assert.equal(onboardingBody.profile.selectedDeckId, null);
      assert.equal(onboardingBody.profile.decks.length, 0);
      const starterGrants = onboardingBody.profile.meta.rewardGrants.filter((grant) => grant.sourceRef?.startsWith("starter-grant:v1:CUSTOMER_SERVICE:"));
      assert.equal(starterGrants.length, 10);
      assert.equal(starterGrants.reduce((sum, grant) => sum + grant.cards.reduce((count, card) => count + card.quantity, 0), 0), 60);
      const persistedPending = await (await fetch(`${base}/api/auth/current`, { headers:{ cookie:registerCookie.split(";")[0] } })).json();
      assert.equal(persistedPending.profile.meta.starterOnboarding.status, "IN_PROGRESS");
      assert.equal(persistedPending.profile.meta.starterOnboarding.boosterPresentationCount, 0);
      assert.equal((await postAuth("/api/onboarding/booster", { packNumber:2 }, registerCookie.split(";")[0])).status, 400);
      const duplicatePackOne = await Promise.all([
        postAuth("/api/onboarding/booster", { packNumber:1 }, registerCookie.split(";")[0]),
        postAuth("/api/onboarding/booster", { packNumber:1 }, loginCookie)
      ]);
      assert.deepEqual(duplicatePackOne.map((response) => response.status).sort(), [200, 200]);
      const duplicatePackBodies = await Promise.all(duplicatePackOne.map((response) => response.json()));
      assert.equal(duplicatePackBodies[0].booster.sourceRef, duplicatePackBodies[1].booster.sourceRef);
      assert.equal(duplicatePackBodies[0].profile.meta.starterOnboarding.boosterPresentationCount, 1);
      for (let packNumber = 2; packNumber <= 8; packNumber += 1) {
        const boosterResponse = await postAuth("/api/onboarding/booster", { packNumber }, registerCookie.split(";")[0]);
        assert.equal(boosterResponse.status, 200);
        const boosterBody = await boosterResponse.json();
        assert.equal(boosterBody.booster.packNumber, packNumber);
        assert.equal(boosterBody.booster.cards.reduce((sum, card) => sum + card.quantity, 0), 5);
        assert.equal(boosterBody.profile.meta.starterOnboarding.boosterPresentationCount, packNumber);
        if (packNumber < 8) {
          assert.equal(boosterBody.profile.meta.starterOnboarding.status, "IN_PROGRESS");
          assert.equal(boosterBody.profile.selectedDeckId, null);
          assert.equal(boosterBody.profile.decks.length, 0);
        } else {
          assert.equal(boosterBody.profile.meta.starterOnboarding.status, "COMPLETE");
          assert.ok(boosterBody.profile.meta.starterOnboarding.firstDayDeckId);
          assert.equal(boosterBody.profile.selectedDeckId, boosterBody.profile.meta.starterOnboarding.firstDayDeckId);
          assert.equal(boosterBody.profile.decks.length, 1);
          assert.equal(boosterBody.profile.decks[0].cards.reduce((sum, card) => sum + card.copies, 0), 40);
        }
        if (packNumber === 3) {
          const interruptedReload = await (await fetch(`${base}/api/auth/current`, { headers:{ cookie:registerCookie.split(";")[0] } })).json();
          assert.equal(interruptedReload.profile.meta.starterOnboarding.boosterPresentationCount, 3);
          assert.equal(interruptedReload.profile.meta.starterOnboarding.status, "IN_PROGRESS");
        }
      }
      const repeatedBooster = await (await postAuth("/api/onboarding/booster", { packNumber:8 }, registerCookie.split(";")[0])).json();
      assert.equal(repeatedBooster.booster.sourceRef, "starter-grant:v1:CUSTOMER_SERVICE:booster:8");
      assert.equal(repeatedBooster.profile.decks.length, 1);
      const reloadedOnboarding = await (await fetch(`${base}/api/auth/current`, { headers:{ cookie:loginCookie } })).json();
      assert.equal(reloadedOnboarding.profile.meta.starterOnboarding.status, "COMPLETE");
      assert.equal(reloadedOnboarding.profile.meta.starterOnboarding.boosterPresentationCount, 8);
      assert.equal(reloadedOnboarding.profile.decks.length, 1);
      assert.equal(reloadedOnboarding.profile.selectedDeckId, reloadedOnboarding.profile.meta.starterOnboarding.firstDayDeckId);
      const finalOwnedCopies = Object.values(reloadedOnboarding.profile.meta.ownedCards).reduce((sum, quantity) => sum + Number(quantity), 0);
      const finalUniqueCards = Object.keys(reloadedOnboarding.profile.meta.ownedCards).length;
      assert.equal(finalOwnedCopies, 60);
      assert.ok(finalUniqueCards > 0);
      console.log(`DB_ONBOARDING_OK · copies=${finalOwnedCopies} uniqueCardIds=${finalUniqueCards} department=CUSTOMER_SERVICE`);

      const trainingCases = [
        { playerDeck:reloadedOnboarding.profile.decks[0].id, botDeck:"customer-service-starter" },
        { playerDeck:"it-starter", botDeck:"marketing-starter" },
        { playerDeck:"production-starter", botDeck:"office-starter" }
      ];
      for (const trainingCase of trainingCases) {
        const trainingResponse = await postAuth("/api/rooms/bot", { mode:"TRAINING", deckId:trainingCase.playerDeck, botDeckId:trainingCase.botDeck }, registerCookie.split(";")[0]);
        assert.equal(trainingResponse.status, 201);
        const trainingBody = await trainingResponse.json();
        assert.equal(trainingBody.view.settings.mode, "TRAINING");
        assert.ok(trainingBody.roomId);
      }
      for (const mode of ["FRIENDLY", "RANKED"]) {
        const loanerResponse = await postAuth("/api/rooms", { mode, deckId:"it-starter" }, registerCookie.split(";")[0]);
        assert.equal(loanerResponse.status, 400);
        assert.equal((await loanerResponse.json()).error.code, "INVALID_DECK");
      }
      const presetsBody = await (await fetch(`${base}/api/presets`)).json();
      const marketingPreset = presetsBody.presets.find((preset) => preset.id === "marketing-starter");
      assert.ok(marketingPreset);
      const importedAlphaDeck = await postAuth("/api/profiles/me/decks/import", { decks:[{ id:"alpha-only-test", name:"Alpha Only Test", cards:marketingPreset.cards }] }, registerCookie.split(";")[0]);
      assert.equal(importedAlphaDeck.status, 200);
      const importedAlphaDeckBody = await importedAlphaDeck.json();
      assert.equal(importedAlphaDeckBody.imported.length, 1);
      const alphaOnlyDeckId = importedAlphaDeckBody.imported[0];
      const alphaOnlyPvP = await postAuth("/api/rooms", { mode:"FRIENDLY", deckId:alphaOnlyDeckId }, registerCookie.split(";")[0]);
      assert.equal(alphaOnlyPvP.status, 400);
      assert.equal((await alphaOnlyPvP.json()).error.code, "DECK_NOT_OWNED");
      const afterTraining = (await (await fetch(`${base}/api/auth/current`, { headers:{ cookie:registerCookie.split(";")[0] } })).json()).profile;
      assert.equal(Object.values(afterTraining.meta.ownedCards).reduce((sum, quantity) => sum + Number(quantity), 0), 60, "Training loaners must not mint owned cards");

      await service.mutateProfile(httpSessionToken, (profile) => {
        profile.meta.balances.OFFICE_CREDITS = 100;
        return { profile };
      });
      const boosterPurchases = await Promise.all([
        postAuth("/api/economy/booster/open", { packId:"ALPHA_OFFICE_PACK" }, registerCookie.split(";")[0]),
        postAuth("/api/economy/booster/open", { packId:"ALPHA_OFFICE_PACK" }, loginCookie)
      ]);
      assert.deepEqual(boosterPurchases.map((response) => response.status).sort(), [200, 400]);
      const afterBooster = (await service.session(httpSessionToken)).profile;
      assert.equal(afterBooster.meta.balances.OFFICE_CREDITS, 0);
      assert.equal(afterBooster.meta.progression.boostersOpened, 1);

      await service.mutateProfile(httpSessionToken, (profile) => {
        profile.meta.balances.OFFICE_CREDITS = 240;
        profile.meta.cosmetics.owned = profile.meta.cosmetics.owned.filter((item) => item.cosmeticId !== "COS-AVA-004");
        return { profile };
      });
      const cosmeticPurchases = await Promise.all([
        postAuth("/api/cosmetics/shop/purchase", { cosmeticId:"COS-AVA-004" }, registerCookie.split(";")[0]),
        postAuth("/api/cosmetics/shop/purchase", { cosmeticId:"COS-AVA-004" }, loginCookie)
      ]);
      assert.deepEqual(cosmeticPurchases.map((response) => response.status).sort(), [200, 400]);
      const afterCosmetic = (await service.session(httpSessionToken)).profile;
      assert.equal(afterCosmetic.meta.balances.OFFICE_CREDITS, 0);
      assert.equal(afterCosmetic.meta.cosmetics.owned.filter((item) => item.cosmeticId === "COS-AVA-004").length, 1);
      assert.equal((await postAuth("/api/cosmetics/equip", { slot:"avatarId", cosmeticId:"COS-AVA-004" }, loginCookie)).status, 200);
      assert.equal((await service.session(httpSessionToken)).profile.meta.cosmetics.loadout.avatarId, "COS-AVA-004");

      await service.mutateProfile(httpSessionToken, (profile) => {
        profile.meta.balances.SHREDDER_SCRAPS = 150;
        return { profile };
      });
      const cardsBeforeCraft = (await service.session(httpSessionToken)).profile.meta.ownedCards["CS-001"];
      const crafts = await Promise.all([
        postAuth("/api/economy/craft", { definitionId:"CS-001", copies:1 }, registerCookie.split(";")[0]),
        postAuth("/api/economy/craft", { definitionId:"CS-001", copies:1 }, loginCookie)
      ]);
      assert.deepEqual(crafts.map((response) => response.status).sort(), [200, 400]);
      const afterCraft = (await service.session(httpSessionToken)).profile;
      assert.equal(afterCraft.meta.balances.SHREDDER_SCRAPS, 0);
      assert.equal(afterCraft.meta.ownedCards["CS-001"], cardsBeforeCraft + 1);

      await service.mutateProfile(httpSessionToken, (profile) => {
        profile.meta.ownedCards["CS-001"] = 20;
        profile.meta.balances.SHREDDER_SCRAPS = 0;
        return { profile };
      });
      const recycleRequests = await Promise.all([
        postAuth("/api/economy/scrap", { definitionId:"CS-001", copies:15, confirmDeckImpact:true }, registerCookie.split(";")[0]),
        postAuth("/api/economy/scrap", { definitionId:"CS-001", copies:15, confirmDeckImpact:true }, loginCookie)
      ]);
      assert.deepEqual(recycleRequests.map((response) => response.status).sort(), [200, 400]);
      const afterRecycle = (await service.session(httpSessionToken)).profile;
      assert.equal(afterRecycle.meta.ownedCards["CS-001"], 5);
      assert.equal(afterRecycle.meta.balances.SHREDDER_SCRAPS, 150);

      assert.equal((await postAuth("/api/profiles/me/name", { displayName:"Device B HTTP", userId:second.account.id, profileId:second.account.id }, loginCookie)).status, 200);
      const refreshedDeviceA = await (await fetch(`${base}/api/profiles/me`, { headers:{ cookie:registerCookie.split(";")[0] } })).json();
      assert.equal(refreshedDeviceA.profile.displayName, "Device B HTTP");
      assert.equal(refreshedDeviceA.profile.meta.cosmetics.loadout.avatarId, "COS-AVA-004");
      assert.equal(refreshedDeviceA.profile.meta.balances.SHREDDER_SCRAPS, 150);
      assert.equal((await postAuth("/api/auth/login", { email:"http@example.test", password:"wrong-password" })).status, 401);
      for (let attempt = 0; attempt < 3; attempt += 1) assert.equal((await postAuth("/api/auth/register", { email:"invalid", password:"valid-password-http" })).status, 400);
      assert.equal((await postAuth("/api/auth/register", { email:"invalid", password:"valid-password-http" })).status, 429);
      for (let attempt = 0; attempt < 8; attempt += 1) assert.equal((await postAuth("/api/auth/login", { email:"http@example.test", password:"short" })).status, 401);
      assert.equal((await postAuth("/api/auth/login", { email:"http@example.test", password:"short" })).status, 429);
      assert.equal((await postAuth("/api/auth/logout", {}, registerCookie.split(";")[0])).status, 200);
      const afterLogout = await (await fetch(`${base}/api/auth/current`, { headers:{ cookie:registerCookie.split(";")[0] } })).json();
      assert.equal(afterLogout.mode, "GUEST");
      assert.equal(afterLogout.expired, true);
      const guestCreate = await fetch(`${base}/api/profiles/guest`, { method:"POST", headers:{ "content-type":"application/json", origin:base }, body:"{}" });
      assert.equal(guestCreate.status, 201);
      assert.equal(readFileSync(legacyPlayersPath, "utf8"), legacyPlayersSentinel);
      assert.equal(readFileSync(legacyCredentialsPath, "utf8"), legacyCredentialsSentinel);
      assert.equal((await fetch(`${base}/api/profiles/me`)).status, 401);
      assert.equal((await fetch(`${base}/api/ops/overview`)).status, 401);
      assert.equal((await fetch(`${base}/ops`)).status, 401);
      assert.equal((await fetch(`${base}/api/ops/overview`, { headers:{ cookie:`ocg_session=${second.sessionToken}` } })).status, 403);
      assert.equal((await fetch(`${base}/ops`, { headers:{ cookie:`ocg_session=${second.sessionToken}` } })).status, 403);
      const allowed = await fetch(`${base}/api/ops/overview`, { headers:{ cookie:`ocg_session=${first.sessionToken}` } });
      assert.equal(allowed.status, 200);
      const allowedText = await allowed.text();
      for (const secret of [databaseUrl, first.sessionToken, hashOpaqueToken(first.sessionToken), "password_hash", "token_hash"]) assert.equal(allowedText.includes(secret), false);
      const allowedOps = JSON.parse(allowedText).ops;
      assert.equal(allowedOps.system.version, "7.69.52");
      assert.equal(allowedOps.system.readiness, "READY");
      assert.equal(allowedOps.persistence.backend, "POSTGRES");
      assert.equal(allowedOps.persistence.sourceOfTruth, "AUTHENTICATED_ACCOUNT_POSTGRES");
      assert.equal(allowedOps.database.reachable, true);
      assert.equal(allowedOps.database.migrations.state, "CURRENT");
      assert.ok(allowedOps.database.pool.max >= 1);
      assert.equal(allowedOps.accounts.total, 4);
      assert.equal(allowedOps.accounts.profiles, 4);
      assert.ok(allowedOps.accounts.activeSessions >= 4);
      assert.equal(allowedOps.cutover.marker, "SET");
      assert.equal(allowedOps.cutover.readyForCutover, "YES");
      assert.equal(allowedOps.backups.database.status, "UNAVAILABLE");
      assert.equal((await fetch(`${base}/ops`, { headers:{ cookie:`ocg_session=${first.sessionToken}` } })).status, 200);
      assert.equal((await fetch(`${base}/api/ops/overview`, { headers:{ cookie:`ocg_session=${administrator.sessionToken}` } })).status, 200);
      assert.equal((await fetch(`${base}/ops`, { headers:{ cookie:`ocg_session=${administrator.sessionToken}` } })).status, 200);
      for (const section of ["system","persistence","database","backups","accounts","progression","diagnostics","cutover"]) {
        assert.equal((await fetch(`${base}/api/ops/${section}`)).status, 401);
        assert.equal((await fetch(`${base}/api/ops/${section}`, { headers:{ cookie:`ocg_session=${first.sessionToken}` } })).status, 200);
      }
      const knownMigration = discoverMigrations(migrationDir)[0];
      try {
        await admin.query("UPDATE public.schema_migrations SET checksum_sha256 = repeat('0',64) WHERE version = $1", [knownMigration.name]);
        const staleReadyResponse = await fetch(`${base}/api/ready`);
        const staleReadyBody = await staleReadyResponse.json();
        assert.equal(staleReadyResponse.status, 503);
        assert.equal(staleReadyBody.status, "DATABASE_NOT_READY");
        assert.deepEqual(staleReadyBody.database.migrations.changed, [knownMigration.name]);
      } finally {
        await admin.query("UPDATE public.schema_migrations SET checksum_sha256 = $2 WHERE version = $1", [knownMigration.name, knownMigration.checksum]);
      }
      assert.equal((await fetch(`${base}/api/ready`)).status, 200);
      const blockedCsrf = await fetch(`${base}/api/profiles/me/name`, { method:"POST", headers:{ cookie:`ocg_session=${first.sessionToken}`, "content-type":"application/json" }, body:JSON.stringify({ displayName:"Blocked", profileId:second.account.id }) });
      assert.equal(blockedCsrf.status, 403);
      const allowedMutation = await fetch(`${base}/api/profiles/me/name`, { method:"POST", headers:{ cookie:`ocg_session=${first.sessionToken}`, "content-type":"application/json", origin:base }, body:JSON.stringify({ displayName:"Authorized A", profileId:second.account.id, userId:second.account.id }) });
      assert.equal(allowedMutation.status, 200);
      const firstMe = await (await fetch(`${base}/api/profiles/me`, { headers:{ cookie:`ocg_session=${first.sessionToken}` } })).json();
      const secondMe = await (await fetch(`${base}/api/profiles/me`, { headers:{ cookie:`ocg_session=${second.sessionToken}` } })).json();
      assert.equal(firstMe.profile.playerId, first.account.id);
      assert.equal(secondMe.profile.playerId, second.account.id);
      assert.equal(firstMe.profile.displayName, "Authorized A");
      assert.notEqual(secondMe.profile.displayName, "Authorized A");
    } finally {
      if (child.exitCode == null) {
        child.kill("SIGTERM");
        await new Promise((resolveExit) => child.once("exit", resolveExit));
      }
      rmSync(runtimeDir, { recursive:true, force:true });
    }

    await admin.query(`UPDATE public.sessions
      SET created_at = now() - interval '9 days',
          last_used_at = now() - interval '9 days',
          expires_at = now() - interval '8 days'
      WHERE token_hash = $1`, [hashOpaqueToken(second.sessionToken)]);
    await assert.rejects(() => service.session(second.sessionToken), (error) => error.code === "AUTH_REQUIRED");
    assert.ok((await service.cleanupExpiredSessions()) >= 1);
    assert.equal((await admin.query("SELECT count(*)::integer AS count FROM public.sessions WHERE token_hash = $1", [hashOpaqueToken(second.sessionToken)])).rows[0].count, 0);
    await service.logout(first.sessionToken);
    await assert.rejects(() => service.session(first.sessionToken), (error) => error.code === "AUTH_REQUIRED");

    const migrations = discoverMigrations(migrationDir);
    await admin.query("BEGIN");
    await admin.query("UPDATE public.schema_migrations SET checksum_sha256 = repeat('0',64) WHERE version = $1", [migrations[0].name]);
    const stale = await migrationStatus(admin, migrations);
    assert.equal(stale.current, false);
    assert.deepEqual(stale.changed, [migrations[0].name]);
    await admin.query("ROLLBACK");

    await admin.query("BEGIN");
    await admin.query("INSERT INTO public.schema_migrations(version, checksum_sha256) VALUES ('9999_future_additive.sql', $1)", ["f".repeat(64)]);
    const forwardCompatible = await migrationStatus(admin, migrations);
    assert.equal(forwardCompatible.current, true);
    assert.equal(forwardCompatible.exact, false);
    assert.deepEqual(forwardCompatible.unknown, ["9999_future_additive.sql"]);
    await admin.query("ROLLBACK");

    const pendingDir = mkdtempSync(join(tmpdir(), "ocg-migration-pending-"));
    let pendingService;
    try {
      writeFileSync(join(pendingDir, migrations[0].name), readFileSync(join(migrationDir, migrations[0].name)));
      writeFileSync(join(pendingDir, "0002_pending_probe.sql"), "CREATE TABLE public.pending_migration_probe(id bigint PRIMARY KEY);\n");
      pendingService = await new PostgresAccountService({ databaseUrl, testDatabase:true, migrationDir:pendingDir, profileFactory }).initialize();
      const pendingReadiness = await pendingService.checkReadiness();
      assert.equal(pendingReadiness.ok, false);
      assert.equal(pendingReadiness.status, "DATABASE_NOT_READY");
      assert.equal(pendingReadiness.database.reachable, true);
      assert.equal(pendingReadiness.migrations.current, false);
      assert.deepEqual(pendingReadiness.migrations.pending, ["0002_pending_probe.sql"]);
    } finally {
      await pendingService?.close();
      rmSync(pendingDir, { recursive:true, force:true });
    }

    const failureDir = mkdtempSync(join(tmpdir(), "ocg-migration-failure-"));
    try {
      writeFileSync(join(failureDir, migrations[0].name), readFileSync(join(migrationDir, migrations[0].name)));
      writeFileSync(join(failureDir, "0002_failure_probe.sql"), "CREATE TABLE public.migration_failure_probe(id bigint);\nSELECT * FROM public.table_that_does_not_exist;\n");
      await assert.rejects(() => runMigrations({ databaseUrl, testDatabase:true, migrationDir:failureDir }));
      assert.equal((await admin.query("SELECT to_regclass('public.migration_failure_probe') AS name")).rows[0].name, null);
      assert.equal((await admin.query("SELECT count(*)::integer AS count FROM public.schema_migrations WHERE version = '0002_failure_probe.sql'")).rows[0].count, 0);
    } finally {
      rmSync(failureDir, { recursive:true, force:true });
    }
  } finally {
    await service.close();
  }

  await resetSchema();
  const missingSchemaService = await new PostgresAccountService({ databaseUrl, testDatabase:true, migrationDir, profileFactory }).initialize();
  try {
    const missingSchemaReadiness = await missingSchemaService.checkReadiness();
    assert.equal(missingSchemaReadiness.ok, false);
    assert.equal(missingSchemaReadiness.status, "DATABASE_NOT_READY");
    assert.equal(missingSchemaReadiness.database.reachable, true);
    assert.equal(missingSchemaReadiness.schemaReady, false);
    assert.deepEqual(missingSchemaReadiness.migrations.pending, discoverMigrations(migrationDir).map((entry) => entry.name));
  } finally {
    await missingSchemaService.close();
  }
  console.log("DB_INTEGRATION_OK · migrations, auth, persistence, restart, authorization, and concurrency verified");
} finally {
  await resetSchema();
  await admin.end();
}
