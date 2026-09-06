# Office Card Game v7.69.65 Handover

## Executive Edition variant ownership hotfix

This release hardens the existing Executive Edition finish-swap flow without changing card rules, economy values, persistence schema, or gameplay.

- Standard and Executive copies remain separate physical ownership variants within one gameplay card family.
- Deckbuilder swaps recompute immediately from the current deck and owned variant counts. A swap is disabled with a localized reason when all owned copies of that finish are already used.
- Both directions are guarded: Executive-to-Standard and Standard-to-Executive respect the corresponding owned-copy cap.
- Profile deck create/update uses the authoritative variant guard. PvP/Friendly/matchmaking validation uses the full ownership guard; Training and Alpha access retain their existing behavior.
- Legacy valid-format decks with missing standard variant metadata remain loadable for repair and are not mutated automatically. Existing ownership and production profiles are unchanged.
- No database schema migration is required.

## QA and release notes

- Verified disposable PostgreSQL-backed accounts with 3 Standard / 1 Executive and 3 Standard / 2 Executive ownership distributions.
- Verified the first allowed Executive swap, immediate second-swap block, reverse swap, reload persistence, and server-side rejection of an over-cap Executive deck.
- Verified direct PostgreSQL integration and PostgreSQL Docker integration, full tests, localization/artwork/cosmetic/security/card-content audits, and `git diff --check`.
- Browser QA used the local disposable PostgreSQL environment; screenshots and local QA artifacts remain untracked and are not part of the release.
- PostgreSQL remains authoritative for authenticated Account/Profile data; Guest remains `MEMORY_ONLY` / `GUEST_LOCAL`; Room and Matchmaking remain `FILE_JSON_LOCAL`.

## Follow-up

No production data mutation, Alpha reset, schema migration, or economy rebalance is included. Existing unrelated localization debt remains outside this hotfix scope.
