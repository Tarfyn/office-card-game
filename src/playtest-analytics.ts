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
  decks: Array<{ deckId: string; deckName: string; department: string }>;
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
  endReasons: Array<{ reason: string; matches: number }>;
  departments: Array<{ department: string; appearances: number; wins: number; losses: number; draws: number; winRate: number | null }>;
  decks: Array<{ deckId: string; deckName: string; department: string; appearances: number; wins: number; losses: number; draws: number; winRate: number | null; firstAppearances:number; firstWins:number; firstWinRate:number|null; secondAppearances:number; secondWins:number; secondWinRate:number|null }>;
  cards: Array<{ definitionId:string; name:string; department:string; observedSeatMatches:number; playedSeatMatches:number; observedInstances:number; playedInstances:number; draws:number; plays:number; activations:number; attacks:number; winsWhenPlayed:number; lossesWhenPlayed:number; drawsWhenPlayed:number; winRateWhenPlayed:number|null; playRateFromObserved:number|null }>;
  friction: { thresholds:{ longTurnSeconds:number; longResponseSeconds:number }; matchesWithLongTurn:number; matchesWithLongResponse:number; maxTurnSeconds:number; maxResponseSeconds:number };
  decisions: Record<"TURN" | "RESPONSE" | "DECISION", { totalSeconds: number; segments: number; averageSegmentSeconds: number | null; maxSegmentSeconds: number }>;
  connectivity: {
    matchesWithDisconnects: number;
    totalDisconnects: number;
    totalReconnects: number;
    totalOfflineSeconds: number;
    maxDisconnectSeconds: number;
  };
  recentMatches: PlaytestMatchRecord[];
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function pct(numerator: number, denominator: number): number | null {
  return denominator > 0 ? round((numerator / denominator) * 100, 1) : null;
}

function average(values: number[]): number | null {
  return values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length, 2) : null;
}

function normalizedText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

export function normalizePlaytestFilter(filter: PlaytestAnalyticsFilter = {}): Required<PlaytestAnalyticsFilter> {
  const mode = filter.mode === "FRIENDLY" || filter.mode === "RANKED" ? filter.mode : null;
  const fromValue = Number(filter.from);
  const toValue = Number(filter.to);
  let from = Number.isFinite(fromValue) && fromValue > 0 ? fromValue : null;
  let to = Number.isFinite(toValue) && toValue > 0 ? toValue : null;
  if (from != null && to != null && from > to) [from, to] = [to, from];
  const latestRaw = Number(filter.latestCompleted);
  const latestCompleted = Number.isFinite(latestRaw) && latestRaw > 0 ? Math.min(5000, Math.floor(latestRaw)) : null;
  return {
    mode,
    department: normalizedText(filter.department),
    deckId: normalizedText(filter.deckId),
    from,
    to,
    latestCompleted
  };
}

function recordTimestamp(record: PlaytestMatchRecord): number {
  return Number(record.endedAt ?? record.startedAt ?? record.createdAt ?? 0);
}

export function filterPlaytestRecords(records: PlaytestMatchRecord[], filter: PlaytestAnalyticsFilter = {}): PlaytestMatchRecord[] {
  const normalized = normalizePlaytestFilter(filter);
  let filtered = records.filter((record) => {
    if (normalized.mode && record.mode !== normalized.mode) return false;
    if (normalized.department && !([record.seats.P1, record.seats.P2].some((seat) => seat?.department === normalized.department))) return false;
    if (normalized.deckId && !([record.seats.P1, record.seats.P2].some((seat) => seat?.deckId === normalized.deckId))) return false;
    const timestamp = recordTimestamp(record);
    if (normalized.from != null && timestamp < normalized.from) return false;
    if (normalized.to != null && timestamp > normalized.to) return false;
    return true;
  });
  if (normalized.latestCompleted != null) {
    filtered = filtered
      .filter((record) => record.status === "ENDED")
      .sort((a, b) => Number(b.endedAt ?? 0) - Number(a.endedAt ?? 0))
      .slice(0, normalized.latestCompleted);
  }
  return filtered.map((record) => structuredClone(record));
}

