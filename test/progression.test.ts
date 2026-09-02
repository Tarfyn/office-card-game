import { strict as assert } from "node:assert";
import { applyAlphaPlaytestCosmeticGrant, applyLevelMilestoneRewards, applyRewardGrant, createPlayerMetaProfile } from "../src/economy.js";
import { processProgressionEvents, projectAchievements, type ProgressionConfig, type ProgressionEvent } from "../src/progression.js";
import { createRankedProfile, normalizeRankedConfig, normalizeRankedContentConfig, rankedStanding } from "../src/ranked.js";
import { PlayerProfileService } from "../src/profile.js";
import { RoomService } from "../src/room.js";

const config: ProgressionConfig = {
  achievements: [
    { id:"ACH-FIRST-WIN", category:"MATCH", titleKey:"achievements.items.firstWin.title", descriptionKey:"achievements.items.firstWin.description", condition:{ type:"ONE_SHOT", event:"MATCH_WON", filters:{ eligibleModes:["FRIENDLY"] } }, rewards:[{ type:"OFFICE_CREDITS", amount:50 }] },
    { id:"ACH-NO-TRAINING", category:"MATCH", titleKey:"achievements.items.firstMatch.title", descriptionKey:"achievements.items.firstMatch.description", condition:{ type:"COUNTER", event:"MATCH_COMPLETED", target:1 }, rewards:[{ type:"SCRAP", amount:7 }] }
  ]
};
const event = (id:string, type:ProgressionEvent["type"], mode:ProgressionEvent["mode"]): ProgressionEvent => ({ id, type, mode, timestamp:1 });

let profile = createPlayerMetaProfile();
let update = processProgressionEvents(profile, [event("win-1", "MATCH_WON", "FRIENDLY")], config, 10);
profile = update.profile;
assert.deepEqual(update.completed, ["ACH-FIRST-WIN"]);
assert.equal(profile.balances.OFFICE_CREDITS, 50);
assert.equal(profile.achievements["ACH-FIRST-WIN"].value, 1);
assert.equal(processProgressionEvents(profile, [event("win-1", "MATCH_WON", "FRIENDLY")], config, 11).profile.balances.OFFICE_CREDITS, 50, "duplicate event must not duplicate reward");

const training = processProgressionEvents(profile, [event("training-1", "MATCH_COMPLETED", "TRAINING")], config, 12);
assert.equal(training.profile.achievements["ACH-NO-TRAINING"]?.value ?? 0, 0);
assert.equal(training.profile.balances.SHREDDER_SCRAPS, 0);

const projected = projectAchievements(config, profile);
assert.equal(projected.find((item) => item.id === "ACH-FIRST-WIN")?.progress.value, 1);
const grant = applyRewardGrant(profile, { source:"achievement", sourceRef:"achievement:manual", cards:[], officeCredits:10, scrap:2, cosmetics:[], packs:[], grantedAt:20 }, 20);
assert.equal(grant.profile.balances.OFFICE_CREDITS, 60);
assert.equal(grant.profile.balances.SHREDDER_SCRAPS, 2);

const directConfig: ProgressionConfig = {
  achievements: [{ id:"ACH-DIRECT", category:"MATCH", titleKey:"achievements.items.directRep10.title", descriptionKey:"achievements.items.directRep10.description", condition:{ type:"COUNTER", event:"DIRECT_REP_DAMAGE", target:10, metric:"amount", filters:{ eligibleModes:["FRIENDLY","RANKED"] } }, rewards:[{ type:"OFFICE_CREDITS", amount:50 }] }]
};
const directEvents = (id:string, amount:number): ProgressionEvent => ({ id, type:"DIRECT_REP_DAMAGE", mode:"FRIENDLY", timestamp:1, payload:{ amount } });
let directProfile = processProgressionEvents(createPlayerMetaProfile(), [directEvents("direct-4", 4), directEvents("direct-6", 6)], directConfig, 13).profile;
assert.equal(directProfile.achievements["ACH-DIRECT"].value, 10);
assert.equal(directProfile.balances.OFFICE_CREDITS, 50);
const nonDirect = processProgressionEvents(directProfile, [{ id:"combat-1", type:"DIRECT_REP_DAMAGE", mode:"FRIENDLY", timestamp:1, payload:{ amount:0 } }], directConfig, 14).profile;
assert.equal(nonDirect.achievements["ACH-DIRECT"].value, 10, "zero damage must not progress direct REP achievement");

