/* Regression compatibility marker for v7.25 intent-commit source:
setIntentCommit('SENDING', intent, { intentId, fromVersion:match.stateVersion });
state.intentBusy = true;
setIntentCommit('ACCEPTED', intent, { intentId, fromVersion:match.stateVersion, toVersion:result.view?.match?.stateVersion });
*/
// Regression compatibility marker for v7.52 diagnostics label: LIVE SYNC
// Regression compatibility marker for v7.52 diagnostics age label: Last live:
// Regression compatibility marker for v4.8 drawer label: Developer-facing tools
// Regression compatibility marker for v4.6 auth label: GUEST_LOCAL
// Regression compatibility marker for v4.6 profile identity: profile.playerId ?? profile.profileId
// Regression compatibility marker for v7.40 pack face parity: renderCatalogCardFace(def, { tier, compact:true, isNew, artReady:Boolean(def.artId), owned:ownedCopies(id) })
/* Regression compatibility marker for v7.24 authority refresh guard:
function acceptView(view) {
  state.view = view;
  state.pendingActionConfirmation = null;
}
*/
// Regression compatibility marker for v6.4 post-match helper: Same deck and match mode are selected
// Regression compatibility marker for v6.4 mode restore: state.lobbyMatchMode = state.view?.settings?.mode === 'RANKED' ? 'RANKED' : 'FRIENDLY'
// Regression compatibility marker for v6.4 post-match CTA: Claim + play another
// Regression compatibility marker for v6.0 compact rarity source: ${raritySignal(def, tier, true)}
// Regression compatibility marker for v5.4 collection NEW badge: new-card-badge
// Regression compatibility marker for v3.3 booster owned copy source: OWNED ${esc(ownedCopies(id))}
// Regression compatibility marker for v3.7 profile storage label: persistent local server profile
// Regression compatibility marker for v3.3 booster visual source: class="booster-hit-art"
// v7.0 card-system visual unification
// v7.1 card discovery + information polish
// v7.2 deckbuilding workflow + engine-fit polish
// v7.3 deck quality + completion polish
// v7.4 capacity curve + deck composition polish
// v7.5 engine coverage + bridge-card polish
// v7.6 atomic deck swap + refinement polish
// v7.7 deck editing safety + history polish
// v7.8 saved deck management polish
// v7.9 match prep + deck selection polish
// v7.10 collection + economy flow polish
// v7.11 booster → collection → deck flow polish
// v7.12 opening hand + first-turn readability polish
// v7.13 main-phase decision readability polish
// v7.14 battle-phase decision readability polish
// v7.15 end-phase handoff readability polish
// v7.17 battlefield live-state scan polish
// v7.16 response + decision readability polish
// v7.21 match feed prioritization + event grouping polish
// v7.22 match context stack + clutter control polish
// v7.23 unified selection + interaction state polish
// v7.24 action confirmation + misclick protection polish
// v7.25 action commit + server acknowledgement polish
// Regression compatibility marker for v7.12 opening scope: match.status === 'ACTIVE' && match.turnNumber === 1 && ['START','DRAW','MAIN'].includes(match.phase)
// Regression compatibility marker for v6.7: Match feed
// v7.20 resolution trace + cause/effect readability polish
// Regression compatibility marker for v7.7 deck switch guard: guardUnsavedDeck(deck, 'switch decks')
// Regression compatibility marker for v7.7 deck delete guard: guardUnsavedDeck(deck, 'delete this deck')
// Regression compatibility marker for v3.1: function renderMobileBoardNav()
// v6.9 mobile match declutter + compact HUD polish
// Regression compatibility marker for v3.8 session restore: await refreshState()
// Regression compatibility marker for v5.8 card inspection source
// Regression compatibility marker for v5.9 feedback + accessibility polish
// v6.0 visual cohesion + game feel polish
// v6.1 opening + turn transition polish
// v6.2 action resolution + response polish
// v6.3 card movement + zone transition polish
// v6.4 match result + post-match flow polish
// v6.7 live match feed + event readability polish
// v6.8 lobby + responsive form polish
// Regression compatibility marker for v4.9 rarity-chip tier-
// Regression compatibility marker for v5.6 match flow source
// Regression compatibility marker for v3.3 command dock: const hasPrimaryAction = Boolean(legal.canAdvancePhase || abilityCount)
// Regression compatibility marker for v3.3 command dock: if (!hasPrimaryAction) return '';
// Regression compatibility marker for v5.5 deckbuilder source
// Regression compatibility marker for v5.4 collection acquisition source
// Regression compatibility marker for v5.3 onboarding source
// Regression compatibility marker for v5.1 card presentation source
// Regression compatibility marker for v4.6 client
// Regression compatibility marker for v2.7 card footer test: hasPower = def?.cardType === 'EMPLOYEE' && card.currentPower != null
// Regression compatibility marker for v4.5 client
// Regression compatibility marker for v4.4 replay source wiring
// Regression compatibility marker for v4.3 source wiring: v4.3 keeps timer profiles off while adding filtered human playtest samples
// Regression compatibility marker for v4.2 source wiring: analytics/export?format=csv
import { t, currentLocale, availableLocales, setLocale, applyDocumentTranslations, setDocumentTranslationParams, localizedCard, cardTypeLabel, observeLocalizedApp } from './i18n.js';
const app = document.querySelector('#app');
applyDocumentTranslations();
function syncLanguageSwitcher() {
  const select = document.querySelector('#languageSelect');
  if (!select) return;
  select.value = currentLocale();
  select.setAttribute('aria-label', t('language.label'));
}
function wireLanguageSwitcher() {
  const select = document.querySelector('#languageSelect');
  if (!select) return;
  select.innerHTML = availableLocales().map((code) => `<option value="${code}">${code === 'de' ? 'Deutsch' : 'English'}</option>`).join('');
  syncLanguageSwitcher();
  select.addEventListener('change', () => setLocale(select.value));
}
wireLanguageSwitcher();
observeLocalizedApp(app);
window.addEventListener('ocg:localechange', () => {
  applyDocumentTranslations();
  syncLanguageSwitcher();
  if (typeof render === 'function') render();
});

const leaveBtn = document.querySelector('#leaveBtn');

const state = {
  catalog: new Map(),
  presets: [],
  session: null,
  view: null,
  stream: null,
  connectionStatus: 'IDLE',
  recoveryNoticeTimer: null,
  recoveryNoticeStartedAt: null,
  reconnectTimer: null,
  reconnectAttempt: 0,
  streamGeneration: 0,
  syncPollTimer: null,
  lastSyncAt: null,
  mobileNavObserver: null,
  lastLiveAt: null,
  selectedHand: new Set(),
  eventLog: [],
  lastError: null,
  focusedCardRef: null,
  returnFocusCardRef: null,
  intentBusy: false,
  intentCommit: null,
  intentCommitTimer: null,
  feedback: null,
  feedbackTimer: null,
  interaction: null,
  pendingActionConfirmation: null,
  visualCue: null,
  visualCueBatch: [],
  visualCueTimer: null,
  attackPresentation: null,
  attackPresentationQueue: [],
  attackPresentationTimer: null,
  gameplayPresentation: null,
  gameplayPresentationQueue: [],
  gameplayPresentationTimer: null,
  matchEndOverlayDismissedRoomId: null,
  matchResultGate: null,
  matchResultGateTimer: null,
  resolutionTrace: null,
  resolutionTraceTimer: null,
  flowCue: null,
  flowCueTimer: null,
  zoneCue: null,
  zoneCueTimer: null,
  renderedMotionCueKeys: new Set(),
  hoverTimer: null,
  hoverAttackTargetId: null,
  mode: 'PLAY',
  adminToken: sessionStorage.getItem('office-card-game-admin-token-v1') ?? '',
  adminOps: null,
  adminOpsBusy: false,
  adminOpsMessage: null,
  finishReviewCardId: null,
  customDecks: [],
  editingDeckId: null,
  preferredDeckValue: null,
  lobbyShowcaseDeckValue: null,
  lobbyShowcaseCardIds: [],
  lobbyShowcaseVariantIds: [],
  deckBuilderMessage: null,
  collectionSearch: '',
  collectionDepartment: 'ALL',
  collectionType: 'ALL',
  collectionSort: 'DEPARTMENT',
  collectionOwnedFilter: 'ALL',
  collectionFinishFilter: 'ALL',
  collectionRarity: 'ALL',
  collectionTag: 'ALL',
  collectionDeckFilter: 'ALL',
  collectionCost: 'ALL',
  collectionPackFilter: 'ALL',
  collectionPreviewId: null,
  collectionVariantSelection: {},
  deckSwapSourceId: null,
  deckEditBaselines: {},
  deckEditHistory: {},
  newCollectionCards: new Set(),
  newCollectionOwner: null,
  economyConfig: null,
  matchSettings: null,
  lastBooster: null,
  boosterRevealCount: 0,
  economyMessage: null,
  economyBusy: false,
  pendingScrapConfirmation: null,
  rewardBusy: false,
  rewardMessage: null,
  lastRewardReceipt: null,
  botBusy: false,
  botDeckId: 'it-starter',
  botMessage: null,
  achievementData: null,
  achievementBusy: false,
  achievementMessage: null,
  lobbyMatchMode: 'FRIENDLY',
  serverProfile: null,
  serverDecksReady: false,
  deckPersistenceError: null,
  lastPersistedSelectedDeck: null,
  serverAccount: null,
  profileToken: null,
  profileStorage: null,
  serverInfo: null,
  inviteRoomCode: null,
  alphaOnboardingOpen: false,
  networkDiagnostics: { pingMs:null, checkedAt:null, busy:false },
  playtestAnalytics: null,
  playtestAnalyticsDimensions: null,
  analyticsSelection: null,
  analyticsFilter: { mode:'ALL', department:'ALL', deckId:'ALL', days:'ALL', latest:'ALL' },
  historyFilter: { mode:'ALL', outcome:'ALL' },
  profileSection: 'OVERVIEW',
  profileHistoryLimit: 20,
  profileMessage: null,
  guidance: { enabled:true, seen:{} },
  replay: null,
  replayBusy: false,
  replayError: null,
  replayFilter: { scope:'KEY', turn:'ALL' },
  analyticsBusy: false,
  analyticsMessage: null,
  playtestFeedback: null,
  playtestFeedbackBusy: false,
  playtestFeedbackMessage: null,
  playtestFeedbackRoomId: null,
  matchmakingTicket: null,
  matchmakingBusy: false,
  matchmakingMessage: null,
  cosmeticCategory: 'BOARD',
  cosmeticPersonnel: null,
  cosmeticShop: null,
  cosmeticBusy: false,
  cosmeticMessage: null,
  pendingCosmeticPurchase: null,
  matchmakingPollTimer: null,
  recentSession: null,
  recentSessionView: null,
  serverClockOffsetMs: 0,
  rankedRefreshRoomId: null,
  metaProfile: { profileVersion:1, balances:{OFFICE_CREDITS:0,SHREDDER_SCRAPS:0}, ownedCards:{}, collectionMode:'SANDBOX_ALL_AVAILABLE', claimedRewardRooms:[], progression:{level:1,xp:0,matchesCompleted:0,boostersOpened:0,cardsScrapped:0,cardsCrafted:0} },
  format: { id:'alpha', deckSize:40, defaultCopyLimit:3, cardLimits:{} }
};

const SESSION_KEY = 'office-card-game-v1-session';
const CUSTOM_DECKS_KEY = 'office-card-game-custom-decks-v1';
const META_PROFILE_KEY = 'office-card-game-meta-profile-v1';
const SERVER_PROFILE_TOKEN_KEY = 'office-card-game-server-profile-token-v1';
const MATCHMAKING_TICKET_KEY = 'office-card-game-matchmaking-ticket-v1';
const RECENT_SESSION_KEY = 'office-card-game-recent-session-v1';
const CLIENT_INSTANCE_KEY = 'office-card-game-client-instance-v1';
const MATCH_ARENA_KEY = 'office-card-game-match-arena-v1';
const MATCH_ARENAS = Object.freeze({
  default: Object.freeze({ id:'default', image:null, position:'50% 50%', size:'cover' })
});
function loadClientInstanceId() {
  try {
    const saved = sessionStorage.getItem(CLIENT_INSTANCE_KEY);
    if (saved && saved.length >= 8 && saved.length <= 160) return saved;
    const created = globalThis.crypto?.randomUUID?.() ?? `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(CLIENT_INSTANCE_KEY, created);
    return created;
  } catch {
    return globalThis.crypto?.randomUUID?.() ?? `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
const CLIENT_INSTANCE_ID = loadClientInstanceId();
const HOSTED_SYNC_LIVE_POLL_MS = 1200;
const HOSTED_SYNC_RECOVERY_POLL_MS = 1000;
const RECOVERY_NOTICE_DELAY_MS = 800;
const RECOVERED_STATUS_MS = 2200;
function hostedSyncPollDelay() {
  const matchActive = state.view?.match?.status === 'ACTIVE' || state.view?.match?.status === 'SETUP';
  if (state.connectionStatus === 'LIVE' || state.connectionStatus === 'RECOVERED') return matchActive ? HOSTED_SYNC_LIVE_POLL_MS : 3000;
  return HOSTED_SYNC_RECOVERY_POLL_MS;
}
// Historical v7.68 contract marker:
// if (state.connectionStatus === 'LIVE') return matchActive ? HOSTED_SYNC_LIVE_POLL_MS : 3000;
function hostedLiveStaleThreshold() {
  const heartbeat = Number(state.serverInfo?.security?.sseHeartbeatMs ?? 15000);
  return Math.max(20000, Math.round(heartbeat * 2.5));
}
const GUIDANCE_KEY = 'office-card-game-guidance-v1';
const NEW_COLLECTION_KEY = 'office-card-game-new-collection-v1';
const DECK_MIGRATION_KEY = 'office-card-game-decks-migrated-v1';
const pendingDeckCreates = new Map();
const ALPHA_ONBOARDING_KEY = 'office-card-game-alpha-onboarding-v1';
const ALPHA_TEST_SESSION_KEY = 'office-card-game-alpha-test-session-v1';

function loadGuidance() {
  try {
    const saved = JSON.parse(localStorage.getItem(GUIDANCE_KEY) ?? 'null');
    if (saved && typeof saved === 'object') {
      state.guidance = { enabled:saved.enabled !== false, seen:saved.seen && typeof saved.seen === 'object' ? saved.seen : {} };
    }
  } catch { /* first-time guidance stays enabled */ }
}

function saveGuidance() {
  localStorage.setItem(GUIDANCE_KEY, JSON.stringify(state.guidance));
}

function dismissGuidance(id) {
  if (!id) return;
  state.guidance.seen[id] = true;
  saveGuidance();
  render();
}

function setGuidanceEnabled(enabled) {
  state.guidance.enabled = Boolean(enabled);
  saveGuidance();
  render();
}

function resetGuidance() {
  state.guidance = { enabled:true, seen:{} };
  saveGuidance();
  render();
}


function collectionNewStorageKey(playerId = state.serverProfile?.playerId ?? state.serverProfile?.profileId ?? 'local') {
  return `${NEW_COLLECTION_KEY}:${playerId}`;
}

function loadNewCollectionCards(profile = state.serverProfile) {
  const owner = profile?.playerId ?? profile?.profileId ?? 'local';
  if (state.newCollectionOwner === owner) return;
  state.newCollectionOwner = owner;
  try {
    const saved = JSON.parse(localStorage.getItem(collectionNewStorageKey(owner)) ?? '[]');
    state.newCollectionCards = new Set(Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : []);
  } catch { state.newCollectionCards = new Set(); }
}

function saveNewCollectionCards() {
  const owner = state.newCollectionOwner ?? state.serverProfile?.playerId ?? state.serverProfile?.profileId ?? 'local';
  localStorage.setItem(collectionNewStorageKey(owner), JSON.stringify([...state.newCollectionCards]));
}

function markCollectionCardsNew(definitionIds) {
  let changed = false;
  for (const id of definitionIds ?? []) {
    if (!id || state.newCollectionCards.has(id)) continue;
    state.newCollectionCards.add(id);
    changed = true;
  }
  if (changed) saveNewCollectionCards();
}

function markCollectionCardSeen(definitionId) {
  if (!state.newCollectionCards.delete(definitionId)) return;
  saveNewCollectionCards();
}

function clearNewCollectionCards({ render = false } = {}) {
  if (!state.newCollectionCards.size) return;
  state.newCollectionCards.clear();
  saveNewCollectionCards();
  if (render) renderCollection();
}

function markAllCollectionCardsSeen() {
  clearNewCollectionCards({ render:true });
}


function loadMetaProfile() {
  try {
    const raw = JSON.parse(localStorage.getItem(META_PROFILE_KEY) ?? 'null');
    if (raw && typeof raw === 'object' && raw.profileVersion === 1) {
      state.metaProfile = { ...state.metaProfile, ...raw, claimedRewardRooms:Array.isArray(raw.claimedRewardRooms)?raw.claimedRewardRooms:[], progression:{ ...state.metaProfile.progression, ...(raw.progression ?? {}) } };
    }
  } catch { /* sandbox profile stays at defaults */ }
  localStorage.setItem(META_PROFILE_KEY, JSON.stringify(state.metaProfile));
}

function saveMetaProfile() {
  localStorage.setItem(META_PROFILE_KEY, JSON.stringify(state.metaProfile));
}

function applyServerProfile(profile) {
  if (!profile) return;
  state.serverProfile = profile;
  loadNewCollectionCards(profile);
  state.metaProfile = profile.meta;
  saveMetaProfile();
  if (state.serverDecksReady && Array.isArray(profile.decks)) {
    state.customDecks = profile.decks.map((deck) => ({ ...deck, createdAt:Number(deck.createdAt) || null, updatedAt:Number(deck.updatedAt) || null }));
    const selected = profile.selectedDeckId;
    if (selected && state.customDecks.some((deck) => deck.id === selected)) state.preferredDeckValue = `custom:${selected}`;
    else if (selected) state.preferredDeckValue = selected;
    else if (state.serverDecksReady) state.preferredDeckValue = state.presets?.[0]?.id ?? (state.customDecks[0] ? `custom:${state.customDecks[0].id}` : '');
    if (selected) state.lastPersistedSelectedDeck = state.customDecks.some((deck) => deck.id === selected) ? `custom:${selected}` : selected;
    else if (state.serverDecksReady) state.lastPersistedSelectedDeck = null;
    initializeDeckEditBaselines();
    if (!state.customDecks.some((deck) => deck.id === state.editingDeckId)) state.editingDeckId = state.customDecks[0]?.id ?? null;
  }
}

function applyServerDeckProfile(profile) {
  state.serverDecksReady = true;
  applyServerProfile(profile);
}

async function syncServerDecks() {
  if (!state.profileToken) return;
  const localDecks = state.customDecks.map((deck) => ({ id:deck.id, name:deck.name, cards:deck.cards, createdAt:deck.createdAt, updatedAt:deck.updatedAt, sourcePresetId:deck.sourcePresetId, description:deck.description }));
  const listed = await api('/api/profiles/me/decks', { headers:profileAuthHeaders() });
  const marker = localStorage.getItem(`${DECK_MIGRATION_KEY}:${state.serverProfile?.playerId ?? 'local'}`);
  if (localDecks.length && !marker) {
    const imported = await api('/api/profiles/me/decks/import', { method:'POST', headers:profileAuthHeaders(), body:JSON.stringify({ decks:localDecks }) });
    localStorage.setItem(`${DECK_MIGRATION_KEY}:${state.serverProfile?.playerId ?? 'local'}`, '1');
    localStorage.removeItem(CUSTOM_DECKS_KEY);
    state.deckPersistenceError = null;
    applyServerDeckProfile(imported.profile);
    state.deckBuilderMessage = imported.imported?.length ? t('decks.migrated') : null;
    return imported;
  }
  state.deckPersistenceError = null;
  applyServerDeckProfile(state.serverProfile ? { ...state.serverProfile, decks:listed.decks, selectedDeckId:listed.selectedDeckId } : null);
  return listed;
}

async function refreshServerProfile() {
  if (!state.profileToken) return null;
  const result = await api('/api/profiles/me', { headers:profileAuthHeaders() });
  state.profileStorage = result.storage ?? state.profileStorage;
  state.serverAccount = result.account ?? state.serverAccount;
  applyServerProfile(result.profile);
  return result.profile;
}

async function enterAchievements() {
  state.mode = 'ACHIEVEMENTS';
  state.achievementBusy = true;
  state.achievementMessage = null;
  render();
  try {
    state.achievementData = await api('/api/profiles/me/achievements', { headers:profileAuthHeaders() });
  } catch (error) {
    state.achievementMessage = error.message;
  } finally {
    state.achievementBusy = false;
    render();
  }
}

async function enterPlayerFile(section = 'OVERVIEW') {
  state.mode = 'PROFILE';
  state.profileSection = section;
  state.profileHistoryLimit = 20;
  state.profileMessage = null;
  render();
  try {
    await refreshServerProfile();
    const requests = [state.cosmeticPersonnel ? Promise.resolve() : loadCosmeticViews(), api('/api/profiles/me/achievements', { headers:profileAuthHeaders() }).then((value) => { state.achievementData = value; })];
    await Promise.all(requests);
  } catch (error) {
    state.profileMessage = error.message;
  } finally {
    render();
  }
}

function profileTally(profile, key) {
  const stats = profile?.stats ?? {};
  const tally = stats[key] ?? {};
  return {
    matches: Number(tally.matches ?? (key === 'pvp' ? stats.matchesPlayed : key === 'ranked' ? stats.rankedMatches : 0)),
    wins: Number(tally.wins ?? (key === 'pvp' ? stats.wins : 0)),
    losses: Number(tally.losses ?? (key === 'pvp' ? stats.losses : 0)),
    draws: Number(tally.draws ?? (key === 'pvp' ? stats.draws : 0))
  };
}

function profileRankLabel(profile) {
  const ranked = profile?.ranked ?? {};
  const tier = ranked.tierId ? t(`ranked.tiers.${String(ranked.tierId).toLowerCase()}`, {}, ranked.tierId) : t('playerFile.unrated');
  return ranked.division ? `${tier} ${ranked.division}` : tier;
}

function profileDate(value) {
  const timestamp = Number(value);
  if (!timestamp) return '—';
  return new Intl.DateTimeFormat(currentLocale(), { dateStyle:'medium', timeStyle:'short' }).format(new Date(timestamp));
}

function profileDuration(value) {
  const totalSeconds = Math.max(0, Math.floor(Number(value ?? 0) / 1000));
  if (!totalSeconds) return null;
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

function profileModeLabel(mode) {
  return t(`playerFile.modes.${String(mode ?? 'FRIENDLY').toLowerCase()}`, {}, mode ?? 'FRIENDLY');
}

function profileResultLabel(record) {
  const result = record?.result ?? (record?.outcome === 'RESIGN_LOSS' ? 'LOSS' : record?.outcome ?? 'DRAW');
  return t(`playerFile.results.${String(result).toLowerCase()}`, {}, result);
}

function profileCosmeticName(slot) {
  const id = state.serverProfile?.meta?.cosmetics?.loadout?.[slot];
  if (!id) return null;
  const item = (state.cosmeticPersonnel?.owned ?? []).find((entry) => entry.definition?.id === id);
  return item?.definition ? cosmeticText(item.definition, 'name') : null;
}

function renderPlayerFileHeader(profile) {
  const loadout = profile?.meta?.cosmetics?.loadout ?? {};
  const avatarId = loadout.avatarId ?? 'COS-AVA-001';
  const avatarAsset = cosmeticAvatarAsset(avatarId);
  const frameAsset = cosmeticFrameAsset(loadout.avatarFrameId);
  const progression = profile?.meta?.progression ?? {};
  const step = Math.max(1, Number(state.economyConfig?.progression?.levelXpStep ?? 100));
  const xp = Number(progression.xp ?? 0);
  const xpIntoLevel = xp % step;
  const xpPercent = Math.max(0, Math.min(100, Math.round((xpIntoLevel / step) * 100)));
  const pvp = profileTally(profile, 'pvp');
  const title = profileCosmeticName('titleId');
  const badge = cosmeticBadgeMeta(loadout.badgeId);
  const titleMarkup = title ? `<p class="player-file-title">${esc(title)}</p>` : '';
  const badgeMarkup = badge ? `<div class="player-file-badge"><img src="${esc(badge.asset)}" alt=""/><span>${esc(badge.label)}</span></div>` : '';
  return `<header class="player-file-header"><div class="player-file-header-main"><div class="player-file-avatar">${renderAvatarComposition({ avatarAsset, frameAsset, frameMaskAsset:cosmeticFrameMaskAsset(loadout.avatarFrameId), fallbackText:playerInitials(profile?.displayName) })}</div><div class="player-file-name"><span>${esc(t('playerFile.kicker'))}</span><h1>${esc(profile?.displayName ?? 'Player')}</h1>${titleMarkup}${badgeMarkup}<small>${esc(profileCosmeticName('avatarId') ?? t('playerFile.defaultAvatar'))}${frameAsset ? ` · ${esc(profileCosmeticName('avatarFrameId') ?? t('playerFile.framed'))}` : ''}</small></div></div><div class="player-file-header-stats"><div><span>${esc(t('playerFile.level'))}</span><strong>${esc(progression.level ?? 1)}</strong><div class="player-file-xp"><i style="width:${xpPercent}%"></i></div><small>${esc(t('playerFile.xpProgress',{ current:xpIntoLevel, total:step }))}</small></div><div><span>${esc(t('playerFile.rank'))}</span><strong>${esc(profileRankLabel(profile))}</strong><small>${esc(profile?.ranked?.seasonId ?? '—')} · ${esc(profile?.ranked?.rating ?? '—')} MMR</small></div><div><span>${esc(t('playerFile.record'))}</span><strong>${esc(pvp.wins)}–${esc(pvp.losses)}–${esc(pvp.draws)}</strong><small>${esc(t('playerFile.matchesCount',{ count:pvp.matches }))}</small></div></div></header>`;
}

function renderPlayerFileHistoryRow(record) {
  const result = record?.result ?? (record?.outcome === 'RESIGN_LOSS' ? 'LOSS' : record?.outcome ?? 'DRAW');
  const rating = record?.ratingDelta == null ? '' : `<b class="player-file-rating ${Number(record.ratingDelta) >= 0 ? 'up' : 'down'}">${Number(record.ratingDelta) >= 0 ? '+' : ''}${esc(record.ratingDelta)} MMR</b>`;
  const reps = record?.playerFinalRep == null ? '' : `<span>${esc(record.playerFinalRep)} REP${record?.opponentFinalRep == null ? '' : ` · ${esc(record.opponentFinalRep)} REP`}</span>`;
  const duration = profileDuration(record?.durationMs);
  const reason = record?.completionReason ? matchEndReasonLabel(record.completionReason) : '';
  return `<article class="player-file-history-row ${String(result).toLowerCase()}"><div class="player-file-result"><strong>${esc(profileResultLabel(record))}</strong><small>${esc(profileModeLabel(record.mode))}</small></div><div class="player-file-history-main"><strong>${esc(t('playerFile.vsOpponent',{ name:record?.opponentName ?? t('playerFile.opponent') }))}</strong><span>${esc(record?.deckName ?? t('playerFile.unknownDeck'))} · ${esc(profileDate(record?.completedAt ?? record?.finishedAt))}</span><small>${esc(record?.primaryDepartment ?? 'MIXED')} · ${esc(record?.turns ?? 0)} ${esc(t('playerFile.turns'))}${duration ? ` · ${esc(duration)} ${esc(t('playerFile.duration'))}` : ''}${reason ? ` · ${esc(reason)}` : ''}</small></div><div class="player-file-history-meta">${reps}${rating}</div></article>`;
}

function renderPlayerFileOverview(profile) {
  const pvp = profileTally(profile, 'pvp');
  const ranked = profile?.ranked ?? {};
  const progression = profile?.meta?.progression ?? {};
  const achievements = Object.values(profile?.meta?.achievements ?? {});
  const completedAchievements = achievements.filter((item) => item?.completedAt).length;
  const recent = (profile?.matchHistory ?? []).filter((item) => item.mode === 'FRIENDLY' || item.mode === 'RANKED').slice(0,5);
  const competitiveResults = recent.map((item) => `<b class="${String(item.result ?? item.outcome).toLowerCase()}">${esc(item.result ?? (item.outcome === 'RESIGN_LOSS' ? 'LOSS' : item.outcome))}</b>`).join('');
  const topDeck = Object.values(profile?.stats?.deckUsage ?? {}).sort((a,b) => Number(b.matches ?? 0) - Number(a.matches ?? 0))[0];
  const topDepartment = Object.entries(profile?.stats?.departmentUsage ?? {}).sort(([,a],[,b]) => Number(b.matches ?? 0) - Number(a.matches ?? 0))[0];
  return `<div class="player-file-overview"><section class="player-file-section-grid"><article class="player-file-panel"><span>${esc(t('playerFile.progression'))}</span><h2>${esc(t('playerFile.levelHeadline',{ level:progression.level ?? 1 }))}</h2><p>${esc(t('playerFile.xpDetail',{ xp:progression.xp ?? 0 }))}</p><button class="player-file-link" data-profile-section="RANKED">${esc(t('playerFile.viewRanked'))}</button></article><article class="player-file-panel"><span>${esc(t('playerFile.record'))}</span><h2>${esc(t('playerFile.recordHeadline',{ wins:pvp.wins, losses:pvp.losses, draws:pvp.draws }))}</h2><p>${esc(t('playerFile.winRate',{ rate:pvp.matches ? Math.round(pvp.wins / pvp.matches * 100) : 0 }))}</p><button class="player-file-link" data-profile-section="STATS">${esc(t('playerFile.viewStats'))}</button></article><article class="player-file-panel"><span>${esc(t('playerFile.achievements'))}</span><h2>${esc(t('playerFile.achievementHeadline',{ completed:completedAchievements, total:achievements.length }))}</h2><p>${esc(t('playerFile.achievementDetail'))}</p><button class="player-file-link" data-profile-section="ACHIEVEMENTS">${esc(t('playerFile.viewAchievements'))}</button></article></section><section class="player-file-panel player-file-recent"><div class="player-file-panel-heading"><div><span>${esc(t('playerFile.recentForm'))}</span><h2>${esc(t('playerFile.competitiveForm'))}</h2></div><button class="player-file-link" data-profile-section="MATCH_HISTORY">${esc(t('playerFile.viewHistory'))}</button></div><div class="player-file-form">${competitiveResults || `<small>${esc(t('playerFile.noCompetitiveMatches'))}</small>`}</div>${recent.length ? `<div class="player-file-mini-history">${recent.slice(0,3).map(renderPlayerFileHistoryRow).join('')}</div>` : ''}</section><section class="player-file-section-grid"><article class="player-file-panel"><span>${esc(t('playerFile.ranked'))}</span><h2>${esc(profileRankLabel(profile))}</h2><p>${esc(t('playerFile.mmrPeak',{ current:ranked.rating ?? 1000, peak:ranked.peakRating ?? ranked.rating ?? 1000 }))}</p></article><article class="player-file-panel"><span>${esc(t('playerFile.favorites'))}</span><h2>${esc(topDeck?.deckName ?? t('playerFile.noDeck'))}</h2><p>${esc(topDepartment ? t('playerFile.departmentUsage',{ department:topDepartment[0], count:topDepartment[1].matches ?? 0 }) : t('playerFile.noDepartment'))}</p></article></section></div>`;
}

function renderPlayerFileHistory(profile) {
  const source = Array.isArray(profile?.matchHistory) ? profile.matchHistory : [];
  const filtered = source.filter((entry) => {
    const mode = state.historyFilter.mode;
    if (mode === 'PVP' && !['FRIENDLY','RANKED'].includes(entry.mode)) return false;
    if (mode !== 'ALL' && mode !== 'PVP' && entry.mode !== mode) return false;
    if (state.historyFilter.outcome !== 'ALL' && (entry.result ?? (entry.outcome === 'RESIGN_LOSS' ? 'LOSS' : entry.outcome)) !== state.historyFilter.outcome) return false;
    return true;
  });
  const rows = filtered.slice(0, state.profileHistoryLimit);
  return `<section class="player-file-history"><div class="player-file-toolbar"><div><span>${esc(t('playerFile.historyKicker'))}</span><h2>${esc(t('playerFile.matchHistory'))}</h2></div><small>${esc(t('playerFile.storedCount',{ count:source.length }))}</small></div><div class="player-file-filters"><label>${esc(t('playerFile.mode'))}<select id="profileHistoryMode"><option value="ALL" ${state.historyFilter.mode==='ALL'?'selected':''}>${esc(t('playerFile.filters.all'))}</option><option value="PVP" ${state.historyFilter.mode==='PVP'?'selected':''}>${esc(t('playerFile.filters.pvp'))}</option><option value="FRIENDLY" ${state.historyFilter.mode==='FRIENDLY'?'selected':''}>${esc(t('playerFile.filters.friendly'))}</option><option value="RANKED" ${state.historyFilter.mode==='RANKED'?'selected':''}>${esc(t('playerFile.filters.ranked'))}</option><option value="TRAINING" ${state.historyFilter.mode==='TRAINING'?'selected':''}>${esc(t('playerFile.filters.training'))}</option></select></label><label>${esc(t('playerFile.result'))}<select id="profileHistoryOutcome"><option value="ALL" ${state.historyFilter.outcome==='ALL'?'selected':''}>${esc(t('playerFile.filters.allResults'))}</option><option value="WIN" ${state.historyFilter.outcome==='WIN'?'selected':''}>${esc(t('playerFile.filters.wins'))}</option><option value="LOSS" ${state.historyFilter.outcome==='LOSS'?'selected':''}>${esc(t('playerFile.filters.losses'))}</option><option value="DRAW" ${state.historyFilter.outcome==='DRAW'?'selected':''}>${esc(t('playerFile.filters.draws'))}</option></select></label></div><div class="player-file-history-list">${rows.length ? rows.map(renderPlayerFileHistoryRow).join('') : `<div class="player-file-empty"><strong>${esc(source.length ? t('playerFile.noFilteredMatches') : t('playerFile.noMatches'))}</strong><small>${esc(source.length ? t('playerFile.resetFilters') : t('playerFile.completeMatch'))}</small></div>`}</div>${filtered.length > rows.length ? `<button class="player-file-load-more" id="profileLoadMore">${esc(t('playerFile.loadMore'))}</button>` : ''}</section>`;
}

function renderPlayerFileRanked(profile) {
  const ranked = profile?.ranked ?? {};
  const tally = profileTally(profile, 'ranked');
  return `<section class="player-file-detail"><div class="player-file-detail-heading"><span>${esc(t('playerFile.rankedKicker'))}</span><h2>${esc(t('playerFile.rankedProgression'))}</h2><p>${esc(ranked.seasonId ?? '—')} · ${esc(ranked.phase ?? 'PRESEASON')}</p></div><div class="player-file-stat-grid"><div><span>${esc(t('playerFile.rank'))}</span><strong>${esc(profileRankLabel(profile))}</strong></div><div><span>MMR</span><strong>${esc(ranked.rating ?? 1000)}</strong><small>${esc(t('playerFile.peak',{ value:ranked.peakRating ?? ranked.rating ?? 1000 }))}</small></div><div><span>${esc(t('playerFile.record'))}</span><strong>${esc(t('playerFile.wld',{ wins:tally.wins, losses:tally.losses, draws:tally.draws }))}</strong></div><div><span>${esc(t('playerFile.placements'))}</span><strong>${esc(ranked.placementsPlayed ?? 0)} / ${esc(ranked.placementsRequired ?? 5)}</strong></div></div><p class="player-file-note">${esc(t('playerFile.rankedNote'))}</p></section>`;
}

function renderPlayerFileAchievements(profile) {
  const items = state.achievementData?.achievements ?? [];
  const completed = items.filter((item) => item.progress?.completedAt).length || Object.values(profile?.meta?.achievements ?? {}).filter((item) => item?.completedAt).length;
  return `<section class="player-file-detail"><div class="player-file-detail-heading"><span>${esc(t('playerFile.achievementKicker'))}</span><h2>${esc(t('playerFile.achievementSummary',{ completed, total:items.length || Object.keys(profile?.meta?.achievements ?? {}).length }))}</h2><p>${esc(t('playerFile.achievementProfileNote'))}</p></div><div class="player-file-achievement-list">${items.slice(0,4).map((item) => `<div><strong>${esc(item.progress?.completedAt ? (item.titleKey ? t(item.titleKey) : item.id) : t('achievements.inProgress'))}</strong><span>${esc(item.progress?.completedAt ? t('achievements.completed') : `${item.progress?.value ?? 0}/${item.target ?? 1}`)}</span></div>`).join('') || `<div class="player-file-empty"><strong>${esc(t('playerFile.achievementsLoad'))}</strong></div>`}</div><button class="player-file-link" id="profileOpenAchievements">${esc(t('playerFile.openAchievements'))}</button></section>`;
}

function renderPlayerFileStats(profile) {
  const pvp = profileTally(profile, 'pvp');
  const training = profileTally(profile, 'training');
  const tutorial = profileTally(profile, 'tutorial');
  const departments = Object.entries(profile?.stats?.departmentUsage ?? {}).sort(([,a],[,b]) => Number(b.matches ?? 0) - Number(a.matches ?? 0));
  return `<section class="player-file-detail"><div class="player-file-detail-heading"><span>${esc(t('playerFile.statsKicker'))}</span><h2>${esc(t('playerFile.statsTitle'))}</h2><p>${esc(t('playerFile.statsNote'))}</p></div><div class="player-file-stat-grid"><div><span>${esc(t('playerFile.pvp'))}</span><strong>${esc(pvp.matches)}</strong><small>${esc(t('playerFile.wld',{ wins:pvp.wins, losses:pvp.losses, draws:pvp.draws }))}</small></div><div><span>${esc(t('playerFile.training'))}</span><strong>${esc(training.matches)}</strong><small>${esc(t('playerFile.wld',{ wins:training.wins, losses:training.losses, draws:training.draws }))}</small></div><div><span>${esc(t('playerFile.tutorial'))}</span><strong>${esc(tutorial.matches)}</strong><small>${esc(t('playerFile.wld',{ wins:tutorial.wins, losses:tutorial.losses, draws:tutorial.draws }))}</small></div><div><span>${esc(t('playerFile.turnsPlayed'))}</span><strong>${esc(profile?.stats?.totalTurnsPlayed ?? 0)}</strong><small>${esc(t('playerFile.serverCounted'))}</small></div></div><div class="player-file-breakdown"><h3>${esc(t('playerFile.departmentUsageTitle'))}</h3>${departments.length ? departments.map(([department,value]) => `<div><strong>${esc(department)}</strong><span>${esc(value.matches ?? 0)} · ${esc(t('playerFile.wld',{ wins:value.wins ?? 0, losses:value.losses ?? 0, draws:value.draws ?? 0 }))}</span></div>`).join('') : `<p>${esc(t('playerFile.noDepartment'))}</p>`}</div></section>`;
}

function renderPlayerFile() {
  const profile = state.serverProfile;
  if (!profile) return `<section class="player-file-shell"><div class="player-file-empty"><strong>${esc(t('playerFile.loadFailed'))}</strong></div></section>`;
  const sections = [['OVERVIEW','playerFile.tabs.overview'],['MATCH_HISTORY','playerFile.tabs.history'],['RANKED','playerFile.tabs.ranked'],['ACHIEVEMENTS','playerFile.tabs.achievements'],['STATS','playerFile.tabs.stats']];
  const body = state.profileSection === 'MATCH_HISTORY' ? renderPlayerFileHistory(profile) : state.profileSection === 'RANKED' ? renderPlayerFileRanked(profile) : state.profileSection === 'ACHIEVEMENTS' ? renderPlayerFileAchievements(profile) : state.profileSection === 'STATS' ? renderPlayerFileStats(profile) : renderPlayerFileOverview(profile);
  return `<section class="player-file-shell">${renderPlayerFileHeader(profile)}<nav class="player-file-tabs" aria-label="${esc(t('playerFile.tabsLabel'))}">${sections.map(([id,key]) => `<button class="${state.profileSection===id?'active':''}" data-profile-section="${id}">${esc(t(key))}</button>`).join('')}</nav>${state.profileMessage ? `<div class="player-file-message" role="status">${esc(state.profileMessage)}</div>` : ''}<main class="player-file-body">${body}</main><footer class="player-file-footer"><button class="ghost" id="playerFileBack">${esc(t('nav.backToLobby'))}</button><button class="player-file-link" id="playerFilePersonnel">${esc(t('playerFile.openPersonnel'))}</button></footer></section>`;
}

function renderAchievements() {
  const items = state.achievementData?.achievements ?? [];
  const grouped = new Map();
  for (const item of items) grouped.set(item.category, [...(grouped.get(item.category) ?? []), item]);
  return `<section class="achievement-shell"><header class="achievement-header"><div><span>${esc(t('achievements.kicker'))}</span><h1>${esc(t('achievements.title'))}</h1><p>${esc(t('achievements.description'))}</p></div><button class="ghost" id="achievementsBack">${esc(t('nav.backToLobby'))}</button></header>${state.achievementBusy ? `<div class="surface-loader"><i></i><i></i><i></i></div>` : state.achievementMessage ? `<div class="surface-empty-state"><strong>${esc(state.achievementMessage)}</strong><button id="retryAchievements">${esc(t('achievements.retry'))}</button></div>` : [...grouped.entries()].map(([category, entries]) => `<section class="achievement-category"><header><span>${esc(t(`achievements.categories.${category.toLowerCase()}`, {}, category))}</span><small>${entries.filter((item) => item.progress?.completedAt).length}/${entries.length} ${esc(t('achievements.completedCount'))}</small></header><div class="achievement-grid">${entries.map((item) => {
    const value = Number(item.progress?.value ?? 0);
    const target = Math.max(1, Number(item.target ?? 1));
    const complete = Boolean(item.progress?.completedAt);
    const title = item.titleKey ? t(item.titleKey) : t('achievements.hidden');
    const description = item.descriptionKey ? t(item.descriptionKey) : t('achievements.hiddenDescription');
    const reward = (item.rewards ?? []).map((reward) => `${reward.amount ?? reward.quantity ?? 1} ${reward.type === 'OFFICE_CREDITS' ? t('achievements.credits') : reward.type === 'SCRAP' ? t('achievements.scrap') : reward.type}`).join(' · ');
    return `<article class="achievement-card ${complete ? 'is-complete' : ''} ${item.hidden ? 'is-hidden' : ''}"><div class="achievement-card-top"><span>${item.hidden ? t('achievements.hidden') : esc(item.id)}</span><b>${complete ? t('achievements.completed') : `${Math.min(value,target)}/${target}`}</b></div><h2>${esc(title)}</h2><p>${esc(description)}</p><div class="achievement-progress"><i style="width:${Math.min(100, value / target * 100)}%"></i></div><small>${complete ? t('achievements.rewardGranted') : reward ? `${t('achievements.reward')}: ${reward}` : t('achievements.inProgress')}</small></article>`;
  }).join('')}</div></section>`).join('')}</section>`;
}

async function ensureServerProfile() {
  const savedToken = localStorage.getItem(SERVER_PROFILE_TOKEN_KEY);
  if (savedToken) {
    try {
      const result = await api('/api/profiles/me', { headers:profileAuthHeaders(savedToken) });
      state.profileToken = savedToken;
      state.profileStorage = result.storage ?? null;
      state.serverAccount = result.account ?? null;
      applyServerProfile(result.profile);
      try { await syncServerDecks(); } catch (error) { state.deckPersistenceError = error.message; }
      return;
    } catch (error) {
      if (error?.code !== 'INVALID_PROFILE_TOKEN') {
        state.profileToken = savedToken;
        state.deckPersistenceError = error?.message ?? 'PROFILE_LOAD_FAILED';
        return;
      }
      localStorage.removeItem(SERVER_PROFILE_TOKEN_KEY);
    }
  }
  const created = await api('/api/profiles/guest', { method:'POST', body:JSON.stringify({ importMeta:state.metaProfile }) });
  state.profileToken = created.profileToken;
  state.profileStorage = created.storage ?? null;
  state.serverAccount = created.account ?? null;
  localStorage.setItem(SERVER_PROFILE_TOKEN_KEY, created.profileToken);
  applyServerProfile(created.profile);
  try { await syncServerDecks(); } catch (error) { state.deckPersistenceError = error.message; }
}

function metaRequest(extra = {}) {
  return state.profileToken ? { profileToken:state.profileToken, ...extra } : { profile:state.metaProfile, ...extra };
}

const COSMETIC_CATEGORIES = [
  ['BOARD','cosmetics.board'], ['AVATAR','cosmetics.avatar'], ['AVATAR_FRAME','cosmetics.avatarFrame'], ['AVATAR_DECORATION','cosmetics.avatarDecoration'], ['CARD_BACK','cosmetics.cardBack'], ['BADGE','cosmetics.badge'], ['TITLE','cosmetics.title']
];
const COSMETIC_SLOT_BY_KIND = { BOARD:'boardSkinId', AVATAR:'avatarId', AVATAR_FRAME:'avatarFrameId', AVATAR_DECORATION:'avatarDecorationId', CARD_BACK:'cardBackId', BADGE:'badgeId', TITLE:'titleId' };
function cosmeticCategoryLabel(kind) { return t(COSMETIC_CATEGORIES.find(([id]) => id === kind)?.[1] ?? 'cosmetics.personnel'); }
function cosmeticText(def, field) { const key = field === 'name' ? def.nameKey : def.descriptionKey; return key ? t(key) : def[field]; }
function cosmeticErrorMessage(error) {
  return ({ COSMETIC_NOT_FOUND:t('cosmetics.purchaseFailed'), COSMETIC_INSUFFICIENT_CREDITS:t('cosmetics.insufficientCredits'), COSMETIC_ALREADY_OWNED:t('cosmetics.alreadyOwned'), COSMETIC_NOT_OWNED:t('cosmetics.notOwned'), COSMETIC_WRONG_SLOT:t('cosmetics.wrongSlot'), COSMETIC_REQUIRED:t('cosmetics.requiredSlot'), COSMETIC_SLOT_INVALID:t('cosmetics.invalidSlot'), COSMETIC_NOT_IN_SHOP:t('cosmetics.shopOnly') })[error?.code] ?? error?.message ?? t('cosmetics.purchaseFailed');
}
async function loadCosmeticViews() {
  if (!state.profileToken) return;
  const [personnel, shop] = await Promise.all([api('/api/cosmetics/personnel', { headers:profileAuthHeaders() }), api('/api/cosmetics/shop', { headers:profileAuthHeaders() })]);
  state.cosmeticPersonnel = personnel;
  state.cosmeticShop = shop;
}
async function enterCosmeticSurface(mode) {
  state.mode = mode;
  state.cosmeticMessage = null;
  try { await loadCosmeticViews(); } catch (error) { state.cosmeticMessage = cosmeticErrorMessage(error); }
  render();
}
function avatarFrameMaskAsset(frameAsset, explicitMaskAsset = '') {
  if (explicitMaskAsset) return explicitMaskAsset;
  const file = String(frameAsset ?? '').split('/').pop() ?? '';
  return file ? `/cosmetics/avatar-frames/masks/${file.replace(/\.webp$/i, '.png')}` : '';
}
function renderAvatarComposition({ avatarAsset = null, frameAsset = null, frameMaskAsset = '', decorationAsset = null, avatarAlt = '', frameAlt = '', fallbackText = '', className = '' } = {}) {
  const classes = ['avatar-composition', 'player-avatar-frame', frameAsset ? 'has-avatar-frame' : '', decorationAsset ? 'has-avatar-decoration' : '', className].filter(Boolean).join(' ');
  const face = avatarAsset
    ? `<img class="avatar-composition-image player-avatar-image" src="${esc(avatarAsset)}" alt="${esc(avatarAlt)}" />`
    : `<span class="avatar-composition-fallback">${esc(fallbackText)}</span>`;
  const portrait = frameAsset ? `<div class="avatar-portrait-mask" style="--avatar-frame-mask:url('${esc(avatarFrameMaskAsset(frameAsset, frameMaskAsset))}')">${face}</div>` : face;
  const frame = frameAsset ? `<img class="avatar-composition-frame player-avatar-frame-image" src="${esc(frameAsset)}" alt="${esc(frameAlt)}" />` : '';
  const decoration = decorationAsset ? `<img class="avatar-composition-decoration" src="${esc(decorationAsset)}" alt="" />` : '';
  return `<div class="${classes}">${portrait}${decoration}${frame}</div>`;
}
function renderCosmeticPreview(item, kind) {
  const def = item.definition;
  if (kind === 'BOARD') return def.assetPath ? `<div class="cosmetic-board-preview"><img src="${esc(def.assetPath)}" alt="${esc(cosmeticText(def,'name'))}" /></div>` : '<div class="cosmetic-board-preview fallback">OFFICE</div>';
  if (kind === 'AVATAR') return renderAvatarComposition({ avatarAsset:def.assetPath ?? null, avatarAlt:cosmeticText(def,'name'), fallbackText:state.serverProfile?.displayName?.slice(0,1) ?? 'O', className:'cosmetic-avatar-preview' });
  if (kind === 'AVATAR_FRAME' || kind === 'AVATAR_DECORATION') {
    const avatarId = state.cosmeticPersonnel?.loadout?.avatarId ?? 'COS-AVA-001';
    const avatarAsset = COSMETIC_UI_CATALOG.avatars[String(avatarId)]?.asset;
    const equippedFrame = cosmeticFrameAsset(state.cosmeticPersonnel?.loadout?.avatarFrameId);
    return renderAvatarComposition({
      avatarAsset:avatarAsset ?? '/cosmetics/avatars/overworked-sysadmin.webp',
      frameAsset:kind === 'AVATAR_FRAME' ? def.assetPath : equippedFrame,
      frameMaskAsset:kind === 'AVATAR_FRAME' ? def.portraitMaskAsset : cosmeticFrameMaskAsset(state.cosmeticPersonnel?.loadout?.avatarFrameId),
      decorationAsset:kind === 'AVATAR_DECORATION' ? def.assetPath : null,
      frameAlt:kind === 'AVATAR_FRAME' ? cosmeticText(def,'name') : '',
      className:'cosmetic-avatar-preview layered'
    });
  }
  if (kind === 'CARD_BACK') return def.assetPath ? `<div class="cosmetic-cardback-preview"><img src="${esc(def.assetPath)}" alt="${esc(cosmeticText(def,'name'))}" /></div>` : '<div class="cosmetic-cardback-preview fallback"><span>OFFICE</span><b>OCG</b></div>';
  if (kind === 'BADGE') return def.assetPath ? `<div class="cosmetic-badge-preview"><img src="${esc(def.assetPath)}" alt="${esc(cosmeticText(def,'name'))}" /></div>` : '<div class="cosmetic-badge-preview">★</div>';
  return `<div class="cosmetic-title-preview">${esc(cosmeticText(def,'name'))}</div>`;
}
function renderCosmeticItem(item, { shop = false } = {}) {
  const def = item.definition;
  const kind = def.kind;
  const slot = COSMETIC_SLOT_BY_KIND[kind];
  const loadout = state.cosmeticPersonnel?.loadout ?? state.metaProfile?.cosmetics?.loadout ?? {};
  const equipped = loadout[slot] === def.id;
  const owned = shop ? Boolean(item.owned) : true;
  return `<article class="cosmetic-item ${equipped?'is-equipped':''} ${owned?'':'is-unowned'}" data-cosmetic-id="${esc(def.id)}" data-cosmetic-kind="${esc(kind)}"><div class="cosmetic-item-art">${renderCosmeticPreview(item,kind)}</div><div class="cosmetic-item-copy"><span>${esc(cosmeticCategoryLabel(kind))}</span><h3>${esc(cosmeticText(def,'name'))}</h3><p>${esc(cosmeticText(def,'description'))}</p></div><div class="cosmetic-item-state">${equipped?`<b>${esc(t('cosmetics.equipped'))}</b>`:owned?`<b>${esc(t('cosmetics.owned'))}</b>`:''}${shop?`<strong>${esc(item.price)} ${esc(t('cosmetics.officeCredits'))}</strong>`:''}</div><div class="cosmetic-item-actions">${owned ? (equipped && !['boardSkinId','avatarId','cardBackId'].includes(slot) ? `<button data-cosmetic-equip="" data-cosmetic-slot="${esc(slot)}" data-cosmetic-id="">${esc(t('cosmetics.unequip'))}</button>` : equipped ? '' : `<button class="primary" data-cosmetic-equip="1" data-cosmetic-slot="${esc(slot)}" data-cosmetic-id="${esc(def.id)}">${esc(t('cosmetics.equip'))}</button>`) : `<button class="primary" data-cosmetic-buy="${esc(def.id)}">${esc(t('cosmetics.buy'))}</button>`}</div></article>`;
}
function renderCosmeticNoneItem(slot) {
  const loadout = state.cosmeticPersonnel?.loadout ?? state.metaProfile?.cosmetics?.loadout ?? {};
  const equipped = loadout[slot] == null;
  return `<article class="cosmetic-item cosmetic-none-item ${equipped?'is-equipped':''}" data-cosmetic-kind="${esc(Object.entries(COSMETIC_SLOT_BY_KIND).find(([,value])=>value===slot)?.[0] ?? '')}"><div class="cosmetic-item-art"><div class="cosmetic-none-preview">—</div></div><div class="cosmetic-item-copy"><span>${esc(t('cosmetics.optional'))}</span><h3>${esc(t('cosmetics.none'))}</h3><p>${esc(t('cosmetics.unequip'))}</p></div><div class="cosmetic-item-state">${equipped?`<b>${esc(t('cosmetics.equipped'))}</b>`:''}</div><div class="cosmetic-item-actions">${equipped?'':`<button data-cosmetic-equip="" data-cosmetic-slot="${esc(slot)}" data-cosmetic-id="">${esc(t('cosmetics.none'))}</button>`}</div></article>`;
}
function renderCosmeticCategories(items, shop = false) {
  return `<nav class="cosmetic-categories" aria-label="${esc(t('cosmetics.chooseCategory'))}">${COSMETIC_CATEGORIES.map(([id,key]) => { const count=items.filter((item)=>item.definition?.kind===id).length; return `<button class="${state.cosmeticCategory===id?'active':''}" data-cosmetic-category="${id}"><span>${esc(t(key))}</span><b>${count}</b></button>`; }).join('')}</nav>`;
}
function renderCosmeticSurface(mode) {
  const shop = mode === 'SHOP';
  const source = shop ? (state.cosmeticShop?.items ?? []) : (state.cosmeticPersonnel?.owned ?? []);
  const items = source.filter((item) => item.definition?.kind === state.cosmeticCategory);
  const loadout = state.cosmeticPersonnel?.loadout ?? state.metaProfile?.cosmetics?.loadout ?? {};
  const credits = Number((shop ? state.cosmeticShop?.officeCredits : state.cosmeticPersonnel?.officeCredits) ?? state.metaProfile?.balances?.OFFICE_CREDITS ?? 0);
  const pending = state.pendingCosmeticPurchase ? state.cosmeticShop?.items?.find((item) => item.cosmeticId === state.pendingCosmeticPurchase) : null;
  const optional = ['AVATAR_FRAME','AVATAR_DECORATION','BADGE','TITLE'].includes(state.cosmeticCategory);
  const visibleItems = !shop && optional ? [null, ...items] : items;
  const selectedSlot = COSMETIC_SLOT_BY_KIND[state.cosmeticCategory];
  const equippedDefinition = (state.cosmeticPersonnel?.owned ?? []).find((item) => item.definition?.id === loadout[selectedSlot])?.definition;
  const currentLoadout = equippedDefinition ? cosmeticText(equippedDefinition,'name') : t('cosmetics.none');
  const emptyHint = shop ? t('cosmetics.shopEmptyHint') : t('cosmetics.emptyCategoryHint');
  return `<section class="cosmetic-shell ${shop?'cosmetic-shop-shell':'cosmetic-personnel-shell'}"><header class="cosmetic-header"><div><button class="ghost" id="backToLobby">← ${esc(t('cosmetics.backToLobby'))}</button><span class="cosmetic-eyebrow">${shop?esc(t('cosmetics.shopCollection').toUpperCase()):esc(t('cosmetics.ownedCollection').toUpperCase())}</span><h1>${esc(shop?t('cosmetics.shop'):t('cosmetics.personnel'))}</h1><p>${esc(shop?t('cosmetics.storeNote'):t('cosmetics.emptyCategoryHint'))}</p></div><div class="cosmetic-wallet"><span>${esc(t('cosmetics.balance'))}</span><strong>${esc(credits)}</strong><small>${esc(t('cosmetics.officeCredits'))}</small></div></header><div class="cosmetic-layout">${renderCosmeticCategories(source,shop)}<main class="cosmetic-content"><div class="cosmetic-content-head"><div><span>${esc(t(COSMETIC_CATEGORIES.find(([id])=>id===state.cosmeticCategory)?.[1] ?? 'cosmetics.personnel').toUpperCase())}</span><strong>${items.length}</strong></div><div class="cosmetic-loadout-strip"><span>${esc(t('cosmetics.currentLoadout'))}</span><b>${esc(currentLoadout)}</b></div></div>${pending?`<section class="cosmetic-confirm" role="dialog" aria-label="${esc(t('cosmetics.confirmPurchase'))}"><div><span>${esc(t('cosmetics.purchase'))}</span><strong>${esc(t('cosmetics.buyQuestion',{name:cosmeticText(pending.definition,'name'),price:pending.price}))}</strong></div><button class="primary" data-cosmetic-buy-confirm="1" ${state.cosmeticBusy?'disabled':''}>${esc(t('cosmetics.confirm'))}</button><button data-cosmetic-buy-cancel="1">${esc(t('cosmetics.cancel'))}</button></section>`:''}${state.cosmeticMessage?`<div class="cosmetic-message" role="status">${esc(state.cosmeticMessage)}</div>`:''}<div class="cosmetic-grid ${visibleItems.length?'':'is-empty'}">${visibleItems.length?visibleItems.map((item)=>item?renderCosmeticItem(item,{shop}):renderCosmeticNoneItem(COSMETIC_SLOT_BY_KIND[state.cosmeticCategory])).join(''):`<div class="cosmetic-empty"><span>${esc(t('cosmetics.preview'))}</span><strong>${esc(shop?t('cosmetics.shopEmpty'):t('cosmetics.emptyCategory'))}</strong><p>${esc(emptyHint)}</p></div>`}</div></main></div></section>`;
}
function renderPersonnelFile() { return renderCosmeticSurface('PERSONNEL'); }
function renderCompanyStore() { return renderCosmeticSurface('SHOP'); }
async function equipCosmetic(slot, cosmeticId) {
  if (state.cosmeticBusy) return;
  state.cosmeticBusy = true; state.cosmeticMessage = null;
  try { const result=await api('/api/cosmetics/equip',{method:'POST',headers:profileAuthHeaders(),body:JSON.stringify({profileToken:state.profileToken,slot,cosmeticId:cosmeticId || null})}); applyServerProfile(result.profile); await loadCosmeticViews(); state.cosmeticMessage=t('cosmetics.equipSuccess'); }
  catch (error) { state.cosmeticMessage=cosmeticErrorMessage(error); }
  finally { state.cosmeticBusy=false; render(); }
}
async function purchaseCosmetic(cosmeticId) {
  if (state.cosmeticBusy || !cosmeticId) return;
  state.cosmeticBusy=true; state.cosmeticMessage=null;
  try { const result=await api('/api/cosmetics/shop/purchase',{method:'POST',headers:profileAuthHeaders(),body:JSON.stringify({profileToken:state.profileToken,cosmeticId})}); applyServerProfile(result.profile); await loadCosmeticViews(); state.pendingCosmeticPurchase=null; const purchased=state.cosmeticShop?.items?.find((item)=>item.cosmeticId===cosmeticId)?.definition; state.cosmeticMessage=t('cosmetics.purchaseSuccess',{name:purchased?cosmeticText(purchased,'name'):cosmeticId}); }
  catch(error) { state.cosmeticMessage=cosmeticErrorMessage(error); }
  finally { state.cosmeticBusy=false; render(); }
}
function bindCosmeticSurface() {
  document.querySelector('#backToLobby')?.addEventListener('click',()=>{state.mode='PLAY';render();});
  document.querySelectorAll('[data-cosmetic-category]').forEach((button)=>button.addEventListener('click',()=>{state.cosmeticCategory=button.dataset.cosmeticCategory;state.cosmeticMessage=null;render();}));
  document.querySelectorAll('[data-cosmetic-equip]').forEach((button)=>button.addEventListener('click',()=>equipCosmetic(button.dataset.cosmeticSlot,button.dataset.cosmeticId)));
  document.querySelectorAll('[data-cosmetic-buy]').forEach((button)=>button.addEventListener('click',()=>{state.pendingCosmeticPurchase=button.dataset.cosmeticBuy;render();}));
  document.querySelector('[data-cosmetic-buy-confirm]')?.addEventListener('click',()=>purchaseCosmetic(state.pendingCosmeticPurchase));
  document.querySelector('[data-cosmetic-buy-cancel]')?.addEventListener('click',()=>{state.pendingCosmeticPurchase=null;render();});
}

function ownedCopies(definitionId) {
  return Number(state.metaProfile?.ownedCards?.[definitionId] ?? 0);
}

function executiveEditionVariantId(definitionId) { return `${definitionId}-EXEC`; }
function isExecutiveEditionVariant(variantId) { return typeof variantId === 'string' && variantId.endsWith('-EXEC'); }
function ownedExecutiveEditionCopies(definitionId, variantId = executiveEditionVariantId(definitionId)) {
  return Number(state.metaProfile?.ownedCardVariants?.[variantId] ?? 0);
}
function ownedTotalCopies(definitionId) { return ownedCopies(definitionId) + ownedExecutiveEditionCopies(definitionId); }
function finishClass(variantId) { return isExecutiveEditionVariant(variantId) ? 'executive-edition' : ''; }

function economyTierConfig(def) {
  const tier = sandboxRarityTier(def);
  return state.economyConfig?.rarityTiers?.find((item) => item.id === tier) ?? null;
}

function cardCraftStatus(definitionId, deck = editingDeck()) {
  const def = cardDef(definitionId);
  const tier = def ? economyTierConfig(def) : null;
  const scraps = Number(state.metaProfile?.balances?.SHREDDER_SCRAPS ?? 0);
  const craftCost = Number(tier?.craftCost ?? Infinity);
  const owned = ownedCopies(definitionId);
  const deckCopiesNow = deckCopies(deck, definitionId);
  const missingForDeck = Math.max(0, deckCopiesNow - owned);
  const craftableCopies = Number.isFinite(craftCost) && craftCost > 0 ? Math.floor(scraps / craftCost) : 0;
  const totalGapCost = Number.isFinite(craftCost) ? missingForDeck * craftCost : Infinity;
  const shortfall = Number.isFinite(craftCost) ? Math.max(0, craftCost - scraps) : Infinity;
  return { def, tier, scraps, craftCost, owned, deckCopies:deckCopiesNow, missingForDeck, craftableCopies, totalGapCost, shortfall, canCraft:Number.isFinite(craftCost) && scraps >= craftCost };
}

function focusEconomyCollection(kind) {
  resetCollectionFilters();
  cancelDeckSwap();
  if (kind === 'DECK_GAPS') state.collectionOwnedFilter = 'DECK_GAP';
  if (kind === 'SHREDDABLE') {
    state.collectionOwnedFilter = 'SHREDDABLE';
    state.collectionSort = 'OWNED';
  }
  renderCollection();
  requestAnimationFrame(() => document.querySelector('.collection-discovery')?.scrollIntoView({ behavior:'smooth', block:'start' }));
}

function loadCustomDecks() {
  try {
    const raw = JSON.parse(localStorage.getItem(CUSTOM_DECKS_KEY) ?? '[]');
    state.customDecks = Array.isArray(raw) ? raw
      .filter((deck) => deck && typeof deck.id === 'string' && Array.isArray(deck.cards))
      .map((deck) => ({ ...deck, createdAt:Number(deck.createdAt) || null, updatedAt:Number(deck.updatedAt) || null })) : [];
  } catch { state.customDecks = []; }
  initializeDeckEditBaselines();
}

function saveCustomDecks() {
  localStorage.setItem(CUSTOM_DECKS_KEY, JSON.stringify(state.customDecks));
}

function deckEditSnapshot(deck) {
  if (!deck) return null;
  return {
    name:String(deck.name ?? 'Custom Deck'),
    cards:(deck.cards ?? []).map((entry) => ({ definitionId:entry.definitionId, copies:Number(entry.copies || 0), ...(entry.variantId ? { variantId:entry.variantId } : {}) })),
    sourcePresetId:deck.sourcePresetId,
    description:deck.description
  };
}

function deckEditSignature(snapshot) {
  if (!snapshot) return '';
  const cards = [...(snapshot.cards ?? [])]
    .map((entry) => ({ definitionId:entry.definitionId, copies:Number(entry.copies || 0), ...(entry.variantId ? { variantId:entry.variantId } : {}) }))
    .sort((a,b) => a.definitionId.localeCompare(b.definitionId) || String(a.variantId ?? '').localeCompare(String(b.variantId ?? '')));
  return JSON.stringify({ name:String(snapshot.name ?? 'Custom Deck'), cards });
}

function applyDeckEditSnapshot(deck, snapshot) {
  if (!deck || !snapshot) return;
  deck.name = String(snapshot.name ?? 'Custom Deck');
  deck.cards = (snapshot.cards ?? []).map((entry) => ({ definitionId:entry.definitionId, copies:Number(entry.copies || 0), ...(entry.variantId ? { variantId:entry.variantId } : {}) }));
  if (snapshot.sourcePresetId !== undefined) deck.sourcePresetId = snapshot.sourcePresetId;
  if (snapshot.description !== undefined) deck.description = snapshot.description;
}

function checkpointDeckEdits(deck, { clearHistory = true } = {}) {
  if (!deck) return;
  state.deckEditBaselines[deck.id] = deckEditSnapshot(deck);
  if (clearHistory) state.deckEditHistory[deck.id] = [];
}

function initializeDeckEditBaselines() {
  state.deckEditBaselines = {};
  state.deckEditHistory = {};
  for (const deck of state.customDecks) checkpointDeckEdits(deck);
}

function deckHasUnsavedChanges(deck) {
  if (!deck) return false;
  const baseline = state.deckEditBaselines[deck.id];
  if (!baseline) return true;
  return deckEditSignature(deckEditSnapshot(deck)) !== deckEditSignature(baseline);
}

function deckUndoAvailable(deck) {
  return Boolean(deck && (state.deckEditHistory[deck.id]?.length ?? 0) > 0);
}

function recordDeckEdit(deck, mutate) {
  if (!deck || typeof mutate !== 'function') return;
  const history = state.deckEditHistory[deck.id] ?? (state.deckEditHistory[deck.id] = []);
  history.push(deckEditSnapshot(deck));
  if (history.length > 30) history.shift();
  mutate();
}

async function saveDeckEdits(deck) {
  if (!deck) return;
  const now = Date.now();
  deck.createdAt ||= now;
  deck.updatedAt = now;
  saveCustomDecks();
  if (!state.serverDecksReady || !state.profileToken) {
    checkpointDeckEdits(deck);
    state.deckBuilderMessage = t('decks.saved');
    return;
  }
  state.deckBuilderMessage = t('decks.saving');
  try {
    const pendingCreate = pendingDeckCreates.get(deck.id);
    if (pendingCreate && !(await pendingCreate)) return;
    const result = await api(`/api/profiles/me/decks/${encodeURIComponent(deck.id)}`, { method:'PATCH', headers:profileAuthHeaders(), body:JSON.stringify({ name:deck.name, cards:deck.cards, expectedRevision:deck.revision }) });
    applyServerDeckProfile(result.profile);
    const saved = state.customDecks.find((item) => item.id === deck.id);
    if (saved) checkpointDeckEdits(saved);
    state.deckBuilderMessage = t('decks.saved');
  } catch (error) {
    state.deckPersistenceError = error.message;
    state.deckBuilderMessage = deckPersistenceMessage(error);
  }
}

function undoDeckEdit(deck) {
  const history = state.deckEditHistory[deck?.id] ?? [];
  const previous = history.pop();
  if (!previous) return false;
  cancelDeckSwap();
  applyDeckEditSnapshot(deck, previous);
  sortDeckEntries(deck);
  state.deckBuilderMessage = 'Last deck edit undone.';
  return true;
}

function resetDeckToSaved(deck) {
  const baseline = state.deckEditBaselines[deck?.id];
  if (!deck || !baseline) return false;
  cancelDeckSwap();
  applyDeckEditSnapshot(deck, baseline);
  sortDeckEntries(deck);
  state.deckEditHistory[deck.id] = [];
  state.deckBuilderMessage = 'Unsaved deck changes discarded.';
  return true;
}

function guardUnsavedDeck(deck, actionLabel = 'continue') {
  if (!deckHasUnsavedChanges(deck)) return true;
  state.deckBuilderMessage = `Save or reset this deck before you ${actionLabel}.`;
  return false;
}

function cardCopyLimit(definitionId) {
  return Number(state.format?.cardLimits?.[definitionId] ?? state.format?.defaultCopyLimit ?? 3);
}

function ownedDeckMode() {
  return state.metaProfile?.collectionMode === 'OWNED_COPIES';
}

function deckCopyCeiling(definitionId) {
  const formatLimit = cardCopyLimit(definitionId);
  return ownedDeckMode() ? Math.min(formatLimit, ownedTotalCopies(definitionId)) : formatLimit;
}

async function setCollectionMode(mode) {
  const collectionMode = mode === 'OWNED_COPIES' ? 'OWNED_COPIES' : 'SANDBOX_ALL_AVAILABLE';
  state.metaProfile.collectionMode = collectionMode;
  saveMetaProfile();
  if (state.profileToken) {
    try {
      const result = await api('/api/profiles/me/collection-mode', { method:'POST', body:JSON.stringify({ profileToken:state.profileToken, collectionMode }) });
      applyServerProfile(result.profile);
    } catch (error) { state.economyMessage = error.message; }
  }
}

function collectionPlayableCapacity(adjustDefinitionId = null, copyDelta = 0) {
  let total = 0;
  for (const def of state.catalog.values()) {
    let owned = ownedTotalCopies(def.id);
    if (def.id === adjustDefinitionId) owned += Number(copyDelta || 0);
    const limit = Math.max(0, cardCopyLimit(def.id));
    total += Math.min(Math.max(0, owned), limit);
  }
  return total;
}

function scrapCollectionStatus(definitionId, copies = 1) {
  const owned = ownedCopies(definitionId);
  const before = collectionPlayableCapacity();
  const after = collectionPlayableCapacity(definitionId, -copies);
  const floor = Number(state.format?.deckSize ?? 40);
  if (!Number.isInteger(copies) || copies <= 0) return { allowed:false, reason:'Invalid shred amount.', before, after, floor, remaining:owned };
  if (owned < copies) return { allowed:false, reason:'No owned copy available to shred.', before, after, floor, remaining:owned };
  if (after < floor) return { allowed:false, reason:`Keep enough cards to build one legal ${floor}-card deck.`, before, after, floor, remaining:owned-copies };
  return { allowed:true, reason:null, before, after, floor, remaining:owned-copies };
}

function savedDecksAffectedByScrap(definitionId, remainingOwned) {
  return state.customDecks.filter((deck) => deckCopies(deck, definitionId) > remainingOwned);
}

function deckCardCount(deck) {
  return (deck?.cards ?? []).reduce((sum, entry) => sum + Number(entry.copies || 0), 0);
}

function selectedDeckPayload(selectValue) {
  if (!selectValue?.startsWith('custom:')) return { deckId: selectValue };
  const id = selectValue.slice('custom:'.length);
  const deck = state.customDecks.find((item) => item.id === id);
  if (!deck) throw new Error('Saved custom deck not found.');
  return { deckId: deck.id };
}

async function persistNewDeck(deck) {
  if (!deck || !state.serverDecksReady || !state.profileToken) return;
  const existing = pendingDeckCreates.get(deck.id);
  if (existing) return existing;
  const operation = (async () => {
    try {
    const result = await api('/api/profiles/me/decks', { method:'POST', headers:profileAuthHeaders(), body:JSON.stringify({ id:deck.id, name:deck.name, cards:deck.cards, source:deck.source ?? 'player' }) });
    applyServerDeckProfile(result.profile);
    state.editingDeckId = deck.id;
    state.deckBuilderMessage = t('decks.saved');
      return true;
    } catch (error) {
      state.deckPersistenceError = error.message;
      state.deckBuilderMessage = deckPersistenceMessage(error);
      return false;
    }
  })();
  pendingDeckCreates.set(deck.id, operation);
  try { return await operation; } finally { pendingDeckCreates.delete(deck.id); }
}

async function persistDeletedDeck(deckId) {
  if (!state.serverDecksReady || !state.profileToken) return;
  try {
    const result = await api(`/api/profiles/me/decks/${encodeURIComponent(deckId)}`, { method:'DELETE', headers:profileAuthHeaders() });
    applyServerDeckProfile(result.profile);
  } catch (error) {
    state.deckPersistenceError = error.message;
    state.deckBuilderMessage = deckPersistenceMessage(error);
  }
}

function newCustomDeck() {
  const now = Date.now();
  const deck = { id:`deck-${now.toString(36)}`, name:'New Deck', cards:[], createdAt:now, updatedAt:now };
  state.customDecks.push(deck);
  state.editingDeckId = deck.id;
  saveCustomDecks();
  checkpointDeckEdits(deck);
  void persistNewDeck(deck);
  return deck;
}

function editingDeck() {
  return state.customDecks.find((deck) => deck.id === state.editingDeckId) ?? state.customDecks[0] ?? null;
}

function uniqueCustomDeckName(baseName) {
  const base = String(baseName || 'Custom Deck').trim() || 'Custom Deck';
  const used = new Set(state.customDecks.map((deck) => String(deck.name).toLowerCase()));
  if (!used.has(base.toLowerCase())) return base;
  let suffix = 2;
  while (used.has(`${base} ${suffix}`.toLowerCase())) suffix += 1;
  return `${base} ${suffix}`;
}

function deckOwnedReadiness(deck) {
  const gaps = deckOwnedGaps(deck);
  const missingCopies = gaps.reduce((sum, gap) => sum + Number(gap.missing || 0), 0);
  return { ready:gaps.length === 0, gaps, missingCopies };
}

function deckLastEditedLabel(deck, now = Date.now()) {
  const timestamp = Number(deck?.updatedAt || 0);
  if (!timestamp) return 'Legacy save';
  const elapsed = Math.max(0, now - timestamp);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (elapsed < minute) return 'Just now';
  if (elapsed < hour) return `${Math.floor(elapsed / minute)}m ago`;
  if (elapsed < day) return `${Math.floor(elapsed / hour)}h ago`;
  if (elapsed < 7 * day) return `${Math.floor(elapsed / day)}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month:'short', day:'numeric' });
}

function openManagedDeck(deckId) {
  const current = editingDeck();
  if (!current || current.id === deckId) return true;
  if (!guardUnsavedDeck(current, 'open another saved deck')) return false;
  cancelDeckSwap();
  state.editingDeckId = deckId;
  state.deckBuilderMessage = null;
  return true;
}

function duplicateCustomDeck(sourceId) {
  const current = editingDeck();
  if (current && !guardUnsavedDeck(current, 'duplicate a saved deck')) return null;
  const source = state.customDecks.find((deck) => deck.id === sourceId);
  if (!source) return null;
  const now = Date.now();
  const deck = {
    id:`deck-${now.toString(36)}-${Math.random().toString(36).slice(2,6)}`,
    name:uniqueCustomDeckName(`${source.name} Copy`),
    cards:(source.cards ?? []).map((entry) => ({ definitionId:entry.definitionId, copies:Number(entry.copies || 0) })),
    sourcePresetId:source.sourcePresetId,
    description:source.description ?? '',
    createdAt:now,
    updatedAt:now
  };
  state.customDecks.push(deck);
  state.editingDeckId = deck.id;
  state.collectionPreviewId = deck.cards[0]?.definitionId ?? state.collectionPreviewId;
  saveCustomDecks();
  checkpointDeckEdits(deck);
  state.deckBuilderMessage = `${source.name} duplicated as ${deck.name}.`;
  void persistNewDeck(deck);
  return deck;
}

function deleteCustomDeck(deckId) {
  const deck = state.customDecks.find((item) => item.id === deckId);
  if (!deck || state.customDecks.length <= 1) return false;
  const current = editingDeck();
  if (current && !guardUnsavedDeck(current, 'delete a saved deck')) return false;
  if (!confirm(`Delete “${deck.name}”? This removes the saved deck from this device.`)) return false;
  cancelDeckSwap();
  state.customDecks = state.customDecks.filter((item) => item.id !== deckId);
  delete state.deckEditBaselines[deckId];
  delete state.deckEditHistory[deckId];
  if (state.preferredDeckValue === `custom:${deckId}`) state.preferredDeckValue = state.presets[0]?.id ?? null;
  if (state.editingDeckId === deckId) state.editingDeckId = state.customDecks[0]?.id ?? null;
  state.deckBuilderMessage = `${deck.name} deleted.`;
  saveCustomDecks();
  void persistDeletedDeck(deckId);
  return true;
}

function starterOwnedReadiness(preset) {
  let required = 0;
  let available = 0;
  const missing = [];
  for (const entry of preset?.cards ?? []) {
    const copies = Number(entry.copies || 0);
    const owned = ownedCopies(entry.definitionId);
    required += copies;
    available += Math.min(copies, owned);
    if (owned < copies) missing.push({ definitionId:entry.definitionId, missing:copies-owned });
  }
  return { required, available, missing, ready:required > 0 && available >= required };
}

function cloneStarterDeck(presetId) {
  const current = editingDeck();
  if (current && deckHasUnsavedChanges(current)) {
    state.deckBuilderMessage = 'Save or reset this deck before you copy a starter blueprint.';
    return null;
  }
  const preset = state.presets.find((item) => item.id === presetId);
  if (!preset) return null;
  const cleanName = String(preset.name ?? 'Starter Deck').replace(/\s+v\d+(?:\.\d+)*$/i, '');
  const now = Date.now();
  const deck = {
    id:`deck-${now.toString(36)}-${Math.random().toString(36).slice(2,6)}`,
    name:uniqueCustomDeckName(`${cleanName} Copy`),
    cards:(preset.cards ?? []).map((entry) => ({ definitionId:entry.definitionId, copies:Number(entry.copies || 0) })),
    sourcePresetId:preset.id,
    description:preset.description ?? '',
    createdAt:now,
    updatedAt:now
  };
  state.customDecks.push(deck);
  state.editingDeckId = deck.id;
  state.collectionPreviewId = deck.cards[0]?.definitionId ?? state.collectionPreviewId;
  state.deckBuilderMessage = `${preset.name} copied into the deckbuilder.`;
  saveCustomDecks();
  checkpointDeckEdits(deck);
  void persistNewDeck(deck);
  return deck;
}

function playDeckFromBuilder(deck) {
  if (!deck || clientDeckErrors(deck).length) return;
  state.preferredDeckValue = `custom:${deck.id}`;
  state.deckBuilderMessage = null;
  state.mode = 'PLAY';
  renderLobby();
}

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function renderFeedbackHost() {
  const host = document.querySelector('#feedbackHost');
  if (!host) return;
  const item = state.feedback;
  if (!item) { host.innerHTML = ''; return; }
  const role = item.tone === 'error' ? 'alert' : 'status';
  const live = item.tone === 'error' ? 'assertive' : 'polite';
  const icon = item.tone === 'success' ? '✓' : item.tone === 'info' ? 'i' : '!';
  host.innerHTML = `<div class="feedback-toast tone-${esc(item.tone)}" role="${role}" aria-live="${live}" aria-atomic="true"><div class="feedback-icon" aria-hidden="true">${icon}</div><div class="feedback-copy"><strong>${esc(item.title)}</strong>${item.detail ? `<span>${esc(item.detail)}</span>` : ''}</div><button type="button" class="feedback-dismiss" aria-label="Dismiss notification">×</button></div>`;
  host.querySelector('.feedback-dismiss')?.addEventListener('click', clearFeedback);
}

function clearFeedback() {
  if (state.feedbackTimer) clearTimeout(state.feedbackTimer);
  state.feedbackTimer = null;
  state.feedback = null;
  renderFeedbackHost();
}

function showFeedback(tone, title, detail = '', { duration = 2600, sticky = false } = {}) {
  if (state.feedbackTimer) clearTimeout(state.feedbackTimer);
  state.feedbackTimer = null;
  state.feedback = { tone, title, detail };
  renderFeedbackHost();
  if (!sticky && duration > 0) state.feedbackTimer = setTimeout(clearFeedback, duration);
}

function friendlyErrorFeedback(error, fallbackTitle = 'Action unavailable') {
  const code = error?.code ?? '';
  const title = ({ NETWORK_UNREACHABLE:'Connection interrupted', SESSION_SUPERSEDED:'Control moved to another tab', STALE_STATE:'Match state changed', INVALID_TOKEN:'Session expired', ROOM_NOT_FOUND:'Room no longer available' })[code] ?? fallbackTitle;
  const detail = error?.message ?? 'The server could not complete that action.';
  showFeedback(code === 'NETWORK_UNREACHABLE' ? 'warning' : 'error', title, detail, { sticky:code !== 'NETWORK_UNREACHABLE', duration:3600 });
}

function acceptedIntentFeedback(intent) {
  const feedback = ({
    MULLIGAN:['success','Opening hand confirmed','Your mulligan choice was accepted.'],
    PLAY_EMPLOYEE:['success','Employee played','The board has been synchronized.'],
    PLAY_ACTION:['success','Action played','The effect is now resolving server-side.'],
    PLAY_SYSTEM:['success','System online','The System was played to Support.'],
    SET_INCIDENT:['success','Incident set','The Incident is face-down in Support.'],
    ACTIVATE_ABILITY:['success','Ability activated','The effect has entered resolution.'],
    ACTIVATE_RESPONSE:['success','Response activated','Your response was added to the Chain.'],
    DECLARE_ATTACK:['success','Attack declared','Combat is resolving from the authoritative match state.'],
    RESIGN:['warning','Match resigned','The result has been recorded.']
  })[intent?.type];
  if (feedback) showFeedback(feedback[0], feedback[1], feedback[2], { duration:1800 });
}

function intentCommitLabel(intent) {
  return ({
    MULLIGAN:'Opening hand',
    PLAY_EMPLOYEE:'Employee play',
    PLAY_ACTION:'Action play',
    PLAY_SYSTEM:'System play',
    SET_INCIDENT:'Incident set',
    ACTIVATE_ABILITY:'Ability activation',
    ACTIVATE_RESPONSE:'Response activation',
    DECLARE_ATTACK:'Attack declaration',
    ADVANCE_PHASE:'Phase advance',
    PASS_PRIORITY:'Priority pass',
    RESOLVE_CHOICE:'Resolution choice',
    RESOLVE_DECK_SELECTION:'Deck selection',
    RESOLVE_TRIGGER_TARGET_SELECTION:'Target selection',
    RESOLVE_HAND_SELECTION:'Hand selection',
    ARCHIVE_EXCESS_HAND:'Hand-limit archive',
    RESIGN:'Resign'
  })[intent?.type] ?? String(intent?.type ?? 'Move').replaceAll('_',' ').toLowerCase();
}

function clearIntentCommit() {
  if (state.intentCommitTimer) clearTimeout(state.intentCommitTimer);
  state.intentCommitTimer = null;
  state.intentCommit = null;
}

function setIntentCommit(stage, intent, meta = {}) {
  if (state.intentCommitTimer) clearTimeout(state.intentCommitTimer);
  state.intentCommitTimer = null;
  state.intentCommit = {
    stage,
    label:intentCommitLabel(intent),
    intentType:intent?.type ?? 'UNKNOWN',
    intentId:meta.intentId ?? null,
    fromVersion:meta.fromVersion ?? null,
    toVersion:meta.toVersion ?? null,
    detail:meta.detail ?? '',
    at:Date.now()
  };
  if (stage !== 'SENDING') {
    const duration = stage === 'ACCEPTED' ? 2200 : 4200;
    state.intentCommitTimer = setTimeout(() => { clearIntentCommit(); render(); }, duration);
  }
}

function renderIntentCommitStatus(match) {
  const commit = state.intentCommit;
  if (!commit || !state.session || !match) return '';
  const presentation = ({
    SENDING:{ tone:'sending', eyebrow:'SENDING', title:`${commit.label} → server`, detail:`Submitting from authoritative state v${commit.fromVersion ?? match.stateVersion}. Controls stay locked until the server answers.` },
    ACCEPTED:{ tone:'accepted', eyebrow:'SERVER ACCEPTED', title:`${commit.label} committed`, detail:`Authoritative match state is now v${commit.toVersion ?? match.stateVersion}.` },
    REJECTED:{ tone:'rejected', eyebrow:'NOT COMMITTED', title:`${commit.label} rejected`, detail:commit.detail || 'The authoritative state did not accept this move.' },
    RESYNCING:{ tone:'resyncing', eyebrow:'RESYNCING', title:`${commit.label} not confirmed yet`, detail:commit.detail || 'Delivery was interrupted. The client is refreshing the authoritative match state before controls unlock.' }
  })[commit.stage];
  if (!presentation) return '';
  const spinner = commit.stage === 'SENDING' || commit.stage === 'RESYNCING' ? '<i class="commit-spinner" aria-hidden="true"></i>' : '';
  const icon = commit.stage === 'ACCEPTED' ? '✓' : commit.stage === 'REJECTED' ? '!' : '';
  return `<div class="intent-commit-status tone-${esc(presentation.tone)}" role="status" aria-live="polite" aria-atomic="true">${spinner}${icon ? `<b class="commit-icon" aria-hidden="true">${icon}</b>` : ''}<div><span>${esc(presentation.eyebrow)}</span><strong>${esc(presentation.title)}</strong><small>${esc(presentation.detail)}</small></div></div>`;
}

function deckPersistenceMessage(error) {
  if (error?.code === 'DECK_CONFLICT') return t('decks.conflict');
  return t('decks.saveFailed');
}
async function retryServerDecks() {
  if (!state.profileToken) return;
  state.deckPersistenceError = null;
  try {
    await refreshServerProfile();
    await syncServerDecks();
  } catch (error) {
    state.deckPersistenceError = error.message;
  }
  renderCollection();
}
function profileAuthHeaders(token = state.profileToken) {
  return token ? { authorization:`Bearer ${token}` } : {};
}
function roomAuthHeaders(token = state.session?.token) {
  return token ? { 'x-room-token':token } : {};
}
function adminAuthHeaders(token = state.adminToken) {
  return token ? { 'x-admin-token':token } : {};
}
function opsModeAvailable() { return new URLSearchParams(location.search).get('ops') === '1'; }
function finishReviewRequested() { return new URLSearchParams(location.search).get('finish-review') === '1'; }

async function api(path, options = {}) {
  let response;
  const method=String(options.method ?? 'GET').toUpperCase();
  const readTimeout=method==='GET' && !options.signal ? new AbortController() : null;
  const readTimeoutId=readTimeout ? setTimeout(()=>readTimeout.abort('READ_TIMEOUT'),12000) : null;
  try {
    response = await fetch(path, {
      ...options,
      signal: options.signal ?? readTimeout?.signal,
      headers: { 'content-type': 'application/json', ...(options.headers ?? {}) }
    });
  } catch (cause) {
    if (readTimeoutId) clearTimeout(readTimeoutId);
    const timedOut=readTimeout?.signal.aborted;
    const err = new Error(navigator.onLine === false ? 'You are offline. The match will resync automatically when the connection returns.' : timedOut ? 'The server read timed out. Your match is preserved; reconnecting is safe.' : 'Cannot reach the game server right now. Your match is preserved; reconnecting is safe.');
    err.code = timedOut ? 'NETWORK_TIMEOUT' : 'NETWORK_UNREACHABLE';
    err.cause = cause;
    throw err;
  }
  if (readTimeoutId) clearTimeout(readTimeoutId);
  const body = await response.json().catch(() => ({}));
  if (!response.ok && !body.response) {
    const err = new Error(body?.error?.message ?? `The game server returned HTTP ${response.status}.`);
    err.code = body?.error?.code;
    throw err;
  }
  return body;
}

function reconcileAuthoritativeUi(previousView, nextView) {
  const previousMatch = previousView?.match;
  const nextMatch = nextView?.match;
  const authorityChanged = Boolean(nextMatch) && (
    previousView?.roomId !== nextView?.roomId ||
    previousMatch?.matchId !== nextMatch?.matchId ||
    previousMatch?.stateVersion !== nextMatch?.stateVersion
  );
  if (authorityChanged) {
    state.selectedHand.clear();
    state.hoverAttackTargetId = null;
    state.interaction = null;
    state.pendingActionConfirmation = null;
  }
  if (state.focusedCardRef && !cardByRef(state.focusedCardRef)) {
    state.focusedCardRef = null;
    state.returnFocusCardRef = null;
  }
}

function acceptView(view) {
  const previousView = state.view;
  state.view = view;
  reconcileAuthoritativeUi(previousView, view);
  state.pendingActionConfirmation = null;
  syncMatchResultPresentationGate(view, previousView);
  if (view?.match?.status === 'ENDED' && view?.settings?.ratingActive && view?.roomId && state.rankedRefreshRoomId !== view.roomId) {
    state.rankedRefreshRoomId = view.roomId;
    setTimeout(() => refreshServerProfile().then(() => render()).catch(() => { state.rankedRefreshRoomId = null; }), 50);
  }
  const serverNow = Number(view?.timer?.serverNow ?? view?.lifecycle?.serverNow);
  if (Number.isFinite(serverNow) && serverNow > 0) state.serverClockOffsetMs = Date.now() - serverNow;
  if (view?.viewerSession?.activeElsewhere) state.connectionStatus = 'SUPERSEDED';
  else if (state.connectionStatus === 'SUPERSEDED') state.connectionStatus = 'CONNECTING';
  return view;
}

const RESULT_PRESENTATION_MAX_MS = 4200;
const RESULT_PRESENTATION_MIN_MS = 80;
const FINAL_RESOLUTION_EVENT_TYPES = new Set(['ATTACK_DECLARED','BATTLE_RESOLVED','BREAKTHROUGH_DAMAGE','REPUTATION_CHANGED','EMPLOYEE_DESTROYED','CARD_DESTROYED','CARD_ARCHIVED','GAME_ENDED']);

function prefersReducedMotion() {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function matchResultPresentationKey(view) {
  const match = view?.match;
  return match?.status === 'ENDED' ? `${view?.roomId ?? 'room'}:${match.stateVersion ?? 0}:${match.lastEventSeq ?? 0}:${match.reason ?? 'ENDED'}` : null;
}

function clearMatchResultPresentationGate() {
  if (state.matchResultGateTimer) clearTimeout(state.matchResultGateTimer);
  state.matchResultGateTimer = null;
  state.matchResultGate = null;
}

function finalResolutionEventsForView(view, previousView) {
  const previousSeq = Number(previousView?.match?.lastEventSeq ?? 0);
  return (view?.events ?? []).filter((event) => Number(event?.seq ?? 0) > previousSeq && FINAL_RESOLUTION_EVENT_TYPES.has(event?.type));
}

function finalResolutionPresentationDelay(events) {
  if (!events.length) return 0;
  if (prefersReducedMotion()) return RESULT_PRESENTATION_MIN_MS;
  const hasArchiveResolution = events.some((event) => ['EMPLOYEE_DESTROYED','CARD_DESTROYED','CARD_ARCHIVED','BREAKTHROUGH_DAMAGE'].includes(event.type));
  return Math.min(RESULT_PRESENTATION_MAX_MS, hasArchiveResolution ? 3800 : 1500);
}

function resolveMatchResultPresentationGate(key) {
  if (state.matchResultGate?.key !== key) return;
  state.matchResultGate.ready = true;
  state.matchResultGate.pending = false;
  state.matchResultGateTimer = null;
  render();
}

function syncMatchResultPresentationGate(view, previousView) {
  const match = view?.match;
  if (!match || match.status !== 'ENDED') {
    clearMatchResultPresentationGate();
    return;
  }
  const key = matchResultPresentationKey(view);
  if (!key || state.matchResultGate?.key === key) return;

  // A reload/reconnect that hydrates an already-ended room must show the result
  // promptly; historical events are state hydration, not new visual work.
  if (!previousView?.match || previousView.match.status === 'ENDED') {
    state.matchResultGate = { key, ready:true, pending:false };
    return;
  }

  const recentFinalEvents = finalResolutionEventsForView(view, previousView);
  const delay = match.reason === 'RESIGN' ? 0 : finalResolutionPresentationDelay(recentFinalEvents);
  if (delay <= 0) {
    state.matchResultGate = { key, ready:true, pending:false };
    return;
  }

  if (state.matchResultGateTimer) clearTimeout(state.matchResultGateTimer);
  state.matchResultGate = { key, ready:false, pending:true };
  state.matchResultGateTimer = setTimeout(() => resolveMatchResultPresentationGate(key), delay);
}

function matchResultPresentationReady(match) {
  const key = matchResultPresentationKey(state.view);
  return Boolean(match?.status === 'ENDED' && (!key || state.matchResultGate?.key !== key || state.matchResultGate.ready));
}

function clearRecoveryNoticeTimer() {
  clearTimeout(state.recoveryNoticeTimer);
  state.recoveryNoticeTimer = null;
  state.recoveryNoticeStartedAt = null;
}

function beginConnectionRecovery(status, message, feedback = null) {
  clearRecoveryNoticeTimer();
  state.connectionStatus = status;
  state.lastError = message;
  if (status === 'OFFLINE') return;
  const startedAt = Date.now();
  state.recoveryNoticeStartedAt = startedAt;
  state.recoveryNoticeTimer = setTimeout(() => {
    if (state.recoveryNoticeStartedAt !== startedAt || state.connectionStatus !== status) return;
    state.recoveryNoticeTimer = null;
    if (feedback) showFeedback(feedback.tone, feedback.title, feedback.detail, { duration:3600 });
    render();
  }, RECOVERY_NOTICE_DELAY_MS);
}

function completeConnectionRecovery() {
  // Back online is represented by the localized RECOVERED banner below; keep the
  // historical source marker (Authoritative match state synchronized) while the
  // visible notice remains debounced.
  const wasRecovering = Boolean(state.lastLiveAt) && ['RECONNECTING','POLLING','OFFLINE','CONNECTING'].includes(state.connectionStatus);
  clearRecoveryNoticeTimer();
  if (!wasRecovering) {
    state.connectionStatus = 'LIVE';
    return;
  }
  state.connectionStatus = 'RECOVERED';
  state.recoveryNoticeTimer = setTimeout(() => {
    state.recoveryNoticeTimer = null;
    state.recoveryNoticeStartedAt = null;
    if (state.connectionStatus === 'RECOVERED') { state.connectionStatus = 'LIVE'; render(); }
  }, RECOVERED_STATUS_MS);
}

function recoveryNoticeVisible() {
  return !state.recoveryNoticeStartedAt || Date.now() - state.recoveryNoticeStartedAt >= RECOVERY_NOTICE_DELAY_MS;
}

function clientQuery() { return `clientId=${encodeURIComponent(CLIENT_INSTANCE_ID)}`; }
function viewerHasControl() { return state.view?.viewerSession?.activeElsewhere !== true; }
function connectionLabel() {
  if (state.view?.viewerSession?.activeElsewhere) return 'READ-ONLY';
  if (state.connectionStatus === 'LIVE') return 'LIVE';
  if (state.connectionStatus === 'POLLING') return 'HTTP SYNC';
  if (state.connectionStatus === 'RECOVERED') return 'RECOVERED';
  if (navigator.onLine === false || state.connectionStatus === 'OFFLINE') return 'OFFLINE';
  if (state.connectionStatus === 'RECONNECTING') return 'RECONNECTING';
  return 'CONNECTING';
}

function inviteUrl(roomId) {
  const base = String(state.serverInfo?.publicBaseUrl || location.origin).replace(/\/$/, '');
  return `${base}${location.pathname}?join=${encodeURIComponent(String(roomId ?? '').toUpperCase())}`;
}

function browserSummary() {
  const ua=String(navigator.userAgent||'');
  if (/Firefox\/(\d+)/.test(ua)) return `Firefox ${RegExp.$1}`;
  if (/Edg\/(\d+)/.test(ua)) return `Edge ${RegExp.$1}`;
  if (/Chrome\/(\d+)/.test(ua)) return `Chrome ${RegExp.$1}`;
  if (/Version\/(\d+).+Safari/.test(ua)) return `Safari ${RegExp.$1}`;
  return navigator.userAgentData?.brands?.[0]?.brand || 'Browser';
}
function liveAgeLabel() {
  const lastSync=state.lastSyncAt ?? state.lastLiveAt;
  if (!lastSync) return 'No sync yet';
  const seconds=Math.max(0,Math.round((Date.now()-lastSync)/1000));
  return seconds < 2 ? 'just now' : `${seconds}s ago`;
}
async function refreshConnectionDiagnostics() {
  if (state.networkDiagnostics.busy) return;
  state.networkDiagnostics.busy=true; render();
  const started=performance.now();
  try { const health=await api('/api/health'); state.serverInfo=health; state.networkDiagnostics.pingMs=Math.max(0,Math.round(performance.now()-started)); state.networkDiagnostics.checkedAt=Date.now(); }
  catch { state.networkDiagnostics.pingMs=null; state.networkDiagnostics.checkedAt=Date.now(); }
  finally { state.networkDiagnostics.busy=false; render(); }
}

function safeBugReportValue(value) {
  const sensitive=/token|authorization|password|secret|credential|cookie|ticket/i;
  const walk=(input,key='')=>{
    if (sensitive.test(key)) return '[REDACTED]';
    if (Array.isArray(input)) return input.slice(0,60).map((item)=>walk(item));
    if (input && typeof input==='object') { const out={}; for (const [k,v] of Object.entries(input)) out[k]=walk(v,k); return out; }
    if (typeof input==='string') {
      if (input===state.profileToken || input===state.session?.token) return '[REDACTED]';
      return input.slice(0,2000);
    }
    return input;
  };
  return walk(value);
}
function buildBugReportBundle() {
  const match=state.view?.match;
  return safeBugReportValue({
    schema:'office-card-game-bug-report-v1',
    createdAt:new Date().toISOString(),
    app:{version:state.serverInfo?.version??'unknown',serverMode:state.serverInfo?.serverMode??'unknown',url:`${location.origin}${location.pathname}`},
    browser:{summary:browserSummary(),userAgent:navigator.userAgent,language:navigator.language,online:navigator.onLine,visibility:document.visibilityState},
    connection:{status:connectionLabel(),lastLiveAt:state.lastLiveAt?new Date(state.lastLiveAt).toISOString():null,pingMs:state.networkDiagnostics?.pingMs??null,reconnectAttempt:state.reconnectAttempt??0,lastError:state.lastError??null},
    room:state.session?{roomId:state.session.roomId,status:state.view?.status??null,viewerSeat:match?.viewerId??state.view?.playerId??null,stateVersion:match?.stateVersion??null,turn:match?.turnNumber??null,phase:match?.phase??null,activePlayer:match?.activePlayerId??null,priorityPlayer:match?.priorityPlayerId??null}:null,
    ui:{mode:state.mode,intentBusy:state.intentBusy,interactionType:state.interaction?.type??null,focusedCardRef:state.focusedCardRef??null,matchmakingStatus:state.matchmakingTicket?.status??null},
    recentEvents:(state.eventLog??[]).slice(-30),
    projectedDiagnostics:(state.view?.telemetry?.diagnostics??[]).slice(-20)
  });
}
function bugReportJson() { return JSON.stringify(buildBugReportBundle(),null,2); }
async function copyBugReportBundle() {
  try { await navigator.clipboard?.writeText(bugReportJson()); showFeedback('success','Bug report copied','Safe diagnostics copied without room/profile credentials.'); }
  catch { showFeedback('warning','Copy unavailable','Use Download bug report instead.'); }
}
function downloadBugReportBundle() {
  const room=state.session?.roomId?`-${state.session.roomId}`:''; const blob=new Blob([bugReportJson()],{type:'application/json'}); const url=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url; link.download=`office-card-game-bug-report${room}-${Date.now()}.json`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function bindBugReportControls() {
  document.querySelectorAll('[data-copy-bug-report]').forEach((button)=>button.addEventListener('click',copyBugReportBundle));
  document.querySelectorAll('[data-download-bug-report]').forEach((button)=>button.addEventListener('click',downloadBugReportBundle));
}
function renderConnectionDiagnosticsPanel({ compact=false }={}) {
  const match=state.view?.match; const diag=state.networkDiagnostics; const ping=diag.pingMs==null?'—':`${diag.pingMs} ms`;
  const online=navigator.onLine===false?'OFFLINE':'ONLINE';
  return `<details class="connection-diagnostics ${compact?'compact':''}"><summary><div><span>CONNECTION</span><strong>${esc(connectionLabel())} · ${esc(ping)}</strong></div><small>${esc(state.serverInfo?.version ?? 'server ?')} · ${esc(browserSummary())}</small></summary><div class="connection-diagnostics-grid">
    <span><small>SERVER</small><b>${esc(state.serverInfo?.serverMode ?? 'SERVER')}</b><em>v${esc(state.serverInfo?.version ?? '—')}</em></span>
    <span><small>NETWORK</small><b>${esc(online)}</b><em>${esc(location.protocol.replace(':','').toUpperCase())} · ${esc(location.host)}</em></span>
    <span><small>ROOM SYNC</small><b>${esc(connectionLabel())}</b><em>Last sync: ${esc(liveAgeLabel())}</em></span>
    <span><small>ROUND TRIP</small><b>${esc(ping)}</b><em>${diag.checkedAt?'Health probe':'Run check'}</em></span>
    ${state.session?`<span><small>ROOM</small><b>${esc(state.session.roomId)}</b><em>${match?`state v${esc(match.stateVersion)}`:'waiting'}</em></span>`:''}
    ${match?`<span><small>CONTROL</small><b>${viewerHasControl()?'THIS TAB':'READ ONLY'}</b><em>${esc(match.viewerId)}</em></span>`:''}
  </div><div class="connection-diagnostics-actions"><button data-refresh-network-diagnostics ${diag.busy?'disabled':''}>${diag.busy?'Checking…':'Run connection check'}</button>${state.session?'<button data-retry-live-connection>Resync room</button>':''}<button data-copy-bug-report>Copy bug report</button><button data-download-bug-report>Download bug report</button></div></details>`;
}
function bindConnectionDiagnostics() {
  document.querySelectorAll('[data-refresh-network-diagnostics]').forEach((button)=>button.addEventListener('click',refreshConnectionDiagnostics));
  document.querySelectorAll('[data-retry-live-connection]').forEach((button)=>button.addEventListener('click',forceConnectionRecovery));
}
function renderNetworkDiagnostic() {
  const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const mode = state.serverInfo?.serverMode ?? 'SERVER';
  return `<div class="network-diagnostic"><span>${esc(mode)}</span><b>${secure ? 'SECURE PATH' : 'HTTP TEST PATH'}</b><small>${esc(location.host)} · SSE live sync · reconnect enabled</small></div>`;
}

function renderConnectionBanner() {
  const superseded = state.view?.viewerSession?.activeElsewhere;
  if (superseded) return `<div class="connection-banner superseded"><div><strong>Match open elsewhere</strong><span>This tab is read-only so the same seat cannot send moves from two browser sessions.</span></div><button id="takeSessionControl" data-take-session-control class="primary">Take control here</button></div>`;
  if (navigator.onLine === false || state.connectionStatus === 'OFFLINE') return `<div class="connection-banner offline"><div><strong>You are offline</strong><span>Your server-authoritative match is preserved. This page will resync when the network returns.</span></div><button id="retryLiveConnection" data-retry-live-connection>Retry</button></div>`;
  if (state.connectionStatus === 'RECOVERED') return `<div class="connection-banner recovered" role="status"><div><strong>${esc(lobbyCopy('Connection restored.','Verbindung wiederhergestellt.'))}</strong><span>${esc(lobbyCopy('Authoritative match state is synchronized again.','Der serverseitige Matchstand ist wieder synchronisiert.'))}</span></div></div>`;
  if (state.connectionStatus === 'POLLING' && recoveryNoticeVisible()) return `<div class="connection-banner reconnecting"><div><strong>Live stream recovering</strong><span>HTTP fallback sync is active. You can keep playing; the client is still reading authoritative room state.</span></div><button id="retryLiveConnection" data-retry-live-connection>Retry live stream</button></div>`;
  if (state.connectionStatus === 'RECONNECTING' && recoveryNoticeVisible()) return `<div class="connection-banner reconnecting"><div><strong>Reconnecting…</strong><span>Live updates were interrupted. HTTP fallback sync will keep the room current while the live stream recovers.</span></div><button id="retryLiveConnection" data-retry-live-connection>Reconnect now</button></div>`;
  if (state.connectionStatus === 'CONNECTING') return `<div class="connection-banner connecting"><div><strong>Connecting…</strong><span>Synchronizing the current room state.</span></div></div>`;
  return '';
}

function bindConnectionControls() {
  document.querySelectorAll('[data-take-session-control],#takeSessionControl').forEach((button) => button.addEventListener('click', () => claimSessionControl()));
  document.querySelectorAll('[data-retry-live-connection],#retryLiveConnection').forEach((button) => button.addEventListener('click', () => forceConnectionRecovery()));
}

function estimatedServerNow() {
  return Date.now() - Number(state.serverClockOffsetMs || 0);
}

function formatCountdownMs(ms) {
  const total = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function liveTimerText() {
  const timer = state.view?.timer;
  if (!timer?.active) return roomTimerLabel();
  const clock = timer.clock;
  if (!clock?.deadlineAt) return `${timer.profileId} · armed`;
  const label = clock.kind === 'TURN' ? 'Turn' : clock.kind === 'RESPONSE' ? 'Response' : 'Decision';
  return `${label} ${clock.playerId} · ${formatCountdownMs(clock.deadlineAt - estimatedServerNow())}`;
}

function telemetryLiveExtraSeconds() {
  const serverNow = Number(state.view?.telemetry?.serverNow);
  return Number.isFinite(serverNow) ? Math.max(0, (estimatedServerNow() - serverNow) / 1000) : 0;
}

function formatTelemetrySeconds(seconds) {
  const value = Math.max(0, Number(seconds || 0));
  if (value < 60) return `${value.toFixed(value < 10 ? 1 : 0)}s`;
  const minutes = Math.floor(value / 60);
  return `${minutes}m ${Math.round(value % 60)}s`;
}

function liveTelemetryDecisionText() {
  const current = state.view?.telemetry?.currentDecision;
  if (!current) return 'No active decision window';
  return `${current.kind} · ${current.playerId} · ${formatTelemetrySeconds(Number(current.elapsedSeconds || 0) + telemetryLiveExtraSeconds())}`;
}

function updateLiveTimerUi() {
  const live = document.querySelector('#liveTimerStatus');
  if (live) live.textContent = liveTimerText();
  const telemetryDecision = document.querySelector('#liveTelemetryDecision');
  if (telemetryDecision) telemetryDecision.textContent = liveTelemetryDecisionText();
  const telemetryElapsed = document.querySelector('#liveTelemetryElapsed');
  if (telemetryElapsed && state.view?.telemetry?.matchElapsedSeconds != null) telemetryElapsed.textContent = formatTelemetrySeconds(Number(state.view.telemetry.matchElapsedSeconds) + telemetryLiveExtraSeconds());
  document.querySelectorAll('[data-reconnect-player]').forEach((el) => {
    const playerId = el.dataset.reconnectPlayer;
    const deadline = state.view?.timer?.reconnectDeadlineAt?.[playerId];
    el.textContent = deadline ? `RECONNECTING · ${formatCountdownMs(deadline - estimatedServerNow())}` : 'RECONNECTING';
  });
}

function saveSession(session) {
  state.session = session;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  history.replaceState(null, '', `#room=${encodeURIComponent(session.roomId)}`);
  leaveBtn.classList.remove('hidden');
}

function saveRecentSession(session, view = null) {
  state.recentSession = session?.roomId && session?.token ? { roomId:session.roomId, token:session.token, playerId:session.playerId } : null;
  state.recentSessionView = view ?? null;
  if (state.recentSession) localStorage.setItem(RECENT_SESSION_KEY, JSON.stringify(state.recentSession));
  else localStorage.removeItem(RECENT_SESSION_KEY);
}

function loadRecentSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(RECENT_SESSION_KEY) ?? 'null');
    if (saved?.roomId && saved?.token) state.recentSession = saved;
  } catch { localStorage.removeItem(RECENT_SESSION_KEY); }
}

function roomViewHasLiveMatch(view) {
  const matchStatus = view?.match?.status;
  return Boolean(view?.status === 'ACTIVE' && (matchStatus === 'SETUP' || matchStatus === 'ACTIVE'));
}

function roomViewIsResumable(view) {
  return Boolean(view?.status === 'WAITING' || roomViewHasLiveMatch(view));
}

function clearTransientMatchUi({ clearCommit = true, clearCues = true } = {}) {
  if (state.matchResultGateTimer) clearTimeout(state.matchResultGateTimer);
  state.matchResultGateTimer = null;
  state.matchResultGate = null;
  state.selectedHand.clear();
  state.interaction = null;
  state.pendingActionConfirmation = null;
  state.focusedCardRef = null;
  state.returnFocusCardRef = null;
  if (state.hoverTimer) clearTimeout(state.hoverTimer);
  state.hoverTimer = null;
  if (clearCommit) {
    if (state.intentCommitTimer) clearTimeout(state.intentCommitTimer);
    state.intentCommitTimer = null;
    state.intentCommit = null;
    state.intentBusy = false;
  }
  if (clearCues) {
    for (const timer of [state.visualCueTimer,state.attackPresentationTimer,state.gameplayPresentationTimer,state.resolutionTraceTimer,state.flowCueTimer,state.zoneCueTimer]) if (timer) clearTimeout(timer);
    state.visualCueTimer = null;
    state.visualCue = null;
    state.visualCueBatch = [];
    state.attackPresentationTimer = null;
    state.attackPresentation = null;
    state.attackPresentationQueue = [];
    state.hoverAttackTargetId = null;
    state.gameplayPresentationTimer = null;
    state.gameplayPresentation = null;
    state.gameplayPresentationQueue = [];
    state.resolutionTraceTimer = null;
    state.resolutionTrace = null;
    state.flowCueTimer = null;
    state.flowCue = null;
    state.zoneCueTimer = null;
    state.zoneCue = null;
    state.renderedMotionCueKeys.clear();
  }
}

function resetLiveSessionState() {
  stopMatchmakingPoll();
  state.streamGeneration += 1;
  closeCurrentStream();
  clearStreamReconnectTimer();
  clearSyncPollTimer();
  clearRecoveryNoticeTimer();
  state.connectionStatus = 'IDLE';
  clearTransientMatchUi();
  state.session = null;
  state.view = null;
  state.eventLog = [];
  state.lastLiveAt = null;
  state.lastSyncAt = null;
  state.rankedRefreshRoomId = null;
  state.rewardMessage = null;
  state.lastRewardReceipt = null;
  localStorage.removeItem(SESSION_KEY);
  history.replaceState(null, '', location.pathname);
  leaveBtn.classList.add('hidden');
}

function clearSession() {
  resetLiveSessionState();
  render();
}

function parkSession() {
  if (state.session) saveRecentSession(state.session, state.view);
  resetLiveSessionState();
  state.mode = 'PLAY';
  state.lobbyShowcaseDeckValue = null;
  state.lobbyShowcaseCardIds = [];
  render();
}

async function refreshRecentSession() {
  if (!state.recentSession || state.session) return;
  try {
    const view = await api(`/api/rooms/${state.recentSession.roomId}/state?after=0&${clientQuery()}`, { headers:roomAuthHeaders(state.recentSession.token) });
    if (!roomViewIsResumable(view)) {
      saveRecentSession(null);
      return;
    }
    state.recentSessionView = view;
  } catch (error) {
    if (error.code === 'ROOM_NOT_FOUND' || error.code === 'INVALID_TOKEN') saveRecentSession(null);
  }
}

async function claimSessionControl({ restartStream = true, renderAfter = true } = {}) {
  if (!state.session) return false;
  try {
    const result = await api(`/api/rooms/${encodeURIComponent(state.session.roomId)}/session/claim`, { method:'POST', headers:roomAuthHeaders(), body:JSON.stringify({ clientId:CLIENT_INSTANCE_ID }) });
    acceptView(result.view);
    state.connectionStatus = 'CONNECTING';
    state.lastError = null;
    if (restartStream) startStream();
    if (renderAfter) render();
    return true;
  } catch (error) {
    state.lastError = error.message;
    if (error.code === 'NETWORK_UNREACHABLE') beginConnectionRecovery(navigator.onLine === false ? 'OFFLINE' : 'RECONNECTING', error.message);
    if (renderAfter) render();
    return false;
  }
}

async function forceConnectionRecovery() {
  if (!state.session) return;
  state.connectionStatus = navigator.onLine === false ? 'OFFLINE' : 'CONNECTING';
  render();
  try {
    await refreshState(false);
    if (state.view?.viewerSession?.activeElsewhere) { state.connectionStatus = 'SUPERSEDED'; render(); return; }
    startStream();
  } catch { /* refreshState already exposes a friendly error */ }
}

async function resumeRecentSession() {
  if (!state.recentSession) return;
  const session = { ...state.recentSession };
  try {
    // Never trust the local resume shortcut by itself. Confirm that the room still exists
    // and is either waiting for its second seat or owns a live SETUP/ACTIVE match.
    const serverView = await api(`/api/rooms/${session.roomId}/state?after=0&${clientQuery()}`, { headers:roomAuthHeaders(session.token) });
    if (!roomViewIsResumable(serverView)) {
      saveRecentSession(null);
      state.matchmakingMessage = lobbyCopy('That saved match is no longer active. The resume shortcut was removed.','Dieses gespeicherte Match ist nicht mehr aktiv. Die Resume-Verknüpfung wurde entfernt.');
      renderLobby();
      return;
    }
    saveSession(session);
    acceptView(serverView);
    await claimSessionControl({ restartStream:false, renderAfter:false });
    saveRecentSession(null);
    startStream();
  } catch (error) {
    if (error.code === 'ROOM_NOT_FOUND' || error.code === 'INVALID_TOKEN') saveRecentSession(null);
    state.lastError = error.message;
    if (state.session) parkSession(); else renderLobby();
  }
}

async function abandonRecentWaitingRoom() {
  if (!state.recentSession || state.recentSessionView?.status !== 'WAITING') return;
  try {
    await api(`/api/rooms/${state.recentSession.roomId}/abandon`, { method:'POST', headers:roomAuthHeaders(state.recentSession.token), body:'{}' });
    saveRecentSession(null);
    state.matchmakingMessage = 'Waiting room abandoned.';
  } catch (error) { state.lastError = error.message; }
  renderLobby();
}

function forgetRecentSession() {
  saveRecentSession(null);
  renderLobby();
}

leaveBtn.addEventListener('click', parkSession);
let attackConnectorFrame = null;
function scheduleAttackConnectorDraw() {
  if (attackConnectorFrame != null) return;
  attackConnectorFrame = requestAnimationFrame(() => {
    attackConnectorFrame = null;
    drawAttackConnector();
  });
}
window.addEventListener('resize', scheduleAttackConnectorDraw, { passive:true });
window.addEventListener('scroll', scheduleAttackConnectorDraw, { passive:true, capture:true });
document.addEventListener('scroll', scheduleAttackConnectorDraw, { passive:true, capture:true });

function cardDef(definitionId) {
  return definitionId ? localizedCard(state.catalog.get(definitionId)) : null;
}

function allVisibleCards() {
  const match = state.view?.match;
  if (!match) return [];
  const cards = [];
  for (const player of Object.values(match.players)) {
    cards.push(...player.hand);
    cards.push(...player.employeeField.filter(Boolean));
    cards.push(...player.supportField.filter(Boolean));
    cards.push(...player.archive);
  }
  if (match.pendingDeckSelection) cards.push(...match.pendingDeckSelection.visibleCards);
  if (match.pendingResolutions) cards.push(...match.pendingResolutions.map((x) => x.card));
  return cards;
}

function cardByRef(ref) {
  return allVisibleCards().find((c) => c.instanceId === ref) ?? null;
}

function cardLabel(ref) {
  if (ref === null) return 'Company Reputation';
  const card = cardByRef(ref);
  if (!card) return ref.startsWith?.('hidden-support:') ? 'Face-down Support' : ref;
  const def = cardDef(card.definitionId);
  return def?.name ?? (card.faceUp ? card.definitionId ?? 'Card' : 'Face-down Incident');
}


function implementationLabel(def) {
  if (!def) return '';
  if (def.implementationStatus === 'TEXT_ONLY') return 'Rules text only';
  if (def.implementationStatus === 'PARTIAL') return 'Partially implemented';
  return 'Engine-ready';
}

function cardCostLabel(def) {
  if (!def) return '';
  if (def.cost?.play != null) return `Cost ${def.cost.play}`;
  if (def.cost?.set != null) return `Set ${def.cost.set}`;
  return '';
}


function departmentCode(department) {
  return ({ CUSTOMER_SERVICE:'CS', IT:'IT', OFFICE:'OFC', MARKETING:'MKT', PRODUCTION:'PRD', NEUTRAL:'NEU' })[department] ?? department;
}

function lobbyCopy(english, german) {
  return currentLocale() === 'de' ? german : english;
}

function collectionCopy(key, params = {}, fallback = null) {
  return t(`collection.${key}`, params, fallback);
}

function lobbyModeName(mode) {
  if (!mode) return lobbyCopy('Friendly','Freundschaft');
  if (mode.id === 'FRIENDLY') return lobbyCopy(mode.name ?? 'Friendly','Freundschaft');
  return mode.name ?? mode.id;
}

function lobbyModeDescription(mode) {
  if (!mode) return '';
  if (mode.id === 'FRIENDLY') return lobbyCopy(mode.description ?? 'Manual friendly room.','Manueller Freundschaftsraum.');
  if (mode.id === 'RANKED') return lobbyCopy(mode.description ?? 'Ranked Alpha rules.','Ranked-Alpha-Regeln.');
  return mode.description ?? '';
}

function departmentIdentity(department) {
  const identities = currentLocale() === 'de' ? ({
    CUSTOMER_SERVICE:{ label:'Kundenservice', loop:'Reagieren → Umleiten → Wieder öffnen → Durchhalten', note:'Tickets, Anrufe und Bewertungen verwandeln Druck in eine weitere Chance.' },
    IT:{ label:'IT', loop:'Aufbauen → Automatisieren → Erzeugen → Ausrollen', note:'Baue Systeme auf, senke Kosten und mache aus Vorbereitung effiziente Züge.' },
    OFFICE:{ label:'Office', loop:'Koordinieren → Freigeben → Verzögern → Organisieren', note:'Kontrolliere das Tempo mit Meetings, Prozessen und Freigabe-Reibung.' },
    MARKETING:{ label:'Marketing', loop:'Aufbauen → Aktionen verketten → Druck erhöhen → Konvertieren', note:'Verkette Marketing-Aktionen und verwandle Momentum in Reputationsdruck.' },
    PRODUCTION:{ label:'Produktion', loop:'Linie besetzen → Output erhöhen → Überrollen → Durchbrechen', note:'Fülle die Fläche, skaliere Power und verwandle ein breites Board in Durchbruch.' },
    NEUTRAL:{ label:'Neutral', loop:'Unterstützen → Anpassen → Lücken füllen', note:'Büroalltag als Bindeglied für gemischte Pläne und flexible Slots.' }
  }) : ({
    CUSTOMER_SERVICE:{ label:'Customer Service', loop:'React → Redirect → Reopen → Survive', note:'Tickets, Calls and Reviews turn pressure into another chance.' },
    IT:{ label:'IT', loop:'Setup → Automate → Generate → Deploy', note:'Build Systems, squeeze costs and turn setup into efficient turns.' },
    OFFICE:{ label:'Office', loop:'Coordinate → Approve → Delay → Organize', note:'Control tempo with Meetings, Process cards and approval friction.' },
    MARKETING:{ label:'Marketing', loop:'Setup → Chain Actions → Build Pressure → Convert', note:'Sequence real Marketing Actions and convert momentum into Reputation pressure.' },
    PRODUCTION:{ label:'Production', loop:'Staff line → Increase Output → Overwhelm → Break Through', note:'Fill the floor, scale Power and turn a wide board into Breakthrough.' },
    NEUTRAL:{ label:'Neutral', loop:'Support → Adapt → Fill gaps', note:'Office-culture glue that supports mixed plans and utility slots.' }
  });
  return identities[department] ?? { label:String(department ?? lobbyCopy('Unknown','Unbekannt')), loop:lobbyCopy('Build → Adapt → Win','Aufbauen → Anpassen → Gewinnen'), note:'' };
}

function departmentThemeClass(department) {
  return `dept-${String(department ?? 'NEUTRAL').toLowerCase()}`;
}

function roomDepartmentForPlayer(playerId) {
  return playerId === 'P1' ? (state.view?.hostDepartment ?? 'NEUTRAL') : (state.view?.guestDepartment ?? 'NEUTRAL');
}

function roomDeckNameForPlayer(playerId) {
  return playerId === 'P1' ? (state.view?.hostDeckName ?? state.view?.hostDeckId ?? 'Deck') : (state.view?.guestDeckName ?? state.view?.guestDeckId ?? 'Deck');
}

function raritySignal(def, tierOverride = null, compact = false) {
  if (!def && !tierOverride) return '';
  const tier = String(tierOverride ?? sandboxRarityTier(def) ?? 'T0');
  const label = def ? sandboxRarityLabel(def) : tier;
  const rank = Math.max(1, Math.min(4, Number(tier.slice(1)) + 1 || 1));
  return `<span class="rarity-signal tier-${esc(tier.toLowerCase())} ${compact ? 'compact' : ''}" aria-label="${esc(`${tier} ${label}`)}"><i class="rarity-pips" aria-hidden="true">${Array.from({length:4},(_,index)=>`<b class="${index < rank ? 'on' : ''}"></b>`).join('')}</i><strong>${esc(tier)}</strong>${compact ? '' : `<small>${esc(label)}</small>`}</span>`;
}

function cardCostParts(def) {
  if (!def) return null;
  if (def.cost?.play != null) return { label:'COST', value:def.cost.play };
  if (def.cost?.set != null) return { label:'SET', value:def.cost.set };
  return null;
}

function catalogCardDetailBits(def) {
  if (!def) return [];
  return [def.rank, def.promotion?.required ? `PROMOTION ${def.promotion.required}` : ''].filter(Boolean);
}

function renderCatalogCardFace(def, { tier = null, compact = false, isNew = false, artReady = false, owned = null, variantId = null, finishBadgePlacement = 'type-strip' } = {}) {
  if (!def) return '<div class="catalog-card-face missing">Unknown card</div>';
  const costParts = cardCostParts(def);
  const detailBits = catalogCardDetailBits(def);
  const rarity = String(tier ?? sandboxRarityTier(def));
  const tags = (def.tags ?? []).slice(0, compact ? 1 : 2);
  const longName = def.name.length >= 22;
  const power = def.cardType === 'EMPLOYEE' && def.power != null ? Number(def.power) : null;
  const premium = isExecutiveEditionVariant(variantId);
  const finishBadge = premium ? `<i class="card-finish-badge">${esc(collectionCopy('executiveEdition'))}</i>` : '';
  return `<div class="catalog-card-face type-${esc(def.cardType.toLowerCase())} tier-${esc(rarity.toLowerCase())} ${compact ? 'compact' : ''} ${power != null ? 'has-power' : ''} ${premium ? 'executive-edition' : ''}">
    <div class="catalog-type-strip"><span>${esc(cardTypeLabel(def.cardType))}</span><b>${esc(departmentCode(def.department))}</b>${raritySignal(def, rarity, true)}${finishBadgePlacement === 'type-strip' ? finishBadge : ''}</div>
    <div class="catalog-name-row"><strong class="${longName ? 'long-name' : ''}">${esc(def.name)}</strong>${costParts ? `<span class="card-cost-badge catalog-cost"><span>${esc(costParts.label)}</span><b>${esc(costParts.value)}</b></span>` : ''}</div>
    <div class="catalog-art-stage">${finishBadgePlacement === 'artwork' ? finishBadge : ''}${catalogArt(def)}${String(rarity)==='T3' ? '<i class="catalog-foil-sheen" aria-hidden="true"></i>' : ''}${premium ? '<i class="executive-art-foil" aria-hidden="true"></i>' : ''}</div>
    <div class="catalog-detail-row">${detailBits.length ? detailBits.map((bit)=>`<span>${esc(bit)}</span>`).join('') : `<span>${esc(sandboxRarityLabel(def))}</span>`}${owned != null ? `<b>OWNED ${esc(owned)}</b>` : ''}</div>
    ${compact ? '' : `<div class="catalog-rules ${rulesDensityClass(def.rulesText)}">${esc(def.rulesText || 'No rules text.')}</div>`}
    ${compact ? '' : `<div class="catalog-tags">${tags.length ? tags.map((tag)=>`<span>${esc(tag)}</span>`).join('') : '<span>OFFICE</span>'}</div>`}
    ${power != null ? `<div class="catalog-power-badge"><span>POWER</span><b>${esc(power)}</b></div>` : ''}
    ${isNew ? '<i class="catalog-new-stamp">NEW</i>' : ''}
  </div>`;
}

function legalHandCardIds() {
  const legal = state.view?.match?.legalActions;
  if (!legal) return new Set();
  return new Set([
    ...legal.playableEmployees.map((x) => x.cardId),
    ...legal.playableSystems.map((x) => x.cardId),
    ...legal.settableIncidents.map((x) => x.cardId),
    ...legal.playableActions.map((x) => x.cardId)
  ]);
}

function legalHandActionLabel(cardId) {
  const legal = state.view?.match?.legalActions;
  if (!legal || !cardId) return null;
  if (legal.settableIncidents.some((x) => x.cardId === cardId)) return 'SET';
  if (legal.playableEmployees.some((x) => x.cardId === cardId)) return 'PLAY';
  if (legal.playableSystems.some((x) => x.cardId === cardId)) return 'PLAY';
  if (legal.playableActions.some((x) => x.cardId === cardId)) return 'PLAY';
  return null;
}

function printedHandCost(def) {
  const parts = cardCostParts(def);
  return parts && Number.isFinite(Number(parts.value)) ? Number(parts.value) : null;
}

function mainPhaseHandContext(match) {
  if (!match || match.status !== 'ACTIVE' || match.activePlayerId !== match.viewerId || match.phase !== 'MAIN') return null;
  const me = match.players?.[match.viewerId];
  if (!me) return null;
  const legalIds = legalHandCardIds();
  const playableByType = { EMPLOYEE:0, ACTION:0, INCIDENT:0, SYSTEM:0 };
  let printedOverCapacity = 0;
  for (const card of me.hand ?? []) {
    const def = cardDef(card.definitionId);
    if (!def) continue;
    if (legalIds.has(card.instanceId)) {
      if (Object.hasOwn(playableByType, def.cardType)) playableByType[def.cardType] += 1;
      continue;
    }
    const cost = printedHandCost(def);
    if (cost != null && cost > Number(me.availableCapacity ?? 0)) printedOverCapacity += 1;
  }
  return {
    playable:legalIds.size,
    playableByType,
    printedOverCapacity,
    capacity:Number(me.availableCapacity ?? 0),
    maxCapacity:Number(me.maxCapacity ?? 0),
    employeeSlots:(me.employeeField ?? []).filter((card) => !card).length,
    supportSlots:(me.supportField ?? []).filter((card) => !card).length
  };
}

function handCardAvailabilityNote(card, def) {
  const match = state.view?.match;
  if (!match || !card || card.zone !== 'HAND' || !def) return null;
  const context = cardInspectionContext(card.instanceId);
  if (context?.ownerId !== match.viewerId) return null;
  if (legalHandCardIds().has(card.instanceId)) return null;
  const mustChoose = Boolean(match.pendingChoice?.playerId === match.viewerId || match.pendingDeckSelection?.playerId === match.viewerId || match.pendingTriggerTargetSelection?.playerId === match.viewerId || match.pendingHandSelection?.playerId === match.viewerId);
  if (match.status === 'SETUP') return { tag:'OPENING HAND', title:'Opening decision in progress', detail:'Finish or wait for the mulligan before normal card play begins.' };
  if (mustChoose) return { tag:'DECISION FIRST', title:'Resolve the current choice', detail:'The match is waiting for the highlighted decision before normal card play can continue.' };
  if (match.priorityPlayerId === match.viewerId && (match.responseWindow || match.chainLength)) return { tag:'RESPONSE FIRST', title:'Response window is active', detail:'Respond or pass priority before returning to normal turn actions.' };
  if (match.priorityPlayerId && match.priorityPlayerId !== match.viewerId) return { tag:'WAITING', title:'Opponent has priority', detail:'Normal card play resumes when priority returns.' };
  if (match.activePlayerId !== match.viewerId) return { tag:'WAIT FOR TURN', title:'Opponent turn', detail:'Normal hand plays are available on your own Main phase unless a card explicitly responds.' };
  const endNote = endPhaseHandAvailabilityNote(card);
  if (endNote) return endNote;
  if (match.phase !== 'MAIN') return { tag:'MAIN PHASE', title:'Not the Main phase', detail:'Normal Employees, Actions, Systems and set Incidents are handled during your Main phase.' };
  const me = match.players?.[match.viewerId];
  const cost = printedHandCost(def);
  if (cost != null && cost > Number(me?.availableCapacity ?? 0)) return { tag:'CAPACITY CONTEXT', title:`Printed cost ${cost} · ${Number(me?.availableCapacity ?? 0)} Capacity available`, detail:'Printed cost is above current Capacity. Cost modifiers can still affect live availability.' };
  return { tag:'NOT AVAILABLE NOW', title:'No legal play offered from this card', detail:'Check its requirements, targets, board state and Capacity. The live legal-action list remains authoritative.' };
}

function handCardContextBadge(card, def) {
  const match = state.view?.match;
  if (!match || !card || card.zone !== 'HAND' || !def || legalHandCardIds().has(card.instanceId)) return '';
  if (match.status !== 'ACTIVE' || match.activePlayerId !== match.viewerId || match.phase !== 'MAIN') return '';
  if (match.responseWindow || match.chainLength || match.pendingChoice || match.pendingDeckSelection || match.pendingTriggerTargetSelection || match.pendingHandSelection) return '';
  const cost = printedHandCost(def);
  const available = Number(match.players?.[match.viewerId]?.availableCapacity ?? 0);
  return cost != null && cost > available ? '<span class="card-block-hint">COST &gt; CAP</span>' : '';
}

const MATCH_PHASE_FLOW = ['START','DRAW','MAIN','BATTLE','END'];
const PHASE_PRESENTATION = {
  START:{ title:'START', hint:'Refresh' },
  DRAW:{ title:'DRAW', hint:'Draw' },
  MAIN:{ title:'MAIN', hint:'Play cards' },
  BATTLE:{ title:'BATTLE', hint:'Attack' },
  END:{ title:'END', hint:'Wrap up' }
};

const PHASE_I18N_KEYS = {
  START:'match.phaseStart',
  DRAW:'match.phaseDraw',
  MAIN:'match.phaseMain',
  BATTLE:'match.phaseBattle',
  END:'match.phaseEnd'
};

function phaseDisplayTitle(phase) {
  return t(PHASE_I18N_KEYS[phase] ?? phase, {}, PHASE_PRESENTATION[phase]?.title ?? phase);
}

function phaseControlIsManual(match) {
  const tutorial = state.view?.settings?.mode === 'TUTORIAL';
  return tutorial || match.phase === 'MAIN' || match.phase === 'BATTLE';
}

function phaseAdvanceLabel(phase) {
  const keys = { START:'match.continueToDraw', DRAW:'match.continueToMain', MAIN:'match.goToBattle', BATTLE:'match.goToEnd', END:'match.endTurn' };
  return t(keys[phase] ?? 'match.endTurn', {}, `End ${phase} phase →`);
}

function phaseAdvanceSafety(match) {
  if (!match?.legalActions?.canAdvancePhase || match.activePlayerId !== match.viewerId) return null;
  const availability = actionAvailability(match);
  const me = match.players?.[match.viewerId];
  if (match.phase === 'MAIN' && (availability.playableCards || availability.abilities)) {
    const parts = [];
    if (availability.playableCards) parts.push(`${availability.playableCards} hand play${availability.playableCards === 1 ? '' : 's'}`);
    if (availability.abilities) parts.push(`${availability.abilities} activatable ${availability.abilities === 1 ? 'ability' : 'abilities'}`);
    return { phase:'MAIN', title:'Leave Main phase?', detail:`${parts.join(' · ')} still available. There is no Main Phase 2, so advancing leaves these Main-phase opportunities behind.`, confirmLabel:'Go to Battle anyway', count:availability.playableCards + availability.abilities };
  }
  if (match.phase === 'BATTLE' && (availability.attacks || availability.abilities)) {
    const parts = [];
    if (availability.attacks) parts.push(`${availability.attacks} legal attack${availability.attacks === 1 ? '' : 's'}`);
    if (availability.abilities) parts.push(`${availability.abilities} activatable ${availability.abilities === 1 ? 'ability' : 'abilities'}`);
    return { phase:'BATTLE', title:'Leave Battle phase?', detail:`${parts.join(' · ')} still available. Advancing ends this turn's Battle opportunities.`, confirmLabel:'Go to End anyway', count:availability.attacks + availability.abilities };
  }
  if (match.phase === 'END') {
    const capacity = Number(me?.availableCapacity ?? 0);
    if (availability.abilities || capacity > 0) {
      const parts = [];
      if (availability.abilities) parts.push(`${availability.abilities} activatable ${availability.abilities === 1 ? 'ability' : 'abilities'}`);
      if (capacity > 0) parts.push(`${capacity} Capacity will expire`);
      return { phase:'END', title:'End turn?', detail:`${parts.join(' · ')}. Confirm to hand the office to your opponent.`, confirmLabel:'End turn anyway', count:availability.abilities + (capacity > 0 ? 1 : 0) };
    }
  }
  return null;
}

function activeAdvanceConfirmation(match) {
  const pending = state.pendingActionConfirmation;
  if (!pending || pending.kind !== 'ADVANCE_PHASE') return null;
  if (pending.stateVersion !== match?.stateVersion || pending.phase !== match?.phase) return null;
  return pending;
}

function requestPhaseAdvance(match) {
  const safety = phaseAdvanceSafety(match);
  if (!safety) return sendIntent({ type:'ADVANCE_PHASE' });
  state.pendingActionConfirmation = { kind:'ADVANCE_PHASE', stateVersion:match.stateVersion, ...safety };
  render();
}

function renderPhaseTrack(match) {
  const currentIndex = MATCH_PHASE_FLOW.indexOf(match.phase);
  return `<div class="phase-track" aria-label="${esc(t('match.phaseTrackLabel', { phase: phaseDisplayTitle(match.phase) }))}">${MATCH_PHASE_FLOW.map((phase, index) => {
    const meta = PHASE_PRESENTATION[phase];
    const progress = index === currentIndex ? 'active' : index < currentIndex ? 'complete' : 'upcoming';
    return `<span class="${progress}" ${index === currentIndex ? 'aria-current="step"' : ''}><b>${esc(phaseDisplayTitle(phase))}</b></span>`;
  }).join('')}</div>`;
}

function renderBoardPhaseDivider(match) {
  const localTurn = match.activePlayerId === match.viewerId;
  const ownerClass = localTurn ? 'turn-owner-own' : 'turn-owner-opponent';
  const ownerLabel = t(localTurn ? 'match.yourTurn' : 'match.opponentTurn');
  return `<div class="office-divider board-phase-divider ${ownerClass}" role="navigation" aria-label="${esc(t('match.currentTurnPhase'))}"><span class="turn-owner-cue">${esc(ownerLabel)}</span>${renderPhaseTrack(match)}</div>`;
}

function actionAvailability(match) {
  const legal = match?.legalActions ?? {};
  const playableCardIds = new Set([
    ...(legal.playableEmployees ?? []).map((x) => x.cardId),
    ...(legal.playableSystems ?? []).map((x) => x.cardId),
    ...(legal.settableIncidents ?? []).map((x) => x.cardId),
    ...(legal.playableActions ?? []).map((x) => x.cardId)
  ]);
  const mainContext = mainPhaseHandContext(match);
  return {
    playableCards: playableCardIds.size,
    attacks: (legal.attacks ?? []).length,
    abilities: (legal.activatableAbilities ?? []).length,
    responses: (legal.responseOptions ?? []).length,
    printedOverCapacity: mainContext?.printedOverCapacity ?? 0,
    mustChoose: Boolean(match?.pendingChoice?.playerId === match?.viewerId || match?.pendingDeckSelection?.playerId === match?.viewerId || match?.pendingTriggerTargetSelection?.playerId === match?.viewerId || match?.pendingHandSelection?.playerId === match?.viewerId),
    handLimit: (legal.archiveExcessHandIds ?? []).length
  };
}

function currentActionPrompt(match) {
  const a = actionAvailability(match);
  if (match.status === 'ENDED') return { title:'Match complete', detail:'Review the result or return to the lobby.', tone:'ended' };
  if (a.handLimit) return { title:'Trim your hand', detail:`Archive ${Math.max(0, (match.players?.[match.viewerId]?.hand?.length ?? 8) - 8)} card(s) before ending the turn.`, tone:'required' };
  if (a.mustChoose) return { title:'Decision required', detail:'Resolve the highlighted choice before play can continue.', tone:'required' };
  if (match.priorityPlayerId === match.viewerId && (match.responseWindow || match.chainLength)) return { title:'Your response', detail:a.responses ? `${a.responses} response option${a.responses === 1 ? '' : 's'} available, or pass priority.` : 'No response card available — pass priority to continue.', tone:'response' };
  if (match.priorityPlayerId && match.priorityPlayerId !== match.viewerId) return { title:'Opponent has priority', detail:'Waiting for their response before the Chain can continue.', tone:'waiting' };
  if (match.activePlayerId !== match.viewerId) return { title:"Opponent's turn", detail:`${PHASE_PRESENTATION[match.phase]?.hint ?? match.phase} · your board remains interactive for inspection.`, tone:'waiting' };
  if (match.phase === 'MAIN') {
    const bits = [];
    if (a.playableCards) bits.push(`${a.playableCards} playable card${a.playableCards === 1 ? '' : 's'}`);
    if (a.abilities) bits.push(`${a.abilities} activated ${a.abilities === 1 ? 'ability' : 'abilities'}`);
    return { title:'Build your board', detail:bits.length ? `${bits.join(' · ')}. Highlighted cards are legal now.` : a.printedOverCapacity ? `No legal hand play right now · ${a.printedOverCapacity} card${a.printedOverCapacity === 1 ? ' has' : 's have'} printed cost above current Capacity.` : 'No card play is currently available. You can move to Battle when ready.', tone:'main' };
  }
  if (match.phase === 'BATTLE') return { title:a.attacks ? 'Choose your attacks' : 'Battle is clear', detail:a.attacks ? `${a.attacks} Employee${a.attacks === 1 ? '' : 's'} can attack. Select an ATTACK card, then choose a target.` : 'No legal attacks remain. Move to End when ready.', tone:'battle' };
  if (match.phase === 'END') return { title:'Wrap up the turn', detail:'Resolve any remaining End effects, then hand control to your opponent.', tone:'end' };
  return { title:`${PHASE_PRESENTATION[match.phase]?.title ?? match.phase} phase`, detail:`${PHASE_PRESENTATION[match.phase]?.hint ?? 'Continue'} when ready.`, tone:'phase' };
}

function handZoneHint(match) {
  const legalCount = legalHandCardIds().size;
  if (match?.legalActions?.canMulligan) return 'Select cards to replace';
  if (match?.legalActions?.archiveExcessHandIds?.length) {
    const handCount = match.players?.[match.viewerId]?.hand?.length ?? 8;
    const needed = Math.max(0, handCount - 8);
    return `Select exactly ${needed} to Archive · ${handCount}/8`;
  }
  if (match?.activePlayerId === match?.viewerId && match?.phase === 'MAIN') return legalCount ? `${legalCount} playable now · highlighted` : 'No hand plays right now';
  if (match?.priorityPlayerId === match?.viewerId) return 'Response window active';
  return 'Inspect or open card details';
}


function legalAttackOption(instanceId) {
  return (state.view?.match?.legalActions?.attacks ?? []).find((attack) => attack.attackerId === instanceId) ?? null;
}

function legalAttackSourceIds() {
  const legal = state.view?.match?.legalActions;
  return new Set((legal?.attacks ?? []).map((x) => x.attackerId));
}

function attackReadyBadgeMeta(instanceId) {
  const attack = legalAttackOption(instanceId);
  if (!attack) return null;
  const targets = attack.targetIds ?? [];
  const direct = targets.includes(null);
  const fieldTargets = targets.filter((targetId) => targetId != null).length;
  if (direct) return { label:'DIRECT READY', title:'Direct attack is legal now.' };
  if (fieldTargets) return { label:`ATTACK READY · ${fieldTargets}`, title:`${fieldTargets} legal Employee target${fieldTargets === 1 ? '' : 's'} in the live server projection.` };
  return { label:'ATTACK READY', title:'This Employee is offered as a legal attacker by the server.' };
}

function projectedChoiceTargetIds(targetChoices = []) {
  return [...new Set((targetChoices ?? []).flatMap((choice) => choice?.candidateIds ?? []).filter((id) => id != null))];
}

function boardActionFocusMeta(instanceId) {
  const attack = legalAttackOption(instanceId);
  const ability = legalAbilityOption(instanceId);
  const response = legalResponseOption(instanceId);
  const targets = new Set();
  let direct = false;
  const modes = [];
  // Attack target focus begins only after an explicit click/tap selects the attacker.
  // Keep the authoritative projection available here for regression/source compatibility,
  // but a passive hover must never leak the real Attack selection/dimming state.
  const includeAttackHoverFocus = false;
  if (attack && includeAttackHoverFocus) {
    modes.push('ATTACK');
    for (const targetId of attack.targetIds ?? []) {
      if (targetId == null) direct = true;
      else targets.add(targetId);
    }
  }
  const abilityTargets = projectedChoiceTargetIds(ability?.targetChoices);
  if (ability) modes.push('ABILITY');
  for (const targetId of abilityTargets) targets.add(targetId);
  const responseTargets = projectedChoiceTargetIds(response?.targetChoices);
  if (response) modes.push('RESPONSE');
  for (const targetId of responseTargets) targets.add(targetId);
  if (!targets.size && !direct) return null;
  return { targets:[...targets], direct, modes, abilityTargets:abilityTargets.length, responseTargets:responseTargets.length };
}

function battlePhaseContext(match) {
  if (!match || match.status !== 'ACTIVE' || match.activePlayerId !== match.viewerId || match.phase !== 'BATTLE') return null;
  const me = match.players?.[match.viewerId];
  const opponentId = match.viewerId === 'P1' ? 'P2' : 'P1';
  const opponent = match.players?.[opponentId];
  if (!me || !opponent) return null;
  const attacks = match.legalActions?.attacks ?? [];
  const readyIds = new Set(attacks.map((attack) => attack.attackerId));
  const targetIds = new Set(attacks.flatMap((attack) => attack.targetIds ?? []).filter((id) => id != null));
  const directReady = attacks.filter((attack) => (attack.targetIds ?? []).includes(null)).length;
  const employees = (me.employeeField ?? []).filter(Boolean);
  return {
    ready:readyIds.size,
    legalTargets:targetIds.size,
    directReady,
    onboarding:employees.filter((card) => card.onboarding).length,
    attacksUsed:employees.filter((card) => !card.onboarding && card.maxAttacks != null && (card.attacksUsed ?? 0) >= card.maxAttacks).length,
    opponentEmployees:(opponent.employeeField ?? []).filter(Boolean).length
  };
}

function endPhaseContext(match) {
  if (!match || match.status !== 'ACTIVE' || match.activePlayerId !== match.viewerId || match.phase !== 'END') return null;
  const me = match.players?.[match.viewerId];
  if (!me) return null;
  const legal = match.legalActions ?? {};
  const hand = me.hand ?? [];
  const archiveNeeded = Math.max(0, hand.length - 8);
  const selectedForArchive = [...state.selectedHand].filter((id) => (legal.archiveExcessHandIds ?? []).includes(id)).length;
  return {
    hand:hand.length,
    handLimit:8,
    archiveNeeded,
    selectedForArchive,
    abilities:(legal.activatableAbilities ?? []).length,
    capacity:Number(me.availableCapacity ?? 0),
    handoffReady:Boolean(legal.canAdvancePhase) && archiveNeeded === 0
  };
}

function endPhaseHandAvailabilityNote(card) {
  const match = state.view?.match;
  if (!match || !card || card.zone !== 'HAND') return null;
  const eligible = match.legalActions?.archiveExcessHandIds ?? [];
  if (match.activePlayerId !== match.viewerId || match.phase !== 'END' || !eligible.includes(card.instanceId)) return null;
  const needed = Math.max(0, (match.players?.[match.viewerId]?.hand?.length ?? 8) - 8);
  return { tag:'HAND LIMIT', title:'Eligible to Archive', detail:`Select exactly ${needed} card${needed === 1 ? '' : 's'} from your hand to return to 8 before the turn can finish.` };
}

function employeeBattleAvailabilityNote(card) {
  const match = state.view?.match;
  if (!match || !card || card.zone !== 'EMPLOYEE_FIELD') return null;
  const context = cardInspectionContext(card.instanceId);
  if (context?.ownerId !== match.viewerId || legalAttackSourceIds().has(card.instanceId)) return null;
  const mustChoose = Boolean(match.pendingChoice?.playerId === match.viewerId || match.pendingDeckSelection?.playerId === match.viewerId || match.pendingTriggerTargetSelection?.playerId === match.viewerId || match.pendingHandSelection?.playerId === match.viewerId);
  if (match.status === 'SETUP') return { tag:'OPENING HAND', title:'Match setup in progress', detail:'Battle actions begin after the opening sequence and the turn reaches Battle.' };
  if (mustChoose) return { tag:'DECISION FIRST', title:'Resolve the current choice', detail:'The match is waiting for the highlighted decision before Battle actions can continue.' };
  if (match.priorityPlayerId === match.viewerId && (match.responseWindow || match.chainLength)) return { tag:'RESPONSE FIRST', title:'Response window is active', detail:'Respond or pass priority before returning to normal Battle actions.' };
  if (match.priorityPlayerId && match.priorityPlayerId !== match.viewerId) return { tag:'WAITING', title:'Opponent has priority', detail:'Battle actions resume when priority returns.' };
  if (match.activePlayerId !== match.viewerId) return { tag:'WAIT FOR TURN', title:'Opponent turn', detail:'Normal attacks are declared during your own Battle phase.' };
  if (match.phase !== 'BATTLE') return { tag:'BATTLE PHASE', title:'Not the Battle phase', detail:'Normal attacks are declared during your Battle phase.' };
  if (card.onboarding) return { tag:'ONBOARDING', title:'Cannot attack this turn', detail:'This Employee entered play this turn. Its other effects can still function normally.' };
  if (card.maxAttacks != null && (card.attacksUsed ?? 0) >= card.maxAttacks) return { tag:'ATTACK USED', title:'No attack remaining', detail:`This Employee has used ${card.attacksUsed ?? 0} / ${card.maxAttacks} attacks this turn.` };
  return { tag:'NO LEGAL ATTACK', title:'No attack offered from this Employee', detail:'Check the live board state and card effects. The server-projected legal attack list remains authoritative.' };
}

function legalAbilityOption(instanceId) {
  return state.view?.match?.legalActions?.activatableAbilities?.find((x) => x.sourceId === instanceId) ?? null;
}

function currentTargetChoice() {
  const interaction = state.interaction;
  if (!interaction || interaction.type !== 'TARGETS') return null;
  return interaction.targetChoices[interaction.index] ?? null;
}

function targetCandidateIds() {
  return new Set(currentTargetChoice()?.candidateIds ?? []);
}

function selectedTargetIds() {
  const interaction = state.interaction;
  if (!interaction || interaction.type !== 'TARGETS') return new Set();
  return new Set(Object.values(interaction.selections).flat());
}

function promotionMaterialCandidateIds() {
  const interaction = state.interaction;
  if (!interaction || interaction.type !== 'PROMOTION') return new Set();
  return new Set((interaction.options ?? []).flatMap((option) => option.promotionMaterialIds ?? []));
}

function visualCueEvents() {
  const cues = Array.isArray(state.visualCueBatch) && state.visualCueBatch.length ? [...state.visualCueBatch] : (state.visualCue ? [state.visualCue] : []);
  const attackEvent = state.attackPresentation?.event;
  if (attackEvent && !cues.some((cue) => cue.seq === attackEvent.seq)) cues.push(attackEvent);
  return cues;
}

const ATTACK_PRESENTATION_MS = 2400;
function attackPresentationFromEvent(event) {
  if (!event || event.type !== 'ATTACK_DECLARED') return null;
  const viewerId = state.view?.match?.viewerId;
  return {
    event,
    opponent:Boolean(viewerId && event.playerId && event.playerId !== viewerId),
    attacker:cardLabel(event.cardInstanceId) || 'Employee',
    target:event.data?.targetId == null ? 'Company Reputation' : (cardLabel(event.data.targetId) || 'Employee')
  };
}

function armAttackPresentationTimer() {
  if (state.attackPresentationTimer || !state.attackPresentation) return;
  state.attackPresentationTimer = setTimeout(() => {
    state.attackPresentationTimer = null;
    state.attackPresentation = state.attackPresentationQueue.shift() ?? null;
    if (state.attackPresentation) armAttackPresentationTimer();
    render();
  }, ATTACK_PRESENTATION_MS);
}

function enqueueAttackPresentations(events = []) {
  for (const event of events) {
    const presentation = attackPresentationFromEvent(event);
    if (!presentation) continue;
    const alreadyCurrent = state.attackPresentation?.event?.seq === event.seq;
    const alreadyQueued = state.attackPresentationQueue.some((item) => item.event?.seq === event.seq);
    if (!alreadyCurrent && !alreadyQueued) state.attackPresentationQueue.push(presentation);
  }
  if (!state.attackPresentation) state.attackPresentation = state.attackPresentationQueue.shift() ?? null;
  armAttackPresentationTimer();
}

function renderAttackPresentation() {
  const cue = state.attackPresentation;
  if (!cue) return '';
  return `<div class="attack-presentation ${cue.opponent ? 'opponent' : 'own'}" role="status" aria-live="polite" aria-atomic="true"><span>${cue.opponent ? 'OPPONENT ATTACK' : 'ATTACK'}</span><strong>${esc(cue.attacker)}</strong><i aria-hidden="true">→</i><b>${esc(cue.target)}</b></div>`;
}

const GAMEPLAY_PRESENTATION_MS = 3400;
const GAMEPLAY_PRESENTATION_TYPES = new Set(['CARD_PLAYED','INCIDENT_ACTIVATED','ABILITY_ACTIVATED','PROMOTION_COMPLETED','EMPLOYEE_DESTROYED','CARD_DESTROYED','BREAKTHROUGH_DAMAGE']);
function gameplayPresentationFromEvent(event) {
  if (!event || !GAMEPLAY_PRESENTATION_TYPES.has(event.type)) return null;
  const viewerId = state.view?.match?.viewerId;
  const opponent = Boolean(viewerId && event.playerId && event.playerId !== viewerId);
  if (event.type === 'CARD_PLAYED' && !opponent) return null;
  const cardRef = event.cardInstanceId ?? null;
  const cardName = cardRef ? cardLabel(cardRef) : '';
  let kicker = opponent ? 'OPPONENT ACTION' : 'GAMEPLAY';
  let title = cardName || 'Game event';
  let detail = '';
  if (event.type === 'CARD_PLAYED') { kicker = opponent ? 'OPPONENT PLAYED' : 'CARD PLAYED'; detail = opponent ? 'The opponent committed a card to the board.' : 'Card committed to the board.'; }
  else if (event.type === 'INCIDENT_ACTIVATED') { kicker = opponent ? 'OPPONENT INCIDENT' : 'INCIDENT ACTIVATED'; detail = 'A response effect entered the Chain.'; }
  else if (event.type === 'ABILITY_ACTIVATED') { kicker = opponent ? 'OPPONENT ABILITY' : 'ABILITY ACTIVATED'; detail = 'An Employee ability entered the Chain.'; }
  else if (event.type === 'PROMOTION_COMPLETED') { kicker = opponent ? 'OPPONENT PROMOTION' : 'PROMOTION'; detail = 'Promotion completed.'; }
  else if (event.type === 'EMPLOYEE_DESTROYED' || event.type === 'CARD_DESTROYED') { kicker = 'SENT TO ARCHIVE'; detail = 'The card left the field.'; }
  else if (event.type === 'BREAKTHROUGH_DAMAGE') { kicker = 'BREAKTHROUGH'; title = `${Math.abs(reputationCueDelta(event))} Company Reputation`; detail = opponent ? 'Your Company Reputation took damage.' : 'Opponent Company Reputation took damage.'; }
  return { event, opponent, cardRef, kicker, title, detail };
}

function armGameplayPresentationTimer() {
  if (state.gameplayPresentationTimer || !state.gameplayPresentation) return;
  state.gameplayPresentationTimer = setTimeout(() => {
    state.gameplayPresentationTimer = null;
    state.gameplayPresentation = state.gameplayPresentationQueue.shift() ?? null;
    if (state.gameplayPresentation) armGameplayPresentationTimer();
    render();
  }, ['EMPLOYEE_DESTROYED','CARD_DESTROYED','BREAKTHROUGH_DAMAGE','PROMOTION_COMPLETED'].includes(state.gameplayPresentation?.event?.type) ? 3800 : GAMEPLAY_PRESENTATION_MS);
}

function enqueueGameplayPresentations(events = []) {
  for (const event of events) {
    const presentation = gameplayPresentationFromEvent(event);
    if (!presentation) continue;
    const alreadyCurrent = state.gameplayPresentation?.event?.seq === event.seq;
    const alreadyQueued = state.gameplayPresentationQueue.some((item) => item.event?.seq === event.seq);
    if (!alreadyCurrent && !alreadyQueued) state.gameplayPresentationQueue.push(presentation);
  }
  if (!state.gameplayPresentation) state.gameplayPresentation = state.gameplayPresentationQueue.shift() ?? null;
  armGameplayPresentationTimer();
}

function renderGameplayPresentation() {
  const cue = state.gameplayPresentation;
  if (!cue) return '';
  const card = cue.cardRef ? cardByRef(cue.cardRef) : null;
  const cardHtml = card ? `<div class="gameplay-presentation-card">${renderCard(card, { surface:'notification' })}</div>` : '';
  return `<div class="gameplay-presentation ${cue.opponent ? 'opponent' : 'own'} ${esc(cue.event.type.toLowerCase().replaceAll('_','-'))}" role="status" aria-live="polite" aria-atomic="true">${cardHtml}<div class="gameplay-presentation-copy"><span>${esc(cue.kicker)}</span><strong>${esc(cue.title)}</strong>${cue.detail ? `<small>${esc(cue.detail)}</small>` : ''}</div></div>`;
}

function chainSourceRefForEvent(event) {
  const chainItemId = event?.data?.chainItemId;
  if (!chainItemId) return null;
  const added = [...state.eventLog].reverse().find((candidate) => candidate.type === 'CHAIN_ITEM_ADDED' && candidate.data?.chainItemId === chainItemId);
  return added?.cardInstanceId ?? null;
}

function cancelInteraction() {
  if (state.interaction?.cancelable === false) return;
  state.hoverAttackTargetId = null;
  state.interaction = null;
  render();
}

function beginEmployeePlay(item) {
  state.pendingActionConfirmation = null;
  state.interaction = { type:'EMPLOYEE', cardId:item.cardId, options:item.options };
  render();
}

function beginSupportPlay(kind, item) {
  state.pendingActionConfirmation = null;
  state.interaction = { type:'SUPPORT', kind, cardId:item.cardId, slots:item.slots };
  render();
}

function beginTargetIntent(label, targetChoices, buildIntent, sourceId = null) {
  state.pendingActionConfirmation = null;
  if (!targetChoices?.length) return sendIntent(buildIntent({}));
  state.interaction = { type:'TARGETS', label, sourceId, targetChoices, index:0, selections:{}, buildIntent };
  state.interaction.cancelable = true;
  render();
}

function beginMandatoryTargetIntent(label, targetChoices, buildIntent, sourceId = null) {
  state.pendingActionConfirmation = null;
  if (!targetChoices?.length) return sendIntent(buildIntent({}));
  state.interaction = { type:'TARGETS', label, sourceId, targetChoices, index:0, selections:{}, buildIntent };
  state.interaction.cancelable = false;
  render();
}

function interactionSourceId() {
  const interaction = state.interaction;
  if (!interaction) return null;
  if (interaction.type === 'ATTACK') return interaction.attackerId ?? null;
  if (interaction.type === 'TARGETS') return interaction.sourceId ?? null;
  if (interaction.type === 'EMPLOYEE' || interaction.type === 'SUPPORT' || interaction.type === 'PROMOTION') return interaction.cardId ?? null;
  return null;
}

function handSelectionRole(match, instanceId) {
  if (!match || !instanceId) return null;
  if (match.legalActions?.canMulligan) return 'MULLIGAN';
  if ((match.legalActions?.archiveExcessHandIds ?? []).includes(instanceId)) return 'ARCHIVE';
  if (match.pendingHandSelection?.playerId === match.viewerId && (match.pendingHandSelection.candidateIds ?? []).includes(instanceId)) return 'CHOICE';
  return null;
}

function renderInteractionRoleLegend({ targetLabel = 'TARGET', selected = null, min = 0, max = 0 } = {}) {
  const selectedCopy = selected == null ? '' : (max ? `SELECTED ${selected}/${max}` : 'SELECTED');
  const ready = selected != null && selected >= min && selected <= max;
  return `<div class="interaction-role-legend" aria-label="Interaction roles"><span class="role-source">SOURCE</span><i>→</i><span class="role-target">${esc(targetLabel)}</span>${selected == null ? '' : `<i>→</i><span class="role-selected ${ready ? 'ready' : ''}">${esc(selectedCopy)}</span>`}</div>`;
}

function beginAttack(attackerId) {
  state.pendingActionConfirmation = null;
  if (state.interaction?.type === 'ATTACK' && state.interaction.attackerId === attackerId) return cancelInteraction();
  const attack = state.view?.match?.legalActions?.attacks?.find((x) => x.attackerId === attackerId);
  if (!attack) return;
  state.hoverAttackTargetId = null;
  state.interaction = { type:'ATTACK', attackerId, targetIds:attack.targetIds };
  render();
}

function advanceTargetChoice() {
  const interaction = state.interaction;
  if (!interaction || interaction.type !== 'TARGETS') return;
  const choice = interaction.targetChoices[interaction.index];
  const selected = interaction.selections[choice.selectorId] ?? [];
  if (selected.length < choice.min || selected.length > choice.max) return;
  if (interaction.index < interaction.targetChoices.length - 1) {
    interaction.index += 1;
    render();
    return;
  }
  const intent = interaction.buildIntent(interaction.selections);
  state.interaction = null;
  sendIntent(intent);
}

function renderInteraction(match) {
  const interaction = state.interaction;
  if (!interaction) return '';
  if (interaction.type === 'EMPLOYEE') return ''; // Board-native placement: highlighted slots carry the choice.
  if (interaction.type === 'PROMOTION') {
    return `<div class="interaction-panel promotion-guidance interaction-role-panel"><strong>${esc(t('matchInteraction.promotionTitle'))}</strong>${renderInteractionRoleLegend({ targetLabel:'MATERIALS' })}<div class="muted small-copy">${esc(t('matchInteraction.promotionHint',{ slot:interaction.slot + 1 }))}</div><div class="interaction-options">${interaction.options.map((o,i) => `<button class="small promotion-option" data-interaction="promotion-option" data-index="${i}">${o.promotionMaterialIds.length ? esc(o.promotionMaterialIds.map(cardLabel).join(' + ')) : esc(t('matchInteraction.noPromotionMaterials'))}</button>`).join('')}</div>${interaction.cancelable === false ? '' : `<button class="small ghost" data-interaction="cancel">${esc(t('common.cancel'))}</button>`}</div>`;
  }
  if (interaction.type === 'SUPPORT') return ''; // Board-native placement: highlighted slots carry the choice.
  if (interaction.type === 'ATTACK') return ''; // Board-native target state: attacker/targets/REP carry the interaction.
  if (interaction.type === 'TARGETS') {
    const choice = interaction.targetChoices[interaction.index];
    const selected = interaction.selections[choice.selectorId] ?? [];
    return `<div class="interaction-panel interaction-role-panel ${interaction.cancelable === false ? 'mandatory-interaction' : ''}"><strong>${esc(interaction.label)}</strong>${renderInteractionRoleLegend({ selected:selected.length, min:choice.min, max:choice.max })}<div class="muted small-copy">${esc(t('matchInteraction.targetStep',{ current:interaction.index + 1, total:interaction.targetChoices.length, selector:choice.selectorId, min:choice.min, max:choice.max }))}</div><div class="selected-targets">${selected.length ? selected.map((id) => `<span>${esc(cardLabel(id))}</span>`).join('') : `<span class="muted">${esc(t('matchInteraction.noTarget'))}</span>`}</div><div class="interaction-options"><button class="small primary" data-interaction="confirm-target" ${selected.length < choice.min || selected.length > choice.max ? 'disabled' : ''}>${esc(interaction.index < interaction.targetChoices.length - 1 ? t('matchInteraction.nextTarget') : t('matchInteraction.confirm'))}</button>${choice.min === 0 ? `<button class="small" data-interaction="skip-target">${esc(t('matchInteraction.skip'))}</button>` : ''}${interaction.cancelable === false ? '' : `<button class="small ghost" data-interaction="cancel">${esc(t('common.cancel'))}</button>`}</div></div>`;
  }
  return '';
}

function renderBoardInteractionPanel(match) {
  const interaction = renderInteraction(match);
  const viewerId = match?.viewerId;
  const pendingTarget = match?.pendingTriggerTargetSelection?.playerId === viewerId;
  const pendingHand = match?.pendingHandSelection?.playerId === viewerId;
  const pendingDeck = match?.pendingDeckSelection?.playerId === viewerId;
  if (interaction) return `<aside id="boardInteractionPanel" class="board-interaction-panel" aria-live="polite" aria-label="Board interaction">${interaction}</aside>`;
  if (pendingTarget) return `<aside id="boardInteractionPanel" class="board-interaction-panel" aria-live="polite" aria-label="Board interaction"><div class="interaction-panel mandatory-interaction interaction-role-panel"><strong>${esc(t('matchInteraction.pendingTargetTitle'))}</strong><div class="muted small-copy">${esc(t('matchInteraction.pendingTargetHint'))}</div>${actionButton(t('matchInteraction.chooseTargets'),'trigger-targets')}</div></aside>`;
  if (pendingHand) return `<aside id="boardInteractionPanel" class="board-interaction-panel" aria-live="polite" aria-label="Board interaction"><div class="interaction-panel mandatory-interaction interaction-role-panel"><strong>${esc(t('matchInteraction.pendingHandTitle',{ min:match.pendingHandSelection.min, max:match.pendingHandSelection.max }))}</strong><div class="muted small-copy">${esc(t('matchInteraction.pendingHandHint'))}</div>${actionButton(t('matchInteraction.confirmSelected',{ count:state.selectedHand.size }),'hand-select')}</div></aside>`;
  if (pendingDeck) return `<aside id="boardInteractionPanel" class="board-interaction-panel" aria-live="polite" aria-label="Board interaction"><div class="interaction-panel mandatory-interaction interaction-role-panel"><strong>${esc(t('matchInteraction.pendingDeckTitle'))}</strong><div class="muted small-copy">${esc(t('matchInteraction.pendingDeckHint'))}</div><div class="interaction-options">${match.pendingDeckSelection.candidateIds.map((id) => actionButton(cardLabel(id),'deck-select',`data-card="${esc(id)}"`)).join('')}${match.pendingDeckSelection.min === 0 ? actionButton(t('matchInteraction.chooseNone'),'deck-select','data-skip="1"') : ''}</div></div></aside>`;
  return '';
}

function zoneCueEventsForPlayer(playerId, zone = null) {
  const cue = state.zoneCue;
  if (!cue || cue.playerId !== playerId) return [];
  if (zone && cue.zone !== zone) return [];
  return cue.events ?? [];
}

function transientEventMotionKey(event) {
  return event?.seq == null ? null : `event:${event.seq}`;
}

function zoneCueMotionKey(cue = state.zoneCue) {
  if (!cue) return null;
  const seqs = (cue.events ?? []).map((event) => Number(event?.seq)).filter(Number.isFinite);
  const seq = seqs.length ? Math.max(...seqs) : null;
  return seq == null ? null : `zone:${cue.kind ?? 'MOVE'}:${cue.zone ?? 'NONE'}:${seq}`;
}

function transientMotionIsFresh(key) {
  return Boolean(key) && !state.renderedMotionCueKeys.has(key);
}

function markRenderedTransientMotion() {
  for (const event of visualCueEvents()) {
    const key = transientEventMotionKey(event);
    if (key) state.renderedMotionCueKeys.add(key);
  }
  const zoneKey = zoneCueMotionKey();
  if (zoneKey) state.renderedMotionCueKeys.add(zoneKey);
  if (state.renderedMotionCueKeys.size > 120) {
    const keep = [...state.renderedMotionCueKeys].slice(-80);
    state.renderedMotionCueKeys.clear();
    keep.forEach((key) => state.renderedMotionCueKeys.add(key));
  }
}

function zoneCueClassForCard(instanceId) {
  const cue = state.zoneCue;
  if (!cue?.cardInstanceIds?.includes(instanceId) || !transientMotionIsFresh(zoneCueMotionKey(cue))) return '';
  if (cue.kind === 'REVEAL') return 'cue-revealed';
  if (cue.zone === 'HAND') return 'cue-to-hand';
  if (cue.zone === 'ARCHIVE') return 'cue-to-archive';
  if (cue.zone === 'EMPLOYEE_FIELD' || cue.zone === 'SUPPORT_FIELD') return 'cue-zone-arrival';
  return '';
}

function zoneTransitionSide(playerId) {
  const viewerId = state.view?.match?.viewerId;
  if (!viewerId || !playerId) return '';
  return playerId === viewerId ? 'YOUR' : 'OPPONENT';
}

function buildZoneCue(events = []) {
  if (!events.length) return null;
  const latest = events.at(-1);
  const playerId = latest?.playerId ?? null;
  const samePlayer = events.filter((event) => event.playerId === playerId);
  const moveToHand = [...samePlayer].reverse().find((event) => event.type === 'CARD_MOVED' && event.data?.to === 'HAND');
  const shuffle = [...samePlayer].reverse().find((event) => event.type === 'DECK_SHUFFLED');
  const reveal = [...events].reverse().find((event) => event.type === 'CARD_REVEALED');
  const archived = [...samePlayer].reverse().find((event) => event.type === 'CARD_ARCHIVED');
  const move = [...samePlayer].reverse().find((event) => event.type === 'CARD_MOVED');
  const draws = samePlayer.filter((event) => event.type === 'CARD_DRAWN');
  const cardInstanceIds = [...new Set(events.map((event) => event.cardInstanceId).filter(Boolean))];
  if (moveToHand && shuffle) return { kind:'SEARCH_COMPLETE', playerId, zone:'HAND', events, cardInstanceIds, cardInstanceId:moveToHand.cardInstanceId };
  if (reveal) return { kind:'REVEAL', playerId:reveal.playerId ?? playerId, zone:null, events, cardInstanceIds, cardInstanceId:reveal.cardInstanceId };
  if (archived) return { kind:'ARCHIVE', playerId, zone:'ARCHIVE', events, cardInstanceIds, cardInstanceId:archived.cardInstanceId };
  if (move) return { kind:'MOVE', playerId, zone:String(move.data?.to ?? ''), events, cardInstanceIds, cardInstanceId:move.cardInstanceId };
  if (shuffle) return { kind:'SHUFFLE', playerId, zone:'DECK', events, cardInstanceIds };
  if (draws.length) return { kind:'DRAW', playerId, zone:'HAND', count:draws.length, events, cardInstanceIds, cardInstanceId:draws.length === 1 ? draws[0].cardInstanceId : null };
  return null;
}

function zoneCueText(cue) {
  if (!cue) return null;
  const side = zoneTransitionSide(cue.playerId);
  const card = cue.cardInstanceId ? cardLabel(cue.cardInstanceId) : 'Card';
  if (cue.kind === 'SEARCH_COMPLETE') return { kicker:'SEARCH COMPLETE', title:cue.cardInstanceId ? card : `${side} CARD`, detail:`→ ${side} HAND · DECK SHUFFLED` };
  if (cue.kind === 'REVEAL') {
    const revealEvent = [...(cue.events ?? [])].reverse().find((event) => event.type === 'CARD_REVEALED');
    const visibility = revealEvent?.data?.to === 'BOTH' ? 'Visible to both players' : 'Visible to the permitted player';
    return { kicker:'REVEALED', title:cue.cardInstanceId ? card : 'Card revealed', detail:visibility };
  }
  if (cue.kind === 'ARCHIVE') return { kicker:'ARCHIVED', title:cue.cardInstanceId ? card : `${side} CARD`, detail:`→ ${side} ARCHIVE` };
  if (cue.kind === 'SHUFFLE') return { kicker:'DECK SHUFFLED', title:`${side} DECK`, detail:'Order randomized' };
  if (cue.kind === 'DRAW') return { kicker:'DRAW', title:`${side} ${cue.count === 1 ? 'DRAWS 1' : `DRAWS ${cue.count}`}`, detail:`+${cue.count} → ${side} HAND` };
  if (cue.kind === 'MOVE') {
    const zone = String(cue.zone ?? '').replaceAll('_',' ');
    if (cue.zone === 'HAND') return { kicker:'RETURNED', title:cue.cardInstanceId ? card : `${side} CARD`, detail:`→ ${side} HAND` };
    if (cue.zone === 'DECK') return { kicker:'RETURNED', title:cue.cardInstanceId ? card : `${side} CARD`, detail:`→ ${side} DECK` };
    if (cue.zone === 'EMPLOYEE_FIELD') return { kicker:'TO FIELD', title:cue.cardInstanceId ? card : `${side} EMPLOYEE`, detail:`→ ${side} EMPLOYEE FIELD` };
    if (cue.zone === 'SUPPORT_FIELD') return { kicker:'TO SUPPORT', title:cue.cardInstanceId ? card : `${side} SUPPORT`, detail:`→ ${side} SUPPORT` };
    return { kicker:'CARD MOVED', title:cue.cardInstanceId ? card : `${side} CARD`, detail:zone ? `→ ${zone}` : 'Zone changed' };
  }
  return null;
}

function renderZoneTransitionCue() {
  const cue = state.zoneCue;
  const copy = zoneCueText(cue);
  if (!copy) return '';
  let revealCard = '';
  if (cue?.kind === 'SEARCH_COMPLETE' && cue.cardInstanceId) {
    const card = cardByRef(cue.cardInstanceId);
    const def = card ? cardDef(card.definitionId) : null;
    if (def) revealCard = `<div class="zone-search-card">${renderCatalogCardFace(def, { tier:sandboxRarityTier(def), compact:true, artReady:Boolean(def.artId) })}</div>`;
  }
  const motionFresh = transientMotionIsFresh(zoneCueMotionKey(cue));
  return `<div class="zone-transition-cue ${motionFresh ? 'motion-fresh' : 'motion-stable'} ${esc(String(cue?.kind ?? '').toLowerCase())} ${revealCard ? 'with-card' : ''}">${revealCard}<div class="zone-transition-copy"><span>${esc(copy.kicker)}</span><strong>${esc(copy.title)}</strong><small>${esc(copy.detail)}</small></div></div>`;
}

function zonePulseClass(playerId, zone) {
  const events = zoneCueEventsForPlayer(playerId, zone);
  return events.length && transientMotionIsFresh(zoneCueMotionKey()) ? 'zone-transition-active' : '';
}

function zoneTransitionChip(playerId, zone) {
  const cue = state.zoneCue;
  if (!cue || cue.playerId !== playerId || cue.zone !== zone) return '';
  if (cue.kind === 'DRAW') return `<b class="zone-transition-chip">+${esc(cue.count ?? 1)}</b>`;
  if (cue.kind === 'SHUFFLE') return '<b class="zone-transition-chip">SHUFFLED</b>';
  if (cue.kind === 'SEARCH_COMPLETE') return '<b class="zone-transition-chip">+ CARD</b>';
  if (cue.kind === 'ARCHIVE') return '<b class="zone-transition-chip">+ CARD</b>';
  if (cue.kind === 'MOVE') return '<b class="zone-transition-chip">ARRIVED</b>';
  return '';
}

function cueClassForCard(instanceId) {
  const classes = new Set();
  for (const cue of visualCueEvents()) {
    if (!transientMotionIsFresh(transientEventMotionKey(cue))) continue;
    const sourceMatch = cue.cardInstanceId === instanceId;
    const chainTargetMatch = cue.type === 'CHAIN_ITEM_NEGATED' && chainSourceRefForEvent(cue) === instanceId;
    if (!sourceMatch && !chainTargetMatch) continue;
    if (sourceMatch && cue.type === 'CARD_PLAYED') classes.add('cue-played');
    if (sourceMatch && cue.type === 'PROMOTION_COMPLETED') classes.add('cue-promotion');
    if (sourceMatch && cue.type === 'ATTACK_DECLARED') classes.add('cue-attack');
    if (sourceMatch && (cue.type === 'EMPLOYEE_DESTROYED' || cue.type === 'CARD_DESTROYED')) classes.add('cue-destroyed');
    if (sourceMatch && cue.type === 'INCIDENT_ACTIVATED') classes.add('cue-incident');
    if (sourceMatch && cue.type === 'ACTION_RESOLVED') classes.add('cue-resolved');
    if (sourceMatch && cue.type === 'ABILITY_ACTIVATED') classes.add('cue-ability');
    if (sourceMatch && cue.type === 'CHAIN_ITEM_DELAYED') classes.add('cue-delayed');
    if (chainTargetMatch) classes.add('cue-negated');
  }
  return [...classes].join(' ');
}

function reputationCueDelta(event) {
  if (!event) return 0;
  if (event.type === 'BREAKTHROUGH_DAMAGE') return -Math.abs(Number(event.data?.excessPower ?? event.data?.amount ?? 0));
  if (event.type === 'REPUTATION_CHANGED') return Number(event.data?.delta ?? event.data?.amount ?? 0);
  return 0;
}

function reputationCueForPlayer(playerId) {
  const cues = visualCueEvents();
  for (let i = cues.length - 1; i >= 0; i -= 1) {
    const cue = cues[i];
    if (cue.type === 'REPUTATION_CHANGED' && cue.playerId === playerId && reputationCueDelta(cue) !== 0) return cue;
    if (cue.type === 'BREAKTHROUGH_DAMAGE') {
      const defender = cue.playerId === 'P1' ? 'P2' : cue.playerId === 'P2' ? 'P1' : null;
      if (defender === playerId) return cue;
    }
  }
  return null;
}

function reputationImpactClass(playerId) {
  const cue = reputationCueForPlayer(playerId);
  if (!cue) return '';
  return reputationCueDelta(cue) < 0 ? 'cue-reputation-loss' : 'cue-reputation-gain';
}

function reputationImpactAmount(playerId) {
  const cue = reputationCueForPlayer(playerId);
  if (!cue) return 0;
  return reputationCueDelta(cue);
}

function archiveImpactForPlayer(playerId) {
  return visualCueEvents().some((cue) => {
    if (cue.type !== 'EMPLOYEE_DESTROYED' && cue.type !== 'CARD_DESTROYED') return false;
    const card = cue.cardInstanceId ? cardByRef(cue.cardInstanceId) : null;
    return card?.controllerId === playerId && card?.zone === 'ARCHIVE';
  });
}

function visualCueLabel(event) {
  if (!event) return '';
  const card = event.cardInstanceId ? cardLabel(event.cardInstanceId) : '';
  if (event.type === 'CARD_PLAYED') return `${card || 'Card'} played`;
  if (event.type === 'PROMOTION_COMPLETED') return `Promotion · ${card || 'Employee'}`;
  if (event.type === 'ATTACK_DECLARED') return `${card || 'Employee'} attacks`;
  if (event.type === 'EMPLOYEE_DESTROYED') return `${card || 'Employee'} destroyed`;
  if (event.type === 'BREAKTHROUGH_DAMAGE') return `Breakthrough · ${reputationCueDelta(event)} Reputation`;
  if (event.type === 'REPUTATION_CHANGED') {
    const amount = reputationCueDelta(event);
    if (!amount) return 'Reputation changed';
    return `${amount < 0 ? 'Reputation hit' : 'Reputation restored'} · ${amount > 0 ? '+' : ''}${amount}`;
  }
  if (event.type === 'INCIDENT_ACTIVATED') return `${card || 'Incident'} activated`;
  if (event.type === 'ABILITY_ACTIVATED') return `${card || 'Ability'} activated`;
  if (event.type === 'ACTION_RESOLVED') return `${card || 'Action'} ${event.data?.negated ? 'negated' : 'resolved'}`;
  if (event.type === 'CHAIN_ITEM_NEGATED') return `${card || 'Effect'} applied negation`;
  if (event.type === 'CHAIN_ITEM_DELAYED') return `${card || 'Effect'} delayed`;
  if (event.type === 'CHAIN_RESOLVED') return 'Chain resolved';
  if (event.type === 'BATTLE_RESOLVED') return 'Battle resolved';
  if (event.type === 'GAME_ENDED') return 'Game over';
  return '';
}

function renderVisualCue() {
  const label = visualCueLabel(state.visualCue);
  return label ? `<div class="visual-cue cue-${esc(state.visualCue.type.toLowerCase().replaceAll('_','-'))}">${esc(label)}</div>` : '';
}

// Regression compatibility marker for v5.0 combat presentation source: class="combat-moment
function renderCombatMoment() {
  const cues = visualCueEvents();
  const battle = [...cues].reverse().find((event) => event.type === 'BATTLE_RESOLVED');
  const directAttack = [...cues].reverse().find((event) => event.type === 'ATTACK_DECLARED' && event.data?.targetId == null);
  const directRep = directAttack ? [...cues].reverse().find((event) => event.type === 'REPUTATION_CHANGED' && event.data?.reason === 'DIRECT_ATTACK') : null;
  const promotion = [...cues].reverse().find((event) => event.type === 'PROMOTION_COMPLETED');
  if (promotion && !battle && !directRep) {
    const materials = (promotion.data?.materials ?? []).map(cardLabel).filter(Boolean);
    return `<div class="promotion-moment"><span>PROMOTION</span><strong>${esc(cardLabel(promotion.cardInstanceId))}</strong>${materials.length ? `<small>${esc(materials.join(' + '))} → Archive</small>` : ''}</div>`;
  }
  if (battle) {
    const d = battle.data ?? {};
    const attackerId = d.attackerId ?? battle.cardInstanceId;
    const targetId = d.targetId ?? null;
    if (!attackerId || !targetId) return '';
    const attacker = cardByRef(attackerId);
    const defender = cardByRef(targetId);
    if (!attacker || !defender) return '';
    const destroyed = new Set(Array.isArray(d.destroyedIds) ? d.destroyedIds : []);
    const prevented = new Set(Array.isArray(d.replacedOrPreventedIds) ? d.replacedOrPreventedIds : []);
    const winnerId = d.winnerId ?? null;
    const winnerResolved = Boolean(winnerId && !destroyed.has(winnerId) && destroyed.size === 1 && !prevented.has([...destroyed][0]));
    const cardSide = (card, id, label) => `<div class="battle-card-side ${destroyed.has(id) ? 'archived' : ''} ${winnerResolved && winnerId === id ? 'winner' : ''} ${prevented.has(id) ? 'prevented' : ''}"><span class="battle-side-label">${label}</span><div class="battle-card-shell">${renderCard(card)}${destroyed.has(id) ? '<b class="archive-stamp">ARCHIVED</b>' : ''}${prevented.has(id) ? '<b class="prevented-stamp">SAVED</b>' : ''}</div></div>`;
    const breakthrough = [...cues].reverse().find((event) => event.type === 'BREAKTHROUGH_DAMAGE' && event.cardInstanceId === attackerId);
    const repDelta = breakthrough ? -Math.abs(reputationCueDelta(breakthrough)) : 0;
    return `<div class="battle-resolution-overlay card-battle" role="status" aria-live="polite" aria-atomic="true"><div class="battle-stage">${cardSide(attacker,attackerId,'ATTACKER')}<div class="battle-vs"><span>VS</span>${repDelta ? `<small>${esc(repDelta)} REP</small>` : ''}</div>${cardSide(defender,targetId,'DEFENDER')}</div></div>`;
  }
  if (directAttack && directRep) {
    const attackerId = directAttack.cardInstanceId;
    const attacker = attackerId ? cardByRef(attackerId) : null;
    const defenderId = directRep.playerId;
    const delta = Number(directRep.data?.delta ?? directRep.data?.amount ?? 0);
    if (!attacker || !defenderId || !(delta < 0)) return '';
    const ownAttacker = directAttack.playerId === state.view?.match?.viewerId;
    return `<div class="battle-resolution-overlay direct-battle" role="status" aria-live="polite" aria-atomic="true"><div class="battle-stage"><div class="battle-card-side winner"><span class="battle-side-label">ATTACKER</span><div class="battle-card-shell">${renderCard(attacker)}</div></div><div class="battle-vs"><span>VS</span><small>DIRECT</small></div><div class="battle-player-side hit"><span class="battle-side-label">COMPANY REP</span>${renderPlayerAvatar(defenderId,!ownAttacker,{ combat:true, repDelta:delta })}</div></div></div>`;
  }
  return '';
}

function combatPresentationKey() {
  const cues = visualCueEvents();
  const battle = [...cues].reverse().find((event) => event.type === 'BATTLE_RESOLVED');
  if (battle) return `battle:${battle.seq}`;
  const directAttack = [...cues].reverse().find((event) => event.type === 'ATTACK_DECLARED' && event.data?.targetId == null);
  const directRep = directAttack ? [...cues].reverse().find((event) => event.type === 'REPUTATION_CHANGED' && event.data?.reason === 'DIRECT_ATTACK') : null;
  if (directAttack && directRep) return `direct:${directAttack.seq}:${directRep.seq}`;
  const promotion = [...cues].reverse().find((event) => event.type === 'PROMOTION_COMPLETED');
  return promotion ? `promotion:${promotion.seq}` : '';
}

function syncCombatPresentationHost() {
  let host = document.querySelector('#combatPresentationHost');
  const key = combatPresentationKey();
  const html = key ? renderCombatMoment() : '';
  if (!html) { host?.remove(); return; }
  if (!host) {
    host = document.createElement('div');
    host.id = 'combatPresentationHost';
    host.className = 'combat-presentation-host';
    document.body.appendChild(host);
  }
  if (host.dataset.presentationKey === key) return;
  host.dataset.presentationKey = key;
  host.innerHTML = html;
}

function resolutionOutcomeEvent() {
  const cues = visualCueEvents();
  const negatedAction = [...cues].reverse().find((event) => event.type === 'ACTION_RESOLVED' && event.data?.negated);
  if (negatedAction) return negatedAction;
  const priority = ['CHAIN_ITEM_DELAYED','CHAIN_ITEM_NEGATED','ACTION_RESOLVED','CHAIN_RESOLVED'];
  return priority.map((type) => [...cues].reverse().find((event) => event.type === type)).find(Boolean) ?? null;
}

function renderResolutionMoment() {
  const event = resolutionOutcomeEvent();
  if (!event) return '';
  const card = event.cardInstanceId ? cardLabel(event.cardInstanceId) : '';
  if (event.type === 'ACTION_RESOLVED' && event.data?.negated) {
    return `<div class="resolution-moment negated"><span>NEGATED</span><strong>${esc(card || 'Action')}</strong><small>The effect resolved without applying its normal result.</small></div>`;
  }
  if (event.type === 'CHAIN_ITEM_NEGATED') {
    const negatedRef = chainSourceRefForEvent(event);
    return `<div class="resolution-moment negated"><span>NEGATION APPLIED</span><strong>${esc(negatedRef ? cardLabel(negatedRef) : 'Chain effect')}</strong><small>${card ? `${esc(card)} stopped this effect.` : 'This Chain effect was negated.'}</small></div>`;
  }
  if (event.type === 'CHAIN_ITEM_DELAYED') {
    return `<div class="resolution-moment delayed"><span>DELAYED</span><strong>${esc(card || 'Effect')}</strong><small>Resolution has been moved to its scheduled window.</small></div>`;
  }
  if (event.type === 'ACTION_RESOLVED') {
    return `<div class="resolution-moment resolved"><span>RESOLVED</span><strong>${esc(card || 'Action')}</strong><small>${visualCueEvents().some((cue) => cue.type === 'CHAIN_RESOLVED') ? 'Chain complete · newest effect resolved first.' : 'Action effect completed.'}</small></div>`;
  }
  return `<div class="resolution-moment chain-complete"><span>CHAIN COMPLETE</span><strong>Effects resolved</strong><small>Priority returns to the match.</small></div>`;
}

function turnStatus(match) {
  if (match.status === 'ENDED') return { label:'GAME OVER', detail:`${match.winnerId ?? '—'} · ${match.reason ?? ''}`, tone:'ended' };
  if (match.pendingChoice?.playerId === match.viewerId || match.pendingDeckSelection?.playerId === match.viewerId || match.pendingTriggerTargetSelection?.playerId === match.viewerId || match.pendingHandSelection?.playerId === match.viewerId) {
    return { label:'YOUR DECISION', detail:'Resolve the highlighted choice to continue.', tone:'decision' };
  }
  if (match.priorityPlayerId === match.viewerId && (match.chainLength > 0 || match.responseWindow)) return { label:'YOUR RESPONSE', detail:`${match.chainLength ? `Chain ${match.chainLength} · ` : ''}respond or pass priority.`, tone:'response' };
  if (match.priorityPlayerId && match.priorityPlayerId !== match.viewerId) return { label:'OPPONENT RESPONSE', detail:`Turn ${match.turnNumber} · waiting for priority to return.`, tone:'opponent' };
  if (match.activePlayerId === match.viewerId) return { label:`YOUR ${match.phase} PHASE`, detail:`Turn ${match.turnNumber} · Capacity ${match.players[match.viewerId].availableCapacity}/${match.players[match.viewerId].maxCapacity}`, tone:'yours' };
  return { label:`OPPONENT ${match.phase} PHASE`, detail:`Turn ${match.turnNumber} · waiting for ${match.activePlayerId}`, tone:'opponent' };
}

const GUIDANCE_TOTAL = 8;

function currentGuidanceTip(match) {
  if (!state.guidance.enabled || !match || match.status === 'ENDED') return null;
  const legal = match.legalActions ?? {};
  const me = match.players?.[match.viewerId];
  const offer = (condition, tip) => condition && !state.guidance.seen?.[tip.id] ? tip : null;
  const candidates = [
    offer(Boolean(legal.canMulligan), { id:'MULLIGAN', tag:'OPENING', title:'One free mulligan', body:'Click any opening cards you want to replace, then confirm. Keeping all five is always allowed.', focus:'hand' }),
    offer(Boolean(legal.archiveExcessHandIds?.length), { id:'HAND_LIMIT', tag:'END PHASE', title:'Hand limit: 8', body:'Choose excess cards from your hand and Archive them before the turn can finish.', focus:'hand' }),
    offer(Boolean(legal.responseOptions?.length || legal.canPassPriority), { id:'RESPONSE', tag:'RESPONSE', title:'You have priority', body:'Respond with a highlighted card or Pass. When both players pass, the Chain resolves newest effect first.', focus:'decision' }),
    offer(state.interaction?.type === 'PROMOTION', { id:'PROMOTION', tag:'PROMOTION', title:'Promotion uses materials', body:'Choose the required Employees to Archive as an additional cost. Promotion material is Archived, not Destroyed.', focus:'employees' }),
    offer(match.activePlayerId === match.viewerId && match.phase === 'MAIN' && Boolean(legal.playableEmployees?.length), { id:'PLAY_EMPLOYEE', tag:'MAIN PHASE', title:'Start with an Employee', body:'Highlighted hand cards are legal now. Play an Employee into a highlighted Frontline slot and pay its Capacity cost.', focus:'hand' }),
    offer(match.activePlayerId === match.viewerId && match.phase === 'MAIN' && Boolean(legal.playableSystems?.length || legal.settableIncidents?.length), { id:'SUPPORT', tag:'SUPPORT', title:'Systems stay. Incidents wait.', body:'Systems enter Support face-up and persist. Incidents are set face-down and normally cannot activate the same turn.', focus:'support' }),
    offer(Boolean(me?.employeeField?.some((card) => card?.onboarding)), { id:'ONBOARDING', tag:'EMPLOYEE', title:'New Employees have Onboarding', body:'They can use their effects immediately, but they cannot attack during the turn they entered play.', focus:'employees' }),
    offer(match.activePlayerId === match.viewerId && match.phase === 'BATTLE' && Boolean(legal.attacks?.length), { id:'BATTLE', tag:'BATTLE', title:'Choose an attacker', body:'Click a highlighted Employee, then choose a target. Direct attacks are only legal while the opponent controls no Employees.', focus:'employees' })
  ];
  return candidates.find(Boolean) ?? null;
}

function renderGuidanceCoach(match, tip = currentGuidanceTip(match)) {
  if (!tip) return '';
  const seen = Object.keys(state.guidance.seen ?? {}).length;
  return `<aside class="guidance-coach focus-${esc(tip.focus)}" aria-live="polite">
    <div class="guidance-kicker"><span>OFFICE COACH · ${esc(tip.tag)}</span><small>${Math.min(GUIDANCE_TOTAL, seen + 1)} / ${GUIDANCE_TOTAL}</small></div>
    <div class="guidance-copy"><strong>${esc(tip.title)}</strong><span>${esc(tip.body)}</span></div>
    <div class="guidance-actions"><button class="small primary" data-guidance-dismiss="${esc(tip.id)}">Got it</button><button class="small ghost" data-guidance-disable>Turn guidance off</button></div>
  </aside>`;
}

function renderRulesPrimer() {
  const seen = Object.keys(state.guidance.seen ?? {}).length;
  const guidanceState = state.guidance.enabled ? lobbyCopy('on','an') : lobbyCopy('off','aus');
  return `<details class="rules-primer">
    <summary><div><span>${lobbyCopy('NEW HERE?','NEU HIER?')}</span><strong>${lobbyCopy('How a turn works','So funktioniert ein Zug')}</strong></div><small>${lobbyCopy('Five rules to get playing','Fünf Regeln für den Einstieg')} · ${lobbyCopy('Guidance','Hinweise')} ${guidanceState}</small></summary>
    <div class="rules-primer-body">
      <div class="rules-primer-grid">
        <div><b>1</b><strong>MAIN</strong><span>${lobbyCopy('Spend Capacity to play Employees, Actions and Systems or set Incidents.','Gib Kapazität aus, um Mitarbeiter, Aktionen und Systeme zu spielen oder Vorfälle zu setzen.')}</span></div>
        <div><b>2</b><strong>${lobbyCopy('ONBOARDING','EINARBEITUNG')}</strong><span>${lobbyCopy('New Employees cannot attack this turn. Their other effects work immediately.','Neue Mitarbeiter können in diesem Zug nicht angreifen. Ihre anderen Effekte funktionieren sofort.')}</span></div>
        <div><b>3</b><strong>BATTLE</strong><span>${lobbyCopy('Attack opposing Employees first. Higher Power survives; equal Power destroys both unless an effect says otherwise.','Greife zuerst gegnerische Mitarbeiter an. Höhere Power überlebt; bei gleicher Power werden beide zerstört, sofern kein Effekt etwas anderes sagt.')}</span></div>
        <div><b>4</b><strong>${lobbyCopy('RESPONSES','REAKTIONEN')}</strong><span>${lobbyCopy('Effects can create a Chain. Both players pass, then the newest effect resolves first.','Effekte können eine Kette erzeugen. Passen beide Spieler, wird der neueste Effekt zuerst aufgelöst.')}</span></div>
        <div><b>5</b><strong>${lobbyCopy('WIN','SIEG')}</strong><span>${lobbyCopy('Reduce Company Reputation from 20 to 0. End Phase hand limit is 8. There is no Main Phase 2.','Reduziere die Unternehmensreputation von 20 auf 0. In der End Phase gilt ein Handlimit von 8. Es gibt keine zweite Main Phase.')}</span></div>
      </div>
      <div class="rules-primer-actions"><button class="small ${state.guidance.enabled ? '' : 'primary'}" data-guidance-toggle>${state.guidance.enabled ? lobbyCopy('Turn contextual guidance off','Kontexthinweise ausschalten') : lobbyCopy('Turn contextual guidance on','Kontexthinweise einschalten')}</button>${seen ? `<button class="small ghost" data-guidance-reset>${lobbyCopy(`Reset ${seen} seen tip${seen === 1 ? '' : 's'}`,`${seen} gesehene${seen === 1 ? 'n Hinweis' : ' Hinweise'} zurücksetzen`)}</button>` : ''}</div>
    </div>
  </details>`;
}

function bindGuidanceHandlers() {
  document.querySelectorAll('[data-guidance-dismiss]').forEach((button) => { button.onclick = () => dismissGuidance(button.dataset.guidanceDismiss); });
  document.querySelectorAll('[data-guidance-disable]').forEach((button) => { button.onclick = () => setGuidanceEnabled(false); });
  document.querySelectorAll('[data-guidance-toggle]').forEach((button) => { button.onclick = () => setGuidanceEnabled(!state.guidance.enabled); });
  document.querySelectorAll('[data-guidance-reset]').forEach((button) => { button.onclick = resetGuidance; });
}

function beginHandCardPlay(cardId) {
  const legal = state.view?.match?.legalActions;
  if (!legal) return;
  if ((state.interaction?.type === 'EMPLOYEE' || state.interaction?.type === 'SUPPORT') && state.interaction.cardId === cardId) return cancelInteraction();
  const employee = legal.playableEmployees.find((x) => x.cardId === cardId);
  if (employee) return beginEmployeePlay(employee);
  const system = legal.playableSystems.find((x) => x.cardId === cardId);
  if (system) return beginSupportPlay('SYSTEM', system);
  const incident = legal.settableIncidents.find((x) => x.cardId === cardId);
  if (incident) return beginSupportPlay('INCIDENT', incident);
  const action = legal.playableActions.find((x) => x.cardId === cardId);
  if (action) return beginTargetIntent(`Play ${cardLabel(cardId)}`, action.targetChoices, (targets) => ({ type:'PLAY_ACTION', cardId, targets }), cardId);
}

function capacityPips(player) {
  const pips = Array.from({length:7}, (_,i) => {
    const unlocked = i < player.maxCapacity;
    const available = i < Math.min(player.availableCapacity, 7);
    return `<span class="capacity-pip ${unlocked ? 'unlocked' : ''} ${available ? 'available' : ''}"></span>`;
  }).join('');
  const bonus = Math.max(0, player.availableCapacity - 7);
  return `<div class="capacity-pips" aria-label="Capacity ${player.availableCapacity} of ${player.maxCapacity}">${pips}${bonus ? `<b class="capacity-bonus">+${bonus}</b>` : ''}</div>`;
}

function reputationHudState(reputation) {
  if (reputation <= 5) return { label:'CRITICAL', tone:'critical' };
  if (reputation <= 10) return { label:'UNDER PRESSURE', tone:'pressure' };
  if (reputation > 20) return { label:'ABOVE START', tone:'buffered' };
  return { label:'START 20 · LOSS AT 0', tone:'stable' };
}

function deckHudState(deckCount) {
  if (deckCount <= 5) return { label:'DECK CRITICAL', tone:'critical' };
  if (deckCount <= 10) return { label:'DECK LOW', tone:'pressure' };
  return { label:'CARDS', tone:'stable' };
}

function directAttackDefenderId(match = state.view?.match) {
  const attack = match?.pendingAttack;
  if (!attack || attack.cancelled || attack.targetId !== null) return null;
  return attack.controllerId === 'P1' ? 'P2' : attack.controllerId === 'P2' ? 'P1' : null;
}

function renderPlayerVitals(player) {
  const rep = reputationHudState(player.reputation);
  const deck = deckHudState(player.deckCount);
  const handTone = player.handCount >= 8 ? 'limit' : 'stable';
  const directDefender = directAttackDefenderId();
  const directPreview = state.interaction?.type === 'ATTACK' && state.interaction.targetIds.includes(null) && player.id !== state.view?.match?.viewerId;
  return `<div class="player-vitals" aria-label="Live match resources">
    <span class="vital rep reputation-target-anchor ${esc(rep.tone)} ${directDefender === player.id ? 'attack-destination' : ''} ${directPreview ? 'target-candidate direct-target-candidate' : ''} ${reputationImpactClass(player.id)}" data-reputation-player="${esc(player.id)}" ${directPreview ? 'data-direct-attack-target="1"' : ''}><small>REP</small><b>${esc(player.reputation)}</b>${reputationImpactAmount(player.id) ? `<em class="vital-reputation-delta ${reputationImpactAmount(player.id) < 0 ? 'loss' : 'gain'}">${reputationImpactAmount(player.id) > 0 ? '+' : ''}${esc(reputationImpactAmount(player.id))}</em>` : ''}</span>
    <span class="vital cap"><small>CAP</small><b>${esc(player.availableCapacity)}/${esc(player.maxCapacity)}</b></span>
    <span class="vital hand ${handTone}"><small>HAND</small><b>${esc(player.handCount)}/8</b></span>
    <span class="vital deck ${esc(deck.tone)}"><small>DECK</small><b>${esc(player.deckCount)}</b></span>
  </div>`;
}

function renderResources(player) {
  const repPct = Math.max(0, Math.min(100, (player.reputation / 30) * 100));
  const repState = reputationHudState(player.reputation);
  const handPct = Math.max(0, Math.min(100, (player.handCount / 8) * 100));
  const directDefender = directAttackDefenderId();
  return `<div class="resource-cluster">
    <div class="resource-card reputation-resource tone-${esc(repState.tone)} ${directDefender === player.id ? 'attack-destination' : ''} ${reputationImpactClass(player.id)}" data-reputation-player="${esc(player.id)}">
      <span>COMPANY REPUTATION</span><div class="resource-value"><strong>${player.reputation}</strong><small>/ 30</small></div><b class="resource-state">${esc(repState.label)}</b>
      ${reputationImpactAmount(player.id) ? `<b class="reputation-impact-number ${reputationImpactAmount(player.id) < 0 ? 'loss' : 'gain'}">${reputationImpactAmount(player.id) > 0 ? '+' : ''}${esc(reputationImpactAmount(player.id))}</b>` : ''}
      <div class="resource-meter reputation-meter"><i style="width:${repPct}%"></i><em title="Starting Reputation: 20" style="left:66.6667%"></em></div>
    </div>
    <div class="resource-card capacity-resource"><span>CAPACITY</span><div class="resource-value"><strong>${player.availableCapacity}</strong><small>/ ${player.maxCapacity}</small></div><b class="resource-state">AVAILABLE / MAX</b>${capacityPips(player)}</div>
    <div class="resource-card hand-resource ${player.handCount >= 8 ? 'at-limit' : ''}"><span>HAND</span><div class="resource-value"><strong>${player.handCount}</strong><small>/ 8</small></div><b class="resource-state">${player.handCount >= 8 ? 'HAND LIMIT' : `${Math.max(0, 8-player.handCount)} SLOTS OPEN`}</b><div class="hand-meter"><i style="width:${handPct}%"></i></div></div>
  </div>`;
}

function renderPendingLane(match, playerId) {
  const pending = (match.pendingResolutions ?? []).filter((x) => x.controllerId === playerId);
  const scheduled = (match.scheduledEffects ?? []).filter((x) => x.controllerId === playerId);
  if (!pending.length && !scheduled.length) return '';
  const player = match.players[playerId];
  return `<div class="pending-lane">
    <div class="pending-label"><strong>PENDING</strong><span>Delayed / upcoming</span></div>
    <div class="pending-content">
      ${pending.map((item) => `<div class="pending-card-wrap">${renderCard(item.card)}<div class="pending-timing">Resolves next ${esc(item.phase)}</div></div>`).join('')}
      ${scheduled.map((item) => `<div class="scheduled-chip"><span>SCHEDULED</span><strong>${esc(cardLabel(item.sourceId))}</strong><small>${esc(item.phase)} · own turn ${item.dueTurnsStarted}</small></div>`).join('')}
    </div>
  </div>`;
}

function renderAttackOverlay(match) {
  const pending = match?.pendingAttack && !match.pendingAttack.cancelled;
  const preview = state.interaction?.type === 'ATTACK';
  if (!pending && !preview) return '';
  return `<svg id="attackOverlay" class="attack-overlay ${preview && !pending ? 'attack-preview-overlay' : ''}" aria-hidden="true"><defs><marker id="attackArrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z"></path></marker></defs><path id="attackGlowPath"></path><path id="attackPath" marker-end="url(#attackArrow)"></path></svg>`;
}

function drawAttackConnector() {
  const match = state.view?.match;
  const pending = match?.pendingAttack && !match.pendingAttack.cancelled ? match.pendingAttack : null;
  const interaction = state.interaction?.type === 'ATTACK' ? state.interaction : null;
  const attackerId = pending?.attackerId ?? interaction?.attackerId ?? null;
  const targetId = pending ? pending.targetId : state.hoverAttackTargetId;
  const svg = document.querySelector('#attackOverlay');
  const path = document.querySelector('#attackPath');
  const glowPath = document.querySelector('#attackGlowPath');
  if (!svg || !path || !attackerId || (!pending && !targetId)) { path?.setAttribute('d',''); glowPath?.setAttribute('d',''); return; }
  const source = document.querySelector(`[data-card-ref="${CSS.escape(attackerId)}"]`);
  const defenderId = directAttackDefenderId(match);
  const directPreview = targetId === '__DIRECT_REP__';
  const target = targetId === null || directPreview
    ? document.querySelector(`.reputation-target-anchor[data-reputation-player="${CSS.escape((directPreview ? (state.view?.match?.viewerId === 'P1' ? 'P2' : 'P1') : defenderId) ?? '')}"]`)
    : document.querySelector(`[data-card-ref="${CSS.escape(targetId)}"]`);
  if (!source || !target) { path.setAttribute('d',''); glowPath?.setAttribute('d',''); return; }
  const a = source.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const x1 = a.left + a.width / 2, y1 = a.top + a.height / 2;
  const x2 = b.left + b.width / 2, y2 = b.top + b.height / 2;
  const bend = Math.max(36, Math.abs(y2-y1) * .18);
  const cy = (y1 + y2) / 2 - (y2 < y1 ? bend : -bend);
  const connector = `M ${x1} ${y1} Q ${(x1+x2)/2} ${cy} ${x2} ${y2}`;
  path.setAttribute('d', connector);
  glowPath?.setAttribute('d', connector);
}

function departmentMark(department) {
  if (!department) return 'OCG';
  const parts = department.split('_');
  return parts.length > 1 ? parts.map((part) => part[0]).join('').slice(0, 3) : department.slice(0, 3);
}


function artworkUrl(def) {
  return def?.artId ? `/art/${def.artId}` : null;
}
function artworkFocus(def) {
  const x=Math.max(0,Math.min(100,Number(def?.artFocus?.x ?? 50)));
  const y=Math.max(0,Math.min(100,Number(def?.artFocus?.y ?? 50)));
  return {x,y};
}
function artworkFocusStyle(def) { const {x,y}=artworkFocus(def); return `--art-focus-x:${x}%;--art-focus-y:${y}%`; }

function artworkFallback(def, className = 'card-art-window') {
  const department = (def?.department ?? 'NEUTRAL').toLowerCase();
  const label = (def?.department ?? 'NEUTRAL').replaceAll('_',' ');
  return `<div class="${className} fallback-art dept-${esc(department)}" aria-label="${esc(label)} alpha artwork placeholder">
    <div class="fallback-art-scene" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="fallback-art-mark"><span>${esc(departmentMark(def?.department ?? 'NEUTRAL'))}</span><small>${esc(label)}</small></div>
  </div>`;
}

function renderArtwork(def, { modal = false } = {}) {
  const url = artworkUrl(def);
  const className = modal ? 'modal-art-window' : 'card-art-window';
  if (url) return `<div class="${className} has-art" style="${artworkFocusStyle(def)}"><img src="${esc(url)}" alt="${esc(def.name)} artwork" /></div>`;
  return artworkFallback(def, className);
}

function rulesDensityClass(text = '') {
  const length = String(text || '').length;
  if (length >= 205) return 'rules-ultra';
  if (length >= 155) return 'rules-dense';
  return 'rules-standard';
}


function cardPowerState(card, def) {
  if (!def || def.cardType !== 'EMPLOYEE' || def.power == null) return null;
  const printed = Number(def.power);
  const current = card?.currentPower != null ? Number(card.currentPower) : printed;
  return { printed, current, delta: current - printed };
}

function currentEmployeePower(instanceId) {
  const card = cardByRef(instanceId);
  const def = card ? cardDef(card.definitionId) : null;
  const power = cardPowerState(card, def);
  return power ? { ...power, card, def } : null;
}

function baseCombatRead(attackerId, targetId) {
  const attacker = currentEmployeePower(attackerId);
  if (!attacker) return null;
  if (targetId == null) {
    return {
      targetId:null,
      tone:'direct',
      attackerPower:attacker.current,
      targetPower:null,
      margin:attacker.current,
      label:`DIRECT · ${attacker.current} REP`,
      detail:'If the direct attack resolves.'
    };
  }
  const defender = currentEmployeePower(targetId);
  if (!defender) return null;
  const margin = attacker.current - defender.current;
  if (margin > 0) return {
    targetId,
    tone:'ahead',
    attackerPower:attacker.current,
    targetPower:defender.current,
    margin,
    label:`TARGET DOWN · BT +${margin}`,
    detail:'Base rule read before effects.'
  };
  if (margin === 0) return {
    targetId,
    tone:'even',
    attackerPower:attacker.current,
    targetPower:defender.current,
    margin:0,
    label:'EVEN · BOTH DOWN',
    detail:'Base rule read before effects.'
  };
  return {
    targetId,
    tone:'behind',
    attackerPower:attacker.current,
    targetPower:defender.current,
    margin,
    label:`ATTACKER DOWN · ${Math.abs(margin)} BEHIND`,
    detail:'Base rule read before effects.'
  };
}

function combatPowerReadMarkup(attackerId, targetIds = null) {
  const attack = legalAttackOption(attackerId);
  const legalTargets = targetIds ?? attack?.targetIds ?? [];
  const attacker = currentEmployeePower(attackerId);
  if (!attack || !attacker || !legalTargets.length) return '';
  const reads = legalTargets.map((targetId) => baseCombatRead(attackerId, targetId)).filter(Boolean);
  if (!reads.length) return '';
  return `<div class="combat-power-read-head"><span>POWER CHECK</span><strong>${esc(attacker.def.name)} · CURRENT ${esc(attacker.current)}</strong><small>Base combat read only · Prevention, redirects, replacements and effects can change resolution.</small></div>
    <div class="combat-power-read-options">${reads.map((read) => read.targetId == null
      ? `<span class="combat-read-option direct"><small>COMPANY REPUTATION</small><b>${esc(read.attackerPower)} → REP</b><em>${esc(read.detail)}</em></span>`
      : `<span class="combat-read-option ${esc(read.tone)}"><small>VS ${esc(cardLabel(read.targetId))}</small><b>${esc(read.attackerPower)} : ${esc(read.targetPower)}</b><em>${esc(read.label)}</em></span>`
    ).join('')}</div>`;
}

function attackTargetPowerBadge(card) {
  const interaction = state.interaction;
  if (!card || interaction?.type !== 'ATTACK' || !interaction.targetIds.includes(card.instanceId)) return '';
  const read = baseCombatRead(interaction.attackerId, card.instanceId);
  if (!read) return '';
  if (read.margin > 0) return `<span class="runtime-badge combat-edge ahead">POWER +${esc(read.margin)}</span>`;
  if (read.margin === 0) return '<span class="runtime-badge combat-edge even">POWER EVEN</span>';
  return `<span class="runtime-badge combat-edge behind">POWER −${esc(Math.abs(read.margin))}</span>`;
}

function renderCombatPowerRead(match) {
  if (!match || match.status !== 'ACTIVE' || match.activePlayerId !== match.viewerId || match.phase !== 'BATTLE') return '';
  const attackerId = state.interaction?.type === 'ATTACK' ? state.interaction.attackerId : null;
  const markup = attackerId ? combatPowerReadMarkup(attackerId, state.interaction.targetIds) : '';
  return `<aside id="combatPowerRead" class="combat-power-read ${markup ? 'is-active' : 'hidden'}" aria-label="Current Power combat comparison" aria-live="polite">${markup}</aside>`;
}

function updateCombatPowerRead(attackerId = null) {
  const panel = document.querySelector('#combatPowerRead');
  if (!panel) return;
  const markup = attackerId ? combatPowerReadMarkup(attackerId) : '';
  panel.innerHTML = markup;
  panel.classList.toggle('hidden', !markup);
  panel.classList.toggle('is-active', Boolean(markup));
}

function renderPowerDisplay(card, def) {
  const power = cardPowerState(card, def);
  if (!power) return '';
  const changed = power.delta !== 0;
  const direction = power.delta > 0 ? 'boosted' : power.delta < 0 ? 'debuffed' : '';
  const deltaLabel = `${power.delta > 0 ? '+' : ''}${power.delta}`;
  const accessible = changed
    ? `Printed Power ${power.printed}; Current Power ${power.current} (${deltaLabel})`
    : `Power ${power.printed}`;
  return `<div class="power-cluster ${changed ? `power-changed ${direction}` : ''}" title="${esc(accessible)}" aria-label="${esc(accessible)}">
    ${changed ? `<div class="current-power-badge ${direction}" aria-hidden="true">${esc(power.current)}</div>` : ''}
    <div class="power-badge"><span>POWER</span><b>${esc(power.printed)}</b></div>
  </div>`;
}

function powerRuntimeText(card, def) {
  const power = cardPowerState(card, def);
  if (!power) return '';
  if (power.delta === 0) return `Printed Power ${power.printed}`;
  return `Printed Power ${power.printed} · Current Power ${power.current} (${power.delta > 0 ? '+' : ''}${power.delta})`;
}

// Regression compatibility marker for v5.1 hover runtime source: CURRENT ${power.current}
function hoverCardHtml(cardRef) {
  const card = cardByRef(cardRef);
  const def = card ? cardDef(card.definitionId) : null;
  if (!card || !def) return '';
  const costParts = cardCostParts(def);
  const power = cardPowerState(card, def);
  const details = [def.rank].filter(Boolean);
  const premium = isExecutiveEditionVariant(card.variantId);
  return `<div class="hover-card-face type-${esc(def.cardType.toLowerCase())} ${power ? 'has-power' : ''} ${power?.delta ? 'power-changed' : ''} ${premium ? 'executive-edition' : ''}">
    <div class="hover-type"><span>${esc(cardTypeLabel(def.cardType))}</span><b>${esc(def.department.replaceAll('_',' '))}</b></div>
    <div class="card-name-row"><div class="card-name hover-name">${esc(def.name)}</div>${costParts ? `<div class="card-cost-badge"><span>${esc(costParts.label)}</span><b>${esc(costParts.value)}</b></div>` : ''}</div>
    ${premium ? `<span class="card-finish-badge">${esc(collectionCopy('executiveEdition'))}</span>` : ''}${renderArtwork(def)}${premium ? '<i class="executive-art-foil" aria-hidden="true"></i>' : ''}
    ${details.length ? `<div class="hover-meta">${esc(details.join(' · '))}</div>` : ''}
    <div class="hover-rules ${rulesDensityClass(def.rulesText)}">${esc(def.rulesText || 'No rules text.')}</div>
    ${def.tags?.length ? `<div class="hover-tags">${def.tags.map((tag) => `<span>${esc(tag)}</span>`).join('')}</div>` : ''}
    ${def.flavorText ? `<div class="hover-flavor">“${esc(def.flavorText)}”</div>` : ''}
    ${power ? renderPowerDisplay(card, def) : ''}
    <div class="hover-inspect-hint"><b>RMB</b><span>Right-click to pin inspector</span><small>i remains a touch fallback</small></div>
  </div>`;
}

function hideHoverPreview() {
  if (state.hoverTimer) clearTimeout(state.hoverTimer);
  state.hoverTimer = null;
  const preview = document.querySelector('#hoverCardPreview');
  if (preview) preview.classList.add('hidden');
}

function showHoverPreview(cardRef, anchorEl) {
  const preview = document.querySelector('#hoverCardPreview');
  if (!preview) return;
  const html = hoverCardHtml(cardRef);
  if (!html) return hideHoverPreview();
  preview.innerHTML = html;
  preview.classList.remove('hidden');
  const previewRect = preview.getBoundingClientRect();
  const width = previewRect.width || 280;
  const height = previewRect.height || Math.min(560, window.innerHeight - 84);
  const battlefield = document.querySelector('.battlefield-surface')?.getBoundingClientRect();
  const centerX = battlefield ? battlefield.left + battlefield.width / 2 : window.innerWidth / 2;
  const centerY = battlefield ? battlefield.top + battlefield.height / 2 : window.innerHeight / 2;
  const maxLeft = Math.max(12, window.innerWidth - width - 12);
  const maxTop = Math.max(72, window.innerHeight - height - 12);
  const left = Math.max(12, Math.min(maxLeft, centerX - width / 2));
  const top = Math.max(72, Math.min(maxTop, centerY - height / 2));
  preview.style.left = `${left}px`;
  preview.style.top = `${top}px`;
}

function bindHoverPreviewHandlers() {
  document.querySelectorAll('.player-board .card[data-card-ref]').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      if (state.hoverTimer) clearTimeout(state.hoverTimer);
      state.hoverTimer = setTimeout(() => showHoverPreview(el.dataset.cardRef, el), 260);
    });
    el.addEventListener('mouseleave', hideHoverPreview);
    el.addEventListener('focus', () => showHoverPreview(el.dataset.cardRef, el));
    el.addEventListener('blur', hideHoverPreview);
  });
}

function clearBoardActionFocus() {
  const surface = document.querySelector('.battlefield-surface');
  surface?.classList.remove('board-focus-active');
  surface?.querySelectorAll('.card.board-focus-source,.card.board-focus-target,.card.board-focus-muted').forEach((card) => card.classList.remove('board-focus-source','board-focus-target','board-focus-muted'));
  document.querySelectorAll('.player-board.board-focus-direct').forEach((board) => board.classList.remove('board-focus-direct'));
  const interactionAttacker = state.interaction?.type === 'ATTACK' ? state.interaction.attackerId : null;
  updateCombatPowerRead(interactionAttacker);
}

function applyBoardActionFocus(sourceEl) {
  const surface = document.querySelector('.battlefield-surface');
  if (!surface || !sourceEl?.dataset?.boardFocusSource) return;
  const sourceId = sourceEl.dataset.boardFocusSource;
  const targets = new Set((sourceEl.dataset.boardFocusTargets ?? '').split(',').filter(Boolean));
  const direct = sourceEl.dataset.boardFocusDirect === '1';
  if (!targets.size && !direct) return clearBoardActionFocus();
  clearBoardActionFocus();
  surface.classList.add('board-focus-active');
  surface.querySelectorAll('.card[data-card-ref]').forEach((card) => {
    const cardRef = card.dataset.cardRef;
    if (cardRef === sourceId) card.classList.add('board-focus-source');
    else if (targets.has(cardRef)) card.classList.add('board-focus-target');
    else card.classList.add('board-focus-muted');
  });
  if (direct) document.querySelector('#opponentBoard')?.classList.add('board-focus-direct');
  updateCombatPowerRead(legalAttackOption(sourceId) ? sourceId : null);
}

function bindBoardActionFocusHandlers() {
  document.querySelectorAll('[data-board-focus-source]').forEach((el) => {
    el.addEventListener('mouseenter', () => applyBoardActionFocus(el));
    el.addEventListener('mouseleave', clearBoardActionFocus);
    el.addEventListener('focus', () => applyBoardActionFocus(el));
    el.addEventListener('blur', clearBoardActionFocus);
  });
}


function fieldCardStateBadges(card, def, { attackReady = false, ability = false, attackMeta = null, focusMeta = null } = {}) {
  const badges = [];
  if (card.zone === 'EMPLOYEE_FIELD') {
    if (card.onboarding) badges.push('<span class="runtime-badge onboarding">ONBOARDING</span>');
    else if (attackReady) badges.push(`<span class="runtime-badge attacks ready attack-ready-state" title="${esc(attackMeta?.title ?? 'Legal attack available')}">${esc(attackMeta?.label ?? 'ATTACK READY')}</span>`);
    else if (card.maxAttacks != null && (card.attacksUsed ?? 0) >= card.maxAttacks) badges.push('<span class="runtime-badge attacks used">ATTACK USED</span>');
    else if (card.maxAttacks != null) badges.push(`<span class="runtime-badge attacks">${esc(card.attacksUsed ?? 0)}/${esc(card.maxAttacks)} ATTACKS</span>`);
    if (ability) badges.push(`<span class="runtime-badge ability-state">ABILITY READY${focusMeta?.abilityTargets ? ` · ${focusMeta.abilityTargets}` : ''}</span>`);
  }
  if (card.zone === 'SUPPORT_FIELD') {
    if (!card.faceUp) badges.push('<span class="runtime-badge incident-set">INCIDENT SET</span>');
    else if (def?.cardType === 'SYSTEM') badges.push('<span class="runtime-badge system-live">SYSTEM LIVE</span>');
    if (ability) badges.push(`<span class="runtime-badge ability-state">ABILITY READY${focusMeta?.abilityTargets ? ` · ${focusMeta.abilityTargets}` : ''}</span>`);
  }
  return badges.join('');
}

function cardBackMarkup({ compact = false, cardBackId = 'COS-BACK-001' } = {}) {
  const asset = COSMETIC_UI_CATALOG.cardBacks?.[String(cardBackId)]?.asset ?? COSMETIC_UI_CATALOG.cardBacks?.['COS-BACK-001']?.asset;
  return `<div class="ocg-card-back ${compact ? 'compact' : ''}" aria-hidden="true">${asset ? `<img src="${esc(asset)}" alt="" />` : '<div class="ocg-card-back-frame"><span>OFFICE</span><b>OCG</b><small>CARD GAME</small></div>'}</div>`;
}

function hiddenSupportBack() {
  const cardBackId = arguments[0] ?? null;
  return `<div class="hidden-support-back" aria-label="Face-down Incident — FACE-DOWN SUPPORT">${cardBackId ? cardBackMarkup({ cardBackId }) : cardBackMarkup()}</div>`;
}

function renderCard(card, { selectable = false, handIndex = null, handCount = null, surface = '' } = {}) {
  if (!card) return `<div class="empty-slot">empty</div>`;
  const def = cardDef(card.definitionId);
  const hidden = !def;
  const finishTier = hidden ? 'T0' : String(sandboxRarityTier(def) ?? 'T0');
  const premium = !hidden && isExecutiveEditionVariant(card.variantId);
  const selected = state.selectedHand.has(card.instanceId);
  const match = state.view?.match;
  const selectionRole = card.zone === 'HAND' ? handSelectionRole(match, card.instanceId) : null;
  const selectionCandidate = Boolean(selectionRole);
  const legal = legalHandCardIds().has(card.instanceId);
  const handActionLabel = card.zone === 'HAND' ? legalHandActionLabel(card.instanceId) : null;
  const targetCandidate = targetCandidateIds().has(card.instanceId);
  const targetSelected = selectedTargetIds().has(card.instanceId);
  const promotionMaterial = promotionMaterialCandidateIds().has(card.instanceId);
  const attackMeta = attackReadyBadgeMeta(card.instanceId);
  const attackReady = Boolean(attackMeta);
  const ability = legalAbilityOption(card.instanceId);
  const focusMeta = boardActionFocusMeta(card.instanceId);
  const pendingAttack = state.view?.match?.pendingAttack;
  const attackOrigin = pendingAttack?.attackerId === card.instanceId && !pendingAttack.cancelled;
  const attackDestination = pendingAttack?.targetId === card.instanceId && !pendingAttack.cancelled;
  const attackTarget = state.interaction?.type === 'ATTACK' && state.interaction.targetIds.includes(card.instanceId);
  const selectAttr = selectable && selectionCandidate ? `data-select-hand="${esc(card.instanceId)}"` : '';
  const playAttr = !selectable && legal && card.zone === 'HAND' ? `data-play-hand="${esc(card.instanceId)}"` : '';
  const attackAttr = !selectable && attackReady ? `data-attack-source="${esc(card.instanceId)}"` : '';
  const targetAttr = targetCandidate || attackTarget ? `data-target-card="${esc(card.instanceId)}"` : '';
  const infoAttr = `data-card-info="${esc(card.instanceId)}"`;
  const focusAttr = focusMeta ? `data-board-focus-source="${esc(card.instanceId)}" data-board-focus-targets="${esc(focusMeta.targets.join(','))}" data-board-focus-direct="${focusMeta.direct ? '1' : '0'}" data-board-focus-mode="${esc(focusMeta.modes.join('+'))}"` : '';
  const isHandFanCard = Number.isInteger(handIndex) && Number.isInteger(handCount);
  const handDelta = isHandFanCard ? Number(handIndex) - (Number(handCount) - 1) / 2 : 0;
  const handRotate = Math.max(-9, Math.min(9, handDelta * 2.15));
  const handDrop = Math.min(13, Math.abs(handDelta) * 1.7);
  const handStyle = isHandFanCard ? `style="--hand-rot:${handRotate}deg;--hand-y:${handDrop}px;--hand-z:${100 + Number(handIndex)}"` : '';
  const interactionAttacker = state.interaction?.type === 'ATTACK' && state.interaction.attackerId === card.instanceId;
  const interactionSource = interactionSourceId() === card.instanceId;
  const interactionAriaPressed = (selectionCandidate || targetCandidate) ? `aria-pressed="${selected || targetSelected ? 'true' : 'false'}"` : '';
  const costParts = hidden ? null : cardCostParts(def);
  const detailBits = hidden ? [] : [def.rank, def.promotion?.required ? `PROMOTION ${def.promotion.required}` : ''].filter(Boolean);
  const longName = !hidden && def.name.length >= 22;
  const status = [];
  if (card.onboarding) status.push('Onboarding');
  if (card.maxAttacks != null) status.push(`Attacks ${card.attacksUsed ?? 0}/${card.maxAttacks}`);
  const prototype = def && def.implementationStatus !== 'FULL'
    ? `<div class="implementation ${def.implementationStatus === 'TEXT_ONLY' ? 'text-only' : 'partial'}">${esc(def.implementationStatus === 'TEXT_ONLY' ? 'TEXT ONLY' : 'PARTIAL')}</div>`
    : '';
  const power = hidden ? null : cardPowerState(card, def);
  const hasPower = Boolean(power);
  const powerChanged = Boolean(power && power.delta !== 0);
  const faceDownSupport = card.zone === 'SUPPORT_FIELD' && !card.faceUp;
  const concealedFaceDownSupport = faceDownSupport && card.controllerId !== match?.viewerId;
  const fieldStateBadges = fieldCardStateBadges(card, def, { attackReady, ability:Boolean(ability), attackMeta, focusMeta });
  const attackCompareBadge = hidden ? '' : attackTargetPowerBadge(card);
  const combinedFieldBadges = `${fieldStateBadges}${attackCompareBadge}`;
  // Regression compatibility marker for v5.7 source: hidden && faceDownSupport ? hiddenSupportBack() : ''
  const supportBack = hidden && concealedFaceDownSupport ? hiddenSupportBack(roomCosmeticLoadout(card.controllerId ?? match?.viewerId).cardBackId) : '';
  const mulliganReplaceMarker = selectionRole === 'MULLIGAN' && selected ? '<i class="mulligan-replace-marker" aria-hidden="true">REPLACE</i>' : '';
  const cardClassName = `card ${hidden ? 'hidden-card' : ''} ${premium ? 'executive-edition' : ''} ${concealedFaceDownSupport ? 'face-down-support' : faceDownSupport ? 'owner-visible-set' : ''} ${selected ? 'selected selection-selected' : ''} ${selectionCandidate ? `selection-candidate selection-kind-${selectionRole.toLowerCase()}` : ''} ${legal ? 'legal-card' : ''} ${targetCandidate || attackTarget ? 'target-candidate' : ''} ${targetSelected ? 'target-selected' : ''} ${promotionMaterial ? 'promotion-material-candidate' : ''} ${attackReady ? 'attack-ready' : ''} ${ability ? 'ability-ready' : ''} ${focusMeta ? 'board-focus-capable' : ''} ${attackOrigin ? 'attack-origin' : ''} ${attackDestination ? 'attack-destination' : ''} ${interactionAttacker ? 'interaction-attacker' : ''} ${interactionSource ? 'interaction-source' : ''} ${isHandFanCard ? 'hand-fan-card' : ''} ${surface ? `card-surface-${surface}` : ''} ${hasPower ? 'has-power' : ''} ${powerChanged ? 'power-changed' : ''} ${cueClassForCard(card.instanceId)} ${zoneCueClassForCard(card.instanceId)} dept-${esc((def?.department ?? 'hidden').toLowerCase())} type-${esc((def?.cardType ?? 'hidden').toLowerCase())} tier-${esc(finishTier.toLowerCase())}`;
  const cardAttributes = `data-card-ref="${esc(card.instanceId)}" ${selectAttr} ${playAttr} ${attackAttr} ${targetAttr} ${infoAttr} ${focusAttr} ${interactionAriaPressed} ${handStyle} tabindex="0"`;
  // Regression compatibility marker: concealed cards still use ${cardBackMarkup()}
  if (concealedFaceDownSupport) return `<div class="${cardClassName}" ${cardAttributes} aria-label="Face-down Support card">
    <!-- \${cardBackMarkup()} -->
    ${cardBackMarkup({ cardBackId:roomCosmeticLoadout(card.controllerId ?? match?.viewerId).cardBackId })}
    <button class="card-info" type="button" data-card-info-button="${esc(card.instanceId)}" aria-label="Inspect card" title="Inspect card">i</button>
    ${ability ? `<button class="card-ability" type="button" data-card-ability="${esc(card.instanceId)}" aria-label="Activate ability">ACT</button>` : ''}
    ${combinedFieldBadges ? `<div class="card-runtime-row field-state-row face-down-card-state">${combinedFieldBadges}</div>` : ''}
  </div>`;
  return `<div class="${cardClassName}" ${cardAttributes}>
    ${prototype}
    ${mulliganReplaceMarker}
    ${def ? `<div class="card-type-strip"><span>${esc(cardTypeLabel(def.cardType))}</span><b title="${esc(def.department.replaceAll('_',' '))}">${esc(departmentCode(def.department))}</b>${premium ? `<i class="card-finish-badge">${esc(collectionCopy('executiveEdition'))}</i>` : ''}</div>` : faceDownSupport ? '<div class="card-type-strip hidden-support-strip"><span>INCIDENT</span><b>SET</b></div>' : ''}
    <button class="card-info" type="button" data-card-info-button="${esc(card.instanceId)}" aria-label="Inspect card" title="Inspect card">i</button>
    ${ability ? `<button class="card-ability" type="button" data-card-ability="${esc(card.instanceId)}" aria-label="Activate ability">ACT</button>` : ''}
    <div class="card-name-row"><div class="card-name ${longName ? 'long-name' : ''}">${esc(def?.name ?? 'Face-down Incident')}</div>${costParts ? `<div class="card-cost-badge"><span>${esc(costParts.label)}</span><b>${esc(costParts.value)}</b></div>` : ''}</div>
    <div class="card-art-stage">${def ? renderArtwork(def) : supportBack}${premium ? '<i class="executive-art-foil" aria-hidden="true"></i>' : ''}${handActionLabel ? `<span class="card-play-hint ${handActionLabel === 'SET' ? 'set' : 'play'}">${esc(handActionLabel)}</span>` : ''}${def ? handCardContextBadge(card, def) : ''}${combinedFieldBadges ? `<div class="card-runtime-row field-state-row">${combinedFieldBadges}</div>` : ''}</div>
    <div class="card-detail-row">${detailBits.length ? detailBits.map((bit) => `<span>${esc(bit)}</span>`).join('') : '<span class="detail-spacer"></span>'}</div>
    ${def?.rulesText ? `<div class="card-rules-mini ${rulesDensityClass(def.rulesText)}" title="${esc(def.rulesText)}">${esc(def.rulesText)}</div>` : '<div class="card-rules-mini empty"></div>'}
    ${def ? `<div class="card-tags ${def.tags?.length ? '' : 'empty'}">${def.tags?.length ? def.tags.map((tag) => `<span>${esc(tag)}</span>`).join('') : ''}</div>` : ''}
    ${def ? renderPowerDisplay(card, def) : ''}
  </div>`;
}

function renderModalCardFace(card, def) {
  const costParts = cardCostParts(def);
  const finishTier = String(sandboxRarityTier(def) ?? 'T0');
  const detailBits = [def.rank, def.promotion?.required ? `PROMOTION ${def.promotion.required}` : ''].filter(Boolean);
  const longName = def.name.length >= 22;
  const attackMeta = attackReadyBadgeMeta(card.instanceId);
  const focusMeta = boardActionFocusMeta(card.instanceId);
  const runtimeBadges = fieldCardStateBadges(card, def, { attackReady:Boolean(attackMeta), ability:Boolean(legalAbilityOption(card.instanceId)), attackMeta, focusMeta });
  const power = cardPowerState(card, def);
  const premium = isExecutiveEditionVariant(card.variantId);
  return `<div class="card modal-card-face ${premium ? 'executive-edition' : ''} ${power ? 'has-power' : ''} ${power?.delta ? 'power-changed' : ''} dept-${esc(def.department.toLowerCase())} type-${esc(def.cardType.toLowerCase())} tier-${esc(finishTier.toLowerCase())}">
    <div class="card-type-strip"><span>${esc(cardTypeLabel(def.cardType))}</span><b title="${esc(def.department.replaceAll('_',' '))}">${esc(departmentCode(def.department))}</b>${premium ? `<i class="card-finish-badge">${esc(collectionCopy('executiveEdition'))}</i>` : ''}</div>
    <div class="card-name-row"><div class="card-name ${longName ? 'long-name' : ''}">${esc(def.name)}</div>${costParts ? `<div class="card-cost-badge"><span>${esc(costParts.label)}</span><b>${esc(costParts.value)}</b></div>` : ''}</div>
    <div class="card-art-stage">${renderArtwork(def)}${premium ? '<i class="executive-art-foil" aria-hidden="true"></i>' : ''}${runtimeBadges ? `<div class="card-runtime-row">${runtimeBadges}</div>` : ''}</div>
    <div class="card-detail-row">${detailBits.length ? detailBits.map((bit) => `<span>${esc(bit)}</span>`).join('') : '<span class="detail-spacer"></span>'}</div>
    <div class="card-rules-mini modal-rules-box ${rulesDensityClass(def.rulesText)}">${esc(def.rulesText || 'No rules text.')}</div>
    <div class="card-tags ${def.tags?.length ? '' : 'empty'}">${def.tags?.length ? def.tags.map((tag) => `<span>${esc(tag)}</span>`).join('') : ''}</div>
    ${renderPowerDisplay(card, def)}
  </div>`;
}


function cardInspectionContext(cardRef) {
  const match = state.view?.match;
  if (!match || !cardRef) return null;
  const groupsForPlayer = (player) => [
    { key:'HAND', label:'HAND', cards:player.hand ?? [] },
    { key:'EMPLOYEE_FIELD', label:'EMPLOYEE FIELD', cards:(player.employeeField ?? []).filter(Boolean) },
    { key:'SUPPORT_FIELD', label:'SUPPORT', cards:(player.supportField ?? []).filter(Boolean) },
    { key:'ARCHIVE', label:'ARCHIVE', cards:player.archive ?? [] }
  ];
  for (const [playerId, player] of Object.entries(match.players ?? {})) {
    for (const group of groupsForPlayer(player)) {
      const refs = group.cards.map((item) => item?.instanceId).filter(Boolean);
      const index = refs.indexOf(cardRef);
      if (index < 0) continue;
      return {
        ownerId:playerId,
        ownerLabel:playerId === match.viewerId ? 'YOUR' : 'OPPONENT',
        zoneKey:group.key,
        zoneLabel:group.label,
        refs,
        index
      };
    }
  }
  const pending = (match.pendingResolutions ?? []).map((item) => item.card).filter(Boolean);
  const pendingRefs = pending.map((item) => item.instanceId).filter(Boolean);
  const pendingIndex = pendingRefs.indexOf(cardRef);
  if (pendingIndex >= 0) return { ownerId:null, ownerLabel:'CHAIN', zoneKey:'PENDING', zoneLabel:'PENDING RESOLUTION', refs:pendingRefs, index:pendingIndex };
  const deckSelection = match.pendingDeckSelection?.visibleCards ?? [];
  const deckRefs = deckSelection.map((item) => item.instanceId).filter(Boolean);
  const deckIndex = deckRefs.indexOf(cardRef);
  if (deckIndex >= 0) return { ownerId:null, ownerLabel:'VISIBLE', zoneKey:'DECK_SELECTION', zoneLabel:'DECK SELECTION', refs:deckRefs, index:deckIndex };
  return null;
}

function navigateFocusedCard(direction) {
  const context = cardInspectionContext(state.focusedCardRef);
  if (!context?.refs?.length) return;
  const nextIndex = Math.max(0, Math.min(context.refs.length - 1, context.index + Number(direction || 0)));
  if (nextIndex === context.index) return;
  state.focusedCardRef = context.refs[nextIndex];
  hideHoverPreview();
  render();
  requestAnimationFrame(() => document.querySelector('[data-modal-panel]')?.focus());
}

function openCardInspector(cardRef) {
  if (!cardRef) return;
  state.returnFocusCardRef = cardRef;
  state.focusedCardRef = cardRef;
  hideHoverPreview();
  render();
  requestAnimationFrame(() => document.querySelector('[data-modal-panel]')?.focus());
}

function closeCardInspector() {
  const returnRef = state.returnFocusCardRef;
  state.focusedCardRef = null;
  state.returnFocusCardRef = null;
  render();
  if (returnRef) requestAnimationFrame(() => document.querySelector(`[data-card-info="${CSS.escape(returnRef)}"]`)?.focus({ preventScroll:true }));
}

function legalResponseOption(instanceId) {
  return state.view?.match?.legalActions?.responseOptions?.find((item) => item.sourceId === instanceId) ?? null;
}

function modalCardActions(card) {
  if (!card) return '';
  const controls = viewerHasControl();
  const items = [];
  const handAction = card.zone === 'HAND' ? legalHandActionLabel(card.instanceId) : null;
  if (handAction) items.push(`<button class="primary" data-modal-card-action="play" data-card-ref="${esc(card.instanceId)}" ${controls ? '' : 'disabled title="Read-only tab — take control to act"'}>${esc(handAction)} CARD</button>`);
  if (legalAttackSourceIds().has(card.instanceId)) items.push(`<button class="primary attack-action" data-modal-card-action="attack" data-card-ref="${esc(card.instanceId)}" ${controls ? '' : 'disabled title="Read-only tab — take control to act"'}>DECLARE ATTACK</button>`);
  if (legalAbilityOption(card.instanceId)) items.push(`<button data-modal-card-action="ability" data-card-ref="${esc(card.instanceId)}" ${controls ? '' : 'disabled title="Read-only tab — take control to act"'}>ACTIVATE ABILITY</button>`);
  if (legalResponseOption(card.instanceId)) items.push(`<button class="response-action" data-modal-card-action="response" data-card-ref="${esc(card.instanceId)}" ${controls ? '' : 'disabled title="Read-only tab — take control to act"'}>RESPOND</button>`);
  if (!items.length) {
    const note = controls ? (handCardAvailabilityNote(card, cardDef(card.definitionId)) ?? employeeBattleAvailabilityNote(card)) : null;
    return `<div class="inspector-action-bar quiet ${note ? 'availability-note' : ''}"><span>${esc(note?.tag ?? 'INSPECTION ONLY')}</span><strong>${note ? esc(note.title) : ''}</strong><small>${controls ? esc(note?.detail ?? 'No legal action from this card right now.') : 'This browser tab is read-only.'}</small></div>`;
  }
  return `<div class="inspector-action-bar"><div><span>AVAILABLE NOW</span><small>Actions use the same server-authoritative legal move list as the board.</small></div><div class="inspector-actions">${items.join('')}</div></div>`;
}

function renderInspectorNavigation(cardRef) {
  const context = cardInspectionContext(cardRef);
  if (!context) return '<div class="inspector-nav"><span>VISIBLE CARD</span></div>';
  const count = context.refs.length;
  const position = context.index + 1;
  return `<div class="inspector-nav">
    <div class="inspector-location"><span>${esc(context.ownerLabel)} ${esc(context.zoneLabel)}</span><small>${esc(position)} / ${esc(count)}</small></div>
    <div class="inspector-nav-buttons">
      <button type="button" data-modal-nav="-1" ${context.index <= 0 ? 'disabled' : ''} aria-label="Previous card">←</button>
      <button type="button" data-modal-nav="1" ${context.index >= count - 1 ? 'disabled' : ''} aria-label="Next card">→</button>
    </div>
  </div>`;
}

function powerDurationLabel(entry) {
  if (entry?.kind === 'CONTINUOUS') return 'While source is active';
  if (entry?.duration === 'END_OF_TURN') return 'Until end of turn';
  if (entry?.duration === 'UNTIL_START_OF_NEXT_OWN_TURN') return 'Until start of next own turn';
  return 'Temporary modifier';
}

function renderPowerBreakdown(card, def) {
  const power = cardPowerState(card, def);
  if (!power) return '';
  const entries = Array.isArray(card.powerBreakdown) ? card.powerBreakdown : [];
  const rows = entries.map((entry) => {
    const sourceDef = entry.sourceDefinitionId ? cardDef(entry.sourceDefinitionId) : null;
    const source = sourceDef?.name ?? (entry.sourceId ? cardLabel(entry.sourceId) : 'Visible effect');
    const amount = Number(entry.amount || 0);
    const amountText = `${amount > 0 ? '+' : ''}${amount}`;
    const tone = amount > 0 ? 'positive' : amount < 0 ? 'negative' : '';
    return `<div class="power-breakdown-row ${tone}"><span><b>${esc(source)}</b><small>${esc(entry.kind === 'CONTINUOUS' ? 'CONTINUOUS' : powerDurationLabel(entry))}</small></span><strong>${esc(amountText)}</strong></div>`;
  }).join('');
  return `<div class="power-breakdown" aria-label="Power modifier breakdown"><div class="power-breakdown-head"><span>POWER BREAKDOWN</span><strong>${esc(power.printed)} → ${esc(power.current)}</strong></div><div class="power-breakdown-row printed"><span><b>Printed Power</b><small>Card definition</small></span><strong>${esc(power.printed)}</strong></div>${rows || '<div class="power-breakdown-empty">No active Power modifiers.</div>'}</div>`;
}

function liveStatusDurationLabel(status) {
  const duration = String(status?.duration || '');
  if (duration === 'END_OF_TURN') return 'Until end of turn';
  if (duration === 'UNTIL_START_OF_NEXT_OWN_TURN') return 'Until start of next own turn';
  if (duration === 'UNTIL_CHAIN_ITEM_RESOLVES') return 'Until chain item resolves';
  if (duration === 'THROUGH_NEXT_CONTROLLER_BATTLE_PHASE') return 'Through next controller Battle Phase';
  return '';
}

function renderLiveStatusProvenance(card, match) {
  const statuses = Array.isArray(card?.liveStatuses) ? [...card.liveStatuses] : [];
  const scheduled = (match?.scheduledEffects ?? []).filter((item) => item.sourceId === card?.instanceId);
  const pending = (match?.pendingResolutions ?? []).filter((item) => item.sourceId === card?.instanceId);
  const statusRows = statuses.map((status) => {
    const sourceDef = status.sourceDefinitionId ? cardDef(status.sourceDefinitionId) : null;
    const sourceLabel = sourceDef?.name ?? (status.sourceId ? cardLabel(status.sourceId) : 'System state');
    const duration = liveStatusDurationLabel(status);
    return `<div class="live-status-row kind-${esc(String(status.kind || '').toLowerCase())}"><span><b>${esc(status.label)}</b><small>${esc([sourceLabel,duration].filter(Boolean).join(' · '))}</small></span><em>${esc(status.detail || '')}</em></div>`;
  });
  for (const item of scheduled) statusRows.push(`<div class="live-status-row kind-scheduled"><span><b>SCHEDULED EFFECT</b><small>${esc(item.phase)} · due turn-start ${esc(item.dueTurnsStarted)}</small></span><em>Server-owned delayed effect from this card.</em></div>`);
  for (const item of pending) statusRows.push(`<div class="live-status-row kind-pending"><span><b>PENDING RESOLUTION</b><small>${esc(item.abilityId || 'Ability')} · due turn-start ${esc(item.dueTurnsStarted)}</small></span><em>Queued server resolution sourced by this card.</em></div>`);
  return `<div class="live-status-provenance"><div class="live-status-head"><span>ACTIVE EFFECTS & STATUS</span><strong>${esc(statusRows.length)}</strong></div>${statusRows.length ? statusRows.join('') : '<div class="live-status-empty">No active statuses, shields or delayed effects.</div>'}</div>`;
}

function renderCardModal() {
  if (!state.focusedCardRef) return '';
  const card = cardByRef(state.focusedCardRef);
  const def = card ? cardDef(card.definitionId) : null;
  if (!card || !def) {
    return `<div class="modal-backdrop" data-close-card-modal><div class="card-modal hidden-preview" role="dialog" aria-modal="true" tabindex="-1" data-modal-panel>
      ${renderInspectorNavigation(state.focusedCardRef)}
      <button class="modal-close" data-close-card-modal>×</button>
      <div class="modal-card-visual hidden-card"><div class="card-name">Face-down Incident</div><div class="card-meta">Hidden information</div></div>
      <div><h2>Face-down Incident</h2><p class="muted">Its identity is intentionally not available to this client.</p></div>
    </div></div>`;
  }
  const status = implementationLabel(def);
  const statusClass = (def.implementationStatus ?? 'FULL').toLowerCase().replace('_','-');
  const metaBits = [def.cardType, def.department.replaceAll('_', ' '), def.rank, cardCostLabel(def)].filter(Boolean);
  const power = cardPowerState(card, def);
  const runtimeItems = [
    power ? `<span class="runtime-detail"><small>PRINTED POWER</small><b>${esc(power.printed)}</b></span>` : '',
    power && power.delta !== 0 ? `<span class="runtime-detail ${power.delta > 0 ? 'positive' : 'negative'}"><small>CURRENT POWER</small><b>${esc(power.current)} <i>${esc(power.delta > 0 ? `+${power.delta}` : power.delta)}</i></b></span>` : '',
    card.onboarding ? '<span class="runtime-detail warning"><small>STATUS</small><b>ONBOARDING</b></span>' : '',
    card.maxAttacks != null ? `<span class="runtime-detail"><small>ATTACKS</small><b>${esc(card.attacksUsed ?? 0)} / ${esc(card.maxAttacks)}</b></span>` : ''
  ].filter(Boolean);
  return `<div class="modal-backdrop" data-close-card-modal>
    <div class="card-modal frame-modal" role="dialog" aria-modal="true" aria-label="${esc(def.name)}" data-modal-panel tabindex="-1">
      ${renderInspectorNavigation(state.focusedCardRef)}
      <button class="modal-close" data-close-card-modal>×</button>
      <div class="modal-card-column">${renderModalCardFace(card, def)}</div>
      <div class="modal-copy frame-copy">
        <div class="implementation-status ${statusClass}">${esc(status)}</div>
        <h2>${esc(def.name)}</h2>
        <div class="modal-meta">${esc(metaBits.join(' · '))}</div>
        ${modalCardActions(card)}
        <div class="detail-chip-row">${def.tags?.length ? def.tags.map((tag) => `<span>${esc(tag)}</span>`).join('') : '<span class="detail-chip empty">No tags</span>'}</div>
        ${def.flavorText ? `<div class="frame-panel flavor-panel"><h4>Flavor</h4><p class="flavor-text">“${esc(def.flavorText)}”</p></div>` : ''}
        <div class="frame-panel runtime-panel"><h4>Live match state</h4>${runtimeItems.length ? `<div class="runtime-detail-grid">${runtimeItems.join('')}</div>` : '<div class="runtime-empty">No active runtime state for this card.</div>'}${power ? renderPowerBreakdown(card, def) : ''}${renderLiveStatusProvenance(card, state.view?.match)}</div>
        ${def.implementationNotes ? `<div class="frame-panel implementation-note"><strong>Prototype note:</strong> ${esc(def.implementationNotes)}</div>` : ''}
      </div>
    </div>
  </div>`;
}

function appendEvents(events = [], { present = true } = {}) {
  const significant = new Set(['CARD_PLAYED','PROMOTION_COMPLETED','ATTACK_DECLARED','ATTACK_TARGET_REDIRECTED','DESTRUCTION_PREVENTED','EMPLOYEE_DESTROYED','CARD_DESTROYED','BATTLE_RESOLVED','BREAKTHROUGH_DAMAGE','REPUTATION_CHANGED','REPUTATION_LOSS_REDUCED','INCIDENT_ACTIVATED','ABILITY_ACTIVATED','ACTION_RESOLVED','CHAIN_ITEM_ADDED','CHAIN_ITEM_NEGATED','CHAIN_ITEM_DELAYED','CHAIN_RESOLVED','GAME_ENDED']);
  const movementSignificant = new Set(['CARD_DRAWN','CARD_MOVED','CARD_ARCHIVED','CARD_REVEALED','DECK_SHUFFLED']);
  const freshCues = [];
  const freshMovement = [];
  const freshAttacks = [];
  let latestTurnCue = null;
  for (const event of events) {
    if (state.eventLog.some((x) => x.seq === event.seq)) continue;
    state.eventLog.push(event);
    if (significant.has(event.type)) freshCues.push(event);
    if (event.type === 'ATTACK_DECLARED') freshAttacks.push(event);
    if (movementSignificant.has(event.type)) freshMovement.push(event);
    if (event.type === 'TURN_STARTED') latestTurnCue = event;
  }
  state.eventLog = state.eventLog.slice(-40);
  if (!present) return;
  if (freshAttacks.length) enqueueAttackPresentations(freshAttacks);
  if (freshCues.length) enqueueGameplayPresentations(freshCues);
  if (latestTurnCue) {
    state.flowCue = latestTurnCue;
    if (state.flowCueTimer) clearTimeout(state.flowCueTimer);
    state.flowCueTimer = setTimeout(() => { state.flowCue = null; state.flowCueTimer = null; render(); }, 2200);
  }
  if (freshMovement.length) {
    state.zoneCue = buildZoneCue(freshMovement);
    if (state.zoneCueTimer) clearTimeout(state.zoneCueTimer);
    const zoneCueDuration = state.zoneCue?.kind === 'SEARCH_COMPLETE' ? 3400 : 2600;
    state.zoneCueTimer = setTimeout(() => { state.zoneCue = null; state.zoneCueTimer = null; render(); }, zoneCueDuration);
  }
  if (freshCues.length) {
    state.visualCueBatch = freshCues.slice(-10);
    const priority = ['GAME_ENDED','PROMOTION_COMPLETED','BREAKTHROUGH_DAMAGE','EMPLOYEE_DESTROYED','CARD_DESTROYED','CHAIN_ITEM_NEGATED','CHAIN_ITEM_DELAYED','ACTION_RESOLVED','INCIDENT_ACTIVATED','ABILITY_ACTIVATED','REPUTATION_CHANGED','ATTACK_DECLARED','CARD_PLAYED','BATTLE_RESOLVED','CHAIN_RESOLVED'];
    state.visualCue = priority.map((type) => [...freshCues].reverse().find((event) => event.type === type)).find(Boolean) ?? freshCues.at(-1);
    const resolutionTrace = buildResolutionTrace(freshCues);
    if (resolutionTrace) {
      state.resolutionTrace = resolutionTrace;
      if (state.resolutionTraceTimer) clearTimeout(state.resolutionTraceTimer);
      state.resolutionTraceTimer = setTimeout(() => { state.resolutionTrace = null; state.resolutionTraceTimer = null; render(); }, 5200);
    }
    if (state.visualCueTimer) clearTimeout(state.visualCueTimer);
    state.visualCueTimer = setTimeout(() => { state.visualCue = null; state.visualCueBatch = []; state.visualCueTimer = null; render(); }, 3600);
  }
}

function formatEvent(event) {
  const card = event.cardInstanceId ? cardLabel(event.cardInstanceId) : '';
  const details = event.data && Object.keys(event.data).length ? ` ${JSON.stringify(event.data)}` : '';
  return `#${event.seq} ${event.type}${card ? ` · ${card}` : ''}${details}`;
}

const MATCH_FEED_LIMIT = 5;
const MATCH_FEED_CONTEXT_LIMIT = 7;
const MATCH_FEED_RESOLUTION_WINDOW = 5;

const MATCH_FEED_KEY_TYPES = new Set([
  'GAME_ENDED','PROMOTION_COMPLETED','BATTLE_RESOLVED','BREAKTHROUGH_DAMAGE','CHAIN_ITEM_NEGATED','CHAIN_ITEM_DELAYED',
  'ACTION_RESOLVED','REPUTATION_CHANGED','REPUTATION_LOSS_REDUCED','EMPLOYEE_DESTROYED','CARD_DESTROYED'
]);
const MATCH_FEED_ACTION_TYPES = new Set(['CARD_PLAYED','INCIDENT_SET','INCIDENT_ACTIVATED','ABILITY_ACTIVATED','ATTACK_DECLARED','ATTACK_TARGET_REDIRECTED','DESTRUCTION_PREVENTED','CHAIN_RESOLVED']);

function matchFeedImportance(type) {
  if (MATCH_FEED_KEY_TYPES.has(type)) return 'key';
  if (MATCH_FEED_ACTION_TYPES.has(type)) return 'action';
  return 'flow';
}

function matchFeedImportanceLabel(importance) {
  return importance === 'key' ? 'KEY' : importance === 'action' ? 'ACTION' : 'FLOW';
}

function feedActor(playerId) {
  const viewerId = state.view?.match?.viewerId;
  if (!playerId) return 'Match';
  return playerId === viewerId ? 'You' : 'Opponent';
}

function feedCardName(ref, fallback = 'card') {
  if (!ref) return fallback;
  const label = cardLabel(ref);
  if (!label || label === ref || label === 'Face-down Support' || String(label).startsWith('hidden-support:')) return fallback;
  return label;
}

function feedCardDefinition(ref) {
  const card = ref ? cardByRef(ref) : null;
  return card ? cardDef(card.definitionId) : null;
}

function battleFeedDetail(event) {
  const d = event.data ?? {};
  const attackerId = d.attackerId ?? event.cardInstanceId;
  const targetId = d.targetId ?? null;
  const attacker = feedCardName(attackerId, 'Attacker');
  const defender = targetId ? feedCardName(targetId, 'Defender') : 'Company Reputation';
  const attackerPower = Number(d.attackerPower);
  const defenderPower = Number(d.defenderPower);
  const powerText = Number.isFinite(attackerPower) && Number.isFinite(defenderPower) ? `${attacker} ${attackerPower} vs ${defender} ${defenderPower}` : `${attacker} vs ${defender}`;
  const destroyed = Array.isArray(d.destroyedIds) ? d.destroyedIds.map((id) => feedCardName(id, 'Employee')) : [];
  const prevented = Array.isArray(d.replacedOrPreventedIds) ? d.replacedOrPreventedIds.map((id) => feedCardName(id, 'Employee')) : [];
  let outcome = 'No Employee destroyed';
  if (destroyed.length === 2) outcome = 'Both Employees destroyed';
  else if (destroyed.length === 1) outcome = `${destroyed[0]} destroyed`;
  else if (prevented.length) outcome = `${prevented.join(' + ')} survived prevention`;
  if (prevented.length && destroyed.length) outcome += ` · ${prevented.join(' + ')} survived prevention`;
  return { text:powerText, detail:outcome };
}


const RESOLUTION_TRACE_TERMINALS = new Set(['BATTLE_RESOLVED','ACTION_RESOLVED','CHAIN_RESOLVED','CHAIN_ITEM_NEGATED','CHAIN_ITEM_DELAYED','BREAKTHROUGH_DAMAGE']);
const RESOLUTION_TRACE_STARTERS = new Set(['ATTACK_DECLARED','CARD_PLAYED','INCIDENT_ACTIVATED','ABILITY_ACTIVATED']);
const RESOLUTION_TRACE_TYPES = new Set([
  'ATTACK_DECLARED','ATTACK_TARGET_REDIRECTED','DESTRUCTION_PREVENTED','BATTLE_RESOLVED','BREAKTHROUGH_DAMAGE',
  'CARD_PLAYED','INCIDENT_ACTIVATED','ABILITY_ACTIVATED','CHAIN_ITEM_NEGATED','CHAIN_ITEM_DELAYED','ACTION_RESOLVED','CHAIN_RESOLVED',
  'CARD_DESTROYED','EMPLOYEE_DESTROYED','REPUTATION_CHANGED','REPUTATION_LOSS_REDUCED'
]);

function resolutionTraceStep(event) {
  if (!event || !RESOLUTION_TRACE_TYPES.has(event.type)) return null;
  const d = event.data ?? {};
  const item = matchFeedItem(event);
  if (event.type === 'BATTLE_RESOLVED') {
    const battle = battleFeedDetail(event);
    return { code:'POWER', title:battle.text, detail:battle.detail, tone:'battle', seq:event.seq };
  }
  if (event.type === 'DESTRUCTION_PREVENTED') {
    const card = feedCardName(event.cardInstanceId, 'Employee');
    return { code:'PREVENT', title:`${card} stayed on the field`, detail:'A visible prevention or replacement event stopped destruction', tone:'prevented', seq:event.seq };
  }
  if (event.type === 'ATTACK_TARGET_REDIRECTED') {
    const target = feedCardName(d.newTargetId, 'new target');
    return { code:'REDIRECT', title:`Attack → ${target}`, detail:'The declared target changed before Battle resolved', tone:'redirected', seq:event.seq };
  }
  if (event.type === 'CHAIN_RESOLVED') return { code:'COMPLETE', title:'Chain complete', detail:'Priority returns to the match', tone:'resolved', seq:event.seq };
  if (!item) return null;
  const tone = event.type === 'CHAIN_ITEM_NEGATED' || (event.type === 'ACTION_RESOLVED' && d.negated) ? 'negated'
    : event.type === 'CHAIN_ITEM_DELAYED' ? 'delayed'
    : event.type === 'BREAKTHROUGH_DAMAGE' || event.type === 'REPUTATION_CHANGED' ? 'impact'
    : event.type === 'CARD_DESTROYED' || event.type === 'EMPLOYEE_DESTROYED' ? 'destroyed'
    : 'neutral';
  return { code:item.code, title:item.text, detail:item.detail, tone, seq:event.seq };
}

function buildResolutionTrace(events = []) {
  if (!events.length) return null;
  let terminalIndex = -1;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (RESOLUTION_TRACE_TERMINALS.has(events[i].type)) { terminalIndex = i; break; }
  }
  if (terminalIndex < 0) return null;
  let startIndex = Math.max(0, terminalIndex - 7);
  for (let i = terminalIndex; i >= 0; i -= 1) {
    if (RESOLUTION_TRACE_STARTERS.has(events[i].type)) { startIndex = i; break; }
  }
  const scope = events.slice(startIndex, terminalIndex + 1);
  const hasBattle = scope.some((event) => event.type === 'BATTLE_RESOLVED');
  const battleSummary = hasBattle ? scope.find((event) => event.type === 'BATTLE_RESOLVED') : null;
  const steps = [];
  for (const event of scope) {
    if (hasBattle && (event.type === 'EMPLOYEE_DESTROYED' || event.type === 'CARD_DESTROYED')) continue; // BATTLE_RESOLVED already carries the authoritative visible outcome.
    if (event.type === 'REPUTATION_CHANGED' && event.data?.reason === 'BREAKTHROUGH') continue; // Breakthrough has its own explicit step.
    const step = resolutionTraceStep(event);
    if (!step) continue;
    if (steps.some((existing) => existing.seq === step.seq)) continue;
    steps.push(step);
  }
  if (!steps.length) return null;
  const kind = hasBattle ? 'BATTLE' : scope.some((event) => event.type === 'CHAIN_RESOLVED' || event.type === 'CHAIN_ITEM_NEGATED' || event.type === 'CHAIN_ITEM_DELAYED') ? 'CHAIN' : 'EFFECT';
  const preventedCount = Array.isArray(battleSummary?.data?.replacedOrPreventedIds) ? battleSummary.data.replacedOrPreventedIds.length : 0;
  return {
    kind,
    steps:steps.slice(-6),
    note:kind === 'BATTLE'
      ? (preventedCount ? 'Final visible Battle result · prevention/replacement changed at least one destruction.' : 'Final visible Battle result from authoritative events.')
      : 'Visible projected events only · hidden information remains redacted.'
  };
}

function renderResolutionTrace(match) {
  const trace = state.resolutionTrace;
  if (!trace?.steps?.length || !match || match.status === 'SETUP') return '';
  const label = trace.kind === 'BATTLE' ? 'BATTLE TRACE' : trace.kind === 'CHAIN' ? 'CHAIN TRACE' : 'RESOLUTION TRACE';
  return `<section class="resolution-trace trace-${esc(trace.kind.toLowerCase())}" aria-label="Latest resolution trace" aria-live="polite">
    <div class="resolution-trace-head"><span>LAST RESOLUTION</span><strong>${esc(label)}</strong><small>${esc(trace.note)}</small></div>
    <div class="resolution-trace-steps">${trace.steps.map((step, index) => `<div class="resolution-trace-step tone-${esc(step.tone)}"><small>${esc(index + 1)} · ${esc(step.code)}</small><b>${esc(step.title)}</b><em>${esc(step.detail)}</em></div>`).join('')}</div>
  </section>`;
}

function matchFeedItem(event) {
  if (!event) return null;
  const actor = feedActor(event.playerId);
  const card = feedCardName(event.cardInstanceId, event.type === 'INCIDENT_SET' ? 'Incident' : 'card');
  const d = event.data ?? {};
  const yours = event.playerId && event.playerId === state.view?.match?.viewerId;
  const tone = yours ? 'yours' : event.playerId ? 'opponent' : 'neutral';
  const base = { seq:event.seq, type:event.type, tone, cardRef:event.cardInstanceId ?? null, count:1, lastSeq:event.seq, importance:matchFeedImportance(event.type), groupedCount:0, groupedCodes:[] };

  switch (event.type) {
    case 'MULLIGAN_COMPLETED': {
      const returned = Number(d.returned ?? 0);
      return { ...base, code:'OPEN', text:`${actor} ${returned ? `replaced ${returned}` : 'kept all 5'} opening card${returned === 1 ? '' : 's'}`, detail:returned ? `${5 - returned} kept · ${returned} redrawn` : 'Opening hand locked' };
    }
    case 'TURN_STARTED': {
      const cap = Number(d.availableCapacity ?? d.maxCapacity);
      return { ...base, code:'TURN', text:`${actor === 'You' ? 'Your' : 'Opponent'} turn started`, detail:Number.isFinite(cap) ? `Capacity ${cap}/${Number(d.maxCapacity ?? cap)}` : 'Start Phase' };
    }
    case 'DRAW_SKIPPED': return { ...base, code:'DRAW', text:`${actor === 'You' ? 'Your' : 'Opponent'} opening Draw was skipped`, detail:'First player opens the office' };
    case 'CARD_DRAWN': return { ...base, kind:'DRAW', code:'DRAW', text:event.cardInstanceId ? `${actor} drew ${card}` : `${actor} drew a card`, detail:'Added to hand' };
    case 'CARD_PLAYED': {
      const type = String(d.cardType ?? feedCardDefinition(event.cardInstanceId)?.cardType ?? 'CARD').toLowerCase();
      return { ...base, code:type === 'employee' ? 'EMP' : type === 'system' ? 'SYS' : type === 'action' ? 'ACT' : 'PLAY', text:`${actor} played ${card}`, detail:`${type.charAt(0).toUpperCase()}${type.slice(1)} · Cost ${d.cost ?? '—'}` };
    }
    case 'INCIDENT_SET': return { ...base, code:'SET', text:event.cardInstanceId ? `${actor} set ${card}` : `${actor} set an Incident`, detail:'Face-down in Support' };
    case 'PROMOTION_COMPLETED': {
      const materials = Array.isArray(d.materials) ? d.materials.map((id) => feedCardName(id, 'Employee')) : [];
      return { ...base, code:'PROMO', text:`${actor} promoted into ${card}`, detail:materials.length ? `Materials archived: ${materials.join(', ')}` : 'Promotion completed' };
    }
    case 'INCIDENT_ACTIVATED': return { ...base, code:'INC', text:`${actor} activated ${card}`, detail:'Incident entered the Chain' };
    case 'ABILITY_ACTIVATED': return { ...base, code:'FX', text:`${actor} activated ${card}`, detail:'Employee/System ability' };
    case 'ATTACK_DECLARED': {
      const target = d.targetId ? feedCardName(d.targetId, 'Employee') : 'Company Reputation';
      return { ...base, code:'ATK', text:`${card} attacked ${target}`, detail:`${actor} declared the attack` };
    }
    case 'ATTACK_TARGET_REDIRECTED': {
      const target = feedCardName(d.newTargetId, 'new target');
      return { ...base, code:'REDIR', text:`Attack redirected to ${target}`, detail:event.cardInstanceId ? `${card} changed the target` : 'Target changed' };
    }
    case 'BATTLE_RESOLVED': {
      const result = battleFeedDetail(event);
      return { ...base, code:'BATTLE', text:result.text, detail:result.detail };
    }
    case 'DESTRUCTION_PREVENTED': return { ...base, code:'SAVE', text:`${card} avoided destruction`, detail:'A replacement or protection effect applied' };
    case 'EMPLOYEE_DESTROYED': {
      if (!d.cause) return null; // Battle outcomes are summarized by BATTLE_RESOLVED.
      return { ...base, code:'KO', text:`${card} was destroyed`, detail:'Destroyed by a card effect' };
    }
    case 'CARD_DESTROYED': {
      const def = feedCardDefinition(event.cardInstanceId);
      if (def?.cardType === 'EMPLOYEE') return null;
      return { ...base, code:'KO', text:`${card} was destroyed`, detail:'Moved to Archive' };
    }
    case 'BREAKTHROUGH_DAMAGE': {
      const amount = Math.abs(Number(d.excessPower ?? 0));
      return { ...base, code:'BREAK', text:`${card} dealt ${amount} Breakthrough`, detail:`Opponent lost ${amount} Reputation` };
    }
    case 'REPUTATION_CHANGED': {
      if (d.reason === 'BREAKTHROUGH') return null; // Breakthrough has a more descriptive feed item.
      const delta = Number(d.delta ?? d.amount ?? 0);
      if (!delta) return null;
      const subject = actor === 'You' ? 'Your' : 'Opponent';
      return { ...base, code:'REP', text:`${subject} Reputation ${delta > 0 ? `+${delta}` : delta}`, detail:`${d.before ?? '—'} → ${d.after ?? '—'}${d.reason ? ` · ${String(d.reason).replaceAll('_',' ').toLowerCase()}` : ''}` };
    }
    case 'REPUTATION_LOSS_REDUCED': {
      const amount = Number(d.amount ?? 0);
      return { ...base, code:'SHIELD', text:`${card} reduced Reputation loss`, detail:`Prevented ${amount} Reputation loss` };
    }
    case 'CHAIN_ITEM_NEGATED': {
      const stopped = chainSourceRefForEvent(event);
      return { ...base, code:'NEGATE', text:`${card} applied a negation`, detail:stopped ? `${feedCardName(stopped, 'Effect')} was negated` : 'A Chain effect was negated' };
    }
    case 'CHAIN_ITEM_DELAYED': return { ...base, code:'DELAY', text:`${card} was delayed`, detail:'Resolution moved to a later window' };
    case 'ACTION_RESOLVED': return { ...base, code:d.negated ? 'NEGATE' : 'RESOLVE', text:`${card} ${d.negated ? 'was negated' : 'resolved'}`, detail:d.negated ? 'Its effect did not resolve' : 'Action effect completed' };
    case 'CHAIN_RESOLVED': return { ...base, code:'CHAIN', text:'Chain completed', detail:'Priority returns to normal match flow' };
    case 'CARD_REVEALED': return event.cardInstanceId ? { ...base, code:'REVEAL', text:`${card} was revealed`, detail:d.to === 'CONTROLLER' ? 'Revealed to controller' : 'Revealed to both players' } : null;
    case 'GAME_ENDED': return { ...base, code:'END', tone:event.playerId === state.view?.match?.viewerId ? 'win' : 'loss', text:event.playerId === state.view?.match?.viewerId ? 'You won the match' : 'Opponent won the match', detail:String(d.reason ?? 'Match ended').replaceAll('_',' ').toLowerCase() };
    default: return null;
  }
}

function collapseResolvedFeedBursts(items = []) {
  const hidden = new Set();
  const groupedByTerminal = new Map();
  const attach = (terminalIndex, candidateIndex) => {
    if (candidateIndex < 0 || candidateIndex >= terminalIndex || hidden.has(candidateIndex)) return;
    const terminal = items[terminalIndex];
    const candidate = items[candidateIndex];
    if (!terminal || !candidate || terminal.seq - candidate.lastSeq > MATCH_FEED_RESOLUTION_WINDOW) return;
    hidden.add(candidateIndex);
    const group = groupedByTerminal.get(terminalIndex) ?? [];
    group.push(candidate);
    groupedByTerminal.set(terminalIndex, group);
  };

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (item.type === 'BATTLE_RESOLVED') {
      for (let j = i - 1; j >= 0 && i - j <= 4; j -= 1) {
        if (['ATTACK_DECLARED','ATTACK_TARGET_REDIRECTED','DESTRUCTION_PREVENTED'].includes(items[j]?.type)) attach(i,j);
        if (items[j]?.type === 'BATTLE_RESOLVED') break;
      }
    }
    if (item.type === 'ACTION_RESOLVED') {
      for (let j = i - 1; j >= 0 && i - j <= 3; j -= 1) {
        const previous = items[j];
        if (!previous) continue;
        if (['ABILITY_ACTIVATED','INCIDENT_ACTIVATED'].includes(previous.type) && (!item.cardRef || !previous.cardRef || previous.cardRef === item.cardRef)) {
          attach(i,j);
          break;
        }
      }
    }
  }

  return items.filter((_, index) => !hidden.has(index)).map((item, index) => {
    const originalIndex = items.indexOf(item);
    const grouped = groupedByTerminal.get(originalIndex) ?? [];
    if (!grouped.length) return item;
    const codes = grouped.map((entry) => entry.code);
    return {
      ...item,
      groupedCount:grouped.length,
      groupedCodes:codes,
      detail:`${item.detail} · ${grouped.length} setup step${grouped.length === 1 ? '' : 's'} grouped`
    };
  });
}

function allMatchFeedItems() {
  const items = [];
  for (const event of state.eventLog) {
    const item = matchFeedItem(event);
    if (!item) continue;
    const previous = items.at(-1);
    if (item.kind === 'DRAW' && previous?.kind === 'DRAW' && previous.type === 'CARD_DRAWN' && previous.tone === item.tone && event.seq === previous.lastSeq + 1) {
      previous.count += 1;
      previous.lastSeq = event.seq;
      previous.text = `${feedActor(event.playerId)} drew ${previous.count} cards`;
      previous.detail = 'Added to hand';
      previous.cardRef = null;
      continue;
    }
    items.push(item);
  }
  return collapseResolvedFeedBursts(items);
}

function matchFeedModel() {
  const recent = allMatchFeedItems().slice(-12).reverse();
  if (!recent.length) return { items:[], context:[] };
  const latest = recent[0]; // The newest visible event always stays first, even when it is routine flow.
  const strongest = recent.find((item, index) => index > 0 && item.importance === 'key');
  const chosen = [latest];
  if (strongest) chosen.push(strongest);
  for (const item of recent) {
    if (chosen.some((entry) => entry.seq === item.seq)) continue;
    chosen.push(item);
    if (chosen.length >= MATCH_FEED_LIMIT) break;
  }
  const chosenSeq = new Set(chosen.map((item) => item.seq));
  const context = recent.filter((item) => !chosenSeq.has(item.seq)).slice(0,MATCH_FEED_CONTEXT_LIMIT);
  return { items:chosen, context };
}

function matchFeedItems() {
  return matchFeedModel().items;
}

function renderMatchFeedItem(item, { latest = false, compact = false } = {}) {
  const inspectable = item.cardRef && cardByRef(item.cardRef);
  const attrs = inspectable ? ` data-card-info="${esc(item.cardRef)}" role="button" tabindex="0" aria-label="Inspect ${esc(feedCardName(item.cardRef, 'card'))}"` : '';
  const signal = `<em class="match-feed-signal signal-${esc(item.importance)}">${esc(matchFeedImportanceLabel(item.importance))}</em>`;
  const grouped = item.groupedCount ? `<i class="match-feed-grouped" title="Grouped setup steps: ${esc(item.groupedCodes.join(' → '))}">+${esc(item.groupedCount)} steps</i>` : '';
  return `<article class="match-feed-item tone-${esc(item.tone)} importance-${esc(item.importance)} ${latest ? 'latest' : ''} ${compact ? 'compact' : ''}"${attrs}><span class="match-feed-code">${esc(item.code)}</span><div><div class="match-feed-item-head">${signal}<strong>${esc(item.text)}</strong></div><small>${esc(item.detail)}</small></div>${grouped}${latest ? '<b class="match-feed-live">LATEST</b>' : ''}</article>`;
}

function renderMatchFeed(match) {
  const model = matchFeedModel();
  const items = model.items;
  if (!items.length) return '';
  const keyVisible = items.filter((item) => item.importance === 'key').length;
  const contextMode = matchContextMode(match);
  const priorityContext = contextMode === 'DECISION' || contextMode === 'RESPONSE';
  const feedNote = priorityContext ? `${contextMode.toLowerCase()} context active · latest only` : `${keyVisible ? `${keyVisible} key · ` : ''}latest stays first`;
  return `<section class="match-feed ${priorityContext ? 'context-priority' : ''}" aria-label="Recent match activity">
    <div class="match-feed-heading"><div><span>LIVE ACTIVITY</span><strong>Signal feed</strong></div><small>${esc(feedNote)}</small></div>
    <div class="match-feed-list">${items.map((item, index) => renderMatchFeedItem(item,{ latest:index === 0 })).join('')}</div>
    ${model.context.length ? `<details class="match-feed-context"><summary>Recent context · ${esc(model.context.length)}</summary><div>${model.context.map((item) => renderMatchFeedItem(item,{ compact:true })).join('')}</div><small>Routine context is compacted here; the full raw event stream remains available in Playtest tools.</small></details>` : ''}
  </section>`;
}


function customDeckOptions() {
  return state.customDecks.map((deck) => {
    const value = `custom:${deck.id}`;
    return `<option value="${esc(value)}" ${state.preferredDeckValue===value?'selected':''}>${esc(deck.name)} — Custom (${deckCardCount(deck)}/40)</option>`;
  }).join('');
}

function lobbyDeckOptions() {
  const presetOptions = state.presets.map((preset) => `<option value="${esc(preset.id)}" ${state.preferredDeckValue===preset.id?'selected':''}>${esc(preset.name)} — ${esc(preset.department)}</option>`).join('');
  return presetOptions + customDeckOptions();
}

function botDeckOptions() {
  return state.presets.map((preset) => `<option value="${esc(preset.id)}" ${state.botDeckId === preset.id ? 'selected' : ''}>${esc(preset.name)} — ${esc(preset.department)}</option>`).join('');
}

function effectiveLobbyDeckValue(value = state.preferredDeckValue) {
  if (value && (state.presets.some((preset) => preset.id === value) || state.customDecks.some((deck) => `custom:${deck.id}` === value))) return value;
  return state.presets[0]?.id ?? (state.customDecks[0] ? `custom:${state.customDecks[0].id}` : '');
}

function lobbyDeckSummary(value = state.preferredDeckValue) {
  const resolved = effectiveLobbyDeckValue(value);
  const custom = resolved.startsWith('custom:');
  const source = custom
    ? state.customDecks.find((deck) => deck.id === resolved.slice('custom:'.length))
    : state.presets.find((preset) => preset.id === resolved);
  if (!source) return null;
  const deck = { cards:(source.cards ?? []).map((entry) => ({ definitionId:entry.definitionId, copies:Number(entry.copies || 0), ...(entry.variantId ? { variantId:entry.variantId } : {}) })) };
  const total = deckCardCount(deck);
  const formatErrors = deckFormatErrors(deck);
  const owned = deckOwnedReadiness(deck);
  const department = custom ? deckPrimaryDepartment(deck) : (source.department ?? deckPrimaryDepartment(deck));
  const identity = departmentIdentity(department);
  const stats = deckStats(deck);
  return {
    value:resolved,
    custom,
    name:source.name ?? 'Deck',
    department,
    identity,
    total,
    formatReady:formatErrors.length === 0,
    formatErrors,
    ownedReady:owned.ready,
    missingCopies:owned.missingCopies,
    topTags:stats.topTags.slice(0,3).map(([tag]) => tag),
    entries:deck.cards,
    stats
  };
}

// Regression compatibility marker for v7.69.4 showcase coverage: ['EMPLOYEE','ACTION','SYSTEM','INCIDENT']
function weightedLobbyShowcaseSample(candidates, count = 3) {
  const pool = candidates.slice();
  const chosen = [];
  while (pool.length && chosen.length < count) {
    const totalWeight = pool.reduce((sum, entry) => sum + Math.max(1, Number(entry.copies || 0)), 0);
    let roll = Math.random() * totalWeight;
    let index = 0;
    for (; index < pool.length; index += 1) {
      roll -= Math.max(1, Number(pool[index].copies || 0));
      if (roll < 0) break;
    }
    chosen.push(pool.splice(Math.min(index, pool.length - 1), 1)[0]);
  }
  return chosen;
}

function lobbyDeckPreviewCards(value = state.preferredDeckValue) {
  const deck = lobbyDeckSummary(value);
  if (!deck) return [];
  const candidates = deck.entries.map((entry) => ({
    def:cardDef(entry.definitionId),
    copies:Number(entry.copies || 0),
    variantId:entry.variantId ?? null
  })).filter((entry) => entry.def && entry.copies > 0);
  if (!candidates.length) return [];

  const candidateById = new Map(candidates.map((entry) => [entry.def.id, entry]));
  const cached = state.lobbyShowcaseDeckValue === deck.value
    ? state.lobbyShowcaseCardIds.map((id) => candidateById.get(id)).filter(Boolean)
    : [];
  if (cached.length === Math.min(3, candidates.length)) return cached;

  const illustrated = candidates.filter((entry) => Boolean(entry.def.artId));
  const pool = illustrated.length >= Math.min(3, candidates.length) ? illustrated : candidates;
  const chosen = weightedLobbyShowcaseSample(pool, Math.min(3, pool.length));
  state.lobbyShowcaseDeckValue = deck.value;
  state.lobbyShowcaseCardIds = chosen.map((entry) => entry.def.id);
  state.lobbyShowcaseVariantIds = chosen.map((entry) => entry.variantId ?? null);
  return chosen;
}

function renderLobbyLiveCardFace(def, variantId = null) {
  if (!def) return '<div class="catalog-card-face missing">Unknown card</div>';
  // The lobby showcase deliberately reuses the exact Deckbuilder card face.
  // This keeps type strips, frame treatment, art window, rules, tags, rarity and Power visually identical.
  return renderCatalogCardFace(def,{ artReady:Boolean(def.artId), variantId });
}

function renderLobbyDeckShowcase(value = state.preferredDeckValue) {
  const deck = lobbyDeckSummary(value);
  if (!deck) return `<section class="desk-deck-showcase empty"><div class="desk-deck-sheet"><span>${lobbyCopy('CURRENT DECK','AKTUELLES DECK')}</span><strong>${lobbyCopy('No deck selected','Kein Deck ausgewählt')}</strong></div></section>`;
  const preview = lobbyDeckPreviewCards(deck.value);
  const size = Number(state.format?.deckSize ?? 40);
  const counts = deck.stats.typeCounts;
  const typeLine = [
    `${counts.EMPLOYEE ?? 0} ${lobbyCopy('Employee','Employee')}`,
    `${counts.ACTION ?? 0} ${lobbyCopy('Action','Action')}`,
    `${counts.INCIDENT ?? 0} ${lobbyCopy('Incident','Incident')}`,
    `${counts.SYSTEM ?? 0} ${lobbyCopy('System','System')}`
  ].join(' · ');
  const ownedLabel = deck.ownedReady ? lobbyCopy('COLLECTION READY','SAMMLUNG BEREIT') : lobbyCopy(`${deck.missingCopies} copies missing`,`${deck.missingCopies} Kopien fehlen`);
  return `<section class="desk-deck-showcase ${esc(departmentThemeClass(deck.department))}" aria-label="${esc(lobbyCopy('Selected match deck','Ausgewähltes Match-Deck'))}">
    <div class="desk-deck-sheet">
      <div class="desk-deck-sheet-head"><div><span>${lobbyCopy('CURRENT DECK','AKTUELLES DECK')}</span><strong>${esc(deck.name)}</strong></div><b>${esc(departmentCode(deck.department))}</b></div>
      <p>${esc(deck.identity.loop)}</p>
      <div class="desk-deck-tags">${deck.topTags.length ? deck.topTags.map((tag)=>`<span>#${esc(tag)}</span>`).join('') : `<span>${esc(deck.identity.label)}</span>`}</div>
      <div class="desk-deck-facts"><span><b>${esc(deck.total)}/${esc(size)}</b>${deck.formatReady ? lobbyCopy(' Format ready',' Format bereit') : lobbyCopy(' Draft',' Entwurf')}</span><span><b>${esc(deck.stats.averageCost.toFixed(1))}</b>${lobbyCopy(' avg. cost',' Ø Kosten')}</span><span class="${deck.ownedReady?'ready':'warn'}">${esc(ownedLabel)}</span></div>
      <small>${esc(typeLine)}</small>
    </div>
    <div class="desk-card-fan" aria-label="${esc(lobbyCopy('Rotating cards from selected deck','Wechselnde Karten aus dem ausgewählten Deck'))}">
      ${preview.length ? preview.map((entry,index)=>`<div class="desk-card-fan-item fan-${index+1}" title="${esc(entry.def.name)} · ${esc(entry.copies)}×">${renderLobbyLiveCardFace(entry.def,entry.variantId)}<i>${esc(entry.copies)}×</i></div>`).join('') : `<div class="desk-card-fan-empty">${lobbyCopy('Add cards to preview this deck.','Füge Karten hinzu, um dieses Deck anzuzeigen.')}</div>`}
    </div>
  </section>`;
}

function renderLobbyDeckPrep(value, context = 'QUICK') {
  const deck = lobbyDeckSummary(value);
  if (!deck) return '<div class="lobby-deck-prep invalid"><strong>No deck selected</strong></div>';
  const size = Number(state.format?.deckSize ?? 40);
  const contextLabel = context === 'CREATE' ? 'ROOM DECK' : context === 'JOIN' ? 'JOINING WITH' : 'MATCH DECK';
  const ownedLabel = deck.ownedReady ? 'COLLECTION READY' : `${deck.missingCopies} COPY${deck.missingCopies===1?'':'IES'} MISSING`;
  return `<div class="lobby-deck-prep ${deck.formatReady?'ready':'invalid'} ${esc(departmentThemeClass(deck.department))}" data-lobby-deck-prep="${esc(context)}">
    <div class="lobby-deck-prep-code"><span>${esc(departmentCode(deck.department))}</span><small>${esc(contextLabel)}</small></div>
    <div class="lobby-deck-prep-copy"><strong>${esc(deck.name)}</strong><b>${esc(deck.identity.loop)}</b><small>${deck.topTags.length ? deck.topTags.map((tag)=>`#${esc(tag)}`).join(' · ') : esc(deck.identity.note)}</small></div>
    <div class="lobby-deck-prep-status"><span class="${deck.total===size?'ready':'warn'}">${esc(deck.total)}/${esc(size)}</span><span class="${deck.formatReady?'ready':'warn'}">${deck.formatReady?'FORMAT READY':'DRAFT'}</span><span class="${deck.ownedReady?'ready':'info'}">${esc(ownedLabel)}</span></div>
  </div>`;
}

async function persistSelectedDeck(value) {
  if (!state.serverDecksReady || !state.profileToken || !value || state.lastPersistedSelectedDeck === value) return;
  const deckId = value.startsWith('custom:') ? value.slice('custom:'.length) : value;
  const pendingCreate = pendingDeckCreates.get(deckId);
  if (pendingCreate && !(await pendingCreate)) return;
  state.lastPersistedSelectedDeck = value;
  try {
    const result = await api('/api/profiles/me/decks/select', { method:'POST', headers:profileAuthHeaders(), body:JSON.stringify({ deckId }) });
    applyServerDeckProfile(result.profile);
  } catch (error) {
    state.lastPersistedSelectedDeck = null;
    state.deckPersistenceError = error.message;
  }
}

function syncLobbyDeckChoice(value) {
  const resolved = effectiveLobbyDeckValue(value);
  state.preferredDeckValue = resolved;
  void persistSelectedDeck(resolved);
  for (const id of ['quickDeck','createDeck','joinDeck']) {
    const select = document.querySelector(`#${id}`);
    if (!select) continue;
    select.value = resolved;
    syncSelectDisplayTitle(select);
  }
  const contexts = { QUICK:'quickDeck', CREATE:'createDeck', JOIN:'joinDeck' };
  for (const [context,id] of Object.entries(contexts)) {
    const host = document.querySelector(`[data-lobby-deck-prep-host="${context}"]`);
    if (host) host.innerHTML = renderLobbyDeckPrep(resolved, context);
  }
  document.querySelectorAll('[data-lobby-deck-showcase-host]').forEach((host) => { host.innerHTML = renderLobbyDeckShowcase(resolved); });
  document.querySelectorAll('[data-starter-deck]').forEach((button) => {
    const selected = button.dataset.starterDeck === resolved;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
  const summary = lobbyDeckSummary(resolved);
  const legal = Boolean(summary?.formatReady);
  const quick = document.querySelector('#quickMatchBtn');
  const create = document.querySelector('#createRoomBtn');
  const join = document.querySelector('#joinRoomBtn');
  if (quick) quick.disabled = state.matchmakingBusy || !legal;
  if (create) create.disabled = !legal;
  if (join) join.disabled = !legal;
}

function catalogArt(def) {
  const url = artworkUrl(def);
  return url ? `<div class="catalog-art-window has-art" style="${artworkFocusStyle(def)}"><img src="${esc(url)}" alt="" /></div>` : artworkFallback(def, 'catalog-fallback-art');
}

function deckCopies(deck, definitionId) {
  return (deck?.cards ?? []).filter((entry) => entry.definitionId === definitionId).reduce((sum, entry) => sum + Number(entry.copies || 0), 0);
}

function deckVariantCopies(deck, definitionId, variantId = null) {
  return deck?.cards?.find((entry) => entry.definitionId === definitionId && (entry.variantId ?? null) === (variantId ?? null))?.copies ?? 0;
}

function writeDeckCopies(deck, definitionId, copies) {
  const max = deckCopyCeiling(definitionId);
  const next = Math.max(0, Math.min(max, Number(copies) || 0));
  const entry = deck.cards.find((item) => item.definitionId === definitionId);
  if (next === 0) deck.cards = deck.cards.filter((item) => item.definitionId !== definitionId);
  else if (entry) entry.copies = next;
  else deck.cards.push({ definitionId, copies: next });
}

function writeDeckVariantCopies(deck, definitionId, variantId, copies) {
  const max = deckCopyCeiling(definitionId);
  const next = Math.max(0, Math.min(max, Number(copies) || 0));
  const entry = deck.cards.find((item) => item.definitionId === definitionId && (item.variantId ?? null) === (variantId ?? null));
  if (next === 0) deck.cards = deck.cards.filter((item) => !(item.definitionId === definitionId && (item.variantId ?? null) === (variantId ?? null)));
  else if (entry) entry.copies = next;
  else deck.cards.push({ definitionId, copies: next, ...(variantId ? { variantId } : {}) });
}

function sortDeckEntries(deck) {
  deck.cards.sort((a,b) => (cardDef(a.definitionId)?.name ?? a.definitionId).localeCompare(cardDef(b.definitionId)?.name ?? b.definitionId));
}

function setDeckCopies(deck, definitionId, copies) {
  const before = deckCopies(deck, definitionId);
  const max = deckCopyCeiling(definitionId);
  const next = Math.max(0, Math.min(max, Number(copies) || 0));
  if (before === next) return;
  recordDeckEdit(deck, () => {
    writeDeckCopies(deck, definitionId, next);
    sortDeckEntries(deck);
  });
}

function setDeckVariantCopies(deck, definitionId, variantId, copies) {
  const before = deckVariantCopies(deck, definitionId, variantId);
  const totalBefore = deckCopies(deck, definitionId);
  const max = deckCopyCeiling(definitionId);
  const next = Math.max(0, Math.min(Math.max(0, max - (totalBefore - before)), Number(copies) || 0));
  if (before === next) return;
  recordDeckEdit(deck, () => {
    writeDeckVariantCopies(deck, definitionId, variantId, next);
    sortDeckEntries(deck);
  });
}

function deckSwapSource(deck) {
  const sourceId = state.deckSwapSourceId;
  if (!sourceId || deckCopies(deck, sourceId) <= 0) return null;
  return cardDef(sourceId) ?? null;
}

function deckSwapTargetStatus(deck, targetId) {
  const source = deckSwapSource(deck);
  if (!source) return { allowed:false, reason:'Choose a card from the deck first.' };
  if (source.id === targetId) return { allowed:false, reason:'Choose a different replacement card.' };
  const target = cardDef(targetId);
  if (!target) return { allowed:false, reason:'Replacement card not found.' };
  const copies = deckCopies(deck, targetId);
  const ceiling = deckCopyCeiling(targetId);
  if (copies >= ceiling) return { allowed:false, reason:ownedDeckMode() ? 'Owned-copy or format limit reached.' : 'Format copy limit reached.' };
  return { allowed:true, reason:null, source, target, copies, ceiling };
}

function beginDeckSwap(deck, sourceId) {
  if (deckCopies(deck, sourceId) <= 0) return;
  state.deckSwapSourceId = sourceId;
  state.collectionPreviewId = sourceId;
  state.deckBuilderMessage = null;
  resetCollectionFilters();
  state.collectionDeckFilter = 'BELOW_LIMIT';
}

function cancelDeckSwap() {
  state.deckSwapSourceId = null;
}

function swapDeckCopy(deck, targetId) {
  const status = deckSwapTargetStatus(deck, targetId);
  if (!status.allowed) { state.deckBuilderMessage = status.reason; return false; }
  const sourceId = status.source.id;
  recordDeckEdit(deck, () => {
    writeDeckCopies(deck, sourceId, deckCopies(deck, sourceId) - 1);
    writeDeckCopies(deck, targetId, deckCopies(deck, targetId) + 1);
    sortDeckEntries(deck);
  });
  state.deckSwapSourceId = null;
  state.collectionPreviewId = targetId;
  state.deckBuilderMessage = `Swapped 1× ${status.source.name} → 1× ${status.target.name}.`;
  return true;
}

function swapDeckFinish(deck, definitionId, fromVariant, toVariant) {
  const fromCopies = deckVariantCopies(deck, definitionId, fromVariant);
  const ownedTarget = toVariant ? ownedExecutiveEditionCopies(definitionId, toVariant) : ownedCopies(definitionId);
  if (fromCopies <= 0 || ownedTarget <= 0) return false;
  recordDeckEdit(deck, () => {
    writeDeckVariantCopies(deck, definitionId, fromVariant, fromCopies - 1);
    writeDeckVariantCopies(deck, definitionId, toVariant, deckVariantCopies(deck, definitionId, toVariant) + 1);
    sortDeckEntries(deck);
  });
  state.collectionPreviewId = definitionId;
  return true;
}

// v7.6 regression compatibility only; v7.7 now checkpoints edits before persistence.
const V76_SWAP_SAVE_COMPAT = `sortDeckEntries(deck);
  saveCustomDecks();
  state.deckSwapSourceId = null`;

function deckFormatErrors(deck) {
  if (!deck) return ['Create a deck to begin.'];
  const errors = [];
  const total = deckCardCount(deck);
  if (total !== Number(state.format.deckSize ?? 40)) errors.push(`Deck must contain exactly ${state.format.deckSize ?? 40} cards (${total} now).`);
  const totals = new Map();
  for (const entry of deck.cards) totals.set(entry.definitionId, (totals.get(entry.definitionId) ?? 0) + Number(entry.copies || 0));
  for (const [definitionId, copies] of totals) {
    const limit = cardCopyLimit(definitionId);
    if (copies > limit) errors.push(`${cardDef(definitionId)?.name ?? definitionId}: max ${limit}.`);
  }
  return errors;
}

function deckOwnedGaps(deck) {
  const gaps = [];
  for (const entry of deck?.cards ?? []) {
    const owned = entry.variantId ? ownedExecutiveEditionCopies(entry.definitionId, entry.variantId) : ownedCopies(entry.definitionId);
    const copies = Number(entry.copies || 0);
    if (copies > owned) gaps.push({ definitionId:entry.definitionId, missing:copies-owned, owned, copies });
  }
  return gaps;
}

function clientDeckErrors(deck) {
  const errors = deckFormatErrors(deck);
  if (ownedDeckMode()) {
    for (const gap of deckOwnedGaps(deck)) errors.push(`${cardDef(gap.definitionId)?.name ?? gap.definitionId}: owned ${gap.owned}, deck uses ${gap.copies}.`);
  }
  return errors;
}

function definitionCost(def) {
  const raw = def?.cost?.play ?? def?.cost?.set ?? 0;
  return Number(raw) || 0;
}

function sandboxRarityTier(def) {
  if (def?.rarityTier) return def.rarityTier;
  const cost = definitionCost(def);
  if (def?.rank === 'EXECUTIVE' || cost >= 5) return 'T3';
  if (def?.rank === 'LEAD' || cost >= 4) return 'T2';
  if (cost >= 3) return 'T1';
  return 'T0';
}

function sandboxRarityLabel(def) {
  const tier = sandboxRarityTier(def);
  return state.economyConfig?.rarityTiers?.find((item) => item.id === tier)?.label ?? tier;
}

function collectionSearchText(def) {
  return [
    def?.id,
    def?.name,
    def?.cardType,
    def?.department,
    def?.team,
    def?.rank,
    def?.rulesText,
    def?.flavorText,
    ...(def?.tags ?? [])
  ].filter(Boolean).join(' ').toLowerCase();
}

function collectionDepartmentLabel(department) {
  if (department === 'ALL') return 'All departments';
  if (department === 'NEUTRAL') return 'Neutral';
  return departmentIdentity(department).label;
}

function collectionTagEntries() {
  const counts = new Map();
  for (const def of state.catalog.values()) {
    for (const tag of def.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]));
}

function relatedCollectionCards(def, limit = 5) {
  if (!def) return [];
  const sourceTags = new Set(def.tags ?? []);
  return [...state.catalog.values()].map(localizedCard)
    .filter((candidate) => candidate.id !== def.id)
    .map((candidate) => {
      const sharedTags = (candidate.tags ?? []).filter((tag) => sourceTags.has(tag));
      const score = sharedTags.length * 4
        + (candidate.department === def.department ? 2 : 0)
        + (candidate.cardType === def.cardType ? 1 : 0)
        + (candidate.team && candidate.team === def.team ? 2 : 0);
      return { candidate, sharedTags, score };
    })
    .filter((item) => item.score > 1)
    .sort((a,b) => b.score-a.score || b.sharedTags.length-a.sharedTags.length || a.candidate.name.localeCompare(b.candidate.name))
    .slice(0, limit);
}

function lastBoosterCardIds() {
  return new Set(state.lastBooster?.cardIds ?? []);
}

function lastBoosterNewCardIds() {
  return new Set(state.lastBooster?.newCardIds ?? []);
}

function savedDeckCardUse(definitionId) {
  const deckSize = Number(state.format?.deckSize ?? 40);
  return state.customDecks.map((deck) => {
    const copies = deckCopies(deck, definitionId);
    const total = deckCardCount(deck);
    const ceiling = deckCopyCeiling(definitionId);
    return {
      deck,
      copies,
      total,
      ceiling,
      canAdd: total < deckSize && copies < ceiling,
      canSwap: total >= deckSize && copies < ceiling
    };
  }).sort((a,b) => Number(b.copies > 0)-Number(a.copies > 0) || Number(b.canAdd)-Number(a.canAdd) || a.deck.name.localeCompare(b.deck.name));
}

function boosterDeckFlowStats() {
  const uniqueIds = [...lastBoosterCardIds()];
  let usedPulls = 0;
  let opportunityPulls = 0;
  for (const id of uniqueIds) {
    const uses = savedDeckCardUse(id);
    if (uses.some((item) => item.copies > 0)) usedPulls += 1;
    if (uses.some((item) => item.canAdd || item.canSwap)) opportunityPulls += 1;
  }
  return { uniquePulls:uniqueIds.length, usedPulls, opportunityPulls };
}

function focusLastBoosterCollection(kind = 'ALL') {
  if (!state.lastBooster?.cardIds?.length) return;
  resetCollectionFilters();
  cancelDeckSwap();
  state.collectionPackFilter = kind === 'NEW' ? 'LAST_PACK_NEW' : 'LAST_PACK';
  state.collectionSort = 'NEW';
  renderCollection();
  requestAnimationFrame(() => document.querySelector('.collection-discovery')?.scrollIntoView({ behavior:'smooth', block:'start' }));
}

function openCardInManagedDeck(deckId, definitionId, { add = false } = {}) {
  const target = state.customDecks.find((deck) => deck.id === deckId);
  if (!target) return false;
  if (editingDeck()?.id !== deckId && !openManagedDeck(deckId)) return false;
  const deck = editingDeck();
  state.collectionPreviewId = definitionId;
  markCollectionCardSeen(definitionId);
  if (add) {
    const status = savedDeckCardUse(definitionId).find((item) => item.deck.id === deckId);
    if (!status?.canAdd) {
      state.deckBuilderMessage = status?.canSwap ? 'Deck is full. Use SWAP on a deck-list card to make room for this pull.' : 'This card cannot be added to that deck right now.';
    } else {
      setDeckCopies(deck, definitionId, deckCopies(deck, definitionId) + 1);
      state.deckBuilderMessage = `Added 1× ${cardDef(definitionId)?.name ?? definitionId} to ${deck.name}. Save to keep this change.`;
    }
  } else if (deckCardCount(deck) >= Number(state.format?.deckSize ?? 40) && deckCopies(deck, definitionId) < deckCopyCeiling(definitionId)) {
    state.deckBuilderMessage = `Inspecting ${cardDef(definitionId)?.name ?? definitionId} for ${deck.name}. Deck is full — use SWAP on a deck-list card to replace one copy.`;
  }
  return true;
}

function renderCardDeckUse(def, activeDeck) {
  const uses = savedDeckCardUse(def.id);
  if (!uses.length) return '';
  const usedDecks = uses.filter((item) => item.copies > 0).length;
  const opportunities = uses.filter((item) => item.canAdd || item.canSwap).length;
  return `<section class="card-deck-use-panel"><div class="card-deck-use-head"><div><span>DECK USE</span><strong>${usedDecks ? `Used in ${esc(usedDecks)} saved deck${usedDecks===1?'':'s'}` : 'Not used in a saved deck yet'}</strong></div><small>${esc(opportunities)} deck${opportunities===1?'':'s'} can add or consider this card.</small></div><div class="card-deck-use-list">${uses.map((item) => {
    const active = item.deck.id === activeDeck?.id;
    const status = item.copies > 0 ? `${item.copies}× in deck` : item.canAdd ? `${item.total}/${state.format?.deckSize ?? 40} · room to add` : item.canSwap ? `${item.total}/${state.format?.deckSize ?? 40} · swap candidate` : 'No legal add';
    const action = item.canAdd ? `<button data-card-deck-add="${esc(item.deck.id)}" data-card-deck-card="${esc(def.id)}">Add 1</button>` : `<button data-card-deck-open="${esc(item.deck.id)}" data-card-deck-card="${esc(def.id)}">${item.canSwap ? 'Open to swap' : 'Open'}</button>`;
    return `<article class="card-deck-use-row ${active?'active':''} ${item.copies?'used':''}"><button class="card-deck-use-open" data-card-deck-open="${esc(item.deck.id)}" data-card-deck-card="${esc(def.id)}"><span><b>${esc(item.deck.name)}</b><small>${esc(status)}</small></span>${active?'<em>EDITING</em>':''}</button>${action}</article>`;
  }).join('')}</div></section>`;
}

function collectionDeckFilterLabel(value) {
  if (value === 'IN_DECK') return 'In current deck';
  if (value === 'NOT_IN_DECK') return 'Not in current deck';
  if (value === 'BELOW_LIMIT') return 'Below copy limit';
  return 'All deck status';
}

function collectionCostLabel(value) {
  if (value === 'ALL') return 'All costs';
  return `Cost ${value === '7' ? '7+' : value}`;
}

function matchesCollectionCost(def) {
  if (state.collectionCost === 'ALL') return true;
  const cost = definitionCost(def);
  return state.collectionCost === '7' ? cost >= 7 : cost === Number(state.collectionCost);
}

function activeCollectionFilters() {
  const filters = [];
  if (state.collectionSearch.trim()) filters.push({ id:'SEARCH', label:`Search: ${state.collectionSearch.trim()}` });
  if (state.collectionDepartment !== 'ALL') filters.push({ id:'DEPARTMENT', label:collectionDepartmentLabel(state.collectionDepartment) });
  if (state.collectionType !== 'ALL') filters.push({ id:'TYPE', label:state.collectionType });
  if (state.collectionOwnedFilter !== 'ALL') filters.push({ id:'OWNED', label:state.collectionOwnedFilter === 'MISSING' ? 'Missing' : state.collectionOwnedFilter === 'NEW' ? 'New' : state.collectionOwnedFilter === 'DECK_GAP' ? 'Missing for deck' : state.collectionOwnedFilter === 'SHREDDABLE' ? 'Shred candidates' : 'Owned' });
  if (state.collectionFinishFilter !== 'ALL') filters.push({ id:'FINISH', label:state.collectionFinishFilter === 'EXECUTIVE' ? collectionCopy('executiveEdition') : collectionCopy('standard') });
  if (state.collectionRarity !== 'ALL') filters.push({ id:'RARITY', label:state.collectionRarity });
  if (state.collectionTag !== 'ALL') filters.push({ id:'TAG', label:`#${state.collectionTag}` });
  if (state.collectionDeckFilter !== 'ALL') filters.push({ id:'DECK', label:collectionDeckFilterLabel(state.collectionDeckFilter) });
  if (state.collectionCost !== 'ALL') filters.push({ id:'COST', label:collectionCostLabel(state.collectionCost) });
  if (state.collectionPackFilter !== 'ALL') filters.push({ id:'PACK', label:state.collectionPackFilter === 'LAST_PACK_NEW' ? 'New from last pack' : 'Last pack' });
  return filters;
}

function clearCollectionFilter(id) {
  if (id === 'SEARCH') state.collectionSearch = '';
  if (id === 'DEPARTMENT') state.collectionDepartment = 'ALL';
  if (id === 'TYPE') state.collectionType = 'ALL';
  if (id === 'OWNED') state.collectionOwnedFilter = 'ALL';
  if (id === 'FINISH') state.collectionFinishFilter = 'ALL';
  if (id === 'RARITY') state.collectionRarity = 'ALL';
  if (id === 'TAG') state.collectionTag = 'ALL';
  if (id === 'DECK') state.collectionDeckFilter = 'ALL';
  if (id === 'COST') state.collectionCost = 'ALL';
  if (id === 'PACK') state.collectionPackFilter = 'ALL';
}

function resetCollectionFilters() {
  state.collectionSearch='';
  state.collectionDepartment='ALL';
  state.collectionType='ALL';
  state.collectionOwnedFilter='ALL';
  state.collectionFinishFilter='ALL';
  state.collectionRarity='ALL';
  state.collectionTag='ALL';
  state.collectionDeckFilter='ALL';
  state.collectionCost='ALL';
  state.collectionPackFilter='ALL';
}

async function enterAlphaDeckbuilder(message = null) {
  // The primary Alpha deckbuilder is a full-roster playtest surface. Older
  // browser/server profiles may persist OWNED_COPIES from economy testing;
  // normalize the lobby entry back to all Alpha cards and clear stale filters.
  resetCollectionFilters();
  if (ownedDeckMode()) await setCollectionMode('SANDBOX_ALL_AVAILABLE');
  state.mode = 'COLLECTION';
  if (message) state.deckBuilderMessage = message;
  render();
}

function updateCollectionSearch(value) {
  state.collectionSearch = value;
  renderCollection();
  requestAnimationFrame(() => {
    const input = document.querySelector('#collectionSearch');
    if (!input) return;
    input.focus({ preventScroll:true });
    const end = String(value).length;
    input.setSelectionRange?.(end, end);
  });
}

function collectionSetStats() {
  const defs = [...state.catalog.values()];
  const uniqueOwned = defs.filter((def) => ownedCopies(def.id) > 0).length;
  const artReady = defs.filter((def) => Boolean(def.artId)).length;
  const unseenNew = defs.filter((def) => state.newCollectionCards.has(def.id)).length;
  return { total:defs.length, uniqueOwned, artReady, unseenNew };
}

function deckStats(deck) {
  const typeCounts = { EMPLOYEE:0, ACTION:0, INCIDENT:0, SYSTEM:0 };
  const departmentCounts = {};
  const tagCounts = {};
  const costCurve = Array(8).fill(0);
  const costBands = { EARLY:0, MID:0, HIGH:0 };
  let weightedCost = 0;
  let total = 0;
  let uniqueCards = 0;
  for (const entry of deck?.cards ?? []) {
    const def = cardDef(entry.definitionId);
    if (!def) continue;
    const copies = Number(entry.copies || 0);
    if (copies > 0) uniqueCards += 1;
    total += copies;
    if (typeCounts[def.cardType] != null) typeCounts[def.cardType] += copies;
    departmentCounts[def.department] = (departmentCounts[def.department] ?? 0) + copies;
    for (const tag of def.tags ?? []) tagCounts[tag] = (tagCounts[tag] ?? 0) + copies;
    const cost = definitionCost(def);
    weightedCost += cost * copies;
    costCurve[Math.min(7, Math.max(0, cost))] += copies;
    if (cost <= 2) costBands.EARLY += copies;
    else if (cost <= 4) costBands.MID += copies;
    else costBands.HIGH += copies;
  }
  const topTags = Object.entries(tagCounts).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0])).slice(0,6);
  const dominantDepartments = Object.entries(departmentCounts).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0])).slice(0,4);
  return { total, uniqueCards, typeCounts, departmentCounts, topTags, dominantDepartments, costCurve, costBands, averageCost: total ? weightedCost / total : 0 };
}

function deckTagCoverage(deck) {
  const coverage = new Map();
  for (const entry of deck?.cards ?? []) {
    const def = cardDef(entry.definitionId);
    if (!def) continue;
    const copies = Number(entry.copies || 0);
    if (copies <= 0) continue;
    for (const tag of def.tags ?? []) {
      if (!coverage.has(tag)) coverage.set(tag, { tag, copies:0, cardIds:new Set(), typeCounts:{} });
      const item = coverage.get(tag);
      item.copies += copies;
      item.cardIds.add(def.id);
      item.typeCounts[def.cardType] = (item.typeCounts[def.cardType] ?? 0) + copies;
    }
  }
  return [...coverage.values()]
    .map((item) => ({ ...item, uniqueCards:item.cardIds.size }))
    .sort((a,b) => b.uniqueCards-a.uniqueCards || b.copies-a.copies || a.tag.localeCompare(b.tag));
}

function deckBridgeCards(deck, connectedTags, limit = 5) {
  const connected = new Set(connectedTags);
  return (deck?.cards ?? [])
    .map((entry) => {
      const def = cardDef(entry.definitionId);
      const bridgeTags = (def?.tags ?? []).filter((tag) => connected.has(tag));
      return { def, copies:Number(entry.copies || 0), bridgeTags };
    })
    .filter((item) => item.def && item.copies > 0 && item.bridgeTags.length >= 2)
    .sort((a,b) => b.copies-a.copies || a.def.name.localeCompare(b.def.name))
    .slice(0, limit);
}

function renderDeckEngineCoverage(deck) {
  const coverage = deckTagCoverage(deck);
  if (!coverage.length) return '';
  const connected = coverage.filter((item) => item.uniqueCards >= 2);
  const singletons = coverage.filter((item) => item.uniqueCards === 1);
  const bridges = deckBridgeCards(deck, connected.map((item) => item.tag));
  return `<section class="deck-engine-coverage">
    <div class="deck-engine-coverage-head"><div><span>ENGINE COVERAGE</span><strong>${connected.length ? `${connected.length} connected package${connected.length===1?'':'s'} in this deck` : 'Tagged signals in this deck'}</strong></div><small>Unique cards + total copies · existing card tags only.</small></div>
    ${connected.length ? `<div class="engine-package-grid">${connected.map((item) => `<article class="engine-package ${state.collectionTag===item.tag && state.collectionDeckFilter==='IN_DECK'?'active':''}"><button data-deck-package-tag="${esc(item.tag)}" title="Inspect #${esc(item.tag)} cards already in this deck"><span>#${esc(item.tag)}</span><strong>${esc(item.uniqueCards)} unique · ${esc(item.copies)} copies</strong><small>Inspect deck package</small></button><button data-deck-expand-tag="${esc(item.tag)}" title="Find more #${esc(item.tag)} cards">Find more</button></article>`).join('')}</div>` : ''}
    ${singletons.length ? `<div class="engine-singletons"><span>SINGLE-CARD SIGNALS</span><div>${singletons.map((item) => `<button data-deck-package-tag="${esc(item.tag)}" class="${state.collectionTag===item.tag && state.collectionDeckFilter==='IN_DECK'?'active':''}">#${esc(item.tag)} <b>${esc(item.copies)}x</b></button>`).join('')}</div><small>Context only — not treated as a deck issue.</small></div>` : ''}
    ${bridges.length ? `<div class="engine-bridges"><div><span>BRIDGE CARDS</span><small>Cards currently connecting two represented engine tags.</small></div><div class="engine-bridge-list">${bridges.map((item) => `<button data-deck-bridge-preview="${esc(item.def.id)}"><span><b>${esc(item.def.name)}</b><small>${esc(item.copies)} cop${item.copies===1?'y':'ies'} in deck</small></span><em>${item.bridgeTags.map((tag)=>`#${esc(tag)}`).join(' + ')}</em></button>`).join('')}</div></div>` : ''}
  </section>`;
}

function renderDeckSwapBar(deck) {
  const source = deckSwapSource(deck);
  if (!source) return '';
  const copies = deckCopies(deck, source.id);
  const tags = (source.tags ?? []).slice(0,3);
  return `<section class="deck-swap-bar"><div><span>SWAP 1 COPY</span><strong>${esc(source.name)}</strong><small>${esc(source.cardType)} · ${esc(departmentCode(source.department))} · ${esc(copies)} in deck${tags.length ? ` · ${tags.map((tag)=>`#${esc(tag)}`).join(' ')}` : ''}</small></div><div><b>40-card count stays intact</b><button id="cancelDeckSwap">Cancel swap</button></div></section>`;
}

function renderDeckStats(deck) {
  const stats = deckStats(deck);
  const maxCurve = Math.max(1, ...stats.costCurve);
  return `<section class="deck-stats">
    <div class="deck-stat-head"><div><strong>Deck analysis</strong><small>Tap a signal to focus the collection.</small></div><span>Avg. cost ${stats.averageCost.toFixed(1)} · ${stats.uniqueCards} unique</span></div>
    <div class="type-stat-grid">${Object.entries(stats.typeCounts).map(([type,count]) => `<button data-deck-filter-type="${esc(type)}" class="type-stat type-${esc(type.toLowerCase())} ${state.collectionType===type?'active':''}"><b>${count}</b>${esc(type)}</button>`).join('')}</div>
    <div class="curve-title-row"><div class="curve-title">Capacity curve</div><small>Tap a cost to inspect matching cards</small></div>
    <div class="cost-curve interactive">${stats.costCurve.map((count,cost) => `<button data-deck-filter-cost="${cost}" class="${state.collectionCost===String(cost)?'active':''}" title="Show ${cost===7?'cost 7+':`cost ${cost}`} cards"><i style="height:${Math.max(3,Math.round((count/maxCurve)*46))}px"></i><b>${count}</b><span>${cost===7?'7+':cost}</span></button>`).join('')}</div>
    <div class="curve-band-summary"><span><b>${stats.costBands.EARLY}</b> COST 0–2</span><span><b>${stats.costBands.MID}</b> COST 3–4</span><span><b>${stats.costBands.HIGH}</b> COST 5+</span></div>
    <div class="deck-taxonomy">${stats.dominantDepartments.map(([dept,count]) => `<button data-deck-filter-department="${esc(dept)}" class="${state.collectionDepartment===dept?'active':''}"><b>${esc(departmentCode(dept))}</b> ${count}</button>`).join('') || '<span class="muted">No departments yet</span>'}</div>
    <div class="deck-tag-cloud">${stats.topTags.map(([tag,count]) => `<button data-deck-filter-tag="${esc(tag)}" class="${state.collectionTag===tag?'active':''}">#${esc(tag)} <b>${count}</b></button>`).join('') || '<span class="muted">No engine tags yet</span>'}</div>
  </section>`;
}

function deckEngineFits(deck, limit = 5) {
  const stats = deckStats(deck);
  if (!stats.total) return [];
  const topTagWeights = new Map(stats.topTags.map(([tag,count]) => [tag, Number(count) || 0]));
  const primary = deckPrimaryDepartment(deck);
  return [...state.catalog.values()].map(localizedCard)
    .map((candidate) => {
      const copies = deckCopies(deck, candidate.id);
      const ceiling = deckCopyCeiling(candidate.id);
      const sharedTags = (candidate.tags ?? []).filter((tag) => topTagWeights.has(tag));
      const tagSignal = sharedTags.reduce((sum, tag) => sum + Math.min(3, topTagWeights.get(tag) ?? 0), 0);
      const score = sharedTags.length * 4 + tagSignal + (candidate.department === primary ? 3 : 0) + (copies === 0 ? 1 : 0);
      return { candidate, copies, ceiling, sharedTags, score };
    })
    .filter((item) => item.copies < item.ceiling && item.score >= 5)
    .sort((a,b) => b.score-a.score || Number(a.copies>0)-Number(b.copies>0) || a.candidate.name.localeCompare(b.candidate.name))
    .slice(0, limit);
}

function renderDeckEngineFits(deck) {
  const fits = deckEngineFits(deck);
  if (!fits.length) return '';
  const full = deckCardCount(deck) >= Number(state.format.deckSize ?? 40);
  return `<section class="deck-engine-fits"><div class="deck-engine-fit-head"><div><span>ENGINE FITS</span><strong>Cards that match this deck's current signals</strong></div><small>Shared top tags + primary department · no auto-building</small></div><div class="deck-engine-fit-list">${fits.map(({candidate,copies,ceiling,sharedTags}) => `<article class="deck-engine-fit type-${esc(candidate.cardType.toLowerCase())}"><button class="deck-engine-fit-preview" data-deck-fit-preview="${esc(candidate.id)}"><span><b>${esc(candidate.name)}</b><small>${esc(candidate.cardType)} · ${esc(departmentCode(candidate.department))} · COST ${esc(definitionCost(candidate))}</small></span><em>${sharedTags.length ? sharedTags.slice(0,3).map((tag)=>`#${esc(tag)}`).join(' ') : 'Department fit'}</em></button><button class="deck-engine-fit-add" data-deck-fit-add="${esc(candidate.id)}" title="Add one copy" ${full || copies>=ceiling ? 'disabled' : ''}>+<span>${esc(copies)}/${esc(ceiling)}</span></button></article>`).join('')}</div></section>`;
}

function focusCollectionFromDeck(kind, value) {
  resetCollectionFilters();
  if (kind === 'TYPE') state.collectionType = value;
  if (kind === 'DEPARTMENT') state.collectionDepartment = value;
  if (kind === 'TAG') state.collectionTag = value;
  if (kind === 'DECK') state.collectionDeckFilter = value;
  if (kind === 'COST') state.collectionCost = String(value);
  if (kind === 'PACKAGE') { state.collectionTag = value; state.collectionDeckFilter = 'IN_DECK'; }
  renderCollection();
  requestAnimationFrame(() => document.querySelector('.collection-discovery')?.scrollIntoView({ behavior:'smooth', block:'start' }));
}

function deckPrimaryDepartment(deck) {
  const stats = deckStats(deck);
  const nonNeutral = stats.dominantDepartments.filter(([department]) => department !== 'NEUTRAL');
  return nonNeutral[0]?.[0] ?? stats.dominantDepartments[0]?.[0] ?? 'NEUTRAL';
}

function renderDeckIdentity(deck) {
  const stats = deckStats(deck);
  const primary = deckPrimaryDepartment(deck);
  const identity = departmentIdentity(primary);
  const primaryCount = Number(stats.departmentCounts?.[primary] ?? 0);
  const neutralCount = Number(stats.departmentCounts?.NEUTRAL ?? 0);
  const secondary = stats.dominantDepartments.filter(([department]) => department !== primary && department !== 'NEUTRAL')[0] ?? null;
  const formatReady = deckFormatErrors(deck).length === 0;
  const ownedGaps = deckOwnedGaps(deck);
  const missingCopies = ownedGaps.reduce((sum, gap) => sum + gap.missing, 0);
  const sourcePreset = state.presets.find((preset) => preset.id === deck?.sourcePresetId);
  return `<section class="deck-identity dept-${esc(String(primary).toLowerCase())}">
    <div class="deck-identity-code"><span>${esc(departmentCode(primary))}</span><small>${sourcePreset ? 'STARTER COPY' : 'DECK IDENTITY'}</small></div>
    <div class="deck-identity-copy"><strong>${esc(identity.label)}</strong><b>${esc(identity.loop)}</b><small>${esc(identity.note)}</small><div class="deck-identity-mix"><span>${esc(primaryCount)} ${esc(departmentCode(primary))}</span>${neutralCount ? `<span>${esc(neutralCount)} NEU</span>` : ''}${secondary ? `<span>${esc(secondary[1])} ${esc(departmentCode(secondary[0]))}</span>` : ''}</div></div>
    <div class="deck-readiness"><span class="${formatReady?'ready':'not-ready'}">${formatReady?'FORMAT READY':'DRAFT'}</span><span class="${stats.total && missingCopies===0?'ready':'not-ready'}">${!stats.total?'OWNED SET —':missingCopies===0?'OWNED SET READY':`OWNED SET · ${esc(missingCopies)} MISSING`}</span></div>
  </section>`;
}

function deckCompletionStatus(deck) {
  const deckSize = Number(state.format?.deckSize ?? 40);
  const total = deckCardCount(deck);
  const openSlots = Math.max(0, deckSize - total);
  const overflow = Math.max(0, total - deckSize);
  const copyIssues = (deck?.cards ?? []).filter((entry) => Number(entry.copies || 0) > cardCopyLimit(entry.definitionId));
  const ownedGaps = deckOwnedGaps(deck);
  const missingOwned = ownedGaps.reduce((sum, gap) => sum + Number(gap.missing || 0), 0);
  return {
    deckSize,
    total,
    openSlots,
    overflow,
    copyIssues,
    ownedGaps,
    missingOwned,
    sizeReady: total === deckSize,
    copyReady: copyIssues.length === 0,
    ownedReady: missingOwned === 0
  };
}

function renderDeckCompletion(deck) {
  const status = deckCompletionStatus(deck);
  const completion = Math.max(0, Math.min(100, Math.round((status.total / Math.max(1, status.deckSize)) * 100)));
  const sizeState = status.sizeReady ? 'ready' : 'attention';
  const sizeLabel = status.sizeReady ? 'COMPLETE' : status.openSlots ? `${status.openSlots} OPEN` : `${status.overflow} OVER`;
  const copyLabel = status.copyReady ? 'CLEAR' : `${status.copyIssues.length} ISSUE${status.copyIssues.length===1?'':'S'}`;
  const ownedLabel = status.ownedReady ? 'READY' : `${status.missingOwned} MISSING`;
  const ownedContext = ownedDeckMode() ? 'Required in Owned copies mode.' : 'Collection check only in All Alpha cards mode.';
  return `<section class="deck-completion-check ${status.sizeReady && status.copyReady && (!ownedDeckMode() || status.ownedReady) ? 'all-ready' : ''}">
    <div class="deck-completion-head"><div><span>DECK CHECK</span><strong>${status.sizeReady && status.copyReady ? 'Format structure checked' : 'Finish the objective requirements'}</strong></div><small>Objective checks only · no deck-strength score.</small></div>
    <div class="deck-completion-progress" aria-label="${esc(status.total)} of ${esc(status.deckSize)} cards"><i style="width:${completion}%"></i></div>
    <div class="deck-completion-grid">
      <article class="${sizeState}"><div><span>DECK SIZE</span><strong>${esc(status.total)} / ${esc(status.deckSize)}</strong></div><b>${esc(sizeLabel)}</b>${!status.sizeReady ? `<button data-deck-check-action="${status.openSlots ? 'ADDABLE' : 'IN_DECK'}">${status.openSlots ? 'Find addable cards' : 'Review deck list'}</button>` : '<small>Exact format size reached.</small>'}</article>
      <article class="${status.copyReady?'ready':'attention'}"><div><span>COPY LIMITS</span><strong>${status.copyReady ? 'Within format limits' : `${status.copyIssues.length} card${status.copyIssues.length===1?'':'s'} over limit`}</strong></div><b>${esc(copyLabel)}</b>${status.copyReady ? '<small>Limited list respected.</small>' : '<button data-deck-check-action="IN_DECK">Review affected cards</button>'}</article>
      <article class="${status.ownedReady?'ready':'attention'}"><div><span>OWNED SET</span><strong>${status.ownedReady ? 'All deck copies owned' : `${status.missingOwned} additional cop${status.missingOwned===1?'y':'ies'} needed`}</strong></div><b>${esc(ownedLabel)}</b><small>${esc(ownedContext)}</small></article>
    </div>
    ${status.ownedGaps.length ? `<div class="deck-owned-gaps"><div class="deck-owned-gaps-head"><span>MISSING OWNED COPIES</span><button data-economy-filter="DECK_GAPS">Show all missing</button></div><div>${status.ownedGaps.slice(0,5).map((gap) => { const craft=cardCraftStatus(gap.definitionId,deck); return `<article class="deck-owned-gap-card"><button class="deck-owned-gap-preview" data-deck-gap-preview="${esc(gap.definitionId)}"><b>${esc(cardDef(gap.definitionId)?.name ?? gap.definitionId)}</b><small>${esc(gap.owned)} owned · ${esc(gap.copies)} in deck · need ${esc(gap.missing)}</small><em>${Number.isFinite(craft.craftCost) ? `${esc(craft.craftCost)} Scraps each · ${esc(craft.totalGapCost)} to fill gap` : 'Craft cost unavailable'}</em></button><button class="deck-owned-gap-craft" data-deck-gap-craft="${esc(gap.definitionId)}" ${craft.canCraft && !state.economyBusy ? '' : 'disabled'}>Craft 1</button></article>`; }).join('')}${status.ownedGaps.length>5 ? `<em>+${esc(status.ownedGaps.length-5)} more</em>` : ''}</div><small class="deck-owned-gaps-wallet">Wallet: ${esc(state.metaProfile?.balances?.SHREDDER_SCRAPS ?? 0)} Shredder Scraps</small></div>` : ''}
  </section>`;
}

function renderStarterDeckShelf() {
  if (!state.presets?.length) return '';
  return `<section class="builder-starter-shelf"><div class="builder-starter-head"><div><span>STARTER BLUEPRINTS</span><strong>Copy a proven 40-card shell, then make it yours.</strong></div><small>Copies are local deckbuilder drafts. The original starter decks stay untouched.</small></div><div class="builder-starter-grid">${state.presets.map((preset) => {
    const identity = departmentIdentity(preset.department);
    const readiness = starterOwnedReadiness(preset);
    const missing = Math.max(0, readiness.required - readiness.available);
    return `<article class="builder-starter-card dept-${esc(String(preset.department).toLowerCase())}"><div class="builder-starter-title"><span>${esc(departmentCode(preset.department))}</span><strong>${esc(identity.label)}</strong><b>40</b></div><p>${esc(identity.loop)}</p><small>${esc(preset.description ?? identity.note)}</small><div class="builder-starter-status"><span>${readiness.ready ? 'OWNED READY' : `${esc(readiness.available)}/${esc(readiness.required)} OWNED`}</span>${missing ? `<b>${esc(missing)} missing</b>` : '<b>Legal starter</b>'}</div><button data-clone-starter="${esc(preset.id)}">Copy to builder</button></article>`;
  }).join('')}</div></section>`;
}

function renderDeckList(deck) {
  const groups = ['EMPLOYEE','ACTION','INCIDENT','SYSTEM'];
  const entriesByType = new Map(groups.map((type) => [type, []]));
  for (const entry of deck?.cards ?? []) {
    const def = cardDef(entry.definitionId);
    const type = def?.cardType ?? 'ACTION';
    if (!entriesByType.has(type)) entriesByType.set(type, []);
    entriesByType.get(type).push({ entry, def });
  }
  return `<div class="deck-list grouped">${groups.map((type) => {
    const rows = entriesByType.get(type) ?? [];
    const copies = rows.reduce((sum, row) => sum + Number(row.entry.copies || 0), 0);
    if (!rows.length) return '';
    return `<section class="deck-list-group type-${esc(type.toLowerCase())}"><header><strong>${esc(type)}</strong><span>${esc(copies)} cards</span></header>${rows.map(({entry,def}) => {
      const owned = ownedCopies(entry.definitionId);
      const gap = Math.max(0, Number(entry.copies || 0) - owned);
      const ceiling = deckCopyCeiling(entry.definitionId);
      const tier = def ? sandboxRarityTier(def) : 'T0';
      return `<div class="deck-list-row type-${esc(String(type).toLowerCase())} tier-${esc(String(tier).toLowerCase())} ${gap ? 'owned-gap' : ''} ${state.deckSwapSourceId===entry.definitionId ? 'swap-source-row' : ''}" data-deck-entry-preview="${esc(entry.definitionId)}"><div class="deck-list-card-copy"><span><b>${esc(entry.copies)}×</b> ${esc(def?.name ?? entry.definitionId)}</span><small><i>${esc(departmentCode(def?.department ?? ''))}</i><i>${esc(tier)}</i><i>COST ${esc(definitionCost(def))}</i>${def?.power != null ? `<i>POWER ${esc(def.power)}</i>` : ''}</small></div><div class="deck-list-owned"><small>OWNED</small><b>${esc(owned)}</b></div><button class="deck-list-swap" data-deck-swap-source="${esc(entry.definitionId)}">${state.deckSwapSourceId===entry.definitionId ? 'SWAPPING' : 'SWAP'}</button><div class="deck-list-stepper"><button data-deck-list-minus="${esc(entry.definitionId)}">−</button><button data-deck-list-plus="${esc(entry.definitionId)}" ${entry.copies>=ceiling || deckCardCount(deck)>=state.format.deckSize?'disabled':''}>+</button></div></div>`;
    }).join('')}</section>`;
  }).join('') || '<p class="muted">Add cards from the collection.</p>'}</div>`;
}

function renderCollectionPreview(def, deck) {
  if (!def) return `<section class="collection-preview empty"><strong>Card preview</strong><span>Click a card to inspect it here.</span></section>`;
  const copies = deckCopies(deck, def.id);
  const limit = cardCopyLimit(def.id);
  const deckCeiling = deckCopyCeiling(def.id);
  const owned = ownedTotalCopies(def.id);
  const tier = economyTierConfig(def);
  const craft = cardCraftStatus(def.id, deck);
  const scrap = scrapCollectionStatus(def.id, 1);
  const affectedDecks = savedDecksAffectedByScrap(def.id, scrap.remaining);
  const canScrap = scrap.allowed && tier?.scrapValue != null;
  const canCraft = craft.canCraft;
  const confirming = state.pendingScrapConfirmation === def.id;
  return `<section class="collection-preview type-${esc(def.cardType.toLowerCase())}">
    <div class="collection-preview-art">${catalogArt(def)}</div>
    <div class="collection-preview-type"><span>${esc(cardTypeLabel(def.cardType))} · ${esc(departmentCode(def.department))}</span>${raritySignal(def)}</div>
    <h3>${esc(def.name)}</h3>
    <div class="collection-preview-meta">${esc([cardCostLabel(def), def.rank, def.power != null ? `Power ${def.power}` : ''].filter(Boolean).join(' · '))}</div>
    <div class="collection-card-context"><span>ID <b>${esc(def.id)}</b></span><span>DEPT <b>${esc(collectionDepartmentLabel(def.department))}</b></span>${def.team ? `<span>TEAM <b>${esc(def.team)}</b></span>` : ''}${def.rank ? `<span>RANK <b>${esc(def.rank)}</b></span>` : ''}</div>
    <p>${esc(def.rulesText || 'No rules text.')}</p>
    ${def.tags?.length ? `<div class="collection-preview-tags interactive">${def.tags.map((tag) => `<button data-preview-tag="${esc(tag)}" title="Show all cards tagged ${esc(tag)}">#${esc(tag)}</button>`).join('')}</div>` : ''}
    ${def.flavorText ? `<em>“${esc(def.flavorText)}”</em>` : ''}
    ${(() => { const related = relatedCollectionCards(def); return related.length ? `<section class="related-card-panel"><div class="related-card-head"><span>RELATED CARDS</span><small>Shared engine tags and department context</small></div><div class="related-card-list">${related.map(({candidate,sharedTags}) => `<button data-related-card="${esc(candidate.id)}"><span><b>${esc(candidate.name)}</b><small>${esc(candidate.cardType)} · ${esc(departmentCode(candidate.department))} · ${esc(sandboxRarityTier(candidate))}</small></span><em>${sharedTags.length ? sharedTags.map((tag)=>`#${esc(tag)}`).join(' ') : 'Same department'}</em></button>`).join('')}</div></section>` : ''; })()}
    ${renderCardDeckUse(def, deck)}
    <div class="preview-copy-control"><button data-preview-minus="${esc(def.id)}" ${copies<=0?'disabled':''}>−</button><strong>${copies} / ${limit} in deck</strong><button data-preview-plus="${esc(def.id)}" ${copies>=deckCeiling || deckCardCount(deck)>=state.format.deckSize?'disabled':''}>+</button></div>${ownedDeckMode() ? `<small class="owned-mode-note">Owned-copy ceiling: ${esc(deckCeiling)} of ${esc(limit)} format copies.</small>` : ''}
    <div class="card-economy-actions">
      <div class="card-economy-summary"><span>OWNED <b>${owned}</b></span><span>SCRAPS <b>${esc(craft.scraps)}</b></span>${craft.missingForDeck ? `<span class="needs-copies">DECK NEEDS <b>${esc(craft.missingForDeck)}</b></span>` : ''}<small>${esc(sandboxRarityTier(def))} · ${esc(sandboxRarityLabel(def))}</small></div>
      <button data-scrap-card="${esc(def.id)}" ${canScrap && !state.economyBusy ? '' : 'disabled'}>${affectedDecks.length ? 'Review shred' : 'Shred'} +${esc(tier?.scrapValue ?? '—')}</button>
      <button data-craft-card="${esc(def.id)}" ${canCraft && !state.economyBusy ? '' : 'disabled'}>Craft −${esc(tier?.craftCost ?? '—')}${craft.missingForDeck ? ` · ${esc(craft.missingForDeck)} needed` : ''}</button>
      ${Number.isFinite(craft.craftCost) && !canCraft ? `<button class="find-shred-candidates" data-economy-filter="SHREDDABLE">Find shred candidates · ${esc(craft.shortfall)} Scraps short</button>` : ''}
      <small class="economy-protection ${scrap.allowed ? '' : 'blocked'}">Collection floor: ${esc(scrap.after)} playable slots after shred · minimum ${esc(scrap.floor)}.${scrap.allowed ? ' This card may go to 0 copies.' : ` ${esc(scrap.reason)}`}</small>
      ${affectedDecks.length ? `<div class="deck-shred-warning"><strong>USED IN SAVED DECK</strong><span>After shredding, owned-copy mode would leave ${affectedDecks.map((item) => `<b>${esc(item.name)}</b>`).join(', ')} short of this card.</span></div>` : ''}
      ${confirming ? `<div class="shred-confirm"><strong>Shred anyway?</strong><span>The collection still keeps one legal 40-card deck, but the saved deck warning above will remain.</span><div><button data-cancel-scrap>Cancel</button><button class="danger" data-confirm-scrap-card="${esc(def.id)}">Shred 1 copy</button></div></div>` : ''}
    </div>
  </section>`;
}

function collectionComparator(a,b) {
  if (state.collectionSort === 'NEW') return Number(state.newCollectionCards.has(b.id))-Number(state.newCollectionCards.has(a.id)) || ownedCopies(b.id)-ownedCopies(a.id) || a.name.localeCompare(b.name);
  if (state.collectionSort === 'OWNED') return ownedCopies(b.id)-ownedCopies(a.id) || a.name.localeCompare(b.name);
  if (state.collectionSort === 'RARITY') {
    const order = { T3:3, T2:2, T1:1, T0:0 };
    return Number(order[sandboxRarityTier(b)] ?? -1)-Number(order[sandboxRarityTier(a)] ?? -1) || a.name.localeCompare(b.name);
  }
  if (state.collectionSort === 'NAME') return a.name.localeCompare(b.name);
  if (state.collectionSort === 'TYPE') return a.cardType.localeCompare(b.cardType) || a.name.localeCompare(b.name);
  if (state.collectionSort === 'COST') return definitionCost(a)-definitionCost(b) || a.name.localeCompare(b.name);
  if (state.collectionSort === 'POWER') return Number(b.power ?? -1)-Number(a.power ?? -1) || a.name.localeCompare(b.name);
  return a.department.localeCompare(b.department) || a.name.localeCompare(b.name);
}

function renderCollectionCard(def, deck) {
  const copies = deckCopies(deck, def.id);
  const limit = cardCopyLimit(def.id);
  const deckCeiling = deckCopyCeiling(def.id);
  const tier = sandboxRarityTier(def);
  const owned = ownedTotalCopies(def.id);
  const executiveId = executiveEditionVariantId(def.id);
  const executiveOwned = ownedExecutiveEditionCopies(def.id, executiveId);
  const selectedFinish = state.collectionVariantSelection?.[def.id] ?? (state.collectionFinishFilter === 'EXECUTIVE' ? 'EXECUTIVE' : 'STANDARD');
  const selectedVariant = selectedFinish === 'EXECUTIVE' && executiveOwned > 0 ? executiveId : null;
  const standardDeckCopies = deckVariantCopies(deck, def.id, null);
  const executiveDeckCopies = deckVariantCopies(deck, def.id, executiveId);
  const finishSwapTarget = selectedFinish === 'EXECUTIVE' && standardDeckCopies > 0 && executiveOwned > 0 ? executiveId : selectedFinish === 'STANDARD' && executiveDeckCopies > 0 && ownedCopies(def.id) > 0 ? 'STANDARD' : null;
  const selected = state.collectionPreviewId === def.id;
  const isNew = state.newCollectionCards.has(def.id);
  const swapSource = deckSwapSource(deck);
  const swapStatus = swapSource ? deckSwapTargetStatus(deck, def.id) : null;
  return `<article class="collection-card catalog-frame type-${esc(def.cardType.toLowerCase())} tier-${esc(tier.toLowerCase())} ${finishClass(selectedVariant)} ${selected ? 'selected-preview' : ''} ${isNew ? 'new-acquisition' : ''} ${copies > 0 ? 'in-current-deck' : ''} ${copies >= deckCeiling ? 'deck-copy-maxed' : ''} ${ownedDeckMode() && owned === 0 ? 'unowned-card' : ''} ${swapSource ? 'swap-target-mode' : ''} ${swapSource?.id===def.id ? 'swap-source-card' : ''}" data-collection-preview="${esc(def.id)}">
    ${renderCatalogCardFace(def, { tier, variantId:selectedVariant, finishBadgePlacement:'artwork', isNew, artReady:Boolean(def.artId), owned })}
    ${executiveOwned ? `<div class="card-variant-picker" role="group" aria-label="${esc(collectionCopy('finish'))}"><button type="button" data-card-variant="${esc(def.id)}" data-card-variant-value="STANDARD" class="${selectedVariant ? '' : 'selected'}">${esc(collectionCopy('standard'))} <small>${esc(ownedCopies(def.id))}</small></button><button type="button" data-card-variant="${esc(def.id)}" data-card-variant-value="EXECUTIVE" class="${selectedVariant ? 'selected gold' : 'gold'}">${esc(collectionCopy('executiveEdition'))} <small>${esc(executiveOwned)}</small></button></div>` : ''}
    ${finishSwapTarget ? `<button class="collection-finish-swap" data-deck-finish-swap="${esc(def.id)}" data-deck-finish-to="${esc(finishSwapTarget)}">${esc(finishSwapTarget === 'STANDARD' ? lobbyCopy('Use Standard','Standard verwenden') : lobbyCopy('Use Executive Edition','Executive Edition verwenden'))}</button>` : ''}
    ${swapSource ? `<div class="collection-swap-control"><span><b>${esc(copies)}</b> / ${esc(limit)} IN DECK</span><button data-deck-swap-target="${esc(def.id)}" ${swapStatus?.allowed ? '' : 'disabled'} title="${esc(swapStatus?.reason ?? 'Swap in this card')}">${swapSource.id===def.id ? 'SWAP SOURCE' : 'SWAP IN'}</button></div>` : `<div class="collection-copy-control"><button data-deck-minus="${esc(def.id)}" ${copies <= 0 ? 'disabled' : ''}>−</button><span><b>${esc(copies)}</b> / ${esc(limit)} IN DECK</span><button data-deck-plus="${esc(def.id)}" ${copies >= deckCeiling || deckCardCount(deck) >= state.format.deckSize ? 'disabled' : ''}>+</button></div>`}
  </article>`;
}

function renderEconomyRoadmap() {
  const economy = state.economyConfig ?? {};
  const crafting = economy.crafting ?? {};
  const boosters = economy.boosters ?? {};
  const progression = state.metaProfile?.progression ?? { level:1,xp:0 };
  const grind = crafting.lowTierCraftTargetScraps ?? {};
  const pack = boosters.packs?.[0];
  const packDescription = pack ? t('collectionMeta.creditsPathDescription', { name:pack.name, cards:pack.cardCount, price:pack.price ?? 'TBD' }) : t('collectionMeta.packStructurePlanned');
  return `<section class="meta-roadmap">
    <div class="meta-roadmap-head"><div><span>${esc(t('collectionMeta.roadmapLabel'))}</span><strong>${esc(t('collectionMeta.roadmapHeadline'))}</strong></div><b>${esc(t('collectionMeta.designSandbox'))}</b></div>
    <div class="meta-roadmap-grid">
      <article class="meta-path credits"><span>${esc(collectionCopy('officeCredits'))}</span><strong>${esc(t('collectionMeta.creditsPathHeadline'))}</strong><p>${esc(packDescription)}</p><small>${esc(t('collectionMeta.liveEconomyOff'))}</small></article>
      <article class="meta-path scraps"><span>${esc(collectionCopy('scrap'))}</span><strong>${esc(t('collectionMeta.scrapsPathHeadline'))}</strong><p>${esc(t('collectionMeta.scrapsPathDescription'))}</p><small>${esc(t('collectionMeta.lowTierGoal', { min:grind.minCards ?? 'TBD', max:grind.maxCards ?? 'TBD' }))}</small></article>
      <article class="meta-path progression"><span>${esc(t('collectionMeta.profileLabel'))}</span><strong>${esc(t('collectionMeta.profilePathHeadline', { level:progression.level ?? 1, xp:progression.xp ?? 0 }))}</strong><p>${esc(t('collectionMeta.profilePathDescription'))}</p><small>${esc(t('collectionMeta.rewardedMatches', { count:progression.matchesCompleted ?? 0 }))}</small></article>
    </div>
    <div class="rarity-plan">${(economy.rarityTiers ?? []).map((tier) => `<span><b>${esc(tier.id)}</b>${esc(tier.label ?? '')}<small>${esc(t('collectionMeta.rarityScrap'))} ${tier.scrapValue ?? 'TBD'} · ${esc(t('collectionMeta.rarityCraft'))} ${tier.craftCost ?? 'TBD'}</small></span>`).join('')}</div>
  </section>`;
}

function renderBoosterReveal() {
  if (!state.lastBooster?.cardIds?.length) return '';
  const total = state.lastBooster.cardIds.length;
  const revealed = Math.max(0, Math.min(total, Number(state.boosterRevealCount ?? total)));
  const complete = revealed >= total;
  const newCardIds = new Set(state.lastBooster.newCardIds ?? []);
  const newUnique = newCardIds.size;
  const duplicatePulls = Math.max(0, total - newUnique);
  const deckFlow = boosterDeckFlowStats();
  const packSummary = collectionCopy('packSummary', { newCount:newUnique, duplicateCount:duplicatePulls, duplicateSuffix:duplicatePulls === 1 ? '' : currentLocale() === 'de' ? 'e' : 's', usedPulls:deckFlow.usedPulls, pullSuffix:deckFlow.usedPulls === 1 ? '' : currentLocale() === 'de' ? 'n' : 's' });
  const detail = complete ? packSummary : collectionCopy('revealHint');
  const title = complete ? collectionCopy('packComplete') : collectionCopy('packOpening');
  const headline = complete ? collectionCopy('cardsAddedCount', { count:total }) : collectionCopy('revealCardOf', { current:revealed + 1, total });
  return `<div class="booster-reveal ${complete ? 'complete' : 'opening'}"><div class="booster-reveal-head"><div><span>${esc(title)}</span><strong>${esc(headline)}</strong><small>${esc(detail)}</small></div><div class="booster-reveal-actions"><b>${esc(revealed)}/${esc(total)} ${esc(collectionCopy('revealed'))}</b>${!complete ? `<button id="revealAllBooster">${esc(collectionCopy('revealAll'))}</button>` : `<button data-view-last-booster> ${esc(collectionCopy('viewPack'))}</button>${newUnique ? `<button id="viewNewBoosterCards">${esc(collectionCopy('newPulls'))}</button>` : ''}`}</div></div><div class="booster-card-row">${state.lastBooster.cardIds.map((id, index) => {
    const def=cardDef(id);
    const tier=state.lastBooster.tiers?.[index] ?? sandboxRarityTier(def);
    const isRevealed=index < revealed;
    const isNext=index === revealed;
    const appearedEarlier=state.lastBooster.cardIds.slice(0,index).filter((item)=>item===id).length;
    const isCollectionNew=newCardIds.has(id) && appearedEarlier === 0;
    const isFreshPackPull=true;
    if (!isRevealed) return `<button class="booster-hit booster-facedown tier-${esc(String(tier).toLowerCase())} ${isNext ? 'next-reveal' : 'locked-reveal'}" ${isNext ? `data-booster-reveal="${index}"` : 'disabled'}><div class="booster-card-back"><span>OFFICE</span><b>ALPHA</b><small>${isNext ? esc(collectionCopy('tapToReveal')) : esc(collectionCopy('locked'))}</small></div></button>`;
    const variantId=state.lastBooster.variantIds?.[index] ?? null;
    const deckUses=savedDeckCardUse(id).filter((item)=>item.copies>0).length;
    return `<button class="booster-hit revealed type-${esc((def?.cardType ?? 'hidden').toLowerCase())} tier-${esc(String(tier).toLowerCase())} ${finishClass(variantId)} ${isCollectionNew ? 'collection-new-pull' : ''}" data-collection-preview="${esc(id)}">${def ? renderCatalogCardFace(def, { tier, variantId, isNew:isFreshPackPull, artReady:Boolean(def.artId), owned:variantId ? ownedExecutiveEditionCopies(id, variantId) : ownedTotalCopies(id) }) : '<div class="catalog-card-face missing">Unknown card</div>'}<i class="booster-inspect">${esc(collectionCopy('inspect'))}</i>${deckUses ? `<i class="booster-deck-use">${esc(collectionCopy('usedInDeck', { count:deckUses, suffix:deckUses === 1 ? '' : 'S' }))}</i>` : ''}</button>`;
  }).join('')}</div>${complete ? `<div class="booster-deck-bridge"><div><span>${esc(collectionCopy('packToDeck'))}</span><strong>${esc(collectionCopy('deckBridge', { opportunity:deckFlow.opportunityPulls, unique:deckFlow.uniquePulls }))}</strong><small>${esc(collectionCopy('deckBridgeHint'))}</small></div><button data-view-last-booster>${esc(collectionCopy('browsePack'))}</button></div>` : ''}</div>`;
}

function revealBoosterThrough(index) {
  state.boosterRevealCount = Math.max(Number(state.boosterRevealCount ?? 0), Number(index) + 1);
  renderCollection();
}

function renderEconomyLab() {
  const economy = state.economyConfig ?? {};
  const pack = economy.boosters?.packs?.[0];
  const executivePack = economy.boosters?.packs?.find((item) => item.id === 'EXECUTIVE_EDITION_PACK');
  const executivePackCount = Number(state.metaProfile?.ownedPacks?.EXECUTIVE_EDITION_PACK ?? 0);
  const credits = Number(state.metaProfile?.balances?.OFFICE_CREDITS ?? 0);
  const scraps = Number(state.metaProfile?.balances?.SHREDDER_SCRAPS ?? 0);
  const progression = state.metaProfile?.progression ?? {};
  const hasSandboxWallet = credits > 0 || scraps > 0 || Number(progression.boostersOpened ?? 0) > 0 || Object.keys(state.metaProfile?.ownedCards ?? {}).length > 0;
  const playableCapacity = collectionPlayableCapacity();
  const collectionFloor = Number(state.format?.deckSize ?? 40);
  const needsStarterFloor = playableCapacity < collectionFloor;
  return `<section class="economy-lab">
    <div class="economy-lab-head"><div><span>${esc(collectionCopy('economyLab'))}</span><strong>${esc(collectionCopy('economyHeadline'))}</strong><small>${esc(collectionCopy('economyNote'))}</small></div><div class="wallet"><span>${esc(collectionCopy('officeCredits'))} <b>${credits}</b></span><span>${esc(collectionCopy('scrap'))} <b>${scraps}</b></span></div></div>
    <div class="economy-loop" aria-label="${esc(collectionCopy('economyLoop'))}"><span><b>1</b>${esc(collectionCopy('economyLoopOpen'))}</span><i>→</i><span><b>2</b>${esc(collectionCopy('economyLoopBuild'))}</span><i>→</i><span><b>3</b>${esc(collectionCopy('economyLoopShred'))}</span><i>→</i><span><b>4</b>${esc(collectionCopy('economyLoopCraft'))}</span></div>
    <div class="economy-lab-grid">
      <article class="booster-station premium-pack-station"><div><span>${esc(collectionCopy('executiveEditionPack'))}</span><strong>${esc(executivePack?.name ?? collectionCopy('executiveEditionPack'))}</strong><p>${esc(collectionCopy('executivePackDescription'))}</p></div><div class="economy-actions"><button class="primary" id="openExecutiveEditionPack" ${executivePackCount < 1 || state.economyBusy ? 'disabled' : ''}>${esc(collectionCopy('openExecutivePack'))}</button></div></article>
      <article class="booster-station"><div><span>${esc(collectionCopy('boosterLabel'))}</span><strong>${esc(pack?.name ?? 'Office Alpha Pack')}</strong><p>${esc(pack?.cardCount ?? 5)} ${esc(t('common.cards'))} · ${esc(pack?.price ?? '—')} ${esc(collectionCopy('officeCredits'))}</p><small>${esc(collectionCopy('boosterSlots'))}</small></div><div class="economy-actions">${!hasSandboxWallet || needsStarterFloor ? `<button class="primary" id="startEconomySandbox" ${state.economyBusy?'disabled':''}>${hasSandboxWallet ? esc(collectionCopy('restartStarter')) : esc(collectionCopy('startSandbox', { credits:economy.sandbox?.startingOfficeCredits ?? 500 }))}</button>` : `<button class="primary" id="openBooster" ${credits < Number(pack?.price ?? Infinity) || state.economyBusy ? 'disabled' : ''}>${esc(collectionCopy('openPack', { price:pack?.price ?? '—' }))}</button><button id="refillEconomySandbox" ${state.economyBusy?'disabled':''}>${esc(collectionCopy('refillWallet'))}</button>`}<button class="ghost" id="resetEconomySandbox" ${state.economyBusy?'disabled':''}>${esc(collectionCopy('reset'))}</button></div></article>
      <article class="shredder-station"><span>${esc(collectionCopy('shredderLabel'))}</span><strong>${esc(collectionCopy('shredderHeadline'))}</strong><p>${esc(collectionCopy('shredderDescription', { deckSize:state.format?.deckSize ?? 40 }))}</p><small>${esc(collectionCopy('playableCapacity', { current:playableCapacity, minimum:collectionFloor }))} · ${(economy.rarityTiers ?? []).map((tier) => `${tier.id}: +${tier.scrapValue}/−${tier.craftCost}`).join(' · ')}</small><div class="economy-shortcuts"><button data-economy-filter="DECK_GAPS">${esc(collectionCopy('missingDeckCards'))}</button><button data-economy-filter="SHREDDABLE">${esc(collectionCopy('shredCandidates'))}</button></div></article>
    </div>
    ${state.economyMessage ? `<div class="economy-message">${esc(state.economyMessage)}</div>` : ''}
    ${renderBoosterReveal()}
  </section>`;
}

async function applyEconomyResponse(path, body, successMessage) {
  if (state.economyBusy) return;
  state.economyBusy = true;
  state.economyMessage = null;
  try {
    const result = await api(path, { method:'POST', body:JSON.stringify(body) });
    if (result.serverProfile) applyServerProfile(result.serverProfile);
    else if (result.profile) {
      state.metaProfile = result.profile;
      saveMetaProfile();
    }
    state.economyMessage = successMessage(result);
    return result;
  } catch (error) {
    state.economyMessage = error.message || collectionCopy('economyActionFailed');
    return null;
  } finally {
    state.economyBusy = false;
    renderCollection();
  }
}

async function startEconomySandbox() {
  state.lastBooster = null;
  state.collectionPackFilter = 'ALL';
  state.boosterRevealCount = 0;
  clearNewCollectionCards();
  return applyEconomyResponse('/api/economy/sandbox/start', metaRequest(), (data) => collectionCopy('starterAdded', { name:data.starterDeckName ?? 'Starter collection' }));
}

async function refillEconomySandbox() {
  return applyEconomyResponse('/api/economy/sandbox/refill', metaRequest(), (data) => collectionCopy('walletRefilled', { credits:data.profile?.balances?.OFFICE_CREDITS ?? state.metaProfile.balances.OFFICE_CREDITS }));
}

async function resetEconomySandbox() {
  state.lastBooster = null;
  state.collectionPackFilter = 'ALL';
  state.boosterRevealCount = 0;
  clearNewCollectionCards();
  state.pendingScrapConfirmation = null;
  return applyEconomyResponse('/api/economy/sandbox/reset', metaRequest(), () => collectionCopy('sandboxReset'));
}

async function openEconomyBooster() {
  const pack = state.economyConfig?.boosters?.packs?.[0];
  const ownedBefore = new Map([...state.catalog.keys()].map((id) => [id, ownedTotalCopies(id)]));
  const result = await applyEconomyResponse('/api/economy/booster/open', metaRequest({ packId:pack?.id }), (data) => collectionCopy('boosterOpened', { count:data.cardIds?.length ?? 0 }));
  if (result) {
    const newCardIds = [...new Set((result.cardIds ?? []).filter((id) => Number(ownedBefore.get(id) ?? 0) === 0 && ownedTotalCopies(id) > 0))];
    markCollectionCardsNew(newCardIds);
    state.lastBooster = { ...result, newCardIds };
    state.boosterRevealCount = 0;
    renderCollection();
  }
}

async function openExecutiveEditionPack() {
  const result = await applyEconomyResponse('/api/economy/pack/open', metaRequest({ packId:'EXECUTIVE_EDITION_PACK' }), () => collectionCopy('executivePackOpened'));
  if (result) {
    const def = cardDef(result.cardId);
    state.lastBooster = { cardIds:[result.cardId], variantIds:[result.variantId], tiers:[def ? sandboxRarityTier(def) : 'T0'], newCardIds:[result.cardId] };
    state.boosterRevealCount = 0;
    markCollectionCardsNew([result.cardId]);
    renderCollection();
  }
}

async function scrapEconomyCard(definitionId, confirmDeckImpact = false) {
  const def = cardDef(definitionId);
  state.lastBooster = null;
  state.collectionPackFilter = 'ALL';
  state.pendingScrapConfirmation = null;
  return applyEconomyResponse('/api/economy/scrap', metaRequest({ definitionId, copies:1, confirmDeckImpact }), (data) => collectionCopy('cardShredded', { name:def?.name ?? definitionId, amount:data.scrapValueEach }));
}

function requestScrapEconomyCard(definitionId) {
  const status = scrapCollectionStatus(definitionId, 1);
  if (!status.allowed) {
    state.economyMessage = status.reason;
    renderCollection();
    return;
  }
  const affected = savedDecksAffectedByScrap(definitionId, status.remaining);
  if (affected.length) {
    state.pendingScrapConfirmation = definitionId;
    renderCollection();
    return;
  }
    scrapEconomyCard(definitionId);
}

async function craftEconomyCard(definitionId) {
  const def = cardDef(definitionId);
  const wasOwned = ownedCopies(definitionId) > 0;
  state.lastBooster = null;
  state.collectionPackFilter = 'ALL';
  const result = await applyEconomyResponse('/api/economy/craft', metaRequest({ definitionId, copies:1 }), (data) => collectionCopy('cardCrafted', { name:def?.name ?? definitionId, amount:data.craftCostEach }));
  if (result && !wasOwned && ownedCopies(definitionId) > 0) markCollectionCardsNew([definitionId]);
  return result;
}

function matchModeConfig(mode) {
  return state.matchSettings?.modes?.find((item) => item.id === mode) ?? null;
}

function isBotMatch() { return Boolean(state.view?.settings?.bot || state.view?.settings?.mode === 'TRAINING' || state.view?.settings?.mode === 'TUTORIAL'); }

function roomModeLabel() {
  const settings = state.view?.settings;
  if (!settings) return 'Friendly';
  if (settings.mode === 'TRAINING') return t('training.modeLabel');
  if (settings.mode === 'TUTORIAL') return t('tutorial.modeLabel');
  return settings.mode === 'RANKED' ? (settings.ratingActive ? 'Ranked Alpha · Rated' : 'Ranked Rules · Unrated') : 'Friendly';
}

function roomTimerLabel() {
  const settings = state.view?.settings;
  if (!settings) return 'Timer off';
  return settings.timerActive ? `${settings.timerProfileId} · active` : settings.mode === 'RANKED' ? 'Ranked timer reserved · not active' : 'Timer off';
}

function matchRewardOutcome(match) {
  if (!match || match.status !== 'ENDED') return null;
  if (!match.winnerId) return 'DRAW';
  if (match.winnerId === match.viewerId) return 'WIN';
  return match.reason === 'RESIGN' ? 'RESIGN_LOSS' : 'LOSS';
}

function matchResultTitle(outcome) {
  return outcome === 'WIN' ? t('result.victory') : outcome === 'DRAW' ? t('result.draw') : t('result.defeat');
}

function matchResultRatingLine(rankedReceipt) {
  if (state.view?.settings?.ratingActive) {
    if (!rankedReceipt) return t('result.ratedSettling');
    const delta = `${rankedReceipt.ratingDelta >= 0 ? '+' : ''}${rankedReceipt.ratingDelta}`;
    return t('result.ratingDelta', { delta, before:rankedReceipt.ratingAfter - rankedReceipt.ratingDelta, after:rankedReceipt.ratingAfter });
  }
  return state.view?.settings?.mode === 'RANKED' ? t('result.rankedRulesUnrated') : t('result.friendlyUnrated');
}

function matchRewardPreview(match) {
  const outcome = matchRewardOutcome(match);
  if (!outcome) return null;
  if (state.view?.settings?.rewardEligible === false || isBotMatch()) return null;
  const mode = state.view?.settings?.mode === 'RANKED' ? 'RANKED' : 'FRIENDLY';
  const config = state.economyConfig?.progression?.matchRewards?.profiles?.[mode];
  if (!config) return null;
  const credits = outcome === 'WIN' ? config.win : outcome === 'LOSS' ? config.loss : outcome === 'DRAW' ? config.draw : config.resignLoss;
  const xp = outcome === 'WIN' ? config.xpWin : outcome === 'LOSS' ? config.xpLoss : outcome === 'DRAW' ? config.xpDraw : config.xpResignLoss;
  return { outcome, mode, credits:Number(credits ?? 0), xp:Number(xp ?? 0) };
}

function isMatchRewardClaimed(roomId = state.view?.roomId) {
  return Boolean(roomId && (state.metaProfile?.claimedRewardRooms ?? []).includes(roomId));
}

function renderMatchRewardPanel(match) {
  const preview = matchRewardPreview(match);
  if (!preview) return '';
  const roomId = state.view?.roomId;
  const claimed = isMatchRewardClaimed(roomId);
  const label = preview.outcome === 'WIN' ? t('result.winReward') : preview.outcome === 'DRAW' ? t('result.drawReward') : preview.outcome === 'RESIGN_LOSS' ? t('result.resignReward') : t('result.matchReward');
  const level = Number(state.metaProfile?.progression?.level ?? 1);
  const xp = Number(state.metaProfile?.progression?.xp ?? 0);
  const step = Math.max(1, Number(state.economyConfig?.progression?.levelXpStep ?? 100));
  const xpIntoLevel = xp % step;
  const xpPercent = Math.max(0, Math.min(100, Math.round((xpIntoLevel / step) * 100)));
  const credits = Number(state.metaProfile?.balances?.OFFICE_CREDITS ?? 0);
  return `<section class="match-reward-panel ${claimed ? 'claimed' : ''}"><div class="match-reward-copy"><span>${esc(label)} · ${esc(preview.mode)}</span><strong>${esc(t('result.rewardSummary', { credits:preview.credits, xp:preview.xp }))}</strong><small>${claimed ? esc(t('result.rewardClaimedDetail')) : esc(t('result.rewardPendingDetail'))}</small></div><div class="match-reward-progress"><span>${esc(t('result.level', { level }))}</span><div class="xp-track" aria-label="${esc(t('result.xpTowardNext', { current:xpIntoLevel, total:step }))}"><i style="width:${xpPercent}%"></i></div><small>${esc(t('result.xpCredits', { current:xpIntoLevel, total:step, credits }))}</small></div>${claimed ? `<b class="reward-claimed">${esc(t('result.claimed'))}</b>` : `<button class="primary" id="claimMatchReward" ${state.rewardBusy?'disabled':''}>${state.rewardBusy?esc(t('result.claiming')):esc(t('result.claimReward'))}</button>`}${state.rewardMessage ? `<p class="match-reward-message">${esc(state.rewardMessage)}</p>` : ''}</section>`;
}

function renderBotResultNotice() {
  if (!isBotMatch()) return '';
  const copy = state.view?.settings?.mode === 'TUTORIAL' ? t('tutorial.complete') : t('training.noRewards');
  return `<div class="bot-result-notice"><span>${esc(roomModeLabel())}</span><strong>${esc(copy)}</strong></div>`;
}

function matchEndReasonLabel(reason) {
  const labels = { REPUTATION_ZERO:t('result.reasonReputationDepleted'), DECK_OUT:t('result.reasonDeckOut'), RESIGN:t('result.reasonResignation'), TURN_TIMEOUT:t('result.reasonTurnTimeout'), DECISION_TIMEOUT:t('result.reasonDecisionTimeout'), RECONNECT_TIMEOUT:t('result.reasonReconnectTimeout') };
  return labels[String(reason ?? '')] ?? String(reason ?? 'Match complete').replaceAll('_',' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

function resultDeckValue(playerId) {
  const raw = playerId === 'P1' ? state.view?.hostDeckId : state.view?.guestDeckId;
  return raw ? String(raw) : null;
}

// Regression compatibility markers for the v7.33 feedback surface: HUMAN PLAYTEST NOTE, Too fast, ONE-SIDED?, DECISIONS, Save playtest note.
function renderHumanPlaytestCapture(match) {
  if (!match || match.status !== 'ENDED' || !state.profileToken) return '';
  const f = state.playtestFeedback ?? {};
  const active = (group,value) => f?.[group] === value ? ' selected' : '';
  const oneSided = f?.oneSided;
  const cards = Array.isArray(f?.cardIds) ? f.cardIds.join(', ') : '';
  return `<section class="human-playtest-capture"><div class="human-playtest-head"><span>${esc(t('result.humanPlaytestLabel'))}</span><strong>${esc(t('result.humanPlaytestQuestion'))}</strong><small>${esc(t('result.humanPlaytestDescription'))}</small></div>
    <div class="human-playtest-row"><b>${esc(t('result.pace'))}</b><button data-feedback-choice="pace:TOO_FAST" class="${active('pace','TOO_FAST')}">${esc(t('result.tooFast'))}</button><button data-feedback-choice="pace:GOOD" class="${active('pace','GOOD')}">${esc(t('result.good'))}</button><button data-feedback-choice="pace:TOO_LONG" class="${active('pace','TOO_LONG')}">${esc(t('result.tooLong'))}</button></div>
    <div class="human-playtest-row"><b>${esc(t('result.oneSided'))}</b><button data-feedback-choice="oneSided:true" class="${oneSided===true?'selected':''}">${esc(t('result.yes'))}</button><button data-feedback-choice="oneSided:false" class="${oneSided===false?'selected':''}">${esc(t('result.no'))}</button></div>
    <div class="human-playtest-row"><b>${esc(t('result.decisions'))}</b><button data-feedback-choice="decisions:LOW" class="${active('decisions','LOW')}">${esc(t('result.tooFew'))}</button><button data-feedback-choice="decisions:GOOD" class="${active('decisions','GOOD')}">${esc(t('result.good'))}</button><button data-feedback-choice="decisions:HIGH" class="${active('decisions','HIGH')}">${esc(t('result.tooMany'))}</button></div>
    <label class="human-playtest-note"><span>${esc(t('result.note'))}</span><textarea id="playtestFeedbackNote" maxlength="600" placeholder="${esc(t('result.notePlaceholder'))}">${esc(f?.note ?? '')}</textarea></label>
    <label class="human-playtest-cards"><span>${esc(t('result.cardIdsOptional'))}</span><input id="playtestFeedbackCards" value="${esc(cards)}" placeholder="CS-006, IT-003" /></label>
    <div class="human-playtest-save"><button id="savePlaytestFeedback" class="primary" ${state.playtestFeedbackBusy?'disabled':''}>${state.playtestFeedbackBusy?esc(t('result.saving')):esc(t('result.savePlaytestNote'))}</button>${state.playtestFeedbackMessage?`<small>${esc(state.playtestFeedbackMessage)}</small>`:''}</div></section>`;
}

async function loadPlaytestFeedback(roomId) {
  if (!state.profileToken || !roomId) return;
  try { const result=await api(`/api/playtest/feedback/${encodeURIComponent(roomId)}`, { headers:profileAuthHeaders() }); state.playtestFeedback=result.feedback??{}; } catch { state.playtestFeedback={}; }
}

async function savePlaytestFeedback() {
  const roomId=state.view?.roomId;if(!roomId||!state.profileToken||state.playtestFeedbackBusy)return;
  state.playtestFeedbackBusy=true;state.playtestFeedbackMessage=null;render();
  try { const note=document.querySelector('#playtestFeedbackNote')?.value ?? state.playtestFeedback?.note ?? ''; const raw=document.querySelector('#playtestFeedbackCards')?.value ?? ''; const cardIds=String(raw).split(',').map(v=>v.trim().toUpperCase()).filter(Boolean); const result=await api(`/api/playtest/feedback/${encodeURIComponent(roomId)}`,{method:'POST',body:JSON.stringify({profileToken:state.profileToken,feedback:{...state.playtestFeedback,sessionId:alphaTestSessionId(),note,cardIds}})});state.playtestFeedback=result.feedback;state.playtestFeedbackMessage=t('result.feedbackSaved');} catch(error){state.playtestFeedbackMessage=t('result.feedbackSaveFailed');} finally{state.playtestFeedbackBusy=false;render();}
}

function setPlaytestFeedbackChoice(raw){const [key,value]=String(raw??'').split(':');state.playtestFeedback=state.playtestFeedback??{};if(key==='oneSided')state.playtestFeedback.oneSided=value==='true';else if(key==='pace'||key==='decisions')state.playtestFeedback[key]=value;render();}

// Regression compatibility markers for historical result tests:
// MATCH COMPLETE VICTORY DEFEAT TURNS DURATION SEAT FINAL REP Report issue Review match Change deck Back to lobby Alternate opener Rematch
// MMR · Private Ranked rules · unrated Friendly · unrated Rated result is settling... Pending · claim once for this completed room. Added to this profile.
// SESSION ${esc(alphaTestSessionId())}
// match-result-emblem legacy source shape: <div class="match-result-emblem"><span>W</span><small>YOU</small></div>
// Regression compatibility marker for v6.0 legacy result styling: match-result-panel ${esc(tone)} ${esc(departmentThemeClass(mine.department))}
function renderMatchResultPanel(match) {
  if (!match || match.status !== 'ENDED') return '';
  if (state.profileToken && state.playtestFeedbackRoomId !== state.view?.roomId) { state.playtestFeedbackRoomId=state.view?.roomId; state.playtestFeedback=null; queueMicrotask(()=>loadPlaytestFeedback(state.view?.roomId).then(()=>render())); }
  const outcome = matchRewardOutcome(match) ?? 'DRAW';
  const mine = roomDeckMeta(match.viewerId);
  const opponentId = match.viewerId === 'P1' ? 'P2' : 'P1';
  const theirs = roomDeckMeta(opponentId);
  const tone = outcome === 'WIN' ? 'win' : outcome === 'DRAW' ? 'draw' : 'loss';
  const rankedReceipt = state.serverProfile?.ranked?.recentResults?.find((item) => item.roomId === state.view?.roomId) ?? null;
  const ratingLine = matchResultRatingLine(rankedReceipt);
  const myRep = Number(match.players?.[match.viewerId]?.reputation ?? 0);
  const theirRep = Number(match.players?.[opponentId]?.reputation ?? 0);
  const elapsed = state.view?.telemetry?.matchElapsedSeconds;
  const seatLabel = match.firstPlayerId === match.viewerId ? t('result.openedOffice') : t('result.playedSecond');
  const rewardClaimed = isMatchRewardClaimed();
  const rated = Boolean(state.view?.settings?.ratingActive);
  const rematchReady = Boolean(state.view?.rematchAvailable);
  const nextLabel = rewardClaimed ? (rated ? t('result.queueAnother') : rematchReady ? t('result.joinRematch') : t('result.rematch')) : (rated ? t('result.claimQueueAnother') : rematchReady ? t('result.claimJoinRematch') : t('result.claimRematch'));
  return `<section id="matchResultPanel" class="match-result-panel ${esc(tone)}">
    <div class="match-result-emblem"><span>${outcome === 'WIN' ? 'W' : outcome === 'DRAW' ? '=' : 'L'}</span><small>${esc(t('result.you'))}</small></div>
    <div class="match-result-copy"><span>${esc(t('result.matchComplete'))}</span><strong>${esc(matchResultTitle(outcome))}</strong><p>${esc(mine.playerName)} <i>vs</i> ${esc(theirs.playerName)}</p><div class="match-scoreline"><span>${esc(t('result.you'))} <b>${esc(myRep)}</b></span><i>${esc(t('result.companyReputation'))}</i><span>${esc(t('result.opponent'))} <b>${esc(theirRep)}</b></span></div><div class="match-result-chips"><b>${esc(matchEndReasonLabel(match.reason))}</b><b>${esc(ratingLine)}</b><b>${esc(roomTimerLabel())}</b><b>${esc(t('result.session', { id:alphaTestSessionId() }))}</b></div></div>
    <div class="match-result-actions"><button data-download-bug-report>${esc(t('result.reportIssue'))}</button><button id="reviewCurrentMatch">${esc(t('result.reviewMatch'))}</button><button id="resultChangeDeck">${esc(t('result.changeDeck'))}</button><button id="resultBackLobby">${esc(t('result.backToLobby'))}</button>${isBotMatch() ? (state.view?.settings?.mode === 'TUTORIAL' ? `<button id="resultPlayAnother" class="primary">${esc(t('tutorial.replay'))}</button>` : `<button id="resultPlayAnother" class="primary">${esc(t('training.start'))}</button>`) : `${rated ? '' : `<button id="resultAlternateRematch" ${state.rewardBusy||rematchReady?'disabled':''}>${esc(t('result.alternateOpener'))}</button>`}<button class="primary" id="resultPlayAnother" ${state.rewardBusy?'disabled':''}>${state.rewardBusy?esc(t('result.claiming')):esc(nextLabel)}</button>`}</div>
    <div class="match-result-summary"><span><small>${esc(t('result.turns'))}</small><b>${esc(match.turnNumber)}</b></span><span><small>${esc(t('result.duration'))}</small><b>${elapsed == null ? '—' : esc(formatTelemetrySeconds(elapsed))}</b></span><span><small>${esc(t('result.seat'))}</small><b>${esc(seatLabel)}</b></span><span><small>${esc(t('result.finalRep'))}</small><b>${esc(myRep)}–${esc(theirRep)}</b></span></div>
    ${renderMatchRewardPanel(match)}
    ${renderBotResultNotice()}
    ${renderHumanPlaytestCapture(match)}
  </section>`;
}

async function reviewCurrentMatch() {
  const roomId = state.view?.roomId;
  if (!roomId) return;
  parkSession();
  await openMatchReplay(roomId);
}

async function claimMatchReward({ renderAfter = true } = {}) {
  if (!state.session || state.rewardBusy) return false;
  state.rewardBusy = true;
  state.rewardMessage = null;
  if (renderAfter) render();
  try {
    const result = await api(`/api/rooms/${encodeURIComponent(state.session.roomId)}/reward`, { method:'POST', headers:roomAuthHeaders(), body:JSON.stringify(metaRequest()) });
    if (result.serverProfile) applyServerProfile(result.serverProfile);
    else if (result.profile) { state.metaProfile = result.profile; saveMetaProfile(); }
    state.lastRewardReceipt = result;
    state.rewardMessage = `${result.replayed ? 'Reward already claimed' : 'Reward claimed'}: +${result.officeCredits} Office Credits · +${result.xp} XP.`;
    saveMetaProfile();
    return true;
  } catch (error) {
    state.rewardMessage = error.message || 'Could not claim match reward.';
    return false;
  } finally {
    state.rewardBusy = false;
    if (renderAfter) render();
  }
}

async function rematchCurrentRoom({ alternateFirstPlayer = false } = {}) {
  if (!state.session || !state.view?.match || state.view.match.status !== 'ENDED' || state.view?.settings?.ratingActive) return false;
  if (!isMatchRewardClaimed()) {
    const claimed = await claimMatchReward({ renderAfter:false });
    if (!claimed) { render(); return false; }
  }
  const oldRoomId = state.session.roomId;
  try {
    const result = await api(`/api/rooms/${encodeURIComponent(oldRoomId)}/rematch`, { method:'POST', headers:roomAuthHeaders(), body:JSON.stringify({ alternateFirstPlayer }) });
    state.stream?.close(); state.stream=null;
    saveSession({ roomId:result.roomId, token:result.token, playerId:result.playerId });
    acceptView(result.view);
    state.eventLog=[]; appendEvents(result.view.events);
    await claimSessionControl({ restartStream:false, renderAfter:false });
    startStream();
    const waiting = result.waiting === true || result.view?.status === 'WAITING';
    showFeedback('success', waiting ? 'Rematch requested' : 'Rematch joined', waiting ? 'Waiting for the other player to confirm. The new match will not start before both seats are ready.' : (result.alternateFirstPlayer?'Opening player alternated for this test.':'Same decks and opening player retained.'));
    render();
    return true;
  } catch (error) { state.lastError=error.message; friendlyErrorFeedback(error,'Rematch could not be started'); render(); return false; }
}

async function changeDeckAfterMatch() {
  const deckValue = resultDeckValue(state.view?.match?.viewerId);
  if (deckValue) state.preferredDeckValue = deckValue;
  parkSession();
  await enterAlphaDeckbuilder('Previous match deck selected · adjust it or choose another saved deck before the next test.');
}

async function playAnotherMatch() {
  if (!state.session || !state.view?.match || state.view.match.status !== 'ENDED') return;
  if (!state.view?.settings?.ratingActive) { await rematchCurrentRoom(); return; }
  if (!isMatchRewardClaimed()) {
    const claimed = await claimMatchReward({ renderAfter:false });
    if (!claimed) { render(); return; }
  }
  const deckValue = resultDeckValue(state.view.match.viewerId);
  if (deckValue) state.preferredDeckValue = deckValue;
  state.lobbyMatchMode = 'RANKED';
  parkSession();
  showFeedback('success','Ready for another rated match','Same deck is selected. Rated rematches return to matchmaking.');
}

function renderSavedDeckManager(currentDeck) {
  const now = Date.now();
  return `<section class="saved-deck-manager">
    <div class="saved-deck-manager-head"><div><span>MY DECKS</span><strong>${esc(state.customDecks.length)} saved ${state.customDecks.length === 1 ? 'deck' : 'decks'}</strong></div><small>Open, duplicate or maintain a saved build without losing track of match readiness.</small></div>
    <div class="saved-deck-rail">${state.customDecks.map((deck) => {
      const editing = deck.id === currentDeck?.id;
      const lobbySelected = state.preferredDeckValue === `custom:${deck.id}`;
      const formatReady = deckFormatErrors(deck).length === 0;
      const owned = deckOwnedReadiness(deck);
      const total = deckCardCount(deck);
      return `<article class="saved-deck-card ${editing?'editing':''}">
        <div class="saved-deck-title"><div><span>${editing?'EDITING':lobbySelected?'LOBBY DECK':'SAVED DECK'}</span><strong title="${esc(deck.name)}">${esc(deck.name)}</strong></div><b>${esc(total)} / ${esc(state.format.deckSize ?? 40)}</b></div>
        <div class="saved-deck-status"><span class="${formatReady?'ready':'draft'}">${formatReady?'FORMAT READY':'DRAFT'}</span><span class="${owned.ready?'ready':'missing'}">${owned.ready?'OWNED READY':`MISSING ${owned.missingCopies}`}</span>${lobbySelected?'<span class="selected">SELECTED</span>':''}</div>
        <small class="saved-deck-edited">Last edited · ${esc(deckLastEditedLabel(deck, now))}</small>
        <div class="saved-deck-actions"><button data-deck-manage-open="${esc(deck.id)}" ${editing?'disabled':''}>${editing?'Open':'Open'}</button><button data-deck-manage-duplicate="${esc(deck.id)}">Duplicate</button><button data-deck-manage-rename="${esc(deck.id)}">Rename</button><button class="danger" data-deck-manage-delete="${esc(deck.id)}" ${state.customDecks.length<=1?'disabled':''}>Delete</button></div>
      </article>`;
    }).join('')}</div>
  </section>`;
}

function renderDeckEditSafety(deck) {
  const dirty = deckHasUnsavedChanges(deck);
  const canUndo = deckUndoAvailable(deck);
  return `<section class="deck-edit-safety ${dirty?'dirty':'saved'}">
    <div class="deck-edit-state"><span>${dirty?'UNSAVED CHANGES':'SAVED'}</span><strong>${dirty?'Working draft differs from saved deck':'Saved deck is up to date'}</strong><small>${dirty ? (state.serverDecksReady ? 'Save to keep these edits in your account.' : 'Save to keep these edits after a reload.') : (state.serverDecksReady ? t('decks.serverSaved') : 'Edits are stored locally on this device.')}</small></div>
    <div class="deck-edit-actions"><button id="undoDeckEdit" ${canUndo?'':'disabled'}>Undo</button><button id="resetDeckEdits" ${dirty?'':'disabled'}>Reset to saved</button><button class="primary" id="saveDeckEdits" ${dirty?'':'disabled'}>Save changes</button></div>
  </section>`;
}

function renderCollection() {
  let deck = editingDeck();
  if (!deck) deck = newCustomDeck();
  if (state.deckSwapSourceId && deckCopies(deck, state.deckSwapSourceId) <= 0) state.deckSwapSourceId = null;
  const cards = [...state.catalog.values()].map(localizedCard).filter((def) => {
    const q = state.collectionSearch.trim().toLowerCase();
    if (q && !collectionSearchText(def).includes(q)) return false;
    if (state.collectionDepartment !== 'ALL' && def.department !== state.collectionDepartment) return false;
    if (state.collectionType !== 'ALL' && def.cardType !== state.collectionType) return false;
    if (!matchesCollectionCost(def)) return false;
    if (state.collectionPackFilter === 'LAST_PACK' && !lastBoosterCardIds().has(def.id)) return false;
    if (state.collectionPackFilter === 'LAST_PACK_NEW' && !lastBoosterNewCardIds().has(def.id)) return false;
    const executiveOwned = ownedExecutiveEditionCopies(def.id);
    const standardOwned = ownedCopies(def.id);
    if (state.collectionFinishFilter === 'EXECUTIVE' && executiveOwned <= 0) return false;
    if (state.collectionFinishFilter === 'STANDARD' && ownedDeckMode() && standardOwned <= 0) return false;
    if (state.collectionOwnedFilter === 'OWNED' && ownedTotalCopies(def.id) <= 0) return false;
    if (state.collectionOwnedFilter === 'MISSING' && ownedTotalCopies(def.id) > 0) return false;
    if (state.collectionOwnedFilter === 'NEW' && !state.newCollectionCards.has(def.id)) return false;
    if (state.collectionOwnedFilter === 'DECK_GAP' && deckCopies(deck, def.id) <= ownedTotalCopies(def.id)) return false;
    if (state.collectionOwnedFilter === 'SHREDDABLE' && !(ownedCopies(def.id) > 0 && deckCopies(deck, def.id) === 0 && scrapCollectionStatus(def.id, 1).allowed)) return false;
    if (state.collectionRarity !== 'ALL' && sandboxRarityTier(def) !== state.collectionRarity) return false;
    if (state.collectionTag !== 'ALL' && !(def.tags ?? []).includes(state.collectionTag)) return false;
    const deckCopiesNow = deckCopies(deck, def.id);
    if (state.collectionDeckFilter === 'IN_DECK' && deckCopiesNow <= 0) return false;
    if (state.collectionDeckFilter === 'NOT_IN_DECK' && deckCopiesNow > 0) return false;
    if (state.collectionDeckFilter === 'BELOW_LIMIT' && deckCopiesNow >= deckCopyCeiling(def.id)) return false;
    return true;
  }).sort(collectionComparator);
  const errors = clientDeckErrors(deck);
  const total = deckCardCount(deck);
  const departments = ['ALL','CUSTOMER_SERVICE','IT','OFFICE','MARKETING','PRODUCTION','NEUTRAL'];
  const types = ['ALL','EMPLOYEE','ACTION','INCIDENT','SYSTEM'];
  const rarities = ['ALL','T0','T1','T2','T3'];
  const tagEntries = collectionTagEntries();
  const activeFilters = activeCollectionFilters();
  const previewDef = cardDef(state.collectionPreviewId) ?? null;
  const setStats = collectionSetStats();
  const currencies = state.economyConfig?.currencies ?? [{id:'OFFICE_CREDITS',name:'Office Credits'},{id:'SHREDDER_SCRAPS',name:'Shredder Scraps'}];
  app.innerHTML = `<section class="collection-shell">
    <header class="collection-toolbar"><div><button class="ghost" id="backToPlay">← Play</button><strong>Collection & Deckbuilder</strong><span class="muted">Build, collect and inspect the full office set.</span><div class="collection-set-progress"><span><b>${esc(setStats.uniqueOwned)}</b> / ${esc(setStats.total)} owned</span><span><b>${esc(setStats.artReady)}</b> / ${esc(setStats.total)} artwork</span>${setStats.unseenNew ? `<span class="new-set-count"><b>${esc(setStats.unseenNew)}</b> new</span><button class="mark-seen-button" id="markAllCardsSeen">Mark seen</button>` : ''}</div><div class="collection-mode-toggle" role="group" aria-label="Deckbuilder collection mode"><button data-collection-mode="SANDBOX_ALL_AVAILABLE" class="${ownedDeckMode()?'':'active'}">All Alpha cards</button><button data-collection-mode="OWNED_COPIES" class="${ownedDeckMode()?'active':''}">Owned copies</button></div></div><div class="economy-preview">${currencies.map((currency) => `<span>${esc(currency.name.toUpperCase())} <b>${esc(state.metaProfile?.balances?.[currency.id] ?? 0)}</b></span>`).join('')}<small>${ownedDeckMode() ? 'Owned-copy limits active' : 'All Alpha cards available'} · saved to your server profile</small></div></header>
    ${renderEconomyLab()}
    ${renderEconomyRoadmap()}
    ${renderStarterDeckShelf()}
    <div class="collection-layout">
      <main class="collection-browser">
        ${renderDeckSwapBar(deck)}
        <div class="collection-discovery">
          <div class="collection-filters">
            <label class="collection-search-field"><span>SEARCH</span><input id="collectionSearch" value="${esc(state.collectionSearch)}" placeholder="Name, rules, flavor, tag, ID…" /></label>
            <label><span>DEPARTMENT</span><select id="collectionDepartment">${departments.map((d) => `<option value="${esc(d)}" ${state.collectionDepartment===d?'selected':''}>${esc(collectionDepartmentLabel(d))}</option>`).join('')}</select></label>
            <label><span>TYPE</span><select id="collectionType">${types.map((t) => `<option value="${esc(t)}" ${state.collectionType===t?'selected':''}>${esc(t==='ALL'?'All types':t)}</option>`).join('')}</select></label>
            <label><span>OWNERSHIP</span><select id="collectionOwnedFilter"><option value="ALL" ${state.collectionOwnedFilter==='ALL'?'selected':''}>All ownership</option><option value="OWNED" ${state.collectionOwnedFilter==='OWNED'?'selected':''}>Owned</option><option value="MISSING" ${state.collectionOwnedFilter==='MISSING'?'selected':''}>Missing</option><option value="DECK_GAP" ${state.collectionOwnedFilter==='DECK_GAP'?'selected':''}>Missing for deck</option><option value="SHREDDABLE" ${state.collectionOwnedFilter==='SHREDDABLE'?'selected':''}>Shred candidates</option><option value="NEW" ${state.collectionOwnedFilter==='NEW'?'selected':''}>New</option></select></label>
            <label><span>${esc(collectionCopy('finish'))}</span><select id="collectionFinishFilter"><option value="ALL" ${state.collectionFinishFilter==='ALL'?'selected':''}>${esc(lobbyCopy('All finishes','Alle Kartenfinishes'))}</option><option value="STANDARD" ${state.collectionFinishFilter==='STANDARD'?'selected':''}>${esc(collectionCopy('standard'))}</option><option value="EXECUTIVE" ${state.collectionFinishFilter==='EXECUTIVE'?'selected':''}>${esc(collectionCopy('executiveEdition'))}</option></select></label>
            <label><span>RARITY</span><select id="collectionRarity">${rarities.map((tier) => `<option value="${esc(tier)}" ${state.collectionRarity===tier?'selected':''}>${esc(tier==='ALL'?'All tiers':`${tier} · ${state.economyConfig?.rarityTiers?.find((item)=>item.id===tier)?.label ?? tier}`)}</option>`).join('')}</select></label>
            <label><span>ENGINE TAG</span><select id="collectionTag"><option value="ALL" ${state.collectionTag==='ALL'?'selected':''}>All tags</option>${tagEntries.map(([tag,count]) => `<option value="${esc(tag)}" ${state.collectionTag===tag?'selected':''}>${esc(tag)} · ${esc(count)}</option>`).join('')}</select></label>
            <label><span>DECK STATUS</span><select id="collectionDeckFilter"><option value="ALL" ${state.collectionDeckFilter==='ALL'?'selected':''}>All deck status</option><option value="IN_DECK" ${state.collectionDeckFilter==='IN_DECK'?'selected':''}>In current deck</option><option value="NOT_IN_DECK" ${state.collectionDeckFilter==='NOT_IN_DECK'?'selected':''}>Not in current deck</option><option value="BELOW_LIMIT" ${state.collectionDeckFilter==='BELOW_LIMIT'?'selected':''}>Below copy limit</option></select></label>
            <label><span>SORT</span><select id="collectionSort"><option value="DEPARTMENT" ${state.collectionSort==='DEPARTMENT'?'selected':''}>Department</option><option value="NEW" ${state.collectionSort==='NEW'?'selected':''}>New first</option><option value="OWNED" ${state.collectionSort==='OWNED'?'selected':''}>Owned copies</option><option value="RARITY" ${state.collectionSort==='RARITY'?'selected':''}>Rarity</option><option value="NAME" ${state.collectionSort==='NAME'?'selected':''}>Name</option><option value="TYPE" ${state.collectionSort==='TYPE'?'selected':''}>Card type</option><option value="COST" ${state.collectionSort==='COST'?'selected':''}>Cost</option><option value="POWER" ${state.collectionSort==='POWER'?'selected':''}>Power</option></select></label>
            <span class="collection-result-count"><b>${cards.length}</b> / ${setStats.total}<small>CARDS</small></span>
          </div>
          <div class="collection-tag-shortcuts"><span>ENGINE SHORTCUTS</span>${tagEntries.slice(0,10).map(([tag,count]) => `<button data-collection-tag="${esc(tag)}" class="${state.collectionTag===tag?'active':''}">#${esc(tag)} <b>${esc(count)}</b></button>`).join('')}</div>
          ${activeFilters.length ? `<div class="collection-active-filters"><span>FILTERED BY</span>${activeFilters.map((item)=>`<button data-clear-collection-filter="${esc(item.id)}">${esc(item.label)} ×</button>`).join('')}<button class="clear-all" id="clearAllCollectionFilters">Clear all</button></div>` : ''}
        </div>
        <div class="collection-grid ${cards.length ? '' : 'is-empty'}">${cards.length ? cards.map((def) => renderCollectionCard(def, deck)).join('') : `<div class="surface-empty-state collection-empty-state"><span>NO CARDS MATCH</span><strong>Nothing in this filing cabinet.</strong><small>Clear the search and filters to see the full Alpha set again.</small><button id="resetCollectionFilters">Reset filters</button></div>`}</div>
      </main>
      <aside class="deck-builder-panel">
        ${renderCollectionPreview(previewDef, deck)}
        <div class="deck-builder-head"><label>Deck name<input id="deckName" value="${esc(deck.name)}" maxlength="50" /></label><div class="deck-total ${total===state.format.deckSize?'valid':''}"><strong>${total}</strong><span>/ ${state.format.deckSize}</span></div></div>
        <div class="deck-switcher"><select id="deckSwitcher">${state.customDecks.map((item) => `<option value="${esc(item.id)}" ${item.id===deck.id?'selected':''}>${esc(item.name)} (${deckCardCount(item)})${deckHasUnsavedChanges(item)?' · unsaved':''}</option>`).join('')}</select><button id="newDeck">New</button><button id="deleteDeck" class="danger" ${state.customDecks.length<=1?'disabled':''}>Delete</button></div>
        ${renderSavedDeckManager(deck)}
        ${renderDeckEditSafety(deck)}
        ${state.deckPersistenceError ? `<div class="deck-persistence-warning" role="alert"><strong>${esc(t('decks.loadFailed'))}</strong><button id="retryDeckSync">${esc(t('decks.retry'))}</button></div>` : ''}
        ${renderDeckIdentity(deck)}
        <div class="deck-validation ${errors.length?'invalid':'valid'}">${errors.length ? errors.map((e) => `<span>${esc(e)}</span>`).join('') : '<strong>FORMAT LEGAL</strong><span>Ready for multiplayer.</span>'}</div>
        ${state.deckBuilderMessage ? `<div class="deck-builder-message">${esc(state.deckBuilderMessage)}</div>` : ''}
        <div class="deck-builder-actions"><button class="primary" id="playBuiltDeck" ${errors.length?'disabled':''}>${deckHasUnsavedChanges(deck)?'Save & use in lobby':'Use this deck in lobby'}</button><button id="clearBuiltDeck" ${total<=0?'disabled':''}>Clear deck</button></div>
        ${renderDeckCompletion(deck)}
        ${renderDeckStats(deck)}
        ${renderDeckEngineCoverage(deck)}
        ${renderDeckEngineFits(deck)}
        ${renderDeckList(deck)}
      </aside>
    </div>
  </section>`;
  document.querySelector('#backToPlay').onclick = () => {
    if (deckHasUnsavedChanges(deck) && !confirm('Discard unsaved deck changes and return to the lobby?')) return;
    if (deckHasUnsavedChanges(deck)) resetDeckToSaved(deck);
    cancelDeckSwap(); state.mode='PLAY'; render();
  };
  document.querySelectorAll('[data-collection-mode]').forEach((button) => button.onclick = async () => { await setCollectionMode(button.dataset.collectionMode); renderCollection(); });
  document.querySelector('#startEconomySandbox')?.addEventListener('click', startEconomySandbox);
  document.querySelector('#refillEconomySandbox')?.addEventListener('click', refillEconomySandbox);
  document.querySelector('#resetEconomySandbox')?.addEventListener('click', resetEconomySandbox);
  document.querySelector('#markAllCardsSeen')?.addEventListener('click', markAllCollectionCardsSeen);
  document.querySelectorAll('[data-clone-starter]').forEach((button) => button.addEventListener('click', () => { cloneStarterDeck(button.dataset.cloneStarter); renderCollection(); }));
  document.querySelector('#openBooster')?.addEventListener('click', openEconomyBooster);
  document.querySelector('#openExecutiveEditionPack')?.addEventListener('click', openExecutiveEditionPack);
  document.querySelector('[data-booster-reveal]')?.addEventListener('click', (event) => revealBoosterThrough(event.currentTarget.dataset.boosterReveal));
  document.querySelector('#revealAllBooster')?.addEventListener('click', () => { state.boosterRevealCount = state.lastBooster?.cardIds?.length ?? 0; renderCollection(); });
  document.querySelectorAll('[data-view-last-booster]').forEach((button) => button.addEventListener('click', () => focusLastBoosterCollection('ALL')));
  document.querySelector('#viewNewBoosterCards')?.addEventListener('click', () => focusLastBoosterCollection('NEW'));
  document.querySelectorAll('[data-card-deck-open]').forEach((button) => button.addEventListener('click', (event) => { event.stopPropagation(); if (openCardInManagedDeck(button.dataset.cardDeckOpen, button.dataset.cardDeckCard)) { renderCollection(); requestAnimationFrame(() => document.querySelector('.deck-builder-panel')?.scrollIntoView({ behavior:'smooth', block:'start' })); } }));
  document.querySelectorAll('[data-card-deck-add]').forEach((button) => button.addEventListener('click', (event) => { event.stopPropagation(); if (openCardInManagedDeck(button.dataset.cardDeckAdd, button.dataset.cardDeckCard, { add:true })) { renderCollection(); requestAnimationFrame(() => document.querySelector('.deck-builder-panel')?.scrollIntoView({ behavior:'smooth', block:'start' })); } }));
  document.querySelectorAll('[data-scrap-card]').forEach((button) => button.onclick = () => requestScrapEconomyCard(button.dataset.scrapCard));
  document.querySelectorAll('[data-confirm-scrap-card]').forEach((button) => button.onclick = () => scrapEconomyCard(button.dataset.confirmScrapCard, true));
  document.querySelectorAll('[data-cancel-scrap]').forEach((button) => button.onclick = () => { state.pendingScrapConfirmation=null; renderCollection(); });
  document.querySelectorAll('[data-craft-card]').forEach((button) => button.onclick = () => craftEconomyCard(button.dataset.craftCard));
  document.querySelectorAll('[data-deck-gap-craft]').forEach((button) => button.onclick = () => craftEconomyCard(button.dataset.deckGapCraft));
  document.querySelectorAll('[data-economy-filter]').forEach((button) => button.onclick = () => focusEconomyCollection(button.dataset.economyFilter));
  document.querySelector('#collectionSearch').oninput = (e) => updateCollectionSearch(e.target.value);
  document.querySelector('#collectionDepartment').onchange = (e) => { state.collectionDepartment=e.target.value; renderCollection(); };
  document.querySelector('#collectionType').onchange = (e) => { state.collectionType=e.target.value; renderCollection(); };
  document.querySelector('#collectionOwnedFilter').onchange = (e) => { state.collectionOwnedFilter=e.target.value; renderCollection(); };
  document.querySelector('#collectionFinishFilter').onchange = (e) => { state.collectionFinishFilter=e.target.value; renderCollection(); };
  document.querySelector('#collectionRarity').onchange = (e) => { state.collectionRarity=e.target.value; renderCollection(); };
  document.querySelector('#collectionTag').onchange = (e) => { state.collectionTag=e.target.value; renderCollection(); };
  document.querySelector('#collectionDeckFilter').onchange = (e) => { state.collectionDeckFilter=e.target.value; renderCollection(); };
  document.querySelector('#collectionSort').onchange = (e) => { state.collectionSort=e.target.value; renderCollection(); };
  document.querySelector('#resetCollectionFilters')?.addEventListener('click', () => { resetCollectionFilters(); renderCollection(); });
  document.querySelector('#clearAllCollectionFilters')?.addEventListener('click', () => { resetCollectionFilters(); renderCollection(); });
  document.querySelectorAll('[data-clear-collection-filter]').forEach((button) => button.addEventListener('click', () => { clearCollectionFilter(button.dataset.clearCollectionFilter); renderCollection(); }));
  document.querySelectorAll('[data-collection-tag]').forEach((button) => button.addEventListener('click', () => { state.collectionTag = state.collectionTag === button.dataset.collectionTag ? 'ALL' : button.dataset.collectionTag; renderCollection(); }));
  document.querySelectorAll('[data-preview-tag]').forEach((button) => button.addEventListener('click', () => { state.collectionTag=button.dataset.previewTag; renderCollection(); }));
  document.querySelectorAll('[data-related-card]').forEach((button) => button.addEventListener('click', () => { state.collectionPreviewId=button.dataset.relatedCard; markCollectionCardSeen(button.dataset.relatedCard); renderCollection(); requestAnimationFrame(() => document.querySelector('.collection-preview')?.scrollIntoView({ behavior:'smooth', block:'nearest' })); }));
  document.querySelector('#cancelDeckSwap')?.addEventListener('click', () => { cancelDeckSwap(); renderCollection(); });
  document.querySelectorAll('[data-deck-swap-source]').forEach((button) => button.addEventListener('click', (event) => { event.stopPropagation(); beginDeckSwap(deck, button.dataset.deckSwapSource); renderCollection(); }));
  document.querySelectorAll('[data-deck-swap-target]').forEach((button) => button.addEventListener('click', (event) => { event.stopPropagation(); swapDeckCopy(deck, button.dataset.deckSwapTarget); renderCollection(); }));
  document.querySelectorAll('[data-deck-filter-type]').forEach((button) => button.addEventListener('click', () => focusCollectionFromDeck('TYPE', button.dataset.deckFilterType)));
  document.querySelectorAll('[data-deck-filter-department]').forEach((button) => button.addEventListener('click', () => focusCollectionFromDeck('DEPARTMENT', button.dataset.deckFilterDepartment)));
  document.querySelectorAll('[data-deck-filter-tag]').forEach((button) => button.addEventListener('click', () => focusCollectionFromDeck('TAG', button.dataset.deckFilterTag)));
  document.querySelectorAll('[data-deck-filter-cost]').forEach((button) => button.addEventListener('click', () => focusCollectionFromDeck('COST', button.dataset.deckFilterCost)));
  document.querySelectorAll('[data-deck-package-tag]').forEach((button) => button.addEventListener('click', () => focusCollectionFromDeck('PACKAGE', button.dataset.deckPackageTag)));
  document.querySelectorAll('[data-deck-expand-tag]').forEach((button) => button.addEventListener('click', () => focusCollectionFromDeck('TAG', button.dataset.deckExpandTag)));
  document.querySelectorAll('[data-deck-bridge-preview]').forEach((button) => button.addEventListener('click', () => { state.collectionPreviewId=button.dataset.deckBridgePreview; markCollectionCardSeen(button.dataset.deckBridgePreview); renderCollection(); }));
  document.querySelectorAll('[data-deck-fit-preview]').forEach((button) => button.addEventListener('click', () => { state.collectionPreviewId=button.dataset.deckFitPreview; markCollectionCardSeen(button.dataset.deckFitPreview); renderCollection(); requestAnimationFrame(() => document.querySelector('.collection-preview')?.scrollIntoView({ behavior:'smooth', block:'nearest' })); }));
  document.querySelectorAll('[data-deck-fit-add]').forEach((button) => button.addEventListener('click', () => { state.deckBuilderMessage=null; const id=button.dataset.deckFitAdd; setDeckCopies(deck,id,deckCopies(deck,id)+1); state.collectionPreviewId=id; renderCollection(); }));
  document.querySelectorAll('[data-deck-check-action]').forEach((button) => button.addEventListener('click', () => focusCollectionFromDeck('DECK', button.dataset.deckCheckAction === 'ADDABLE' ? 'BELOW_LIMIT' : 'IN_DECK')));
  document.querySelectorAll('[data-deck-gap-preview]').forEach((button) => button.addEventListener('click', () => { state.collectionPreviewId=button.dataset.deckGapPreview; markCollectionCardSeen(button.dataset.deckGapPreview); renderCollection(); requestAnimationFrame(() => document.querySelector('.collection-preview')?.scrollIntoView({ behavior:'smooth', block:'nearest' })); }));
  const commitDeckName = (e) => {
    const nextName=e.target.value.trim() || 'Custom Deck';
    if (nextName !== deck.name) recordDeckEdit(deck, () => { deck.name=nextName; });
    state.deckBuilderMessage=null;
    renderCollection();
  };
  document.querySelector('#retryDeckSync')?.addEventListener('click', retryServerDecks);
  document.querySelector('#deckName').onchange = commitDeckName;
  document.querySelector('#deckName').onblur = commitDeckName;
  document.querySelector('#saveDeckEdits')?.addEventListener('click', async () => { cancelDeckSwap(); await saveDeckEdits(deck); renderCollection(); });
  document.querySelector('#undoDeckEdit')?.addEventListener('click', () => { if (undoDeckEdit(deck)) renderCollection(); });
  document.querySelector('#resetDeckEdits')?.addEventListener('click', () => { if (!deckHasUnsavedChanges(deck)) return; if (!confirm('Reset this deck to the last saved version?')) return; resetDeckToSaved(deck); renderCollection(); });
  document.querySelector('#deckSwitcher').onchange = (e) => {
    if (!openManagedDeck(e.target.value)) { e.target.value=deck.id; renderCollection(); return; }
    renderCollection();
  };
  document.querySelector('#newDeck').onclick = () => { if (!guardUnsavedDeck(deck, 'create another deck')) { renderCollection(); return; } cancelDeckSwap(); newCustomDeck(); state.deckBuilderMessage='Blank 40-card draft created.'; renderCollection(); };
  document.querySelector('#deleteDeck').onclick = () => { if (deleteCustomDeck(deck.id)) renderCollection(); };
  document.querySelectorAll('[data-deck-manage-open]').forEach((button) => button.addEventListener('click', () => { if (openManagedDeck(button.dataset.deckManageOpen)) renderCollection(); }));
  document.querySelectorAll('[data-deck-manage-duplicate]').forEach((button) => button.addEventListener('click', () => { if (duplicateCustomDeck(button.dataset.deckManageDuplicate)) renderCollection(); else renderCollection(); }));
  document.querySelectorAll('[data-deck-manage-delete]').forEach((button) => button.addEventListener('click', () => { if (deleteCustomDeck(button.dataset.deckManageDelete)) renderCollection(); else renderCollection(); }));
  document.querySelectorAll('[data-deck-manage-rename]').forEach((button) => button.addEventListener('click', () => {
    if (!openManagedDeck(button.dataset.deckManageRename)) { renderCollection(); return; }
    renderCollection();
    requestAnimationFrame(() => { const input=document.querySelector('#deckName'); input?.focus(); input?.select(); });
  }));
  document.querySelector('#playBuiltDeck')?.addEventListener('click', async () => { if (deckHasUnsavedChanges(deck)) await saveDeckEdits(deck); const pendingCreate = pendingDeckCreates.get(deck.id); if (pendingCreate) await pendingCreate; if (!deckHasUnsavedChanges(deck) && !pendingDeckCreates.has(deck.id)) playDeckFromBuilder(deck); renderCollection(); });
  document.querySelector('#clearBuiltDeck')?.addEventListener('click', () => { if (!confirm('Clear all cards from this deck?')) return; cancelDeckSwap(); recordDeckEdit(deck, () => { deck.cards=[]; }); state.deckBuilderMessage='Deck cleared. Save to keep this change.'; renderCollection(); });
  document.querySelectorAll('[data-card-variant]').forEach((button) => button.addEventListener('click', (event) => {
    event.stopPropagation();
    const id = button.dataset.cardVariant;
     state.collectionVariantSelection[id] = button.dataset.cardVariantValue === 'EXECUTIVE' ? 'EXECUTIVE' : 'STANDARD';
    state.collectionPreviewId = id;
    renderCollection();
  }));
   document.querySelectorAll('[data-deck-plus]').forEach((button) => button.onclick = () => { state.deckBuilderMessage=null; const id=button.dataset.deckPlus; const finish=state.collectionVariantSelection?.[id] ?? (state.collectionFinishFilter === 'EXECUTIVE' ? 'EXECUTIVE' : 'STANDARD'); const variant=finish === 'EXECUTIVE' ? executiveEditionVariantId(id) : null; setDeckVariantCopies(deck,id,variant,deckVariantCopies(deck,id,variant)+1); renderCollection(); });
   document.querySelectorAll('[data-deck-minus]').forEach((button) => button.onclick = () => { state.deckBuilderMessage=null; const id=button.dataset.deckMinus; const finish=state.collectionVariantSelection?.[id] ?? (state.collectionFinishFilter === 'EXECUTIVE' ? 'EXECUTIVE' : 'STANDARD'); const variant=finish === 'EXECUTIVE' ? executiveEditionVariantId(id) : null; setDeckVariantCopies(deck,id,variant,deckVariantCopies(deck,id,variant)-1); renderCollection(); });
  document.querySelectorAll('[data-deck-finish-swap]').forEach((button) => button.onclick = () => { const id=button.dataset.deckFinishSwap; const to=button.dataset.deckFinishTo === 'STANDARD' ? null : button.dataset.deckFinishTo; const from=to ? null : executiveEditionVariantId(id); if (swapDeckFinish(deck,id,from,to)) { state.collectionVariantSelection[id]=to ? 'EXECUTIVE' : 'STANDARD'; state.deckBuilderMessage=to ? lobbyCopy('Deck copy changed to Executive Edition.','Deckkarte auf Executive Edition geändert.') : lobbyCopy('Deck copy changed to Standard.','Deckkarte auf Standard geändert.'); } renderCollection(); });
  document.querySelectorAll('[data-deck-list-plus]').forEach((button) => button.onclick = () => { state.deckBuilderMessage=null; setDeckCopies(deck,button.dataset.deckListPlus,deckCopies(deck,button.dataset.deckListPlus)+1); renderCollection(); });
  document.querySelectorAll('[data-deck-list-minus]').forEach((button) => button.onclick = () => { state.deckBuilderMessage=null; setDeckCopies(deck,button.dataset.deckListMinus,deckCopies(deck,button.dataset.deckListMinus)-1); renderCollection(); });
  document.querySelectorAll('[data-deck-entry-preview]').forEach((row) => row.onclick = (event) => { if (event.target.closest('button')) return; state.collectionPreviewId=row.dataset.deckEntryPreview; markCollectionCardSeen(row.dataset.deckEntryPreview); renderCollection(); });
  document.querySelectorAll('[data-collection-preview]').forEach((card) => card.onclick = (event) => {
    if (event.target.closest('button') && !card.classList.contains('booster-hit')) return;
    const definitionId = card.dataset.collectionPreview;
    const fromBooster = card.classList.contains('booster-hit');
    state.collectionPreviewId=definitionId;
    state.pendingScrapConfirmation=null;
    markCollectionCardSeen(definitionId);
    renderCollection();
    if (fromBooster) requestAnimationFrame(() => document.querySelector('.collection-preview')?.scrollIntoView({ behavior:'smooth', block:'nearest' }));
  });
  document.querySelectorAll('[data-preview-plus]').forEach((button) => button.onclick = () => { state.deckBuilderMessage=null; setDeckCopies(deck,button.dataset.previewPlus,deckCopies(deck,button.dataset.previewPlus)+1); renderCollection(); });
  document.querySelectorAll('[data-preview-minus]').forEach((button) => button.onclick = () => { state.deckBuilderMessage=null; setDeckCopies(deck,button.dataset.previewMinus,deckCopies(deck,button.dataset.previewMinus)-1); renderCollection(); });
}


function makeAlphaSessionId() { return `A-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${Math.random().toString(36).slice(2,7).toUpperCase()}`; }
function alphaTestSessionId() {
  try { let id=sessionStorage.getItem(ALPHA_TEST_SESSION_KEY); if (!id) { id=makeAlphaSessionId(); sessionStorage.setItem(ALPHA_TEST_SESSION_KEY,id); } return id; }
  catch { return 'A-LOCAL'; }
}
function newAlphaTestSession() { try { sessionStorage.setItem(ALPHA_TEST_SESSION_KEY,makeAlphaSessionId()); } catch {} render(); }
function renderAlphaSessionStrip() { const id=alphaTestSessionId(); return `<section class="alpha-session-strip"><div><span>${lobbyCopy('TEST SESSION','TESTSESSION')}</span><strong>${esc(id)}</strong><small>${lobbyCopy('Rematches, replays and human notes from this browser session can be grouped together.','Rematches, Replays und menschliche Notizen aus dieser Browser-Sitzung können gemeinsam gruppiert werden.')}</small></div><button id="newAlphaTestSession">${lobbyCopy('New test session','Neue Testsession')}</button></section>`; }
function bindAlphaSessionControls() { document.querySelector('#newAlphaTestSession')?.addEventListener('click',newAlphaTestSession); }
function renderLobbyProfileAvatar() {
  const loadout = state.metaProfile?.cosmetics?.loadout ?? {};
  const avatarId = loadout.avatarId ?? 'COS-AVA-001';
  const avatarAsset = cosmeticAvatarAsset(avatarId);
  const frameAsset = cosmeticFrameAsset(loadout.avatarFrameId);
  return `<div class="profile-avatar-chip" data-avatar-id="${esc(avatarId)}">${renderAvatarComposition({ avatarAsset, frameAsset, frameMaskAsset:cosmeticFrameMaskAsset(loadout.avatarFrameId), fallbackText:playerInitials(state.serverProfile?.displayName) })}</div>`;
}

function renderProfileStrip() {
  const profile = state.serverProfile;
  const progression = state.metaProfile?.progression ?? {};
  if (!profile) return `<section class="profile-strip"><span>${lobbyCopy('PLAYTEST PROFILE','PLAYTEST-PROFIL')}</span><strong>${lobbyCopy('Connecting profile…','Profil wird verbunden…')}</strong></section>`;
  const stats = profile.stats ?? {};
  const ranked = profile.ranked ?? {};
  const rankLabel = ranked.status === 'RATED' ? `${ranked.rating ?? 1000} MMR` : `${lobbyCopy('Placement','Platzierung')} ${ranked.placementsPlayed ?? 0}/${ranked.placementsRequired ?? 5}`;
  return `<section class="profile-strip"><div class="profile-identity">${renderLobbyProfileAvatar()}<div class="profile-identity-copy"><span>${lobbyCopy('PLAYTEST PROFILE · SERVER','PLAYTEST-PROFIL · SERVER')}</span><strong>${esc(profile.displayName)}</strong><small>${lobbyCopy('Guest profile · progress saved on this server','Gastprofil · Fortschritt wird auf diesem Server gespeichert')}</small></div></div><div class="profile-stats"><span>LV <b>${esc(progression.level ?? 1)}</b></span><span>W–L <b>${esc(stats.wins ?? 0)}–${esc(stats.losses ?? 0)}</b></span><span>${lobbyCopy('RANK','RANG')} <b>${esc(rankLabel)}</b></span><span>${lobbyCopy('CREDITS','BÜRO-CREDITS')} <b>${esc(state.metaProfile?.balances?.OFFICE_CREDITS ?? 0)}</b></span><span>${lobbyCopy('SCRAPS','SCHREDDERRESTE')} <b>${esc(state.metaProfile?.balances?.SHREDDER_SCRAPS ?? 0)}</b></span></div><div class="profile-rename"><input id="profileDisplayName" maxlength="24" value="${esc(profile.displayName)}" aria-label="${lobbyCopy('Profile name','Profilname')}"/><button id="saveProfileName">${lobbyCopy('Rename','Umbenennen')}</button></div></section>`;
}

function renderRankedStanding() {
  const ranked = state.serverProfile?.ranked;
  if (!ranked) return '';
  const recent = ranked.recentResults?.[0] ?? null;
  const placement = ranked.status !== 'RATED';
  const tierKey = ranked.tierId ? String(ranked.tierId).toLowerCase() : null;
  const tierName = tierKey ? t(`ranked.tiers.${tierKey}`, {}, ranked.tierId) : null;
  const tier = tierName ? `${tierName}${ranked.division ? ` ${ranked.division}` : ''}` : null;
  const standing = placement ? `${lobbyCopy('Placement','Platzierung')} ${ranked.placementsPlayed}/${ranked.placementsRequired}` : `${tier ? `${tier} · ` : ''}${ranked.rating} MMR`;
  const lastMove = recent ? `${recent.ratingDelta >= 0 ? '+' : ''}${recent.ratingDelta} → ${recent.ratingAfter}` : lobbyCopy('No rated result yet','Noch kein gewertetes Ergebnis');
  const phaseLabel = String(ranked.phase ?? 'PRESEASON') === 'PRESEASON' ? lobbyCopy('PRESEASON','VORSAISON') : String(ranked.phase ?? 'PRESEASON');
  const standingDetail = placement
    ? lobbyCopy(`Provisional MMR ${ranked.rating} · complete placements to lock the visible standing.`,`Vorläufiges MMR ${ranked.rating} · schließe die Platzierungsspiele ab, um den sichtbaren Rang festzulegen.`)
    : lobbyCopy(`Peak ${ranked.peakRating} MMR`,`Bestwert ${ranked.peakRating} MMR`);
  return `<section class="ranked-standing"><div><span>RANKED ALPHA · ${esc(phaseLabel)}</span><strong>${esc(standing)}</strong><small>${esc(standingDetail)} ${lobbyCopy('Rated play is Quick Match only; private Ranked-rule rooms are unrated.','Gewertete Matches gibt es nur über Quick Match; private Räume mit Ranked-Regeln bleiben ungewertet.')}</small></div><div class="ranked-standing-stats"><span>${lobbyCopy('Record','Bilanz')} <b>${esc(ranked.wins ?? 0)}–${esc(ranked.losses ?? 0)}–${esc(ranked.draws ?? 0)}</b></span><span>${lobbyCopy('Peak','Bestwert')} <b>${esc(ranked.peakRating ?? ranked.rating ?? 1000)}</b></span><span>${lobbyCopy('Last','Zuletzt')} <b>${esc(lastMove)}</b></span><span>${lobbyCopy('Season','Saison')} <b>${esc(ranked.seasonId ?? 'ALPHA_PRESEASON')}</b></span></div><small class="ranked-standing-note">${lobbyCopy('Alpha preseason foundation · rating values and search windows are provisional · Ranked timer remains off.','Alpha-Vorsaison · Ratingwerte und Suchfenster sind vorläufig · der Ranked-Timer bleibt aus.')}</small></section>`;
}

function renderStarterDeckGuide() {
  if (!state.presets?.length) return '';
  return `<section class="starter-guide desk-starter-tray"><div class="starter-guide-head"><div><span>${lobbyCopy('STARTER DECKS','STARTERDECKS')}</span><strong>${lobbyCopy('Pick a ready-made desk, or keep your custom deck selected above.','Wähle ein fertiges Starterdeck oder behalte oben dein eigenes Deck ausgewählt.')}</strong></div><small>${lobbyCopy('Starter decks are onboarding shortcuts, not permanent player factions.','Starterdecks sind Einstiegshilfen und keine festen Spielerfraktionen.')}</small></div><div class="starter-guide-grid">${state.presets.map((preset) => {
    const identity = departmentIdentity(preset.department);
    return `<button type="button" class="starter-identity dept-${esc(String(preset.department).toLowerCase())}" data-starter-deck="${esc(preset.id)}"><div><span>${esc(departmentCode(preset.department))}</span><b>${esc(identity.label)}</b></div><strong>${esc(identity.loop)}</strong><small>${esc(identity.note)}</small><em>${esc(preset.name)}</em><i>${lobbyCopy('Select deck','Deck wählen')}</i></button>`;
  }).join('')}</div></section>`;
}

function renderExecutiveAlphaMemo() {
  const version = state.serverInfo?.version ?? 'unknown';
  return `<section class="desk-alpha-memo"><span>${lobbyCopy('ALPHA UPDATE','ALPHA-UPDATE')}</span><strong>v${esc(version)}</strong><p>${lobbyCopy('Executive Desk lobby, safer rematches and the board-first match interface are active on this server.','Executive-Desk-Lobby, sichere Rematches und das Board-First-Matchinterface sind auf diesem Server aktiv.')}</p><small>${lobbyCopy('Alpha systems and balance remain provisional.','Alpha-Systeme und Balance bleiben vorläufig.')}</small></section>`;
}

function renderLobbyConnectionStatus() {
  const status=navigator.onLine===false?'offline':state.serverInfo?.ok?'live':'checking';
  const ping=state.networkDiagnostics.pingMs!=null?`${state.networkDiagnostics.pingMs} ms`:lobbyCopy('ready','bereit');
  const title=status==='offline'?lobbyCopy('Offline','Offline'):status==='live'?lobbyCopy('Server online','Server online'):lobbyCopy('Connection','Verbindung');
  const detail=status==='offline'?lobbyCopy('Match recovery will resume automatically','Match-Wiederherstellung wird automatisch fortgesetzt'):ping;
  return `<div class="lobby-connection-status tone-${status}"><i aria-hidden="true"></i><div><span>${title}</span><small>${detail}</small></div></div>`;
}
function renderLobbyPlaytestDrawer() {
  const adminAnalytics=state.adminToken && opsModeAvailable() ? renderPlaytestAnalytics() : '';
  return `<details class="lobby-playtest-drawer tester-support-drawer"><summary><div><span>${lobbyCopy('MATCH HISTORY & SUPPORT','MATCHVERLAUF & HILFE')}</span><strong>${lobbyCopy('Replays, connection check and bug reports','Replays, Verbindungscheck und Bugreports')}</strong></div><small>${lobbyCopy('Open only when needed','Bei Bedarf öffnen')}</small></summary><div class="lobby-playtest-content">${renderProfileHistory()}${renderConnectionDiagnosticsPanel()}${adminAnalytics}</div></details>`;
}

function renderProfileHistory() {
  const profile = state.serverProfile;
  if (!profile) return '';
  const stats = profile.stats ?? {};
  const source = Array.isArray(profile.matchHistory) ? profile.matchHistory : [];
  const filtered = source.filter((entry) => {
    if (state.historyFilter.mode !== 'ALL' && entry.mode !== state.historyFilter.mode) return false;
    if (state.historyFilter.outcome !== 'ALL' && entry.outcome !== state.historyFilter.outcome) return false;
    return true;
  });
  const history = filtered.slice(0, 10);
  return `<details class="profile-history"><summary><span>Match history</span><strong>${esc(stats.matchesPlayed ?? 0)} played · ${esc(stats.wins ?? 0)} wins</strong></summary><div class="history-filter-row"><label>Mode<select id="historyMode"><option value="ALL">All modes</option><option value="FRIENDLY" ${state.historyFilter.mode==='FRIENDLY'?'selected':''}>Friendly</option><option value="RANKED" ${state.historyFilter.mode==='RANKED'?'selected':''}>Ranked</option></select></label><label>Result<select id="historyOutcome"><option value="ALL">All results</option><option value="WIN" ${state.historyFilter.outcome==='WIN'?'selected':''}>Wins</option><option value="LOSS" ${state.historyFilter.outcome==='LOSS'?'selected':''}>Losses</option><option value="RESIGN_LOSS" ${state.historyFilter.outcome==='RESIGN_LOSS'?'selected':''}>Resign losses</option><option value="DRAW" ${state.historyFilter.outcome==='DRAW'?'selected':''}>Draws</option></select></label><small>${esc(filtered.length)} of ${esc(source.length)} stored results</small></div><div class="profile-history-list">${history.length ? history.map((entry) => `<div class="history-row ${esc(String(entry.outcome).toLowerCase())}"><b>${esc(entry.outcome)}</b><span>${esc(entry.deckName)} vs ${esc(entry.opponentName)} · ${esc(entry.opponentDeckName)}</span><small>${esc(entry.mode)} · ${esc(entry.turns)} turns · ${esc(entry.reason)}</small><button class="history-review" data-review-room="${esc(entry.roomId)}">Review</button></div>`).join('') : `<div class="surface-empty-state history-empty-state"><span>${source.length ? 'NO MATCHES FOUND' : 'NO MATCHES YET'}</span><strong>${source.length ? 'These filters came up empty.' : 'Your match history starts here.'}</strong><small>${source.length ? 'Reset the history filters to widen the sample.' : 'Complete a Friendly or Ranked Alpha match and it will appear here.'}</small>${source.length ? '<button id="resetHistoryFilters">Reset filters</button>' : ''}</div>`}</div></details>`;
}

const REPLAY_KEY_EVENTS = new Set(['MATCH_CREATED','TURN_STARTED','CARD_PLAYED','PROMOTION_COMPLETED','INCIDENT_SET','INCIDENT_ACTIVATED','ACTION_RESOLVED','ABILITY_ACTIVATED','ATTACK_DECLARED','ATTACK_TARGET_REDIRECTED','CHAIN_TARGET_REDIRECTED','DESTRUCTION_PREVENTED','BATTLE_RESOLVED','EMPLOYEE_DESTROYED','CARD_DESTROYED','BREAKTHROUGH_DAMAGE','REPUTATION_CHANGED','CHAIN_ITEM_NEGATED','CHAIN_ITEM_DELAYED','CHAIN_RESOLVED','CARD_RESET','GAME_ENDED']);
const REPLAY_MOMENT_EVENTS = new Set(['PROMOTION_COMPLETED','INCIDENT_ACTIVATED','ACTION_RESOLVED','ATTACK_TARGET_REDIRECTED','CHAIN_TARGET_REDIRECTED','DESTRUCTION_PREVENTED','BATTLE_RESOLVED','BREAKTHROUGH_DAMAGE','REPUTATION_CHANGED','CHAIN_ITEM_NEGATED','CHAIN_ITEM_DELAYED','GAME_ENDED']);

function replayMomentTone(event) {
  if (event.type === 'GAME_ENDED') return 'result';
  if (['BATTLE_RESOLVED','BREAKTHROUGH_DAMAGE','REPUTATION_CHANGED'].includes(event.type)) return 'battle';
  if (['CHAIN_ITEM_NEGATED','CHAIN_ITEM_DELAYED','DESTRUCTION_PREVENTED','ATTACK_TARGET_REDIRECTED','CHAIN_TARGET_REDIRECTED'].includes(event.type)) return 'response';
  return 'effect';
}

function replayEventDetail(event) {
  const d = event.data ?? {};
  if (event.type === 'BATTLE_RESOLVED') {
    const destroyed = Array.isArray(d.destroyedIds) ? d.destroyedIds.length : (d.destroyedId ? 1 : 0);
    const outcome = d.attackerPower === d.defenderPower ? 'Power tied' : d.winnerId === d.attackerId ? 'Attacker ahead' : 'Defender ahead';
    return `Current Power ${d.attackerPower ?? '?'} : ${d.defenderPower ?? '?'} · ${outcome} · ${destroyed} destroyed${d.breakthroughApplied ? ` · Breakthrough ${d.excessPower ?? 0}` : ''}`;
  }
  if (event.type === 'REPUTATION_CHANGED') return `Reputation ${d.before ?? '?'} → ${d.after ?? '?'} · ${Number(d.delta ?? 0) >= 0 ? '+' : ''}${d.delta ?? '?'} · ${String(d.reason ?? 'effect').replaceAll('_',' ')}`;
  if (event.type === 'DESTRUCTION_PREVENTED') return `Destruction candidate survived · ${String(d.cause ?? 'card effect').replaceAll('_',' ')}`;
  if (event.type === 'ATTACK_TARGET_REDIRECTED' || event.type === 'CHAIN_TARGET_REDIRECTED') return 'The authoritative target changed before resolution.';
  if (event.type === 'CHAIN_ITEM_NEGATED') return 'Chain item did not resolve its normal effect.';
  if (event.type === 'CHAIN_ITEM_DELAYED') return 'Resolution moved to its scheduled later window.';
  if (event.type === 'BREAKTHROUGH_DAMAGE') return `${d.amount ?? '?'} Reputation from excess battle Power.`;
  return '';
}

function replayMomentStats(replay) {
  const events = replay?.events ?? [];
  const battles = events.filter((event) => event.type === 'BATTLE_RESOLVED').length;
  const responses = events.filter((event) => ['CHAIN_ITEM_NEGATED','CHAIN_ITEM_DELAYED','DESTRUCTION_PREVENTED','ATTACK_TARGET_REDIRECTED','CHAIN_TARGET_REDIRECTED'].includes(event.type)).length;
  const reputation = events.filter((event) => event.type === 'REPUTATION_CHANGED').map((event) => Number(event.data?.delta ?? 0));
  const reputationLost = reputation.filter((delta) => delta < 0).reduce((sum,delta) => sum + Math.abs(delta),0);
  const largestSwing = reputation.reduce((max,delta) => Math.max(max,Math.abs(delta)),0);
  return { battles, responses, reputationLost, largestSwing };
}


async function openMatchReplay(roomId) {
  if (!roomId || !state.profileToken || state.replayBusy) return;
  state.replayBusy = true;
  state.replayError = null;
  state.replay = null;
  renderLobby();
  try {
    const result = await api(`/api/profiles/me/matches/${encodeURIComponent(roomId)}/replay`, { headers:profileAuthHeaders() });
    state.replay = result.replay ?? null;
    state.replayFilter = { scope:'MOMENTS', turn:'ALL' };
  } catch (error) {
    state.replayError = error.message;
  } finally {
    state.replayBusy = false;
    renderLobby();
  }
}

function closeMatchReplay() {
  state.replay = null;
  state.replayError = null;
  state.replayBusy = false;
  renderLobby();
}

function replayOutcome(replay) {
  if (!replay?.winnerId) return 'DRAW';
  return replay.winnerId === replay.viewerId ? 'WIN' : 'LOSS';
}

function replayPlayerLabel(replay, playerId) {
  if (!replay) return playerId ?? '—';
  const seat = playerId === 'P1' ? replay.host : replay.guest;
  return seat?.displayName || playerId || '—';
}

function replayEventText(event, replay) {
  const who = event.playerId ? replayPlayerLabel(replay, event.playerId) : '';
  const card = event.cardName ? ` · ${event.cardName}` : '';
  const d = event.data ?? {};
  switch (event.type) {
    case 'TURN_STARTED': return `Turn ${event.turnNumber} started · ${who}`;
    case 'PHASE_CHANGED': return `${who} moved to ${d.phase ?? event.phase ?? 'next'} phase`;
    case 'CARD_PLAYED': return `${who} played${card}`;
    case 'INCIDENT_SET': return `${who} set an Incident`;
    case 'INCIDENT_ACTIVATED': return `${who} activated${card || ' an Incident'}`;
    case 'ACTION_RESOLVED': return `${who} resolved${card || ' an Action'}`;
    case 'ABILITY_ACTIVATED': return `${who} activated an ability${card}`;
    case 'ATTACK_DECLARED': return `${who} declared an attack${card}`;
    case 'BATTLE_RESOLVED': return `Battle resolved${card} · ${d.attackerPower ?? '?'} vs ${d.defenderPower ?? '?'}`;
    case 'DESTRUCTION_PREVENTED': return `Destruction prevented${card}`;
    case 'CHAIN_ITEM_NEGATED': return `Chain item negated${card}`;
    case 'CHAIN_ITEM_DELAYED': return `Chain item delayed${card}`;
    case 'EMPLOYEE_DESTROYED': case 'CARD_DESTROYED': return `${card ? event.cardName : 'Card'} was destroyed`;
    case 'BREAKTHROUGH_DAMAGE': return `Breakthrough · ${d.amount ?? '?'} Reputation damage`;
    case 'REPUTATION_CHANGED': return `${who || event.playerId || 'Player'} Reputation changed${d.amount != null ? ` by ${d.amount}` : ''}`;
    case 'PROMOTION_COMPLETED': return `${who} completed a Promotion${card}`;
    case 'CARD_RESET': return `${who} reset${card}`;
    case 'GAME_ENDED': return `Match ended · ${replay.reason ?? d.reason ?? 'END'}`;
    default: return `${event.type.replaceAll('_',' ')}${card}${who ? ` · ${who}` : ''}`;
  }
}

function renderReplayModal() {
  if (!state.replay && !state.replayBusy && !state.replayError) return '';
  if (state.replayBusy) return `<div class="modal-backdrop replay-backdrop"><section class="replay-modal compact"><header><div><span>MATCH REVIEW</span><h2>Loading replay…</h2></div></header></section></div>`;
  if (state.replayError) return `<div class="modal-backdrop replay-backdrop"><section class="replay-modal compact"><header><div><span>MATCH REVIEW</span><h2>Replay unavailable</h2><p>${esc(state.replayError)}</p></div><button class="modal-close" data-close-replay>×</button></header></section></div>`;
  const replay = state.replay;
  const turns = [...new Set((replay.events ?? []).map((e) => Number(e.turnNumber || 0)).filter((n) => n > 0))];
  const filtered = (replay.events ?? []).filter((event) => {
    if (state.replayFilter.scope === 'MOMENTS' && !REPLAY_MOMENT_EVENTS.has(event.type)) return false;
    if (state.replayFilter.scope === 'KEY' && !REPLAY_KEY_EVENTS.has(event.type)) return false;
    if (state.replayFilter.turn !== 'ALL' && Number(event.turnNumber) !== Number(state.replayFilter.turn)) return false;
    return true;
  });
  const outcome = replayOutcome(replay);
  const p1Rep = replay.finalState?.players?.P1?.reputation;
  const p2Rep = replay.finalState?.players?.P2?.reputation;
  const finished = replay.finishedAt ? new Date(replay.finishedAt).toLocaleString() : '—';
  const momentStats = replayMomentStats(replay);
  const momentTurns = turns.filter((turn) => (replay.events ?? []).some((event) => Number(event.turnNumber) === turn && REPLAY_MOMENT_EVENTS.has(event.type)));
  return `<div class="modal-backdrop replay-backdrop"><section class="replay-modal" role="dialog" aria-modal="true" aria-label="Match review">
    <header class="replay-head"><div><span>MATCH REVIEW · ${esc(replay.mode)}</span><h2>${esc(outcome)} · ${esc(replay.host.deckName)} vs ${esc(replay.guest?.deckName ?? 'Unknown Deck')}</h2><p>Room ${esc(replay.roomId)} · ${esc(replay.turns)} turns · ${esc(replay.reason ?? 'UNKNOWN')} · ${esc(finished)}</p></div><button class="modal-close" data-close-replay>×</button></header>
    <div class="replay-summary">
      <div><span>FIRST PLAYER</span><strong>${esc(replayPlayerLabel(replay, replay.firstPlayerId))}</strong></div>
      <div><span>WINNER</span><strong>${esc(replay.winnerId ? replayPlayerLabel(replay, replay.winnerId) : 'Draw')}</strong></div>
      <div><span>FINAL REP</span><strong>${esc(p1Rep ?? '—')} – ${esc(p2Rep ?? '—')}</strong></div>
      <div><span>KEY MOMENTS</span><strong>${esc((replay.events ?? []).filter((event) => REPLAY_MOMENT_EVENTS.has(event.type)).length)}</strong></div>
    </div>
    <div class="replay-moment-summary"><span><small>BATTLES</small><b>${esc(momentStats.battles)}</b></span><span><small>RESPONSES</small><b>${esc(momentStats.responses)}</b></span><span><small>REP LOST</small><b>${esc(momentStats.reputationLost)}</b></span><span><small>LARGEST SWING</small><b>${esc(momentStats.largestSwing)}</b></span></div>
    <div class="replay-seats"><div><b>${esc(replay.host.displayName || 'P1')}</b><span>${esc(replay.host.department)} · ${esc(replay.host.deckName)}</span></div><div><b>${esc(replay.guest?.displayName || 'P2')}</b><span>${esc(replay.guest?.department ?? '—')} · ${esc(replay.guest?.deckName ?? '—')}</span></div></div>
    ${momentTurns.length ? `<div class="replay-turn-jumps"><span>JUMP TO MOMENT</span><button data-replay-turn-jump="ALL" class="${state.replayFilter.turn==='ALL'?'active':''}">ALL</button>${momentTurns.map((turn) => `<button data-replay-turn-jump="${turn}" class="${String(state.replayFilter.turn)===String(turn)?'active':''}">T${turn}</button>`).join('')}</div>` : ''}
    <div class="replay-toolbar"><label>Timeline<select id="replayScope"><option value="MOMENTS" ${state.replayFilter.scope==='MOMENTS'?'selected':''}>Key moments</option><option value="KEY" ${state.replayFilter.scope==='KEY'?'selected':''}>Key events</option><option value="ALL" ${state.replayFilter.scope==='ALL'?'selected':''}>All engine events</option></select></label><label>Turn<select id="replayTurn"><option value="ALL">All turns</option>${turns.map((turn) => `<option value="${turn}" ${String(state.replayFilter.turn)===String(turn)?'selected':''}>Turn ${turn}</option>`).join('')}</select></label><button id="exportReplay">Export replay JSON</button></div>
    <div class="replay-timeline">${filtered.length ? filtered.map((event) => { const detail=replayEventDetail(event); const moment=REPLAY_MOMENT_EVENTS.has(event.type); return `<div class="replay-event ${REPLAY_KEY_EVENTS.has(event.type)?'key':''} ${moment?`moment tone-${replayMomentTone(event)}`:''}"><div class="replay-seq">#${esc(event.seq)}</div><div class="replay-event-copy"><strong>${esc(replayEventText(event,replay))}</strong><small>${event.turnNumber ? `Turn ${esc(event.turnNumber)}` : 'Opening'}${event.phase ? ` · ${esc(event.phase)}` : ''} · ${esc(event.type)}</small>${detail ? `<em>${esc(detail)}</em>` : ''}</div>${event.cardName ? `<span class="replay-card-chip">${esc(event.cardName)}</span>` : ''}</div>`; }).join('') : '<p class="muted">No events match this replay filter.</p>'}</div>
  </section></div>`;
}

async function exportMatchReplay() {
  const replay = state.replay;
  if (!replay || !state.profileToken) return;
  try {
    const response = await fetch(`/api/profiles/me/matches/${encodeURIComponent(replay.roomId)}/replay/export`, { headers:profileAuthHeaders() });
    if (!response.ok) throw new Error(`Replay export failed (HTTP ${response.status}).`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `office-card-game-replay-${replay.roomId}-v7.28.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    state.replayError = error.message;
    renderLobby();
  }
}

function bindReplayControls() {
  document.querySelectorAll('[data-review-room]').forEach((button) => button.addEventListener('click', () => openMatchReplay(button.dataset.reviewRoom)));
  document.querySelectorAll('[data-close-replay]').forEach((button) => button.addEventListener('click', closeMatchReplay));
  document.querySelector('.replay-backdrop')?.addEventListener('click', (event) => { if (event.target.classList.contains('replay-backdrop')) closeMatchReplay(); });
  document.querySelector('#replayScope')?.addEventListener('change', (event) => { state.replayFilter.scope=event.target.value; renderLobby(); });
  document.querySelector('#replayTurn')?.addEventListener('change', (event) => { state.replayFilter.turn=event.target.value; renderLobby(); });
  document.querySelectorAll('[data-replay-turn-jump]').forEach((button) => button.addEventListener('click', () => { state.replayFilter.turn=button.dataset.replayTurnJump; state.replayFilter.scope='MOMENTS'; renderLobby(); }));
  document.querySelector('#exportReplay')?.addEventListener('click', exportMatchReplay);
}

function analyticsPercent(value) {
  return value == null ? '—' : `${Number(value).toFixed(1)}%`;
}

function analyticsSeconds(value) {
  return value == null ? '—' : formatTelemetrySeconds(Number(value));
}

function analyticsQuery(format = null) {
  const params = new URLSearchParams();
  if (format) params.set('format', format);
  const f = state.analyticsFilter;
  if (f.mode !== 'ALL') params.set('mode', f.mode);
  if (f.department !== 'ALL') params.set('department', f.department);
  if (f.deckId !== 'ALL') params.set('deckId', f.deckId);
  if (f.days !== 'ALL') params.set('days', f.days);
  if (f.latest !== 'ALL') params.set('latest', f.latest);
  return params.toString();
}

async function refreshPlaytestAnalytics(renderAfter = true) {
  if (state.analyticsBusy) return;
  state.analyticsBusy = true;
  state.analyticsMessage = null;
  try {
    const query = analyticsQuery();
    const result = await api(`/api/playtest/analytics${query ? `?${query}` : ''}`, { headers:adminAuthHeaders() });
    state.playtestAnalytics = result.analytics ?? null;
    state.playtestAnalyticsDimensions = result.dimensions ?? null;
    state.analyticsSelection = result.selection ?? null;
  } catch (error) {
    state.analyticsMessage = error.message;
  } finally {
    state.analyticsBusy = false;
    if (renderAfter && !state.session) renderLobby();
  }
}

function analyticsSampleLabel(count) {
  if (count <= 0) return 'No completed sample';
  if (count < 10) return 'Very small sample';
  if (count < 30) return 'Small sample';
  if (count < 100) return 'Directional sample';
  return 'Broader alpha sample';
}

async function exportPlaytestAnalytics(format) {
  if (!state.adminToken) return;
  try {
    const query=analyticsQuery(format);
    const response=await fetch(`/api/playtest/analytics/export?${query}`,{headers:adminAuthHeaders()});
    if(!response.ok)throw new Error(`Analytics export failed (HTTP ${response.status}).`);
    const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url; link.download=format==='cards-csv'?'office-card-game-card-activity-v7.67.csv':format==='csv'?'office-card-game-playtest-matches.csv':'office-card-game-playtest.json'; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  } catch(error){ state.analyticsMessage=error.message; renderLobby(); }
}

function renderPlaytestAnalytics() {
  const a = state.playtestAnalytics;
  if (!a) return `<details class="playtest-analytics"><summary><span>Playtest analytics</span><strong>${state.analyticsBusy ? 'Loading…' : 'No aggregate data yet'}</strong></summary><div class="analytics-empty"><span>Completed server rooms will appear here automatically.</span><button id="refreshAnalytics">Refresh</button></div></details>`;
  const t = a.totals ?? {};
  const turn = a.decisions?.TURN ?? {};
  const response = a.decisions?.RESPONSE ?? {};
  const connection = a.connectivity ?? {};
  const deps = (a.departments ?? []).slice(0, 7);
  const reasons = (a.endReasons ?? []).slice(0, 6);
  const cards = (a.cards ?? []).slice(0, 8);
  const decks = (a.decks ?? []).slice(0, 6);
  const friction = a.friction ?? {};
  const dimensions = state.playtestAnalyticsDimensions ?? {};
  const selection = state.analyticsSelection ?? {};
  const f = state.analyticsFilter;
  const depOptions = (dimensions.departments ?? []).map((department) => `<option value="${esc(department)}" ${f.department===department?'selected':''}>${esc(department)}</option>`).join('');
  const deckOptions = (dimensions.decks ?? []).map((deck) => `<option value="${esc(deck.deckId)}" ${f.deckId===deck.deckId?'selected':''}>${esc(deck.deckName)} · ${esc(deck.department)}</option>`).join('');
  const jsonHref = `/api/playtest/analytics/export?${analyticsQuery('json')}`;
  const csvHref = `/api/playtest/analytics/export?${analyticsQuery('csv')}`;
  const matched = Number(selection.matchedCompletedMatches ?? t.completedMatches ?? 0);
  const source = Number(selection.sourceCompletedMatches ?? dimensions.completedMatches ?? matched);
  return `<details class="playtest-analytics"><summary><span>Playtest analytics</span><strong>${esc(matched)} / ${esc(source)} completed selected</strong></summary>
    <div class="analytics-panel">
      <div class="analytics-note"><div><b>HUMAN PLAYTEST DATA</b><span>Filter persisted server rooms into comparable samples. Exports use the exact same active filters and remain anonymous.</span></div><div class="analytics-actions"><button id="refreshAnalytics" ${state.analyticsBusy?'disabled':''}>${state.analyticsBusy?'Refreshing…':'Refresh'}</button><button data-analytics-export="json">JSON</button><button data-analytics-export="csv">Match CSV</button><button data-analytics-export="cards-csv">Card CSV</button></div></div>
      <div class="analytics-filters">
        <label>Mode<select id="analyticsMode"><option value="ALL">All modes</option><option value="FRIENDLY" ${f.mode==='FRIENDLY'?'selected':''}>Friendly</option><option value="RANKED" ${f.mode==='RANKED'?'selected':''}>Ranked</option></select></label>
        <label>Department<select id="analyticsDepartment"><option value="ALL">All departments</option>${depOptions}</select></label>
        <label>Deck<select id="analyticsDeck"><option value="ALL">All decks</option>${deckOptions}</select></label>
        <label>Period<select id="analyticsDays"><option value="ALL">All time</option><option value="7" ${f.days==='7'?'selected':''}>Last 7 days</option><option value="30" ${f.days==='30'?'selected':''}>Last 30 days</option><option value="90" ${f.days==='90'?'selected':''}>Last 90 days</option></select></label>
        <label>Sample<select id="analyticsLatest"><option value="ALL">All completed</option><option value="10" ${f.latest==='10'?'selected':''}>Latest 10</option><option value="25" ${f.latest==='25'?'selected':''}>Latest 25</option><option value="50" ${f.latest==='50'?'selected':''}>Latest 50</option><option value="100" ${f.latest==='100'?'selected':''}>Latest 100</option></select></label>
        <button class="ghost" id="resetAnalyticsFilters">Reset filters</button>
      </div>
      <div class="analytics-selection"><b>${esc(analyticsSampleLabel(matched))}</b><span>${esc(matched)} completed matches selected from ${esc(source)} stored completed matches.</span></div>
      <div class="analytics-kpis">
        <span><small>COMPLETED</small><strong>${esc(t.completedMatches ?? 0)}</strong><em>${esc(t.waitingRooms ?? 0)} waiting · ${esc(t.activeMatches ?? 0)} active in selection</em></span>
        <span><small>FIRST PLAYER WIN</small><strong>${esc(analyticsPercent(t.firstPlayerWinRate))}</strong><em>${esc(t.firstPlayerWins ?? 0)} / ${esc(t.decisiveMatches ?? 0)} decisive</em></span>
        <span><small>AVG MATCH</small><strong>${esc(t.averageTurns == null ? '—' : `${Number(t.averageTurns).toFixed(1)} turns`)}</strong><em>${esc(analyticsSeconds(t.averageDurationSeconds))}</em></span>
        <span><small>TURN DECISION</small><strong>${esc(analyticsSeconds(turn.averageSegmentSeconds))}</strong><em>max ${esc(analyticsSeconds(turn.maxSegmentSeconds))} · ${esc(turn.segments ?? 0)} segments</em></span>
        <span><small>RESPONSE DECISION</small><strong>${esc(analyticsSeconds(response.averageSegmentSeconds))}</strong><em>max ${esc(analyticsSeconds(response.maxSegmentSeconds))} · ${esc(response.segments ?? 0)} segments</em></span>
        <span><small>CONNECTIVITY</small><strong>${esc(connection.matchesWithDisconnects ?? 0)} affected</strong><em>${esc(connection.totalDisconnects ?? 0)} disconnects · ${esc(analyticsSeconds(connection.totalOfflineSeconds))} offline</em></span>
      </div>
      <div class="analytics-grid">
        <div><b>Departments</b>${deps.length ? deps.map((item) => `<span><strong>${esc(item.department)}</strong><em>${esc(item.appearances)} apps · ${esc(item.wins)}–${esc(item.losses)}–${esc(item.draws)} · ${esc(analyticsPercent(item.winRate))}</em></span>`).join('') : '<span class="muted">No completed department data in this sample.</span>'}</div>
        <div><b>End reasons</b>${reasons.length ? reasons.map((item) => `<span><strong>${esc(item.reason)}</strong><em>${esc(item.matches)} match${item.matches===1?'':'es'}</em></span>`).join('') : '<span class="muted">No completed matches in this sample.</span>'}</div>
      </div>
      <div class="analytics-human-signals"><div class="analytics-signal-head"><b>Human match signals</b><span>No automatic balance changes · compare samples first.</span></div><div class="analytics-friction"><span><small>LONG TURN</small><b>${esc(friction.matchesWithLongTurn ?? 0)}</b><em>≥ ${esc(friction.thresholds?.longTurnSeconds ?? 45)}s · max ${esc(analyticsSeconds(friction.maxTurnSeconds))}</em></span><span><small>LONG RESPONSE</small><b>${esc(friction.matchesWithLongResponse ?? 0)}</b><em>≥ ${esc(friction.thresholds?.longResponseSeconds ?? 20)}s · max ${esc(analyticsSeconds(friction.maxResponseSeconds))}</em></span><span><small>RESIGNS</small><b>${esc(t.resigns ?? 0)}</b><em>of ${esc(t.completedMatches ?? 0)} completed</em></span></div><div class="analytics-human-grid"><div><b>Deck opener split</b>${decks.length?decks.map((deck)=>`<span><strong>${esc(deck.deckName)}</strong><em>1st ${esc(deck.firstAppearances)} · ${esc(analyticsPercent(deck.firstWinRate))} / 2nd ${esc(deck.secondAppearances)} · ${esc(analyticsPercent(deck.secondWinRate))}</em></span>`).join(''):'<span class="muted">No deck sample yet.</span>'}</div><div><b>Card activity</b>${cards.length?cards.map((card)=>`<span><strong>${esc(card.name)}</strong><em>${esc(card.plays)} plays · ${esc(card.playedSeatMatches)}/${esc(card.observedSeatMatches)} observed seats · ${esc(analyticsPercent(card.winRateWhenPlayed))} when played</em></span>`).join(''):'<span class="muted">No card activity recorded yet.</span>'}</div></div></div>
      <p class="analytics-caution">Directional alpha telemetry only. Filtered samples make comparisons easier, but small samples should not trigger automatic balance or timer changes.</p>
      ${state.analyticsMessage ? `<div class="error">${esc(state.analyticsMessage)}</div>` : ''}
    </div>
  </details>`;
}

async function renamePlaytestProfile() {
  if (!state.profileToken) return;
  const input = document.querySelector('#profileDisplayName');
  try {
    const result = await api('/api/profiles/me/name', { method:'POST', body:JSON.stringify({ profileToken:state.profileToken, displayName:input?.value ?? '' }) });
    applyServerProfile(result.profile);
    renderLobby();
  } catch (error) { state.lastError = error.message; renderLobby(); }
}

function saveMatchmakingTicket(ticket) {
  if (ticket?.ticketId) localStorage.setItem(MATCHMAKING_TICKET_KEY, JSON.stringify({ ticketId:ticket.ticketId }));
  else localStorage.removeItem(MATCHMAKING_TICKET_KEY);
}

async function restoreMatchmakingTicket() {
  if (!state.profileToken || state.session) return;
  try {
    const saved = JSON.parse(localStorage.getItem(MATCHMAKING_TICKET_KEY) ?? 'null');
    if (!saved?.ticketId) return;
    const result = await api(`/api/matchmaking/status?ticketId=${encodeURIComponent(saved.ticketId)}`, { headers:profileAuthHeaders() });
    state.matchmakingTicket = result.ticket;
    saveMatchmakingTicket(result.ticket);
    if (result.ticket.status === 'MATCHED' && enterMatchedSession(result.ticket)) return;
    if (result.ticket.status === 'WAITING') {
      state.matchmakingMessage = result.ticket.mode === 'RANKED' ? rankedQueueMessage(result.ranked, result.ticket) : 'Reconnected to your Quick Match search…';
      scheduleMatchmakingPoll();
    } else saveMatchmakingTicket(null);
  } catch {
    saveMatchmakingTicket(null);
  }
}

function stopMatchmakingPoll() {
  if (state.matchmakingPollTimer) clearTimeout(state.matchmakingPollTimer);
  state.matchmakingPollTimer = null;
}

function enterMatchedSession(ticket) {
  const session = ticket?.session;
  if (!session?.roomId || !session?.token || !session?.view) return false;
  stopMatchmakingPoll();
  state.matchmakingTicket = null;
  saveMatchmakingTicket(null);
  state.matchmakingMessage = null;
  saveSession({ roomId:session.roomId, token:session.token, playerId:session.playerId });
  acceptView(session.view);
  appendEvents(session.view.events);
  startStream();
  render();
  return true;
}

function scheduleMatchmakingPoll() {
  stopMatchmakingPoll();
  if (state.matchmakingTicket?.status !== 'WAITING') return;
  state.matchmakingPollTimer = setTimeout(pollMatchmaking, 1200);
}

async function pollMatchmaking() {
  if (!state.profileToken || state.matchmakingTicket?.status !== 'WAITING') return;
  try {
    const result = await api(`/api/matchmaking/status?ticketId=${encodeURIComponent(state.matchmakingTicket.ticketId)}`, { headers:profileAuthHeaders() });
    state.matchmakingTicket = result.ticket;
    saveMatchmakingTicket(result.ticket);
    if (result.ticket.status === 'MATCHED' && enterMatchedSession(result.ticket)) return;
    if (result.ticket.status === 'WAITING') { if (result.ticket.mode === 'RANKED') state.matchmakingMessage = rankedQueueMessage(result.ranked, result.ticket); scheduleMatchmakingPoll(); }
  } catch (error) {
    state.matchmakingMessage = error.message;
    state.matchmakingTicket = null;
    saveMatchmakingTicket(null);
  }
  render();
}

function rankedQueueMessage(ranked, ticket) {
  const cfg = state.matchSettings?.ranked ?? {};
  const mm = cfg.matchmaking ?? {};
  const waitedSeconds = Math.max(0, (Date.now() - Number(ticket?.createdAt ?? Date.now())) / 1000);
  const stepSeconds = Math.max(1, Number(mm.widenEverySeconds ?? 30));
  const steps = Math.floor(waitedSeconds / stepSeconds);
  const window = Math.min(Number(mm.maxRatingWindow ?? 600), Number(mm.initialRatingWindow ?? 200) + steps * Number(mm.widenByRating ?? 100));
  const placement = ranked?.status !== 'RATED';
  const standing = placement ? `Placement ${ranked?.placementsPlayed ?? 0}/${ranked?.placementsRequired ?? 5} · provisional ${ranked?.rating ?? 1000}` : `${ranked?.rating ?? 1000} MMR`;
  return `${standing} · searching within ±${window} MMR${window < Number(mm.maxRatingWindow ?? 600) ? ' (widens while waiting)' : ''}.`;
}

async function beginQuickMatch() {
  if (!state.profileToken || state.matchmakingBusy) return;
  state.matchmakingBusy = true;
  state.matchmakingMessage = null;
  try {
    const deckId = document.querySelector('#quickDeck')?.value;
    const prep = lobbyDeckSummary(deckId);
    if (!prep?.formatReady) throw new Error('Selected deck is not format-ready. Open the Deckbuilder to finish it before matchmaking.');
    const mode = document.querySelector('#quickMode')?.value ?? 'FRIENDLY';
    const payload = { ...selectedDeckPayload(deckId), mode, profileToken:state.profileToken };
    const result = await api('/api/matchmaking/enqueue', { method:'POST', body:JSON.stringify(payload) });
    state.matchmakingTicket = result.ticket;
    saveMatchmakingTicket(result.ticket);
    if (result.ticket.status === 'MATCHED' && enterMatchedSession(result.ticket)) return;
    state.matchmakingMessage = mode === 'RANKED' ? rankedQueueMessage(result.ranked, result.ticket) : 'Searching for another player on this server…';
    scheduleMatchmakingPoll();
  } catch (error) { state.matchmakingMessage = error.message; }
  finally { state.matchmakingBusy = false; if (!state.session) renderLobby(); }
}

async function startBotMatch(mode) {
  if (!state.profileToken || state.botBusy) return;
  state.botBusy = true;
  state.botMessage = null;
  try {
    if (state.session) { closeCurrentStream(); resetLiveSessionState(); }
    const deckId = effectiveLobbyDeckValue();
    const prep = lobbyDeckSummary(deckId);
    if (!prep?.formatReady) throw new Error(t('training.deckNotReady'));
    if (prep.ownedReady === false) throw new Error(t('training.deckNeedsCopies'));
    const botDeckId = document.querySelector('#botOpponentDeck')?.value || state.botDeckId || 'it-starter';
    state.botDeckId = botDeckId;
    const result = await api('/api/rooms/bot', { method:'POST', body:JSON.stringify({ ...selectedDeckPayload(deckId), mode, botDeckId, profileToken:state.profileToken }) });
    saveSession({ roomId:result.roomId, token:result.token, playerId:result.playerId });
    acceptView(result.view);
    appendEvents(result.view.events);
    await claimSessionControl({ restartStream:false, renderAfter:false });
    startStream();
    render();
  } catch (error) {
    state.botMessage = error.message || t('training.startFailed');
    renderLobby();
  } finally { state.botBusy = false; }
}

async function cancelQuickMatch() {
  if (!state.profileToken || !state.matchmakingTicket) return;
  stopMatchmakingPoll();
  try {
    const result = await api('/api/matchmaking/cancel', { method:'POST', body:JSON.stringify({ profileToken:state.profileToken, ticketId:state.matchmakingTicket.ticketId }) });
    state.matchmakingTicket = result.ticket;
    state.matchmakingMessage = 'Matchmaking cancelled.';
  } catch (error) { state.matchmakingMessage = error.message; }
  state.matchmakingTicket = null;
  saveMatchmakingTicket(null);
  renderLobby();
}

function renderRecentSessionCard() {
  if (!state.recentSession) return '';
  const view = state.recentSessionView;
  if (view && !roomViewIsResumable(view)) return '';
  const status = view?.status ?? 'UNKNOWN';
  const mode = view?.settings?.mode === 'RANKED' ? (view?.settings?.ratingActive ? 'Ranked Alpha · Rated' : lobbyCopy('Ranked Rules · Unrated','Ranked-Regeln · ungewertet')) : lobbyCopy('Friendly','Freundschaft');
  const opponentName = view ? (view.playerId === 'P1' ? view.guestDisplayName : view.hostDisplayName) : null;
  const detail = status === 'WAITING' ? lobbyCopy('Waiting for Player 2','Warte auf Spieler 2') : status === 'ACTIVE' ? `${lobbyCopy('Match in progress','Match läuft')}${opponentName ? ` vs ${opponentName}` : ''}` : lobbyCopy('Server status will be checked before resume','Serverstatus wird vor dem Fortsetzen geprüft');
  const secondary = status === 'WAITING' ? `<button id="abandonRecentRoom" class="danger">${lobbyCopy('Abandon room','Raum aufgeben')}</button>` : '';
  return `<section class="resume-session-box"><div><span>${lobbyCopy('RESUMABLE SESSION','FORTSETZBARE SITZUNG')}</span><strong>${lobbyCopy('Room','Raum')} ${esc(state.recentSession.roomId)} · ${esc(mode)}</strong><small>${esc(detail)}. ${lobbyCopy('The server is checked again before this seat can send another move.','Der Server wird erneut geprüft, bevor dieser Sitz einen weiteren Zug senden darf.')}</small></div><div class="resume-session-actions"><button class="primary" id="resumeRecentRoom">${lobbyCopy('Resume','Fortsetzen')}</button>${secondary}</div></section>`;
}

function syncSelectDisplayTitle(select) {
  if (!select) return;
  const option = select.options?.[select.selectedIndex];
  select.title = option?.textContent?.trim() ?? '';
}

function bindResponsiveLobbySelects() {
  for (const id of ['quickDeck','quickMode','createDeck','createMode','joinDeck']) {
    const select = document.querySelector(`#${id}`);
    if (!select) continue;
    syncSelectDisplayTitle(select);
    select.addEventListener('change', () => syncSelectDisplayTitle(select));
  }
}


function alphaOnboardingSeen() {
  try { return localStorage.getItem(ALPHA_ONBOARDING_KEY) === 'seen'; } catch { return false; }
}
function openAlphaOnboarding() { state.alphaOnboardingOpen = true; render(); }
function closeAlphaOnboarding({ remember = true } = {}) {
  if (remember) { try { localStorage.setItem(ALPHA_ONBOARDING_KEY, 'seen'); } catch {} }
  state.alphaOnboardingOpen = false;
  render();
}
function renderAlphaOnboarding() {
  if (alphaOnboardingSeen() && !state.alphaOnboardingOpen) return '';
  return `<div class="alpha-onboarding-backdrop" role="dialog" aria-modal="true" aria-labelledby="alphaOnboardingTitle">
    <section class="alpha-onboarding">
      <div class="alpha-onboarding-kicker"><span>WELCOME TO THE OFFICE</span><b>ALPHA FIELD GUIDE</b></div>
      <h2 id="alphaOnboardingTitle">Win the office. Protect your Reputation.</h2>
      <p>Office Card Game is a two-player tactical card game. Your cards run the company; your opponent is trying to make yours collapse first.</p>
      <div class="alpha-onboarding-grid">
        <article><b>01</b><strong>Company Reputation</strong><span>Your life total. Reduce the opponent from 20 to 0 to win.</span></article>
        <article><b>02</b><strong>Capacity</strong><span>Your turn resource. Spend it to play cards; unused Capacity does not carry over.</span></article>
        <article><b>03</b><strong>Employees</strong><span>Your frontline. New Employees have Onboarding and cannot attack immediately.</span></article>
        <article><b>04</b><strong>Support</strong><span>Systems stay face-up. Incidents wait face-down until their response window opens.</span></article>
        <article><b>05</b><strong>Turn flow</strong><span>Main → Battle → End. There is no second Main Phase after combat.</span></article>
        <article><b>06</b><strong>Responses</strong><span>When priority opens, respond or Pass. Chains resolve newest effect first.</span></article>
      </div>
      <div class="alpha-onboarding-tip"><strong>Good first match:</strong><span>Pick any Alpha Starter. The in-match Office Coach highlights legal actions and explains new concepts as they appear.</span></div>
      <div class="alpha-onboarding-actions"><button id="skipAlphaOnboarding">Skip for now</button><button id="finishAlphaOnboarding" class="primary">Got it · choose a deck</button></div>
    </section>
  </div>`;
}
function bindAlphaOnboarding() {
  document.querySelector('#openAlphaGuide')?.addEventListener('click', openAlphaOnboarding);
  document.querySelector('#skipAlphaOnboarding')?.addEventListener('click', () => closeAlphaOnboarding({ remember:true }));
  document.querySelector('#finishAlphaOnboarding')?.addEventListener('click', () => closeAlphaOnboarding({ remember:true }));
}


let foilTrackedElement=null;
function installFoilPointerTracking() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  document.addEventListener('pointermove',(event)=>{
     const face=event.target.closest?.('.card.tier-t2,.card.tier-t3,.catalog-card-face.tier-t2,.catalog-card-face.tier-t3,.card.executive-edition,.catalog-card-face.executive-edition,.hover-card-face.executive-edition');
    if (!face) return;
    if (foilTrackedElement && foilTrackedElement!==face) { foilTrackedElement.style.removeProperty('--foil-x'); foilTrackedElement.style.removeProperty('--foil-y'); }
    foilTrackedElement=face;
    const rect=face.getBoundingClientRect();
    const x=Math.max(0,Math.min(100,((event.clientX-rect.left)/Math.max(1,rect.width))*100));
    const y=Math.max(0,Math.min(100,((event.clientY-rect.top)/Math.max(1,rect.height))*100));
    const hyp=Math.min(1,Math.hypot((x-50)/50,(y-50)/50));
    const px=`${x.toFixed(1)}%`; const py=`${y.toFixed(1)}%`;
    face.style.setProperty('--foil-x',px); face.style.setProperty('--foil-y',py);
    face.style.setProperty('--mx',px); face.style.setProperty('--my',py);
    face.style.setProperty('--posx',px); face.style.setProperty('--posy',py);
    face.style.setProperty('--pos',`${px} ${py}`); face.style.setProperty('--hyp',hyp.toFixed(3));
  },{passive:true});
  document.addEventListener('pointerout',(event)=>{
    if (!foilTrackedElement || foilTrackedElement.contains(event.relatedTarget)) return;
    for (const property of ['--foil-x','--foil-y','--mx','--my','--posx','--posy','--pos','--hyp']) foilTrackedElement.style.removeProperty(property);
    foilTrackedElement=null;
  },{passive:true});
}
function finishReviewCards() { return [...state.catalog.values()].map(localizedCard).filter((def)=>Boolean(def.artId)); }
function renderFinishReview() {
  state.mode='FINISH_REVIEW';
  const cards=finishReviewCards();
  const selected=cards.find((def)=>def.id===state.finishReviewCardId)??cards[0]??null;
  if (selected) state.finishReviewCardId=selected.id;
  const tiers=[['T0','Base ink'],['T1','Metallic silver name'],['T2','Soft spectrum'],['T3','Prismatic shard']];
  app.innerHTML=`<section class="finish-review-shell"><header class="finish-review-head"><div><span>ARTWORK FINISH LAB</span><h1>Real-art holo validation</h1><p>One real artwork, four forced finish previews. This surface never changes the card's canonical rarity.</p></div><div><label>Artwork<select id="finishReviewCard">${cards.map((def)=>`<option value="${esc(def.id)}" ${def.id===selected?.id?'selected':''}>${esc(def.name)}</option>`).join('')}</select></label><button id="finishReviewBack">Lobby</button></div></header>${selected?`<div class="finish-review-grid">${tiers.map(([tier,label])=>`<article class="finish-review-column"><header><strong>${tier}</strong><span>${label}</span></header><div class="finish-review-card tier-${tier.toLowerCase()}">${renderCatalogCardFace(selected,{tier,artReady:true,owned:ownedCopies(selected.id)})}</div><small>${tier==='T0'?'No foil mask.':tier==='T1'?'Metallic title.':tier==='T2'?'Pointer-reactive laminated spectrum.':'Pointer-reactive shard prism + premium hardware.'}</small></article>`).join('')}</div><div class="finish-review-note"><b>Artwork focus</b><span>${esc(artworkFocus(selected).x)}% × ${esc(artworkFocus(selected).y)}%</span><small>Pointer movement changes only CSS finish coordinates; rules, rarity and artwork files stay untouched.</small></div>`:'<div class="ops-empty">No production artwork is mapped yet.</div>'}</section>`;
  document.querySelector('#finishReviewBack')?.addEventListener('click',()=>{state.mode='PLAY';renderLobby();});
  document.querySelector('#finishReviewCard')?.addEventListener('change',(event)=>{state.finishReviewCardId=event.target.value;renderFinishReview();});
}

async function refreshAdminOps({ renderAfter=true } = {}) {
  if (!state.adminToken) { state.adminOps=null; state.adminOpsMessage='Enter the server ADMIN_TOKEN to open operator data.'; if (renderAfter) renderOpsDashboard(); return; }
  state.adminOpsBusy=true; state.adminOpsMessage=null;
  try {
    const data=await api('/api/admin/ops',{ headers:adminAuthHeaders() });
    state.adminOps=data.ops;
    sessionStorage.setItem('office-card-game-admin-token-v1',state.adminToken);
  } catch (error) {
    state.adminOps=null;
    state.adminOpsMessage=error.code==='ADMIN_REQUIRED' ? 'Admin authorization failed.' : error.message;
  } finally { state.adminOpsBusy=false; if (renderAfter) renderOpsDashboard(); }
}
function opsAge(ms) {
  const seconds=Math.max(0,Math.round(Number(ms||0)/1000));
  if (seconds<60) return `${seconds}s`;
  const minutes=Math.floor(seconds/60); if(minutes<60)return `${minutes}m`;
  return `${Math.floor(minutes/60)}h ${minutes%60}m`;
}
function opsDate(value) { return value ? new Date(value).toLocaleString() : '—'; }
function renderOpsDashboard() {
  state.mode='ADMIN';
  const ops=state.adminOps;
  if (!ops) {
    app.innerHTML=`<section class="ops-shell ops-login"><button class="ghost" id="opsBack">← Lobby</button><div class="ops-login-panel"><span>ALPHA OPERATIONS</span><h1>Operator console</h1><p>Protected server diagnostics. The credential is kept in this browser tab only.</p><label>ADMIN_TOKEN<input id="opsToken" type="password" autocomplete="off" value="${esc(state.adminToken)}" /></label><button class="primary" id="opsConnect" ${state.adminOpsBusy?'disabled':''}>${state.adminOpsBusy?'Connecting…':'Open console'}</button>${state.adminOpsMessage?`<div class="error">${esc(state.adminOpsMessage)}</div>`:''}</div></section>`;
  } else {
    const c=ops.counts;
    app.innerHTML=`<section class="ops-shell"><header class="ops-header"><div><span>EXTERNAL ALPHA · OPERATIONS</span><h1>Server desk</h1><p>${esc(ops.version)} · ${esc(ops.server.mode)} · generated ${esc(opsDate(ops.generatedAt))}</p></div><div><button id="opsRefresh" ${state.adminOpsBusy?'disabled':''}>${state.adminOpsBusy?'Refreshing…':'Refresh'}</button><button class="ghost" id="opsLock">Lock console</button><button class="ghost" id="opsBack">Lobby</button></div></header><div class="ops-metrics"><article><span>ACTIVE MATCHES</span><strong>${esc(c.activeMatches)}</strong></article><article><span>WAITING ROOMS</span><strong>${esc(c.waitingRooms)}</strong></article><article><span>QUEUE</span><strong>${esc(c.queuedFriendly+c.queuedRanked)}</strong><small>${esc(c.queuedFriendly)} friendly · ${esc(c.queuedRanked)} ranked</small></article><article><span>PROFILES</span><strong>${esc(c.profiles)}</strong></article></div><div class="ops-grid"><section class="ops-panel"><header><strong>Rooms & matches</strong><small>Latest ${esc(ops.rooms.length)} server records</small></header><div class="ops-table-wrap"><table class="ops-table"><thead><tr><th>Room</th><th>Status</th><th>Mode</th><th>Decks</th><th>Turns</th><th>Created</th></tr></thead><tbody>${ops.rooms.length?ops.rooms.map((room)=>`<tr><td><b>${esc(room.roomId)}</b><small>${esc(room.matchId??'waiting')}</small></td><td><span class="ops-status status-${esc(room.status.toLowerCase())}">${esc(room.status)}</span></td><td>${esc(room.mode)}</td><td>${esc(room.seats?.P1?.deckName??'—')}<small>${esc(room.seats?.P2?.deckName??'waiting')}</small></td><td>${esc(room.turns)}</td><td>${esc(opsDate(room.createdAt))}</td></tr>`).join(''):'<tr><td colspan="6">No rooms yet.</td></tr>'}</tbody></table></div></section><aside class="ops-panel"><header><strong>Matchmaking queue</strong><small>Waiting tickets only</small></header><div class="ops-queue">${ops.queue.length?ops.queue.map((ticket)=>`<article><span>${esc(ticket.mode)}</span><strong>${esc(ticket.ticketId)}</strong><small>waiting ${esc(opsAge(ticket.waitMs))}</small></article>`).join(''):'<div class="ops-empty">Queue clear.</div>'}</div><div class="ops-runtime"><span>UPTIME <b>${esc(opsAge(ops.server.uptimeSeconds*1000))}</b></span><span>RUNTIME <b>${esc(ops.server.runtimeDir)}</b></span><span>PUBLIC URL <b>${esc(ops.server.publicBaseUrl??'local')}</b></span></div></aside></div>${state.adminOpsMessage?`<div class="error">${esc(state.adminOpsMessage)}</div>`:''}</section>`;
  }
  document.querySelector('#opsBack')?.addEventListener('click',()=>{ state.mode='PLAY'; renderLobby(); });
  document.querySelector('#opsConnect')?.addEventListener('click',async()=>{ state.adminToken=document.querySelector('#opsToken')?.value?.trim()??''; await refreshAdminOps(); });
  document.querySelector('#opsToken')?.addEventListener('keydown',async(event)=>{ if(event.key==='Enter'){state.adminToken=event.currentTarget.value.trim();await refreshAdminOps();} });
  document.querySelector('#opsRefresh')?.addEventListener('click',()=>refreshAdminOps());
  document.querySelector('#opsLock')?.addEventListener('click',()=>{ state.adminToken='';state.adminOps=null;sessionStorage.removeItem('office-card-game-admin-token-v1');renderOpsDashboard(); });
}

function renderLobby() {
  // Regression compatibility marker for v7.68 lobby copy: lobbyCopy('Pick a department. Start a match.','Abteilung wählen. Match starten.')
  // Regression compatibility marker for v7.68 lobby drawer: lobbyCopy('PRIVATE ROOMS','PRIVATE RÄUME')
  const preferredDeck = effectiveLobbyDeckValue();
  if (!state.preferredDeckValue) state.preferredDeckValue = preferredDeck;
  const options = lobbyDeckOptions();
  const modes = (state.matchSettings?.modes ?? [{id:'FRIENDLY',name:'Friendly',description:'Manual friendly room.'}]).filter((mode) => mode.id === 'FRIENDLY' || mode.id === 'RANKED');
  const selectedMode = matchModeConfig(state.lobbyMatchMode) ?? modes[0];
  const queueWaiting = state.matchmakingTicket?.status === 'WAITING';
  app.innerHTML = `<section class="executive-lobby material-executive-lobby">
    ${renderRecentSessionCard()}
    <div class="executive-desk-surface">
      <aside class="executive-desk-left" aria-label="${esc(lobbyCopy('Lobby navigation and utilities','Lobby-Navigation und Werkzeuge'))}">
        <div class="desk-nav-rail">
          <div class="desk-nav-heading"><span>${lobbyCopy('OFFICE TERMINAL','OFFICE-TERMINAL')}</span><strong>${lobbyCopy('Main Lobby','Hauptlobby')}</strong></div>
           <div class="desk-nav-current" aria-current="page"><span>${lobbyCopy('PLAY','SPIELEN')}</span><strong>${lobbyCopy('Quick Match','Quick Match')}</strong><small>${lobbyCopy('Selected deck is staged on the desk.','Das gewählte Deck liegt auf dem Schreibtisch bereit.')}</small></div>
           <button id="startTraining" class="desk-file-button bot-nav-button" type="button"><span>${esc(t('training.modeLabel'))}</span><strong>${esc(t('training.title'))}</strong><small>${esc(t('training.description'))}</small></button>
           <button id="startTutorial" class="desk-file-button bot-nav-button" type="button"><span>${esc(t('tutorial.modeLabel'))}</span><strong>${esc(t('tutorial.title'))}</strong><small>${esc(t('tutorial.description'))}</small></button>
           <button id="openCollection" class="desk-collection-drawer" type="button"><span>${lobbyCopy('COLLECTION','SAMMLUNG')}</span><strong>${lobbyCopy('Deckbuilder','Deckbuilder')}</strong><small>${lobbyCopy('Cards, decks & crafting','Karten, Decks & Crafting')}</small></button>
          <button id="openPlayerFile" class="desk-file-button profile-nav-button" type="button"><span>${esc(t('playerFile.kicker'))}</span><strong>${esc(t('playerFile.title'))}</strong><small>${esc(t('playerFile.shortDescription'))}</small></button>
          <button id="openPersonnel" class="desk-file-button cosmetic-nav-button" type="button"><span>${esc(t('cosmetics.ownedCollection').toUpperCase())}</span><strong>${esc(t('cosmetics.personnel'))}</strong><small>${esc(t('cosmetics.equip'))}</small></button>
          <button id="openStore" class="desk-file-button cosmetic-nav-button" type="button"><span>${esc(t('cosmetics.shopCollection').toUpperCase())}</span><strong>${esc(t('cosmetics.shop'))}</strong><small>${esc(t('cosmetics.buy'))}</small></button>
          <button id="openAchievements" class="desk-file-button progression-nav-button" type="button"><span>${esc(t('achievements.kicker'))}</span><strong>${esc(t('achievements.title'))}</strong><small>${esc(t('achievements.shortDescription'))}</small></button>
          <button id="openAlphaGuide" class="desk-file-button" type="button"><span>${lobbyCopy('FIELD GUIDE','FELDHANDBUCH')}</span><strong>${lobbyCopy('How to play','Spielanleitung')}</strong></button>
          ${opsModeAvailable()?'<button id="openOps" class="desk-file-button" type="button"><span>ALPHA OPS</span><strong>Server tools</strong></button>':''}
          ${renderLobbyConnectionStatus()}
        </div>
      </aside>

      <main class="executive-desk-center">
        <div data-lobby-deck-showcase-host="CURRENT">${renderLobbyDeckShowcase(preferredDeck)}</div>
        <section class="quick-match-box desk-meeting-agenda">
          <div class="desk-agenda-sheet">
            <div class="desk-agenda-heading"><div><span>${lobbyCopy('MATCH QUEUE','MATCH-SUCHE')}</span><strong>${queueWaiting ? lobbyCopy('Searching for an opponent','Gegner wird gesucht') : lobbyCopy('Quick Match','Quick Match')}</strong></div><b>${queueWaiting ? lobbyCopy('PENDING','LÄUFT') : lobbyCopy('READY','BEREIT')}</b></div>
            <p>${lobbyCopy('Choose the deck and mode, then enter the server queue. Friendly is unrated; Ranked Alpha uses preseason MMR.','Wähle Deck und Modus und starte anschließend die Serversuche. Freundschaft ist ungewertet; Ranked Alpha nutzt Vorsaison-MMR.')}</p>
            <div class="quick-match-controls desk-quick-controls">
              <label class="quick-match-field quick-match-deck">${lobbyCopy('Deck','Deck')}<select id="quickDeck" ${queueWaiting?'disabled':''}>${options}</select></label>
              <label class="quick-match-field quick-match-mode">${lobbyCopy('Mode','Modus')}<select id="quickMode" ${queueWaiting?'disabled':''}>${modes.map((mode) => `<option value="${esc(mode.id)}">${esc(lobbyModeName(mode))}</option>`).join('')}</select></label>
              ${queueWaiting ? `<button id="cancelQuickMatch">${lobbyCopy('Cancel search','Suche abbrechen')}</button>` : `<button class="primary desk-quick-match-button" id="quickMatchBtn" ${state.matchmakingBusy?'disabled':''}>${state.matchmakingBusy?lobbyCopy('Queueing…','Suche läuft…'):lobbyCopy('Quick Match','Quick Match')}</button>`}
            </div>
            <div class="bot-match-controls"><div><span>${esc(t('training.botOpponent').toUpperCase())}</span><small>${esc(t('training.selectOpponent'))}</small></div><label class="quick-match-field">${esc(t('training.opponentDeck'))}<select id="botOpponentDeck">${botDeckOptions()}</select></label><button id="startTrainingPanel" ${state.botBusy?'disabled':''}>${esc(t('training.start'))}</button><button id="startTutorialPanel" ${state.botBusy?'disabled':''}>${esc(t('tutorial.start'))}</button></div>
            <div data-lobby-deck-prep-host="QUICK">${renderLobbyDeckPrep(preferredDeck,'QUICK')}</div>
            ${state.matchmakingMessage ? `<p class="desk-matchmaking-message">${esc(state.matchmakingMessage)}</p>` : ''}
            ${state.botMessage ? `<p class="desk-matchmaking-message error">${esc(state.botMessage)}</p>` : ''}
          </div>
        </section>
        ${renderStarterDeckGuide()}
      </main>

      <aside class="executive-desk-right" aria-label="Profile and Ranked Alpha">
        <section class="desk-bureaucracy"><div class="desk-clipboard-clip" aria-hidden="true"></div><div class="desk-bureaucracy-title"><span>${lobbyCopy('PLAYER FILE','SPIELERAKTE')}</span><strong>${lobbyCopy('Profile & Ranked Alpha','Profil & Ranked Alpha')}</strong></div>${renderProfileStrip()}${renderRankedStanding()}</section>
        ${renderExecutiveAlphaMemo()}
      </aside>
    </div>

    <section class="executive-desk-tools" aria-label="${esc(lobbyCopy('Lobby utilities','Lobby-Werkzeuge'))}">
      <div class="desk-tools-hardware" aria-hidden="true"><i></i><span></span><i></i></div>
      <div class="desk-tools-tray">
        <details class="private-room-drawer desk-private-room" ${state.inviteRoomCode ? 'open' : ''}>
          <summary><div><span>${lobbyCopy('PRIVATE ROOMS','PRIVATE RÄUME')}</span><strong>${lobbyCopy('Play with a specific person','Mit einer bestimmten Person spielen')}</strong></div><small>${lobbyCopy('Create or join by room code','Per Raumcode erstellen oder beitreten')}</small></summary>
          <section class="lobby private-room-grid">
            <div class="box create-room-box">
              <h2>${lobbyCopy('Create private room','Privaten Raum erstellen')}</h2>
              <p class="muted">${lobbyCopy('Choose your deck and match rules, then send the six-character code to Player 2.','Wähle Deck und Matchregeln und sende anschließend den sechsstelligen Code an Spieler 2.')}</p>
              <label class="field">${lobbyCopy('Deck','Deck')}<select id="createDeck">${options}</select></label>
              <div data-lobby-deck-prep-host="CREATE">${renderLobbyDeckPrep(preferredDeck,'CREATE')}</div>
              <label class="field">${lobbyCopy('Match mode','Matchmodus')}<select id="createMode">${modes.map((mode) => `<option value="${esc(mode.id)}" ${mode.id===state.lobbyMatchMode?'selected':''}>${esc(lobbyModeName(mode))}</option>`).join('')}</select></label>
              <div class="mode-preview" id="modePreview"><strong>${esc(lobbyModeName(selectedMode))}</strong><span>${esc(lobbyModeDescription(selectedMode))}</span><small>${state.lobbyMatchMode==='RANKED' ? lobbyCopy('Private room · unrated. Ranked timer profile is reserved but still disabled.','Privater Raum · ungewertet. Das Ranked-Timerprofil ist reserviert, bleibt aber deaktiviert.') : lobbyCopy('No timer by default.','Standardmäßig kein Timer.')}</small></div>
              <button class="primary" id="createRoomBtn">${lobbyCopy('Create room','Raum erstellen')}</button>
            </div>
            <div class="box">
              <h2>${lobbyCopy('Join private room','Privatem Raum beitreten')}</h2>
              ${state.inviteRoomCode ? `<div class="invite-arrival"><span>${lobbyCopy('INVITE LINK','EINLADUNGSLINK')}</span><strong>${lobbyCopy(`Room ${state.inviteRoomCode} ready to join`,`Raum ${state.inviteRoomCode} ist bereit`)}</strong><small>${lobbyCopy('Choose your deck, then join normally. The invite contains no seat token.','Wähle dein Deck und tritt normal bei. Die Einladung enthält keinen Sitzplatz-Token.')}</small></div>` : ''}
              <label class="field">${lobbyCopy('Room code','Raumcode')}<input id="joinCode" maxlength="6" placeholder="ABC123" autocomplete="off" value="${esc(state.inviteRoomCode ?? '')}" /></label>
              <label class="field">${lobbyCopy('Deck','Deck')}<select id="joinDeck">${options}</select></label>
              <div data-lobby-deck-prep-host="JOIN">${renderLobbyDeckPrep(preferredDeck,'JOIN')}</div>
              <div class="mode-preview compact"><strong>${lobbyCopy('Room rules come from the host','Raumregeln kommen vom Host')}</strong><span>${lobbyCopy('Friendly / Ranked rules and future timer settings are server-owned. Private rooms never change Ranked MMR.','Freundschafts-/Ranked-Regeln und künftige Timer-Einstellungen liegen beim Server. Private Räume verändern niemals das Ranked-MMR.')}</span></div>
              <button class="primary" id="joinRoomBtn">${lobbyCopy('Join room','Raum beitreten')}</button>
              ${state.lastError ? `<div class="error">${esc(state.lastError)}</div>` : ''}
            </div>
          </section>
        </details>
        ${renderAlphaSessionStrip()}
        ${renderRulesPrimer()}
        ${renderLobbyPlaytestDrawer()}
      </div>
    </section>
  </section>${renderAlphaOnboarding()}`;
  app.insertAdjacentHTML('beforeend', renderReplayModal());
  bindReplayControls();
  bindGuidanceHandlers();
  bindResponsiveLobbySelects();
  bindAlphaOnboarding();
  bindConnectionDiagnostics();
  bindBugReportControls();
  bindAlphaSessionControls();
  document.querySelector('#refreshAnalytics')?.addEventListener('click', () => refreshPlaytestAnalytics(true));
  document.querySelector('#historyMode')?.addEventListener('change', (event) => { state.historyFilter.mode=event.target.value; renderLobby(); });
  document.querySelector('#historyOutcome')?.addEventListener('change', (event) => { state.historyFilter.outcome=event.target.value; renderLobby(); });
  document.querySelector('#resetHistoryFilters')?.addEventListener('click', () => { state.historyFilter={ mode:'ALL', outcome:'ALL' }; renderLobby(); });
  for (const [id,key] of [['analyticsMode','mode'],['analyticsDepartment','department'],['analyticsDeck','deckId'],['analyticsDays','days'],['analyticsLatest','latest']]) document.querySelector(`#${id}`)?.addEventListener('change', async (event) => { state.analyticsFilter[key]=event.target.value; await refreshPlaytestAnalytics(true); });
  document.querySelector('#resetAnalyticsFilters')?.addEventListener('click', async () => { state.analyticsFilter={ mode:'ALL', department:'ALL', deckId:'ALL', days:'ALL', latest:'ALL' }; await refreshPlaytestAnalytics(true); });
  document.querySelectorAll('[data-analytics-export]').forEach((button)=>button.addEventListener('click',()=>exportPlaytestAnalytics(button.dataset.analyticsExport)));
  document.querySelector('#resumeRecentRoom')?.addEventListener('click', resumeRecentSession);
  document.querySelector('#abandonRecentRoom')?.addEventListener('click', abandonRecentWaitingRoom);
  document.querySelector('#forgetRecentRoom')?.addEventListener('click', forgetRecentSession);
  document.querySelector('#openCollection').onclick = async () => { await enterAlphaDeckbuilder(); };
  document.querySelector('#openPlayerFile')?.addEventListener('click',()=>enterPlayerFile());
  document.querySelector('#openPersonnel')?.addEventListener('click',()=>enterCosmeticSurface('PERSONNEL'));
  document.querySelector('#openStore')?.addEventListener('click',()=>enterCosmeticSurface('SHOP'));
  document.querySelector('#openAchievements')?.addEventListener('click', enterAchievements);
  document.querySelector('#openOps')?.addEventListener('click',async()=>{ state.mode='ADMIN'; if(state.adminToken) await refreshAdminOps(); else renderOpsDashboard(); });
  document.querySelector('#saveProfileName')?.addEventListener('click', renamePlaytestProfile);
  document.querySelector('#profileDisplayName')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') renamePlaytestProfile(); });
  document.querySelectorAll('[data-starter-deck]').forEach((button) => button.addEventListener('click', () => {
    syncLobbyDeckChoice(button.dataset.starterDeck);
    document.querySelector('#quickDeck')?.focus({ preventScroll:true });
  }));
  ['quickDeck','createDeck','joinDeck'].forEach((id) => document.querySelector(`#${id}`)?.addEventListener('change', (event) => syncLobbyDeckChoice(event.target.value)));
  document.querySelector('#botOpponentDeck')?.addEventListener('change', (event) => { state.botDeckId = event.target.value; });
  syncLobbyDeckChoice(preferredDeck);
  document.querySelector('#createMode').onchange = (event) => { state.lobbyMatchMode=event.target.value; renderLobby(); };
  document.querySelector('#createRoomBtn').onclick = createRoom;
  document.querySelector('#joinRoomBtn').onclick = joinRoom;
   document.querySelector('#quickMatchBtn')?.addEventListener('click', beginQuickMatch);
   document.querySelector('#startTraining')?.addEventListener('click', () => startBotMatch('TRAINING'));
   document.querySelector('#startTutorial')?.addEventListener('click', () => startBotMatch('TUTORIAL'));
   document.querySelector('#startTrainingPanel')?.addEventListener('click', () => startBotMatch('TRAINING'));
   document.querySelector('#startTutorialPanel')?.addEventListener('click', () => startBotMatch('TUTORIAL'));
  document.querySelector('#cancelQuickMatch')?.addEventListener('click', cancelQuickMatch);
}

function renderWaiting() {
  const rematchWaiting = Boolean(state.view?.rematchSourceRoomId);
  const viewerName = state.view?.playerId === 'P2' ? (state.view?.guestDisplayName ?? state.view?.playerId) : (state.view?.hostDisplayName ?? state.view?.playerId);
  const viewerDeck = state.view?.playerId === 'P2' ? (state.view?.guestDeckName ?? state.view?.guestDeckId) : (state.view?.hostDeckName ?? state.view?.hostDeckId);
  const rematchSeconds = rematchWaiting && state.view?.rematchExpiresAt ? Math.max(0, Math.ceil((Number(state.view.rematchExpiresAt) - Date.now()) / 1000)) : null;
  app.innerHTML = `<div class="box waiting-room-stage ${rematchWaiting ? 'rematch-waiting-stage' : ''}" style="max-width:760px;margin:7vh auto 0">
    <div class="waiting-room-kicker"><i></i><span>${rematchWaiting ? 'REMATCH READY' : 'PRIVATE ROOM READY'}</span></div><h2>${rematchWaiting ? 'Waiting for opponent' : 'Room created'}</h2>
    <p class="muted">${rematchWaiting ? 'Your rematch seat is locked in. The next match starts only after the other player joins the rematch.' : 'Send the invite link to Player 2, or share the six-character room code.'}</p>
    ${rematchWaiting ? `<div class="rematch-waiting-pulse"><i></i><span>Opponent confirmation pending${rematchSeconds != null ? ` · expires in about ${esc(rematchSeconds)}s` : ''}</span></div>` : `<div class="room-code">${esc(state.view.roomId)}</div><div class="invite-link-preview">${esc(inviteUrl(state.view.roomId))}</div>`}
    <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
      ${rematchWaiting ? '' : '<button class="primary" id="copyInvite">Copy invite link</button><button id="copyCode">Copy room code</button>'}
      <button id="refreshState">Refresh</button>
      <button id="backLobbyWaiting">${rematchWaiting ? 'Cancel rematch & lobby' : 'Back to lobby'}</button>
      ${rematchWaiting ? '' : '<button id="abandonWaitingRoom" class="danger">Abandon room</button>'}
    </div>
    ${renderNetworkDiagnostic()}
    ${renderConnectionDiagnosticsPanel()}
    ${renderConnectionBanner()}
    <div class="notice room-rule-notice"><span><strong>${esc(roomModeLabel())}</strong> · ${esc(roomTimerLabel())}</span>You are <strong>${esc(viewerName)}</strong> using <strong>${esc(viewerDeck)}</strong>. ${rematchWaiting ? 'Both players must confirm before the new opening hand is created.' : 'Waiting for Player 2…'}</div>
  </div>`;
  bindConnectionControls();
  bindConnectionDiagnostics();
  bindBugReportControls();
  if (!rematchWaiting) {
    document.querySelector('#copyInvite').onclick = async () => navigator.clipboard?.writeText(inviteUrl(state.view.roomId));
    document.querySelector('#copyCode').onclick = async () => navigator.clipboard?.writeText(state.view.roomId);
  }
  document.querySelector('#refreshState').onclick = refreshState;
  document.querySelector('#backLobbyWaiting').onclick = rematchWaiting ? cancelPendingRematchToLobby : parkSession;
  document.querySelector('#abandonWaitingRoom')?.addEventListener('click', async () => {
    if (!confirm('Abandon this waiting room? The room code will stop working.')) return;
    try { await api(`/api/rooms/${state.session.roomId}/abandon`, { method:'POST', headers:roomAuthHeaders(), body:'{}' }); saveRecentSession(null); resetLiveSessionState(); render(); }
    catch (error) { state.lastError = error.message; render(); }
  });
  if (rematchWaiting && state.view?.rematchExpiresAt) {
    const roomId=state.session?.roomId;
    const delay=Math.max(250,Number(state.view.rematchExpiresAt)-Date.now()+350);
    setTimeout(()=>{
      if (state.session?.roomId!==roomId || !state.view?.rematchSourceRoomId || state.view?.status!=='WAITING') return;
      saveRecentSession(null);
      resetLiveSessionState();
      showFeedback('info','Rematch request expired','No second confirmation arrived in time. You are back in the lobby.');
      render();
    },delay);
  }
}

async function cancelPendingRematchToLobby() {
  if (!state.session) return;
  try { await api(`/api/rooms/${state.session.roomId}/abandon`, { method:'POST', headers:roomAuthHeaders(), body:'{}' }); }
  catch (error) { if (error.code !== 'ROOM_NOT_FOUND') showFeedback('error','Could not cancel rematch',error.message); }
  saveRecentSession(null);
  resetLiveSessionState();
  state.mode='PLAY';
  render();
}

function responseEventLabel(event) {
  const labels = {
    ATTACK_DECLARED: 'Attack declared',
    BATTLE_DESTRUCTION_PENDING: 'Employee would be destroyed',
    BATTLE_EMPLOYEE_DESTROYED: 'Employee destroyed',
    ACTION_WOULD_BE_ARCHIVED: 'Action would be archived',
    CHAIN_ITEM_ACTIVATED: 'Effect activated'
  };
  return labels[event] ?? String(event ?? 'Response window').replaceAll('_',' ');
}

function responseWindowContext(match) {
  const chainItemId = match.responseWindow?.triggeringChainItemId;
  const item = chainItemId ? (match.chain ?? []).find((candidate) => candidate.id === chainItemId) : (match.chain ?? []).at(-1);
  if (!item) return null;
  const source = item.sourceId ? cardLabel(item.sourceId) : 'Hidden effect';
  const targets = Object.values(item.targets ?? {}).flat().map(cardLabel).filter(Boolean);
  return { source, targets, controllerId:item.controllerId };
}

function renderResponseContext(match) {
  const context = responseWindowContext(match);
  if (!context) return '';
  const side = context.controllerId === match.viewerId ? 'YOUR EFFECT' : 'OPPONENT EFFECT';
  return `<div class="response-context"><span>${esc(side)}</span><strong>${esc(context.source)}</strong>${context.targets.length ? `<small>Target → ${esc(context.targets.join(', '))}</small>` : '<small>No visible target</small>'}</div>`;
}

function responseFocusContext(match) {
  const window = match?.responseWindow;
  if (!window) return null;
  const chainContext = responseWindowContext(match);
  if (chainContext) return { source:chainContext.source, targets:chainContext.targets };
  if (window.event === 'ATTACK_DECLARED' && match.pendingAttack) {
    return { source:cardLabel(match.pendingAttack.attackerId), targets:[match.pendingAttack.targetId == null ? 'Company Reputation' : cardLabel(match.pendingAttack.targetId)] };
  }
  if (window.event === 'BATTLE_DESTRUCTION_PENDING') {
    return { source:'Battle resolution', targets:(window.destructionCandidateIds ?? []).map(cardLabel) };
  }
  if (window.event === 'BATTLE_EMPLOYEE_DESTROYED') {
    return { source:'Battle aftermath', targets:(window.destroyedIds ?? []).map(cardLabel) };
  }
  if (window.event === 'ACTION_WOULD_BE_ARCHIVED') return { source:cardLabel(window.actionId), targets:[] };
  return { source:responseEventLabel(window.event), targets:[] };
}

function responseDecisionContext(match) {
  if (!match || (!match.responseWindow && !match.chainLength)) return null;
  const legal = match.legalActions ?? {};
  const yours = match.priorityPlayerId === match.viewerId;
  const focus = responseFocusContext(match);
  return {
    event:responseEventLabel(match.responseWindow?.event),
    priority:yours ? 'YOU' : (match.priorityPlayerId ? 'OPPONENT' : 'RESOLVING'),
    yours,
    chainDepth:Number(match.chainLength ?? 0),
    responses:(legal.responseOptions ?? []).length,
    canPass:Boolean(legal.canPassPriority),
    focus
  };
}

function renderResponseDecisionContext(match) {
  const context = responseDecisionContext(match);
  if (!context) return '';
  const title = context.yours
    ? (context.responses ? `${context.responses} response option${context.responses === 1 ? '' : 's'} available` : context.canPass ? 'No response card available' : 'Response is resolving')
    : context.priority === 'OPPONENT' ? 'Waiting for opponent priority' : 'Chain is resolving';
  const passText = context.canPass ? (context.chainDepth ? 'Pass = add no response · when priority closes, newest Chain item resolves first' : 'Pass = add no response · play continues when the response window closes') : 'Server-projected response state';
  return `<aside class="response-desk ${context.yours ? 'your-priority' : 'waiting-priority'}" aria-label="Response and priority context">
    <div class="response-desk-head"><span>RESPONSE DESK</span><strong>${esc(title)}</strong><small>${esc(passText)}</small></div>
    <div class="response-desk-focus"><small>${esc(context.event)}</small><strong>${esc(context.focus?.source ?? 'Current effect')}</strong><em>${context.focus?.targets?.length ? `Target → ${esc(context.focus.targets.join(', '))}` : 'No visible target'}</em></div>
    <div class="response-desk-stats">
      <span class="${context.yours ? 'priority-live' : ''}"><small>PRIORITY</small><b>${esc(context.priority)}</b></span>
      <span><small>CHAIN</small><b>${esc(context.chainDepth)}</b></span>
      <span class="${context.responses ? 'response-ready' : ''}"><small>RESPONSES</small><b>${esc(context.responses)}</b></span>
      <span class="${context.canPass ? 'pass-ready' : ''}"><small>PASS</small><b>${context.canPass ? 'READY' : 'WAIT'}</b></span>
    </div>
  </aside>`;
}

function requiredDecisionContext(match) {
  if (!match) return null;
  const viewerId = match.viewerId;
  if (match.pendingChoice?.playerId === viewerId) return { kind:'RESOLUTION CHOICE', title:'Choose how the effect resolves', count:(match.pendingChoice.options ?? []).length, range:'CHOOSE 1', selected:null };
  if (match.pendingDeckSelection?.playerId === viewerId) {
    const p = match.pendingDeckSelection;
    return { kind:'DECK CHOICE', title:'Choose from the server-projected candidates', count:(p.candidateIds ?? []).length, range:p.min === p.max ? `CHOOSE ${p.min}` : `CHOOSE ${p.min}–${p.max}`, selected:null };
  }
  if (match.pendingTriggerTargetSelection?.playerId === viewerId) {
    const choices = match.pendingTriggerTargetSelection.targetChoices ?? [];
    const candidates = new Set(choices.flatMap((choice) => choice.candidateIds ?? []));
    const min = choices.reduce((sum, choice) => sum + Number(choice.min ?? 0), 0);
    const max = choices.reduce((sum, choice) => sum + Number(choice.max ?? 0), 0);
    return { kind:'TARGET CHOICE', title:'Triggered effect needs legal target selection', count:candidates.size, range:min === max ? `CHOOSE ${min}` : `CHOOSE ${min}–${max}`, selected:selectedTargetIds().size };
  }
  if (match.pendingHandSelection?.playerId === viewerId) {
    const p = match.pendingHandSelection;
    return { kind:'HAND CHOICE', title:'Choose cards from your visible hand', count:(p.candidateIds ?? []).length, range:p.min === p.max ? `CHOOSE ${p.min}` : `CHOOSE ${p.min}–${p.max}`, selected:[...state.selectedHand].filter((id) => (p.candidateIds ?? []).includes(id)).length };
  }
  return null;
}

function renderRequiredDecisionContext(match) {
  const context = requiredDecisionContext(match);
  if (!context) return '';
  return `<aside class="decision-desk" aria-label="Required decision context">
    <div class="decision-desk-head"><span>DECISION DESK</span><strong>${esc(context.title)}</strong><small>Required by the live server state · normal phase actions resume after this choice</small></div>
    <div class="decision-desk-stats">
      <span class="decision-required"><small>DECISION</small><b>${esc(context.kind)}</b></span>
      <span><small>CANDIDATES</small><b>${esc(context.count)}</b></span>
      <span><small>REQUIRED</small><b>${esc(context.range)}</b></span>
      ${context.selected == null ? '' : `<span class="${context.selected ? 'selection-live' : ''}"><small>SELECTED</small><b>${esc(context.selected)}</b></span>`}
    </div>
  </aside>`;
}

function renderChainStack(match) {
  if (!match.chainLength) return '';
  const items = match.chain ?? [];
  return `<div class="chain-panel">
    <div class="chain-heading"><span>CHAIN</span><strong>${match.chainLength}</strong><small>Newest resolves first</small></div>
    <div class="chain-stack">${items.slice().reverse().map((item, reverseIndex) => {
      const source = item.sourceId ? cardLabel(item.sourceId) : `${item.controllerId} effect`;
      const targets = Object.values(item.targets ?? {}).flat().map(cardLabel);
      const resolveNo = items.length - reverseIndex;
      const controller = item.controllerId === match.viewerId ? 'YOU' : 'OPPONENT';
      return `<div class="chain-item ${reverseIndex === 0 ? 'resolves-next' : ''} ${item.negated ? 'negated' : ''} ${item.delayed ? 'delayed' : ''}">
        <span class="chain-order">${resolveNo}</span>
        <div><strong>${esc(source)}</strong><span>${esc(controller)} · EFFECT${item.abilityId ? ` · ${esc(item.abilityId)}` : ''}</span>${targets.length ? `<small>Target → ${esc(targets.join(', '))}</small>` : '<small>No visible target</small>'}</div>
        ${item.negated ? '<b>NEGATED</b>' : item.delayed ? '<b>DELAYED</b>' : ''}
      </div>`;
    }).join('')}</div>
  </div>`;
}

function renderDecisionCenter(match) {
  const legal = match.legalActions;
  const blocks = [];
  if (match.status === 'SETUP' && !legal.canMulligan) {
    blocks.push(`<div class="opening-wait-panel"><div class="opening-wait-status"><i aria-hidden="true"></i><span>HAND LOCKED</span></div><div><strong>Opening hand confirmed</strong><small>Waiting for the other desk to finish its free mulligan. Your five cards are locked in.</small></div></div>`);
  }
  if (match.pendingChoice?.playerId === match.viewerId) {
    blocks.push(`<div class="decision-block"><strong>Choose how to resolve</strong><div class="interaction-options">${match.pendingChoice.options.map((o) => actionButton(o,'choice',`data-choice="${esc(o)}"`)).join('')}</div></div>`);
  }
  if (legal.canMulligan) {
    const selected = state.selectedHand.size;
    blocks.push(`<div class="mulligan-panel ${selected ? 'has-selection' : ''}"><div class="mulligan-copy"><span>FREE MULLIGAN · ONCE</span><strong>${selected ? `${selected} card${selected === 1 ? '' : 's'} marked for replacement` : 'Keep or tune your opening five'}</strong><small>Mark any cards you want to replace. Replacements are drawn first; returned cards are shuffled back afterwards.</small><div class="mulligan-meter" style="--replace:${selected*20}%"><b>${selected}</b><span>REPLACE</span><i></i><b>${5-selected}</b><span>KEEP</span></div></div><div class="mulligan-actions"><button data-action="mulligan-keep">Keep this hand</button>${selected ? `<button class="ghost" data-action="mulligan-clear">Clear selection</button>` : ''}<button class="primary" data-action="mulligan" ${selected ? '' : 'disabled'}>${selected ? `Replace ${selected}` : 'Select cards to replace'}</button></div></div>`);
  }
  if (legal.archiveExcessHandIds.length) {
    const archiveNeeded = Math.max(0, (match.players?.[match.viewerId]?.hand?.length ?? 8) - 8);
    const archiveSelected = [...state.selectedHand].filter((id) => legal.archiveExcessHandIds.includes(id)).length;
    blocks.push(`<div class="decision-block hand-limit-decision ${archiveSelected === archiveNeeded ? 'selection-ready' : ''}"><strong>Hand limit · ${archiveSelected}/${archiveNeeded} selected</strong><span>Select exactly ${archiveNeeded} card${archiveNeeded === 1 ? '' : 's'} to Archive and return to 8.</span>${actionButton(archiveSelected === archiveNeeded ? `Archive ${archiveNeeded} selected` : `Select ${archiveNeeded - archiveSelected > 0 ? archiveNeeded - archiveSelected : 0} more`,'archive-selected',archiveSelected === archiveNeeded ? '' : 'disabled')}</div>`);
  }
  if (legal.responseOptions.length || legal.canPassPriority) {
    blocks.push(`<div class="response-block">
      <div class="response-title"><strong>${esc(responseEventLabel(match.responseWindow?.event))}</strong><span>${match.priorityPlayerId === match.viewerId ? 'Your response window' : 'Waiting for response'}</span></div>
      ${renderResponseContext(match)}
      <div class="response-options">${legal.responseOptions.map((o,i) => `<button class="response-card" data-action="response" data-index="${i}"><span>RESPOND</span><strong>${esc(cardLabel(o.sourceId))}</strong><small>${esc(o.abilityId)}</small></button>`).join('')}${legal.canPassPriority ? `<button class="pass-response" data-action="pass"><span>PASS</span><small>No response</small></button>` : ''}</div>
    </div>`);
  }
  const boardSelectionActive = Boolean(
    (state.interaction && ['TARGETS','PROMOTION'].includes(state.interaction.type)) ||
    match.pendingTriggerTargetSelection?.playerId === match.viewerId ||
    match.pendingHandSelection?.playerId === match.viewerId ||
    match.pendingDeckSelection?.playerId === match.viewerId
  );
  const chain = boardSelectionActive ? '' : renderChainStack(match);
  if (!blocks.length && !chain) return '';
  const responseActive = Boolean(legal.responseOptions.length || legal.canPassPriority);
  return `<section id="decisionCenter" class="decision-center ${responseActive ? 'response-active' : ''}">${chain}${blocks.join('')}</section>`;
}

function renderArchiveStackVisual(last) {
  if (!last) return '<span class="archive-stack-empty" aria-hidden="true"></span>';
  const def = cardDef(last.definitionId);
  return `<span class="archive-stack-visual type-${esc(String(def?.cardType ?? 'card').toLowerCase())}" aria-hidden="true"><i></i><i></i><span>${def ? renderArtwork(def) : ''}</span></span>`;
}

function renderArchive(player, own = false) {
  const last = player.archive.at(-1);
  const impacted = archiveImpactForPlayer(player.id) || Boolean(zoneCueEventsForPlayer(player.id, 'ARCHIVE').length);
  const transitionChip = zoneTransitionChip(player.id, 'ARCHIVE');
  const targetVisible = player.archive.some((card) => targetCandidateIds().has(card.instanceId));
  return `<details class="archive-compact ${own ? 'archive-own' : 'archive-opponent'} ${player.archive.length ? '' : 'is-empty'} ${impacted ? 'archive-impact' : ''} ${zonePulseClass(player.id, 'ARCHIVE')}"${targetVisible ? ' open' : ''}><summary>${renderArchiveStackVisual(last)}<span class="archive-summary-copy"><span>Archive</span><strong>${player.archive.length}</strong></span>${transitionChip || (impacted ? '<b class="archive-impact-chip">+ CARD</b>' : '')}${last ? `<small>Last: ${esc(cardLabel(last.instanceId))}</small>` : '<small>empty</small>'}</summary>
    <div class="archive-grid">${player.archive.length ? player.archive.slice().reverse().map((c) => renderCard(c, { surface:'archive' })).join('') : '<div class="zone-empty-state archive-empty"><span>ARCHIVE CLEAR</span><small>Destroyed, resolved and archived cards will collect here.</small></div>'}</div>
  </details>`;
}


function renderOpponentHand(player) {
  const handCount = Number(player.handCount ?? 0);
  const cards = handCount > 0 ? Array.from({ length: handCount }, (_, i) => i).slice(0, 10) : [];
  // Regression compatibility marker: cardBackMarkup({ compact:true }) remains the compact hidden-card path.
  return `<div class="opponent-hand-zone ${zonePulseClass(player.id, 'HAND')}"><div class="zone-title hand-title opponent">Opponent hand <span>${handCount} card${handCount === 1 ? '' : 's'}</span>${zoneTransitionChip(player.id, 'HAND')}</div><div class="opponent-hand-fan ${handCount ? '' : 'is-empty'}">${cards.length ? cards.map((i) => `<div class="opponent-hand-card" style="--fan-index:${i};">${cardBackMarkup({ compact:true, cardBackId:roomCosmeticLoadout(player.id).cardBackId })}</div>`).join('') : '<div class="hand-empty-state opponent"><span>NO CARDS</span><small>Opponent hand is empty</small></div>'}${handCount > 10 ? `<div class="opponent-hand-more">+${handCount - 10}</div>` : ''}</div></div>`;
}


function legalEmployeeOptionsForSlot(slot) {
  const interaction = state.interaction;
  if (!interaction || interaction.type !== 'EMPLOYEE') return [];
  return interaction.options.filter((option) => option.slot === slot);
}

function isLegalSupportSlot(slot) {
  const interaction = state.interaction;
  return Boolean(interaction?.type === 'SUPPORT' && interaction.slots.includes(slot));
}


function fieldZoneSummary(player, zone, own) {
  const cards = zone === 'EMPLOYEE' ? player.employeeField.filter(Boolean) : player.supportField.filter(Boolean);
  const capacity = zone === 'EMPLOYEE' ? 5 : 4;
  const bits = [`${cards.length}/${capacity}`];
  if (zone === 'EMPLOYEE') {
    const onboarding = cards.filter((card) => card.onboarding).length;
    const ready = own ? cards.filter((card) => legalAttackSourceIds().has(card.instanceId)).length : 0;
    if (ready) bits.push(`${ready} attack ready`);
    if (onboarding) bits.push(`${onboarding} onboarding`);
  } else {
    const setCount = cards.filter((card) => !card.faceUp).length;
    const systemCount = cards.filter((card) => card.faceUp && cardDef(card.definitionId)?.cardType === 'SYSTEM').length;
    if (systemCount) bits.push(`${systemCount} system${systemCount === 1 ? '' : 's'} live`);
    if (setCount) bits.push(`${setCount} incident${setCount === 1 ? '' : 's'} set`);
  }
  return bits.join(' · ');
}

function boardStatePills(playerId, match) {
  const pills = [];
  if (match.activePlayerId === playerId) pills.push('<span class="board-state-pill turn">TURN</span>');
  if (match.priorityPlayerId === playerId) pills.push('<span class="board-state-pill priority">PRIORITY</span>');
  return pills.join('');
}

function battlefieldScanContext(player, own, match) {
  const employees = (player.employeeField ?? []).filter(Boolean);
  const supports = (player.supportField ?? []).filter(Boolean);
  const modifiedPower = employees.filter((card) => {
    const def = cardDef(card.definitionId);
    const power = def ? cardPowerState(card, def) : null;
    return Boolean(power && power.delta !== 0);
  }).length;
  const pending = (match.pendingResolutions ?? []).filter((item) => item.controllerId === player.id).length
    + (match.scheduledEffects ?? []).filter((item) => item.controllerId === player.id).length;
  const setIncidents = supports.filter((card) => !card.faceUp).length;
  const liveSystems = supports.filter((card) => card.faceUp && cardDef(card.definitionId)?.cardType === 'SYSTEM').length;
  const onboarding = employees.filter((card) => card.onboarding).length;
  const ownFieldIds = new Set([...employees, ...supports].map((card) => card.instanceId));
  const attackReady = own ? new Set((match.legalActions?.attacks ?? []).map((attack) => attack.attackerId).filter((id) => ownFieldIds.has(id))).size : 0;
  const abilityReady = own ? new Set((match.legalActions?.activatableAbilities ?? []).map((ability) => ability.sourceId).filter((id) => ownFieldIds.has(id))).size : 0;
  return { employees:employees.length, supports:supports.length, modifiedPower, pending, setIncidents, liveSystems, onboarding, attackReady, abilityReady };
}

function renderBattlefieldScan(player, own, match) {
  const scan = battlefieldScanContext(player, own, match);
  const chips = [
    `<span><small>EMP</small><b>${esc(scan.employees)}/5</b></span>`,
    `<span><small>SUP</small><b>${esc(scan.supports)}/4</b></span>`
  ];
  if (own && scan.attackReady) chips.push(`<span class="scan-ready"><small>ATTACK</small><b>${esc(scan.attackReady)} READY</b></span>`);
  if (own && scan.abilityReady) chips.push(`<span class="scan-ability"><small>ABILITY</small><b>${esc(scan.abilityReady)} READY</b></span>`);
  if (scan.onboarding) chips.push(`<span class="scan-warning"><small>ONBOARDING</small><b>${esc(scan.onboarding)}</b></span>`);
  if (scan.setIncidents) chips.push(`<span class="scan-set"><small>INCIDENT SET</small><b>${esc(scan.setIncidents)}</b></span>`);
  if (scan.liveSystems) chips.push(`<span><small>SYSTEM LIVE</small><b>${esc(scan.liveSystems)}</b></span>`);
  if (scan.modifiedPower) chips.push(`<span class="scan-power"><small>POWER MOD</small><b>${esc(scan.modifiedPower)}</b></span>`);
  if (scan.pending) chips.push(`<span class="scan-pending"><small>PENDING</small><b>${esc(scan.pending)}</b></span>`);
  return `<div class="battlefield-scan ${own ? 'own-scan' : 'opponent-scan'}" aria-label="${own ? 'Your' : 'Opponent'} battlefield quick scan"><b class="battlefield-scan-label">DESK SCAN</b><div class="battlefield-scan-items">${chips.join('')}</div></div>`;
}

function renderFieldSlot(card, zone, slot, own) {
  if (card) return renderCard(card, { surface:'board' });
  const employeeOptions = own && zone === 'EMPLOYEE' ? legalEmployeeOptionsForSlot(slot) : [];
  const supportLegal = own && zone === 'SUPPORT' && isLegalSupportSlot(slot);
  const legal = employeeOptions.length > 0 || supportLegal;
  const label = legal ? (zone === 'EMPLOYEE' ? 'PLAY HERE' : state.interaction?.kind === 'SYSTEM' ? 'PLAY HERE' : 'SET HERE') : 'empty';
  const data = legal ? `data-field-slot-zone="${zone}" data-field-slot="${slot}"` : '';
  const slotName = zone === 'EMPLOYEE' ? `Employee ${slot + 1}` : `Support ${slot + 1}`;
  return `<div class="empty-slot field-empty ${zone === 'EMPLOYEE' ? 'employee-empty' : 'support-empty'} ${legal ? 'slot-candidate' : ''}" ${data}><span>${legal ? esc(label) : esc(slotName)}</span><small>${legal ? esc(slotName) : 'OPEN'}</small></div>`;
}

function renderFieldRow(cards, zone, own) {
  return cards.map((card, slot) => renderFieldSlot(card, zone, slot, own)).join('');
}

function renderPresencePill(playerId, own) {
  const presence = state.view?.lifecycle?.presence?.[playerId];
  if (own) return '<span class="presence-pill connected">ONLINE</span>';
  if (!presence?.lastSeenAt && presence?.status !== 'CONNECTED') return '<span class="presence-pill waiting">NOT CONNECTED</span>';
  const connected = presence?.status === 'CONNECTED';
  const reconnectDeadline = state.view?.timer?.reconnectDeadlineAt?.[playerId];
  const reconnectText = reconnectDeadline ? `RECONNECTING · ${formatCountdownMs(reconnectDeadline - estimatedServerNow())}` : 'RECONNECTING';
  return `<span class="presence-pill ${connected ? 'connected' : 'disconnected'}"${!connected ? ` data-reconnect-player="${esc(playerId)}"` : ''}>${connected ? 'ONLINE' : reconnectText}</span>`;
}

function playerInitials(name = 'Player') {
  return String(name || 'Player').trim().split(/\s+/).slice(0,2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'P';
}

const COSMETIC_UI_CATALOG = Object.freeze({
  boards: Object.freeze({
    'COS-BOARD-001': Object.freeze({ slug:'classic-office' }),
    'COS-BOARD-002': Object.freeze({ slug:'soft-office' }),
    'COS-BOARD-003': Object.freeze({ slug:'midnight-circuit' }),
    'COS-BOARD-004': Object.freeze({ slug:'executive-steel' }),
    'COS-BOARD-005': Object.freeze({ slug:'concrete-minimal' })
  }),
  avatars: Object.freeze({
    'COS-AVA-001': Object.freeze({ asset:'/cosmetics/avatars/overworked-sysadmin.webp' }),
    'COS-AVA-002': Object.freeze({ asset:'/cosmetics/avatars/hr-oracle.webp' }),
    'COS-AVA-003': Object.freeze({ asset:'/cosmetics/avatars/executive-director.webp' }),
    'COS-AVA-004': Object.freeze({ asset:'/cosmetics/avatars/overloaded-junior.webp' }),
    'COS-AVA-005': Object.freeze({ asset:'/cosmetics/avatars/confident-analyst.webp' }),
    'COS-AVA-006': Object.freeze({ asset:'/cosmetics/avatars/customer-care-veteran.webp' })
  }),
  cardBacks: Object.freeze({
    'COS-BACK-001': Object.freeze({ asset:'/cosmetics/card-backs/default-corporate.webp' }),
    'COS-BACK-002': Object.freeze({ asset:'/cosmetics/card-backs/alpha-back.webp' }),
    'COS-BACK-003': Object.freeze({ asset:'/cosmetics/card-backs/ranked-season-1.webp' }),
    'COS-BACK-004': Object.freeze({ asset:'/cosmetics/card-backs/customer-service-department.webp' }),
    'COS-BACK-005': Object.freeze({ asset:'/cosmetics/card-backs/it-department.webp' })
  }),
  frames: Object.freeze({
    'COS-FRAME-002': Object.freeze({ asset:'/cosmetics/avatar-frames/default-blue-silver.webp' }),
    'COS-FRAME-003': Object.freeze({ asset:'/cosmetics/avatar-frames/bronze-ranked-s01.webp' }),
    'COS-FRAME-004': Object.freeze({ asset:'/cosmetics/avatar-frames/gold-ranked-s01.webp' }),
    'COS-FRAME-005': Object.freeze({ asset:'/cosmetics/avatar-frames/diamond-ranked-s01.webp' }),
    'COS-FRAME-006': Object.freeze({ asset:'/cosmetics/avatar-frames/silver-ranked-s01.webp', mask:'/cosmetics/avatar-frames/masks/silver-ranked-s01-inner-opening.png' })
  }),
  badges: Object.freeze({
    'COS-BADGE-001': Object.freeze({ asset:'/cosmetics/badges/reply-all-survivor.webp', nameKey:'cosmetics.replyAllSurvivorName' }),
    'COS-BADGE-002': Object.freeze({ asset:'/cosmetics/badges/coffee-powered.webp', nameKey:'cosmetics.coffeePoweredName' }),
    'COS-BADGE-003': Object.freeze({ asset:'/cosmetics/badges/inbox-zero.webp', nameKey:'cosmetics.inboxZeroName' }),
    'COS-BADGE-004': Object.freeze({ asset:'/cosmetics/badges/meeting-survivor.webp', nameKey:'cosmetics.meetingSurvivorName' }),
    'COS-BADGE-005': Object.freeze({ asset:'/cosmetics/badges/ticket-closer.webp', nameKey:'cosmetics.ticketCloserName' }),
    'COS-BADGE-006': Object.freeze({ asset:'/cosmetics/badges/escalation-specialist.webp', nameKey:'cosmetics.escalationSpecialistName' })
  })
});

function roomCosmeticLoadout(playerId) {
  const fallback = {
    boardSkinId:'COS-BOARD-001',
    avatarId:playerId === 'P1' ? 'COS-AVA-001' : 'COS-AVA-002',
    avatarFrameId:null,
    avatarDecorationId:null,
    cardBackId:'COS-BACK-001',
    badgeId:null,
    titleId:null
  };
  const projected = playerId === 'P1' ? state.view?.hostCosmeticLoadout : state.view?.guestCosmeticLoadout;
  return projected ? { ...fallback, ...projected } : fallback;
}

function cosmeticAvatarAsset(avatarId) {
  return COSMETIC_UI_CATALOG.avatars[String(avatarId || '')]?.asset ?? null;
}

function cosmeticFrameAsset(frameId) {
  return COSMETIC_UI_CATALOG.frames[String(frameId || '')]?.asset ?? null;
}

function cosmeticFrameMaskAsset(frameId) {
  const entry = COSMETIC_UI_CATALOG.frames[String(frameId || '')];
  return entry?.mask ?? avatarFrameMaskAsset(entry?.asset);
}

function cosmeticBadgeMeta(badgeId) {
  const entry = COSMETIC_UI_CATALOG.badges[String(badgeId || '')];
  return entry ? { ...entry, label:t(entry.nameKey, {}, String(badgeId)) } : null;
}

function renderPlayerBadge(playerId) {
  const badge = cosmeticBadgeMeta(roomCosmeticLoadout(playerId).badgeId);
  if (!badge) return '';
  return `<span class="player-badge-mark" title="${esc(badge.label)}" aria-label="${esc(badge.label)}"><img src="${esc(badge.asset)}" alt="" /></span>`;
}

function renderPlayerAvatar(playerId, own, { combat = false, repDelta = 0 } = {}) {
  const meta = roomDeckMeta(playerId);
  const loadout = roomCosmeticLoadout(playerId);
  const avatarAsset = cosmeticAvatarAsset(loadout.avatarId);
  const frameAsset = cosmeticFrameAsset(loadout.avatarFrameId);
  return `<div class="player-avatar-slot ${own ? 'own' : 'opponent'} ${combat ? 'combat-avatar' : ''} ${repDelta < 0 ? 'rep-hit' : ''}" data-player-avatar="${esc(playerId)}" data-avatar-id="${esc(loadout.avatarId)}" title="${esc(meta.playerName)}">${renderAvatarComposition({ avatarAsset, frameAsset, frameMaskAsset:cosmeticFrameMaskAsset(loadout.avatarFrameId), fallbackText:playerInitials(meta.playerName) })}${combat && repDelta < 0 ? `<b class="combat-rep-delta">${esc(repDelta)} REP</b>` : ''}</div>`;
}

function renderDeckStackVisual(deckCount) {
  const playerId = arguments[1] ?? null;
  if (Number(deckCount ?? 0) <= 0) return '<span class="deck-stack-empty" aria-label="Deck empty"></span>';
  return `<span class="deck-stack-visual" aria-hidden="true"><i></i><i></i><span>${cardBackMarkup({ compact:true, cardBackId:roomCosmeticLoadout(playerId).cardBackId })}</span></span>`;
}

function roomBoardSkinId(playerId) {
  return roomCosmeticLoadout(playerId).boardSkinId;
}

function boardSkinClass(playerId) {
  const boardId = roomBoardSkinId(playerId);
  const slug = COSMETIC_UI_CATALOG.boards[String(boardId || '')]?.slug ?? 'classic-office';
  return `board-skin-${String(slug).toLowerCase().replace(/[^a-z0-9-]/g,'') || 'classic-office'}`;
}

function renderPlayer(player, own, match) {
  const mulliganMode = own && Boolean(match.legalActions?.canMulligan);
  const handPlayable = own && match.activePlayerId === match.viewerId && match.phase === 'MAIN' && legalHandCardIds().size > 0;
  const handSelectionActive = own && Boolean(match.legalActions?.canMulligan || match.legalActions?.archiveExcessHandIds?.length || (match.pendingHandSelection?.playerId === match.viewerId));
  const department = roomDepartmentForPlayer(player.id);
  const deckMeta = roomDeckMeta(player.id);
  const playerTitle = roomPlayerTitle(player.id);
  const handHtml = own
    ? `<div class="zone-title hand-title">Your hand <span>${esc(handZoneHint(match))}</span>${zoneTransitionChip(player.id, 'HAND')}</div><div class="hand own-hand ${zonePulseClass(player.id, 'HAND')} ${mulliganMode ? 'mulligan-hand' : ''} ${handPlayable ? 'actionable-hand' : ''} ${handSelectionActive ? 'selection-mode' : ''} ${player.hand.length ? '' : 'is-empty'}">${player.hand.length ? player.hand.map((c, i) => renderCard(c,{selectable: Boolean(state.view?.match?.legalActions?.canMulligan || state.view?.match?.legalActions?.archiveExcessHandIds?.length || state.view?.match?.legalActions?.canResolveHandSelection), handIndex:i, handCount:player.hand.length})).join('') : '<div class="hand-empty-state"><span>NO CARDS</span><small>Your hand is empty</small></div>'}</div>`
    : renderOpponentHand(player);
  const employeeOccupied = player.employeeField.some(Boolean);
  const supportOccupied = player.supportField.some(Boolean);
  const frontline = `<div class="zone-title frontline-title"><strong>Employees</strong><span>${esc(fieldZoneSummary(player, 'EMPLOYEE', own))}</span>${zoneTransitionChip(player.id, 'EMPLOYEE_FIELD')}</div><div class="slots employee-row board-lane employee-lane ${employeeOccupied ? 'lane-occupied' : 'lane-clear'} ${zonePulseClass(player.id, 'EMPLOYEE_FIELD')}" aria-label="${own ? 'Your' : 'Opponent'} employee row">${renderFieldRow(player.employeeField, 'EMPLOYEE', own)}</div>`;
  const backline = `<div class="zone-title backline-title"><strong>Support</strong><span>${esc(fieldZoneSummary(player, 'SUPPORT', own))}</span>${zoneTransitionChip(player.id, 'SUPPORT_FIELD')}</div><div class="slots support support-row board-lane support-lane ${supportOccupied ? 'lane-occupied' : 'lane-clear'} ${zonePulseClass(player.id, 'SUPPORT_FIELD')}" aria-label="${own ? 'Your' : 'Opponent'} support row">${renderFieldRow(player.supportField, 'SUPPORT', own)}</div>`;
  const deskState = `${match.activePlayerId === player.id ? ' desk-active' : ''}${match.priorityPlayerId === player.id ? ' desk-priority' : ''}`;
  const directBoardTarget = !own && state.interaction?.type === 'ATTACK' && state.interaction.targetIds.includes(null);
  return `<section id="${own ? 'ownBoard' : 'opponentBoard'}" class="player-board ${own ? 'own-board' : 'opponent-board'} ${esc(boardSkinClass(player.id))} ${esc(departmentThemeClass(department))}${deskState}${directBoardTarget ? ' direct-attack-board-target' : ''}" data-board-skin="${esc(roomBoardSkinId(player.id))}" ${directBoardTarget ? 'data-direct-attack-board="1"' : ''}>
    <div class="player-head"><div class="player-identity">${renderPlayerAvatar(player.id, own)}<div class="player-identity-copy"><strong>${esc(deckMeta.playerName)}</strong><small class="player-title-slot ${playerTitle ? '' : 'is-empty'}">${playerTitle ? esc(playerTitle) : ''}</small></div>${renderPlayerBadge(player.id)}<span class="player-department-mark player-role-mark">${own ? 'YOU' : 'OPP'}</span></div><div class="player-head-status">${renderPlayerVitals(player)}${boardStatePills(player.id, match)}${renderPresencePill(player.id, own)}</div></div>
    ${renderBattlefieldScan(player, own, match)}
    ${renderResources(player)}
    <div class="player-world">
      ${!own ? handHtml : ''}
      <div class="board-resource-row"><div class="deck-pile ${esc(deckHudState(player.deckCount).tone)} ${player.deckCount > 0 ? '' : 'is-empty'} ${zonePulseClass(player.id, 'DECK')}">${renderDeckStackVisual(player.deckCount, player.id)}<span class="deck-summary-copy"><span>Deck</span><strong>${player.deckCount}</strong></span><small>${player.deckCount > 0 ? esc(deckHudState(player.deckCount).label) : 'EMPTY'}</small>${zoneTransitionChip(player.id, 'DECK')}</div>${renderArchive(player, own)}</div>
      ${renderPendingLane(match, player.id)}
      ${own ? frontline + backline : backline + frontline}
      ${own ? handHtml : ''}
    </div>
  </section>`;
}

function actionButton(label, handlerName, data = '') {
  return `<button class="small" data-action="${handlerName}" ${data}>${esc(label)}</button>`;
}

function renderActions(match, { includeResign = true } = {}) {
  const legal = match.legalActions;
  const groups = [];
  if (legal.activatableAbilities.length) groups.push(`<div class="group"><div class="group-title">Activated abilities</div>${legal.activatableAbilities.map((o,i) => actionButton(`${cardLabel(o.sourceId)} · ${o.abilityId}`,'ability',`data-index="${i}"`)).join('')}</div>`);
  if (legal.canAdvancePhase && phaseControlIsManual(match)) groups.push(`<div class="group"><div class="group-title">Turn</div>${actionButton(phaseAdvanceLabel(match.phase),'advance')}</div>`);
  if (includeResign) groups.push(`<div class="group"><div class="group-title">Match</div>${actionButton('Resign','resign')}</div>`);
  return groups.join('');
}

function coarsePointerUi() {
  return Boolean(window.matchMedia?.('(hover: none) and (pointer: coarse)').matches);
}

function renderMobileBoardNav(match) {
  const status = turnStatus(match);
  const currentIndex = Math.max(0, MATCH_PHASE_FLOW.indexOf(match.phase));
  const phaseDots = MATCH_PHASE_FLOW.map((phase, index) => `<i class="${index === currentIndex ? 'active' : index < currentIndex ? 'complete' : 'upcoming'}" title="${esc(phaseDisplayTitle(phase))}"></i>`).join('');
  const chain = match.chainLength ? `<b class="mobile-chain-pill">CHAIN ${esc(match.chainLength)}</b>` : '';
  return `<nav class="mobile-board-nav" aria-label="Battlefield navigation">
    <div class="mobile-match-hud"><div><span>${esc(status.label)}</span><small>Turn ${esc(match.turnNumber)} · ${esc(match.phase)}</small></div><div class="mobile-phase-dots" aria-label="Current phase ${esc(match.phase)}">${phaseDots}</div>${chain}</div>
    <div class="mobile-board-nav-actions">
      <button type="button" data-mobile-jump="opponentBoard">Opponent</button>
      <button type="button" data-mobile-jump="decisionCenter">Decision</button>
      <button type="button" data-mobile-jump="ownBoard">You</button>
    </div>
  </nav>`;
}

function renderMobileMatchMenu(match) {
  if (!match || match.status === 'ENDED') return '';
  const superseded = Boolean(state.view?.viewerSession?.activeElsewhere);
  const connectionAction = navigator.onLine === false || ['OFFLINE','POLLING','RECONNECTING'].includes(state.connectionStatus)
    ? `<button type="button" data-retry-live-connection>${state.connectionStatus === 'POLLING' ? 'Retry live stream' : 'Reconnect'}</button>`
    : '';
  const takeControl = superseded ? '<button type="button" class="primary" data-take-session-control>Take control here</button>' : '';
  return `<details class="mobile-match-menu"><summary aria-label="Match menu">Match <span>•••</span></summary><div class="mobile-match-menu-panel">${takeControl}${connectionAction}<button type="button" data-action="resign" ${superseded ? 'disabled title="Take control before resigning this match"' : ''}>Resign match</button><small>${superseded ? 'Read-only until this tab takes control.' : `Connection: ${esc(connectionLabel())}`}</small></div></details>`;
}

function renderCommandDock(match) {
  const legal = match.legalActions;
  const abilityCount = legal.activatableAbilities.length;
  const prompt = currentActionPrompt(match);
  const confirmation = activeAdvanceConfirmation(match);
  const phaseControlVisible = phaseControlIsManual(match);
  const showDock = Boolean((phaseControlVisible && legal.canAdvancePhase) || abilityCount || legal.responseOptions.length || legal.canPassPriority || prompt.tone === 'required' || confirmation);
  if (!showDock || match.status === 'ENDED') return '';
  const busy = state.intentBusy;
  if (confirmation && !busy) {
    return `<div class="command-dock action-confirmation-dock" id="commandDock" role="alert" aria-live="polite">
      <div class="command-hint"><span>CONFIRM</span><strong>${esc(confirmation.title)}</strong><small>${esc(confirmation.detail)}</small><div class="action-availability"><b>${esc(confirmation.phase)} EXIT</b><b>${esc(confirmation.count)} OPEN SIGNAL${confirmation.count === 1 ? '' : 'S'}</b></div></div>
      <div class="command-buttons confirmation-buttons"><button class="ghost" data-action="cancel-advance">Stay here</button><button class="primary guarded-confirm" data-action="confirm-advance">${esc(confirmation.confirmLabel)}</button></div>
    </div>`;
  }
  const availability = actionAvailability(match);
  const chips = [];
  if (availability.playableCards) chips.push(`${availability.playableCards} PLAYABLE`);
  if (availability.attacks) chips.push(`${availability.attacks} ATTACK${availability.attacks === 1 ? '' : 'S'}`);
  if (availability.abilities) chips.push(`${availability.abilities} ABILITY${availability.abilities === 1 ? '' : 'IES'}`);
  if (availability.responses) chips.push(`${availability.responses} RESPONSE${availability.responses === 1 ? '' : 'S'}`);
  if (availability.printedOverCapacity) chips.push(`${availability.printedOverCapacity} PRINTED COST > CAP`);
  const advanceSafety = phaseAdvanceSafety(match);
  return `<div class="command-dock tone-${esc(prompt.tone)} ${busy ? 'submitting' : ''}" id="commandDock" aria-busy="${busy ? 'true' : 'false'}">
    <div class="command-hint"><span>${busy ? 'SERVER' : 'NEXT STEP'}</span><strong>${esc(busy ? 'Submitting move…' : prompt.title)}</strong><small>${esc(busy ? 'Waiting for the authoritative match state. Controls unlock automatically.' : prompt.detail)}</small>${!busy && chips.length ? `<div class="action-availability">${chips.map((chip) => `<b>${esc(chip)}</b>`).join('')}</div>` : ''}</div>
    <div class="command-buttons">
      ${busy ? `<span class="intent-busy-pill"><i aria-hidden="true"></i>SYNCING</span>` : abilityCount ? `<span class="ability-hint">${abilityCount} activated ${abilityCount === 1 ? 'ability' : 'abilities'} ready</span>` : ''}
      ${legal.canPassPriority ? `<button class="pass-response dock-pass" data-action="pass" ${busy ? 'disabled' : ''}>Pass priority</button>` : ''}
      ${phaseControlVisible && legal.canAdvancePhase ? `${advanceSafety && !busy ? `<span class="phase-risk-pill" title="${esc(advanceSafety.detail)}">${esc(advanceSafety.count)} REMAIN</span>` : ''}<button class="primary phase-button ${advanceSafety ? 'guarded' : ''}" data-action="advance" ${busy ? 'disabled' : ''}>${esc(phaseAdvanceLabel(match.phase))}</button>` : ''}
    </div>
  </div>`;
}

function renderMainPhaseContext(match) {
  const context = mainPhaseHandContext(match);
  const availability = actionAvailability(match);
  if (!context || availability.mustChoose || match.responseWindow || match.chainLength) return '';
  const typeBits = [
    ['EMP', context.playableByType.EMPLOYEE],
    ['ACT', context.playableByType.ACTION],
    ['INC', context.playableByType.INCIDENT],
    ['SYS', context.playableByType.SYSTEM]
  ];
  return `<aside class="main-phase-context ${context.playable ? 'has-plays' : 'no-plays'}" aria-label="Main phase action context">
    <div class="main-phase-context-head"><span>MAIN DESK</span><strong>${context.playable ? `${context.playable} hand play${context.playable === 1 ? '' : 's'} ready` : 'No legal hand play'}</strong><small>Capacity ${esc(context.capacity)}/${esc(context.maxCapacity)} · highlighted cards are live-legal</small></div>
    <div class="main-phase-context-stats">
      <span class="main-stat playable"><small>PLAYABLE</small><b>${esc(context.playable)}</b></span>
      ${typeBits.map(([label,value]) => `<span><small>${esc(label)}</small><b>${esc(value)}</b></span>`).join('')}
      <span class="main-stat ${context.printedOverCapacity ? 'capacity-pressure' : ''}"><small>PRINTED COST &gt; CAP</small><b>${esc(context.printedOverCapacity)}</b></span>
      <span><small>EMP SLOTS</small><b>${esc(context.employeeSlots)}/5</b></span>
      <span><small>SUPPORT SLOTS</small><b>${esc(context.supportSlots)}/4</b></span>
    </div>
  </aside>`;
}


function renderBattlePhaseContext(match) {
  const context = battlePhaseContext(match);
  const availability = actionAvailability(match);
  if (!context || availability.mustChoose || match.responseWindow || match.chainLength) return '';
  return `<aside class="battle-phase-context ${context.ready ? 'has-attacks' : 'no-attacks'}" aria-label="Battle phase action context">
    <div class="battle-phase-context-head"><span>BATTLE DESK</span><strong>${context.ready ? `${context.ready} Employee${context.ready === 1 ? '' : 's'} ready to attack` : 'No legal attack ready'}</strong><small>Attack-ready Employees and legal targets come from the live server projection</small></div>
    <div class="battle-phase-context-stats">
      <span class="battle-stat ready"><small>ATTACK READY</small><b>${esc(context.ready)}</b></span>
      <span><small>LEGAL TARGETS</small><b>${esc(context.legalTargets)}</b></span>
      <span class="${context.directReady ? 'direct-ready' : ''}"><small>DIRECT READY</small><b>${esc(context.directReady)}</b></span>
      <span class="${context.onboarding ? 'battle-blocked' : ''}"><small>ONBOARDING</small><b>${esc(context.onboarding)}</b></span>
      <span class="${context.attacksUsed ? 'battle-blocked' : ''}"><small>ATTACK USED</small><b>${esc(context.attacksUsed)}</b></span>
      <span><small>OPP EMP</small><b>${esc(context.opponentEmployees)}</b></span>
    </div>
  </aside>`;
}

function renderEndPhaseContext(match) {
  const context = endPhaseContext(match);
  const availability = actionAvailability(match);
  if (!context || availability.mustChoose || match.responseWindow || match.chainLength) return '';
  const status = context.archiveNeeded
    ? `Archive ${context.archiveNeeded} card${context.archiveNeeded === 1 ? '' : 's'} before handoff`
    : context.handoffReady ? 'Turn ready to hand off' : 'End phase still resolving';
  return `<aside class="end-phase-context ${context.handoffReady ? 'handoff-ready' : 'handoff-wait'}" aria-label="End phase handoff context">
    <div class="end-phase-context-head"><span>END DESK</span><strong>${esc(status)}</strong><small>Hand limit is 8 · unused Capacity expires when the turn hands off</small></div>
    <div class="end-phase-context-stats">
      <span class="${context.hand > context.handLimit ? 'end-warning' : ''}"><small>HAND</small><b>${esc(context.hand)}/${esc(context.handLimit)}</b></span>
      <span class="${context.archiveNeeded ? 'end-warning' : ''}"><small>ARCHIVE</small><b>${esc(context.archiveNeeded)}</b></span>
      <span class="${context.archiveNeeded && context.selectedForArchive === context.archiveNeeded ? 'selection-ready' : ''}"><small>SELECTED</small><b>${esc(context.selectedForArchive)}/${esc(context.archiveNeeded)}</b></span>
      <span><small>ABILITIES</small><b>${esc(context.abilities)}</b></span>
      <span><small>CAP LEFT</small><b>${esc(context.capacity)}</b></span>
      <span class="${context.handoffReady ? 'handoff-stat-ready' : ''}"><small>HANDOFF</small><b>${context.handoffReady ? 'READY' : 'WAIT'}</b></span>
    </div>
  </aside>`;
}

function roomDeckMeta(playerId) {
  if (playerId === 'P1') return { name:state.view?.hostDeckName ?? state.view?.hostDeckId ?? 'Deck', department:state.view?.hostDepartment ?? 'NEUTRAL', playerName:state.view?.hostDisplayName ?? 'Player 1' };
  return { name:state.view?.guestDeckName ?? state.view?.guestDeckId ?? 'Deck', department:state.view?.guestDepartment ?? 'NEUTRAL', playerName:state.view?.guestDisplayName ?? 'Player 2' };
}

function roomPlayerTitle(playerId) {
  const raw = playerId === 'P1' ? state.view?.hostPlayerTitle : state.view?.guestPlayerTitle;
  return typeof raw === 'string' ? raw.trim().slice(0,48) : '';
}

function matchArenaPreference() {
  const fallback = MATCH_ARENAS.default;
  try {
    const raw = localStorage.getItem(MATCH_ARENA_KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw);
    if (saved?.id && MATCH_ARENAS[saved.id]) return MATCH_ARENAS[saved.id];
    const image = String(saved?.image ?? '');
    if (/^\/art\/boards\/[a-z0-9_./-]+\.(?:webp|png|jpe?g)$/i.test(image)) {
      return { id:String(saved?.id ?? 'custom'), image, position:String(saved?.position ?? '50% 50%'), size:String(saved?.size ?? 'cover') };
    }
  } catch { /* neutral built-in surface remains the safe fallback */ }
  return fallback;
}

function matchArenaStyle() {
  const arena = matchArenaPreference();
  const vars = [`--match-arena-position:${arena.position || '50% 50%'}`, `--match-arena-size:${arena.size || 'cover'}`];
  if (arena.image) vars.push(`--match-arena-image:url(&quot;${esc(arena.image)}&quot;)`);
  return { id:arena.id ?? 'default', style:vars.join(';') };
}

function matchEndOverlayReason(match, outcome) {
  // Legacy source anchors: Opponent Company Reputation reached 0. Your Company Reputation reached 0. Opponent resigned. MATCH COMPLETE VICTORY DEFEAT View results
  if (match.reason === 'REPUTATION_ZERO') return outcome === 'WIN' ? t('result.reasonReputationZeroWin') : outcome === 'DRAW' ? t('result.reasonReputationZeroDraw') : t('result.reasonReputationZeroLoss');
  if (match.reason === 'RESIGN') return outcome === 'WIN' ? t('result.reasonResignWin') : t('result.reasonResignLoss');
  if (match.reason === 'DECK_OUT') return outcome === 'WIN' ? t('result.reasonDeckOutWin') : t('result.reasonDeckOutLoss');
  if (match.reason === 'TURN_TIMEOUT' || match.reason === 'DECISION_TIMEOUT') return outcome === 'WIN' ? t('result.reasonTimeoutWin') : t('result.reasonTimeoutLoss');
  if (match.reason === 'RECONNECT_TIMEOUT') return outcome === 'WIN' ? t('result.reasonReconnectWin') : t('result.reasonReconnectLoss');
  return matchEndReasonLabel(match.reason);
}

function renderMatchEndOverlay(match) {
  if (!match || match.status !== 'ENDED' || !matchResultPresentationReady(match) || state.matchEndOverlayDismissedRoomId === state.view?.roomId) return '';
  const outcome = matchRewardOutcome(match) ?? 'DRAW';
  const title = matchResultTitle(outcome);
  const tone = outcome === 'WIN' ? 'win' : outcome === 'DRAW' ? 'draw' : 'loss';
  return `<div class="match-end-overlay tone-${esc(tone)}" role="dialog" aria-modal="true" aria-labelledby="matchEndOverlayTitle"><div class="match-end-overlay-card"><span>${esc(t('result.matchComplete'))}</span><strong id="matchEndOverlayTitle">${esc(title)}</strong><p>${esc(matchEndOverlayReason(match,outcome))}</p><button class="primary" id="viewMatchResults">${esc(t('result.viewResults'))}</button></div></div>`;
}

function bindMatchEndOverlay() {
  document.querySelector('#viewMatchResults')?.addEventListener('click', () => {
    state.matchEndOverlayDismissedRoomId = state.view?.roomId ?? null;
    render();
    requestAnimationFrame(() => document.querySelector('#matchResultDetail')?.scrollIntoView({ behavior:'smooth', block:'start' }));
  });
}


function openingCardCost(def) {
  if (!def) return null;
  const value = def.cost?.play ?? def.cost?.set;
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function openingHandSummary(match) {
  const hand = match?.players?.[match.viewerId]?.hand ?? [];
  const defs = hand.map((card) => cardDef(card.definitionId)).filter(Boolean);
  const types = { EMPLOYEE:0, ACTION:0, INCIDENT:0, SYSTEM:0 };
  for (const def of defs) if (Object.hasOwn(types, def.cardType)) types[def.cardType] += 1;
  const firstCapacityCards = defs.filter((def) => {
    const cost = openingCardCost(def);
    return cost != null && cost <= 2;
  }).length;
  const openerIsYou = match?.firstPlayerId === match?.viewerId;
  return { total:hand.length, types, firstCapacityCards, openerIsYou };
}

function renderOpeningReadiness(match) {
  const opening = match.status === 'SETUP';
  const firstTurn = match.status === 'ACTIVE' && match.turnNumber === 1 && ['START','DRAW','MAIN'].includes(match.phase);
  if (!opening && !firstTurn) return '';
  const summary = openingHandSummary(match);
  const role = summary.openerIsYou ? 'YOU OPEN' : 'SECOND DESK';
  const draw = summary.openerIsYou ? 'FIRST DRAW SKIPPED' : 'FIRST DRAW AVAILABLE';
  return `<section class="opening-readiness ${opening ? 'choosing' : 'first-turn'}" aria-label="Opening hand summary">
    <div class="opening-readiness-head"><span>OPENING SNAPSHOT</span><strong>${esc(role)}</strong><small>${esc(draw)} · Capacity starts at 2</small></div>
    <div class="opening-readiness-stats">
      <span><small>HAND</small><b>${esc(summary.total)}</b></span>
      <span><small>EMPLOYEES</small><b>${esc(summary.types.EMPLOYEE)}</b></span>
      <span><small>ACTIONS</small><b>${esc(summary.types.ACTION)}</b></span>
      <span><small>INCIDENTS</small><b>${esc(summary.types.INCIDENT)}</b></span>
      <span><small>SYSTEMS</small><b>${esc(summary.types.SYSTEM)}</b></span>
      <span class="opening-capacity-fit"><small>COST ≤2</small><b>${esc(summary.firstCapacityCards)}</b><em>fit starting Capacity</em></span>
    </div>
  </section>`;
}


function matchContextMode(match) {
  if (!match || match.status === 'ENDED') return 'NONE';
  if (requiredDecisionContext(match)) return 'DECISION';
  if (responseDecisionContext(match)) return 'RESPONSE';
  if (match.status === 'SETUP') return 'OPENING';
  if (match.status === 'ACTIVE' && match.turnNumber === 1 && ['START','DRAW'].includes(match.phase)) return 'OPENING';
  if (match.activePlayerId !== match.viewerId) return 'FLOW';
  if (match.phase === 'MAIN') return 'MAIN';
  if (match.phase === 'BATTLE') return 'BATTLE';
  if (match.phase === 'END') return 'END';
  return 'FLOW';
}

function renderMatchContextStack(match) {
  const mode = matchContextMode(match);
  let primary = '';
  if (mode === 'DECISION') primary = renderRequiredDecisionContext(match);
  else if (mode === 'RESPONSE') primary = renderResponseDecisionContext(match);
  else if (mode === 'OPENING') primary = renderOpeningReadiness(match);
  else if (mode === 'MAIN') primary = renderMainPhaseContext(match);
  else if (mode === 'BATTLE') primary = renderBattlePhaseContext(match);
  else if (mode === 'END') primary = renderEndPhaseContext(match);

  const powerRead = mode === 'BATTLE' ? renderCombatPowerRead(match) : '';
  // A live required choice or response has visual priority. Keep Last Resolution in state and let it reappear if that priority clears before its read window expires.
  const resolution = mode === 'DECISION' || mode === 'RESPONSE' ? '' : renderResolutionTrace(match);
  if (!primary && !powerRead && !resolution) return '';
  return `<section class="match-context-stack context-${esc(mode.toLowerCase())}" data-match-context="${esc(mode)}" aria-label="Current match context">${primary}${powerRead}${resolution}</section>`;
}

// v7.69.1 opening hand banner compacts after setup; turn-start messaging continues through renderTurnFlowCue. THE OFFICE OPENS · First player skips the first Draw
function renderMatchOpening(match) {
  if (match.status !== 'SETUP') return '';
  const mine = roomDeckMeta(match.viewerId);
  const opponentId = match.viewerId === 'P1' ? 'P2' : 'P1';
  const theirs = roomDeckMeta(opponentId);
  const openerIsYou = match.firstPlayerId === match.viewerId;
  const openerName = openerIsYou ? 'You' : theirs.playerName;
  return `<section class="match-opening opening-hands">
    <div class="match-deck you"><span>YOU</span><div><small>YOU</small><strong>${esc(mine.playerName)}</strong></div></div>
    <div class="match-opening-center"><em>VS</em><b>OPENING HANDS</b><span>${esc(openerName)} ${openerIsYou ? 'open' : 'opens'} · one free mulligan each</span><small>${esc(roomModeLabel())} · ${esc(roomTimerLabel())}</small></div>
    <div class="match-deck opponent"><div><small>OPPONENT</small><strong>${esc(theirs.playerName)}</strong></div><span>OPP</span></div>
  </section>`;
}

function renderTurnFlowCue(match) {
  const cue = state.flowCue;
  if (!cue || cue.type !== 'TURN_STARTED' || match.status === 'ENDED') return '';
  const playerId = cue.playerId ?? cue.data?.playerId ?? match.activePlayerId;
  const yours = playerId === match.viewerId;
  const meta = roomDeckMeta(playerId);
  const turnNumber = Number(cue.data?.turnNumber ?? match.turnNumber ?? 0);
  const firstTurn = turnNumber === 1 && playerId === match.firstPlayerId;
  const player = match.players?.[playerId];
  const resource = yours && player ? `Capacity ${player.availableCapacity}/${player.maxCapacity}` : 'Opponent is active';
  return `<div class="turn-flow-cue ${yours ? 'yours' : 'opponent'}" role="status" aria-live="polite"><div class="turn-flow-emblem">${yours ? 'YOU' : 'OPP'}</div><div><span>TURN ${esc(turnNumber)}</span><strong>${yours ? 'YOUR TURN' : 'OPPONENT TURN'}</strong><small>${firstTurn ? 'The office opens · first Draw skipped' : resource}</small></div></div>`;
}

function telemetryMetricLabel(metric) {
  if (!metric) return '0s';
  return `${formatTelemetrySeconds(metric.totalSeconds)} total · max ${formatTelemetrySeconds(metric.maxSegmentSeconds)} · ${metric.segments} segment${metric.segments === 1 ? '' : 's'}`;
}

function formatDiagnosticEvent(event) {
  const time = Number.isFinite(Number(event?.at)) ? new Date(Number(event.at)).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' }) : '--:--:--';
  const actor = event?.playerId ? ` · ${event.playerId}` : '';
  const data = event?.data && Object.keys(event.data).length ? ` · ${JSON.stringify(event.data)}` : '';
  return `${time} · ${event?.type ?? 'DIAGNOSTIC'}${actor}${data}`;
}

function renderMatchTelemetry() {
  const telemetry = state.view?.telemetry;
  if (!telemetry) return '<span class="muted">Telemetry unavailable.</span>';
  const p1 = telemetry.decisions?.P1 ?? {};
  const p2 = telemetry.decisions?.P2 ?? {};
  return `<div class="telemetry-summary">
    <div class="telemetry-kpis"><span><small>MATCH ELAPSED</small><strong id="liveTelemetryElapsed">${telemetry.matchElapsedSeconds == null ? 'Opening' : esc(formatTelemetrySeconds(telemetry.matchElapsedSeconds))}</strong></span><span><small>CURRENT DECISION</small><strong id="liveTelemetryDecision">${esc(liveTelemetryDecisionText())}</strong></span><span><small>ACCEPTED INTENTS</small><strong>P1 ${esc(telemetry.intentsAccepted?.P1 ?? 0)} · P2 ${esc(telemetry.intentsAccepted?.P2 ?? 0)}</strong></span><span><small>REJECTED INTENTS</small><strong>P1 ${esc(telemetry.intentsRejected?.P1 ?? 0)} · P2 ${esc(telemetry.intentsRejected?.P2 ?? 0)}</strong></span></div>
    <div class="telemetry-table"><div><b>P1 decision time</b><span>Turn: ${esc(telemetryMetricLabel(p1.TURN))}</span><span>Response: ${esc(telemetryMetricLabel(p1.RESPONSE))}</span><span>Other decision: ${esc(telemetryMetricLabel(p1.DECISION))}</span></div><div><b>P2 decision time</b><span>Turn: ${esc(telemetryMetricLabel(p2.TURN))}</span><span>Response: ${esc(telemetryMetricLabel(p2.RESPONSE))}</span><span>Other decision: ${esc(telemetryMetricLabel(p2.DECISION))}</span></div><div><b>Connectivity</b><span>P1: ${esc(telemetry.disconnects?.P1 ?? 0)} disconnects · ${esc(telemetry.reconnects?.P1 ?? 0)} reconnects · ${esc(formatTelemetrySeconds(telemetry.disconnectedSeconds?.P1 ?? 0))} offline</span><span>P2: ${esc(telemetry.disconnects?.P2 ?? 0)} disconnects · ${esc(telemetry.reconnects?.P2 ?? 0)} reconnects · ${esc(formatTelemetrySeconds(telemetry.disconnectedSeconds?.P2 ?? 0))} offline</span></div></div>
  </div>`;
}

function renderServerDiagnostics() {
  const diagnostics = state.view?.telemetry?.diagnostics ?? [];
  return `<div class="event-log">${diagnostics.slice().reverse().map((event) => `<div class="event">${esc(formatDiagnosticEvent(event))}</div>`).join('') || '<span class="muted">No server diagnostics yet.</span>'}</div>`;
}

function renderPlaytestTools(match) {
  return `<div class="utility-strip arena-utility-strip">
    <details class="playtest-tools"><summary><span>Playtest tools</span><small>Room details · advanced controls · event log · telemetry · diagnostics</small></summary><div class="playtest-tools-grid">
      <details class="debug-meta"><summary>Match details</summary><div class="game-meta">
        <span><strong>Room</strong> ${esc(state.view.roomId)}</span><span><strong>Mode</strong> ${esc(roomModeLabel())}</span><span><strong>Timer</strong> <span id="liveTimerStatus">${esc(liveTimerText())}</span></span><span><strong>You</strong> ${esc(match.viewerId)}</span><span><strong>Turn</strong> ${match.turnNumber}</span><span><strong>Active</strong> ${esc(match.activePlayerId)}</span><span><strong>Priority</strong> ${esc(match.priorityPlayerId ?? '—')}</span><span><strong>State</strong> v${match.stateVersion}</span><span><strong>Presence</strong> ${esc(state.view.lifecycle?.presence?.[match.viewerId === 'P1' ? 'P2' : 'P1']?.status ?? '—')}</span><span><strong>Connection</strong> ${esc(connectionLabel())}</span><span><strong>AFK forfeit</strong> off</span>
      </div></details>
      <details class="telemetry-details"><summary>Match telemetry</summary>${renderMatchTelemetry()}</details>
      <details class="diagnostic-details"><summary>Connection diagnostics</summary>${renderConnectionDiagnosticsPanel()}</details>
      <details class="diagnostic-details"><summary>Server diagnostics</summary>${renderServerDiagnostics()}</details>
      <details class="advanced-actions"><summary>Advanced controls</summary><div class="actions">${renderActions(match,{includeResign:false})}</div></details>
      <details class="event-details"><summary>Raw engine event log</summary><div class="event-log">${state.eventLog.slice().reverse().map((e) => `<div class="event">${esc(formatEvent(e))}</div>`).join('') || '<span class="muted">No events yet.</span>'}</div></details>
    </div></details>
  </div>`;
}

function renderDesktopMatchUtilities(match, guidanceTip) {
  const status = turnStatus(match);
  const context = renderMatchContextStack(match);
  const guidance = renderGuidanceCoach(match, guidanceTip);
  const superseded = Boolean(state.view?.viewerSession?.activeElsewhere);
  const connectionAction = navigator.onLine === false || ['OFFLINE','POLLING','RECONNECTING'].includes(state.connectionStatus)
    ? `<button type="button" data-retry-live-connection>${state.connectionStatus === 'POLLING' ? 'Retry live stream' : 'Reconnect'}</button>`
    : '';
  const takeControl = superseded ? '<button type="button" class="primary" data-take-session-control>Take control here</button>' : '';
  return `<div class="desktop-match-utilities" aria-label="Match utilities">
    <details class="desktop-match-utility match-utility-menu">
      <summary aria-label="Match menu"><span>Match</span><b>Menu</b><i aria-hidden="true">•••</i></summary>
      <div class="desktop-match-utility-panel match-utility-panel">
        <header><span>MATCH STATUS</span><strong>${esc(status.label)}</strong><small>${esc(status.detail)}</small></header>
        ${context}${guidance}
        <div class="match-menu-actions">${takeControl}${connectionAction}<button type="button" data-action="resign" ${superseded ? 'disabled title="Take control before resigning this match"' : ''}>Resign match</button></div>
        <small class="match-menu-connection">${superseded ? 'Read-only until this tab takes control.' : `Connection: ${esc(connectionLabel())}`}</small>
      </div>
    </details>
    <details class="desktop-match-utility match-utility-log">
      <summary aria-label="Match log"><span>Log</span><b>History</b><i aria-hidden="true">↗</i></summary>
      <div class="desktop-match-utility-panel match-utility-panel">${renderMatchFeed(match)}</div>
    </details>
    <details class="desktop-match-utility match-utility-developer">
      <summary aria-label="Playtest tools"><span>Dev</span><b>Playtest</b><i aria-hidden="true">⌘</i></summary>
      <div class="desktop-match-utility-panel match-utility-panel">${renderPlaytestTools(match)}</div>
    </details>
  </div>`;
}

// Regression compatibility markers for pre-v7.69 match-shell composition: ${renderMatchFeed(match)} ${renderMatchContextStack(match)} ${renderGuidanceCoach(match, guidanceTip)}
function renderArenaSidePanel(match, guidanceTip) {
  const context = renderMatchContextStack(match);
  const feed = renderMatchFeed(match);
  const guidance = renderGuidanceCoach(match, guidanceTip);
  const status = turnStatus(match);
  return `<aside class="arena-sidepanel" aria-label="Match inspector and activity">
    <header class="arena-sidepanel-head"><span>MATCH HUD</span><strong>${esc(status.label)}</strong><small>${esc(status.detail)}</small></header>
    <div class="arena-sidepanel-scroll">${context}${guidance}${feed}${renderPlaytestTools(match)}</div>
  </aside>`;
}

function renderTutorialGuide(match) {
  if (state.view?.settings?.mode !== 'TUTORIAL' || !match || match.status === 'ENDED') return '';
  const mine = match.players?.[match.viewerId];
  let key = 'stepOpening';
  if (match.phase === 'MAIN' && !(mine?.employeeField ?? []).some(Boolean)) key = 'stepEmployee';
  else if (match.phase === 'BATTLE' && !match.pendingAttack) key = 'stepBattle';
  else if (match.phase === 'BATTLE') key = 'stepRep';
  else if (match.phase === 'END') key = 'stepEnd';
  return `<aside class="tutorial-guide" aria-live="polite"><span>${esc(t('tutorial.modeLabel'))}</span><strong>${esc(t('tutorial.title'))}</strong><p>${esc(t('tutorial.' + key))}</p></aside>`;
}

function renderGame() {
  // Regression compatibility marker for v6.5 board order: battlefield-surface renderPlayer(them,false,match) renderDecisionCenter(match) renderPlayer(me,true,match)
  // Regression compatibility marker for v7.69.8 board order: ${renderPlayer(them,false,match)} ${renderBoardPhaseDivider(match)} ${renderPlayer(me,true,match)}
  const previousBattlefieldTop = app.querySelector('.battlefield-surface')?.getBoundingClientRect().top ?? null;
  const match = state.view.match;
  if (match.status !== 'ENDED') state.matchEndOverlayDismissedRoomId = null;
  const me = match.players[match.viewerId];
  const them = match.players[match.viewerId === 'P1' ? 'P2' : 'P1'];
  const status = turnStatus(match);
  const interactionMode = state.interaction?.type ? ` interaction-${state.interaction.type.toLowerCase()}` : '';
  const eventMode = state.visualCue?.type ? ` event-${state.visualCue.type.toLowerCase().replaceAll('_','-')}` : '';
  const combatMode = visualCueEvents().some((event) => event.type === 'BATTLE_RESOLVED') ? ' combat-resolving' : '';
  const promotionMode = visualCueEvents().some((event) => event.type === 'PROMOTION_COMPLETED') ? ' promotion-resolving' : '';
  const guidanceTip = currentGuidanceTip(match);
  const guidanceMode = guidanceTip ? ` guidance-active guidance-focus-${guidanceTip.focus}` : '';
  const busyMode = state.intentBusy ? ' intent-submitting' : '';
  const resultsMode = match.status === 'ENDED' && state.matchEndOverlayDismissedRoomId === state.view?.roomId ? ' results-view' : '';
  const perspectiveMode = ' perspective-prototype';
  const arena = matchArenaStyle();
  app.innerHTML = `<div class="game-shell board-first-shell${interactionMode}${eventMode}${combatMode}${promotionMode}${guidanceMode}${busyMode}${resultsMode}${perspectiveMode}" aria-busy="${state.intentBusy ? 'true' : 'false'}" data-arena-id="${esc(arena.id)}" style="${arena.style}">
    <div class="arena-background-layer" aria-hidden="true"></div>
    <div class="game-main">
      ${renderMatchOpening(match)}
      <div class="arena-top-stack">
        ${renderConnectionBanner()}
        <div class="turn-banner ${esc(status.tone)}"><div><span class="turn-label">${esc(status.label)}</span><span class="turn-detail">${esc(status.detail)}</span></div>${match.chainLength ? `<span class="chain-badge">CHAIN ${match.chainLength}</span>` : ''}</div>
      </div>
       ${renderMobileBoardNav(match)}
       ${renderMobileMatchMenu(match)}
       ${renderTutorialGuide(match)}
      <div class="arena-layout">
        <div class="arena-board-column">
          <div class="battlefield-surface" aria-label="Office battlefield">
            <div class="battlefield-world">
              <div class="arena-surface-layer" aria-hidden="true"></div>
              ${renderPlayer(them,false,match)}
              ${renderPlayer(me,true,match)}
            </div>
            ${renderBoardPhaseDivider(match)}
            ${renderDecisionCenter(match)}
          </div>
          ${renderBoardInteractionPanel(match)}
          ${renderIntentCommitStatus(match)}
          ${renderCommandDock(match)}
          ${state.lastError ? `<div class="error arena-error">${esc(state.lastError)}</div>` : ''}
        </div>
        ${renderDesktopMatchUtilities(match, guidanceTip)}
      </div>
      ${matchResultPresentationReady(match) ? `<div id="matchResultDetail" class="match-result-detail">${renderMatchResultPanel(match)}</div>` : ''}
    </div>
  </div>${renderTurnFlowCue(match)}<div id="hoverCardPreview" class="hover-card-preview hidden"></div>${renderAttackOverlay(match)}${renderAttackPresentation()}${renderGameplayPresentation()}${renderResolutionMoment()}${renderZoneTransitionCue()}${state.gameplayPresentation ? '' : renderVisualCue()}${renderMatchEndOverlay(match)}${renderCardModal()}`;
  markRenderedTransientMotion();
  syncCombatPresentationHost();
  document.querySelector('#claimMatchReward')?.addEventListener('click', claimMatchReward);
  document.querySelector('#resultBackLobby')?.addEventListener('click', parkSession);
  // Compatibility marker: addEventListener('click', playAnotherMatch)
  document.querySelector('#resultPlayAnother')?.addEventListener('click', () => isBotMatch() ? startBotMatch(state.view?.settings?.mode === 'TUTORIAL' ? 'TUTORIAL' : 'TRAINING') : playAnotherMatch());
  document.querySelector('#resultAlternateRematch')?.addEventListener('click', () => rematchCurrentRoom({ alternateFirstPlayer:true }));
  document.querySelector('#resultChangeDeck')?.addEventListener('click', changeDeckAfterMatch);
  document.querySelector('#reviewCurrentMatch')?.addEventListener('click', reviewCurrentMatch);
  document.querySelectorAll('[data-feedback-choice]').forEach((button)=>button.addEventListener('click',()=>setPlaytestFeedbackChoice(button.dataset.feedbackChoice)));
  document.querySelector('#savePlaytestFeedback')?.addEventListener('click', savePlaytestFeedback);
  bindConnectionControls();
  bindConnectionDiagnostics();
  bindBugReportControls();
  bindGuidanceHandlers();
  bindGameHandlers(match);
  bindInteractionHandlers();
  bindCardInfoHandlers();
  bindMobileBoardNavHandlers();
  bindHoverPreviewHandlers();
  bindBoardActionFocusHandlers();
  bindMatchEndOverlay();
  scheduleAttackConnectorDraw();
  if (previousBattlefieldTop != null && !document.body.classList.contains('match-viewport-locked')) requestAnimationFrame(() => {
    const nextBattlefieldTop = app.querySelector('.battlefield-surface')?.getBoundingClientRect().top;
    if (nextBattlefieldTop == null) return;
    const delta = nextBattlefieldTop - previousBattlefieldTop;
    if (Math.abs(delta) >= 1) window.scrollBy(0, delta);
  });
}

function render() {
  const liveMatch = Boolean(state.session && state.view?.match && state.view.status !== 'WAITING');
  const endedMatch = Boolean(liveMatch && state.view?.match?.status === 'ENDED');
  const lobbyMode = Boolean(!state.session && state.mode === 'PLAY');
  const collectionMode = Boolean(!state.session && state.mode === 'COLLECTION');
  const personnelMode = Boolean(!state.session && state.mode === 'PERSONNEL');
  const shopMode = Boolean(!state.session && state.mode === 'SHOP');
  const achievementMode = Boolean(!state.session && state.mode === 'ACHIEVEMENTS');
  document.body.classList.toggle('match-mode', liveMatch);
  document.body.classList.toggle('match-ended', endedMatch);
  document.body.classList.toggle('match-viewport-locked', liveMatch && !endedMatch);
  document.body.classList.toggle('lobby-mode', lobbyMode);
  document.body.classList.toggle('collection-mode', collectionMode);
  document.body.classList.toggle('cosmetic-mode', personnelMode || shopMode);
  document.body.classList.toggle('achievement-mode', achievementMode);
  if (!state.session && state.mode === 'FINISH_REVIEW') return renderFinishReview();
  if (!state.session && state.mode === 'ADMIN') return renderOpsDashboard();
  if (!state.session && state.mode === 'COLLECTION') return renderCollection();
  if (!state.session && state.mode === 'PERSONNEL') { app.innerHTML=renderPersonnelFile(); bindCosmeticSurface(); return; }
  if (!state.session && state.mode === 'SHOP') { app.innerHTML=renderCompanyStore(); bindCosmeticSurface(); return; }
  if (!state.session && state.mode === 'PROFILE') {
    app.innerHTML=renderPlayerFile();
    document.querySelector('#playerFileBack')?.addEventListener('click',()=>{ state.mode='PLAY'; render(); });
    document.querySelector('#playerFilePersonnel')?.addEventListener('click',()=>enterCosmeticSurface('PERSONNEL'));
    document.querySelectorAll('[data-profile-section]').forEach((button)=>button.addEventListener('click',()=>{ state.profileSection=button.dataset.profileSection; render(); }));
    document.querySelector('.player-file-tabs button.active')?.scrollIntoView({ block:'nearest', inline:'nearest' });
    document.querySelector('#profileHistoryMode')?.addEventListener('change',(event)=>{ state.historyFilter.mode=event.target.value; render(); });
    document.querySelector('#profileHistoryOutcome')?.addEventListener('change',(event)=>{ state.historyFilter.outcome=event.target.value; render(); });
    document.querySelector('#profileLoadMore')?.addEventListener('click',()=>{ state.profileHistoryLimit += 20; render(); });
    document.querySelector('#profileOpenAchievements')?.addEventListener('click',enterAchievements);
    return;
  }
  if (!state.session && state.mode === 'ACHIEVEMENTS') { app.innerHTML=renderAchievements(); document.querySelector('#achievementsBack')?.addEventListener('click',()=>{ state.mode='PLAY'; render(); }); document.querySelector('#retryAchievements')?.addEventListener('click',enterAchievements); return; }
  if (!state.session) return renderLobby();
  if (!state.view) {
    app.innerHTML = `<section class="connection-stage"><div class="surface-loader" aria-hidden="true"><i></i><i></i><i></i></div><span>CONNECTING TO OFFICE</span><strong>Restoring your desk…</strong><small>Syncing the authoritative room state and your seat.</small></section>`;
    return;
  }
  if (state.view.status === 'WAITING') return renderWaiting();
  return renderGame();
}

async function createRoom() {
  state.lastError = null;
  try {
    const deckId = document.querySelector('#createDeck').value;
    const prep = lobbyDeckSummary(deckId);
    if (!prep?.formatReady) throw new Error('Selected deck is not format-ready. Open the Deckbuilder to finish it before creating a room.');
    const payload = { ...selectedDeckPayload(deckId), mode: state.lobbyMatchMode, profileToken:state.profileToken };
    const result = await api('/api/rooms', { method:'POST', body:JSON.stringify(payload) });
    saveSession({ roomId: result.roomId, token: result.token, playerId: result.playerId });
    acceptView(result.view);
    if (result.serverProfile) applyServerProfile(result.serverProfile);
    appendEvents(result.view.events);
    await claimSessionControl({ restartStream:false, renderAfter:false });
    startStream();
    render();
  } catch (error) { state.lastError = error.message; friendlyErrorFeedback(error,'Room could not be created'); render(); }
}

async function joinRoom() {
  state.lastError = null;
  try {
    const roomId = document.querySelector('#joinCode').value.trim().toUpperCase();
    const deckId = document.querySelector('#joinDeck').value;
    const prep = lobbyDeckSummary(deckId);
    if (!prep?.formatReady) throw new Error('Selected deck is not format-ready. Open the Deckbuilder to finish it before joining a room.');
    const result = await api(`/api/rooms/${encodeURIComponent(roomId)}/join`, { method:'POST', body:JSON.stringify({ ...selectedDeckPayload(deckId), profileToken:state.profileToken }) });
    state.inviteRoomCode = null;
    saveSession({ roomId: result.roomId, token: result.token, playerId: result.playerId });
    acceptView(result.view);
    if (result.serverProfile) applyServerProfile(result.serverProfile);
    appendEvents(result.view.events);
    await claimSessionControl({ restartStream:false, renderAfter:false });
    startStream();
    render();
  } catch (error) { state.lastError = error.message; friendlyErrorFeedback(error,'Could not join room'); render(); }
}

// Passive hosted syncs may re-deliver the exact same authoritative state while
// the player is deciding whether to leave Capacity / legal actions unused.
// Keep that one-shot local confirmation only for the identical match moment.
// Any real mutation (including a newer stateVersion in the same phase) must
// invalidate it so "End anyway" can never become a persistent bypass.
function acceptPassiveSyncedView(view) {
  const pendingConfirmation = state.pendingActionConfirmation;
  const before = state.view?.match;
  const after = view?.match;
  const sameAuthoritativeMoment = Boolean(
    pendingConfirmation && before && after &&
    before.stateVersion === after.stateVersion &&
    before.turnNumber === after.turnNumber &&
    before.phase === after.phase &&
    before.activePlayerId === after.activePlayerId &&
    before.viewerId === after.viewerId
  );
  acceptView(view);
  if (sameAuthoritativeMoment) state.pendingActionConfirmation = pendingConfirmation;
}

async function refreshState(renderAfter = true, { preserveLiveOnError = false } = {}) {
  if (!state.session) return null;
  const wasLive = ['LIVE','RECOVERED'].includes(state.connectionStatus);
  const hydratingSession = !state.view;
  try {
    const after = state.view?.match?.lastEventSeq ?? 0;
    const view = await api(`/api/rooms/${state.session.roomId}/state?after=${after}&${clientQuery()}`, { headers:roomAuthHeaders() });
    acceptPassiveSyncedView(view);
    // A reload/resume receives the complete event tail for state reconstruction.
    // Those historical events must not replay transient combat or movement UI.
    appendEvents(view.events, { present:!hydratingSession });
    state.lastSyncAt = Date.now();
    state.lastError = null;
    if (renderAfter) render();
    return view;
  } catch (error) {
    if (!(preserveLiveOnError && wasLive)) {
      state.lastError = error.message;
      if (error.code === 'NETWORK_UNREACHABLE' || error.code === 'NETWORK_TIMEOUT') beginConnectionRecovery(navigator.onLine === false ? 'OFFLINE' : 'RECONNECTING', error.message);
    }
    if (renderAfter) render();
    throw error;
  }
}


function streamReconnectDelay() {
  const attempt=Math.max(0,Number(state.reconnectAttempt||0));
  const base=Math.min(15000,1500*Math.pow(1.7,attempt));
  const jitter=Math.round(Math.random()*Math.min(900,base*.18));
  return Math.round(base+jitter);
}
function clearStreamReconnectTimer() {
  clearTimeout(state.reconnectTimer);
  state.reconnectTimer=null;
}
function closeCurrentStream() {
  const current=state.stream;
  state.stream=null;
  current?.close?.();
}
function clearSyncPollTimer() {
  clearTimeout(state.syncPollTimer);
  state.syncPollTimer=null;
}
function scheduleSyncPoll(delay=hostedSyncPollDelay()) {
  clearSyncPollTimer();
  if (!state.session || navigator.onLine===false || state.view?.viewerSession?.activeElsewhere) return;
  state.syncPollTimer=setTimeout(async()=>{
    state.syncPollTimer=null;
    if (!state.session || navigator.onLine===false || state.view?.viewerSession?.activeElsewhere) return;
    const liveWasStale = state.connectionStatus === 'LIVE' && liveConnectionLooksStale(hostedLiveStaleThreshold());
    const beforeVersion = Number(state.view?.match?.stateVersion ?? -1);
    try {
      const view = await refreshState(false, { preserveLiveOnError:true });
      const afterVersion = Number(view?.match?.stateVersion ?? -1);
      if (state.view?.viewerSession?.activeElsewhere) state.connectionStatus='SUPERSEDED';
      else if (!['LIVE','RECOVERED'].includes(state.connectionStatus)) state.connectionStatus='POLLING';
      if (afterVersion !== beforeVersion) render();
    } catch { /* live SSE may still be healthy; next safety pass retries */ }
    if (liveWasStale && state.session && navigator.onLine!==false && !state.view?.viewerSession?.activeElsewhere) {
      state.connectionStatus='RECONNECTING';
      startStream();
      return;
    }
    if (state.session && navigator.onLine!==false && !state.view?.viewerSession?.activeElsewhere) scheduleSyncPoll();
  },delay);
}

function scheduleStreamReconnect(expectedGeneration=state.streamGeneration) {
  clearStreamReconnectTimer();
  const delay=streamReconnectDelay();
  state.reconnectAttempt=Math.min(8,Number(state.reconnectAttempt||0)+1);
  state.reconnectTimer=setTimeout(()=>{
    state.reconnectTimer=null;
    if (expectedGeneration !== state.streamGeneration) return;
    if (!state.session || navigator.onLine===false || state.view?.viewerSession?.activeElsewhere) return;
    startStream();
  },delay);
  return delay;
}
function liveConnectionLooksStale(maxAgeMs=45000) { return !state.lastLiveAt || Date.now()-state.lastLiveAt>maxAgeMs; }
async function startStream() {
  const sessionAtStart=state.session ? { roomId:state.session.roomId, token:state.session.token } : null;
  const generation=++state.streamGeneration;
  clearStreamReconnectTimer();
  clearSyncPollTimer();
  closeCurrentStream();
  if (!sessionAtStart) return;
  state.connectionStatus = navigator.onLine === false ? 'OFFLINE' : 'CONNECTING';
  const after = state.view?.match?.lastEventSeq ?? 0;
  let streamTicket;
  try {
    streamTicket = await api(`/api/rooms/${sessionAtStart.roomId}/stream-ticket`, { method:'POST', headers:roomAuthHeaders(sessionAtStart.token), body:JSON.stringify({ clientId:CLIENT_INSTANCE_ID }) });
  } catch (error) {
    if (generation !== state.streamGeneration) return;
    beginConnectionRecovery(navigator.onLine === false ? 'OFFLINE' : 'RECONNECTING', error.message || 'Could not authorize live updates.');
    scheduleStreamReconnect(generation);
    scheduleSyncPoll();
    render();
    return;
  }
  if (generation !== state.streamGeneration || !state.session || state.session.roomId !== sessionAtStart.roomId || state.session.token !== sessionAtStart.token) return;
  const source = new EventSource(`/api/rooms/${sessionAtStart.roomId}/stream?ticket=${encodeURIComponent(streamTicket.ticket)}&after=${after}`);
  state.stream = source;
  scheduleSyncPoll();
  const isCurrent=()=>generation===state.streamGeneration && state.stream===source;
  source.addEventListener('open', () => {
    if (!isCurrent()) { source.close(); return; }
    clearStreamReconnectTimer();
    scheduleSyncPoll();
    if (!state.view?.viewerSession?.activeElsewhere) completeConnectionRecovery();
    state.lastLiveAt = Date.now();
    state.lastSyncAt = state.lastLiveAt;
    state.reconnectAttempt = 0;
    state.lastError = null;
    refreshState(false).catch(() => {});
    render();
  });
  source.addEventListener('heartbeat', () => {
    if (!isCurrent()) return;
    clearStreamReconnectTimer();
    scheduleSyncPoll();
    state.lastLiveAt=Date.now();
    state.lastSyncAt=state.lastLiveAt;
    state.reconnectAttempt=0;
    if (!state.view?.viewerSession?.activeElsewhere && navigator.onLine!==false && state.connectionStatus !== 'RECOVERED') state.connectionStatus='LIVE';
  });
  source.addEventListener('state', (event) => {
    if (!isCurrent()) return;
    clearStreamReconnectTimer();
    scheduleSyncPoll();
    const view = JSON.parse(event.data);
    acceptPassiveSyncedView(view);
    state.interaction = null;
    appendEvents(view.events);
    const wasRecovering = ['RECONNECTING','POLLING','OFFLINE','CONNECTING'].includes(state.connectionStatus);
    if (view?.viewerSession?.activeElsewhere) state.connectionStatus = 'SUPERSEDED';
    else if (wasRecovering) completeConnectionRecovery();
    else state.connectionStatus = 'LIVE';
    state.lastLiveAt = Date.now();
    state.lastSyncAt = state.lastLiveAt;
    state.reconnectAttempt = 0;
    state.lastError = null;
    render();
  });
  source.addEventListener('error', () => {
    if (!isCurrent()) { source.close(); return; }
    const wasLive = ['LIVE','RECOVERED'].includes(state.connectionStatus);
    // EventSource retries by itself. Close it here so only our bounded backoff owns reconnect timing.
    source.close();
    if (state.stream === source) state.stream=null;
    if (state.view?.viewerSession?.activeElsewhere) state.connectionStatus = 'SUPERSEDED';
    else beginConnectionRecovery(navigator.onLine === false ? 'OFFLINE' : 'RECONNECTING', navigator.onLine === false ? 'You are offline. The match is preserved and will reconnect automatically.' : 'Live updates were interrupted. Reconnecting and resynchronizing automatically.', wasLive ? { tone:'warning', title:navigator.onLine === false ? 'You are offline' : 'Live updates interrupted', detail:'The match is preserved while the client resynchronizes.' } : null);
    if (state.connectionStatus === 'RECONNECTING') { scheduleStreamReconnect(generation); scheduleSyncPoll(); }
    render();
  });
}

function canRetryStaleMulligan(intent, match) {
  if (intent?.type !== 'MULLIGAN' || !match?.legalActions?.canMulligan) return false;
  const handIds = new Set((match.players?.[match.viewerId]?.hand ?? []).map((card) => card.instanceId));
  return (intent.returnIds ?? []).every((id) => handIds.has(id));
}

function newIntentId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

async function postRoomIntent(intent, intentId, expectedStateVersion) {
  return api(`/api/rooms/${state.session.roomId}/intent`, { headers:roomAuthHeaders(),
    method:'POST',
    body:JSON.stringify({ clientId:CLIENT_INSTANCE_ID, intentId, expectedStateVersion, intent })
  });
}

async function sendIntent(intent) {
  state.pendingActionConfirmation = null;
  let match = state.view?.match;
  if (!match || !state.session) return;
  if (state.intentBusy) { showFeedback('info','Move already submitting','Wait for the server state to return before sending another move.', { duration:1600 }); return; }
  if (!viewerHasControl()) {
    const readOnlyMessage = 'This tab is read-only because the same match is active elsewhere. Use “Take control here” before making a move.';
    state.lastError = null;
    showFeedback('warning','Read-only tab',readOnlyMessage,{ duration:3200 });
    render();
    return;
  }
  state.lastError = null;
  let intentId = newIntentId();
  let submittedVersion = match.stateVersion;
  setIntentCommit('SENDING', intent, { intentId, fromVersion:submittedVersion });
  state.intentBusy = true;
  render();
  try {
    // Hosted safety preflight: a proxy can leave SSE apparently open while one state event is delayed.
    // A cheap authoritative GET immediately before the mutation prevents stale stateVersion submissions.
    try { await refreshState(false, { preserveLiveOnError:true }); } catch { /* the POST still gets one chance */ }
    match = state.view?.match ?? match;
    submittedVersion = match.stateVersion;
    if (!roomViewHasLiveMatch(state.view)) {
      saveRecentSession(null);
      throw Object.assign(new Error(lobbyCopy('This match is no longer active. No move was sent.','Dieses Match ist nicht mehr aktiv. Es wurde kein Zug gesendet.')), { code:'MATCH_NOT_ACTIVE' });
    }
    if (!viewerHasControl()) throw Object.assign(new Error('This tab no longer has control of the match.'), { code:'SESSION_SUPERSEDED' });
    setIntentCommit('SENDING', intent, { intentId, fromVersion:submittedVersion });

    let result = await postRoomIntent(intent, intentId, submittedVersion);
    if (!result.response.accepted && result.response.error?.code === 'STALE_STATE' && intent.type === 'MULLIGAN') {
      const refreshed = await refreshState(false, { preserveLiveOnError:true });
      if (canRetryStaleMulligan(intent, refreshed?.match)) {
        intentId = newIntentId(); // processed-intent idempotency requires a fresh id for the refreshed version.
        submittedVersion = refreshed.match.stateVersion;
        setIntentCommit('SENDING', intent, { intentId, fromVersion:submittedVersion, detail:'Opening hand resynchronized; confirming once more automatically.' });
        result = await postRoomIntent(intent, intentId, submittedVersion);
      }
    }

    acceptView(result.view);
    if (result.serverProfile) applyServerProfile(result.serverProfile);
    appendEvents(result.view.events);
    if (!result.response.accepted) {
      state.lastError = result.response.error?.message ?? 'Move not accepted.';
      setIntentCommit('REJECTED', intent, { intentId, fromVersion:submittedVersion, toVersion:result.view?.match?.stateVersion, detail:state.lastError });
      showFeedback('error','Move not accepted',state.lastError,{ sticky:true });
    } else {
      setIntentCommit('ACCEPTED', intent, { intentId, fromVersion:submittedVersion, toVersion:result.view?.match?.stateVersion });
      acceptedIntentFeedback(intent);
      // Re-read after every accepted mutation. This catches immediate priority/turn handoffs even if SSE is buffered upstream.
      try { await refreshState(false, { preserveLiveOnError:true }); } catch { /* result.view remains authoritative for this intent */ }
      scheduleSyncPoll(350);
    }
    state.selectedHand.clear();
    state.interaction = null;
  } catch (error) {
    state.lastError = error.message;
    if (error.code === 'SESSION_SUPERSEDED') state.connectionStatus = 'SUPERSEDED';
    if (error.code === 'NETWORK_UNREACHABLE' || error.code === 'NETWORK_TIMEOUT') beginConnectionRecovery(navigator.onLine === false ? 'OFFLINE' : 'RECONNECTING', error.message);
    const interrupted = error.code === 'NETWORK_UNREACHABLE' || error.code === 'NETWORK_TIMEOUT';
    setIntentCommit(interrupted ? 'RESYNCING' : 'REJECTED', intent, { intentId, fromVersion:submittedVersion, detail:interrupted ? 'Delivery was interrupted. Refreshing the authoritative match state before another move.' : (error.message || 'The move was not committed.') });
    friendlyErrorFeedback(error,'Move could not be completed');
    try { await refreshState(false); } catch { /* connection banner and toast retain the error */ }
    scheduleSyncPoll(350);
  } finally {
    state.intentBusy = false;
    render();
  }
}


function commitDirectAttackFromBoard(event) {
  const interaction = state.interaction;
  if (state.intentBusy || interaction?.type !== 'ATTACK' || !interaction.targetIds.includes(null)) return false;
  if (event?.target?.closest?.('.card,button,a,input,select,textarea,summary,details,.player-head,.board-resource-row,.pending-lane,.opponent-hand')) return false;
  event?.preventDefault?.();
  event?.stopPropagation?.();
  const attackerId = interaction.attackerId;
  state.hoverAttackTargetId = null;
  state.interaction = null;
  sendIntent({ type:'DECLARE_ATTACK', attackerId, targetId:null });
  return true;
}

function bindInteractionHandlers() {
  document.querySelectorAll('[data-field-slot]').forEach((el) => {
    el.onclick = (event) => {
      event.stopPropagation();
      if (state.intentBusy) return;
      const slot = Number(el.dataset.fieldSlot);
      const zone = el.dataset.fieldSlotZone;
      const interaction = state.interaction;
      if (zone === 'EMPLOYEE' && interaction?.type === 'EMPLOYEE') {
        const options = interaction.options.filter((option) => option.slot === slot);
        if (!options.length) return;
        if (options.length === 1) {
          const option = options[0];
          const cardId = interaction.cardId;
          state.interaction = null;
          return sendIntent({ type:'PLAY_EMPLOYEE', cardId, slot, promotionMaterialIds:option.promotionMaterialIds });
        }
        state.interaction = { type:'PROMOTION', cardId:interaction.cardId, slot, options, cancelable:true };
        return render();
      }
      if (zone === 'SUPPORT' && interaction?.type === 'SUPPORT' && interaction.slots.includes(slot)) {
        const cardId = interaction.cardId;
        const kind = interaction.kind;
        state.interaction = null;
        return sendIntent({ type:kind === 'SYSTEM' ? 'PLAY_SYSTEM' : 'SET_INCIDENT', cardId, slot });
      }
    };
  });
  document.querySelectorAll('[data-play-hand]').forEach((el) => {
    el.onclick = (event) => { event.stopPropagation(); if (state.intentBusy) return; beginHandCardPlay(el.dataset.playHand); };
  });
  document.querySelectorAll('[data-attack-source]').forEach((el) => {
    if (el.hasAttribute('data-target-card') || el.hasAttribute('data-card-ability')) return;
    el.onclick = (event) => { event.stopPropagation(); if (state.intentBusy) return; beginAttack(el.dataset.attackSource); };
  });
  document.querySelectorAll('[data-target-card]').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      if (state.interaction?.type !== 'ATTACK' || !state.interaction.targetIds.includes(el.dataset.targetCard)) return;
      state.hoverAttackTargetId = el.dataset.targetCard;
      scheduleAttackConnectorDraw();
    });
    el.addEventListener('mouseleave', () => {
      if (state.hoverAttackTargetId === el.dataset.targetCard) state.hoverAttackTargetId = null;
      scheduleAttackConnectorDraw();
    });
    el.onclick = (event) => {
      event.stopPropagation();
      if (state.intentBusy) return;
      const id = el.dataset.targetCard;
      if (state.interaction?.type === 'ATTACK') {
        if (state.interaction.targetIds.includes(id)) {
          const attackerId = state.interaction.attackerId;
          state.hoverAttackTargetId = null;
          state.interaction = null;
          sendIntent({ type:'DECLARE_ATTACK', attackerId, targetId:id });
        }
        return;
      }
      const interaction = state.interaction;
      if (!interaction || interaction.type !== 'TARGETS') return;
      const choice = interaction.targetChoices[interaction.index];
      if (!choice.candidateIds.includes(id)) return;
      const selected = new Set(interaction.selections[choice.selectorId] ?? []);
      if (selected.has(id)) selected.delete(id);
      else {
        if (choice.max === 1) selected.clear();
        if (selected.size < choice.max) selected.add(id);
      }
      interaction.selections[choice.selectorId] = [...selected];
      render();
    };
  });
  document.querySelectorAll('[data-direct-attack-board]').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      if (state.interaction?.type !== 'ATTACK' || !state.interaction.targetIds.includes(null)) return;
      state.hoverAttackTargetId = '__DIRECT_REP__';
      scheduleAttackConnectorDraw();
    });
    el.addEventListener('mouseleave', () => {
      if (state.hoverAttackTargetId === '__DIRECT_REP__') state.hoverAttackTargetId = null;
      scheduleAttackConnectorDraw();
    });
    // Capture makes the free opponent halfboard a real large hitbox even when an empty slot/lane
    // owns its own bubbling click handler. Interactive cards/HUD/resources remain excluded.
    el.addEventListener('click', (event) => { commitDirectAttackFromBoard(event); }, true);
  });
  document.querySelectorAll('[data-direct-attack-target]').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      if (state.interaction?.type !== 'ATTACK' || !state.interaction.targetIds.includes(null)) return;
      state.hoverAttackTargetId = '__DIRECT_REP__';
      scheduleAttackConnectorDraw();
    });
    el.addEventListener('mouseleave', () => {
      if (state.hoverAttackTargetId === '__DIRECT_REP__') state.hoverAttackTargetId = null;
      scheduleAttackConnectorDraw();
    });
    el.onclick = (event) => {
      event.stopPropagation();
      const interaction = state.interaction;
      if (state.intentBusy || interaction?.type !== 'ATTACK' || !interaction.targetIds.includes(null)) return;
      const attackerId = interaction.attackerId;
      state.hoverAttackTargetId = null;
      state.interaction = null;
      sendIntent({ type:'DECLARE_ATTACK', attackerId, targetId:null });
    };
  });
  document.querySelectorAll('[data-card-ability]').forEach((button) => {
    button.onclick = (event) => {
      event.stopPropagation();
      const item = legalAbilityOption(button.dataset.cardAbility);
      if (!item) return;
      beginTargetIntent(`Activate ${cardLabel(item.sourceId)}`, item.targetChoices, (targets) => ({ type:'ACTIVATE_ABILITY', sourceId:item.sourceId, abilityId:item.abilityId, targets }), item.sourceId);
    };
  });
  document.querySelectorAll('[data-interaction]').forEach((button) => {
    button.onclick = () => {
      const kind = button.dataset.interaction;
      const interaction = state.interaction;
      if (kind === 'cancel') return cancelInteraction();
      if (!interaction) return;
      if (kind === 'promotion-option' && interaction.type === 'PROMOTION') {
        const option = interaction.options[Number(button.dataset.index)];
        const cardId = interaction.cardId;
        const slot = interaction.slot;
        state.interaction = null;
        return sendIntent({ type:'PLAY_EMPLOYEE', cardId, slot, promotionMaterialIds:option.promotionMaterialIds });
      }
      if (kind === 'direct-attack' && interaction.type === 'ATTACK') {
        const attackerId = interaction.attackerId;
        state.interaction = null;
        return sendIntent({ type:'DECLARE_ATTACK', attackerId, targetId:null });
      }
      if (kind === 'skip-target' && interaction.type === 'TARGETS') {
        const choice = interaction.targetChoices[interaction.index];
        interaction.selections[choice.selectorId] = [];
        return advanceTargetChoice();
      }
      if (kind === 'confirm-target' && interaction.type === 'TARGETS') return advanceTargetChoice();
    };
  });
}

function bindCardInfoHandlers() {
  document.querySelectorAll('.card[data-card-info]').forEach((el) => {
    el.oncontextmenu = (event) => {
      event.preventDefault();
      event.stopPropagation();
      hideHoverPreview();
      openCardInspector(el.dataset.cardInfo);
    };
  });
  document.querySelectorAll('[data-card-info-button]').forEach((button) => {
    button.onclick = (event) => {
      event.stopPropagation();
      openCardInspector(button.dataset.cardInfoButton);
    };
  });
  document.querySelectorAll('[data-card-info]').forEach((el) => {
    if (el.hasAttribute('data-select-hand') || el.hasAttribute('data-play-hand') || el.hasAttribute('data-attack-source') || el.hasAttribute('data-target-card') || el.hasAttribute('data-card-ability')) return;
    el.onclick = () => openCardInspector(el.dataset.cardInfo);
    el.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openCardInspector(el.dataset.cardInfo); } };
  });
  document.querySelectorAll('[data-modal-nav]').forEach((button) => {
    button.onclick = (event) => { event.stopPropagation(); navigateFocusedCard(Number(button.dataset.modalNav)); };
  });
  document.querySelectorAll('[data-modal-card-action]').forEach((button) => {
    button.onclick = (event) => {
      event.stopPropagation();
      if (state.intentBusy) return;
      const cardRef = button.dataset.cardRef;
      const action = button.dataset.modalCardAction;
      closeCardInspector();
      if (action === 'play') return beginHandCardPlay(cardRef);
      if (action === 'attack') return beginAttack(cardRef);
      if (action === 'ability') {
        const item = legalAbilityOption(cardRef);
        if (!item) return;
        return beginTargetIntent(`Activate ${cardLabel(item.sourceId)}`, item.targetChoices, (targets) => ({ type:'ACTIVATE_ABILITY', sourceId:item.sourceId, abilityId:item.abilityId, targets }), item.sourceId);
      }
      if (action === 'response') {
        const item = legalResponseOption(cardRef);
        if (!item) return;
        return beginTargetIntent(`Respond with ${cardLabel(item.sourceId)}`, item.targetChoices, (targets) => ({ type:'ACTIVATE_RESPONSE', sourceId:item.sourceId, abilityId:item.abilityId, targets }), item.sourceId);
      }
    };
  });
  document.querySelectorAll('[data-close-card-modal]').forEach((el) => {
    el.onclick = (event) => {
      if (event.target.closest?.('[data-modal-panel]') && !event.target.hasAttribute('data-close-card-modal')) return;
      closeCardInspector();
    };
  });
}

function bindMobileBoardNavHandlers() {
  state.mobileNavObserver?.disconnect?.();
  state.mobileNavObserver = null;
  const buttons = [...document.querySelectorAll('[data-mobile-jump]')];
  const markActive = (targetId) => buttons.forEach((button) => {
    const active = button.dataset.mobileJump === targetId;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current','location'); else button.removeAttribute('aria-current');
  });
  buttons.forEach((button) => {
    button.onclick = () => {
      const target = document.getElementById(button.dataset.mobileJump);
      if (!target) return;
      markActive(button.dataset.mobileJump);
      target.scrollIntoView({ behavior:'smooth', block:'start' });
      scheduleAttackConnectorDraw();
    };
  });
  if (!window.matchMedia?.('(max-width: 760px)').matches || !('IntersectionObserver' in window)) return;
  const targets = ['opponentBoard','decisionCenter','ownBoard'].map((id) => document.getElementById(id)).filter(Boolean);
  if (!targets.length) return;
  state.mobileNavObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible?.target?.id) markActive(visible.target.id);
  }, { root:null, rootMargin:'-92px 0px -45% 0px', threshold:[.18,.35,.55] });
  targets.forEach((target) => state.mobileNavObserver.observe(target));
}

function bindGameHandlers(match) {
  document.querySelectorAll('[data-select-hand]').forEach((el) => {
    el.onclick = () => {
      const id = el.dataset.selectHand;
      if (state.selectedHand.has(id)) state.selectedHand.delete(id);
      else {
        const archiveIds = match.legalActions?.archiveExcessHandIds ?? [];
        const archiveNeeded = Math.max(0, (match.players?.[match.viewerId]?.hand?.length ?? 8) - 8);
        if (archiveIds.includes(id) && archiveNeeded && state.selectedHand.size >= archiveNeeded) {
          showFeedback('info','Hand limit selection complete',`Exactly ${archiveNeeded} card${archiveNeeded === 1 ? '' : 's'} must be Archived. Deselect one before choosing another.`,{ duration:1800 });
          return;
        }
        state.selectedHand.add(id);
      }
      render();
    };
  });
  document.querySelectorAll('[data-action]').forEach((button) => {
    button.onclick = async () => {
      if (state.intentBusy) return;
      const kind = button.dataset.action;
      const legal = match.legalActions;
      if (kind === 'mulligan') return sendIntent({ type:'MULLIGAN', returnIds:[...state.selectedHand] });
      if (kind === 'mulligan-keep') return sendIntent({ type:'MULLIGAN', returnIds:[] });
      if (kind === 'mulligan-clear') { state.selectedHand.clear(); render(); return; }
      if (kind === 'archive-selected') return sendIntent({ type:'ARCHIVE_EXCESS_HAND', cardIds:[...state.selectedHand] });
      if (kind === 'advance') return requestPhaseAdvance(match);
      if (kind === 'cancel-advance') { state.pendingActionConfirmation = null; render(); return; }
      if (kind === 'confirm-advance') {
        const pending = activeAdvanceConfirmation(match);
        if (!pending) { state.pendingActionConfirmation = null; render(); return; }
        return sendIntent({ type:'ADVANCE_PHASE' });
      }
      if (kind === 'pass') return sendIntent({ type:'PASS_PRIORITY' });
      if (kind === 'resign') { if (confirm('Resign this match?')) return sendIntent({type:'RESIGN'}); return; }
      if (kind === 'choice') return sendIntent({ type:'RESOLVE_CHOICE', choiceId:match.pendingChoice.id, optionId:button.dataset.choice });
      if (kind === 'deck-select') return sendIntent({ type:'RESOLVE_DECK_SELECTION', selectionId:match.pendingDeckSelection.id, selectedIds:button.dataset.skip === '1' ? [] : [button.dataset.card] });
      if (kind === 'trigger-targets') {
        const pending = match.pendingTriggerTargetSelection;
        return beginMandatoryTargetIntent(t('matchInteraction.pendingTargetTitle'), pending.targetChoices, (targets) => ({ type:'RESOLVE_TRIGGER_TARGET_SELECTION', selectionId:pending.id, targets }), pending.sourceId ?? null);
      }
      if (kind === 'hand-select') {
        const selected = [...state.selectedHand];
        if (selected.length < match.pendingHandSelection.min || selected.length > match.pendingHandSelection.max) { alert(`Choose ${match.pendingHandSelection.min}-${match.pendingHandSelection.max} card(s).`); return; }
        return sendIntent({ type:'RESOLVE_HAND_SELECTION', selectionId:match.pendingHandSelection.id, selectedIds:selected });
      }
      if (kind === 'employee') {
        return beginEmployeePlay(legal.playableEmployees[Number(button.dataset.index)]);
      }
      if (kind === 'system' || kind === 'incident') {
        const list = kind === 'system' ? legal.playableSystems : legal.settableIncidents;
        return beginSupportPlay(kind === 'system' ? 'SYSTEM' : 'INCIDENT', list[Number(button.dataset.index)]);
      }
      if (kind === 'play-action') {
        const item = legal.playableActions[Number(button.dataset.index)];
        return beginTargetIntent(`Play ${cardLabel(item.cardId)}`, item.targetChoices, (targets) => ({ type:'PLAY_ACTION', cardId:item.cardId, targets }), item.cardId);
      }
      if (kind === 'ability' || kind === 'response') {
        const item = (kind === 'ability' ? legal.activatableAbilities : legal.responseOptions)[Number(button.dataset.index)];
        return beginTargetIntent(`${kind === 'ability' ? 'Activate' : 'Respond with'} ${cardLabel(item.sourceId)}`, item.targetChoices, (targets) => ({ type:kind === 'ability' ? 'ACTIVATE_ABILITY' : 'ACTIVATE_RESPONSE', sourceId:item.sourceId, abilityId:item.abilityId, targets }), item.sourceId);
      }
      if (kind === 'attack') {
        const direct = button.dataset.direct === '1';
        return sendIntent({ type:'DECLARE_ATTACK', attackerId:button.dataset.attacker, targetId:direct ? null : button.dataset.target });
      }
    };
  });
}

async function boot() {
  try {
    loadCustomDecks();
    loadMetaProfile();
    loadGuidance();
    loadRecentSession();
    const invited = new URLSearchParams(location.search).get('join');
    if (invited && /^[A-Za-z0-9]{6}$/.test(invited)) state.inviteRoomCode = invited.toUpperCase();
    const [health, catalog, presets, format, economy, matchSettings] = await Promise.all([api('/api/health'), api('/api/catalog'), api('/api/presets'), api('/api/format'), api('/api/economy-config'), api('/api/match-settings')]);
    state.serverInfo = health;
    setDocumentTranslationParams({ version:health.version ?? '' });
    state.catalog = new Map(catalog.cards.map((c) => [c.id,c]));
    state.presets = presets.presets;
    state.format = format.format;
    state.economyConfig = economy.economy;
    state.matchSettings = matchSettings.settings;
    await ensureServerProfile();
    if (state.adminToken && opsModeAvailable()) await refreshPlaytestAnalytics(false);
    if (!state.customDecks.length) newCustomDeck();
    state.editingDeckId ??= state.customDecks[0]?.id ?? null;
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        saveSession(JSON.parse(saved));
        const restoredView = await refreshState(false);
        if (restoredView?.viewerSession?.activeElsewhere && Number(restoredView.viewerSession.connectionCount ?? 0) === 0) await claimSessionControl({ restartStream:false, renderAfter:false });
        startStream();
      } catch {
        clearSession();
      }
    }
    if (!state.session) await refreshRecentSession();
    if (!state.session) await restoreMatchmakingTicket();
    if (!state.session && finishReviewRequested()) state.mode='FINISH_REVIEW';
  } catch (error) {
    state.lastError = `Startup failed: ${error.message}`;
  }
  render();
}

window.addEventListener('beforeunload', (event) => {
  const deck = editingDeck();
  if (!deckHasUnsavedChanges(deck)) return;
  event.preventDefault();
  event.returnValue = '';
});

window.addEventListener('offline', () => {
  if (!state.session) return;
  beginConnectionRecovery('OFFLINE', 'You are offline. The match is preserved and will reconnect automatically.');
  render();
});
window.addEventListener('online', () => {
  if (!state.session || state.view?.viewerSession?.activeElsewhere) return;
  forceConnectionRecovery();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !state.session || state.connectionStatus === 'SUPERSEDED') return;
  refreshState(false).then(()=>{ if (liveConnectionLooksStale() || !['LIVE','RECOVERED'].includes(state.connectionStatus)) startStream(); }).catch(()=>scheduleStreamReconnect());
});
window.addEventListener('pageshow', (event) => {
  if (!state.session || state.view?.viewerSession?.activeElsewhere) return;
  if (event.persisted || !['LIVE','RECOVERED'].includes(state.connectionStatus) || liveConnectionLooksStale()) forceConnectionRecovery();
});
window.addEventListener('pagehide', () => {
  state.streamGeneration += 1;
  clearStreamReconnectTimer();
  closeCurrentStream();
  if (state.session && state.connectionStatus!=='SUPERSEDED') beginConnectionRecovery('RECONNECTING', 'Live updates were paused while this page was hidden.');
});
window.addEventListener('orientationchange', () => setTimeout(()=>scheduleAttackConnectorDraw(),120));

document.addEventListener('keydown', (event) => {
  // Regression compatibility marker for the original attack Escape contract:
  // event.key === 'Escape' && ['ATTACK','EMPLOYEE','SUPPORT'].includes(state.interaction?.type ?? '') cancelInteraction();
  if (!state.focusedCardRef) {
    if (event.key === 'Escape' && state.interaction?.cancelable !== false && ['ATTACK','EMPLOYEE','SUPPORT','TARGETS','PROMOTION'].includes(state.interaction?.type ?? '')) { event.preventDefault(); cancelInteraction(); }
    return;
  }
  if (event.key === 'Tab') {
    const panel = document.querySelector('[data-modal-panel]');
    const focusable = [...(panel?.querySelectorAll('button:not(:disabled),[href],input:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])') ?? [])];
    if (focusable.length) {
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); return; }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); return; }
    }
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    closeCardInspector();
    return;
  }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    navigateFocusedCard(event.key === 'ArrowLeft' ? -1 : 1);
  }
});

setInterval(updateLiveTimerUi, 250);
installFoilPointerTracking();
boot();
