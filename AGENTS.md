# AGENTS.md — Office Card Game

## Scope

This file applies to the entire repository.

The Office Card Game is a browser-based digital trading card game with server-authoritative game state.

Treat this file as the persistent working contract for Codex when changing this repository.

# Current project state

Before starting work, determine the current repository baseline from `git status`, `git log` and
the package/server version. Do not assume a version from this file. The desktop Match Board uses
the accepted full-width layout and a permanent 3.25deg world-layer perspective. Mobile portrait
and landscape remain Top View with no perspective transform. The old permanent right Match sidebar
is replaced by compact Match, Log and Playtest overlays.

Current meta systems include persistent cosmetic ownership and CosmeticLoadout, Personnel File,
Company Store, explicit persistent card ownership, server-persisted player Decks with browser
migration, Office Credits for sandbox boosters, Shredder Scraps for recycling and crafting, and a
generic RewardGrant foundation. TRAINING and TUTORIAL are explicit Match modes with
rewardEligible:false. Normal hosted matches safely auto-advance START, DRAW and END only when no
authoritative interaction is pending; MAIN and BATTLE remain player-controlled. The Center Phase
Divider distinguishes local and opponent turns with green/red active-phase treatment plus a
localized non-color cue. Bots use the authoritative Match engine and choose legal actions. Ranked
timer enforcement remains disabled.

# Board symmetry contract

Own and Opponent use one canonical halfboard geometry.

Before perspective projection, corresponding Employee and Support slot center-X coordinates must
match. Own/Opp field topology must never be independently nudged or separately sized. Screen-space
UI such as Hand, HUD, action controls, Deck/Archive and overlays must not alter field-grid X
geometry. Any Match Board layout change must verify numerical Own/Opp symmetry at desktop reference
viewports.

---

# 1. Core working rule

For every UI or gameplay-adjacent change:

1. Inspect the current implementation before editing.
2. Reproduce the issue in the running application when possible.
3. Make the smallest coherent change.
4. Preserve server-authoritative gameplay.
5. Run relevant automated tests.
6. Start or reload the actual application.
7. Inspect the rendered result in a real browser.
8. Check desktop and mobile viewports.
9. Do not call a visual issue fixed based on source/tests alone.

Visual QA is mandatory for Board, Cards, Lobby, Deckbuilder, responsive layouts, Hover, Inspector, Archive, Deck, Targeting, Combat, Notifications, Cosmetics, and Overlays.

If rendered browser QA cannot be performed, explicitly report that limitation.

---

# 2. Required browser QA

target viewport mandatory; full matrix only for responsive architecture changes / release QA.

- 1920 × 1080 — desktop / 1K reference
- 3840 × 2160 — 4K
- ~390 × 844 — mobile portrait
- ~844 × 390 — mobile landscape when practical

For board changes test the real match flow where relevant:

1. Lobby
2. Mulligan
3. Main Phase
4. Hand
5. Play Employee
6. Play / Set Support, System or Incident
7. Battle targeting
8. Card-vs-card combat
9. Direct REP attack
10. Hover preview
11. Right-click Inspector
12. Archive
13. Played-card notification
14. Game Over when relevant

Check for clipping, overflow, z-index problems, incorrect card anatomy, wrong aspect ratios, misaligned slots, hover artifacts, flicker/remounting, ghost highlights, text truncation, mobile regressions, 1K / 4K scaling differences, board-skin crop problems, and inaccessible controls.

Use browser/devtools to inspect the actual winning CSS and DOM before adding another CSS override.

Prefer fixing the root renderer/layout rule instead of stacking more specific overrides.

---

# 3. Gameplay architecture — preserve

Unless explicitly requested, do not replace or reinvent:

- server-authoritative Game State
- Hosted Sync / SSE / Polling
- Priority / Auto-Pass
- Match Lifecycle
- Rematch
- Company Reputation / REP
- Capacity
- Deck / Hand / Archive
- phases
- attack legality
- target legality
- prevention / replacement
- 5 Employee slots per player
- 4 Support/System slots per player
- identical Own/Opponent topology

The frontend visualizes server results. Do not independently calculate combat outcomes or direct-attack legality on the client.

---

# 4. Board geometry

Own and Opponent use the same geometry.

Each player has:

- 5 Employee slots
- 4 Support/System slots
- identical card areas
- identical halfboard dimensions

Only player orientation is mirrored.

The Center Divider contains:

`START | DRAW | MAIN | BATTLE | END`

Rules:

