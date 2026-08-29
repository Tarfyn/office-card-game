import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RoomService } from "../src/room.js";

let passed=0;
const root=(n:string)=>readFileSync(fileURLToPath(new URL(`../../${n}`,import.meta.url)),"utf8");
const pkg=JSON.parse(root("package.json"));
const server=root("server/server.mjs");
const html=root("public/index.html");
const app=root("public/app.js");
const roomSrc=root("src/room.ts");
const readme=root("README.md");
function test(n:string,f:()=>void){f();passed++;console.log(`✓ ${n}`)}

test("v7.67 hosted-sync compatibility contract remains after later hotfixes",()=>{
  assert.match(readme,/## v7\.67 — Hosted Sync \/ Tab-Control Hotfix/);
  assert.match(app,/CLIENT_INSTANCE_KEY = 'office-card-game-client-instance-v1'/);
  assert.match(server,/sseWrite\(res, "heartbeat"/);
});

test("v7.67 keeps one controller identity across reloads in the same tab",()=>{
  assert.match(app,/CLIENT_INSTANCE_KEY = 'office-card-game-client-instance-v1'/);
  assert.match(app,/sessionStorage\.getItem\(CLIENT_INSTANCE_KEY\)/);
  assert.match(app,/sessionStorage\.setItem\(CLIENT_INSTANCE_KEY, created\)/);
  assert.match(app,/const CLIENT_INSTANCE_ID = loadClientInstanceId\(\)/);
});

test("v7.67 serializes EventSource ownership and disables competing native reconnect",()=>{
  assert.match(app,/streamGeneration: 0/);
  assert.match(app,/const generation=\+\+state\.streamGeneration/);
  assert.match(app,/const isCurrent=\(\)=>generation===state\.streamGeneration && state\.stream===source/);
  assert.match(app,/EventSource retries by itself\. Close it here so only our bounded backoff owns reconnect timing/);
  assert.match(app,/source\.close\(\);/);
  assert.match(app,/clearStreamReconnectTimer\(\)/);
});

test("v7.67 uses observable SSE heartbeats",()=>{
  assert.match(server,/sseWrite\(res, "heartbeat", \{ serverNow:Date\.now\(\) \}\)/);
  assert.match(app,/source\.addEventListener\('heartbeat'/);
  assert.match(app,/state\.lastSyncAt=state\.lastLiveAt/);
});

test("v7.67 falls back to authoritative HTTP polling while SSE recovers",()=>{
  assert.match(app,/function scheduleSyncPoll\(delay=/);
  assert.match(app,/await refreshState\(false\)/);
  assert.match(app,/state\.connectionStatus='POLLING'/);
  assert.match(app,/HTTP fallback sync is active/);
  assert.match(app,/scheduleSyncPoll/);
});

test("v7.67 intent responses retain the submitting controller projection",()=>{
  let seq=0;
  const rooms=new RoomService({roomIdFactory:()=>"SYNC67",tokenFactory:()=>`s-${++seq}`,firstPlayerFactory:()=>"P1",nowFactory:()=>1000});
  const host=rooms.createRoom("customer-service-starter");
  rooms.joinRoom(host.roomId,"it-starter");
  rooms.claimSeatClient(host.roomId,host.token,"client-primary-767");
  const before=rooms.getView(host.roomId,host.token,0,"client-primary-767");
  const result=rooms.submitIntent(host.roomId,host.token,{clientId:"client-primary-767",intentId:"sync-resign",expectedStateVersion:before.match!.stateVersion,intent:{type:"RESIGN"}});
  assert.equal(result.response.accepted,true);
  assert.equal(result.view.viewerSession.protectionEnabled,true);
  assert.equal(result.view.viewerSession.isPrimary,true);
  assert.equal(result.view.viewerSession.activeElsewhere,false);
  assert.match(roomSrc,/projectRoom\(room, token, beforeSeq, clientId \|\| undefined\)/);
});

console.log(`${passed}/6 v7.67 tests passed.`);
