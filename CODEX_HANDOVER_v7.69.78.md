# v7.69.78 — Pre-Root Application Hardening Consolidation

## Release scope

v7.69.78 consolidates the reviewed non-root hardening work from the pre-root Alpha pass:

- F08 local Room/Matchmaking JSON corruption handling with explicit load states and degraded readiness.
- F10 active-controller exclusivity with required matching `clientId` on controlled mutations.
- F11 portable browser harness with truthful viewport reporting and External Chrome CDP fallback.
- F13 Enter/Space primary activation for actionable hand cards, including targeted actions and blocker feedback.
- F14 Archive open/closed presentation state persistence across normal rerenders and room changes.
- F15 canonical Alpha Reset readiness inventory in `docs/alpha-reset-readiness.md`.
- F16 runtime/version and database-operations documentation cleanup.
- Behavioral card semantic coverage expansion and repeatable performance baseline tooling.

Previously resolved F01, F02, F03, F06, F07 and F09 remain protected by the full regression chain. Ranked timer enforcement remains disabled (`timerActive:false`). No database migration or Alpha reset is included.

## Browser acceptance

Live acceptance used an isolated local server and real headless Chrome 152 (`C:\Program Files\Google\Chrome\Application\chrome.exe`) over loopback External CDP. The current Windows host still blocks Playwright's automatic child-process launch with `spawn EPERM`; this is a host policy limitation. External-CDP acceptance passed with actual cases at 1920x1080, 3840x2160, 390x844 and 844x390, including keyboard Enter/Space, blocked-card feedback, targeting/cancellation, touch/long-press Inspector behavior, Support placement and Archive persistence. Console and unexpected network error lists were empty, and Chrome/server/temp fixtures were cleaned up.

F11, F13 and F14 are therefore live-verified. The automatic Playwright launch remains environment-blocked but is not a repository/product failure.

## Operations and root-dependent work

The reviewed F05/F12 deployment-wrapper candidate remains in the repository and is not installed. The production `/opt/office-card-game/deploy.sh` wrapper remains the previously installed copy; application deployment must not replace it. F05/F12 production installation/parity and F04 scheduled-backup/restore work remain root-authorized follow-ups. No systemd, sudoers, production storage, profile, economy or Match state was changed during preparation.

Controlled Internal Alpha remains enabled. Broader External Alpha remains **NO**. Impeccable was not updated; unavailable/degraded detector status is reported separately in release QA.

## Version identity

Application release version: `7.69.78` (package/runtime source). Analytics/export schema version remains independent. The release tag, package version, runtime health/ready version and deployment identity must resolve to the same release commit during preflight.
