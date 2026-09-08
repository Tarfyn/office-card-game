import { RulesError } from "./errors.js";
import {
  activateAbilityInteractive,
  activateResponse,
  advancePhase,
  archiveCardsFromHand,
  declareAttackInteractive,
  getLegalActions,
  mulligan,
  passPriority,
  playActionInteractive,
  playEmployee,
  playSystem,
  resign,
  resolveChoice,
  resolveDeckSelection,
  resolveTriggerTargetSelection,
  resolveHandSelection,
  completeTutorial,
  setIncident
} from "./engine.js";
import { projectEventsSince, projectStateForViewer } from "./projection.js";
import type {
  GameState,
  MatchCommandExecution,
  MatchCommandResponse,
  MatchIntent,
  MatchIntentCommand,
  PlayerId
} from "./types.js";

const HAND_LIMIT = 8;

export interface IntentValidationFailure { code: "INVALID_INTENT"; message: string; detail?: string; }
export type IntentValidationResult = { ok:true; intent: MatchIntent } | { ok:false; error:IntentValidationFailure };

const hasOwn = (value:object, key:string):boolean => Object.prototype.hasOwnProperty.call(value, key);
/** Protocol records are decoded-JSON objects only. Class instances and other
 * host objects (Map, Set, Date, etc.) must never cross the authority boundary. */
const isPlainRecord = (value:unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.getPrototypeOf(value) === Object.prototype;
};
const isNonEmptyString = (value:unknown): value is string => typeof value === "string" && value.length > 0;
const isIntegerInRange = (value:unknown, min:number, max:number): value is number => typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= min && value <= max;
const isStringArray = (value:unknown): value is string[] => {
  if (!Array.isArray(value)) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (!hasOwn(value, String(index)) || !isNonEmptyString(value[index])) return false;
  }
  return true;
};
const unsafeRecordKeys = new Set(["__proto__", "prototype", "constructor"]);
const reconstructTargetMap = (value:unknown): Record<string, string[]> | null => {
  if (!isPlainRecord(value)) return null;
  if (Object.getOwnPropertySymbols(value).some((symbol) => Object.prototype.propertyIsEnumerable.call(value, symbol))) return null;
  const result: Record<string, string[]> = {};
  for (const key of Object.keys(value)) {
    if (!isNonEmptyString(key) || unsafeRecordKeys.has(key) || !isStringArray(value[key])) return null;
    Object.defineProperty(result, key, { value:[...(value[key] as string[])], enumerable:true, writable:true, configurable:true });
  }
  return result;
};
const isTargetMap = (value:unknown): value is Record<string, string[]> => reconstructTargetMap(value) !== null;

function invalid(detail:string): IntentValidationResult { return { ok:false, error:{ code:"INVALID_INTENT", message:"Intent payload is malformed.", detail } }; }

/**
 * Runtime boundary for untrusted JSON and internal callers. This validates
 * protocol shape only; card existence, phase, capacity, targets and other
 * gameplay legality remain authoritative engine checks.
 * Unknown extra properties are ignored deliberately for compatibility, while
 * all known fields are strict and never coerced.
 */
