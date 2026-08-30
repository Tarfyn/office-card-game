import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RoomService } from "../src/room.js";
import { alphaDefinitions } from "../src/cards.js";
import { alphaDeckPresets } from "../src/decks.js";
import { createMatch, mulligan } from "../src/engine.js";
import { executeHostedMatchIntent } from "../src/intents.js";

let passed=0;
function test(name:string, fn:()=>void){ fn(); passed+=1; console.log(`✓ ${name}`); }
const root=(name:string)=>readFileSync(fileURLToPath(new URL(`../../${name}`,import.meta.url)),"utf8");
const pkg=JSON.parse(root("package.json"));
const server=root("server/server.mjs");
const html=root("public/index.html");
const app=root("public/app.js");
const css=root("public/styles.css");
const readme=root("README.md");

test("current version markers keep the v7.68 safety line and advance to v7.69",()=>{
  assert.equal(pkg.version,"7.69.14");
  assert.match(server,/version: "7\.69\.14"/);
  assert.match(server,/Office Card Game v7\.69\.14 server/);
  assert.match(html,/v7\.69\.14 Alpha Playtest/);
  assert.match(readme,/## v7\.68 — Hosted Live-Sync Safety Hotfix/);
});

test("v7.68 keeps authoritative HTTP safety sync armed while SSE is LIVE",()=>{
  assert.match(app,/HOSTED_SYNC_LIVE_POLL_MS = 1200/);
  assert.match(app,/function hostedSyncPollDelay\(\)/);
  assert.match(app,/if \(state\.connectionStatus === 'LIVE'\) return matchActive \? HOSTED_SYNC_LIVE_POLL_MS : 3000/);
  assert.match(app,/function scheduleSyncPoll\(delay=hostedSyncPollDelay\(\)\)/);
  assert.doesNotMatch(app,/function scheduleSyncPoll[\s\S]{0,500}connectionStatus==='LIVE'\) return/);
  assert.match(app,/scheduleSyncPoll\(\);\r?\n  const isCurrent=/);
});

test("v7.68 does not clear an in-progress local interaction when an unchanged safety read returns",()=>{
  const refresh = app.slice(app.indexOf("async function refreshState"), app.indexOf("function streamReconnectDelay"));
  assert.doesNotMatch(refresh,/state\.interaction = null/);
  assert.match(refresh,/acceptPassiveSyncedView\(view\)/);
  assert.match(refresh,/preserveLiveOnError/);
});

test("v7.68 rebuilds stale SSE while HTTP state reads keep running",()=>{
  assert.match(app,/function hostedLiveStaleThreshold\(\)/);
  assert.match(app,/heartbeat \* 2\.5/);
  assert.match(app,/const liveWasStale = state\.connectionStatus === 'LIVE' && liveConnectionLooksStale\(hostedLiveStaleThreshold\(\)\)/);
  assert.match(app,/state\.connectionStatus='RECONNECTING';\r?\n      startStream\(\)/);
});

test("v7.68 preflights and post-refreshes every submitted intent without auto-replaying ordinary moves",()=>{
  const send = app.slice(app.indexOf("async function sendIntent"), app.indexOf("function bindInteractionHandlers"));
  assert.match(send,/await refreshState\(false, \{ preserveLiveOnError:true \}\)/);
  assert.match(send,/result = await postRoomIntent\(intent, intentId, submittedVersion\)/);
  assert.match(send,/if \(!result\.response\.accepted && result\.response\.error\?\.code === 'STALE_STATE' && intent\.type === 'MULLIGAN'\)/);
  assert.match(send,/Re-read after every accepted mutation/);
  assert.match(send,/scheduleSyncPoll\(350\)/);
});

