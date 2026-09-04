# Office Card Game - Codex Handover v7.69.50

## Release

- Version: `v7.69.50`
- Base: `v7.69.49` (`b8d3a04cbe2d33a8f039fc62e33a3eae1bcacf3b`)
- Ranked timer: disabled
- Server authority: deck ownership, Match state, progression, rewards and cosmetic ownership remain authoritative

## Training deck readiness

Training and Tutorial now validate the currently selected player deck in the Lobby before
starting. Format readiness and owned-copy readiness remain separate checks; invalid decks disable
only the Bot-match actions and show one localized reason. Changing the player deck clears the old
validation message and recomputes readiness immediately, so a valid custom 40-card deck can start
without reloading the Lobby. The Bot deck remains an independent preset selection and never
overwrites the player deck.

The server already resolves the saved player deck through the profile and validates ownership
authoritatively. No ownership rules or gameplay rules changed in this pass.

## Achievement Overview

The Player File Overview now shows three meaningful incomplete Achievement milestones with their
localized names and current progress. The Achievements tab also names incomplete rows instead of
showing only a generic `In progress` label. Achievement progression and rewards are unchanged.

## Ranked and Player File presentation

Stable season identifiers remain in state, but the Player File header, Ranked section and Lobby
standing use localized presentation labels. `ALPHA_PRESEASON` is shown as `Alpha Preseason` in
English and `Alpha-Vorsaison` in German. The responsive dossier uses a two-column mobile summary
with the Record card spanning the row, wraps long identity/history metadata, keeps 44px tab
targets, and centers the active tab within the horizontal strip without page-wide overflow.
Footer actions retain the dossier surface with readable contrast on narrow screens.

## Localization and QA

Long localized labels use wrapping and minimum-width protections rather than unreadably small
fallback fonts. English and German Lobby, Player File, Achievement and Ranked projections were
checked in the local browser. The available in-app browser did not expose exact 390x844,
844x390, 1920x1080 or 3840x2160 emulation, nor browser console logs; those exact viewport and
console checks remain a QA limitation.

## Preserved systems

Combat correctness, Resolve notification hosting, Silver frame masking, Match HUD Badge and Title
coexistence, Match-end presentation timing, Card Backs, Match History, recovery hardening,
Achievements, Ranked progression, Executive Edition, phase auto-advance, Board rendering,
Company Store, Personnel File, Deckbuilder, Training gameplay and Tutorial gameplay remain
unchanged. Deployment hardening remains active, including audit-independent install, bounded
installation, locking, immutable release validation, readiness/health checks and rollback safety.

## PostgreSQL/account separation

`ops/postgresql-helper-foundation` remains parked at `0943a06f37e9f7a18470a832c848d621c7d03eb7`.
It is not part of production architecture or this release. No checkout, merge, rebase,
cherry-pick, push, tag or deployment is performed from that branch.
