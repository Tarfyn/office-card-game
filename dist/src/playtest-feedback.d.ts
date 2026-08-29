import type { SnapshotPersistence } from "./storage.js";
export type PaceRating = "TOO_FAST" | "GOOD" | "TOO_LONG";
export type DecisionRating = "LOW" | "GOOD" | "HIGH";
export interface HumanPlaytestFeedback {
    roomId: string;
    playerId: string;
    sessionId?: string;
    pace: PaceRating | null;
    oneSided: boolean | null;
    decisions: DecisionRating | null;
    note: string;
    cardIds: string[];
    updatedAt: number;
}
interface FeedbackSnapshot {
    version: 1;
    entries: HumanPlaytestFeedback[];
}
export declare function normalizePlaytestFeedback(roomId: string, playerId: string, input: Partial<HumanPlaytestFeedback>, now?: number): HumanPlaytestFeedback;
export declare class PlaytestFeedbackStore {
    private persistence?;
    private entries;
    constructor(persistence?: SnapshotPersistence<FeedbackSnapshot> | undefined);
    private key;
    private save;
    get(roomId: string, playerId: string): HumanPlaytestFeedback | null;
    upsert(roomId: string, playerId: string, input: Partial<HumanPlaytestFeedback>, now?: number): HumanPlaytestFeedback;
    list(): HumanPlaytestFeedback[];
}
export {};
