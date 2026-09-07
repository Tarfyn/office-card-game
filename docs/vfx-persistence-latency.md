# Visual persistence and latency diagnostics

Implementation baseline: v7.69.71 / `e0f086756d793ac95b708bcacf055bba9894d59a`.
Implementation branch: `codex/vfx-persistence-latency`. The implementation stage made no version bump, release commit, tag, push, deployment or production mutation. Release preparation is recorded in [CODEX_HANDOVER_v7.69.72.md](../CODEX_HANDOVER_v7.69.72.md). No new assets or migration.

## Visual ownership

Lethal impact layers previously inherited the remaining 440 ms critical window and were forcibly removed at result completion. Nonlethal outcome leases were already non-blocking, but expired at 500/560/550 ms. The fix extends visual cleanup lifetimes, not travel or queue steps.

| State | Previous visible lifetime | New visible lifetime | Critical behavior |
| --- | ---: | ---: | --- |
| Winner / loser | 500 ms | 800 ms | Previous 500 ms recognition floor preserved |
| DRAW / both archived | 560 ms | 900 ms | Previous 560 ms floor; no winner coloration |
| Archive stamp | 600 ms | 900 ms | Departure unchanged; stamp overlaps travel |
| Rejection | 600 ms | 900 ms | Immediate onset; no response wait |
| Direct REP panel | 550 ms | 800 ms | Previous 550 ms floor; signed cue remains 950 ms |
| Lethal impact signature | 440 ms | 1000 ms from impact | Panel 440 ms; total critical schedule 920 ms |
| Executive / other ENGINE | 850 ms | 850 ms | Already visibly readable; no global extension |

The warning still starts on the authoritative commit. Its envelope can now span 1480 ms (480 ms approach plus 1000 ms impact tail). KPI/zero/paper still start only at impact. These layers evolve and fade, rather than delaying their start. The existing active-node timer is renewed at impact; no second residual queue or uncontrolled timer chain is introduced.

`combatOutcomePersistence` selects total visual lifetime, while `combatOutcomeDwell` retains the previous recognition floor/critical lethal window. One keyed outcome lease remains. Catch-up or new targeting may discard an expired critical tail; critical feedback is retained. Rerenders cannot restart the lease. Archive snapshots depart at the same time, with result-card faces hidden as proxies move and stamps handed off without duplicate faces.

Result completion clears the critical panel and may preserve the finite lethal signature. The signature remains below the opaque result card and pointer-transparent. The surrounding result backdrop temporarily omits blur while lethal is present, allowing the underlying warning/KPI to remain recognizable. No result dwell, control, text or modal timing changes. Hard-ceiling cancellation, reset, room change, hidden-document and geometry reconciliation still remove stale effects.

Reduced motion retains 800/900 ms static nonlethal recognition and a 1000 ms opacity-only lethal tail; critical static lethal remains 350 ms. No travel, particle drift or shake is added. Caps are unchanged: ENGINE 6, HERO 12, global particles 24, enhanced roots 3, enhanced nodes 128, physical proxies 4. A measured lethal used one root/18 descendants/12 particles; reduced motion used one root/6 descendants/zero particles. There is no extra animation loop or per-frame geometry read.

All pre-existing timing/easing values are unchanged, including hand 560+80, Support 520+80, Action 420/200/620, attack 480, impact 40+240, Archive 620, REP 260/950 and Executive 850 ms. Queue source is unchanged: six entries, 2900 ms budget, 1600 ms age threshold.

## Diagnostic harness

The harness is test-only: `test/vfx-latency-loader.mjs` instruments a disposable loopback server via Node's loader; `test/vfx-latency.browser.mjs` instruments browser responses through Playwright routing. Neither is imported by the shipped server or client. No normal-player diagnostics, credentials, tokens or card data are logged. Recorded server metadata contains only an intent correlation ID, timestamps and acceptance boolean.

After building, start a disposable fixture server with:

```text
node --loader ./test/vfx-latency-loader.mjs server/server.mjs --port=8790 --runtime-dir=<disposable-local-fixture-directory>
```

Call `instrumentLatency(context)` before navigating; call `calibrateClock(page)` after loading. The loader checks every source anchor and refuses to run if an anchor becomes ambiguous. The browser records at most 1024 entries. Seven loopback clock probes estimate offset from the fastest midpoint sample; cross-process spans carry half-RTT uncertainty (about ±2.8 ms here). Browser/server stage durations use their own monotonic performance clocks. Sub-millisecond negative delivery estimates are clock uncertainty, not negative transport time.

Stages: T0 final actionable input (`sendIntent`); T1 POST submission; T2 server request receipt and engine acceptance; T3 notification/SSE publication; T4 POST JSON or SSE delivery; T5 event consumption and queue length; T6 first connected acknowledgement paint opportunity; T7 first proxy paint opportunity; T8 impact step; T9 outcome creation/paint; T10 critical entry completion. Placement has settle instead of a combat impact/outcome. Rejected actions have no accepted outcome/emission/motion; absent stages stay unavailable. An acknowledgement may correctly precede T4: it is a source-only intent cue, never successful placement/damage.

