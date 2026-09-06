# Match VFX foundation and physical presentation

V1 shipped in **v7.69.66** and Phase 2 in **v7.69.67**, commit `d5be02b3ffe7c6ca462f008befadc0f02fea0817`. The local timing/readability pass builds on that implementation without changing version, gameplay, persistence, ownership or deployment. No external assets or audio dependencies are added.

## Effect families

| Family | Authoritative input / surface | Feedback |
| --- | --- | --- |
| Arrive | Employee/System CARD_PLAYED, INCIDENT_SET, movement to field | Brass landing edge settles around the rendered slot/card |
| Commit / travel | ATTACK_DECLARED | Source bracket and compact source-to-target scan streak; direct attacks point to the defending HUD portrait |
| Redirect | ATTACK_TARGET_REDIRECTED | Retires an old travel streak and marks the authoritative new target |
| Impact / damage | BATTLE_RESOLVED, REPUTATION_CHANGED | Defender edge; signed REP label and portrait pulse using the server delta |
| Resolve / confirm | ACTION_RESOLVED, ability/Incident activation, destruction prevented | Teal approval corner or green confirmation edge; resolved Actions fall back to their owner's Archive |
| Denied / warning | Negated Action, delayed Chain item | Dashed red/amber edge; existing resolution copy explains the outcome |
| Archive / receive | CARD_ARCHIVED | Quick localized stamp on the former field position, plus an Archive receipt pulse |
| Turn | Changed authoritative turn/player/phase | Brief edge around the active equal-width divider segment; current owner color and non-color label remain |
| Inspect / results | Existing Inspector and combat hosts | Crisp keyboard focus; directional card clash and archived-card fade underneath readable ARCHIVED/SAVED stamps |

All modes share this intake: normal hosted matches, Training and Tutorial. No new art assets, libraries, timers for gameplay, modal blockers or animation setting are required. The OS/browser reduced-motion preference is honored live.

## Ownership and limits

- `public/match-vfx.js` retains V1 event mapping and the decorative DOM adapter. V1 has a maximum of 24 pending descriptors and 16 live nodes. Same-kind cues for one surface coalesce; decorative descriptors older than 1.2 seconds expire. Grouped Phase 2 events are consumed by a separate presentation owner so they do not also emit premature V1 arrival/impact/archive cues.
- `public/vfx-timing.js` owns semantic milliseconds and easing. The queue imports them directly; `installVfxTiming` installs CSS variables once at VFX construction. `public/match-vfx.css` owns color and presentation and consumes these variables for animations and cleanup lifetimes. The overlay is viewport-clipped, below hover/Inspector/combat, pointer-transparent and `aria-hidden`. Geometry is sampled during rendering, never in a per-frame loop.
- The existing full board renderer remains intact. V1 retains at most 18 field rectangles. Phase 2 snapshots visible hand/field cards before replacement and uses a persistent body host for at most four physical proxies. Resize/scroll invalidates captured geometry and removes proxies rather than using stale positions.
- Notification lifetimes remain in the established queues. `syncMatchFeedbackHost` preserves their DOM by room, locale and event key. Combat and resolution keep their existing stable hosts. A redundant plain chain-complete plaque yields to combat; real Action/negation/delay copy stays available.
- Legacy board cue animations are disabled in the new scoped stylesheet so one presentation owner controls arrival/impact. Hand fan, foil, card rendering, field topology, perspective, target selection, long press and gameplay listeners are preserved.
- The hand container's empty bounding box is pointer-transparent; its actual cards remain interactive. Browser QA reproduced the previous empty box intercepting mobile Support placement, then verified the exposed slot accepts a tap with unchanged geometry.
- Reduced motion removes physical travel, keeps static source/destination edges, signed deltas and visible ARCHIVED/SAVED outcomes. The presentation queue still orders critical beats. Feedback never blocks an intent; final results wait for the bounded presentation queue.

