export type RankedStandingStatus = "PLACEMENT" | "RATED";
export type RankedSeasonPhase = "PRESEASON" | "SEASON";
export type RankedOutcome = "WIN" | "LOSS" | "DRAW" | "RESIGN_LOSS";

export interface RankedTierDefinition {
  id: string;
  order: number;
  displayKey: string;
  mmrMin: number;
  mmrMax: number | null;
  divisions?: string[];
  divisionThresholds?: Record<string, number>;
  rewards?: unknown[];
}

export interface RankedSeasonDefinition {
  id: string;
  nameKey: string;
  phase: RankedSeasonPhase;
  placementsRequired?: number;
  rewards?: unknown[];
  active?: boolean;
}

export interface RankedContentConfig {
  ranks: RankedTierDefinition[];
  seasons: RankedSeasonDefinition[];
}

export interface RankedSystemConfig {
  enabled: boolean;
  currentSeasonId: string;
  phase: RankedSeasonPhase;
  initialRating: number;
  minimumRating: number;
  placementsRequired: number;
  ratingScale: number;
  placementK: number;
  ratedK: number;
  matchmaking: {
    initialRatingWindow: number;
    widenEverySeconds: number;
    widenByRating: number;
    maxRatingWindow: number;
  };
}

export interface RankedResultReceipt {
  roomId: string;
  seasonId: string;
  outcome: RankedOutcome;
  ratingBefore: number;
  ratingAfter: number;
  ratingDelta: number;
  opponentRatingBefore: number;
  settledAt: number;
}

export interface PlayerRankedProfile {
  seasonId: string;
  phase: RankedSeasonPhase;
  rating: number;
  peakRating: number;
  placementsPlayed: number;
  placementsRequired: number;
  status: RankedStandingStatus;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  resignLosses: number;
  recentResults: RankedResultReceipt[];
  tierId: string;
  division: string | null;
  lastRankChangedAt: number | null;
}

export const DEFAULT_RANKED_CONFIG: RankedSystemConfig = {
  enabled: true,
  currentSeasonId: "ALPHA_PRESEASON",
  phase: "PRESEASON",
  initialRating: 1000,
  minimumRating: 100,
  placementsRequired: 5,
  ratingScale: 400,
  placementK: 40,
  ratedK: 24,
  matchmaking: {
    initialRatingWindow: 200,
    widenEverySeconds: 30,
    widenByRating: 100,
    maxRatingWindow: 600
  }
};

export const DEFAULT_RANKED_CONTENT: RankedContentConfig = {
  ranks: [
    { id:"BRONZE", order:1, displayKey:"Bronze", mmrMin:0, mmrMax:1199, divisions:["III","II","I"] },
    { id:"SILVER", order:2, displayKey:"Silver", mmrMin:1200, mmrMax:1599, divisions:["III","II","I"] },
    { id:"GOLD", order:3, displayKey:"Gold", mmrMin:1600, mmrMax:1999, divisions:["III","II","I"] },
    { id:"PLATINUM", order:4, displayKey:"Platinum", mmrMin:2000, mmrMax:2399, divisions:["III","II","I"] },
    { id:"DIAMOND", order:5, displayKey:"Diamond", mmrMin:2400, mmrMax:null, divisions:["III","II","I"], divisionThresholds:{ III:2400, II:2600, I:2800 } }
  ],
  seasons: [{ id:"ALPHA_PRESEASON", nameKey:"Alpha Preseason", phase:"PRESEASON", placementsRequired:5, rewards:[], active:true }]
};

function finiteInt(value: unknown, fallback: number, minimum = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.round(parsed));
}

