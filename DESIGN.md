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

Runtime token ownership remains in CSS (Model B). `public/match-vfx.css` owns `--vfx-brass` (#e6bd70), `--vfx-teal` (#70dccb), `--vfx-red` (#ff8179), `--vfx-green` (#8ee0a6), `--vfx-blue` (#8dcfff), the 180ms snap, 420ms settle, and per-family `--vfx-life` in milliseconds. `public/match-vfx.js` reads that lifetime for cleanup; it owns bounded event deduplication and decorative overlay placement. No theme adapter or generated token copy is introduced.

`appendEvents` is the authoritative event intake. Initial hydration consumes events silently. Feedback has no authority over target legality, phase advancement or Tutorial gates. The existing combat and resolution hosts plus `syncMatchFeedbackHost` own readable, event-keyed presentation. Identical updates keep those DOM nodes. A plain chain-complete notice and hover detail yield to the combat result; meaningful Action outcomes remain visible.

Phase 2 adds quick physical continuity through inert card proxies and a small server-seq presentation queue. Hand-to-field travel is 240 ms; attack commits are short lunges; Archive travel is 280 ms. The canonical field grid and authoritative DOM never move. Related commit, impact, outcome and Archive steps stay together. Queue catch-up skips decoration while retaining an outcome receipt; final result presentation waits for critical feedback to finish under the existing hard ceiling. New targeting, scrolling and recovery can cancel decorative motion. Keep V1's restrained palette and intensity; no new particles or external assets are needed.

Reduced motion keeps a static edge/delta cue, removes directional travel and movement, and always shows ARCHIVED/SAVED outcomes. Decorative cues are hidden from assistive technology; the existing localized status text, REP counts, Archive and Match Log carry persistent meaning. See [the VFX foundation](docs/match-vfx.md) for the event mapping and limits.
