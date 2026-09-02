import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { COSMETIC_CATALOG, COSMETIC_SHOP_CATALOG, cosmeticIsOwned, defaultCosmeticOwnership, normalizePlayerCosmetics } from "../src/cosmetics.js";

let passed = 0;
function test(name: string, fn: () => void) { fn(); passed += 1; console.log(`✓ ${name}`); }
const root = (name: string) => readFileSync(fileURLToPath(new URL(`../../${name}`, import.meta.url)), "utf8");
const app = root("public/app.js");
const en = root("public/locales/en.js");
const de = root("public/locales/de.js");

const avatarIds = ["COS-AVA-003", "COS-AVA-004", "COS-AVA-005", "COS-AVA-006"];
const frameIds = ["COS-FRAME-002", "COS-FRAME-003", "COS-FRAME-004", "COS-FRAME-005"];

test("new avatars and frames have stable catalog definitions and target assets", () => {
  for (const id of [...avatarIds, ...frameIds]) {
    assert.ok(COSMETIC_CATALOG[id]);
    assert.match(COSMETIC_CATALOG[id].assetPath ?? "", /^\/cosmetics\/(avatars|avatar-frames)\//);
  }
  assert.deepEqual(avatarIds.map((id) => COSMETIC_CATALOG[id].kind), ["AVATAR", "AVATAR", "AVATAR", "AVATAR"]);
  assert.deepEqual(frameIds.map((id) => COSMETIC_CATALOG[id].slot), ["avatarFrameId", "avatarFrameId", "avatarFrameId", "avatarFrameId"]);
});

test("standard cosmetics are starter-owned while new avatars remain shop inventory", () => {
  const owned = new Set(defaultCosmeticOwnership().map((grant) => grant.cosmeticId));
  assert.ok(owned.has("COS-AVA-001"));
  assert.ok(owned.has("COS-AVA-002"));
  assert.ok(owned.has("COS-FRAME-002"));
  for (const id of avatarIds) assert.equal(owned.has(id), false);
  for (const id of frameIds.slice(1)) assert.equal(owned.has(id), false);
  const shop = new Set<string>(COSMETIC_SHOP_CATALOG.map((item) => item.cosmeticId));
  for (const id of avatarIds) assert.ok(shop.has(id));
  assert.ok(shop.has("COS-FRAME-002"));
  for (const id of frameIds.slice(1)) assert.equal(shop.has(id), false);
});

test("ranked frames remain reward-only until an explicit ranked grant", () => {
  const fresh = normalizePlayerCosmetics(undefined, 1);
  assert.equal(cosmeticIsOwned(fresh, "COS-AVA-001"), true);
  assert.equal(cosmeticIsOwned(fresh, "COS-AVA-002"), true);
  for (const id of avatarIds) assert.equal(cosmeticIsOwned(fresh, id), false);
  for (const id of frameIds.slice(1)) assert.equal(cosmeticIsOwned(fresh, id), false);
  const migrated = normalizePlayerCosmetics({ owned:[
    { cosmeticId:"COS-AVA-001", acquiredAt:2, source:"starter", sourceRef:"starter:alpha:v1" },
    { cosmeticId:"COS-AVA-002", acquiredAt:2, source:"starter", sourceRef:"starter:alpha:v1" },
    { cosmeticId:"COS-AVA-003", acquiredAt:2, source:"starter", sourceRef:null },
    { cosmeticId:"COS-AVA-004", acquiredAt:2, source:"starter", sourceRef:null },
    { cosmeticId:"COS-AVA-005", acquiredAt:2, source:"starter", sourceRef:null },
    { cosmeticId:"COS-AVA-006", acquiredAt:2, source:"starter", sourceRef:null },
    { cosmeticId:"COS-FRAME-003", acquiredAt:2, source:"starter", sourceRef:null }
  ] }, 1);
  assert.equal(cosmeticIsOwned(migrated, "COS-AVA-001"), true);
  assert.equal(cosmeticIsOwned(migrated, "COS-AVA-002"), true);
  assert.equal(cosmeticIsOwned(migrated, "COS-AVA-003"), false);
  assert.equal(cosmeticIsOwned(migrated, "COS-AVA-004"), false);
  assert.equal(cosmeticIsOwned(migrated, "COS-AVA-005"), false);
  assert.equal(cosmeticIsOwned(migrated, "COS-AVA-006"), false);
  assert.equal(cosmeticIsOwned(migrated, "COS-FRAME-003"), false);
  const legitimate = normalizePlayerCosmetics({ owned:[
    { cosmeticId:"COS-AVA-003", acquiredAt:2, source:"shop", sourceRef:"purchase:ava-003" },
    { cosmeticId:"COS-AVA-004", acquiredAt:2, source:"achievement", sourceRef:"achievement:ava-004" },
    { cosmeticId:"COS-AVA-005", acquiredAt:2, source:"ranked", sourceRef:"ranked:ava-005" },
    { cosmeticId:"COS-AVA-006", acquiredAt:2, source:"admin", sourceRef:"admin:ava-006" }
  ] }, 1);
  for (const id of avatarIds) assert.equal(cosmeticIsOwned(legitimate, id), true);
  const granted = normalizePlayerCosmetics({ owned:[{ cosmeticId:"COS-FRAME-003", acquiredAt:2, source:"ranked", sourceRef:"ranked:s01:bronze" }] }, 1);
  assert.equal(cosmeticIsOwned(granted, "COS-FRAME-003"), true);
  assert.equal(granted.owned.find((grant) => grant.cosmeticId === "COS-FRAME-003")?.source, "ranked");
});

test("identity rendering layers an equipped transparent frame over the avatar", () => {
  assert.match(app, /frames: Object\.freeze/);
  assert.match(app, /function cosmeticFrameAsset\(frameId\)/);
  assert.match(app, /avatar-composition-frame player-avatar-frame-image/);
  assert.match(app, /avatar-composition-decoration/);
  assert.match(app, /function renderAvatarComposition\(/);
  assert.match(app, /loadout\.avatarFrameId/);
});

test("new cosmetic names and descriptions are localized in English and German", () => {
  for (const key of ["executiveDirectorName", "overloadedJuniorName", "confidentAnalystName", "customerCareVeteranName", "blueSilverFrameName", "bronzeRankedS01Name", "goldRankedS01Name", "diamondRankedS01Name"]) {
    assert.match(en, new RegExp(`${key}:`));
    assert.match(de, new RegExp(`${key}:`));
  }
  assert.match(de, /customerCareVeteranName: "Customer-Care-Veteranin"/);
  assert.match(de, /diamondRankedS01Description: "Ranked-Rahmen für hohe Platzierungen\."/);
});

console.log(`\n${passed}/${passed} v7.69.34 cosmetic asset tests passed.`);