## Phase 2 audit: event intake and rendering

`acceptView` immediately installs the authoritative server projection. `appendEvents` receives numbered events before `renderGame` assigns `app.innerHTML`, replacing the hand and board. The old nodes are therefore available for source capture during event intake, and destination nodes are available at `matchVfx.sync` after rendering. Body-level VFX, combat, resolution and notification hosts survive this replacement.

V1 derived decorative requests from authoritative event types/seq, but its combat renderer selected only the latest battle from the bounded cue batch. Consecutive results could replace each other. `CARD_ARCHIVED` is emitted before `BATTLE_RESOLVED`; destructive Actions can emit archives before `ACTION_RESOLVED`. Naively queuing individual events would show Archive before the combat outcome. V1 result timing also used a fixed delay rather than queue completion.

## Deterministic queue

`public/presentation-queue.js` is a small pure planner and queue. Entries have a room-scoped key, type, first related event seq, priority, payload, explicit steps, enqueue/start time and maximum duration. `sfxPreset` is optional future metadata only. No sound plays.

- Monotonic room watermarks deduplicate repeated seq values, including replay beyond the UI's truncated log. Initial hydration consumes history silently. A room reset permits that new room's seq namespace.
- Entries use server seq ordering. Combat groups bind the reported attacker, target and exact `destroyedIds`; Action groups bind the source and `causeSourceId`. Nothing infers destruction from Power or an absent DOM card.
- A combat group owns commit → impact → impact hold → outcome → Archive → surviving attacker return. The next group starts only when the preceding group completes. Direct attacks show their existing portrait and signed delta at impact, retain them through the REP hold, then return. A separate critical result confirmation follows lethal; there is no redundant instant direct-outcome step.
- Attacks spanning a response window retain their declaration for the later outcome; that outcome does not repeat the commit. Redirects update pending targets and cancel any obsolete running decorative motion.
- Unrelated phase/confirmation cues and stable notifications remain independent. Notification keys and lifetimes are unchanged.
- The result gate opens at queue idle, with the existing 4.2-second hard ceiling for interrupted presentation. Server state, SSE/polling processing, phase logic and intents never wait for it.

## Physical model and geometry

`readPresentationGeometry` uses `getBoundingClientRect` in viewport CSS pixels for hand cards, both fields, Archive and REP. It accounts for responsive scale and existing transforms without per-frame layout reads. Rectangles approximate perspective-projected cards; no second board rotation is applied.

The adapter copies only already-rendered card content and computed anatomy into inert proxies, strips IDs, handlers and gameplay/focus selectors, and animates transform/opacity with WAAPI. The authoritative field node remains in place and clickable; its opacity is immediately suppressed while its proxy is present, including through rerenders, then restored. Existing cards are never moved into enemy slots.

| Presentation | Timing / destination |
| --- | --- |
| Local Employee | 360 ms hand → current authoritative slot; 80 ms arrival settle |
| System / set Incident | 340 ms travel; 80 ms settle, including touch |
| Action | 220 ms staging → 180 ms resolve hold → 420 ms Archive; 820 ms total |
| Attack | 300 ms controlled anticipation/lunge; 40 ms impact attack + 150 ms impact hold; 420 ms outcome; 420 ms Archive if needed; 100 ms surviving return |
| Direct REP | 300 ms commit → 40 ms impact + 260 ms visible portrait/REP hold → 100 ms return; 700 ms total |
| Destruction / Archive | 420 ms outcome confirmation then 420 ms travel to the owner's Archive |
| Lethal | Direct sequence plus 220 ms critical final confirmation; 920 ms scheduled total |

### Timing audit and rhythm

