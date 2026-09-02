import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { COSMETIC_CATALOG, COSMETIC_IDS, sortCosmeticItems } from "../src/cosmetics.js";

const ranks = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/ranked/ranks.json", import.meta.url)), "utf8")).ranks;
const ids = [COSMETIC_IDS.bronzeRankedS01Frame, COSMETIC_IDS.goldRankedS01Frame, COSMETIC_IDS.diamondRankedS01Frame, COSMETIC_IDS.silverRankedS01Frame];
const items = ids.map((id) => ({ definition:COSMETIC_CATALOG[id] }));
assert.deepEqual(sortCosmeticItems(items, ranks).map((item) => item.definition.id), [
  COSMETIC_IDS.bronzeRankedS01Frame,
  COSMETIC_IDS.silverRankedS01Frame,
  COSMETIC_IDS.goldRankedS01Frame,
  COSMETIC_IDS.diamondRankedS01Frame
]);
const withFuture = [...items, { definition:{ ...COSMETIC_CATALOG[COSMETIC_IDS.silverRankedS01Frame], id:"COS-FRAME-007", rankTierId:"PLATINUM" } }];
assert.equal(sortCosmeticItems(withFuture, ranks).at(-1)?.definition.rankTierId, "DIAMOND");
console.log("\n1/1 ranked avatar frame ordering tests passed.");
