# Office Card Game - Codex Handover v7.69.33

## Baseline

- Version: `v7.69.33`
- Commit: final release commit resolved by immutable annotated tag `v7.69.33`
- Ranked timer: disabled
- Local development URL: `http://127.0.0.1:8787/`
- Public deployment URL: `https://office-card-game-185-94-29-30.nip.io/`

The v7.69.33 release includes the full-width desktop board, desktop gameplay scale, normalized
field tracks, permanent 3.25deg desktop perspective, safe hosted phase auto-advance, turn-owner
phase visuals, cosmetic collection/shop surfaces, explicit card ownership and the Bot/Training/
Tutorial foundation.

## Match Board

The Match Board remains server-authoritative and uses one shared 5 Employee + 4 Support topology
for both seats. The DOM renders both players through `renderPlayer`; only orientation, ordering and
cosmetic identity differ.

Desktop uses a full-width `battlefield-world` with flat screen-space HUD, phase bar, command dock,
menus, notifications, Inspector, hover preview and combat overlays. The player world layer applies
the current shallow transform:

```text
perspective(2200px) rotateX(3.25deg) scaleY(.972)
```

The transform is gated to desktop viewports. Mobile portrait and short landscape remain flat Top
View and retain the current mobile board architecture.

Normal hosted matches automatically process safe START, DRAW and END boundaries. MAIN and BATTLE
remain explicit player-controlled phases. Auto-advance stops for pending choices, targets,
responses, triggers, chain resolution and hand-limit decisions. Tutorial can suppress this runner
to retain instructional pauses; Bot and Training use the same hosted Match path.

The Center Phase Divider keeps the five-phase track flat in screen space. A local player's active
phase is green with `YOUR TURN` / `DEIN ZUG`; an opponent's active phase is a restrained red with
`OPPONENT TURN` / `GEGNERISCHER ZUG`. Mobile preserves the existing Top View turn cue.

### Canonical field geometry

Own and Opponent must derive from the same halfboard geometry. Before perspective projection:

- corresponding Employee slot center-X values match
- corresponding Support slot center-X values match
- Employee and Support row widths match
- Employee and Support gaps match
- card and slot dimensions match
- only vertical mirroring/orientation differs

The shared desktop rules currently use:

```text
field card width:  clamp(132px, 6.25vw, 240px)
field card height: min(width * 1.4, 18.5dvh - 55px)
field track width: card height * 5 / 7
field column gap: clamp(18px, 1vw, 30px)
shared halfboard horizontal padding: 104px
```

Tracks equal the responsive card/slot width, so visible gaps come from the explicit column gap.
Cards retain canonical 5:7 anatomy in Board, Hand, Deck, Archive, Hover, Inspector and
notifications. The Center Phase Divider remains neutral and contains START, DRAW, MAIN, BATTLE
and END. Deck and Archive are physical board piles; Archive expands toward the center on desktop,
with the existing viewport-safe mobile behavior.

The desktop symmetry regression was traced to historical asymmetric horizontal padding on the
opponent world (`158px` versus `104px`). The current baseline uses the same `104px` horizontal
padding for both worlds. Browser verification at 1920 and 4K measured corresponding pre-transform
slot centers with a maximum difference of `0px` for all Employee and Support slots.

## Cosmetics

Player loadout slots remain independent and use stable IDs:

```text
boardSkinId
avatarId
avatarFrameId
avatarDecorationId
cardBackId
badgeId
titleId
```

Avatar frames are transparent overlays on the base avatar. They reach the outer perimeter of the
avatar composition and replace the ordinary avatar border; they must not render as an inset framed
square. The portrait is clipped to a per-frame inner-opening mask derived from the frame alpha, so
portrait pixels cannot appear through exterior transparency or below the decorative frame. The same
composition is used by Personnel File, Company Store, Lobby identity and Match HUD surfaces.

Acquisition is explicit: COS-FRAME-002 is starter-owned and may remain shop-listed; COS-FRAME-003,
COS-FRAME-004 and COS-FRAME-005 are ranked-reward-only and are neither starter-owned nor
shop-listed. COS-AVA-003 through COS-AVA-006 are shop inventory and are not starter-owned. Legacy
accidental starter grants for these IDs are normalized away. Ranked reward infrastructure itself is
not active yet.

Current supplied assets include:

