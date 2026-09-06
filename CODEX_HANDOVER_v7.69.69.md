# v7.69.69 — VFX Phase 3 Hero effects

Release candidate from `codex/vfx-phase-3`, based on v7.69.68 / `0a11cc436cb2ca5a2250f8a4341940f4b4fc3028`. v7.69.69 was unused in local and origin tags before preparation. The reviewed implementation is preserved as-is; release preparation changes only version owners/assertions and documentation. AGENTS.md remains version-independent.

## Accepted presentation

- CORE: ordinary gameplay feedback remains unchanged from V1/V2 and the timing/readability pass.
- ENGINE: qualifying important/multi-card resolution, rejection, delayed chain items, magnitude >=3 power changes and multi-Archive groups receive bounded signatures.
- HERO: authoritative reputation-zero lethal and visible canonical Executive entry only.

`public/vfx-signatures.js` composes finite procedural SVG base presets with deterministic Department modifiers: Customer Service ticket routing, IT terminal/scan trace, Office forms/approval, Marketing KPI momentum, Production conveyor/throughput, Neutral paperwork fallback. Confirmed affected/Archive targets share propagation; presentation never invents causal targets. Negate uses a localized red cancellation mark; delay uses the existing pending motif.

Lethal uses a crashing KPI, warning perimeter and controlled paper burst. The signed REP cue remains readable. Only authoritative `GAME_ENDED` / `REPUTATION_ZERO` qualifies; nonlethal damage, concession and Tutorial completion do not. Executive entry uses matching projected `definitionId` and canonical `variantId`, never filename, rarity or hidden identity. Gold/white prism arrival decorates the existing settle; Standard cards do not qualify and no new idle animation is introduced.

Signatures decorate existing queue steps. Authoritative sequence ordering, room watermark, grouping, reconnect/reload/takeover history protection, result gating and cleanup remain intact. No new queue steps or independent timeout chains. Existing lifecycle owns the layers and removes final Hero feedback before result UI. Future `sfxPreset` and reward/booster preset hooks remain inactive; no sound or economy changes.

Limits remain ENGINE 6 particles/request, HERO 12, global 24 particles, 3 enhanced roots, 128 enhanced nodes and 4 physical proxies. Geometry comes from captured viewport rectangles; transform/opacity are used without per-frame geometry loops, large blur surfaces or external assets. Layers are inert, pointer-transparent and hidden from accessibility traversal. Reduced motion keeps static signatures and visible outcomes, with no decorative particles or shake.

## Timing preservation

`public/vfx-timing.js` is byte-for-byte unchanged from v7.69.68. All reviewed VFX implementation/test hashes were rechecked before release integration.

| Presentation | Unchanged timing |
| --- | --- |
| Hand / Support-System | 360 / 340 ms travel + 80 ms settle |
| Action | 220 ms stage + 180 ms resolve + 420 ms Archive |
| Attack / impact hold | 300 ms commit; dedicated 150 ms combat hold |
| Archive | 420 ms travel after separate outcome confirmation |
| REP | 260 ms hold, 950 ms signed cue |
| Lethal | 920 ms scheduled; approximately 961 ms observed in release QA |
| Catch-up | 6 entries, 2900 ms budget, 1600 ms age threshold; 620 ms critical receipt |

Controlled shared easing is unchanged. Normal actions retain full timing; dense catch-up drops decorative travel first while preserving critical outcomes. Result-screen dwell remains unchanged: possible longer dwell is OBSERVATION ONLY.

## Candidate checks

