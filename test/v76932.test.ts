import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = (name: string) => readFileSync(fileURLToPath(new URL(`../../${name}`, import.meta.url)), "utf8");
const rootPath = (name: string) => fileURLToPath(new URL(`../../${name}`, import.meta.url));
const app = root("public/app.js");
const css = root("public/styles.css");

assert.match(app, /function renderAvatarComposition\(/);
assert.ok((app.match(/renderAvatarComposition\(/g) ?? []).length >= 4, "gallery, Lobby and Match identity should share the composition renderer");
assert.match(app, /avatar-composition-image player-avatar-image/);
assert.match(app, /avatar-composition-frame player-avatar-frame-image/);
assert.match(app, /avatar-portrait-mask/);
assert.match(app, /avatarFrameMaskAsset\(/);
assert.match(app, /masks\/\$\{file\.replace/);
assert.match(app, /frameMaskAsset/);
assert.match(app, /silver-ranked-s01-inner-opening\.png/);
const maskFiles = ["blue-silver", "bronze-ranked-s01", "gold-ranked-s01", "diamond-ranked-s01", "silver-ranked-s01", "silver-ranked-s01-inner-opening"];
for (const mask of maskFiles) {
  const maskData = readFileSync(rootPath(`public/cosmetics/avatar-frames/masks/${mask}.png`));
  assert.ok(maskData.byteLength > 100, `missing inner-opening mask ${mask}`);
  assert.equal(maskData[25], 6, `mask ${mask} must be RGBA so CSS uses its alpha channel`);
}
assert.match(css, /\.avatar-composition \.avatar-composition-frame[\s\S]*object-fit:fill/);
assert.match(css, /avatar-portrait-mask[\s\S]*mask-size:100% 100%/);
assert.match(css, /mask-image:var\(--avatar-frame-mask\)/);
assert.match(css, /\.avatar-composition\.has-avatar-frame[\s\S]*border:0/);
assert.doesNotMatch(css, /inset:-4%|width:108%|height:108%/);

console.log("\n1/1 v7.69.44 avatar composition tests passed.");