test("v7.68 recovers the real P1/P2 mulligan race with one refreshed P2 retry",()=>{
  let tokenNo=0;
  const rooms=new RoomService({ roomIdFactory:()=>"SYNC68", tokenFactory:()=>`tok-${++tokenNo}`, firstPlayerFactory:()=>"P1", nowFactory:()=>1000 });
  const host=rooms.createRoom("customer-service-starter");
  const guest=rooms.joinRoom(host.roomId,"it-starter");
  rooms.claimSeatClient(host.roomId,host.token,"p1-browser");
  rooms.claimSeatClient(host.roomId,guest.token,"p2-browser");

  const p1Initial=rooms.getView(host.roomId,host.token,0,"p1-browser");
  const p2Initial=rooms.getView(host.roomId,guest.token,0,"p2-browser");
  assert.equal(p1Initial.match!.stateVersion,0);
  assert.equal(p2Initial.match!.stateVersion,0);

  const p1=rooms.submitIntent(host.roomId,host.token,{ clientId:"p1-browser", intentId:"p1-keep", expectedStateVersion:0, intent:{type:"MULLIGAN",returnIds:[]} });
  assert.equal(p1.response.accepted,true);
  assert.equal(p1.view.match!.stateVersion,1);

  const p2Stale=rooms.submitIntent(host.roomId,guest.token,{ clientId:"p2-browser", intentId:"p2-stale", expectedStateVersion:p2Initial.match!.stateVersion, intent:{type:"MULLIGAN",returnIds:[]} });
  assert.equal(p2Stale.response.accepted,false);
  assert.equal(p2Stale.response.error?.code,"STALE_STATE");

  const p2Fresh=rooms.getView(host.roomId,guest.token,0,"p2-browser");
  assert.equal(p2Fresh.match!.stateVersion,1);
  assert.equal(p2Fresh.match!.legalActions.canMulligan,true);
  const p2Retry=rooms.submitIntent(host.roomId,guest.token,{ clientId:"p2-browser", intentId:"p2-retry-fresh-id", expectedStateVersion:p2Fresh.match!.stateVersion, intent:{type:"MULLIGAN",returnIds:[]} });
  assert.equal(p2Retry.response.accepted,true);
  assert.equal(p2Retry.view.match!.stateVersion,2);
  assert.equal(p2Retry.view.match!.status,"ACTIVE");
  assert.equal(p2Retry.view.match!.activePlayerId,"P1");
});

test("v7.68 passive sync keeps End anyway confirmation only for the identical authoritative moment",()=>{
  const helper = app.slice(app.indexOf("function acceptPassiveSyncedView"), app.indexOf("async function refreshState"));
  assert.match(helper,/pendingActionConfirmation/);
  assert.match(helper,/before\.stateVersion === after\.stateVersion/);
  assert.match(helper,/before\.turnNumber === after\.turnNumber/);
  assert.match(helper,/before\.phase === after\.phase/);
  assert.match(helper,/before\.activePlayerId === after\.activePlayerId/);
  assert.match(helper,/before\.viewerId === after\.viewerId/);
  assert.match(helper,/acceptView\(view\)/);

  const refresh = app.slice(app.indexOf("async function refreshState"), app.indexOf("function streamReconnectDelay"));
  assert.match(refresh,/acceptPassiveSyncedView\(view\)/);
  const stream = app.slice(app.indexOf("async function startStream"), app.indexOf("function canRetryStaleMulligan"));
  assert.match(stream,/acceptPassiveSyncedView\(view\)/);
  const send = app.slice(app.indexOf("async function sendIntent"), app.indexOf("function bindInteractionHandlers"));
  assert.match(send,/state\.pendingActionConfirmation = null/);
});

test("v7.68.2 validates saved rooms without rejecting the live mulligan SETUP state",()=>{
  const helpers = app.slice(app.indexOf("function roomViewHasLiveMatch"), app.indexOf("function clearTransientMatchUi"));
  assert.match(helpers,/view\?\.status === 'ACTIVE'/);
  assert.match(helpers,/matchStatus === 'SETUP'/);
  assert.match(helpers,/matchStatus === 'ACTIVE'/);
  const resume = app.slice(app.indexOf("async function resumeRecentSession"), app.indexOf("async function abandonRecentWaitingRoom"));
  assert.match(resume,/const serverView = await api/);
  assert.match(resume,/if \(!roomViewIsResumable\(serverView\)\)/);
  assert.match(resume,/saveRecentSession\(null\)/);
});

