# Office Card Game v7.69.67 Handover

## VFX Phase 2 — physical card travel and presentation queue

Release of the reviewed `codex/vfx-phase-2` implementation from production v7.69.66 (`50231c648d0ab4fd5bd97d2bb2bac08639632cfe`). v7.69.67 was unused locally and on origin before release preparation. The accepted VFX implementation is unchanged during release preparation; only authoritative version owners, existing version assertions and release documentation are updated.

- Hand-to-field travel remains approximately 240 ms, followed by the V1 arrival cue. Systems and set Incidents share this path.
- Actions use a visual staging proxy, resolve feedback and approximately 280 ms Archive travel. No gameplay staging zone exists.
- Employee combat groups commit, impact, authoritative outcome, loser Archive and surviving-attacker return. Direct attacks retain board-half/REP input semantics, signed server REP damage and short final-result gating.
- `public/presentation-queue.js` orders explicit groups by authoritative event sequence. Stable room-scoped keys and a monotonic watermark deduplicate events independently of the truncated UI log.
- Pending presentation is bounded at roughly six entries / 2.6 seconds. Over-budget bursts and groups with more than four archives use critical outcome receipts. Decorative travel may skip; damage, destruction/Archive and result state remain represented.
- Initial hydration, reconnect, polling recovery, reload and observer/controller changes consume history without replay. Cancellation preserves dedupe. Related combat/Action steps remain together; unrelated notifications are not serialized behind the queue.
- Geometry uses captured viewport rectangles, responsive scaling and the current transforms. At most four inert proxies animate transform/opacity; no per-frame geometry reads or full-screen animation loop are introduced. Proxies copy only already-permitted rendered content and never move authoritative card DOM into enemy slots.
- Completion/cancellation removes proxies and restores suppressed cards. A destroyed attacker reconciles its proxy dimensions when departing the larger combat result card.
- Reduced motion skips spatial travel while retaining static source/destination feedback, signed REP, visible outcomes and ordered Archive feedback. V1 arrival/direction/impact/resolve/phase cues and stable notification hosts remain.
- Empty hand-container space remains pointer-transparent; visible cards remain interactive. Presentation proxies do not capture card, Support, targeting, Inspector or phase input.

No external assets, dependency changes or sound system. No schema migration. No change to combat, targeting, phase logic, Tutorial V2, Training, ownership, economy, progression, Deckbuilder, cosmetics, controller authority or persistence semantics. Ranked timer remains disabled. AGENTS.md remains version-independent.

Architecture: `docs/match-vfx.md`. Detailed implementation QA and its exact coverage: `docs/vfx-phase2-qa.md`.

## Candidate checks

The v7.69.67 candidate passed:

- `npm.cmd ci --offline --no-audit --no-fund`.
- `npm.cmd run build` and `npm.cmd test` (full historical/current suite, account checks and DB static checks).
- `npm.cmd run test:db:docker`, with `DB_INTEGRATION_OK` covering migrations, authentication, persistence/restart, authorization and concurrency.
- Explicit `node test/match-vfx.test.mjs`: 20/20, including retained V1 coverage; `node dist/test/match-presentation.test.js`: 5/5.
- `npm.cmd run ops:i18n-audit`, `ops:art-audit` (107/107, zero problems/orphans), `ops:cosmetic-audit`, `ops:security-audit` (zero vulnerabilities), and `ops:card-content-audit` (107 cards, no reported gaps).
- `git diff --check`.

Direct `npm run test:db` was unavailable because `OCG_TEST_DATABASE_URL` was unset. It was not reported as run. Docker PostgreSQL ran the same integration suite successfully. Its expected negative-readiness cases log `DATABASE_NOT_READY` before the final success marker.

## Browser release revalidation

Real Chromium / Playwright against isolated local v7.69.67 servers; no production Match mutation:

- All four target viewports (1920x1080, 3840x2160, 390x844, 844x390) passed the rendered-card component contracts for one-time travel, rerender survival, pointer transparency, hidden opponent full-back content and cleanup. Geometry measured zero horizontal overflow and zero corresponding Own/Opp slot-center X difference before projection.
- Normal Friendly fixture: Employee, System, targeted Coffee Chat staging/resolve, card battle, Archive, nonlethal direct damage and lethal direct damage. Result was absent at impact and appeared with zero remaining proxies.
- Two rapid Friendly battles produced separate `combat:38` and `combat:50` groups, about 1.3 seconds apart, with two archives per player and no orphan suppression.
- A complete fresh Tutorial: mulligan, Employee, Support/Action target confirmation, Battle, Employee combat, direct REP attack, End and Tutorial completion. Combat was rendered and inspected at 4K; completion and live geometry were checked in landscape. No hardlock or uncaught error.
- Touch-enabled Training at 390x844: visible hand Employee play, Out of Office placement through exposed empty hand space, normal decision handling, phase controls, and equal-power combat with both cards archived. The accepted implementation's prior Training response and Archive-targeting checks remain documented in the implementation QA record.
- Offline/online reconnect, a second read-only tab, controller takeover and reload produced zero historical proxy/impact/archive nodes; the prior tab became read-only.
- Reduced-motion, resize cancellation and destroyed-attacker proxy reconciliation were explicitly rerun in the browser and passed. No orphan proxies, extra final cards or horizontal overflow were observed. No uncaught JavaScript errors were recorded.

The seeded Friendly fixture returned one HTTP 403 when reading its playtest feedback because its synthetic seats were created without profile ownership metadata. This is a fixture authorization limitation, not a VFX/asset failure; the relevant authorization code is unchanged. The public production baseline's loopback readiness request also correctly rejected the non-public host; the public HTTPS readiness check returned v7.69.66 READY with exact/current PostgreSQL migrations.

## Known / deferred

- Guest loaner-selection HTTP 400 behavior is pre-existing and unchanged. It was not reproduced in the final monitored candidate flow; no fix is claimed.
- Phase 3 intensity, larger hero moments, a full sound system, bespoke per-card effects, external sprite packs and broad ambient effects remain deferred.
- No approved disposable production Alpha account was supplied. Production smoke must remain read-only; rendered Lobby/Deckbuilder/Match asset fixtures must be identified as fixtures and must not create production guest/profile/match state.

## Deployment and persistence contract

Deploy only through `/opt/office-card-game/deploy.sh --check v7.69.67`, followed by `/opt/office-card-game/deploy.sh v7.69.67` after preflight passes. Do not bypass helper or migration checks. No backend cutover or migration is added by this release.

Post-deploy acceptance requires the expected version, HTTP 200 READY, PostgreSQL reachable, exact/current migrations, healthy service and the matching immutable active release path. Authenticated Account/Profile remains POSTGRES; Guest remains MEMORY_ONLY / GUEST_LOCAL; Room and Matchmaking remain FILE_JSON_LOCAL. `timerActive:false` remains required. Deployment outcome and final commit/path are recorded in the release report after the wrapper completes.
