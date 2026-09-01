import { strict as assert } from "node:assert";
import { alphaDefinitions } from "../src/cards.js";
import { applyCraft, applyRewardGrant, applyScrap, createPlayerMetaProfile, openSandboxBooster, type RewardGrant } from "../src/economy.js";
import { ALPHA_FORMAT } from "../src/formats.js";
import { PlayerProfileService } from "../src/profile.js";
import { RoomService } from "../src/room.js";

let passed = 0;
function test(name:string, fn:()=>void):void { try { fn(); passed += 1; console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; } }

const starter = [{ definitionId:"CS-001", copies:3 }, { definitionId:"CS-002", copies:3 }];

test("v7.70 production profiles own explicit starter cards, not the global catalog", () => {
  const profile = createPlayerMetaProfile(starter, 500, 100);
  assert.equal(profile.collectionMode, "OWNED_COPIES");
  assert.equal(profile.ownedCards["CS-001"], 3);
  assert.equal(profile.ownedCards["IT-001"], undefined);
  assert.equal(profile.rewardGrants[0].source, "starter");
});

test("v7.70 generic grants are persistent and sourceRef-idempotent", () => {
  const grant:RewardGrant = { source:"achievement", sourceRef:"achievement:first", cards:[{cardId:"IT-001",quantity:1}], officeCredits:20, scrap:4, cosmetics:[], packs:[], grantedAt:100 };
  const once = applyRewardGrant(createPlayerMetaProfile(), grant, 100);
  const twice = applyRewardGrant(once.profile, grant, 101);
  assert.equal(once.applied, true);
  assert.equal(twice.applied, false);
  assert.equal(twice.profile.ownedCards["IT-001"], 1);
  assert.equal(twice.profile.balances.OFFICE_CREDITS, 20);
});

test("v7.70 booster uses authoritative price and deterministic server result", () => {
  const profile = createPlayerMetaProfile(starter, 1000);
  const config = { price:100, cardCount:2, guaranteedTiers:["T0" as const], flexSlotWeights:{T0:1} };
  const a = openSandboxBooster(profile, Object.values(alphaDefinitions), config, 77);
  const b = openSandboxBooster(profile, Object.values(alphaDefinitions), config, 77);
  assert.deepEqual(a.cardIds, b.cardIds);
  assert.equal(a.profile.balances.OFFICE_CREDITS, 900);
  assert.equal(Object.values(a.profile.ownedCards).reduce((sum,n)=>sum+n,0), 8);
});

test("v7.70 scrap and craft are server-side balance mutations", () => {
  let profile = createPlayerMetaProfile([{definitionId:"CS-001",copies:3}], 0);
  profile.balances.SHREDDER_SCRAPS = 150;
  profile = applyScrap(profile, "CS-001", 1, 10);
  assert.equal(profile.ownedCards["CS-001"], 2);
  assert.equal(profile.balances.SHREDDER_SCRAPS, 160);
  profile = applyCraft(profile, "IT-001", 1, 150);
  assert.equal(profile.ownedCards["IT-001"], 1);
  assert.equal(profile.balances.SHREDDER_SCRAPS, 10);
});

test("v7.70 Training creates an explicit no-reward Bot match", () => {
  const rooms = new RoomService({ roomIdFactory:()=>"BOT770", tokenFactory:(()=>{let n=0; return ()=>`bot-token-${++n};`})(), seedFactory:()=>77, firstPlayerFactory:()=>"P1" });
  const created = rooms.createBotRoom("customer-service-starter", { mode:"TRAINING" }, { profileId:"human", displayName:"Human" }, "it-starter", "Training Bot");
  assert.equal(created.view.settings.mode, "TRAINING");
  assert.equal(created.view.settings.bot, true);
  assert.equal(created.view.settings.rewardEligible, false);
  assert.equal(created.view.guestIsBot, true);
  assert.equal(created.view.guestDisplayName, "Training Bot");
});

test("v7.70 Training history is retained without changing PvP stats", () => {
  const service = new PlayerProfileService({ idFactory:()=>"p770", tokenFactory:()=>"t770" });
  const created = service.create();
  service.recordMatch(created.profileToken, { roomId:"TRAIN770", matchId:"m770", mode:"TRAINING", outcome:"WIN", opponentName:"Training Bot", deckName:"Starter", opponentDeckName:"IT", turns:2, reason:"REPUTATION_ZERO", finishedAt:1 });
  const profile = service.get(created.profileToken);
  assert.equal(profile.matchHistory[0].mode, "TRAINING");
  assert.equal(profile.stats.matchesPlayed, 0);
  assert.equal(profile.stats.friendlyMatches, 0);
});

console.log(`${passed}/6 v7.70 tests passed.`);
