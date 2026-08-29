export class MatchmakingQueue {
    tickets = new Map();
    ticketIdFactory;
    nowFactory;
    persistence;
    candidateScore;
    constructor(options = {}) {
        this.ticketIdFactory = options.ticketIdFactory ?? (() => `queue-${Math.random().toString(36).slice(2, 10)}`);
        this.nowFactory = options.nowFactory ?? (() => Date.now());
        this.persistence = options.persistence ?? null;
        this.candidateScore = options.candidateScore;
        this.restore();
    }
    get storageLabel() {
        return this.persistence?.storageLabel ?? "MEMORY_ONLY";
    }
    enqueue(profileId, mode, payload) {
        const existing = [...this.tickets.values()].find((ticket) => ticket.profileId === profileId && ticket.status === "WAITING");
        if (existing)
            return { ticket: structuredClone(existing), opponent: null };
        let ticketId = this.ticketIdFactory();
        while (this.tickets.has(ticketId))
            ticketId = this.ticketIdFactory();
        const ticket = {
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
    findOpponent(ticketId, profileId) {
        const ticket = this.require(ticketId);
        if (ticket.profileId !== profileId)
            throw new Error("MATCHMAKING_TICKET_FORBIDDEN");
        if (ticket.status !== "WAITING")
            return null;
        const opponent = this.findCompatibleOpponent(ticket);
        return opponent ? structuredClone(opponent) : null;
    }
    markMatched(ticketId, opponentTicketId, session) {
        const ticket = this.require(ticketId);
        ticket.status = "MATCHED";
        ticket.matchedTicketId = opponentTicketId;
        ticket.session = structuredClone(session);
        this.persist();
        return structuredClone(ticket);
    }
    markPairMatched(firstTicketId, firstSession, secondTicketId, secondSession) {
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
    get(ticketId, profileId) {
        const ticket = this.require(ticketId);
        if (ticket.profileId !== profileId)
            throw new Error("MATCHMAKING_TICKET_FORBIDDEN");
        return structuredClone(ticket);
    }
    cancel(ticketId, profileId) {
        const ticket = this.require(ticketId);
        if (ticket.profileId !== profileId)
            throw new Error("MATCHMAKING_TICKET_FORBIDDEN");
        if (ticket.status === "WAITING")
            ticket.status = "CANCELLED";
        this.persist();
        return structuredClone(ticket);
    }
    snapshot() {
        return { version: 1, tickets: [...this.tickets.values()].map((ticket) => structuredClone(ticket)) };
    }
    findCompatibleOpponent(ticket) {
        const now = this.nowFactory();
        return [...this.tickets.values()]
            .filter((candidate) => candidate.status === "WAITING" && candidate.mode === ticket.mode && candidate.profileId !== ticket.profileId && candidate.ticketId !== ticket.ticketId)
            .map((candidate) => ({ candidate, score: this.candidateScore ? this.candidateScore(ticket, candidate, now) : 0 }))
            .filter((item) => item.score != null && Number.isFinite(item.score))
            .sort((a, b) => a.score - b.score || a.candidate.createdAt - b.candidate.createdAt)[0]?.candidate ?? null;
    }
    restore() {
        const snapshot = this.persistence?.load();
        if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.tickets))
            return;
        for (const ticket of snapshot.tickets) {
            if (!ticket?.ticketId || !ticket.profileId || !["WAITING", "MATCHED", "CANCELLED"].includes(ticket.status))
                continue;
            this.tickets.set(ticket.ticketId, structuredClone(ticket));
        }
    }
    persist() {
        this.persistence?.save(this.snapshot());
    }
    require(ticketId) {
        const ticket = this.tickets.get(ticketId);
        if (!ticket)
            throw new Error("MATCHMAKING_TICKET_NOT_FOUND");
        return ticket;
    }
}
