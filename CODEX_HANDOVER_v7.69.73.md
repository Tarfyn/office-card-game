# v7.69.73 — Mainline Consolidation and Alpha Readiness

This release consolidates the gameplay UX, localization, Guest/Training reliability,
touch interactions, deterministic browser acceptance coverage, and Alpha reset readiness
documentation on the v7.69.72 production baseline.

## Consolidated behavior

- `handEligibility` remains the authoritative server/engine projection consumed by the client.
- Blocker precedence remains `SETUP → ENDED → mandatory choice → response window → opponent turn → hand limit → wrong phase → delay → capacity → Promotion → board slots → action limit → play condition → target availability`.
- Service Desk Lead requires IT Service material; ERP Specialist does not satisfy that requirement.
- Valid Promotion material remains playable with a full Employee field because the material frees the required slot. Invalid ERP material remains blocked, and insufficient Capacity remains a Capacity blocker.
- Occupied valid Promotion material exposes only the viewer-owned material interaction surface; empty-slot, cancellation, highlighting, desktop, and touch behavior remain authoritative and consistent.
- Contextual blocker feedback and Card Inspector use localized player-facing copy, including the Promotion requirement.
- Desktop hover, click, right-click Inspector, and touch tap/Long-Press Inspector contracts remain intact. Movement and `pointercancel` cancel a long press.
- Guest Training loaners remain local to Training. No normal deck-selection request, Guest PostgreSQL write, or ownership grant is made; authenticated owned and loaner Training remain valid, while PvP rejects loaners.
- English remains canonical and the EN/DE localization layer covers the consolidated gameplay, Training, deckbuilder, economy, Inspector, archive, notification, combat, and result surfaces.

## QA and tooling

- `scripts/browser-consolidation-acceptance.mjs` and `test:browser:consolidation` use the real built client, Chromium, DOM/pointer handlers, and authoritative local `RoomService` fixtures only.
- The harness covers Promotion blockers/materials/full-field behavior, mobile portrait/landscape Support and Promotion, Long-Press Inspector, targeting/cancellation, Guest Training, and no erroneous loaner request.
- `docs/alpha-reset-readiness-v7.69.72.md` remains analysis/readiness only. No Alpha reset or production profile mutation was executed.
- No PostgreSQL schema change is required; migrations remain current/exact.
- Rapid-combat queue serialization remains accepted at approximately 1463 ms. VFX behavior and timing are unchanged.
- Impeccable v4.2.2 is deferred to a separate maintenance pass; the installed detector remains `[]`.

## Persistence and release safety

Authenticated Account/Profile remains PostgreSQL authoritative. Guests remain `MEMORY_ONLY` / `GUEST_LOCAL`; Room and Matchmaking remain `FILE_JSON_LOCAL`. Ranked timer remains disabled (`timerActive:false`).

Release QA, deployment preflight, and post-deploy readiness/health verification are recorded with the release result.
