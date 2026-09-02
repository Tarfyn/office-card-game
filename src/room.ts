import { alphaDefinitions } from "./cards.js";
import { alphaDeckPresets, type DeckPreset } from "./decks.js";
import { createMatch, resign, validateDeck, type MatchQaSetup } from "./engine.js";
import { ALPHA_FORMAT } from "./formats.js";
import { defaultCosmeticLoadout, normalizeCosmeticLoadout, type CosmeticLoadout } from "./cosmetics.js";
import { executeHostedMatchIntent, executeMatchIntent } from "./intents.js";
import { chooseAuthoritativeBotIntent } from "./bot.js";
import { projectEventsSince, projectStateForViewer } from "./projection.js";
import {
  clearReconnectDeadline,
  clockIsExpired,
  consumeRunningClock,
  createTimerRuntime,
  projectTimerRuntime,
  restoreTimerRuntime,
  setReconnectDeadline,
  synchronizeTimerRuntime,
  timerProfileIsRunnable,
  timerProfilesById,
  type RoomTimerRuntime,
  type RoomTimerView,
  type TimerProfileConfig
} from "./timers.js";
import type { PlaytestCardActivity, PlaytestMatchRecord } from "./playtest-analytics.js";
import {
  addDiagnostic,
  createRoomTelemetry,
  projectRoomTelemetry,
  recordDisconnect,
  recordIntentResult,
  recordReconnect,
  restoreRoomTelemetry,
  synchronizeRoomTelemetry,
  type RoomTelemetryState,
  type RoomTelemetryView
} from "./telemetry.js";
import type { ClientEvent, ClientGameState, DeckEntry, GameState, MatchCommandResponse, MatchIntent, PlayerId } from "./types.js";
import type { SnapshotPersistence } from "./storage.js";

export type RoomStatus = "WAITING" | "ACTIVE" | "ENDED";
export type RoomSeatConnectionStatus = "CONNECTED" | "DISCONNECTED";
export type RoomMatchMode = "FRIENDLY" | "RANKED" | "TRAINING" | "TUTORIAL";

const DEFAULT_BOARD_SKIN_ID = "classic-office"; // legacy persistence fallback only
// Compatibility marker: cosmeticLoadout: defaultCosmeticLoadout("P1") and cosmeticLoadout: defaultCosmeticLoadout("P2") remain the legacy seat fallbacks.

export interface RoomMatchSettings {
  mode: RoomMatchMode;
  timerProfileId: string;
  timerActive: boolean;
  /** Rated ladder updates are allowed only for server-created Ranked Quick Match rooms. */
  ratingActive?: boolean;
  bot?: boolean;
  rewardEligible?: boolean;
}

export interface RoomSettingsSelection {
  mode?: RoomMatchMode | string;
  timerProfileId?: string;
  ratingActive?: boolean;
  bot?: boolean;
  rewardEligible?: boolean;
}

export interface RoomSeatIdentity {
  profileId?: string | null;
  displayName?: string | null;
  cosmeticLoadout?: CosmeticLoadout | null;
  isBot?: boolean;
}

export interface FinishedRankedRoomResult {
  roomId: string;
  matchId: string;
  p1ProfileId: string;
  p2ProfileId: string;
  winnerProfileId: string | null;
  winnerPlayerId: PlayerId | null;
  reason: string;
  endedAt: number | null;
}

export interface MatchCompletionResult {
  roomId: string;
  matchId: string;
  mode: RoomMatchMode;
  winnerPlayerId: PlayerId | null;
  reason: string;
  endedAt: number | null;
  seats: Record<PlayerId, {
    profileId: string | null;
    displayName: string | null;
    deckName: string;
  }>;
}
export type RoomErrorCode = "ROOM_NOT_FOUND" | "ROOM_FULL" | "INVALID_TOKEN" | "INVALID_DECK" | "MATCH_NOT_READY" | "REPLAY_NOT_AVAILABLE" | "PROFILE_NOT_IN_ROOM" | "SESSION_SUPERSEDED" | "REMATCH_NOT_READY" | "RATED_REMATCH_DISABLED";

export class RoomError extends Error {
  constructor(public readonly code: RoomErrorCode, message: string) {
    super(message);
    this.name = "RoomError";
  }
}

export interface CustomDeckSelection {
  id: string;
  name: string;
  cards: DeckEntry[];
}

export type DeckSelection = string | CustomDeckSelection;

export interface RoomSeatLifecycle {
  lastSeenAt: number | null;
  lastActionAt: number | null;
  disconnectedAt: number | null;
}

export interface RoomLifecycleState {
  createdAt: number;
  matchStartedAt: number | null;
  turnStartedAt: number | null;
  responseStartedAt: number | null;
  seats: Record<PlayerId, RoomSeatLifecycle>;
}

export interface RoomPresenceView extends RoomSeatLifecycle {
  status: RoomSeatConnectionStatus;
}

export interface RoomLifecycleView {
  serverNow: number;
  createdAt: number;
  matchStartedAt: number | null;
  turnStartedAt: number | null;
  responseStartedAt: number | null;
  presence: Record<PlayerId, RoomPresenceView>;
  enforcement: {
    autoForfeitEnabled: boolean;
    afkTimeoutSeconds: null;
    reconnectGraceSeconds: number | null;
  };
}

export interface PersistedRoomSeat {
  playerId: PlayerId;
  token: string;
  profileId: string | null;
  displayName: string | null;
  deckId: string;
  deckName: string;
  department: string;
  boardSkinId?: string;
  cosmeticLoadout: CosmeticLoadout;
  isBot?: boolean;
  cards: DeckEntry[];
}

export interface PersistedCachedIntent {
  response: MatchCommandResponse;
}

interface RoomRecord {
  id: string;
  roomVersion: number;
  host: PersistedRoomSeat;
  guest: PersistedRoomSeat | null;
  state: GameState | null;
  processedIntents: Map<string, PersistedCachedIntent>;
  listeners: Set<() => void>;
  settings: RoomMatchSettings;
  lifecycle: RoomLifecycleState;
  timer: RoomTimerRuntime;
  telemetry: RoomTelemetryState;
  connectionCounts: Record<PlayerId, number>;
  activeClientIds: Record<PlayerId, string | null>;
  rematchTargetRoomId?: string | null;
  rematchSourceRoomId?: string | null;
  rematchConfirmedSeats?: Partial<Record<PlayerId, boolean>>;
  rematchAlternateFirstPlayer?: boolean;
  rematchExpiresAt?: number | null;
}

export interface PersistedRoomRecord {
  id: string;
  roomVersion: number;
  host: PersistedRoomSeat;
  guest: PersistedRoomSeat | null;
  state: GameState | null;
  processedIntents: Array<{ key: string; cached: PersistedCachedIntent }>;
  settings: RoomMatchSettings;
  lifecycle?: RoomLifecycleState;
  timer?: RoomTimerRuntime;
  telemetry?: RoomTelemetryState;
  rematchTargetRoomId?: string | null;
  rematchSourceRoomId?: string | null;
  rematchConfirmedSeats?: Partial<Record<PlayerId, boolean>>;
  rematchAlternateFirstPlayer?: boolean;
  rematchExpiresAt?: number | null;
}

export interface RoomStoreSnapshot {
  version: 1;
  savedAt?: number;
  rooms: PersistedRoomRecord[];
}

export interface RoomPersistence extends SnapshotPersistence<RoomStoreSnapshot> {}

