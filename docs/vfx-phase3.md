# VFX Phase 3 — corporate chaos signatures

Implementation baseline: v7.69.68, `0a11cc436cb2ca5a2250f8a4341940f4b4fc3028`. Task branch: `codex/vfx-phase-3`. The implementation stage made no release or production changes. Release verification is recorded in [CODEX_HANDOVER_v7.69.69.md](../CODEX_HANDOVER_v7.69.69.md). No dependency/asset addition or schema migration.

## Existing presentation audit

`appendEvents` supplies authoritative ordered events to `createMatchVfx`. The explicit presentation queue groups play, combat, resolve, Archive and result entries; a room-scoped monotonic watermark suppresses historical hydration and duplicate delivery. `prepare` captures existing card geometry/content before renderer replacement. `sync` resolves destination geometry after authoritative DOM updates. V1 effects use a stable document host and finite cleanup timers; physical proxies and the combat/notification hosts survive unrelated renders. Result gating uses the existing queue's critical completion.

No new event queue or gameplay timing owner is needed. Phase 3 decorates the existing settle/resolve/Archive/impact/result steps. The only extra queue payload is server-confirmed lethal metadata, retained by catch-up receipts. No queue steps, durations, ordering or priorities are added. Existing V1 feedback queue entries also carry the delay/major-power signature where a visible card exists.

## Hierarchy and canonical owners

| Level | Trigger | Signature |
| --- | --- | --- |
| CORE | Ordinary placement, normal resolve, targeting, nonlethal direct damage | Existing V1/V2 presentation unchanged |
| ENGINE | Negated resolution, resolve archiving multiple other cards, multi-Archive combat/group, magnitude >=3 authoritative power modification, delayed chain item | Department badge, scope brackets, connected propagation or localized rejection/pending motif |
| HERO | `GAME_ENDED` with `REPUTATION_ZERO`; visible Executive Edition entry | KPI crash/warning perimeter, or gold/white prism edge and paper/light fragments |

`public/vfx-signatures.js` owns pure preset selection, finite SVG composition, department modifiers and limits. `public/match-vfx.css` owns color/appearance using existing VFX palette tokens. `public/vfx-timing.js` remains byte-for-byte unchanged and remains the sole timing/easing owner.

Lethal classification uses the server's end reason and winner, never locally calculated damage, inferred zero, tutorial completion or concession. It decorates the matching REP-zero impact, with the existing result step as a fallback when delivery is split. A room-local lethal sequence guard prevents repeating the same Hero at the result step. Dense receipts retain lethal metadata. Result completion removes the Hero layer before opening the result UI.

Executive detection consumes `ClientCardView.definitionId` / `variantId` and the matching visible catalog definition. The canonical `${definitionId}-EXEC` variant qualifies; rarity, card class, filename, card name and deck ownership guesses do not. Hidden projection omits identity and cannot qualify. The entry accent starts at placement settle, or the visual Action staging/resolve reveal. A split Action response does not replay its Executive entrance. Standard cards receive no Executive accent. Inspector and existing restrained idle finishes are preserved; no new hover/idle animation is introduced.

## Department composition and scope

One base preset combines with a deterministic modifier:

- Customer Service: routing/ticket fan-out.
- IT: terminal prompt and scan/trace.
- Office: form/approval mark.
- Marketing: upward KPI/momentum graph.
- Production: conveyor/throughput chevrons.
- Neutral: stacked paperwork.

Badges preserve square geometry rather than stretching over the bounding box of several cards. Propagation is one connected source-to-target fan with at most eight target markers. Only authoritative Archive IDs / existing cause grouping provide those targets. The source Action itself is excluded from target geometry, preventing a rejection graphic stretching back into hand space.

Combat outcome cards retain their own readable beat; the ENGINE scope appears as that overlay clears for Archive. Important Action resolution scopes span their existing resolve and Archive motion. Large groups use the existing outcome receipt. Generic `POWER_MODIFIED` events do not identify a causal source: magnitude >=3 receives a local ENGINE accent, with no invented multi-card causal connection. This pass does not fabricate propagation for arbitrary buffs or add server event fields.

## Timing, performance and cleanup

All v7.69.68 tokens/easing remain unchanged: Employee 360+80 ms; Support 340+80 ms; Action 220+180+420 ms; attack 300 ms; combat impact hold 150 ms; Archive 420 ms; REP hold 260 ms and signed cue 950 ms; lethal schedule 920 ms; six entries / 2900 ms / 1600 ms age threshold. No added presentation steps, result delay or result-screen dwell.

