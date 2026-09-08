# Office Card Game v7.69.75

## Runtime Intent Validation Hardening / Internal Maintenance

v7.69.75 hardens the authoritative Match input boundary. It remains an internal maintenance release for controlled internal Alpha testing; broader External Alpha approval remains **NO**.

### F03 resolution

- Runtime validation is centralized in `src/intents.ts` and covers all 17 Match intent discriminants.
- Structural validation runs before authoritative state cloning and dispatch.
- Fractional, negative, out-of-range, string, non-finite, missing, null, unknown, malformed ID, and malformed array inputs are rejected as `INVALID_INTENT`.
- Normal JSON protocol records require `Object.prototype`; `Map`, `Set`, `Date`, `RegExp`, class instances, custom prototypes, arrays, and null-prototype objects are rejected.
- Target maps for `PLAY_ACTION`, `ACTIVATE_ABILITY`, `ACTIVATE_RESPONSE`, and `RESOLVE_TRIGGER_TARGET_SELECTION` are reconstructed into fresh plain records. Every own entry and string-array element is checked.
- Empty, `__proto__`, `constructor`, and `prototype` target keys are rejected; enumerable symbols are rejected.
- Unknown extra properties remain ignored for compatibility and are never copied into the validated intent.
- Malformed JSON returns HTTP 400 `INVALID_JSON`; malformed intents return HTTP 400 `INVALID_INTENT`; structurally valid gameplay-invalid intents retain HTTP 409 `RULES_ERROR` behavior.
- Direct RoomService and HTTP regressions prove malformed inputs do not mutate state, versions, fields, hand, Archive, pending state, processed-intent cache, presentation events, or persistence.

### Settlement and persistence

- F01, F02, and F09 settlement correctness from v7.69.74 are retained and reverified.
- PostgreSQL remains authoritative for authenticated Account/Profile state; Guests remain `MEMORY_ONLY / GUEST_LOCAL`; Room and Matchmaking remain `FILE_JSON_LOCAL`.
- No database migration or settlement-ledger change is included in v7.69.75. Production migrations remain 2/2 current/exact.
- Ranked rules, rewards, seasons, and `timerActive:false` are unchanged.

### QA

- `npm ci --offline --no-audit --no-fund`: passed; existing argon2 allow-scripts notice remains.
- `npm run build`: passed.
- `npm test`: passed, including the F03 regression in the default chain; presentation suite 46/46.
- Dedicated F03 regression: passed, including Map/Set/Date/class/custom-prototype/null-prototype/dangerous-key cases and zero-write no-mutation assertions.
- Docker PostgreSQL 18 integration: passed (`DB_INTEGRATION_OK`, `RANKED_SETTLEMENT_HTTP_PG_REGRESSION OK`).
- Pending/restart settlement regression: passed.
- Direct DB: `Direct DB unavailable — OCG_TEST_DATABASE_URL unset.`
- Browser consolidation remains blocked by Windows `spawn EPERM`; no frontend files changed.
- i18n, artwork, cosmetics, security, card-content, Node syntax, and diff checks passed.
- Impeccable detector remains degraded in regex fallback because optional parser modules are unavailable; no update was made.
- Local QA runs under Node 24.19.0. Production Node 22.22.1 compatibility is verified by deployment preflight/runtime tests.

### Operations and open findings

- F04 scheduled PostgreSQL backup / restore drill remains open and root-dependent.
- F05 deployment lock ordering remains open; this release uses one serial operator with no overlapping preflight/deploy.
- F06 matchmaking commit-time deck/ownership revalidation remains open.
- F12 installed/repository deployment-wrapper parity remains open; the installed wrapper is intentionally unchanged.
- Alpha reset was not performed.
- Impeccable was not updated.
- Recommended next code patch: F06 matchmaking commit-time deck / ownership revalidation.
