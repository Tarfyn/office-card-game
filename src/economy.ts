import { COSMETIC_CATALOG, defaultCosmeticLoadout, defaultCosmeticOwnership, normalizePlayerCosmetics, type PlayerCosmeticState } from "./cosmetics.js";
import { executiveEditionVariantId, isExecutiveEditionEligible, normalizeCardVariantId, variantOwnershipKey } from "./card-variants.js";

export type CurrencyId = "OFFICE_CREDITS" | "SHREDDER_SCRAPS";
export type CollectionMode = "SANDBOX_ALL_AVAILABLE" | "OWNED_COPIES";
export type RewardSource = "starter" | "booster" | "craft" | "achievement" | "ranked" | "season" | "promotion" | "event" | "admin" | "shop" | "alpha_playtest";

export interface PlayerProgression {
  level: number;
  xp: number;
  matchesCompleted: number;
  boostersOpened: number;
  cardsScrapped: number;
  cardsCrafted: number;
}

export interface PlayerMetaProfile {
  profileVersion: number;
  balances: Record<CurrencyId, number>;
  ownedCards: Record<string, number>;
  /** Executive Edition collectible quantities, keyed by deterministic variant id. */
  ownedCardVariants: Record<string, number>;
  /** Entitled but unopened booster packs, keyed by stable pack id. */
  ownedPacks: Record<string, number>;
  collectionMode: CollectionMode;
  claimedRewardRooms: string[];
  rewardGrants: RewardGrant[];
  progression: PlayerProgression;
  cosmetics: PlayerCosmeticState;
}

export interface RewardGrantItem {
  cardId: string;
  quantity: number;
  variantId?: string | null;
}

export interface RewardGrant {
  source: RewardSource;
  sourceRef: string | null;
  cards: RewardGrantItem[];
  officeCredits: number;
  scrap: number;
  cosmetics: string[];
  packs: Array<{ packId: string; quantity: number }>;
  grantedAt: number;
}

export interface CraftingTierConfig {
  id: string;
  label?: string;
  scrapValue: number | null;
  craftCost: number | null;
}

export interface CraftingQuote {
  available: boolean;
  amount: number | null;
  reason: string | null;
}

export function createAlphaMetaProfile(): PlayerMetaProfile {
  return {
    profileVersion: 1,
    balances: {
      OFFICE_CREDITS: 0,
      SHREDDER_SCRAPS: 0
    },
    ownedCards: {},
    ownedCardVariants: {},
    ownedPacks: {},
    collectionMode: "SANDBOX_ALL_AVAILABLE",
    claimedRewardRooms: [],
    rewardGrants: [],
    cosmetics: { owned:defaultCosmeticOwnership(), loadout:defaultCosmeticLoadout("P1") },
    progression: {
      level: 1,
      xp: 0,
      matchesCompleted: 0,
      boostersOpened: 0,
      cardsScrapped: 0,
      cardsCrafted: 0
    }
  };
}

/** Production player shape: explicit starter collection, never catalog-wide ownership. */
export function createPlayerMetaProfile(starterCards: OwnedDeckEntry[] = [], startingOfficeCredits = 0, now = Date.now()): PlayerMetaProfile {
  const profile = createAlphaMetaProfile();
  profile.profileVersion = 2;
  profile.collectionMode = "OWNED_COPIES";
  profile.balances.OFFICE_CREDITS = Math.max(0, Math.floor(Number(startingOfficeCredits) || 0));
  profile.cosmetics = { owned: defaultCosmeticOwnership(now), loadout: defaultCosmeticLoadout("P1") };
  profile.rewardGrants = [];
  if (starterCards.length) {
    return applyRewardGrant(profile, {
      source: "starter",
      sourceRef: "starter:alpha:v1",
      cards: starterCards.map((entry) => ({ cardId: entry.definitionId, quantity: entry.copies })),
      officeCredits: 0,
      scrap: 0,
      cosmetics: [],
      packs: [],
      grantedAt: now
    }, now).profile;
  }
  return profile;
}

