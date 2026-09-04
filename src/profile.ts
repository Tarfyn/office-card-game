import { applyAlphaPlaytestCosmeticGrant, applyLevelMilestoneRewards, applyRewardGrant, createPlayerMetaProfile, normalizePlayerMetaProfile, type LevelMilestoneDefinition, type OwnedDeckEntry, type PlayerMetaProfile, type RewardGrant } from "./economy.js";
import { applyCosmeticEquip, applyCosmeticPurchase, normalizePlayerCosmetics, type CosmeticSlotKey } from "./cosmetics.js";
import type { SnapshotPersistence } from "./storage.js";
import { createRankedProfile, normalizeRankedConfig, normalizeRankedContentConfig, normalizeRankedProfile, rankedK, rankedStanding, ratingDelta, type PlayerRankedProfile, type RankedContentConfig, type RankedOutcome, type RankedSystemConfig } from "./ranked.js";
import { normalizeProgressionConfig, processProgressionEvents, rewardGrantFromRewardItems, type ProgressionConfig, type ProgressionEvent } from "./progression.js";
import { assertDeckInput, deckFingerprint, normalizePlayerDeck, validatePlayerDeck, type PlayerDeck, type PlayerDeckView } from "./player-decks.js";
import { createEmptyPlayerStats, DEFAULT_MATCH_HISTORY_LIMIT, normalizeMatchHistoryRecord, normalizePlayerStats, type MatchHistoryInput, type MatchHistoryRecord, type PlayerStats } from "./match-history.js";
import type { CardDefinition, DeckEntry, DeckFormat } from "./types.js";
import { buildFirstDayDeck, buildStarterPackagePlan, normalizeStarterDepartment } from "./starter-access.js";

export type MatchHistoryOutcome = import("./match-history.js").MatchHistoryOutcome;
export type PlayerMatchHistoryEntry = MatchHistoryRecord;
export type PlayerProfileStats = PlayerStats;

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
  /** Player-owned saved decks. Built-in presets remain global definitions. */
  decks: PlayerDeck[];
  /** Built-in preset id or player-owned deck id. */
  selectedDeckId: string | null;
  createdAt: number;
  updatedAt: number;
}

type RawPersistedPlayerProfile = Omit<Partial<ServerPlayerProfile>, "playerId" | "ranked" | "stats" | "matchHistory"> & { playerId?: string; ranked?: Partial<PlayerRankedProfile>; stats?: Partial<PlayerStats>; matchHistory?: Array<Partial<MatchHistoryRecord>> };

/** v3.7-v4.5 combined token+profile record, retained only for migration/back-compat. */
export interface PersistedPlayerProfileRecord {
  profileToken: string;
  profile: RawPersistedPlayerProfile;
}

/** v3.7-v4.5 combined store snapshot. */
export interface PlayerProfileStoreSnapshot {
  version: 1;
  records: PersistedPlayerProfileRecord[];
}

export interface PlayerDataStoreSnapshot {
  version: 1 | 2 | 3;
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
export interface PlayerProfilePersistence extends SnapshotPersistence<PlayerProfileStoreSnapshot> {}
export interface PlayerDataPersistence extends SnapshotPersistence<PlayerDataStoreSnapshot> {}
export interface GuestCredentialPersistence extends SnapshotPersistence<GuestCredentialStoreSnapshot> {}

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
  starterCards?: OwnedDeckEntry[];
  startingOfficeCredits?: number;
  deckDefinitions?: Record<string, CardDefinition>;
  deckFormat?: DeckFormat;
  deckIdFactory?: () => string;
  builtInDeckIds?: Iterable<string>;
  /** Explicit alpha-only grant path for reward-only cosmetics. */
  alphaPlaytest?: boolean;
  progressionConfig?: Partial<ProgressionConfig>;
  rankedContentConfig?: Partial<RankedContentConfig>;
  levelMilestones?: LevelMilestoneDefinition[];
}

