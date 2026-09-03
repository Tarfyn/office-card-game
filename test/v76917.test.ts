import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let passed=0;
function test(name:string, fn:()=>void){ fn(); passed+=1; console.log(`✓ ${name}`); }
const path=(name:string)=>fileURLToPath(new URL(`../../${name}`,import.meta.url));
const root=(name:string)=>readFileSync(path(name),"utf8");
const pkg=JSON.parse(root("package.json"));
const app=root("public/app.js");
const css=root("public/styles.css");
const room=root("src/room.ts");
const cosmetics=root("src/cosmetics.ts");
const polish=css.slice(css.lastIndexOf("/* v7.69.17 — cosmetic loadout foundation + root visual fixes */"));

test("v7.69.17 version markers are current",()=>{
  assert.equal(pkg.version,"7.69.42");
  assert.match(pkg.scripts.test,/dist\/test\/v76917\.test\.js/);
  assert.match(root("server/server.mjs"),/version: "7\.69\.42"/);
});

test("cosmetic loadout uses stable IDs and independent slots",()=>{
  for (const slot of ["boardSkinId","avatarId","avatarFrameId","avatarDecorationId","cardBackId","badgeId","titleId"]) assert.match(cosmetics,new RegExp(`${slot}:`));
  assert.match(cosmetics,/COS-BOARD-001/);
  assert.match(cosmetics,/COS-AVA-001/);
  assert.match(cosmetics,/COS-AVA-002/);
  assert.match(cosmetics,/playerId === "P1" \? COSMETIC_IDS\.overworkedSysadminAvatar : COSMETIC_IDS\.hrOracleAvatar/);
});

test("room seats persist and project cosmetic loadouts with legacy board migration",()=>{
  assert.match(room,/cosmeticLoadout: CosmeticLoadout/);
  assert.match(room,/cosmeticLoadout: defaultCosmeticLoadout\("P1"\)/);
  assert.match(room,/cosmeticLoadout: defaultCosmeticLoadout\("P2"\)/);
  assert.match(room,/normalizeCosmeticLoadout\(saved\.host\.cosmeticLoadout, "P1", saved\.host\.boardSkinId\)/);
  assert.match(room,/hostCosmeticLoadout: structuredClone\(room\.host\.cosmeticLoadout\)/);
  assert.match(room,/guestCosmeticLoadout: room\.guest \? structuredClone\(room\.guest\.cosmeticLoadout\) : null/);
});

test("the two supplied avatar assets ship under cosmetic naming conventions",()=>{
  assert.ok(readFileSync(path("public/cosmetics/avatars/overworked-sysadmin.webp")).byteLength > 10000);
  assert.ok(readFileSync(path("public/cosmetics/avatars/hr-oracle.webp")).byteLength > 10000);
  assert.match(app,/COS-AVA-001[^\n]*overworked-sysadmin\.webp/);
  assert.match(app,/COS-AVA-002[^\n]*hr-oracle\.webp/);
  assert.match(app,/player-avatar-image/);
});

test("board skin stays independently selected per player and resolves ID to current asset slug",()=>{
  assert.match(app,/function roomCosmeticLoadout\(playerId\)/);
  assert.match(app,/function roomBoardSkinId\(playerId\)[\s\S]*roomCosmeticLoadout\(playerId\)\.boardSkinId/);
  assert.match(app,/'COS-BOARD-001': Object\.freeze\(\{ slug:'classic-office' \}\)/);
  assert.match(css,/opponent-board::before \{ transform:rotate\(180deg\); \}/);
});

test("catalog art side strip is removed at its source without disabling foil",()=>{
  const face=app.slice(app.indexOf("function renderCatalogCardFace"),app.indexOf("function legalHandCardIds"));
  assert.doesNotMatch(face,/art-ready-badge/);
  assert.match(face,/catalog-foil-sheen/);
  assert.match(polish,/catalog-art-stage \.art-ready-badge \{ display:none !important; \}/);
});

test("hand paint isolation is card-wide and tabletop piles no longer use translucent panels",()=>{
  assert.match(polish,/own-hand \.hand-fan-card \{[\s\S]*contain:paint;[\s\S]*isolation:isolate/);
  assert.match(polish,/deck-pile,[\s\S]*archive-compact,[\s\S]*archive-compact summary \{[\s\S]*border:0 !important;[\s\S]*background:transparent !important;[\s\S]*box-shadow:none !important/);
});

test("mobile field cards explicitly keep the full hand-style anatomy",()=>{
  assert.match(polish,/@media \(max-width:760px\)[\s\S]*card-type-strip \{[\s\S]*display:flex !important/);
  assert.match(polish,/board-lane \.card:not\(\.face-down-support\) \.card-art-stage \{[\s\S]*aspect-ratio:16\/9 !important/);
  assert.match(polish,/board-lane \.card:not\(\.face-down-support\) \.card-rules-mini \{[\s\S]*display:-webkit-box !important/);
  assert.match(polish,/board-lane \.card:not\(\.face-down-support\) \.card-tags \{[\s\S]*display:flex !important/);
});

console.log(`\n${passed}/${passed} v7.69.17 tests passed.`);
