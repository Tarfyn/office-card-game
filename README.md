# Office Card Game — Engine + Network Demo v7.50

A deterministic, server-authoritative TypeScript prototype for the Office Card Game.

v7.38 is the first focused **Alpha card-pool expansion** after the v7.31–v7.37 validation block. It adds 10 engine-backed cards selected from the v7.37 content-gap audit, growing the pool from 97 to 107 while leaving the five tuned starter lists, rules framework, format and economy values unchanged.

## Quick start: play in two browser windows

The zip already contains a prebuilt `dist/`, so there are no runtime package dependencies.

Requirements: Node.js 20+ recommended.

```bash
npm run serve
```

Then open:

```text
http://127.0.0.1:8787
```

You now have two play paths:

**Quick Match:** each browser/device chooses a deck + Friendly/Ranked Alpha and presses **Find opponent**. Friendly is unrated. Ranked Alpha uses persistent preseason MMR and rating-aware search windows; the server opens the match automatically.

**Private Room:**
1. Browser A chooses a deck and **Create room**.
2. Copy the six-character room code.
3. Browser B / private window enters the code, chooses a deck, and **Join room**.
4. Both players keep or mulligan their opening hand.
5. The client only displays commands the authoritative engine currently considers legal.

Both paths use the same RoomService, rules engine, hidden-information projection and Match Intent API.

### Test on a real phone/tablet on the same Wi-Fi

Run:

```bash
npm run serve:lan
```

The terminal prints one or more LAN URLs such as `http://192.168.x.x:8787`. Open that URL on the phone/tablet while the desktop and mobile device are on the same network. Both devices use the same RoomService, hidden-information projection and authoritative intent validation, so this is a real two-device match rather than a separate mobile simulation.

`serve:lan` is intended for local testing. Internet play later should use the same server behind a proper hosted HTTPS endpoint rather than exposing a development machine directly.

The network demo now ships with all five legal 40-card Alpha starter presets:

- `Customer Service Starter v0.3` — React / Redirect / Reopen / Survive
- `IT Starter v0.3` — Setup / Automate / Generate / Deploy
- `Office Starter v0.1` — Coordinate / Approve / Delay / Organize
- `Marketing Starter v0.1` — Chain Actions / Pressure / Convert
- `Production Starter v0.1` — Staff / Output / Overwhelm / Break Through

All five can create/join network rooms. All **107 current Alpha card definitions are marked `FULL`** and have engine-backed rules definitions. Implementation metadata remains in the catalog for future development waves.

## Build from source

The build no longer uses Unix-only shell commands (`rm`, `cp`, `mkdir -p`). `scripts/build.mjs` uses Node filesystem/process APIs, so the same npm commands work in Windows PowerShell, macOS, and Linux.

```bash
npm install
npm run build
npm test
```

On Windows you can use either `npm run ...` or `npm.cmd run ...` depending on your PowerShell execution-policy setup.

Current automated test status is verified by the bundled suite, including the complete historical rules/room/UI regressions plus the v7.38 expansion checks.


## v4.0 additions

- Added `src/timers.ts` as a dedicated server-authoritative runtime for future timed play.
- Timer profiles are configuration-driven; `RoomService` receives the profiles from `data/match-settings.json`.
- Turn time only runs during the active player's own decision time. Opponent response windows and off-turn choices pause that clock and use the response clock instead.
- Optional **Time Bank** is implemented as a shared per-player reserve consumed only after the current base turn/response clock is exhausted.
- Response timeout behavior is **automatic PASS_PRIORITY**, preserving Chain/response rules instead of instantly forfeiting the match.
- Turn timeout and non-passable off-turn decision timeout end the match with explicit `TURN_TIMEOUT` / `DECISION_TIMEOUT` reasons.
- Optional reconnect grace is tracked per seat; when configured, expiry can produce `RECONNECT_TIMEOUT` only while the opponent is actually connected.
- Active timer runtime, remaining bank and reconnect deadlines persist with the RoomService snapshot.
- Five-second timer checkpoints freeze consumed time before persistence; local server downtime is not charged to a player after restart.
- Room projection now includes a safe timer snapshot (`deadlineAt`, clock kind/owner, remaining bank, reconnect deadlines) for client rendering.
- Browser countdown is calculated locally from server deadlines and server-time offset, so the server does not need to emit SSE state every second.
- The shipped `UNTIMED` and `RANKED_STANDARD_TBD` profiles still have `enabled: false` and `null` timing values. Ranked remains a rules preview, not a timed/rated mode.
- AFK timeout remains separate and disabled; no card-rule, balance, board-layout or mobile-interaction changes.


## v3.9 additions

- `RoomService` now tracks server-owned lifecycle timestamps: room creation, match start, turn start, response-window start, last seat activity and disconnect time.
- SSE connections call `connectSeat(...)` / `disconnect()`, so each client can see whether the opponent is currently online or reconnecting.
- Restored rooms intentionally come back with zero live connections; persistence never pretends a pre-restart socket is still online.
- Header **Back to lobby** parks the current room token locally instead of destroying it. The lobby exposes a **Resumable Session** card.
- Waiting private rooms can be explicitly abandoned, removing the unused room code from persistence.
- Active abandon uses the existing server-authoritative `RESIGN` result and keeps the ended room available for normal reward/history flow.
- `data/match-settings.json` now declares the lifecycle capabilities, but `autoForfeitEnabled`, `afkTimeoutSeconds` and `reconnectGraceSeconds` remain disabled/null.
- Fixed a duplicate `saveSession(...)` call in the Quick Match matched-session browser path.
- No card-rule, balance, board-layout or mobile interaction changes.

## v3.8 additions

- `RoomService` now has a persistence adapter and restores private waiting rooms plus active/ended matches from local JSON.
- Room seat tokens, selected decks, match settings, authoritative `GameState`, room version and processed-intent cache survive a local server restart.
- Existing browser `SESSION_KEY` reconnect therefore works across server restarts instead of only page reloads on one running process.
- Quick Match queue now has its own persistence adapter; waiting and already-matched tickets survive restart.
- Matching a pair is persisted atomically through `markPairMatched(...)`, reducing half-matched crash states.
- Local server files: `runtime/profiles.local.json`, `runtime/rooms.local.json`, `runtime/matchmaking.local.json`.
- `/api/health` exposes profile, room and matchmaking storage modes.
- Match reward idempotency now checks persisted `claimedRewardRooms`; restarting the server cannot reopen an already-paid room reward.
- A replayed reward claim returns the current profile rather than a stale in-memory profile snapshot.
- Still no card-rule, balance, board-layout or mobile interaction changes.


## v3.7 additions

- Guest Playtest Profiles now use a **local persistent JSON store** by default: `runtime/profiles.local.json`.
- Credits, Shredder Scraps, owned cards, collection mode, XP/level and profile name survive Node server restarts.
- The persistence layer is an adapter on `PlayerProfileService`; tests can use in-memory adapters and a future hosted build can swap in a database without changing profile consumers.
- `/api/health` exposes `profileStorage: FILE_JSON_LOCAL` so the client/test harness can see the active persistence mode.
- Profile records now contain W/L stats plus Friendly/Ranked match counts.
- Reward claims append a deduplicated recent match-history entry with opponent name, both deck names, mode, turns and end reason.
- Lobby profile strip shows W–L and a collapsible **Match history** panel with the five most recent recorded results.
- Quick Match stores the current ticket ID in browser storage and reconnects to the same waiting/matched ticket after a page reload while the server is still running.
- A stale ticket from a restarted server is automatically discarded rather than trapping the client.
- Real restart smoke verified: create profile → seed 40-card collection + 500 Credits → stop server → restart → same secret token restores the same name, wallet and 40 owned cards.
- Real match-history smoke verified: Friendly match → mulligans → resign → winner claims reward → profile reports `1` match / `1` win with opponent/deck/turn/reason history.
- Local JSON contains secret playtest tokens and is **not production auth**. Do not expose the development profile store as a public account database.

## v3.6 additions

- Server-issued **Guest Playtest Profile** with secret browser-held `profileToken`.
- Server owns the active profile meta state: Office Credits, Shredder Scraps, owned cards, collection mode and progression.
- Profile display name can be changed in the lobby and is projected into the room as the visible player name; private profile IDs are not projected to the opponent.
- Manual Create/Join rooms bind each seat to its playtest profile when a profile token is present.
- Reward claims verify that a profile-bound room seat cannot redirect its reward to a different profile.
- Economy start/refill/reset, booster open, Shredder and Craft endpoints can mutate the server profile directly through the profile token.
- First **Quick Match** queue for Friendly and Ranked Preview: oldest compatible queued player is paired automatically.
- Queue prevents a profile from matching itself and supports waiting/status/cancel flows.
- Desktop and mobile clients share the same matchmaking queue when connected to the same server, preserving the crossplay architecture.

## v3.5 additions

- One-time post-match **Office Credit + XP** sandbox rewards for Friendly and Ranked Preview rooms.
- Server-authoritative reward eligibility and per-seat claim deduplication.
- Reduced reward for the player who resigns; winner still receives the normal win reward.
- Optional **Owned Copies** deckbuilder mode that caps deck copies to the local collection.
- `All Alpha cards` remains the default so rules/balance playtesting is never grind-locked.
- Owned-mode validation surfaces when a saved deck requires more copies than the collection contains.
- Profile level now advances from sandbox XP (`100 XP` per level step for testing).
- Match reward values are configuration-only and explicitly non-canonical.
- HTTP smoke verified: Friendly room → both mulligans → resign → winner `+35 Credits / +30 XP`, resigning loser `+10 / +10`, repeated winner claim returns the cached receipt without paying twice.

## v3.4 additions

- Removed the blanket **first-three-copies protection** from the Shredder.
- Any card can now be shredded down to **0 owned copies**.
- Authoritative collection guard: after each shred, the remaining collection must still be capable of forming at least one legal **40-card Alpha deck**.
- The guard respects `defaultCopyLimit` and format-specific card limits; excess duplicates above the legal limit do not count toward the 40-card safety floor.
- Server rejects unsafe shred requests with `COLLECTION_FLOOR` even if a client is manipulated.
- Saved custom decks do not hard-block shredding. Instead, the Collection preview warns when the post-shred owned count would make a saved deck short in future owned-copy mode and asks for confirmation.
- Economy Lab shows the current playable collection capacity and whether the selected copy may safely be shredded.
- Sandbox start now seeds **Customer Service Starter v0.3** as a legal 40-card owned collection plus the configured test Office Credits, making the collection-floor loop immediately testable.
- Normal Alpha gameplay/deckbuilding remains `SANDBOX_ALL_AVAILABLE`; owned-card restrictions are still not enabled for match testing.
- Crafting prices, scrap yields, booster price/distribution, rarity sandbox logic, rules and card balance are unchanged.

## v3.2 additions

- Playable local **Economy Lab** in the Collection/Deckbuilder.
- Start/reset/refill a local Alpha test wallet; no account or cloud persistence is implied.
- **Office Credits** buy the sandbox `Office Alpha Pack`.
- Five-card pack prototype: 3× T0, 1× T1 and 1 weighted flex slot.
- Booster reveals add real card copies to `ownedCards` and increment progression telemetry.
- Selected cards display owned-copy count plus their temporary T0–T3 sandbox tier.
- **Shredder** converts owned cards into Shredder Scraps. v3.2 originally used a temporary three-copy protection; v3.4 replaces that with the one-legal-deck collection floor.
- **Target Crafting** spends Shredder Scraps to create the exact selected card.
- Current sandbox test values: T0 `+10 / 150 craft`, T1 `+25 / 300`, T2 `+60 / 600`, T3 `+150 / 1200`.
- T0 therefore currently targets roughly 15 recycled T0 cards per chosen T0 craft; this is a test point inside the broader 10–25 low-tier design target, not final balance.
- Sandbox rarity is derived temporarily from rank/cost and is **not written into the canonical 107 card definitions**.
- Live economy remains disabled and normal Alpha deckbuilding still has all cards available, so economy testing cannot block gameplay testing.
- Server exposes stateless sandbox transaction endpoints for booster open, shred and craft; the client persists the local test profile in-browser.

## v3.1 additions

- Mobile battlefield foundation: Employee and Support rows preserve tactical order as horizontal swipe rails on screens up to 760px.
- Own hand becomes a non-overlapping horizontal touch rail with scroll snapping.
- Larger touch targets for card info, abilities, legal slots, interaction choices and phase actions.
- Sticky mobile battlefield navigation: **Opponent / Decision / You**.
- Mobile-safe card close-up and safe-area-aware bottom command dock.
- Hover-only behavior is disabled on coarse pointers while tap/click intents remain identical.
- `npm run serve:lan` starts the same server on `0.0.0.0` and prints local-network URLs for real same-Wi-Fi desktop/mobile testing.
- Scroll-aware attack connector behavior remains active for swipe/scroll movement.
- Rules, card balance and board slot arrangement are unchanged.


## v2.9 additions

- Six supplied real PNG artworks are embedded offline under `public/art/alpha/`.
- `CS-001` Customer Service Agent → `alpha/customer-service-agent.png`.
- `IT-003` System Administrator → `alpha/system-administrator.png`.
- `OFC-007` Approval Required → `alpha/approval-required.png`.
- `MKT-012` Going Viral → `alpha/going-viral.png`.
- `PRD-008` Plant Manager → `alpha/plant-manager.png`.
- `N-013` Coffee Machine → `alpha/coffee-machine.png`.
- All six sources are 1672×941 and use the canonical 16:9 `object-fit: cover` artwork pipeline.
- PNG is intentionally accepted for this visual test; WebP remains the preferred later batch format.

## v2.5 additions

