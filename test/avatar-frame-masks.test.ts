import { strict as assert } from "node:assert";
import { deriveAvatarFrameMask } from "../src/avatar-frame-masks.js";

const alpha = new Uint8Array(25).fill(255);
for (const index of [6, 7, 8, 11, 12, 13, 16, 17, 18]) alpha[index] = 0;
const derived = deriveAvatarFrameMask({ width:5, height:5, alpha }, 16, 0);
assert.equal(derived.openingPixels, 9);
assert.equal(derived.mask[12], 255);
assert.equal(derived.mask[0], 0);
const leaking = new Uint8Array(alpha); leaking[4] = 0;
assert.equal(deriveAvatarFrameMask({ width:5, height:5, alpha:leaking }, 16, 0).openingPixels, 9);
console.log("\n1/1 generic avatar frame mask derivation tests passed.");
