# VFX Phase 2 implementation QA

Date: 2026-09-06. Baseline: v7.69.66, `50231c648d0ab4fd5bd97d2bb2bac08639632cfe`. Branch: `codex/vfx-phase-2`.

This records the implementation-only QA before release preparation. At that checkpoint version owners were unchanged and no release handover, tag, push, deployment, production mutation or migration had been created. Existing unrelated untracked screenshots and attachment files were preserved. Subsequent release verification is recorded in `../CODEX_HANDOVER_v7.69.67.md`.

## Architecture and scope

The initial audit was completed before changing presentation ownership. `acceptView` installs authoritative state; `appendEvents` receives seq-bearing events before `renderGame` replaces board/hand DOM. V1 kept its body hosts stable but selected the latest combat result from a short cue batch. Archive events precede battle/Action resolution events. Phase 2 groups those confirmed outcomes before scheduling presentation.

The queue, physical proxy model, deduplication, reconnect behavior, reduced-motion behavior, catch-up policy and limitations are documented in [match-vfx.md](match-vfx.md). V1 families, notification host, pointer fix and board geometry remain. No gameplay/server, persistence, economy, ownership, Ranked timer or deployment source changed.

One historical presentation assertion in `test/v7699.test.ts` now requires the queued combat key and captured HTML instead of the latest-battle key. Its stable host and no-inline-combat assertions remain. No gameplay regression was weakened.

## Required checks

| Check | Result |
| --- | --- |
| `npm ci --offline --no-audit --no-fund` | PASS, 27 packages installed from cache |
| `npm run build` | PASS; also rebuilt by the final full suite |
| `npm test` | PASS, exit 0, including historical regressions, account static checks and DB operations static checks |
| `npm run test:db` | Not run: `OCG_TEST_DATABASE_URL` is unset; no direct DB success is claimed |
| `npm run test:db:docker` | PASS, `DB_INTEGRATION_OK`; PostgreSQL migrations, auth, persistence, restart, authorization and concurrency verified |
| `node --test test/match-vfx.test.mjs` | PASS, 20/20 |
| `npm run ops:i18n-audit` | PASS, 107/107 card translations and required UI/result anchors |
| `npm run ops:art-audit` | PASS, 107/107, zero missing/problems/orphans |
| `npm run ops:cosmetic-audit` | PASS |
| `npm run ops:security-audit` | PASS, zero vulnerabilities |
| `npm run ops:card-content-audit` | PASS, 107 cards, no content gaps/mismatches |
| `git diff --check` | PASS |
| Scoped design detector / premium strict audit | PASS, no findings |

Docker ran the same integration script used by direct DB testing. Its deliberate negative-readiness cases log `DATABASE_NOT_READY` before the final success marker. Windows DB static checks note that Bash/AWK installer checks require Ubuntu; those notes are not fabricated runtime checks.

## Browser setup and coverage

Regular Playwright controlled a real headless Chrome browser through local CDP because the preferred Browser plugin was unavailable. Local servers ran on 8787 and 8788 with isolated QA runtime directories. The second runtime used the existing RoomService/engine QA setup to seed deterministic Friendly matches; the server then processed ordinary authoritative intents. Only local fixture state was adjusted for a short lethal scenario. No production account or server was used.

| Viewport | Rendered / interaction coverage | Pre-projection slot-center delta | Horizontal overflow |
| --- | --- | --- | --- |
| 1920 × 1080 | Friendly play/System/Action/combat/direct/lethal; complete fresh Tutorial; component proxy regression | 0 px | 0 px |
| 3840 × 2160 | Live Tutorial card combat and direct REP attack; full Match render; component proxy regression | 0 px | 0 px |
| 390 × 844 | Touch-enabled Training Support placement, Incident response, Employee play, bot combat, Archive targeting and Inspector; component proxy regression | 0 px | 0 px |
| 844 × 390 | Live phase/completion controls and result; full Match render; component proxy and reduced-motion regression | 0 px | 0 px |

Numerical symmetry was measured with the projection transforms temporarily disabled and then restored. Each seat retained five Employee and four Support slots. Full screenshots were inspected; the large 4K image was previewed downscaled after measuring at its actual viewport. Component tests use a static capture of the real Match DOM, shipped styles and the actual VFX module; they are distinguished from live server gameplay above. No device FPS benchmark or every-flow-at-every-viewport claim is made.

