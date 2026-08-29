import type { DeckEntry, Department } from "./types.js";
export interface DeckPreset {
    id: string;
    name: string;
    department: Department;
    description: string;
    cards: DeckEntry[];
}
export declare function loadDeckPresets(path?: string): Record<string, DeckPreset>;
export declare const alphaDeckPresets: Record<string, DeckPreset>;