export function validateMatchIntent(input: unknown): IntentValidationResult {
  if (!isPlainRecord(input)) return invalid("intent must be a plain object");
  const type = input.type;
  if (!hasOwn(input, "type") || !isNonEmptyString(type)) return invalid("intent.type must be a non-empty string");
  switch (type) {
    case "MULLIGAN":
      return isStringArray(input.returnIds) ? { ok:true, intent:{ type, returnIds:[...input.returnIds] } } : invalid("returnIds must be an array of non-empty strings");
    case "ADVANCE_PHASE":
      return { ok:true, intent:{ type } };
    case "ARCHIVE_EXCESS_HAND":
      return isStringArray(input.cardIds) ? { ok:true, intent:{ type, cardIds:[...input.cardIds] } } : invalid("cardIds must be an array of non-empty strings");
    case "PLAY_EMPLOYEE":
      if (!isNonEmptyString(input.cardId)) return invalid("cardId must be a non-empty string");
      if (!isIntegerInRange(input.slot, 0, 4)) return invalid("slot must be an integer from 0 through 4");
      if (hasOwn(input, "promotionMaterialIds") && !isStringArray(input.promotionMaterialIds)) return invalid("promotionMaterialIds must be an array of non-empty strings");
      return { ok:true, intent:{ type, cardId:input.cardId, slot:input.slot, ...(hasOwn(input, "promotionMaterialIds") ? { promotionMaterialIds:[...(input.promotionMaterialIds as string[])] } : {}) } };
    case "PLAY_SYSTEM":
    case "SET_INCIDENT":
      if (!isNonEmptyString(input.cardId)) return invalid("cardId must be a non-empty string");
      if (!isIntegerInRange(input.slot, 0, 3)) return invalid("slot must be an integer from 0 through 3");
      return { ok:true, intent:{ type, cardId:input.cardId, slot:input.slot } };
    case "PLAY_ACTION":
      if (!isNonEmptyString(input.cardId)) return invalid("cardId must be a non-empty string");
      if (hasOwn(input, "targets") && !isTargetMap(input.targets)) return invalid("targets must map strings to string arrays");
      return { ok:true, intent:{ type, cardId:input.cardId, ...(hasOwn(input, "targets") ? { targets:reconstructTargetMap(input.targets)! } : {}) } };
    case "ACTIVATE_ABILITY":
    case "ACTIVATE_RESPONSE":
      if (!isNonEmptyString(input.sourceId) || !isNonEmptyString(input.abilityId)) return invalid("sourceId and abilityId must be non-empty strings");
      if (hasOwn(input, "targets") && !isTargetMap(input.targets)) return invalid("targets must map strings to string arrays");
      return { ok:true, intent:{ type, sourceId:input.sourceId, abilityId:input.abilityId, ...(hasOwn(input, "targets") ? { targets:reconstructTargetMap(input.targets)! } : {}) } };
    case "DECLARE_ATTACK":
      if (!isNonEmptyString(input.attackerId)) return invalid("attackerId must be a non-empty string");
      if (!(input.targetId === null || isNonEmptyString(input.targetId))) return invalid("targetId must be null or a non-empty string");
      return { ok:true, intent:{ type, attackerId:input.attackerId, targetId:input.targetId as string|null } };
    case "PASS_PRIORITY":
      return { ok:true, intent:{ type } };
    case "RESOLVE_CHOICE":
      return isNonEmptyString(input.choiceId) && isNonEmptyString(input.optionId)
        ? { ok:true, intent:{ type, choiceId:input.choiceId, optionId:input.optionId } }
        : invalid("choiceId and optionId must be non-empty strings");
    case "RESOLVE_DECK_SELECTION":
      if (!isNonEmptyString(input.selectionId) || !isStringArray(input.selectedIds)) return invalid("selectionId and selectedIds are required");
      if (hasOwn(input, "orderedUnselectedIds") && !isStringArray(input.orderedUnselectedIds)) return invalid("orderedUnselectedIds must be an array of non-empty strings");
      return { ok:true, intent:{ type, selectionId:input.selectionId, selectedIds:[...input.selectedIds], ...(hasOwn(input, "orderedUnselectedIds") ? { orderedUnselectedIds:[...(input.orderedUnselectedIds as string[])] } : {}) } };
    case "RESOLVE_TRIGGER_TARGET_SELECTION":
      return isNonEmptyString(input.selectionId) && isTargetMap(input.targets)
        ? { ok:true, intent:{ type, selectionId:input.selectionId, targets:reconstructTargetMap(input.targets)! } }
        : invalid("selectionId and targets are required");
    case "RESOLVE_HAND_SELECTION":
      return isNonEmptyString(input.selectionId) && isStringArray(input.selectedIds)
        ? { ok:true, intent:{ type, selectionId:input.selectionId, selectedIds:[...input.selectedIds] } }
        : invalid("selectionId and selectedIds are required");
    case "COMPLETE_TUTORIAL":
      return { ok:true, intent:{ type } };
    case "RESIGN":
      return { ok:true, intent:{ type } };
    default:
      return invalid("unknown intent type");
  }
}

function resolveClientCardRef(state: GameState, playerId: PlayerId, ref: string): string {
  if (state.cards[ref]) return ref;
  const match = /^hidden-support:(P1|P2):(-?\d+):(\d+)$/.exec(ref);
  if (!match) throw new RulesError("Unknown or expired card reference.");
  const controllerId = match[1] as PlayerId;
  const slot = Number(match[2]);
  const objectVersion = Number(match[3]);
  if (controllerId === playerId) throw new RulesError("Own cards must use their visible card reference.");
  const instanceId = state.players[controllerId].supportField[slot];
  if (!instanceId) throw new RulesError("Hidden support reference no longer points to a card.");
  const card = state.cards[instanceId];
  if (card.faceUp || card.objectVersion !== objectVersion) throw new RulesError("Hidden support reference is stale.");
  return instanceId;
}

