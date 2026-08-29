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

export interface MatchmakingPersistence<TPayload = unknown, TSession = unknown> extends SnapshotPersistence<MatchmakingStoreSnapshot<TPayload, TSession>> {}

export interface MatchmakingQueueOptions<TPayload = unknown, TSession = unknown> {
  ticketIdFactory?: () => string;
  nowFactory?: () => number;
  persistence?: MatchmakingPersistence<TPayload, TSession>;
  /** Return null for an incompatible candidate; lower scores are preferred. Defaults to FIFO within the same mode. */
  candidateScore?: (ticket: MatchmakingTicket<TPayload, TSession>, candidate: MatchmakingTicket<TPayload, TSession>, now: number) => number | null;
}

export class MatchmakingQueue<TPayload = unknown, TSession = unknown> {
  private readonly tickets = new Map<string, MatchmakingTicket<TPayload, TSession>>();
  private readonly ticketIdFactory: () => string;
  private readonly nowFactory: () => number;
  private readonly persistence: MatchmakingPersistence<TPayload, TSession> | null;
  private readonly candidateScore: MatchmakingQueueOptions<TPayload, TSession>["candidateScore"];

  constructor(options: MatchmakingQueueOptions<TPayload, TSession> = {}) {
    this.ticketIdFactory = options.ticketIdFactory ?? (() => `queue-${Math.random().toString(36).slice(2, 10)}`);
    this.nowFactory = options.nowFactory ?? (() => Date.now());
    this.persistence = options.persistence ?? null;
    this.candidateScore = options.candidateScore;
    this.restore();
  }

  get storageLabel(): string {
    return this.persistence?.storageLabel ?? "MEMORY_ONLY";
  }

  enqueue(profileId: string, mode: MatchmakingMode, payload: TPayload): { ticket: MatchmakingTicket<TPayload, TSession>; opponent: MatchmakingTicket<TPayload, TSession> | null } {
    const existing = [...this.tickets.values()].find((ticket) => ticket.profileId === profileId && ticket.status === "WAITING");
    if (existing) return { ticket: structuredClone(existing), opponent: null };
    let ticketId = this.ticketIdFactory();
    while (this.tickets.has(ticketId)) ticketId = this.ticketIdFactory();
    const ticket: MatchmakingTicket<TPayload, TSession> = {
      ticketId,
      profileId,
      mode,
      status: "WAITING",
      payload: structuredClone(payload),
      createdAt: this.nowFactory(),
      matchedTicketId: null,
      session: null
    };
    const opponent = this.findCompatibleOpponent(ticket);
    this.tickets.set(ticketId, ticket);
    this.persist();
    return { ticket: structuredClone(ticket), opponent: opponent ? structuredClone(opponent) : null };
  }

  findOpponent(ticketId: string, profileId: string): MatchmakingTicket<TPayload, TSession> | null {
    const ticket = this.require(ticketId);
    if (ticket.profileId !== profileId) throw new Error("MATCHMAKING_TICKET_FORBIDDEN");
    if (ticket.status !== "WAITING") return null;
    const opponent = this.findCompatibleOpponent(ticket);
    return opponent ? structuredClone(opponent) : null;
  }

  markMatched(ticketId: string, opponentTicketId: string, session: TSession): MatchmakingTicket<TPayload, TSession> {
    const ticket = this.require(ticketId);
    ticket.status = "MATCHED";
    ticket.matchedTicketId = opponentTicketId;
    ticket.session = structuredClone(session);
    this.persist();
    return structuredClone(ticket);
  }

  markPairMatched(firstTicketId: string, firstSession: TSession, secondTicketId: string, secondSession: TSession): { first: MatchmakingTicket<TPayload, TSession>; second: MatchmakingTicket<TPayload, TSession> } {
    const first = this.require(firstTicketId);
    const second = this.require(secondTicketId);
    first.status = "MATCHED";
    first.matchedTicketId = second.ticketId;
    first.session = structuredClone(firstSession);
    second.status = "MATCHED";
    second.matchedTicketId = first.ticketId;
    second.session = structuredClone(secondSession);
    this.persist();
    return { first: structuredClone(first), second: structuredClone(second) };
  }

  get(ticketId: string, profileId: string): MatchmakingTicket<TPayload, TSession> {
    const ticket = this.require(ticketId);
    if (ticket.profileId !== profileId) throw new Error("MATCHMAKING_TICKET_FORBIDDEN");
    return structuredClone(ticket);
  }

  cancel(ticketId: string, profileId: string): MatchmakingTicket<TPayload, TSession> {
    const ticket = this.require(ticketId);
    if (ticket.profileId !== profileId) throw new Error("MATCHMAKING_TICKET_FORBIDDEN");
    if (ticket.status === "WAITING") ticket.status = "CANCELLED";
    this.persist();
    return structuredClone(ticket);
  }

  snapshot(): MatchmakingStoreSnapshot<TPayload, TSession> {
    return { version: 1, tickets: [...this.tickets.values()].map((ticket) => structuredClone(ticket)) };
  }

  private findCompatibleOpponent(ticket: MatchmakingTicket<TPayload, TSession>): MatchmakingTicket<TPayload, TSession> | null {
    const now = this.nowFactory();
    return [...this.tickets.values()]
      .filter((candidate) => candidate.status === "WAITING" && candidate.mode === ticket.mode && candidate.profileId !== ticket.profileId && candidate.ticketId !== ticket.ticketId)
      .map((candidate) => ({ candidate, score: this.candidateScore ? this.candidateScore(ticket, candidate, now) : 0 }))
      .filter((item): item is { candidate: MatchmakingTicket<TPayload, TSession>; score:number } => item.score != null && Number.isFinite(item.score))
      .sort((a, b) => a.score - b.score || a.candidate.createdAt - b.candidate.createdAt)[0]?.candidate ?? null;
  }

  private restore(): void {
    const snapshot = this.persistence?.load();
    if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.tickets)) return;
    for (const ticket of snapshot.tickets) {
      if (!ticket?.ticketId || !ticket.profileId || !["WAITING", "MATCHED", "CANCELLED"].includes(ticket.status)) continue;
      this.tickets.set(ticket.ticketId, structuredClone(ticket));
    }
  }

  private persist(): void {
    this.persistence?.save(this.snapshot());
  }

  private require(ticketId: string): MatchmakingTicket<TPayload, TSession> {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) throw new Error("MATCHMAKING_TICKET_NOT_FOUND");
    return ticket;
  }
}
