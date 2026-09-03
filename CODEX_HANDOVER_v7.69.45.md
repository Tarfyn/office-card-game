# Office Card Game - Codex Handover v7.69.45

## Current baseline

- Version: `v7.69.45`
- Release commit: the final commit referenced by annotated tag `v7.69.45`
- Ranked timer: disabled
- Server authority: hosted Match state, profile persistence, ownership, rewards and progression remain authoritative

This release adds the Player File meta hub and persistent Match History on top of the v7.69.44
baseline. The project remains on the current portable file-backed profile architecture. The domain
models are deliberately serializable and adapter-friendly for a future database persistence layer;
no database dependency is required by this release.

## Player File meta hub

The Player File is the local player's profile/progression hub, separate from the Personnel File,
which remains the owned cosmetics and loadout surface. The Player File contains:

- Overview: equipped identity, level/XP, rank/season, record, recent form and favorites
- Match History: retained authoritative Match summaries with filters and an initial 20-record slice
- Ranked: season, placement state, rating, rank/division and ranked record
- Achievements: completion/progress summary and recent completions
- Stats: competitive, ranked, training/tutorial and department/deck usage summaries

The header projects the existing `CosmeticLoadout` identity (Avatar, Frame, Badge and Title when
equipped), level/XP and current Rank without exposing internal IDs or private account data. Empty
optional cosmetic slots are omitted cleanly. English is canonical and the surface is localized in
German through the existing localization layer.

## Match History model

`MatchHistoryRecord` is an explicit portable domain model in `src/match-history.ts`. It stores the
authoritative summary needed by the UI, not a replay or hidden game state:

```text
roomId / matchId
completedAt, mode, result, playerSeat
opponentName
selectedDeckId, deckName, primaryDepartment
opponentDeckName / opponentDepartment only when public and available
turns, durationMs, playerFinalRep, opponentFinalRep
ratingBefore, ratingAfter, ratingDelta, rankBefore, rankAfter, seasonId
rewardEligible, completionReason
```

The server writes records from the authoritative room completion hook. A completion is recorded
exactly once using `matchId`/`roomId` identity, so reopening a result, resyncing or repeating an
intent cannot duplicate history or counters. Existing profiles normalize safely to empty history.

History retention is centralized at **100 newest records per player**. The UI renders 20 initially
and can load more without rendering the full retained set at once. Timestamps are stored in stable
server form and localized when displayed. No hidden opponent hand, private token, session ID or
hidden Deck contents are stored or exposed.

## PlayerStats and mode separation

`PlayerStats` is persisted beside the profile and maintains explicit aggregate tallies for PvP,
Ranked, Training and Tutorial. Competitive W/L/D and win rate exclude Training and Tutorial.
Ranked counters maintain current/peak MMR and rank snapshots. Total turns, deck usage, primary
Department usage and most-played Deck are updated from authoritative completion data where reliable.
Historical Deck names remain snapshots so records stay understandable after a Deck rename or delete.

Training and Tutorial can appear in history with their own mode labels, but do not affect PvP stats,
Ranked MMR, Ranked records or normal progression/reward eligibility. Friendly/Quick Match and
Ranked are the default competitive perspective. Department statistics use the existing deterministic
primary-Department derivation and report `MIXED` for ties where applicable.

## Existing Match and board baseline

The Match Board remains full-width on desktop with a permanent `3.25deg` desktop World Layer
perspective and flat screen-space overlays. Mobile portrait and landscape remain Top View. Own and
Opponent use one canonical halfboard geometry with matching pre-perspective slot center-X values;
cards retain canonical 5:7 anatomy.

The phase divider remains `START | DRAW | MAIN | BATTLE | END`. Safe hosted matches auto-advance
START, DRAW and END only when no authoritative choice, target, response, trigger, chain or hand-limit
interaction is pending. MAIN and BATTLE remain player-controlled. The divider uses green local-turn
and restrained red opponent-turn active states with localized non-color cues. Ranked timer enforcement
remains disabled.

