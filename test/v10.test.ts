import { alphaDeckPresets } from "../src/decks.js";
import { RoomError, RoomService } from "../src/room.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertThrows(fn: () => void, code: string, message: string): void {
  let thrown: unknown = null;
  try { fn(); } catch (error) { thrown = error; }
  assert(thrown instanceof RoomError && thrown.code === code, message);
}

const tests: Array<[string, () => void]> = [];
function test(name: string, fn: () => void) { tests.push([name, fn]); }

function makeService(): RoomService {
  let token = 0;
  return new RoomService({
    roomIdFactory: () => "ABC123",
    tokenFactory: () => `token-${++token}`,
    seedFactory: () => 10101,
    firstPlayerFactory: () => "P1"
  });
}

test("starter deck presets are legal-size 40-card decks", () => {
  for (const preset of Object.values(alphaDeckPresets)) {
    const count = preset.cards.reduce((sum, entry) => sum + entry.copies, 0);
    assert(count === 40, `${preset.id} should contain exactly 40 cards`);
    assert(preset.cards.every((entry) => entry.copies <= 3), `${preset.id} should respect default copy limit`);
  }
});

test("host creates a waiting room and is bound to P1", () => {
  const service = makeService();
  const created = service.createRoom("customer-service-starter");
  assert(created.roomId === "ABC123" && created.playerId === "P1", "Host should own P1 seat");
  assert(created.view.status === "WAITING" && created.view.match === null, "Room should wait for guest before match creation");
});

test("guest joins P2 and match starts with viewer-specific projections", () => {
  const service = makeService();
  const host = service.createRoom("customer-service-starter");
  const guest = service.joinRoom(host.roomId, "it-starter");
  const hostView = service.getView(host.roomId, host.token);
  assert(guest.playerId === "P2" && guest.view.status === "ACTIVE", "Guest should occupy P2 and start the match");
  assert(hostView.match?.viewerId === "P1" && guest.view.match?.viewerId === "P2", "Each seat should receive its own safe projection");
  assert(hostView.match?.players.P2.hand.length === 0, "Host must not see guest hand identities");
  assert(guest.view.match?.players.P1.hand.length === 0, "Guest must not see host hand identities");
});

test("room rejects a third player", () => {
  const service = makeService();
  const host = service.createRoom("customer-service-starter");
  service.joinRoom(host.roomId, "it-starter");
  assertThrows(() => service.joinRoom(host.roomId, "it-starter"), "ROOM_FULL", "Third join should be rejected");
});

test("invalid room token cannot read authoritative room projection", () => {
  const service = makeService();
  const host = service.createRoom("customer-service-starter");
  assertThrows(() => service.getView(host.roomId, "fake"), "INVALID_TOKEN", "Unknown token should be rejected");
});

test("room intent endpoint derives player identity from session token", () => {
  const service = makeService();
  const host = service.createRoom("customer-service-starter");
  const guest = service.joinRoom(host.roomId, "it-starter");
  const p1Version = host.view.match?.stateVersion ?? service.getView(host.roomId, host.token).match!.stateVersion;
  const hostResult = service.submitIntent(host.roomId, host.token, {
    intentId: "host-mulligan",
    expectedStateVersion: p1Version,
    intent: { type: "MULLIGAN", returnIds: [] }
  });
  assert(hostResult.response.accepted, "Host mulligan should be accepted as P1");
  const afterHost = hostResult.response.stateVersion;
  const guestResult = service.submitIntent(host.roomId, guest.token, {
    intentId: "guest-mulligan",
    expectedStateVersion: afterHost,
    intent: { type: "MULLIGAN", returnIds: [] }
  });
  assert(guestResult.response.accepted, "Guest mulligan should be accepted as P2 without client-supplied playerId");
  assert(guestResult.view.match?.status === "ACTIVE", "Both mulligans should activate gameplay");
});

test("network retry with same intentId is idempotent", () => {
  const service = makeService();
  const host = service.createRoom("customer-service-starter");
  service.joinRoom(host.roomId, "it-starter");
  const version = service.getView(host.roomId, host.token).match!.stateVersion;
  const request = { intentId: "retry-me", expectedStateVersion: version, intent: { type: "MULLIGAN", returnIds: [] as string[] } } satisfies import("../src/room.js").RoomIntentRequest;
  const first = service.submitIntent(host.roomId, host.token, request);
  const second = service.submitIntent(host.roomId, host.token, request);
  assert(first.response.accepted && second.response.accepted && second.replayed, "Repeated intentId should return cached success");
  assert(first.response.stateVersion === second.response.stateVersion, "Retry must not apply the intent twice");
});

test("room preserves engine stale-state rejection", () => {
  const service = makeService();
  const host = service.createRoom("customer-service-starter");
  service.joinRoom(host.roomId, "it-starter");
  const version = service.getView(host.roomId, host.token).match!.stateVersion;
  const first = service.submitIntent(host.roomId, host.token, { intentId: "first", expectedStateVersion: version, intent: { type: "MULLIGAN", returnIds: [] } });
  assert(first.response.accepted, "First intent should succeed");
  const stale = service.submitIntent(host.roomId, host.token, { intentId: "stale", expectedStateVersion: version, intent: { type: "MULLIGAN", returnIds: [] } });
  assert(!stale.response.accepted && stale.response.error?.code === "STALE_STATE", "Second command using old version must be rejected");
});

test("subscribers are notified when guest joins and accepted intents mutate the room", () => {
  const service = makeService();
  const host = service.createRoom("customer-service-starter");
  let notifications = 0;
  const unsubscribe = service.subscribe(host.roomId, () => { notifications += 1; });
  service.joinRoom(host.roomId, "it-starter");
  const version = service.getView(host.roomId, host.token).match!.stateVersion;
  service.submitIntent(host.roomId, host.token, { intentId: "m", expectedStateVersion: version, intent: { type: "MULLIGAN", returnIds: [] } });
  unsubscribe();
  assert(notifications === 2, "Join and accepted intent should each broadcast once");
});

let passed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}
console.log(`\nv1.0/v1.1 room regression tests: ${passed}/${tests.length} passed`);
