import type { ClientEvent, ClientGameState, GameState, PlayerId } from "./types.js";
export declare function clientCardRef(state: GameState, viewerId: PlayerId, instanceId: string): string | null;
export declare function projectStateForViewer(state: GameState, viewerId: PlayerId): ClientGameState;
export declare function projectEventsSince(state: GameState, viewerId: PlayerId, afterSeq?: number): ClientEvent[];
