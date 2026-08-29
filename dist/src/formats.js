import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
function assertDeckFormat(value) {
    if (!value || typeof value !== "object")
        throw new Error("Deck format is not an object.");
    const format = value;
    if (typeof format.id !== "string" || format.id.length === 0)
        throw new Error("Deck format id is required.");
    if (!Number.isInteger(format.deckSize) || (format.deckSize ?? 0) <= 0)
        throw new Error(`${format.id}: deckSize must be a positive integer.`);
    if (!Number.isInteger(format.defaultCopyLimit) || (format.defaultCopyLimit ?? -1) < 0)
        throw new Error(`${format.id}: defaultCopyLimit must be a non-negative integer.`);
    for (const [cardId, limit] of Object.entries(format.cardLimits ?? {})) {
        if (!Number.isInteger(limit) || limit < 0)
            throw new Error(`${format.id}: invalid card limit for ${cardId}.`);
    }
}
export function loadDeckFormat(path = fileURLToPath(new URL("../data/formats/alpha.json", import.meta.url))) {
    const raw = JSON.parse(readFileSync(path, "utf8"));
    assertDeckFormat(raw);
    return raw;
}
export const ALPHA_FORMAT = loadDeckFormat();
