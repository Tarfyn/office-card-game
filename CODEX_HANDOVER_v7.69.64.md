# Office Card Game v7.69.64 Handover

## Booster purchase persistence hotfix

- Normal authenticated booster purchases now use stable `booster:v1:<sequence>` source references instead of a shared null reference.
- The PostgreSQL projection keeps historical null-reference grants loadable with deterministic legacy fallback keys, avoiding reward-grant collisions without a schema migration or production data rewrite.
- Each purchase remains atomic: authoritative Office Credits validation, 100-credit deduction, five-card generation, reward provenance, profile persistence, and authoritative response are committed together.
- Consecutive pack openings remain available without reload after the current reveal completes. The reveal gate prevents overlapping purchases, while completed-pack review actions remain non-mutating.
- `View pack`, `New pulls`, and `Show in Collection` remain distinct review/navigation actions and do not deduct Credits or grant cards.
- Recoverable authenticated persistence failures reconcile the latest server profile and use localized economy messaging; genuine database failures remain diagnosable.

## Deckbuilder header stability

- The All Alpha cards / Owned copies mode switch remains in a stable desktop header slot.
- Wallet alignment is stable and the single authoritative Office Credits / Scraps presentation remains readable on the dark surface.
- Mobile responsive behavior and the existing no-overflow layout are preserved.

## Compatibility and scope

- Starter Booster grants retain their separate idempotent provenance and remain free.
- Executive Edition Pack reward semantics are unchanged.
- No pack price, card count, rarity distribution, reward value, crafting/scrapping value, economy rule, or PostgreSQL schema changed.
- Authenticated Account/Profile persistence remains PostgreSQL-authoritative; Guest remains `MEMORY_ONLY / GUEST_LOCAL`; Room and Matchmaking remain `FILE_JSON_LOCAL`.
- Ranked timer remains disabled.

## Verification

- Disposable PostgreSQL 18 direct integration passed with `OCG_TEST_DATABASE_URL` scoped to the local test command.
- Docker PostgreSQL integration passed.
- Regression coverage includes three consecutive purchases, unique grant references, insufficient-balance no-mutation behavior, and concurrent booster purchase handling.
- Browser QA verified repeat-pack opening and the reveal gate at the available `619x642` surface; exact desktop/mobile emulation remained unavailable.