export function normalizePlayerMetaProfile(value: Partial<PlayerMetaProfile> | null | undefined, now = Date.now()): PlayerMetaProfile {
  const base = createAlphaMetaProfile();
  const next = { ...base, ...structuredClone(value ?? {}) } as PlayerMetaProfile;
  next.profileVersion = Math.max(1, Math.floor(Number(next.profileVersion) || 1));
  next.collectionMode = next.collectionMode === "OWNED_COPIES" ? "OWNED_COPIES" : "SANDBOX_ALL_AVAILABLE";
  const balances = next.balances ?? {};
  next.balances = { OFFICE_CREDITS:Number(balances.OFFICE_CREDITS ?? 0), SHREDDER_SCRAPS:Number(balances.SHREDDER_SCRAPS ?? 0) };
  for (const currency of ["OFFICE_CREDITS", "SHREDDER_SCRAPS"] as const) next.balances[currency] = Math.max(0, Math.floor(Number(next.balances[currency]) || 0));
  next.ownedCards = Object.fromEntries(Object.entries(next.ownedCards ?? {}).flatMap(([id, quantity]) => {
    const count = Math.max(0, Math.floor(Number(quantity) || 0));
    return id && count > 0 ? [[String(id), count]] : [];
  }));
  next.ownedCardVariants = Object.fromEntries(Object.entries(next.ownedCardVariants ?? {}).flatMap(([id, quantity]) => {
    const count = Math.max(0, Math.floor(Number(quantity) || 0));
    return id && count > 0 ? [[String(id), count]] : [];
  }));
  next.ownedPacks = Object.fromEntries(Object.entries(next.ownedPacks ?? {}).flatMap(([id, quantity]) => {
    const count = Math.max(0, Math.floor(Number(quantity) || 0));
    return id && count > 0 ? [[String(id), count]] : [];
  }));
  next.claimedRewardRooms = Array.isArray(next.claimedRewardRooms) ? [...new Set(next.claimedRewardRooms.map(String))] : [];
  next.rewardGrants = Array.isArray(next.rewardGrants) ? next.rewardGrants.filter(Boolean).map((grant) => ({
    source: grant.source ?? "admin",
    sourceRef: grant.sourceRef == null ? null : String(grant.sourceRef),
    cards: Array.isArray(grant.cards) ? grant.cards.filter((item) => item && item.cardId && Number(item.quantity) > 0).map((item) => ({ cardId:String(item.cardId), quantity:Math.floor(Number(item.quantity)), variantId:item.variantId == null ? null : String(item.variantId) })) : [],
    officeCredits: Math.max(0, Math.floor(Number(grant.officeCredits) || 0)),
    scrap: Math.max(0, Math.floor(Number(grant.scrap) || 0)),
    cosmetics: Array.isArray(grant.cosmetics) ? grant.cosmetics.map(String).filter((id) => COSMETIC_CATALOG[id]) : [],
    packs: Array.isArray(grant.packs) ? grant.packs.filter((item) => item && item.packId && Number(item.quantity) > 0).map((item) => ({ packId:String(item.packId), quantity:Math.floor(Number(item.quantity)) })) : [],
    grantedAt: Number(grant.grantedAt) || now
  })) : [];
  next.progression = { ...base.progression, ...(next.progression ?? {}) };
  for (const key of Object.keys(base.progression) as Array<keyof PlayerProgression>) next.progression[key] = Math.max(0, Math.floor(Number(next.progression[key]) || 0));
  next.progression.level = Math.max(1, next.progression.level);
  next.cosmetics = normalizePlayerCosmetics(next.cosmetics, now);
  return next;
}

export interface RewardGrantReceipt { applied: boolean; profile: PlayerMetaProfile; grant: RewardGrant; }

