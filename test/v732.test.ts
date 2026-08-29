import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";import { fileURLToPath } from "node:url";import { runBalanceMatchupSet } from "../src/balance.js";
let passed=0;function test(n:string,f:()=>void){try{f();passed++;console.log(`✓ ${n}`)}catch(e){console.error(`✗ ${n}`);throw e}}
const r=runBalanceMatchupSet({gamesPerMatchup:4,baseSeed:73201,maxTurns:10,maxSteps:700,matchups:[{deckA:"customer-service-starter",deckB:"it-starter"}],sideSwap:true,alternateFirstPlayer:true});
test("v7.32 reports end reasons",()=>{assert.ok(Object.keys(r.analytics.endReasons).length>=1)});
test("v7.32 reports first and second player split",()=>{assert.equal(r.analytics.firstPlayer.games,r.totals.completedGames);assert.equal(r.analytics.secondPlayer.games,r.totals.completedGames)});
test("v7.32 reports mulligan behavior by deck",()=>{assert.equal(r.analytics.mulliganByDeck.length,2);assert.equal(typeof r.analytics.mulliganByDeck[0].averageReturned,"number")});
test("v7.32 deck summary exposes opener split",()=>{assert.equal(typeof r.decks[0].firstPlayerWinRate,"number");assert.equal(typeof r.decks[0].secondPlayerWinRate,"number")});
test("v7.32 labels any outlier signal by sample strength",()=>{for(const s of r.analytics.signals) assert.ok(["TINY","SMALL","DIRECTIONAL","STRONGER"].includes(s.sampleLabel))});
test("v7.32 version markers are current",()=>{const server=readFileSync(fileURLToPath(new URL("../../server/server.mjs",import.meta.url)),"utf8");const html=readFileSync(fileURLToPath(new URL("../../public/index.html",import.meta.url)),"utf8");assert.match(server,/version: "7\.32\.0"/);assert.match(html,/v7\.32 Alpha Playtest/i)});
console.log(`${passed}/6 v7.32 tests passed.`);
