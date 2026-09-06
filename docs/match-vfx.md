# Match VFX foundation

Implemented from released mainline **v7.69.65**, commit `e0e5fe0fa084aeb52540b0a050e85a8c2fa8c63c`. Production was verified READY at `/srv/office-card-game/releases/v7.69.65-e0e5fe0f` before edits. This pass does not bump a version or change gameplay, persistence, cosmetics ownership or deployment.

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

- `public/match-vfx.js` contains pure event mapping, a room-scoped monotonic sequence watermark and the decorative DOM adapter. A maximum of 24 pending descriptors and 16 live nodes is enforced. Same-kind cues for one surface coalesce. Pending work older than 1.2 seconds expires. The initial event tail, duplicates and background-tab traffic do not replay.
- `public/match-vfx.css` owns motion/color tokens and presentation. The new overlay is clipped to the viewport, below hover/Inspector/combat, pointer-transparent and `aria-hidden`. It uses transforms/opacity on small shapes; geometry is sampled only during rendering, never in a per-frame loop.
- The existing full board renderer remains intact. A maximum of 18 current field rectangles is retained so removed cards can receive a send-off without cloning card content or exposing hidden definitions. Resize/scroll clears the screen-space cues rather than letting stale positions float over controls.
- Notification lifetimes remain in the established queues. `syncMatchFeedbackHost` preserves their DOM by room, locale and event key. Combat and resolution keep their existing stable hosts. A redundant plain chain-complete plaque yields to combat; real Action/negation/delay copy stays available.
- Legacy board cue animations are disabled in the new scoped stylesheet so one presentation owner controls arrival/impact. Hand fan, foil, card rendering, field topology, perspective, target selection, long press and gameplay listeners are preserved.
- The hand container's empty bounding box is pointer-transparent; its actual cards remain interactive. Browser QA reproduced the previous empty box intercepting mobile Support placement, then verified the exposed slot accepts a tap with unchanged geometry.
- Reduced motion removes travel and transformations, keeps brief static edges and signed deltas, and fixes the previously invisible reduced-motion outcome stamps. Feedback never blocks an intent or extends the existing result gate.

## Architecture limits and later candidates

The renderer replaces board DOM on interaction/state changes. V1 keeps the decorative layer and notifications stable; it cannot promise continuous physical card movement through every zone. A removed field card uses its previous visible rectangle; cards archived directly from hand get an Archive receipt rather than a fabricated departing field card. Offscreen targets are skipped. No hidden card face is reconstructed.

Combat remains the existing bounded latest-result presentation. Multiple authoritative battles arriving in one server batch are not turned into a new cinematic queue; the Match Log retains every event. Effects activated while their source is no longer visible may rely on the existing resolution notice. Screen-space brackets approximate the projected rectangle rather than warping around a perspective quadrilateral.

Optional Phase 2: keyed field reconciliation for actual card travel; an authoritative combat presentation queue for simultaneous batches; consistent compact notification placement across all legacy notice types. These are separate changes. No asset pack is required for this pass.
