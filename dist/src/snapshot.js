import { RulesError } from "./errors.js";
export function createMatchSnapshot(state) {
    return {
        schemaVersion: 1,
        state: structuredClone(state)
    };
}
export function serializeMatchSnapshot(state) {
    return JSON.stringify(createMatchSnapshot(state));
}
export function restoreMatchSnapshot(snapshot) {
    let parsed;
    try {
        parsed = typeof snapshot === "string" ? JSON.parse(snapshot) : structuredClone(snapshot);
    }
    catch {
        throw new RulesError("Invalid match snapshot JSON.");
    }
    if (!parsed || parsed.schemaVersion !== 1 || !parsed.state)
        throw new RulesError("Unsupported or invalid match snapshot.");
    if (typeof parsed.state.matchId !== "string" || typeof parsed.state.stateVersion !== "number")
        throw new RulesError("Match snapshot is missing required state metadata.");
    return structuredClone(parsed.state);
}
