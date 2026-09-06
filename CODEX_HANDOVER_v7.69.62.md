# Office Card Game v7.69.62 Handover

## Release

- Version: `v7.69.62`
- Scope: Legacy Debt Cleanup — German localization and scoped CSS consistency
- Gameplay, Tutorial V2, economy, persistence architecture, and PostgreSQL schema: unchanged

## Localization

- Deckbuilder labels, filters, analysis, validation, and saved-deck UI use the localization layer.
- Shared German Match labels include `DU`, `GEGEN`, `ZUG`, `MITARBEITER`, `FREI`, `Match-Menü`, `Verlauf`, and `VERBINDET NEU`.
- Canonical card names, game terminology, product labels, and QA/dev terminology remain intentionally unchanged where appropriate.

## CSS and accessibility

- Reused the existing semantic token layer for on-dark/on-light text, muted text, disabled surfaces, and focus-visible controls.
- Improved disabled-state readability, dark-surface contrast, spacing consistency, and responsive control sizing.
- No gameplay or interaction semantics changed.

## Regression coverage

- Added `test/legacy-debt-cleanup.test.ts` and included it in `npm test`.
- Assertions cover localization helpers, Deckbuilder/Match render paths, and scoped CSS presentation markers.

## QA and architecture

- German Deckbuilder and Match surfaces were verified in the local browser at `http://127.0.0.1:8787`.
- Exact `390x844`, `844x390`, `1920x1080`, `3840x2160`, and real-device runtime QA remained unavailable in the connected browser tooling.
- Authenticated Account/Profile remains PostgreSQL-backed.
- Guest remains `MEMORY_ONLY / GUEST_LOCAL`.
- Room and Matchmaking remain `FILE_JSON_LOCAL`.
- No schema migration was required.
- Ranked timer remains disabled.

## Remaining debt

- Intentional/canonical English card and product terminology remains.
- Some QA/dev-only terminology remains.
- Exact mobile/4K/real-device viewport coverage remains a follow-up.

`AGENTS.md` remains version-independent.
