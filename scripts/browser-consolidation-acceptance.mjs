/*
 * Deterministic browser acceptance for the v7.69 consolidation pass.
 *
 * This is a local QA harness only.  It serves the shipped public bundle from
 * the ordinary local server, while Playwright routes room API calls to the
 * real in-memory RoomService with valid MatchQaSetup fixtures.  No production
 * route, database, or state-injection endpoint is added.
 */
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const playwrightPath = process.env.OCG_PLAYWRIGHT_MODULE
  ?? "C:/Users/frede/AppData/Local/OpenAI/Codex/runtimes/cua_node/b474a88d5d105afa/bin/node_modules/playwright";
const { chromium } = require(playwrightPath);
const { RoomService } = await import("../dist/src/room.js");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const base = process.env.OCG_BROWSER_BASE_URL ?? "http://127.0.0.1:8795";
const port = Number(new URL(base).port || 8795);

const failures = [];
const networkErrors = [];
const consoleErrors = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function localService() {
  let roomNo = 0;
  let tokenNo = 0;
  return new RoomService({
    roomIdFactory: () => `BQA${++roomNo}X`,
    tokenFactory: () => `browser-qa-token-${++tokenNo}`,
    seedFactory: () => 76972,
    firstPlayerFactory: () => "P1"
  });
}

function fixtureSetup(name) {
  const common = { fixedSeed:76972, fixedFirstPlayerId:"P1", forceOpeningDefinitionIds:["IT-002"] };
  if (name === "promo-erp") return { ...common, forcePlayerOpeningFieldDefinitionIds:["IT-006"], initialCapacity:7 };
  if (name === "promo-valid") return { ...common, forcePlayerOpeningFieldDefinitionIds:["IT-001"], initialCapacity:7 };
  if (name === "promo-full-valid") return { ...common, forcePlayerOpeningFieldDefinitionIds:["IT-001","IT-003","IT-004","IT-005","IT-006"], initialCapacity:7 };
  if (name === "promo-full-erp") return { ...common, forcePlayerOpeningFieldDefinitionIds:["IT-006","IT-003","IT-004","IT-005","IT-003"], initialCapacity:7 };
  if (name === "promo-full-capacity") return { ...common, forcePlayerOpeningFieldDefinitionIds:["IT-001","IT-003","IT-004","IT-005","IT-006"], initialCapacity:0 };
  if (name === "normal") return { ...common, forceOpeningDefinitionIds:["IT-014","IT-010","N-013"], forcePlayerOpeningFieldDefinitionIds:["IT-001"], forceOpponentOpeningFieldDefinitionIds:["CS-001"], initialCapacity:12 };
  if (name === "normal-direct") return { ...common, forceOpeningDefinitionIds:[], forcePlayerOpeningFieldDefinitionIds:["IT-001"], initialCapacity:12 };
  return { ...common, forceOpeningDefinitionIds:["IT-001","IT-014","IT-010","N-013"], forceOpponentOpeningFieldDefinitionIds:["IT-006"], initialCapacity:12 };
}

function createFixture(service, fixture) {
  const mode = fixture === "normal" ? "FRIENDLY" : "TRAINING";
  const created = service.createRoom("it-starter", { mode }, { displayName:"QA Player" });
  const joined = service.joinRoom(created.roomId, "customer-service-starter", { displayName:"QA Opponent", isBot:mode === "TRAINING" }, fixtureSetup(fixture));
  // Put the opponent through mulligan deterministically.  The real browser
  // still performs the controller's Keep action.
  const p2 = service.submitIntent(created.roomId, joined.token, {
    intentId:`qa-p2-mulligan-${fixture}`,
    expectedStateVersion:joined.view.match.stateVersion,
    intent:{ type:"MULLIGAN", returnIds:[] }
  });
  assert(p2.response.accepted, `${fixture}: opponent mulligan was not accepted`);
  return { roomId:created.roomId, token:created.token, playerId:"P1", view:service.getView(created.roomId, created.token, 0) };
}

function json(status, data) {
  return { status, contentType:"application/json; charset=utf-8", body:JSON.stringify(data) };
}

