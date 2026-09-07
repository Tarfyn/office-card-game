# v7.69.70 — VFX immediate response and slower motion

Release candidate from `codex/vfx-immediate-response`, based on v7.69.69 / `55768072df42015d64561534cf8cc176ab22c237`. Version was unused locally and on origin before preparation. This releases the reviewed implementation without additional VFX tuning. All eight reviewed runtime/test file SHA-256 hashes matched before integration. Package, lockfile, server and active version assertions are synchronized; AGENTS.md remains version-independent.

## Root cause and response policy

Presentation start latency and visible animation duration are separate. Accepted POST events previously could wait for the post-response recovery readback before rendering. Controlled buffered-SSE testing found approximately 182 ms avoidable event-to-motion waiting. Accepted views now render before awaiting that recovery read. Authority, preflight reads, idempotent intents and recovery remain intact.

A synchronous, pointer-transparent source acknowledgement makes submission visible without implying success. Rejected intent retains its card in hand and creates no successful travel. There is no artificial travel pre-delay. Existing queue order can still postpone a later physical group while its local acknowledgement responds immediately.

Internal speed also mattered: front-loaded easing, early opacity loss and Hero keyframes finishing their evolution early. A long root lifetime alone did not guarantee perceptible motion. Separate survivor-return and outcome waits unnecessarily serialized presentation. Legacy combat CSS delays are disabled on the queued presentation path.

## Motion and overlap

| Presentation | Released timing |
| --- | --- |
| Hand | 560 ms travel + 80 ms settle |
| Support/System | 520 ms travel + 80 ms settle |
| Action | 420 ms stage + 200 ms resolve + 620 ms Archive |
| Attack approach | 480 ms |
| Combat impact | 40 ms initial impact + 240 ms active decay |
| Archive | 40 ms serial outcome handoff, then 620 ms mostly opaque travel |
| REP | 260 ms response hold; 950 ms signed cue, unchanged |
| Lethal | 920 ms direct-lethal schedule and warning envelope |
| Executive / ENGINE residual | 850 ms, non-blocking |

Travel easing is `cubic-bezier(.3,.15,.65,.85)`: approximately 52.4% progress halfway, versus 75.9% previously. Feedback and signature easing remain semantic tokens. No animation-delay precedes travel.

Lethal warning starts during the authoritative attack commit; KPI crash, zero emphasis and paper activate together with impact. The warning occupies the full 920 ms envelope; its impact layers evolve over the remaining window. Critical final feedback still completes before result UI. Result dwell and isolated/Tutorial fallback gating are unchanged.

Survivor return overlaps impact or Archive. Executive/ENGINE residuals can outlive queue completion while subsequent critical entries begin. Existing bounded lifecycle owns them; targeting, reconciliation, reset and dense catch-up can retire decoration. There are no independent uncontrolled timeout chains.

Authoritative sequence order, grouped outcomes, room watermark, dedupe and history protection remain intact. Catch-up is unchanged: six entries, 2900 ms budget, 1600 ms age threshold. Two ordinary combat groups fit the budget; dense bursts retain damage, destruction, Archive and lethal in a 620 ms critical receipt while decoration yields first.

Reduced motion acknowledges immediately, skips long spatial travel and proxies, and uses ordered static outcomes with short fades. CORE/ENGINE/HERO classification, canonical Executive identity, Standard separation and hidden opponent card backs remain intact.

## Final candidate checks

- `npm.cmd ci --offline --no-audit --no-fund`: passed. Identified local QA servers were stopped first to release native dependency handles.
- `npm.cmd run build`: passed.
- `npm.cmd test`: passed, including gameplay and persistence/security static regressions.
- Explicit `node test/match-vfx.test.mjs`: 39/39.
- Direct `npm run test:db` was not run because `OCG_TEST_DATABASE_URL` was unset; no direct DB success is claimed.
- `npm.cmd run test:db:docker`: passed with `DB_INTEGRATION_OK`. PostgreSQL Docker ran the same integration suite, including migration, auth, persistence/restart, authorization and concurrency. Expected negative readiness cases preceded success.
- i18n, artwork, cosmetic, security and card-content audits: passed. No new assets or audit gaps introduced.
- `git diff --check` and staged whitespace verification: passed, including new implementation and handover files.

## Fresh browser release QA

