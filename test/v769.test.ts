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
const css=root("public/styles.css");
const readme=root("README.md");
const cards:any[]=JSON.parse(root("data/cards.json"));

function sliceBetween(source:string,start:string,end:string){
  const a=source.indexOf(start);
  const b=source.indexOf(end,a+start.length);
  assert.ok(a>=0,`missing ${start}`);
  assert.ok(b>a,`missing ${end}`);
  return source.slice(a,b);
}

test("v7.69 version markers are current",()=>{
  assert.equal(pkg.version,"7.69.40");
  assert.match(server,/version: "7\.69\.40"/);
  assert.match(server,/Office Card Game v7\.69\.40 server/);
  assert.match(html,/v7\.69\.18 Alpha Playtest/);
  assert.match(readme,/## v7\.69\.8 — Board Geometry \+ Combat Readability/);
  assert.match(readme,/## v7\.69\.7 — Card Consistency \+ Artwork Completion/);
  assert.match(readme,/## v7\.69\.6 — Lobby Balance \+ Card Presentation Polish/);
  assert.match(readme,/## v7\.69\.5 — Full-Desk Lobby Geometry, Artwork Rollout \+ Match HUD Fixes/);
  assert.match(readme,/## v7\.69\.3 — Executive Desk Lobby \+ Rematch Gate/);
});

test("v7.69 separates arena artwork from code-native battlefield geometry",()=>{
  assert.match(app,/const MATCH_ARENA_KEY = 'office-card-game-match-arena-v1'/);
  assert.match(app,/const MATCH_ARENAS = Object\.freeze\(/);
  assert.match(app,/id:'default', image:null/);
  const arena=sliceBetween(app,"function matchArenaPreference", "function matchArenaStyle");
  assert.ok(arena.includes("/^\\/art\\/boards\\/"));
  assert.match(arena,/webp\|png\|jpe\?g/);
  assert.match(app,/class="arena-background-layer"/);
  assert.match(app,/class="arena-surface-layer"/);
  assert.match(css,/--match-arena-image/);
});

test("v7.69 keeps player identity faction-neutral and deck-aware",()=>{
  const player=sliceBetween(app,"function renderPlayer(player, own, match)", "function actionButton");
  assert.match(player,/roomDeckMeta\(player\.id\)/);
  assert.match(player,/playerName/);
  assert.doesNotMatch(player,/deckName/); // v7.69.9: public live-match HUD no longer exposes free-form deck names.
  assert.match(player,/player-role-mark/);
  assert.doesNotMatch(player,/identity\.label/);
  assert.doesNotMatch(player,/HOSTILE|RIVAL CORP|YOUR DEPARTMENT/i);
  assert.match(app,/match-result-emblem[^\n]*<small>YOU<\/small>/);
});

test("v7.69 hard-codes five Employee slots and four Support-System slots on desktop and mobile",()=>{
  assert.match(css,/body\.match-mode \.slots\.employee-row \{ grid-template-columns:repeat\(5,minmax\(70px,116px\)\); \}/);
  assert.match(css,/body\.match-mode \.slots\.support-row,[\s\S]*?grid-template-columns:repeat\(4,minmax\(70px,116px\)\);/);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*?body\.match-mode \.slots\.employee-row \{ grid-template-columns:repeat\(5,minmax\(0,1fr\)\) !important; \}/);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*?body\.match-mode \.slots\.support-row,[\s\S]*?repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/content:'EMPLOYEES · 5'/);
  assert.match(css,/content:'SUPPORT \/ SYSTEM · 4'/);
});

test("v7.69 locks active matches to a board-first viewport without changing ended result scrolling",()=>{
  const render=sliceBetween(app,"function render()", "async function createRoom");
  assert.match(render,/classList\.toggle\('match-viewport-locked', liveMatch && !endedMatch\)/);
  assert.match(css,/body\.match-viewport-locked \{ overflow:hidden;/);
  assert.match(css,/body\.match-mode \.game-main/);
  assert.match(css,/calc\(100dvh - 46px\)/);
  assert.match(app,/class="arena-layout"/);
  assert.match(app,/class="arena-board-column"/);
  assert.match(app,/class="arena-sidepanel"/);
  assert.match(app,/id="matchResultDetail"/);
});

test("v7.69 prevents field-card hover and inspector overlays from moving the battlefield",()=>{
  assert.match(css,/body\.match-mode \.board-lane \.card:not\(\.hidden-card\):hover,[\s\S]*?transform:none !important/);
  assert.match(css,/\.hover-card-preview[\s\S]*?position:fixed/);
  assert.match(css,/overflow-anchor:none/);
  assert.match(app,/previousBattlefieldTop != null && !document\.body\.classList\.contains\('match-viewport-locked'\)/);
});

test("v7.69 gives battlefield slots recessed depth without geometry-changing 3D transforms",()=>{
  const empty=sliceBetween(css,"body.match-mode .field-empty:not(.slot-candidate) {","body.match-mode .field-empty:not(.slot-candidate)::before");
  assert.match(empty,/inset 0 4px 6px -1px rgba\(0,0,0,\.50\)/);
  assert.match(empty,/inset 0 2px 4px -1px rgba\(0,0,0,\.30\)/);
  const candidate=sliceBetween(css,"body.match-mode .field-empty.slot-candidate {","body.match-mode .board-lane .card {");
  assert.match(candidate,/inset 0 0 10px rgba\(74,225,118,\.16\)/);
  assert.doesNotMatch(css,/board-tilt[\s\S]*rotateX\(/);
  assert.doesNotMatch(css,/body\.match-mode \.board-lane \.card[^}]*translateY\(-5px\)/);
});

test("v7.69 queues longer gameplay feedback while preserving independent attack pacing",()=>{
  assert.match(app,/const ATTACK_PRESENTATION_MS = 2400/);
  assert.match(app,/const GAMEPLAY_PRESENTATION_MS = 3400/);
  assert.match(app,/gameplayPresentationQueue/);
  assert.match(app,/enqueueGameplayPresentations\(freshCues\)/);
  assert.match(app,/OPPONENT PLAYED/);
  assert.match(app,/class="gameplay-presentation/);
  assert.match(css,/\.gameplay-presentation \{[\s\S]*?position:fixed/);
});

test("v7.69 exposes a persistent match-complete overlay with clear reasons and View Results",()=>{
  const overlay=sliceBetween(app,"function matchEndOverlayReason", "function openingCardCost");
  assert.match(overlay,/Opponent Company Reputation reached 0\./);
  assert.match(overlay,/Your Company Reputation reached 0\./);
  assert.match(overlay,/Opponent resigned\./);
  assert.match(overlay,/MATCH COMPLETE/);
  assert.match(overlay,/VICTORY/);
  assert.match(overlay,/DEFEAT/);
  assert.match(overlay,/View results/);
  assert.match(overlay,/matchEndOverlayDismissedRoomId/);
  assert.match(css,/\.match-end-overlay \{[\s\S]*?position:fixed/);
});

test("v7.69 retains real game terminology in the new match-shell code",()=>{
  const shell=app.slice(app.indexOf("function roomDeckMeta"), app.indexOf("function telemetryMetricLabel"));
  assert.match(app,/COMPANY REPUTATION/);
  assert.match(app,/CAPACITY/);
  assert.match(app,/>DECK</);
  assert.match(app,/>ARCHIVE</);
  assert.doesNotMatch(shell,/Hostile Takeover|Synergy Capital|Internal Assets|Audit Log|Rival Corp/i);
});



test("v7.69.1 reserves a real center seam and constrains rows instead of overlapping them",()=>{
  assert.match(css,/grid-template-rows:minmax\(0,1fr\) 26px minmax\(0,1fr\)/);
  assert.match(css,/body\.match-mode \.opponent-board \{ grid-row:1; \}/);
  assert.match(css,/body\.match-mode \.own-board \{ grid-row:3; \}/);
  assert.match(css,/body\.match-mode \.office-divider \{[\s\S]*?position:relative;[\s\S]*?grid-row:2;/);
  assert.match(css,/height:min\(100%,162px\)/);
});

test("v7.69.1 scales the board HUD up for large and 4K displays",()=>{
  assert.match(css,/@media \(min-width:2200px\) and \(min-height:1100px\)/);
  assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,164px\)\)/);
  assert.match(css,/max-width:164px; max-height:230px/);
  assert.match(css,/@media \(min-width:3200px\) and \(min-height:1500px\)/);
});

test("v7.69.1 keeps mobile opening chrome compact and removes it after setup",()=>{
  const opening=sliceBetween(app,"function renderMatchOpening(match)","function renderTurnFlowCue");
  assert.match(opening,/if \(match\.status !== 'SETUP'\) return ''/);
  assert.doesNotMatch(opening,/firstStart/);
  assert.match(css,/body\.match-mode \.match-opening \{[\s\S]*?grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css,/body\.match-mode \.mulligan-actions \{ grid-template-columns:1fr 1fr/);
});

test("v7.69.1 exposes mobile Take control and Resign without the desktop side panel",()=>{
  assert.match(app,/function renderMobileMatchMenu\(match\)/);
  assert.match(app,/data-take-session-control>Take control here/);
  assert.match(app,/data-action="resign"/);
  assert.match(app,/renderMobileMatchMenu\(match\)/);
  assert.match(css,/\.mobile-match-menu \{ display:none; \}/);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*?\.mobile-match-menu \{[\s\S]*?display:block/);
});

test("v7.69.1 keeps read-only feedback singular and actionable",()=>{
  const send=sliceBetween(app,"async function sendIntent(intent)","async function boot()");
  assert.match(send,/const readOnlyMessage = 'This tab is read-only/);
  assert.match(send,/state\.lastError = null/);
  assert.match(app,/data-take-session-control/);
  assert.match(css,/body\.match-mode \.connection-banner \{[\s\S]*?position:fixed/);
});


test("v7.69.2 separates player identity and live vitals so status cannot cover the profile",()=>{
  assert.match(css,/body\.match-mode \.player-head \{[\s\S]*?grid-template-columns:minmax\(92px,1fr\) auto/);
  assert.match(css,/body\.match-mode \.player-head-status \{[\s\S]*?justify-content:flex-end/);
  assert.match(css,/body\.match-mode \.player-identity > div > small \{[\s\S]*?text-overflow:ellipsis/);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*?body\.match-mode \.player-vitals \{ grid-template-columns:repeat\(2,minmax\(30px,38px\)\)/);
});

test("v7.69.2 gives the own hand a reserved non-overlapping bottom region",()=>{
  assert.match(css,/body\.match-mode \.own-board \{ padding-bottom:112px; \}/);
  assert.match(css,/body\.match-mode \.own-hand \{[\s\S]*?bottom:31px/);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*?body\.match-mode \.own-hand \{[\s\S]*?width:calc\(100% - 122px\)/);
  assert.match(css,/body\.match-mode \.command-dock \{ right:3px; bottom:28px; width:112px; \}/);
});

test("v7.69.2 removes horizontal scrolling from the desktop Match HUD rail",()=>{
  assert.match(css,/\.arena-sidepanel-scroll \{ overflow-y:auto; overflow-x:hidden; \}/);
  assert.match(css,/\.arena-sidepanel \.opening-readiness-stats,[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/\.arena-sidepanel \.opening-readiness-stats small,[\s\S]*?white-space:normal/);
});

test("v7.69.2 uses compact mobile phase HUD and hides battlefield chrome in detailed results",()=>{
  assert.match(css,/@media \(max-width:760px\)[\s\S]*?body\.match-mode \.arena-top-stack \{ display:none; \}/);
  assert.match(css,/body\.match-mode \.mobile-board-nav \{[\s\S]*?display:block !important/);
  assert.match(app,/resultsMode = match\.status === 'ENDED'/);
  assert.match(css,/board-first-shell\.results-view \.arena-layout,[\s\S]*?display:none !important/);
});


test("v7.69.3 gates Friendly rematch until both players explicitly join",()=>{
  let room=0,token=0;
  const service=new RoomService({roomIdFactory:()=>`R69${++room}X`,tokenFactory:()=>`tok69-${++token}`,seedFactory:()=>6900+room,firstPlayerFactory:()=>"P1"});
  const host=service.createRoom("customer-service-starter",{mode:"FRIENDLY"});
  const guest=service.joinRoom(host.roomId,"it-starter");
  const version=service.getView(host.roomId,host.token).match!.stateVersion;
  service.submitIntent(host.roomId,host.token,{intentId:"resign-7693",expectedStateVersion:version,intent:{type:"RESIGN"}});
  const first=service.rematchRoom(host.roomId,host.token);
  assert.equal(first.waiting,true);
  assert.equal(first.view.status,"WAITING");
  assert.equal(first.view.match,null);
  assert.equal(first.view.rematchConfirmedByViewer,true);
  assert.equal(first.view.rematchConfirmedByOpponent,false);
  const second=service.rematchRoom(host.roomId,guest.token);
  assert.equal(second.roomId,first.roomId);
  assert.equal(second.waiting,false);
  assert.equal(second.view.status,"ACTIVE");
  assert.ok(second.view.match);
  assert.equal(service.getView(first.roomId,first.token).status,"ACTIVE");
});

test("v7.69.3 persists a pending rematch handshake across server restart",()=>{
  let snapshot:any=null,room=0,token=0;
  const persistence={storageLabel:"REMATCH_TEST",load:()=>snapshot,save:(value:any)=>{snapshot=structuredClone(value)}};
  const options={persistence,roomIdFactory:()=>`P69${++room}X`,tokenFactory:()=>`ptok69-${++token}`,seedFactory:()=>76930+room,firstPlayerFactory:()=>"P1" as const};
  const service=new RoomService(options);
  const host=service.createRoom("customer-service-starter",{mode:"FRIENDLY"});
  const guest=service.joinRoom(host.roomId,"it-starter");
  const version=service.getView(host.roomId,host.token).match!.stateVersion;
  service.submitIntent(host.roomId,host.token,{intentId:"resign-persist-7693",expectedStateVersion:version,intent:{type:"RESIGN"}});
  const first=service.rematchRoom(host.roomId,host.token);
  assert.equal(first.view.status,"WAITING");
  const restored=new RoomService(options);
  const second=restored.rematchRoom(host.roomId,guest.token);
  assert.equal(second.roomId,first.roomId);
  assert.equal(second.view.status,"ACTIVE");
  assert.equal(restored.getView(first.roomId,first.token).status,"ACTIVE");
});

test("v7.69.3 keeps mobile results scrollable and the hand clear of the local profile",()=>{
  assert.match(css,/board-first-shell\.results-view[^{]*\{[\s\S]*?height:auto !important;[\s\S]*?overflow:visible !important/);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*?body\.match-mode \.own-hand \{[\s\S]*?left:50%;[\s\S]*?bottom:47px;[\s\S]*?transform:translateX\(-50%\)/);
  assert.match(css,/width:58px; min-width:58px; max-width:58px/);
});

test("v7.69.3 uses available desktop space for a readable hand",()=>{
  assert.match(css,/@media \(min-width:761px\) and \(max-height:1000px\)[\s\S]*?width:82px; min-width:82px; max-width:82px/);
  assert.match(css,/@media \(min-width:2200px\) and \(min-height:1100px\)[\s\S]*?width:110px; min-width:110px; max-width:110px/);
});

test("v7.69.3 makes the desktop Match HUD reflow instead of clipping",()=>{
  assert.match(css,/body\.match-mode \.arena-layout \{ grid-template-columns:minmax\(0,1fr\) clamp\(330px,19vw,430px\); \}/);
  assert.match(css,/\.arena-sidepanel \.match-feed-list \{ grid-template-columns:1fr !important; \}/);
  assert.match(css,/\.arena-sidepanel \.telemetry-kpis,[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\) !important/);
  assert.match(css,/@media \(min-width:2200px\) and \(min-height:1100px\)[\s\S]*?clamp\(560px,20vw,700px\)/);
});

test("v7.69.3 expires pending rematches and allows the requester to cancel",()=>{
  let now=1_000_000,room=0,token=0;
  const service=new RoomService({nowFactory:()=>now,roomIdFactory:()=>`E69${++room}X`,tokenFactory:()=>`etok69-${++token}`,seedFactory:()=>76940+room,firstPlayerFactory:()=>"P1"});
  const host=service.createRoom("customer-service-starter",{mode:"FRIENDLY"});
  const guest=service.joinRoom(host.roomId,"it-starter");
  const version=service.getView(host.roomId,host.token).match!.stateVersion;
  service.submitIntent(host.roomId,host.token,{intentId:"resign-expire-7693",expectedStateVersion:version,intent:{type:"RESIGN"}});
  const pending=service.rematchRoom(host.roomId,guest.token);
  assert.equal(pending.waiting,true);
  assert.equal(pending.view.rematchExpiresAt,now+90_000);
  const cancelled=service.abandonRoom(pending.roomId,pending.token);
  assert.equal(cancelled.view,null);
  assert.equal(service.getView(host.roomId,host.token).rematchAvailable,false);
  const pendingAgain=service.rematchRoom(host.roomId,host.token);
  now+=90_001;
  assert.throws(()=>service.rematchRoom(host.roomId,guest.token),/Rematch request expired/);
  assert.equal(service.getView(host.roomId,host.token).rematchAvailable,false);
  assert.ok(pendingAgain.roomId);
  assert.match(app,/Cancel rematch & lobby/);
  assert.match(app,/Rematch request expired/);
});

test("v7.69.4 rebuilds the lobby as one material Executive Desk hierarchy without duplicate actions",()=>{
  const lobby=sliceBetween(app,"function renderLobby()","function renderWaiting()");
  assert.match(lobby,/material-executive-lobby/);
  assert.match(lobby,/executive-desk-surface/);
  assert.match(lobby,/desk-nav-rail/);
  assert.match(lobby,/data-lobby-deck-showcase-host="CURRENT"/);
  assert.match(lobby,/desk-meeting-agenda/);
  assert.match(lobby,/desk-bureaucracy/);
  assert.match(lobby,/desk-private-room/);
  assert.match(lobby,/desk-tools-tray/);
  assert.equal((lobby.match(/id="openCollection"/g)??[]).length,1);
  assert.equal((lobby.match(/id="quickMatchBtn"/g)??[]).length,1);
  assert.equal((lobby.match(/renderLobbyPlaytestDrawer\(\)/g)??[]).length,1);
  assert.match(lobby,/data-starter-deck/);
  assert.doesNotMatch(lobby,/>Social<|>Shop<|>Practice<|Daily Challenge/);
});

test("v7.69.4 uses supplied material assets for one desk and one central green play surface",()=>{
  const materialPaths=[
    "public/ui/materials/wood-dark-walnut/basecolor.webp",
    "public/ui/materials/deskmat-green/basecolor.webp",
    "public/ui/materials/folder-manila/basecolor.webp",
    "public/ui/materials/paper-offwhite/basecolor.webp",
    "public/ui/materials/leather-dark-brown/basecolor.webp",
    "public/ui/materials/metal-brass-brushed/basecolor.webp",
    "public/ui/materials/plastic-dark-matte/basecolor.webp",
    "public/ui/materials/metal-black-coated/basecolor.webp"
  ];
  for(const asset of materialPaths) assert.ok(readFileSync(fileURLToPath(new URL(`../../${asset}`,import.meta.url))).length>0,`missing ${asset}`);
  assert.match(css,/--desk-wood-texture:url\('\/ui\/materials\/wood-dark-walnut\/basecolor\.webp'\)/);
  assert.match(css,/--desk-mat-texture:url\('\/ui\/materials\/deskmat-green\/basecolor\.webp'\)/);
  assert.match(css,/--desk-leather-texture:url\('\/ui\/materials\/leather-dark-brown\/basecolor\.webp'\)/);
  assert.match(css,/--desk-brass-texture:url\('\/ui\/materials\/metal-brass-brushed\/basecolor\.webp'\)/);
  const center=sliceBetween(css,".executive-desk-center {",".executive-desk-right");
  assert.match(center,/var\(--desk-mat-texture\)/);
  assert.doesNotMatch(center,/desk-mat-texture[\s\S]*desk-mat-texture/);
});

test("v7.69.4 stages three real selected-deck cards and updates them with deck choice",()=>{
  const helpers=sliceBetween(app,"function lobbyDeckSummary","function catalogArt");
  assert.match(helpers,/function lobbyDeckPreviewCards/);
  assert.match(helpers,/cardDef\(entry\.definitionId\)/);
  assert.match(helpers,/\['EMPLOYEE','ACTION','SYSTEM','INCIDENT'\]/);
  assert.match(helpers,/function renderLobbyDeckShowcase/);
  assert.match(helpers,/renderLobbyLiveCardFace\(entry\.def(?:,entry\.variantId)?\)/);
  assert.match(helpers,/desk-card-fan-item fan-\$\{index\+1\}/);
  assert.match(helpers,/querySelectorAll\('\[data-lobby-deck-showcase-host\]'\)/);
  assert.match(helpers,/classList\.toggle\('selected', selected\)/);
  assert.match(css,/\.desk-card-fan-item\.fan-1/);
  assert.match(css,/\.desk-card-fan-item\.fan-2/);
  assert.match(css,/\.desk-card-fan-item\.fan-3/);
});

test("v7.69.4 scales useful lobby surfaces on 4K and keeps all real controls on mobile",()=>{
  assert.match(css,/@media \(min-width:2200px\) and \(min-height:1100px\)[\s\S]*?\.executive-desk-surface \{ width:min\(2200px,100%\)/);
  assert.match(css,/@media \(min-width:2200px\) and \(min-height:1100px\)[\s\S]*?\.desk-card-fan-item \{ width:250px; \}/);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*?\.executive-desk-surface \{ display:flex; flex-direction:column/);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*?\.desk-card-fan-item \{ width:104px/);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*?\.desk-tools-tray \{ display:flex; flex-direction:column/);
});


test("v7.69.5 keeps Office Coach readable inside the narrow Match HUD rail",()=>{
  assert.match(css,/\.arena-sidepanel \.guidance-coach \{[\s\S]*?grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css,/\.arena-sidepanel \.guidance-copy strong,[\s\S]*?word-break:normal/);
  assert.match(css,/\.arena-sidepanel \.guidance-actions \{[\s\S]*?flex-wrap:wrap/);
});

test("v7.69.5 anchors direct attacks to the visible REP vital",()=>{
  const vitals=sliceBetween(app,"function directAttackDefenderId", "function renderResources");
  assert.match(vitals,/targetId !== null/);
  assert.match(vitals,/reputation-target-anchor/);
  assert.match(vitals,/data-reputation-player/);
  assert.match(vitals,/attack-destination/);
  const connector=sliceBetween(app,"function drawAttackConnector", "function departmentMark");
  assert.match(connector,/directAttackDefenderId\(match\)/);
  assert.match(connector,/\.reputation-target-anchor\[data-reputation-player/);
  assert.match(connector,/glowPath\?\.setAttribute\('d', connector\)/);
  assert.match(css,/body\.match-mode \.player-vitals \.vital\.rep\.reputation-target-anchor\.attack-destination/);
});

test("v7.69.5 makes the desk and downward drawer one flush full-viewport object",()=>{
  const geometry=css.slice(css.lastIndexOf("/* v7.69.5 — full-viewport Executive Desk geometry"));
  assert.match(geometry,/\.executive-lobby \{[\s\S]*?padding:0/);
  assert.match(geometry,/\.executive-desk-surface \{[\s\S]*?width:100%;[\s\S]*?max-width:none;[\s\S]*?margin:0;[\s\S]*?border-left:0;[\s\S]*?border-right:0/);
  assert.match(geometry,/\.executive-desk-tools \{[\s\S]*?width:100%;[\s\S]*?max-width:none;[\s\S]*?margin:0;[\s\S]*?border-left:0;[\s\S]*?border-right:0/);
  assert.match(geometry,/\.desk-tools-hardware \{[\s\S]*?top:auto;[\s\S]*?bottom:8px/);
  assert.match(geometry,/@media \(min-width:2200px\) and \(min-height:1100px\)[\s\S]*?\.executive-desk-surface \{[\s\S]*?width:100%;[\s\S]*?max-width:none/);
  assert.match(geometry,/@media \(max-width:760px\)[\s\S]*?\.desk-bureaucracy \.profile-stats \{[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});

test("v7.69.5 integrates the supplied card artwork batch with canonical web slugs",()=>{
  const illustrated=cards.filter(card=>Boolean(card.artId));
  const supplied=cards.filter(card=>String(card.artId??'').endsWith('.webp'));
  const missing=cards.filter(card=>!card.artId);
  assert.equal(cards.length,107);
  assert.equal(illustrated.length,107);
  assert.equal(supplied.length,106);
  assert.equal(missing.length,0);
  assert.equal(cards.find(card=>card.id==='CS-002')?.artId,'alpha/call-center-agent.webp');
  assert.equal(cards.find(card=>card.id==='IT-006')?.artId,'alpha/erp-specialist.webp');
  assert.equal(cards.find(card=>card.id==='IT-014')?.artId,'alpha/server-cluster.webp');
  assert.equal(cards.find(card=>card.id==='MKT-003')?.artId,'alpha/performance-marketer.webp');
  assert.equal(cards.find(card=>card.id==='N-009')?.artId,'alpha/coffee-chat.webp');
  assert.equal(cards.find(card=>card.id==='N-013')?.artId,'alpha/coffee-machine.webp');
  assert.equal(cards.find(card=>card.id==='OFC-007')?.artId,'alpha/approval-required.png');
  assert.ok(supplied.every(card=>!String(card.artId).includes('_')));
  for(const card of supplied){
    const asset=fileURLToPath(new URL(`../../public/art/${card.artId}`,import.meta.url));
    assert.ok(readFileSync(asset).length>1000,`missing artwork asset for ${card.id}`);
  }
  assert.match(root("scripts/artwork-audit.mjs"),/ratioTolerance=0\.015/);
});


test("v7.69.6 keeps lobby showcase random per visit or deck change but stable across rerenders",()=>{
  assert.match(app,/lobbyShowcaseDeckValue: null/);
  assert.match(app,/lobbyShowcaseCardIds: \[\]/);
  const preview=sliceBetween(app,"function weightedLobbyShowcaseSample", "function renderLobbyDeckShowcase");
  assert.match(preview,/Math\.random\(\)/);
  assert.match(preview,/state\.lobbyShowcaseDeckValue === deck\.value/);
  assert.match(preview,/state\.lobbyShowcaseCardIds/);
  assert.match(preview,/illustrated\.length >= Math\.min\(3, candidates\.length\)/);
  const park=sliceBetween(app,"function parkSession", "async function refreshRecentSession");
  assert.match(park,/state\.lobbyShowcaseDeckValue = null/);
  assert.match(park,/state\.lobbyShowcaseCardIds = \[\]/);
});

test("v7.69.6 reuses printed and modified Power badges in the hover card",()=>{
  const hover=sliceBetween(app,"function hoverCardHtml", "function hideHoverPreview");
  assert.match(hover,/renderPowerDisplay\(card, def\)/);
  assert.match(hover,/power-changed/);
  assert.doesNotMatch(hover,/POWER \${power\.printed}/);
  const polish=css.slice(css.lastIndexOf("/* v7.69.6 — lobby balance + card presentation polish */"));
  assert.match(polish,/\.hover-card-face \.power-cluster/);
  assert.match(polish,/background:#287ba5/);
  assert.match(polish,/\.hover-card-face \.current-power-badge/);
});

test("v7.69.6 gives hidden cards one branded card back",()=>{
  assert.match(app,/function cardBackMarkup/);
  assert.match(app,/hiddenSupportBack\(\)[\s\S]*?cardBackMarkup\(\)/);
  const opponent=sliceBetween(app,"function renderOpponentHand", "function legalEmployeeOptionsForSlot");
  assert.match(opponent,/cardBackMarkup\(\{ compact:true \}\)/);
  const polish=css.slice(css.lastIndexOf("/* v7.69.6 — lobby balance + card presentation polish */"));
  assert.match(polish,/\.ocg-card-back \{/);
  assert.match(polish,/\.ocg-card-back-frame/);
});

test("v7.69.6 improves field card paper, hand scale and compact info affordance",()=>{
  const polish=css.slice(css.lastIndexOf("/* v7.69.6 — lobby balance + card presentation polish */"));
  assert.match(polish,/body\.match-mode \.board-lane \.card:not\(\.hidden-card\)[\s\S]*?#f3f0e8/);
  assert.match(polish,/body\.match-mode \.board-lane \.card \.card-art-stage \{[\s\S]*?flex:0 0 auto/);
  assert.match(polish,/body\.match-mode \.board-lane \.card \.card-info \{[\s\S]*?width:14px/);
  assert.match(polish,/@media \(min-width:761px\) and \(max-height:1000px\)[\s\S]*?width:96px; min-width:96px/);
  assert.match(polish,/@media \(min-width:2200px\) and \(min-height:1100px\)[\s\S]*?width:124px; min-width:124px/);
  assert.match(polish,/@media \(max-width:760px\)[\s\S]*?width:62px; min-width:62px/);
});

test("v7.69.6 tightens 4K lobby balance, mobile contrast and drawer fascia without redesigning the desk",()=>{
  const polish=css.slice(css.lastIndexOf("/* v7.69.6 — lobby balance + card presentation polish */"));
  assert.match(polish,/@media \(min-width:2200px\) and \(min-height:1100px\)[\s\S]*?\.executive-desk-center \{[\s\S]*?grid-template-rows:auto auto auto;[\s\S]*?align-content:center/);
  assert.match(polish,/\.executive-desk-tools::after \{[\s\S]*?bottom:0;[\s\S]*?var\(--desk-wood-texture\)/);
  assert.match(polish,/@media \(max-width:760px\)[\s\S]*?\.desk-tools-tray \.private-room-drawer > summary strong[\s\S]*?color:#2e2117/);
});

console.log(`\n${passed}/${passed} v7.69 tests passed.`);
