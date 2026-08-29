import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { alphaDefinitions } from "./cards.js";
import { alphaDeckPresets } from "./decks.js";
import { createMatch, getCurrentPower, getLegalActions } from "./engine.js";
import { ALPHA_FORMAT } from "./formats.js";
import { executeMatchIntent } from "./intents.js";
import type {
  CardDefinition,
  CardType,
  ClientLegalActions,
  GameEvent,
  GameState,
  MatchIntent,
  PlayerId,
  TargetSelector
} from "./types.js";

export interface SimConfig {
  gamesPerMatchup: number;
  baseSeed: number;
  maxTurns: number;
  maxSteps: number;
}

interface MatchTelemetry {
  matchup: string;
  p1Deck: string;
  p2Deck: string;
  firstPlayer: PlayerId;
  winner: PlayerId | null;
  winnerDeck: string | null;
  reason: string;
  turnNumber: number;
  steps: number;
  timedOut: boolean;
  p1Reputation: number;
  p2Reputation: number;
  mulliganReturnedP1: number;
  mulliganReturnedP2: number;
  openingCheapCardsP1: number;
  openingCheapCardsP2: number;
  cardsPlayedP1: number;
  cardsPlayedP2: number;
  actionsResolved: number;
  actionsResolvedP1: number;
  actionsResolvedP2: number;
  incidentsActivated: number;
  incidentsActivatedP1: number;
  incidentsActivatedP2: number;
  abilitiesActivatedP1: number;
  abilitiesActivatedP2: number;
  attacksDeclaredP1: number;
  attacksDeclaredP2: number;
  reputationRestoredP1: number;
  reputationRestoredP2: number;
  employeesDestroyed: number;
  breakthroughDamage: number;
  reputationDamage: number;
  cardsSeenP1: string[];
  cardsSeenP2: string[];
  cardsPlayedDefinitionsP1: string[];
  cardsPlayedDefinitionsP2: string[];
  stuckContext?: Record<string, unknown>;
}

interface MatchupSummary {
  deckA: string;
  deckB: string;
  games: number;
  deckAWins: number;
  deckBWins: number;
  timeouts: number;
  deckAWinRate: number;
  averageTurns: number;
  firstPlayerWins: number;
  firstPlayerWinRate: number;
  averageFinalRepA: number;
  averageFinalRepB: number;
}

interface DeckSummary {
  deckId: string;
  games: number;
  wins: number;
  losses: number;
  timeouts: number;
  winRate: number;
  averageTurns: number;
  averageFinalReputation: number;
  averageCardsPlayed: number;
  averageActionsResolved: number;
  averageIncidentsActivated: number;
  averageAbilitiesActivated: number;
  averageAttacksDeclared: number;
  averageReputationRestored: number;
  firstPlayerWinRate: number;
  secondPlayerWinRate: number;
  averageMulliganReturned: number;
}

export interface CardBalanceStat {
  definitionId: string;
  name: string;
  department: string;
  cardType: CardType;
  gamesSeen: number;
  winsWhenSeen: number;
  winRateWhenSeen: number | null;
  gamesPlayed: number;
  winsWhenPlayed: number;
  winRateWhenPlayed: number | null;
  totalCopiesPlayed: number;
  averageCopiesPlayed: number;
}

export interface BalanceSignal {
  kind: "MATCHUP_SKEW" | "FIRST_PLAYER_SKEW" | "TIMEOUT_RATE";
  label: string;
  value: number;
  sample: number;
  sampleLabel: "TINY" | "SMALL" | "DIRECTIONAL" | "STRONGER";
}

export interface BalanceAnalytics {
  endReasons: Record<string, number>;
  firstPlayer: { games: number; wins: number; winRate: number };
  secondPlayer: { games: number; wins: number; winRate: number };
  mulliganByDeck: Array<{ deckId: string; games: number; usedGames: number; usageRate: number; averageReturned: number; averageCheapOpeningCards: number }>;
  signals: BalanceSignal[];
}

export interface BalanceReport {
  generatedAt: string;
  engineVersion: string;
  note: string;
  config: SimConfig;
  totals: {
    games: number;
    completedGames: number;
    timeouts: number;
    firstPlayerWins: number;
    firstPlayerWinRate: number;
    averageTurns: number;
  };
  matchups: MatchupSummary[];
  decks: DeckSummary[];
  games: MatchTelemetry[];
  analytics: BalanceAnalytics;
  cardStats: CardBalanceStat[];
}


export interface BalanceMatchupPair {
  deckA: string;
  deckB: string;
  label?: string;
}

export interface BalanceMatchupPlan extends SimConfig {
  matchups: BalanceMatchupPair[];
  sideSwap?: boolean;
  alternateFirstPlayer?: boolean;
}

const PROFILE_WEIGHTS: Record<string, Partial<Record<CardType, number>>> = {
  CUSTOMER_SERVICE: { EMPLOYEE: 7.2, ACTION: 6.7, INCIDENT: 8.8, SYSTEM: 5.8 },
  IT: { EMPLOYEE: 7.0, ACTION: 6.6, INCIDENT: 6.4, SYSTEM: 9.0 },
  OFFICE: { EMPLOYEE: 6.8, ACTION: 7.0, INCIDENT: 7.2, SYSTEM: 7.3 },
  MARKETING: { EMPLOYEE: 6.7, ACTION: 9.2, INCIDENT: 6.2, SYSTEM: 6.8 },
  PRODUCTION: { EMPLOYEE: 9.0, ACTION: 7.6, INCIDENT: 5.8, SYSTEM: 7.1 },
  NEUTRAL: { EMPLOYEE: 5.5, ACTION: 5.5, INCIDENT: 5.5, SYSTEM: 5.5 }
};

function opponent(playerId: PlayerId): PlayerId {
  return playerId === "P1" ? "P2" : "P1";
}

function printedCost(def: CardDefinition): number {
  return def.cost?.play ?? def.cost?.set ?? 0;
}

function definitionId(state: GameState, instanceId: string): string {
  return state.cards[instanceId]?.definitionId ?? "";
}

function ownFieldIds(state: GameState, playerId: PlayerId): string[] {
  return [...state.players[playerId].employeeField, ...state.players[playerId].supportField].filter((id): id is string => Boolean(id));
}

function countDefinitionOnField(state: GameState, playerId: PlayerId, id: string): number {
  return ownFieldIds(state, playerId).filter((instanceId) => definitionId(state, instanceId) === id).length;
}

function countCardTypeOnField(state: GameState, playerId: PlayerId, type: CardType): number {
  return ownFieldIds(state, playerId).filter((instanceId) => state.definitions[definitionId(state, instanceId)]?.cardType === type).length;
}

function countDepartmentEmployees(state: GameState, playerId: PlayerId, department: string): number {
  return state.players[playerId].employeeField.filter((id) => id && state.definitions[definitionId(state, id)].department === department).length;
}

