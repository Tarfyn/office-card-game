# Office Card Game — Artwork Pipeline

## Contract

- Canonical source target: **1600 × 900 px**, 16:9.
- PNG is accepted during production; WebP is preferred for final delivery. JPEG is accepted by the audit but not preferred for final card art.
- Keep the subject and essential joke inside the central ~70%; the outer ~15% on each edge is crop-tolerant.
- Artwork contains **no card frame, title, rules text, rarity, UI, logo or readable office-screen text**.
- Production assets live below `public/art/alpha/`. Development SVG samples below `public/art/alpha-samples/` are ignored by the production orphan check.

## Add an artwork

1. Put the raster file in `public/art/alpha/`.
2. Set the card's `artId` in `data/cards.json` to the relative path, e.g. `alpha/customer-service-agent.webp`.
3. Run `npm run ops:art-audit`.
4. Review `reports/artwork-status.md`.

The normal audit reports missing art but does not fail on it while the Alpha art pool is incomplete. Broken references, unsafe paths, unsupported formats, bad 16:9 crops and orphan production files fail the command. `npm run ops:art-audit:strict` additionally fails when any card is still missing art.


## Per-card crop focus

`data/artwork.json` stores presentation-only focus points as percentages. `{ "x": 50, "y": 50 }` is the center. The server exposes this as `artFocus`, and the same value is reused by field cards, hand cards, booster reveals, collection cards and the inspector. This avoids creating separate crops or duplicate artwork files for different surfaces.
