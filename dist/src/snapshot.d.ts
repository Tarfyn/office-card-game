import type { GameState, MatchSnapshot } from "./types.js";
export declare function createMatchSnapshot(state: GameState): MatchSnapshot;
export declare function serializeMatchSnapshot(state: GameState): string;
export declare function restoreMatchSnapshot(snapshot: MatchSnapshot | string): GameState;