```text
COS-BOARD-001 -> public/cosmetics/boards/classic-office.webp
COS-AVA-001   -> public/cosmetics/avatars/overworked-sysadmin.webp
COS-AVA-002   -> public/cosmetics/avatars/hr-oracle.webp
COS-AVA-003   -> public/cosmetics/avatars/executive-director.webp
COS-AVA-004   -> public/cosmetics/avatars/overloaded-junior.webp
COS-AVA-005   -> public/cosmetics/avatars/confident-analyst.webp
COS-AVA-006   -> public/cosmetics/avatars/customer-care-veteran.webp
COS-FRAME-002 -> public/cosmetics/avatar-frames/default-blue-silver.webp
COS-FRAME-003 -> public/cosmetics/avatar-frames/bronze-ranked-s01.webp
COS-FRAME-004 -> public/cosmetics/avatar-frames/gold-ranked-s01.webp
COS-FRAME-005 -> public/cosmetics/avatar-frames/diamond-ranked-s01.webp
```

Own boards render normally; opponent boards reuse the same asset with the established 180deg
orientation rule. Legacy room/profile data keeps safe fallback identities and board defaults.

### Personnel File

Personnel File is the owned-only non-card collection surface. It has categories for Boards, Avatars,
Avatar Frames, Avatar Decorations, Card Backs, Badges and Titles. It exposes only explicitly owned
cosmetics, supports equipped/unequipped state and optional None values, and validates equip requests
against ownership and slot type on the server.

### Company Store

Company Store is an explicit shop-availability view, independent from ownership. Shop-listed owned
items remain visible and cannot be purchased again. A cosmetic granted from a non-shop source can
appear in Personnel File without automatically appearing in Company Store. Purchase validates the
server price, shop listing, ownership and Office Credits before persisting the ownership grant.

## Card collection and economy

Card catalog, player card ownership, decks and grant history are separate concepts. Current sandbox
profiles use explicit `ownedCards` quantities and starter grants; ownership is not derived from the
global catalog. Custom player Decks are now persistent profile records with server-side validation,
selected-Deck persistence, browser-local migration fingerprints and revision checks for stale edits.
The server is authoritative after migration; browser localStorage remains only as a migration marker
and recoverable draft/cache layer.

### Server-persisted Decks

Saved Decks retain stable IDs, names, ordered card entries, timestamps, source metadata, versions and
revisions. The server validates card existence, collectibility, copy limits and owned quantities on
create/update/select and match handoff. Decks that become short on owned copies remain visible and
editable as invalid instead of being silently deleted; production Match and Training entry rejects
invalid selections. Recycling detects affected saved Decks and requires explicit confirmation before
allowing the server-authoritative mutation. Crafting a missing copy can restore validity.

Legacy browser Decks are normalized and imported once using an idempotent fingerprint/sourceRef;
failed imports preserve the local data, and same-name distinct Decks remain distinct. Legacy local
Decks cannot overwrite newer server Decks. Built-in Starter Decks remain server-defined and the
Tutorial continues to use its fixed Deck architecture.

### Booster

The current test configuration contains `ALPHA_OFFICE_PACK`:

- price: 100 Office Credits
- result: 5 cards
- distribution: 3 T0, 1 T1 and 1 weighted flex slot

The server selects the pack result, deducts the authoritative Office Credits and grants card
quantities. The current economy is sandbox/test-only; live economy remains disabled.

### Scrap and crafting

Shredder Scraps are separate from Office Credits. Current provisional values are centralized in
`data/economy.json` and must not be changed casually:

| Tier | Recycle | Craft |
| --- | ---: | ---: |
| T0 | 10 | 150 |
| T1 | 25 | 300 |
| T2 | 60 | 600 |
| T3 | 150 | 1200 |

Recycling and crafting are server-side balance mutations. Recycling is constrained by the
collection floor so a player keeps at least one legal Alpha deck. These are provisional test values,
not final balance.

### Executive Edition card variants

Every eligible collectible card can derive a presentation-only Executive Edition variant. Variants use
`finish: EXECUTIVE` and the stable ID convention `<BASE_CARD_ID>-EXEC` (for example `CS-001-EXEC`);
they are not duplicate gameplay definitions. The Match engine resolves gameplay from the base card,
while Decks, ownership and renderers preserve the selected variant for presentation. Standard and
Executive Edition copies share the base card's copy limit, and Executive Edition ownership is tracked
separately from standard card quantities.