- `npm.cmd ci --offline --no-audit --no-fund`: passed. Identified local QA servers were stopped first to release native dependency handles.
- `npm.cmd run build`: passed.
- `npm.cmd test`: passed; no gameplay assertions weakened.
- Explicit `node test/match-vfx.test.mjs`: 33/33, retaining V1, Phase 2, timing and new Hero coverage.
- Direct `npm run test:db` was not run because `OCG_TEST_DATABASE_URL` was unset.
- `npm.cmd run test:db:docker`: passed, `DB_INTEGRATION_OK`; Docker PostgreSQL ran the same integration suite, including migrations, auth, persistence/restart, authorization and concurrency. Expected negative readiness cases precede success.
- i18n: 107/107 cards, 11/11 Match anchors, 33/33 result keys.
- Artwork: 107/107, zero missing/problem/orphan assets. Cosmetics passed. Security: zero vulnerabilities. Card-content: 107, no reported gaps.
- `git diff --check`: passed; staged check covers new files.

## Browser verification

Actual Chromium via existing Playwright/CDP fallback because the Browser plugin was unavailable. Tests use isolated local v7.69.69 servers, real Match DOM and deterministic RoomService fixtures. These are emulated viewports, not physical device/FPS benchmarks; not every interaction was repeated at every size.

- 1920x1080, 3840x2160, 390x844, 844x390: Executive/lethal one-shot rendering, reduced-motion static distinction, inert pointers and cleanup passed. Five Employee/four Support slots per side, zero pre-projection Own/Opp center-X difference and zero horizontal overflow.
- Authoritative Friendly PHYSICAL: Executive Employee placement, Standard System placement, targeted Action, card combat/Archive, nonlethal direct and lethal direct attack. Lethal montage visibly retains the corporate warning/KPI cue and signed REP before result UI. Result at approximately 961 ms; zero enhanced roots/proxies when it opens.
- All five Department ENGINE motifs and negate were rendered through the current queue and consecutive frames inspected. Shared propagation stays attached to confirmed targets. CORE remains quieter than ENGINE and HERO.
- Dense rendered scenario: eight Archive outcomes plus lethal condense into the existing 620 ms static critical receipt; all eight archives retained, no decorative particles, then idle/clean. Bounded stress observed 3 roots / 18 particles / 39 enhanced nodes within hard caps.
- Fresh Tutorial V2 UHRDLF completed: mulligan, Employee, targeted Action, Battle, card combat, direct attack, End and completion; no hardlock.
- TRAINING TIMINGTRAIN: native portrait touch Support/System and Incident placement, Please Hold response, Employee placement, combat tie, Archive targeting and Escalated Ticket card return. Exposed Support tap was inside the hand container bounds and hit the board slot correctly.
- Offline/online reconnect, observer takeover and reload produced no historical presentation steps or nodes; ended Friendly reload did not repeat Executive/lethal. Physical proxy rerender stability, hidden opponent full-card-back safety, resize cancellation and destroyed-attacker reconciliation passed.
- No uncaught JS errors or orphan enhanced/proxy nodes recorded. Prior implementation QA also verified notification host persistence and Executive Inspector readability; release changes do not alter either renderer.

Synthetic RoomService fixtures can return pre-existing playtest-feedback HTTP 403 because they omit profile ownership metadata. Known guest loaner-selection HTTP 400 remains unrelated and outside scope; neither is claimed fixed.

## Deployment requirements and production safety

Use only `/opt/office-card-game/deploy.sh --check v7.69.69`, then `/opt/office-card-game/deploy.sh v7.69.69`. This candidate document does not claim deployment success. Independently verify public HTTPS readiness/health, current/exact migrations, active immutable release path and service status after activation.

Authenticated Account/Profile remains POSTGRES; Guest MEMORY_ONLY / GUEST_LOCAL; Room and Matchmaking FILE_JSON_LOCAL. Ranked timer remains disabled. No schema migration, asset addition or persistence change.

Production smoke must be read-only. Shipped Lobby/Deckbuilder/Match/Hero assets can render against isolated localhost API data; no production guest profile or Match should be created. No approved disposable production account was supplied.

## Deferred

Full sound, booster Hero pass, reward Hero pass, bespoke per-card VFX, stronger global intensity and timing changes remain deferred. Additional assets required: no. Result-screen dwell remains an observation only.
