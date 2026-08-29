import type { SnapshotPersistence } from "./storage.js";
export type MatchmakingStatus = "WAITING" | "MATCHED" | "CANCELLED";
export type MatchmakingMode = "FRIENDLY" | "RANKED";
export interface MatchmakingTicket<TPayload = unknown, TSession = unknown> {
    ticketId: string;
    profileId: string;
    mode: MatchmakingMode;
    status: MatchmakingStatus;
    payload: TPayload;
    createdAt: number;
    matchedTicketId: string | null;
    session: TSession | null;
}
export interface MatchmakingStoreSnapshot<TPayload = unknown, TSession = unknown> {
    version: 1;
    tickets: Array<MatchmakingTicket<TPayload, TSession>>;
}
export interface MatchmakingPersistence<TPayload = unknown, TSession = unknown> extends SnapshotPersistence<MatchmakingStoreSnapshot<TPayload, TSession>> {
}
export interface MatchmakingQueueOptions<TPayload = unknown, TSession = unknown> {
    ticketIdFactory?: () => string;
    nowFactory?: () => number;
    persistence?: MatchmakingPersistence<TPayload, TSession>;
    /** Return null for an incompatible candidate; lower scores are preferred. Defaults to FIFO within the same mode. */
    candidateScore?: (ticket: MatchmakingTicket<TPayload, TSession>, candidate: MatchmakingTicket<TPayload, TSession>, now: number) => number | null;
}
export declare class MatchmakingQueue<TPayload = unknown, TSession = unknown> {
    private readonly tickets;
    private readonly ticketIdFactory;
    private readonly nowFactory;
    private readonly persistence;
    private readonly candidateScore;
    constructor(options?: MatchmakingQueueOptions<TPayload, TSession>);
    get storageLabel(): string;
    enqueue(profileId: string, mode: MatchmakingMode, payload: TPayload): {
        ticket: MatchmakingTicket<TPayload, TSession>;
        opponent: MatchmakingTicket<TPayload, TSession> | null;
    };
    findOpponent(ticketId: string, profileId: string): MatchmakingTicket<TPayload, TSession> | null;
    markMatched(ticketId: string, opponentTicketId: string, session: TSession): MatchmakingTicket<TPayload, TSession>;
    markPairMatched(firstTicketId: string, firstSession: TSession, secondTicketId: string, secondSession: TSession): {
        first: MatchmakingTicket<TPayload, TSession>;
        second: MatchmakingTicket<TPayload, TSession>;
    };
    get(ticketId: string, profileId: string): MatchmakingTicket<TPayload, TSession>;
    cancel(ticketId: string, profileId: string): MatchmakingTicket<TPayload, TSession>;
    snapshot(): MatchmakingStoreSnapshot<TPayload, TSession>;
    private findCompatibleOpponent;
    private restore;
    private persist;
    private require;
}