- five equal-width segments
- active phase highlighted green
- text vertically centered
- divider belongs to neither board skin
- divider stays below modals, Inspector and Combat Overlay

Do not restore permanent board labels:

- OFFICE CARD GAME
- EMPLOYEES - 5
- SUPPORT / SYSTEM - 4

Do not restore the vertical left/right line inside a halfboard.

With a Board Skin active:

- individual card slots may remain visible
- large Employee/Support zone rectangles should not obscure the board art

---

# 5. Cosmetic loadout architecture

Each player has independent cosmetic slots:

```text
boardSkinId
avatarId
avatarFrameId
avatarDecorationId
cardBackId
badgeId
titleId
```

Use stable cosmetic IDs, not filenames, in saved/player state.

Naming direction:

```text
COS-BOARD-001
COS-AVA-001
COS-FRAME-001
COS-DECO-001
COS-BACK-001
COS-BADGE-001
COS-TITLE-001
```

Asset root:

```text
public/cosmetics/
```

Folders:

```text
public/cosmetics/boards/
public/cosmetics/avatars/
public/cosmetics/avatar-frames/
public/cosmetics/avatar-decorations/
public/cosmetics/card-backs/
public/cosmetics/badges/
```

Filenames:

```text
lowercase-kebab-case.webp
```

---

# 6. Board Skin rules

Board skins are player-specific.

Later both players can independently select their board.

Rendering rule:

- own selected board = normal orientation
- opponent selected board = same asset rotated 180 degrees

Never create a second mirrored image asset.

Current provisional board:

```text
COS-BOARD-001
public/cosmetics/boards/classic-office.webp
```

Currently both players may default to it, but keep separate player `boardSkinId` values.

Production target:

```text
Board Half Base        2560 × 768 px
Decoration Layer       2560 × 768 px alpha
Optional FX Layer      2560 × 768 px alpha
```

Board artwork rule: keep the inner edge near the Center Divider visually calm. Do not place important props where the front row/divider will cover them.

---

# 7. Current avatars

Production size:

```text
512 × 512 px
```

Current provisional avatars:

```text
COS-AVA-001 -> overworked-sysadmin.webp
COS-AVA-002 -> hr-oracle.webp
```

Temporary seat assignment:

```text
P1 -> COS-AVA-001
P2 -> COS-AVA-002
```

Attach this to stable P1/P2 seats, never local YOU/OPP labels.

Use the same avatar consistently in Player HUD, Opponent HUD, Direct REP Combat portrait, and future player identity surfaces.

---

# 8. Other cosmetic production sizes

```text
Avatar Frame        512 × 512 px alpha
Avatar Decoration   512 × 512 px alpha
Card Back           900 × 1260 px / 5:7
Badge                256 × 256 px
```

---

# 9. Canonical card anatomy

A card should visually remain the same card in Deckbuilder, Hand, Board, Hover, Inspector, Archive, and Played-card notification.

Canonical anatomy:

- Type
- Department
- Name
- Cost / Set Cost
- Artwork
- Rules Text
- Tags bottom-left
- Power bottom-right on Employees
- Modified Power adjacent only when changed

Type colors:

- Employee = blue
- Action = green
- Incident = red
- System = yellow/gold

Card ratio: `5:7`.

Mobile may scale cards down. Mobile must NOT replace them with a special compressed card anatomy.

---

# 10. Card interaction model

Keep:

```text
Hover       = quick detail preview
Left click  = gameplay action
Right click = pinned Card Inspector
Long press  = intended touch Inspector equivalent
small i     = fallback only
```

The small `i` may eventually be removed once right-click / long-press are reliable.

Hover preview:

- stable central preview position
- same logic for Hand and Field
- entire card visible
- Tags and Power must not be cut off
- no artifacts on neighboring cards

---

# 11. Hand / rendering stability

Hand:

- centered to Own Halfboard gameplay axis
- especially keep 1K centered
- fan width may change but center point should not drift

Normal SSE/Polling updates must not visibly remount cards.

Watch for regressions:

- hand flicker
- board-card flicker
- zone ghost highlights
- turn-start rectangle flash
- hover leaking Attack Mode state

Hovering an attack-ready Employee must not dim the hand. Attack visuals begin only after actual attacker selection.

---

# 12. Incidents / Card Backs

Face-down information is viewer-dependent.

Own set Incident: controller sees face.

Opponent set Incident: viewer sees full Card Back.

Opponent hand: Card Back.

