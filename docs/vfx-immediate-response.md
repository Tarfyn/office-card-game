# Immediate response + slower visible motion

Implementation baseline: v7.69.69 / `55768072df42015d64561534cf8cc176ab22c237`. Branch `codex/vfx-immediate-response`. The implementation stage was local-only. The reviewed implementation is now prepared for the separately authorized v7.69.70 release; see [release handover](../CODEX_HANDOVER_v7.69.70.md). No asset/dependency addition or schema migration.

## Measured audit before editing

Browser-only instrumentation recorded input entry (T0), authoritative event intake, queue preparation (T1), first acknowledgement/proxy paint opportunity (T2), WAAPI travel start (T3), impact (T4), outcome/resolve (T5), and queue completion (T6). These are Chromium performance timestamps and requestAnimationFrame paint opportunities, not compositor photon measurements. Consecutive rendered screenshots independently verify the motion. The instrumented application ran against isolated local RoomService fixtures, not production.

The confirmed transport-related dead time was in `sendIntent`: after accepting the POST view and enqueuing its events, it awaited another `refreshState(false)` before its final render. Working SSE often rendered sooner and hid the problem. With SSE blocked and a controlled 150 ms delay on local state GETs, input-to-proxy paint was 382 ms. The event had arrived at 200 ms, leaving 182 ms of avoidable event-to-paint waiting. This is a controlled reproduction, not a claim about production network latency. The safety preflight GET and post-mutation recovery read remain; the accepted view now renders before waiting for the latter.

No intentional travel animation-delay was found. Snapshot/DOM work added approximately 13–30 ms between event intake and proxy paint in these samples. Normal local SSE onset was 48–69 ms. Ordered previous presentations can still defer a later physical group; that wait preserves meaningful outcome order. A safe source acknowledgement now makes that pending submission visible immediately.

The other problems were internal rhythm: 420 ms serialized outcome dwell before Archive; a separate attacker-return queue wait; 360/340/220/300/420 ms physical travel durations; and Hero keyframes completing their main evolution early. Lethal root lifetime was already 620 ms, not merely 100 ms, but its KPI trace reached its final shape at 38% of that lifetime. Executive lasted 760 ms, while its sweep was already invisible at 70%. Parent lifetime alone overstated visible motion. Legacy combat animation delays exist in CSS but are disabled under `.queued-combat`; they do not gate this presentation path.

## Architecture and authority

`acknowledge(intent)` draws an immediate, bounded source outline after the existing SENDING render. It does not move a card to a target, show success, calculate damage or change state. It has no animation-delay. The existing active-effect owner cleans it up on matching presentation, completion, rejection, reset or expiry. A rejected local fixture retained the source card in hand with no board card/proxy. Submission still uses authoritative state version, idempotent intent IDs, controller validation and recovery reads.

Accepted view presentation no longer waits for post-response readback. A submitted target interaction is no longer treated as an active target-selection gesture that should cancel its own presentation. Unsubmitted/new targeting still takes precedence over old decorative motion. Initial hydration and reconnect watermark behavior are unchanged.

Critical groups remain serialized and authoritative. Return animation overlaps direct impact hold, or a surviving combat attacker's Archive window. An unresolved attack declaration still has its own short return because no impact window exists. Combat result/stamps appear at impact and remain visible through the hold and brief outcome handoff before Archive. An independent Archive shows its outcome immediately, then departs after 40 ms. Action resolution retains a distinct 200 ms emphasis before departure.

Executive and ENGINE effects use the existing bounded active-node lifecycle for 850 ms nonblocking residuals. They do not contribute to queue busy/cost/result gates. A subsequent presentation can start while an Executive residual remains. New targeting or dense catch-up drops noncritical residuals first; critical receipts retain confirmed damage, Archive and lethal state. There is no new animation timer chain, frame loop or geometry loop.

## Timing and easing

| Motion / beat | Before | After |
| --- | --- | --- |
| Employee | 360 + 80 ms | 560 + 80 ms |
| Support/System/Incident | 340 + 80 ms | 520 + 80 ms |
| Action stage / resolve / Archive | 220 / 180 / 420 ms | 420 / 200 / 620 ms |
| Attack approach | 300 ms | 480 ms |
| Initial impact + dedicated hold | 40 + 150 ms | 40 + 240 ms |
| Serial outcome handoff | 420 ms | 40 ms; outcome already visible during impact |
| Archive travel | 420 ms | 620 ms, mostly opaque departure |
| Direct REP hold / signed cue | 260 / 950 ms | unchanged |
| Surviving return | 100 ms serial | 100 ms overlapping; standalone declaration retains serial return |
| Lethal final step | 220 ms | 140 ms; total direct-lethal remains 920 ms; isolated/Tutorial result remains 220 ms |
| Executive / ENGINE residual | 760 ms | 850 ms, nonblocking |

Travel easing is `cubic-bezier(.3,.15,.65,.85)`: browser-sampled halfway progress changed from 75.9% to 52.4%. Feedback and signature easing have separate semantic owners. Recognition starts visible; evolution/decay continues rather than hiding behind animation-delay. KPI now traces through 82% of its post-impact decay; the prism sweeps across its whole duration.

