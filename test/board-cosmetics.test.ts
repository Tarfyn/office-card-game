import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { applyCosmeticEquip, applyCosmeticPurchase, COSMETIC_CATALOG, COSMETIC_SHOP_CATALOG, cosmeticIsOwned, defaultCosmeticOwnership, normalizePlayerCosmetics } from "../src/cosmetics.js";
import { applyAlphaPlaytestCosmeticGrant, createPlayerMetaProfile } from "../src/economy.js";

const root = (name: string) => fileURLToPath(new URL(`../../${name}`, import.meta.url));
const app = readFileSync(root("public/app.js"), "utf8");
const styles = readFileSync(root("public/styles.css"), "utf8");
const en = readFileSync(root("public/locales/en.js"), "utf8");
const de = readFileSync(root("public/locales/de.js"), "utf8");

const cardBacks = [
  { id:"COS-BACK-001", asset:"default-corporate.webp", nameKey:"corporateStandardName" },
  { id:"COS-BACK-002", asset:"alpha-back.webp", nameKey:"externalAlphaName" },
  { id:"COS-BACK-003", asset:"ranked-season-1.webp", nameKey:"rankedSeason01BackName" },
  { id:"COS-BACK-004", asset:"customer-service-department.webp", nameKey:"customerServiceBackName" },
  { id:"COS-BACK-005", asset:"it-department.webp", nameKey:"itBackName" }
] as const;

const badges = [
  { id:"COS-BADGE-001", asset:"reply-all-survivor.webp", nameKey:"replyAllSurvivorName" },
  { id:"COS-BADGE-002", asset:"coffee-powered.webp", nameKey:"coffeePoweredName" },
  { id:"COS-BADGE-003", asset:"inbox-zero.webp", nameKey:"inboxZeroName" },
  { id:"COS-BADGE-004", asset:"meeting-survivor.webp", nameKey:"meetingSurvivorName" },
  { id:"COS-BADGE-005", asset:"ticket-closer.webp", nameKey:"ticketCloserName" },
  { id:"COS-BADGE-006", asset:"escalation-specialist.webp", nameKey:"escalationSpecialistName" }
] as const;

const boards = [
  { id:"COS-BOARD-002", slug:"soft-office", price:180, en:"Soft Office", de:"Sanftes Office" },
  { id:"COS-BOARD-003", slug:"midnight-circuit", price:220, en:"Midnight Circuit", de:"Mitternachts-Schaltkreis" },
  { id:"COS-BOARD-004", slug:"executive-steel", price:260, en:"Executive Steel", de:"Executive Stahl" },
  { id:"COS-BOARD-005", slug:"concrete-minimal", price:180, en:"Concrete Minimal", de:"Minimaler Beton" }
] as const;

for (const board of boards) {
  const definition = COSMETIC_CATALOG[board.id];
  assert.ok(definition, `${board.id} is catalogued`);
  assert.equal(definition.kind, "BOARD");
  assert.equal(definition.slot, "boardSkinId");
  assert.equal(definition.assetPath, `/cosmetics/boards/${board.slug}.webp`);
  assert.ok(readFileSync(root(`public/cosmetics/boards/${board.slug}.webp`)).byteLength > 100, `${board.slug} asset exists`);
  assert.equal(definition.name, board.en);
  const localeKey = definition.nameKey.split(".").pop();
  assert.match(en, new RegExp(`${localeKey}:`));
  assert.match(de, new RegExp(`${localeKey}:`));
}

for (const back of cardBacks) {
  const definition = COSMETIC_CATALOG[back.id];
  assert.ok(definition, `${back.id} is catalogued`);
  assert.equal(definition.kind, "CARD_BACK");
  assert.equal(definition.slot, "cardBackId");
  assert.equal(definition.assetPath, `/cosmetics/card-backs/${back.asset}`);
  assert.ok(readFileSync(root(`public/cosmetics/card-backs/${back.asset}`)).byteLength > 1000, `${back.asset} asset exists`);
  assert.match(en, new RegExp(`${back.nameKey}:`));
  assert.match(de, new RegExp(`${back.nameKey}:`));
}

for (const badge of badges) {
  const definition = COSMETIC_CATALOG[badge.id];
  assert.ok(definition, `${badge.id} is catalogued`);
  assert.equal(definition.kind, "BADGE");
  assert.equal(definition.slot, "badgeId");
  assert.equal(definition.assetPath, `/cosmetics/badges/${badge.asset}`);
  assert.ok(readFileSync(root(`public/cosmetics/badges/${badge.asset}`)).byteLength > 1000, `${badge.asset} asset exists`);
  assert.match(en, new RegExp(`${badge.nameKey}:`));
  assert.match(de, new RegExp(`${badge.nameKey}:`));
}

