# Office Card Game UI Direction

## Product character

The game presents an exaggerated internal corporate world through a tactile executive desk: paper, folders, dark green office surfaces, brass accents, restrained red warnings, and compact bureaucratic labels. It should feel authored and playful without becoming ornamental enough to obscure the card game.

## Canonical visual rules

- Reuse the existing executive-desk surfaces, condensed headings, paper panels, compact status labels, and established button hierarchy.
- Player-facing Lobby surfaces may be warm and tactile. Operational surfaces use the same palette but are denser, calmer, and optimized for scanning.
- Green means healthy/ready/allowed; amber means pending/warning; red means failure/danger; gray means unavailable or not applicable. Always pair color with text and a symbol.
- Forms use visible labels, inline errors, clear busy states, at least 44 px touch targets on mobile, and native password-manager autocomplete semantics.
- Authentication identity must be explicit: `Guest` and `Account` are never visually interchangeable.
- The Operations cockpit is read-only in Phase 1. It shows structured status, never shell output, environment dumps, credentials, tokens, or arbitrary paths.

## Responsive behavior

- Preserve the current Lobby, Deckbuilder, Match, Personnel, Store, Achievements, and Ranked information architecture.
- New account identity copy stacks above a two-column 44 px action row below 620 px without horizontal scrolling.
- Operations cards use two columns on desktop and one column on smaller screens; status signals remain individually visible rather than collapsing into a single health badge.

## Interaction contract

- Login/Register dialogs are modal, keyboard reachable, focus the email field on open, keep paste enabled, and surface server errors without clearing user intent.
- Logout immediately revokes the server session and returns to the preserved local Guest identity.
- `/ops` is a dedicated server-protected route. Hidden navigation is only a convenience and never the authorization boundary.
- Any future admin mutation requires an attributable audit record containing who, when, action, target, before, after, and reason.

## Match motion feedback

Match VFX uses compact approval edges, fax-like directional streaks and archive stamps. It does not move the canonical field grid or replace card anatomy. Keep the board legible; do not add ambient particles, per-card render loops or fantasy spell effects.

The established runtime palette remains CSS-owned (Model B). `public/match-vfx.css` owns `--vfx-brass` (#e6bd70), `--vfx-teal` (#70dccb), `--vfx-red` (#ff8179), `--vfx-green` (#8ee0a6) and `--vfx-blue` (#8dcfff). `public/vfx-timing.js` is the single semantic timing/easing owner: the queue imports its milliseconds, and Match initialization installs matching `--vfx-time-*` variables for CSS and DOM cleanup. CSS uses aliases rather than independently tuned timing values. No generated copy or theme adapter is required.

`appendEvents` is the authoritative event intake. Initial hydration consumes events silently. Feedback has no authority over target legality, phase advancement or Tutorial gates. The existing combat and resolution hosts plus `syncMatchFeedbackHost` own readable, event-keyed presentation. Identical updates keep those DOM nodes. A plain chain-complete notice and hover detail yield to the combat result; meaningful Action outcomes remain visible.

Phase 2 physical continuity uses inert proxies and a small server-seq queue. The immediate-response pass separates **acknowledgement latency** from **motion duration**: a source outline acknowledges submission without claiming success, and an accepted projection renders before recovery readback. Employee travel is 560 ms, Support 520 ms, settle 80 ms, attack approach 480 ms and Archive travel 620 ms. Near-balanced travel easing leaves approximately 48% of the journey after halfway. Impact/outcome is visible together for a 320 ms combat envelope; a short 40 ms outcome handoff replaces the old 420 ms serial wait. Surviving attackers return concurrently with impact/Archive. Actions use 420 ms stage + 200 ms resolve + 620 ms Archive. Signed REP remains 950 ms and the full direct-lethal queue remains 920 ms. See [response and motion measurements](docs/vfx-immediate-response.md).

The canonical field grid and authoritative DOM never move. Related steps stay together. Six entries / 2.9 seconds and a 1.6-second age threshold allow two ordinary battles to run at readable timing; dense bursts keep critical outcome receipts and drop decoration. Final result presentation waits for critical feedback under the unchanged hard ceiling. Targeting, scrolling and recovery can cancel decorative motion. CORE retains V1's restrained palette and intensity.

Phase 3 composes stronger ENGINE and HERO signatures. ENGINE uses a connected scope frame and a compact department badge (ticket routing, terminal, approval, KPI momentum, conveyor or paperwork); negate has a sharp red cancel mark. HERO is reserved for authoritative REP-zero lethal and visible canonical Executive variants: a crashing KPI/warning perimeter or a gold/white prism edge. Lethal warning ignites during the confirmed approach; KPI/zero/paper activate at impact. Executive/ENGINE signatures can decay for 850 ms outside blocking queue duration. Catch-up and new targeting retire noncritical residuals. Use no extra result dwell, screen shake, ambient animation, blur filters or external assets. Three enhanced roots, 24 total decorative paper shapes and 128 total enhanced DOM nodes are hard ceilings; existing four-card proxy limits remain. Reduced motion/catch-up omit decorative particles and preserve static signatures. See [Phase 3](docs/vfx-phase3.md).

Reduced motion keeps a static edge/delta cue, removes directional travel and movement, and always shows ARCHIVED/SAVED outcomes. Decorative cues are hidden from assistive technology; the existing localized status text, REP counts, Archive and Match Log carry persistent meaning. See [the VFX foundation](docs/match-vfx.md) for the event mapping and limits.
