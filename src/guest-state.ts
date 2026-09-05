/**
 * Browser meta snapshots are a legacy Guest-only compatibility input. They
 * contain economy/progression fields but not the server-owned stats, ranked,
 * history, or credential state. Mark that boundary explicitly so a future
 * Alpha reset or migration can identify imported partial Guest state.
 */
export const LEGACY_GUEST_STATE_VERSION = 1;

export interface LegacyGuestStateMarker {
  source: "BROWSER_META";
  version: 1;
  partial: true;
  importedAt: number;
}

export function prepareLegacyGuestImport(value: unknown, importedAt = Date.now()): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  if (Number(candidate.profileVersion ?? 0) < 2) return undefined;
  return {
    ...structuredClone(candidate),
    legacyGuestState: {
      source: "BROWSER_META",
      version: LEGACY_GUEST_STATE_VERSION,
      partial: true,
      importedAt: Number(importedAt) || Date.now()
    } satisfies LegacyGuestStateMarker
  };
}
