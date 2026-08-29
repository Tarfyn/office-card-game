import type { RoomTelemetryView } from "./telemetry.js";
import type { PlayerId } from "./types.js";
export type PlaytestRoomStatus = "WAITING" | "ACTIVE" | "ENDED";
export type PlaytestMode = "FRIENDLY" | "RANKED";
export interface PlaytestSeatRecord {
    deckId: string;
    deckName: string;
    department: string;
}
export interface PlaytestCardActivity {
    definitionId: string;
    name: string;
    department: string;
    playerId: PlayerId;
    observedInstances: number;
    playedInstances: number;
    draws: number;
    plays: number;
    activations: number;
    attacks: number;
}
export interface PlaytestMatchRecord {
    roomId: string;
    matchId: string | null;
    status: PlaytestRoomStatus;
    mode: PlaytestMode;
    timerProfileId: string;
    timerActive: boolean;
    createdAt: number;
    startedAt: number | null;
    endedAt: number | null;
    firstPlayerId: PlayerId | null;
    winnerId: PlayerId | null;
    reason: string | null;
    turns: number;
    seats: Record<PlayerId, PlaytestSeatRecord | null>;
    telemetry: RoomTelemetryView;
    cardActivity?: PlaytestCardActivity[];
}
export interface PlaytestAnalyticsFilter {
    mode?: PlaytestMode | null;
    department?: string | null;
    deckId?: string | null;
    from?: number | null;
    to?: number | null;
    latestCompleted?: number | null;
}
export interface PlaytestAnalyticsDimensions {
    modes: PlaytestMode[];
    departments: string[];
    decks: Array<{
        deckId: string;
        deckName: string;
        department: string;
    }>;
    completedMatches: number;
    oldestEndedAt: number | null;
    newestEndedAt: number | null;
}
export interface AggregateBucket {
    matches: number;
    decisiveMatches: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number | null;
    averageTurns: number | null;
    averageDurationSeconds: number | null;
}
export interface PlaytestAnalyticsSummary {
    generatedAt: number;
    totals: {
        rooms: number;
        waitingRooms: number;
        activeMatches: number;
        completedMatches: number;
        decisiveMatches: number;
        draws: number;
        averageTurns: number | null;
        averageDurationSeconds: number | null;
        firstPlayerWins: number;
        firstPlayerWinRate: number | null;
        resigns: number;
    };
    modes: Record<PlaytestMode, AggregateBucket>;
    endReasons: Array<{
        reason: string;
        matches: number;
    }>;
    departments: Array<{
        department: string;
        appearances: number;
        wins: number;
        losses: number;
        draws: number;
        winRate: number | null;
    }>;
    decks: Array<{
        deckId: string;
        deckName: string;
        department: string;
        appearances: number;
        wins: number;
        losses: number;
        draws: number;
        winRate: number | null;
        firstAppearances: number;
        firstWins: number;
        firstWinRate: number | null;
        secondAppearances: number;
        secondWins: number;
        secondWinRate: number | null;
    }>;
    cards: Array<{
        definitionId: string;
        name: string;
        department: string;
        observedSeatMatches: number;
        playedSeatMatches: number;
        observedInstances: number;
        playedInstances: number;
        draws: number;
        plays: number;
        activations: number;
        attacks: number;
        winsWhenPlayed: number;
        lossesWhenPlayed: number;
        drawsWhenPlayed: number;
        winRateWhenPlayed: number | null;
        playRateFromObserved: number | null;
    }>;
    friction: {
        thresholds: {
            longTurnSeconds: number;
            longResponseSeconds: number;
        };
        matchesWithLongTurn: number;
        matchesWithLongResponse: number;
        maxTurnSeconds: number;
        maxResponseSeconds: number;
    };
    decisions: Record<"TURN" | "RESPONSE" | "DECISION", {
        totalSeconds: number;
        segments: number;
        averageSegmentSeconds: number | null;
        maxSegmentSeconds: number;
    }>;
    connectivity: {
        matchesWithDisconnects: number;
        totalDisconnects: number;
        totalReconnects: number;
        totalOfflineSeconds: number;
        maxDisconnectSeconds: number;
    };
    recentMatches: PlaytestMatchRecord[];
}
export declare function normalizePlaytestFilter(filter?: PlaytestAnalyticsFilter): Required<PlaytestAnalyticsFilter>;
export declare function filterPlaytestRecords(records: PlaytestMatchRecord[], filter?: PlaytestAnalyticsFilter): PlaytestMatchRecord[];
export declare function playtestAnalyticsDimensions(records: PlaytestMatchRecord[]): PlaytestAnalyticsDimensions;
export declare function aggregatePlaytestAnalytics(records: PlaytestMatchRecord[], now?: number): PlaytestAnalyticsSummary;
export declare function playtestRecordsCsv(records: PlaytestMatchRecord[]): string;
export declare function playtestCardActivityCsv(cards: PlaytestAnalyticsSummary["cards"]): string;
