import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createAlphaMetaProfile } from "../src/economy.js";
import {
  PlayerProfileService,
  type GuestCredentialStoreSnapshot,
  type PlayerDataStoreSnapshot,
  type PlayerProfileStoreSnapshot
} from "../src/profile.js";

let passed = 0;
function test(name: string, fn: () => void): void {
  try { fn(); passed += 1; console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

function separatedStores(initialLegacy: PlayerProfileStoreSnapshot | null = null) {
  let players: PlayerDataStoreSnapshot | null = null;
  let credentials: GuestCredentialStoreSnapshot | null = null;
  let legacy = initialLegacy ? structuredClone(initialLegacy) : null;
  return {
    playerPersistence: {
      storageLabel:"TEST_PLAYER_STORE",
      load:() => players ? structuredClone(players) : null,
      save:(snapshot:PlayerDataStoreSnapshot) => { players = structuredClone(snapshot); }
    },
    credentialPersistence: {
      storageLabel:"TEST_CREDENTIAL_STORE",
      load:() => credentials ? structuredClone(credentials) : null,
      save:(snapshot:GuestCredentialStoreSnapshot) => { credentials = structuredClone(snapshot); }
    },
    legacyPersistence: {
      storageLabel:"TEST_LEGACY_STORE",
      load:() => legacy ? structuredClone(legacy) : null,
      save:(snapshot:PlayerProfileStoreSnapshot) => { legacy = structuredClone(snapshot); }
    },
    readPlayers:() => players,
    readCredentials:() => credentials
  };
}

test("v4.6 stable player id is independent from the local guest credential", () => {
  let tokenSeq = 0;
  const stores = separatedStores();
  const service = new PlayerProfileService({
    playerIdFactory:()=>"player-stable-460",
    tokenFactory:()=>`guest-secret-${++tokenSeq}`,
    nowFactory:()=>460,
    playerPersistence:stores.playerPersistence,
    credentialPersistence:stores.credentialPersistence
  });
  const created = service.create(undefined, "Stable QA");
  assert.equal(created.profile.playerId, "player-stable-460");
  assert.equal(created.profile.profileId, "player-stable-460");
  assert.equal(created.profileToken, "guest-secret-1");
  const rotated = service.rotateGuestCredential(created.profileToken);
  assert.equal(rotated.profile.playerId, "player-stable-460");
  assert.equal(rotated.profileToken, "guest-secret-2");
  assert.equal(service.has("guest-secret-1"), false);
  assert.equal(service.get("guest-secret-2").displayName, "Stable QA");
});

test("v4.6 player data store never contains the guest secret", () => {
  const stores = separatedStores();
  const service = new PlayerProfileService({ playerIdFactory:()=>"player-clean-460", tokenFactory:()=>"do-not-store-with-player", playerPersistence:stores.playerPersistence, credentialPersistence:stores.credentialPersistence });
  service.create(undefined, "Separated QA");
  const playerJson = JSON.stringify(stores.readPlayers());
  const credentialJson = JSON.stringify(stores.readCredentials());
  assert.equal(playerJson.includes("do-not-store-with-player"), false);
  assert.equal(credentialJson.includes("do-not-store-with-player"), true);
  assert.equal(credentialJson.includes("player-clean-460"), true);
});

test("v4.6 legacy v4.5 combined profiles migrate into separated stores without losing progression", () => {
  const meta = createAlphaMetaProfile();
  meta.balances.OFFICE_CREDITS = 777;
  meta.progression.level = 8;
  const legacy: PlayerProfileStoreSnapshot = {
    version:1,
    records:[{
      profileToken:"legacy-secret-460",
      profile:{
        profileId:"profile-existing-460",
        displayName:"Migrated QA",
        meta,
        stats:{ matchesPlayed:3, wins:2, losses:1, draws:0, resignLosses:0, friendlyMatches:3, rankedMatches:0 },
        matchHistory:[],
        createdAt:100,
        updatedAt:200
      }
    }]
  };
  const stores = separatedStores(legacy);
  const service = new PlayerProfileService({ persistence:stores.legacyPersistence, playerPersistence:stores.playerPersistence, credentialPersistence:stores.credentialPersistence, nowFactory:()=>999 });
  const restored = service.get("legacy-secret-460");
  assert.equal(restored.playerId, "profile-existing-460");
  assert.equal(restored.meta.balances.OFFICE_CREDITS, 777);
  assert.equal(restored.meta.progression.level, 8);
  assert.equal(restored.stats.wins, 2);
  assert.equal(service.migratedLegacyProfileStore, true);
  assert.equal(stores.readPlayers()?.players.length, 1);
  assert.equal(stores.readCredentials()?.credentials.length, 1);
});

test("v4.6 separated snapshots restore without consulting stale legacy player data", () => {
  let tokenSeq = 0;
  const stores = separatedStores();
  const first = new PlayerProfileService({ playerIdFactory:()=>"player-restart-460", tokenFactory:()=>`restart-secret-${++tokenSeq}`, playerPersistence:stores.playerPersistence, credentialPersistence:stores.credentialPersistence });
  const created = first.create(undefined, "Restart QA");
  const meta = first.get(created.profileToken).meta;
  meta.balances.SHREDDER_SCRAPS = 460;
  first.updateMeta(created.profileToken, meta);
  const restarted = new PlayerProfileService({ playerIdFactory:()=>"unused", tokenFactory:()=>"unused", playerPersistence:stores.playerPersistence, credentialPersistence:stores.credentialPersistence });
  assert.equal(restarted.get(created.profileToken).playerId, "player-restart-460");
  assert.equal(restarted.get(created.profileToken).meta.balances.SHREDDER_SCRAPS, 460);
  assert.equal(restarted.migratedLegacyProfileStore, false);
});

test("v4.6 room, matchmaking and player services share a generic snapshot storage boundary", () => {
  const storage = readFileSync(fileURLToPath(new URL("../../src/storage.ts", import.meta.url)), "utf8");
  const room = readFileSync(fileURLToPath(new URL("../../src/room.ts", import.meta.url)), "utf8");
  const matchmaking = readFileSync(fileURLToPath(new URL("../../src/matchmaking.ts", import.meta.url)), "utf8");
  const profile = readFileSync(fileURLToPath(new URL("../../src/profile.ts", import.meta.url)), "utf8");
  assert.match(storage, /SnapshotPersistence/);
  assert.match(room, /extends SnapshotPersistence<RoomStoreSnapshot>/);
  assert.match(matchmaking, /extends SnapshotPersistence<MatchmakingStoreSnapshot/);
  assert.match(profile, /PlayerDataPersistence extends SnapshotPersistence<PlayerDataStoreSnapshot>/);
  assert.match(profile, /GuestCredentialPersistence extends SnapshotPersistence<GuestCredentialStoreSnapshot>/);
});

test("v4.6 server wires separated local adapters and exposes stable player identity while ranked remains untimed", () => {
  const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8");
  const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
  const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");
  assert.match(server, /version: "4\.6\.0"/);
  assert.match(server, /players\.local\.json/);
  assert.match(server, /guest-credentials\.local\.json/);
  assert.match(server, /profiles\.local\.json/);
  assert.match(server, /playerPersistence/);
  assert.match(server, /credentialPersistence: guestCredentialPersistence/);
  assert.match(server, /guest-credential\/rotate/);
  assert.match(server, /authMode:profiles\.authMode/);
  assert.match(app, /profile\.playerId \?\? profile\.profileId/);
  assert.match(app, /GUEST_LOCAL/);
  assert.match(html, /v4\.6 alpha playtest/i);
});

console.log(`${passed}/6 v4.6 tests passed.`);
