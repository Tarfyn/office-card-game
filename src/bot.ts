import { nextBotIntent } from "./balance.js";
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
