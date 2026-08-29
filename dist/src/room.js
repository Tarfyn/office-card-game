import { alphaDefinitions } from "./cards.js";
import { alphaDeckPresets } from "./decks.js";
import { createMatch, resign, validateDeck } from "./engine.js";
import { ALPHA_FORMAT } from "./formats.js";
import { executeMatchIntent } from "./intents.js";
import { projectEventsSince, projectStateForViewer } from "./projection.js";
import { clearReconnectDeadline, clockIsExpired, consumeRunningClock, createTimerRuntime, projectTimerRuntime, restoreTimerRuntime, setReconnectDeadline, synchronizeTimerRuntime, timerProfileIsRunnable, timerProfilesById } from "./timers.js";
import { addDiagnostic, createRoomTelemetry, projectRoomTelemetry, recordDisconnect, recordIntentResult, recordReconnect, restoreRoomTelemetry, synchronizeRoomTelemetry } from "./telemetry.js";
export class RoomError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "RoomError";
    }
}
function defaultRoomId() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
}
function defaultToken() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
const DEFAULT_TIMER_PROFILES = {
    UNTIMED: { id: "UNTIMED", enabled: false, turnSeconds: null, responseSeconds: null, timeBankSeconds: null, reconnectGraceSeconds: null },
    RANKED_STANDARD_TBD: { id: "RANKED_STANDARD_TBD", enabled: false, turnSeconds: null, responseSeconds: null, timeBankSeconds: null, reconnectGraceSeconds: null, status: "TUNING_REQUIRED" }
};
function normalizeRoomSettings(selection = {}, timerProfiles = DEFAULT_TIMER_PROFILES) {
    const mode = selection.mode === "RANKED" ? "RANKED" : "FRIENDLY";
    const fallbackProfileId = mode === "RANKED" ? "RANKED_STANDARD_TBD" : "UNTIMED";
    const requested = typeof selection.timerProfileId === "string" && timerProfiles[selection.timerProfileId] ? selection.timerProfileId : fallbackProfileId;
    const profile = timerProfiles[requested] ?? DEFAULT_TIMER_PROFILES[fallbackProfileId];
    const base = { mode, timerProfileId: requested, timerActive: timerProfileIsRunnable(profile) };
    return mode === "RANKED" && selection.ratingActive === true ? { ...base, ratingActive: true } : base;
}
export class RoomService {
    rooms = new Map();
    definitions;
    presets;
    roomIdFactory;
    tokenFactory;
    seedFactory;
    firstPlayerFactory;
    nowFactory;
    persistence;
    timerProfiles;
    constructor(options = {}) {
        this.definitions = options.definitions ?? alphaDefinitions;
        this.presets = options.presets ?? alphaDeckPresets;
        this.roomIdFactory = options.roomIdFactory ?? defaultRoomId;
        this.tokenFactory = options.tokenFactory ?? defaultToken;
        this.seedFactory = options.seedFactory ?? (() => Math.floor(Math.random() * 0x7fffffff));
        this.firstPlayerFactory = options.firstPlayerFactory ?? (() => Math.random() < 0.5 ? "P1" : "P2");
        this.nowFactory = options.nowFactory ?? (() => Date.now());
        this.persistence = options.persistence ?? null;
        this.timerProfiles = { ...DEFAULT_TIMER_PROFILES, ...timerProfilesById(options.timerProfiles) };
        this.restore();
    }
    get storageLabel() {
        return this.persistence?.storageLabel ?? "MEMORY_ONLY";
    }
    listPresets() {
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
    listFinishedRankedResults() {
        const results = [];
        for (const room of this.rooms.values()) {
            if (room.settings.mode !== "RANKED" || !room.settings.ratingActive || !room.state || room.state.status !== "ENDED" || !room.guest)
                continue;
            if (!room.host.profileId || !room.guest.profileId)
                continue;
            const winnerProfileId = room.state.winnerId === "P1" ? room.host.profileId : room.state.winnerId === "P2" ? room.guest.profileId : null;
            results.push({
                roomId: room.id,
                matchId: room.state.matchId,
                p1ProfileId: room.host.profileId,
                p2ProfileId: room.guest.profileId,
                winnerProfileId,
                winnerPlayerId: room.state.winnerId,
                reason: String(room.state.reason ?? "UNKNOWN"),
                endedAt: room.telemetry.endedAt
            });
        }
        return results;
    }
    playtestCardActivity(state) {
        if (!state)
            return [];
        const observedTypes = new Set(["CARD_DRAWN", "CARD_PLAYED", "INCIDENT_SET", "INCIDENT_ACTIVATED", "ABILITY_ACTIVATED", "ATTACK_DECLARED", "CARD_REVEALED"]);
        const rows = new Map();
        for (const event of state.eventLog) {
            const instanceId = event.cardInstanceId;
            if (!instanceId)
                continue;
            const card = state.cards[instanceId];
            if (!card)
                continue;
            const def = state.definitions[card.definitionId];
            if (!def)
                continue;
            const playerId = (event.playerId ?? card.controllerId);
            const key = `${playerId}:${def.id}`;
            const row = rows.get(key) ?? { definitionId: def.id, name: def.name, department: def.department, playerId, observed: new Set(), played: new Set(), draws: 0, plays: 0, activations: 0, attacks: 0 };
            if (observedTypes.has(event.type))
                row.observed.add(instanceId);
            if (event.type === "CARD_DRAWN")
                row.draws += 1;
            if (event.type === "CARD_PLAYED" || event.type === "INCIDENT_SET") {
                row.plays += 1;
                row.played.add(instanceId);
            }
            if (event.type === "INCIDENT_ACTIVATED" || event.type === "ABILITY_ACTIVATED")
                row.activations += 1;
            if (event.type === "ATTACK_DECLARED")
                row.attacks += 1;
            rows.set(key, row);
        }
        return [...rows.values()].map((row) => ({ definitionId: row.definitionId, name: row.name, department: row.department, playerId: row.playerId, observedInstances: row.observed.size, playedInstances: row.played.size, draws: row.draws, plays: row.plays, activations: row.activations, attacks: row.attacks }));
    }
    listPlaytestRecords() {
        const now = this.nowFactory();
        return [...this.rooms.values()].map((room) => {
            const status = !room.state ? "WAITING" : room.state.status === "ENDED" ? "ENDED" : "ACTIVE";
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
    createRoom(deckSelection, settingsSelection = {}, identity = {}) {
        const deck = this.resolveDeck(deckSelection);
        const settings = normalizeRoomSettings(settingsSelection, this.timerProfiles);
        let roomId = this.roomIdFactory().toUpperCase();
        let attempts = 0;
        while (this.rooms.has(roomId)) {
            if (++attempts > 20)
                throw new Error("Unable to allocate unique room id.");
            roomId = this.roomIdFactory().toUpperCase();
        }
        const token = this.tokenFactory();
        const room = {
            id: roomId,
            roomVersion: 1,
            host: { playerId: "P1", token, profileId: identity.profileId ?? null, displayName: identity.displayName ?? null, deckId: deck.id, deckName: deck.name, department: deck.department, cards: deck.cards },
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
            rematchTargetRoomId: null
        };
        this.rooms.set(roomId, room);
        this.persist();
        return { roomId, token, playerId: "P1", view: this.projectRoom(room, token, 0) };
    }
    joinRoom(roomId, deckSelection, identity = {}) {
        const deck = this.resolveDeck(deckSelection);
        const room = this.getRoom(roomId);
        if (room.guest)
            throw new RoomError("ROOM_FULL", "Room already has two players.");
        const token = this.tokenFactory();
        room.guest = { playerId: "P2", token, profileId: identity.profileId ?? null, displayName: identity.displayName ?? null, deckId: deck.id, deckName: deck.name, department: deck.department, cards: deck.cards };
        room.state = createMatch({
            matchId: `match-${room.id}`,
            seed: this.seedFactory(),
            firstPlayerId: this.firstPlayerFactory(),
            definitions: this.definitions,
            p1Deck: room.host.cards,
            p2Deck: deck.cards,
            format: ALPHA_FORMAT
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
    rematchRoom(roomId, token, options = {}) {
        const source = this.getRoom(roomId);
        const sourceSeat = this.resolveSeat(source, token);
        if (!source.state || source.state.status !== "ENDED" || !source.guest)
            throw new RoomError("REMATCH_NOT_READY", "Rematch is available only after a completed two-player match.");
        if (source.settings.ratingActive)
            throw new RoomError("RATED_REMATCH_DISABLED", "Rated Ranked matches must return to matchmaking for another rated opponent.");
        if (source.rematchTargetRoomId && this.rooms.has(source.rematchTargetRoomId)) {
            const existing = this.getRoom(source.rematchTargetRoomId);
            const seat = sourceSeat.playerId === "P1" ? existing.host : existing.guest;
            if (!seat)
                throw new RoomError("REMATCH_NOT_READY", "Rematch seat is not available.");
            return { roomId: existing.id, token: seat.token, playerId: seat.playerId, view: this.projectRoom(existing, seat.token, 0), created: false, alternateFirstPlayer: existing.state?.firstPlayerId !== source.state.firstPlayerId };
        }
        let nextRoomId = this.roomIdFactory().toUpperCase();
        let attempts = 0;
        while (this.rooms.has(nextRoomId)) {
            if (++attempts > 20)
                throw new Error("Unable to allocate unique rematch room id.");
            nextRoomId = this.roomIdFactory().toUpperCase();
        }
        const p1Token = this.tokenFactory();
        const p2Token = this.tokenFactory();
        const alternateFirstPlayer = options.alternateFirstPlayer === true;
        const firstPlayerId = alternateFirstPlayer ? (source.state.firstPlayerId === "P1" ? "P2" : "P1") : source.state.firstPlayerId;
        const now = this.nowFactory();
        const lifecycle = this.newLifecycle();
        const settings = structuredClone(source.settings);
        const state = createMatch({
            matchId: `match-${nextRoomId}`, seed: this.seedFactory(), firstPlayerId, definitions: this.definitions,
            p1Deck: source.host.cards, p2Deck: source.guest.cards, format: ALPHA_FORMAT
        });
        lifecycle.matchStartedAt = now;
        lifecycle.turnStartedAt = now;
        lifecycle.responseStartedAt = state.responseWindow ? now : null;
        const timer = createTimerRuntime(this.effectiveTimerProfile(settings), null, now);
        synchronizeTimerRuntime(timer, this.effectiveTimerProfile(settings), null, state, now);
        const telemetry = createRoomTelemetry(now);
        synchronizeRoomTelemetry(telemetry, state, now);
        addDiagnostic(telemetry, now, "MATCH_STARTED", undefined, { firstPlayerId, rematchOf: source.id });
        const room = {
            id: nextRoomId, roomVersion: 1,
            host: { ...structuredClone(source.host), token: p1Token },
            guest: { ...structuredClone(source.guest), token: p2Token },
            state, processedIntents: new Map(), listeners: new Set(), settings, lifecycle, timer, telemetry,
            connectionCounts: { P1: 0, P2: 0 }, activeClientIds: { P1: null, P2: null }, rematchTargetRoomId: null
        };
        this.rooms.set(nextRoomId, room);
        source.rematchTargetRoomId = nextRoomId;
        source.roomVersion += 1;
        this.persist();
        this.notify(source);
        const seat = sourceSeat.playerId === "P1" ? room.host : room.guest;
        return { roomId: room.id, token: seat.token, playerId: seat.playerId, view: this.projectRoom(room, seat.token, 0), created: true, alternateFirstPlayer };
    }
    getView(roomId, token, afterEventSeq = 0, clientId) {
        return this.projectRoom(this.getRoom(roomId), token, afterEventSeq, clientId);
    }
    claimSeatClient(roomId, token, clientId) {
        const room = this.getRoom(roomId);
        const seat = this.resolveSeat(room, token);
        const normalized = String(clientId ?? "").trim();
        if (normalized.length < 8 || normalized.length > 160)
            throw new RoomError("SESSION_SUPERSEDED", "This browser session could not be verified.");
        room.activeClientIds[seat.playerId] = normalized;
        room.roomVersion += 1;
        this.notify(room);
        return this.projectRoom(room, token, room.state?.eventSeq ?? 0, normalized);
    }
    getSeatIdentity(roomId, token) {
        const seat = this.resolveSeat(this.getRoom(roomId), token);
        return { playerId: seat.playerId, profileId: seat.profileId, displayName: seat.displayName };
    }
    getReplayForProfile(roomId, profileId) {
        const room = this.getRoom(roomId);
        if (!room.state || room.state.status !== "ENDED")
            throw new RoomError("REPLAY_NOT_AVAILABLE", "Replay is available only after the match has ended.");
        const seat = room.host.profileId === profileId ? room.host : room.guest?.profileId === profileId ? room.guest : null;
        if (!seat)
            throw new RoomError("PROFILE_NOT_IN_ROOM", "This profile was not a player in this room.");
        const projected = projectEventsSince(room.state, seat.playerId, 0);
        let turnNumber = 0;
        let phase = null;
        const events = projected.map((event) => {
            if (event.type === "TURN_STARTED") {
                turnNumber = Number(event.data?.turnNumber ?? turnNumber);
                phase = "START";
            }
            else if (event.type === "PHASE_CHANGED") {
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
            version: "4.4",
            roomId: room.id,
            matchId: room.state.matchId,
            viewerId: seat.playerId,
            mode: room.settings.mode,
            timerProfileId: room.settings.timerProfileId,
            createdAt: room.lifecycle.createdAt,
            startedAt: room.lifecycle.matchStartedAt,
            finishedAt: room.telemetry.endedAt,
            firstPlayerId: room.state.firstPlayerId,
            winnerId: room.state.winnerId,
            reason: room.state.reason,
            turns: room.state.turnNumber,
            host: { playerId: "P1", displayName: room.host.displayName, deckId: room.host.deckId, deckName: room.host.deckName, department: room.host.department },
            guest: room.guest ? { playerId: "P2", displayName: room.guest.displayName, deckId: room.guest.deckId, deckName: room.guest.deckName, department: room.guest.department } : null,
            events,
            finalState: projectStateForViewer(room.state, seat.playerId),
            telemetry: projectRoomTelemetry(room.telemetry, this.nowFactory())
        };
    }
    connectSeat(roomId, token, clientId) {
        const room = this.getRoom(roomId);
        const seat = this.resolveSeat(room, token);
        const now = this.nowFactory();
        const wasDisconnectedAt = room.lifecycle.seats[seat.playerId].disconnectedAt;
        room.connectionCounts[seat.playerId] = (room.connectionCounts[seat.playerId] ?? 0) + 1;
        const normalizedClientId = String(clientId ?? "").trim();
        if (normalizedClientId && !room.activeClientIds[seat.playerId])
            room.activeClientIds[seat.playerId] = normalizedClientId;
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
                if (closed)
                    return;
                closed = true;
                const current = this.rooms.get(room.id);
                if (!current)
                    return;
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
    abandonRoom(roomId, token) {
        const room = this.getRoom(roomId);
        const seat = this.resolveSeat(room, token);
        if (!room.state) {
            if (seat.playerId !== "P1")
                throw new RoomError("MATCH_NOT_READY", "Only the room host can abandon a waiting room.");
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
    submitIntent(roomId, token, request) {
        const room = this.getRoom(roomId);
        const seat = this.resolveSeat(room, token);
        if (!room.state)
            throw new RoomError("MATCH_NOT_READY", "Match has not started yet.");
        const clientId = String(request.clientId ?? "").trim();
        const activeClientId = room.activeClientIds[seat.playerId];
        if (clientId && activeClientId && clientId !== activeClientId)
            throw new RoomError("SESSION_SUPERSEDED", "This match is active in another tab or browser. Take control here before making a move.");
        if (clientId && !activeClientId)
            room.activeClientIds[seat.playerId] = clientId;
        const cacheKey = `${seat.playerId}:${request.intentId}`;
        const cached = room.processedIntents.get(cacheKey);
        if (cached) {
            return {
                response: structuredClone(cached.response),
                view: this.projectRoom(room, token, cached.response.lastEventSeq),
                replayed: true
            };
        }
        const beforeSeq = room.state.eventSeq;
        const previousState = room.state;
        const previousTurnNumber = room.state.turnNumber;
        const previousActivePlayerId = room.state.activePlayerId;
        const hadResponseWindow = Boolean(room.state.responseWindow);
        const execution = executeMatchIntent(room.state, {
            intentId: request.intentId,
            matchId: room.state.matchId,
            playerId: seat.playerId,
            expectedStateVersion: request.expectedStateVersion,
            intent: request.intent
        });
        room.state = execution.state;
        const now = this.nowFactory();
        recordIntentResult(room.telemetry, now, seat.playerId, request.intent.type, execution.response.accepted, room.state.stateVersion);
        room.processedIntents.set(cacheKey, { response: structuredClone(execution.response) });
        if (execution.response.accepted) {
            room.lifecycle.seats[seat.playerId].lastSeenAt = now;
            room.lifecycle.seats[seat.playerId].lastActionAt = now;
            if (room.state.turnNumber !== previousTurnNumber || room.state.activePlayerId !== previousActivePlayerId)
                room.lifecycle.turnStartedAt = now;
            const hasResponseWindow = Boolean(room.state.responseWindow);
            if (!hadResponseWindow && hasResponseWindow)
                room.lifecycle.responseStartedAt = now;
            else if (hadResponseWindow && !hasResponseWindow)
                room.lifecycle.responseStartedAt = null;
            synchronizeTimerRuntime(room.timer, this.effectiveTimerProfile(room.settings), previousState, room.state, now);
            this.recordStateTransitionDiagnostics(room, previousState, room.state, now);
            synchronizeRoomTelemetry(room.telemetry, room.state, now);
            room.roomVersion += 1;
            this.persist();
            this.notify(room);
        }
        else {
            this.persist();
        }
        return {
            response: execution.response,
            view: this.projectRoom(room, token, beforeSeq),
            replayed: false
        };
    }
    subscribe(roomId, listener) {
        const room = this.getRoom(roomId);
        room.listeners.add(listener);
        return () => room.listeners.delete(listener);
    }
    hasRoom(roomId) {
        return this.rooms.has(roomId.toUpperCase());
    }
    snapshot() {
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
                rematchTargetRoomId: room.rematchTargetRoomId ?? null
            }))
        };
    }
    restore() {
        const snapshot = this.persistence?.load();
        if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.rooms))
            return;
        for (const saved of snapshot.rooms) {
            if (!saved?.id || !saved.host?.token || saved.host.playerId !== "P1")
                continue;
            const room = {
                id: String(saved.id).toUpperCase(),
                roomVersion: Math.max(1, Number(saved.roomVersion ?? 1)),
                host: structuredClone(saved.host),
                guest: saved.guest ? structuredClone(saved.guest) : null,
                state: saved.state ? structuredClone(saved.state) : null,
                processedIntents: new Map((saved.processedIntents ?? []).filter((entry) => entry?.key && entry.cached?.response).map((entry) => [entry.key, structuredClone(entry.cached)])),
                listeners: new Set(),
                settings: normalizeRoomSettings(saved.settings ?? {}, this.timerProfiles),
                lifecycle: this.restoreLifecycle(saved.lifecycle, Boolean(saved.state)),
                timer: createTimerRuntime(DEFAULT_TIMER_PROFILES.UNTIMED, null, this.nowFactory()),
                telemetry: createRoomTelemetry(this.nowFactory()),
                connectionCounts: { P1: 0, P2: 0 },
                activeClientIds: { P1: null, P2: null },
                rematchTargetRoomId: saved.rematchTargetRoomId ?? null
            };
            room.timer = restoreTimerRuntime(saved.timer, this.effectiveTimerProfile(room.settings), room.state, snapshot.savedAt ?? null, this.nowFactory());
            room.telemetry = restoreRoomTelemetry(saved.telemetry, room.state, snapshot.savedAt ?? null, this.nowFactory());
            clearReconnectDeadline(room.timer, "P1");
            clearReconnectDeadline(room.timer, "P2");
            this.rooms.set(room.id, room);
        }
    }
    persist() {
        this.persistence?.save(this.snapshot());
    }
    newLifecycle() {
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
    restoreLifecycle(saved, hasMatch) {
        const now = this.nowFactory();
        const fallback = this.newLifecycle();
        const lifecycle = saved ? structuredClone(saved) : fallback;
        lifecycle.createdAt = Number(lifecycle.createdAt ?? now);
        lifecycle.matchStartedAt = lifecycle.matchStartedAt == null ? (hasMatch ? now : null) : Number(lifecycle.matchStartedAt);
        lifecycle.turnStartedAt = lifecycle.turnStartedAt == null ? (hasMatch ? now : null) : Number(lifecycle.turnStartedAt);
        lifecycle.responseStartedAt = lifecycle.responseStartedAt == null ? null : Number(lifecycle.responseStartedAt);
        lifecycle.seats ??= fallback.seats;
        for (const playerId of ["P1", "P2"]) {
            lifecycle.seats[playerId] ??= { lastSeenAt: null, lastActionAt: null, disconnectedAt: now };
            lifecycle.seats[playerId].disconnectedAt = now;
        }
        return lifecycle;
    }
    deckDepartment(cards) {
        const counts = new Map();
        for (const entry of cards) {
            const department = this.definitions[entry.definitionId]?.department;
            if (!department || department === "NEUTRAL")
                continue;
            counts.set(department, (counts.get(department) ?? 0) + entry.copies);
        }
        const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        return ranked[0]?.[0] ?? "NEUTRAL";
    }
    resolveDeck(selection) {
        if (typeof selection === "string") {
            const preset = this.presets[selection];
            if (!preset)
                throw new RoomError("INVALID_DECK", `Unknown deck preset: ${selection}`);
            return { id: preset.id, name: preset.name, department: preset.department, cards: structuredClone(preset.cards) };
        }
        if (!selection || typeof selection.id !== "string" || !selection.id || typeof selection.name !== "string" || !Array.isArray(selection.cards)) {
            throw new RoomError("INVALID_DECK", "Custom deck payload is invalid.");
        }
        const cards = selection.cards.map((entry) => ({ definitionId: String(entry.definitionId), copies: Number(entry.copies) }));
        const validation = validateDeck(cards, this.definitions, ALPHA_FORMAT);
        if (!validation.valid)
            throw new RoomError("INVALID_DECK", validation.errors.join(" "));
        return { id: selection.id, name: selection.name.slice(0, 80) || "Custom Deck", department: this.deckDepartment(cards), cards };
    }
    getRoom(roomId) {
        const room = this.rooms.get(roomId.toUpperCase());
        if (!room)
            throw new RoomError("ROOM_NOT_FOUND", "Room not found.");
        return room;
    }
    resolveSeat(room, token) {
        if (room.host.token === token)
            return room.host;
        if (room.guest?.token === token)
            return room.guest;
        throw new RoomError("INVALID_TOKEN", "Session token is invalid for this room.");
    }
    projectRoom(room, token, afterEventSeq, clientId) {
        const seat = this.resolveSeat(room, token);
        const status = !room.state ? "WAITING" : room.state.status === "ENDED" ? "ENDED" : "ACTIVE";
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
            match: room.state ? projectStateForViewer(room.state, seat.playerId) : null,
            events: room.state ? projectEventsSince(room.state, seat.playerId, afterEventSeq) : []
        };
    }
    projectViewerSession(room, playerId, clientId) {
        const normalized = String(clientId ?? "").trim();
        if (!normalized)
            return { protectionEnabled: false, isPrimary: true, activeElsewhere: false, connectionCount: room.connectionCounts[playerId] ?? 0 };
        const active = room.activeClientIds[playerId];
        return {
            protectionEnabled: true,
            isPrimary: !active || active === normalized,
            activeElsewhere: Boolean(active && active !== normalized),
            connectionCount: room.connectionCounts[playerId] ?? 0
        };
    }
    tickTimers() {
        const now = this.nowFactory();
        const actions = [];
        for (const room of this.rooms.values()) {
            if (!room.settings.timerActive || !room.timer.active || !room.state || room.state.status === "ENDED")
                continue;
            let endedByReconnect = false;
            for (const playerId of ["P1", "P2"]) {
                const deadline = room.timer.reconnectDeadlineAt[playerId];
                const otherId = playerId === "P1" ? "P2" : "P1";
                if (deadline !== null && deadline <= now && room.connectionCounts[playerId] === 0 && room.connectionCounts[otherId] > 0) {
                    this.forfeitRoom(room, playerId, "RECONNECT_TIMEOUT", now);
                    actions.push({ roomId: room.id, type: "RECONNECT_TIMEOUT", playerId });
                    endedByReconnect = true;
                    break;
                }
            }
            if (endedByReconnect || !room.state)
                continue;
            const expired = clockIsExpired(room.timer, room.state, now);
            if (!expired)
                continue;
            if (expired.kind === "RESPONSE") {
                if (this.submitSystemIntent(room, expired.playerId, { type: "PASS_PRIORITY" }, now))
                    actions.push({ roomId: room.id, type: "AUTO_PASS", playerId: expired.playerId });
            }
            else if (expired.kind === "DECISION") {
                this.forfeitRoom(room, expired.playerId, "DECISION_TIMEOUT", now);
                actions.push({ roomId: room.id, type: "DECISION_TIMEOUT", playerId: expired.playerId });
            }
            else {
                this.forfeitRoom(room, expired.playerId, "TURN_TIMEOUT", now);
                actions.push({ roomId: room.id, type: "TURN_TIMEOUT", playerId: expired.playerId });
            }
        }
        return actions;
    }
    checkpointTimers() {
        this.tickTimers();
        const now = this.nowFactory();
        let changed = false;
        for (const room of this.rooms.values()) {
            if (!room.settings.timerActive || !room.timer.active || !room.state || room.state.status === "ENDED")
                continue;
            consumeRunningClock(room.timer, now);
            changed = true;
        }
        if (changed)
            this.persist();
        return changed;
    }
    effectiveTimerProfile(settings) {
        const configured = this.timerProfiles[settings.timerProfileId] ?? DEFAULT_TIMER_PROFILES[settings.mode === "RANKED" ? "RANKED_STANDARD_TBD" : "UNTIMED"];
        return { ...structuredClone(configured), enabled: Boolean(settings.timerActive && configured.enabled) };
    }
    submitSystemIntent(room, playerId, intent, now) {
        if (!room.state || room.state.status === "ENDED")
            return false;
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
        if (!execution.response.accepted)
            return false;
        room.state = execution.state;
        if (room.state.turnNumber !== previousTurnNumber || room.state.activePlayerId !== previousActivePlayerId)
            room.lifecycle.turnStartedAt = now;
        const hasResponseWindow = Boolean(room.state.responseWindow);
        if (!hadResponseWindow && hasResponseWindow)
            room.lifecycle.responseStartedAt = now;
        else if (hadResponseWindow && !hasResponseWindow)
            room.lifecycle.responseStartedAt = null;
        else if (hadResponseWindow && hasResponseWindow && previousState.priorityPlayerId !== room.state.priorityPlayerId)
            room.lifecycle.responseStartedAt = now;
        synchronizeTimerRuntime(room.timer, this.effectiveTimerProfile(room.settings), previousState, room.state, now);
        addDiagnostic(room.telemetry, now, "TIMER_AUTO_PASS", playerId, { stateVersion: room.state.stateVersion });
        this.recordStateTransitionDiagnostics(room, previousState, room.state, now);
        synchronizeRoomTelemetry(room.telemetry, room.state, now);
        room.roomVersion += 1;
        this.persist();
        this.notify(room);
        return true;
    }
    forfeitRoom(room, playerId, reason, now) {
        if (!room.state || room.state.status === "ENDED")
            return;
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
        clearReconnectDeadline(room.timer, "P1");
        clearReconnectDeadline(room.timer, "P2");
        room.roomVersion += 1;
        this.persist();
        this.notify(room);
    }
    recordStateTransitionDiagnostics(room, previousState, state, now) {
        if (state.turnNumber !== previousState.turnNumber || state.activePlayerId !== previousState.activePlayerId) {
            addDiagnostic(room.telemetry, now, "TURN_STARTED", state.activePlayerId, { turnNumber: state.turnNumber });
        }
        const hadResponse = Boolean(previousState.responseWindow);
        const hasResponse = Boolean(state.responseWindow);
        if (!hadResponse && hasResponse)
            addDiagnostic(room.telemetry, now, "RESPONSE_OPENED", state.priorityPlayerId ?? undefined, { event: state.responseWindow?.event ?? null });
        else if (hadResponse && !hasResponse)
            addDiagnostic(room.telemetry, now, "RESPONSE_CLOSED", previousState.priorityPlayerId ?? undefined);
        if (previousState.status !== "ENDED" && state.status === "ENDED") {
            addDiagnostic(room.telemetry, now, "MATCH_ENDED", state.winnerId ?? undefined, { reason: state.reason ?? null, turnNumber: state.turnNumber });
        }
    }
    notify(room) {
        for (const listener of room.listeners)
            listener();
    }
}
