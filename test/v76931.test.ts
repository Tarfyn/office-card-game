import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { COSMETIC_CATALOG, COSMETIC_SHOP_CATALOG, cosmeticIsOwned, defaultCosmeticOwnership, normalizePlayerCosmetics, sortCosmeticItems } from "../src/cosmetics.js";

let passed = 0;
function test(name: string, fn: () => void) { fn(); passed += 1; console.log(`✓ ${name}`); }
const root = (name: string) => readFileSync(fileURLToPath(new URL(`../../${name}`, import.meta.url)), "utf8");
const app = root("public/app.js");
const en = root("public/locales/en.js");
const de = root("public/locales/de.js");
const rankedRanks = JSON.parse(root("data/ranked/ranks.json"));

const avatarIds = ["COS-AVA-003", "COS-AVA-004", "COS-AVA-005", "COS-AVA-006"];
const internIds = ["COS-AVA-007", "COS-AVA-008"];
const frameIds = ["COS-FRAME-002", "COS-FRAME-003", "COS-FRAME-004", "COS-FRAME-005", "COS-FRAME-006"];

test("new avatars and frames have stable catalog definitions and target assets", () => {
  for (const id of [...avatarIds, ...internIds, ...frameIds]) {
    assert.ok(COSMETIC_CATALOG[id]);
    assert.match(COSMETIC_CATALOG[id].assetPath ?? "", /^\/cosmetics\/(avatars|avatar-frames)\//);
  }
  assert.deepEqual(avatarIds.map((id) => COSMETIC_CATALOG[id].kind), ["AVATAR", "AVATAR", "AVATAR", "AVATAR"]);
  assert.deepEqual(frameIds.map((id) => COSMETIC_CATALOG[id].slot), ["avatarFrameId", "avatarFrameId", "avatarFrameId", "avatarFrameId", "avatarFrameId"]);
  assert.ok(readFileSync(fileURLToPath(new URL("../../public/cosmetics/avatars/intern-female.webp", import.meta.url))).byteLength > 10000);
  assert.ok(readFileSync(fileURLToPath(new URL("../../public/cosmetics/avatars/intern-male.webp", import.meta.url))).byteLength > 10000);
  assert.equal(COSMETIC_CATALOG["COS-AVA-007"].name, "Intern");
  assert.equal(COSMETIC_CATALOG["COS-AVA-008"].name, "Intern");
  assert.ok(readFileSync(fileURLToPath(new URL("../../public/cosmetics/avatar-frames/silver-ranked-s01.webp", import.meta.url))).byteLength > 100);
});

test("the Intern is the sole starter Avatar while secondary avatars remain inventory", () => {
  const owned = new Set(defaultCosmeticOwnership().map((grant) => grant.cosmeticId));
  assert.deepEqual([...owned], ["COS-BOARD-001", "COS-AVA-007", "COS-BACK-001"]);
  assert.ok(owned.has("COS-AVA-007"));
  assert.equal(owned.has("COS-AVA-008"), false);
  assert.equal(owned.has("COS-AVA-001"), false);
  assert.equal(owned.has("COS-AVA-002"), false);
  assert.equal(owned.has("COS-FRAME-002"), false);
  for (const id of avatarIds) assert.equal(owned.has(id), false);
  for (const id of internIds) assert.equal(owned.has(id), id === "COS-AVA-007");
  for (const id of frameIds.slice(1)) assert.equal(owned.has(id), false);
  const shop = new Set<string>(COSMETIC_SHOP_CATALOG.map((item) => item.cosmeticId));
  for (const id of avatarIds) assert.ok(shop.has(id));
  assert.ok(shop.has("COS-FRAME-002"));
  for (const id of frameIds.slice(1)) assert.equal(shop.has(id), false);
});

test("ranked frames remain reward-only until an explicit ranked grant", () => {
  const fresh = normalizePlayerCosmetics(undefined, 1);
  assert.equal(cosmeticIsOwned(fresh, "COS-AVA-007"), true);
  assert.equal(cosmeticIsOwned(fresh, "COS-AVA-008"), false);
  assert.equal(cosmeticIsOwned(fresh, "COS-AVA-001"), false);
  assert.equal(cosmeticIsOwned(fresh, "COS-AVA-002"), false);
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

test("ranked frame collection order follows ranked tier metadata", () => {
  const items = ["COS-FRAME-003", "COS-FRAME-004", "COS-FRAME-005", "COS-FRAME-006"].map((id) => ({ definition:COSMETIC_CATALOG[id] }));
  const ordered = sortCosmeticItems(items, rankedRanks.ranks).map((item) => item.definition.id);
  assert.deepEqual(ordered, ["COS-FRAME-003", "COS-FRAME-006", "COS-FRAME-004", "COS-FRAME-005"]);
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
  for (const key of ["executiveDirectorName", "overloadedJuniorName", "confidentAnalystName", "customerCareVeteranName", "blueSilverFrameName", "bronzeRankedS01Name", "goldRankedS01Name", "diamondRankedS01Name", "silverRankedS01Name"]) {
    assert.match(en, new RegExp(`${key}:`));
    assert.match(de, new RegExp(`${key}:`));
  }
  assert.match(de, /customerCareVeteranName: "Customer-Care-Veteranin"/);
  assert.match(de, /diamondRankedS01Description: "Ranked-Rahmen für hohe Platzierungen\."/);
  assert.match(de, /silverRankedS01Description: "Ranked-Belohnungsrahmen für Silber\."/);
  assert.match(en, /internName: "Intern"/);
  assert.match(de, /internName: "Intern"/);
});

test("Silver is the Silver-tier reward and remains out of the Shop", () => {
  const silver = rankedRanks.ranks.find((rank: { id?: string }) => rank.id === "SILVER");
  assert.deepEqual(silver?.rewards, [{ type:"COSMETIC", cosmeticId:"COS-FRAME-006" }]);
  assert.equal(COSMETIC_SHOP_CATALOG.some((entry) => String(entry.cosmeticId) === "COS-FRAME-006"), false);
});

console.log(`\n${passed}/${passed} v7.69.44 cosmetic asset tests passed.`);