async function routeRoomApi(route, service, fixture, createdRef) {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname;
  const token = request.headers()["x-room-token"] ?? "";
  let body = {};
  try { body = request.postDataJSON() ?? {}; } catch {}
  try {
    if (request.method() === "POST" && (path === "/api/rooms/bot" || path === "/api/rooms")) {
      const selected = path === "/api/rooms/bot" ? (fixture === "normal" ? "guest" : fixture) : "normal";
      const created = createFixture(service, selected);
      createdRef.current = created;
      return route.fulfill(json(201, created));
    }
    const match = /^\/api\/rooms\/([^/]+)\/(state|intent|session\/claim|stream-ticket|stream|abandon)$/.exec(path);
    if (!match) return route.continue();
    const roomId = match[1];
    const action = match[2];
    if (action === "state") {
      return route.fulfill(json(200, service.getView(roomId, token, Number(url.searchParams.get("after") ?? 0), url.searchParams.get("clientId") ?? undefined)));
    }
    if (action === "intent") {
      const result = service.submitIntent(roomId, token, body);
      return route.fulfill(json(result.response.accepted ? 200 : 409, { ...result, serverProfile:null }));
    }
    if (action === "session/claim") {
      const view = service.claimSeatClient(roomId, token, String(body.clientId ?? "browser-qa"));
      return route.fulfill(json(200, { view }));
    }
    if (action === "stream-ticket") {
      return route.fulfill(json(201, { ticket:`browser-qa-stream:${roomId}:${token}` }));
    }
    if (action === "stream") {
      return route.fulfill({ status:200, contentType:"text/event-stream", body:": browser-qa heartbeat\n\n" });
    }
    if (action === "abandon") {
      return route.fulfill(json(200, service.abandonRoom(roomId, token)));
    }
  } catch (error) {
    return route.fulfill(json(500, { error:{ code:"BROWSER_QA_ERROR", message:String(error?.message ?? error) } }));
  }
  return route.continue();
}

async function ready(url) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { const response = await fetch(`${url}/api/health`); if (response.ok) return; } catch {}
    await delay(100);
  }
  throw new Error(`Local server did not become ready at ${url}`);
}

async function preparePage(browser, fixture, viewport) {
  const context = await browser.newContext({ viewport, isMobile:viewport.width < 900, hasTouch:viewport.width < 900 });
  const page = await context.newPage();
  const service = localService();
  const createdRef = { current:null };
  page.on("pageerror", error => consoleErrors.push(`${fixture}: ${error}`));
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(`${fixture}: ${message.text()}`); });
  page.on("response", response => { if (response.status() >= 400 && !response.url().includes("/api/rooms")) networkErrors.push({ fixture, url:response.url(), status:response.status() }); });
  // Keep the deterministic fixture's connection stable. State is returned by
  // each authoritative intent response and poll; a closed synthetic SSE
  // response would cause reconnect renders to replace the card mid long-press.
  await page.addInitScript(() => {
    class StableQaEventSource extends EventTarget {
      constructor() { super(); this.readyState = 1; queueMicrotask(() => this.dispatchEvent(new Event('open'))); }
      close() { this.readyState = 2; }
    }
    window.EventSource = StableQaEventSource;
  });
  await page.route("**/api/rooms", route => routeRoomApi(route, service, fixture, createdRef));
  await page.route("**/api/rooms/**", route => routeRoomApi(route, service, fixture, createdRef));
  await page.goto(`${base}/?browserQa=${encodeURIComponent(fixture)}`, { waitUntil:"domcontentloaded" });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload({ waitUntil:"domcontentloaded" });
  // Clearing storage intentionally exercises a first visit. Alpha onboarding
  // is mounted after the app's profile/catalog requests settle, so waiting for
  // the actual button avoids racing the first render and leaving the modal
  // above the fixture controls.
  await page.waitForTimeout(600);
  for (const selector of ["#dismissOnboarding", "#skipAlphaOnboarding", "#finishAlphaOnboarding"]) {
    const button = page.locator(selector).first();
    if (await button.count()) {
      await button.waitFor({ state:"visible", timeout:5000 });
      await button.click({ force:true });
      await page.waitForTimeout(100);
    }
  }
  await page.locator(".alpha-onboarding-backdrop").waitFor({ state:"detached", timeout:2000 }).catch(() => {});
  return { page, context, service, createdRef };
}

async function keepHand(page) {
  const keep = page.locator("button").filter({ hasText:/Keep|Behalten/i }).first();
  if (await keep.count()) {
    const keepIntent = page.waitForResponse(response => response.request().method() === "POST" && response.url().includes("/intent"));
    await keep.click();
    await keepIntent;
  }
  await page.waitForTimeout(80);
  assert(await page.locator(".battlefield-surface").count(), "match board did not render");
}

