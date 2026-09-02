import { validateDeck } from "./engine.js";
import { isExecutiveEditionEligible, normalizeCardVariantId } from "./card-variants.js";
import type { CardDefinition, DeckEntry, DeckFormat } from "./types.js";

export type PlayerDeckSource = "player" | "browser_migration" | "starter" | "import";
export type PlayerDeckValidationState = "VALID" | "INVALID_MISSING_CARDS" | "INVALID_RULES";

export interface PlayerDeck {
  id: string;
  name: string;
  cards: DeckEntry[];
  createdAt: number;
  updatedAt: number;
  source: PlayerDeckSource;
  sourceRef: string | null;
  version: number;
  revision: number;
}

export interface PlayerDeckValidation {
  state: PlayerDeckValidationState;
  errors: string[];
  missingCards: Array<{ definitionId: string; missing: number; variantId?: string | null }>;
}

export type PlayerDeckView = PlayerDeck & { validation: PlayerDeckValidation };

function cleanName(value: unknown): string {
  const name = String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 48);
  return name || "Custom Deck";
}

function cleanId(value: unknown, fallback: string): string {
  const id = String(value ?? "").trim().replace(/[^a-zA-Z0-9:_-]/g, "-").slice(0, 80);
  return id || fallback;
}

function normalizeCards(value: unknown): DeckEntry[] {
  if (!Array.isArray(value)) return [];
  const counts = new Map<string, { definitionId: string; variantId: string | null; copies: number }>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const definitionId = String((raw as { definitionId?: unknown }).definitionId ?? "").trim();
    const variantId = normalizeCardVariantId(definitionId, (raw as { variantId?: unknown }).variantId);
    const copies = Number((raw as { copies?: unknown }).copies ?? 0);
    if (!definitionId || !Number.isInteger(copies) || copies <= 0) continue;
    const key = `${definitionId}\u0000${variantId ?? ""}`;
    const current = counts.get(key) ?? { definitionId, variantId, copies: 0 };
    current.copies += copies;
    counts.set(key, current);
  }
  return [...counts.values()].sort((a, b) => a.definitionId.localeCompare(b.definitionId) || (a.variantId ?? "").localeCompare(b.variantId ?? "")).map(({ definitionId, variantId, copies }) => ({ definitionId, copies, ...(variantId ? { variantId } : {}) }));
}

export function deckFingerprint(name: string, cards: DeckEntry[]): string {
  const source = JSON.stringify({ name: cleanName(name), cards: normalizeCards(cards) });
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function normalizePlayerDeck(raw: Partial<PlayerDeck> | null | undefined, fallbackId: string, now: number): PlayerDeck {
  const createdAt = Number(raw?.createdAt) > 0 ? Number(raw?.createdAt) : now;
  const updatedAt = Number(raw?.updatedAt) > 0 ? Number(raw?.updatedAt) : createdAt;
  const source = raw?.source === "browser_migration" || raw?.source === "starter" || raw?.source === "import" ? raw.source : "player";
  return {
    id: cleanId(raw?.id, fallbackId),
    name: cleanName(raw?.name),
    cards: normalizeCards(raw?.cards),
    createdAt,
    updatedAt,
    source,
    sourceRef: raw?.sourceRef == null ? null : String(raw.sourceRef).slice(0, 160),
    version: Math.max(1, Math.floor(Number(raw?.version) || 1)),
    revision: Math.max(1, Math.floor(Number(raw?.revision) || 1))
  };
}

export function validatePlayerDeck(
  deck: Pick<PlayerDeck, "cards">,
  definitions: Record<string, CardDefinition>,
  format: DeckFormat,
  ownedCards?: Record<string, number>,
  ownedCardVariants?: Record<string, number>
): PlayerDeckValidation {
  const formatResult = validateDeck(deck.cards, definitions, format);
  const errors = [...formatResult.errors];
  const missingCards: Array<{ definitionId: string; missing: number; variantId?: string | null }> = [];
  if (ownedCards) {
    for (const entry of deck.cards) {
      const owned = entry.variantId ? Number(ownedCardVariants?.[entry.variantId] ?? 0) : Number(ownedCards[entry.definitionId] ?? 0);
      const missing = Math.max(0, entry.copies - owned);
      if (missing) missingCards.push({ definitionId: entry.definitionId, missing, ...(entry.variantId ? { variantId: entry.variantId } : {}) });
    }
  }
  return {
    state: errors.length ? "INVALID_RULES" : missingCards.length ? "INVALID_MISSING_CARDS" : "VALID",
    errors,
    missingCards
  };
}

export function assertDeckInput(deck: Pick<PlayerDeck, "cards">, definitions: Record<string, CardDefinition>, format: DeckFormat): void {
  const counts = new Map<string, number>();
  for (const entry of deck.cards) {
    if (!entry || typeof entry !== "object") throw new Error("DECK_MALFORMED");
    if (!definitions[entry.definitionId]) throw new Error("DECK_UNKNOWN_CARD");
    if (entry.variantId && (!isExecutiveEditionEligible(definitions[entry.definitionId]) || normalizeCardVariantId(entry.definitionId, entry.variantId) !== entry.variantId)) throw new Error("DECK_UNKNOWN_VARIANT");
    if (!Number.isInteger(entry.copies) || entry.copies <= 0) throw new Error("DECK_MALFORMED");
    counts.set(entry.definitionId, (counts.get(entry.definitionId) ?? 0) + entry.copies);
  }
  for (const [definitionId, copies] of counts) {
    const limit = format.cardLimits?.[definitionId] ?? format.defaultCopyLimit;
    if (copies > limit) throw new Error("DECK_COPY_LIMIT");
  }
}