const milestoneProfile = createPlayerMetaProfile();
milestoneProfile.progression.level = 24;
const milestoneConfig = [
  { level:25, rewards:[{ type:"PACK", packId:"EXECUTIVE_EDITION_PACK", quantity:1 }] },
  { level:50, rewards:[{ type:"PACK", packId:"EXECUTIVE_EDITION_PACK", quantity:1 }] },
  { level:100, rewards:[{ type:"PACK", packId:"EXECUTIVE_EDITION_PACK", quantity:1 }] }
];
const crossedMilestones = applyLevelMilestoneRewards(milestoneProfile, milestoneConfig, 24, 100, 15);
assert.deepEqual(crossedMilestones.appliedLevels, [25, 50, 100]);
assert.equal(crossedMilestones.profile.ownedPacks.EXECUTIVE_EDITION_PACK, 3);
const repeatedMilestones = applyLevelMilestoneRewards(crossedMilestones.profile, milestoneConfig, 24, 100, 16);
assert.deepEqual(repeatedMilestones.appliedLevels, [], "level milestone grants are idempotent");

const disabled = processProgressionEvents(createPlayerMetaProfile(), [event("disabled-win", "MATCH_WON", "FRIENDLY")], { ...config, enabled:false }, 17);
assert.deepEqual(disabled.completed, []);
assert.equal(disabled.profile.achievements["ACH-FIRST-WIN"], undefined);
const alphaFrames = applyAlphaPlaytestCosmeticGrant(createPlayerMetaProfile());
const rankedFrameGrant = applyRewardGrant(alphaFrames, { source:"ranked", sourceRef:"ranked:ALPHA_PRESEASON:tier:DIAMOND", cards:[], officeCredits:0, scrap:0, cosmetics:["COS-FRAME-005"], packs:[], grantedAt:18 }, 18);
assert.equal(rankedFrameGrant.applied, true);
assert.equal(applyRewardGrant(rankedFrameGrant.profile, { source:"ranked", sourceRef:"ranked:ALPHA_PRESEASON:tier:DIAMOND", cards:[], officeCredits:0, scrap:0, cosmetics:["COS-FRAME-005"], packs:[], grantedAt:19 }, 19).applied, false);

const service = new PlayerProfileService({
  playerIdFactory:() => "player-1", tokenFactory:() => "token-1", nowFactory:() => 100,
  progressionConfig:config
});
const created = service.create(createPlayerMetaProfile());
const recorded = service.recordMatch(created.profileToken, { roomId:"ROOM1", matchId:"MATCH1", mode:"FRIENDLY", outcome:"WIN", opponentName:"Bot", deckName:"Deck", opponentDeckName:"Bot Deck", turns:2, reason:"TEST", finishedAt:100 }, [event("match-win", "MATCH_WON", "FRIENDLY")]);
assert.equal(recorded.meta.balances.OFFICE_CREDITS, 50);
assert.equal(service.get(created.profileToken).meta.achievements["ACH-FIRST-WIN"]?.completedAt, 100);

const rankedConfig = normalizeRankedConfig({ initialRating:1000 });
assert.equal(createRankedProfile(rankedConfig).status, "PLACEMENT");
const rankedContent = normalizeRankedContentConfig({ ranks:[{ id:"BRONZE", order:1, displayKey:"Bronze", mmrMin:0, mmrMax:1199, divisions:["III","II","I"] }, { id:"GOLD", order:2, displayKey:"Gold", mmrMin:1200, mmrMax:null, divisions:["I"] }], seasons:[] });
assert.deepEqual(rankedStanding(1300, rankedContent), { tierId:"GOLD", division:"I" });
const defaultRankedContent = normalizeRankedContentConfig({ ranks:[{ id:"DIAMOND", order:5, displayKey:"Diamond", mmrMin:2400, mmrMax:null, divisions:["III","II","I"], divisionThresholds:{ III:2400, II:2600, I:2800 } }], seasons:[] });
assert.equal(rankedStanding(2400, defaultRankedContent).division, "III");
assert.equal(rankedStanding(2600, defaultRankedContent).division, "II");
assert.equal(rankedStanding(2800, defaultRankedContent).division, "I");