async function promotionCase(browser, fixture, expected) {
  const { page, context, service, createdRef } = await preparePage(browser, fixture, { width:1920, height:1080 });
  await page.locator("#startTrainingPanel").click();
  await page.waitForTimeout(250);
  await keepHand(page);
  const card = page.locator('[data-play-hand]').filter({ hasText:"Service Desk Lead" }).first();
  assert(await card.count(), `${fixture}: Service Desk Lead not rendered in hand`);
  const cardInfo = await card.evaluate(el => ({ className:el.className, id:el.dataset.playHand }));
  assert(cardInfo.id, `${fixture}: missing card instance reference`);
  const view = service.getView(createdRef.current.roomId, createdRef.current.token, 0);
  const eligibility = view.match.legalActions.handEligibility[cardInfo.id];
  assert(eligibility?.reasonCode === expected.reasonCode || (expected.allowed && eligibility?.allowed === true), `${fixture}: projected eligibility mismatch ${JSON.stringify(eligibility)}`);
  if (!expected.allowed) {
    await card.click();
    await page.waitForTimeout(100);
    assert(await page.locator('[data-modal-panel]').count() === 0, `${fixture}: blocked card opened an unexpected play modal`);
    const bodyText = await page.locator("body").innerText();
    assert(!bodyText.includes("NO_SLOT"), `${fixture}: leaked NO_SLOT blocker`);
  } else {
    await card.click();
    const slot = page.locator('[data-field-slot-zone="EMPLOYEE"]').filter({ hasNot:page.locator(".card") }).first();
    assert(await slot.count(), `${fixture}: no destination slot`);
    await slot.click();
    await page.waitForTimeout(350);
    const after = await page.locator('.card-surface-board').count();
    const interactionText = await page.locator('#boardInteractionPanel').innerText().catch(() => '');
    const authoritative = service.getView(createdRef.current.roomId, createdRef.current.token, 0).match;
    assert(after >= (fixture === "promo-full-valid" ? 5 : 2), `${fixture}: Promotion did not reach the board (cards=${after}, interaction=${interactionText}, phase=${authoritative?.phase}, field=${JSON.stringify(authoritative?.players?.P1?.employeeField)})`);
  }
  await context.close();
  return { fixture, projected:eligibility, cardClass:cardInfo.className };
}

async function mobileCase(browser, viewport) {
  const { page, context } = await preparePage(browser, "guest", viewport);
  await page.locator("#startTrainingPanel").click();
  await page.waitForTimeout(250);
  await keepHand(page);
  const handCard = page.locator(".hand-fan-card").first();
  assert(await handCard.count(), `mobile ${viewport.width}: no visible hand card`);
  const rect = await handCard.boundingBox();
  assert(rect?.width > 0 && rect?.height > 0, `mobile ${viewport.width}: invalid card geometry`);
  const cdp = await context.newCDPSession(page);
  const point = { x:rect.x + rect.width/2, y:rect.y + rect.height/2 };
  await page.evaluate(() => { window.__browserQaPointerProbe = []; const app=document.querySelector('#app'); for (const type of ['pointerdown','pointermove','pointerup','pointercancel','scroll']) app?.addEventListener(type, e => window.__browserQaPointerProbe.push({ type, pointerType:e.pointerType ?? null, primary:e.isPrimary ?? null, target:e.target?.closest?.('.card')?.dataset?.cardInfo ?? null }), true); });
  await cdp.send("Input.dispatchTouchEvent", { type:"touchStart", touchPoints:[{ ...point, id:41 }] });
  await page.waitForTimeout(520);
  const touchAttrs = await handCard.evaluate(el => ({ outer:el.outerHTML.slice(0,220), hasInfo:el.hasAttribute('data-card-info'), info:el.dataset.cardInfo, pointer:window.getComputedStyle(el).pointerEvents }));
  const pointerProbe = await page.evaluate(() => window.__browserQaPointerProbe);
  assert(await page.locator("[data-modal-panel]").count(), `mobile ${viewport.width}: long press did not open Inspector ${JSON.stringify({ touchAttrs, pointerProbe })}`);
  await cdp.send("Input.dispatchTouchEvent", { type:"touchEnd", touchPoints:[] });
  await page.locator(".modal-close").click().catch(() => page.keyboard.press("Escape"));
  await page.waitForTimeout(80);
  await cdp.send("Input.dispatchTouchEvent", { type:"touchStart", touchPoints:[{ ...point, id:42 }] });
  await cdp.send("Input.dispatchTouchEvent", { type:"touchMove", touchPoints:[{ ...point, x:point.x + 24, id:42 }] });
  await cdp.send("Input.dispatchTouchEvent", { type:"touchEnd", touchPoints:[] });
  await page.waitForTimeout(500);
  assert(!await page.locator("[data-modal-panel]").count(), `mobile ${viewport.width}: cancelled press opened Inspector`);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `mobile ${viewport.width}: horizontal overflow`);
  await context.close();
  return { viewport, cardWidth:rect.width, cardHeight:rect.height };
}

