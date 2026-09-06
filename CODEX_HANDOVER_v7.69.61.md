# Office Card Game v7.69.61 Handover

## Release

- Version: `v7.69.61`
- Scope: Tutorial V2 simplification, phase-divider alignment, target contrast, and Lobby Quick Match cleanup
- Gameplay, economy, persistence architecture, and PostgreSQL schema: unchanged

## Tutorial V2

- Eight guided states: Opening, Employee, Support, Battle, Employee Attack, Direct Attack, End, Complete.
- Deterministic opening hand and controlled Capacity remain in place.
- Start and Draw boundaries auto-advance; only `Go to Battle` and `Go to End` are intentional phase CTAs.
- Coffee Chat (`N-009`) uses the normal target flow and authoritative `CARD_PLAYED`, `ACTION_RESOLVED`, and `CHAIN_RESOLVED` events.
- Employee combat and direct Reputation attack occur in the same Battle phase.
- The Response/Incident lesson is removed from Tutorial V2; Training remains the freeform practice path.
- Tutorial completion uses `COMPLETE_TUTORIAL` and `TUTORIAL_COMPLETE`, with `rewardEligible:false`; it does not require REP to reach zero.
- Mandatory engine interactions retain priority over optional Tutorial gating.

## Stability and presentation

- End-step `ADVANCE_PHASE` gating now permits the visible `Go to End` CTA only within the Tutorial end-step contract.
- Compact Tutorial guidance remains below the desktop utility safe zone and board-friendly on responsive layouts.
- Target and choice surfaces use explicit readable on-dark text and disabled-state styles.
- Phase-divider track and segments share one exact-height geometry contract; green and red active states share geometry, with existing border/radius treatment preserved.
- Lobby retains one functional Quick Match action; Training and Tutorial remain separate.

## QA and architecture

- Browser QA completed the full Tutorial, reload/controller takeover, Support targeting, same-turn attacks, completion, and Back to Lobby flow.
- Available browser surface was approximately `1783x1242`; exact `390x844`, `844x390`, `1920x1080`, and `3840x2160` emulation was unavailable.
- Authenticated Account/Profile remains PostgreSQL-backed.
- Guest remains `MEMORY_ONLY / GUEST_LOCAL`.
- Room and Matchmaking remain `FILE_JSON_LOCAL`.
- No schema migration was required.
- Ranked timer remains disabled.

## Checks

Build, full tests, direct disposable PostgreSQL integration, PostgreSQL Docker integration, localization, artwork, cosmetic, security, card-content, and `git diff --check` passed before release integration.

`AGENTS.md` remains version-independent.
