import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = (name: string) => readFileSync(fileURLToPath(new URL(`../../${name}`, import.meta.url)), "utf8");
const app = root("public/app.js");
const css = root("public/styles.css");
const packageJson = JSON.parse(root("package.json"));

assert.equal(packageJson.version, "7.69.36");
assert.match(app, /finishBadgePlacement = 'type-strip'/);
assert.match(app, /finishBadgePlacement === 'artwork' \? finishBadge : ''/);
assert.match(app, /renderCollectionCard[\s\S]*finishBadgePlacement:'artwork'/);
assert.match(css, /\.collection-card \.catalog-art-stage \.card-finish-badge/);

console.log("\n4/4 v7.69.36 Deckbuilder plaque tests passed.");
