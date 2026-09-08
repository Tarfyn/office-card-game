import type { SnapshotPersistence } from "./storage.js";
export type MatchmakingStatus = "WAITING" | "MATCHED" | "CANCELLED" | "INVALID" | "EXPIRED";
export type MatchmakingInvalidReason = "DECK_STALE" | "PROFILE_UNAVAILABLE";
export type MatchmakingExpiryReason = "QUEUE_LEASE_EXPIRED";
export type MatchmakingMode = "FRIENDLY" | "RANKED";

export interface MatchmakingTicket<TPayload = unknown, TSession = unknown> {
  ticketId: string;
  profileId: string;
  mode: MatchmakingMode;
  status: MatchmakingStatus;
  payload: TPayload;
  createdAt: number;
  /** Server-owned liveness lease. These fields are persisted for WAITING tickets. */
  lastActivityAt: number;
  leaseExpiresAt: number;
  matchedTicketId: string | null;
  session: TSession | null;
  invalidReason?: MatchmakingInvalidReason | null;
  expiredReason?: MatchmakingExpiryReason | null;
}

export interface MatchmakingStoreSnapshot<TPayload = unknown, TSession = unknown> {
  version: 1;
  tickets: Array<MatchmakingTicket<TPayload, TSession>>;
}

export interface MatchmakingPersistence<TPayload = unknown, TSession = unknown> extends SnapshotPersistence<MatchmakingStoreSnapshot<TPayload, TSession>> {}

export interface MatchmakingQueueOptions<TPayload = unknown, TSession = unknown> {
  ticketIdFactory?: () => string;
  nowFactory?: () => number;
  leaseDurationMs?: number;
  /** Renew only when the remaining lease is at or below this fraction of its duration. */
  leaseRenewalThreshold?: number;
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
  private readonly leaseDurationMs: number;
  private readonly leaseRenewalThreshold: number;

  constructor(options: MatchmakingQueueOptions<TPayload, TSession> = {}) {
    this.ticketIdFactory = options.ticketIdFactory ?? (() => `queue-${Math.random().toString(36).slice(2, 10)}`);
    this.nowFactory = options.nowFactory ?? (() => Date.now());
    this.persistence = options.persistence ?? null;
    this.candidateScore = options.candidateScore;
    const configuredLease = Number(options.leaseDurationMs ?? 300_000);
    this.leaseDurationMs = Number.isFinite(configuredLease) && configuredLease > 0 ? configuredLease : 300_000;
    const configuredThreshold = Number(options.leaseRenewalThreshold ?? 0.5);
    this.leaseRenewalThreshold = Number.isFinite(configuredThreshold) && configuredThreshold > 0 && configuredThreshold <= 1 ? configuredThreshold : 0.5;
    this.restore();
  }

  get storageLabel(): string {
    return this.persistence?.storageLabel ?? "MEMORY_ONLY";
  }

  enqueue(profileId: string, mode: MatchmakingMode, payload: TPayload): { ticket: MatchmakingTicket<TPayload, TSession>; opponent: MatchmakingTicket<TPayload, TSession> | null } {
    this.reconcileExpired();
    const existing = [...this.tickets.values()].find((ticket) => ticket.profileId === profileId && ticket.status === "WAITING");
    if (existing) return { ticket: structuredClone(existing), opponent: null };
    let ticketId = this.ticketIdFactory();
    while (this.tickets.has(ticketId)) ticketId = this.ticketIdFactory();
    const now = this.nowFactory();
    const ticket: MatchmakingTicket<TPayload, TSession> = {
      ticketId,
      profileId,
      mode,
      status: "WAITING",
      payload: structuredClone(payload),
      createdAt: now,
      lastActivityAt: now,
      leaseExpiresAt: now + this.leaseDurationMs,
      matchedTicketId: null,
      session: null,
      invalidReason: null
    };
    const opponent = this.findCompatibleOpponent(ticket);
    this.tickets.set(ticketId, ticket);
    this.persist();
    return { ticket: structuredClone(ticket), opponent: opponent ? structuredClone(opponent) : null };
  }

  findOpponent(ticketId: string, profileId: string): MatchmakingTicket<TPayload, TSession> | null {
    const ticket = this.require(ticketId);
    if (ticket.profileId !== profileId) throw new Error("MATCHMAKING_TICKET_FORBIDDEN");
    this.expireIfNeeded(ticket);
    if (ticket.status !== "WAITING") return null;
    const opponent = this.findCompatibleOpponent(ticket);
    return opponent ? structuredClone(opponent) : null;
  }

  markMatched(ticketId: string, opponentTicketId: string, session: TSession): MatchmakingTicket<TPayload, TSession> {
    const ticket = this.require(ticketId);
    this.expireIfNeeded(ticket);
    if (ticket.status !== "WAITING") throw new Error("MATCHMAKING_TICKET_NOT_LIVE");
    ticket.status = "MATCHED";
    ticket.matchedTicketId = opponentTicketId;
    ticket.session = structuredClone(session);
    this.persist();
    return structuredClone(ticket);
  }

