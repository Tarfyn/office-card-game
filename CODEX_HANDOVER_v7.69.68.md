# Office Card Game v7.69.68 Handover

## VFX timing and readability

Release of the reviewed `codex/vfx-timing-readability` implementation from v7.69.67 (`d5be02b3ffe7c6ca462f008befadc0f02fea0817`). v7.69.68 was unused locally and on origin before preparation. The four reviewed VFX implementation files were hash-checked unchanged during release preparation. Release-only changes update authoritative package/lock/server versions, existing version assertions, and documentation. AGENTS.md remains version-independent.

`public/vfx-timing.js` is the semantic timing owner for queue steps, animation lifetimes, WAAPI and CSS variables. Shared `cubic-bezier(.25,.4,.5,1)` easing reaches approximately 76% travel at halfway, versus 93% with the previous curve. Anticipation -> Impact -> Recovery remains the presentation rule.

| Presentation | Accepted timing |
| --- | --- |
| Employee hand -> board | 360 ms travel + 80 ms settle |
| Support/System | 340 ms travel + 80 ms settle |
| Action | 220 ms staging + 180 ms resolve + 420 ms Archive = 820 ms |
| Attack commit | 300 ms, including restrained anticipation |
| Combat impact | 40 ms initial impact + dedicated 150 ms hold |
| Outcome / Archive | Separate 420 ms outcome confirmation, then 420 ms travel; mostly opaque departure |
| Direct REP | 260 ms response hold, 950 ms signed cue; approximately 700 ms sequence |
| Lethal | 920 ms scheduled; approximately 980 ms observed in release QA before result UI |

Actions use visual proxies, with no new gameplay zone. Authoritative state, SSE processing and phase progression remain immediate and independent of animation completion. V1 arrival, direction, impact, signed REP, resolution, Archive, phase and stable notifications remain. Notification semantic lifetimes are unchanged.

The explicit queue retains authoritative event ordering, room-scoped monotonic dedupe, related presentation groups, and cancellation/reconciliation. Six pending entries and a 2900 ms estimated budget include active work; the age threshold is 1600 ms. Two ordinary 1430 ms battles fit without compression. Dense bursts condense pending work into a 620 ms critical receipt retaining damage, Archive/destruction and result state; decorative motion yields first. The existing result safety ceiling is unchanged.

Reduced motion creates no spatial proxies: static cues last 500 ms, outcome holds 240 ms, Archive confirmation 180 ms and final confirmation 160 ms. Ordered impact, signed values and outcomes remain visible. Geometry uses captured viewport rectangles, with transform/opacity animation, a maximum of four inert proxies and no per-frame geometry reads. Opponent orientation and permitted full-card-back content remain safe. Empty hand space stays pointer-transparent while visible cards remain interactive.

No assets, dependency changes, schema migration, audio or persistence changes. Authenticated Account/Profile remains POSTGRES; Guest MEMORY_ONLY / GUEST_LOCAL; Room and Matchmaking FILE_JSON_LOCAL. Ranked timer remains disabled.

## Candidate checks

- `npm.cmd ci --offline --no-audit --no-fund`: passed.
- `npm.cmd run build`: passed.
- `npm.cmd test`: passed after completing escaped version assertions missed by the initial version replacement. No gameplay assertion was weakened.
- `npm.cmd run test:db:docker`: passed with `DB_INTEGRATION_OK`, covering migrations, auth, persistence/restart, authorization and concurrency. Expected negative-readiness cases emit `DATABASE_NOT_READY` before success.
- Direct `npm run test:db` was not run because `OCG_TEST_DATABASE_URL` was unset. Docker PostgreSQL ran the same integration suite successfully.
- Explicit `node test/match-vfx.test.mjs`: 26/26, including retained V1/Phase 2 and new timing coverage.
- i18n: 107/107 cards, 11/11 Match anchors, 33/33 result keys; artwork: 107/107, no missing/problem/orphan assets; cosmetics passed; security zero vulnerabilities; card-content 107 cards, no reported gaps.
- `git diff --check`: passed, including the new timing module.

## Release browser verification

Real Chromium through Playwright/CDP, against isolated local v7.69.68 servers. The Browser plugin was unavailable, so the existing Playwright fallback was used. Consecutive rendered frames were captured and inspected. These are emulated browser viewports, not physical-device/FPS benchmarks; every flow was not repeated at every size.

- 1920x1080, 3840x2160, 390x844 and 844x390: readable runtime timing/easing, one-time physical request, rerender survival, inert proxies, cleanup, hidden opponent full-card-back safety, and reduced-motion ordered visible outcomes passed. Five Employee/four Support slots per seat; zero Own/Opp pre-projection center-X difference and zero horizontal overflow.
- Actual server-authoritative Friendly fixture: Employee and System travel/settle at desktop; targeted Action at portrait; combat impact/hold/outcome/Archive at desktop; nonlethal and lethal direct REP at landscape. Result appeared approximately 980 ms after commit with zero proxies. Placement, Action stages, held impact, opaque Archive departure and signed damage were perceptually distinguishable.
- Two rapid Friendly battles at 4K retained separate ordered full-timing groups, with four total archives, no catch-up and no remaining proxy. A separate rendered dense component scenario retained three battles, three archives, -6 REP and result state in one 620 ms receipt, then reached idle.
- Full fresh Tutorial V2 (`GQF9QF`): mulligan, Employee, targeted Coffee Chat, Battle, card combat, direct REP, End and completion; desktop/portrait/landscape coverage, no hardlock.
- Isolated deterministic TRAINING bot fixture (`TIMINGTRAIN`): touch Employee and System placement, Please Hold placement/response, equal-power combat, Archive targeting and Escalated Ticket card return. A native touch at the exposed Support slot fell inside the hand container bounds and correctly hit the board slot. Action stage/resolve/Archive remained distinct.
- Offline/online reconnect, observer hydration, controller takeover and reload produced zero historical presentation steps/nodes; former controller became read-only. Resize cancellation and destroyed-attacker reconciliation passed.
- Resolution and feedback nodes retained identity through Inspector rerender, with exactly one resolution host. No uncaught JS errors or orphan presentation nodes were recorded.

Synthetic RoomService fixtures lack profile ownership metadata, so their playtest-feedback authorization can return the previously documented HTTP 403. This is unrelated to VFX; authorization is unchanged. Known guest loaner-selection HTTP 400 behavior remains outside scope and is not claimed fixed.

## Deployment verification

Deploy only through `/opt/office-card-game/deploy.sh --check v7.69.68`, followed by the same wrapper with `v7.69.68`. Require public HTTPS readiness/health to report this version, READY database, exact/current migrations, expected persistence modes, disabled Ranked timer, active service and the correct immutable release path. Record actual deployment results in the release report; this pre-deployment handover does not claim deployment success.

Production browser smoke must remain read-only: shipped Lobby/Deckbuilder/Match/VFX assets may be rendered with isolated localhost API data, without creating a production guest profile or Match. No approved disposable production account was supplied.

## Deferred

Phase 3 intensity, additional particles, hero moments, Executive/Booster spectacle, Department signatures, broad ambient effects, sound and external asset packs remain deferred. No additional assets are required.