export interface RoomViewerSessionView {
  protectionEnabled: boolean;
  isPrimary: boolean;
  activeElsewhere: boolean;
  connectionCount: number;
}

export interface RoomClientView {
  roomId: string;
  roomVersion: number;
  status: RoomStatus;
  playerId: PlayerId;
  hostDeckId: string;
  guestDeckId: string | null;
  hostDeckName: string;
  guestDeckName: string | null;
  hostDepartment: string;
  guestDepartment: string | null;
  hostDisplayName: string | null;
  guestDisplayName: string | null;
  hostBoardSkinId: string;
  guestBoardSkinId: string | null;
  hostCosmeticLoadout: CosmeticLoadout;
  guestCosmeticLoadout: CosmeticLoadout | null;
  guestIsBot?: boolean;
  settings: RoomMatchSettings;
  lifecycle: RoomLifecycleView;
  timer: RoomTimerView;
  telemetry: RoomTelemetryView;
  viewerSession: RoomViewerSessionView;
  rematchAvailable: boolean;
  rematchSourceRoomId: string | null;
  rematchConfirmedByViewer: boolean;
  rematchConfirmedByOpponent: boolean;
  rematchExpiresAt: number | null;
  match: ClientGameState | null;
  events: ClientEvent[];
}

export interface RoomReplayEvent extends ClientEvent {
  turnNumber: number;
  phase: string | null;
  cardDefinitionId?: string;
  cardName?: string;
}

export interface RoomReplayView {
  version: "4.4";
  roomId: string;
  matchId: string;
  viewerId: PlayerId;
  mode: RoomMatchMode;
  timerProfileId: string;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  firstPlayerId: PlayerId;
  winnerId: PlayerId | null;
  reason: string | null;
  turns: number;
  host: { playerId:"P1"; displayName:string | null; deckId:string; deckName:string; department:string };
  guest: { playerId:"P2"; displayName:string | null; deckId:string; deckName:string; department:string } | null;
  events: RoomReplayEvent[];
  finalState: ClientGameState;
  telemetry: RoomTelemetryView;
}

export interface CreateRoomResult {
  roomId: string;
  token: string;
  playerId: "P1";
  view: RoomClientView;
}

export interface JoinRoomResult {
  roomId: string;
  token: string;
  playerId: "P2";
  view: RoomClientView;
}

export interface RematchRoomResult {
  roomId: string;
  token: string;
  playerId: PlayerId;
  view: RoomClientView;
  created: boolean;
  waiting: boolean;
  alternateFirstPlayer: boolean;
}

export interface RoomIntentRequest {
  clientId?: string;
  intentId: string;
  expectedStateVersion: number;
  intent: MatchIntent;
}

export interface RoomIntentResult {
  response: MatchCommandResponse;
  view: RoomClientView;
  replayed: boolean;
}

export interface RoomServiceOptions {
  definitions?: typeof alphaDefinitions;
  presets?: Record<string, DeckPreset>;
  roomIdFactory?: () => string;
  tokenFactory?: () => string;
  seedFactory?: () => number;
  firstPlayerFactory?: () => PlayerId;
  nowFactory?: () => number;
  persistence?: RoomPersistence;
  timerProfiles?: TimerProfileConfig[] | Record<string, TimerProfileConfig>;
  onMatchCompleted?: (result: MatchCompletionResult) => void;
}