Never render a Card Back as a small image inside a face-up card shell.

Card Back:

```text
900 × 1260
5:7
```

Deck uses the player's selected card back.

Deck count 0: no fake Card Back.

---

# 13. Deck / Archive

Preferred visual direction:

- physical card stacks directly on the board/table
- no large transparent dashboard boxes around them
- count labels may remain
- 4K stack preserves true 5:7 proportions

Archive:

Desktop:
- opponent archive expands downward / toward center
- own archive expands upward / toward center

Mobile:
- current viewport-safe archive positioning should remain unless evidence shows a problem

Archive cards must use real card anatomy.

Do not use a special compressed mobile Archive renderer.

Archive contents must remain reachable and scroll/wrap when needed.

---

# 14. Attack targeting

Attack Mode is board-native.

Attacker:

- click attack-ready Employee -> select
- click same Employee -> cancel
- click another attack-ready Employee -> switch
- Esc -> cancel on desktop

Target:

- hover legal enemy card -> red connector
- click -> attack

Direct REP:

- only if server-projected legality allows it
- entire enemy halfboard is the large click/tap target
- REP / player portrait remains the visual connector target

Do not restore the old large attack-target popup unless explicitly requested.

---

# 15. Combat

Current combat visualization is considered good.

Card vs Card:

```text
ATTACKER VS DEFENDER
```

- short clash/wiggle
- winner green
- destroyed card gets red ARCHIVED stamp
- draw -> both ARCHIVED

Direct REP:

```text
ATTACKER VS PLAYER PORTRAIT
```

- attacker success state
- player portrait red impact
- visible -X REP

Combat must consume server-authoritative resolution. Do not recalculate results client-side.

Combat overlay must be one-shot and must not restart because of SSE/Polling rerenders.

---

# 16. Notifications

Gameplay notifications must remain readable long enough.

Played-card reveal:

- mainly useful to the non-active opponent
- must be legible
- mobile card preview must keep real card anatomy

Do not let rapid events overwrite each other in milliseconds.

Combat should primarily explain itself through the Combat Overlay rather than toast text alone.

---

# 17. Lobby

Preserve:

- material executive desk
- selected-deck showcase
- three random cards
- prefer artwork
- no duplicates
- stable across normal rerenders
- reroll on deck change
- reroll when returning after a match

Lobby cards should stay consistent with Deckbuilder/card renderer.

4K:

- Rules Text appropriately sized
- Tags anchored at bottom
- Holo/Foil visible
- no artwork artifact strip

Do not create a separate mock card style for Lobby.

---

# 18. Deckbuilder

Do not casually change layout, measurements, or information architecture.

Deckbuilder is intentionally more tool-like than Lobby.

Its cards are a primary visual reference for canonical small-card anatomy.

---

# 19. Localization

English is canonical.

Do not replace canonical English strings with hardcoded German.

Player-facing text should use the localization layer.

German should cover Lobby, Mulligan, phases, Board, Hand, placement, Inspector, Archive, notifications, Combat, and Game Over.

Do not translate internal IDs or asset IDs.

---

# 20. Artwork

Card artwork:

- 16:9
- WebP preferred
- artwork only
- no frame
- no UI
- no logo
- no watermark
- avoid readable text
- main subject in central ~70%

Current target: `107 / 107 artworks`.

Do not orphan assets or break art paths.

---

# 21. Tests and release workflow

Current version family: `v7.69.x`.

For a release:

1. bump version consistently
2. add/update targeted regression tests
3. only update historical presentation tests if a later intentional UX rule supersedes them
4. never weaken old gameplay tests simply to make them pass

Minimum checks:

```text
npm run build
npm test
Artwork audit
Localization audit
/api/health
/api/ready
```

Verify Ranked Timer remains disabled unless explicitly requested.

Keep existing v48 / v68 / v7.68 / v7.69 regressions green.

---

# 22. Git workflow

Before editing: `git status`.

Identify the baseline/version.

Never discard user changes.

Prefer a task branch for non-trivial work.

Do not rewrite shared history.

If the user requests a mail patch:

- one coherent commit
- one git-format-patch / git-am compatible patch
- test git am on exact expected baseline
- compare applied tree against development tree

When working directly in Codex without a patch request, keep the diff reviewable and clearly report changed files and QA.

---

# 23. Definition of done

For visual issues, "fixed" means:

- actual app rendered
- issue reproduced
- fix visually inspected
- desktop/mobile viewports checked
- relevant interaction exercised
- no obvious regression introduced

