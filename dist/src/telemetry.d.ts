import { type TimerClockKind } from "./timers.js";
import type { GameState, PlayerId } from "./types.js";
export type RoomDiagnosticEventType = "ROOM_CREATED" | "MATCH_STARTED" | "CONNECTED" | "DISCONNECTED" | "INTENT_ACCEPTED" | "INTENT_REJECTED" | "TURN_STARTED" | "RESPONSE_OPENED" | "RESPONSE_CLOSED" | "TIMER_AUTO_PASS" | "TIMEOUT" | "MATCH_ENDED" | "SERVER_RESTORED";
export interface RoomDiagnosticEvent {
    seq: number;
    at: number;
    type: RoomDiagnosticEventType;
    playerId?: PlayerId;
    data?: Record<string, unknown>;
}
export interface DecisionMetric {
    totalMs: number;
    segments: number;
    maxSegmentMs: number;
}
export interface PlayerDecisionTelemetry {
    TURN: DecisionMetric;
    RESPONSE: DecisionMetric;
    DECISION: DecisionMetric;
}
export interface RoomTelemetryState {
    version: 1;
    startedAt: number | null;
    endedAt: number | null;
    intentsAccepted: Record<PlayerId, number>;
    intentsRejected: Record<PlayerId, number>;
    disconnects: Record<PlayerId, number>;
    reconnects: Record<PlayerId, number>;
    disconnectedTotalMs: Record<PlayerId, number>;
    maxDisconnectMs: Record<PlayerId, number>;
    decisions: Record<PlayerId, PlayerDecisionTelemetry>;
    currentDecision: {
        kind: TimerClockKind;
        playerId: PlayerId;
        startedAt: number;
    } | null;
    diagnosticSeq: number;
    diagnostics: RoomDiagnosticEvent[];
}
export interface RoomTelemetryView {
    serverNow: number;
    matchElapsedSeconds: number | null;
    intentsAccepted: Record<PlayerId, number>;
    intentsRejected: Record<PlayerId, number>;
    disconnects: Record<PlayerId, number>;
    reconnects: Record<PlayerId, number>;
    disconnectedSeconds: Record<PlayerId, number>;
    maxDisconnectSeconds: Record<PlayerId, number>;
    decisions: Record<PlayerId, Record<TimerClockKind, {
        totalSeconds: number;
        segments: number;
        maxSegmentSeconds: number;
    }>>;
    currentDecision: {
        kind: TimerClockKind;
        playerId: PlayerId;
        elapsedSeconds: number;
    } | null;
    diagnostics: RoomDiagnosticEvent[];
}
export declare function createRoomTelemetry(now: number): RoomTelemetryState;
export declare function addDiagnostic(telemetry: RoomTelemetryState, at: number, type: RoomDiagnosticEventType, playerId?: PlayerId, data?: Record<string, unknown>): void;
export declare function synchronizeRoomTelemetry(telemetry: RoomTelemetryState, state: GameState | null, now: number): void;
export declare function restoreRoomTelemetry(saved: RoomTelemetryState | undefined, state: GameState | null, savedAt: number | null, now: number): RoomTelemetryState;
export declare function recordIntentResult(telemetry: RoomTelemetryState, at: number, playerId: PlayerId, intentType: string, accepted: boolean, stateVersion: number): void;
export declare function recordDisconnect(telemetry: RoomTelemetryState, at: number, playerId: PlayerId): void;
export declare function recordReconnect(telemetry: RoomTelemetryState, at: number, playerId: PlayerId, disconnectedAt: number | null): void;
export declare function projectRoomTelemetry(telemetry: RoomTelemetryState, now: number): RoomTelemetryView;
