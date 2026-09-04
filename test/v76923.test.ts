import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { applyCosmeticEquip, applyCosmeticPurchase, cosmeticIsOwned, normalizePlayerCosmetics, COSMETIC_CATALOG, COSMETIC_SHOP_CATALOG } from "../src/cosmetics.js";
import { createAlphaMetaProfile } from "../src/economy.js";

let passed = 0;
function test(name: string, fn: () => void) { fn(); passed += 1; console.log(`✓ ${name}`); }
const root = (name: string) => readFileSync(fileURLToPath(new URL(`../../${name}`, import.meta.url)), "utf8");
const app = root("public/app.js");
const styles = root("public/styles.css");
const server = root("server/server.mjs");
const en = root("public/locales/en.js");
const de = root("public/locales/de.js");

test("cosmetic ownership starts with grants and hides unowned catalog items", () => {
  const profile = createAlphaMetaProfile();
  assert.deepEqual(profile.cosmetics.owned.map((grant) => grant.cosmeticId), ["COS-BOARD-001", "COS-AVA-001", "COS-AVA-002", "COS-BACK-001"]);
  assert.equal(cosmeticIsOwned(profile.cosmetics, "COS-AVA-002"), true);
  assert.equal(cosmeticIsOwned(profile.cosmetics, "COS-AVA-003"), false);
  assert.equal(cosmeticIsOwned(profile.cosmetics, "COS-FRAME-003"), false);
  assert.equal(COSMETIC_CATALOG["COS-AVA-002"].kind, "AVATAR");
});

test("shop availability is explicit and purchase is authoritative and atomic", () => {
  const profile = createAlphaMetaProfile();
  profile.balances.OFFICE_CREDITS = 300;
  assert.deepEqual(COSMETIC_SHOP_CATALOG.map((item) => item.cosmeticId), ["COS-BOARD-002", "COS-BOARD-003", "COS-BOARD-004", "COS-BOARD-005", "COS-AVA-002", "COS-AVA-003", "COS-AVA-004", "COS-AVA-005", "COS-AVA-006", "COS-FRAME-002", "COS-BACK-004", "COS-BACK-005"]);
  const purchased = applyCosmeticPurchase(profile, "COS-AVA-003", 123);
  assert.equal(purchased.balances.OFFICE_CREDITS, 60);
  assert.equal(purchased.cosmetics.owned.at(-1)?.source, "shop");
  assert.throws(() => applyCosmeticPurchase(purchased, "COS-AVA-003"), /COSMETIC_ALREADY_OWNED/);
  const poor = createAlphaMetaProfile();
  assert.throws(() => applyCosmeticPurchase(poor, "COS-AVA-003"), /COSMETIC_INSUFFICIENT_CREDITS/);
});

test("equip validates ownership and slot compatibility, including optional unequip", () => {
  const profile = createAlphaMetaProfile();
  assert.throws(() => applyCosmeticEquip(profile, "avatarId", "COS-AVA-003"), /COSMETIC_NOT_OWNED/);
  assert.throws(() => applyCosmeticEquip(profile, "boardSkinId", "COS-AVA-001"), /COSMETIC_WRONG_SLOT/);
  const equipped = applyCosmeticEquip(profile, "avatarId", "COS-AVA-002");
  assert.equal(equipped.cosmetics.loadout.avatarId, "COS-AVA-002");
  const optional = applyCosmeticEquip(equipped, "titleId", null);
  assert.equal(optional.cosmetics.loadout.titleId, null);
  assert.equal(normalizePlayerCosmetics(undefined).loadout.cardBackId, "COS-BACK-001");
});

test("personnel and shop surfaces use separate authenticated endpoints and lobby navigation", () => {
  assert.match(server, /\/api\/cosmetics\/personnel/);
  assert.match(server, /\/api\/cosmetics\/shop/);
  assert.match(server, /profiles\.purchaseCosmetic/);
  assert.match(server, /profiles\.equipCosmetic/);
  assert.match(app, /id="openPersonnel"/);
  assert.match(app, /id="openStore"/);
  assert.match(app, /function renderPersonnelFile\(\)/);
  assert.match(app, /function renderCompanyStore\(\)/);
  assert.match(app, /state\.mode='PLAY';render\(\)/);
  assert.match(app, /const selectedSlot = COSMETIC_SLOT_BY_KIND\[state\.cosmeticCategory\]/);
});

test("new cosmetic surfaces have complete English and German localization anchors", () => {
  for (const key of ["personnel", "shop", "owned", "equipped", "equip", "unequip", "buy", "buyQuestion", "insufficientCredits", "emptyCategory", "shopEmpty", "shopEmptyHint", "currentLoadout"]) {
    assert.match(en, new RegExp(`${key}:`));
    assert.match(de, new RegExp(`${key}:`));
  }
  assert.match(de, /personnel: "Personalakte"/);
  assert.match(de, /shop: "Firmen-Shop"/);
  assert.match(en, /shopEmpty: "No items are listed in this category right now\."/);
  assert.match(de, /shopEmpty: "Derzeit sind in dieser Kategorie keine Artikel verfügbar\."/);
  assert.match(app, /const emptyHint = shop \? t\('cosmetics\.shopEmptyHint'\) : t\('cosmetics\.emptyCategoryHint'\)/);
  assert.match(app, /data-cosmetic-kind=/);
  assert.match(app, /cosmetic-grid \$\{visibleItems\.length\?'':'is-empty'\}/);
  assert.match(styles, /repeat\(auto-fill,minmax\(min\(100%,280px\),320px\)\)/);
  assert.match(styles, /data-cosmetic-kind="BOARD"\] \{ grid-column:span 2/);
  assert.match(styles, /cosmetic-grid\.is-empty \{ min-height:clamp\(230px,22vh,360px\)/);
  assert.match(styles, /cosmetic-item-state b \{ display:inline-flex/);
});

console.log(`\n${passed}/${passed} v7.69.26 tests passed.`);
