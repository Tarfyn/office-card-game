import { strict as assert } from 'node:assert';
import { RoomError, RoomService } from '../src/room.js';

const service = new RoomService();
const created = service.createRoom('it-starter', { mode: 'FRIENDLY' }, { profileId: 'profile-a' });
const joined = service.joinRoom(created.roomId, 'it-starter', { profileId: 'profile-b' });
const roomId = created.roomId;
const stateBefore = service.getView(roomId, created.token).match!;

service.claimSeatClient(roomId, created.token, 'controller-A');
assert.throws(() => service.submitIntent(roomId, created.token, {
  intentId: 'f10-missing-client', expectedStateVersion: stateBefore.stateVersion, intent: { type: 'RESIGN' }
} as any), (error:any) => error instanceof RoomError && error.code === 'SESSION_SUPERSEDED');
const afterMissing = service.getView(roomId, created.token).match!;
assert.equal(afterMissing.stateVersion, stateBefore.stateVersion);

assert.throws(() => service.submitIntent(roomId, created.token, {
  intentId: 'f10-stale-client', expectedStateVersion: stateBefore.stateVersion, clientId: 'controller-old', intent: { type: 'RESIGN' }
} as any), (error:any) => error instanceof RoomError && error.code === 'SESSION_SUPERSEDED');

const active = service.submitIntent(roomId, created.token, {
  intentId: 'f10-active-client', expectedStateVersion: stateBefore.stateVersion, clientId: 'controller-A', intent: { type: 'RESIGN' }
} as any);
assert.notEqual((active.response as any).code, 'SESSION_SUPERSEDED');

service.claimSeatClient(roomId, created.token, 'controller-B');
assert.throws(() => service.submitIntent(roomId, created.token, {
  intentId: 'f10-superseded', expectedStateVersion: active.view.match!.stateVersion, clientId: 'controller-A', intent: { type: 'RESIGN' }
} as any), (error:any) => error instanceof RoomError && error.code === 'SESSION_SUPERSEDED');
const takeover = service.submitIntent(roomId, created.token, {
  intentId: 'f10-takeover', expectedStateVersion: active.view.match!.stateVersion, clientId: 'controller-B', intent: { type: 'RESIGN' }
} as any);
assert.notEqual((takeover.response as any).code, 'SESSION_SUPERSEDED');
void joined;
console.log('F10 controller exclusivity: PASS');