  markPairMatched(firstTicketId: string, firstSession: TSession, secondTicketId: string, secondSession: TSession): { first: MatchmakingTicket<TPayload, TSession>; second: MatchmakingTicket<TPayload, TSession> } {
    const first = this.require(firstTicketId);
    const second = this.require(secondTicketId);
    this.expireIfNeeded(first);
    this.expireIfNeeded(second);
    if (first.status !== "WAITING" || second.status !== "WAITING") throw new Error("MATCHMAKING_TICKET_NOT_LIVE");
    first.status = "MATCHED";
    first.matchedTicketId = second.ticketId;
    first.session = structuredClone(firstSession);
    second.status = "MATCHED";
    second.matchedTicketId = first.ticketId;
    second.session = structuredClone(secondSession);
    this.persist();
    return { first: structuredClone(first), second: structuredClone(second) };
  }

  markInvalid(ticketId: string, reason: MatchmakingInvalidReason = "DECK_STALE"): MatchmakingTicket<TPayload, TSession> {
    const ticket = this.require(ticketId);
    if (ticket.status === "WAITING") {
      ticket.status = "INVALID";
      ticket.invalidReason = reason;
      ticket.matchedTicketId = null;
      ticket.session = null;
      this.persist();
    }
    return structuredClone(ticket);
  }

  get(ticketId: string, profileId: string): MatchmakingTicket<TPayload, TSession> {
    const ticket = this.require(ticketId);
    if (ticket.profileId !== profileId) throw new Error("MATCHMAKING_TICKET_FORBIDDEN");
    this.expireIfNeeded(ticket);
    return structuredClone(ticket);
  }

  /** Owner-only heartbeat. Expiry is checked before renewal, so an expired ticket cannot revive. */
  touch(ticketId: string, profileId: string): MatchmakingTicket<TPayload, TSession> {
    const ticket = this.require(ticketId);
    if (ticket.profileId !== profileId) throw new Error("MATCHMAKING_TICKET_FORBIDDEN");
    if (this.expireIfNeeded(ticket)) return structuredClone(ticket);
    if (ticket.status === "WAITING") {
      const now = this.nowFactory();
      if (ticket.leaseExpiresAt - now <= this.leaseDurationMs * this.leaseRenewalThreshold) {
        ticket.lastActivityAt = now;
        ticket.leaseExpiresAt = now + this.leaseDurationMs;
        this.persist();
      }
    }
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
    this.reconcileExpired(now);
    return [...this.tickets.values()]
      .filter((candidate) => candidate.status === "WAITING" && candidate.mode === ticket.mode && candidate.profileId !== ticket.profileId && candidate.ticketId !== ticket.ticketId)
      .map((candidate) => ({ candidate, score: this.candidateScore ? this.candidateScore(ticket, candidate, now) : 0 }))
      .filter((item): item is { candidate: MatchmakingTicket<TPayload, TSession>; score:number } => item.score != null && Number.isFinite(item.score))
      .sort((a, b) => a.score - b.score || a.candidate.createdAt - b.candidate.createdAt)[0]?.candidate ?? null;
  }

  private restore(): void {
    const snapshot = this.persistence?.load();
    if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.tickets)) return;
    let changed = false;
    for (const ticket of snapshot.tickets) {
      if (!ticket?.ticketId || !ticket.profileId || !["WAITING", "MATCHED", "CANCELLED", "INVALID", "EXPIRED"].includes(ticket.status)) continue;
      const restored = structuredClone(ticket) as MatchmakingTicket<TPayload, TSession>;
      if (restored.status === "WAITING") {
        const activity = Number(restored.lastActivityAt ?? (restored as MatchmakingTicket<TPayload, TSession> & { updatedAt?: number }).updatedAt ?? restored.createdAt);
        if (!Number.isFinite(activity)) {
          restored.status = "EXPIRED";
          restored.expiredReason = "QUEUE_LEASE_EXPIRED";
          restored.leaseExpiresAt = 0;
          changed = true;
        } else {
          const expiry = Number(restored.leaseExpiresAt);
          if (!Number.isFinite(expiry) || expiry <= activity) {
            restored.lastActivityAt = activity;
            restored.leaseExpiresAt = activity + this.leaseDurationMs;
            changed = true;
          }
          if (this.nowFactory() >= restored.leaseExpiresAt) {
            restored.status = "EXPIRED";
            restored.expiredReason = "QUEUE_LEASE_EXPIRED";
            changed = true;
          }
        }
      }
      this.tickets.set(restored.ticketId, restored);
    }
    if (changed) this.persist();
  }

  private reconcileExpired(now = this.nowFactory()): void {
    let changed = false;
    for (const ticket of this.tickets.values()) changed = this.expireIfNeeded(ticket, now, false) || changed;
    if (changed) this.persist();
  }

  private expireIfNeeded(ticket: MatchmakingTicket<TPayload, TSession>, now = this.nowFactory(), persist = true): boolean {
    if (ticket.status !== "WAITING" || now < ticket.leaseExpiresAt) return false;
    ticket.status = "EXPIRED";
    ticket.expiredReason = "QUEUE_LEASE_EXPIRED";
    ticket.invalidReason = null;
    ticket.matchedTicketId = null;
    ticket.session = null;
    if (persist) this.persist();
    return true;
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
