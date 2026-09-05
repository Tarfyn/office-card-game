# Office Card Game v7.69.59 Handover

## Starter Intern choice

Fresh authenticated Starter Onboarding now begins with a compact, required choice between the two existing Intern avatars:

- `COS-AVA-007` — `intern-female.webp`
- `COS-AVA-008` — `intern-male.webp`

Both options are displayed as `Intern` in English and German. No gender labels or technical cosmetic identifiers are exposed to players.

Exactly one selected Intern becomes starter-owned and equipped. The other remains unowned. The selection is locked after confirmation and uses stable, idempotent starter grant source references. No starter Frame, decoration, badge, or title is introduced; the existing starter Board and Card Back remain unchanged.

## Persistence and compatibility

The pending choice, selected cosmetic ID, and grant state are stored in the existing authenticated Account/Profile JSONB architecture in PostgreSQL. No schema migration is required, and localStorage is not authoritative.

Legacy and previously onboarded accounts are excluded. Existing accounts are not retroactively granted the second Intern or forced back into Starter Onboarding. Guest persistence remains `MEMORY_ONLY` / `GUEST_LOCAL`.

## Analytics

The semantic `starter_avatar_selected` first-session event is recorded once with minimal event metadata (event name and timestamp). The expected early order is:

`account_registered` -> `starter_avatar_selected` -> `starter_department_selected`

No credentials, email addresses, session tokens, or third-party analytics are used.

## QA and release scope

The release preserves Starter Boosters, First Day Deck, First-Session Guidance, Alpha Access, Training Loaners, PvP validation, transactional profile mutation safety, and existing cosmetic behavior. The selected Intern was manually verified through the disposable PostgreSQL-backed onboarding flow at desktop and mobile browser surfaces; reload, idempotency, ownership, equip, and no-Frame behavior were covered.

No PostgreSQL schema migration, economy change, gameplay rule change, Alpha reset, or production account mutation is part of this release.

The future Alpha reset remains pending and may deliberately reinitialize first-session/starter metadata through the existing PostgreSQL source of truth.
