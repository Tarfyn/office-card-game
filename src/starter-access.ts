import { applyRewardGrant, collectionPlayableCapacity, createPlayerMetaProfile, type PlayerMetaProfile, type RewardGrant } from "./economy.js";
import { COSMETIC_IDS } from "./cosmetics.js";
import type { CardDefinition, CardType, DeckEntry, Department, DeckFormat } from "./types.js";

export type StarterDepartment = Exclude<Department, "NEUTRAL">;

export interface StarterDepartmentConfig {
  id: string;
  testOnly?: boolean;
  displayNameKey: string;
  playstyleKey: string;
  coreCards: Array<{ definitionId: string; copies: number }>;
  trainingDeckId?: string;
  boosterDepartmentId?: string;
}

export interface StarterPackagePlan {
  department: string;
  grants: RewardGrant[];
  cardsGranted: number;
  firstDayDeck: DeckEntry[];
}

export const NEUTRAL_CORE: ReadonlyArray<{ definitionId: string; copies: number }> = Object.freeze([
  { definitionId: "N-001", copies: 2 }, { definitionId: "N-002", copies: 2 },
  { definitionId: "N-003", copies: 1 }, { definitionId: "N-005", copies: 1 },
  { definitionId: "N-009", copies: 1 }, { definitionId: "N-010", copies: 1 },
  { definitionId: "N-013", copies: 1 }, { definitionId: "N-014", copies: 1 }
]);

export const STARTER_DEPARTMENT_CONFIG: Readonly<Record<string, StarterDepartmentConfig>> = Object.freeze({
  CUSTOMER_SERVICE: { id: "CUSTOMER_SERVICE", trainingDeckId:"customer-service-starter", displayNameKey:"starterAccess.departments.customerService", playstyleKey:"starterAccess.playstyles.customerService", coreCards: [
    { definitionId: "CS-001", copies: 2 }, { definitionId: "CS-002", copies: 2 },
    { definitionId: "CS-003", copies: 1 }, { definitionId: "CS-005", copies: 1 },
    { definitionId: "CS-008", copies: 1 }, { definitionId: "CS-010", copies: 1 },
    { definitionId: "CS-017", copies: 1 }, { definitionId: "CS-019", copies: 1 }
  ] },
  IT: { id: "IT", trainingDeckId:"it-starter", displayNameKey:"starterAccess.departments.it", playstyleKey:"starterAccess.playstyles.it", coreCards: [
    { definitionId: "IT-001", copies: 2 }, { definitionId: "IT-003", copies: 2 },
    { definitionId: "IT-005", copies: 1 }, { definitionId: "IT-006", copies: 1 },
    { definitionId: "IT-008", copies: 1 }, { definitionId: "IT-009", copies: 1 },
    { definitionId: "IT-014", copies: 1 }, { definitionId: "IT-020", copies: 1 }
  ] },
  OFFICE: { id: "OFFICE", trainingDeckId:"office-starter", displayNameKey:"starterAccess.departments.office", playstyleKey:"starterAccess.playstyles.office", coreCards: [
    { definitionId: "OFC-001", copies: 2 }, { definitionId: "OFC-002", copies: 2 },
    { definitionId: "OFC-003", copies: 1 }, { definitionId: "OFC-004", copies: 1 },
    { definitionId: "OFC-007", copies: 1 }, { definitionId: "OFC-008", copies: 1 },
    { definitionId: "OFC-011", copies: 1 }, { definitionId: "OFC-014", copies: 1 }
  ] },
  MARKETING: { id: "MARKETING", trainingDeckId:"marketing-starter", displayNameKey:"starterAccess.departments.marketing", playstyleKey:"starterAccess.playstyles.marketing", coreCards: [
    { definitionId: "MKT-001", copies: 2 }, { definitionId: "MKT-002", copies: 2 },
    { definitionId: "MKT-003", copies: 1 }, { definitionId: "MKT-005", copies: 1 },
    { definitionId: "MKT-009", copies: 1 }, { definitionId: "MKT-010", copies: 1 },
    { definitionId: "MKT-014", copies: 1 }, { definitionId: "MKT-015", copies: 1 }
  ] },
  PRODUCTION: { id: "PRODUCTION", trainingDeckId:"production-starter", displayNameKey:"starterAccess.departments.production", playstyleKey:"starterAccess.playstyles.production", coreCards: [
    { definitionId: "PRD-001", copies: 2 }, { definitionId: "PRD-003", copies: 2 },
    { definitionId: "PRD-004", copies: 1 }, { definitionId: "PRD-005", copies: 1 },
    { definitionId: "PRD-010", copies: 1 }, { definitionId: "PRD-012", copies: 1 },
    { definitionId: "PRD-013", copies: 1 }, { definitionId: "PRD-014", copies: 1 }
  ] },
  // Synthetic-only fixture: it proves that selectors and grant generation are
  // data-driven without adding a production department choice.
  ACCOUNTING_TEST: { id: "ACCOUNTING_TEST", testOnly: true, trainingDeckId:"accounting-test-loaner", boosterDepartmentId:"NEUTRAL", displayNameKey:"starterAccess.departments.accountingTest", playstyleKey:"starterAccess.playstyles.accountingTest", coreCards: [
    { definitionId: "N-001", copies: 2 }, { definitionId: "N-002", copies: 2 },
    { definitionId: "N-003", copies: 1 }, { definitionId: "N-005", copies: 1 },
    { definitionId: "N-009", copies: 1 }, { definitionId: "N-010", copies: 1 },
    { definitionId: "N-013", copies: 1 }, { definitionId: "N-014", copies: 1 }
  ] }
});

