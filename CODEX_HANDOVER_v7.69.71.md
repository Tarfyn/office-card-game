# v7.69.71 — VFX outcome readability

Release candidate from `codex/vfx-outcome-dwell`, based on v7.69.70 / `957d6f2277d8c753adab9dd5eb3146fd306d499e`. Version v7.69.71 was unused locally and on origin before preparation. This releases the reviewed implementation without further VFX tuning. Package, lockfile, server and active version assertions are synchronized. AGENTS.md remains version-independent.

## Root cause and outcomes

The combat host previously cleared at Archive departure, about 320 ms after impact. Draw inherited that short lifetime and lacked an explicit result label. Archive/rejection opacity weakened recognition during handoff. Direct/lethal panels cleared after 300 ms while surrounding feedback continued. This pass separates outcome dwell from motion, impact and decorative residuals; it does not reopen response latency or travel tuning.

| Outcome | Previous | Released |
| --- | ---: | ---: |
| Winner / loser | 320 ms | 500 ms |
| Draw / both archived | 320 ms | 560 ms, localized DRAW |
| Archive stamp | Short/transparent handoff | Immediate 600 ms readable envelope |
| Rejection | Initially transparent envelope | Immediate 600 ms readable envelope |
| Direct REP panel | 300 ms | 550 ms |
| Lethal panel | 300 ms | 440 ms inside the existing 920 ms schedule |
| Signed REP | 950 ms | 950 ms, unchanged |

DRAW reuses `result.draw` and the authoritative no-winner/both-destroyed result. It does not infer outcomes from Power and adds no modal or winner coloration to a draw.

## Non-blocking ownership and handoff

One bounded outcome lease owns the stable combat host. It starts once at impact and may outlive queue completion. Winner/loser marks remain as Archive starts and survivor return proceeds. Departing card faces are hidden in the result host after their geometry/content is captured, preventing duplicate faces while proxies travel. Stamps hand off continuously to the V1 receipt. Immediate stamp opacity remains full through most of its envelope.

No new serial waits, queue duration or result delay are added. Identity checks prevent stale callbacks clearing newer outcomes; an entry remembers presentation even after expiry. Reset, reconciliation and result completion clean up the lease. Catch-up may remove decoration while retaining the bounded critical prior result. Critical outcome clears before result UI.

All pre-existing movement/easing tokens remain unchanged: hand 560+80 ms; Support/System 520+80; Action 420/200/620; attack 480; impact 40+240; Archive 620; REP hold/cue 260/950; Executive 850; direct-lethal schedule 920. Immediate acknowledgement and recovery/readback behavior are unchanged. The queue remains six entries, 2900 ms budget and 1600 ms age threshold.

Reduced motion uses readable static winner/loser/draw and Archive/rejection outcomes without spatial travel or added waits. Its existing shortened lethal critical window remains 350 ms. Hidden information, canonical Executive detection, notifications and pointer transparency are preserved. Limits remain ENGINE 6 particles, HERO 12, global 24, 3 enhanced roots, 128 enhanced nodes and 4 physical proxies. No new assets, particle families or schema migrations.

## Final release verification

- Offline install (`npm.cmd ci --offline --no-audit --no-fund`), build and full `npm.cmd test`: passed.
- Explicit `node test/match-vfx.test.mjs`: 43/43 passed.
- Direct DB testing was not run because `OCG_TEST_DATABASE_URL` was unset. No direct DB success is claimed.
- `npm.cmd run test:db:docker`: passed with `DB_INTEGRATION_OK`; the same integration suite covered migrations, auth, persistence/restart, authorization and concurrency. Expected negative readiness cases preceded success.
- i18n, artwork, cosmetic, security and card-content audits passed. Artwork remains 107/107; security reported zero vulnerabilities.
- Final whitespace and reviewed-file hash checks are performed before the release commit.

Fresh release browser contracts used actual Match DOM and canonical combat rendering at 1920x1080, 3840x2160, 390x844 and 844x390. Attacker win, defender win, both-archived draw, direct nonlethal and direct lethal passed at every viewport. These are emulated Chromium viewports, not physical-device benchmarks. Playwright fallback was used because the Browser plugin was unavailable.

| Viewport | Attacker win | Defender win | Draw | Direct | Lethal |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1920x1080 | 508 ms | 501 ms | 561 ms | 553 ms | 445 ms |
| 3840x2160 | 501 ms | 502 ms | 564 ms | 553 ms | 449 ms |
| 390x844 | 503 ms | 503 ms | 562 ms | 552 ms | 445 ms |
| 844x390 | 513 ms | 501 ms | 565 ms | 556 ms | 442 ms |

Measurements run from visible impact/outcome onset to clear. Archive began before outcome clear, so recognition overlaps motion. Fresh reduced-motion cases, 600 ms stamp/rejection opacity, dense catch-up retention, next-entry overlap, immediate acknowledgement, Executive residual cleanup, rerender/history dedupe, hidden opponent backs and mobile hand pointer contracts passed. A fresh acknowledgement sample was about 10 ms, with zero travel animation delay and unchanged 560 ms travel. No orphan nodes, uncaught JS errors or horizontal overflow were observed. Mobile DRAW and desktop winner/Archive overlap were visually inspected in captured live frames.

The reviewed implementation's real server flows remain applicable because the reviewed runtime/test files are unchanged during release preparation: Friendly PHYSICAL covered Executive Employee, System, targeted Action, attacker win, nonlethal and lethal direct attacks; Training TIMINGTRAIN covered touch Support, Incident response, draw, Archive targeting, card return and Inspector; fresh Tutorial V2 5UZHJN completed. Reconnect, observer takeover and reload produced no historical replay. Real-flow acknowledgements measured roughly 9–17 ms. These full flows were implementation QA, distinct from the fresh release matrix above.

## Deployment and scope

This candidate handover does not claim activation. Deploy only through `/opt/office-card-game/deploy.sh --check v7.69.71`, then `/opt/office-card-game/deploy.sh v7.69.71`. Independently verify public readiness/health, exact migrations, active service and immutable release path after activation.

Account/Profile remains POSTGRES, Guest MEMORY_ONLY / GUEST_LOCAL, Room and Matchmaking FILE_JSON_LOCAL. Ranked timer remains disabled. No economy, ownership, gameplay semantics, recovery architecture or deployment hardening changes.

Production smoke must use read-only shipped UI/assets with isolated local API data; no approved disposable production account was supplied. Known guest loaner-selection HTTP 400 and synthetic-fixture authorization responses are unrelated and are not fixed here.

Post-result-screen dwell remains unchanged and is a separate observation. Sound, booster/reward Hero work, bespoke effects and stronger global intensity remain deferred.