Normal Match target selection remains board-native and non-modal. Local pre-commit target selection
supports Cancel/Esc where legal, while mandatory server Choices remain non-cancellable. Archive
targets remain accessible. Tutorial uses the real engine, explicit TUTORIAL mode and
`rewardEligible:false`; its guided phase progression can suppress normal auto-advance. Training and
Bot use the same hosted authoritative Match path with `rewardEligible:false`.

## Decks, cards and progression foundations

Player Decks are persistent profile records with stable IDs, revisions, migration fingerprints and
server validation. Selected Deck state is server-side. Browser-local Decks migrate idempotently and
remain only as migration marker/draft recovery/cache after synchronization. Invalid saved Decks stay
editable, while invalid Decks cannot enter production Match or Training. Recycling warns before
making saved Decks invalid; crafting/acquiring missing copies can restore validity. Starter Decks
remain global definitions and Tutorial keeps its fixed Deck architecture.

Executive Edition is a presentation-only card variant with `finish: EXECUTIVE` and IDs of the form
`<BASE_CARD_ID>-EXEC`; gameplay resolves from `baseCardId`. Standard and Executive copies share the
base copy limit, ownership is separate, and Executive variants are not craftable. The finish uses
the accepted gold material and artwork-focused spectral foil through all card surfaces. The current
Alpha grant, reward-only Executive Edition Pack, provisional booster chance and local
`OCG_ALPHA_QA_EXECUTIVE=1` deterministic Training hook remain test infrastructure.

Achievements and Ranked progression are server-authoritative and data-driven. Achievement definitions
are in `data/achievements.json`; Ranked ranks/seasons are in `data/ranked/`. Rewards use the existing
idempotent RewardGrant path. Alpha Ranked frame grants are separate temporary test availability and
do not make reward-only Ranked frames shop-listed or normal starter cosmetics.

## Cosmetics

`CosmeticLoadout` remains independent by stable IDs for board, avatar, frame, decoration, card back,
badge and title. Personnel File shows owned cosmetics only; Company Store shows shop availability
independently. COS-AVA-001/002 are starter-owned; COS-AVA-003..006 are shop-only. Ranked frames
COS-FRAME-003/004/005/006 are absent from Company Store and are Alpha-owned only through explicit
idempotent playtest grants until real Ranked reward acquisition is active.

Avatar frames reach the outer avatar perimeter and replace the normal border. The shared avatar
composition masks portraits to the frame's inner opening using build-time alpha flood-fill-derived
RGBA masks, with an explicit Silver override for ambiguous circular geometry. The same renderer is
used by Personnel File, Lobby identity and Match HUD; portrait pixels must not protrude through
exterior transparency or below the frame opening.

## Economy and known limitations

Current provisional/test economy values remain unchanged: T0 recycle/craft `10/150`, T1 `25/300`,
T2 `60/600`, T3 `150/1200`; Alpha Booster `100 Office Credits / 5 cards`. Training and Tutorial
remain reward-ineligible.

Known gaps for future work:

1. There is no Match replay viewer.
2. Public profiles and player lookup are not implemented.
3. Matches completed before this feature are not reconstructed.
4. The favorite Deck summary has no direct Open Deck shortcut yet.
5. True cross-device identity still depends on transferring/reusing the current `GUEST_LOCAL` profile token.
6. Unsaved Deckbuilder drafts remain recoverable only on the originating browser.
7. Tutorial guidance and Bot/Training quality still benefit from live polish/playtesting.
8. Desktop perspective and neutral board art may still be tuned after live testing; perspective is client-rendered.

The current Player File models are portable typed domain structures suitable for a later persistence
adapter. Do not create a parallel profile store or modify database/helper infrastructure as part of
ordinary feature work.

## QA baseline

The release QA matrix is 1920x1080, 3840x2160, 390x844 and 844x390. Check profile sections,
localized labels, empty/populated history, filters, framed identity, no horizontal overflow and no
browser console errors. Required automated checks remain build, full test suite, localization audit,
artwork audit, diff check, `/api/ready`, `/api/health`, and Ranked timer disabled.