export function playtestAnalyticsDimensions(records: PlaytestMatchRecord[]): PlaytestAnalyticsDimensions {
  const departments = new Set<string>();
  const decks = new Map<string, { deckId: string; deckName: string; department: string }>();
  const endedAt: number[] = [];
  for (const record of records) {
    if (record.status === "ENDED" && record.endedAt != null && Number.isFinite(record.endedAt)) endedAt.push(record.endedAt);
    for (const playerId of ["P1", "P2"] as PlayerId[]) {
      const seat = record.seats[playerId];
      if (!seat) continue;
      departments.add(seat.department);
      if (!decks.has(seat.deckId)) decks.set(seat.deckId, { deckId:seat.deckId, deckName:seat.deckName, department:seat.department });
    }
  }
  return {
    modes: ["FRIENDLY", "RANKED"],
    departments: [...departments].sort((a, b) => a.localeCompare(b)),
    decks: [...decks.values()].sort((a, b) => a.deckName.localeCompare(b.deckName) || a.deckId.localeCompare(b.deckId)),
    completedMatches: records.filter((record) => record.status === "ENDED").length,
    oldestEndedAt: endedAt.length ? Math.min(...endedAt) : null,
    newestEndedAt: endedAt.length ? Math.max(...endedAt) : null
  };
}

function bucket(records: PlaytestMatchRecord[]): AggregateBucket {
  const ended = records.filter((record) => record.status === "ENDED");
  const decisive = ended.filter((record) => Boolean(record.winnerId));
  const wins = decisive.filter((record) => record.winnerId === "P1").length;
  const losses = decisive.length - wins;
  const durations = ended.map((record) => record.telemetry.matchElapsedSeconds).filter((value): value is number => value != null && Number.isFinite(value));
  return {
    matches: ended.length,
    decisiveMatches: decisive.length,
    wins,
    losses,
    draws: ended.length - decisive.length,
    winRate: pct(wins, decisive.length),
    averageTurns: average(ended.map((record) => record.turns)),
    averageDurationSeconds: average(durations)
  };
}