function resolveTargetRefs(state: GameState, playerId: PlayerId, targets: Record<string, string[]> | undefined): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [key, ids] of Object.entries(targets ?? {})) result[key] = ids.map((id) => resolveClientCardRef(state, playerId, id));
  return result;
}

interface ExecuteIntentOptions { allowTutorialCompletion?: boolean; }

function executeIntentOnDraft(state: GameState, playerId: PlayerId, intent: MatchIntent, options: ExecuteIntentOptions = {}): void {
  switch (intent.type) {
    case "MULLIGAN":
      mulligan(state, playerId, intent.returnIds);
      return;
    case "ADVANCE_PHASE":
      advancePhase(state, playerId);
      return;
    case "ARCHIVE_EXCESS_HAND": {
      const required = Math.max(0, state.players[playerId].hand.length - HAND_LIMIT);
      const unique = [...new Set(intent.cardIds)];
      if (required <= 0) throw new RulesError("Hand is not above the limit.");
      if (unique.length !== required) throw new RulesError(`Archive exactly ${required} card(s) to reach the hand limit.`);
      archiveCardsFromHand(state, playerId, unique);
      return;
    }
    case "PLAY_EMPLOYEE":
      playEmployee(state, playerId, intent.cardId, intent.slot, intent.promotionMaterialIds ?? []);
      return;
    case "PLAY_SYSTEM":
      playSystem(state, playerId, intent.cardId, intent.slot);
      return;
    case "SET_INCIDENT":
      setIncident(state, playerId, intent.cardId, intent.slot);
      return;
    case "PLAY_ACTION":
      playActionInteractive(state, playerId, intent.cardId, resolveTargetRefs(state, playerId, intent.targets));
      return;
    case "ACTIVATE_ABILITY":
      activateAbilityInteractive(state, playerId, intent.sourceId, intent.abilityId, resolveTargetRefs(state, playerId, intent.targets));
      return;
    case "ACTIVATE_RESPONSE":
      activateResponse(state, playerId, intent.sourceId, intent.abilityId, resolveTargetRefs(state, playerId, intent.targets));
      return;
    case "DECLARE_ATTACK":
      declareAttackInteractive(state, playerId, intent.attackerId, intent.targetId === null ? null : resolveClientCardRef(state, playerId, intent.targetId));
      return;
    case "PASS_PRIORITY":
      passPriority(state, playerId);
      return;
    case "RESOLVE_CHOICE":
      resolveChoice(state, playerId, intent.choiceId, intent.optionId);
      return;
    case "RESOLVE_DECK_SELECTION":
      resolveDeckSelection(state, playerId, intent.selectionId, intent.selectedIds, intent.orderedUnselectedIds);
      return;
    case "RESOLVE_TRIGGER_TARGET_SELECTION":
      resolveTriggerTargetSelection(state, playerId, intent.selectionId, resolveTargetRefs(state, playerId, intent.targets));
      return;
    case "RESOLVE_HAND_SELECTION":
      resolveHandSelection(state, playerId, intent.selectionId, intent.selectedIds);
      return;
    case "COMPLETE_TUTORIAL":
      if (!options.allowTutorialCompletion) throw new RulesError("Tutorial completion is only available in Tutorial mode.");
      completeTutorial(state, playerId);
      return;
    case "RESIGN":
      resign(state, playerId);
      return;
    default: {
      const unreachable: never = intent;
      return unreachable;
    }
  }
}

function rejected(
  state: GameState,
  command: MatchIntentCommand,
  code: MatchCommandResponse["error"] extends infer E ? E extends { code: infer C } ? C : never : never,
  message: string
): MatchCommandExecution {
  const response: MatchCommandResponse = {
    intentId: command.intentId,
    accepted: false,
    stateVersion: state.stateVersion,
    lastEventSeq: state.eventSeq,
    error: { code: code as "INVALID_INTENT" | "STALE_STATE" | "RULES_ERROR" | "MATCH_MISMATCH" | "INTERNAL_ERROR", message },
    events: [],
    view: projectStateForViewer(state, command.playerId)
  };
  return { state, response };
}

function autoPassUnavailablePriority(state: GameState): number {
  let passed = 0;
  while (state.status === "ACTIVE" && state.responseWindow && state.priorityPlayerId && passed < 16) {
    const priorityPlayerId = state.priorityPlayerId;
    const legal = getLegalActions(state, priorityPlayerId);
    if (!legal.canPassPriority || legal.responseOptions.length > 0) break;
    passPriority(state, priorityPlayerId);
    passed += 1;
  }
  return passed;
}

