import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { applyCosmeticEquip, applyCosmeticPurchase, COSMETIC_CATALOG, COSMETIC_SHOP_CATALOG, defaultCosmeticOwnership, normalizePlayerCosmetics } from "../src/cosmetics.js";
import { createPlayerMetaProfile } from "../src/economy.js";

const root = (name: string) => fileURLToPath(new URL(`../../${name}`, import.meta.url));
const app = readFileSync(root("public/app.js"), "utf8");
const styles = readFileSync(root("public/styles.css"), "utf8");
const en = readFileSync(root("public/locales/en.js"), "utf8");
const de = readFileSync(root("public/locales/de.js"), "utf8");

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
