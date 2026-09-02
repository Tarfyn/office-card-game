import { strict as assert } from "node:assert";
import { alphaDefinitions } from "../src/cards.js";
import { ALPHA_FORMAT } from "../src/formats.js";
import type { RarityTier } from "../src/types.js";
import {
  applyAlphaPlaytestCosmeticGrant,
  applyCraft,
  applyRewardGrant,
  applyScrap,
  createAlphaMetaProfile,
  createPlayerMetaProfile,
  openExecutiveEditionPack,
  openSandboxBooster
} from "../src/economy.js";
import { COSMETIC_SHOP_CATALOG, cosmeticIsOwned } from "../src/cosmetics.js";
import {
  baseCardIdForVariant,
  executiveEditionVariantId,
  isExecutiveEditionEligible
} from "../src/card-variants.js";
import { assertDeckInput } from "../src/player-decks.js";

const cards = Object.values(alphaDefinitions);
const base = cards.find(isExecutiveEditionEligible)!;
const baseId = base.id;
const executiveId = executiveEditionVariantId(baseId);

assert.ok(base, "the Alpha catalog must contain an Executive Edition eligible card");
assert.equal(baseCardIdForVariant(executiveId), baseId);
assert.equal(cards.some((card) => card.id === executiveId), false);
assert.ok(cards.filter(isExecutiveEditionEligible).length >= 100, "eligible variants should derive from the collectible catalog");

const mixedDeck = {
  cards: [
    { definitionId: baseId, copies: 1 },
    { definitionId: baseId, variantId: executiveId, copies: 1 }
  ]
};
assert.doesNotThrow(() => assertDeckInput(mixedDeck, alphaDefinitions, ALPHA_FORMAT));
assert.throws(() => assertDeckInput({
  cards: [
    { definitionId: baseId, copies: 3 },
    { definitionId: baseId, variantId: executiveId, copies: 1 }
  ]
}, alphaDefinitions, ALPHA_FORMAT), /DECK_COPY_LIMIT/);

let profile = createAlphaMetaProfile();
profile.ownedCards[baseId] = 1;
let receipt = applyRewardGrant(profile, {
  source: "admin",
  sourceRef: "test:executive:ownership",
  cards: [{ cardId:baseId, quantity:1, variantId:executiveId }],
  officeCredits: 0,
  scrap: 0,
  cosmetics: [],
  packs: [],
  grantedAt: 1
});
assert.equal(receipt.applied, true);
profile = receipt.profile;
assert.equal(profile.ownedCards[baseId], 1);
assert.equal(profile.ownedCardVariants[executiveId], 1);
assert.equal(applyRewardGrant(profile, receipt.grant).applied, false);

assert.throws(() => applyCraft(profile, baseId, 1, 150, executiveId), /Executive Edition/);
profile.balances.SHREDDER_SCRAPS = 0;
profile = applyScrap(profile, baseId, 1, 10, undefined, executiveId);
assert.equal(profile.ownedCardVariants[executiveId], undefined);
assert.equal(profile.balances.SHREDDER_SCRAPS, 10);
assert.equal(profile.ownedCards[baseId], 1);

const boosterConfig = {
  price: 0,
  cardCount: 1,
  guaranteedTiers: ["T0" as RarityTier],
  flexSlotWeights: {},
  executiveEditionChancePerPack: 1,
  executiveEditionPool: [base]
};
const boosterA = openSandboxBooster(createAlphaMetaProfile(), cards, boosterConfig, 77);
const boosterB = openSandboxBooster(createAlphaMetaProfile(), cards, boosterConfig, 77);
assert.deepEqual(boosterA.variantIds, boosterB.variantIds);
assert.equal(boosterA.variantIds[0], executiveId);
assert.equal(boosterA.profile.ownedCardVariants[executiveId], 1);
assert.equal(boosterA.profile.ownedCards[baseId] ?? 0, 0);

const rewardPackProfile = createAlphaMetaProfile();
rewardPackProfile.ownedPacks.EXECUTIVE_EDITION_PACK = 1;
const openedPack = openExecutiveEditionPack(rewardPackProfile, cards, "EXECUTIVE_EDITION_PACK", 9);
assert.equal(openedPack.spentPacks, 1);
assert.match(openedPack.variantId, /-EXEC$/);
assert.equal(openedPack.profile.ownedCardVariants[openedPack.variantId], 1);
assert.equal(openedPack.profile.ownedPacks.EXECUTIVE_EDITION_PACK, undefined);

const production = createPlayerMetaProfile();
for (const id of ["COS-FRAME-003", "COS-FRAME-004", "COS-FRAME-005"]) {
  assert.equal(cosmeticIsOwned(production.cosmetics, id), false);
}
const alpha = applyAlphaPlaytestCosmeticGrant(production, 1);
for (const id of ["COS-FRAME-003", "COS-FRAME-004", "COS-FRAME-005"]) {
  assert.equal(cosmeticIsOwned(alpha.cosmetics, id), true);
}
assert.equal(COSMETIC_SHOP_CATALOG.some((entry) => ["COS-FRAME-003", "COS-FRAME-004", "COS-FRAME-005"].includes(entry.cosmeticId)), false);

console.log("\n1/1 v7.69.33 Executive Edition tests passed.");