- Canonical artwork handoff is documented in `ARTWORK_SPEC.md`: **1600×900 px · 16:9 · WebP preferred · PNG accepted · no frame/text/logo/watermark**.
- Important subjects should remain inside the central ~70% safe area because the same source art is cropped with `object-fit: cover` in hand, field, hover and modal views.
- `artId` is now a relative asset path **including its extension** under `public/art/`, so future `.webp`, `.png` and current `.svg` placeholders can coexist without UI code changes.
- The six visual test cards remain Customer Service Agent, System Administrator, Approval Required, Going Viral, Plant Manager and Coffee Machine.
- Desktop Employee and Support cards now use a fixed **150×210 px** field footprint; rules length, missing tags and artwork availability no longer change the outer card size.
- Own hand cards retain the fan treatment but use one fixed shared footprint.
- All artwork windows use one canonical **16:9** crop and centered `object-fit: cover` behavior.
- Empty rules/tag areas reserve layout space invisibly, preventing cards with less metadata from appearing smaller.
- Existing non-modal hover preview, click close-up, mirrored board and hidden-information behavior remain unchanged.

## v2.0 additions

- Own hand is rendered as a layered/fanned hand with per-card angle/depth and hover-to-front behavior.
- Mirrored v1.9 battlefield is retained: opponent hand/back row/frontline above the center and own frontline/back row/hand below it.
- Targeting mode visually suppresses irrelevant cards while lifting legal targets; selected attackers/targets remain prominent.
- Response windows receive a centered game-facing treatment instead of reading like a debug panel.
- First stronger card-frame prototype: type-colored frame, type pill, department as secondary metadata, dedicated artwork window, compact rules box and type-colored Power badge.
- Card close-up uses the same frame system and a much more explicit future artwork area.
- Rules engine, multiplayer protocol and hidden-information behavior are unchanged from v1.9.

## v1.9 additions

- Mirrored head-to-head board: Employees face each other directly across the center line.
- Support cards sit behind each player's Employee frontline.
- Opponent hand is shown at the top as hidden card backs; own interactive hand remains anchored at the bottom.
- Existing Pending, Chain, attack connector and resource UI follows the mirrored board orientation.

## v1.8 additions

- Public delayed Actions are projected as `match.pendingResolutions` and rendered in a visible **PENDING** lane on the responsible player's board.
- Visible scheduled effects are projected separately and shown as compact upcoming-effect markers instead of requiring Event Log inspection.
- The authoritative projection exposes the current public `pendingAttack` (attacker, target/direct attack, controller, cancelled state).
- During an open attack/response window the browser draws a curved attack connector from the attacker to the defending Employee or Company Reputation.
- Company Reputation is now a large resource with a 0–30 meter instead of a small debug pill.
- Capacity gets seven visual pips, including support for temporary Capacity above the normal cap.
- First provisional card-type frame language: **Employee blue · Incident red · Action green · System yellow/orange**. Department remains secondary metadata.
- Larger card close-ups use the same type-color frame while leaving the art area intentionally placeholder-only.
- Hidden-information rules are preserved: pending cards are only shown when the card itself is public, and scheduled effects are omitted when their source is not visible to that viewer.

The card-frame treatment is deliberately a first structural pass. It is not intended as the final visual design or artwork system.

## v1.7 additions

- Board-centered response/decision area instead of hiding important interaction in the utility sidebar.
- Redacted visible Chain projection (`match.chain`) with source, controller, target refs and negated/delayed state where that information is legal for the viewer.
- Visual Chain stack: newest effect is shown first because it resolves first.
- Activated abilities are surfaced directly on eligible field cards through an `ACT` affordance.
- Deck and Archive use compact pile UI; Archive can be expanded when needed.
- Main-phase/battle play is primarily card-first; advanced button lists are collapsed as a playtest fallback.
- Sticky compact phase control replaces the permanent large action sidebar.
- Balance telemetry adds average Actions, Incidents, Abilities, Attacks and Reputation restoration per starter deck.
- Bot combat posture is more archetype-aware: Customer Service/Office preserve valuable engines more often, while Production accepts equal trades more readily.

Reference 60-game heuristic run (`--games=6 --seed=15001 --max-turns=30`): **54 completed / 6 turn-cap**, **0 BOT_STUCK**, average **18.73 turns**, first-player win rate **51.9%**. Customer Service remains strongly underplayed by the heuristic (14.3% completed-game win rate) while Production remains easy for the bot to pilot (73.9%), so these values are diagnostic signals rather than card-balance conclusions.

## v1.6 additions

### Cross-platform build pipeline

`npm run build` now calls `node scripts/build.mjs`. The script removes/recreates `dist/`, compiles TypeScript, and copies card/deck/format JSON using Node APIs rather than shell-specific commands. This fixes the PowerShell issue from v1.5 while preserving the existing commands:

```bash
npm run build
npm test
npm run balance -- --games=10 --seed=15001 --max-turns=30
```

### Archetype-aware bot telemetry

The heuristic simulator now has deck-specific mulligan/setup priorities and response scoring for reactive cards instead of treating every legal card as roughly interchangeable. It also reports a per-deck overview (wins/losses/timeouts, average turns, final Reputation, cards played).

The bot is still explicitly **not an optimal-play oracle**. The current 60-game reference run (`reports/balance-v1.7.json`) still underplays Customer Service and makes Production look unusually strong, so those numbers remain regression/outlier signals rather than a balance verdict.

Run the reference series with:

```bash
npm run balance -- --games=6 --seed=15001 --max-turns=30
```

### More game-facing browser playtest

The browser now emphasizes the current game decision before developer metadata:

- `YOUR MAIN PHASE`, `YOUR RESPONSE`, `YOUR DECISION`, or opponent-turn banner
- Chain badge when a Chain is active
- technical match metadata moved behind a collapsible detail section
- event log collapsed by default
- lightweight event toast for plays, attacks, destruction, Reputation changes, Incidents, and game end
- small card motion cues for play/attack/destruction with `prefers-reduced-motion` support

This remains intentionally separate from the future final card skin. The current UI does **not** yet apply the proposed blue Employee / red Incident / green Action / yellow-orange System card-frame direction.

## v1.5 additions

### Alpha rules catalog complete

The v1.5 milestone completed the original **97/97 FULL** engine-backed Alpha cards across Customer Service, IT, Office, Marketing, Production, and Neutral.

New generic rule families include:

- post-resolution `ACTION_WOULD_BE_ARCHIVED` response windows (`Client Feedback`)
- post-battle `BATTLE_EMPLOYEE_DESTROYED` Incident windows (`Cover the Shift`)
- archive-cause metadata with source/controller/tags (`Temporary Worker`)
- last-completed-turn activity history (`Escalation Specialist`, `I'd Like to Speak to Your Manager`)
- next-Promotion material reduction
- continuous Action-play limits (`Legacy ERP`)
- first-per-turn Reputation-loss replacement (`PR Manager`)
- temporary direct-damage riders (`Boost the Post`)
- target subsets / role selection (`All Hands Meeting`, `Quick Meeting`)
- self-archive protection responses (`Maintenance Technician`)
- random private hand reveal + temporary viewer-specific face-down Support visibility (`Office Gossip`)
- Action-target response support for `Interim Team Lead`

Replacement and reveal behavior stays server authoritative; hidden information is only projected to the viewer entitled to see it.

## v1.3 additions

### Triggered effects can now ask their controller to choose targets

Triggered abilities with printed targets no longer get skipped or auto-targeted. The engine creates a dedicated `PendingTriggerTargetSelection`, exposes only legal candidates to the correct viewer, blocks unrelated commands, and resumes assembly of the triggered Chain after the player selects.

This completes cards such as:

- `Service Desk Lead`
- `Office Manager`
- `Customer Satisfaction Survey`
- `Packaging Machine`

Target selectors can also exclude the source, the source card's definition, or the attacker from the triggering Battle Event.

### Hand selection / discard continuation

`ARCHIVE_FROM_HAND_SELECT` creates a private, resumable hand-selection state. The browser lets the correct player select the required card(s), and the Chain continues only after that choice resolves.

This completes:

- `Social Media Manager`
- `Backend Developer`

The same primitive can later support discard costs and other hand-choice effects.

### Temporary replay restrictions

Cards returned from Archive can now receive a server-enforced `cannot play this turn` restriction. Legal-action projection hides them from playable choices, and direct engine/Intent calls are rejected as well.

This completes the remaining clauses of:

- `Follow-Up Email`
- `One More Feedback Round`

### Promotion material value

Promotion materials can temporarily count for more than one Employee. Legal Promotion projections enumerate minimal valid material sets by total material value instead of raw card count.

`Escalated Ticket` can therefore return a Staff Employee that counts as **2** Promotion materials for the rest of the turn.

### Additional generic primitives

- archive → Deck movement with optional deterministic shuffle (`Ticket Closed`)
- special Employee/System play through `PLAY_TARGET`
- effect-level Capacity adjustment for special plays (`Staging Environment`)
- `CARD_DELAYED` trigger events (`Operations Director`)
- optional top-two filtered selection to hand (`Campaign Dashboard`)
- `HAS_FREE_SLOT` conditions

### Catalog implementation progress at v1.3

v1.3 reached 84 FULL cards. v1.5 subsequently completed the remaining 13, bringing the current Alpha catalog to **97/97 FULL**.

## v1.2 additions

### Generic card-play trigger family

The Trigger Queue now supports `CARD_PLAYED` events with controller, card filters, and `PlayMethod` filters. Counters are updated before the trigger condition is evaluated, so effects such as “second Call”, “second Marketing Action”, and “third Marketing Action” are data-driven. Newly played Employees/Systems do not trigger their own presence-based abilities because eligible trigger sources are snapshotted before the card enters play.

Representative cards now fully backed by this layer include:

- `Customer Service Agent`
- `Call Center Agent`
- `IT Service Agent`
- `DevOps Engineer`
- `Frontend Developer`
- `Administrative Assistant`
- `Executive Assistant`
- `Content Manager`
- `Marketing Lead`
- `Chief Marketing Officer`
- `Production Planner`
- `Conveyor Belt`
- `Office Assistant`

Empty trigger-response windows auto-pass only when neither current Priority holder has a legal response. This avoids forcing two meaningless Pass clicks for routine self-buffs while still preserving real Priority when an Incident or in-play response exists.

### New generic timing / condition primitives

Added DSL support for:

```text
REPUTATION_RESTORED
ACTION_RESOLVED
CARDS_PLAYED_BY_TAG_EQUALS
CARDS_PLAYED_BY_TAG_AT_LEAST
ACTIONS_PLAYED_TOTAL_EQUALS
ACTIVE_PLAYER_IS
TARGET_MATCHES_FILTER
```

This completes cards such as `Review Portal`, `Head of Customer Service`, `Department Manager`, `Paper Trail`, and `Presentation`.

### Attack restrictions and longer effect durations

`PREVENT_ATTACK` now supports both end-of-turn restrictions and “through the target controller's next Battle Phase”. Power modifiers can also last until the start of the ability controller's next turn.

This enables:

- `Calendar Block`
- `Signed and Approved`
- `Conveyor Belt`

### Generic mass effects

`FOR_EACH_MATCHING` applies nested effects to every card matching a normal Target Selector without asking the player to manually select cards that are not actually targeted by the printed rules. Filters can distinguish Employees that entered the field this turn.

This completes, among others:

- `Full Production`
- `Night Shift`
- `Marketing Lead` team buff

### Expanded continuous effects

Continuous selectors can now be `sourceOnly`, while conditions can depend on whose turn it is or whether a tag was already played this turn. This completes:

- `Team Lead Customer Service`
- `Department Manager`
- `Machine Operator`
- `Warehouse Worker`

### Catalog implementation progress

The card catalog still contains **97** definitions, but v1.2 moves a large part of the remaining prototype text into executable DSL:

- **71 FULL**
- **11 PARTIAL**
- **15 TEXT_ONLY**

That is **27 additional fully engine-backed cards** compared with v1.1. The browser implementation-status badge automatically reflects the new catalog data.

### Five Alpha starter decks and card close-up

The v1.1 five-starter browser shell remains unchanged: all five legal 40-card Alpha starter presets are selectable, visible cards have a larger close-up, and legal hand plays are highlighted.

Drag-and-drop remains deliberately deferred. It can later translate pointer gestures into the same existing Match Intents (`PLAY_EMPLOYEE`, `PLAY_ACTION`, `SET_INCIDENT`, `DECLARE_ATTACK`, etc.), so no rules-engine redesign is required.

## v1.0 multiplayer additions

### Room / session layer

`src/room.ts` wraps the existing headless engine without moving rules into the networking layer.

A room has:

- P1 host session token
- optional P2 guest session token
- chosen deck preset for each seat
- authoritative `GameState` once P2 joins
- processed-intent cache for network retries
- subscribers for live state pushes

The browser never supplies a trusted `playerId` or `matchId`. The server derives the player seat exclusively from the room session token.

### Idempotent network commands

A network request contains:

```json
{
  "intentId": "client-generated-uuid",
  "expectedStateVersion": 12,
  "intent": {
    "type": "DECLARE_ATTACK",
    "attackerId": "...",
    "targetId": "..."
  }
}
```

The room service then creates the trusted internal command with the correct match/player identity.

If the same `intentId` is retried, the previously cached response is returned and the move is not applied twice.

If `expectedStateVersion` is stale, the authoritative engine rejects it without mutating state.

### Live transport

The first transport is intentionally simple and dependency-free:

- HTTP `POST` for create/join/intents
- HTTP `GET` for state/catalog/presets
- Server-Sent Events (SSE) for room state pushes

The transport can later be replaced by WebSockets/Colyseus without changing the game rules or room command API.

### Minimal browser client

`public/` contains a small plain-JS client with:

