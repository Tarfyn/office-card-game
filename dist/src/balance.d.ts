import type { CardType, PlayerId } from "./types.js";
export interface SimConfig {
    gamesPerMatchup: number;
    baseSeed: number;
    maxTurns: number;
    maxSteps: number;
}
interface MatchTelemetry {
    matchup: string;
    p1Deck: string;
    p2Deck: string;
    firstPlayer: PlayerId;
    winner: PlayerId | null;
    winnerDeck: string | null;
    reason: string;
    turnNumber: number;
    steps: number;
    timedOut: boolean;
    p1Reputation: number;
    p2Reputation: number;
    mulliganReturnedP1: number;
    mulliganReturnedP2: number;
    openingCheapCardsP1: number;
    openingCheapCardsP2: number;
    cardsPlayedP1: number;
    cardsPlayedP2: number;
    actionsResolved: number;
    actionsResolvedP1: number;
    actionsResolvedP2: number;
    incidentsActivated: number;
    incidentsActivatedP1: number;
    incidentsActivatedP2: number;
    abilitiesActivatedP1: number;
    abilitiesActivatedP2: number;
    attacksDeclaredP1: number;
    attacksDeclaredP2: number;
    reputationRestoredP1: number;
    reputationRestoredP2: number;
    employeesDestroyed: number;
    breakthroughDamage: number;
    reputationDamage: number;
    cardsSeenP1: string[];
    cardsSeenP2: string[];
    cardsPlayedDefinitionsP1: string[];
    cardsPlayedDefinitionsP2: string[];
    stuckContext?: Record<string, unknown>;
}
interface MatchupSummary {
    deckA: string;
    deckB: string;
    games: number;
    deckAWins: number;
    deckBWins: number;
    timeouts: number;
    deckAWinRate: number;
    averageTurns: number;
    firstPlayerWins: number;
    firstPlayerWinRate: number;
    averageFinalRepA: number;
    averageFinalRepB: number;
}
interface DeckSummary {
    deckId: string;
    games: number;
    wins: number;
    losses: number;
    timeouts: number;
    winRate: number;
    averageTurns: number;
    averageFinalReputation: number;
    averageCardsPlayed: number;
    averageActionsResolved: number;
    averageIncidentsActivated: number;
    averageAbilitiesActivated: number;
    averageAttacksDeclared: number;
    averageReputationRestored: number;
    firstPlayerWinRate: number;
    secondPlayerWinRate: number;
    averageMulliganReturned: number;
}
export interface CardBalanceStat {
    definitionId: string;
    name: string;
    department: string;
    cardType: CardType;
    gamesSeen: number;
    winsWhenSeen: number;
    winRateWhenSeen: number | null;
    gamesPlayed: number;
    winsWhenPlayed: number;
    winRateWhenPlayed: number | null;
    totalCopiesPlayed: number;
    averageCopiesPlayed: number;
}
export interface BalanceSignal {
    kind: "MATCHUP_SKEW" | "FIRST_PLAYER_SKEW" | "TIMEOUT_RATE";
    label: string;
    value: number;
    sample: number;
    sampleLabel: "TINY" | "SMALL" | "DIRECTIONAL" | "STRONGER";
}
export interface BalanceAnalytics {
    endReasons: Record<string, number>;
    firstPlayer: {
        games: number;
        wins: number;
        winRate: number;
    };
    secondPlayer: {
        games: number;
        wins: number;
        winRate: number;
    };
    mulliganByDeck: Array<{
        deckId: string;
        games: number;
        usedGames: number;
        usageRate: number;
        averageReturned: number;
        averageCheapOpeningCards: number;
    }>;
    signals: BalanceSignal[];
}
export interface BalanceReport {
    generatedAt: string;
    engineVersion: string;
    note: string;
    config: SimConfig;
    totals: {
        games: number;
        completedGames: number;
        timeouts: number;
        firstPlayerWins: number;
        firstPlayerWinRate: number;
        averageTurns: number;
    };
    matchups: MatchupSummary[];
    decks: DeckSummary[];
    games: MatchTelemetry[];
    analytics: BalanceAnalytics;
    cardStats: CardBalanceStat[];
}
export interface BalanceMatchupPair {
    deckA: string;
    deckB: string;
    label?: string;
}
export interface BalanceMatchupPlan extends SimConfig {
    matchups: BalanceMatchupPair[];
    sideSwap?: boolean;
    alternateFirstPlayer?: boolean;
}
export declare function runBalanceMatchupSet(plan: BalanceMatchupPlan): BalanceReport;
export declare function runBalanceSeries(config: SimConfig): BalanceReport;
export {};
