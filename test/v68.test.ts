import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let passed = 0;
function test(name:string, fn:()=>void):void {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

const app = readFileSync(
  fileURLToPath(new URL("../../public/app.js",import.meta.url)),
  "utf8"
);

const css = readFileSync(
  fileURLToPath(new URL("../../public/styles.css",import.meta.url)),
  "utf8"
);

const settings = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../data/match-settings.json",import.meta.url)),
    "utf8"
  )
);

const cards = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../data/cards.json",import.meta.url)),
    "utf8"
  )
);

const decks = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../data/decks.json",import.meta.url)),
    "utf8"
  )
);

test("v6.8 keeps Quick Match controls isolated in a collision-safe lobby grid", () => {
  assert.match(app,/desk-meeting-agenda/);
  assert.match(app,/quick-match-controls desk-quick-controls/);
  assert.match(app,/desk-quick-match-button/);

  assert.match(
    css,
    /\.desk-quick-controls\s*\{[\s\S]*grid-template-columns:minmax\(180px,1\.5fr\)\s+minmax\(120px,\.75fr\)\s+auto/
  );
});

test("v6.8 lets Quick Match fields shrink instead of forcing horizontal overlap", () => {
  assert.match(
    css,
    /\.desk-quick-controls label\s*\{[\s\S]*min-width:0/
  );

  assert.match(
    css,
    /\.desk-quick-controls select\s*\{[\s\S]*width:100%/
  );

  assert.match(
    css,
    /\.executive-desk-left,[\s\S]*\.executive-desk-center,[\s\S]*\.executive-desk-right\s*\{\s*min-width:0;/
  );
});

test("v6.8 keeps controlled intermediate and mobile Quick Match fallbacks", () => {
  assert.match(
    css,
    /\.desk-quick-controls\s*\{\s*grid-template-columns:minmax\(160px,1\.4fr\)\s+minmax\(110px,\.65fr\);/
  );

  assert.match(
    css,
    /\.desk-quick-controls\s*\{\s*grid-template-columns:1fr 1fr;\s*gap:6px;/
  );

  assert.match(
    css,
    /\.desk-quick-controls \.desk-quick-match-button,[\s\S]*\.desk-quick-controls #cancelQuickMatch\s*\{\s*grid-column:1\/-1;/
  );
});

test("v6.8 preserves full selected deck and mode labels as browser tooltips", () => {
  assert.match(app,/function syncSelectDisplayTitle\(select\)/);
  assert.match(app,/option\?\.textContent\?\.trim\(\)/);
  assert.match(app,/function bindResponsiveLobbySelects\(\)/);
  assert.match(app,/\['quickDeck','quickMode','createDeck','createMode','joinDeck'\]/);
  assert.match(app,/bindResponsiveLobbySelects\(\);/);
});

test("v6.8 applies shrink-safe responsive behavior to private-room controls", () => {
  assert.match(app,/desk-private-room/);
  assert.match(app,/private-room-grid/);

  assert.match(
    css,
    /\.executive-desk-tools > \*\s*\{\s*min-width:0;/
  );

  assert.match(
    css,
    /\.executive-desk-tools \.private-room-grid\s*\{\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\);/
  );

  assert.match(
    css,
    /\.executive-desk-tools \.private-room-grid\s*\{\s*grid-template-columns:1fr;/
  );
});

test("v6.8 keeps Alpha content and Ranked timer invariants intact", () => {
  const rankedTimer = settings.timerProfiles.find(
    (profile:any)=>profile.id === "RANKED_STANDARD_TBD"
  );

  assert.ok(rankedTimer);
  assert.equal(rankedTimer.enabled,false);

  assert.ok(cards.length >= 97);
  assert.equal(
    cards.filter((card:any)=>Boolean(card.flavorText)).length,
    cards.length
  );

  assert.equal(decks.length,5);

  for (const deck of decks) {
    assert.equal(
      deck.cards.reduce(
        (sum:number, entry:any)=>sum + entry.copies,
        0
      ),
      40
    );
  }
});

console.log(`${passed}/6 v6.8 tests passed.`);