import { nextBotIntent } from "./balance.js";
import { getLegalActions } from "./engine.js";
import type { GameState, MatchIntent, PlayerId } from "./types.js";

export interface BotDecision { playerId: PlayerId; intent: MatchIntent; }

export function chooseAuthoritativeBotIntent(state: GameState, botId: PlayerId = "P2"): BotDecision | null {
  const projected = structuredClone(state);
  const opponent: PlayerId = botId === "P1" ? "P2" : "P1";
  projected.players[opponent].hand = [];
  projected.players[opponent].deck = [];
  const decision = nextBotIntent(projected);
  return decision?.playerId === botId ? decision : null;
}

/** The Tutorial coach uses a deliberately small deterministic policy. It still
 * submits ordinary engine intents, but avoids the full Training heuristic
 * derailing the lesson with advanced plays or an early resignation. */
export function chooseTutorialCoachIntent(state: GameState): BotDecision | null {
  if (state.status === "ENDED") return null;
  if (state.responseWindow) {
    return state.priorityPlayerId === "P2" ? { playerId:"P2", intent:{ type:"PASS_PRIORITY" } } : null;
  }
  const legal = getLegalActions(state, "P2");
  const responseWasActivated = state.eventLog.some((event) => event.type === "INCIDENT_ACTIVATED" && event.playerId === "P1");
  if (responseWasActivated && !state.responseWindow) return { playerId:"P2", intent:{ type:"RESIGN" } };
  if (state.phase === "MULLIGAN" && legal.canMulligan) return { playerId:"P2", intent:{ type:"MULLIGAN", returnIds:[] } };
  if (state.activePlayerId !== "P2") return null;
  if (legal.canResolveChoice || legal.canResolveDeckSelection || legal.canResolveTriggerTargetSelection || legal.canResolveHandSelection) {
    return chooseAuthoritativeBotIntent(state, "P2");
  }
  if (state.phase === "MAIN") {
    // The coach presents one deliberate combat target in the tutorial. Keep
    // the remaining capacity available instead of filling the board.
    if (state.players.P2.employeeField.some(Boolean)) {
      return { playerId:"P2", intent:{ type:"ADVANCE_PHASE" } };
    }
    // Leave a clean board for the player to rebuild the direct-attack lesson
    // after the equal-power combat demonstration.
    if (state.turnNumber === 5 && !state.players.P1.employeeField.some(Boolean)) {
      return { playerId:"P2", intent:{ type:"ADVANCE_PHASE" } };
    }
    const playerDirectAttack = state.eventLog.some((event) => event.type === "ATTACK_DECLARED" && event.playerId === "P1" && event.data?.targetId == null);
    if (!state.players.P2.employeeField.some(Boolean) && state.players.P1.employeeField.some(Boolean) && !playerDirectAttack) {
      return legal.canAdvancePhase ? { playerId:"P2", intent:{ type:"ADVANCE_PHASE" } } : null;
    }
    const employee = legal.playableEmployees[0];
    if (employee) {
      const option = employee.options[0];
      return { playerId:"P2", intent:{ type:"PLAY_EMPLOYEE", cardId:employee.cardId, slot:option.slot, promotionMaterialIds:option.promotionMaterialIds } };
    }
    const system = legal.playableSystems[0];
    if (system) return { playerId:"P2", intent:{ type:"PLAY_SYSTEM", cardId:system.cardId, slot:system.slots[0] } };
  }
  if (state.phase === "BATTLE") {
    const playerHasIncident = state.players.P1.supportField.some((instanceId) => {
      const definitionId = instanceId ? state.cards[instanceId]?.definitionId : null;
      return definitionId === "CS-010";
    });
    const coachAttack = legal.attacks[0];
    if (state.turnNumber >= 5 && playerHasIncident && coachAttack?.targetIds?.some((targetId) => targetId !== null)) {
      return { playerId:"P2", intent:{ type:"DECLARE_ATTACK", attackerId:coachAttack.attackerId, targetId:coachAttack.targetIds.find((targetId) => targetId !== null) ?? null } };
    }
    // Leave the deterministic attack lesson to the player. The coach still
    // uses the real phase transition, but must not remove the teaching target.
    if (legal.canAdvancePhase) return { playerId:"P2", intent:{ type:"ADVANCE_PHASE" } };
  }
  if (legal.canAdvancePhase) return { playerId:"P2", intent:{ type:"ADVANCE_PHASE" } };
  if (legal.canPassPriority) return { playerId:"P2", intent:{ type:"PASS_PRIORITY" } };
  return null;
}
