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

function executeIntentOnDraft(state: GameState, playerId: PlayerId, intent: MatchIntent): void {
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
    case "RESIGN":
      resign(state, playerId);
      return;
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
    error: { code: code as "STALE_STATE" | "RULES_ERROR" | "MATCH_MISMATCH" | "INTERNAL_ERROR", message },
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

export function executeMatchIntent(state: GameState, command: MatchIntentCommand): MatchCommandExecution {
  if (command.matchId !== state.matchId) return rejected(state, command, "MATCH_MISMATCH", "Intent belongs to a different match.");
  if (command.expectedStateVersion !== state.stateVersion) {
    return rejected(state, command, "STALE_STATE", `Expected stateVersion ${command.expectedStateVersion}, current version is ${state.stateVersion}.`);
  }

  const beforeEventSeq = state.eventSeq;
  const draft = structuredClone(state);
  try {
    executeIntentOnDraft(draft, command.playerId, command.intent);
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
}

export function executeHostedMatchIntent(
  state: GameState,
  command: MatchIntentCommand,
  options: HostedMatchIntentOptions = {}
): MatchCommandExecution {
  const beforeEventSeq = state.eventSeq;
  const execution = executeMatchIntent(state, command);
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
  if (hostedProgress === 0) return execution;
  execution.response.lastEventSeq = execution.state.eventSeq;
  execution.response.events = projectEventsSince(execution.state, command.playerId, beforeEventSeq);
  execution.response.view = projectStateForViewer(execution.state, command.playerId);
  return execution;
}
