import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
let passed = 0;
const root = (n) => readFileSync(fileURLToPath(new URL(`../../${n}`, import.meta.url)), "utf8");
const pkg = JSON.parse(root("package.json")), server = root("server/server.mjs"), html = root("public/index.html"), app = root("public/app.js"), i18n = root("public/i18n.js"), de = root("public/locales/de.js"), css = root("public/styles.css");
function test(n, f) { f(); passed++; console.log(`✓ ${n}`); }
test("v7.58 language switch remains present", () => { assert.match(html, /id="languageSelect"/); assert.match(i18n, /Object\.freeze\(\{ en, de \}\)/); });
test("German locale is registered without replacing English canonical fallback", () => { assert.match(i18n, /import \{ de,/); assert.match(i18n, /Object\.freeze\(\{ en, de \}\)/); assert.match(i18n, /const canonical = lookup\(en, key\)/); });
test("topbar exposes an accessible language switch", () => { assert.match(html, /id="languageSelect"/); assert.match(html, /option value="en"/); assert.match(html, /option value="de"/); assert.match(html, /data-i18n="language\.label"/); });
test("language selection persists and triggers a rerender", () => { assert.match(app, /setLocale\(select\.value\)/); assert.match(app, /ocg:localechange/); assert.match(app, /render\(\)/); });
test("German shell translations are real translations", () => { for (const phrase of ["Zum Spielinhalt springen", "Zurück zur Lobby", "Sprache", "Schließen"])
    assert.match(de, new RegExp(phrase)); });
test("language switch stays compact on mobile", () => { assert.match(css, /v7\.58 language switch/); assert.match(css, /@media \(max-width:620px\)/); });
console.log(`${passed}/6 v7.58 tests passed.`);
