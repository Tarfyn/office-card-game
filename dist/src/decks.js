import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
function assertDeckPreset(value, index) {
    if (!value || typeof value !== "object")
        throw new Error(`Deck preset #${index} is not an object.`);
    const preset = value;
    if (typeof preset.id !== "string" || !preset.id)
        throw new Error(`Deck preset #${index} has no id.`);
    if (typeof preset.name !== "string" || !preset.name)
        throw new Error(`${preset.id}: name is required.`);
    if (typeof preset.department !== "string")
        throw new Error(`${preset.id}: department is required.`);
    if (!Array.isArray(preset.cards))
        throw new Error(`${preset.id}: cards must be an array.`);
}
export function loadDeckPresets(path = fileURLToPath(new URL("../data/decks.json", import.meta.url))) {
    const raw = JSON.parse(readFileSync(path, "utf8"));
    if (!Array.isArray(raw))
        throw new Error("decks.json must contain an array.");
    const presets = {};
    raw.forEach((entry, index) => {
        assertDeckPreset(entry, index);
        if (presets[entry.id])
            throw new Error(`Duplicate deck preset id: ${entry.id}`);
        presets[entry.id] = entry;
    });
    return presets;
}
export const alphaDeckPresets = loadDeckPresets();