function defaultRoomId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function defaultToken(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

const DEFAULT_TIMER_PROFILES: Record<string, TimerProfileConfig> = {
  UNTIMED: { id:"UNTIMED", enabled:false, turnSeconds:null, responseSeconds:null, timeBankSeconds:null, reconnectGraceSeconds:null },
  RANKED_STANDARD_TBD: { id:"RANKED_STANDARD_TBD", enabled:false, turnSeconds:null, responseSeconds:null, timeBankSeconds:null, reconnectGraceSeconds:null, status:"TUNING_REQUIRED" }
};
const REMATCH_REQUEST_TIMEOUT_MS = 90_000;

function normalizeRoomSettings(selection: RoomSettingsSelection = {}, timerProfiles: Record<string, TimerProfileConfig> = DEFAULT_TIMER_PROFILES): RoomMatchSettings {
  const mode: RoomMatchMode = selection.mode === "RANKED" ? "RANKED" : selection.mode === "TRAINING" ? "TRAINING" : selection.mode === "TUTORIAL" ? "TUTORIAL" : "FRIENDLY";
  const fallbackProfileId = mode === "RANKED" ? "RANKED_STANDARD_TBD" : "UNTIMED";
  const requested = typeof selection.timerProfileId === "string" && timerProfiles[selection.timerProfileId] ? selection.timerProfileId : fallbackProfileId;
  const profile = timerProfiles[requested] ?? DEFAULT_TIMER_PROFILES[fallbackProfileId];
  const bot = selection.bot === true || mode === "TRAINING" || mode === "TUTORIAL";
  const base = { mode, timerProfileId: requested, timerActive: mode === "FRIENDLY" || mode === "RANKED" ? timerProfileIsRunnable(profile) : false };
  if (bot || selection.rewardEligible != null) return { ...base, bot, rewardEligible: selection.rewardEligible ?? false };
  return mode === "RANKED" && selection.ratingActive === true ? { ...base, ratingActive:true } : base;
}

export class RoomService {
  private readonly rooms = new Map<string, RoomRecord>();
  private readonly definitions;
  private readonly presets;
  private readonly roomIdFactory;
  private readonly tokenFactory;
  private readonly seedFactory;
  private readonly firstPlayerFactory;
  private readonly nowFactory;
  private readonly persistence: RoomPersistence | null;
  private readonly timerProfiles: Record<string, TimerProfileConfig>;
  private readonly onMatchCompleted: ((result: MatchCompletionResult) => void) | null;

  constructor(options: RoomServiceOptions = {}) {
    this.definitions = options.definitions ?? alphaDefinitions;
    this.presets = options.presets ?? alphaDeckPresets;
    this.roomIdFactory = options.roomIdFactory ?? defaultRoomId;
    this.tokenFactory = options.tokenFactory ?? defaultToken;
    this.seedFactory = options.seedFactory ?? (() => Math.floor(Math.random() * 0x7fffffff));
    this.firstPlayerFactory = options.firstPlayerFactory ?? (() => Math.random() < 0.5 ? "P1" : "P2");
    this.nowFactory = options.nowFactory ?? (() => Date.now());
    this.persistence = options.persistence ?? null;
    this.timerProfiles = { ...DEFAULT_TIMER_PROFILES, ...timerProfilesById(options.timerProfiles) };
    this.onMatchCompleted = options.onMatchCompleted ?? null;
    this.restore();
  }

  get storageLabel(): string {
    return this.persistence?.storageLabel ?? "MEMORY_ONLY";
  }

  listPresets(): Array<Pick<DeckPreset, "id" | "name" | "department" | "description" | "cards">> {
    // Starter blueprints are public match-prep data. The client needs their
    // complete 40-card lists to validate Quick Match / room readiness. Return
    // defensive copies so API consumers cannot mutate the preset registry.
    return Object.values(this.presets).map(({ id, name, department, description, cards }) => ({
      id,
      name,
      department,
      description,
      cards: cards.map((entry) => ({ ...entry }))
    }));
  }

  listFinishedRankedResults(): FinishedRankedRoomResult[] {
    const results: FinishedRankedRoomResult[] = [];
    for (const room of this.rooms.values()) {
      if (room.settings.mode !== "RANKED" || !room.settings.ratingActive || !room.state || room.state.status !== "ENDED" || !room.guest) continue;
      if (!room.host.profileId || !room.guest.profileId) continue;
      const winnerProfileId = room.state.winnerId === "P1" ? room.host.profileId : room.state.winnerId === "P2" ? room.guest.profileId : null;
      results.push({
        roomId:room.id,
        matchId:room.state.matchId,
        p1ProfileId:room.host.profileId,
        p2ProfileId:room.guest.profileId,
        winnerProfileId,
        winnerPlayerId:room.state.winnerId,
        reason:String(room.state.reason ?? "UNKNOWN"),
        endedAt:room.telemetry.endedAt
      });
    }
    return results;
  }

  private playtestCardActivity(state: GameState | null): PlaytestCardActivity[] {
    if (!state) return [];
    const observedTypes=new Set(["CARD_DRAWN","CARD_PLAYED","INCIDENT_SET","INCIDENT_ACTIVATED","ABILITY_ACTIVATED","ATTACK_DECLARED","CARD_REVEALED"]);
    const rows=new Map<string,{definitionId:string;name:string;department:string;playerId:PlayerId;observed:Set<string>;played:Set<string>;draws:number;plays:number;activations:number;attacks:number}>();
    for(const event of state.eventLog){
      const instanceId=event.cardInstanceId; if(!instanceId)continue;
      const card=state.cards[instanceId]; if(!card)continue;
      const def=state.definitions[card.definitionId]; if(!def)continue;
      const playerId=(event.playerId??card.controllerId) as PlayerId;
      const key=`${playerId}:${def.id}`;
      const row=rows.get(key)??{definitionId:def.id,name:def.name,department:def.department,playerId,observed:new Set<string>(),played:new Set<string>(),draws:0,plays:0,activations:0,attacks:0};
      if(observedTypes.has(event.type))row.observed.add(instanceId);
      if(event.type==="CARD_DRAWN")row.draws+=1;
      if(event.type==="CARD_PLAYED"||event.type==="INCIDENT_SET"){row.plays+=1;row.played.add(instanceId);}
      if(event.type==="INCIDENT_ACTIVATED"||event.type==="ABILITY_ACTIVATED")row.activations+=1;
      if(event.type==="ATTACK_DECLARED")row.attacks+=1;
      rows.set(key,row);
    }
    return [...rows.values()].map((row)=>({definitionId:row.definitionId,name:row.name,department:row.department,playerId:row.playerId,observedInstances:row.observed.size,playedInstances:row.played.size,draws:row.draws,plays:row.plays,activations:row.activations,attacks:row.attacks}));
  }

  listPlaytestRecords(): PlaytestMatchRecord[] {
    const now = this.nowFactory();
    return [...this.rooms.values()].map((room) => {
      const status: "WAITING" | "ACTIVE" | "ENDED" = !room.state ? "WAITING" : room.state.status === "ENDED" ? "ENDED" : "ACTIVE";
      return {
        roomId: room.id,
        matchId: room.state?.matchId ?? null,
        status,
        mode: room.settings.mode,
        timerProfileId: room.settings.timerProfileId,
        timerActive: room.settings.timerActive,
        createdAt: room.lifecycle.createdAt,
        startedAt: room.lifecycle.matchStartedAt,
        endedAt: room.telemetry.endedAt,
        firstPlayerId: room.state?.firstPlayerId ?? null,
        winnerId: room.state?.winnerId ?? null,
        reason: room.state?.reason ?? null,
        turns: Number(room.state?.turnNumber ?? 0),
        seats: {
          P1: { deckId: room.host.deckId, deckName: room.host.deckName, department: room.host.department },
          P2: room.guest ? { deckId: room.guest.deckId, deckName: room.guest.deckName, department: room.guest.department } : null
        },
        telemetry: projectRoomTelemetry(room.telemetry, now),
        cardActivity: this.playtestCardActivity(room.state)
      };
    });
  }

  createRoom(deckSelection: DeckSelection, settingsSelection: RoomSettingsSelection = {}, identity: RoomSeatIdentity = {}): CreateRoomResult {
    const deck = this.resolveDeck(deckSelection);
    const settings = normalizeRoomSettings(settingsSelection, this.timerProfiles);
    let roomId = this.roomIdFactory().toUpperCase();
    let attempts = 0;
    while (this.rooms.has(roomId)) {
      if (++attempts > 20) throw new Error("Unable to allocate unique room id.");
      roomId = this.roomIdFactory().toUpperCase();
    }
    const token = this.tokenFactory();
    const room: RoomRecord = {
      id: roomId,
      roomVersion: 1,
      host: { playerId: "P1", token, profileId: identity.profileId ?? null, displayName: identity.displayName ?? null, deckId: deck.id, deckName: deck.name, department: deck.department, boardSkinId: DEFAULT_BOARD_SKIN_ID, cosmeticLoadout: normalizeCosmeticLoadout(identity.cosmeticLoadout, "P1"), cards: deck.cards },
      guest: null,
      state: null,
      processedIntents: new Map(),
      listeners: new Set(),
      settings,
      lifecycle: this.newLifecycle(),
      timer: createTimerRuntime(this.effectiveTimerProfile(settings), null, this.nowFactory()),
      telemetry: createRoomTelemetry(this.nowFactory()),
      connectionCounts: { P1: 0, P2: 0 },
      activeClientIds: { P1: null, P2: null },
      rematchTargetRoomId: null,
      rematchSourceRoomId: null,
      rematchConfirmedSeats: {},
      rematchAlternateFirstPlayer: false
    };
    this.rooms.set(roomId, room);
    this.persist();
    return { roomId, token, playerId: "P1", view: this.projectRoom(room, token, 0) };
  }

  createBotRoom(deckSelection: DeckSelection, settingsSelection: RoomSettingsSelection = {}, identity: RoomSeatIdentity = {}, botDeckSelection: DeckSelection = "it-starter", botDisplayName = "Office Coach", qaSetup?: MatchQaSetup): CreateRoomResult {
    const created = this.createRoom(deckSelection, { ...settingsSelection, bot:true, rewardEligible:false }, identity);
    this.joinRoom(created.roomId, botDeckSelection, { displayName:botDisplayName, isBot:true }, qaSetup);
    const room = this.getRoom(created.roomId);
    this.runBot(room);
    return { ...created, view:this.projectRoom(room, created.token, 0) };
  }

  joinRoom(roomId: string, deckSelection: DeckSelection, identity: RoomSeatIdentity = {}, qaSetup?: MatchQaSetup): JoinRoomResult {
    const deck = this.resolveDeck(deckSelection);
    const room = this.getRoom(roomId);
    if (room.guest) throw new RoomError("ROOM_FULL", "Room already has two players.");
    const token = this.tokenFactory();
    room.guest = { playerId: "P2", token, profileId: identity.profileId ?? null, displayName: identity.displayName ?? null, deckId: deck.id, deckName: deck.name, department: deck.department, boardSkinId: DEFAULT_BOARD_SKIN_ID, cosmeticLoadout: normalizeCosmeticLoadout(identity.cosmeticLoadout, "P2"), cards: deck.cards, isBot:Boolean(identity.isBot) };
    room.state = createMatch({
      matchId: `match-${room.id}`,
      seed: this.seedFactory(),
      firstPlayerId: this.firstPlayerFactory(),
      definitions: this.definitions,
      p1Deck: room.host.cards,
      p2Deck: deck.cards,
      format: ALPHA_FORMAT,
      qaSetup
    });
    const now = this.nowFactory();
    room.lifecycle.matchStartedAt = now;
    room.lifecycle.turnStartedAt = now;
    room.lifecycle.responseStartedAt = room.state.responseWindow ? now : null;
    room.lifecycle.seats.P2.lastSeenAt = now;
    synchronizeTimerRuntime(room.timer, this.effectiveTimerProfile(room.settings), null, room.state, now);
    synchronizeRoomTelemetry(room.telemetry, room.state, now);
    addDiagnostic(room.telemetry, now, "MATCH_STARTED", undefined, { firstPlayerId: room.state.firstPlayerId });
    room.roomVersion += 1;
    this.persist();
    this.notify(room);
    return { roomId: room.id, token, playerId: "P2", view: this.projectRoom(room, token, 0) };
  }

  rematchRoom(roomId: string, token: string, options: { alternateFirstPlayer?: boolean } = {}): RematchRoomResult {
    const source = this.getRoom(roomId);
    const sourceSeat = this.resolveSeat(source, token);
    if (!source.state || source.state.status !== "ENDED" || !source.guest) throw new RoomError("REMATCH_NOT_READY", "Rematch is available only after a completed two-player match.");
    if (source.settings.ratingActive) throw new RoomError("RATED_REMATCH_DISABLED", "Rated Ranked matches must return to matchmaking for another rated opponent.");

    if (source.rematchTargetRoomId && this.rooms.has(source.rematchTargetRoomId)) {
      const target = this.getRoom(source.rematchTargetRoomId);
      const now = this.nowFactory();
      if (!target.state && target.rematchExpiresAt && now >= target.rematchExpiresAt) {
        source.rematchTargetRoomId = null;
        source.roomVersion += 1;
        this.rooms.delete(target.id);
        this.persist();
        this.notify(source);
        throw new RoomError("REMATCH_NOT_READY", "Rematch request expired. Start a new rematch request if both players still want to play again.");
      }
      const seat = sourceSeat.playerId === "P1" ? target.host : target.guest;
      if (!seat) throw new RoomError("REMATCH_NOT_READY", "Rematch seat is not available.");
      target.rematchConfirmedSeats = { ...(target.rematchConfirmedSeats ?? {}), [sourceSeat.playerId]:true };

      if (!target.state && target.rematchConfirmedSeats.P1 && target.rematchConfirmedSeats.P2 && target.guest) {
        const firstPlayerId: PlayerId = target.rematchAlternateFirstPlayer ? (source.state.firstPlayerId === "P1" ? "P2" : "P1") : source.state.firstPlayerId;
        target.state = createMatch({
          matchId:`match-${target.id}`, seed:this.seedFactory(), firstPlayerId, definitions:this.definitions,
          p1Deck:target.host.cards, p2Deck:target.guest.cards, format:ALPHA_FORMAT
        });
        const now = this.nowFactory();
        target.lifecycle.matchStartedAt = now;
        target.lifecycle.turnStartedAt = now;
        target.lifecycle.responseStartedAt = target.state.responseWindow ? now : null;
        target.rematchExpiresAt = null;
        synchronizeTimerRuntime(target.timer, this.effectiveTimerProfile(target.settings), null, target.state, now);
        synchronizeRoomTelemetry(target.telemetry, target.state, now);
        addDiagnostic(target.telemetry, now, "MATCH_STARTED", undefined, { firstPlayerId, rematchOf:source.id });
      }

      target.roomVersion += 1;
      this.persist();
      this.notify(target);
      return {
        roomId:target.id,
        token:seat.token,
        playerId:seat.playerId,
        view:this.projectRoom(target, seat.token, 0),
        created:false,
        waiting:!target.state,
        alternateFirstPlayer:Boolean(target.rematchAlternateFirstPlayer)
      };
    }

    let nextRoomId = this.roomIdFactory().toUpperCase();
    let attempts = 0;
    while (this.rooms.has(nextRoomId)) {
      if (++attempts > 20) throw new Error("Unable to allocate unique rematch room id.");
      nextRoomId = this.roomIdFactory().toUpperCase();
    }
    const p1Token = this.tokenFactory();
    const p2Token = this.tokenFactory();
    const alternateFirstPlayer = options.alternateFirstPlayer === true;
    const now = this.nowFactory();
    const lifecycle = this.newLifecycle();
    const settings = structuredClone(source.settings);
    const timer = createTimerRuntime(this.effectiveTimerProfile(settings), null, now);
    const telemetry = createRoomTelemetry(now);
    const room: RoomRecord = {
      id:nextRoomId, roomVersion:1,
      host:{ ...structuredClone(source.host), token:p1Token },
      guest:{ ...structuredClone(source.guest), token:p2Token },
      state:null, processedIntents:new Map(), listeners:new Set(), settings, lifecycle, timer, telemetry,
      connectionCounts:{ P1:0, P2:0 }, activeClientIds:{ P1:null, P2:null }, rematchTargetRoomId:null,
      rematchSourceRoomId:source.id,
      rematchConfirmedSeats:{ [sourceSeat.playerId]:true },
      rematchAlternateFirstPlayer:alternateFirstPlayer,
      rematchExpiresAt:now + REMATCH_REQUEST_TIMEOUT_MS
    };
    this.rooms.set(nextRoomId, room);
    source.rematchTargetRoomId = nextRoomId;
    source.roomVersion += 1;
    this.persist();
    this.notify(source);
    const seat = sourceSeat.playerId === "P1" ? room.host : room.guest!;
    return {
      roomId:room.id,
      token:seat.token,
      playerId:seat.playerId,
      view:this.projectRoom(room, seat.token, 0),
      created:true,
      waiting:true,
      alternateFirstPlayer
    };
  }

  getView(roomId: string, token: string, afterEventSeq = 0, clientId?: string): RoomClientView {
    return this.projectRoom(this.getRoom(roomId), token, afterEventSeq, clientId);
  }

  claimSeatClient(roomId: string, token: string, clientId: string): RoomClientView {
    const room = this.getRoom(roomId);
    const seat = this.resolveSeat(room, token);
    const normalized = String(clientId ?? "").trim();
    if (normalized.length < 8 || normalized.length > 160) throw new RoomError("SESSION_SUPERSEDED", "This browser session could not be verified.");
    room.activeClientIds[seat.playerId] = normalized;
    room.roomVersion += 1;
    this.notify(room);
    return this.projectRoom(room, token, room.state?.eventSeq ?? 0, normalized);
  }

  getSeatIdentity(roomId: string, token: string): { playerId: PlayerId; profileId: string | null; displayName: string | null } {
    const seat = this.resolveSeat(this.getRoom(roomId), token);
    return { playerId: seat.playerId, profileId: seat.profileId, displayName: seat.displayName };
  }

  getReplayForProfile(roomId: string, profileId: string): RoomReplayView {
    const room = this.getRoom(roomId);
    if (!room.state || room.state.status !== "ENDED") throw new RoomError("REPLAY_NOT_AVAILABLE", "Replay is available only after the match has ended.");
    const seat = room.host.profileId === profileId ? room.host : room.guest?.profileId === profileId ? room.guest : null;
    if (!seat) throw new RoomError("PROFILE_NOT_IN_ROOM", "This profile was not a player in this room.");
    const projected = projectEventsSince(room.state, seat.playerId, 0);
    let turnNumber = 0;
    let phase: string | null = null;
    const events: RoomReplayEvent[] = projected.map((event) => {
      if (event.type === "TURN_STARTED") {
        turnNumber = Number(event.data?.turnNumber ?? turnNumber);
        phase = "START";
      } else if (event.type === "PHASE_CHANGED") {
        phase = typeof event.data?.phase === "string" ? event.data.phase : phase;
      }
      const card = event.cardInstanceId ? room.state?.cards[event.cardInstanceId] : undefined;
      const definition = card ? this.definitions[card.definitionId] : undefined;
      return {
        ...structuredClone(event),
        turnNumber,
        phase,
        ...(definition ? { cardDefinitionId: definition.id, cardName: definition.name } : {})
      };
    });
    return {
      version:"4.4",
      roomId:room.id,
      matchId:room.state.matchId,
      viewerId:seat.playerId,
      mode:room.settings.mode,
      timerProfileId:room.settings.timerProfileId,
      createdAt:room.lifecycle.createdAt,
      startedAt:room.lifecycle.matchStartedAt,
      finishedAt:room.telemetry.endedAt,
      firstPlayerId:room.state.firstPlayerId,
      winnerId:room.state.winnerId,
      reason:room.state.reason,
      turns:room.state.turnNumber,
      host:{ playerId:"P1", displayName:room.host.displayName, deckId:room.host.deckId, deckName:room.host.deckName, department:room.host.department },
      guest:room.guest ? { playerId:"P2", displayName:room.guest.displayName, deckId:room.guest.deckId, deckName:room.guest.deckName, department:room.guest.department } : null,
      events,
      finalState:projectStateForViewer(room.state, seat.playerId),
      telemetry:projectRoomTelemetry(room.telemetry, this.nowFactory())
    };
  }

  connectSeat(roomId: string, token: string, clientId?: string): { playerId: PlayerId; disconnect: () => void } {
    const room = this.getRoom(roomId);
    const seat = this.resolveSeat(room, token);
    const now = this.nowFactory();
    const wasDisconnectedAt = room.lifecycle.seats[seat.playerId].disconnectedAt;
    room.connectionCounts[seat.playerId] = (room.connectionCounts[seat.playerId] ?? 0) + 1;
    const normalizedClientId = String(clientId ?? "").trim();
    if (normalizedClientId && !room.activeClientIds[seat.playerId]) room.activeClientIds[seat.playerId] = normalizedClientId;
    room.lifecycle.seats[seat.playerId].lastSeenAt = now;
    room.lifecycle.seats[seat.playerId].disconnectedAt = null;
    const isReconnect = room.telemetry.disconnects[seat.playerId] > room.telemetry.reconnects[seat.playerId];
    recordReconnect(room.telemetry, now, seat.playerId, isReconnect ? wasDisconnectedAt : null);
    clearReconnectDeadline(room.timer, seat.playerId);
    this.persist();
    this.notify(room);
    let closed = false;
    return {
      playerId: seat.playerId,
      disconnect: () => {
        if (closed) return;
        closed = true;
        const current = this.rooms.get(room.id);
        if (!current) return;
        current.connectionCounts[seat.playerId] = Math.max(0, (current.connectionCounts[seat.playerId] ?? 0) - 1);
        current.lifecycle.seats[seat.playerId].lastSeenAt = this.nowFactory();
        if (current.connectionCounts[seat.playerId] === 0) {
          const disconnectedAt = this.nowFactory();
          current.lifecycle.seats[seat.playerId].disconnectedAt = disconnectedAt;
          recordDisconnect(current.telemetry, disconnectedAt, seat.playerId);
          setReconnectDeadline(current.timer, this.effectiveTimerProfile(current.settings), seat.playerId, disconnectedAt);
        }
        this.persist();
        this.notify(current);
      }
    };
  }

  abandonRoom(roomId: string, token: string): { roomId: string; matchEnded: boolean; view: RoomClientView | null } {
    const room = this.getRoom(roomId);
    const seat = this.resolveSeat(room, token);
    if (!room.state) {
      if (room.rematchSourceRoomId) {
        const source = this.rooms.get(room.rematchSourceRoomId);
        if (source?.rematchTargetRoomId === room.id) {
          source.rematchTargetRoomId = null;
          source.roomVersion += 1;
          this.notify(source);
        }
        this.rooms.delete(room.id);
        this.persist();
        return { roomId: room.id, matchEnded: false, view: null };
      }
      if (seat.playerId !== "P1") throw new RoomError("MATCH_NOT_READY", "Only the room host can abandon a waiting room.");
      this.rooms.delete(room.id);
      this.persist();
      this.notify(room);
      return { roomId: room.id, matchEnded: false, view: null };
    }
    if (room.state.status !== "ENDED") {
      const result = this.submitIntent(room.id, token, {
        intentId: `server-abandon-${this.nowFactory()}`,
        expectedStateVersion: room.state.stateVersion,
        intent: { type: "RESIGN" }
      });
      return { roomId: room.id, matchEnded: result.response.accepted, view: result.view };
    }
    return { roomId: room.id, matchEnded: false, view: this.projectRoom(room, token, room.state.eventSeq) };
  }

  submitIntent(roomId: string, token: string, request: RoomIntentRequest): RoomIntentResult {
    const room = this.getRoom(roomId);
    const seat = this.resolveSeat(room, token);
    if (!room.state) throw new RoomError("MATCH_NOT_READY", "Match has not started yet.");
    const clientId = String(request.clientId ?? "").trim();
    const activeClientId = room.activeClientIds[seat.playerId];
    if (clientId && activeClientId && clientId !== activeClientId) throw new RoomError("SESSION_SUPERSEDED", "This match is active in another tab or browser. Take control here before making a move.");
    if (clientId && !activeClientId) room.activeClientIds[seat.playerId] = clientId;

    const cacheKey = `${seat.playerId}:${request.intentId}`;
    const cached = room.processedIntents.get(cacheKey);
    if (cached) {
      return {
        response: structuredClone(cached.response),
        view: this.projectRoom(room, token, cached.response.lastEventSeq, clientId || undefined),
        replayed: true
      };
    }

    const beforeSeq = room.state.eventSeq;
    const previousState = room.state;
    const previousTurnNumber = room.state.turnNumber;
    const previousActivePlayerId = room.state.activePlayerId;
    const hadResponseWindow = Boolean(room.state.responseWindow);
    const execution = executeHostedMatchIntent(room.state, {
      intentId: request.intentId,
      matchId: room.state.matchId,
      playerId: seat.playerId,
      expectedStateVersion: request.expectedStateVersion,
      intent: request.intent
    }, { autoAdvancePhases: room.settings.mode !== "TUTORIAL" });
    room.state = execution.state;
    const now = this.nowFactory();
    recordIntentResult(room.telemetry, now, seat.playerId, request.intent.type, execution.response.accepted, room.state.stateVersion);
    room.processedIntents.set(cacheKey, { response: structuredClone(execution.response) });
    if (execution.response.accepted) {
      room.lifecycle.seats[seat.playerId].lastSeenAt = now;
      room.lifecycle.seats[seat.playerId].lastActionAt = now;
      if (room.state.turnNumber !== previousTurnNumber || room.state.activePlayerId !== previousActivePlayerId) room.lifecycle.turnStartedAt = now;
      const hasResponseWindow = Boolean(room.state.responseWindow);
      if (!hadResponseWindow && hasResponseWindow) room.lifecycle.responseStartedAt = now;
      else if (hadResponseWindow && !hasResponseWindow) room.lifecycle.responseStartedAt = null;
      synchronizeTimerRuntime(room.timer, this.effectiveTimerProfile(room.settings), previousState, room.state, now);
      this.recordStateTransitionDiagnostics(room, previousState, room.state, now);
      synchronizeRoomTelemetry(room.telemetry, room.state, now);
      this.emitMatchCompleted(room, previousState);
      room.roomVersion += 1;
      this.persist();
      this.notify(room);
    } else {
      this.persist();
    }
    if (execution.response.accepted && this.isBotRoom(room)) this.runBot(room);
    return {
      response: execution.response,
      view: this.projectRoom(room, token, beforeSeq, clientId || undefined),
      replayed: false
    };
  }

  subscribe(roomId: string, listener: () => void): () => void {
    const room = this.getRoom(roomId);
    room.listeners.add(listener);
    return () => room.listeners.delete(listener);
  }

  hasRoom(roomId: string): boolean {
    return this.rooms.has(roomId.toUpperCase());
  }

  snapshot(): RoomStoreSnapshot {
    return {
      version: 1,
      savedAt: this.nowFactory(),
      rooms: [...this.rooms.values()].map((room) => ({
        id: room.id,
        roomVersion: room.roomVersion,
        host: structuredClone(room.host),
        guest: room.guest ? structuredClone(room.guest) : null,
        state: room.state ? structuredClone(room.state) : null,
        processedIntents: [...room.processedIntents.entries()].map(([key, cached]) => ({ key, cached: structuredClone(cached) })),
        settings: structuredClone(room.settings),
        lifecycle: structuredClone(room.lifecycle),
        timer: structuredClone(room.timer),
        telemetry: structuredClone(room.telemetry),
        rematchTargetRoomId: room.rematchTargetRoomId ?? null,
        rematchSourceRoomId: room.rematchSourceRoomId ?? null,
        rematchConfirmedSeats: structuredClone(room.rematchConfirmedSeats ?? {}),
        rematchAlternateFirstPlayer: Boolean(room.rematchAlternateFirstPlayer),
        rematchExpiresAt: room.rematchExpiresAt ?? null
      }))
    };
  }

  private restore(): void {
    const snapshot = this.persistence?.load();
    if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.rooms)) return;
    for (const saved of snapshot.rooms) {
      if (!saved?.id || !saved.host?.token || saved.host.playerId !== "P1") continue;
      const room: RoomRecord = {
        id: String(saved.id).toUpperCase(),
        roomVersion: Math.max(1, Number(saved.roomVersion ?? 1)),
        host: { ...structuredClone(saved.host), boardSkinId: saved.host.boardSkinId || DEFAULT_BOARD_SKIN_ID, cosmeticLoadout: normalizeCosmeticLoadout(saved.host.cosmeticLoadout, "P1", saved.host.boardSkinId) },
        guest: saved.guest ? { ...structuredClone(saved.guest), boardSkinId: saved.guest.boardSkinId || DEFAULT_BOARD_SKIN_ID, cosmeticLoadout: normalizeCosmeticLoadout(saved.guest.cosmeticLoadout, "P2", saved.guest.boardSkinId) } : null,
        state: saved.state ? structuredClone(saved.state) : null,
        processedIntents: new Map((saved.processedIntents ?? []).filter((entry) => entry?.key && entry.cached?.response).map((entry) => [entry.key, structuredClone(entry.cached)])),
        listeners: new Set(),
        settings: normalizeRoomSettings(saved.settings ?? {}, this.timerProfiles),
        lifecycle: this.restoreLifecycle(saved.lifecycle, Boolean(saved.state)),
        timer: createTimerRuntime(DEFAULT_TIMER_PROFILES.UNTIMED, null, this.nowFactory()),
        telemetry: createRoomTelemetry(this.nowFactory()),
        connectionCounts: { P1: 0, P2: 0 },
        activeClientIds: { P1: null, P2: null },
        rematchTargetRoomId: saved.rematchTargetRoomId ?? null,
        rematchSourceRoomId: saved.rematchSourceRoomId ?? null,
        rematchConfirmedSeats: structuredClone(saved.rematchConfirmedSeats ?? {}),
        rematchAlternateFirstPlayer: Boolean(saved.rematchAlternateFirstPlayer),
        rematchExpiresAt: saved.rematchExpiresAt ?? null
      };
      room.timer = restoreTimerRuntime(saved.timer, this.effectiveTimerProfile(room.settings), room.state, snapshot.savedAt ?? null, this.nowFactory());
      room.telemetry = restoreRoomTelemetry(saved.telemetry, room.state, snapshot.savedAt ?? null, this.nowFactory());
      clearReconnectDeadline(room.timer, "P1");
      clearReconnectDeadline(room.timer, "P2");
      this.rooms.set(room.id, room);
    }
  }

  private persist(): void {
    this.persistence?.save(this.snapshot());
  }

  private newLifecycle(): RoomLifecycleState {
    const now = this.nowFactory();
    return {
      createdAt: now,
      matchStartedAt: null,
      turnStartedAt: null,
      responseStartedAt: null,
      seats: {
        P1: { lastSeenAt: now, lastActionAt: null, disconnectedAt: now },
        P2: { lastSeenAt: null, lastActionAt: null, disconnectedAt: null }
      }
    };
  }

  private restoreLifecycle(saved: RoomLifecycleState | undefined, hasMatch: boolean): RoomLifecycleState {
    const now = this.nowFactory();
    const fallback = this.newLifecycle();
    const lifecycle = saved ? structuredClone(saved) : fallback;
    lifecycle.createdAt = Number(lifecycle.createdAt ?? now);
    lifecycle.matchStartedAt = lifecycle.matchStartedAt == null ? (hasMatch ? now : null) : Number(lifecycle.matchStartedAt);
    lifecycle.turnStartedAt = lifecycle.turnStartedAt == null ? (hasMatch ? now : null) : Number(lifecycle.turnStartedAt);
    lifecycle.responseStartedAt = lifecycle.responseStartedAt == null ? null : Number(lifecycle.responseStartedAt);
    lifecycle.seats ??= fallback.seats;
    for (const playerId of ["P1", "P2"] as PlayerId[]) {
      lifecycle.seats[playerId] ??= { lastSeenAt: null, lastActionAt: null, disconnectedAt: now };
      lifecycle.seats[playerId].disconnectedAt = now;
    }
    return lifecycle;
  }

  private deckDepartment(cards: DeckEntry[]): string {
    const counts = new Map<string, number>();
    for (const entry of cards) {
      const department = this.definitions[entry.definitionId]?.department;
      if (!department || department === "NEUTRAL") continue;
      counts.set(department, (counts.get(department) ?? 0) + entry.copies);
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return ranked[0]?.[0] ?? "NEUTRAL";
  }

  private resolveDeck(selection: DeckSelection): { id: string; name: string; department: string; cards: DeckEntry[] } {
    if (typeof selection === "string") {
      const preset = this.presets[selection];
      if (!preset) throw new RoomError("INVALID_DECK", `Unknown deck preset: ${selection}`);
      return { id: preset.id, name: preset.name, department: preset.department, cards: structuredClone(preset.cards) };
    }
    if (!selection || typeof selection.id !== "string" || !selection.id || typeof selection.name !== "string" || !Array.isArray(selection.cards)) {
      throw new RoomError("INVALID_DECK", "Custom deck payload is invalid.");
    }
    const cards = selection.cards.map((entry) => ({ definitionId: String(entry.definitionId), copies: Number(entry.copies), ...(entry.variantId ? { variantId:String(entry.variantId) } : {}) }));
    const validation = validateDeck(cards, this.definitions, ALPHA_FORMAT);
    if (!validation.valid) throw new RoomError("INVALID_DECK", validation.errors.join(" "));
    return { id: selection.id, name: selection.name.slice(0, 80) || "Custom Deck", department: this.deckDepartment(cards), cards };
  }

  private getRoom(roomId: string): RoomRecord {
    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) throw new RoomError("ROOM_NOT_FOUND", "Room not found.");
    return room;
  }

  private resolveSeat(room: RoomRecord, token: string): PersistedRoomSeat {
    if (room.host.token === token) return room.host;
    if (room.guest?.token === token) return room.guest;
    throw new RoomError("INVALID_TOKEN", "Session token is invalid for this room.");
  }

  private isBotRoom(room: RoomRecord): boolean { return Boolean(room.settings.bot && room.guest?.isBot); }

  private runBot(room: RoomRecord): void {
    if (!this.isBotRoom(room) || !room.state) return;
    for (let step = 0; step < 500 && room.state.status !== "ENDED"; step += 1) {
      const decision = chooseAuthoritativeBotIntent(room.state, "P2");
      if (!decision) break;
      const previous = room.state;
      const execution = executeHostedMatchIntent(previous, {
        intentId:`bot-${room.id}-${previous.stateVersion}-${step}`,
        matchId:previous.matchId,
        playerId:"P2",
        expectedStateVersion:previous.stateVersion,
        intent:decision.intent
      }, { autoAdvancePhases: room.settings.mode !== "TUTORIAL" });
      if (!execution.response.accepted) break;
      room.state = execution.state;
      const now = this.nowFactory();
      room.lifecycle.seats.P2.lastSeenAt = now;
      room.lifecycle.seats.P2.lastActionAt = now;
      if (room.state.turnNumber !== previous.turnNumber || room.state.activePlayerId !== previous.activePlayerId) room.lifecycle.turnStartedAt = now;
      synchronizeTimerRuntime(room.timer, this.effectiveTimerProfile(room.settings), previous, room.state, now);
      this.recordStateTransitionDiagnostics(room, previous, room.state, now);
      synchronizeRoomTelemetry(room.telemetry, room.state, now);
      this.emitMatchCompleted(room, previous);
      room.roomVersion += 1;
    }
    this.persist();
    this.notify(room);
  }

  private projectRoom(room: RoomRecord, token: string, afterEventSeq: number, clientId?: string): RoomClientView {
    const seat = this.resolveSeat(room, token);
    const status: RoomStatus = !room.state ? "WAITING" : room.state.status === "ENDED" ? "ENDED" : "ACTIVE";
    return {
      roomId: room.id,
      roomVersion: room.roomVersion,
      status,
      playerId: seat.playerId,
      hostDeckId: room.host.deckId,
      guestDeckId: room.guest?.deckId ?? null,
      hostDeckName: room.host.deckName,
      guestDeckName: room.guest?.deckName ?? null,
      hostDepartment: room.host.department,
      guestDepartment: room.guest?.department ?? null,
      hostDisplayName: room.host.displayName,
      guestDisplayName: room.guest?.displayName ?? null,
      hostBoardSkinId: room.host.boardSkinId || DEFAULT_BOARD_SKIN_ID,
      guestBoardSkinId: room.guest?.boardSkinId || (room.guest ? DEFAULT_BOARD_SKIN_ID : null),
      hostCosmeticLoadout: structuredClone(room.host.cosmeticLoadout),
      guestCosmeticLoadout: room.guest ? structuredClone(room.guest.cosmeticLoadout) : null,
      guestIsBot: Boolean(room.guest?.isBot),
      settings: structuredClone(room.settings),
      lifecycle: {
        serverNow: this.nowFactory(),
        createdAt: room.lifecycle.createdAt,
        matchStartedAt: room.lifecycle.matchStartedAt,
        turnStartedAt: room.lifecycle.turnStartedAt,
        responseStartedAt: room.lifecycle.responseStartedAt,
        presence: {
          P1: { ...structuredClone(room.lifecycle.seats.P1), status: room.connectionCounts.P1 > 0 ? "CONNECTED" : "DISCONNECTED" },
          P2: { ...structuredClone(room.lifecycle.seats.P2), status: room.connectionCounts.P2 > 0 ? "CONNECTED" : "DISCONNECTED" }
        },
        enforcement: {
          autoForfeitEnabled: room.settings.timerActive,
          afkTimeoutSeconds: null,
          reconnectGraceSeconds: room.settings.timerActive ? (this.effectiveTimerProfile(room.settings).reconnectGraceSeconds ?? null) : null
        }
      },
      timer: projectTimerRuntime(room.timer, room.state, this.nowFactory()),
      telemetry: projectRoomTelemetry(room.telemetry, this.nowFactory()),
      viewerSession: this.projectViewerSession(room, seat.playerId, clientId),
      rematchAvailable: Boolean(room.rematchTargetRoomId && this.rooms.has(room.rematchTargetRoomId)),
      rematchSourceRoomId: room.rematchSourceRoomId ?? null,
      rematchConfirmedByViewer: Boolean(room.rematchConfirmedSeats?.[seat.playerId]),
      rematchConfirmedByOpponent: Boolean(room.rematchConfirmedSeats?.[seat.playerId === "P1" ? "P2" : "P1"]),
      rematchExpiresAt: room.rematchExpiresAt ?? null,
      match: room.state ? projectStateForViewer(room.state, seat.playerId) : null,
      events: room.state ? projectEventsSince(room.state, seat.playerId, afterEventSeq) : []
    };
  }

  private projectViewerSession(room: RoomRecord, playerId: PlayerId, clientId?: string): RoomViewerSessionView {
    const normalized = String(clientId ?? "").trim();
    if (!normalized) return { protectionEnabled:false, isPrimary:true, activeElsewhere:false, connectionCount:room.connectionCounts[playerId] ?? 0 };
    const active = room.activeClientIds[playerId];
    return {
      protectionEnabled:true,
      isPrimary: !active || active === normalized,
      activeElsewhere: Boolean(active && active !== normalized),
      connectionCount: room.connectionCounts[playerId] ?? 0
    };
  }

  tickTimers(): Array<{ roomId: string; type: "AUTO_PASS" | "TURN_TIMEOUT" | "DECISION_TIMEOUT" | "RECONNECT_TIMEOUT"; playerId: PlayerId }> {
    const now = this.nowFactory();
    const actions: Array<{ roomId: string; type: "AUTO_PASS" | "TURN_TIMEOUT" | "DECISION_TIMEOUT" | "RECONNECT_TIMEOUT"; playerId: PlayerId }> = [];
    let rematchCleanup = false;
    for (const room of [...this.rooms.values()]) {
      if (room.state || !room.rematchSourceRoomId || !room.rematchExpiresAt || now < room.rematchExpiresAt) continue;
      const source = this.rooms.get(room.rematchSourceRoomId);
      if (source?.rematchTargetRoomId === room.id) {
        source.rematchTargetRoomId = null;
        source.roomVersion += 1;
        this.notify(source);
      }
      this.rooms.delete(room.id);
      rematchCleanup = true;
    }
    if (rematchCleanup) this.persist();
    for (const room of this.rooms.values()) {
      if (!room.settings.timerActive || !room.timer.active || !room.state || room.state.status === "ENDED") continue;

      let endedByReconnect = false;
      for (const playerId of ["P1", "P2"] as PlayerId[]) {
        const deadline = room.timer.reconnectDeadlineAt[playerId];
        const otherId: PlayerId = playerId === "P1" ? "P2" : "P1";
        if (deadline !== null && deadline <= now && room.connectionCounts[playerId] === 0 && room.connectionCounts[otherId] > 0) {
          this.forfeitRoom(room, playerId, "RECONNECT_TIMEOUT", now);
          actions.push({ roomId:room.id, type:"RECONNECT_TIMEOUT", playerId });
          endedByReconnect = true;
          break;
        }
      }
      if (endedByReconnect || !room.state) continue;

      const expired = clockIsExpired(room.timer, room.state, now);
      if (!expired) continue;
      if (expired.kind === "RESPONSE") {
        if (this.submitSystemIntent(room, expired.playerId, { type:"PASS_PRIORITY" }, now)) actions.push({ roomId:room.id, type:"AUTO_PASS", playerId:expired.playerId });
      } else if (expired.kind === "DECISION") {
        this.forfeitRoom(room, expired.playerId, "DECISION_TIMEOUT", now);
        actions.push({ roomId:room.id, type:"DECISION_TIMEOUT", playerId:expired.playerId });
      } else {
        this.forfeitRoom(room, expired.playerId, "TURN_TIMEOUT", now);
        actions.push({ roomId:room.id, type:"TURN_TIMEOUT", playerId:expired.playerId });
      }
    }
    return actions;
  }

  checkpointTimers(): boolean {
    this.tickTimers();
    const now = this.nowFactory();
    let changed = false;
    for (const room of this.rooms.values()) {
      if (!room.settings.timerActive || !room.timer.active || !room.state || room.state.status === "ENDED") continue;
      consumeRunningClock(room.timer, now);
      changed = true;
    }
    if (changed) this.persist();
    return changed;
  }

  private effectiveTimerProfile(settings: RoomMatchSettings): TimerProfileConfig {
    const configured = this.timerProfiles[settings.timerProfileId] ?? DEFAULT_TIMER_PROFILES[settings.mode === "RANKED" ? "RANKED_STANDARD_TBD" : "UNTIMED"];
    return { ...structuredClone(configured), enabled: Boolean(settings.timerActive && configured.enabled) };
  }

  private submitSystemIntent(room: RoomRecord, playerId: PlayerId, intent: MatchIntent, now: number): boolean {
    if (!room.state || room.state.status === "ENDED") return false;
    const previousState = room.state;
    const hadResponseWindow = Boolean(previousState.responseWindow);
    const previousTurnNumber = previousState.turnNumber;
    const previousActivePlayerId = previousState.activePlayerId;
    const execution = executeMatchIntent(previousState, {
      intentId: `server-timer-${room.id}-${previousState.stateVersion}-${now}`,
      matchId: previousState.matchId,
      playerId,
      expectedStateVersion: previousState.stateVersion,
      intent
    });
    if (!execution.response.accepted) return false;
    room.state = execution.state;
    if (room.state.turnNumber !== previousTurnNumber || room.state.activePlayerId !== previousActivePlayerId) room.lifecycle.turnStartedAt = now;
    const hasResponseWindow = Boolean(room.state.responseWindow);
    if (!hadResponseWindow && hasResponseWindow) room.lifecycle.responseStartedAt = now;
    else if (hadResponseWindow && !hasResponseWindow) room.lifecycle.responseStartedAt = null;
    else if (hadResponseWindow && hasResponseWindow && previousState.priorityPlayerId !== room.state.priorityPlayerId) room.lifecycle.responseStartedAt = now;
    synchronizeTimerRuntime(room.timer, this.effectiveTimerProfile(room.settings), previousState, room.state, now);
    addDiagnostic(room.telemetry, now, "TIMER_AUTO_PASS", playerId, { stateVersion: room.state.stateVersion });
    this.recordStateTransitionDiagnostics(room, previousState, room.state, now);
    synchronizeRoomTelemetry(room.telemetry, room.state, now);
    this.emitMatchCompleted(room, previousState);
    room.roomVersion += 1;
    this.persist();
    this.notify(room);
    return true;
  }

  private forfeitRoom(room: RoomRecord, playerId: PlayerId, reason: "TURN_TIMEOUT" | "DECISION_TIMEOUT" | "RECONNECT_TIMEOUT", now: number): void {
    if (!room.state || room.state.status === "ENDED") return;
    const previousState = room.state;
    const draft = structuredClone(previousState);
    resign(draft, playerId, reason);
    draft.stateVersion = previousState.stateVersion + 1;
    room.state = draft;
    room.lifecycle.seats[playerId].lastSeenAt = room.lifecycle.seats[playerId].lastSeenAt ?? now;
    synchronizeTimerRuntime(room.timer, this.effectiveTimerProfile(room.settings), previousState, room.state, now);
    addDiagnostic(room.telemetry, now, "TIMEOUT", playerId, { reason });
    this.recordStateTransitionDiagnostics(room, previousState, room.state, now);
    synchronizeRoomTelemetry(room.telemetry, room.state, now);
    this.emitMatchCompleted(room, previousState);
    clearReconnectDeadline(room.timer, "P1");
    clearReconnectDeadline(room.timer, "P2");
    room.roomVersion += 1;
    this.persist();
    this.notify(room);
  }

  private recordStateTransitionDiagnostics(room: RoomRecord, previousState: GameState, state: GameState, now: number): void {
    if (state.turnNumber !== previousState.turnNumber || state.activePlayerId !== previousState.activePlayerId) {
      addDiagnostic(room.telemetry, now, "TURN_STARTED", state.activePlayerId, { turnNumber: state.turnNumber });
    }
    const hadResponse = Boolean(previousState.responseWindow);
    const hasResponse = Boolean(state.responseWindow);
    if (!hadResponse && hasResponse) addDiagnostic(room.telemetry, now, "RESPONSE_OPENED", state.priorityPlayerId ?? undefined, { event: state.responseWindow?.event ?? null });
    else if (hadResponse && !hasResponse) addDiagnostic(room.telemetry, now, "RESPONSE_CLOSED", previousState.priorityPlayerId ?? undefined);
    if (previousState.status !== "ENDED" && state.status === "ENDED") {
      addDiagnostic(room.telemetry, now, "MATCH_ENDED", state.winnerId ?? undefined, { reason: state.reason ?? null, turnNumber: state.turnNumber });
    }
  }

  private emitMatchCompleted(room: RoomRecord, previousState: GameState): void {
    if (!this.onMatchCompleted || previousState.status === "ENDED" || !room.state || room.state.status !== "ENDED" || !room.guest) return;
    this.onMatchCompleted({
      roomId: room.id,
      matchId: room.state.matchId,
      mode: room.settings.mode,
      winnerPlayerId: room.state.winnerId,
      reason: String(room.state.reason ?? "UNKNOWN"),
      endedAt: room.telemetry.endedAt,
      seats: {
        P1: { profileId: room.host.profileId, displayName: room.host.displayName, deckName: room.host.deckName },
        P2: { profileId: room.guest.profileId, displayName: room.guest.displayName, deckName: room.guest.deckName }
      }
    });
  }

  private notify(room: RoomRecord): void {
    for (const listener of room.listeners) listener();
  }
}
