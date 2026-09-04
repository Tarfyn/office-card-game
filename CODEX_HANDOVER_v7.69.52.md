# Office Card Game - Codex Handover v7.69.52 Starter Onboarding

## Release

- Version: `v7.69.52`
- Base production version: `v7.69.51`
- PostgreSQL remains authoritative for authenticated Account/Profile data.
- Ranked timer: disabled

## Starter Grant v1

Fresh authenticated profiles begin with `Starter Onboarding` in `PENDING` state and no real
card ownership. The player selects one configured starting Department: Customer Service, IT,
Office, Marketing, or Production. The server then grants the configured Department Core and
Neutral Core cards and presents eight sequential Starter Boosters containing five real cards each.
The complete path produces exactly 60 real card copies before any Safety Grant is needed.

Starter content is configuration-driven in `src/starter-access.ts`; adding a future Department
does not require changing the onboarding algorithm. `ACCOUNTING_TEST` remains test-only and is not
exposed through production UI or data.

## Booster flow and First Day Deck

Booster results are persisted and returned by sequence number. Booster 1/8 through 8/8 cannot be
skipped, rerolls are not available, and repeated or concurrent requests return the same idempotent
grant result. The final step creates exactly one editable, legal 40-card First Day Deck using real
ownership, copy limits, format legality, the selected Department preference, and Neutral glue.

If the configured content cannot otherwise produce a legal owned deck, the deterministic Safety
Grant supplies only the minimum missing copies through a stable source reference. Interrupted
onboarding resumes from PostgreSQL without duplicating grants, booster results, or the First Day
Deck.

## Alpha Test Access and Training Loaners

Alpha Cards is a separate entitlement/test-access view. Alpha access does not mutate `ownedCards`,
does not create scrap/crafting ownership, and cannot satisfy normal Friendly or Ranked ownership
validation. Training and Tutorial may use accepted Alpha-access cards according to the existing
Alpha semantics.

Configured Training Loaners are curated presets. A human may use a valid owned Player Deck or a
Training Loaner, while the Bot independently selects from the configured Training Loaner registry.
Loaners ignore ownership only in Training/Tutorial, never grant cards, and are rejected server-side
for Friendly and Ranked.

## Cosmetic and persistence compatibility

Fresh-account semantics no longer automatically grant `COS-FRAME-002` Blue Silver; legitimate
existing ownership is preserved and no mass revocation occurs. `COS-FRAME-006` Silver Ranked S1
is unchanged. Account/Profile persistence remains PostgreSQL-backed for authenticated users;
Guest remains `MEMORY_ONLY` / `GUEST_LOCAL`, while Room and Matchmaking remain `FILE_JSON_LOCAL`.
No schema migration is required for Starter Onboarding v1.

The release preserves Player File, Match History, Achievements, Ranked progression, Cosmetics,
Card Backs, Badges, Avatar Frames, Executive Edition, the Resolve presentation host, Match-end
presentation gating, combat rules, phase auto-advance, Company Store, Deckbuilder, deployment
hardening, and the read-only Operations surface.

## QA and known follow-up

The disposable PostgreSQL HTTP integration flow passed authenticated registration, Department
selection, all eight packs, reload/resume, idempotency, ownership counts, First Day Deck creation,
Training/Loaner acceptance, and PvP rejection checks. Authenticated onboarding rendering was not
fully exercised in the browser before release; this is a QA coverage limitation rather than a
confirmed runtime defect. The Alpha Account/Profile progression and economy state remains test
data; a deliberate Alpha reset is expected before a later production stage treats progression as
durable. PostgreSQL remains the Source of Truth after that reset and the application does not
revert to JSON.

Deployment remains governed by the hardened wrapper: audit-independent dependency installation,
bounded retries/timeouts, deploy locking, immutable release validation, readiness/health checks,
and rollback safety.

The parked branch `ops/postgresql-helper-foundation` remains separate from this release.