export const STARTER_BOOSTER_CONFIG = Object.freeze({
  version: "starter-grant-v1",
  boosterCount: 8,
  cardsPerBooster: 5,
  slots: [
    { pool: "DEPARTMENT", cardType: "EMPLOYEE" as CardType },
    { pool: "ALL_EMPLOYEES", cardType: "EMPLOYEE" as CardType },
    { pool: "NEUTRAL_OR_OTHER" },
    { pool: "ALL_ALPHA" },
    { pool: "ALL_ALPHA", tierWeighting: true }
  ]
});

export function availableStarterDepartments(includeTestFixtures = false): StarterDepartmentConfig[] {
  return Object.values(STARTER_DEPARTMENT_CONFIG).filter((item) => includeTestFixtures || !item.testOnly).map((item) => structuredClone(item));
}

export function trainingLoanerIds(includeTestFixtures = false): string[] {
  return availableStarterDepartments(includeTestFixtures).flatMap((item) => item.trainingDeckId ? [item.trainingDeckId] : []);
}

export function isTrainingLoanerDeck(deckId: string | null | undefined, includeTestFixtures = false): boolean {
  return trainingLoanerIds(includeTestFixtures).includes(String(deckId ?? ""));
}

export function trainingLoanerAllowed(mode: string | null | undefined, deckId: string | null | undefined): boolean {
  return (mode === "TRAINING" || mode === "TUTORIAL") && isTrainingLoanerDeck(deckId);
}

export function normalizeStarterDepartment(value: unknown, includeTestFixtures = false): StarterDepartmentConfig | null {
  const item = STARTER_DEPARTMENT_CONFIG[String(value ?? "").trim().toUpperCase()];
  if (!item || (item.testOnly && !includeTestFixtures)) return null;
  return item;
}

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (const char of value) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0 || 1;
}

function nextRandom(state: { value: number }): number {
  state.value = (Math.imul(state.value ^ state.value >>> 15, 1 | state.value) + 0x6d2b79f5) >>> 0;
  let result = Math.imul(state.value ^ state.value >>> 7, 61 | state.value);
  result = (result ^ result >>> 14) >>> 0;
  return result / 4294967296;
}

function cardPool(cards: CardDefinition[], config: { pool: string; cardType?: CardType }, department: string): CardDefinition[] {
  const valid = cards.filter((card) => card.id && (!config.cardType || card.cardType === config.cardType));
  if (config.pool === "DEPARTMENT") return valid.filter((card) => card.department === department);
  if (config.pool === "ALL_EMPLOYEES") return valid.filter((card) => card.cardType === "EMPLOYEE");
  if (config.pool === "NEUTRAL_OR_OTHER") return valid.filter((card) => card.department === "NEUTRAL" || card.department !== department);
  return valid;
}

