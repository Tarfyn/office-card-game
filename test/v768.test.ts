import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RoomService } from "../src/room.js";

let passed=0;
function test(name:string, fn:()=>void){ fn(); passed+=1; console.log(`✓ ${name}`); }
const root=(name:string)=>readFileSync(fileURLToPath(new URL(`../../${name}`,import.meta.url)),"utf8");
const pkg=JSON.parse(root("package.json"));
const server=root("server/server.mjs");
const html=root("public/index.html");
const app=root("public/app.js");
const readme=root("README.md");

test("v7.68 version markers are current",()=>{
  assert.equal(pkg.version,"7.68.1");
  assert.match(server,/version: "7\.68\.1"/);
  assert.match(server,/Office Card Game v7\.68\.1 server/);
  assert.match(html,/v7\.68\.1 Alpha Playtest/);
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

test("v7.68.1 validates saved rooms with the server before resume",()=>{
  const helpers = app.slice(app.indexOf("function roomViewIsActiveMatch"), app.indexOf("function clearTransientMatchUi"));
  assert.match(helpers,/view\?\.status === 'ACTIVE'/);
  assert.match(helpers,/view\?\.match\?\.status === 'ACTIVE'/);
  const resume = app.slice(app.indexOf("async function resumeRecentSession"), app.indexOf("async function abandonRecentWaitingRoom"));
  assert.match(resume,/const serverView = await api/);
  assert.match(resume,/if \(!roomViewIsResumable\(serverView\)\)/);
  assert.match(resume,/saveRecentSession\(null\)/);
});

test("v7.68.1 blocks intents when the authoritative match is no longer active",()=>{
  const send = app.slice(app.indexOf("async function sendIntent"), app.indexOf("function bindInteractionHandlers"));
  assert.match(send,/await refreshState\(false, \{ preserveLiveOnError:true \}\)/);
  assert.match(send,/if \(!roomViewIsActiveMatch\(state\.view\)\)/);
  assert.match(send,/MATCH_NOT_ACTIVE/);
  assert.match(send,/No move was sent/);
});

test("v7.68.1 contains large-desktop, mobile and German lobby follow-ups",()=>{
  const css=root("public/styles.css");
  const de=root("public/locales/de.js");
  assert.match(css,/@media \(min-width:1800px\)/);
  assert.match(css,/width:min\(1540px,calc\(100% - 48px\)\)/);
  assert.match(css,/@media \(max-width:620px\)[\s\S]*\.quick-match-controls \{ grid-template-columns:1fr; \}/);
  assert.match(css,/\.lobby-hero-actions button:not\(\.primary\) \{ color:#24231f; \}/);
  assert.match(de,/"Five offices\. Five different ways to make the day worse\.":"Fünf Abteilungen/);
  assert.match(app,/lobbyCopy\('Placement','Platzierung'\)/);
});

console.log(`${passed}/10 v7.68 tests passed.`);