export function applyRewardGrant(profile: PlayerMetaProfile, grant: RewardGrant, now = Date.now()): RewardGrantReceipt {
  const normalized = normalizePlayerMetaProfile(profile, now);
  const sourceRef = grant.sourceRef == null ? null : String(grant.sourceRef);
  if (sourceRef && normalized.rewardGrants.some((existing) => existing.sourceRef === sourceRef)) return { applied:false, profile:normalized, grant:structuredClone(grant) };
  const next = structuredClone(normalized);
  for (const item of grant.cards ?? []) {
    const quantity = Math.floor(Number(item.quantity));
    if (!item.cardId || quantity <= 0) continue;
    const key = item.variantId ? String(item.variantId) : String(item.cardId);
    if (item.variantId) next.ownedCardVariants[key] = (next.ownedCardVariants[key] ?? 0) + quantity;
    else next.ownedCards[key] = (next.ownedCards[key] ?? 0) + quantity;
  }
  next.balances.OFFICE_CREDITS += Math.max(0, Math.floor(Number(grant.officeCredits) || 0));
  next.balances.SHREDDER_SCRAPS += Math.max(0, Math.floor(Number(grant.scrap) || 0));
  for (const pack of grant.packs ?? []) {
    const quantity = Math.floor(Number(pack.quantity));
    if (pack.packId && quantity > 0) next.ownedPacks[String(pack.packId)] = (next.ownedPacks[String(pack.packId)] ?? 0) + quantity;
  }
  next.cosmetics = normalizePlayerCosmetics(next.cosmetics, now);
  for (const cosmeticId of grant.cosmetics ?? []) {
    if (!COSMETIC_CATALOG[cosmeticId] || next.cosmetics.owned.some((entry) => entry.cosmeticId === cosmeticId)) continue;
    next.cosmetics.owned.push({ cosmeticId, acquiredAt:now, source:grant.source as any, sourceRef });
  }
  next.rewardGrants.push({ ...structuredClone(grant), sourceRef, grantedAt:Number(grant.grantedAt) || now });
  return { applied:true, profile:next, grant:structuredClone(grant) };
}

export function canSpendCurrency(profile: PlayerMetaProfile, currency: CurrencyId, amount: number): boolean {
  return Number.isFinite(amount) && amount >= 0 && profile.balances[currency] >= amount;
}

export function awardCurrency(profile: PlayerMetaProfile, currency: CurrencyId, amount: number): PlayerMetaProfile {
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Currency award must be a non-negative finite number.");
  const next = structuredClone(profile);
  next.balances[currency] += amount;
  return next;
}

export function spendCurrency(profile: PlayerMetaProfile, currency: CurrencyId, amount: number): PlayerMetaProfile {
  if (!canSpendCurrency(profile, currency, amount)) throw new Error(`Insufficient ${currency}.`);
  const next = structuredClone(profile);
  next.balances[currency] -= amount;
  return next;
}

export function quoteScrap(tier: CraftingTierConfig | undefined): CraftingQuote {
  if (!tier) return { available: false, amount: null, reason: "Unknown rarity tier." };
  if (tier.scrapValue == null) return { available: false, amount: null, reason: "Scrap value is not balanced yet." };
  return { available: true, amount: tier.scrapValue, reason: null };
}

export function quoteCraft(tier: CraftingTierConfig | undefined): CraftingQuote {
  if (!tier) return { available: false, amount: null, reason: "Unknown rarity tier." };
  if (tier.craftCost == null) return { available: false, amount: null, reason: "Craft cost is not balanced yet." };
  return { available: true, amount: tier.craftCost, reason: null };
}


export type MatchRewardOutcome = "WIN" | "LOSS" | "DRAW" | "RESIGN_LOSS";

export interface MatchRewardProfileConfig {
  win: number;
  loss: number;
  draw: number;
  resignLoss: number;
  xpWin: number;
  xpLoss: number;
  xpDraw: number;
  xpResignLoss: number;
}

export interface MatchRewardReceipt {
  outcome: MatchRewardOutcome;
  officeCredits: number;
  xp: number;
  profile: PlayerMetaProfile;
}

export function applyMatchReward(
  profile: PlayerMetaProfile,
  outcome: MatchRewardOutcome,
  config: MatchRewardProfileConfig,
  levelXpStep = 100
): MatchRewardReceipt {
  const key = outcome === "WIN" ? "win" : outcome === "LOSS" ? "loss" : outcome === "DRAW" ? "draw" : "resignLoss";
  const xpKey = outcome === "WIN" ? "xpWin" : outcome === "LOSS" ? "xpLoss" : outcome === "DRAW" ? "xpDraw" : "xpResignLoss";
  const officeCredits = Math.max(0, Math.floor(Number(config[key] ?? 0)));
  const xp = Math.max(0, Math.floor(Number(config[xpKey] ?? 0)));
  const next = awardCurrency(profile, "OFFICE_CREDITS", officeCredits);
  next.progression.matchesCompleted += 1;
  next.progression.xp += xp;
  const step = Math.max(1, Math.floor(Number(levelXpStep) || 100));
  next.progression.level = 1 + Math.floor(next.progression.xp / step);
  return { outcome, officeCredits, xp, profile: next };
}

