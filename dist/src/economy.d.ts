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
export declare function createAlphaMetaProfile(): PlayerMetaProfile;
export declare function canSpendCurrency(profile: PlayerMetaProfile, currency: CurrencyId, amount: number): boolean;
export declare function awardCurrency(profile: PlayerMetaProfile, currency: CurrencyId, amount: number): PlayerMetaProfile;
export declare function spendCurrency(profile: PlayerMetaProfile, currency: CurrencyId, amount: number): PlayerMetaProfile;
export declare function quoteScrap(tier: CraftingTierConfig | undefined): CraftingQuote;
export declare function quoteCraft(tier: CraftingTierConfig | undefined): CraftingQuote;
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
export declare function applyMatchReward(profile: PlayerMetaProfile, outcome: MatchRewardOutcome, config: MatchRewardProfileConfig, levelXpStep?: number): MatchRewardReceipt;
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
export declare function seedOwnedCollection(profile: PlayerMetaProfile, cards: OwnedDeckEntry[]): PlayerMetaProfile;
export declare function collectionPlayableCapacity(profile: PlayerMetaProfile, rules: ScrapCollectionRules): number;
export declare function canBuildLegalDeckFromCollection(profile: PlayerMetaProfile, rules: ScrapCollectionRules): boolean;
export declare function scrapEligibility(profile: PlayerMetaProfile, definitionId: string, copies: number, rules?: ScrapCollectionRules): ScrapEligibility;
export declare function canScrapOwnedCard(profile: PlayerMetaProfile, definitionId: string, copies: number, rules?: ScrapCollectionRules): boolean;
export declare function applyScrap(profile: PlayerMetaProfile, definitionId: string, copies: number, scrapValueEach: number, rules?: ScrapCollectionRules): PlayerMetaProfile;
export declare function applyCraft(profile: PlayerMetaProfile, definitionId: string, copies: number, craftCostEach: number): PlayerMetaProfile;
import type { CardDefinition, RarityTier } from "./types.js";
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
export declare function sandboxRarityTier(card: CardDefinition): RarityTier;
export declare function rarityTierConfig(tiers: CraftingTierConfig[], tierId: string): CraftingTierConfig | undefined;
export declare function openSandboxBooster(profile: PlayerMetaProfile, cards: CardDefinition[], config: BoosterSandboxConfig, seed: number): BoosterOpenResult;
export declare function createEconomySandboxProfile(startingCredits?: number): PlayerMetaProfile;
