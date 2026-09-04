# Alpha feedback checklist

Use this checklist for focused first-session feedback on the current Alpha. It is intentionally observational: do not change balance, grants, progression, persistence, or card rules while collecting feedback.

## First session

- Register, choose a starter department, and open all eight Starter Boosters.
- Confirm the completion notice identifies the selected, owned, editable, PvP-ready **First Day Deck**.
- Reload during department selection and during the booster sequence; confirm the saved step resumes without duplicate rewards.
- In Deckbuilder, compare **Owned copies** with **All Alpha cards**. Unowned practice cards must read `ALPHA ACCESS · NOT OWNED`.
- Select a Training loaner. Confirm Training remains available, PvP controls are disabled, and the UI explains that the loaner adds no cards to the collection.
- Select the First Day Deck. Confirm Training, Quick Match, private-room creation, and joining are presented as available.
- Review Player File, Personnel File, Company Store, Achievements, and Ranked entry with a fresh account.

## Match and language

- Complete a Training match and note any Bot choice that is illegal, stuck, or clearly deterministic nonsense; include turn, phase, visible board, and chosen action.
- Check English and German copy at 390×844, 844×390, 1920×1080, and 3840×2160.
- Report clipped text, horizontal overflow, inaccessible touch targets, or dark text on dark surfaces. Include surface, viewport, locale, and a screenshot.

## Feedback payload

- Account or Guest (never include email, passwords, cookies, room tokens, or other secrets).
- Surface and exact action.
- Expected result and observed result.
- Locale, viewport, browser, and approximate time.
- Whether reload or a second browser reproduces it.

## Operational boundaries

- The `+500` wallet/refill/reset controls are Alpha/QA-only economy faucets, not final economy balance.
- PostgreSQL is authoritative only for authenticated Account/Profile progression. Guest is memory-only; room and matchmaking state remain local JSON.
- Backup/helper/timer state is read-only and unavailable to the web app unless safe metadata already exists.
- Any future reset tool must be explicit, attributable, dry-run capable, transaction-safe, session-revoking, and backed up first. No reset tool exists in this pass.
- Add an attributable Admin Audit Log before introducing any Operations mutation endpoint.
