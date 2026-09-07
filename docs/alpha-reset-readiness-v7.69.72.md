# Alpha reset readiness audit (v7.69.72)

This is an audit only. No reset, profile mutation, migration, or production operation was executed.

The established storage contract is: authenticated Account/Profile state is PostgreSQL-backed; Guest state is `MEMORY_ONLY` / `GUEST_LOCAL`; Room and Matchmaking remain `FILE_JSON_LOCAL`. The table below separates that established decision from a recommended future Alpha policy.

| State | Current storage | Reset? | Keep? | Recalculate? | Dependencies | Risk | Recommendation |
|---|---|---:|---:|---:|---|---|---|
| Account identity / sessions | PostgreSQL `users`, `sessions` | No | Yes | No | Session revocation | Identity loss | Keep account identity; revoke sessions only if policy requires |
| Card ownership | `player_profiles.profile_data.meta.ownedCards` | Yes* | No* | No | Grants, decks | Collection loss | Reset for a fresh Alpha economy only after explicit approval |
| Executive variants | `meta.ownedCardVariants` | Yes* | No* | No | Card ownership | Variant loss | Reset with ownership; preserve only if Alpha Access policy says so |
| Office Credits / Scraps | `meta.balances` | Yes* | No* | No | Booster/craft history | Economy inflation | Reset transactionally |
| Saved decks | `player_decks` plus profile selected deck | Yes* | No* | No | Owned cards, selected deck | Invalid decks | Delete/reset decks or mark drafts; never silently retain invalid PvP decks |
| First Day Deck | `meta.starterOnboarding.firstDayDeckId` and deck rows | Rebuild | No* | Yes | Starter grants | Orphaned references | Recreate from the selected starter department |
| Booster history / grant provenance | `meta.rewardGrants`; PostgreSQL `reward_grants` | No* | Yes* | No | Ownership/economy | Audit gaps | Retain immutable provenance, or archive under a documented reset epoch |
| Level / XP | `meta.progression` | Yes* | No* | No | Reward grants | Milestone mismatch | Reset with progression rewards |
| Achievements / progress | `meta.progression`, `achievement_progress` | Yes* | No* | No | Match records, grants | Duplicate rewards | Reset progress and idempotently rebuild grants |
| Ranked REP / tier / division | `profile.ranked`, `stats.ranked` | Yes* | No* | Yes | Season config | Competitive integrity | Reset to current season placement baseline |
| Season state | `profile.ranked.seasonId`, ranked config | No | Yes | Yes | Current season config | Wrong ladder | Keep current configured season; recalculate standing |
| Match history | `match_history` in profile data | Yes* | No* | No | Stats, replays | Lost QA evidence | Keep anonymized export separately if needed; clear player history on reset |
| Aggregate stats | `profile.stats` | Yes* | No* | Yes | Match history | Contradictory totals | Reset or rebuild from retained history according to policy |
| Cosmetics ownership | `meta.cosmetics.owned` | Yes* | No* | No | Shop/grants | Paid/entitlement confusion | Reset Alpha grants only; preserve separately entitled items if approved |
| Cosmetics loadout | `meta.cosmetics.loadout` | Rebuild | No* | Yes | Cosmetic ownership | Missing asset IDs | Reconcile to owned IDs and defaults |
| Titles / badges | `meta.cosmetics.owned` and loadout | Yes* | No* | No | Grants | Broken identity UI | Reset earned Alpha items; preserve entitlement-only items if approved |
| Boards / frames / decorations / card backs | Cosmetic ownership/loadout | Yes* | No* | Yes | Catalog IDs | Invalid references | Reset owned Alpha items and reapply defaults |
| Starter onboarding | `meta.starterOnboarding` | Yes* | No* | No | First Day Deck, grants | Regrant duplication | Reset to `IN_PROGRESS`/fresh state with idempotent source refs |
| First Session Guide | `meta.firstSessionGuide` | Yes* | No* | No | Onboarding version | Repeated/omitted guidance | Reset only when the guide version is intentionally replayed |
| Tutorial state | Progression events / profile meta | Yes* | No* | No | Tutorial completion | Reward eligibility | Reset completion flags; Tutorial remains reward-ineligible |
| Training completion/goals | Progression events / profile meta | Yes* | No* | No | Guest/account mode | Incorrect onboarding | Reset account training goals; loaners remain non-owned |
| QA / Alpha grants | `meta.rewardGrants` with `admin` / `alpha_playtest` sources | Yes* | No* | No | Grant provenance | Unintended access | Scope by grant source and reset epoch |
| Alpha Access entitlement | `meta.alphaPlaytestAccess` | No* | Yes* | No | Account authorization | Access loss | Keep entitlement unless product explicitly ends Alpha access |
| Reward grant history | PostgreSQL `reward_grants` | No* | Yes* | No | Idempotency keys | Audit loss | Keep immutable rows; add reset epoch rather than deleting evidence |

`*` marks a recommendation, not an established product decision. The current code and contracts establish storage/authority boundaries only; they do not authorize a destructive reset policy.

## Readiness assessment

A future reset can be implemented as one explicit, root-authorized PostgreSQL transaction over `player_profiles`, `player_decks`, `reward_grants`, and `achievement_progress`, with an idempotent reset epoch in `persistence_metadata`. It should emit an attributable Admin Audit Log entry, report counts only, and be resumable by epoch. It must not write legacy JSON, use Guest storage as a fallback, or run through a normal web request. A read-only dry run should validate affected account counts and dependency references before any mutation.

No schema change was required for this audit. No dry-run helper was added, because the existing read-only Ops surface does not yet provide the required attributable mutation audit contract.