Lethal warning now starts with the authoritative commit, approximately 54 ms after input in the measured sample versus the old whole-Hero onset at 352 ms. Only the warning is primed: KPI, zero accent and paper remain hidden until impact, then activate together. This makes the corporate warning visible across most of the unchanged 920 ms sequence without predicting an unconfirmed result. The post-impact KPI/paper window is approximately 440 ms; the longer Hero visibility includes the earlier warning, not a claim that all layers run for 920 ms. Result appearance was approximately 979 ms after commit in the recorded live fixture; no extra result gate or result-screen dwell was added.

Six entries, 2900 ms budget and 1600 ms age threshold remain unchanged. A normal combat is 1420 ms (previously 1430); two fit at 2840 ms. An Action is 1240 ms. Dense bursts retain the 620 ms critical receipt. Reduced motion skips spatial proxies, keeps static signatures, caps impact hold at the separate 150 ms static token and Archive at 180 ms. It does not wait for the new long spatial durations.

## Before/after browser measurements

Milliseconds, rounded; individual samples establish the exercised path, not statistical latency guarantees. First response means a card-source acknowledgement/proxy, not the generic SENDING banner which already existed. Main completion excludes nonblocking residual decoration. Measurements intentionally distinguish visible acknowledgement from authoritative travel.

| Flow | Input → first response, before → after | First response → main completion, before → after | Event → travel paint, before → after |
| --- | --- | --- | --- |
| Employee / Executive card | 67 → 14 | 434 → 690 | 29 → 19 |
| Support/System | 49 → 7 | 437 → 639 | 14 → 13 |
| Targeted Action | 69 → 18 | 826 → 1314 | 18 → 26 |
| Employee combat | 61 → 13 | 1472 → 1503 | 26 → 30 |
| Direct attack | 48 → 11 | 723 → 842 | 15 → 19 |
| Lethal attack | 49 → 11 | 953 → 997 | 13 → 19 |
| Buffered-SSE reproduction | 382 → 11 | 459 → 855 | 182 → 25 |

Buffered input-to-authoritative travel is now 220 ms, not 11 ms; 11 ms is the safe source acknowledgement. In normal local samples actual travel starts at 46–71 ms. Mobile native touch Support acknowledged at 16 ms, with authoritative proxy paint at 94 ms in that sample.

Archive is an outcome rather than separate input: in the recorded combat, Archive departure moved from 1000 ms after attack input to 879 ms, while travel grew from 420 to 620 ms. Outcome first appeared at approximately 568 ms before, versus 533 ms after because it now shares the impact envelope. Independent Archive outcome remains immediate after queue consumption, with 40 ms to departure instead of 420 ms. Action Archive occurs later in wall time because staging itself is deliberately slower; it follows the resolve beat without an extra wait.

Executive entry uses the Employee acknowledgement numbers. Its destination signature starts later (417 → 623 ms after input) because the preceding physical journey is slower; this is visible travel, not dead time. Its sweep/decay lasts 850 ms beyond arrival without blocking subsequent input or presentation.

## Verification and limits

- Offline install, build, full suite and focused VFX tests passed. Focused suite: 39/39; new browser contracts test synchronous acknowledgement/cancellation, no travel delay, residual overlap, natural cleanup, dedupe, dense retirement and staged lethal envelope.
- Direct DB testing unavailable: `OCG_TEST_DATABASE_URL` unset. Docker PostgreSQL ran the same integration suite successfully (`DB_INTEGRATION_OK`). i18n, artwork, cosmetics, security and card-content audits passed; security found zero vulnerabilities. No backend, version or migration changes.
- 1920x1080, 3840x2160, 390x844, 844x390: actual browser DOM/CSS/modules tested for immediate acknowledgement, slower motion/easing, normal/reduced signatures, queue idle, residual cleanup and pointers. Zero horizontal overflow; Own/Opp 5 Employee / 4 Support center-X symmetry exact. These are emulated viewports, not physical-device performance benchmarks.
- Authoritative Friendly fixture: Executive Employee, Standard System, targeted Action, combat/Archive, nonlethal direct and lethal. Consecutive frames show followable travel and extended prism evolution; warning begins during approach, KPI/paper at impact, result after cleanup. No additional assets or intensity increase.
- Fresh full Tutorial V2 EB3438 completed without hardlock. TRAINING TIMINGTRAIN exercised native-touch placement, Please Hold response, combat tie, Archive targeting and Escalated Ticket return. Support tap inside empty hand bounds reached the board slot.
- Offline/online reconnect, observer/controller takeover, reload and ended-Match hydration created no historical proxy/signature entries. Hidden opponent back, one-shot travel, rerender identity, resize cancellation and destroyed-attacker reconciliation passed. A polling-based transient-overlay test was changed to frame sampling so it cannot skip the 320 ms envelope; its visibility/geometry/cleanup assertions remain.
- Budgets unchanged: ENGINE 6 / HERO 12 requested particles; global 24; 3 enhanced roots; 128 enhanced nodes; 4 physical proxies. Stress sample 3 roots / 18 particles / 39 nodes. No new listeners or unbounded animation handles.
- A browser setup navigation hit connection-buffer exhaustion from accumulated old QA contexts, producing a harness error-page localStorage error. Old task contexts were closed; loaded-app reruns recorded no uncaught JS errors. Known guest loaner 400 and synthetic fixture feedback authorization behavior remain unrelated and unfixed.

No release handover is created. Result-screen dwell, sound, booster/reward spectacle, bespoke per-card effects and stronger global intensity remain outside scope.