test("v7.68.2 blocks intents only when the authoritative match is no longer live",()=>{
  const send = app.slice(app.indexOf("async function sendIntent"), app.indexOf("function bindInteractionHandlers"));
  assert.match(send,/await refreshState\(false, \{ preserveLiveOnError:true \}\)/);
  assert.match(send,/if \(!roomViewHasLiveMatch\(state\.view\)\)/);
  assert.match(send,/MATCH_NOT_ACTIVE/);
  assert.match(send,/No move was sent/);
});

test("v7.68.2 room lifecycle stays live throughout mulligan setup and ends only with the match",()=>{
  let tokenNo=0;
  const rooms=new RoomService({ roomIdFactory:()=>"LIFE682", tokenFactory:()=>`tok-life-${++tokenNo}`, firstPlayerFactory:()=>"P1", nowFactory:()=>2000 });
  const host=rooms.createRoom("customer-service-starter");
  const guest=rooms.joinRoom(host.roomId,"it-starter");
  const opening=rooms.getView(host.roomId,host.token);
  assert.equal(opening.status,"ACTIVE");
  assert.equal(opening.match?.status,"SETUP");
  assert.equal(opening.match?.phase,"MULLIGAN");
  const p1=rooms.submitIntent(host.roomId,host.token,{ intentId:"life-p1", expectedStateVersion:opening.match!.stateVersion, intent:{type:"MULLIGAN",returnIds:[]} });
  assert.equal(p1.response.accepted,true);
  assert.equal(p1.view.status,"ACTIVE");
  assert.equal(p1.view.match?.status,"SETUP");
  const guestOpening=rooms.getView(host.roomId,guest.token);
  const p2=rooms.submitIntent(host.roomId,guest.token,{ intentId:"life-p2", expectedStateVersion:guestOpening.match!.stateVersion, intent:{type:"MULLIGAN",returnIds:[]} });
  assert.equal(p2.response.accepted,true);
  assert.equal(p2.view.status,"ACTIVE");
  assert.equal(p2.view.match?.status,"ACTIVE");
  const ended=rooms.submitIntent(host.roomId,host.token,{ intentId:"life-resign", expectedStateVersion:p2.view.match!.stateVersion, intent:{type:"RESIGN"} });
  assert.equal(ended.response.accepted,true);
  assert.equal(ended.view.status,"ENDED");
  assert.equal(ended.view.match?.status,"ENDED");
});