function chooseCard(pool: CardDefinition[], state: { value: number }, used: Map<string, number>, defaultCopyLimit: number, weighted: boolean): CardDefinition {
  const available = pool.filter((card) => (used.get(card.id) ?? 0) < defaultCopyLimit);
  const candidates = available.length ? available : pool;
  if (!candidates.length) throw new Error("STARTER_GRANT_EMPTY_POOL");
  if (!weighted) return candidates[Math.floor(nextRandom(state) * candidates.length)];
  const weights = candidates.map((card) => Math.max(1, card.rarityTier === "T3" ? 1 : card.rarityTier === "T2" ? 3 : card.rarityTier === "T1" ? 6 : 10));
  const total = weights.reduce((sum, item) => sum + item, 0);
  let roll = nextRandom(state) * total;
  for (let index = 0; index < candidates.length; index += 1) { roll -= weights[index]; if (roll <= 0) return candidates[index]; }
  return candidates.at(-1)!;
}

function mergeCardCounts(entries: ReadonlyArray<{ definitionId: string; copies: number }>): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) totals.set(entry.definitionId, (totals.get(entry.definitionId) ?? 0) + entry.copies);
  return totals;
}

function grant(sourceRef: string, entries: ReadonlyArray<{ definitionId: string; copies: number }>, now: number): RewardGrant {
  return { source: "starter", sourceRef, cards: entries.filter((item) => item.copies > 0).map((item) => ({ cardId: item.definitionId, quantity: item.copies })), officeCredits: 0, scrap: 0, cosmetics: [], packs: [], grantedAt: now };
}

function starterProfileFromEntries(entries: Array<{ definitionId: string; copies: number }>): PlayerMetaProfile {
  const profile = createPlayerMetaProfile([]);
  return applyRewardGrant(profile, grant("starter-grant:planning", entries, 0), 0).profile;
}

export function buildStarterPackagePlan(departmentValue: unknown, cards: CardDefinition[], format: DeckFormat, playerSeed: string, now = Date.now(), includeTestFixtures = false): StarterPackagePlan {
  const department = normalizeStarterDepartment(departmentValue, includeTestFixtures);
  if (!department) throw new Error("STARTER_DEPARTMENT_INVALID");
  const entries = [...department.coreCards, ...NEUTRAL_CORE].map((item) => ({ ...item }));
  const used = mergeCardCounts(entries);
  const random = { value: hashSeed(`${STARTER_BOOSTER_CONFIG.version}:${department.id}:${playerSeed}`) };
  const grants = [
    grant(`starter-grant:v1:${department.id}:department-core`, department.coreCards, now),
    grant(`starter-grant:v1:${department.id}:neutral-core`, NEUTRAL_CORE, now)
  ];
  for (let pack = 1; pack <= STARTER_BOOSTER_CONFIG.boosterCount; pack += 1) {
    const packEntries: Array<{ definitionId: string; copies: number }> = [];
    for (const slot of STARTER_BOOSTER_CONFIG.slots) {
      const pool = cardPool(cards, slot, department.boosterDepartmentId ?? department.id);
      const selected = chooseCard(pool, random, used, Math.max(1, Number(format.defaultCopyLimit ?? 3)), slot.tierWeighting === true);
      packEntries.push({ definitionId: selected.id, copies: 1 });
      entries.push({ definitionId: selected.id, copies: 1 });
      used.set(selected.id, (used.get(selected.id) ?? 0) + 1);
    }
    grants.push(grant(`starter-grant:v1:${department.id}:booster:${pack}`, packEntries, now));
  }

  let planned = starterProfileFromEntries(entries);
  if (collectionPlayableCapacity(planned, { deckSize:format.deckSize, defaultCopyLimit:format.defaultCopyLimit, cardLimits:format.cardLimits, legalDefinitionIds:cards.map((card) => card.id) }) < format.deckSize) {
    const safetyEntries: Array<{ definitionId: string; copies: number }> = [];
    const safetyPool = cards.slice().sort((a, b) => (a.department === department.id ? -1 : 0) - (b.department === department.id ? -1 : 0) || a.id.localeCompare(b.id));
    for (const card of safetyPool) {
      const limit = Number(format.cardLimits?.[card.id] ?? format.defaultCopyLimit ?? 3);
      const room = Math.max(0, limit - (used.get(card.id) ?? 0));
      if (!room) continue;
      const before = collectionPlayableCapacity(planned, { deckSize:format.deckSize, defaultCopyLimit:format.defaultCopyLimit, cardLimits:format.cardLimits, legalDefinitionIds:cards.map((item) => item.id) });
      const needed = Math.min(room, Math.max(1, format.deckSize - before));
      safetyEntries.push({ definitionId:card.id, copies:needed });
      entries.push({ definitionId:card.id, copies:needed });
      used.set(card.id, (used.get(card.id) ?? 0) + needed);
      planned = starterProfileFromEntries(entries);
      if (collectionPlayableCapacity(planned, { deckSize:format.deckSize, defaultCopyLimit:format.defaultCopyLimit, cardLimits:format.cardLimits, legalDefinitionIds:cards.map((item) => item.id) }) >= format.deckSize) break;
    }
    if (safetyEntries.length) grants.push(grant(`starter-grant:v1:${department.id}:safety`, safetyEntries, now));
  }
  const finalProfile = starterProfileFromEntries(entries);
  return { department:department.id, grants, cardsGranted:entries.reduce((sum, item) => sum + item.copies, 0), firstDayDeck:buildFirstDayDeck(finalProfile, cards, format, department.id) };
}