Chromium/Playwright fallback was used because the Browser plugin was unavailable. Local deterministic RoomService fixtures and the real Match DOM were tested. These are emulated viewports and individual samples, not physical-device or percentile benchmarks. Input-to-first-response uses browser performance timestamps and a requestAnimationFrame paint opportunity; consecutive captured frames also verified perceptibility.

| Flow | Input to first acknowledgement | First response to main completion | Event to motion |
| --- | ---: | ---: | ---: |
| Executive Employee | 12 ms | 712 ms | 74 ms |
| Support/System | 13 ms | 659 ms | 21 ms |
| Targeted Action | 52 ms | 1313 ms | 27 ms |
| Card combat | 11 ms | 1494 ms | 32 ms |
| Direct nonlethal | 11 ms | 844 ms | 20 ms |
| Direct lethal | 11 ms | 989 ms | 17 ms |
| Buffered SSE / delayed readback | 12 ms | 869 ms | 26 ms |

The controlled buffered case reached authoritative motion at 228 ms after input; the remaining wait is server confirmation. Previously reviewed baseline acknowledgement samples were Employee/Executive 67 ms, Support 49 ms, Action 69 ms, attack 61 ms, direct 48 ms and lethal 49 ms. These are separate runs, not guaranteed production latency.

Archive followed visible combat outcome and began at approximately 877 ms after input, then travelled for 620 ms. Lethal warning began approximately 52 ms after input (previously 352 ms); KPI/zero/paper synchronized with impact around 537 ms. Result opening had zero enhanced roots/proxies. Executive destination signature lasted 850 ms and remained visible after queue completion.

- 1920x1080, 3840x2160, 390x844 and 844x390: immediate acknowledgement, normal/reduced motion, sustained Executive residual, early lethal envelope, replay dedupe and cleanup passed. Five Employee/four Support slots per side; zero pre-projection center-X difference and zero horizontal overflow. Not every full gameplay interaction was repeated at every viewport.
- Authoritative Friendly PHYSICAL: Executive Employee, Standard System, targeted Action, card combat/Archive, nonlethal and lethal direct attacks completed. Motion was visibly followable; combat and Archive remained distinct; REP and Hero feedback stayed readable.
- Fresh Tutorial V2 RRDE4F completed without hardlock.
- Training TIMINGTRAIN: portrait touch Support/System, Please Hold Incident placement/response, Employee placement, combat tie, Archive targeting and Escalated Ticket return completed. The Support tap was inside the empty hand container bounds and reached the underlying board slot. Inspector opened with readable returned-card state.
- Reconnect, observer/controller takeover and reload produced no historical travelling cards or Hero nodes. Ended Friendly reload did not repeat Executive/lethal. Rejected intent left the card in hand, board empty and no acknowledgement/proxy residue.
- Rendered physical proxy tests passed hidden full-card-back safety, rerender stability, inert pointers and resize cancellation. Dense eight-Archive/lethal receipt retained all outcomes, removed decorative residuals and drained cleanly. Next critical entry began while an ordinary Executive residual was still visible.
- No uncaught JavaScript errors, orphan proxies or signature nodes observed. Existing notification persistence remains covered by focused regressions; no notification renderer redesign.

Limits are unchanged: ENGINE 6 requested particles, HERO 12, global 24, 3 enhanced roots, 128 enhanced nodes, 4 physical proxies. Captured viewport rectangles and transform/opacity animation remain the geometry/performance model.

## Deployment and scope

This candidate document does not claim deployment success. Use the hardened wrapper only: `/opt/office-card-game/deploy.sh --check v7.69.70`, then `/opt/office-card-game/deploy.sh v7.69.70`. After activation independently verify public HTTPS readiness/health, exact migrations, service and immutable active path.

Authenticated Account/Profile remains POSTGRES; Guest MEMORY_ONLY / GUEST_LOCAL; Room and Matchmaking FILE_JSON_LOCAL. Ranked timer remains disabled. No schema migration, assets, ownership/economy changes or deployment architecture changes.

Production smoke must remain read-only: load shipped UI/assets against isolated local API data, without creating production profiles or Matches. No approved disposable production account was supplied. Known guest loaner-selection HTTP 400 and synthetic fixture feedback authorization responses remain unrelated; neither is fixed here.

Full audio, booster/reward Hero work, bespoke per-card effects and stronger global intensity remain deferred. Possible longer result-screen dwell remains observation only.
