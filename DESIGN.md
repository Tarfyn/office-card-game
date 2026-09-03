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
