import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { alphaDefinitions } from "../src/cards.js";
import { alphaDeckPresets } from "../src/decks.js";
import { ALPHA_FORMAT } from "../src/formats.js";
import { createMatch } from "../src/engine.js";
import type { RarityTier } from "../src/types.js";
import {
  applyAlphaPlaytestCosmeticGrant,
  applyCraft,
  applyRewardGrant,
  applyScrap,
  ALPHA_EXECUTIVE_TEST_CARD_ID,
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
import { PlayerProfileService, type GuestCredentialStoreSnapshot, type PlayerDataStoreSnapshot } from "../src/profile.js";

const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
const styles = readFileSync(fileURLToPath(new URL("../../public/styles.css", import.meta.url)), "utf8");

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
const alphaExecutiveId = executiveEditionVariantId(ALPHA_EXECUTIVE_TEST_CARD_ID);
assert.equal(alpha.ownedCardVariants[alphaExecutiveId], 1);
assert.equal(applyAlphaPlaytestCosmeticGrant(alpha, 2).ownedCardVariants[alphaExecutiveId], 1);
assert.equal(production.ownedCardVariants[alphaExecutiveId] ?? 0, 0);

assert.match(app, /id="collectionFinishFilter"/);
assert.match(app, /data-card-variant/);
assert.match(app, /data-deck-finish-swap/);
assert.match(styles, /--exec-foil-opacity:\.62/);
assert.match(styles, /repeating-linear-gradient\(112deg,#e85a78/);
assert.match(styles, /--mx:50%;[\s\S]*--posx:50%;[\s\S]*--hyp:0;/);
assert.match(styles, /background-blend-mode:soft-light,hue,hard-light,screen,normal/);
assert.match(styles, /filter:brightness\(calc\(\.76 \+ \(var\(--hyp\) \* \.16\)\)\) contrast\(1\.72\) saturate\(1\.28\)/);
assert.match(styles, /\.hover-card-face\.executive-edition \{ --exec-foil-opacity:\.70; \}/);
assert.match(styles, /\.hover-card-face\.executive-edition \.card-art-window::after/);
assert.match(styles, /\.card-art-stage \.executive-art-foil::before/);
assert.match(styles, /radial-gradient\(farthest-corner ellipse at var\(--mx\) var\(--my\)/);
assert.match(app, /style\.setProperty\('--mx'/);
assert.match(app, /style\.setProperty\('--hyp'/);
assert.match(styles, /\.catalog-art-stage \.executive-art-foil[\s\S]*background:var\(--exec-foil-background\)/);
assert.match(styles, /body\.match-mode \.hover-card-face\.executive-edition[\s\S]*background:var\(--exec-card-background\)/);
assert.doesNotMatch(styles, /@media\s*\([^)]*hover\s*:\s*hover[^)]*\)[^{]*\{[^}]*executive-art-foil/);

let players: PlayerDataStoreSnapshot | null = null;
let credentials: GuestCredentialStoreSnapshot | null = null;
const stores = {
  playerPersistence:{ storageLabel:"ALPHA_PLAYERS", load:() => players, save:(snapshot:PlayerDataStoreSnapshot) => { players = structuredClone(snapshot); } },
  credentialPersistence:{ storageLabel:"ALPHA_CREDENTIALS", load:() => credentials, save:(snapshot:GuestCredentialStoreSnapshot) => { credentials = structuredClone(snapshot); } }
};
const preAlpha = new PlayerProfileService({ ...stores, idFactory:() => "existing-alpha", tokenFactory:() => "existing-alpha-token", alphaPlaytest:false });
const existing = preAlpha.create();
const alphaRestore = new PlayerProfileService({ ...stores, alphaPlaytest:true });
const restored = alphaRestore.get(existing.profileToken);
for (const id of ["COS-FRAME-003", "COS-FRAME-004", "COS-FRAME-005"]) assert.equal(cosmeticIsOwned(restored.meta.cosmetics, id), true);
assert.equal(restored.meta.ownedCardVariants[alphaExecutiveId], 1);
assert.equal(restored.meta.rewardGrants.filter((grant) => grant.sourceRef === "alpha-playtest:ranked-frames:v1").length, 1);
assert.equal(restored.meta.rewardGrants.filter((grant) => grant.sourceRef === "alpha-playtest:executive-card:v1").length, 1);
const alphaRestart = new PlayerProfileService({ ...stores, alphaPlaytest:true });
assert.equal(alphaRestart.get(existing.profileToken).meta.rewardGrants.filter((grant) => grant.sourceRef === "alpha-playtest:ranked-frames:v1").length, 1);
assert.equal(alphaRestart.get(existing.profileToken).meta.ownedCardVariants[alphaExecutiveId], 1);
const freshAlpha = alphaRestart.create().profile;
for (const id of ["COS-FRAME-003", "COS-FRAME-004", "COS-FRAME-005"]) assert.equal(cosmeticIsOwned(freshAlpha.meta.cosmetics, id), true);
assert.equal(freshAlpha.meta.ownedCardVariants[alphaExecutiveId], 1);

const qaDeck = alphaDeckPresets["customer-service-starter"].cards.flatMap((entry) => {
  if (entry.definitionId !== ALPHA_EXECUTIVE_TEST_CARD_ID) return [{ ...entry }];
  const standardCopies = Math.max(0, entry.copies - 1);
  return [
    ...(standardCopies ? [{ ...entry, copies: standardCopies }] : []),
    { ...entry, copies: 1, variantId: alphaExecutiveId }
  ];
});
const qaMatch = createMatch({
  matchId: "alpha-executive-qa",
  seed: 76934,
  firstPlayerId: "P1",
  definitions: alphaDefinitions,
  p1Deck: qaDeck,
  p2Deck: alphaDeckPresets["it-starter"].cards,
  format: ALPHA_FORMAT,
  qaSetup: { forceOpeningHandVariantId: alphaExecutiveId }
});
assert.ok(qaMatch.players.P1.hand.some((instanceId) => qaMatch.cards[instanceId]?.variantId === alphaExecutiveId));
const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8");
assert.match(server, /SERVER_MODE === "LOCAL" && process\.env\.OCG_ALPHA_QA_EXECUTIVE === "1"/);
assert.match(server, /forceOpeningHandVariantId: executiveEditionVariantId\("CS-001"\)/);

console.log("\nExecutive Edition and Alpha ranked-frame regression tests passed.");