function cardValue(state: GameState, instanceId: string, perspective: PlayerId): number {
  const card = state.cards[instanceId];
  const def = state.definitions[card.definitionId];
  const department = state.definitions[card.definitionId].department;
  const ownDeckDepartment = inferDeckDepartment(state, perspective);
  const base = PROFILE_WEIGHTS[ownDeckDepartment]?.[def.cardType] ?? 5;
  let value = base - printedCost(def) * 0.35;
  if (def.cardType === "EMPLOYEE") {
    const power = card.zone === "EMPLOYEE_FIELD" ? getCurrentPower(state, instanceId) : def.power ?? 0;
    value += power * 1.25;
    if (def.rank === "LEAD") value += 1.2;
    if (def.rank === "EXECUTIVE") value += 1.8;
  }
  if (department === ownDeckDepartment) value += 1.2;
  if (def.tags?.includes("TICKET") && ownDeckDepartment === "CUSTOMER_SERVICE") value += 0.8;
  if (def.tags?.includes("SYSTEM") && ownDeckDepartment === "IT") value += 0.8;
  if (def.tags?.includes("CAMPAIGN") && ownDeckDepartment === "MARKETING") value += 0.8;
  if ((def.tags?.includes("OUTPUT") || def.tags?.includes("SHIFT")) && ownDeckDepartment === "PRODUCTION") value += 0.8;
  if ((def.tags?.includes("MEETING") || def.tags?.includes("PROCESS")) && ownDeckDepartment === "OFFICE") value += 0.6;
  return value;
}

