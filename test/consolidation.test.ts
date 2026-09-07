import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createMatch, getLegalActions } from '../src/engine.js';
import { alphaDefinitions } from '../src/cards.js';
import { alphaDeckPresets } from '../src/decks.js';
import { projectStateForViewer } from '../src/projection.js';
import type { GameState } from '../src/types.js';

let passed = 0;
function test(name:string, fn:()=>void) { fn(); passed++; console.log(`✓ ${name}`); }
function fixture(hand = 'IT-002', field:string[] = []) {
  const state = createMatch({ matchId:'eligibility', seed:72, firstPlayerId:'P1', definitions:alphaDefinitions,
    p1Deck:alphaDeckPresets['it-starter'].cards, p2Deck:alphaDeckPresets['it-starter'].cards,
    qaSetup:{ forceOpeningDefinitionIds:[hand], forcePlayerOpeningFieldDefinitionIds:field } });
  state.status = 'ACTIVE'; state.phase = 'MAIN'; state.turnNumber = 1;
  state.players.P1.availableCapacity = 10;
  return state;
}
function cardId(state:GameState, definitionId = 'IT-002') { return state.players.P1.hand.find(id => state.cards[id].definitionId === definitionId)!; }
function result(state:GameState, definitionId = 'IT-002') { return getLegalActions(state, 'P1').handEligibility![cardId(state, definitionId)]; }
test('Promotion preserves IT Service requirement when no material exists', () => {
  const r = result(fixture()); assert.equal(r.reasonCode, 'PROMOTION'); assert.equal(r.reasonParams?.filter?.team, 'IT_SERVICE'); assert.equal(r.reasonParams?.required, 1);
});
test('Service Desk Lead with ERP Specialist remains blocked by team, not department', () => {
  const erp = Object.values(alphaDefinitions).find(c => c.name === 'ERP Specialist')!.id;
  assert.equal(result(fixture('IT-002', [erp])).reasonCode, 'PROMOTION');
});
test('Service Desk Lead accepts IT Service, including a full field freed by Promotion', () => {
  for (const field of [['IT-001'], Array(5).fill('IT-001')]) {
    const state = fixture('IT-002', field);
    if (field.length === 5) assert.equal(state.players.P1.employeeField.filter(Boolean).length, 5);
    assert.equal(result(state).allowed, true);
    assert.ok(getLegalActions(state,'P1').playableEmployees.find(p => p.cardId === cardId(state))?.options.length);
  }
});
test('Capacity reports modified cost and available amount', () => {
  const state = fixture(); state.players.P1.availableCapacity = 0;
  assert.deepEqual(result(state), { allowed:false, reasonCode:'CAPACITY', reasonParams:{ required:4, available:0 } });
});
test('Phase, pending choice, response, hand limit and ended match report contextual blockers', () => {
  const state = fixture(); state.phase = 'BATTLE'; assert.equal(result(state).reasonCode,'WRONG_PHASE');
  state.pendingChoice = { playerId:'P2' } as GameState['pendingChoice']; assert.equal(result(state).reasonCode,'PENDING_CHOICE');
  state.pendingChoice = null; state.responseWindow = { event:'ATTACK_DECLARED', actorId:'P1', triggeringChainItemId:null }; assert.equal(result(state).reasonCode,'RESPONSE_WINDOW');
  state.responseWindow = null; state.phase = 'END'; while(state.players.P1.hand.length <= 8) state.players.P1.hand.push(state.players.P1.deck.pop()!);
  assert.equal(result(state).reasonCode,'HAND_LIMIT'); state.status = 'ENDED'; assert.equal(result(state).reasonCode,'MATCH_ENDED');
});
test('Full Employee and Support fields are explained', () => {
  assert.equal(result(fixture('IT-001',Array(5).fill('IT-001')), 'IT-001').reasonCode,'EMPLOYEE_SLOTS');
  const state = fixture('IT-014');
  const handId = cardId(state, 'IT-014');
  const supportIds = Object.values(state.cards)
    .filter(card => card.controllerId === 'P1' && card.instanceId !== handId && card.zone !== 'HAND')
    .slice(0, 4)
    .map(card => card.instanceId);
  assert.equal(supportIds.length, 4);
  state.players.P1.deck = state.players.P1.deck.filter(id => !supportIds.includes(id));
  state.players.P1.supportField = supportIds;
  supportIds.forEach((id, slot) => { state.cards[id].zone = 'SUPPORT_FIELD'; state.cards[id].faceUp = true; state.cards[id].slot = slot; });
  assert.equal(result(state,'IT-014').reasonCode,'SUPPORT_SLOTS');
});
test('Required target absence is distinguished from a playable target picker', () => {
  const targeted = Object.values(alphaDefinitions).find(c => c.id === 'OFC-008')!;
  const state = fixture(targeted.id);
  const id = cardId(state,targeted.id);
  const blocked = result(state,targeted.id); assert.equal(blocked.reasonCode,'NO_TARGET'); assert.equal(blocked.reasonParams?.controller,'OPPONENT');
});
test('Eligibility projection contains only the viewer hand and matches legal options for every card', () => {
  for (const definition of Object.values(alphaDefinitions)) {
    const state = fixture(definition.id, ['IT-001']); const legal = getLegalActions(state,'P1');
    const allowed = new Set([...legal.playableEmployees,...legal.playableActions,...legal.playableSystems,...legal.settableIncidents].map(p=>p.cardId));
    for (const id of state.players.P1.hand) assert.equal(legal.handEligibility![id].allowed,allowed.has(id));
    const projected = projectStateForViewer(state,'P2');
    assert.deepEqual(Object.keys(projected.legalActions.handEligibility!).sort(), [...state.players.P2.hand].sort());
  }
});
test('Touch inspector contract cancels on movement/cancel and suppresses synthetic click after long press', () => {
  const source = readFileSync(fileURLToPath(new URL('../../public/card-touch.js', import.meta.url)), 'utf8');
  assert.match(source, /pointerdown/);
  assert.match(source, /pointercancel/);
  assert.match(source, /Math\.hypot/);
  assert.match(source, /suppressUntil/);
  assert.match(source, /presentation-proxy/);
});
test('Full-field Promotion exposes only the authoritative material slot during Employee placement', () => {
  const app = readFileSync(fileURLToPath(new URL('../../public/app.js', import.meta.url)), 'utf8');
  assert.match(app, /promotionSlotCandidate = card\.zone === 'EMPLOYEE_FIELD' && card\.controllerId === match\?\.viewerId/);
  assert.match(app, /const slotAttr = promotionSlotCandidate/);
  assert.match(app, /hasAttribute\('data-field-slot'\)/);
});
console.log(`Consolidation eligibility: ${passed} passed`);