## Measurements

Fresh real local Friendly flows, milliseconds, rounded. Acknowledgement/first motion use requestAnimationFrame paint opportunities, not hardware display latency. These are individual Chromium samples, not production percentile claims.

| Flow | Input→request | Request→accepted | Accepted→emit | Emit→received | Received→ack | Ack→motion | Input→ack | Input→authority | Authority→motion |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Employee / Executive | 20.4 | 9.6 | 7.2 | ~0 | -26.0 | 61.7 | 11.4 | 37.4 | 35.7 |
| Support/System | 16.5 | 8.6 | 7.7 | ~0 | -19.9 | 41.7 | 13.1 | 33.0 | 21.8 |
| Targeted Action | 15.7 | 10.3 | 7.1 | ~0 | -20.4 | 36.7 | 12.9 | 33.3 | 16.3 |
| Card attack | 18.3 | 9.4 | 7.3 | ~0 | -21.5 | 39.6 | 13.4 | 34.9 | 18.1 |
| Direct | 16.2 | 7.7 | 6.8 | ~0 | -17.4 | 29.2 | 13.3 | 30.7 | 11.8 |
| Lethal | 33.6 | 9.1 | 8.1 | ~0 | -19.8 | 42.6 | 30.8 | 50.6 | 22.8 |
| Controlled delayed Employee | 16.0 | 4.8 | 7.2 | 200.4 | -215.3 | 233.3 | 13.0 | 228.3 | 18.0 |

Local POST response latency median was about 33.5 ms; slowest sampled was 37.9 ms. Client event consumption was 0–0.1 ms after delivery. No pending group preceded a normal sampled action. Entry creation to first step was 8.7–14.5 ms, including render/geometry preparation; first step to proxy paint was 2.8–21.8 ms. Engine acceptance itself followed request receipt by about 1.6–3.1 ms. Acceptance-to-publication includes existing lifecycle/persistence/projection work (about 7–8 ms), not VFX scheduling.

The controlled case buffered SSE callbacks by 200 ms, delayed POST delivery by 250 ms and delayed post-submit state reads by 500 ms. Immediate acknowledgement remained 13 ms; motion began around 246 ms after input, before recovery readback completed around 817 ms. POST response latency was 267 ms. This attributes that controlled delay to delivery, not presentation. A server-rejected slot kept the System in hand with zero board copy/proxy/motion; no success was speculated.

Two queued combat groups measured 11 ms to first commit and 1463 ms to second commit, with no catch-up. This is real semantic contention behind the existing first combat/Archive sequence; residual tails do not add to it. An expired critical REP tail was discarded and a dense critical receipt began in 0.9 ms. Catch-up values were not changed.

No production network measurement was performed. The local evidence cannot attribute a user's production lag to the VPS or internet. It demonstrates that transport delay and existing semantic queue contention are distinguishable from acknowledgement/render time. Polling was not the delivery source for these measured actions; accepted presentation did not wait for recovery readback.

## QA

- All five outcomes and lethal residual/result coexistence passed at 1920x1080, 3840x2160, 390x844 and 844x390. Winner/loser measured 801–811 ms, DRAW 902–909 ms, REP 802–810 ms, lethal panel 442–452 ms and lethal impact tail 1003–1012 ms. Archive began during outcome visibility. Live-frame screenshots confirmed readable mobile DRAW/stamps and lethal KPI/background under unobstructed result controls.
- Reduced-motion outcomes, no-particle static Hero, reset cleanup, history dedupe, catch-up tail disposal, immediate response, hidden opponent backs, mobile hand pointer behavior and non-blocking Executive residual passed. Existing response/Hero browser assertions were intentionally updated from “remove at result” to “finite residue after critical completion”; timing/authority tests were not weakened.
- Real Training: touch System/Incident/Employee, Please Hold response, combat draw/both Archive, Escalated Ticket Archive target/card return and Inspector passed. Reconnect, observer takeover and reload produced no historical presentation nodes.
- Fresh Tutorial V2 `N5X2KM` completed the full path, including combat, direct attack and completion, without hardlock. Friendly PHYSICAL covered Employee/Executive, System, targeted Action, attacker win, direct and lethal. No uncaught JS errors observed.
- Offline install, build, full suite, focused VFX tests (46/46), i18n/art/cosmetic/security/card-content audits passed. Docker PostgreSQL reported `DB_INTEGRATION_OK` for the same integration suite. Direct DB testing was unavailable because `OCG_TEST_DATABASE_URL` was unset.

Executive and other ENGINE signatures were already perceptible and remain unchanged at 850 ms. No blanket intensity/lifetime increase. Post-result-screen dwell is still a separate observation. Server authority, persistence modes, Ranked timer (disabled), ownership, progression and deployment architecture remain unchanged.