function defaultId(): string {
  return `player-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultToken(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function cleanName(value: string | undefined, fallback: string): string {
  const name = String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 24);
  return name || fallback;
}

function normalizeProfile(profile: RawPersistedPlayerProfile, rankedConfig: RankedSystemConfig): ServerPlayerProfile {
  const playerId = String(profile.playerId ?? profile.profileId ?? "");
  const now = Number(profile.updatedAt) || Date.now();
  return {
    playerId,
    profileId: playerId,
    displayName: cleanName(profile.displayName, `Employee ${playerId.slice(-4).toUpperCase() || "0001"}`),
    meta: normalizePlayerMetaProfile(profile.meta),
    stats: normalizePlayerStats(profile.stats, Number(rankedConfig.initialRating)),
    ranked: normalizeRankedProfile(profile.ranked, rankedConfig),
    matchHistory: Array.isArray(profile.matchHistory) ? profile.matchHistory.map((entry) => normalizeMatchHistoryRecord(entry as Partial<MatchHistoryRecord>)) : [],
    decks: Array.isArray(profile.decks) ? profile.decks.map((deck, index) => normalizePlayerDeck(deck, `deck-restored-${index + 1}`, now)) : [],
    selectedDeckId: profile.selectedDeckId == null ? null : String(profile.selectedDeckId),
    createdAt: Number(profile.createdAt) || now,
    updatedAt: now
  };
}

function migrateLegacyCollection(profile: ServerPlayerProfile, starterCards: OwnedDeckEntry[], now: number): ServerPlayerProfile {
  if (profile.meta.profileVersion >= 2) return profile;
  let meta = normalizePlayerMetaProfile(profile.meta, now);
  // v7.69 profiles used an explicit sandbox flag. Convert restored player data
  // to owned copies while preserving any already-granted cards.
  if (meta.collectionMode === "SANDBOX_ALL_AVAILABLE") {
    if (Object.keys(meta.ownedCards).length === 0 && starterCards.length) {
      meta = applyRewardGrant(meta, {
        source:"starter", sourceRef:"starter:alpha:v1", cards:starterCards.map((entry) => ({ cardId:entry.definitionId, quantity:entry.copies })),
        officeCredits:0, scrap:0, cosmetics:[], packs:[], grantedAt:now
      }, now).profile;
    } else if (Object.keys(meta.ownedCards).length && !meta.rewardGrants.length) {
      meta.rewardGrants.push({ source:"starter", sourceRef:"migration:legacy-owned:v1", cards:Object.entries(meta.ownedCards).map(([cardId, quantity]) => ({ cardId, quantity })), officeCredits:0, scrap:0, cosmetics:[], packs:[], grantedAt:now });
    }
    meta.collectionMode = "OWNED_COPIES";
  }
  meta.profileVersion = 2;
  return { ...profile, meta };
}

export class PlayerProfileService {
  private readonly playersById = new Map<string, ServerPlayerProfile>();
  private readonly credentialsByToken = new Map<string, GuestCredentialRecord>();
  private readonly playerIdFactory: () => string;
  private readonly tokenFactory: () => string;
  private readonly nowFactory: () => number;
  private readonly legacyPersistence: PlayerProfilePersistence | null;
  private readonly playerPersistence: PlayerDataPersistence | null;
  private readonly credentialPersistence: GuestCredentialPersistence | null;
  private readonly maxHistoryEntries: number;
  private readonly rankedConfig: RankedSystemConfig;
  private readonly starterCards: OwnedDeckEntry[];
  private readonly startingOfficeCredits: number;
  private readonly deckDefinitions: Record<string, CardDefinition>;
  private readonly deckFormat: DeckFormat;
  private readonly deckIdFactory: () => string;
  private readonly builtInDeckIds: Set<string>;
  private readonly alphaPlaytest: boolean;
  private readonly progressionConfig: ProgressionConfig;
  private readonly rankedContentConfig: RankedContentConfig;
  private readonly levelMilestones: LevelMilestoneDefinition[];
  private migratedLegacyStore = false;

  constructor(options: PlayerProfileServiceOptions = {}) {
    this.playerIdFactory = options.playerIdFactory ?? options.idFactory ?? defaultId;
    this.tokenFactory = options.tokenFactory ?? defaultToken;
    this.nowFactory = options.nowFactory ?? (() => Date.now());
    this.legacyPersistence = options.persistence ?? null;
    this.playerPersistence = options.playerPersistence ?? null;
    this.credentialPersistence = options.credentialPersistence ?? null;
    this.maxHistoryEntries = Math.max(1, Number(options.maxHistoryEntries ?? DEFAULT_MATCH_HISTORY_LIMIT));
    this.rankedConfig = normalizeRankedConfig(options.rankedConfig);
    this.starterCards = structuredClone(options.starterCards ?? []);
    this.startingOfficeCredits = Math.max(0, Math.floor(Number(options.startingOfficeCredits) || 0));
    this.deckDefinitions = options.deckDefinitions ?? {};
    this.deckFormat = options.deckFormat ?? { id:"default", deckSize:40, defaultCopyLimit:3 };
    this.deckIdFactory = options.deckIdFactory ?? (() => `deck-${this.nowFactory().toString(36)}-${Math.random().toString(36).slice(2, 7)}`);
    this.builtInDeckIds = new Set(options.builtInDeckIds ?? []);
    this.alphaPlaytest = options.alphaPlaytest === true;
    this.progressionConfig = normalizeProgressionConfig(options.progressionConfig);
    this.rankedContentConfig = normalizeRankedContentConfig(options.rankedContentConfig);
    this.levelMilestones = structuredClone(options.levelMilestones ?? []);
    this.restore();
  }

  get storageLabel(): string {
    if (this.usesSeparatedStores) return `${this.playerStorageLabel}+${this.credentialStorageLabel}`;
    return this.legacyPersistence?.storageLabel ?? "MEMORY_ONLY";
  }

  get playerStorageLabel(): string {
    return this.playerPersistence?.storageLabel ?? (this.legacyPersistence?.storageLabel ?? "MEMORY_ONLY");
  }

  get credentialStorageLabel(): string {
    return this.credentialPersistence?.storageLabel ?? (this.legacyPersistence?.storageLabel ?? "MEMORY_ONLY");
  }

  get authMode(): "GUEST_LOCAL" {
    return "GUEST_LOCAL";
  }

  get migratedLegacyProfileStore(): boolean {
    return this.migratedLegacyStore;
  }

  get progressionEnabled(): boolean {
    return this.progressionConfig.enabled !== false;
  }

  create(initialMeta?: PlayerMetaProfile, requestedName?: string): CreateServerProfileResult {
    let playerId = this.playerIdFactory();
    while (this.playersById.has(playerId)) playerId = this.playerIdFactory();
    let profileToken = this.tokenFactory();
    while (this.credentialsByToken.has(profileToken)) profileToken = this.tokenFactory();
    const now = this.nowFactory();
    const suffix = playerId.replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase() || "0001";
    let meta = normalizePlayerMetaProfile(initialMeta ?? createPlayerMetaProfile(this.starterCards, this.startingOfficeCredits, now), now);
    if (this.alphaPlaytest) meta = applyAlphaPlaytestCosmeticGrant(meta, now);
    meta = applyLevelMilestoneRewards(meta, this.levelMilestones, 0, meta.progression.level, now).profile;
    const profile: ServerPlayerProfile = {
      playerId,
      profileId: playerId,
      displayName: cleanName(requestedName, `Employee ${suffix}`),
      meta,
      stats: createEmptyPlayerStats(this.rankedConfig.initialRating),
      ranked: createRankedProfile(this.rankedConfig),
      matchHistory: [],
      decks: [],
      selectedDeckId: null,
      createdAt: now,
      updatedAt: now
    };
    const initialStanding = rankedStanding(profile.ranked.rating, this.rankedContentConfig);
    profile.ranked.tierId = initialStanding.tierId;
    profile.ranked.division = initialStanding.division;
    const credential: GuestCredentialRecord = { kind:"GUEST_LOCAL", profileToken, playerId, createdAt:now, lastUsedAt:now };
    this.playersById.set(playerId, profile);
    this.credentialsByToken.set(profileToken, credential);
    this.persist();
    return { profileToken, profile: structuredClone(profile) };
  }

  get(profileToken: string): ServerPlayerProfile {
    const profile = this.requireByToken(profileToken);
    return structuredClone(profile);
  }

  getByPlayerId(playerId: string): ServerPlayerProfile {
    const profile = this.playersById.get(playerId);
    if (!profile) throw new Error("PLAYER_NOT_FOUND");
    return structuredClone(profile);
  }

  has(profileToken: string): boolean {
    const credential = this.credentialsByToken.get(profileToken);
    return Boolean(credential && this.playersById.has(credential.playerId));
  }

  updateMeta(profileToken: string, meta: PlayerMetaProfile): ServerPlayerProfile {
    const profile = this.requireByToken(profileToken);
    profile.meta = normalizePlayerMetaProfile(meta);
    profile.meta.cosmetics = normalizePlayerCosmetics(profile.meta.cosmetics);
    profile.updatedAt = this.nowFactory();
    this.persist();
    return structuredClone(profile);
  }

  updateName(profileToken: string, displayName: string): ServerPlayerProfile {
    const profile = this.requireByToken(profileToken);
    profile.displayName = cleanName(displayName, profile.displayName);
    profile.updatedAt = this.nowFactory();
    this.persist();
    return structuredClone(profile);
  }

  purchaseCosmetic(profileToken: string, cosmeticId: string): ServerPlayerProfile {
    const profile = this.requireByToken(profileToken);
    profile.meta = applyCosmeticPurchase(profile.meta, cosmeticId, this.nowFactory());
    profile.updatedAt = this.nowFactory();
    this.persist();
    return structuredClone(profile);
  }

  equipCosmetic(profileToken: string, slot: CosmeticSlotKey, cosmeticId: string | null): ServerPlayerProfile {
    const profile = this.requireByToken(profileToken);
    profile.meta = applyCosmeticEquip(profile.meta, slot, cosmeticId);
    profile.updatedAt = this.nowFactory();
    this.persist();
    return structuredClone(profile);
  }

  recordProgressionEvents(profileToken: string, events: ProgressionEvent[]): ServerPlayerProfile {
    const profile = this.requireByToken(profileToken);
    const update = processProgressionEvents(profile.meta, events, this.progressionConfig, this.nowFactory());
    profile.meta = update.profile;
    profile.updatedAt = this.nowFactory();
    this.persist();
    return structuredClone(profile);
  }

  listAchievements(profileToken: string) {
    const profile = this.requireByToken(profileToken);
    return { profile: structuredClone(profile), achievements: structuredClone(profile.meta.achievements) };
  }

  listDecks(profileToken: string): { decks: PlayerDeckView[]; selectedDeckId: string | null } {
    const profile = this.requireByToken(profileToken);
    const owned = profile.meta.collectionMode === "OWNED_COPIES" ? profile.meta.ownedCards : undefined;
    return {
      decks: profile.decks.map((deck) => ({ ...structuredClone(deck), validation:validatePlayerDeck(deck, this.deckDefinitions, this.deckFormat, owned, profile.meta.ownedCardVariants) })),
      selectedDeckId: profile.selectedDeckId
    };
  }

  createDeck(profileToken: string, draft: { id?: string; name?: string; cards?: DeckEntry[]; source?: PlayerDeck["source"] }): ServerPlayerProfile {
    const profile = this.requireByToken(profileToken);
    const now = this.nowFactory();
    const cards = Array.isArray(draft.cards) ? structuredClone(draft.cards) : [];
    assertDeckInput({ cards }, this.deckDefinitions, this.deckFormat);
    let id = String(draft.id ?? this.deckIdFactory());
    while (profile.decks.some((deck) => deck.id === id)) id = `${id}-${Math.random().toString(36).slice(2, 6)}`;
    profile.decks.push(normalizePlayerDeck({ ...draft, id, cards, source:draft.source ?? "player", revision:1 }, id, now));
    profile.updatedAt = now;
    this.persist();
    return structuredClone(profile);
  }

  updateDeck(profileToken: string, deckId: string, draft: { name?: string; cards?: DeckEntry[] }, expectedRevision?: number): ServerPlayerProfile {
    const profile = this.requireByToken(profileToken);
    const deck = profile.decks.find((item) => item.id === deckId);
    if (!deck) throw new Error("DECK_NOT_FOUND");
    if (expectedRevision != null && Number(expectedRevision) !== deck.revision) throw new Error("DECK_CONFLICT");
    const cards = Array.isArray(draft.cards) ? structuredClone(draft.cards) : deck.cards;
    assertDeckInput({ cards }, this.deckDefinitions, this.deckFormat);
    deck.name = String(draft.name ?? deck.name).trim().replace(/\s+/g, " ").slice(0, 48) || deck.name;
    deck.cards = cards;
    deck.updatedAt = this.nowFactory();
    deck.revision += 1;
    profile.updatedAt = deck.updatedAt;
    this.persist();
    return structuredClone(profile);
  }

  deleteDeck(profileToken: string, deckId: string): ServerPlayerProfile {
    const profile = this.requireByToken(profileToken);
    const before = profile.decks.length;
    profile.decks = profile.decks.filter((deck) => deck.id !== deckId);
    if (profile.decks.length === before) throw new Error("DECK_NOT_FOUND");
    if (profile.selectedDeckId === deckId) profile.selectedDeckId = null;
    profile.updatedAt = this.nowFactory();
    this.persist();
    return structuredClone(profile);
  }

  selectDeck(profileToken: string, deckId: string): ServerPlayerProfile {
    const profile = this.requireByToken(profileToken);
    const deck = profile.decks.find((item) => item.id === deckId);
    if (!deck) throw new Error("DECK_NOT_FOUND");
    const owned = profile.meta.collectionMode === "OWNED_COPIES" ? profile.meta.ownedCards : undefined;
    const validation = validatePlayerDeck(deck, this.deckDefinitions, this.deckFormat, owned, profile.meta.ownedCardVariants);
    if (validation.state === "INVALID_RULES" || (validation.state === "INVALID_MISSING_CARDS" && !profile.meta.alphaPlaytestAccess?.enabled)) throw new Error("DECK_NOT_VALID");
    profile.selectedDeckId = deckId;
    profile.updatedAt = this.nowFactory();
    this.persist();
    return structuredClone(profile);
  }

  setSelectedDeck(profileToken: string, deckId: string | null): ServerPlayerProfile {
    const profile = this.requireByToken(profileToken);
    if (deckId && !profile.decks.some((deck) => deck.id === deckId) && !this.builtInDeckIds.has(deckId)) throw new Error("DECK_NOT_FOUND");
    profile.selectedDeckId = deckId;
    profile.updatedAt = this.nowFactory();
    this.persist();
    return structuredClone(profile);
  }

  /**
   * Starts the one-time account starter flow in the same profile mutation as
   * its idempotent grants. Pack presentation is advanced separately so a
   * reload cannot reroll or skip an unresolved server result.
   */
  completeStarterOnboarding(profileToken: string, department: string): ServerPlayerProfile {
    const profile = this.requireByToken(profileToken);
    const config = normalizeStarterDepartment(department);
    if (!config) throw new Error("STARTER_DEPARTMENT_INVALID");
    const current = profile.meta.starterOnboarding;
    if (current?.status === "COMPLETE") {
      if (current.selectedDepartment === config.id && current.firstDayDeckId && profile.decks.some((deck) => deck.id === current.firstDayDeckId)) return structuredClone(profile);
      throw new Error("STARTER_ONBOARDING_COMPLETE");
    }
    if (current?.status === "IN_PROGRESS") {
      if (current.selectedDepartment === config.id) return structuredClone(profile);
      throw new Error("STARTER_ONBOARDING_IN_PROGRESS");
    }
    const plan = buildStarterPackagePlan(config.id, Object.values(this.deckDefinitions), this.deckFormat, profile.playerId, this.nowFactory());
    let meta = normalizePlayerMetaProfile(profile.meta, this.nowFactory());
    for (const starterGrant of plan.grants) meta = applyRewardGrant(meta, starterGrant, this.nowFactory()).profile;
    meta.starterOnboarding = { version:1, status:"IN_PROGRESS", selectedDepartment:config.id, completedAt:null, firstDayDeckId:null, boosterCount:plan.grants.filter((grant) => grant.sourceRef?.includes(":booster:")).length, boosterPresentationCount:0 };
    profile.meta = meta;
    profile.updatedAt = this.nowFactory();
    this.persist();
    return structuredClone(profile);
  }

  advanceStarterBooster(profileToken: string, packNumber: number): { profile: ServerPlayerProfile; booster: { packNumber: number; sourceRef: string; cards: RewardGrant["cards"] } | null } {
    const profile = this.requireByToken(profileToken);
    const onboarding = profile.meta.starterOnboarding;
    const requested = Math.floor(Number(packNumber));
    const grants = profile.meta.rewardGrants.filter((grant) => grant.sourceRef?.startsWith(`starter-grant:v1:${onboarding.selectedDepartment}:booster:`));
    const total = onboarding.boosterCount;
    if (!Number.isInteger(requested) || requested < 1 || requested > total || !onboarding.selectedDepartment) throw new Error("STARTER_ONBOARDING_INVALID_STEP");
    const grant = grants.find((item) => item.sourceRef?.endsWith(`:booster:${requested}`));
    if (!grant || !grant.sourceRef) throw new Error("STARTER_ONBOARDING_INVALID_STEP");
    if (onboarding.status === "COMPLETE") return { profile:structuredClone(profile), booster:{ packNumber:requested, sourceRef:grant.sourceRef, cards:structuredClone(grant.cards) } };
    if (onboarding.status !== "IN_PROGRESS") throw new Error("STARTER_ONBOARDING_NOT_STARTED");
    if (requested > onboarding.boosterPresentationCount + 1) throw new Error("STARTER_ONBOARDING_INVALID_STEP");
    if (requested <= onboarding.boosterPresentationCount) return { profile:structuredClone(profile), booster:{ packNumber:requested, sourceRef:grant.sourceRef, cards:structuredClone(grant.cards) } };

    onboarding.boosterPresentationCount = requested;
    if (requested === total) {
      const config = normalizeStarterDepartment(onboarding.selectedDepartment);
      if (!config) throw new Error("STARTER_DEPARTMENT_INVALID");
      const plan = buildStarterPackagePlan(config.id, Object.values(this.deckDefinitions), this.deckFormat, profile.playerId, this.nowFactory());
      const existing = profile.decks.find((deck) => deck.sourceRef === `starter-grant:v1:${config.id}:first-day-deck`);
      const deckId = existing?.id ?? this.deckIdFactory();
      const deckCards = existing?.cards ?? plan.firstDayDeck;
      assertDeckInput({ cards:deckCards }, this.deckDefinitions, this.deckFormat);
      if (!existing) profile.decks.push(normalizePlayerDeck({ id:deckId, name:"First Day Deck", cards:deckCards, source:"starter", sourceRef:`starter-grant:v1:${config.id}:first-day-deck`, revision:1 }, deckId, this.nowFactory()));
      onboarding.status = "COMPLETE";
      onboarding.completedAt = this.nowFactory();
      onboarding.firstDayDeckId = deckId;
      profile.selectedDeckId = deckId;
    }
    profile.updatedAt = this.nowFactory();
    this.persist();
    return { profile:structuredClone(profile), booster:{ packNumber:requested, sourceRef:grant.sourceRef, cards:structuredClone(grant.cards) } };
  }

  importDecks(profileToken: string, drafts: Array<Partial<PlayerDeck>>): { profile: ServerPlayerProfile; imported: string[]; skipped: string[] } {
    const profile = this.requireByToken(profileToken);
    const imported: string[] = [];
    const skipped: string[] = [];
    for (const draft of drafts) {
      const name = String(draft.name ?? "Custom Deck");
      const cards = Array.isArray(draft.cards) ? structuredClone(draft.cards) : [];
      const sourceRef = `browser-local:v1:${deckFingerprint(name, cards)}`;
      if (profile.decks.some((deck) => deck.sourceRef === sourceRef)) {
        skipped.push(sourceRef);
        continue;
      }
      const baseId = String(draft.id ?? `deck-${deckFingerprint(name, cards)}`);
      let id = baseId;
      if (profile.decks.some((deck) => deck.id === id)) id = `${baseId}-${deckFingerprint(name, cards)}`;
      let suffix = 2;
      while (profile.decks.some((deck) => deck.id === id)) id = `${baseId}-${deckFingerprint(name, cards)}-${suffix++}`;
      profile.decks.push(normalizePlayerDeck({ ...draft, id, cards, source:"browser_migration", sourceRef, revision:1 }, id, this.nowFactory()));
      imported.push(id);
    }
    if (imported.length) {
      profile.updatedAt = this.nowFactory();
      this.persist();
    }
    return { profile:structuredClone(profile), imported, skipped };
  }

  /** Replace only the local guest secret; the stable player identity and progression are unchanged. */
  rotateGuestCredential(profileToken: string): CreateServerProfileResult {
    const oldCredential = this.requireCredential(profileToken);
    const profile = this.playersById.get(oldCredential.playerId);
    if (!profile) throw new Error("INVALID_PROFILE_TOKEN");
    let nextToken = this.tokenFactory();
    while (this.credentialsByToken.has(nextToken)) nextToken = this.tokenFactory();
    const now = this.nowFactory();
    this.credentialsByToken.delete(profileToken);
    this.credentialsByToken.set(nextToken, { kind:"GUEST_LOCAL", profileToken:nextToken, playerId:profile.playerId, createdAt:now, lastUsedAt:now });
    this.persist();
    return { profileToken:nextToken, profile:structuredClone(profile) };
  }

  recordMatch(profileToken: string, entry: MatchHistoryInput, progressionEvents: ProgressionEvent[] = []): ServerPlayerProfile {
    return this.recordMatchForProfile(this.requireByToken(profileToken), entry, progressionEvents);
  }

  recordMatchForPlayerId(playerId: string, entry: MatchHistoryInput, progressionEvents: ProgressionEvent[] = []): ServerPlayerProfile {
    const profile = this.playersById.get(String(playerId));
    if (!profile) throw new Error("PLAYER_NOT_FOUND");
    return this.recordMatchForProfile(profile, entry, progressionEvents);
  }

  private recordMatchForProfile(profile: ServerPlayerProfile, entry: MatchHistoryInput, progressionEvents: ProgressionEvent[]): ServerPlayerProfile {
    const record = normalizeMatchHistoryRecord(entry);
    if (profile.matchHistory.some((existing) => existing.matchId === record.matchId || existing.roomId === record.roomId)) return structuredClone(profile);
    profile.matchHistory.unshift(structuredClone(record));
    profile.matchHistory = profile.matchHistory.slice(0, this.maxHistoryEntries);
    const bucket = record.mode === "TRAINING" ? profile.stats.training : record.mode === "TUTORIAL" ? profile.stats.tutorial : record.mode === "RANKED" ? profile.stats.ranked : profile.stats.pvp;
    bucket.matches += 1;
    if (record.result === "WIN") bucket.wins += 1;
    else if (record.result === "DRAW") bucket.draws += 1;
    else bucket.losses += 1;
    profile.stats.totalTurnsPlayed += record.turns;
    profile.stats.totalDurationMs += record.durationMs ?? 0;
    const department = record.primaryDepartment || "MIXED";
    const departmentTally = profile.stats.departmentUsage[department] ?? (profile.stats.departmentUsage[department] = { matches:0, wins:0, losses:0, draws:0 });
    departmentTally.matches += 1;
    if (record.result === "WIN") departmentTally.wins += 1;
    else if (record.result === "DRAW") departmentTally.draws += 1;
    else departmentTally.losses += 1;
    const deckKey = record.selectedDeckId ?? `name:${record.deckName}`;
    const deckTally = profile.stats.deckUsage[deckKey] ?? (profile.stats.deckUsage[deckKey] = { matches:0, wins:0, losses:0, draws:0, deckId:record.selectedDeckId, deckName:record.deckName });
    deckTally.matches += 1;
    if (record.result === "WIN") deckTally.wins += 1;
    else if (record.result === "DRAW") deckTally.draws += 1;
    else deckTally.losses += 1;
    if (record.mode === "TRAINING" || record.mode === "TUTORIAL") {
      profile.updatedAt = this.nowFactory();
      this.persist();
      return structuredClone(profile);
    }
    profile.meta = processProgressionEvents(profile.meta, progressionEvents, this.progressionConfig, this.nowFactory()).profile;
    profile.stats.matchesPlayed += 1;
    if (record.result === "WIN") profile.stats.wins += 1;
    else if (record.result === "DRAW") profile.stats.draws += 1;
    else profile.stats.losses += 1;
    if (record.outcome === "RESIGN_LOSS") profile.stats.resignLosses += 1;
    if (record.mode === "RANKED") profile.stats.rankedMatches += 1;
    else if (record.mode === "FRIENDLY") profile.stats.friendlyMatches += 1;
    profile.stats.pvp.matches = profile.stats.matchesPlayed;
    profile.stats.pvp.wins = profile.stats.wins;
    profile.stats.pvp.losses = profile.stats.losses;
    profile.stats.pvp.draws = profile.stats.draws;
    profile.updatedAt = this.nowFactory();
    this.persist();
    return structuredClone(profile);
  }

  recordRankedMatch(result: { roomId:string; p1PlayerId:string; p2PlayerId:string; winnerPlayerId:string | null; reason:string; settledAt?:number }): { replayed:boolean; p1:PlayerRankedProfile; p2:PlayerRankedProfile } {
    const p1 = this.playersById.get(result.p1PlayerId);
    const p2 = this.playersById.get(result.p2PlayerId);
    if (!p1 || !p2) throw new Error("PLAYER_NOT_FOUND");
    if (!this.progressionEnabled) return { replayed:false, p1:structuredClone(p1.ranked), p2:structuredClone(p2.ranked) };
    const existing1 = p1.ranked.recentResults.find((item) => item.roomId === result.roomId);
    const existing2 = p2.ranked.recentResults.find((item) => item.roomId === result.roomId);
    if (existing1 && existing2) return { replayed:true, p1:structuredClone(p1.ranked), p2:structuredClone(p2.ranked) };
    if (existing1 || existing2) throw new Error("RANKED_SETTLEMENT_INCONSISTENT");

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
    const p1Outcome: RankedOutcome = isDraw ? "DRAW" : p1Won ? "WIN" : result.reason === "RESIGN" ? "RESIGN_LOSS" : "LOSS";
    const p2Outcome: RankedOutcome = isDraw ? "DRAW" : p2Won ? "WIN" : result.reason === "RESIGN" ? "RESIGN_LOSS" : "LOSS";

    const apply = (profile:ServerPlayerProfile, opponentBefore:number, before:number, after:number, outcome:RankedOutcome) => {
      const ranked = profile.ranked;
      const previousStanding = { tierId:ranked.tierId, division:ranked.division };
      const previousPlacements = ranked.placementsPlayed;
      ranked.seasonId = this.rankedConfig.currentSeasonId;
      ranked.phase = this.rankedConfig.phase;
      ranked.rating = after;
      ranked.peakRating = Math.max(ranked.peakRating, after);
      ranked.matchesPlayed += 1;
      ranked.placementsPlayed = Math.min(ranked.placementsRequired, ranked.placementsPlayed + 1);
      ranked.status = ranked.placementsPlayed >= ranked.placementsRequired ? "RATED" : "PLACEMENT";
      if (outcome === "WIN") ranked.wins += 1;
      else if (outcome === "DRAW") ranked.draws += 1;
      else { ranked.losses += 1; if (outcome === "RESIGN_LOSS") ranked.resignLosses += 1; }
      ranked.recentResults.unshift({ roomId:result.roomId, seasonId:ranked.seasonId, outcome, ratingBefore:before, ratingAfter:after, ratingDelta:after-before, opponentRatingBefore:opponentBefore, settledAt });
      ranked.recentResults = ranked.recentResults.slice(0, 100);
      const nextStanding = rankedStanding(after, this.rankedContentConfig);
      ranked.tierId = nextStanding.tierId;
      ranked.division = nextStanding.division;
      const rankLabel = (standing:{ tierId:string; division:string | null }) => standing.division ? `${standing.tierId} ${standing.division}` : standing.tierId;
      const rankedStats = profile.stats.ranked;
      rankedStats.currentMMR = after;
      rankedStats.peakMMR = Math.max(rankedStats.peakMMR, after);
      rankedStats.currentRank = rankLabel(nextStanding);
      const nextRankOrder = this.rankedContentConfig.ranks.find((item) => item.id === nextStanding.tierId)?.order ?? 0;
      const peakRankOrder = this.rankedContentConfig.ranks.find((item) => item.id === (rankedStats.peakRank?.split(" ")[0] ?? ""))?.order ?? 0;
      if (!rankedStats.peakRank || nextRankOrder > peakRankOrder) rankedStats.peakRank = rankLabel(nextStanding);
      const history = profile.matchHistory.find((item) => item.roomId === result.roomId || item.matchId === result.roomId);
      if (history) {
        history.ratingBefore = before;
        history.ratingAfter = after;
        history.ratingDelta = after - before;
        history.rankBefore = rankLabel(previousStanding);
        history.rankAfter = rankLabel(nextStanding);
        history.seasonId = ranked.seasonId;
      }
      const standingChanged = previousStanding.tierId !== nextStanding.tierId || previousStanding.division !== nextStanding.division;
      if (standingChanged) ranked.lastRankChangedAt = settledAt;
      const rankConfig = this.rankedContentConfig.ranks.find((item) => item.id === nextStanding.tierId);
      if (previousStanding.tierId !== nextStanding.tierId && rankConfig?.rewards?.length) {
        profile.meta = applyRewardGrant(profile.meta, rewardGrantFromRewardItems("ranked", `ranked:${ranked.seasonId}:tier:${nextStanding.tierId}`, rankConfig.rewards, settledAt), settledAt).profile;
      }
      if (previousPlacements < ranked.placementsRequired && ranked.placementsPlayed >= ranked.placementsRequired) {
        const season = this.rankedContentConfig.seasons.find((item) => item.id === ranked.seasonId);
        if (season?.rewards?.length) profile.meta = applyRewardGrant(profile.meta, rewardGrantFromRewardItems("ranked", `ranked:${ranked.seasonId}:placements`, season.rewards, settledAt), settledAt).profile;
      }
      const progressionEvents: ProgressionEvent[] = [];
      if (standingChanged) progressionEvents.push({
        id:`${result.roomId}:progress:${profile.playerId}:rank`, type:"RANK_CHANGED", playerId:profile.playerId,
        matchId:result.roomId, mode:"RANKED", timestamp:settledAt,
        payload:{ previousTierId:previousStanding.tierId, tierId:nextStanding.tierId, division:nextStanding.division, rating:after }
      });
      if (previousPlacements < ranked.placementsRequired && ranked.placementsPlayed >= ranked.placementsRequired) progressionEvents.push({
        id:`${result.roomId}:progress:${profile.playerId}:placement`, type:"SEASON_PLACEMENT_COMPLETED", playerId:profile.playerId,
        matchId:result.roomId, mode:"RANKED", timestamp:settledAt,
        payload:{ seasonId:ranked.seasonId, placements:ranked.placementsPlayed }
      });
      if (progressionEvents.length) profile.meta = processProgressionEvents(profile.meta, progressionEvents, this.progressionConfig, settledAt).profile;
      profile.updatedAt = settledAt;
    };
    apply(p1, p2Before, p1Before, p1After, p1Outcome);
    apply(p2, p1Before, p2Before, p2After, p2Outcome);
    this.persist();
    return { replayed:false, p1:structuredClone(p1.ranked), p2:structuredClone(p2.ranked) };
  }

  /** Legacy combined snapshot retained for compatibility and one-way migration. */
  snapshot(): PlayerProfileStoreSnapshot {
    const tokenByPlayer = new Map<string, string>();
    for (const credential of this.credentialsByToken.values()) if (!tokenByPlayer.has(credential.playerId)) tokenByPlayer.set(credential.playerId, credential.profileToken);
    return {
      version: 1,
      records: [...this.playersById.values()].flatMap((profile) => {
        const profileToken = tokenByPlayer.get(profile.playerId);
        return profileToken ? [{ profileToken, profile: structuredClone(profile) }] : [];
      })
    };
  }

  playerSnapshot(): PlayerDataStoreSnapshot {
    return { version:2, players:[...this.playersById.values()].map((profile) => structuredClone(profile)) };
  }

  credentialSnapshot(): GuestCredentialStoreSnapshot {
    return { version:1, credentials:[...this.credentialsByToken.values()].map((credential) => structuredClone(credential)) };
  }

  private get usesSeparatedStores(): boolean {
    return Boolean(this.playerPersistence && this.credentialPersistence);
  }

  private requireCredential(profileToken: string): GuestCredentialRecord {
    const credential = this.credentialsByToken.get(profileToken);
    if (!credential) throw new Error("INVALID_PROFILE_TOKEN");
    return credential;
  }

  private normalizeRankedStanding(profile: ServerPlayerProfile): ServerPlayerProfile {
    const standing = rankedStanding(profile.ranked.rating, this.rankedContentConfig);
    profile.ranked.tierId = standing.tierId;
    profile.ranked.division = standing.division;
    return profile;
  }

  private requireByToken(profileToken: string): ServerPlayerProfile {
    const credential = this.requireCredential(profileToken);
    const profile = this.playersById.get(credential.playerId);
    if (!profile) throw new Error("INVALID_PROFILE_TOKEN");
    return profile;
  }

  private restoreSeparated(): boolean {
    if (!this.usesSeparatedStores) return false;
    const playerSnapshot = this.playerPersistence?.load();
    const credentialSnapshot = this.credentialPersistence?.load();
    let restored = false;
    let migrated = false;
    if ((playerSnapshot?.version === 1 || playerSnapshot?.version === 2 || playerSnapshot?.version === 3) && Array.isArray(playerSnapshot.players)) {
      for (const raw of playerSnapshot.players) {
        if (!raw?.profileId && !raw?.playerId) continue;
        const normalized = normalizeProfile(raw, this.rankedConfig);
        let profile = migrateLegacyCollection(normalized, this.starterCards, this.nowFactory());
        if (this.alphaPlaytest) profile = { ...profile, meta: applyAlphaPlaytestCosmeticGrant(profile.meta, this.nowFactory()) };
        const grantsBeforeMilestones = profile.meta.rewardGrants.length;
        profile = { ...profile, meta: applyLevelMilestoneRewards(profile.meta, this.levelMilestones, 0, profile.meta.progression.level, this.nowFactory()).profile };
        profile.matchHistory = profile.matchHistory.slice(0, this.maxHistoryEntries);
        migrated ||= profile.meta.profileVersion !== normalized.meta.profileVersion || profile.meta.rewardGrants.length !== normalized.meta.rewardGrants.length || profile.meta.rewardGrants.length !== grantsBeforeMilestones || profile.matchHistory.length !== normalized.matchHistory.length;
        if (!profile.playerId) continue;
        this.normalizeRankedStanding(profile);
        this.playersById.set(profile.playerId, profile);
        restored = true;
      }
    }
    if (credentialSnapshot?.version === 1 && Array.isArray(credentialSnapshot.credentials)) {
      for (const raw of credentialSnapshot.credentials) {
        if (!raw?.profileToken || !raw?.playerId || raw.kind !== "GUEST_LOCAL") continue;
        if (!this.playersById.has(raw.playerId)) continue;
        this.credentialsByToken.set(raw.profileToken, structuredClone(raw));
      }
    }
    if (migrated) this.persistSeparated();
    return restored && this.credentialsByToken.size > 0;
  }

  private restoreLegacy(): boolean {
    const snapshot = this.legacyPersistence?.load();
    if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.records)) return false;
    let restored = false;
    let migrated = false;
    for (const record of snapshot.records) {
      if (!record?.profileToken || !record.profile?.profileId) continue;
       const normalized = normalizeProfile(record.profile, this.rankedConfig);
       let profile = migrateLegacyCollection(normalized, this.starterCards, this.nowFactory());
       if (this.alphaPlaytest) profile = { ...profile, meta: applyAlphaPlaytestCosmeticGrant(profile.meta, this.nowFactory()) };
       const grantsBeforeMilestones = profile.meta.rewardGrants.length;
       profile = { ...profile, meta: applyLevelMilestoneRewards(profile.meta, this.levelMilestones, 0, profile.meta.progression.level, this.nowFactory()).profile };
       profile.matchHistory = profile.matchHistory.slice(0, this.maxHistoryEntries);
       migrated ||= profile.meta.profileVersion !== normalized.meta.profileVersion || profile.meta.rewardGrants.length !== normalized.meta.rewardGrants.length || profile.meta.rewardGrants.length !== grantsBeforeMilestones || profile.matchHistory.length !== normalized.matchHistory.length;
      if (!profile.playerId) continue;
      this.normalizeRankedStanding(profile);
      this.playersById.set(profile.playerId, profile);
      const now = Number(profile.updatedAt || profile.createdAt || this.nowFactory());
      this.credentialsByToken.set(record.profileToken, { kind:"GUEST_LOCAL", profileToken:record.profileToken, playerId:profile.playerId, createdAt:Number(profile.createdAt || now), lastUsedAt:now });
      restored = true;
    }
    if (migrated && this.usesSeparatedStores) this.persistSeparated();
    return restored;
  }

  private restore(): void {
    if (this.restoreSeparated()) return;
    if (this.restoreLegacy()) {
      if (this.usesSeparatedStores) {
        this.migratedLegacyStore = true;
        this.persistSeparated();
      }
    }
  }

  private persistSeparated(): void {
    this.playerPersistence?.save(this.playerSnapshot());
    this.credentialPersistence?.save(this.credentialSnapshot());
  }

  private persist(): void {
    if (this.usesSeparatedStores) {
      this.persistSeparated();
      return;
    }
    this.legacyPersistence?.save(this.snapshot());
  }
}