Executive Edition uses a rich metallic gold material with darker brass depth, polished highlights and
a persistent diagonal spectral stripe foil concentrated in the artwork region. The finish is
selectable in the Deckbuilder and propagates through Decks, Hand, Board, Archive, hover, Inspector,
notifications and Lobby showcase rendering without changing card rules or stats. Its static foil remains
visible on coarse-pointer/mobile surfaces, while fine pointers can enhance the reflection on interaction.
Executive Edition
variants cannot be crafted; recycling one uses the underlying card tier's normal Scrap value. The
provisional Alpha Booster premium roll is centralized at `0.75%` per pack. `EXECUTIVE_EDITION_PACK`
is a reward-only, one-card guaranteed Executive Edition pack that can be granted through RewardGrant.
No legacy `-H` or `Gold Holo` premium IDs remain in the current implementation.

The Alpha/playtest profile grant includes exactly one deterministic `CS-001-EXEC` copy using the
idempotent `alpha_playtest` source and `alpha-playtest:executive-card:v1` sourceRef. For local visual
QA only, setting `OCG_ALPHA_QA_EXECUTIVE=1` while running in `LOCAL` mode forces that real persisted
Executive Deck copy into the opening Hand of local `TRAINING` bot matches. The hook is not accepted
from requests, is ignored in network mode, and does not alter normal shuffle/draw behavior.

## Reward and grant foundation

The generic RewardGrant path is persistent and supports cards, Office Credits, Shredder Scraps,
cosmetics and pack entitlements. Grants carry a source, optional sourceRef and timestamp. A unique
sourceRef is idempotent so one-time rewards cannot be applied twice. Sources are ready for starter,
booster, craft, achievement, ranked, season, promotion, event and admin flows; only the current
starter/booster/economy paths are active.

## Bot, Training and Tutorial

`src/bot.ts` contains the first deterministic rule/heuristic Bot controller. It consumes projected
legal actions and sends normal server intents through the existing Match engine. It can develop its
board, use Capacity, attack Employees or Company Reputation when legal, respond/pass and end turns.
It does not use hidden information, external AI or a parallel rules engine.

Training creates an explicit Bot match using normal rules and `mode: TRAINING`. Training metadata
sets `rewardEligible:false`; Training does not grant Office Credits, XP, Scrap, packs, ranked
progress or normal PvP statistics. Training history is labelled separately.

Tutorial creates an explicit `mode: TUTORIAL` Bot match using the same engine and controlled
opening/guidance state. The current guided flow teaches opening hand, phases, Capacity, Employee
play, Battle, Reputation attacks and ending the turn. Tutorial is replayable and reward-ineligible.
Its guidance still needs further live UX polish, especially around phase advancement and keeping the
instruction step synchronized with accepted actions.

## Localization and artwork

English remains canonical and German uses the existing localization layer. The latest audit covers
107/107 card translations, 11/11 match UI anchors and 33/33 result keys. Artwork audit status is
107/107 ready with no missing, problematic or orphaned assets. Neutral board assets remain reusable
for desktop perspective and mobile Top View; perspective must not be baked into cosmetic images.

## QA evidence and known limitations

The current release has been checked at 1920x1080, 3840x2160, 390x844 and 844x390. Desktop
symmetry and mobile no-overflow checks pass; mobile remains flat and keeps 5:7 field-card anatomy.
The local smoke test verified:

- five-card Booster opening, authoritative credit deduction and reload persistence
- explicit card ownership changes after Booster, Scrap and Craft operations
- Scrap persistence and centralized provisional values
- Personnel File category switching, equipped state and Lobby return
- Company Store shop/ownership separation for the current fixture
- Training Bot action, response pass, combat resolution and Archive movement
- Tutorial match creation and first guided opening state

Known review items:

1. Economy values remain provisional/test values.
2. Player Decks are server-persistent, but true cross-device identity still depends on transferring
   or reusing the current `GUEST_LOCAL` profile token.
3. Unsaved local Deckbuilder drafts remain recoverable only on the originating browser.
4. Tutorial guidance requires further live UX polish.
5. Training/Bot quality needs continued real playtesting.
6. Board perspective may still be adjusted after live testing; never bake it into cosmetic image assets.
7. Current neutral Board assets remain reusable by Desktop perspective and Mobile Top View.
8. The local smoke profile is intentionally disposable; do not treat its wallet or collection as production data.

Do not rebalance the economy, redesign the Match Board or change perspective strength without a new
focused task. The Executive Alpha grant and deterministic opening-Hand hook are temporary test
infrastructure and must be removed or disabled when production acquisition/reward flows replace them.