- room creation/join
- reconnect from local session storage
- two-player viewer-safe board state
- phase / turn / Capacity / Reputation display
- hand, Employee field, Support field, Archive
- mulligan selection
- legal Employee/System/Incident/Action buttons
- legal Promotion slots/material combinations
- target selection
- activated abilities and response options
- attack target selection / direct attacks
- Priority pass
- pending choices
- deck search/topdeck selection
- resign
- recent viewer-safe event log

This is a functional testing client, not the intended final visual design.

## Security / hidden information

The authoritative server keeps the full state. Each browser receives only `projectStateForViewer(...)`.

The opponent does **not** receive:

- hand card identities
- deck order
- face-down Incident definition IDs
- stable internal IDs for unknown face-down Support cards
- private search/topdeck information

Opponent face-down targets are exposed as opaque slot handles and resolved back to internal card IDs only on the server.

The event stream is redacted separately so hidden information cannot leak through logs/network inspection.

## Core architecture

```text
Browser Client
    |
    | Match Intent
    v
HTTP / SSE Transport
    |
    v
RoomService
    |  token -> P1/P2
    |  idempotency / room lifecycle
    v
executeMatchIntent()
    |
    v
Authoritative Rules Engine
    |
    +--> GameState
    +--> Event Log
    +--> Viewer Projection
```

The client does not decide damage, targets, legal plays, Capacity costs, Promotion legality, Priority, Chains, or hidden information.

## Existing rules coverage

The engine currently includes, among other things:

- deterministic seeded shuffle
- 5-card opening hand and one free mulligan
- first player “opens the office” and skips first draw
- `START -> DRAW -> MAIN -> BATTLE -> END`
- Capacity progression 2 -> 7, refill, temporary Capacity above max
- 5 Employee / 4 Support slots
- Onboarding
- Power combat and direct Reputation attacks
- Actions, Systems, face-down Incidents
- Support slot competition
- Promotion costs/materials
- Archive / Return to Hand / Return from Archive
- Response Windows, Priority, Chains, Negation, Redirect
- Delay / Pending effects
- Scheduled effects and object-version tracking
- triggers and Trigger Queue
- continuous effects
- Cost modifier pipeline
- Breakthrough
- battle destruction replacement (`Sick Leave`)
- card-effect destruction prevention (`Emergency Patch`, `Hotfix`)
- Search / Reveal / Shuffle / Topdeck/Bottomdeck selection
- external JSON card definitions
- deck formats and Banlist/copy-limit configuration
- hidden-information projections
- typed, transactional Match Intents
- snapshot/restore support

## Data files

```text
data/cards.json          Card definitions / DSL
data/decks.json          Five Alpha starter presets
data/formats/alpha.json  Deck size + copy limits / banlist
```

Standard new cards that use existing DSL operations can be added to JSON without editing the rules engine.

## API endpoints

### Public

```text
GET  /api/health
GET  /api/catalog
GET  /api/presets
```

### Rooms

```text
POST /api/rooms
POST /api/rooms/:roomId/join
POST /api/rooms/:roomId/abandon?token=...
GET  /api/rooms/:roomId/state?token=...
GET  /api/rooms/:roomId/stream?token=...
POST /api/rooms/:roomId/intent?token=...
```

Example room creation:

```json
{ "deckId": "customer-service-starter" }
```

Example join:

```json
{ "deckId": "it-starter" }
```

## Current limitations

This is intentionally still an alpha architecture prototype:

- rooms use local JSON persistence for development; a production deployment still needs a real database/expiry policy
- no accounts/authentication beyond unguessable per-room session tokens
- Quick Match exists, but there is still no friend list, real ranked/MMR or enforced reconnect/AFK timeout policy yet
- no production database/account backend; current persistence is local JSON only
- no spectators
- no active timer / automatic AFK forfeit; lifecycle telemetry exists but enforcement remains off
- no side deck / Best-of-3
- browser client is functional rather than polished
- prompt-based target/slot choices still exist in the test UI; direct board selection and drag-and-drop come later

## Recommended next layer

With reconnect/session authority, stable player identity, split guest credentials, telemetry/analytics and player-perspective replays now in place, the next infrastructure step can focus on **Ranked foundation without activating final timers yet**:

1. add a persistent rating/MMR record keyed by stable `playerId`
2. add placement state and season-ready fields without launching a live season
3. make Ranked matchmaking rating-aware while keeping Friendly unchanged
4. define authoritative ranked result/forfeit updates and idempotent rating receipts
5. keep shipped Ranked timer enforcement disabled until the human telemetry sample is large enough to tune it

The current JSON stores remain replaceable development adapters; a hosted database/auth provider can implement the same service boundaries later.





## v4.9 — Collection, booster and match-impact polish

- Reworked Collection browser tiles into compact card-like frames with name/cost hierarchy, rules snippets, tags, Power/rank metadata and selected-card emphasis.
- Collection rarity now uses the same sandbox rarity derivation as the economy (`T0`–`T3`) instead of showing `TBD` for cards without explicit rarity metadata.
- Added collection-set progress for unique owned cards and current real-artwork coverage.
- Added staged five-card booster opening: one pull is revealed at a time, with **Reveal all** as a fast path.
- Added lightweight T3 chase-card foil/glint presentation; it is visual only and respects reduced-motion preferences.
- Added NEW labeling for the first newly acquired definition in a pack while keeping owned-copy counts visible on repeat pulls.
- Corrected Reputation/Breakthrough visual cue parsing to the engine's current `delta` / `excessPower` event fields and added a small Reputation impact pulse.
- Upgraded the match-result panel with a result emblem and final Company Reputation scoreline.
- Removed an accidental duplicate Deckbuilder `<aside>` wrapper in Collection markup.
- No card rules, costs, Power values, balance logic, timer activation, board layout or mobile interaction model changed.

## v4.8 — Closed-alpha polish & complete flavor pass

- Reworked the lobby hierarchy around playing first: Quick Match and Collection are primary, while Private Rooms and developer analytics move into dedicated drawers.
- Added a five-department starter guide using the canonical identity loops for Customer Service, IT, Office, Marketing and Production.
- Replaced the plain game-over notice with a dedicated Victory / Defeat / Draw result surface that keeps rewards, Ranked MMR settlement, replay access and Back-to-lobby actions together.
- Completed flavor text across the entire 97-card Alpha pool in the existing concise office-satire voice.
- Preserved all v4.7 gameplay definitions, card balance, board structure, networking behavior and server-authoritative infrastructure.
- Ranked Alpha remains enabled for MMR matchmaking, while `RANKED_STANDARD_TBD` remains intentionally disabled.

## v4.7 — Ranked Alpha foundation

- Added persistent Ranked state to every stable `playerId`: current MMR, peak MMR, placement progress, W-L-D, resign losses, season id/phase and recent rating receipts.
- Existing v4.6 player snapshots migrate non-destructively: missing Ranked data starts at the configured Alpha-preseason defaults while collection, economy, XP, stats and history remain unchanged.
- Ranked Alpha starts at **1000 provisional MMR** with **5 placement matches**. These are provisional tuning values in `data/match-settings.json`, not final live-game economics or balance.
- Rating uses a symmetric Elo-style expected-score model. Placement matches use a higher provisional K-factor than post-placement matches; the minimum rating floor is configuration-driven.
- Rated results settle **atomically for both players** as soon as the server sees a rated match end. Settlement is idempotent by room id and does not depend on either player claiming Credits/XP.
- A resign is a normal rated loss plus a separate `resignLosses` statistic; no extra hidden rating penalty is applied.
- Only server-created **Ranked Quick Match** rooms receive `ratingActive:true`. Private rooms can still use Ranked rules for practice/testing, but remain unrated so cooperative rating farming is not possible.
- Ranked matchmaking snapshots each queued player's current MMR and prefers the closest compatible opponent. The provisional search window starts narrow and widens with the longer wait time; status polling re-evaluates compatibility so two waiting players can become matchable without re-queueing.
- Lobby UI now shows placement/rated standing, provisional/current MMR, peak, W-L-D, latest rating delta and Alpha-preseason id. Ranked queue copy shows the current search window.
- Formal competitive seasons, season resets, ranked rewards and placement-specific rewards are **not** active yet. `ALPHA_PRESEASON` is a persistence/tuning namespace only.
- `RANKED_STANDARD_TBD` remains `enabled:false`; Ranked Alpha is rated but still **untimed** until human timing telemetry is strong enough to choose values.
- No card-rule, balance, board-layout, artwork, economy or mobile-interaction changes.


## v4.6 — Stable player identity & storage abstraction

- Added a permanent `playerId` as the account identity used by rooms, matchmaking, replay access and future Ranked progression.
- Kept `profileId` as a temporary compatibility alias so existing Alpha clients/tests do not break during migration.
- Local guest authentication is now a separate credential record (`GUEST_LOCAL`) instead of storing the secret token alongside player progression/history.
- Player data persists to `runtime/players.local.json`; guest credentials persist to `runtime/guest-credentials.local.json`.
- Existing `runtime/profiles.local.json` from v4.5 remains a migration source. On first v4.6 start, its profile id becomes the stable player id and Credits, Scraps, collection, XP, stats and history are preserved.
- Added guest-credential rotation at `POST /api/profiles/me/guest-credential/rotate`; rotating the local secret does not change `playerId` or progression.
- Added generic `SnapshotPersistence<T>` used by Player, Room and Matchmaking persistence contracts.
- Moved the local JSON implementation into `server/storage/local-json.mjs`, keeping the domain services independent from filesystem details.
- `/api/health` now exposes player storage, credential storage, auth mode and whether legacy profile migration happened on this start.
- Player data snapshots contain no guest secret; credential snapshots contain only credential metadata and the stable `playerId` link.
- Friendly and Ranked Preview timer profiles remain disabled.
- No card-rule, balance, board-layout, artwork, economy or mobile-interaction changes.

## v4.5 — Reconnect & single-controller online UX

- Every loaded game page gets a unique ephemeral `CLIENT_INSTANCE_ID`; it is not a player/profile secret and is never persisted as account data.
- A room seat now has one active browser controller at a time. Other tabs using the same room token can still observe the match, but `viewerSession.activeElsewhere` marks them read-only.
- Server-side intent validation rejects moves from a superseded browser with `SESSION_SUPERSEDED` instead of allowing two tabs to race the same seat.
- `POST /api/rooms/:roomId/session/claim` explicitly transfers control to the current browser. Existing connected tabs are notified through the room subscription and switch to read-only on their next state push.
- Legacy clients that do not send a client id remain compatible for development/backward regression coverage.
- SSE now carries the client id and the browser exposes clear `CONNECTING`, `LIVE`, `RECONNECTING`, `OFFLINE` and `READ-ONLY` states.
- EventSource `open` triggers a safe authoritative state refresh; reconnect errors schedule another state refresh so a resumed stream cannot silently continue from stale UI state.
- Browser `online`, `offline` and visibility changes trigger recovery/resync behavior without repeating the last intent. Existing intent-id deduplication remains intact.
- Network failures are translated into game-facing messages that explain that the server-authoritative match is preserved.
- A duplicated tab does not automatically steal control while the original tab is still connected; the user can choose **Take control here**. A restored tab can automatically recover authority when no live connection remains.
- No changes to cards, rules, balance, board layout, economy, replay behavior or shipped timer activation.

## v4.4 — Match Replay & Review

- Personal **Match history** rows now expose a **Review** action for completed recorded matches.
- Replay access is bound to the server profile that actually occupied the room seat; unrelated profiles receive `403`.
- Replay data uses the same player-perspective hidden-information projection as live play. Opponent private draws and other hidden event identities stay redacted.
- Timeline events are enriched with turn number, phase and visible card names for readable debugging.
- Review UI defaults to **Key events** and can switch to all engine events or a single turn.
- Summary shows first player, winner, end reason, final Reputation, decks/departments and event count.
- `GET /api/profiles/me/matches/:roomId/replay` returns the profile-bound replay.
- `GET /api/profiles/me/matches/:roomId/replay/export` downloads the same replay as JSON.
- Replays are derived from persisted ended RoomService state, so they survive local server restarts without a second replay database.
- Friendly and Ranked Preview timer profiles remain disabled.
- No card-rule, balance, board-layout, artwork or mobile-interaction changes.

## v4.3 — Filtered playtest samples & history comparison

- Playtest analytics can be filtered by **mode, department, deck, time window and latest completed sample size**.
- The server applies the filter before aggregation, so KPI cards, department/end-reason breakdowns and decision/connectivity metrics all describe the same sample.
- JSON and CSV exports reuse the exact same query/filter contract as the lobby dashboard.
- The API also returns anonymized filter dimensions (available departments/decks and stored completed-match range) for stable client controls.
- Sample labels make very small / small / directional Alpha samples explicit rather than presenting percentages as balance truth.
- Personal profile match history can be filtered locally by mode and result while retaining the existing persistent history store.
- Filtered records still contain no display names, profile ids, session tokens or matchmaking tickets.
- Friendly and Ranked Preview timer profiles remain disabled.
- No card-rule, balance, board-layout, artwork or mobile-interaction changes.

## v4.2 — Human playtest analytics & export

- Aggregates persisted RoomService data without introducing a second gameplay truth source.
- Lobby playtest dashboard shows completed/active/waiting counts, first-player win rate, average turns/duration, average/max Turn and Response decision segments, and disconnect impact.
- Department and deck results are summarized by appearances, W-L-D and decisive win rate.
- End reasons are counted so resigns/timeouts/deck-out style finishes can be reviewed separately.
- `GET /api/playtest/analytics` returns the aggregate report; `includeRecords=1` optionally adds anonymized raw room records.
- `GET /api/playtest/analytics/export?format=json|csv` downloads anonymized tuning data.
- Exports intentionally omit profile ids, display names, room seat tokens and matchmaking tickets.
- Friendly and Ranked Preview timers remain disabled; small samples are explicitly treated as directional only.
- No card-rule, balance, board-layout, artwork or mobile-interaction changes.

