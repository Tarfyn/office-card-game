import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
function assertCardDefinition(value, index) {
    if (!value || typeof value !== "object")
        throw new Error(`Card definition #${index} is not an object.`);
    const card = value;
    if (typeof card.id !== "string" || card.id.length === 0)
        throw new Error(`Card definition #${index} has no id.`);
    if (typeof card.version !== "number")
        throw new Error(`${card.id}: version must be a number.`);
    if (typeof card.name !== "string")
        throw new Error(`${card.id}: name must be a string.`);
    if (!card.cardType)
        throw new Error(`${card.id}: cardType is required.`);
    if (!card.department)
        throw new Error(`${card.id}: department is required.`);
}
export function loadCardDefinitions(path = fileURLToPath(new URL("../data/cards.json", import.meta.url))) {
    const raw = JSON.parse(readFileSync(path, "utf8"));
    if (!Array.isArray(raw))
        throw new Error("cards.json must contain an array.");
    const definitions = {};
    raw.forEach((entry, index) => {
        assertCardDefinition(entry, index);
        if (definitions[entry.id])
            throw new Error(`Duplicate card id: ${entry.id}`);
        definitions[entry.id] = entry;
    });
    return definitions;
}
export const alphaDefinitions = loadCardDefinitions();
