import { createAlphaMetaProfile } from "./economy.js";
import { createRankedProfile, normalizeRankedConfig, normalizeRankedProfile, rankedK, ratingDelta } from "./ranked.js";
function defaultId() {
    return `player-${Math.random().toString(36).slice(2, 10)}`;
}
function defaultToken() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
function cleanName(value, fallback) {
    const name = String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 24);
    return name || fallback;
}
function emptyStats() {
    return { matchesPlayed: 0, wins: 0, losses: 0, draws: 0, resignLosses: 0, friendlyMatches: 0, rankedMatches: 0 };
}
function normalizeStats(value) {
    const defaults = emptyStats();
    const next = { ...defaults, ...(value ?? {}) };
    for (const key of Object.keys(defaults))
        next[key] = Math.max(0, Number(next[key] ?? 0));
    return next;
}
function normalizeProfile(profile, rankedConfig) {
    const playerId = String(profile.playerId ?? profile.profileId ?? "");
    return {
        ...structuredClone(profile),
        playerId,
        profileId: playerId,
        stats: normalizeStats(profile.stats),
        ranked: normalizeRankedProfile(profile.ranked, rankedConfig),
        matchHistory: Array.isArray(profile.matchHistory) ? profile.matchHistory.map((entry) => structuredClone(entry)) : []
    };
}
export class PlayerProfileService {
    playersById = new Map();
    credentialsByToken = new Map();
    playerIdFactory;
    tokenFactory;
    nowFactory;
    legacyPersistence;
    playerPersistence;
    credentialPersistence;
    maxHistoryEntries;
    rankedConfig;
    migratedLegacyStore = false;
    constructor(options = {}) {
        this.playerIdFactory = options.playerIdFactory ?? options.idFactory ?? defaultId;
        this.tokenFactory = options.tokenFactory ?? defaultToken;
        this.nowFactory = options.nowFactory ?? (() => Date.now());
        this.legacyPersistence = options.persistence ?? null;
        this.playerPersistence = options.playerPersistence ?? null;
        this.credentialPersistence = options.credentialPersistence ?? null;
        this.maxHistoryEntries = Math.max(1, Number(options.maxHistoryEntries ?? 30));
        this.rankedConfig = normalizeRankedConfig(options.rankedConfig);
        this.restore();
    }
    get storageLabel() {
        if (this.usesSeparatedStores)
            return `${this.playerStorageLabel}+${this.credentialStorageLabel}`;
        return this.legacyPersistence?.storageLabel ?? "MEMORY_ONLY";
    }
    get playerStorageLabel() {
        return this.playerPersistence?.storageLabel ?? (this.legacyPersistence?.storageLabel ?? "MEMORY_ONLY");
    }
    get credentialStorageLabel() {
        return this.credentialPersistence?.storageLabel ?? (this.legacyPersistence?.storageLabel ?? "MEMORY_ONLY");
    }
    get authMode() {
        return "GUEST_LOCAL";
    }
    get migratedLegacyProfileStore() {
        return this.migratedLegacyStore;
    }
    create(initialMeta, requestedName) {
        let playerId = this.playerIdFactory();
        while (this.playersById.has(playerId))
            playerId = this.playerIdFactory();
        let profileToken = this.tokenFactory();
        while (this.credentialsByToken.has(profileToken))
            profileToken = this.tokenFactory();
        const now = this.nowFactory();
        const suffix = playerId.replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase() || "0001";
        const profile = {
            playerId,
            profileId: playerId,
            displayName: cleanName(requestedName, `Employee ${suffix}`),
            meta: structuredClone(initialMeta ?? createAlphaMetaProfile()),
            stats: emptyStats(),
            ranked: createRankedProfile(this.rankedConfig),
            matchHistory: [],
            createdAt: now,
            updatedAt: now
        };
        const credential = { kind: "GUEST_LOCAL", profileToken, playerId, createdAt: now, lastUsedAt: now };
        this.playersById.set(playerId, profile);
        this.credentialsByToken.set(profileToken, credential);
        this.persist();
        return { profileToken, profile: structuredClone(profile) };
    }
    get(profileToken) {
        const profile = this.requireByToken(profileToken);
        return structuredClone(profile);
    }
    getByPlayerId(playerId) {
        const profile = this.playersById.get(playerId);
        if (!profile)
            throw new Error("PLAYER_NOT_FOUND");
        return structuredClone(profile);
    }
    has(profileToken) {
        const credential = this.credentialsByToken.get(profileToken);
        return Boolean(credential && this.playersById.has(credential.playerId));
    }
    updateMeta(profileToken, meta) {
        const profile = this.requireByToken(profileToken);
        profile.meta = structuredClone(meta);
        profile.updatedAt = this.nowFactory();
        this.persist();
        return structuredClone(profile);
    }
    updateName(profileToken, displayName) {
        const profile = this.requireByToken(profileToken);
        profile.displayName = cleanName(displayName, profile.displayName);
        profile.updatedAt = this.nowFactory();
        this.persist();
        return structuredClone(profile);
    }
    /** Replace only the local guest secret; the stable player identity and progression are unchanged. */
    rotateGuestCredential(profileToken) {
        const oldCredential = this.requireCredential(profileToken);
        const profile = this.playersById.get(oldCredential.playerId);
        if (!profile)
            throw new Error("INVALID_PROFILE_TOKEN");
        let nextToken = this.tokenFactory();
        while (this.credentialsByToken.has(nextToken))
            nextToken = this.tokenFactory();
        const now = this.nowFactory();
        this.credentialsByToken.delete(profileToken);
        this.credentialsByToken.set(nextToken, { kind: "GUEST_LOCAL", profileToken: nextToken, playerId: profile.playerId, createdAt: now, lastUsedAt: now });
        this.persist();
        return { profileToken: nextToken, profile: structuredClone(profile) };
    }
    recordMatch(profileToken, entry) {
        const profile = this.requireByToken(profileToken);
        if (profile.matchHistory.some((existing) => existing.roomId === entry.roomId))
            return structuredClone(profile);
        profile.matchHistory.unshift(structuredClone(entry));
        profile.matchHistory = profile.matchHistory.slice(0, this.maxHistoryEntries);
        profile.stats.matchesPlayed += 1;
        if (entry.outcome === "WIN")
            profile.stats.wins += 1;
        else if (entry.outcome === "DRAW")
            profile.stats.draws += 1;
        else
            profile.stats.losses += 1;
        if (entry.outcome === "RESIGN_LOSS")
            profile.stats.resignLosses += 1;
        if (entry.mode === "RANKED")
            profile.stats.rankedMatches += 1;
        else
            profile.stats.friendlyMatches += 1;
        profile.updatedAt = this.nowFactory();
        this.persist();
        return structuredClone(profile);
    }
    recordRankedMatch(result) {
        const p1 = this.playersById.get(result.p1PlayerId);
        const p2 = this.playersById.get(result.p2PlayerId);
        if (!p1 || !p2)
            throw new Error("PLAYER_NOT_FOUND");
        const existing1 = p1.ranked.recentResults.find((item) => item.roomId === result.roomId);
        const existing2 = p2.ranked.recentResults.find((item) => item.roomId === result.roomId);
        if (existing1 && existing2)
            return { replayed: true, p1: structuredClone(p1.ranked), p2: structuredClone(p2.ranked) };
        if (existing1 || existing2)
            throw new Error("RANKED_SETTLEMENT_INCONSISTENT");
        const settledAt = Number(result.settledAt ?? this.nowFactory());
        const p1Before = p1.ranked.rating;
        const p2Before = p2.ranked.rating;
        const isDraw = !result.winnerPlayerId;
        const p1Won = result.winnerPlayerId === result.p1PlayerId;
        const p2Won = result.winnerPlayerId === result.p2PlayerId;
        const p1Score = isDraw ? 0.5 : p1Won ? 1 : 0;
        const p2Score = isDraw ? 0.5 : p2Won ? 1 : 0;
        const p1Delta = ratingDelta(p1Before, p2Before, p1Score, rankedK(p1.ranked, this.rankedConfig), this.rankedConfig.ratingScale);
        const p2Delta = ratingDelta(p2Before, p1Before, p2Score, rankedK(p2.ranked, this.rankedConfig), this.rankedConfig.ratingScale);
        const p1After = Math.max(this.rankedConfig.minimumRating, p1Before + p1Delta);
        const p2After = Math.max(this.rankedConfig.minimumRating, p2Before + p2Delta);
        const p1Outcome = isDraw ? "DRAW" : p1Won ? "WIN" : result.reason === "RESIGN" ? "RESIGN_LOSS" : "LOSS";
        const p2Outcome = isDraw ? "DRAW" : p2Won ? "WIN" : result.reason === "RESIGN" ? "RESIGN_LOSS" : "LOSS";
        const apply = (profile, opponentBefore, before, after, outcome) => {
            const ranked = profile.ranked;
            ranked.seasonId = this.rankedConfig.currentSeasonId;
            ranked.phase = this.rankedConfig.phase;
            ranked.rating = after;
            ranked.peakRating = Math.max(ranked.peakRating, after);
            ranked.matchesPlayed += 1;
            ranked.placementsPlayed = Math.min(ranked.placementsRequired, ranked.placementsPlayed + 1);
            ranked.status = ranked.placementsPlayed >= ranked.placementsRequired ? "RATED" : "PLACEMENT";
            if (outcome === "WIN")
                ranked.wins += 1;
            else if (outcome === "DRAW")
                ranked.draws += 1;
            else {
                ranked.losses += 1;
                if (outcome === "RESIGN_LOSS")
                    ranked.resignLosses += 1;
            }
            ranked.recentResults.unshift({ roomId: result.roomId, seasonId: ranked.seasonId, outcome, ratingBefore: before, ratingAfter: after, ratingDelta: after - before, opponentRatingBefore: opponentBefore, settledAt });
            ranked.recentResults = ranked.recentResults.slice(0, 100);
            profile.updatedAt = settledAt;
        };
        apply(p1, p2Before, p1Before, p1After, p1Outcome);
        apply(p2, p1Before, p2Before, p2After, p2Outcome);
        this.persist();
        return { replayed: false, p1: structuredClone(p1.ranked), p2: structuredClone(p2.ranked) };
    }
    /** Legacy combined snapshot retained for compatibility and one-way migration. */
    snapshot() {
        const tokenByPlayer = new Map();
        for (const credential of this.credentialsByToken.values())
            if (!tokenByPlayer.has(credential.playerId))
                tokenByPlayer.set(credential.playerId, credential.profileToken);
        return {
            version: 1,
            records: [...this.playersById.values()].flatMap((profile) => {
                const profileToken = tokenByPlayer.get(profile.playerId);
                return profileToken ? [{ profileToken, profile: structuredClone(profile) }] : [];
            })
        };
    }
    playerSnapshot() {
        return { version: 2, players: [...this.playersById.values()].map((profile) => structuredClone(profile)) };
    }
    credentialSnapshot() {
        return { version: 1, credentials: [...this.credentialsByToken.values()].map((credential) => structuredClone(credential)) };
    }
    get usesSeparatedStores() {
        return Boolean(this.playerPersistence && this.credentialPersistence);
    }
    requireCredential(profileToken) {
        const credential = this.credentialsByToken.get(profileToken);
        if (!credential)
            throw new Error("INVALID_PROFILE_TOKEN");
        return credential;
    }
    requireByToken(profileToken) {
        const credential = this.requireCredential(profileToken);
        const profile = this.playersById.get(credential.playerId);
        if (!profile)
            throw new Error("INVALID_PROFILE_TOKEN");
        return profile;
    }
    restoreSeparated() {
        if (!this.usesSeparatedStores)
            return false;
        const playerSnapshot = this.playerPersistence?.load();
        const credentialSnapshot = this.credentialPersistence?.load();
        let restored = false;
        if ((playerSnapshot?.version === 1 || playerSnapshot?.version === 2) && Array.isArray(playerSnapshot.players)) {
            for (const raw of playerSnapshot.players) {
                if (!raw?.profileId && !raw?.playerId)
                    continue;
                const profile = normalizeProfile(raw, this.rankedConfig);
                if (!profile.playerId)
                    continue;
                this.playersById.set(profile.playerId, profile);
                restored = true;
            }
        }
        if (credentialSnapshot?.version === 1 && Array.isArray(credentialSnapshot.credentials)) {
            for (const raw of credentialSnapshot.credentials) {
                if (!raw?.profileToken || !raw?.playerId || raw.kind !== "GUEST_LOCAL")
                    continue;
                if (!this.playersById.has(raw.playerId))
                    continue;
                this.credentialsByToken.set(raw.profileToken, structuredClone(raw));
            }
        }
        return restored && this.credentialsByToken.size > 0;
    }
    restoreLegacy() {
        const snapshot = this.legacyPersistence?.load();
        if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.records))
            return false;
        let restored = false;
        for (const record of snapshot.records) {
            if (!record?.profileToken || !record.profile?.profileId)
                continue;
            const profile = normalizeProfile(record.profile, this.rankedConfig);
            if (!profile.playerId)
                continue;
            this.playersById.set(profile.playerId, profile);
            const now = Number(profile.updatedAt || profile.createdAt || this.nowFactory());
            this.credentialsByToken.set(record.profileToken, { kind: "GUEST_LOCAL", profileToken: record.profileToken, playerId: profile.playerId, createdAt: Number(profile.createdAt || now), lastUsedAt: now });
            restored = true;
        }
        return restored;
    }
    restore() {
        if (this.restoreSeparated())
            return;
        if (this.restoreLegacy()) {
            if (this.usesSeparatedStores) {
                this.migratedLegacyStore = true;
                this.persistSeparated();
            }
        }
    }
    persistSeparated() {
        this.playerPersistence?.save(this.playerSnapshot());
        this.credentialPersistence?.save(this.credentialSnapshot());
    }
    persist() {
        if (this.usesSeparatedStores) {
            this.persistSeparated();
            return;
        }
        this.legacyPersistence?.save(this.snapshot());
    }
}