export function normalizeRankedConfig(value: Partial<RankedSystemConfig> | undefined): RankedSystemConfig {
  const matchmaking = value?.matchmaking ?? {} as RankedSystemConfig["matchmaking"];
  return {
    enabled: value?.enabled !== false,
    currentSeasonId: String(value?.currentSeasonId ?? DEFAULT_RANKED_CONFIG.currentSeasonId),
    phase: value?.phase === "SEASON" ? "SEASON" : "PRESEASON",
    initialRating: finiteInt(value?.initialRating, DEFAULT_RANKED_CONFIG.initialRating, 1),
    minimumRating: finiteInt(value?.minimumRating, DEFAULT_RANKED_CONFIG.minimumRating, 0),
    placementsRequired: finiteInt(value?.placementsRequired, DEFAULT_RANKED_CONFIG.placementsRequired, 1),
    ratingScale: finiteInt(value?.ratingScale, DEFAULT_RANKED_CONFIG.ratingScale, 1),
    placementK: finiteInt(value?.placementK, DEFAULT_RANKED_CONFIG.placementK, 1),
    ratedK: finiteInt(value?.ratedK, DEFAULT_RANKED_CONFIG.ratedK, 1),
    matchmaking: {
      initialRatingWindow: finiteInt(matchmaking.initialRatingWindow, DEFAULT_RANKED_CONFIG.matchmaking.initialRatingWindow, 0),
      widenEverySeconds: finiteInt(matchmaking.widenEverySeconds, DEFAULT_RANKED_CONFIG.matchmaking.widenEverySeconds, 1),
      widenByRating: finiteInt(matchmaking.widenByRating, DEFAULT_RANKED_CONFIG.matchmaking.widenByRating, 0),
      maxRatingWindow: finiteInt(matchmaking.maxRatingWindow, DEFAULT_RANKED_CONFIG.matchmaking.maxRatingWindow, 0)
    }
  };
}

export function normalizeRankedContentConfig(value: Partial<RankedContentConfig> | undefined): RankedContentConfig {
  const ranks = Array.isArray(value?.ranks) ? value!.ranks : DEFAULT_RANKED_CONTENT.ranks;
  const seasons = Array.isArray(value?.seasons) ? value!.seasons : DEFAULT_RANKED_CONTENT.seasons;
  return {
    ranks: ranks.filter((item) => item?.id).map((item) => ({
      id:String(item.id), order:finiteInt(item.order, 1, 1), displayKey:String(item.displayKey ?? item.id),
      mmrMin:finiteInt(item.mmrMin, 0, 0), mmrMax:item.mmrMax == null ? null : finiteInt(item.mmrMax, 0, 0),
      divisions:Array.isArray(item.divisions) ? item.divisions.map(String).filter(Boolean) : [],
      divisionThresholds:item.divisionThresholds && typeof item.divisionThresholds === "object"
        ? Object.fromEntries(Object.entries(item.divisionThresholds).map(([id, threshold]) => [String(id), finiteInt(threshold, 0, 0)]))
        : undefined,
      rewards:Array.isArray(item.rewards) ? structuredClone(item.rewards) : []
    })).sort((a,b) => a.mmrMin-b.mmrMin || a.order-b.order),
    seasons: seasons.filter((item) => item?.id).map((item) => ({
      id:String(item.id), nameKey:String(item.nameKey ?? item.id), phase:item.phase === "SEASON" ? "SEASON" : "PRESEASON",
      placementsRequired:finiteInt(item.placementsRequired, DEFAULT_RANKED_CONFIG.placementsRequired, 1),
      rewards:Array.isArray(item.rewards) ? structuredClone(item.rewards) : [], active:item.active !== false
    }))
  };
}

export function rankedTierForRating(rating: number, content: RankedContentConfig = DEFAULT_RANKED_CONTENT): RankedTierDefinition {
  const tiers = normalizeRankedContentConfig(content).ranks;
  return [...tiers].reverse().find((tier) => rating >= tier.mmrMin && (tier.mmrMax == null || rating <= tier.mmrMax)) ?? tiers[0] ?? DEFAULT_RANKED_CONTENT.ranks[0];
}