export function buildFirstDayDeck(profile: PlayerMetaProfile, cards: CardDefinition[], format: DeckFormat, department: string): DeckEntry[] {
  const typeTargets: Record<string, number> = { EMPLOYEE: 20, ACTION: 10, SYSTEM: 5, INCIDENT: 5 };
  const selected = new Map<string, number>();
  const orderedTypes = ["EMPLOYEE", "ACTION", "SYSTEM", "INCIDENT"] as const;
  for (const cardType of orderedTypes) {
    const candidates = cards.filter((card) => card.cardType === cardType && Number(profile.ownedCards[card.id] ?? 0) > 0).sort((a, b) => {
      const deptScore = (card: CardDefinition) => card.department === department ? 0 : card.department === "NEUTRAL" ? 1 : 2;
      return deptScore(a) - deptScore(b) || Number(a.cost?.play ?? a.cost?.set ?? 0) - Number(b.cost?.play ?? b.cost?.set ?? 0) || a.id.localeCompare(b.id);
    });
    let remaining = typeTargets[cardType];
    for (const card of candidates) {
      const limit = Number(format.cardLimits?.[card.id] ?? format.defaultCopyLimit ?? 3);
      const copies = Math.min(limit, Number(profile.ownedCards[card.id] ?? 0), remaining);
      if (copies > 0) { selected.set(card.id, copies); remaining -= copies; }
      if (!remaining) break;
    }
  }
  let total = [...selected.values()].reduce((sum, value) => sum + value, 0);
  if (total < format.deckSize) {
    for (const card of cards.slice().sort((a, b) => a.id.localeCompare(b.id))) {
      const limit = Number(format.cardLimits?.[card.id] ?? format.defaultCopyLimit ?? 3);
      const copies = Math.min(limit - (selected.get(card.id) ?? 0), Number(profile.ownedCards[card.id] ?? 0) - (selected.get(card.id) ?? 0), format.deckSize - total);
      if (copies > 0) { selected.set(card.id, (selected.get(card.id) ?? 0) + copies); total += copies; }
      if (total >= format.deckSize) break;
    }
  }
  return [...selected.entries()].filter(([, copies]) => copies > 0).map(([definitionId, copies]) => ({ definitionId, copies }));
}

export function createPendingAccountMeta(startingOfficeCredits = 0, now = Date.now()): PlayerMetaProfile {
  const meta = createPlayerMetaProfile([], startingOfficeCredits, now);
  const withStarterCosmetic = applyRewardGrant(meta, {
    source: "starter",
    sourceRef: "starter:cosmetics:v2",
    cards: [], officeCredits: 0, scrap: 0,
    cosmetics: [COSMETIC_IDS.internFemaleAvatar], packs: [], grantedAt: now
  }, now).profile;
  withStarterCosmetic.alphaPlaytestAccess = { enabled:true, source:"alpha_playtest", grantedAt:now };
  withStarterCosmetic.starterOnboarding = { version:1, status:"PENDING", selectedDepartment:null, completedAt:null, firstDayDeckId:null, boosterCount:0, boosterPresentationCount:0 };
  return withStarterCosmetic;
}
