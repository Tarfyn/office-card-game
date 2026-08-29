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
  fileURLToPath(new URL("../../public/app.js", import.meta.url)),
  "utf8"
);

const css = readFileSync(
  fileURLToPath(new URL("../../public/styles.css", import.meta.url)),
  "utf8"
);

const settings = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../data/match-settings.json", import.meta.url)),
    "utf8"
  )
);

const cards = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../data/cards.json", import.meta.url)),
    "utf8"
  )
);

const decks = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../data/decks.json", import.meta.url)),
    "utf8"
  )
);

test("v6.8 keeps the Quick Match play path available", () => {
  assert.match(app,/id="quickDeck"/);
  assert.match(app,/id="quickMode"/);
  assert.match(app,/id="quickMatchBtn"/);
});

test("v6.8 preserves full selected deck and mode labels as browser tooltips", () => {
  assert.match(app,/function syncSelectDisplayTitle\(select\)/);
  assert.match(app,/option\?\.textContent\?\.trim\(\)/);
  assert.match(app,/function bindResponsiveLobbySelects\(\)/);
  assert.match(
    app,
    /\['quickDeck','quickMode','createDeck','createMode','joinDeck'\]/
  );
  assert.match(app,/bindResponsiveLobbySelects\(\);/);
});

test("v6.8 keeps lobby form controls width-safe", () => {
  assert.match(
    css,
    /\.field input,\s*\.field select\s*\{[^}]*width:\s*100%/
  );

  assert.match(css,/min-width:\s*0/);
  assert.match(css,/max-width:\s*100%/);
});

test("v6.8 keeps responsive lobby fallbacks available", () => {
  assert.match(css,/@media\s*\(max-width:\s*760px\)/);
  assert.match(css,/@media\s*\(max-width:\s*950px\)/);
});

test("v6.8 keeps private-room deck and mode controls wired into responsive select handling", () => {
  assert.match(app,/createDeck/);
  assert.match(app,/createMode/);
  assert.match(app,/joinDeck/);

  assert.match(
    app,
    /\['quickDeck','quickMode','createDeck','createMode','joinDeck'\]/
  );
});

test("v6.8 keeps Alpha content and Ranked timer invariants intact", () => {
  const rankedTimer = settings.timerProfiles.find(
    (profile:any) => profile.id === "RANKED_STANDARD_TBD"
  );

  assert.ok(rankedTimer);
  assert.equal(rankedTimer.enabled, false);

  assert.ok(cards.length >= 97);
  assert.equal(
    cards.filter((card:any) => Boolean(card.flavorText)).length,
    cards.length
  );

  assert.equal(decks.length, 5);

  for (const deck of decks) {
    assert.equal(
      deck.cards.reduce(
        (sum:number, entry:any) => sum + entry.copies,
        0
      ),
      40
    );
  }
});

console.log(`${passed}/6 v6.8 tests passed.`);