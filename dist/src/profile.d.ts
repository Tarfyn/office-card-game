import { type PlayerMetaProfile } from "./economy.js";
import type { SnapshotPersistence } from "./storage.js";
import { type PlayerRankedProfile, type RankedSystemConfig } from "./ranked.js";
export type MatchHistoryOutcome = "WIN" | "LOSS" | "DRAW" | "RESIGN_LOSS";
export interface PlayerMatchHistoryEntry {
    roomId: string;
    matchId: string;
    mode: "FRIENDLY" | "RANKED";
    outcome: MatchHistoryOutcome;
    opponentName: string;
    deckName: string;
    opponentDeckName: string;
    turns: number;
    reason: string;
    finishedAt: number;
}
export interface PlayerProfileStats {
    matchesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    resignLosses: number;
    friendlyMatches: number;
    rankedMatches: number;
}
export interface ServerPlayerProfile {
    /** Stable account identity. Credentials may rotate without changing this id. */
    playerId: string;
    /** Legacy alias kept during the alpha migration window. */
    profileId: string;
    displayName: string;
    meta: PlayerMetaProfile;
    stats: PlayerProfileStats;
    ranked: PlayerRankedProfile;
    matchHistory: PlayerMatchHistoryEntry[];
    createdAt: number;
    updatedAt: number;
}
/** v3.7-v4.5 combined token+profile record, retained only for migration/back-compat. */
export interface PersistedPlayerProfileRecord {
    profileToken: string;
    profile: Omit<ServerPlayerProfile, "playerId" | "ranked"> & {
        playerId?: string;
        ranked?: Partial<PlayerRankedProfile>;
    };
}
/** v3.7-v4.5 combined store snapshot. */
export interface PlayerProfileStoreSnapshot {
    version: 1;
    records: PersistedPlayerProfileRecord[];
}
export interface PlayerDataStoreSnapshot {
    version: 1 | 2;
    players: ServerPlayerProfile[];
}
export interface GuestCredentialRecord {
    kind: "GUEST_LOCAL";
    profileToken: string;
    playerId: string;
    createdAt: number;
    lastUsedAt: number;
}
export interface GuestCredentialStoreSnapshot {
    version: 1;
    credentials: GuestCredentialRecord[];
}
/** Legacy combined persistence boundary kept so old builds/tests can restore. */
export interface PlayerProfilePersistence extends SnapshotPersistence<PlayerProfileStoreSnapshot> {
}
export interface PlayerDataPersistence extends SnapshotPersistence<PlayerDataStoreSnapshot> {
}
export interface GuestCredentialPersistence extends SnapshotPersistence<GuestCredentialStoreSnapshot> {
}
export interface CreateServerProfileResult {
    profileToken: string;
    profile: ServerPlayerProfile;
}
export interface PlayerProfileServiceOptions {
    /** Legacy name; playerIdFactory takes precedence. */
    idFactory?: () => string;
    playerIdFactory?: () => string;
    tokenFactory?: () => string;
    nowFactory?: () => number;
    /** Legacy combined store, used directly when separate stores are not configured and as a migration source otherwise. */
    persistence?: PlayerProfilePersistence;
    playerPersistence?: PlayerDataPersistence;
    credentialPersistence?: GuestCredentialPersistence;
    maxHistoryEntries?: number;
    rankedConfig?: Partial<RankedSystemConfig>;
}
export declare class PlayerProfileService {
    private readonly playersById;
    private readonly credentialsByToken;
    private readonly playerIdFactory;
    private readonly tokenFactory;
    private readonly nowFactory;
    private readonly legacyPersistence;
    private readonly playerPersistence;
    private readonly credentialPersistence;
    private readonly maxHistoryEntries;
    private readonly rankedConfig;
    private migratedLegacyStore;
    constructor(options?: PlayerProfileServiceOptions);
    get storageLabel(): string;
    get playerStorageLabel(): string;
    get credentialStorageLabel(): string;
    get authMode(): "GUEST_LOCAL";
    get migratedLegacyProfileStore(): boolean;
    create(initialMeta?: PlayerMetaProfile, requestedName?: string): CreateServerProfileResult;
    get(profileToken: string): ServerPlayerProfile;
    getByPlayerId(playerId: string): ServerPlayerProfile;
    has(profileToken: string): boolean;
    updateMeta(profileToken: string, meta: PlayerMetaProfile): ServerPlayerProfile;
    updateName(profileToken: string, displayName: string): ServerPlayerProfile;
    /** Replace only the local guest secret; the stable player identity and progression are unchanged. */
    rotateGuestCredential(profileToken: string): CreateServerProfileResult;
    recordMatch(profileToken: string, entry: PlayerMatchHistoryEntry): ServerPlayerProfile;
    recordRankedMatch(result: {
        roomId: string;
        p1PlayerId: string;
        p2PlayerId: string;
        winnerPlayerId: string | null;
        reason: string;
        settledAt?: number;
    }): {
        replayed: boolean;
        p1: PlayerRankedProfile;
        p2: PlayerRankedProfile;
    };
    /** Legacy combined snapshot retained for compatibility and one-way migration. */
    snapshot(): PlayerProfileStoreSnapshot;
    playerSnapshot(): PlayerDataStoreSnapshot;
    credentialSnapshot(): GuestCredentialStoreSnapshot;
    private get usesSeparatedStores();
    private requireCredential;
    private requireByToken;
    private restoreSeparated;
    private restoreLegacy;
    private restore;
    private persistSeparated;
    private persist;
}