The previous values were 240 ms hand travel, 280 ms Archive, 220 ms commit, 100 ms impact-to-outcome separation, 500 ms combat outcome and 160 ms return. REP's V1 cue lasted 700 ms. Browser inspection found the old `cubic-bezier(.2,.75,.25,1)` had already completed 93% of travel halfway through its duration. The new shared `cubic-bezier(.25,.4,.5,1)` reaches 76% at halfway, leaving meaningful middle movement visible. Commit includes a small proportional anticipation in its existing duration; Archive stays mostly opaque through its journey before disappearing. V1's separate 420 ms source bracket and 520 ms directional cue remain, rather than being shortened to the physical commit duration. No pixel-distance timing or device-specific duration table is used.

Anticipation → Impact → Recovery is the tuning rule. `impactHold` preserves the current visible frame; it does not respawn cues or insert an empty pause. Outcome stamps retain a separate 420 ms beat, and V1 Archive labels last 940 ms. REP labels last 950 ms with a wider full-opacity window. Phase/arrival cues stay subtle at 760 ms. Action's 820 ms total intentionally exceeds the suggested 400–600 ms range so its stage, resolve and shared Archive leg remain distinguishable. Direct's 700 ms likewise preserves its readable portrait hold rather than racing it.

Notification queues retain their established semantic lifetimes: 2.6 s generic status, 2.4 s attack notices, 3.4 s normal gameplay, 3.8 s important destruction/breakthrough/promotion, and the existing 5.2 s resolution trace. Their stable hosts and queue bounds are unchanged; no blanket duration increase is needed.

The Action midpoint is a clone position, not a gameplay zone. The same staged proxy continues through resolve into Archive. An Action with a response window may use a bounded recent source snapshot (eight sources, three-second lifetime); if that source is no longer available, the resolution notice and Archive receipt still explain the outcome.

Visible Archive geometry is preferred. An offscreen stack supplies its real exit direction; a collapsed stack falls back to the corresponding outer board edge. Hidden opponent hands are not reconstructed. Face-down sources copy their already-rendered full card back; only projected, currently permitted faces can appear. Missing snapshots yield static outcome feedback rather than invented cards.

## Catch-up, reconciliation and reduced motion

Pending storage remains capped at six entries with a modestly adjusted 2.9-second estimated budget including the active group (previously 2.6 s). One ordinary combat is 1430 ms and two fit at 2860 ms. Larger bursts, or one group archiving more than four cards, collapse pending work into a 620 ms localized outcome receipt containing battle/resolve/archive/saved/negated totals and separate signed REP loss/gain totals. Critical result state is retained; exact events remain in the Match Log. No gameplay or event processing waits for presentation.

Entries waiting more than 1.6 seconds skip decorative motion. The old 1.2-second age threshold could compress the second ordinary battle after a 1260 ms predecessor. Catch-up now omits commit/travel/return and uses a 180 ms static Archive confirmation instead of waiting for invisible travel. An entry resuming past its maximum lifetime uses zero-duration decorative steps and short static critical steps. Step order is explicit with one bounded timer, independent of `animationend` and render/frame races. The 4.2-second result safety ceiling remains unchanged; ordinary lethal uses queue completion around 920 ms.

Resize, scrolling, new targeting, preference changes and redirects cancel proxies. Geometry epochs prevent later steps from reusing stale coordinates. Hidden-page cancellation drains presentation while retaining the seq watermark. Reconnect, polling, reload and controller takeover therefore do not replay historical travel. Live state remains visible after cancellation.

Reduced motion performs no spatial proxy travel. Source/destination edges, impact, signed damage, outcome stamps and Archive receipts remain. Static cue lifetime is 500 ms, outcome hold 240 ms, Archive confirmation 180 ms and final confirmation 160 ms; impact holds retain their readable semantics. A full reduced combat is 610 ms and direct lethal 460 ms, with no spatial wait. Completion, cancellation and room reset cancel animations, remove proxies and restore suppressed nodes. Listeners are installed once per application rather than on every render.

## Deferred and QA

