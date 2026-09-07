# v7.69.72 — VFX persistence and latency diagnostics

Release candidate from `codex/vfx-persistence-latency`, based on v7.69.71 / `e0f086756d793ac95b708bcacf055bba9894d59a`. Version v7.69.72 was unused locally and on origin. This releases the reviewed implementation as-is; 13 reviewed runtime/test SHA-256 hashes matched after release preparation. Package, lockfile, server and authoritative version assertions are synchronized. AGENTS.md remains version-independent.

## Visual persistence and critical timing

| State | Released visual lifetime |
| --- | ---: |
| Winner / loser | 800 ms |
| Localized DRAW / both archived | 900 ms |
| Archive / rejection marks | Immediate 900 ms envelope |
| Direct REP result | 800 ms; signed cue remains 950 ms |
| Lethal impact signature | 1000 ms from impact |
| Executive / other ENGINE signatures | 850 ms, unchanged |

Longer visibility is a cleanup lifetime only. The previous recognition floors remain; critical lethal panel is 440 ms and the complete direct-lethal schedule remains 920 ms. Hand 560+80, Support 520+80, Action 420/200/620, attack 480, impact 40+240, Archive 620 and REP hold/cue 260/950 ms are unchanged. Existing easing, acknowledgement and recovery/readback behavior are unchanged.

One keyed outcome lease and the existing bounded signature timers own residuals. Winner/loser/DRAW remain while Archive starts; departing faces transfer to existing proxies without duplication. Subsequent eligible critical entries can begin while residuals remain. Targeting/catch-up retire decorative tails first, after the retained critical recognition floor. There is no second residual queue or extra serialized wait.

Lethal warning starts during the authoritative approach; KPI/zero/paper activate at impact. The warning envelope may span 1480 ms while the impact tail runs for 1000 ms. Critical completion opens result UI on the unchanged schedule. The residual stays below the opaque result card; the surrounding backdrop temporarily omits blur so the signature remains perceptible. Result controls remain usable. Post-result-screen dwell is unchanged.

Reduced motion keeps static outcomes and 900 ms marks with no spatial travel, particle drift or added queue wait. Its critical lethal window remains shortened, while a static opacity tail can remain. Reset, room changes, geometry reconciliation and hidden-document cleanup remove stale residuals. Dedupe/history protection prevents replay.

Caps remain ENGINE 6, HERO 12, global particles 24, enhanced roots 3, enhanced nodes 128 and physical proxies 4. No new assets, schema migration or VFX families.

## Latency findings — local measurements only

The test-only loader and browser harness record input, request, server receipt/acceptance, publication, delivery, consumption, acknowledgement, motion, impact, outcome paint and critical completion. Normal production execution imports neither diagnostic harness and exposes no diagnostic UI. Clock calibration supplies approximately ±2.8 ms uncertainty for cross-process samples.

Reviewed normal local measurements: input to request 15.7–33.6 ms; request to server acceptance 7.7–10.3 ms; acceptance to publication 6.8–8.1 ms; publication to delivery approximately zero within clock uncertainty. Acknowledgement was 11–13 ms in most flows, with one lethal sample around 31 ms. POST latency median was approximately 33.5 ms; slowest sampled 37.9 ms.

Controlled delivery delay retained acknowledgement around 13 ms, with authority arriving around 228 ms and motion around 246 ms. Accepted presentation started before delayed recovery readback completed. Server-rejected placement retained its card in hand and created no successful travel. SSE delivered the measured normal actions; polling was not their delivery source. No new artificial presentation hold was found.

These are reviewed implementation measurements, not production guarantees or fresh production diagnostics. Production network/VPS latency remains unmeasured. No release-prep tuning was based on these samples.

Two queued combats produced approximately 1.46 seconds of semantic waiting for the second group. This is an observation/future investigation candidate. Queue serialization is unchanged in this release and must not be conflated with decorative persistence. Catch-up remains six entries, 2900 ms budget and 1600 ms age threshold.

## Final candidate verification

- `npm.cmd ci --offline --no-audit --no-fund`, build and full `npm.cmd test`: passed.
- Explicit `node test/match-vfx.test.mjs`: 46/46 passed.
- Direct DB testing was unavailable because `OCG_TEST_DATABASE_URL` was unset; no success is claimed.
- `npm.cmd run test:db:docker`: passed with `DB_INTEGRATION_OK`, running the same migrations/auth/persistence/restart/authorization/concurrency integration suite. Negative readiness cases were expected.
- i18n, artwork, cosmetics, security and card-content audits passed. Artwork 107/107; security zero vulnerabilities.
- Whitespace and final intended-diff checks are completed before commit.

Fresh release browser QA used actual Match DOM and canonical outcome rendering through Chromium/Playwright fallback (Browser plugin unavailable). All five cases—attacker win, defender win, both-archived DRAW, direct nonlethal and lethal—passed at 1920x1080, 3840x2160, 390x844 and 844x390. Executive entry/residual and lethal/result coexistence passed at each viewport. These are emulated viewports, not device performance guarantees.

Observed panels were approximately 802–811 ms winner/loser, 901–903 ms DRAW, 800–815 ms REP and 441–451 ms lethal; lethal impact residue was 1003–1014 ms. Archive overlapped the result and no extra queue delay was introduced. The mobile lethal/result frame was visually inspected: KPI/warning remained visible behind the opaque result card, with pointer-transparent VFX and usable result control.

Fresh reduced-motion cases, static 900 ms stamps, reset/history cleanup, catch-up tail disposal, hidden full opponent backs, physical proxy cleanup and mobile hand pointer contracts passed. Fresh static lethal used zero particles; ordinary lethal used one root/18 descendants/12 particles and no proxies after critical completion. No uncaught JS errors, stale residuals or horizontal overflow observed across the four viewports.

The reviewed runtime files remain unchanged, so the implementation's real-flow QA remains applicable: Friendly PHYSICAL covered Employee/Executive, System, targeted Action, combat, direct and lethal; Training covered touch Support, response, combat DRAW, Archive targeting, return and Inspector; fresh Tutorial N5X2KM completed. Reconnect, observer takeover and reload produced no replay. These were implementation-stage full flows, distinct from the fresh release matrix above.

## Deployment contract and scope

This candidate handover does not claim activation. Use only `/opt/office-card-game/deploy.sh --check v7.69.72`, then `/opt/office-card-game/deploy.sh v7.69.72`. Independently verify HTTP 200 readiness/health, exact migrations, active service and immutable release path after activation.

Account/Profile remains POSTGRES; Guest MEMORY_ONLY / GUEST_LOCAL; Room and Matchmaking FILE_JSON_LOCAL. Ranked timer stays disabled. No gameplay, ownership, progression, persistence or hardened deployment architecture changes.

Production smoke must remain read-only with shipped UI/assets and isolated local API data. No approved disposable production account was supplied; do not create production profiles or Matches. Known guest loaner-selection HTTP 400 behavior remains unrelated. Production latency is not measured by this smoke. Result-screen dwell and rapid-combat serialization remain separate future observations.