### Normal Match and multi-event evidence

- A visible Employee travelled from hand while its authoritative field node already existed. One proxy was present and the destination stayed pointer-enabled. Browser QA found an inherited opacity transition could briefly leave the destination visible; suppression now disables that transition immediately and the DOM regression requires computed opacity zero.
- Coffee Machine used the same hand-to-Support path. Coffee Chat retained the same proxy through its resolve beat and then travelled into Archive. No temporary gameplay zone was added.
- A surviving Service Desk Lead attacked an Intern. The authoritative loser was archived; outcome and Archive travel completed before the surviving attacker returned. Completed proxies and suppression attributes were absent.
- Direct attacks produced the server's signed `-1 REP`. In the lethal trace: proxy started at 388 ms, REP feedback at 618 ms, combat outcome at 731 ms, combat closed at 1235 ms, and the result first appeared at 1414 ms with zero proxies. The result never covered the final queued outcome.
- Two equal-power battles were submitted close together in a local Friendly fixture. Both players reached two archived cards immediately in authoritative state. Presentation group `combat:38` completed outcome/Archive before `combat:50` began. Each group appeared once; no combat overlap or orphan suppression remained.
- A real Training bot burst exercised the catch-up receipt: battle/resolve/archive counts and signed REP feedback remained while decorative travel compressed.
- The queue's 20 pure tests also cover repeated seq/key delivery, exact group ordering, split response windows, Action-caused multiple archives, bounded catch-up, an 18-card Archive receipt, separately retained damage/healing, redirects, new-room seq reuse and either-seat geometry.

### Tutorial, Training and recovery

- A fresh Tutorial completed Keep hand → Employee → Coffee Chat target/confirm → Battle → Employee attack → direct attack → End → Complete Tutorial. The result reported `Tutorial complete`; no hardlock or incorrect phase CTA occurred.
- In touch-enabled Training, the exposed Support slot received a tap inside the empty hand container's bounds. `elementFromPoint` identified the slot, and Please Hold was set. The visible hand cards remained interactive. Please Hold subsequently responded to the bot's attack; play continued normally.
- Training Employee play, bot combat/destruction and Escalated Ticket's Archive target/confirmation worked with authoritative card return. Inspector opened normally.
- The active notification's node identity and two-child host count stayed unchanged across Inspector rerender. Global listener counts stayed at 35 on `window` and 15 on `document` before/after closing and reopening Inspector.
- Offline/online reconnect produced zero historical proxies. A second tab opened read-only, took control, and the previous tab became read-only. Takeover and reload produced zero historical proxies and zero orphan suppression attributes.

### Reduced motion, cleanup and console

`test/match-vfx.browser.mjs` exports reusable Playwright checks against the real rendered card DOM. Physical placement, same-node survival through `app.innerHTML` replacement, hidden-opponent full-back safety, pointer transparency, completed cleanup and duplicate suppression passed at all four sizes. A resize test cancelled motion, prevented a stale return, and retained dedupe. A destroyed-attacker test verified that the same proxy reconciles from field dimensions to the larger combat-card dimensions before travelling to Archive. Reduced-motion combat produced no physical proxy, retained commit/impact/outcome/archive/return ordering and a visible Archive cue, and drained cleanly.

Queued combat now shows its existing outcome panel immediately rather than inheriting the old multi-second fade-in. The static winner edge and ARCHIVED/SAVED stamps remain readable, including reduced motion. A live 4K direct outcome had computed opacity 1 and the expected green winner edge.

No uncaught page errors were recorded in the exercised normal, multi-event, Tutorial or Training flows. The final live reload/completion console check recorded no console errors or HTTP errors. The deliberate offline test is an expected connection failure, not a gameplay exception. No new horizontal overflow, orphan proxy, repeated combat group or notification remount was observed.

## Known and deferred

The known guest loaner-selection HTTP 400 issue was not reproduced in the final monitored flow and was not changed or claimed fixed. No external art/VFX or sound assets are required. Phase 3 intensity, hero moments and a complete sound system remain deferred.

Implementation checkpoint: no blockers found within the tested scope; review-ready. No separate implementation commit was made before release preparation.