## v4.1 — Match telemetry & server diagnostics

- Server-side telemetry runs for timed and untimed matches without changing rules or enforcement.
- Aggregates accepted/rejected intents, decision-window time by TURN/RESPONSE/DECISION, disconnect/reconnect counts and offline duration.
- Persists telemetry with rooms and freezes measurement across server downtime.
- Adds a bounded server diagnostic timeline for lifecycle, response, timeout, reconnect and match-end events.
- Playtest tools expose Match telemetry and Server diagnostics alongside the existing game event log.
- Shipped Friendly and Ranked Preview timer profiles remain disabled.


## v5.0 — Board & combat polish

- Event feedback keeps the short **combat event batch** instead of throwing away every cue except the newest event.
- Attack connector now has a soft under-glow while preserving the fixed-on-scroll geometry from earlier builds.
- Reputation loss/gain renders a temporary **−X / +X impact number** using current `delta` / `excessPower` event fields.
- Battle resolution can show a compact center-screen **BATTLE / BREAKTHROUGH** moment; destroyed cards also pulse the owning Archive.
- Promotion gets a brief **PROMOTION** moment and legal material cards are labeled directly on the board.
- Target candidates now distinguish `TARGET`, `ATTACK TARGET` and confirmed `LOCKED` states.
- The top Chain item is explicitly marked **RESOLVES NEXT**, and active response windows receive a stronger but lightweight focus treatment.
- Reduced-motion users keep the same state clarity without the animation layer.
- **No rules, card costs, Power, balance, board ordering, timer activation, matchmaking or economy values changed.**


## v5.1 — Power readability pass

- Every visible Employee card now shows its **printed POWER** in a dedicated bottom-right badge, including cards in hand and Archive.
- Cost remains in the existing top-right **COST** badge, preventing Cost/Power confusion at board scale.
- On-field runtime Power uses the existing server-authoritative `currentPower`; when it differs from printed Power, the current number appears beside the printed badge in **green for boosts** or **red for debuffs**.
- Hover and close-up views show printed and current Power explicitly, including the signed modifier.
- No rules, card data, balance, board geometry, economy or timer behavior changed.


## v5.2 — Card presentation & content polish

- Replaces the plain department-code artwork placeholder with one coherent CSS-rendered Alpha fallback used across board cards, hover previews, Collection, card detail and booster reveals.
- Adds rules-density tiers for long card text so 97 Alpha cards keep a stable frame while longer effects remain more legible; full wording is unchanged and remains available in close-up/hover.
- Adds Flavor to hover inspection now that all 97 Alpha cards have flavor text.
- Refines the card close-up right rail into Flavor plus a structured **Live match state** grid for printed/current Power, Onboarding and attacks.
- Keeps the v5.1 Cost/Power separation intact, including green boosted and red debuffed Current Power.
- Presentation only: no card definitions, rules, balance, economy, board geometry or timer activation changed.


## v5.3 — First-time player onboarding

- Adds a five-step **How a turn works** primer to the lobby.
- Adds optional contextual **Office Coach** tips during live matches.
- Covers mulligan, Main-phase Employee play, Support cards, Onboarding, Battle targeting, Response/Chain timing, Promotion materials and the End-phase hand limit.
- Each tip can be dismissed once; all tips can be reset or guidance disabled from the lobby.
- Guidance state is stored only in browser localStorage and never affects server-authoritative game state.
- Relevant board areas receive a subtle focus treatment while a tip is active.
- Mobile keeps the coach compact and hides the secondary disable action to reduce clutter.
- No card Rules, Costs, Power, Economy, board geometry or Ranked timer behavior changed.

## v5.4 — Collection acquisition + booster inspection polish

- Newly acquired first copies from boosters and crafting are stored as **NEW** per local `playerId` until inspected.
- Booster results preserve the cards that were genuinely new before the pack changed ownership counts.
- Completed packs summarize new unique cards vs duplicate pulls.
- Revealed booster cards open the Collection inspector directly and scroll it into view.
- Collection adds ownership filters: All / Owned / Missing / New.
- Collection sorting adds New first / Owned copies / Rarity.
- Collection progress shows unseen New count plus a Mark seen action.
- Economy reset/starter reset clears stale New markers.
- No Rules, card values, booster odds/prices, Ranked timer, or board layout changes.


## v5.5 — Deckbuilder + starter blueprint polish

- Adds five **Starter Blueprints** to Collection with department identity, 40-card shell and owned-copy readiness.
- Any starter can be copied into a new editable local custom deck without changing the canonical preset.
- Deckbuilder adds a department identity panel with gameplay loop, department mix, format readiness and owned-copy readiness.
- Saved deck contents are grouped by Employee / Action / Incident / System and get direct +/- controls plus owned-copy visibility.
- Deck rows can open the existing card inspector directly.
- Legal custom decks can be sent back to the lobby with **Use this deck in lobby**; Quick Match and private-room selectors preselect that deck.
- Adds an explicit Clear deck action and small deckbuilder status feedback.
- No Rules, card values, Economy, board geometry, starter composition or Ranked timer behavior changed.


## v5.6 — Match flow + turn readability polish

- Reworks the phase track into a readable five-step flow with completed/current/upcoming states and short phase-purpose labels.
- Replaces technical `End MAIN phase` style controls with player-facing transitions such as **Go to Battle** and **End turn**.
- Adds a persistent **Next step** command dock that summarizes the current decision and live counts for playable cards, attacks, abilities and responses.
- Playable hand cards now carry a direct **PLAY** or **SET** chip on the artwork and non-playable hand cards are subtly de-emphasized during Main Phase.
- The hand header reports how many cards are playable right now instead of always showing generic instructions.
- Priority presentation distinguishes your response window from an opponent response, without changing Chain or timing rules.
- No card rules, values, balance, economy, board geometry, starter composition or Ranked timer behavior changed.


## v5.7 — Board state readability + Support-zone polish

- Employee field cards now show explicit **ONBOARDING**, **ATTACK READY**, **ATTACK USED** and **ABILITY READY** state chips where relevant.
- Face-down Support is visually treated as a set Incident; the controller can still read their own card, while the opponent only sees a dedicated hidden Incident back.
- Face-up Systems receive a **SYSTEM LIVE** field-state chip so persistent Support is visually distinct from set Incidents.
- Employee and Support zone headers summarize occupancy and meaningful live state (ready attackers, Systems, set Incidents).
- Player board headers now show **TURN** and **PRIORITY** ownership at a glance.
- Empty field slots are labeled as Employee/Support slots instead of generic `empty`, while legal placement highlights remain unchanged.
- Presentation-only: no rules, balance, economy, deck, board-order or timer changes.



## v6.0 — Visual cohesion + game-feel polish

- Live player boards carry the selected deck department and deck name into the battlefield header.
- Department accents are visually consistent across starter/deckbuilder identity, match boards and match results.
- Collection preview, catalog cards and booster reveals share one compact T0–T3 rarity signal.
- Empty own/opponent hands, Archive, Collection filters and Match History use intentional empty states.
- A zero-card opponent hand no longer renders a phantom card back.
- Connecting and private-room waiting screens receive dedicated game-state presentation.
- No card rules, costs, Power values, economy values, deck contents, timer activation or board geometry changed.

## v5.9 — Feedback, accessibility + micro-interaction polish

- Added one global, accessible feedback surface with success/warning/error/info tones.
- Server-authoritative intents now enter a visible `Submitting move…` state and cannot be double-sent while awaiting the authoritative response.
- Accepted high-value moves receive short confirmations; rejected moves and network/session problems receive player-facing explanations.
- Reconnect recovery announces when authoritative match state is synchronized again.
- Card Inspector now restores focus to the inspected card on close and traps keyboard Tab navigation inside the modal.
- Added a keyboard skip link, stronger global `:focus-visible` treatment and larger coarse-pointer targets for high-use controls.
- `prefers-reduced-motion` continues to disable new motion.
- No card rules, costs, Power, balance, economy, board geometry or Ranked timer activation changed.

## v5.8 — Card interaction + inspection polish

- Turns the existing close-up into a navigable **Card Inspector** with owning side, zone and position context.
- Adds previous/next browsing within the current Hand, Employee Field, Support zone or Archive without closing the inspector.
- Adds keyboard controls while the inspector is open: **Escape** closes, **← / →** browses neighboring visible cards.
- The inspector surfaces only actions already present in the server-authoritative legal action list: Play/Set, Declare Attack, Activate Ability and Respond.
- Read-only/superseded tabs keep inspection access but legal action controls are disabled.
- Hidden opponent Support remains hidden in the inspector; navigation never exposes a definition the projection did not provide.
- Hover previews now point players toward full inspection, and card focus states are clearer for keyboard users.
- Existing click/touch card interaction, board geometry, Rules, balance, Economy and Ranked timer behavior are unchanged.


## v6.1 — Opening, mulligan + turn-transition polish

- Reworked the free mulligan panel into a clearer keep/replace opening-hand decision with live replacement count and a one-click clear-selection action.
- After confirming a hand, the setup surface now shows `HAND LOCKED` while the other player finishes their mulligan instead of dropping back to an ambiguous divider.
- Match opening now names who opens the office and explicitly surfaces the Alpha rule that the first player skips the first Draw.
- `TURN_STARTED` events drive a short department-themed `YOUR TURN` / `OPPONENT TURN` handoff cue without changing engine state.
- Reduced-motion users receive a fade-only version of the transition.
- Rules, card data, balance, economy, board geometry and Ranked timer configuration are unchanged.

## v6.2 — Action resolution + response polish

- Response windows now show the visible effect source and targets you are reacting to.
- Chain entries use YOU / OPPONENT instead of raw seat ids and make negated/delayed states easier to scan.
- Resolved, negated and delayed effects get short result moments driven only by existing engine events.
- Resolved/negated/delayed source cards receive restrained board feedback; Hidden Information remains redacted.
- The pass is presentation-only: rules, card data, balance, economy, board geometry and the disabled Ranked timer are unchanged.


## v6.3 — Card movement + zone-transition polish

- Existing `CARD_DRAWN`, `CARD_MOVED`, `CARD_ARCHIVED`, `CARD_REVEALED` and `DECK_SHUFFLED` events now drive short movement cues without adding gameplay state.
- Hand, Deck, Employee Field, Support and Archive surfaces briefly react when they receive or process a card.
- Search-to-hand plus shuffle sequences collapse into one readable `SEARCH COMPLETE` cue instead of competing notifications.
- Visible cards can receive restrained reveal/arrival movement feedback; redacted opponent events stay anonymous.
- Zone chips show lightweight context such as `+1`, `+ CARD`, `ARRIVED` or `SHUFFLED`.
- Reduced-motion and mobile layouts are supported. Rules, card data, balance, economy, board geometry and Ranked timer configuration are unchanged.

## v6.4 — Match result + post-match flow polish

- Expanded the end-of-match panel with a compact four-stat review for turns, elapsed match time, first/second-player seat and final Reputation score.
- Rated results now show the visible MMR move as `before → after` alongside the delta, while Friendly and private Ranked-rule rooms remain explicitly unrated.
- Match rewards now include current Level, XP-to-next-level progress and Office Credits so the profile progression effect is readable without returning to the lobby.
- Added a **Play another** path that preserves the deck and match mode from the completed room. If the room reward is still pending, the explicit CTA becomes **Claim + play another** and claims the existing one-time server reward before leaving the room.
- Review Match and Back to Lobby remain available as separate choices.
- No Rules, card data, balance, economy values, board geometry or timer activation changed.


## v6.5 — Board surface + spatial polish

Presentation-only battlefield pass:

- Keeps the established opponent → decision → own-board order and all 5 Employee / 4 Support slots.
- Adds a cohesive shared battlefield surface while preserving existing scroll, touch, attack-arrow and placement geometry.
- Gives each player board a department-tinted desk-mat treatment with subtle active-turn and priority emphasis.
- Makes Employee and Support rows read as distinct tactical lanes without changing where cards are rendered or clicked.
- Groups Reputation / Capacity / Hand and Deck / Archive into quieter desk trays.
- Gives occupied cards more physical depth and empty slots a lighter printed-position treatment.
- Restyles the neutral center / decision area as the shared office floor.
- Mobile keeps the existing horizontal swipe rails and board navigation; reduced-motion behavior remains respected.
- No card data, rules, balance, economy, deck, matchmaking or timer changes.


## v6.6 — Match HUD + information hierarchy polish

- Added a compact REP / CAP / HAND / DECK quick-read to each existing player header without creating a second gameplay panel.
- Reputation now shows the Alpha start reference (20), max (30), loss threshold (0) and restrained pressure/critical presentation states derived only from the current server value.
- Capacity reads explicitly as available/max and keeps the existing seven-pip visualization.
- Hand now reads as current/8 with visible remaining slots and a hand-limit state at 8.
- Deck count gains low/critical presentation states as deck-out approaches; no deck rules or counts changed.
- Mobile compresses the same HUD into the existing player header and all new presentation respects reduced-motion preferences.
- No card, rules, balance, economy, deck, board-order or Ranked-timer changes.


## v6.7 — Live match feed + event readability polish