export interface ScrapCollectionRules {
  deckSize: number;
  defaultCopyLimit: number;
  cardLimits?: Record<string, number>;
  legalDefinitionIds?: string[];
}

export interface ScrapEligibility {
  allowed: boolean;
  reason: string | null;
  playableCapacityBefore: number;
  playableCapacityAfter: number;
}

export interface OwnedDeckEntry {
  definitionId: string;
  copies: number;
}

export function seedOwnedCollection(profile: PlayerMetaProfile, cards: OwnedDeckEntry[]): PlayerMetaProfile {
  const next = structuredClone(profile);
  for (const entry of cards) {
    if (!entry?.definitionId || !Number.isInteger(entry.copies) || entry.copies <= 0) continue;
    next.ownedCards[entry.definitionId] = (next.ownedCards[entry.definitionId] ?? 0) + entry.copies;
  }
  return next;
}

export function applyAlphaPlaytestCosmeticGrant(profile: PlayerMetaProfile, now = Date.now()): PlayerMetaProfile {
  return applyRewardGrant(profile, {
    source: "alpha_playtest",
    sourceRef: "alpha-playtest:ranked-frames:v1",
    cards: [], officeCredits: 0, scrap: 0,
    cosmetics: ["COS-FRAME-003", "COS-FRAME-004", "COS-FRAME-005"], packs: [], grantedAt: now
  }, now).profile;
}

function copyLimitFor(definitionId: string, rules: ScrapCollectionRules): number {
  const limit = rules.cardLimits?.[definitionId] ?? rules.defaultCopyLimit;
  return Math.max(0, Number.isFinite(limit) ? Math.floor(limit) : 0);
}

export function collectionPlayableCapacity(profile: PlayerMetaProfile, rules: ScrapCollectionRules): number {
  const ids = rules.legalDefinitionIds ?? Object.keys(profile.ownedCards);
  let total = 0;
  for (const definitionId of ids) {
    const owned = Math.max(0, Math.floor(Number(profile.ownedCards[definitionId] ?? 0))) +
      Object.entries(profile.ownedCardVariants ?? {}).filter(([id]) => id.startsWith(`${definitionId}-`)).reduce((sum, [, value]) => sum + Math.max(0, Math.floor(Number(value) || 0)), 0);
    total += Math.min(owned, copyLimitFor(definitionId, rules));
  }
  return total;
}

export function canBuildLegalDeckFromCollection(profile: PlayerMetaProfile, rules: ScrapCollectionRules): boolean {
  return collectionPlayableCapacity(profile, rules) >= Math.max(0, Math.floor(rules.deckSize));
}

export function scrapEligibility(
  profile: PlayerMetaProfile,
  definitionId: string,
  copies: number,
  rules?: ScrapCollectionRules,
  variantId?: string | null
): ScrapEligibility {
  const fallbackCapacity = rules ? collectionPlayableCapacity(profile, rules) : Object.values(profile.ownedCards).reduce((sum, value) => sum + Math.max(0, Number(value ?? 0)), 0);
  if (!Number.isInteger(copies) || copies <= 0) return { allowed:false, reason:"Scrap copies must be a positive integer.", playableCapacityBefore:fallbackCapacity, playableCapacityAfter:fallbackCapacity };
  const ownershipKey = variantOwnershipKey(definitionId, variantId);
  const owned = variantId ? Math.max(0, Math.floor(Number(profile.ownedCardVariants?.[ownershipKey] ?? 0))) : Math.max(0, Math.floor(Number(profile.ownedCards[definitionId] ?? 0)));
  if (copies > owned) return { allowed:false, reason:"You do not own enough copies to shred.", playableCapacityBefore:fallbackCapacity, playableCapacityAfter:fallbackCapacity };
  if (!rules) return { allowed:true, reason:null, playableCapacityBefore:fallbackCapacity, playableCapacityAfter:fallbackCapacity - copies };
  const next = structuredClone(profile);
  if (variantId) next.ownedCardVariants[ownershipKey] = owned - copies;
  else next.ownedCards[definitionId] = owned - copies;
  const after = collectionPlayableCapacity(next, rules);
  const deckSize = Math.max(0, Math.floor(rules.deckSize));
  if (after < deckSize) return { allowed:false, reason:`Keep enough cards to build one legal ${deckSize}-card deck.`, playableCapacityBefore:fallbackCapacity, playableCapacityAfter:after };
  return { allowed:true, reason:null, playableCapacityBefore:fallbackCapacity, playableCapacityAfter:after };
}

