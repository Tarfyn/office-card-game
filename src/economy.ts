export type CurrencyId = "OFFICE_CREDITS" | "SHREDDER_SCRAPS";
export type CollectionMode = "SANDBOX_ALL_AVAILABLE" | "OWNED_COPIES";

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
  collectionMode: CollectionMode;
  claimedRewardRooms: string[];
  progression: PlayerProgression;
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
    collectionMode: "SANDBOX_ALL_AVAILABLE",
    claimedRewardRooms: [],
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

function copyLimitFor(definitionId: string, rules: ScrapCollectionRules): number {
  const limit = rules.cardLimits?.[definitionId] ?? rules.defaultCopyLimit;
  return Math.max(0, Number.isFinite(limit) ? Math.floor(limit) : 0);
}

export function collectionPlayableCapacity(profile: PlayerMetaProfile, rules: ScrapCollectionRules): number {
  const ids = rules.legalDefinitionIds ?? Object.keys(profile.ownedCards);
  let total = 0;
  for (const definitionId of ids) {
    const owned = Math.max(0, Math.floor(Number(profile.ownedCards[definitionId] ?? 0)));
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
  rules?: ScrapCollectionRules
): ScrapEligibility {
  const fallbackCapacity = rules ? collectionPlayableCapacity(profile, rules) : Object.values(profile.ownedCards).reduce((sum, value) => sum + Math.max(0, Number(value ?? 0)), 0);
  if (!Number.isInteger(copies) || copies <= 0) return { allowed:false, reason:"Scrap copies must be a positive integer.", playableCapacityBefore:fallbackCapacity, playableCapacityAfter:fallbackCapacity };
  const owned = Math.max(0, Math.floor(Number(profile.ownedCards[definitionId] ?? 0)));
  if (copies > owned) return { allowed:false, reason:"You do not own enough copies to shred.", playableCapacityBefore:fallbackCapacity, playableCapacityAfter:fallbackCapacity };
  if (!rules) return { allowed:true, reason:null, playableCapacityBefore:fallbackCapacity, playableCapacityAfter:fallbackCapacity - copies };
  const next = structuredClone(profile);
  next.ownedCards[definitionId] = owned - copies;
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
  rules?: ScrapCollectionRules
): PlayerMetaProfile {
  if (!Number.isFinite(scrapValueEach) || scrapValueEach < 0) throw new Error("Invalid scrap value.");
  const eligibility = scrapEligibility(profile, definitionId, copies, rules);
  if (!eligibility.allowed) throw new Error(eligibility.reason ?? "Card cannot be shredded.");
  const next = structuredClone(profile);
  next.ownedCards[definitionId] -= copies;
  if (next.ownedCards[definitionId] <= 0) delete next.ownedCards[definitionId];
  next.balances.SHREDDER_SCRAPS += scrapValueEach * copies;
  next.progression.cardsScrapped += copies;
  return next;
}

export function applyCraft(profile: PlayerMetaProfile, definitionId: string, copies: number, craftCostEach: number): PlayerMetaProfile {
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
}

export interface BoosterOpenResult {
  profile: PlayerMetaProfile;
  cardIds: string[];
  tiers: RarityTier[];
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
  for (const id of cardIds) next.ownedCards[id] = (next.ownedCards[id] ?? 0) + 1;
  next.progression.boostersOpened += 1;
  return { profile: next, cardIds, tiers, spentCredits: config.price };
}

export function createEconomySandboxProfile(startingCredits = 500): PlayerMetaProfile {
  const profile = createAlphaMetaProfile();
  profile.balances.OFFICE_CREDITS = startingCredits;
  return profile;
}
