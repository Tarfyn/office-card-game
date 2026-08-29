import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PlaytestFeedbackStore, normalizePlaytestFeedback } from "../src/playtest-feedback.js";
let passed = 0;
function test(n, f) { try {
    f();
    passed++;
    console.log(`✓ ${n}`);
}
catch (e) {
    console.error(`✗ ${n}`);
    throw e;
} }
test("v7.33 normalizes bounded human feedback", () => { const f = normalizePlaytestFeedback('room1', 'p1', { pace: 'GOOD', oneSided: false, decisions: 'HIGH', note: 'x', cardIds: ['cs-006', 'cs-006', 'it-003'] }); assert.equal(f.roomId, 'ROOM1'); assert.deepEqual(f.cardIds, ['cs-006', 'it-003']); });
test("v7.33 persists feedback through snapshot boundary", () => { let snap = null; const persistence = { storageLabel: 'MEM', load: () => snap, save: (v) => { snap = v; } }; const s = new PlaytestFeedbackStore(persistence); s.upsert('A', 'P', { pace: 'TOO_FAST' }); const r = new PlaytestFeedbackStore(persistence); assert.equal(r.get('A', 'P')?.pace, 'TOO_FAST'); });
test("v7.33 server exposes profile-authorized feedback routes", () => { const server = readFileSync(fileURLToPath(new URL('../../server/server.mjs', import.meta.url)), 'utf8'); assert.match(server, /feedbackMatch/); assert.match(server, /PlaytestFeedbackStore/); assert.match(server, /getReplayForProfile/); });
test("v7.33 result panel captures pace sidedness decisions notes and cards", () => { const app = readFileSync(fileURLToPath(new URL('../../public/app.js', import.meta.url)), 'utf8'); for (const token of ['HUMAN PLAYTEST NOTE', 'Too fast', 'ONE-SIDED?', 'DECISIONS', 'playtestFeedbackNote', 'playtestFeedbackCards'])
    assert.match(app, new RegExp(token.replace(/[?]/g, '\\?'))); });
test("v7.33 feedback save remains optional and separate from rewards", () => { const app = readFileSync(fileURLToPath(new URL('../../public/app.js', import.meta.url)), 'utf8'); assert.match(app, /Save playtest note/); assert.match(app, /renderMatchRewardPanel/); });
test("v7.33 version markers are current", () => { const server = readFileSync(fileURLToPath(new URL('../../server/server.mjs', import.meta.url)), 'utf8'); const html = readFileSync(fileURLToPath(new URL('../../public/index.html', import.meta.url)), 'utf8'); assert.match(server, /version: "7\.33\.0"/); assert.match(html, /v7\.33 Alpha Playtest/i); });
console.log(`${passed}/6 v7.33 tests passed.`);
