import type { GameState, PlayerId } from "./types.js";
export type TimerClockKind = "TURN" | "RESPONSE" | "DECISION";
export interface TimerProfileConfig {
    id: string;
    enabled: boolean;
    turnSeconds: number | null;
    responseSeconds: number | null;
    timeBankSeconds: number | null;
    reconnectGraceSeconds?: number | null;
    status?: string;
}
export interface RoomTimerRuntime {
    profileId: string;
    active: boolean;
    turnOwnerId: PlayerId | null;
    turnBaseRemainingMs: number | null;
    turnRunningSince: number | null;
    interruptKind: "RESPONSE" | "DECISION" | null;
    interruptOwnerId: PlayerId | null;
    interruptBaseRemainingMs: number | null;
    interruptRunningSince: number | null;
    bankRemainingMs: Record<PlayerId, number | null>;
    reconnectDeadlineAt: Record<PlayerId, number | null>;
}
export interface TimerClockView {
    kind: TimerClockKind;
    playerId: PlayerId;
    deadlineAt: number;
    baseRemainingSeconds: number;
    bankRemainingSeconds: number | null;
}
export interface RoomTimerView {
    active: boolean;
    profileId: string;
    serverNow: number;
    clock: TimerClockView | null;
    turnDeadlineAt: number | null;
    responseDeadlineAt: number | null;
    reconnectDeadlineAt: Record<PlayerId, number | null>;
    timeBankRemainingSeconds: Record<PlayerId, number | null>;
}
export declare function timerProfileIsRunnable(profile: TimerProfileConfig | null | undefined): boolean;
export declare function timerProfilesById(profiles: TimerProfileConfig[] | Record<string, TimerProfileConfig> | undefined): Record<string, TimerProfileConfig>;
export declare function desiredTimerClock(state: GameState): {
    kind: TimerClockKind;
    playerId: PlayerId;
} | null;
export declare function consumeRunningClock(runtime: RoomTimerRuntime, now: number): void;
export declare function createTimerRuntime(profile: TimerProfileConfig, state: GameState | null, now: number): RoomTimerRuntime;
export declare function synchronizeTimerRuntime(runtime: RoomTimerRuntime, profile: TimerProfileConfig, previousState: GameState | null, state: GameState | null, now: number): void;
export declare function currentTimerClock(runtime: RoomTimerRuntime, state: GameState | null, now: number): TimerClockView | null;
export declare function projectTimerRuntime(runtime: RoomTimerRuntime, state: GameState | null, now: number): RoomTimerView;
export declare function clockIsExpired(runtime: RoomTimerRuntime, state: GameState | null, now: number): TimerClockView | null;
export declare function setReconnectDeadline(runtime: RoomTimerRuntime, profile: TimerProfileConfig, playerId: PlayerId, disconnectedAt: number): void;
export declare function clearReconnectDeadline(runtime: RoomTimerRuntime, playerId: PlayerId): void;
export declare function restoreTimerRuntime(saved: RoomTimerRuntime | undefined, profile: TimerProfileConfig, state: GameState | null, savedAt: number | null, now: number): RoomTimerRuntime;
