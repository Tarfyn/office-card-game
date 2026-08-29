export const DEFAULT_RANKED_CONFIG = {
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
function finiteInt(value, fallback, minimum = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed))
        return fallback;
    return Math.max(minimum, Math.round(parsed));
}
export function normalizeRankedConfig(value) {
    const matchmaking = value?.matchmaking ?? {};
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
export function createRankedProfile(config = DEFAULT_RANKED_CONFIG) {
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
    };
}
export function normalizeRankedProfile(value, config = DEFAULT_RANKED_CONFIG) {
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
            ? value.recentResults.filter((item) => item?.roomId).slice(0, 100).map((item) => structuredClone(item))
            : []
    };
}
export function expectedScore(rating, opponentRating, scale = DEFAULT_RANKED_CONFIG.ratingScale) {
    return 1 / (1 + Math.pow(10, (opponentRating - rating) / Math.max(1, scale)));
}
export function ratingDelta(rating, opponentRating, score, k, scale = DEFAULT_RANKED_CONFIG.ratingScale) {
    return Math.round(Math.max(1, k) * (score - expectedScore(rating, opponentRating, scale)));
}
export function rankedK(profile, config) {
    return profile.status === "PLACEMENT" ? config.placementK : config.ratedK;
}
export function ratingWindowForWait(waitMs, config) {
    const mm = config.matchmaking;
    const steps = Math.floor(Math.max(0, waitMs) / (Math.max(1, mm.widenEverySeconds) * 1000));
    return Math.min(mm.maxRatingWindow, mm.initialRatingWindow + steps * mm.widenByRating);
}