- Added a compact **Live Activity / Match Feed** to the normal match surface while preserving the raw engine event log inside Playtest Tools.
- Converts already-projected events into player-facing summaries for opening hands, turns, draws, card plays, Incident sets, Promotions, attacks, redirects, card-effect destruction, Reputation changes, Chain negation/delay and match end.
- `BATTLE_RESOLVED` entries explicitly show the recorded current attacker/defender Power values plus the actual outcome (`destroyedIds`) and any `replacedOrPreventedIds`. This makes aura/temporary-Power and prevention interactions understandable without debug JSON.
- Consecutive draws are collapsed into one activity item to keep opening and draw sequences compact.
- Visible feed cards can open the existing Card Inspector; no second legality or interaction system was added.
- Hidden opponent draws and face-down Incident sets remain generic because the feed consumes only the viewer-projected event stream.
- Mobile presents the latest activity as a horizontal swipe rail; reduced-motion behavior remains supported.
- Rules, card data, balance, economy, board order, starter decks and Ranked timer configuration are unchanged.


## v6.8 — Lobby + responsive form polish

- Rebuilt the Quick Match card internally as copy + controls instead of one competing grid row.
- Deck, Mode and Find opponent now live in a shrink-safe control grid; the CTA drops to its own row before controls can overlap.
- At very narrow component widths, Deck, Mode and CTA stack to one column.
- Long custom-deck labels are allowed to truncate visually; their full selected label is mirrored to the native select tooltip.
- Applied the same `min-width: 0` / max-width protections to private-room and nested lobby form controls.
- Private-room primary CTAs fill their available card width for a steadier narrow-layout rhythm.
- No card data, rules, balance, economy, board geometry, matchmaking logic or Ranked-timer changes.


## v6.9 — Mobile match declutter + compact HUD polish

- Mobile match chrome is consolidated into one sticky battlefield navigator with current turn/phase status and phase progress.
- The existing Opponent / Decision / You jump targets remain and now highlight the currently visible board section.
- Large REP/CAP/HAND resource cards and the duplicate Deck pile are hidden on mobile because the compact player vitals already expose the same live values; Archive remains directly accessible.
- Normal ONLINE presence pills are hidden on mobile, while disconnect/reconnect/waiting states remain visible.
- Live Activity becomes one compact latest-event ticker on mobile; the full raw engine log remains available in Playtest Tools.
- Swipe rails, card widths, direct slot placement, touch targets, Attack connectors, board order and server-authoritative game logic are unchanged.
- Rules, balance, economy, starter decks and Ranked timer activation are unchanged.


## v7.0 — Card-system visual unification

- Added one reusable static catalog card face used by Collection and revealed Booster cards.
- Meta-game card surfaces now align with live card hierarchy: type strip, department code, labeled Cost badge, 16:9 art stage, detail row, rules/tags and Employee Power badge.
- Rarity remains a collection/economy signal and is integrated into the static catalog face without changing live-match rules.
- Booster pulls keep NEW / ownership and T3 treatment while reading like the card a player later sees in Collection and Match.
- Deckbuilder rows now use consistent Department / Tier / COST / POWER chips and card-type rails.
- Existing current-Power runtime display, mobile interaction, board order, hidden information, rules, balance, economy values and Ranked timer activation remain unchanged.


## v7.1 — Card discovery + information polish

- Collection search indexes card name, ID, type, department, team, rank, rules text, flavor text and tags.
- Added rarity and engine-tag filters plus human-readable department/type labels.
- Added one-click engine-tag shortcuts with live set counts.
- Active filters render as removable chips with one-step clear-all.
- Search input preserves focus/caret while the collection re-renders.
- Collection preview shows card ID / department / team / rank context.
- Preview tags are clickable filters and a Related Cards panel links cards by shared engine tags and department context.
- No card rules, costs, power, economy, board geometry, starter decks or Ranked timer settings changed.

## v7.2 — Deckbuilding workflow + engine-fit polish

- Added a **Deck Status** collection filter for cards already in the current deck, cards not yet included, and cards still below their legal/owned copy ceiling.
- Cards already used in the current deck now carry a subtle catalog-state treatment; cards at their ceiling read as complete without adding another rarity or rules signal.
- Deck Analysis is actionable: Employee / Action / Incident / System counts, dominant departments and top engine tags can focus the collection in one click.
- Added **Engine Fits**, a compact discovery panel that scores candidates from shared top tags plus the current deck’s primary department. It is intentionally transparent and does not auto-build or alter deck rules.
- Engine Fit rows open the existing card preview and offer a copy-limit-safe one-click add when the deck still has room.
- Mobile keeps the existing collection/deckbuilder interaction model; Engine Fits becomes a horizontal swipe rail instead of lengthening the page vertically.
- No card rules, costs, power, economy values, board geometry, starter decks or Ranked timer settings changed.



## v7.3 — Deck quality + completion polish

- Added an objective **Deck Check** directly in the existing Deckbuilder rather than inventing a subjective strength score.
- Deck size now has a compact progress bar plus explicit `X / 40`, `N OPEN`, `COMPLETE` or overflow state.
- Copy-limit compliance is surfaced as its own readiness check using the existing format limits.
- Owned-copy readiness is separated from format legality and explicitly explains when it is only a collection check versus required in Owned copies mode.
- Incomplete deck-size and copy-limit checks link directly to useful current-deck/addable-card collection filters.
- Missing owned-copy entries are listed compactly and open the existing card preview for inspection/crafting context.
- Mobile keeps the current Deckbuilder structure; checks stack cleanly and missing-copy rows become a horizontal swipe rail.
- No card rules, costs, power, economy values, board geometry, starter decks, matchmaking or Ranked timer settings changed.


## v7.4 — Capacity curve + deck composition polish

- Capacity Curve bars are now interactive and filter the Collection by exact cost; the 7 bucket correctly means 7+.
- Cost drill-down uses the existing active-filter chips and Clear All flow instead of adding another permanent dropdown.
- Deck Analysis now shows the objective unique-card count beside average cost.
- Added compact objective cost bands for 0–2, 3–4 and 5+ cards to make curve shape readable at a glance.
- Clicking another Deck Analysis signal still resets to one focused collection view, preserving the existing discovery workflow.
- No card rules, costs, power, economy values, board geometry, starter decks, matchmaking or Ranked timer settings changed.


## v7.5 — Engine coverage + bridge-card polish

- Added an objective **Engine Coverage** panel built entirely from the cards’ existing tags; no new gameplay taxonomy is invented.
- Connected engine packages show both **unique cards** and **total copies**, separating breadth from raw copy count.
- Clicking a package drills into that tag **inside the current deck**; **Find more** expands the same tag to the full Collection.
- Tags represented by only one unique card remain visible as **Single-card signals** and are explicitly informational rather than warnings.
- Added **Bridge Cards** for in-deck cards that carry two currently connected engine tags; clicking a bridge opens the existing card preview.
- Mobile keeps the established interaction model: engine packages and bridge cards become horizontal swipe rails instead of adding vertical clutter.
- No card rules, costs, power, economy values, board geometry, starter decks, matchmaking or Ranked timer settings changed.


## v7.6 — Atomic deck swap + refinement polish

- Deck-list rows now expose a deliberate `SWAP` action for replacing exactly one copy.
- Swap mode keeps the 40-card count intact and reuses the Collection as the replacement picker.
- Eligible targets respect format copy limits and, in Owned Copies mode, owned-copy ceilings.
- The selected outgoing card and replacement mode are visually explicit, with a persistent cancel action.
- Completing a swap saves the deck once, opens the incoming card in the existing preview, and reports the exact exchange.
- No auto-building, strength score, card-rule, balance, economy, board, matchmaking, or timer changes.


## v7.7 — Deck editing safety + history polish

- Deck edits now have a real working-draft state instead of being persisted after every click.
- Clear `SAVED` / `UNSAVED CHANGES` feedback sits directly in the Deckbuilder.
- `Undo` restores the previous deck-edit snapshot.
- `Reset to saved` discards the working draft and restores the last checkpoint.
- `Save changes` persists the deck and creates a fresh checkpoint.
- `Save & use in lobby` prevents a legal but unsaved deck from being accidentally queued without persistence.
- Switching decks, creating another deck, deleting the current deck, or copying a starter blueprint is protected while the current deck is dirty.
- Browser reload/close uses the standard unsaved-changes guard.
- No card-rule, balance, economy, board, matchmaking, starter-deck, or Ranked-timer changes.


## v7.8 — Saved Deck Management Polish

- Adds a compact **My Decks** overview inside the deckbuilder.
- Shows which deck is currently being edited and which custom deck is selected in the lobby.
- Shows objective **Format Ready / Draft** and **Owned Ready / Missing** status per saved deck.
- Tracks a saved-deck `updatedAt` timestamp for clear **Last edited** context; older local saves remain valid and display as legacy saves until resaved.
- Adds **Open, Duplicate, Rename, Delete** management actions. Duplicate preserves the card list and blueprint metadata while creating a unique saved deck.
- Delete now requires explicit confirmation and safely clears a deleted custom deck from lobby selection.
- Keeps v7.7 working-draft safety intact: cross-deck management is blocked until unsaved edits are saved or reset.
- No rules, balance, economy, board, matchmaking, or timer changes.


## v7.9 — Match Prep & Deck Selection Polish

- Quick Match, Create Room and Join Room show the currently selected deck as a compact match-prep card.
- The prep card surfaces department identity, engine loop, 40-card count, format readiness and collection-copy readiness without adding a new confirmation screen.
- Deck choice synchronizes across Quick Match and both Private Room forms so the lobby has one clear active deck choice.
- Changing the selected deck updates the prep card immediately.
- Format-invalid custom drafts are disabled/preflighted before queue/create/join requests; server-side deck validation remains authoritative.
- Collection-copy gaps are informational only and do not change Alpha sandbox/preset rules.
- No card rules, balance, economy, board, matchmaking algorithm, starter deck or Ranked timer changes.


## v7.10 — Collection & Economy Flow Polish

- Missing-owned-copy rows in Deck Check now show **owned / used / needed**, the **craft cost per copy**, and the **total Scrap cost to fill the gap**.
- A missing deck copy can be crafted directly from Deck Check when the current Shredder Scrap balance can pay for it.
- Card preview now puts **Owned, current Scraps and Deck Needs** in one compact economy summary and explains the exact shortfall when a craft is not yet affordable.
- Added **Missing for deck** as a first-class Collection ownership filter.
- Added **Shred candidates** as a Collection filter that only surfaces owned cards outside the current deck for which the existing collection-floor check allows at least one shred. Saved-deck warnings still apply before confirmation.
- Economy Lab links directly to both Missing deck cards and Shred candidates instead of creating a separate crafting/shredder navigation screen.
- No automatic shredding or crafting was added. Collection-floor protection and server-authoritative economy actions remain unchanged.
- Sandbox tuning remains unchanged: T0 `+10 / −150`, T1 `+25 / −300`, T2 `+60 / −600`, T3 `+150 / −1200`.
- No card rules, balance, board, matchmaking, starter deck, reward, or Ranked timer changes.


## v7.11 — Booster → Collection → Deck Flow Polish

- Completed booster reveals now offer **View pack** and **New pulls** shortcuts.
- Last-pack browsing is implemented as a normal removable Collection filter, not a separate screen.
- Revealed pulls can show when they are already used in saved decks.
- Card Preview adds **DECK USE** across saved custom decks: current copies, draft room, or full-deck swap context.
- **Add 1** opens the selected saved deck and records the addition as a normal unsaved deck edit; Save/Undo/Reset from v7.7 still apply.
- Full decks are opened with explicit guidance to use the existing v7.6 Swap flow rather than silently replacing a card.
- No card rules, balance, economy values, rewards, board layout, matchmaking, or timer settings changed.


## v7.12 — Opening Hand & First-Turn Readability Polish

- Adds an objective **Opening Snapshot** during mulligan/setup and through the first turn's Main phase.
- Shows the visible opening-hand mix by card type: Employees, Actions, Incidents and Systems.
- Shows how many opening cards have **Cost ≤2**, matching the starting Capacity of 2 without scoring the hand as good or bad.
- Makes opening role explicit: **YOU OPEN** versus **SECOND DESK**.
- Makes first-Draw consequence explicit: the opener sees **FIRST DRAW SKIPPED**, while the second desk sees **FIRST DRAW AVAILABLE**.
- The snapshot is compact on desktop and becomes a horizontal stat rail on mobile, preserving the existing mobile board interaction model.
- Existing v6.1 mulligan, hand-lock and turn-transition UI remains intact.
- No card rules, balance, economy, rewards, board layout, matchmaking, starter deck, Ranked, or timer changes.


## v7.13 — Main-Phase Decision Readability Polish

- Adds a compact **Main Desk** context strip during the viewer's normal Main phase.
- Shows objective live context only: legal hand plays, legal plays by card type, current/max Capacity, open Employee/Support slots, and cards whose **printed cost is above current Capacity**.
- Legal hand cards continue to use the existing server-projected legal-action list; v7.13 does not parse card text or reproduce rules on the client.
- Non-legal hand cards with printed cost above current Capacity get a small **COST > CAP** context badge during the Main phase.
- Card Inspector now explains common turn-state blockers such as setup, required decisions, response priority, opponent turn and non-Main phases.
- When no more specific safe explanation exists, the Inspector explicitly defers to the live legal-action list and points to requirements, targets, board state and Capacity.
- Command Dock now surfaces **PRINTED COST > CAP** when relevant and uses that context when no hand card is currently legal.
- Main Desk becomes a compact horizontal stat rail on mobile and does not alter the existing board interaction model.
- No card rules, balance, economy, rewards, board layout, matchmaking, starter deck, Ranked, or timer changes.


## v7.14 — Battle Phase Decision Readability

v7.14 extends the match-readability series from the opening hand and Main phase into Battle without changing combat rules.

- `BATTLE DESK` appears only during your normal Battle phase when no higher-priority decision/response is blocking play.
- It summarizes server-projected attack readiness: ready attackers, unique legal Employee targets, direct-attack availability, visible Onboarding, attacks already used, and opposing Employee count.
- The Card Inspector now gives safe Battle-specific context for your Employees: wrong phase/turn, decision or priority first, Onboarding, attack already used, or a neutral `NO LEGAL ATTACK` fallback.
- Special card/effect restrictions are deliberately not reimplemented on the client. `legalActions.attacks` remains authoritative.
- Mobile uses the same compact horizontal-stat treatment as the v7.13 Main Desk.
- No Rules, balance, economy, reward, board-layout, matchmaking, Ranked, or timer changes.


