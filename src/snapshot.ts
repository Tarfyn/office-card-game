import { RulesError } from "./errors.js";
import type { GameState, MatchSnapshot } from "./types.js";

export function createMatchSnapshot(state: GameState): MatchSnapshot {
  return {
    schemaVersion: 1,
    state: structuredClone(state)
  };
}

export function serializeMatchSnapshot(state: GameState): string {
  return JSON.stringify(createMatchSnapshot(state));
}

export function restoreMatchSnapshot(snapshot: MatchSnapshot | string): GameState {
  let parsed: MatchSnapshot;
  try {
    parsed = typeof snapshot === "string" ? JSON.parse(snapshot) as MatchSnapshot : structuredClone(snapshot);
  } catch {
    throw new RulesError("Invalid match snapshot JSON.");
  }
  if (!parsed || parsed.schemaVersion !== 1 || !parsed.state) throw new RulesError("Unsupported or invalid match snapshot.");
  if (typeof parsed.state.matchId !== "string" || typeof parsed.state.stateVersion !== "number") throw new RulesError("Match snapshot is missing required state metadata.");
  return structuredClone(parsed.state);
}