export function rankedDivisionForRating(rating: number, tier: RankedTierDefinition): string | null {
  if (!tier.divisions?.length) return null;
  if (tier.divisionThresholds && Object.keys(tier.divisionThresholds).length) {
    return [...tier.divisions].reverse().find((division) => rating >= Number(tier.divisionThresholds?.[division] ?? Number.POSITIVE_INFINITY))
      ?? tier.divisions[0] ?? null;
  }
  if (tier.mmrMax == null) return tier.divisions[0] ?? null;
  const span = Math.max(1, tier.mmrMax - tier.mmrMin + 1);
  const index = Math.min(tier.divisions.length - 1, Math.floor(((rating - tier.mmrMin) / span) * tier.divisions.length));
  return tier.divisions[index] ?? null;
}

export function rankedStanding(rating: number, content: RankedContentConfig = DEFAULT_RANKED_CONTENT): { tierId:string; division:string|null } {
  const tier = rankedTierForRating(rating, content);
  return { tierId:tier.id, division:rankedDivisionForRating(rating, tier) };
}

export function createRankedProfile(config: RankedSystemConfig = DEFAULT_RANKED_CONFIG): PlayerRankedProfile {
  const normalized = normalizeRankedConfig(config);
  return {
    seasonId: normalized.currentSeasonId,
    phase: normalized.phase,
    rating: normalized.initialRating,
    peakRating: normalized.initialRating,
    placementsPlayed: 0,
    placementsRequired: normalized.placementsRequired,
    status: "PLACEMENT",
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    resignLosses: 0,
    recentResults: []
    ,tierId:"BRONZE", division:"III", lastRankChangedAt:null
  };
}

export function normalizeRankedProfile(value: Partial<PlayerRankedProfile> | undefined, config: RankedSystemConfig = DEFAULT_RANKED_CONFIG): PlayerRankedProfile {
  const base = createRankedProfile(config);
  const placementsRequired = finiteInt(value?.placementsRequired, base.placementsRequired, 1);
  const placementsPlayed = finiteInt(value?.placementsPlayed, 0, 0);
  const rating = finiteInt(value?.rating, base.rating, config.minimumRating);
  return {
    seasonId: String(value?.seasonId ?? base.seasonId),
    phase: value?.phase === "SEASON" ? "SEASON" : base.phase,
    rating,
    peakRating: Math.max(rating, finiteInt(value?.peakRating, rating, config.minimumRating)),
    placementsPlayed,
    placementsRequired,
    status: placementsPlayed >= placementsRequired ? "RATED" : "PLACEMENT",
    matchesPlayed: finiteInt(value?.matchesPlayed, 0, 0),
    wins: finiteInt(value?.wins, 0, 0),
    losses: finiteInt(value?.losses, 0, 0),
    draws: finiteInt(value?.draws, 0, 0),
    resignLosses: finiteInt(value?.resignLosses, 0, 0),
    recentResults: Array.isArray(value?.recentResults)
      ? value!.recentResults!.filter((item) => item?.roomId).slice(0, 100).map((item) => structuredClone(item))
      : [],
    tierId:String(value?.tierId ?? "BRONZE"),
    division:value?.division == null ? "III" : String(value.division),
    lastRankChangedAt:Number(value?.lastRankChangedAt) > 0 ? Number(value?.lastRankChangedAt) : null
  };
}

export function expectedScore(rating: number, opponentRating: number, scale = DEFAULT_RANKED_CONFIG.ratingScale): number {
  return 1 / (1 + Math.pow(10, (opponentRating - rating) / Math.max(1, scale)));
}

export function ratingDelta(rating: number, opponentRating: number, score: number, k: number, scale = DEFAULT_RANKED_CONFIG.ratingScale): number {
  return Math.round(Math.max(1, k) * (score - expectedScore(rating, opponentRating, scale)));
}

export function rankedK(profile: PlayerRankedProfile, config: RankedSystemConfig): number {
  return profile.status === "PLACEMENT" ? config.placementK : config.ratedK;
}

export function ratingWindowForWait(waitMs: number, config: RankedSystemConfig): number {
  const mm = config.matchmaking;
  const steps = Math.floor(Math.max(0, waitMs) / (Math.max(1, mm.widenEverySeconds) * 1000));
  return Math.min(mm.maxRatingWindow, mm.initialRatingWindow + steps * mm.widenByRating);
}
