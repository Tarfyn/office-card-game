import { desiredTimerClock, type TimerClockKind } from "./timers.js";
import type { GameState, PlayerId } from "./types.js";

export type RoomDiagnosticEventType =
  | "ROOM_CREATED"
  | "MATCH_STARTED"
  | "CONNECTED"
  | "DISCONNECTED"
  | "INTENT_ACCEPTED"
  | "INTENT_REJECTED"
  | "TURN_STARTED"
  | "RESPONSE_OPENED"
  | "RESPONSE_CLOSED"
  | "TIMER_AUTO_PASS"
  | "TIMEOUT"
  | "MATCH_ENDED"
  | "SERVER_RESTORED";

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
  currentDecision: { kind: TimerClockKind; playerId: PlayerId; startedAt: number } | null;
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
  decisions: Record<PlayerId, Record<TimerClockKind, { totalSeconds: number; segments: number; maxSegmentSeconds: number }>>;
  currentDecision: { kind: TimerClockKind; playerId: PlayerId; elapsedSeconds: number } | null;
  diagnostics: RoomDiagnosticEvent[];
}

const DIAGNOSTIC_LIMIT = 240;

function metric(): DecisionMetric {
  return { totalMs: 0, segments: 0, maxSegmentMs: 0 };
}

function playerDecisions(): PlayerDecisionTelemetry {
  return { TURN: metric(), RESPONSE: metric(), DECISION: metric() };
}

export function createRoomTelemetry(now: number): RoomTelemetryState {
  const telemetry: RoomTelemetryState = {
    version: 1,
    startedAt: null,
    endedAt: null,
    intentsAccepted: { P1: 0, P2: 0 },
    intentsRejected: { P1: 0, P2: 0 },
    disconnects: { P1: 0, P2: 0 },
    reconnects: { P1: 0, P2: 0 },
    disconnectedTotalMs: { P1: 0, P2: 0 },
    maxDisconnectMs: { P1: 0, P2: 0 },
    decisions: { P1: playerDecisions(), P2: playerDecisions() },
    currentDecision: null,
    diagnosticSeq: 0,
    diagnostics: []
  };
  addDiagnostic(telemetry, now, "ROOM_CREATED");
  return telemetry;
}

export function addDiagnostic(telemetry: RoomTelemetryState, at: number, type: RoomDiagnosticEventType, playerId?: PlayerId, data?: Record<string, unknown>): void {
  telemetry.diagnosticSeq += 1;
  telemetry.diagnostics.push({ seq: telemetry.diagnosticSeq, at, type, ...(playerId ? { playerId } : {}), ...(data ? { data: structuredClone(data) } : {}) });
  if (telemetry.diagnostics.length > DIAGNOSTIC_LIMIT) telemetry.diagnostics.splice(0, telemetry.diagnostics.length - DIAGNOSTIC_LIMIT);
}

function closeDecision(telemetry: RoomTelemetryState, now: number): void {
  const current = telemetry.currentDecision;
  if (!current) return;
  const elapsed = Math.max(0, now - current.startedAt);
  const target = telemetry.decisions[current.playerId][current.kind];
  target.totalMs += elapsed;
  target.segments += 1;
  target.maxSegmentMs = Math.max(target.maxSegmentMs, elapsed);
  telemetry.currentDecision = null;
}

export function synchronizeRoomTelemetry(telemetry: RoomTelemetryState, state: GameState | null, now: number): void {
  if (!state || state.status === "ENDED") {
    closeDecision(telemetry, now);
    if (state?.status === "ENDED" && telemetry.endedAt === null) telemetry.endedAt = now;
    return;
  }
  if (state.status === "ACTIVE" && telemetry.startedAt === null) telemetry.startedAt = now;
  const desired = desiredTimerClock(state);
  const current = telemetry.currentDecision;
  if (!desired) {
    closeDecision(telemetry, now);
    return;
  }
  if (current && current.kind === desired.kind && current.playerId === desired.playerId) return;
  closeDecision(telemetry, now);
  telemetry.currentDecision = { kind: desired.kind, playerId: desired.playerId, startedAt: now };
}