Passing tests alone are not sufficient for visual tasks.

## PostgreSQL privileged operations

Production PostgreSQL administration must use the reviewed, root-owned
`/usr/local/sbin/ocg-db-helper` installed from the repository `ops/` artifacts. Its sudoers grant
must remain exactly:

```text
ocgadmin ALL=(root) NOPASSWD: /usr/local/sbin/ocg-db-helper
```

Do not grant passwordless access to package managers, PostgreSQL clients, `systemctl`, shells,
editors, or general filesystem commands. Do not modify `/usr/local/sbin/ocg-release-helper` for
database work. The DB helper may operate only on its fixed Office Card Game database, role,
environment, runtime, backup, state, and validated immutable release paths.

PostgreSQL must remain loopback/Unix-socket only. Production migrations are forward-only,
versioned, additive, checksum-recorded, and must succeed before release activation. A legacy JSON
snapshot and a validated PostgreSQL dump are mandatory before the first persistence cutover. A
database restore, helper installation/replacement, firewall change, or emergency environment
rollback remains human-root-only. See `docs/database-operations.md` for the exact workflow and
NO-GO conditions.

PostgreSQL-capable releases must be deployed through the reviewed repository-managed wrapper
installed at `/opt/office-card-game/deploy.sh`. A finalized release carrying
`deploy/postgres-persistence-ready` must run
`sudo -n /usr/local/sbin/ocg-db-helper migrate <validated-release>` successfully before activation.
The immutable release must contain working production `argon2` and `pg` runtime dependencies; never
rely on `node_modules` from the mutable source checkout. The deployment wrapper must not call
`enable-postgres`; changing the authoritative backend remains a separate explicit cutover action.

Authenticated Account identity must resolve exclusively from an opaque server session cookie;
never trust client-supplied user, player, profile, or role identifiers for authorization. Store only
modern password hashes and hashed session tokens, never log or return authentication material, and
keep Account profile/economy/deck mutations transactional and safe across processes. Guest identity
must remain visibly separate and must not become a parallel authoritative Account store.

The internal `/ops` surface and every `/api/ops/*` endpoint require an authenticated database-backed
`OPS` or `ADMIN` role on the server. Operations Phase 1 is read-only: never expose arbitrary SQL,
shell/root/helper execution, environment dumps, credentials, hashes, tokens, unrestricted paths, or
log-file reads. Do not give the web service sudo/systemd access for observability; unavailable
infrastructure-only state must remain unavailable. Add an attributable Admin Audit Log before any
future Ops mutation endpoint.

## Git and Release Workflow

- Work directly in the local repository.
- Local implementation, builds, tests, and commits may be performed autonomously.
- Keep `package.json` and `package-lock.json` version numbers synchronized on every version bump.
- Do not create patch files for normal development unless explicitly requested.
- Do not push, merge, tag, or deploy unless the user explicitly asks for a release or deployment.

### Release workflow

When the user explicitly asks to release or deploy a version:

1. Ensure the working tree contains the intended changes only.
2. Ensure `package.json` and `package-lock.json` use the same release version.
3. Run the full required QA:
   - `npm.cmd ci`
   - `npm.cmd run build`
   - `npm.cmd test`
4. Do not release if tests fail.
5. Commit all intended release changes.
6. Push the release branch to `origin`.
7. Merge the release branch into `main`.
8. Push `main`.
9. Create and push an annotated release tag matching the version, e.g. `v7.69.19`.
10. Deploy production only through:
    `/opt/office-card-game/deploy.sh <tag>`
11. After deployment verify:
    - `/api/ready`
    - `/api/health`
    - deployed release path
12. A deployment is successful only if the expected version is live and readiness reports `READY`.

### Production deployment

Production host:
- SSH user: `ocgadmin`
- Host: `185.94.29.30`
- Windows PowerShell SSH key: `$env:USERPROFILE\.ssh\office_card_game`

For production deployment, explicitly use the SSH identity file:

`ssh -i "$env:USERPROFILE\.ssh\office_card_game" ocgadmin@185.94.29.30 "/opt/office-card-game/deploy.sh <tag>"`

Do not rely on implicit SSH key discovery.

If Codex requires approval to access the network or SSH key, request approval rather than substituting another credential or changing server authentication.

Use the existing deployment script. Do not manually modify the production release contents.

If Git push, SSH, deployment, tests, readiness, or health checks fail:
- stop,
- do not improvise destructive fixes,
- report the exact failure and current repository/deployment state.
