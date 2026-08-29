# Office Card Game — External Alpha Candidate v7.56

## Candidate acceptance
- 107-card Alpha catalog loads from the authoritative server.
- Five starter presets remain exactly 40 cards each.
- Friendly Quick Match, private rooms, reconnect, replay, human feedback and rematch remain enabled.
- Hosted mode supports reverse-proxy HTTPS, header-based credentials, short-lived SSE tickets, rate limits, admin-protected analytics, readiness checks, backup and graceful shutdown.
- Tester UX includes first-run onboarding, connection/session diagnostics, safe bug-report export and Alpha test-session grouping.
- Ranked Alpha remains preseason and the turn timer remains OFF.

## Known Alpha constraints
- One authoritative Node process per runtime directory; persistence is local JSON, not a production database.
- Artwork coverage is incomplete; fallback art is intentional during Alpha.
- T2/T3 foil is implemented but final tuning should be judged again as artwork coverage grows.
- English remains the canonical game language. Localization infrastructure / German is planned as a later block.
- This candidate still requires a real hosted two-network smoke after deployment; local HTTP smokes cannot prove DNS/TLS/router/proxy behavior.
