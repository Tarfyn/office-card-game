import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
let passed = 0;
function test(n, f) { f(); passed++; console.log(`✓ ${n}`); }
const root = (n) => readFileSync(fileURLToPath(new URL(`../../${n}`, import.meta.url)), "utf8");
const css = root("public/styles.css"), server = root("server/server.mjs"), readme = root("README.md");
const pkg = JSON.parse(root("package.json"));
test("v7.43 meta visual baseline remains present in later versions", () => { assert.ok(Number(pkg.version.split(".")[1]) >= 43); assert.match(css, /Collection gets a dark filing-desk surround/); });
test("v7.43 gives lobby a premium front-desk surface", () => { assert.match(css, /Lobby reads as the front desk/); assert.match(css, /\.lobby-command-center \{/); assert.match(css, /\.lobby-command-center \.lobby-hero/); });
test("v7.43 gives collection a dark filing-desk surround", () => { assert.match(css, /Collection gets a dark filing-desk surround/); assert.match(css, /\.collection-shell \{/); assert.match(css, /\.collection-browser \{/); });
test("v7.43 makes deckbuilder a side console", () => { assert.match(css, /Deckbuilder becomes a physical side console/); assert.match(css, /\.deck-builder-panel \{/); });
test("v7.43 keeps responsive meta surfaces", () => { assert.match(css, /@media \(max-width:760px\)[\s\S]*\.collection-shell/); });
test("v7.43 is documented as visual-only", () => { assert.match(readme, /No interaction or data flow changes/); });
console.log(`${passed}/6 v7.43 tests passed.`);
