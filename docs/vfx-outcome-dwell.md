# Outcome dwell — implementation design

Baseline: v7.69.70 / `957d6f2277d8c753adab9dd5eb3146fd306d499e`.
Implementation branch: `codex/vfx-outcome-dwell`. The implementation stage made no version bump, release, tag, push, deployment or production mutation. Release preparation is recorded in [CODEX_HANDOVER_v7.69.71.md](../CODEX_HANDOVER_v7.69.71.md). No new assets or schema change.

## Diagnosis

Motion, impact, result dwell and decorative residual are different lifetimes. Before this pass, `runStep(archive/return)` and `finishEntry` cleared the combat host. The nominal winner/loser/draw window was only 40 ms impact + 240 ms impact hold + 40 ms handoff = 320 ms. Direct panels cleared after 40 + 260 = 300 ms, even though signed REP already lasted 950 ms and lethal still had a final gate remaining.

Fresh rendered before samples were 331 ms attacker win, 340 ms defender win, 334 ms draw, 305 ms nonlethal direct and 311 ms lethal panel. These are local Chromium samples, not production latency statistics. No additional start-latency or motion problem was diagnosed.

## Ownership and overlap

`match-vfx.js` owns one bounded outcome lease for the existing stable combat host. It starts at impact, once per prepared authoritative entry, and is not charged to queue duration. Identity checks prevent old timer callbacks clearing newer results. The entry remembers that its outcome was shown, even after expiry or a stalled frame. Reset, finish, visibility/geometry reconciliation and result completion cancel the lease. Room/event dedupe remains owned by the unchanged queue.

Archive snapshots the visible result cards at the original departure time. Departing faces become hidden in the result host while their existing proxies travel. Winner emphasis, side labels and Archive stamps remain. The stamp then hands off to the V1 receipt without an empty interval or duplicate label. The draw label reuses localized `result.draw` and requires the authoritative no-winner/both-destroyed outcome; Power is never compared locally.

A subsequent lightweight entry or dense receipt can begin while a critical prior result is still readable. Catch-up continues dropping decorative signatures; it does not prematurely erase the prior bounded result. There is at most one combat host and one outcome timer, no additional card proxies/particles and no new animation loop or per-frame geometry reads. The host remains pointer-transparent.

## Timings

| Outcome | Before | After |
| --- | --- | --- |
| Winner / loser panel | 320 ms planned; 331–340 ms sampled | 500 ms; 501–510 ms sampled |
| Draw / both archived | 320 ms; 334 ms sampled | 560 ms; 560–562 ms sampled; localized DRAW |
| Archive stamp | Combat stamp cleared at departure; receipt began transparent | Immediate 600 ms receipt envelope, full opacity through 85%, with result-to-receipt handoff |
| Rejection mark | Generic edge had an initially transparent/rising envelope | Immediate 600 ms outcome envelope, full opacity through 85% |
| Nonlethal direct panel | 300 ms; 305 ms sampled | 550 ms; 552–555 ms sampled |
| Lethal direct panel | 300 ms; 311 ms sampled | Existing 440 ms impact-to-result window; 440–444 ms sampled |
| Signed REP | 950 ms | Unchanged; already readable |

The Archive receipt root was already 940 ms and the ENGINE rejection signature was already 850 ms. Neither is made longer. The change concerns prompt, sustained recognition of the mark, not blindly extending every effect. Lethal zero emphasis uses a sustained opacity envelope inside its existing lifetime. Its suggested 500–750 ms target is not imposed because the accepted 480 ms approach plus 920 ms total schedule leaves 440 ms. Browser review found the fully retained panel/zero/Hero overlap readable within that window.

All pre-existing timing tokens and easing values remain unchanged: hand 560+80, Support 520+80, Action 420/200/620, attack 480, impact 40+240, Archive 620, REP 260/950, Executive 850 and direct lethal 920 ms. Queue implementation/order is unchanged: six entries, 2900 ms budget, 1600 ms age threshold. No recovery/readback changes or result-screen dwell changes.

Reduced motion skips spatial movement and retains the same 500/560/550 ms static nonlethal outcomes. Lethal uses the existing shortened static critical window (350 ms), with no added wait. Static Archive/rejection feedback stays visible; it does not inherit slower travel.

## Verification

Focused automated coverage includes semantic winner/loser/draw windows, unchanged movement and gating, reduced motion, bounded queue ordering and replay. Rendered contracts in `test/match-vfx-outcome.browser.mjs` measure impact/start/end, assert Archive overlaps outcome, verify residuals allow next entries and catch-up receipts, check readable Archive/rejection opacity and confirm cleanup/history safety. Existing immediate-response, physical proxy, hidden-card, destroyed-attacker and Executive residual browser contracts remain green.

Actual Match DOM cases (attacker win, defender win, both-archived draw, nonlethal direct, lethal direct) passed at 1920x1080, 3840x2160, 390x844 and 844x390 with zero horizontal overflow. These are emulated viewports, not hardware performance benchmarks. Browser plugin was unavailable; existing Playwright/Chromium tooling was used. Source/test assertions were supplemented with rendered screenshots and real local server flows.

Training TIMINGTRAIN passed touch Support/System, Incident response, combat draw, Archive targeting, card return and Inspector. A Support tap inside the empty hand container reached the intended board slot. The real draw remained visible about 562 ms. Reconnect, observer takeover and reload produced no historical outcome replay.

Friendly PHYSICAL passed Executive Employee, System, targeted Action, attacker win, nonlethal direct and lethal. Measured result panels lasted approximately 508/554/441 ms respectively. Acknowledgements remained approximately 9–14 ms (Training 14–17 ms). The lethal result screen followed the critical outcome; ended-room reload produced no replay. Fresh Tutorial V2 5UZHJN completed through opening, Employee, targeted Action, Battle, card combat, direct attack, End and completion. No uncaught JavaScript errors observed.

Install, build, full tests, focused VFX tests, i18n/artwork/cosmetic/security/card-content audits and PostgreSQL Docker integration passed. Direct DB testing was unavailable because `OCG_TEST_DATABASE_URL` was unset. Docker ran the same integration suite successfully. No persistence, Ranked timer, ownership, notification-host or deployment changes.

## Separate observation

How long the result screen remains open is a separate future observation. This pass changes only outcomes before/around that transition; post-result dwell remains untouched.