function inferDeckDepartment(state: GameState, playerId: PlayerId): string {
  const counts = new Map<string, number>();
  for (const id of [...state.players[playerId].deck, ...state.players[playerId].hand, ...state.players[playerId].archive]) {
    const def = state.definitions[state.cards[id].definitionId];
    if (def.department === "NEUTRAL") continue;
    counts.set(def.department, (counts.get(def.department) ?? 0) + 1);
  }
  for (const id of [...state.players[playerId].employeeField, ...state.players[playerId].supportField]) {
    if (!id) continue;
    const def = state.definitions[state.cards[id].definitionId];
    if (def.department === "NEUTRAL") continue;
    counts.set(def.department, (counts.get(def.department) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "NEUTRAL";
}

function chooseTargetIds(state: GameState, playerId: PlayerId, selector: { min: number; max: number; candidateIds: string[] }): string[] {
  const candidates = [...selector.candidateIds];
  if (candidates.length === 0) return [];
  const enemy = opponent(playerId);
  candidates.sort((a, b) => {
    const ca = state.cards[a];
    const cb = state.cards[b];
    const aEnemy = ca.controllerId === enemy ? 1 : 0;
    const bEnemy = cb.controllerId === enemy ? 1 : 0;
    if (aEnemy !== bEnemy) return bEnemy - aEnemy;
    return cardValue(state, b, playerId) - cardValue(state, a, playerId);
  });
  const desired = Math.min(selector.max, Math.max(selector.min, selector.max));
  return candidates.slice(0, desired);
}

function buildTargets(state: GameState, playerId: PlayerId, choices: Array<{ selectorId: string; min: number; max: number; candidateIds: string[] }>): Record<string, string[]> {
  const targets: Record<string, string[]> = {};
  for (const choice of choices) targets[choice.selectorId] = chooseTargetIds(state, playerId, choice);
  return targets;
}

function mulliganChoice(state: GameState, playerId: PlayerId): string[] {
  const hand = state.players[playerId].hand;
  const department = inferDeckDepartment(state, playerId);
  const ids = hand.map((instanceId) => ({ instanceId, id: definitionId(state, instanceId), def: state.definitions[definitionId(state, instanceId)] }));
  const cheapEmployees = ids.filter(({ def }) => def.cardType === "EMPLOYEE" && printedCost(def) <= 2);

  const keep = new Set<string>();
  for (const { instanceId, def } of cheapEmployees.slice(0, department === "PRODUCTION" ? 3 : 2)) keep.add(instanceId);

  const keepFirst = (wanted: string[]) => {
    for (const id of wanted) {
      const found = ids.find((x) => x.id === id && !keep.has(x.instanceId));
      if (found) { keep.add(found.instanceId); return; }
    }
  };

  if (department === "CUSTOMER_SERVICE") {
    keepFirst(["CS-019", "CS-013", "CS-003"]); // backlog / review engine / ticket draw engine
    keepFirst(["CS-010", "CS-011", "CS-018"]); // one cheap reactive card
  } else if (department === "IT") {
    keepFirst(["IT-003", "IT-001", "IT-014"]); // sysadmin / service / cluster
    keepFirst(["IT-015", "IT-020", "N-013"]); // engine system
  } else if (department === "OFFICE") {
    keepFirst(["OFC-004", "OFC-003", "OFC-011"]);
    keepFirst(["OFC-010", "OFC-007"]);
  } else if (department === "MARKETING") {
    keepFirst(["MKT-005", "MKT-001", "MKT-002", "MKT-014"]);
    keepFirst(["MKT-008", "MKT-009", "MKT-010"]);
  } else if (department === "PRODUCTION") {
    for (const { instanceId, def } of ids) {
      if (def.cardType === "EMPLOYEE" && printedCost(def) <= 2 && keep.size < 4) keep.add(instanceId);
    }
    keepFirst(["PRD-005", "PRD-013", "PRD-014"]);
  }

  // If the heuristic did not find a real starter, fall back to aggressively seeking one.
  if (cheapEmployees.length === 0) {
    return hand.filter((instanceId) => {
      const def = state.definitions[definitionId(state, instanceId)];
      return def.cardType !== "EMPLOYEE" || printedCost(def) >= 3;
    });
  }

  return hand.filter((instanceId) => {
    if (keep.has(instanceId)) return false;
    const def = state.definitions[definitionId(state, instanceId)];
    if (def.cardType === "EMPLOYEE" && printedCost(def) >= 5) return true;
    if (department === "PRODUCTION" && def.cardType !== "EMPLOYEE" && cheapEmployees.length < 2) return true;
    if (def.cardType === "ACTION" && printedCost(def) >= 4) return true;
    return false;
  });
}

function attackThreatScore(state: GameState, playerId: PlayerId): number {
  const pending = state.pendingAttack;
  if (!pending) return 0;
  if (pending.targetId === null) return 12 + getCurrentPower(state, pending.attackerId);
  const attackerPower = getCurrentPower(state, pending.attackerId);
  const targetPower = getCurrentPower(state, pending.targetId);
  const targetValue = cardValue(state, pending.targetId, playerId);
  if (attackerPower > targetPower) return 8 + targetValue;
  if (attackerPower === targetPower) return 4 + targetValue * 0.5;
  return -3;
}

function buildResponseTargets(state: GameState, playerId: PlayerId, sourceId: string, choices: Array<{ selectorId: string; min: number; max: number; candidateIds: string[] }>): Record<string, string[]> {
  const defId = definitionId(state, sourceId);
  if ((defId === "CS-011" || defId === "CS-012") && choices.length) {
    const targets: Record<string, string[]> = {};
    for (const choice of choices) {
      const candidates = [...choice.candidateIds];
      if (defId === "CS-011" && state.pendingAttack) {
        const attackPower = getCurrentPower(state, state.pendingAttack.attackerId);
        candidates.sort((a, b) => {
          const aSurvives = getCurrentPower(state, a) >= attackPower ? 1 : 0;
          const bSurvives = getCurrentPower(state, b) >= attackPower ? 1 : 0;
          if (aSurvives !== bSurvives) return bSurvives - aSurvives;
          return cardValue(state, a, playerId) - cardValue(state, b, playerId);
        });
      } else {
        candidates.sort((a, b) => cardValue(state, a, playerId) - cardValue(state, b, playerId));
      }
      targets[choice.selectorId] = candidates.slice(0, Math.max(choice.min, Math.min(choice.max, 1)));
    }
    return targets;
  }
  return buildTargets(state, playerId, choices);
}

function chooseResponse(state: GameState, playerId: PlayerId, legal: ClientLegalActions): MatchIntent {
  if (legal.responseOptions.length === 0) return { type: "PASS_PRIORITY" };
  const threat = attackThreatScore(state, playerId);
  const scored = legal.responseOptions.map((option) => {
    const def = state.definitions[definitionId(state, option.sourceId)];
    let score = cardValue(state, option.sourceId, playerId) + (def.cardType === "INCIDENT" ? 1.5 : 0);
    switch (def.id) {
      case "CS-010": score += threat > 0 ? threat : -12; break; // Please Hold
      case "CS-011": score += threat > 4 ? 7 : -8; break;
      case "CS-005": score += threat > 5 ? 6 : -8; break;
      case "CS-018": score += 8; break;
      case "CS-012": score += 5; break;
      case "CS-015": score += 5; break;
      case "IT-013": score += 7; break;
      case "IT-012": score += 6; break;
      case "OFC-007": score += 5; break;
      case "OFC-014": score += 6; break;
      case "MKT-013": score += 8; break;
      case "N-011": score += threat > 4 ? 5 : -6; break;
    }
    return { option, score };
  }).sort((a, b) => b.score - a.score);
  const pick = scored[0];
  if (!pick || pick.score < 3.5) return { type: "PASS_PRIORITY" };
  return {
    type: "ACTIVATE_RESPONSE",
    sourceId: pick.option.sourceId,
    abilityId: pick.option.abilityId,
    targets: buildResponseTargets(state, playerId, pick.option.sourceId, pick.option.targetChoices)
  };
}

function chooseAttack(state: GameState, playerId: PlayerId, legal: ClientLegalActions): MatchIntent | null {
  const options: Array<{ attackerId: string; targetId: string | null; score: number }> = [];
  const department = inferDeckDepartment(state, playerId);
  for (const attack of legal.attacks) {
    const attackerPower = getCurrentPower(state, attack.attackerId);
    const attackerValue = cardValue(state, attack.attackerId, playerId);
    for (const targetId of attack.targetIds) {
      if (targetId === null) {
        let score = 100 + attackerPower * 3;
        if (department === "MARKETING") score += 12;
        if (department === "CUSTOMER_SERVICE") score += 3;
        options.push({ attackerId: attack.attackerId, targetId, score });
        continue;
      }
      const defenderPower = getCurrentPower(state, targetId);
      const defenderValue = cardValue(state, targetId, playerId);
      let score = 0;
      if (attackerPower > defenderPower) score = 60 + (attackerPower - defenderPower) + defenderValue;
      else if (attackerPower === defenderPower) score = 30 + defenderValue * 0.4;
      else score = -20 - (defenderPower - attackerPower);

      // Archetype combat posture: reactive/control decks preserve engines, Production accepts trades.
      if (attackerPower === defenderPower && department === "CUSTOMER_SERVICE") score = 8 + defenderValue - attackerValue * 1.15;
      if (attackerPower === defenderPower && department === "OFFICE") score = 14 + defenderValue - attackerValue * 0.75;
      if (attackerPower === defenderPower && department === "PRODUCTION") score += 12;
      if (department === "CUSTOMER_SERVICE" && attackerValue >= 10 && attackerPower <= defenderPower) score -= 12;
      options.push({ attackerId: attack.attackerId, targetId, score });
    }
  }
  const best = options.sort((a, b) => b.score - a.score)[0];
  if (!best || best.score < 0) return null;
  return { type: "DECLARE_ATTACK", attackerId: best.attackerId, targetId: best.targetId };
}

function chooseMainPlay(state: GameState, playerId: PlayerId, legal: ClientLegalActions): MatchIntent | null {
  const department = inferDeckDepartment(state, playerId);
  const candidates: Array<{ score: number; intent: MatchIntent }> = [];
  const ownEmployees = state.players[playerId].employeeField.filter(Boolean).length;
  const ownSystems = countCardTypeOnField(state, playerId, "SYSTEM");
  const ownIncidents = state.players[playerId].supportField.filter((id) => id && state.cards[id].faceUp === false).length;
  const missingReputation = Math.max(0, 20 - state.players[playerId].reputation);

  for (const option of legal.playableEmployees) {
    const def = state.definitions[definitionId(state, option.cardId)];
    let score = cardValue(state, option.cardId, playerId);
    if (department === "PRODUCTION") score += 3.5 + Math.max(0, 3 - ownEmployees) * 1.5;
    if (department === "CUSTOMER_SERVICE" && ["CS-003", "CS-005"].includes(def.id)) score += 2;
    if (department === "IT" && def.id === "IT-003" && ownSystems === 0) score += 5;
    if (department === "OFFICE" && ["OFC-003", "OFC-004"].includes(def.id)) score += 3;
    if (department === "MARKETING" && ["MKT-001", "MKT-005"].includes(def.id)) score += 3;
    if (def.rank === "EXECUTIVE") score -= 1.2;
    const bestOption = [...option.options].sort((a, b) => {
      const av = a.promotionMaterialIds.reduce((sum, id) => sum + cardValue(state, id, playerId), 0);
      const bv = b.promotionMaterialIds.reduce((sum, id) => sum + cardValue(state, id, playerId), 0);
      return av - bv;
    })[0];
    if (bestOption) score -= bestOption.promotionMaterialIds.reduce((sum, id) => sum + cardValue(state, id, playerId) * 0.18, 0);
    if (bestOption) candidates.push({ score, intent: { type: "PLAY_EMPLOYEE", cardId: option.cardId, slot: bestOption.slot, promotionMaterialIds: bestOption.promotionMaterialIds } });
  }

  for (const option of legal.playableSystems) {
    const def = state.definitions[definitionId(state, option.cardId)];
    let score = cardValue(state, option.cardId, playerId);
    if (department === "IT") score += 4 + Math.max(0, 2 - ownSystems);
    if (department === "CUSTOMER_SERVICE" && def.id === "CS-019") score += ownIncidents < 2 ? 4 : 1;
    if (department === "CUSTOMER_SERVICE" && def.id === "CS-013") score += missingReputation >= 3 ? 3 : 0;
    if (department === "OFFICE" && def.id === "OFC-011") score += 3;
    if (department === "MARKETING" && ["MKT-014", "MKT-015"].includes(def.id)) score += 3;
    if (department === "PRODUCTION" && ["PRD-013", "PRD-014"].includes(def.id)) score += ownEmployees >= 2 ? 3 : 0;
    candidates.push({ score, intent: { type: "PLAY_SYSTEM", cardId: option.cardId, slot: option.slots[0] } });
  }

  for (const option of legal.settableIncidents) {
    const def = state.definitions[definitionId(state, option.cardId)];
    let score = cardValue(state, option.cardId, playerId);
    if (department === "CUSTOMER_SERVICE") score += ownIncidents === 0 ? 5 : ownIncidents === 1 ? 3 : 0.5;
    if (department === "OFFICE") score += ownIncidents < 2 ? 2 : 0;
    if (def.id === "CS-010" || def.id === "CS-018") score += 1.5;
    candidates.push({ score, intent: { type: "SET_INCIDENT", cardId: option.cardId, slot: option.slots[0] } });
  }

  for (const option of legal.playableActions) {
    const def = state.definitions[definitionId(state, option.cardId)];
    let score = cardValue(state, option.cardId, playerId);
    if (department === "MARKETING") score += 3.5;
    if (department === "CUSTOMER_SERVICE") {
      if (def.id === "CS-014") score += missingReputation >= 3 ? 7 : missingReputation > 0 ? 2 : -10;
      if (def.id === "CS-008" || def.id === "CS-009") score += ownEmployees < 4 ? 5 : 0;
      if (def.id === "CS-016") score += countDefinitionOnField(state, playerId, "CS-006") + countDefinitionOnField(state, playerId, "CS-007") === 0 ? 3 : -1;
    }
    if (def.id === "MKT-012") {
      const count = state.players[playerId].turnCounters.actionsPlayedByDepartment.MARKETING ?? 0;
      score += count === 2 ? 11 : count === 1 ? 1 : -5;
    }
    if (def.id === "MKT-009") {
      const count = state.players[playerId].turnCounters.actionsPlayedByDepartment.MARKETING ?? 0;
      score += count >= 1 ? 3 : 0;
    }
    if (def.id === "PRD-009") score += ownEmployees >= 4 ? 10 : ownEmployees === 3 ? 3 : -9;
    if (def.id === "PRD-010") score += ownEmployees >= 3 ? 5 : ownEmployees <= 1 ? -7 : 0;
    if (def.id === "OFC-009") score += ownEmployees >= 3 ? 6 : ownEmployees <= 1 ? -5 : 0;
    candidates.push({ score, intent: { type: "PLAY_ACTION", cardId: option.cardId, targets: buildTargets(state, playerId, option.targetChoices) } });
  }

  for (const option of legal.activatableAbilities) {
    const def = state.definitions[definitionId(state, option.sourceId)];
    let score = 5.5;
    if (def.department === department) score += 1;
    if (department === "IT" && def.id === "IT-014") score += 4;
    candidates.push({ score, intent: { type: "ACTIVATE_ABILITY", sourceId: option.sourceId, abilityId: option.abilityId, targets: buildTargets(state, playerId, option.targetChoices) } });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.intent ?? null;
}

function choosePendingIntent(state: GameState): { playerId: PlayerId; intent: MatchIntent } | null {
  if (state.phase === "MULLIGAN" && state.status === "SETUP") {
    const playerId = !state.players.P1.mulliganDone ? "P1" : !state.players.P2.mulliganDone ? "P2" : null;
    if (playerId) return { playerId, intent: { type: "MULLIGAN", returnIds: mulliganChoice(state, playerId) } };
  }
  if (state.pendingChoice) {
    const p = state.pendingChoice.playerId;
    const available = state.pendingChoice.options.map((x) => x.id);
    const optionId = available.includes("PAY") && state.players[p].availableCapacity >= 1 ? "PAY" : available.includes("DELAY") ? "DELAY" : available[0];
    return { playerId: p, intent: { type: "RESOLVE_CHOICE", choiceId: state.pendingChoice.id, optionId } };
  }
  if (state.pendingDeckSelection) {
    const pending = state.pendingDeckSelection;
    const selected = [...pending.candidateIds].sort((a, b) => cardValue(state, b, pending.playerId) - cardValue(state, a, pending.playerId)).slice(0, pending.max);
    return { playerId: pending.playerId, intent: { type: "RESOLVE_DECK_SELECTION", selectionId: pending.id, selectedIds: selected } };
  }
  if (state.pendingTriggerTargetSelection) {
    const pending = state.pendingTriggerTargetSelection;
    return { playerId: pending.playerId, intent: { type: "RESOLVE_TRIGGER_TARGET_SELECTION", selectionId: pending.id, targets: buildTargets(state, pending.playerId, pending.targetChoices) } };
  }
  if (state.pendingHandSelection) {
    const pending = state.pendingHandSelection;
    const selected = [...pending.candidateIds].sort((a, b) => cardValue(state, a, pending.playerId) - cardValue(state, b, pending.playerId)).slice(0, pending.min);
    return { playerId: pending.playerId, intent: { type: "RESOLVE_HAND_SELECTION", selectionId: pending.id, selectedIds: selected } };
  }
  return null;
}

function nextBotIntent(state: GameState): { playerId: PlayerId; intent: MatchIntent } | null {
  const pending = choosePendingIntent(state);
  if (pending) return pending;
  if (state.status !== "ACTIVE") return null;

  if (state.responseWindow && state.priorityPlayerId) {
    const legal = getLegalActions(state, state.priorityPlayerId);
    return { playerId: state.priorityPlayerId, intent: chooseResponse(state, state.priorityPlayerId, legal) };
  }

  const playerId = state.activePlayerId;
  const legal = getLegalActions(state, playerId);
  if (legal.archiveExcessHandIds.length) {
    const required = state.players[playerId].hand.length - 8;
    const selected = [...legal.archiveExcessHandIds].sort((a, b) => cardValue(state, a, playerId) - cardValue(state, b, playerId)).slice(0, required);
    return { playerId, intent: { type: "ARCHIVE_EXCESS_HAND", cardIds: selected } };
  }
  if (state.phase === "MAIN") {
    const play = chooseMainPlay(state, playerId, legal);
    if (play) return { playerId, intent: play };
  }
  if (state.phase === "BATTLE") {
    const attack = chooseAttack(state, playerId, legal);
    if (attack) return { playerId, intent: attack };
  }
  if (legal.canAdvancePhase) return { playerId, intent: { type: "ADVANCE_PHASE" } };
  if (legal.canPassPriority) return { playerId, intent: { type: "PASS_PRIORITY" } };
  return null;
}

function eventCount(events: GameEvent[], type: GameEvent["type"], playerId?: PlayerId): number {
  return events.filter((e) => e.type === type && (!playerId || e.playerId === playerId)).length;
}

function reputationDamage(events: GameEvent[]): number {
  let total = 0;
  for (const event of events) {
    if (event.type !== "REPUTATION_CHANGED") continue;
    const amount = Number(event.data?.amount ?? 0);
    if (amount < 0) total += -amount;
  }
  return total;
}

function reputationRestored(events: GameEvent[], playerId: PlayerId): number {
  let total = 0;
  for (const event of events) {
    if (event.type !== "REPUTATION_CHANGED" || event.playerId !== playerId) continue;
    const amount = Number(event.data?.amount ?? 0);
    if (amount > 0) total += amount;
  }
  return total;
}

function mulliganReturned(events: GameEvent[], playerId: PlayerId): number {
  const event = events.find((entry) => entry.type === "MULLIGAN_COMPLETED" && entry.playerId === playerId);
  return Number(event?.data?.returned ?? 0);
}

function cheapOpeningCards(state: GameState, playerId: PlayerId): number {
  return state.players[playerId].hand.filter((instanceId) => printedCost(state.definitions[definitionId(state, instanceId)]) <= 2).length;
}

function eventDefinitionIds(state: GameState, type: GameEvent["type"], playerId: PlayerId): string[] {
  return state.eventLog.filter((event) => event.type === type && event.playerId === playerId && event.cardInstanceId).map((event) => definitionId(state, String(event.cardInstanceId))).filter(Boolean);
}

function seenDefinitionIds(state: GameState, playerId: PlayerId): string[] {
  const ids = new Set<string>();
  for (const id of eventDefinitionIds(state, "CARD_DRAWN", playerId)) ids.add(id);
  for (const id of eventDefinitionIds(state, "CARD_PLAYED", playerId)) ids.add(id);
  return [...ids];
}

function runMatch(p1DeckId: string, p2DeckId: string, firstPlayer: PlayerId, seed: number, config: SimConfig): MatchTelemetry {
  let state = createMatch({
    matchId: `sim-${seed}`,
    seed,
    firstPlayerId: firstPlayer,
    definitions: alphaDefinitions,
    p1Deck: alphaDeckPresets[p1DeckId].cards,
    p2Deck: alphaDeckPresets[p2DeckId].cards,
    format: ALPHA_FORMAT
  });
  const openingCheapCardsP1 = cheapOpeningCards(state, "P1");
  const openingCheapCardsP2 = cheapOpeningCards(state, "P2");
  let steps = 0;
  let stuck = false;
  let stuckContext: Record<string, unknown> | undefined;
  while (state.status !== "ENDED" && state.turnNumber <= config.maxTurns && steps < config.maxSteps) {
    const decision = nextBotIntent(state);
    if (!decision) {
      stuck = true;
      stuckContext = {
        phase: state.phase,
        activePlayerId: state.activePlayerId,
        priorityPlayerId: state.priorityPlayerId,
        responseWindow: state.responseWindow,
        pendingAttack: state.pendingAttack,
        pendingBattleResolution: state.pendingBattleResolution,
        pendingChoice: Boolean(state.pendingChoice),
        pendingDeckSelection: Boolean(state.pendingDeckSelection),
        pendingTriggerTargetSelection: Boolean(state.pendingTriggerTargetSelection),
        pendingHandSelection: Boolean(state.pendingHandSelection),
        p1Legal: getLegalActions(state, "P1"),
        p2Legal: getLegalActions(state, "P2")
      };
      break;
    }
    const execution = executeMatchIntent(state, {
      intentId: `sim-${seed}-${steps}`,
      matchId: state.matchId,
      playerId: decision.playerId,
      expectedStateVersion: state.stateVersion,
      intent: decision.intent
    });
    if (!execution.response.accepted) {
      // The bot should only use projected legal options. If a heuristic becomes stale, pass/advance once instead of corrupting the run.
      const legal = getLegalActions(state, decision.playerId);
      const fallback: MatchIntent | null = legal.canPassPriority ? { type: "PASS_PRIORITY" } : (state.activePlayerId === decision.playerId && legal.canAdvancePhase ? { type: "ADVANCE_PHASE" } : null);
      if (!fallback) {
        stuck = true;
        stuckContext = { rejectedIntent: decision.intent, rejectedError: execution.response.error, phase: state.phase, activePlayerId: state.activePlayerId, priorityPlayerId: state.priorityPlayerId, responseWindow: state.responseWindow, p1Legal: getLegalActions(state, "P1"), p2Legal: getLegalActions(state, "P2") };
        break;
      }
      const retry = executeMatchIntent(state, {
        intentId: `sim-${seed}-${steps}-fallback`,
        matchId: state.matchId,
        playerId: decision.playerId,
        expectedStateVersion: state.stateVersion,
        intent: fallback
      });
      if (!retry.response.accepted) {
        stuck = true;
        stuckContext = { rejectedIntent: decision.intent, rejectedError: execution.response.error, fallback, fallbackError: retry.response.error, phase: state.phase, activePlayerId: state.activePlayerId, priorityPlayerId: state.priorityPlayerId, responseWindow: state.responseWindow, p1Legal: getLegalActions(state, "P1"), p2Legal: getLegalActions(state, "P2") };
        break;
      }
      state = retry.state;
    } else {
      state = execution.state;
    }
    steps += 1;
  }

  const timedOut = state.status !== "ENDED";
  const winnerDeck = state.winnerId === "P1" ? p1DeckId : state.winnerId === "P2" ? p2DeckId : null;
  return {
    matchup: `${p1DeckId} vs ${p2DeckId}`,
    p1Deck: p1DeckId,
    p2Deck: p2DeckId,
    firstPlayer,
    winner: state.winnerId,
    winnerDeck,
    reason: timedOut ? (stuck ? "BOT_STUCK" : "TURN_OR_STEP_CAP") : state.reason ?? "ENDED",
    turnNumber: state.turnNumber,
    steps,
    timedOut,
    p1Reputation: state.players.P1.reputation,
    p2Reputation: state.players.P2.reputation,
    mulliganReturnedP1: mulliganReturned(state.eventLog, "P1"),
    mulliganReturnedP2: mulliganReturned(state.eventLog, "P2"),
    openingCheapCardsP1,
    openingCheapCardsP2,
    cardsPlayedP1: eventCount(state.eventLog, "CARD_PLAYED", "P1"),
    cardsPlayedP2: eventCount(state.eventLog, "CARD_PLAYED", "P2"),
    actionsResolved: eventCount(state.eventLog, "ACTION_RESOLVED"),
    actionsResolvedP1: eventCount(state.eventLog, "ACTION_RESOLVED", "P1"),
    actionsResolvedP2: eventCount(state.eventLog, "ACTION_RESOLVED", "P2"),
    incidentsActivated: eventCount(state.eventLog, "INCIDENT_ACTIVATED"),
    incidentsActivatedP1: eventCount(state.eventLog, "INCIDENT_ACTIVATED", "P1"),
    incidentsActivatedP2: eventCount(state.eventLog, "INCIDENT_ACTIVATED", "P2"),
    abilitiesActivatedP1: eventCount(state.eventLog, "ABILITY_ACTIVATED", "P1"),
    abilitiesActivatedP2: eventCount(state.eventLog, "ABILITY_ACTIVATED", "P2"),
    attacksDeclaredP1: eventCount(state.eventLog, "ATTACK_DECLARED", "P1"),
    attacksDeclaredP2: eventCount(state.eventLog, "ATTACK_DECLARED", "P2"),
    reputationRestoredP1: reputationRestored(state.eventLog, "P1"),
    reputationRestoredP2: reputationRestored(state.eventLog, "P2"),
    employeesDestroyed: eventCount(state.eventLog, "EMPLOYEE_DESTROYED"),
    breakthroughDamage: state.eventLog.filter((e) => e.type === "BREAKTHROUGH_DAMAGE").reduce((sum, e) => sum + Number(e.data?.amount ?? 0), 0),
    reputationDamage: reputationDamage(state.eventLog),
    cardsSeenP1: seenDefinitionIds(state, "P1"),
    cardsSeenP2: seenDefinitionIds(state, "P2"),
    cardsPlayedDefinitionsP1: eventDefinitionIds(state, "CARD_PLAYED", "P1"),
    cardsPlayedDefinitionsP2: eventDefinitionIds(state, "CARD_PLAYED", "P2"),
    ...(stuckContext ? { stuckContext } : {})
  };
}

function pct(value: number): number {
  return Math.round(value * 1000) / 10;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function summarizePair(deckA: string, deckB: string, games: MatchTelemetry[]): MatchupSummary {
  const relevant = games.filter((g) => (g.p1Deck === deckA && g.p2Deck === deckB) || (g.p1Deck === deckB && g.p2Deck === deckA));
  const deckAWins = relevant.filter((g) => g.winnerDeck === deckA).length;
  const deckBWins = relevant.filter((g) => g.winnerDeck === deckB).length;
  const completed = deckAWins + deckBWins;
  const firstPlayerWins = relevant.filter((g) => g.winner === g.firstPlayer).length;
  const repA = relevant.map((g) => g.p1Deck === deckA ? g.p1Reputation : g.p2Reputation);
  const repB = relevant.map((g) => g.p1Deck === deckB ? g.p1Reputation : g.p2Reputation);
  return {
    deckA,
    deckB,
    games: relevant.length,
    deckAWins,
    deckBWins,
    timeouts: relevant.filter((g) => g.timedOut).length,
    deckAWinRate: completed ? pct(deckAWins / completed) : 0,
    averageTurns: round(relevant.reduce((s, g) => s + g.turnNumber, 0) / Math.max(1, relevant.length)),
    firstPlayerWins,
    firstPlayerWinRate: completed ? pct(firstPlayerWins / completed) : 0,
    averageFinalRepA: round(repA.reduce((a, b) => a + b, 0) / Math.max(1, repA.length)),
    averageFinalRepB: round(repB.reduce((a, b) => a + b, 0) / Math.max(1, repB.length))
  };
}

function summarizeDeck(deckId: string, games: MatchTelemetry[]): DeckSummary {
  const relevant = games.filter((g) => g.p1Deck === deckId || g.p2Deck === deckId);
  const wins = relevant.filter((g) => g.winnerDeck === deckId).length;
  const losses = relevant.filter((g) => g.winnerDeck && g.winnerDeck !== deckId).length;
  const completed = wins + losses;
  const finalRep = relevant.map((g) => g.p1Deck === deckId ? g.p1Reputation : g.p2Reputation);
  const cardsPlayed = relevant.map((g) => g.p1Deck === deckId ? g.cardsPlayedP1 : g.cardsPlayedP2);
  const actionsResolved = relevant.map((g) => g.p1Deck === deckId ? g.actionsResolvedP1 : g.actionsResolvedP2);
  const incidentsActivated = relevant.map((g) => g.p1Deck === deckId ? g.incidentsActivatedP1 : g.incidentsActivatedP2);
  const abilitiesActivated = relevant.map((g) => g.p1Deck === deckId ? g.abilitiesActivatedP1 : g.abilitiesActivatedP2);
  const attacksDeclared = relevant.map((g) => g.p1Deck === deckId ? g.attacksDeclaredP1 : g.attacksDeclaredP2);
  const restored = relevant.map((g) => g.p1Deck === deckId ? g.reputationRestoredP1 : g.reputationRestoredP2);
  const asFirst = relevant.filter((g) => (g.p1Deck === deckId ? g.firstPlayer === "P1" : g.firstPlayer === "P2"));
  const asSecond = relevant.filter((g) => !asFirst.includes(g));
  const firstWins = asFirst.filter((g) => g.winnerDeck === deckId).length;
  const secondWins = asSecond.filter((g) => g.winnerDeck === deckId).length;
  const mulligans = relevant.map((g) => g.p1Deck === deckId ? g.mulliganReturnedP1 : g.mulliganReturnedP2);
  return {
    deckId,
    games: relevant.length,
    wins,
    losses,
    timeouts: relevant.filter((g) => g.timedOut).length,
    winRate: completed ? pct(wins / completed) : 0,
    averageTurns: round(relevant.reduce((sum, g) => sum + g.turnNumber, 0) / Math.max(1, relevant.length)),
    averageFinalReputation: round(finalRep.reduce((sum, value) => sum + value, 0) / Math.max(1, finalRep.length)),
    averageCardsPlayed: round(cardsPlayed.reduce((sum, value) => sum + value, 0) / Math.max(1, cardsPlayed.length)),
    averageActionsResolved: round(actionsResolved.reduce((sum, value) => sum + value, 0) / Math.max(1, actionsResolved.length)),
    averageIncidentsActivated: round(incidentsActivated.reduce((sum, value) => sum + value, 0) / Math.max(1, incidentsActivated.length)),
    averageAbilitiesActivated: round(abilitiesActivated.reduce((sum, value) => sum + value, 0) / Math.max(1, abilitiesActivated.length)),
    averageAttacksDeclared: round(attacksDeclared.reduce((sum, value) => sum + value, 0) / Math.max(1, attacksDeclared.length)),
    averageReputationRestored: round(restored.reduce((sum, value) => sum + value, 0) / Math.max(1, restored.length)),
    firstPlayerWinRate: firstWins + asFirst.filter((g) => g.winnerDeck && g.winnerDeck !== deckId).length ? pct(firstWins / Math.max(1, asFirst.filter((g) => g.winnerDeck).length)) : 0,
    secondPlayerWinRate: secondWins + asSecond.filter((g) => g.winnerDeck && g.winnerDeck !== deckId).length ? pct(secondWins / Math.max(1, asSecond.filter((g) => g.winnerDeck).length)) : 0,
    averageMulliganReturned: round(mulligans.reduce((sum, value) => sum + value, 0) / Math.max(1, mulligans.length))
  };
}

function buildCardBalanceStats(games: MatchTelemetry[]): CardBalanceStat[] {
  const map = new Map<string, { gamesSeen:number; winsWhenSeen:number; gamesPlayed:number; winsWhenPlayed:number; totalCopiesPlayed:number }>();
  for (const game of games) {
    for (const playerId of ["P1","P2"] as PlayerId[]) {
      const seen = playerId === "P1" ? game.cardsSeenP1 : game.cardsSeenP2;
      const played = playerId === "P1" ? game.cardsPlayedDefinitionsP1 : game.cardsPlayedDefinitionsP2;
      const won = game.winner === playerId;
      for (const id of new Set(seen)) { const row=map.get(id)??{gamesSeen:0,winsWhenSeen:0,gamesPlayed:0,winsWhenPlayed:0,totalCopiesPlayed:0};row.gamesSeen+=1;if(won)row.winsWhenSeen+=1;map.set(id,row); }
      const playedSet = new Set(played);
      for (const id of playedSet) { const row=map.get(id)??{gamesSeen:0,winsWhenSeen:0,gamesPlayed:0,winsWhenPlayed:0,totalCopiesPlayed:0};row.gamesPlayed+=1;if(won)row.winsWhenPlayed+=1;row.totalCopiesPlayed+=played.filter((value)=>value===id).length;map.set(id,row); }
    }
  }
  return [...map.entries()].map(([definitionId,row])=>{const def=alphaDefinitions[definitionId];return {definitionId,name:def?.name??definitionId,department:def?.department??"UNKNOWN",cardType:def?.cardType??"ACTION",gamesSeen:row.gamesSeen,winsWhenSeen:row.winsWhenSeen,winRateWhenSeen:row.gamesSeen?pct(row.winsWhenSeen/row.gamesSeen):null,gamesPlayed:row.gamesPlayed,winsWhenPlayed:row.winsWhenPlayed,winRateWhenPlayed:row.gamesPlayed?pct(row.winsWhenPlayed/row.gamesPlayed):null,totalCopiesPlayed:row.totalCopiesPlayed,averageCopiesPlayed:round(row.totalCopiesPlayed/Math.max(1,row.gamesPlayed))};}).sort((a,b)=>b.gamesPlayed-a.gamesPlayed||b.gamesSeen-a.gamesSeen||a.definitionId.localeCompare(b.definitionId));
}

function sampleLabel(sample: number): BalanceSignal["sampleLabel"] {
  if (sample < 4) return "TINY";
  if (sample < 10) return "SMALL";
  if (sample < 30) return "DIRECTIONAL";
  return "STRONGER";
}

function buildBalanceAnalytics(games: MatchTelemetry[], matchups: MatchupSummary[], deckIds: string[]): BalanceAnalytics {
  const completed = games.filter((game) => !game.timedOut && game.winner);
  const firstWins = completed.filter((game) => game.winner === game.firstPlayer).length;
  const endReasons: Record<string, number> = {};
  for (const game of games) endReasons[game.reason] = (endReasons[game.reason] ?? 0) + 1;
  const mulliganByDeck = deckIds.map((deckId) => {
    const relevant = games.filter((game) => game.p1Deck === deckId || game.p2Deck === deckId);
    const returned = relevant.map((game) => game.p1Deck === deckId ? game.mulliganReturnedP1 : game.mulliganReturnedP2);
    const cheap = relevant.map((game) => game.p1Deck === deckId ? game.openingCheapCardsP1 : game.openingCheapCardsP2);
    const usedGames = returned.filter((value) => value > 0).length;
    return {
      deckId, games: relevant.length, usedGames,
      usageRate: relevant.length ? pct(usedGames / relevant.length) : 0,
      averageReturned: round(returned.reduce((sum, value) => sum + value, 0) / Math.max(1, returned.length)),
      averageCheapOpeningCards: round(cheap.reduce((sum, value) => sum + value, 0) / Math.max(1, cheap.length))
    };
  });
  const signals: BalanceSignal[] = [];
  for (const matchup of matchups) {
    const completedPair = matchup.deckAWins + matchup.deckBWins;
    if (completedPair >= 2 && (matchup.deckAWinRate >= 70 || matchup.deckAWinRate <= 30)) signals.push({ kind:"MATCHUP_SKEW", label:`${matchup.deckA} vs ${matchup.deckB}`, value:matchup.deckAWinRate, sample:completedPair, sampleLabel:sampleLabel(completedPair) });
  }
  const firstRate = completed.length ? pct(firstWins / completed.length) : 0;
  if (completed.length >= 4 && (firstRate >= 60 || firstRate <= 40)) signals.push({ kind:"FIRST_PLAYER_SKEW", label:"First-player win rate", value:firstRate, sample:completed.length, sampleLabel:sampleLabel(completed.length) });
  const timeoutRate = games.length ? pct(games.filter((game) => game.timedOut).length / games.length) : 0;
  if (games.length >= 4 && timeoutRate >= 10) signals.push({ kind:"TIMEOUT_RATE", label:"Turn/step-cap or bot-stuck rate", value:timeoutRate, sample:games.length, sampleLabel:sampleLabel(games.length) });
  return {
    endReasons,
    firstPlayer: { games: completed.length, wins:firstWins, winRate:firstRate },
    secondPlayer: { games:completed.length, wins:completed.length-firstWins, winRate:completed.length ? pct((completed.length-firstWins)/completed.length) : 0 },
    mulliganByDeck,
    signals
  };
}

export function runBalanceMatchupSet(plan: BalanceMatchupPlan): BalanceReport {
  if (!plan.matchups.length) throw new Error("At least one matchup is required.");
  const games: MatchTelemetry[] = [];
  let sequence = 0;
  for (const pair of plan.matchups) {
    if (!alphaDeckPresets[pair.deckA]) throw new Error(`Unknown deck preset: ${pair.deckA}`);
    if (!alphaDeckPresets[pair.deckB]) throw new Error(`Unknown deck preset: ${pair.deckB}`);
    if (pair.deckA === pair.deckB) throw new Error(`Matchup must use two different decks: ${pair.deckA}`);
    for (let game = 0; game < plan.gamesPerMatchup; game += 1) {
      // v7.34: seat and opener axes intentionally vary independently across each four-game block.
      const swapSeats = plan.sideSwap !== false && game % 2 === 1;
      const p1Deck = swapSeats ? pair.deckB : pair.deckA;
      const p2Deck = swapSeats ? pair.deckA : pair.deckB;
      const firstPlayer: PlayerId = plan.alternateFirstPlayer === false ? "P1" : (Math.floor(game / 2) % 2 === 0 ? "P1" : "P2");
      games.push(runMatch(p1Deck, p2Deck, firstPlayer, plan.baseSeed + sequence * 7919, plan));
      sequence += 1;
    }
  }
  const uniqueDeckIds = [...new Set(plan.matchups.flatMap((pair) => [pair.deckA, pair.deckB]))];
  const matchups = plan.matchups.map((pair) => summarizePair(pair.deckA, pair.deckB, games));
  const decks = uniqueDeckIds.map((deckId) => summarizeDeck(deckId, games));
  const completed = games.filter((g) => !g.timedOut && g.winner).length;
  const firstPlayerWins = games.filter((g) => g.winner && g.winner === g.firstPlayer).length;
  return {
    generatedAt: new Date().toISOString(),
    engineVersion: "3.8.0",
    note: "v7.31 fixed-matchup playtest harness. Seat swaps and opener alternation are deterministic; heuristic bot outcomes remain regression/outlier signals, not final balance truth.",
    config: { gamesPerMatchup: plan.gamesPerMatchup, baseSeed: plan.baseSeed, maxTurns: plan.maxTurns, maxSteps: plan.maxSteps },
    totals: {
      games: games.length,
      completedGames: completed,
      timeouts: games.filter((g) => g.timedOut).length,
      firstPlayerWins,
      firstPlayerWinRate: completed ? pct(firstPlayerWins / completed) : 0,
      averageTurns: round(games.reduce((sum, g) => sum + g.turnNumber, 0) / Math.max(1, games.length))
    },
    matchups,
    decks,
    games,
    analytics: buildBalanceAnalytics(games, matchups, uniqueDeckIds),
    cardStats: buildCardBalanceStats(games)
  };
}

export function runBalanceSeries(config: SimConfig): BalanceReport {
  const deckIds = Object.keys(alphaDeckPresets);
  const games: MatchTelemetry[] = [];
  let sequence = 0;
  for (let a = 0; a < deckIds.length; a += 1) {
    for (let b = a + 1; b < deckIds.length; b += 1) {
      for (let game = 0; game < config.gamesPerMatchup; game += 1) {
        const swapSeats = game % 2 === 1;
        const p1Deck = swapSeats ? deckIds[b] : deckIds[a];
        const p2Deck = swapSeats ? deckIds[a] : deckIds[b];
        const firstPlayer: PlayerId = ((game + a + b) % 2 === 0) ? "P1" : "P2";
        games.push(runMatch(p1Deck, p2Deck, firstPlayer, config.baseSeed + sequence * 7919, config));
        sequence += 1;
      }
    }
  }
  const matchups: MatchupSummary[] = [];
  for (let a = 0; a < deckIds.length; a += 1) for (let b = a + 1; b < deckIds.length; b += 1) matchups.push(summarizePair(deckIds[a], deckIds[b], games));
  const decks = deckIds.map((deckId) => summarizeDeck(deckId, games));
  const completed = games.filter((g) => !g.timedOut && g.winner).length;
  const firstPlayerWins = games.filter((g) => g.winner && g.winner === g.firstPlayer).length;
  return {
    generatedAt: new Date().toISOString(),
    engineVersion: "3.8.0",
    note: "Archetype-aware heuristic bot telemetry with behavior diagnostics for regression/outlier detection only. It is not a claim about optimal play or final balance.",
    config,
    totals: {
      games: games.length,
      completedGames: completed,
      timeouts: games.filter((g) => g.timedOut).length,
      firstPlayerWins,
      firstPlayerWinRate: completed ? pct(firstPlayerWins / completed) : 0,
      averageTurns: round(games.reduce((s, g) => s + g.turnNumber, 0) / Math.max(1, games.length))
    },
    matchups,
    decks,
    games,
    analytics: buildBalanceAnalytics(games, matchups, deckIds),
    cardStats: buildCardBalanceStats(games)
  };
}

function argNumber(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function argString(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function parseMatchupArg(raw: string | null): BalanceMatchupPair[] | null {
  if (!raw) return null;
  const pairs = raw.split(",").map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    const [deckA, deckB] = entry.split(":").map((part) => part.trim());
    if (!deckA || !deckB) throw new Error(`Invalid --matchups entry: ${entry}. Use deck-a:deck-b.`);
    return { deckA, deckB };
  });
  return pairs.length ? pairs : null;
}

function main(): void {
  const config: SimConfig = {
    gamesPerMatchup: argNumber("games", 6),
    baseSeed: argNumber("seed", 15001),
    maxTurns: argNumber("max-turns", 30),
    maxSteps: argNumber("max-steps", 1800)
  };
  const requestedMatchups = parseMatchupArg(argString("matchups"));
  const report = requestedMatchups
    ? runBalanceMatchupSet({ ...config, matchups: requestedMatchups, sideSwap: true, alternateFirstPlayer: true })
    : runBalanceSeries(config);
  mkdirSync("reports", { recursive: true });
  writeFileSync("reports/balance-v7.38.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Office Card Game v7.38 card + engine balance audit`);
  console.log(`${report.totals.games} games · ${report.totals.completedGames} completed · ${report.totals.timeouts} timeouts · avg ${report.totals.averageTurns} turns · first-player win ${report.totals.firstPlayerWinRate}%`);
  for (const m of report.matchups) {
    console.log(`${m.deckA} vs ${m.deckB}: ${m.deckAWins}-${m.deckBWins} (${m.deckAWinRate}% A) · timeout ${m.timeouts} · avg ${m.averageTurns} turns`);
  }
  console.log(`Deck overview:`);
  for (const deck of report.decks) console.log(`  ${deck.deckId}: ${deck.wins}-${deck.losses} · ${deck.winRate}% · timeout ${deck.timeouts} · avg ${deck.averageTurns} turns · actions ${deck.averageActionsResolved} · incidents ${deck.averageIncidentsActivated} · attacks ${deck.averageAttacksDeclared}`);
  console.log(`Detailed telemetry: reports/balance-v7.38.json`);
}

if (process.argv[1] && fileURLToPath(new URL(import.meta.url)) === process.argv[1]) main();
