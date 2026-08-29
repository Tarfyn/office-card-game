import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
let passed = 0;
const root = (n) => readFileSync(fileURLToPath(new URL(`../../${n}`, import.meta.url)), "utf8");
const pkg = JSON.parse(root("package.json")), server = root("server/server.mjs"), html = root("public/index.html"), app = root("public/app.js"), i18n = root("public/i18n.js"), cards = JSON.parse(root("data/cards.json")), deCards = root("public/locales/de-cards.js"), audit = root("scripts/localization-audit.mjs");
function test(n, f) { f(); passed++; console.log(`✓ ${n}`); }
test("v7.60 localization baseline remains documented after later versions", () => { assert.match(root("README.md"), /v7\.60/i); assert.match(i18n, /const overlay = deCards\[definition\.id\]/); assert.match(html, /Regression compatibility marker: v7.60 Alpha Playtest/); });
test("German card overlay covers exactly the 107-card Alpha pool", () => { assert.equal(cards.length, 107); for (const card of cards)
    assert.match(deCards, new RegExp(`\\"${card.id}\\"`)); });
test("card localization overlays display fields without replacing canonical card data", () => { assert.match(i18n, /const overlay = deCards\[definition\.id\]/); assert.match(i18n, /\{ \.\.\.definition, \.\.\.overlay \}/); assert.match(app, /localizedCard\(state\.catalog\.get\(definitionId\)\)/); });
test("collection and related-card display paths localize catalog values", () => { assert.match(app, /state\.catalog\.values\(\)\]\.map\(localizedCard\)/); assert.match(app, /const cards = \[\.\.\.state\.catalog\.values\(\)\]\.map\(localizedCard\)/); });
test("card type labels are localized separately from semantic cardType ids", () => { assert.match(i18n, /EMPLOYEE:'MITARBEITER'/); assert.match(i18n, /ACTION:'AKTION'/); assert.match(app, /cardTypeLabel\(def\.cardType\)/); });
test("localization audit rejects missing names rules or flavor", () => { assert.equal(pkg.scripts["ops:i18n-audit"], "node scripts/localization-audit.mjs"); assert.match(audit, /missing/); assert.match(audit, /incomplete/); assert.match(audit, /I18N_AUDIT_OK/); });
console.log(`${passed}/6 v7.60 tests passed.`);
