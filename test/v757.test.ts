import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
let passed=0; const root=(n:string)=>readFileSync(fileURLToPath(new URL(`../../${n}`,import.meta.url)),"utf8");
const pkg=JSON.parse(root("package.json")),server=root("server/server.mjs"),html=root("public/index.html"),app=root("public/app.js"),i18n=root("public/i18n.js"),en=root("public/locales/en.js");
function test(n:string,f:()=>void){f();passed++;console.log(`✓ ${n}`)}
test("v7.57 localization foundation remains present",()=>{assert.match(i18n,/office-card-game-locale-v1/);assert.match(en,/export const en/);});
test("v7.57 ships an English canonical locale module",()=>{assert.match(en,/export const en/);assert.match(en,/Skip to game content/);assert.match(en,/Back to lobby/)});
test("v7.57 i18n falls back to canonical English",()=>{assert.match(i18n,/const canonical = lookup\(en, key\)/);assert.match(i18n,/localized \?\? canonical/)});
test("v7.57 persists locale independently from account and room state",()=>{assert.match(i18n,/office-card-game-locale-v1/);assert.match(i18n,/localStorage\.setItem/);assert.doesNotMatch(i18n,/roomToken|profileToken/)});
test("v7.57 wires document and app into the localization foundation",()=>{assert.match(html,/data-i18n="accessibility\.skipToGame"/);assert.match(html,/data-i18n="nav\.backToLobby"/);assert.match(app,/from '\.\/i18n\.js'/);assert.match(app,/applyDocumentTranslations\(\)/)});
test("v7.57 canonical-card principle remains intact",()=>{assert.match(i18n,/locale !== 'de'\) return definition/);assert.match(i18n,/\.\.\.definition/)});
console.log(`${passed}/6 v7.57 tests passed.`);