Phase 3 may consider more expressive effect intensity, hero moments and sound design. Ambient particles, external asset packs, Executive-specific effects, booster spectacle, Department signatures, a full sound system and broad redesign remain outside this pass. See [Phase 2 QA](vfx-phase2-qa.md) for the historical implementation coverage.

## Timing pass verification (local, 2026-09-06)

Implementation-stage baseline v7.69.67 / `d5be02b3ffe7c6ca462f008befadc0f02fea0817`, branch `codex/vfx-timing-readability`. That implementation stage made no version bump, release handover, tag, push, deployment, production mutation, dependency addition or schema change. Subsequent release verification is recorded in [the v7.69.68 handover](../CODEX_HANDOVER_v7.69.68.md).

- Offline clean install, build, full historical/current suite, Docker PostgreSQL integration, i18n, artwork (107/107), cosmetics, security (zero vulnerabilities), card-content and diff checks passed. Direct DB testing was unavailable because `OCG_TEST_DATABASE_URL` was unset; Docker ran the same integration suite successfully. The focused VFX suite passes 26/26, including six new semantic timing/rhythm/budget tests. The strict scoped design audit reports no findings.
- Real headless Chromium through Playwright/CDP on isolated localhost servers (Browser plugin unavailable). Consecutive rendered frames were captured and inspected; the normalized midpoint check confirms runtime WAAPI and CSS both use the shared timing owner. This is browser viewport testing, not a physical-device/FPS benchmark or external user study.
- All four viewports, 1920x1080, 3840x2160, 390x844 and 844x390, passed final rendered timing/proxy contracts: visible middle travel, same proxy across rerender, no duplicate final card, inert/pointer-safe content, hidden opponent full-back safety and cleanup. All have zero horizontal overflow and zero Own/Opp slot-center X difference before projection, with five Employee/four Support slots per seat.
- Live Friendly fixture: Employee/System, targeted Action, card combat/Archive, direct damage and lethal. 4K commit/impact/outcome/Archive and signed REP frames were inspected. Landscape lethal reached the result at about 978 ms from commit with no remaining proxy. The 920 ms token sum is a schedule, not an exact wall-clock/frame assertion.
- Two rapid authoritative Friendly battles retained separate ordered groups with full timing and no catch-up; both players archived two cards. A separate rendered dense-event component fixture condensed three battles/three archives/-6 REP/lethal into one 620 ms receipt and reached idle, preserving critical totals and result state.
- A complete fresh Tutorial exercised Employee, targeted Coffee Chat, Battle, card combat, direct REP, End and completion without a hardlock. The final 820 ms Action cadence was also exercised live by Training's Archive-targeted Escalated Ticket after the final easing adjustment.
- Touch-enabled Training at 390x844 verified System travel, Employee play, Please Hold placement/response, combat, Archive targeting and card return. A Support tap inside the hand container's bounds hit the exposed board slot. Shared timings required no device-specific exception.
- Offline/online reconnect, observer hydration, controller takeover and reload produced zero historical presentation nodes/steps; the former controller became read-only. Reduced motion, resize cancellation and destroyed-attacker reconciliation passed. No orphan proxies/suppression remained.
- The live resolution and feedback nodes kept identity through Inspector rerender, with one resolution host. Existing semantic notification durations remain unchanged. No uncaught JavaScript error was recorded. The seeded Friendly room's feedback read returned a fixture-only 403 due to missing synthetic profile ownership, as before; no authorization change is included. Known guest loaner-selection 400 behavior remains unchanged and is not claimed fixed.

Perceptual review: longer travel plus less front-loaded easing makes pickup/departure visible; the dedicated held impact precedes the outcome; stamps and mostly opaque Archive movement are distinct; REP remains readable before lethal results. A shorter Action staging experiment was rejected during this pass. Review remains open to player preference, but the final inspected effects no longer read as instant transform spikes. Every flow was not repeated at every viewport; the coverage above distinguishes live gameplay from rendered component fixtures.