export function canScrapOwnedCard(profile: PlayerMetaProfile, definitionId: string, copies: number, rules?: ScrapCollectionRules): boolean {
  return scrapEligibility(profile, definitionId, copies, rules).allowed;
}

export function applyScrap(
  profile: PlayerMetaProfile,
  definitionId: string,
  copies: number,
  scrapValueEach: number,
  rules?: ScrapCollectionRules,
  variantId?: string | null
): PlayerMetaProfile {
  if (!Number.isFinite(scrapValueEach) || scrapValueEach < 0) throw new Error("Invalid scrap value.");
  const eligibility = scrapEligibility(profile, definitionId, copies, rules, variantId);
  if (!eligibility.allowed) throw new Error(eligibility.reason ?? "Card cannot be shredded.");
  const next = structuredClone(profile);
  const ownershipKey = variantOwnershipKey(definitionId, variantId);
  if (variantId) {
    next.ownedCardVariants[ownershipKey] -= copies;
    if (next.ownedCardVariants[ownershipKey] <= 0) delete next.ownedCardVariants[ownershipKey];
  } else {
    next.ownedCards[definitionId] -= copies;
    if (next.ownedCards[definitionId] <= 0) delete next.ownedCards[definitionId];
  }
  next.balances.SHREDDER_SCRAPS += scrapValueEach * copies;
  next.progression.cardsScrapped += copies;
  return next;
}

export function applyCraft(profile: PlayerMetaProfile, definitionId: string, copies: number, craftCostEach: number, variantId?: string | null): PlayerMetaProfile {
  if (variantId) throw new Error("Executive Edition variants cannot be crafted.");
  if (!Number.isInteger(copies) || copies <= 0) throw new Error("Craft copies must be a positive integer.");
  if (!Number.isFinite(craftCostEach) || craftCostEach < 0) throw new Error("Invalid craft cost.");
  const total = copies * craftCostEach;
  const paid = spendCurrency(profile, "SHREDDER_SCRAPS", total);
  paid.ownedCards[definitionId] = (paid.ownedCards[definitionId] ?? 0) + copies;
  paid.progression.cardsCrafted += copies;
  return paid;
}

import type { CardDefinition, RarityTier } from "./types.js";
import { mulberry32 } from "./rng.js";

export interface BoosterSandboxConfig {
  price: number;
  cardCount: number;
  guaranteedTiers: RarityTier[];
  flexSlotWeights: Partial<Record<RarityTier, number>>;
  /** Provisional per-pack chance, not a gameplay rarity. */
  executiveEditionChancePerPack?: number;
  executiveEditionPool?: CardDefinition[];
}

export interface BoosterOpenResult {
  profile: PlayerMetaProfile;
  cardIds: string[];
  tiers: RarityTier[];
  variantIds: Array<string | null>;
  spentCredits: number;
}

export function sandboxRarityTier(card: CardDefinition): RarityTier {
  if (card.rarityTier) return card.rarityTier;
  const playCost = Number(card.cost?.play ?? card.cost?.set ?? 0);
  if (card.rank === "EXECUTIVE" || playCost >= 5) return "T3";
  if (card.rank === "LEAD" || playCost >= 4) return "T2";
  if (playCost >= 3) return "T1";
  return "T0";
}

export function rarityTierConfig(tiers: CraftingTierConfig[], tierId: string): CraftingTierConfig | undefined {
  return tiers.find((tier) => tier.id === tierId);
}

function weightedTier(weights: Partial<Record<RarityTier, number>>, rng: () => number): RarityTier {
  const entries = Object.entries(weights).filter(([, value]) => Number(value) > 0) as Array<[RarityTier, number]>;
  if (!entries.length) return "T0";
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  let roll = rng() * total;
  for (const [tier, value] of entries) {
    roll -= value;
    if (roll <= 0) return tier;
  }
  return entries.at(-1)![0];
}

