# Legacy Progress Isolation Audit

Baseline: v7.69.55 (`55599f3203de81d246a4d2f2a75cea9163f9f30e`). This audit does not reset, merge, or delete any player progress.

## Observed Guest symptom

The mixed Guest snapshot is explained by two server generations being combined. `public/app.js` reads the browser key `office-card-game-meta-profile-v1` and, when no valid Guest server token exists, sends it as `importMeta` to `POST /api/profiles/guest`. Before this audit, that import supplied economy and progression fields while the newly-created server profile initialized stats, ranked placement, and match history independently.

Consequently:

- Level 3 comes from `localStorage.office-card-game-meta-profile-v1.progression.level`.
- Office Credits 140 comes from `...balances.OFFICE_CREDITS` in the same browser snapshot.
- W-L 0-0, placement 0/5, and empty match history come from fresh `createEmptyPlayerStats`, `createRankedProfile`, and `matchHistory` defaults.

This is a Guest-only partial legacy import, not a coherent historical profile migration.

## Legacy sources and current roles

- Browser Guest snapshot: `localStorage.office-card-game-meta-profile-v1`; compatibility input only.
- Browser Guest credential/server token: `localStorage.office-card-game-server-token-v1`; used only for the Guest server profile.
- Legacy combined JSON: `runtime/profiles.local.json`; read by the local JSON persistence migration path.
- Separated local JSON: `runtime/players.local.json` and `runtime/guest-credentials.local.json`; used only when the configured backend is `FILE_JSON_LOCAL`.
- Room and matchmaking JSON stores are separate and are not Account/Profile state.

In PostgreSQL mode, Guest persistence stores are intentionally removed from the profile service options. Authenticated Accounts load their profile only from the PostgreSQL session/profile path.

The existing `profileVersion` field is a domain/schema version, not a generation marker. Guest browser imports now carry an explicit `legacyGuestState` marker (`source: BROWSER_META`, `version: 1`, `partial: true`, `importedAt`) so the mixed state is identifiable without silently treating it as a complete migration.
`partial: true` deliberately means that the browser snapshot is a mixed/legacy Guest projection,
not a complete modern profile. The planned Alpha wipe will eventually remove this legacy state.

## Account and transition isolation

The authenticated request path resolves identity from the opaque session cookie and loads the PostgreSQL profile. Browser meta values cannot override it; Account state is applied before Guest-token/localStorage fallback, Account saves do not write browser Guest meta, and browser deck import is guarded to Guest-only sessions. The Account service has no `importMeta` input. On logout, Account state is cleared before the existing Guest meta is loaded, so Account progression is not copied into Guest state.

No dangerous authenticated fallback or merge path was found, and no Account reset is required.

## Planned Alpha reset (not performed here)

When the explicit Alpha wipe is approved, decide and reset the following PostgreSQL Account/Profile state together: owned cards, Office Credits, Scraps, player decks, level/XP, achievements, ranked MMR and placements, match history/statistics, cosmetic ownership/rewards as decided by product, and starter onboarding eligibility/state. Account identity may remain. PostgreSQL remains the Source of Truth after reset; legacy JSON is historical backup/reference material and is not an automatic rollback source.

For Guest, prefer a deliberate clean reset or an explicit versioned normalization at that time. Do not silently merge fields from different generations and do not change economy values as part of this audit.

## Follow-up recommendation

Keep the `legacyGuestState` marker until the Alpha reset is complete. If long-lived Guest persistence is retained, introduce an explicit Guest profile-generation/version field and a small, reviewed normalization path; otherwise make the planned clean Guest reset the only supported transition.
