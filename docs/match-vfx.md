# Match VFX foundation and physical presentation

V1 shipped in **v7.69.66**, commit `50231c648d0ab4fd5bd97d2bb2bac08639632cfe`. Phase 2 builds on that baseline on `codex/vfx-phase-2`. It does not bump a version or change gameplay, persistence, cosmetics ownership or deployment. No external assets or audio dependencies are added.

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
- `public/match-vfx.css` owns motion/color tokens and presentation. The new overlay is clipped to the viewport, below hover/Inspector/combat, pointer-transparent and `aria-hidden`. It uses transforms/opacity on small shapes; geometry is sampled only during rendering, never in a per-frame loop.
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
- A combat group owns commit → impact → outcome → Archive → surviving attacker return. The next group starts only when the preceding group completes. Direct attacks own commit → signed REP impact → outcome → return, followed by the result gate.
- Attacks spanning a response window retain their declaration for the later outcome; that outcome does not repeat the commit. Redirects update pending targets and cancel any obsolete running decorative motion.
- Unrelated phase/confirmation cues and stable notifications remain independent. Notification keys and lifetimes are unchanged.
- The result gate opens at queue idle, with the existing 4.2-second hard ceiling for interrupted presentation. Server state, SSE/polling processing, phase logic and intents never wait for it.

## Physical model and geometry

`readPresentationGeometry` uses `getBoundingClientRect` in viewport CSS pixels for hand cards, both fields, Archive and REP. It accounts for responsive scale and existing transforms without per-frame layout reads. Rectangles approximate perspective-projected cards; no second board rotation is applied.

The adapter copies only already-rendered card content and computed anatomy into inert proxies, strips IDs, handlers and gameplay/focus selectors, and animates transform/opacity with WAAPI. The authoritative field node remains in place and clickable; its opacity is immediately suppressed while its proxy is present, including through rerenders, then restored. Existing cards are never moved into enemy slots.

| Presentation | Timing / destination |
| --- | --- |
| Local Employee, System or set Incident | 240 ms hand → current authoritative slot; 100 ms arrival settle |
| Action | 240 ms hand → temporary visual midpoint near the phase divider; 340 ms resolve; 280 ms Archive |
| Attack | 220 ms controlled lunge, capped relative to source-card size; 100 ms impact; 500 ms outcome; 160 ms return |
| Destruction / Archive | Outcome stamp then 280 ms proxy travel to the owner's Archive |

The Action midpoint is a clone position, not a gameplay zone. The same staged proxy continues through resolve into Archive. An Action with a response window may use a bounded recent source snapshot (eight sources, three-second lifetime); if that source is no longer available, the resolution notice and Archive receipt still explain the outcome.

Visible Archive geometry is preferred. An offscreen stack supplies its real exit direction; a collapsed stack falls back to the corresponding outer board edge. Hidden opponent hands are not reconstructed. Face-down sources copy their already-rendered full card back; only projected, currently permitted faces can appear. Missing snapshots yield static outcome feedback rather than invented cards.

## Catch-up, reconciliation and reduced motion

Pending storage is capped at six entries with a 2.6-second estimated presentation budget including the active group. Larger bursts, or one group archiving more than four cards, collapse work into a short localized outcome receipt containing battle/resolve/archive/saved/negated totals and separate signed REP loss/gain totals for both seats. Critical result state is retained. Exact individual events remain in the Match Log. Decorative travel can be dropped; a receipt is not a new gameplay result.

Entries waiting more than 1.2 seconds skip decorative motion. An entry resuming past its maximum lifetime uses zero-duration decorative steps and short static critical steps. Step order is explicit, with one bounded step timer; it does not depend on `animationend`, render order or frame races.

Resize, scrolling, new targeting, preference changes and redirects cancel proxies. Geometry epochs prevent later steps from reusing stale coordinates. Hidden-page cancellation drains presentation while retaining the seq watermark. Reconnect, polling, reload and controller takeover therefore do not replay historical travel. Live state remains visible after cancellation.

Reduced motion performs no spatial proxy travel. Source/destination edges, impact, signed damage, outcome stamps and Archive receipts remain. Critical steps still run in order; Archive uses a short static beat. Completion, cancellation and room reset cancel animations, remove proxies and restore suppressed nodes. Listeners are installed once per application rather than on every render.

## Deferred and QA

Phase 3 may consider more expressive effect intensity, hero moments and sound design. Ambient particles, external asset packs, a full sound system and broad redesign remain outside this pass. See [Phase 2 QA](vfx-phase2-qa.md) for exact browser coverage and checks.
