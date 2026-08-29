# Office Card Game — Artwork Specification v1

This document defines the canonical artwork input format for card illustrations.

## Canonical source format

- Canvas: **1600 × 900 px**
- Aspect ratio: **16:9**
- Preferred delivery: **WebP**
- Accepted working format: **PNG**
- Existing bundled placeholders may remain **SVG** during development.
- Artwork only: **no card frame, card name, rules text, logos, rarity marks, UI, or watermarks**.
- Avoid important readable text inside the illustration. Small incidental signage is fine only if it is not needed to understand the image.

## Composition / safe area

The browser uses the same source image in small cards, field cards, hover previews, and close-ups with `object-fit: cover`.

- Keep the main subject and essential visual joke inside the **central ~70% of the canvas**.
- Treat the outer ~15% on every side as crop-tolerant space.
- Do not place faces, important props, or the punchline directly against an edge.
- Horizontal compositions are preferred; avoid layouts that only work as a portrait crop.

## Art direction consistency

For a coherent set, generate all cards in one shared visual language:

- same illustration/rendering style
- comparable detail level
- comparable lighting and contrast
- office satire with readable silhouettes at small size
- department identity should come from environment/subject matter, not from forcing department colors into every image
- card-type color is handled by the game frame, not the artwork

## File naming and `artId`

`artId` is a relative path **including the file extension** under `public/art/`.

Example:

```json
{
  "artId": "alpha/customer-service-agent.webp"
}
```

The client resolves this to:

```text
/art/alpha/customer-service-agent.webp
```

Recommended naming:

```text
public/art/alpha/<card-slug>.webp
```

## Six-card visual test set

Use these first to validate the shared art style across departments and card types:

1. `CS-001` — **Customer Service Agent** — Employee / Customer Service
2. `IT-003` — **System Administrator** — Employee / IT
3. `OFC-007` — **Approval Required** — Incident / Office
4. `MKT-012` — **Going Viral** — Action / Marketing
5. `PRD-008` — **Plant Manager** — Employee / Production
6. `N-013` — **Coffee Machine** — System / Neutral

## Recommended subject direction for the six samples

- **Customer Service Agent:** headset, several open calls/tickets, approachable but visibly busy office situation.
- **System Administrator:** monitors/server infrastructure, competent calm amid technical clutter.
- **Approval Required:** comically excessive approval chain, stamps/signatures/forms moving through bureaucracy.
- **Going Viral:** campaign suddenly exploding in reach/notifications, energetic but still office-grounded.
- **Plant Manager:** production lead overseeing a busy line, confident high-output energy.
- **Coffee Machine:** office coffee machine treated like mission-critical shared infrastructure; subtle queue/cult-status humor.