export function restoreRoomTelemetry(saved: RoomTelemetryState | undefined, state: GameState | null, savedAt: number | null, now: number): RoomTelemetryState {
  const telemetry = saved?.version === 1 ? structuredClone(saved) : createRoomTelemetry(now);
  telemetry.intentsAccepted ??= { P1: 0, P2: 0 };
  telemetry.intentsRejected ??= { P1: 0, P2: 0 };
  telemetry.disconnects ??= { P1: 0, P2: 0 };
  telemetry.reconnects ??= { P1: 0, P2: 0 };
  telemetry.disconnectedTotalMs ??= { P1: 0, P2: 0 };
  telemetry.maxDisconnectMs ??= { P1: 0, P2: 0 };
  telemetry.decisions ??= { P1: playerDecisions(), P2: playerDecisions() };
  telemetry.diagnostics ??= [];
  telemetry.diagnosticSeq = Math.max(Number(telemetry.diagnosticSeq ?? 0), telemetry.diagnostics.at(-1)?.seq ?? 0);
  if (telemetry.currentDecision) closeDecision(telemetry, savedAt == null ? now : Math.max(0, savedAt));
  synchronizeRoomTelemetry(telemetry, state, now);
  addDiagnostic(telemetry, now, "SERVER_RESTORED", undefined, { stateVersion: state?.stateVersion ?? null });
  return telemetry;
}

export function recordIntentResult(telemetry: RoomTelemetryState, at: number, playerId: PlayerId, intentType: string, accepted: boolean, stateVersion: number): void {
  const bucket = accepted ? telemetry.intentsAccepted : telemetry.intentsRejected;
  bucket[playerId] += 1;
  addDiagnostic(telemetry, at, accepted ? "INTENT_ACCEPTED" : "INTENT_REJECTED", playerId, { intentType, stateVersion });
}

export function recordDisconnect(telemetry: RoomTelemetryState, at: number, playerId: PlayerId): void {
  telemetry.disconnects[playerId] += 1;
  addDiagnostic(telemetry, at, "DISCONNECTED", playerId);
}

export function recordReconnect(telemetry: RoomTelemetryState, at: number, playerId: PlayerId, disconnectedAt: number | null): void {
  if (disconnectedAt !== null) {
    const elapsed = Math.max(0, at - disconnectedAt);
    telemetry.reconnects[playerId] += 1;
    telemetry.disconnectedTotalMs[playerId] += elapsed;
    telemetry.maxDisconnectMs[playerId] = Math.max(telemetry.maxDisconnectMs[playerId], elapsed);
    addDiagnostic(telemetry, at, "CONNECTED", playerId, { reconnect: true, disconnectedMs: elapsed });
  } else {
    addDiagnostic(telemetry, at, "CONNECTED", playerId, { reconnect: false });
  }
}

function decisionView(telemetry: RoomTelemetryState, playerId: PlayerId, kind: TimerClockKind, now: number): { totalSeconds: number; segments: number; maxSegmentSeconds: number } {
  const stored = telemetry.decisions[playerId][kind];
  let totalMs = stored.totalMs;
  let segments = stored.segments;
  let maxSegmentMs = stored.maxSegmentMs;
  const current = telemetry.currentDecision;
  if (current?.playerId === playerId && current.kind === kind) {
    const elapsed = Math.max(0, now - current.startedAt);
    totalMs += elapsed;
    maxSegmentMs = Math.max(maxSegmentMs, elapsed);
    segments += 1;
  }
  return { totalSeconds: totalMs / 1000, segments, maxSegmentSeconds: maxSegmentMs / 1000 };
}

export function projectRoomTelemetry(telemetry: RoomTelemetryState, now: number): RoomTelemetryView {
  const end = telemetry.endedAt ?? now;
  const elapsed = telemetry.startedAt == null ? null : Math.max(0, end - telemetry.startedAt) / 1000;
  return {
    serverNow: now,
    matchElapsedSeconds: elapsed,
    intentsAccepted: structuredClone(telemetry.intentsAccepted),
    intentsRejected: structuredClone(telemetry.intentsRejected),
    disconnects: structuredClone(telemetry.disconnects),
    reconnects: structuredClone(telemetry.reconnects),
    disconnectedSeconds: { P1: telemetry.disconnectedTotalMs.P1 / 1000, P2: telemetry.disconnectedTotalMs.P2 / 1000 },
    maxDisconnectSeconds: { P1: telemetry.maxDisconnectMs.P1 / 1000, P2: telemetry.maxDisconnectMs.P2 / 1000 },
    decisions: {
      P1: { TURN: decisionView(telemetry, "P1", "TURN", now), RESPONSE: decisionView(telemetry, "P1", "RESPONSE", now), DECISION: decisionView(telemetry, "P1", "DECISION", now) },
      P2: { TURN: decisionView(telemetry, "P2", "TURN", now), RESPONSE: decisionView(telemetry, "P2", "RESPONSE", now), DECISION: decisionView(telemetry, "P2", "DECISION", now) }
    },
    currentDecision: telemetry.currentDecision ? { kind: telemetry.currentDecision.kind, playerId: telemetry.currentDecision.playerId, elapsedSeconds: Math.max(0, now - telemetry.currentDecision.startedAt) / 1000 } : null,
    diagnostics: structuredClone(telemetry.diagnostics)
  };
}