function hasUnresolvedInteraction(state: GameState): boolean {
  return Boolean(
    state.responseWindow ||
    state.priorityPlayerId ||
    state.pendingChoice ||
    state.pendingDeckSelection ||
    state.pendingTriggerTargetSelection ||
    state.pendingHandSelection ||
    state.pendingAttack ||
    state.pendingBattleResolution ||
    state.pendingTriggers.length ||
    state.resolvingTriggerEvent ||
    state.chain.length
  );
}

/**
 * Advance only boundary phases that have no authoritative interaction left.
 * Main and Battle deliberately remain explicit player-controlled phases.
 */
export function autoAdvanceSafePhases(state: GameState): number {
  let advanced = 0;
  while (state.status === "ACTIVE" && advanced < 16) {
    if (state.phase !== "START" && state.phase !== "DRAW" && state.phase !== "END") break;
    if (hasUnresolvedInteraction(state)) break;
    if (state.phase === "END" && state.players[state.activePlayerId].hand.length > HAND_LIMIT) break;
    advancePhase(state, state.activePlayerId);
    advanced += 1;
    if (autoPassUnavailablePriority(state) > 0) continue;
    if (hasUnresolvedInteraction(state)) break;
  }
  return advanced;
}

export function executeMatchIntent(state: GameState, command: MatchIntentCommand, options: ExecuteIntentOptions = {}): MatchCommandExecution {
  const validation = validateMatchIntent(command.intent);
  if (!validation.ok) return rejected(state, command, "INVALID_INTENT", validation.error.message);
  if (command.matchId !== state.matchId) return rejected(state, command, "MATCH_MISMATCH", "Intent belongs to a different match.");
  if (command.expectedStateVersion !== state.stateVersion) {
    return rejected(state, command, "STALE_STATE", `Expected stateVersion ${command.expectedStateVersion}, current version is ${state.stateVersion}.`);
  }

  const beforeEventSeq = state.eventSeq;
  const draft = structuredClone(state);
  try {
    executeIntentOnDraft(draft, command.playerId, validation.intent, options);
    draft.stateVersion = state.stateVersion + 1;
    return {
      state: draft,
      response: {
        intentId: command.intentId,
        accepted: true,
        stateVersion: draft.stateVersion,
        lastEventSeq: draft.eventSeq,
        events: projectEventsSince(draft, command.playerId, beforeEventSeq),
        view: projectStateForViewer(draft, command.playerId)
      }
    };
  } catch (error) {
    if (error instanceof RulesError) return rejected(state, command, "RULES_ERROR", error.message);
    const message = error instanceof Error ? error.message : "Unknown internal error.";
    return rejected(state, command, "INTERNAL_ERROR", message);
  }
}

/**
 * Room/server execution path. The core engine keeps explicit priority semantics,
 * while hosted play skips response windows that have no legal response at all.
 */
export interface HostedMatchIntentOptions {
  autoAdvancePhases?: boolean;
  autoAdvanceTutorialPhases?: boolean;
  allowTutorialCompletion?: boolean;
}

export function executeHostedMatchIntent(
  state: GameState,
  command: MatchIntentCommand,
  options: HostedMatchIntentOptions = {}
): MatchCommandExecution {
  const beforeEventSeq = state.eventSeq;
  const execution = executeMatchIntent(state, command, { allowTutorialCompletion: options.allowTutorialCompletion });
  if (!execution.response.accepted) return execution;
  let hostedProgress = autoPassUnavailablePriority(execution.state);
  if (options.autoAdvancePhases !== false) {
    for (let cycle = 0; cycle < 16; cycle += 1) {
      const phaseCount = autoAdvanceSafePhases(execution.state);
      hostedProgress += phaseCount;
      const passCount = autoPassUnavailablePriority(execution.state);
      hostedProgress += passCount;
      if (phaseCount === 0 && passCount === 0) break;
    }
  }
  if (options.autoAdvanceTutorialPhases && execution.state.status === "ACTIVE") {
    for (let cycle = 0; cycle < 8; cycle += 1) {
      if (execution.state.phase !== "START" && execution.state.phase !== "DRAW") break;
      if (hasUnresolvedInteraction(execution.state)) break;
      advancePhase(execution.state, execution.state.activePlayerId);
      hostedProgress += 1;
      autoPassUnavailablePriority(execution.state);
    }
  }
  if (hostedProgress === 0) return execution;
  execution.response.lastEventSeq = execution.state.eventSeq;
  execution.response.events = projectEventsSince(execution.state, command.playerId, beforeEventSeq);
  execution.response.view = projectStateForViewer(execution.state, command.playerId);
  return execution;
}
