import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { DeckEntry, Department } from "./types.js";

export interface DeckPreset {
  id: string;
  name: string;
  department: Department;
  description: string;
  /** Curated archetypes may be used without ownership in Training/Tutorial only. */
  trainingLoaner?: boolean;
  cards: DeckEntry[];
}

function assertDeckPreset(value: unknown, index: number): asserts value is DeckPreset {
  if (!value || typeof value !== "object") throw new Error(`Deck preset #${index} is not an object.`);
  const preset = value as Partial<DeckPreset>;
  if (typeof preset.id !== "string" || !preset.id) throw new Error(`Deck preset #${index} has no id.`);
  if (typeof preset.name !== "string" || !preset.name) throw new Error(`${preset.id}: name is required.`);
  if (typeof preset.department !== "string") throw new Error(`${preset.id}: department is required.`);
  if (!Array.isArray(preset.cards)) throw new Error(`${preset.id}: cards must be an array.`);
}

export function loadDeckPresets(path = fileURLToPath(new URL("../data/decks.json", import.meta.url))): Record<string, DeckPreset> {
  const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(raw)) throw new Error("decks.json must contain an array.");
  const presets: Record<string, DeckPreset> = {};
  raw.forEach((entry, index) => {
    assertDeckPreset(entry, index);
    if (presets[entry.id]) throw new Error(`Duplicate deck preset id: ${entry.id}`);
    presets[entry.id] = entry;
  });
  return presets;
}

export const alphaDeckPresets = loadDeckPresets();