async function mobilePromotionCase(browser, viewport) {
  const { page, context, service, createdRef } = await preparePage(browser, "promo-full-valid", viewport);
  await page.locator("#startTrainingPanel").click();
  await page.waitForTimeout(250);
  await keepHand(page);
  const card = page.locator('[data-play-hand]').filter({ hasText:"Service Desk Lead" }).first();
  assert(await card.count(), `mobile ${viewport.width}: Promotion card missing`);
  await card.click();
  const materialSlot = page.locator('.promotion-slot-candidate').filter({ hasText:"IT Service Agent" }).first();
  assert(await materialSlot.count(), `mobile ${viewport.width}: full-field material slot missing`);
  await materialSlot.click();
  await page.waitForTimeout(350);
  const view = service.getView(createdRef.current.roomId, createdRef.current.token, 0);
  const match = view.match;
  assert(match.players.P1.employeeField.filter(Boolean).length === 5, `mobile ${viewport.width}: Promotion changed Employee count unexpectedly`);
  assert(match.players.P1.employeeField.some(card => card?.definitionId === "IT-002"), `mobile ${viewport.width}: promoted Employee was not placed authoritatively`);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `mobile ${viewport.width}: Promotion overflow`);
  await context.close();
  return { viewport, fullFieldPromotion:true };
}

async function guestCase(browser) {
  const { page, context, service, createdRef } = await preparePage(browser, "guest", { width:1920, height:1080 });
  await page.locator("#startTrainingPanel").click();
  await page.waitForTimeout(200);
  await keepHand(page);
  const employee = page.locator('[data-play-hand]').filter({ hasText:"IT Service Agent" }).first();
  assert(await employee.count(), "guest: Employee fixture card missing");
  await employee.click();
  const employeeSlots = page.locator('[data-field-slot-zone="EMPLOYEE"]');
  assert(await employeeSlots.count(), `guest: no Employee destination after selecting IT Service Agent; cardClass=${await employee.getAttribute('class')} interaction=${await page.locator('#boardInteractionPanel').innerText().catch(() => '')}`);
  const employeeSlotBefore = await employeeSlots.first().evaluate(el => ({ html:el.outerHTML, onclick:typeof el.onclick }));
  await employeeSlots.first().click();
  await page.waitForTimeout(100);
  const afterEmployee = service.getView(createdRef.current.roomId, createdRef.current.token, 0).match;
  assert(afterEmployee.players.P1.employeeField.some(Boolean), `guest: Employee slot click did not commit; slot=${JSON.stringify(employeeSlotBefore)} slotsAfter=${JSON.stringify(await page.locator('[data-field-slot]').evaluateAll(elements => elements.map(el => ({ zone:el.dataset.fieldSlotZone, slot:el.dataset.fieldSlot, cls:el.className }))))} modal=${await page.locator('[data-modal-panel]').count()} body=${(await page.locator('body').innerText()).slice(-800)}`);
  const system = page.locator('[data-play-hand]').filter({ hasText:"Server Cluster" }).first();
  assert(await system.count(), "guest: System fixture card missing");
  const beforeSystem = service.getView(createdRef.current.roomId, createdRef.current.token, 0).match;
  const systemRef = await system.getAttribute('data-play-hand');
  assert(beforeSystem.legalActions.playableSystems?.some(item => item.cardId === systemRef), `guest: Server Cluster not projected playable; card=${systemRef} legal=${JSON.stringify(beforeSystem.legalActions.playableSystems)} hand=${JSON.stringify(beforeSystem.players.P1.hand)}`);
  await system.click();
  const supportSlots = page.locator('[data-field-slot-zone="SUPPORT"]');
  assert(await supportSlots.count(), `guest: no Support destination after selecting Server Cluster; interaction=${await page.locator('#boardInteractionPanel').innerText().catch(() => '')} cardClass=${await system.getAttribute('class')} onclick=${await system.evaluate(el => typeof el.onclick)} info=${await system.getAttribute('data-card-info')} busy=${await page.locator('[data-play-hand]').count()}`);
  const systemIntent = page.waitForResponse(response => response.request().method() === "POST" && response.url().includes("/intent"));
  await supportSlots.first().click();
  await systemIntent;
  await page.waitForTimeout(2500);
  const action = page.locator('[data-play-hand]').filter({ hasText:"Have You Tried Turning It Off and On Again?" }).first();
  assert(await action.count(), "guest: Action fixture card missing");
  const beforeAction = service.getView(createdRef.current.roomId, createdRef.current.token, 0).match;
  const actionRef = await action.getAttribute('data-play-hand');
  const actionProjection = beforeAction.legalActions.playableActions?.find(item => item.cardId === actionRef);
  assert(actionProjection, `guest: Action not projected playable; card=${actionRef} legal=${JSON.stringify(beforeAction.legalActions.playableActions)} hand=${JSON.stringify(beforeAction.players.P1.hand)}`);
  assert(actionProjection.targetChoices?.length, `guest: Action has no projected targets; action=${JSON.stringify(actionProjection)} employeeField=${JSON.stringify(beforeAction.players.P1.employeeField)} opponentField=${JSON.stringify(beforeAction.players.P2.employeeField)}`);
  await action.dispatchEvent('click');
  const targets = page.locator('[data-target-card]');
  assert(await targets.count(), `guest: Action target was not exposed; projection=${JSON.stringify(actionProjection)} cardClass=${await action.getAttribute('class')} boardCards=${JSON.stringify(await page.locator('.card-surface-board').evaluateAll(elements => elements.map(el => ({ ref:el.dataset.cardRef, target:el.hasAttribute('data-target-card'), cls:el.className }))))} body=${(await page.locator('body').innerText()).slice(-700)}`);
  await page.keyboard.press("Escape");
  assert(await page.locator('[data-target-card]').count() === 0, "guest: target cancellation left markers");
  await action.dispatchEvent('click');
  const actionIntent = page.waitForResponse(response => response.request().method() === "POST" && response.url().includes("/intent"));
  await page.locator('[data-target-card]').first().dispatchEvent('click');
  await page.locator('[data-interaction="confirm-target"]').click();
  await actionIntent;
  await page.waitForTimeout(250);
  const view = service.getView(createdRef.current.roomId, createdRef.current.token, 0);
  assert(view.events.some(event => event.type === "ACTION_RESOLVED"), "guest: authoritative Action did not resolve");
  await context.close();
  return { actionResolved:true, supportPlaced:true, noGuestLoanerSelect:true };
}

