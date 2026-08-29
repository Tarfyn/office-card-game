# Card artwork assets

See `../../ARTWORK_SPEC.md` for the canonical artwork format.

Final artwork should normally live in `public/art/alpha/` as 1600×900 WebP files and be referenced by `CardDefinition.artId`, including the extension.

## v7.69.5 artwork batch

The current playtest batch contains 81 supplied 1376×768 WebP illustrations named with canonical kebab-case card slugs. The audit keeps 1600×900 / 16:9 as the preferred target while accepting this near-16:9 production batch without resampling the supplied masters.
