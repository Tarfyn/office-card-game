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

function positiveMs(seconds: number | null | undefined): number | null {
  const value = Number(seconds);
  return Number.isFinite(value) && value > 0 ? Math.floor(value * 1000) : null;
}

function toSeconds(ms: number | null): number | null {
  if (ms == null) return null;
  return Math.max(0, ms) / 1000;
}

export function timerProfileIsRunnable(profile: TimerProfileConfig | null | undefined): boolean {
  if (!profile?.enabled) return false;
  return positiveMs(profile.turnSeconds) !== null || positiveMs(profile.responseSeconds) !== null || positiveMs(profile.reconnectGraceSeconds) !== null;
}

export function timerProfilesById(profiles: TimerProfileConfig[] | Record<string, TimerProfileConfig> | undefined): Record<string, TimerProfileConfig> {
  if (!profiles) return {};
  if (Array.isArray(profiles)) return Object.fromEntries(profiles.filter((profile) => profile?.id).map((profile) => [profile.id, structuredClone(profile)]));
  return Object.fromEntries(Object.entries(profiles).filter(([, profile]) => profile?.id).map(([id, profile]) => [id, { ...structuredClone(profile), id: profile.id || id }]));
}

function offTurnDecisionOwner(state: GameState): PlayerId | null {
  const owner = state.pendingChoice?.playerId
    ?? state.pendingDeckSelection?.playerId
    ?? state.pendingTriggerTargetSelection?.playerId
    ?? state.pendingHandSelection?.playerId
    ?? null;
  return owner && owner !== state.activePlayerId ? owner : null;
}

export function desiredTimerClock(state: GameState): { kind: TimerClockKind; playerId: PlayerId } | null {
  if (state.status !== "ACTIVE") return null;
  if (state.responseWindow && state.priorityPlayerId) return { kind: "RESPONSE", playerId: state.priorityPlayerId };
  const decisionOwner = offTurnDecisionOwner(state);
  if (decisionOwner) return { kind: "DECISION", playerId: decisionOwner };
  return { kind: "TURN", playerId: state.activePlayerId };
}

function bankValue(runtime: RoomTimerRuntime, playerId: PlayerId): number {
  return Math.max(0, runtime.bankRemainingMs[playerId] ?? 0);
}

function consumeBudget(baseRemainingMs: number, bankRemainingMs: number, elapsedMs: number): { baseRemainingMs: number; bankRemainingMs: number } {
  const elapsed = Math.max(0, elapsedMs);
  const fromBase = Math.min(baseRemainingMs, elapsed);
  const base = Math.max(0, baseRemainingMs - fromBase);
  const overflow = Math.max(0, elapsed - fromBase);
  return { baseRemainingMs: base, bankRemainingMs: Math.max(0, bankRemainingMs - overflow) };
}

function consumeTurn(runtime: RoomTimerRuntime, now: number): void {
  if (!runtime.turnOwnerId || runtime.turnRunningSince == null || runtime.turnBaseRemainingMs == null) return;
  const playerId = runtime.turnOwnerId;
  const consumed = consumeBudget(runtime.turnBaseRemainingMs, bankValue(runtime, playerId), now - runtime.turnRunningSince);
  runtime.turnBaseRemainingMs = consumed.baseRemainingMs;
  if (runtime.bankRemainingMs[playerId] != null) runtime.bankRemainingMs[playerId] = consumed.bankRemainingMs;
  runtime.turnRunningSince = now;
}

function consumeInterrupt(runtime: RoomTimerRuntime, now: number): void {
  if (!runtime.interruptOwnerId || runtime.interruptRunningSince == null || runtime.interruptBaseRemainingMs == null) return;
  const playerId = runtime.interruptOwnerId;
  const consumed = consumeBudget(runtime.interruptBaseRemainingMs, bankValue(runtime, playerId), now - runtime.interruptRunningSince);
  runtime.interruptBaseRemainingMs = consumed.baseRemainingMs;
  if (runtime.bankRemainingMs[playerId] != null) runtime.bankRemainingMs[playerId] = consumed.bankRemainingMs;
  runtime.interruptRunningSince = now;
}

export function consumeRunningClock(runtime: RoomTimerRuntime, now: number): void {
  if (!runtime.active) return;
  if (runtime.interruptKind) consumeInterrupt(runtime, now);
  else consumeTurn(runtime, now);
}