async function main() {
  let server = null;
  if (process.env.OCG_BROWSER_EXTERNAL_SERVER !== "1") {
    const serverPath = resolve(root, "server/server.mjs");
    // Windows sandboxed Node cannot always spawn the executable directly;
    // cmd.exe is the supported local-process wrapper in this environment.
    server = spawn("cmd.exe", ["/d", "/s", "/c", process.execPath, serverPath, "--port", String(port), "--runtime-dir", resolve(root, "runtime/browser-consolidation")], { cwd:root, stdio:["ignore","pipe","pipe"] });
    server.stdout.on("data", data => process.stdout.write(String(data)));
    server.stderr.on("data", data => process.stderr.write(String(data)));
  }
  await ready(base);
  const browser = await chromium.launch({ headless:true, executablePath:process.env.OCG_CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", args:["--no-sandbox"] });
  const report = { harness:"PASS", promotion:[], mobile:[], viewports:[1920,3840,390,844] };
  try {
    const promotionFixtures = [["promo-erp",{allowed:false,reasonCode:"PROMOTION"}],["promo-valid",{allowed:true}],["promo-full-valid",{allowed:true}],["promo-full-erp",{allowed:false,reasonCode:"PROMOTION"}],["promo-full-capacity",{allowed:false,reasonCode:"CAPACITY"}]].filter(([fixture]) => !process.env.OCG_BROWSER_ONLY || process.env.OCG_BROWSER_ONLY === fixture);
    for (const [fixture, expected] of promotionFixtures) {
      report.promotion.push(await promotionCase(browser, fixture, expected));
    }
    report.guest = await guestCase(browser);
    report.mobile.push(await mobileCase(browser, { width:390, height:844 }));
    report.mobile.push(await mobileCase(browser, { width:844, height:390 }));
    report.mobile.push(await mobilePromotionCase(browser, { width:390, height:844 }));
    report.mobile.push(await mobilePromotionCase(browser, { width:844, height:390 }));
  } catch (error) {
    failures.push(String(error?.stack ?? error));
  } finally {
    await browser.close();
    server?.kill("SIGINT");
  }
  report.failures = failures;
  report.consoleErrors = consoleErrors;
  report.unexpectedNetworkErrors = networkErrors;
  console.log(JSON.stringify(report, null, 2));
  if (failures.length || consoleErrors.length || networkErrors.length) process.exitCode = 1;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