test("v7.68.2 keeps large-desktop, mobile and German lobby follow-ups",()=>{
  const de=root("public/locales/de.js");
  assert.match(css,/@media \(min-width:1800px\)/);
  assert.match(css,/width:min\(1540px,calc\(100% - 48px\)\)/);
  assert.match(css,/@media \(max-width:620px\)[\s\S]*\.quick-match-controls \{ grid-template-columns:1fr; \}/);
  assert.match(css,/\.lobby-hero-actions button:not\(\.primary\) \{ color:#24231f; \}/);
  assert.match(de,/"Five offices\. Five different ways to make the day worse\.":"Fünf Abteilungen/);
  assert.match(app,/lobbyCopy\('Placement','Platzierung'\)/);
});



test("v7.68.3 auto-passes hosted priority only when no legal response exists",()=>{
  const deck=alphaDeckPresets["customer-service-starter"].cards;
  const state=createMatch({ matchId:"AUTO683", seed:683, firstPlayerId:"P1", definitions:alphaDefinitions, p1Deck:deck, p2Deck:deck });
  mulligan(state,"P1",[]);
  mulligan(state,"P2",[]);
  const attacker=Object.values(state.cards).find((card)=>card.ownerId==="P1" && alphaDefinitions[card.definitionId]?.cardType==="EMPLOYEE" && !(alphaDefinitions[card.definitionId]?.abilities??[]).some((ability)=>ability.type==="TRIGGERED"));
  if (!attacker) throw new Error("No attack-ready test Employee found.");
  for (const player of Object.values(state.players)) {
    player.hand=[];
    player.supportField=player.supportField.map(()=>null);
    player.employeeField=player.employeeField.map(()=>null);
  }
  state.players.P1.deck=state.players.P1.deck.filter((id)=>id!==attacker.instanceId);
  state.players.P1.employeeField[0]=attacker.instanceId;
  attacker.zone="EMPLOYEE_FIELD";
  attacker.slot=0;
  attacker.faceUp=true;
  attacker.onboarding=false;
  attacker.attacksUsed=0;
  attacker.cannotAttackUntilTurnNumber=null;
  attacker.cannotAttackThroughControllerTurnsStarted=null;
  state.phase="BATTLE";
  state.activePlayerId="P1";
  const execution=executeHostedMatchIntent(state,{ intentId:"auto-pass-attack", matchId:state.matchId, playerId:"P1", expectedStateVersion:state.stateVersion, intent:{type:"DECLARE_ATTACK",attackerId:attacker.instanceId,targetId:null} });
  assert.equal(execution.response.accepted,true);
  assert.equal(execution.state.responseWindow,null);
  assert.equal(execution.state.priorityPlayerId,null);
  assert.ok(execution.response.events.some((event)=>event.type==="PRIORITY_PASSED"));
  assert.ok(execution.response.events.some((event)=>event.type==="REPUTATION_CHANGED"));

  const withResponse=structuredClone(state);
  const responseCard=Object.values(withResponse.cards).find((card)=>card.ownerId==="P2" && card.definitionId==="CS-010");
  if (!responseCard) throw new Error("Expected Please Hold response card in starter deck.");
  withResponse.players.P2.deck=withResponse.players.P2.deck.filter((id)=>id!==responseCard.instanceId);
  withResponse.players.P2.supportField[0]=responseCard.instanceId;
  responseCard.zone="SUPPORT_FIELD";
  responseCard.slot=0;
  responseCard.faceUp=false;
  responseCard.setTurnNumber=Math.max(0,withResponse.turnNumber-1);
  const held=executeHostedMatchIntent(withResponse,{ intentId:"keep-real-priority", matchId:withResponse.matchId, playerId:"P1", expectedStateVersion:withResponse.stateVersion, intent:{type:"DECLARE_ATTACK",attackerId:attacker.instanceId,targetId:null} });
  assert.equal(held.response.accepted,true);
  assert.equal(held.state.responseWindow?.event,"ATTACK_DECLARED");
  assert.equal(held.state.priorityPlayerId,"P2");
  assert.ok(held.response.view.legalActions.responseOptions.length > 0 || held.state.responseWindow !== null);

  const intentSource=root("src/intents.ts");
  assert.match(intentSource,/legal\.responseOptions\.length > 0\) break/);
});

test("v7.68.3 uses explicit mulligan and booster markers without pseudo-element collisions",()=>{
  const cardRender=app.slice(app.indexOf("function renderCard"),app.indexOf("function cardInspectorContext"));
  assert.match(cardRender,/mulliganReplaceMarker/);
  assert.match(cardRender,/selectionRole === 'MULLIGAN' && selected/);
  assert.match(cardRender,/mulligan-replace-marker/);
  assert.match(css,/\.mulligan-hand \.card\.selected::before \{ content:none; \}/);
  const booster=app.slice(app.indexOf("function renderBoosterReveal"),app.indexOf("function revealBoosterThrough"));
  assert.match(booster,/const isFreshPackPull=true/);
  assert.match(booster,/isNew:isFreshPackPull/);
  assert.match(booster,/collection-new-pull/);
  assert.match(css,/\.booster-hit\.new-pull::after \{ content:none; \}/);
});

test("v7.68.3 keeps archive cards proportional and makes deck searches readable",()=>{
  assert.match(css,/\.archive-grid \.card \{ width:124px;[^}]*height:174px/);
  const cue=app.slice(app.indexOf("function renderZoneTransitionCue"),app.indexOf("function zonePulseClass"));
  assert.match(cue,/cue\?\.kind === 'SEARCH_COMPLETE'/);
  assert.match(cue,/zone-search-card/);
  assert.match(app,/zoneCueDuration = state\.zoneCue\?\.kind === 'SEARCH_COMPLETE' \? 3400 : 2600/);
  assert.match(css,/\.zone-transition-cue\.with-card/);
});

test("v7.68.3 anchors the battlefield across local re-renders",()=>{
  const renderGame=app.slice(app.indexOf("function renderGame"),app.indexOf("function render()"));
  assert.match(renderGame,/previousBattlefieldTop/);
  assert.match(renderGame,/nextBattlefieldTop/);
  assert.match(renderGame,/window\.scrollBy\(0, delta\)/);
  assert.match(app,/focus\(\{ preventScroll:true \}\)/);
});

test("v7.68.3 widens 4K, stacks mobile lobby content and closes German lobby gaps",()=>{
  assert.match(css,/@media \(min-width:2200px\)/);
  assert.match(css,/width:min\(2360px,calc\(100% - 96px\)\)/);
  assert.match(css,/@media \(max-width:620px\)[\s\S]*font-size:clamp\(21px,6\.8vw,28px\)/);
  assert.match(css,/\.starter-guide-grid \{ display:grid; grid-template-columns:repeat\(2,minmax\(0,1fr\)\); overflow:visible/);
  assert.match(css,/@media \(max-width:460px\)[\s\S]*\.starter-guide-grid \{ grid-template-columns:1fr; \}/);
  assert.match(app,/lobbyCopy\('Pick a department\. Start a match\.','Abteilung wählen\. Match starten\.'\)/);
  assert.match(app,/lobbyCopy\('PRIVATE ROOMS','PRIVATE RÄUME'\)/);
  assert.match(app,/lobbyCopy\('MATCH HISTORY & SUPPORT','MATCHVERLAUF & HILFE'\)/);
  assert.match(app,/lobbyModeName\(mode\)/);
  assert.match(app,/lobbyCopy\('CREDITS','BÜRO-CREDITS'\)/);
});



test("v7.68.4 removes transient server acknowledgements from battlefield layout flow",()=>{
  assert.match(css,/\.app \{ overflow-anchor:none; \}/);
  assert.match(css,/\.intent-commit-status \{[\s\S]*position:fixed;[\s\S]*pointer-events:none;/);
  const game=app.slice(app.indexOf("function renderGame"),app.indexOf("function render()"));
  assert.match(game,/previousBattlefieldTop/);
  assert.match(game,/renderIntentCommitStatus\(match\)/);
});

test("v7.68.4 queues attack presentation independently from authoritative auto-pass",()=>{
  assert.match(app,/const ATTACK_PRESENTATION_MS = 2400/);
  assert.match(app,/function enqueueAttackPresentations\(events = \[\]\)/);
  assert.match(app,/event\.type === 'ATTACK_DECLARED'\) freshAttacks\.push\(event\)/);
  assert.match(app,/if \(freshAttacks\.length\) enqueueAttackPresentations\(freshAttacks\)/);
  assert.match(app,/function renderAttackPresentation\(\)/);
  assert.match(css,/\.attack-presentation \{[\s\S]*position:fixed;/);
  assert.match(css,/\.attack-presentation\.opponent|\.attack-presentation > span/);
});

test("v7.68.4 makes match-complete actions non-overlapping for win and loss layouts",()=>{
  assert.match(css,/\.match-result-panel \{ grid-template-columns:auto minmax\(0,1fr\); align-items:start; \}/);
  assert.match(css,/\.match-result-actions \{[\s\S]*grid-column:1\/-1;[\s\S]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/@media \(max-width:620px\)[\s\S]*\.match-result-actions \{ grid-template-columns:1fr 1fr; \}/);
  assert.match(css,/@media \(max-width:420px\)[\s\S]*\.match-result-actions \{ grid-template-columns:1fr; \}/);
});

test("v7.68.4 tunes 4K density and stacks mobile helper rows",()=>{
  assert.match(css,/@media \(min-width:2200px\)[\s\S]*width:min\(2100px,calc\(100% - 120px\)\)/);
  assert.match(css,/grid-template-columns:minmax\(0,1\.55fr\) minmax\(430px,\.76fr\)/);
  assert.match(css,/@media \(max-width:620px\)[\s\S]*\.starter-identity \{ min-height:0 !important; padding:9px 10px; gap:5px; \}/);
  assert.match(css,/\.rules-primer > summary,[\s\S]*\.lobby-playtest-drawer > summary \{[\s\S]*grid-template-columns:minmax\(0,1fr\)/);
});

console.log(`${passed}/20 v7.68 tests passed.`);
