# Office Card Game - Codex Handover v7.69.47

## Current baseline

- Version: `v7.69.47`
- Release commit: the commit referenced by annotated tag `v7.69.47`
- Ranked timer: disabled
- Server authority: hosted Match state, profile persistence, ownership, rewards and progression remain authoritative

This release integrates the accepted cosmetic batch on top of the v7.69.46 recovery-hardening
baseline. The parked PostgreSQL/account work is separate and is not part of this release.

## Card Backs

The catalog now includes the stable Card Back IDs `COS-BACK-001` through `COS-BACK-005`:

- Default Corporate (`COS-BACK-001`) is the starter/default back.
- External Alpha (`COS-BACK-002`) and Ranked Season 1 (`COS-BACK-003`) are Alpha/test or reward availability and are not Company Store inventory.
- Customer Service Department (`COS-BACK-004`) and IT Department (`COS-BACK-005`) are Company Store items at 180 Office Credits each.

Card Back ownership and loadout remain per player. The renderer resolves the owner of each hidden
Deck, Hand or face-down card, so both seats can use different backs without leaking hidden card
identity. Reload and Room restore preserve the seat-specific loadouts.

## Badges

The six stable Badge IDs `COS-BADGE-001` through `COS-BADGE-006` are available in the catalog:

- Reply All Survivor
- Coffee Powered
- Inbox Zero
- Meeting Survivor
- Ticket Closer
- Escalation Specialist

Badges are not starter-owned or Company Store-listed. Current Alpha/playtest ownership is granted
through the idempotent `alpha-playtest:achievement-badges:v1` grant, preserving future
Achievement `RewardGrant` compatibility.

## Silver Ranked Frame

`COS-FRAME-006` remains Silver Ranked S1 with the replacement WebP asset and existing explicit
inner-opening mask. The shared avatar-composition renderer uses the frame as the outer perimeter,
clips the portrait to the intended opening, suppresses the normal avatar border, and is shared by
Personnel File, Lobby identity and Match HUD. Ranked frames remain semantically ordered Bronze,
Silver, Gold, Diamond and remain absent from the Company Store. Alpha ownership remains an explicit
test grant, separate from future Ranked rewards.

## Preserved systems and QA

The release preserves Executive Edition, Achievements, Ranked progression, Player File and Match
History, Deck persistence, recovery hardening, phase auto-advance, cosmetics ownership, Training,
Tutorial, board perspective and Mobile Top View. Ranked timer enforcement remains disabled.

The cosmetic asset audit validates five 900x1260 Card Back WebPs, six 256x256 Badge WebPs and the
replacement Silver frame. Existing artwork, localization, avatar-mask and progression tests remain
in the release suite. Browser smoke covered Personnel File, Company Store and a real hosted
two-seat Match with `COS-BACK-002` for P1 and `COS-BACK-004` for P2. The connected in-app browser
does not expose exact viewport emulation or console-log inspection; automated audits and local
authoritative RoomService QA provide the remaining coverage.

## Economy and known limitations

The existing provisional economy is unchanged. Company Store Card Backs remain priced at 180
Office Credits. Alpha Card Back and Badge grants are temporary test availability and do not change
long-term acquisition semantics.

Current known limitations remain those documented by the v7.69.46 baseline: no Match replay viewer,
no public profiles, no reconstruction of pre-feature Match History, no direct favorite-Deck shortcut,
and current guest identity remains browser/profile-token based. Future durable database work is
separate from this release.