function initializeTurn(runtime: RoomTimerRuntime, profile: TimerProfileConfig, playerId: PlayerId, now: number, running: boolean): void {
  runtime.turnOwnerId = playerId;
  runtime.turnBaseRemainingMs = positiveMs(profile.turnSeconds);
  runtime.turnRunningSince = running && runtime.turnBaseRemainingMs !== null ? now : null;
}

function clearInterrupt(runtime: RoomTimerRuntime): void {
  runtime.interruptKind = null;
  runtime.interruptOwnerId = null;
  runtime.interruptBaseRemainingMs = null;
  runtime.interruptRunningSince = null;
}

function initializeInterrupt(runtime: RoomTimerRuntime, profile: TimerProfileConfig, kind: "RESPONSE" | "DECISION", playerId: PlayerId, now: number): void {
  runtime.interruptKind = kind;
  runtime.interruptOwnerId = playerId;
  runtime.interruptBaseRemainingMs = positiveMs(profile.responseSeconds);
  runtime.interruptRunningSince = runtime.interruptBaseRemainingMs !== null ? now : null;
}

export function createTimerRuntime(profile: TimerProfileConfig, state: GameState | null, now: number): RoomTimerRuntime {
  const bankMs = positiveMs(profile.timeBankSeconds);
  const runtime: RoomTimerRuntime = {
    profileId: profile.id,
    active: timerProfileIsRunnable(profile),
    turnOwnerId: null,
    turnBaseRemainingMs: null,
    turnRunningSince: null,
    interruptKind: null,
    interruptOwnerId: null,
    interruptBaseRemainingMs: null,
    interruptRunningSince: null,
    bankRemainingMs: { P1: bankMs, P2: bankMs },
    reconnectDeadlineAt: { P1: null, P2: null }
  };
  if (!runtime.active || !state) return runtime;
  synchronizeTimerRuntime(runtime, profile, null, state, now);
  return runtime;
}

export function synchronizeTimerRuntime(runtime: RoomTimerRuntime, profile: TimerProfileConfig, previousState: GameState | null, state: GameState | null, now: number): void {
  if (!runtime.active || !state || state.status === "ENDED") {
    consumeRunningClock(runtime, now);
    runtime.turnRunningSince = null;
    clearInterrupt(runtime);
    return;
  }

  const desired = desiredTimerClock(state);
  if (!desired) {
    consumeRunningClock(runtime, now);
    runtime.turnRunningSince = null;
    clearInterrupt(runtime);
    return;
  }

  const previousTurnId = previousState?.status === "ACTIVE" ? previousState.activePlayerId : null;
  const turnChanged = runtime.turnOwnerId !== state.activePlayerId || (previousTurnId !== null && previousTurnId !== state.activePlayerId);

  if (turnChanged || runtime.turnOwnerId === null) {
    consumeRunningClock(runtime, now);
    clearInterrupt(runtime);
    initializeTurn(runtime, profile, state.activePlayerId, now, desired.kind === "TURN");
  }

  if (desired.kind === "TURN") {
    if (runtime.interruptKind) {
      consumeInterrupt(runtime, now);
      clearInterrupt(runtime);
    }
    if (runtime.turnOwnerId !== desired.playerId) initializeTurn(runtime, profile, desired.playerId, now, true);
    else if (runtime.turnBaseRemainingMs !== null && runtime.turnRunningSince === null) runtime.turnRunningSince = now;
    return;
  }

  if (!runtime.interruptKind) {
    consumeTurn(runtime, now);
    runtime.turnRunningSince = null;
    initializeInterrupt(runtime, profile, desired.kind, desired.playerId, now);
    return;
  }

  if (runtime.interruptKind !== desired.kind || runtime.interruptOwnerId !== desired.playerId) {
    consumeInterrupt(runtime, now);
    initializeInterrupt(runtime, profile, desired.kind, desired.playerId, now);
  }
}

