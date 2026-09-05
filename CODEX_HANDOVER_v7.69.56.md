# Office Card Game - Codex Handover v7.69.56 Legacy Progress Isolation

## Release

- Version: `v7.69.56`
- Base production version: `v7.69.55`
- This is a small observability/state-identification patch for legacy Guest progression.
- PostgreSQL remains authoritative for authenticated Account/Profile data.
- Guest persistence remains `MEMORY_ONLY` / `GUEST_LOCAL`.
- Room and matchmaking persistence remain `FILE_JSON_LOCAL`.
- Ranked timer: disabled.

## Legacy Guest marker

Browser-imported Guest meta snapshots are explicitly marked as partial compatibility state:

```js
legacyGuestState: {
  source: "BROWSER_META",
  version: 1,
  partial: true,
  importedAt
}
```

The marker explains why legacy browser progression can coexist with newer server-owned stats,
ranked placement, or match history. It does not rewrite or reset Guest level, XP, Credits,
Scraps, cards, decks, cosmetics, achievements, ranked state, or match history. The planned
Alpha wipe remains a separate future operation.

Authenticated Accounts are unaffected: their session and Profile state remain PostgreSQL-
authoritative, and legacy browser meta, Guest credentials, and local decks do not overwrite or
merge into Account state. Legacy JSON/browser state is historical compatibility material, not a
PostgreSQL Account rollback source.

See [docs/legacy-progress-isolation.md](docs/legacy-progress-isolation.md) for the source audit,
transition rules, and planned reset scope.

## QA

Build, full regression, PostgreSQL integration, disposable PostgreSQL Docker, localization,
security audit, and diff checks passed. No production Account or Guest progression reset was
performed by this release.