export function aggregatePlaytestAnalytics(records: PlaytestMatchRecord[], now = Date.now()): PlaytestAnalyticsSummary {
  const safeRecords = records.map((record) => structuredClone(record));
  const completed = safeRecords.filter((record) => record.status === "ENDED");
  const decisive = completed.filter((record) => Boolean(record.winnerId));
  const durations = completed.map((record) => record.telemetry.matchElapsedSeconds).filter((value): value is number => value != null && Number.isFinite(value));
  const firstPlayerWins = decisive.filter((record) => record.firstPlayerId && record.winnerId === record.firstPlayerId).length;

  const endReasonCounts = new Map<string, number>();
  const departments = new Map<string, { appearances: number; wins: number; losses: number; draws: number }>();
  const decks = new Map<string, { deckId: string; deckName: string; department: string; appearances: number; wins: number; losses: number; draws: number; firstAppearances:number; firstWins:number; secondAppearances:number; secondWins:number }>();
  const cards = new Map<string, { definitionId:string; name:string; department:string; observedSeatMatches:number; playedSeatMatches:number; observedInstances:number; playedInstances:number; draws:number; plays:number; activations:number; attacks:number; winsWhenPlayed:number; lossesWhenPlayed:number; drawsWhenPlayed:number }>();
  const frictionThresholds={ longTurnSeconds:45, longResponseSeconds:20 };
  let matchesWithLongTurn=0, matchesWithLongResponse=0, maxTurnSeconds=0, maxResponseSeconds=0;
  const decisions = {
    TURN: { totalSeconds: 0, segments: 0, maxSegmentSeconds: 0 },
    RESPONSE: { totalSeconds: 0, segments: 0, maxSegmentSeconds: 0 },
    DECISION: { totalSeconds: 0, segments: 0, maxSegmentSeconds: 0 }
  };
  let matchesWithDisconnects = 0;
  let totalDisconnects = 0;
  let totalReconnects = 0;
  let totalOfflineSeconds = 0;
  let maxDisconnectSeconds = 0;

  for (const record of completed) {
    const reason = record.reason || "UNKNOWN";
    endReasonCounts.set(reason, (endReasonCounts.get(reason) ?? 0) + 1);
    let matchDisconnects = 0;

    for (const playerId of ["P1", "P2"] as PlayerId[]) {
      const seat = record.seats[playerId];
      if (seat) {
        const dep = departments.get(seat.department) ?? { appearances: 0, wins: 0, losses: 0, draws: 0 };
        dep.appearances += 1;
        if (!record.winnerId) dep.draws += 1;
        else if (record.winnerId === playerId) dep.wins += 1;
        else dep.losses += 1;
        departments.set(seat.department, dep);

        const key = seat.deckId;
        const deck = decks.get(key) ?? { deckId: seat.deckId, deckName: seat.deckName, department: seat.department, appearances: 0, wins: 0, losses: 0, draws: 0, firstAppearances:0, firstWins:0, secondAppearances:0, secondWins:0 };
        deck.appearances += 1;
        if (record.firstPlayerId === playerId) { deck.firstAppearances += 1; if (record.winnerId === playerId) deck.firstWins += 1; }
        else { deck.secondAppearances += 1; if (record.winnerId === playerId) deck.secondWins += 1; }
        if (!record.winnerId) deck.draws += 1;
        else if (record.winnerId === playerId) deck.wins += 1;
        else deck.losses += 1;
        decks.set(key, deck);
      }

      for (const kind of ["TURN", "RESPONSE", "DECISION"] as const) {
        const metric = record.telemetry.decisions?.[playerId]?.[kind];
        if (!metric) continue;
        decisions[kind].totalSeconds += Number(metric.totalSeconds || 0);
        decisions[kind].segments += Number(metric.segments || 0);
        decisions[kind].maxSegmentSeconds = Math.max(decisions[kind].maxSegmentSeconds, Number(metric.maxSegmentSeconds || 0));
      }

      const disconnects = Number(record.telemetry.disconnects?.[playerId] || 0);
      matchDisconnects += disconnects;
      totalDisconnects += disconnects;
      totalReconnects += Number(record.telemetry.reconnects?.[playerId] || 0);
      totalOfflineSeconds += Number(record.telemetry.disconnectedSeconds?.[playerId] || 0);
      maxDisconnectSeconds = Math.max(maxDisconnectSeconds, Number(record.telemetry.maxDisconnectSeconds?.[playerId] || 0));
    }
    const turnMax=Math.max(Number(record.telemetry.decisions?.P1?.TURN?.maxSegmentSeconds||0),Number(record.telemetry.decisions?.P2?.TURN?.maxSegmentSeconds||0));
    const responseMax=Math.max(Number(record.telemetry.decisions?.P1?.RESPONSE?.maxSegmentSeconds||0),Number(record.telemetry.decisions?.P2?.RESPONSE?.maxSegmentSeconds||0));
    maxTurnSeconds=Math.max(maxTurnSeconds,turnMax); maxResponseSeconds=Math.max(maxResponseSeconds,responseMax);
    if(turnMax>=frictionThresholds.longTurnSeconds) matchesWithLongTurn+=1;
    if(responseMax>=frictionThresholds.longResponseSeconds) matchesWithLongResponse+=1;
    for(const activity of record.cardActivity??[]){
      const value=cards.get(activity.definitionId)??{definitionId:activity.definitionId,name:activity.name,department:activity.department,observedSeatMatches:0,playedSeatMatches:0,observedInstances:0,playedInstances:0,draws:0,plays:0,activations:0,attacks:0,winsWhenPlayed:0,lossesWhenPlayed:0,drawsWhenPlayed:0};
      if(activity.observedInstances>0)value.observedSeatMatches+=1;
      if(activity.playedInstances>0){ value.playedSeatMatches+=1; if(!record.winnerId)value.drawsWhenPlayed+=1; else if(record.winnerId===activity.playerId)value.winsWhenPlayed+=1; else value.lossesWhenPlayed+=1; }
      value.observedInstances+=Number(activity.observedInstances||0); value.playedInstances+=Number(activity.playedInstances||0); value.draws+=Number(activity.draws||0); value.plays+=Number(activity.plays||0); value.activations+=Number(activity.activations||0); value.attacks+=Number(activity.attacks||0); cards.set(activity.definitionId,value);
    }
    if (matchDisconnects > 0) matchesWithDisconnects += 1;
  }

  const modeRecords = (mode: PlaytestMode) => completed.filter((record) => record.mode === mode);
  return {
    generatedAt: now,
    totals: {
      rooms: safeRecords.length,
      waitingRooms: safeRecords.filter((record) => record.status === "WAITING").length,
      activeMatches: safeRecords.filter((record) => record.status === "ACTIVE").length,
      completedMatches: completed.length,
      decisiveMatches: decisive.length,
      draws: completed.length - decisive.length,
      averageTurns: average(completed.map((record) => record.turns)),
      averageDurationSeconds: average(durations),
      firstPlayerWins,
      firstPlayerWinRate: pct(firstPlayerWins, decisive.length),
      resigns: completed.filter((record) => record.reason === "RESIGN").length
    },
    modes: {
      FRIENDLY: bucket(modeRecords("FRIENDLY")),
      RANKED: bucket(modeRecords("RANKED"))
    },
    endReasons: [...endReasonCounts.entries()].map(([reason, matches]) => ({ reason, matches })).sort((a, b) => b.matches - a.matches || a.reason.localeCompare(b.reason)),
    departments: [...departments.entries()].map(([department, value]) => ({ department, ...value, winRate: pct(value.wins, value.wins + value.losses) })).sort((a, b) => b.appearances - a.appearances || a.department.localeCompare(b.department)),
    decks: [...decks.values()].map((value) => ({ ...value, winRate: pct(value.wins, value.wins + value.losses), firstWinRate:pct(value.firstWins,value.firstAppearances), secondWinRate:pct(value.secondWins,value.secondAppearances) })).sort((a, b) => b.appearances - a.appearances || a.deckName.localeCompare(b.deckName)),
    cards: [...cards.values()].map((value)=>({ ...value, winRateWhenPlayed:pct(value.winsWhenPlayed,value.winsWhenPlayed+value.lossesWhenPlayed), playRateFromObserved:pct(value.playedSeatMatches,value.observedSeatMatches) })).sort((a,b)=>b.playedSeatMatches-a.playedSeatMatches||b.plays-a.plays||a.name.localeCompare(b.name)),
    friction:{ thresholds:frictionThresholds, matchesWithLongTurn, matchesWithLongResponse, maxTurnSeconds:round(maxTurnSeconds), maxResponseSeconds:round(maxResponseSeconds) },
    decisions: {
      TURN: { totalSeconds: round(decisions.TURN.totalSeconds), segments: decisions.TURN.segments, averageSegmentSeconds: decisions.TURN.segments ? round(decisions.TURN.totalSeconds / decisions.TURN.segments) : null, maxSegmentSeconds: round(decisions.TURN.maxSegmentSeconds) },
      RESPONSE: { totalSeconds: round(decisions.RESPONSE.totalSeconds), segments: decisions.RESPONSE.segments, averageSegmentSeconds: decisions.RESPONSE.segments ? round(decisions.RESPONSE.totalSeconds / decisions.RESPONSE.segments) : null, maxSegmentSeconds: round(decisions.RESPONSE.maxSegmentSeconds) },
      DECISION: { totalSeconds: round(decisions.DECISION.totalSeconds), segments: decisions.DECISION.segments, averageSegmentSeconds: decisions.DECISION.segments ? round(decisions.DECISION.totalSeconds / decisions.DECISION.segments) : null, maxSegmentSeconds: round(decisions.DECISION.maxSegmentSeconds) }
    },
    connectivity: {
      matchesWithDisconnects,
      totalDisconnects,
      totalReconnects,
      totalOfflineSeconds: round(totalOfflineSeconds),
      maxDisconnectSeconds: round(maxDisconnectSeconds)
    },
    recentMatches: completed.slice().sort((a, b) => Number(b.endedAt ?? 0) - Number(a.endedAt ?? 0)).slice(0, 12)
  };
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function playtestRecordsCsv(records: PlaytestMatchRecord[]): string {
  const header = ["roomId","matchId","mode","timerProfileId","timerActive","startedAt","endedAt","firstPlayerId","winnerId","reason","turns","durationSeconds","p1Deck","p1Department","p2Deck","p2Department","p1TurnSeconds","p2TurnSeconds","p1ResponseSeconds","p2ResponseSeconds","disconnects","offlineSeconds"];
  const rows = records.filter((record) => record.status === "ENDED").map((record) => {
    const t = record.telemetry;
    return [
      record.roomId, record.matchId, record.mode, record.timerProfileId, record.timerActive, record.startedAt, record.endedAt, record.firstPlayerId, record.winnerId, record.reason, record.turns,
      t.matchElapsedSeconds ?? "", record.seats.P1?.deckName ?? "", record.seats.P1?.department ?? "", record.seats.P2?.deckName ?? "", record.seats.P2?.department ?? "",
      t.decisions.P1.TURN.totalSeconds, t.decisions.P2.TURN.totalSeconds, t.decisions.P1.RESPONSE.totalSeconds, t.decisions.P2.RESPONSE.totalSeconds,
      Number(t.disconnects.P1 || 0) + Number(t.disconnects.P2 || 0), Number(t.disconnectedSeconds.P1 || 0) + Number(t.disconnectedSeconds.P2 || 0)
    ].map(csvEscape).join(",");
  });
  return [header.join(","), ...rows].join("\n") + "\n";
}


export function playtestCardActivityCsv(cards: PlaytestAnalyticsSummary["cards"]): string {
  const header=["definitionId","name","department","observedSeatMatches","playedSeatMatches","observedInstances","playedInstances","draws","plays","activations","attacks","winsWhenPlayed","lossesWhenPlayed","drawsWhenPlayed","winRateWhenPlayed","playRateFromObserved"];
  const rows=cards.map((card)=>[card.definitionId,card.name,card.department,card.observedSeatMatches,card.playedSeatMatches,card.observedInstances,card.playedInstances,card.draws,card.plays,card.activations,card.attacks,card.winsWhenPlayed,card.lossesWhenPlayed,card.drawsWhenPlayed,card.winRateWhenPlayed??"",card.playRateFromObserved??""].map(csvEscape).join(","));
  return [header.join(","),...rows].join("\n")+"\n";
}
