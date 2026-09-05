# Office Card Game - Codex Handover v7.69.57

## Release

- Version: `v7.69.57`
- Base production version: `v7.69.56`
- Scope: starter cosmetics, avatar consistency, card-content audit, guided Tutorial, and targeted contrast/readability fixes.
- PostgreSQL remains authoritative for authenticated Account/Profile data.
- Guest persistence remains `MEMORY_ONLY` / `GUEST_LOCAL`.
- Room and matchmaking persistence remain `FILE_JSON_LOCAL`.
- Ranked timer: disabled.

## Starter cosmetics

Fresh accounts receive the functional starter identity:

- `COS-AVA-007` / `intern-female.webp` / Intern
- `COS-BOARD-001` / Classic Office
- `COS-BACK-001` / Default Corporate

Fresh accounts do not receive a normal starter Avatar Frame, Avatar Decoration, Badge, or Title.
`COS-AVA-008` (`intern-male.webp`) is catalog-integrated, user-facing name `Intern` in EN and DE,
and is not starter-owned. HR Oracle and Overworked Sysadmin are not starter-owned; HR Oracle
remains a Company Store item at 180 Office Credits. Existing ownership is preserved.

## Card content audit

The canonical pool contains 107 cards. `ops:card-content-audit` reports 107/107 cards,
three intentional vanilla cards, and zero missing rules text, localization gaps,
implementation/text mismatches, or presentation mismatches.

Intentional vanilla cards are `CS-021`, `PRD-001`, and `N-001`. Their canonical localized
fallback is `No effect.` in English and `Kein Effekt.` in German. No effects were invented.

## Guided Tutorial

Tutorial is a data-driven guided overlay on the real authoritative Match engine. It uses deterministic
setup, fixed opening/draw behavior, a deterministic Coach, localized step-specific guidance, and
action gating. The twelve steps are Opening Hand, Start, Draw, Employee, Support, Battle, Employee
Attack, End, Coach Turn, Response, Direct Attack, and Complete.

Manual browser verification completed the Tutorial in English and German. Employee Attack committed
and resolved, `CS-010-A1` / Please Hold activated through the normal response window, Office Assistant
dealt direct REP damage from 20 to 18, and the authoritative Match reached ENDED with a working
Back to Lobby completion CTA. A mid-Tutorial reload retained the current instruction and state.
Training remains freeform and separate; Tutorial has `rewardEligible:false` and introduces no new reward.

## Contrast and localization

Accepted targeted contrast improvements remain active across Match/Tutorial, Lobby, Player File,
Personnel File, Company Store, Deckbuilder, and Starter Onboarding. No broad legacy CSS rewrite was
introduced. Tutorial EN/DE keys are present and no raw Tutorial keys appear. Some shared legacy Match
confirmation/status labels remain English in German and are documented as a non-blocking follow-up.

Exact four-viewport emulation was unavailable in the connected browser tooling. Available browser QA
used the default `1776x1216` CSS viewport at DPR 1.5; no visible desktop overflow or blocked Tutorial
CTA was observed. Mobile exact viewport QA remains unclaimed.

## QA

Build, full tests, PostgreSQL integration, disposable PostgreSQL Docker, localization, artwork,
cosmetic, security, card-content, and diff checks passed before release. No account reset, schema
change, economy change, or PostgreSQL work was performed. The future Alpha reset remains pending.