const starterIds = new Set(defaultCosmeticOwnership().map((grant) => grant.cosmeticId));
assert.equal(starterIds.has("COS-BACK-002"), false);
assert.equal(starterIds.has("COS-BACK-003"), false);
for (const badge of badges) assert.equal(starterIds.has(badge.id), false);
const accidentalNewCosmeticStarter = normalizePlayerCosmetics({ owned:[
  ...["COS-BACK-002", "COS-BACK-003", "COS-BACK-004", "COS-BACK-005"].map((cosmeticId) => ({ cosmeticId, acquiredAt:1, source:"starter" as const, sourceRef:null })),
  ...badges.map((badge) => ({ cosmeticId:badge.id, acquiredAt:1, source:"starter" as const, sourceRef:null }))
] }, 1);
for (const id of ["COS-BACK-002", "COS-BACK-003", "COS-BACK-004", "COS-BACK-005", ...badges.map((badge) => badge.id)]) assert.equal(cosmeticIsOwned(accidentalNewCosmeticStarter, id), false);
assert.deepEqual(
  COSMETIC_SHOP_CATALOG.filter((entry) => ["COS-BACK-001", "COS-BACK-002", "COS-BACK-003", "COS-BACK-004", "COS-BACK-005", ...badges.map((badge) => badge.id)].includes(entry.cosmeticId)),
  [{ cosmeticId:"COS-BACK-004", price:180 }, { cosmeticId:"COS-BACK-005", price:180 }]
);

const alpha = applyAlphaPlaytestCosmeticGrant(createPlayerMetaProfile(), 10);
for (const id of ["COS-BACK-002", "COS-BACK-003", ...badges.map((badge) => badge.id)]) assert.equal(cosmeticIsOwned(alpha.cosmetics, id), true);
assert.equal(applyAlphaPlaytestCosmeticGrant(alpha, 11).rewardGrants.filter((grant) => grant.sourceRef === "alpha-playtest:cosmetic-card-backs:v1").length, 1);
assert.equal(applyAlphaPlaytestCosmeticGrant(alpha, 11).rewardGrants.filter((grant) => grant.sourceRef === "alpha-playtest:achievement-badges:v1").length, 1);
assert.equal(COSMETIC_CATALOG["COS-FRAME-006"].assetPath, "/cosmetics/avatar-frames/silver-ranked-s01.webp");
assert.equal(COSMETIC_CATALOG["COS-FRAME-006"].portraitMaskAsset, "/cosmetics/avatar-frames/masks/silver-ranked-s01-inner-opening.png");
assert.ok(readFileSync(root("public/cosmetics/avatar-frames/silver-ranked-s01.webp")).byteLength > 1000);
const silverMask = readFileSync(root("public/cosmetics/avatar-frames/masks/silver-ranked-s01-inner-opening.png"));
assert.ok(silverMask.byteLength > 7000, "Silver mask should retain the expanded inner opening");
assert.equal(silverMask[24], 8, "Silver mask must use 8-bit channels");
assert.equal(silverMask[25], 6, "Silver mask must use RGBA channels");
assert.match(app, /cardBacks: Object\.freeze/);
assert.match(app, /roomCosmeticLoadout\(player\.id\)\.cardBackId/);
assert.match(app, /COS-BACK-005': Object\.freeze\(\{ asset:'\/cosmetics\/card-backs\/it-department\.webp' \}\)/);
assert.match(app, /cosmetic-badge-preview"><img src=/);

assert.deepEqual(
  COSMETIC_SHOP_CATALOG.filter((entry) => boards.some((board) => board.id === entry.cosmeticId)),
  boards.map((board) => ({ cosmeticId:board.id, price:board.price }))
);
const starterOwned = new Set(defaultCosmeticOwnership().map((grant) => grant.cosmeticId));
for (const board of boards) assert.equal(starterOwned.has(board.id), false);

const accidentalStarter = normalizePlayerCosmetics({ owned:boards.map((board) => ({ cosmeticId:board.id, acquiredAt:1, source:"starter", sourceRef:null })) }, 1);
for (const board of boards) assert.equal(accidentalStarter.owned.some((grant) => grant.cosmeticId === board.id), false);

for (const board of boards) {
  const profile = createPlayerMetaProfile([], 300);
  const purchased = applyCosmeticPurchase(profile, board.id, 10);
  assert.equal(purchased.balances.OFFICE_CREDITS, profile.balances.OFFICE_CREDITS - board.price);
  assert.equal(purchased.cosmetics.owned.some((grant) => grant.cosmeticId === board.id && grant.source === "shop"), true);
  assert.throws(() => applyCosmeticPurchase(purchased, board.id, 11), /COSMETIC_ALREADY_OWNED/);
  const equipped = applyCosmeticEquip(purchased, "boardSkinId", board.id);
  assert.equal(equipped.cosmetics.loadout.boardSkinId, board.id);
}

assert.match(app, /'COS-BOARD-002': Object\.freeze\(\{ slug:'soft-office' \}\)/);
assert.match(app, /'COS-BOARD-003': Object\.freeze\(\{ slug:'midnight-circuit' \}\)/);
assert.match(app, /'COS-BOARD-004': Object\.freeze\(\{ slug:'executive-steel' \}\)/);
assert.match(app, /'COS-BOARD-005': Object\.freeze\(\{ slug:'concrete-minimal' \}\)/);
assert.match(styles, /body\.match-mode \.opponent-board::before \{ transform:rotate\(180deg\); \}/);

console.log("Board cosmetic tests passed.");