Arrival and ENGINE residual accents share the existing V1 cue lifetime; they never gate input or queue completion. Lethal layers use only the remaining existing critical steps/result window. CSS animations and inherited V1 cleanup timers have finite lifetimes; no new timer chain, animation handle registry, audio playback, listener, canvas loop, geometry read per frame or SVG filter is added.

Hard ceilings: three simultaneous enhanced roots; 24 decorative shapes across all enhanced roots; 128 enhanced DOM nodes (enforced by root/particle caps and finite SVG structure); four existing physical proxies. CORE adds zero new particles, ENGINE requests six, HERO requests twelve, with global budget clipping. Mobile hides the surplus shapes and emphasizes the simple outline. Viewport rectangles are captured at presentation boundaries. No field transforms, screen shake, layout changes or full-screen repaint loops.

Nodes are inert, aria-hidden and pointer-transparent, including all descendants. Existing localized notifications, REP HUD, Archive, result and log remain the semantic text owners. Cancellation, hidden-tab completion, room reset, resizing and scrolling remove layers. New targeting clears older decorative signatures. Queue watermark/history behavior remains unchanged.

Reduced motion and catch-up retain high-contrast static brackets, department/zero motifs and critical outcomes with zero decorative particles; no spatial Hero transform or shake. Existing shortened static timings still apply. No Hero decoration can add a wait to a result gate.

## QA

Automated focused coverage: 33/33 tests, including seven Phase 3 tests for CORE preservation, timing invariants, canonical Executive metadata/hidden information, department selection, authoritative lethal, history dedupe, catch-up and hierarchy. `test/match-vfx-hero.browser.mjs` adds actual DOM contracts for one-time Executive/lethal, rerender identity, reduced motion, pointers, cleanup and hard budgets; it also contains deterministic ENGINE preview scenarios.

Real Chromium/Playwright was used because the Browser plugin is unavailable. Four emulated viewports (1920x1080, 3840x2160, 390x844, 844x390) exercised Hero/reduced-motion contracts and zero horizontal overflow / exact Own/Opp pre-projection symmetry. Consecutive frames were inspected for desktop and mobile Hero hierarchy, five department modifiers and negate. These are browser viewport checks, not physical-device/FPS benchmarks, and every flow was not repeated at every size.

Live local Friendly fixture: canonical Executive Employee play, unchanged travel/settle, readable Inspector, Standard System and ordinary Action without Hero, combat/Archive, nonlethal direct attack with no Hero, lethal with one Hero and result about 965 ms after commit (920 ms scheduled). Result opened with no Hero/proxy remaining. Fresh Tutorial `LBN89M` completed through mulligan, Employee, targeted Action, Battle, card combat, direct REP, End and completion. Training `TIMINGTRAIN` exercised native touch Support through empty hand space, Incident response, combat, Archive targeting and card return. Reconnect, observer hydration, takeover and reload produced no historical presentation; the former controller became read-only.

Offline clean install passed after stopping identified local QA servers that held Windows' Argon2 native binary lock. Build, full suite, Docker PostgreSQL integration, i18n, artwork (107/107), cosmetics, security (zero vulnerabilities), card-content and diff checks are recorded with the final implementation report. Direct DB testing is unavailable when `OCG_TEST_DATABASE_URL` is unset; Docker runs the same integration suite. No uncaught JS errors or orphan enhanced/proxy nodes were observed.

Known guest loaner-selection HTTP 400 remains unrelated and unchanged. Seeded RoomService fixture feedback can return the pre-existing authorization 403 because synthetic seats lack profile ownership. No authorization or persistence changes are included. Ranked timer remains disabled.

## Observations and future hooks

**Observation only:** result-screen dwell may merit separate product observation. It is unchanged here. The reported near-lag feeling of existing timings is not addressed by adding delays; Phase 3 adds only bounded visual layers.

Presets expose `sfxPreset` metadata without audio assets or playback. The reusable `reward` Hero composition is an inactive future hook for booster tier/Executive reveal, Ranked reward or achievement unlock; no reward/economy flow invokes it in this pass. Full sound, booster spectacle, reward choreography and per-card bespoke effects remain deferred.

Required-now assets: none. Optional-later assets: none required or selected; paper, tickets, graph, terminal, approval and conveyor shapes are procedural SVG.
