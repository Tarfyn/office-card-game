# Alpha reset readiness (current canonical guidance)

This document is version-independent planning guidance. No reset has been executed. A reset remains a root-authorized operational decision and must be preceded by a validated PostgreSQL dump, a legacy JSON snapshot, an epoch/cutoff fence, and an isolated restore rehearsal.

## Authoritative state inventory

Authenticated Account/Profile state is authoritative in PostgreSQL. The profile JSON model currently includes `profile.matchHistory`, `meta.achievements`, `meta.ownedPacks`, `meta.claimedRewardRooms`, `meta.processedProgressionEventIds`, and `meta.progression.boostersOpened`; collection mode and ownership are persisted as explicit profile data. Ranked state includes recent results, placements, peak/history fields, REP/tier/division, and season state. Starter state includes avatar-choice version, selected avatar, and onboarding state. Deck state is represented in profile JSON with the normalized `player_decks` projection kept in sync.

Settlement identity is represented by `public.match_settlements`; pending Room completion obligations must be reconciled before and after a reset. `reward_grants` is a synchronized projection, not immutable archival truth. Room and Matchmaking remain FILE_JSON_LOCAL, while Guest remains MEMORY_ONLY / GUEST_LOCAL.

## Reset dependency graph

Settlement identity is linked to old rooms; reward identity is linked to ownership; ownership is linked to decks; cosmetic ownership is linked to loadout; ranked rewards are linked to cosmetics; starter state is linked to starter grants and the First Day Deck; booster sequence is linked to sourceRefs; First Session is linked to Tutorial/Training goals; Alpha Access remains distinct from actual ownership. A reset epoch/cutoff must prevent pre-reset rooms from resettling afterward.

## Decisions still requiring explicit approval

The following are policy choices, not implementation assumptions: whether cosmetics reset, whether account identity resets, whether historical Match History is retained, and whether Alpha badges/titles are retained. The reset procedure must record these decisions separately from the established storage and dependency facts.

## Operational prerequisites

Before any future reset, freeze writes, record the reset epoch, capture legacy JSON and a validated PostgreSQL dump, reconcile `public.match_settlements` and pending completions, reset ownership/decks/loadouts/starter state according to the approved policy, and verify post-reset rewards and idempotency. F04 scheduled backup execution and isolated restore capability are proven; the immediate pre-reset backup gate remains mandatory.