## v7.15 — End Phase & Turn Handoff Readability

v7.15 completes the current phase-readability series with an objective End-phase handoff view and no rules changes.

- Adds a compact **END DESK** during the viewer's normal End phase when no higher-priority decision/response is active.
- Shows visible, objective context only: **Hand / 8**, exact **Archive** requirement, currently **Selected** cards, server-offered activated **Abilities**, remaining **Capacity**, and server-projected **Handoff Ready / Wait** state.
- Makes the existing rule explicit that unused Capacity expires when the turn hands off; no Capacity behavior changes.
- Hand-zone copy now says exactly how many cards must be Archived when the 8-card hand limit is active.
- The existing hand-limit decision requires the exact visible selection count before its Archive button enables, and the client prevents accidental over-selection; the server remains authoritative and still validates `ARCHIVE_EXCESS_HAND`.
- Card Inspector gives a **HAND LIMIT** note for cards the server exposes as eligible archive choices instead of a generic non-Main-phase message.
- Mobile uses the same compact horizontal-stat treatment as Main Desk and Battle Desk.
- No Rules, balance, economy, rewards, board layout, matchmaking, Ranked, or timer changes.


## v7.16 — Response & Required Decision Readability

v7.16 fills the temporary UI gap that intentionally replaces normal phase desks whenever server priority or a required choice takes over.

- Adds a compact **RESPONSE DESK** while a Response Window / Chain is active.
- Shows only projected, visible context: event, visible source/target focus, who currently has Priority, Chain depth, response-option count, and whether Pass is currently legal.
- Makes Pass semantics explicit without simulating resolution: passing adds no response; the authoritative engine continues or resolves the Chain when priority closes.
- Adds a compact **DECISION DESK** for viewer-owned pending resolution, deck, target and hand selections.
- Shows candidate count, required selection range and selected count where the client already has that visible selection state.
- Both desks disappear automatically when normal turn flow resumes; Main/Battle/End desks remain hidden while a higher-priority response or decision is active.
- Mobile uses compact horizontal stat rails and preserves the existing battlefield interaction model.
- No card Rules, balance, economy, rewards, board layout, matchmaking, Ranked, timer, Chain, or Priority behavior changes.


## v7.17 — Battlefield Live-State Scan Polish

v7.17 improves board scanning after the v7.12–v7.16 decision-readability series without changing board layout or gameplay rules.

- Adds a compact **DESK SCAN** inside each player board with visible field occupancy and meaningful live-state counts.
- Your Desk Scan can surface server-projected **Attack Ready** and **Ability Ready** counts plus visible Onboarding, set Incidents, live Systems, modified Power and pending/scheduled effects.
- Opponent Desk Scan remains hidden-information-safe: it only summarizes already visible field state such as occupied zones, face-down Support count, visible Systems, visible Power changes and pending/scheduled effects.
- Attack-ready Employee badges now show **DIRECT READY** when a direct attack is legal, or the count of legal Employee targets from `legalActions.attacks`.
- The card-level target count is presentation-only; special restrictions and target legality remain server-authoritative.
- Mobile keeps the Desk Scan compact as a horizontal chip rail inside each existing player board.
- No card Rules, balance, economy, rewards, board layout, matchmaking, Ranked, timer, Chain, Priority, or combat behavior changes.


## v7.18 — Board Action Focus & Target Readability

v7.18 makes live board relationships easier to scan without adding new rules, target inference, or another permanent HUD layer.

- Hovering or keyboard-focusing a currently legal field action source can temporarily emphasize the source and its server-projected card targets while visually reducing unrelated visible cards.
- Attack focus is derived only from `legalActions.attacks`; legal direct attacks additionally emphasize the opponent desk as the open destination.
- Activated Ability and Response focus reuses only already projected `targetChoices[].candidateIds`; human-readable Rules Text is never parsed or interpreted.
- Ability-ready runtime badges may include the visible projected target count when one is available.
- Existing click/tap interaction remains authoritative: selecting Attack / Ability / Response still enters the established target flow and the server validates the final intent.
- Touch/coarse-pointer layouts do not rely on hover dimming; the existing tap-to-target highlighting remains the mobile interaction model.
- Reduced-motion preferences disable the new focus transitions.
- No card Rules, balance, economy, rewards, board layout, matchmaking, Ranked, timer, Chain, Priority, or combat behavior changes.

## v7.19 — Current-Power Combat Read

v7.19 adds an optional current-Power comparison layer to legal attacks without moving combat resolution into the client.

- Adds a compact **POWER CHECK** for a legal attacker. On pointer/keyboard focus it previews that attacker’s currently projected legal targets; on touch it appears after the existing tap-to-attack step.
- Uses the already visible `currentPower` values for the attacker and visible Employee targets. Printed Power remains unchanged on the card; the read uses Current Power when buffs/debuffs are active.
- Shows a deliberately labelled **base rule read** only: Power advantage, even Power, or Power deficit. A legal direct attack shows its current-Power Reputation impact if that direct attack resolves.
- The base read explicitly warns that Prevention, redirects, replacement effects and other card effects can still change final resolution. It does not inspect or parse Rules Text.
- While an attacker is selected, legal Employee targets get a small **POWER +N / POWER EVEN / POWER −N** comparison badge to reduce eye travel.
- Target legality still comes only from `legalActions.attacks`; the comparison never invents or adds a target. The server remains authoritative for the declared attack and final Battle result.
- Mobile keeps the established tap → target flow and renders target comparisons as a horizontal rail.
- No card Rules, balance, economy, rewards, board layout, matchmaking, Ranked, timer, Chain, Priority, or combat-engine behavior changes.



## v7.20 — Resolution Trace & Cause/Effect Readability

v7.20 makes the most recent visible resolution easier to understand without turning the client into a second rules engine.

- Adds a temporary **LAST RESOLUTION** trace after authoritative Battle, Chain or effect outcomes.
- The trace reads only the viewer-projected event stream and orders visible steps such as declaration/activation, redirect, prevention, current-Power Battle result, Breakthrough, negation, delay and Chain completion.
- `BATTLE_RESOLVED` remains the source of truth for final current-Power outcome and `replacedOrPreventedIds`; duplicate destruction events are intentionally collapsed from the trace.
- Breakthrough Reputation changes are represented once through the dedicated Breakthrough event rather than duplicated by its Reputation event.
- Trace copy explicitly distinguishes final authoritative visible outcomes from the earlier v7.19 **Base Rule Read** preview.
- Hidden card identities remain redacted because no raw engine state or Rules Text is inspected.
- The trace auto-clears after a short read window and becomes a horizontal step rail on mobile.
- No card Rules, balance, economy, rewards, board layout, matchmaking, Ranked, timer, Chain, Priority, or combat-engine behavior changes.


## v7.21 — Match Feed Prioritization & Event Grouping

v7.21 reduces live-match feed noise without changing or deleting authoritative events.

- The newest visible feed event always remains first.
- Recent **KEY** moments are promoted into the compact surface so a routine Draw/Turn update cannot immediately bury a Battle, Breakthrough, negation, Promotion, Reputation swing, or match end.
- Feed items are labeled **KEY / ACTION / FLOW** for fast scanning.
- Resolved Battle bursts compact setup events such as Attack declaration, redirect, and prevention into the authoritative `BATTLE_RESOLVED` feed item; the v7.20 Last Resolution trace retains the readable step sequence.
- Resolved Action bursts can compact the matching activation into the authoritative resolution item.
- Grouped items explicitly show `+N steps` instead of silently disappearing.
- Additional recent feed context remains available in a compact disclosure on larger screens; the raw projected event stream remains unchanged in Playtest tools.
- Mobile keeps the existing single latest-activity ticker and does not add a second scrolling panel.

No rules, balance, economy, reward, board-layout, matchmaking, Ranked, timer, Chain, Priority, or hidden-information changes.


## v7.22 — Match Context Stack & Clutter Control

v7.22 consolidates the readability work from v7.12–v7.21 so the match surface stays readable as more contextual guidance exists.

- Adds a single priority-aware **MATCH CONTEXT STACK** for Opening, Main, Battle, End, Response and required-decision guidance.
- Priority order is explicit: required Decision → Response/Chain → Opening → current own phase. Only one primary guidance desk renders at a time.
- During turn one, Opening Snapshot owns Setup/Start/Draw; once Main begins, **MAIN DESK** takes over instead of stacking both panels.
- v7.19 POWER CHECK remains paired with Battle context only.
- v7.20 LAST RESOLUTION remains available outside urgent Decision/Response windows; it stays in client state and can reappear if the urgent context clears before its existing read timeout.
- While a required Decision or Response window is active, the v7.21 **Signal Feed** intentionally collapses to the newest item and hides Recent Context so the live choice remains visually dominant.
- Mobile uses the same priority model and tighter spacing; no new permanent HUD layer is introduced.
- No card Rules, balance, economy, rewards, board layout, matchmaking, Ranked, timer, Chain, Priority, combat, replay or hidden-information changes.


## v7.23 — Selection & Interaction State Polish

v7.23 gives active match interactions one consistent visual grammar without changing legality or resolution.

- Active plays now expose a shared **SOURCE → TARGET / SLOT / MATERIAL → SELECTED** role language instead of separate visual conventions for every interaction type.
- Targeted Actions, activated abilities and Responses retain their source card in `state.interaction.sourceId`, so the source remains visibly anchored while legal targets are chosen.
- Attack selection uses the same source/target visual roles; Direct Attack remains the existing explicit button and server-projected option.
- Employee/System/Incident placement marks the hand card as **SOURCE** while the existing legal board slots remain the destination choices. Promotion uses **SOURCE → MATERIALS**.
- Required hand selections, Mulligan and End-Phase Archive choices share explicit candidate/selected state. Ineligible hand cards are visually subdued instead of looking equally selectable.
- Client-side hand selection wiring is limited to projected candidate IDs; final validation still remains server-authoritative.
- Selectable cards expose `aria-pressed` so keyboard/screen-reader state follows the visible selection state.
- Mobile uses the same role language with compact, horizontally safe pills; reduced-motion preferences remain respected.
- No card Rules, balance, economy, rewards, board layout, matchmaking, Ranked, timer, Chain, Priority, combat or hidden-information changes.


## v7.24 — Action Confirmation & Misclick Protection Polish

v7.24 protects the few high-impact turn-flow clicks that can discard still-available opportunities without adding confirmation friction to ordinary card actions.

- Main → Battle is guarded when legal hand plays or activated abilities remain.
- Battle → End is guarded when legal attacks or activated abilities remain.
- End → opponent is guarded when abilities remain or unused Capacity will expire.
- A compact `X REMAIN` signal appears beside guarded phase buttons before the first click.
- The first guarded click opens an inline confirmation dock with `Stay here` and an explicit `... anyway` action.
- START/DRAW advancement remains one click, and card plays, target confirmations, Promotions, hand-limit resolution and normal Responses do not gain redundant confirmation steps.
- The warning is derived only from the existing server-projected legal actions plus visible Capacity; it does not interpret Rules Text or create new legality.
- Any authoritative state update or submitted move clears the pending confirmation, preventing stale confirmations from surviving a changed state.
- Mobile uses the same guard in a compact two-button layout; reduced-motion support is preserved.

No rules, balance, economy, rewards, board layout, matchmaking, Ranked, timer, chain, priority or combat-engine behavior changed.



## v7.30 — Alpha Hardening / Cleanup

v7.30 is a no-new-mechanics hardening pass. Authoritative view changes now reconcile stale local selections and inspectors, leaving or switching live sessions clears transient match cues/commit state, intermediate desktop widths and mobile landscape receive explicit overflow protection, keyboard focus treatment covers interactive summaries/tabindex surfaces, and Reduced Motion now includes the newer v7.26–v7.29 UI. The release also audits version markers and is validated with build, full historical regression, syntax checks, and a two-process restart smoke.

## v7.29 — Playtest Session Flow

v7.29 shortens repeated human playtests. Completed unrated rooms can create one persistent rematch room with the same two players and decks; the second player follows the same rematch instead of creating a fork. Hosts can choose an alternate opening player for A/B testing before the rematch exists. Rated Ranked results deliberately return to matchmaking. The result screen also adds direct Change Deck, Review and Lobby routes. Previous rooms and replays remain intact.

## v7.28 — Match Review / Replay Polish II

v7.28 brings the live-match readability work into Match Review. Replays now open on a Key Moments view, highlight authoritative battle outcomes, prevention/redirect/negate/delay events and Reputation swings, expose compact match-level moment stats, and provide one-click turn jumps. The replay remains viewer-projected and the raw export is unchanged except for its current filename.

## v7.27 — Active Effect & Status Provenance

v7.27 extends the live Card Inspector from raw state to provenance. Viewer-safe cards can now expose active Onboarding, attack-use/restriction, granted keyword, destruction shield and attack-limit status, with visible source/duration when the authoritative state knows it. Scheduled and pending effects sourced by the inspected card are shown alongside them. Hidden source identity is still suppressed by projection.

## v7.26 — Power & Modifier Breakdown

v7.26 makes Current Power explainable. Visible Employee cards now receive a viewer-safe breakdown of temporary and continuous Power contributions. The inspector shows Printed Power, each visible source contribution, its sign and duration context, then Current Power. Hidden source identity is never promoted by the projection. No combat or modifier rules changed.

## v7.25 — Action Commit & Server Acknowledgement Polish

