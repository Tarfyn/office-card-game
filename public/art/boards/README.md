# Match arena backgrounds

v7.69 separates decorative arena artwork from the code-native battlefield geometry.

- The default match surface is a neutral CSS fallback and requires no image asset.
- Future arena backgrounds belong in this directory, for example `executive-desk.webp`.
- Background artwork must not contain card slots, cards, resource values, labels, buttons, or other game-state information. The 5 Employee + 4 Support/System topology stays in HTML/CSS so every arena uses identical gameplay geometry.
- Desktop and mobile may crop the same asset differently through background position/size settings.
- Missing or invalid artwork falls back to the neutral built-in surface without changing match layout.

The current client accepts a future locally configured arena object stored under `office-card-game-match-arena-v1`, for example:

```json
{
  "id": "executive-desk",
  "image": "/art/boards/executive-desk.webp",
  "position": "50% 50%",
  "size": "cover"
}
```

Only local `/art/boards/` WebP, PNG, JPG, or JPEG paths are accepted. There is intentionally no arena-selection UI, unlock system, or economy in v7.69.