function activeBudget(runtime: RoomTimerRuntime, kind: TimerClockKind, playerId: PlayerId, now: number): { baseMs: number; bankMs: number; deadlineAt: number | null } {
  if (kind === "TURN") {
    if (runtime.turnOwnerId !== playerId || runtime.turnBaseRemainingMs == null || runtime.turnRunningSince == null) return { baseMs:0, bankMs:bankValue(runtime, playerId), deadlineAt:null };
    const elapsed = Math.max(0, now - runtime.turnRunningSince);
    const consumed = consumeBudget(runtime.turnBaseRemainingMs, bankValue(runtime, playerId), elapsed);
    return { baseMs:consumed.baseRemainingMs, bankMs:consumed.bankRemainingMs, deadlineAt:runtime.turnRunningSince + runtime.turnBaseRemainingMs + bankValue(runtime, playerId) };
  }
  if (runtime.interruptOwnerId !== playerId || runtime.interruptBaseRemainingMs == null || runtime.interruptRunningSince == null) return { baseMs:0, bankMs:bankValue(runtime, playerId), deadlineAt:null };
  const elapsed = Math.max(0, now - runtime.interruptRunningSince);
  const consumed = consumeBudget(runtime.interruptBaseRemainingMs, bankValue(runtime, playerId), elapsed);
  return { baseMs:consumed.baseRemainingMs, bankMs:consumed.bankRemainingMs, deadlineAt:runtime.interruptRunningSince + runtime.interruptBaseRemainingMs + bankValue(runtime, playerId) };
}

export function currentTimerClock(runtime: RoomTimerRuntime, state: GameState | null, now: number): TimerClockView | null {
  if (!runtime.active || !state) return null;
  const desired = desiredTimerClock(state);
  if (!desired) return null;
  const budget = activeBudget(runtime, desired.kind, desired.playerId, now);
  if (budget.deadlineAt == null) return null;
  return {
    kind: desired.kind,
    playerId: desired.playerId,
    deadlineAt: budget.deadlineAt,
    baseRemainingSeconds: Math.max(0, budget.baseMs) / 1000,
    bankRemainingSeconds: runtime.bankRemainingMs[desired.playerId] == null ? null : Math.max(0, budget.bankMs) / 1000
  };
}

export function projectTimerRuntime(runtime: RoomTimerRuntime, state: GameState | null, now: number): RoomTimerView {
  const clock = currentTimerClock(runtime, state, now);
  return {
    active: runtime.active,
    profileId: runtime.profileId,
    serverNow: now,
    clock,
    turnDeadlineAt: clock?.kind === "TURN" ? clock.deadlineAt : null,
    responseDeadlineAt: clock?.kind === "RESPONSE" || clock?.kind === "DECISION" ? clock.deadlineAt : null,
    reconnectDeadlineAt: structuredClone(runtime.reconnectDeadlineAt),
    timeBankRemainingSeconds: {
      P1: toSeconds(runtime.bankRemainingMs.P1),
      P2: toSeconds(runtime.bankRemainingMs.P2)
    }
  };
}

export function clockIsExpired(runtime: RoomTimerRuntime, state: GameState | null, now: number): TimerClockView | null {
  const clock = currentTimerClock(runtime, state, now);
  return clock && clock.deadlineAt <= now ? clock : null;
}

export function setReconnectDeadline(runtime: RoomTimerRuntime, profile: TimerProfileConfig, playerId: PlayerId, disconnectedAt: number): void {
  const graceMs = positiveMs(profile.reconnectGraceSeconds);
  runtime.reconnectDeadlineAt[playerId] = runtime.active && graceMs !== null ? disconnectedAt + graceMs : null;
}

export function clearReconnectDeadline(runtime: RoomTimerRuntime, playerId: PlayerId): void {
  runtime.reconnectDeadlineAt[playerId] = null;
}

export function restoreTimerRuntime(saved: RoomTimerRuntime | undefined, profile: TimerProfileConfig, state: GameState | null, savedAt: number | null, now: number): RoomTimerRuntime {
  if (!saved || saved.profileId !== profile.id) return createTimerRuntime(profile, state, now);
  const runtime = structuredClone(saved);
  runtime.active = timerProfileIsRunnable(profile) && Boolean(saved.active);
  runtime.bankRemainingMs ??= { P1:positiveMs(profile.timeBankSeconds), P2:positiveMs(profile.timeBankSeconds) };
  runtime.reconnectDeadlineAt ??= { P1:null, P2:null };
  if (!runtime.active) return createTimerRuntime(profile, state, now);
  const freezeAt = savedAt == null ? now : Math.max(0, savedAt);
  consumeRunningClock(runtime, freezeAt);
  if (runtime.turnRunningSince !== null) runtime.turnRunningSince = now;
  if (runtime.interruptRunningSince !== null) runtime.interruptRunningSince = now;
  synchronizeTimerRuntime(runtime, profile, state, state, now);
  return runtime;
}
