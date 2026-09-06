# Office Card Game v7.69.66 Handover

## VFX Foundation V1

Release of the reviewed implementation `39bf4aa1ba1349e276aa6581bcd3f8f21537a959`, based on production v7.69.65 (`e0e5fe0fa084aeb52540b0a050e85a8c2fa8c63c`). v7.69.66 was unused locally and on origin before release preparation. The release preparation changes only authoritative version owners, their existing regression assertions, and this handover. The accepted application implementation is unchanged.

- Restrained card-arrival edges, attack-direction brackets and scan cues, compact impact feedback, signed Company Reputation feedback, resolution/confirmation cues, Archive send-off/receipt cues, and phase emphasis.
- All feedback consumes authoritative events and projected targets. It does not calculate combat, legality, outcomes, phase transitions, or Archive/REP changes.
- The room-scoped sequence watermark suppresses historical/repeated events; bounded pending/live effects coalesce and expire. Recovery and background delivery do not replay stale feedback.
- Stable notification hosts preserve resolve, gameplay, attack, and zone notification nodes across normal rerenders. Existing combat outcomes remain readable without redundant generic resolution clutter.
- Reduced motion removes travel/transforms while retaining visible static edges, signed deltas, and ARCHIVED/SAVED outcome stamps. It does not remove outcome feedback.
- Empty hand-container space is pointer-transparent; visible hand cards retain pointer interaction. Mobile Support placement passes through the previously intercepting empty hand area.
- No new external VFX assets or dependencies. The accepted restrained, readable corporate visual direction and existing gameplay timing are preserved.

Detailed ownership and limits: `docs/match-vfx.md`. AGENTS.md remains version-independent. Board topology and desktop perspective are unchanged. No gameplay, Tutorial V2, Training, recovery, persistence, economy, Ranked, Executive Edition, onboarding, Deckbuilder, or cosmetic semantics change. Ranked timer remains disabled. No schema migration is added.

## Final pre-release validation

All commands below passed on the v7.69.66 release candidate:

- `npm.cmd ci --offline --no-audit --no-fund` (successful retry after stopping a local QA server that held the native argon2 module open).
- `npm.cmd run build` and `npm.cmd test` (full historical and current regressions, account checks, and DB static checks).
- `npm.cmd run test:db:docker`: PostgreSQL 18 integration, including migration, onboarding, booster flow, authentication, persistence/restart, authorization, and concurrency.
- Explicit `node test/match-vfx.test.mjs`: 6/6; `node dist/test/match-presentation.test.js`: 5/5.
- `npm.cmd run ops:i18n-audit`: 107/107 translated cards, 11/11 UI anchors, 33/33 result strings.
- `npm.cmd run ops:art-audit`: 107/107, no missing/problem/orphan artwork.
- `npm.cmd run ops:cosmetic-audit`, `npm.cmd run ops:security-audit` (0 vulnerabilities), and `npm.cmd run ops:card-content-audit` (107 cards, no reported content problems).
- `git diff --check`.

Direct `npm run test:db` was unavailable because `OCG_TEST_DATABASE_URL` was unset. It was not reported as run. The same integration suite passed through the PostgreSQL Docker runner.

## Browser revalidation

Real Chromium against the local v7.69.66 application, using disposable local guest/match state:

- Desktop 1920 x 1080 and 3840 x 2160: zero horizontal overflow; corresponding Own/Opponent slot centers have zero pre-projection X difference. The shared desktop perspective remains intact.
- Mobile portrait 390 x 844 and landscape 844 x 390: zero horizontal overflow, both world transforms `none`, canonical card anatomy retained.
- Completed the full desktop Tutorial V2 path: mulligan, Employee placement, targeted Coffee Chat and confirmation, Battle phase, Employee combat, direct REP attack, End phase, and Tutorial completion/result. No hardlock or incorrect phase transition observed.
- Combat showed the archived outcome stamp and a visible direct -1 REP result. Arrival, attack direction, impact, REP, resolve, Archive, and phase cues were observed from authoritative events.
- Right-click Inspector opened and closed. Resolve and zone notification node identity survived the resulting rerender, with one resolve notification and no restarted entrance/flicker observed.
- Normal two-player Friendly Match: mulligan, System placement, Employee placement, controlled phase progression, direct -2 REP attack, controller takeover, reload, and resignation result. Targeted Action and card-versus-card combat were reconfirmed through the complete Tutorial path.
- Training: normal bot-backed flow and mobile Incident placement in a Support slot. A visible hand card accepted the tap; the exposed slot under empty hand space accepted placement. Computed hand-container pointer events were `none`, actual cards `auto`.
- Reduced-motion Training retained a static phase edge (`animation:none`, `transform:none`, opacity 0.8). No feedback-blocking pointer layer was introduced.
- Recovery: takeover made the original tab read-only, retained the System on the field, and reload produced zero historical VFX nodes.
- No uncaught JavaScript errors recorded in desktop, mobile, or normal Match sessions. No new visible flicker or layout regression observed.

## Known and deferred

- Existing guest loaner selection `/api/profiles/me/decks/select` HTTP 400 responses remain observable. This behavior was present before the VFX implementation; no unrelated fix is included.
- Continuous physical card travel remains a Phase 2 candidate.
- A multi-battle presentation queue remains a Phase 2 candidate. V1 retains the existing bounded combat presentation and authoritative Match Log.

## Deployment contract

Use `/opt/office-card-game/deploy.sh --check v7.69.66`, then `/opt/office-card-game/deploy.sh v7.69.66`. The wrapper must verify/migrate before activation and verify readiness afterward. Authenticated Account/Profile remains POSTGRES; Guest remains MEMORY_ONLY; Room and Matchmaking remain FILE_JSON_LOCAL. No persistence cutover or production data reset is part of this release.

No approved disposable production Alpha account was supplied. Production verification must use read-only health/readiness/assets and safe rendered surface checks; any production-asset Match rendering with local API fixtures must be identified as such, not claimed as a live production Match. Do not create production guest/profile/match state solely for VFX demonstration.
