export type MatchHistoryMode = "FRIENDLY" | "RANKED" | "TRAINING" | "TUTORIAL";
export type MatchHistoryResult = "WIN" | "LOSS" | "DRAW";
export type MatchHistoryOutcome = MatchHistoryResult | "RESIGN_LOSS";
export type MatchHistorySeat = "P1" | "P2";

export interface MatchHistoryRecord {
  roomId: string;
  matchId: string;
  completedAt: number;
  mode: MatchHistoryMode;
  result: MatchHistoryResult;
  /** Legacy value retained for older clients and result filters. */
  outcome: MatchHistoryOutcome;
  playerSeat: MatchHistorySeat;
  opponentName: string;
  selectedDeckId: string | null;
  deckName: string;
  primaryDepartment: string;
  opponentDeckName: string;
  opponentDepartment: string | null;
  turns: number;
  durationMs: number | null;
  playerFinalRep: number | null;
  opponentFinalRep: number | null;
  ratingBefore: number | null;
  ratingAfter: number | null;
  ratingDelta: number | null;
  rankBefore: string | null;
  rankAfter: string | null;
  seasonId: string | null;
  rewardEligible: boolean;
  completionReason: string;
  /** Legacy display alias retained for persisted v3.7 records. */
  finishedAt: number;
  /** Legacy display alias retained for persisted v3.7 records. */
  reason: string;
}

export type MatchHistoryInput = Partial<MatchHistoryRecord> & Pick<MatchHistoryRecord, "roomId" | "matchId" | "mode" | "outcome" | "opponentName" | "deckName" | "opponentDeckName" | "turns" | "reason" | "finishedAt">;

