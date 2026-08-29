export function createAlphaMetaProfile() {
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
export function canSpendCurrency(profile, currency, amount) {
    return Number.isFinite(amount) && amount >= 0 && profile.balances[currency] >= amount;
}
export function awardCurrency(profile, currency, amount) {
    if (!Number.isFinite(amount) || amount < 0)
        throw new Error("Currency award must be a non-negative finite number.");
    const next = structuredClone(profile);
    next.balances[currency] += amount;
    return next;
}
export function spendCurrency(profile, currency, amount) {
    if (!canSpendCurrency(profile, currency, amount))
        throw new Error(`Insufficient ${currency}.`);
    const next = structuredClone(profile);
    next.balances[currency] -= amount;
    return next;
}
export function quoteScrap(tier) {
    if (!tier)
        return { available: false, amount: null, reason: "Unknown rarity tier." };
    if (tier.scrapValue == null)
        return { available: false, amount: null, reason: "Scrap value is not balanced yet." };
    return { available: true, amount: tier.scrapValue, reason: null };
}
export function quoteCraft(tier) {
    if (!tier)
        return { available: false, amount: null, reason: "Unknown rarity tier." };
    if (tier.craftCost == null)
        return { available: false, amount: null, reason: "Craft cost is not balanced yet." };
    return { available: true, amount: tier.craftCost, reason: null };
}
export function applyMatchReward(profile, outcome, config, levelXpStep = 100) {
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
export function seedOwnedCollection(profile, cards) {
    const next = structuredClone(profile);
    for (const entry of cards) {
        if (!entry?.definitionId || !Number.isInteger(entry.copies) || entry.copies <= 0)
            continue;
        next.ownedCards[entry.definitionId] = (next.ownedCards[entry.definitionId] ?? 0) + entry.copies;
    }
    return next;
}
function copyLimitFor(definitionId, rules) {
    const limit = rules.cardLimits?.[definitionId] ?? rules.defaultCopyLimit;
    return Math.max(0, Number.isFinite(limit) ? Math.floor(limit) : 0);
}
export function collectionPlayableCapacity(profile, rules) {
    const ids = rules.legalDefinitionIds ?? Object.keys(profile.ownedCards);
    let total = 0;
    for (const definitionId of ids) {
        const owned = Math.max(0, Math.floor(Number(profile.ownedCards[definitionId] ?? 0)));
        total += Math.min(owned, copyLimitFor(definitionId, rules));
    }
    return total;
}
export function canBuildLegalDeckFromCollection(profile, rules) {
    return collectionPlayableCapacity(profile, rules) >= Math.max(0, Math.floor(rules.deckSize));
}
export function scrapEligibility(profile, definitionId, copies, rules) {
    const fallbackCapacity = rules ? collectionPlayableCapacity(profile, rules) : Object.values(profile.ownedCards).reduce((sum, value) => sum + Math.max(0, Number(value ?? 0)), 0);
    if (!Number.isInteger(copies) || copies <= 0)
        return { allowed: false, reason: "Scrap copies must be a positive integer.", playableCapacityBefore: fallbackCapacity, playableCapacityAfter: fallbackCapacity };
    const owned = Math.max(0, Math.floor(Number(profile.ownedCards[definitionId] ?? 0)));
    if (copies > owned)
        return { allowed: false, reason: "You do not own enough copies to shred.", playableCapacityBefore: fallbackCapacity, playableCapacityAfter: fallbackCapacity };
    if (!rules)
        return { allowed: true, reason: null, playableCapacityBefore: fallbackCapacity, playableCapacityAfter: fallbackCapacity - copies };
    const next = structuredClone(profile);
    next.ownedCards[definitionId] = owned - copies;
    const after = collectionPlayableCapacity(next, rules);
    const deckSize = Math.max(0, Math.floor(rules.deckSize));
    if (after < deckSize)
        return { allowed: false, reason: `Keep enough cards to build one legal ${deckSize}-card deck.`, playableCapacityBefore: fallbackCapacity, playableCapacityAfter: after };
    return { allowed: true, reason: null, playableCapacityBefore: fallbackCapacity, playableCapacityAfter: after };
}
export function canScrapOwnedCard(profile, definitionId, copies, rules) {
    return scrapEligibility(profile, definitionId, copies, rules).allowed;
}
export function applyScrap(profile, definitionId, copies, scrapValueEach, rules) {
    if (!Number.isFinite(scrapValueEach) || scrapValueEach < 0)
        throw new Error("Invalid scrap value.");
    const eligibility = scrapEligibility(profile, definitionId, copies, rules);
    if (!eligibility.allowed)
        throw new Error(eligibility.reason ?? "Card cannot be shredded.");
    const next = structuredClone(profile);
    next.ownedCards[definitionId] -= copies;
    if (next.ownedCards[definitionId] <= 0)
        delete next.ownedCards[definitionId];
    next.balances.SHREDDER_SCRAPS += scrapValueEach * copies;
    next.progression.cardsScrapped += copies;
    return next;
}
export function applyCraft(profile, definitionId, copies, craftCostEach) {
    if (!Number.isInteger(copies) || copies <= 0)
        throw new Error("Craft copies must be a positive integer.");
    if (!Number.isFinite(craftCostEach) || craftCostEach < 0)
        throw new Error("Invalid craft cost.");
    const total = copies * craftCostEach;
    const paid = spendCurrency(profile, "SHREDDER_SCRAPS", total);
    paid.ownedCards[definitionId] = (paid.ownedCards[definitionId] ?? 0) + copies;
    paid.progression.cardsCrafted += copies;
    return paid;
}
import { mulberry32 } from "./rng.js";
export function sandboxRarityTier(card) {
    if (card.rarityTier)
        return card.rarityTier;
    const playCost = Number(card.cost?.play ?? card.cost?.set ?? 0);
    if (card.rank === "EXECUTIVE" || playCost >= 5)
        return "T3";
    if (card.rank === "LEAD" || playCost >= 4)
        return "T2";
    if (playCost >= 3)
        return "T1";
    return "T0";
}
export function rarityTierConfig(tiers, tierId) {
    return tiers.find((tier) => tier.id === tierId);
}
function weightedTier(weights, rng) {
    const entries = Object.entries(weights).filter(([, value]) => Number(value) > 0);
    if (!entries.length)
        return "T0";
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    let roll = rng() * total;
    for (const [tier, value] of entries) {
        roll -= value;
        if (roll <= 0)
            return tier;
    }
    return entries.at(-1)[0];
}
function randomCardFromTier(cards, tier, rng) {
    const pool = cards.filter((card) => sandboxRarityTier(card) === tier);
    const fallback = pool.length ? pool : cards;
    if (!fallback.length)
        throw new Error("Cannot open a booster from an empty card pool.");
    return fallback[Math.floor(rng() * fallback.length)];
}
export function openSandboxBooster(profile, cards, config, seed) {
    if (!Number.isInteger(config.cardCount) || config.cardCount <= 0)
        throw new Error("Booster card count must be positive.");
    if (!Number.isFinite(config.price) || config.price < 0)
        throw new Error("Booster price must be non-negative.");
    let next = spendCurrency(profile, "OFFICE_CREDITS", config.price);
    const rng = mulberry32(seed);
    const tiers = [];
    while (tiers.length < Math.min(config.cardCount, config.guaranteedTiers.length))
        tiers.push(config.guaranteedTiers[tiers.length]);
    while (tiers.length < config.cardCount)
        tiers.push(weightedTier(config.flexSlotWeights, rng));
    const cardIds = tiers.map((tier) => randomCardFromTier(cards, tier, rng).id);
    for (const id of cardIds)
        next.ownedCards[id] = (next.ownedCards[id] ?? 0) + 1;
    next.progression.boostersOpened += 1;
    return { profile: next, cardIds, tiers, spentCredits: config.price };
}
export function createEconomySandboxProfile(startingCredits = 500) {
    const profile = createAlphaMetaProfile();
    profile.balances.OFFICE_CREDITS = startingCredits;
    return profile;
}
