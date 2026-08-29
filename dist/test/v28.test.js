import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RoomError, RoomService } from "../src/room.js";
import { alphaDeckPresets } from "../src/decks.js";
let passed = 0;
function test(name, fn) {
    try {
        fn();
        passed += 1;
        console.log(`✓ ${name}`);
    }
    catch (error) {
        console.error(`✗ ${name}`);
        throw error;
    }
}
const app = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
const css = readFileSync(fileURLToPath(new URL("../../public/styles.css", import.meta.url)), "utf8");
const server = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8");
const html = readFileSync(fileURLToPath(new URL("../../public/index.html", import.meta.url)), "utf8");
test("v2.8 RoomService accepts legal custom decks and uses them in a match", () => {
    const rooms = new RoomService({ roomIdFactory: () => "CUSTOM", tokenFactory: (() => { let n = 0; return () => `t${++n}`; })(), seedFactory: () => 28, firstPlayerFactory: () => "P1" });
    const cards = alphaDeckPresets["customer-service-starter"].cards;
    const host = rooms.createRoom({ id: "custom:host", name: "My CS Deck", cards });
    const guest = rooms.joinRoom(host.roomId, { id: "custom:guest", name: "My IT-ish Deck", cards });
    assert.equal(guest.view.status, "ACTIVE");
    assert.equal(guest.view.hostDeckId, "custom:host");
    assert.equal(guest.view.guestDeckId, "custom:guest");
});
test("v2.8 authoritative room validation rejects illegal custom decks", () => {
    const rooms = new RoomService({ roomIdFactory: () => "BADDEK" });
    assert.throws(() => rooms.createRoom({ id: "custom:bad", name: "Illegal", cards: [{ definitionId: "CS-001", copies: 4 }] }), (error) => error instanceof RoomError && error.code === "INVALID_DECK");
});
test("v2.8 browser contains persistent collection/deckbuilder and future economy hooks", () => {
    assert.match(app, /CUSTOM_DECKS_KEY/);
    assert.match(app, /function renderCollection\(\)/);
    assert.match(app, /function selectedDeckPayload/);
    assert.match(app, /economyConfig/);
    assert.match(server, /\/api\/economy-config/);
    assert.match(css, /\.collection-layout/);
    assert.match(css, /\.deck-builder-panel/);
    assert.match(server, /\/api\/format/);
});
test("v2.8 catalog exposes optional future rarity and crafting fields", () => {
    assert.match(server, /rarityTier: card\.rarityTier \?\? sandboxRarityTier\(card\)/);
    assert.match(server, /scrapValue: card\.scrapValue \?\?/);
    assert.match(server, /craftCost: card\.craftCost \?\?/);
});
test("v2.8 public shell version updated", () => {
    assert.match(html, /alpha playtest/);
});
console.log(`${passed}/5 v2.8 tests passed.`);
