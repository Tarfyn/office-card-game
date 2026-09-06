# Office Card Game v7.69.63 Handover

## Deckbuilder Booster / Economy UX Hotfix

- Consecutive Alpha/QA booster openings are supported without reload, leaving Deckbuilder, or resetting the sandbox.
- `activeBooster` tracks the current reveal; `lastBooster` retains the most recently completed pack for review and collection discovery.
- A second purchase is gated until the current reveal is complete, then uses the same authoritative `/api/economy/booster/open` path with the localized `Open another pack · {price}` CTA.
- Completed-pack actions are distinct: `View pack` reviews the latest reveal, `New pulls` filters new cards, and `Show in Collection` filters the relevant collection cards. None performs a purchase or balance mutation.
- Deckbuilder now has one clear balance strip for Office Credits and Scraps. The duplicate economy-lab wallet was removed and balance text uses readable dark-surface contrast.
- Insufficient balance remains a disabled, localized state; server-side currency validation remains authoritative.
- English and German copy covers opening, completion, review, collection navigation, next-pack purchase, balance labels, and insufficient credits.

## Scope and compatibility

- No pack price, card count, rarity distribution, reward value, economy rule, or crafting/scrapping value changed.
- No PostgreSQL schema migration was required.
- Authenticated Account/Profile persistence remains PostgreSQL-authoritative; Guest, Room, and Matchmaking storage remain unchanged.
- Ranked timer remains disabled.

## Verification

- Direct disposable PostgreSQL 18 integration test passed with `OCG_TEST_DATABASE_URL` scoped only to the local test command.
- Docker PostgreSQL integration test passed.
- Regression coverage includes three consecutive authoritative purchases, finite balance handling, reveal gating, and separated review/navigation actions.
