import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (relative: string) => readFileSync(fileURLToPath(new URL(`../../${relative}`, import.meta.url)), "utf8");
const app = read("public/app.js");
const i18n = read("public/i18n.js");
const de = read("public/locales/de.js");
const css = read("public/styles.css");

assert.match(app, /function cardTypeUiLabel\(type\)/);
assert.match(app, /lobbyCopy\('COST','KOSTEN'\)/);
assert.match(app, /lobbyCopy\('PROMOTION','BEFÖRDERUNG'\)/);
assert.match(app, /lobbyCopy\('Employee','Mitarbeiter'\)/);
assert.match(app, /cardTypeUiLabel\(type\)/);
assert.match(i18n, /KOSTEN/);
assert.match(i18n, /BEFÖRDERUNG/);
assert.match(de, /"ENGINE COVERAGE":"ENGINE-ABDECKUNG"/);
assert.match(de, /"Capacity curve":"Kapazitätskurve"/);
assert.match(de, /"STAFF":"MITARBEITER"/);
assert.match(css, /--ui-text-on-dark-muted/);
assert.match(css, /:where\(button, select, input, textarea, summary, \[role="button"\]\):focus-visible/);
assert.match(css, /body\.collection-mode \.collection-filters input/);

console.log("Legacy localization and scoped CSS consistency markers passed.");
