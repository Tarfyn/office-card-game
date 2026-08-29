export type RankedStandingStatus = "PLACEMENT" | "RATED";
export type RankedSeasonPhase = "PRESEASON" | "SEASON";
export type RankedOutcome = "WIN" | "LOSS" | "DRAW" | "RESIGN_LOSS";
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
}
export declare const DEFAULT_RANKED_CONFIG: RankedSystemConfig;
export declare function normalizeRankedConfig(value: Partial<RankedSystemConfig> | undefined): RankedSystemConfig;
export declare function createRankedProfile(config?: RankedSystemConfig): PlayerRankedProfile;
export declare function normalizeRankedProfile(value: Partial<PlayerRankedProfile> | undefined, config?: RankedSystemConfig): PlayerRankedProfile;
export declare function expectedScore(rating: number, opponentRating: number, scale?: number): number;
export declare function ratingDelta(rating: number, opponentRating: number, score: number, k: number, scale?: number): number;
export declare function rankedK(profile: PlayerRankedProfile, config: RankedSystemConfig): number;
export declare function ratingWindowForWait(waitMs: number, config: RankedSystemConfig): number;