function randomCardFromTier(cards: CardDefinition[], tier: RarityTier, rng: () => number): CardDefinition {
  const pool = cards.filter((card) => sandboxRarityTier(card) === tier);
  const fallback = pool.length ? pool : cards;
  if (!fallback.length) throw new Error("Cannot open a booster from an empty card pool.");
  return fallback[Math.floor(rng() * fallback.length)];
}

export function openSandboxBooster(
  profile: PlayerMetaProfile,
  cards: CardDefinition[],
  config: BoosterSandboxConfig,
  seed: number
): BoosterOpenResult {
  if (!Number.isInteger(config.cardCount) || config.cardCount <= 0) throw new Error("Booster card count must be positive.");
  if (!Number.isFinite(config.price) || config.price < 0) throw new Error("Booster price must be non-negative.");
  let next = spendCurrency(profile, "OFFICE_CREDITS", config.price);
  const rng = mulberry32(seed);
  const tiers: RarityTier[] = [];
  while (tiers.length < Math.min(config.cardCount, config.guaranteedTiers.length)) tiers.push(config.guaranteedTiers[tiers.length]);
  while (tiers.length < config.cardCount) tiers.push(weightedTier(config.flexSlotWeights, rng));
  const cardIds = tiers.map((tier) => randomCardFromTier(cards, tier, rng).id);
  const variantIds = cardIds.map(() => null as string | null);
  const premiumChance = Math.min(1, Math.max(0, Number(config.executiveEditionChancePerPack ?? 0)));
  if (premiumChance > 0 && rng() < premiumChance) {
    const pool = (config.executiveEditionPool ?? cards).filter(isExecutiveEditionEligible);
    if (pool.length) {
      const premiumIndex = Math.floor(rng() * cardIds.length);
      const base = pool[Math.floor(rng() * pool.length)];
      cardIds[premiumIndex] = base.id;
      variantIds[premiumIndex] = executiveEditionVariantId(base.id);
    }
  }
  for (const [index, id] of cardIds.entries()) {
    const variantId = variantIds[index];
    if (variantId) next.ownedCardVariants[variantId] = (next.ownedCardVariants[variantId] ?? 0) + 1;
    else next.ownedCards[id] = (next.ownedCards[id] ?? 0) + 1;
  }
  next.progression.boostersOpened += 1;
  next.rewardGrants.push({ source:"booster", sourceRef:null, cards:cardIds.map((cardId, index) => ({ cardId, quantity:1, variantId:variantIds[index] })), officeCredits:0, scrap:0, cosmetics:[], packs:[], grantedAt:Date.now() });
  return { profile: next, cardIds, tiers, variantIds, spentCredits: config.price };
}

export interface ExecutiveEditionPackOpenResult {
  profile: PlayerMetaProfile;
  cardId: string;
  variantId: string;
  spentPacks: number;
}

export function openExecutiveEditionPack(profile: PlayerMetaProfile, cards: CardDefinition[], packId: string, seed: number): ExecutiveEditionPackOpenResult {
  if ((profile.ownedPacks?.[packId] ?? 0) < 1) throw new Error("Executive Edition Pack is not owned.");
  const pool = cards.filter(isExecutiveEditionEligible);
  if (!pool.length) throw new Error("Cannot open an Executive Edition Pack from an empty card pool.");
  const rng = mulberry32(seed);
  const card = pool[Math.floor(rng() * pool.length)];
  const variantId = executiveEditionVariantId(card.id);
  const next = structuredClone(profile);
  next.ownedPacks[packId] -= 1;
  if (next.ownedPacks[packId] <= 0) delete next.ownedPacks[packId];
  next.ownedCardVariants[variantId] = (next.ownedCardVariants[variantId] ?? 0) + 1;
  next.progression.boostersOpened += 1;
  next.rewardGrants.push({ source:"booster", sourceRef:null, cards:[{ cardId:card.id, quantity:1, variantId }], officeCredits:0, scrap:0, cosmetics:[], packs:[], grantedAt:Date.now() });
  return { profile:next, cardId:card.id, variantId, spentPacks:1 };
}

export function createEconomySandboxProfile(startingCredits = 500): PlayerMetaProfile {
  const profile = createAlphaMetaProfile();
  profile.balances.OFFICE_CREDITS = startingCredits;
  return profile;
}