v7.25 makes the existing server-authoritative intent lifecycle visible to the player without introducing another confirmation step. v7.23 already communicates SOURCE/TARGET/SELECTED before submission; v7.25 completes that language after submission.

- Every submitted match intent receives a compact **SENDING** state tied to the current authoritative `stateVersion`.
- Accepted intents become **SERVER ACCEPTED** and show the resulting authoritative state version.
- Rules/stale-state rejections become **NOT COMMITTED** with the server-provided reason.
- Network interruption becomes **RESYNCING** rather than falsely claiming success or failure.
- The existing global success/error toasts remain for accessibility and continuity; the new strip gives persistent-in-place commit context next to the Command Dock.
- Controls remain locked while an intent is in flight, preserving the existing double-submit guard.
- Mobile collapses the status to the essential stage + action label, while desktop keeps the authoritative-state detail.

No rules, balance, economy, rewards, board layout, matchmaking, Ranked, timer, Chain, Priority or combat behavior changed.


## v7.31 — Playtest Harness II

- Adds deterministic fixed-matchup playtest plans on top of the existing heuristic runner.
- `--matchups=deck-a:deck-b[,deck-c:deck-d]` runs only the requested pairs.
- Seats swap every other game and the opener alternates deterministically, so side/opener effects can be reproduced from the same seed.
- Existing full five-starter matrix remains the default when no matchup filter is supplied.
- Heuristic results remain diagnostics, not automatic balance verdicts.


## v7.32 — Balance Analytics II

- Adds first/second-player splits per deck, end-reason counts, mulligan usage/return depth, and cheap-opening-card diagnostics.
- Adds explicitly sample-labelled outlier signals for matchup skew, opener skew and timeout/stuck rate.
- Signals are investigation prompts only; they never auto-edit card data or declare a deck balanced/unbalanced.


## v7.33 — Human Playtest Capture

- Completed matches can store an optional per-player playtest note tied to the room and durable player id.
- Captures pace, one-sidedness, decision density, free notes and optional card IDs.
- Feedback is persisted separately from rules/replay data and can be edited after the match.
- Server verifies the submitting profile actually played in the completed room.


## v7.34 — Customer Service vs IT Balance Pass

- Corrects a v7.31 harness confound: seat assignment and opening-player assignment now vary independently across four-game blocks.
- Corrected 40-game baseline (seed 73401) showed Customer Service 11–25 vs IT (30.6% of completed games); a second seed confirmed the direction.
- Conservative starter-only adjustment: Customer Service Starter increases `CS-002 Call Center Agent` from 1 → 3 copies and removes the single `CS-015 Complaint by Fax` and `N-011 Sick Leave`.
- Re-tests produced 15–20 (42.9%) and 14–20 (41.2%) on the same two 40-game seeds. This is treated as directional heuristic evidence, not proof of final balance.
- No card cost, Power, rules text, copy-limit, economy or IT starter values changed.


## v7.35 — Five Starter Deck Audit

- Full five-starter matrix now uses independent Seat × Opener rotation in the default runner too.
- Adds `STARTER_AUDIT_v7.35.md` with the quick matrix, caveats and follow-up watch items.
- Conservative Production starter adjustment: Shift Lead 3→2, Full Production 3→2, Maintenance Technician 2→3, Packaging Machine 1→2.
- No card definitions, rules, costs, Power values, format limits or economy values changed.


## v7.36 — Card & Engine Balance Audit

- Balance reports now include per-card `gamesSeen`, `winRateWhenSeen`, `gamesPlayed`, `winRateWhenPlayed`, total copies played and average copies played.
- These numbers are explicitly correlational: a card appearing in winning games is not automatically the cause of those wins.
- No card definition is changed in this pass; the purpose is to produce evidence for later targeted tuning together with v7.33 human notes.


## v7.37 — Content Gap Analysis

- Adds a deterministic `analyzeContentGaps()` audit over the live card pool and starter decks.
- Signals shallow department pools, low native Incident diversity and low Cost≤2 Employee variety using explicit thresholds rather than taste.
- Ships `CONTENT_GAP_ANALYSIS_v7.37.md` and targets a focused 10-card Expansion I.
- No card definitions or starter lists change in this pass.


## v7.39 — Visual Design Batch I

v7.39 starts the first full visual-design batch on top of the stable v7.38 gameplay baseline. It keeps the board order, rules, balance and interaction model intact while replacing the prototype-like visual language with a premium office-tabletop system: darker material-rich battlefield surfaces, stronger card-object depth, office-material variants by card type and a reusable T0–T3 finish system.

Rarity finish contract:
- **T0:** base ink / no foil.
- **T1:** silver name treatment + subtle silver corner mark.
- **T2:** gold name treatment + soft-spectrum artwork foil.
- **T3:** gold name treatment + stronger prismatic artwork foil and premium frame accent.

The live battlefield still does not print explicit rarity labels; rarity is expressed only through the physical finish. Collection and booster surfaces may continue to show explicit tier metadata. `prefers-reduced-motion` removes motion while retaining a static finish.

## v7.38 — Alpha Card Pool Expansion I

- Adds 10 FULL engine-backed cards from the v7.37 content-gap plan: 2 Customer Service, 1 IT, 2 Office, 2 Marketing, 2 Production and 1 Neutral.
- Grows the live Alpha pool from 97 to **107** definitions without changing the five tuned starter lists.
- Resolves the audited Customer Service / Office low-cost Employee variety gaps and the Marketing / Production one-Incident reactive-depth gaps.
- Uses only existing engine effect families; no new keyword, timing window, format rule, copy limit or economy value is introduced.
- Ships `EXPANSION_I_v7.38.md` with the card-by-card rationale and remaining follow-up gaps.


## v7.40 — Canonical Card Footprint

v7.40 keeps the new battlefield card language from v7.39, but extends it into the utility surfaces that still felt inconsistent. Board cards, deckbuilder cards and booster reveals now share one canonical face footprint and a closer visual hierarchy, so cards no longer read as different products depending on where they appear.

- **Unified visible card size:** the battlefield, deckbuilder collection and booster reveal now use one consistent card-face footprint on desktop.
- **Fixed desktop grid sizing:** collection cards and opened booster cards no longer stretch unpredictably with the available page width.
- **Pack parity:** booster reveals now show the full catalog-style card face instead of the smaller compact variant.
- **Cleaner wrapper chrome:** the surrounding collection / booster panels were tightened so the card itself stays the hero element.
- **Responsive fallback preserved:** mobile keeps the touch-friendly carousel / grid behavior while following the same ratio language.


## v7.41 — Board Depth & Zone Polish

v7.41 keeps the v7.40 card footprint and all gameplay geometry intact while making the battlefield itself feel like a deliberate tabletop rather than a stack of dark rectangles. Employee and Support lanes now have distinct material cues, clearer inset edges, stronger zone headers, better empty-slot affordances and subtle desk-surface details without changing slot count, ordering or interaction coordinates.


### v7.41 hotfix — preset readiness + full Alpha roster entry

- `/api/presets` again returns defensive copies of every starter's full 40-card list, so Quick Match / Find Opponent can validate starter readiness instead of seeing `0/40`.
- Entering Collection & Deckbuilder from the lobby now resets stale collection filters and returns to `SANDBOX_ALL_AVAILABLE`, ensuring all 107 Alpha definitions are immediately available for playtest deckbuilding. Owned-copies mode remains available as an explicit economy-testing toggle.


## v7.42 — Holo / Rarity Finish Pass

v7.42 keeps the corrected v7.41 roster/matchmaking baseline and strengthens the collectible finish language without touching rules or rarity data. T2 and T3 now use visibly different artwork-only foil masks on battlefield, collection/deckbuilder and booster surfaces. The masks also render on fallback artwork so the finish can be evaluated before the full artwork library is complete.

- **T2:** gold name treatment + quiet soft-spectrum laminated foil with sparse micro sparkle.
- **T3:** gold name treatment + prismatic shard foil, stronger premium border and gold cost hardware.
- Foil remains scoped to the artwork stage; rules text and tags stay matte/readable.
- Reduced-motion mode freezes all finish transitions.
- No gameplay, starter, catalog, economy or matchmaking changes.


## v7.43 — Lobby / Collection / Deckbuilder Visual Polish

v7.43 keeps the corrected 107-card / five-starter baseline and turns the meta-game surfaces into the same material world as the battlefield. Lobby, Collection, Economy and Deckbuilder now use a dark office-table / filing-desk surround with warm metal and paper surfaces, while the cards remain the brightest collectible objects. No interaction or data flow changes are introduced.


## v7.44 — Match Feedback / Motion / Responsive Visual QA

v7.44 closes the first visual-design batch. Card play, attack, destruction and Reputation feedback use short event-driven motion; combat/resolution/result surfaces now match the darker office-table material system. Intermediate desktop widths scale battlefield and utility cards together, short landscape layouts preserve usable controls, and reduced-motion removes the new transitions. No gameplay or networking behavior changes.


## v7.45 — Internet Server Mode

v7.45 turns the existing LAN-capable authoritative server into an explicit hostable server mode without changing match rules. The server now accepts `PUBLIC_BASE_URL` / `--public-url`, a relocatable `RUNTIME_DIR` / `--runtime-dir`, and keeps every JSON persistence file under that runtime directory by default. `npm run serve:public` binds to `0.0.0.0`; production hosts can keep the Node port private behind a reverse proxy while exposing only HTTPS externally. `/api/health` reports server mode, configured public URL and runtime directory for deployment diagnostics.

Example:
```bash
PUBLIC_BASE_URL=https://play.example.com RUNTIME_DIR=/srv/office-card-game/runtime PORT=8787 npm run serve:public
```


## v7.46 — Internet Auth Hardening

Normal profile and room API calls no longer need long-lived credentials in the URL. Profile reads use `Authorization: Bearer …`; room reads/intents use `X-Room-Token`. Server-side query-token support remains temporarily as a backwards-compatibility fallback, but the v7.46 client does not use it for normal play. Because browser `EventSource` cannot attach custom headers, live SSE now uses a short-lived five-minute stream ticket issued through an authenticated POST. Replay downloads are fetched with an Authorization header rather than a token-bearing download URL.


## v7.47 — Public Server Security

Network mode now adds a first public-alpha security perimeter: security headers, configurable request-body limits, in-memory read/write rate limits, optional Host/Origin allowlists and administrator protection for playtest analytics/exports. When `PUBLIC_BASE_URL` is configured, an `ADMIN_TOKEN` is required at startup so analytics cannot accidentally be exposed on the public game URL. Configure `ALLOWED_ORIGINS` / `ALLOWED_HOSTS` as comma-separated values when the reverse-proxy hostname differs from `PUBLIC_BASE_URL`. Local development without public mode remains frictionless.


## v7.48 — HTTPS / Reverse Proxy / SSE Hardening

v7.48 assumes the public Node process sits behind Caddy, nginx or another TLS-terminating reverse proxy. Set `TRUST_PROXY=1` so rate limits and Host validation use `X-Forwarded-*`; `REQUIRE_HTTPS` defaults on when `PUBLIC_BASE_URL` is `https://…`. Public requests received as plain HTTP are rejected before game routes run. SSE sends a reconnect hint, keeps the existing no-buffering header and has a configurable heartbeat (`SSE_HEARTBEAT_MS`, default 15s). Example Caddy and nginx configs live in `deploy/`. Only the reverse proxy needs public ports 80/443; Node can remain bound to `127.0.0.1:8787`.


## v7.49 — Hosted Alpha Operations

v7.49 adds the boring-but-important operations layer for a small hosted alpha. `/api/ready` separates readiness from basic health, SIGTERM/SIGINT trigger a timer checkpoint and graceful HTTP shutdown, `npm run ops:backup` snapshots runtime JSON files into timestamped backup folders, and `npm run ops:health` performs a five-second readiness probe. `deploy/office-card-game.service.example` and `deploy/.env.example` provide a minimal systemd deployment shape. The server remains intentionally single-instance / local-JSON for this alpha phase; run one authoritative process against one runtime directory.


## v7.50 — External Alpha Flow

v7.50 closes the hosted-alpha block with tester-facing flow. Private rooms now expose a shareable invite URL containing only `?join=ROOMCODE`; opening that link expands the private-room panel and pre-fills the code without leaking a room seat token. Waiting rooms add **Copy invite link** and a compact network diagnostic. The boot path reads `/api/health` so the client knows whether it is on a local or network server. `npm run ops:external-smoke` performs a two-profile / two-seat HTTP smoke including header-authenticated room reads and two SSE tickets. See `deploy/EXTERNAL_ALPHA.md` for the deployment checklist.


## v7.51 — Alpha Tester Onboarding

First-time visitors now get a compact, skippable Alpha Field Guide explaining Company Reputation, Capacity, Employees, Support, turn flow and response chains before they queue. It is stored locally, can be reopened from the lobby, and hands off to the existing contextual Office Coach rather than introducing a scripted tutorial match.


## v7.52 — Connection & Session Diagnostics

A tester-readable diagnostics drawer now reports server version/mode, browser family, online state, SSE status, last live sync, room/state version, current-tab control and an on-demand `/api/health` round-trip. The same panel is available in the lobby, waiting room and match playtest tools, with an explicit room resync action.


## v7.53 — Safe Bug Report Bundle

Testers can copy or download a JSON bug report from connection diagnostics or the match result. The bundle includes app/server version, browser/network state, room code, viewer seat, authoritative match state version, lightweight UI state, recent viewer-projected events and projected diagnostics. Recursive redaction removes token/authorization/password/secret/credential/ticket fields and explicitly redacts active profile/room tokens.


## v7.54 — Alpha Test Session Flow

Each browser tab session receives a non-secret Alpha test-session ID. The ID is shown in the lobby and match result, is attached to optional human playtest feedback, and gives testers a simple way to group a run of rematches/replays/notes from one testing sitting. Testers can start a fresh session manually; room, match and account behavior remain unchanged.


