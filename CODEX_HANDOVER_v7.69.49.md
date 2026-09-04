# Office Card Game - Codex Handover v7.69.49

## Release

- Version: `v7.69.49`
- Base: `v7.69.48` (`8882656e2bc62da8a7ba2e0b659a8f6b673370f3`)
- Ranked timer: disabled
- Server authority: Match state, combat resolution, progression, rewards and cosmetic ownership remain authoritative

## Combat verification

No combat resolver change was required. The authoritative engine already resolves the normal
Power comparison correctly. The focused regression suite covers 3 vs 4, 4 vs 3, equal Power,
and the real IT-003 System Administrator versus CS-006 Team Lead Customer Service scenario.

The captured scenario resolved as attacker Power `3`, defender Power `4`, `winnerId` equal to
the defender instance, attacker-only destruction, `excessPower: 0`, and
`breakthroughApplied: false`. The Training Bot may still choose strategically losing attacks;
that is a separate AI-quality concern and is not changed here.

## Resolve notification

The flicker was caused by the Resolve notification being rebuilt through `app.innerHTML` during
normal Match renders. That remounted the DOM node and restarted its CSS animation. The fix keeps
a persistent external resolution-presentation host and updates it only for a new authoritative
event. Its stable presentation identity is `resolution:<event.type>:<event.seq>`, covering
`ACTION_RESOLVED`, `CHAIN_ITEM_NEGATED`, `CHAIN_ITEM_DELAYED` and `CHAIN_RESOLVED`. Existing
SSE/polling/hydration event deduplication remains the single transient-event architecture.

## Silver Ranked frame

`COS-FRAME-006` uses `/cosmetics/avatar-frames/silver-ranked-s01.webp` and the corrected explicit
RGBA mask `/cosmetics/avatar-frames/masks/silver-ranked-s01-inner-opening.png`. The earlier
Silver override was still active from the old Silver artwork; the replacement asset remains
ambiguous to the generic alpha flood-fill derivation, so a custom override is still justified.
The corrected opening is approximately `x=68..443`, `y=73..438` and reaches the visible inner
frame edge without changing the frame asset, `portraitScale` or `object-position`. Bronze, Gold
and Diamond masks remain unchanged; the generic pipeline is unchanged.

The corrected composition is shared by Personnel File, Player File identity, Lobby identity and
Match HUD. The normal avatar border remains suppressed when a cosmetic frame is active.

## Preserved systems

This hotfix preserves Player File Badge and Match History, Match HUD Badge and Title coexistence,
Card Backs and per-seat cosmetics, recovery hardening, Achievements, Ranked progression,
Executive Edition, phase auto-advance, Board rendering, Company Store, Personnel File,
Training/Tutorial and all v7.69.48 presentation behavior. Match completion, rewards and history
remain immediate and authoritative.

## QA and limitations

Automated combat, presentation, mask, localization, artwork and cosmetic audits pass. Local
browser inspection covered Silver composition in Personnel File, Player File and a hosted Match;
the connected browser surface does not provide exact viewport emulation or console-log access,
and a full live Resolve sequence was not available for visual reproduction. No temporary QA
screenshots or reference files are part of this release.

## PostgreSQL/account separation

`ops/postgresql-helper-foundation` remains parked at its pre-release commit and is not part of
the production architecture or this release. No checkout, merge, rebase, cherry-pick, push, tag
or deployment is performed from that branch.