export interface MatchTally {
  matches: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface RankedStats extends MatchTally {
  currentMMR: number;
  peakMMR: number;
  currentRank: string | null;
  peakRank: string | null;
}

export interface PlayerStats {
  /** These flat fields are retained as the v3.7 API compatibility surface. */
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  resignLosses: number;
  friendlyMatches: number;
  rankedMatches: number;
  pvp: MatchTally;
  ranked: RankedStats;
  training: MatchTally;
  tutorial: MatchTally;
  totalTurnsPlayed: number;
  totalDurationMs: number;
  departmentUsage: Record<string, MatchTally>;
  deckUsage: Record<string, MatchTally & { deckId: string | null; deckName: string }>;
}

export const DEFAULT_MATCH_HISTORY_LIMIT = 100;

export function resultFromOutcome(outcome: MatchHistoryOutcome): MatchHistoryResult {
  return outcome === "DRAW" ? "DRAW" : outcome === "WIN" ? "WIN" : "LOSS";
}

export function emptyTally(): MatchTally {
  return { matches: 0, wins: 0, losses: 0, draws: 0 };
}

export function emptyRankedStats(initialMMR = 1000): RankedStats {
  return { ...emptyTally(), currentMMR: initialMMR, peakMMR: initialMMR, currentRank: null, peakRank: null };
}

export function createEmptyPlayerStats(initialMMR = 1000): PlayerStats {
  return {
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    resignLosses: 0,
    friendlyMatches: 0,
    rankedMatches: 0,
    pvp: emptyTally(),
    ranked: emptyRankedStats(initialMMR),
    training: emptyTally(),
    tutorial: emptyTally(),
    totalTurnsPlayed: 0,
    totalDurationMs: 0,
    departmentUsage: {},
    deckUsage: {}
  };
}

function positiveInt(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}

function normalizeTally(value: Partial<MatchTally> | undefined): MatchTally {
  return {
    matches: positiveInt(value?.matches),
    wins: positiveInt(value?.wins),
    losses: positiveInt(value?.losses),
    draws: positiveInt(value?.draws)
  };
}

export function normalizePlayerStats(value: Partial<PlayerStats> | undefined, initialMMR = 1000): PlayerStats {
  const base = createEmptyPlayerStats(initialMMR);
  const next = { ...base, ...(value ?? {}) } as PlayerStats;
  const legacyPvp = {
    matches: value?.matchesPlayed,
    wins: value?.wins,
    losses: value?.losses,
    draws: value?.draws
  };
  next.pvp = normalizeTally(value?.pvp ?? legacyPvp);
  next.ranked = {
    ...emptyRankedStats(initialMMR),
    ...(value?.ranked ?? {}),
    ...normalizeTally(value?.ranked),
    currentMMR: positiveInt(value?.ranked?.currentMMR, initialMMR),
    peakMMR: positiveInt(value?.ranked?.peakMMR, initialMMR),
    currentRank: value?.ranked?.currentRank == null ? null : String(value.ranked.currentRank),
    peakRank: value?.ranked?.peakRank == null ? null : String(value.ranked.peakRank)
  };
  next.training = normalizeTally(value?.training);
  next.tutorial = normalizeTally(value?.tutorial);
  next.totalTurnsPlayed = positiveInt(value?.totalTurnsPlayed);
  next.totalDurationMs = positiveInt(value?.totalDurationMs);
  next.departmentUsage = normalizeTallyMap(value?.departmentUsage);
  next.deckUsage = Object.fromEntries(Object.entries(value?.deckUsage ?? {}).flatMap(([id, raw]) => {
    if (!raw || typeof raw !== "object") return [];
    const tally = normalizeTally(raw);
    return [[String(id), { ...tally, deckId: raw.deckId == null ? null : String(raw.deckId), deckName: String(raw.deckName ?? "Unknown Deck") }]];
  }));
  // Keep the original flat shape coherent for clients that still consume it.
  next.matchesPlayed = positiveInt(value?.matchesPlayed, next.pvp.matches);
  next.wins = positiveInt(value?.wins, next.pvp.wins);
  next.losses = positiveInt(value?.losses, next.pvp.losses);
  next.draws = positiveInt(value?.draws, next.pvp.draws);
  next.resignLosses = positiveInt(value?.resignLosses);
  next.friendlyMatches = positiveInt(value?.friendlyMatches, 0);
  next.rankedMatches = positiveInt(value?.rankedMatches, next.ranked.matches);
  if (!value?.ranked) next.ranked.matches = next.rankedMatches;
  if (!value?.pvp) next.pvp.matches = next.matchesPlayed;
  return next;
}

function normalizeTallyMap(value: Record<string, Partial<MatchTally>> | undefined): Record<string, MatchTally> {
  return Object.fromEntries(Object.entries(value ?? {}).flatMap(([id, raw]) => id ? [[String(id), normalizeTally(raw)]] : []));
}

export function normalizeMatchHistoryRecord(raw: Partial<MatchHistoryRecord>): MatchHistoryRecord {
  const outcome = raw.outcome === "RESIGN_LOSS" ? "RESIGN_LOSS" : raw.outcome === "LOSS" ? "LOSS" : raw.outcome === "DRAW" ? "DRAW" : "WIN";
  const result = raw.result === "DRAW" ? "DRAW" : raw.result === "LOSS" ? "LOSS" : resultFromOutcome(outcome);
  const completedAt = positiveInt(raw.completedAt ?? raw.finishedAt, Date.now());
  return {
    roomId: String(raw.roomId ?? ""),
    matchId: String(raw.matchId ?? raw.roomId ?? ""),
    completedAt,
    mode: raw.mode === "RANKED" ? "RANKED" : raw.mode === "TRAINING" ? "TRAINING" : raw.mode === "TUTORIAL" ? "TUTORIAL" : "FRIENDLY",
    result,
    outcome,
    playerSeat: raw.playerSeat === "P2" ? "P2" : "P1",
    opponentName: String(raw.opponentName ?? "Opponent"),
    selectedDeckId: raw.selectedDeckId == null ? null : String(raw.selectedDeckId),
    deckName: String(raw.deckName ?? "Unknown Deck"),
    primaryDepartment: String(raw.primaryDepartment ?? "MIXED"),
    opponentDeckName: String(raw.opponentDeckName ?? "Unknown Deck"),
    opponentDepartment: raw.opponentDepartment == null ? null : String(raw.opponentDepartment),
    turns: positiveInt(raw.turns),
    durationMs: raw.durationMs == null ? null : positiveInt(raw.durationMs),
    playerFinalRep: raw.playerFinalRep == null ? null : positiveInt(raw.playerFinalRep),
    opponentFinalRep: raw.opponentFinalRep == null ? null : positiveInt(raw.opponentFinalRep),
    ratingBefore: raw.ratingBefore == null ? null : Number(raw.ratingBefore),
    ratingAfter: raw.ratingAfter == null ? null : Number(raw.ratingAfter),
    ratingDelta: raw.ratingDelta == null ? null : Number(raw.ratingDelta),
    rankBefore: raw.rankBefore == null ? null : String(raw.rankBefore),
    rankAfter: raw.rankAfter == null ? null : String(raw.rankAfter),
    seasonId: raw.seasonId == null ? null : String(raw.seasonId),
    rewardEligible: raw.rewardEligible !== false,
    completionReason: String(raw.completionReason ?? raw.reason ?? "UNKNOWN"),
    finishedAt: completedAt,
    reason: String(raw.reason ?? raw.completionReason ?? "UNKNOWN")
  };
}