## v7.55 — Cross-Browser / Low-Network Hardening

SSE reconnects now use bounded exponential backoff with jitter instead of a fixed retry loop and reset after a healthy live connection. Read-only GET requests have a 12-second AbortController timeout; match mutations deliberately do not, because timing out a write could falsely imply a server-authoritative move did not commit. Returning from background/BFCache resynchronizes state and restarts stale live streams, pagehide safely releases BFCache streams, and orientation changes redraw battlefield connectors. CSS adds fallbacks where backdrop-filter is unavailable.


## v7.56 — External Alpha Candidate Freeze

v7.56 freezes the current 107-card / five-starter hosted-alpha baseline rather than adding another gameplay feature. `/api/health` and `/api/ready` identify `EXTERNAL_ALPHA_CANDIDATE`; `npm run ops:alpha-check` validates release-critical catalog, starter, deployment and tester-tool invariants; and `ALPHA_CANDIDATE_v7.56.md` records acceptance criteria and known limitations. This is the preferred build to deploy for the first real two-network external test.


## v7.60 — Localization Foundation

v7.57 adds the localization architecture without changing the canonical game language. English remains the source-of-truth text in card data and the default UI locale. `public/i18n.js` provides locale persistence, parameter interpolation, English fallback and document translation hooks; `public/locales/en.js` is the first canonical UI dictionary. Card localization is intentionally an overlay rather than a mutation of `data/cards.json`, so rules and balance data stay language-neutral and future locales can be added independently.


## v7.58 — Language Switch

v7.58 activates the locale layer for testers. The top bar now exposes English and Deutsch, the choice persists locally, document language metadata updates with the active locale, and a locale change rerenders the current app surface without touching profile, room, matchmaking or rules state. German currently covers the static application shell; the next passes expand UI coverage and card presentation.


## v7.59 — German UI Coverage

v7.59 expands Deutsch into the external-alpha surfaces testers actually use: onboarding, lobby and private rooms, connection diagnostics/recovery, match HUD terminology, and Collection/Deckbuilder navigation. Keyed dictionaries remain the target architecture; a DOM-level exact-literal migration bridge translates legacy UI that predates i18n keys without touching rule execution, card IDs, match state or server enums. New UI should use translation keys directly, and the migration bridge can shrink as legacy strings are converted.


## v7.60 — German Card / Rules Localization

v7.60 completes the first German localization slice for the current Alpha pool. All 107 card definitions receive a German display overlay for name, rules text and flavor text in `public/locales/de-cards.js`; canonical English `data/cards.json` remains untouched and authoritative. Card type labels localize independently while semantic `cardType`, IDs, tags, effects and server state stay canonical. `npm run ops:i18n-audit` verifies exact pool coverage and rejects missing German name/rules/flavor fields, so future roster expansions can fail loudly instead of silently shipping untranslated cards. English remains the fallback for any future card that has not yet received a locale overlay.


## v7.61 — Alpha Admin / Ops Dashboard

Adds a protected operator console available through `?ops=1`. It reads `/api/admin/ops` using `X-Admin-Token`, keeps the token in `sessionStorage` only, and surfaces safe server/room/queue counts without exposing room tokens, profile credentials or SSE tickets.


## v7.62 — Artwork Pipeline

Adds a cross-platform Node artwork audit. `npm run ops:art-audit` checks every canonical card `artId`, verifies referenced files and supported raster formats, reads dimensions, validates the 16:9 crop contract, detects orphan production art and writes `reports/artwork-status.json` plus `reports/artwork-status.md`. Missing art remains a report item rather than a build failure during Alpha; `npm run ops:art-audit:strict` can later gate a release on complete coverage.


## v7.63 — Artwork Crop & Presentation System

Adds `data/artwork.json` with optional per-card `x/y` focal points. Focus metadata is presentation-only and is emitted through `/api/catalog`; every artwork surface reuses the same original image and focus rather than maintaining separate board/pack/inspector crops. The artwork audit now validates focus metadata as well.


## v7.64 — Real-Art Holo Validation

`?finish-review=1` opens a presentation-only finish lab. Every mapped real artwork can be viewed as forced T0/T1/T2/T3 variants side by side without mutating canonical rarity. T2 and T3 use pointer-reactive CSS coordinates for the existing soft-spectrum and prismatic-shard masks; reduced-motion users keep the static finish.


## v7.65 — Alpha UX Cleanup

The normal tester path is quieter: the top bar uses an `External Alpha` label instead of a build-purpose label, the lobby shows only a compact connection state, technical connection diagnostics and bug-report controls move into a collapsed Match History & Support drawer, and admin analytics are no longer requested/rendered for ordinary testers. Profile and collection chrome also drops storage/auth/sandbox jargon while retaining the underlying tools for operators and debugging.


## v7.66 — Human Playtest Data Pass

Adds human-match-only balance evidence without changing any card or rules values. Persisted room records now derive anonymous per-card activity from authoritative match events, aggregate deck opener/second-player splits, card observed/played usage, win rate when played, resign counts and long-turn/long-response friction signals. Admin analytics requests/exports now send the protected admin header correctly, with separate Match CSV and Card CSV exports. Starting-hand cards that never produce an authoritative card event are intentionally not claimed as observed; this telemetry is directional evidence, not a complete hidden-information reconstruction.


## v7.67 — Hosted Sync / Tab-Control Hotfix

v7.67 is a hosted-play reliability hotfix. It does not change card rules, balance, decks or the 107-card Alpha pool.

- A browser tab now keeps the same controller `clientId` across reloads via `sessionStorage`, preventing a normal reload from looking like a second browser session.
- Live SSE connections are generation-owned so overlapping reconnect attempts cannot leave orphaned EventSource instances behind.
- EventSource native retry is explicitly closed on error; the client uses one bounded backoff path instead of two competing reconnect systems.
- SSE heartbeats are real `heartbeat` events, allowing the client to distinguish a healthy quiet stream from a stale stream.
- If SSE is unavailable or repeatedly interrupted, an authoritative HTTP polling fallback keeps the room current while live sync recovers.
- Intent responses preserve the submitting `clientId` when projecting `viewerSession`, so controller state remains consistent immediately after moves.


## v7.68.2 — Live-match lifecycle guard fix

v7.68.2 fixes a regression in the v7.68.1 client-side stale-room guard. A newly joined room is already live while the authoritative match intentionally remains in `SETUP` during mulligan; the client now treats both `SETUP` and `ACTIVE` as live match states and blocks only missing/ended matches. This preserves the server-side stale-session protection without preventing either player from completing the opening mulligan.

## v7.68.1 — Hosted confirmation, resume safety, responsive lobby & DE pass

v7.68.1 keeps the v7.68 hosted live-sync hardening and adds four follow-ups from real external-alpha testing: End-anyway confirmation survives identical passive sync reads, saved rooms are server-validated before resume and every mutation is preflight-blocked when the match is no longer ACTIVE, the lobby uses more useful width on very large desktops and reliable stacked controls on mobile, and the visible German lobby/ranked/starter surface no longer falls back to mixed English copy.

## v7.68 — Hosted Live-Sync Safety Hotfix

v7.68 hardens hosted two-player state delivery after real external-alpha testing exposed delayed SSE state events during mulligan, turn handoffs and Priority transitions. The server remains strictly authoritative; stale-state validation is not relaxed.

- A lightweight authoritative `/state` safety poll now remains armed even while SSE reports `LIVE`, so buffered or half-open proxy streams cannot leave the inactive player stuck on an old state.
- Safety polling is faster during active/setup matches and slower outside live play; SSE remains the primary low-latency channel.
- If observable SSE heartbeats become stale for multiple heartbeat intervals, the client rebuilds the stream while HTTP state sync keeps the match current.
- Every submitted intent performs a best-effort authoritative state preflight, and every accepted intent performs an immediate post-commit refresh to catch turn/Priority transitions.
- A P2 mulligan that races P1 and receives `STALE_STATE` is silently resynchronized and retried exactly once with a fresh intent id, only while mulligan remains legal and all chosen cards are still in that player's hand.
- Ordinary non-mulligan intents are never auto-replayed after `STALE_STATE`; server idempotency and legality remain the final authority.



## v7.68.4 — Match feedback + responsive density

v7.68.4 keeps the v7.68.3 server-authoritative auto-pass behavior while restoring readable combat pacing and tightening the remaining responsive surfaces. Server commit acknowledgements are now fixed overlays instead of layout participants, attack declarations are queued locally for a short 1.5-second presentation window even when Priority auto-passes immediately, the post-match action cluster occupies its own non-overlapping row for both Victory and Defeat, 4K lobby widths are capped back to a denser composition, and mobile starter/utility sections use less vertical space with helper copy stacked below titles.

## v7.68.3 — Playtest UX polish

v7.68.3 bundles the next external-alpha polish pass: stable battlefield anchoring across local re-renders, a longer card reveal for deck-search results, canonical Archive card proportions, reliable Mulligan `REPLACE` markers, one fresh-pack `NEW` badge on every revealed booster card, wider 4K lobby composition, tighter mobile layout, and a more complete German lobby presentation. Hosted room intents also auto-pass response priority only when the authoritative engine reports zero legal response options for the current priority player; real response opportunities still stop and wait for the player.

## v7.69.1 — Responsive Battlefield + Critical Mobile Controls

v7.69.1 is the first responsive correction pass on top of the board-first match shell. It reserves a real center seam so Employee/Support rows cannot collide with the Office Floor at 1080p-class heights, scales the HUD/cards up on 4K displays, compresses the mobile opening/mulligan chrome, and restores critical mobile controls through a dedicated Match menu. Read-only tabs expose Take control directly and no longer duplicate the same warning as a large inline arena error. The recessed battlefield slot depth is included in this release, so v7.69.0 servers only need this single patch.

## v7.69.0 — Board-First Match UI

v7.69.0 rebuilds the live match presentation around a board-first, viewport-oriented TCG layout while preserving the authoritative engine, hosted sync, auto-pass Priority rules and existing match semantics. Active desktop matches keep both 5-Employee + 4-Support/System fields, resources, hand and primary actions inside the match viewport; mobile preserves the same topology with denser HUD treatment instead of deleting slots. Player identity stays faction-neutral and deck-aware, so mixed and combo decks are not assigned a department faction.

The match arena is now layered: decorative background artwork is independent from code-native slots and gameplay geometry, with a neutral built-in fallback and future local `/art/boards/` assets supported without adding a skin economy or selection UI. Gameplay feedback also moves into fixed HUD layers: opponent plays and other relevant events queue for longer readable presentation, attacks retain independent presentation pacing despite server-authoritative auto-pass, card search/reveal remains visible longer, and match completion gets a persistent Victory/Defeat overlay with a clear reason and `View results` action. Field-card hover/inspection no longer changes battlefield geometry, while the existing detailed result screen remains available below the match viewport after completion.


## v7.69.4 — Material Executive Desk Lobby

v7.69.4 turns the approved Executive Desk concept into the real lobby instead of treating it as a standalone mockup. The lobby now uses dedicated walnut, green deskmat, leather, brass, dark-plastic, black-metal, manila-folder and off-white-paper material assets, with one central green play surface and a single physical utility drawer. The selected match deck is staged as a real paper brief plus a three-card fan sourced from the actual deck definitions; switching a preset or custom deck updates those cards, deck composition, tags and readiness without introducing mock game data. Quick Match, Collection & Deckbuilder, Field Guide, Alpha Ops, Profile / Ranked Alpha, Private Rooms, Alpha Session, rules guidance, match history and support keep their existing authoritative actions and IDs.

The pass is presentation-only apart from the version bump: no card rules, balance, economy, matchmaking semantics, Ranked timer behavior, hosted sync, rematch handshake or match-board topology change. Desktop and 4K scale the useful desk surfaces, while mobile keeps every real lobby action in a compact material hierarchy.

## v7.69.3 — Executive Desk Lobby + Rematch Gate

v7.69.3 turns the lobby into an implementation-ready Executive Desk hub inspired by the approved Stitch direction while keeping real Office Card Game flows authoritative. Quick Match is the single primary CTA, Collection & Deckbuilder has one clear drawer entry, Starter Decks appear once as selectable onboarding shortcuts, and the real profile / Ranked Alpha, private-room, connection, guide and playtest tools are reorganized into tactile desk modules without inventing a fake Social system or duplicated navigation. Desktop, compact desktop and mobile share the same hierarchy while reflowing instead of shrinking the scene blindly.

Friendly rematch is now a two-seat handshake: the first player can claim the reward and request the rematch, but the new match remains in a dedicated waiting state until the second player explicitly joins. Only then does the server create the authoritative opening state and deal opening hands. Pending rematches expire after 90 seconds and can be cancelled back to the lobby by the requesting seat. Hosted QA fixes also restore a larger readable hand on 1K and 4K, center the mobile hand above the local profile, make detailed mobile results fully scrollable, and make the Match HUD rail reflow its feed, diagnostics and stat dashboards instead of clipping content at large resolutions.

## v7.69.2 — Collision-Free HUD + Responsive Rail Geometry

v7.69.2 hardens the board-first layout after hosted 1K, 4K and mobile QA. Player identity and live status now have separate reserved HUD columns, the local hand has dedicated bottom-board space instead of covering Support/System or the player profile, and the right Match HUD is vertical-scroll only with its internal stat grids reflowing to the available rail width. Mobile uses the compact phase HUD instead of the desktop phase pill, keeps hand / Archive / command dock / own profile in non-overlapping zones, and the detailed result view suppresses battlefield chrome once `View results` is opened. Large-screen card/HUD scaling is increased while the recessed 3D slot treatment remains unchanged.
