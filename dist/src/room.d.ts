import { alphaDefinitions } from "./cards.js";
import { type DeckPreset } from "./decks.js";
import { type RoomTimerRuntime, type RoomTimerView, type TimerProfileConfig } from "./timers.js";
import type { PlaytestMatchRecord } from "./playtest-analytics.js";
import { type RoomTelemetryState, type RoomTelemetryView } from "./telemetry.js";
import type { ClientEvent, ClientGameState, DeckEntry, GameState, MatchCommandResponse, MatchIntent, PlayerId } from "./types.js";
import type { SnapshotPersistence } from "./storage.js";
export type RoomStatus = "WAITING" | "ACTIVE" | "ENDED";
export type RoomSeatConnectionStatus = "CONNECTED" | "DISCONNECTED";
export type RoomMatchMode = "FRIENDLY" | "RANKED";
export interface RoomMatchSettings {
    mode: RoomMatchMode;
    timerProfileId: string;
    timerActive: boolean;
    /** Rated ladder updates are allowed only for server-created Ranked Quick Match rooms. */
    ratingActive?: boolean;
}
export interface RoomSettingsSelection {
    mode?: RoomMatchMode | string;
    timerProfileId?: string;
    ratingActive?: boolean;
}
export interface RoomSeatIdentity {
    profileId?: string | null;
    displayName?: string | null;
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
export type RoomErrorCode = "ROOM_NOT_FOUND" | "ROOM_FULL" | "INVALID_TOKEN" | "INVALID_DECK" | "MATCH_NOT_READY" | "REPLAY_NOT_AVAILABLE" | "PROFILE_NOT_IN_ROOM" | "SESSION_SUPERSEDED" | "REMATCH_NOT_READY" | "RATED_REMATCH_DISABLED";
export declare class RoomError extends Error {
    readonly code: RoomErrorCode;
    constructor(code: RoomErrorCode, message: string);
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
    cards: DeckEntry[];
}
export interface PersistedCachedIntent {
    response: MatchCommandResponse;
}
export interface PersistedRoomRecord {
    id: string;
    roomVersion: number;
    host: PersistedRoomSeat;
    guest: PersistedRoomSeat | null;
    state: GameState | null;
    processedIntents: Array<{
        key: string;
        cached: PersistedCachedIntent;
    }>;
    settings: RoomMatchSettings;
    lifecycle?: RoomLifecycleState;
    timer?: RoomTimerRuntime;
    telemetry?: RoomTelemetryState;
    rematchTargetRoomId?: string | null;
}
export interface RoomStoreSnapshot {
    version: 1;
    savedAt?: number;
    rooms: PersistedRoomRecord[];
}
export interface RoomPersistence extends SnapshotPersistence<RoomStoreSnapshot> {
}
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
    settings: RoomMatchSettings;
    lifecycle: RoomLifecycleView;
    timer: RoomTimerView;
    telemetry: RoomTelemetryView;
    viewerSession: RoomViewerSessionView;
    rematchAvailable: boolean;
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
    host: {
        playerId: "P1";
        displayName: string | null;
        deckId: string;
        deckName: string;
        department: string;
    };
    guest: {
        playerId: "P2";
        displayName: string | null;
        deckId: string;
        deckName: string;
        department: string;
    } | null;
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
}
export declare class RoomService {
    private readonly rooms;
    private readonly definitions;
    private readonly presets;
    private readonly roomIdFactory;
    private readonly tokenFactory;
    private readonly seedFactory;
    private readonly firstPlayerFactory;
    private readonly nowFactory;
    private readonly persistence;
    private readonly timerProfiles;
    constructor(options?: RoomServiceOptions);
    get storageLabel(): string;
    listPresets(): Array<Pick<DeckPreset, "id" | "name" | "department" | "description" | "cards">>;
    listFinishedRankedResults(): FinishedRankedRoomResult[];
    private playtestCardActivity;
    listPlaytestRecords(): PlaytestMatchRecord[];
    createRoom(deckSelection: DeckSelection, settingsSelection?: RoomSettingsSelection, identity?: RoomSeatIdentity): CreateRoomResult;
    joinRoom(roomId: string, deckSelection: DeckSelection, identity?: RoomSeatIdentity): JoinRoomResult;
    rematchRoom(roomId: string, token: string, options?: {
        alternateFirstPlayer?: boolean;
    }): RematchRoomResult;
    getView(roomId: string, token: string, afterEventSeq?: number, clientId?: string): RoomClientView;
    claimSeatClient(roomId: string, token: string, clientId: string): RoomClientView;
    getSeatIdentity(roomId: string, token: string): {
        playerId: PlayerId;
        profileId: string | null;
        displayName: string | null;
    };
    getReplayForProfile(roomId: string, profileId: string): RoomReplayView;
    connectSeat(roomId: string, token: string, clientId?: string): {
        playerId: PlayerId;
        disconnect: () => void;
    };
    abandonRoom(roomId: string, token: string): {
        roomId: string;
        matchEnded: boolean;
        view: RoomClientView | null;
    };
    submitIntent(roomId: string, token: string, request: RoomIntentRequest): RoomIntentResult;
    subscribe(roomId: string, listener: () => void): () => void;
    hasRoom(roomId: string): boolean;
    snapshot(): RoomStoreSnapshot;
    private restore;
    private persist;
    private newLifecycle;
    private restoreLifecycle;
    private deckDepartment;
    private resolveDeck;
    private getRoom;
    private resolveSeat;
    private projectRoom;
    private projectViewerSession;
    tickTimers(): Array<{
        roomId: string;
        type: "AUTO_PASS" | "TURN_TIMEOUT" | "DECISION_TIMEOUT" | "RECONNECT_TIMEOUT";
        playerId: PlayerId;
    }>;
    checkpointTimers(): boolean;
    private effectiveTimerProfile;
    private submitSystemIntent;
    private forfeitRoom;
    private recordStateTransitionDiagnostics;
    private notify;
}