let nextPlayer = 0;
const rankedProgression: ProgressionConfig = {
  achievements: [{ id:"ACH-RANK-CHANGE", category:"RANKED", titleKey:"achievements.items.firstWin.title", descriptionKey:"achievements.items.firstWin.description", condition:{ type:"ONE_SHOT", event:"RANK_CHANGED", filters:{ eligibleModes:["RANKED"] } }, rewards:[{ type:"SCRAP", amount:4 }] }]
};
const rankedService = new PlayerProfileService({
  playerIdFactory:() => `rank-player-${++nextPlayer}`, tokenFactory:() => `rank-token-${nextPlayer}`,
  nowFactory:() => 100, rankedConfig:{ initialRating:1000, placementsRequired:1 }, progressionConfig:rankedProgression,
  rankedContentConfig:{ ranks:[
    { id:"BRONZE", order:1, displayKey:"ranked.tiers.bronze", mmrMin:0, mmrMax:1000, divisions:["III","II","I"], rewards:[] },
    { id:"SILVER", order:2, displayKey:"ranked.tiers.silver", mmrMin:1001, mmrMax:null, divisions:["I"], rewards:[{ type:"OFFICE_CREDITS", amount:13 } ] }
  ], seasons:[] }
});
const rankedP1 = rankedService.create(createPlayerMetaProfile());
const rankedP2 = rankedService.create(createPlayerMetaProfile());
const rankedSettlement = rankedService.recordRankedMatch({ roomId:"RANK-ROOM", p1PlayerId:rankedP1.profile.playerId, p2PlayerId:rankedP2.profile.playerId, winnerPlayerId:rankedP1.profile.playerId, reason:"REPUTATION_ZERO", settledAt:101 });
assert.equal(rankedSettlement.p1.tierId, "SILVER");
assert.equal(rankedService.get(rankedP1.profileToken).meta.balances.OFFICE_CREDITS, 13);
assert.equal(rankedService.get(rankedP1.profileToken).meta.balances.SHREDDER_SCRAPS, 4);
assert.equal(rankedService.recordRankedMatch({ roomId:"RANK-ROOM", p1PlayerId:rankedP1.profile.playerId, p2PlayerId:rankedP2.profile.playerId, winnerPlayerId:rankedP1.profile.playerId, reason:"REPUTATION_ZERO", settledAt:101 }).replayed, true);

let completionCount = 0;
const completionRooms = new RoomService({ roomIdFactory:() => "COMPLETE", tokenFactory:() => "completion-token", firstPlayerFactory:() => "P1", onMatchCompleted:() => { completionCount += 1; } });
const completionRoom = completionRooms.createRoom("it-starter", { mode:"FRIENDLY" });
const completionGuest = completionRooms.joinRoom(completionRoom.roomId, "it-starter");
const completionStateVersion = completionGuest.view.match?.stateVersion ?? 0;
const completion = completionRooms.submitIntent(completionRoom.roomId, completionRoom.token, { intentId:"complete-resign", expectedStateVersion:completionStateVersion, intent:{ type:"RESIGN" } });
assert.equal(completion.response.accepted, true);
assert.equal(completion.view.match?.status, "ENDED");
assert.equal(completionCount, 1, "completion callback must fire at authoritative room completion");
const replayedCompletion = completionRooms.submitIntent(completionRoom.roomId, completionRoom.token, { intentId:"complete-resign", expectedStateVersion:completionStateVersion, intent:{ type:"RESIGN" } });
assert.equal(replayedCompletion.replayed, true);
assert.equal(completionCount, 1, "replayed intent must not fire completion twice");

console.log("\nProgression foundation tests passed.");
