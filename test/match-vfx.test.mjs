import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createFeedbackQueue, feedbackForEvent } from '../public/match-vfx.js';

const played = (seq, id = 'employee') => ({ seq, type:'CARD_PLAYED', cardInstanceId:id, playerId:'P1', data:{cardType:'EMPLOYEE'} });
test('hydration, duplicate delivery and truncated historical replay never restart VFX', () => {
  const queue = createFeedbackQueue();
  queue.enqueue([played(20)], {roomId:'one',present:false,now:0});
  assert.deepEqual(queue.drain(0), []);
  queue.enqueue([played(19),played(20),played(21),played(21)], {roomId:'one',now:10});
  assert.equal(queue.drain(10).length, 1);
  queue.enqueue([played(21)], {roomId:'one',now:20});
  assert.deepEqual(queue.drain(20), []);
  queue.enqueue([played(1)], {roomId:'two',now:30});
  assert.equal(queue.drain(30).length, 1, 'new rooms may reuse sequence numbers');
});
test('bursts coalesce per surface, remain bounded and expire rather than playing late', () => {
  const queue = createFeedbackQueue();
  queue.enqueue([played(1),played(2)], {roomId:'one',now:0});
  assert.deepEqual(queue.drain(0).map(cue=>cue.seq), [2]);
  queue.enqueue(Array.from({length:100},(_,i)=>played(i+3,`card-${i}`)), {roomId:'one',now:0});
  assert.equal(queue.drain(0).length, 16);
  queue.enqueue([played(103)], {roomId:'one',now:0});
  assert.deepEqual(queue.drain(1300), []);
});
test('attack direction and reputation damage use server targets and deltas for either seat', () => {
  for (const [attacker,defender] of [['P1','P2'],['P2','P1']]) {
    const cues = feedbackForEvent({seq:1,type:'ATTACK_DECLARED',playerId:attacker,cardInstanceId:'source',data:{targetId:null}});
    assert.deepEqual(cues[1].target, {type:'player',id:defender});
    const damage = feedbackForEvent({seq:2,type:'REPUTATION_CHANGED',playerId:defender,data:{delta:-3}});
    assert.equal(damage[0].amount, -3);
    assert.equal(damage[0].kind, 'damage');
  }
  assert.deepEqual(feedbackForEvent({seq:3,type:'REPUTATION_CHANGED',data:{delta:0}}), []);
  assert.deepEqual(feedbackForEvent({seq:4,type:'BREAKTHROUGH_DAMAGE',data:{excessPower:3}}), [], 'REP change is the single damage cue');
});
test('only a confirmed archive creates a send-off; prevented destruction never does', () => {
  const saved = feedbackForEvent({seq:1,type:'DESTRUCTION_PREVENTED',cardInstanceId:'employee'});
  assert.deepEqual(saved.map(cue=>cue.kind), ['confirm']);
  assert.deepEqual(feedbackForEvent({seq:2,type:'EMPLOYEE_DESTROYED',cardInstanceId:'employee'}), []);
  const archived = feedbackForEvent({seq:3,type:'CARD_ARCHIVED',playerId:'P2',cardInstanceId:'employee'});
  assert.deepEqual(archived.map(cue=>cue.kind), ['archive','receive']);
  assert.deepEqual(archived[1].target, {type:'archive',id:'P2'});
});
test('redirected attacks retire the old travel cue and identify the server-selected target', () => {
  const queue = createFeedbackQueue();
  queue.enqueue([
    {seq:1,type:'ATTACK_DECLARED',cardInstanceId:'attacker',playerId:'P1',data:{targetId:'old'}},
    {seq:2,type:'ATTACK_TARGET_REDIRECTED',cardInstanceId:'redirect-source',data:{oldTargetId:'old',newTargetId:'new'}}
  ], {roomId:'one',now:0});
  const cues = queue.drain(0);
  assert.ok(!cues.some(cue=>cue.kind === 'travel'));
  assert.deepEqual(cues.find(cue=>cue.kind === 'redirect').target, {type:'field',id:'new'});
});
test('resolved, negated and set feedback carry no hidden card definitions', () => {
  const event = {seq:1,type:'ACTION_RESOLVED',playerId:'P1',cardInstanceId:'action',data:{negated:true}};
  assert.equal(feedbackForEvent(event)[0].kind, 'denied');
  assert.equal(feedbackForEvent({...event,data:{}})[0].kind, 'resolve');
  assert.deepEqual(feedbackForEvent({...event,type:'INCIDENT_SET'}).map(cue=>cue.kind), ['arrive']);
  assert.deepEqual(feedbackForEvent({...played(2),data:{cardType:'ACTION'}}), [], 'transient Actions do not pretend to land on the board');
});
