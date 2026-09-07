import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createFeedbackQueue, feedbackForEvent, createPresentationQueue, presentationSteps, physicalPath } from '../public/match-vfx.js';
import { VFX_TIMING, VFX_EASING, installVfxTiming } from '../public/vfx-timing.js';
import { DEPARTMENT_MODIFIERS, SIGNATURE_LIMITS, signaturePreset, signatureForStep, visibleSignatureMetadata, lethalOutcome } from '../public/vfx-signatures.js';

test('Phase 3 classification stays unchanged while motion and queue waits have separate timings',()=>{
  assert.equal(signatureForStep({type:'placement',events:[],payload:{}},'settle',null),null);
  assert.equal(signatureForStep({type:'action',events:[{type:'ACTION_RESOLVED'}],payload:{}},'resolve',null),null);
  assert.deepEqual(feedbackForEvent({type:'POWER_MODIFIED',data:{amount:2}}),[]);
  assert.deepEqual([VFX_TIMING.cardTravel,VFX_TIMING.supportTravel,VFX_TIMING.placementSettle,VFX_TIMING.actionStage,VFX_TIMING.actionResolve,VFX_TIMING.archiveTravel,VFX_TIMING.attackCommit,VFX_TIMING.impactHold,VFX_TIMING.repHold,VFX_TIMING.repCue,VFX_TIMING.lethalHold,VFX_TIMING.queueBudget,VFX_TIMING.catchUpAge],
    [560,520,80,420,200,620,480,240,260,950,140,2900,1600]);
});
test('Executive signature uses canonical visible variant metadata, never rarity or DOM classes',()=>{
  const def={id:'N-002',department:'NEUTRAL'};
  const standard=visibleSignatureMetadata({definitionId:'N-002',variantId:null},def);
  const executive=visibleSignatureMetadata({definitionId:'N-002',variantId:'N-002-EXEC'},def);
  assert.equal(signaturePreset('executive',standard),null);
  assert.equal(signaturePreset('executive',executive).level,'HERO');
  assert.equal(visibleSignatureMetadata({variantId:'N-002-EXEC'},def),null,'hidden identity must not be reconstructed');
  assert.equal(visibleSignatureMetadata({definitionId:'N-003',variantId:'N-002-EXEC'},def),null);
});
test('department composition is deterministic and distinguishes every department without card-specific presets',()=>{
  for(const [department,modifier] of Object.entries(DEPARTMENT_MODIFIERS)) {
    assert.equal(signaturePreset('resolve',{department}).modifier,modifier);
    assert.equal(signaturePreset('negate',{department}).modifier,modifier);
  }
  assert.equal(new Set(Object.values(DEPARTMENT_MODIFIERS)).size,6);
  assert.equal(signaturePreset('resolve',{department:'UNKNOWN'}).modifier,'paperwork');
});
test('only authoritative reputation-zero match end enables lethal Hero; no result wait is added',()=>{
  assert.equal(lethalOutcome([{type:'GAME_ENDED',data:{reason:'TUTORIAL_COMPLETE'}}]),null);
  assert.equal(lethalOutcome([{type:'REPUTATION_CHANGED',data:{after:1}}]),null);
  const events=[{seq:1,type:'ATTACK_DECLARED',playerId:'P1',cardInstanceId:'a',data:{}},{seq:2,type:'REPUTATION_CHANGED',playerId:'P2',data:{reason:'DIRECT_ATTACK',after:0,delta:-1}},{seq:3,type:'GAME_ENDED',playerId:'P1',data:{reason:'REPUTATION_ZERO'}}];
  const q=createPresentationQueue();q.enqueue(events,{roomId:'hero',now:0});const direct=q.take(0);
  assert.deepEqual(direct.payload.lethal,{seq:3,playerId:'P2'});
  q.complete(direct.key);const result=q.take(700);
  assert.equal(direct.steps.reduce((n,s)=>n+s.duration,0)+result.steps[0].duration,920);
  q.complete(result.key);q.enqueue(events,{roomId:'hero',now:1000});assert.equal(q.busy,false);
});
test('Hero hydration and room watermark prevent historical replay after reload or takeover',()=>{
  const event={seq:20,type:'GAME_ENDED',playerId:'P1',data:{reason:'REPUTATION_ZERO'}};
  const q=createPresentationQueue();q.enqueue([event],{roomId:'hero',present:false});
  q.enqueue([event],{roomId:'hero',present:true});assert.equal(q.busy,false);
});
test('dense catch-up retains critical lethal metadata and static Hero fallback',()=>{
  const q=createPresentationQueue();const events=Array.from({length:8},(_,i)=>({seq:i+1,type:'CARD_ARCHIVED',playerId:'P2',cardInstanceId:'b'+i,data:{causeSourceId:'effect'+i}}));
  events.push({seq:9,type:'GAME_ENDED',playerId:'P1',data:{reason:'REPUTATION_ZERO'}});
  q.enqueue(events,{roomId:'hero',now:0});const summary=q.take(0);q.complete(summary.key);
  assert.equal(summary.type,'summary');assert.equal(summary.payload.archivedCount,8);assert.ok(summary.payload.lethal);
  assert.equal(q.take(620),null);
  const preset=signaturePreset('lethal',null,{staticFeedback:true});
  assert.equal(preset.level,'HERO');assert.equal(preset.particles,0);assert.equal(preset.static,true);
});
test('important resolution, rejection and shared multi-Archive scope use ENGINE hierarchy',()=>{
  const event={type:'ACTION_RESOLVED',data:{negated:true}};
  assert.equal(signatureForStep({type:'action',events:[event],payload:{}},'resolve',null).kind,'negate');
  const multi={type:'action',events:[],payload:{cardId:'a',archived:[{cardInstanceId:'b'},{cardInstanceId:'c'}]}};
  assert.equal(signatureForStep(multi,'resolve',null).kind,'resolve');
  assert.equal(signatureForStep({...multi,type:'combat'},'archive',null).kind,'scope');
  assert.equal(signaturePreset('delay',null).level,'ENGINE');
  assert.ok(signaturePreset('resolve',null).particles<signaturePreset('lethal',null).particles);
  assert.equal(SIGNATURE_LIMITS.particles,24);assert.equal(SIGNATURE_LIMITS.roots,3);
});

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

const attack=(seq,id='a',target='b')=>({seq,type:'ATTACK_DECLARED',cardInstanceId:id,playerId:'P1',data:{targetId:target}});
const archived=(seq,id='b',cause='a')=>({seq,type:'CARD_ARCHIVED',playerId:'P2',cardInstanceId:id,data:{fromZone:'EMPLOYEE_FIELD',causeSourceId:cause}});
const battle=(seq,id='a',target='b')=>({seq,type:'BATTLE_RESOLVED',playerId:'P1',cardInstanceId:id,data:{attackerId:id,targetId:target,destroyedIds:[target],winnerId:id}});
const names=e=>e.steps.map(s=>s.type);
const options={roomId:'room',now:0};

const total=e=>e.steps.reduce((sum,s)=>sum+s.duration,0);
test('slower motion reallocates serial outcome/return waits instead of increasing lethal gating',()=>{
  const q=createPresentationQueue();q.enqueue([attack(1),archived(2),battle(3)],options);
  const e=q.take(0),steps=e.steps;
  assert.ok(steps.find(s=>s.type==='archive').duration>420);
  assert.ok(steps.find(s=>s.type==='outcome').duration<=80,'Archive departs promptly after the visible impact/outcome envelope');
  assert.equal(steps.find(s=>s.type==='return').duration,0,'return overlaps confirmed impact/Archive');
  assert.ok(total(e)<=1430,'normal battle has no additional queue backlog');
});
test('residual lifetimes are not charged to critical presentation or catch-up budget',()=>{
  const q=createPresentationQueue();q.enqueue([played(1)],options);const entry=q.take(0);
  assert.ok(VFX_TIMING.executiveResidual>=800);
  assert.ok(VFX_TIMING.executiveResidual>total(entry));
  assert.equal(total(entry),VFX_TIMING.cardTravel+VFX_TIMING.placementSettle);
  assert.equal(VFX_TIMING.queueBudget,2900);assert.equal(VFX_TIMING.catchUpAge,1600);
});
test('entry capture and initial travel have no planned pre-motion wait',()=>{
  const q=createPresentationQueue();let prepared=false;
  q.enqueue([played(1)],{...options,prepare:()=>{prepared=true;}});
  assert.ok(prepared);const e=q.take(0);assert.equal(e.startedAt,0);
  assert.equal(e.steps[0].type,'travel');assert.equal(e.catchUp,false);
});
test('open response windows still return an attacker without inventing an impact',()=>{
  const q=createPresentationQueue();q.enqueue([attack(1)],options);const e=q.take(0);
  assert.equal(e.type,'attack');assert.deepEqual(names(e),['commit','return']);
  assert.equal(e.steps[1].duration,VFX_TIMING.attackerReturn);
});
test('Tutorial and isolated result presentation keep the prior fallback timing',()=>{
  for(const reason of ['TUTORIAL_COMPLETE','REPUTATION_ZERO']) {
    const q=createPresentationQueue();q.enqueue([{seq:1,type:'GAME_ENDED',playerId:'P1',data:{reason}}],options);
    assert.equal(q.take(0).steps[0].duration,220);
  }
});
test('reduced motion does not inherit the longer impact/travel envelope',()=>{
  const q=createPresentationQueue();q.enqueue([attack(1),archived(2),battle(3)],options);
  const e=q.take(0),steps=presentationSteps(e,{reducedMotion:true});
  assert.equal(steps.find(s=>s.type==='commit').duration,0);
  assert.ok(steps.find(s=>s.type==='impactHold').duration<=150);
  assert.equal(steps.find(s=>s.type==='archive').duration,VFX_TIMING.staticArchive);
  assert.ok(steps.reduce((n,s)=>n+s.duration,0)<500);
});
test('semantic timing owner supplies CSS and readable placement/Archive ranges',()=>{
  const css=new Map();installVfxTiming({setProperty:(k,v)=>css.set(k,v)});
  assert.equal(Number(css.get('--vfx-time-card-travel')),VFX_TIMING.cardTravel);
  assert.equal(Number(css.get('--vfx-time-archive-travel')),VFX_TIMING.archiveTravel);
  assert.equal(css.get('--vfx-ease'),VFX_EASING.feedback);
  assert.ok(Object.isFrozen(VFX_TIMING));
  for(const type of ['EMPLOYEE','SYSTEM','INCIDENT']) {
    const q=createPresentationQueue();q.enqueue([{...played(1),type:type==='INCIDENT'?'INCIDENT_SET':'CARD_PLAYED',data:{cardType:type}}],options);
    const travel=q.take(0).steps[0].duration;
    assert.equal(travel,type==='EMPLOYEE'?VFX_TIMING.cardTravel:VFX_TIMING.supportTravel);
    assert.ok(travel>=450 && travel<=650);
  }
  const q=createPresentationQueue();q.enqueue([archived(1)],options);
  const travel=q.take(0).steps.find(s=>s.type==='archive').duration;
  assert.equal(travel,VFX_TIMING.archiveTravel);assert.ok(travel>=550&&travel<=750);
});
test('ordinary combat retains full anticipation, impact hold and recovery without catch-up',()=>{
  const q=createPresentationQueue();q.enqueue([attack(1),archived(2),battle(3)],options);
  const item=q.take(0);assert.equal(item.type,'combat');assert.equal(item.catchUp,false);
  const steps=presentationSteps(item);
  const hold=steps.find(s=>s.type==='impactHold');
  assert.ok(hold.critical && hold.duration>=220 && hold.duration<=320);
  assert.ok(names(item).indexOf('impact')<names(item).indexOf('impactHold'));
  assert.ok(names(item).indexOf('impactHold')<names(item).indexOf('outcome'));
  assert.ok(total(item)<1600);assert.ok(steps.every(s=>!s.static));
});
test('two normal battles fit the budget and the second does not age into compression',()=>{
  const q=createPresentationQueue();q.enqueue([attack(1),archived(2),battle(3),attack(4,'c','d'),archived(5,'d','c'),battle(6,'c','d')],options);
  const first=q.take(0);assert.equal(first.type,'combat');q.complete(first.key);
  const second=q.take(total(first));assert.equal(second.type,'combat');assert.equal(second.catchUp,false);
  assert.ok(total(first)+total(second)<=VFX_TIMING.queueBudget);
});
test('ordinary Action retains a separate stage, resolve hold and physical Archive',()=>{
  const q=createPresentationQueue();q.enqueue([{...played(1,'action'),data:{cardType:'ACTION'}},
    {seq:2,type:'ACTION_RESOLVED',playerId:'P1',cardInstanceId:'action'},archived(3,'action','action')],options);
  const item=q.take(0);assert.equal(item.type,'action');assert.equal(item.catchUp,false);
  assert.deepEqual(item.steps.map(s=>s.duration),[VFX_TIMING.actionStage,VFX_TIMING.actionResolve,VFX_TIMING.archiveTravel]);
  assert.ok(item.steps.find(s=>s.type==='resolve').duration>=120);
  assert.ok(total(item)<=1300);
});
test('direct REP holds signed feedback before a short lethal confirmation, without a second outcome flash',()=>{
  const q=createPresentationQueue();q.enqueue([attack(1,'a',null),{seq:2,type:'REPUTATION_CHANGED',playerId:'P2',data:{reason:'DIRECT_ATTACK',delta:-20}},{seq:3,type:'GAME_ENDED'}],options);
  const direct=q.take(0);assert.equal(direct.type,'direct');
  assert.equal(direct.steps.find(s=>s.type==='impactHold').duration,VFX_TIMING.repHold);
  assert.equal(feedbackForEvent(direct.events.find(e=>e.type==='REPUTATION_CHANGED'))[0].amount,-20);
  q.complete(direct.key);const result=q.take(total(direct));
  assert.equal(result.type,'result');assert.ok(result.steps[0].critical);
  const finalBeat=total(direct)+total(result);assert.ok(finalBeat>=700&&finalBeat<=1000);
  assert.ok(VFX_TIMING.repCue>VFX_TIMING.repHold);
});
test('reduced-motion and aged catch-up omit spatial timing but retain readable critical holds',()=>{
  const q=createPresentationQueue();q.enqueue([attack(1),archived(2),battle(3)],options);
  const item=q.take(VFX_TIMING.catchUpAge+1);assert.equal(item.catchUp,true);
  for(const mode of [{reducedMotion:true},{catchUp:true}]) {
    const steps=presentationSteps(item,mode);
    assert.ok(steps.filter(s=>['commit','return'].includes(s.type)).every(s=>s.duration===0));
    assert.ok(steps.filter(s=>s.critical).every(s=>s.duration>0));
  }
  const reduced=presentationSteps(item,{reducedMotion:true});
  assert.ok(reduced.find(s=>s.type==='archive').duration<VFX_TIMING.archiveTravel);
  assert.ok(reduced.reduce((sum,s)=>sum+s.duration,0)<800);
});

test('one authoritative hand play creates one physical request despite duplicate SSE/rerenders',()=>{
  const q=createPresentationQueue(); let captures=0;
  q.enqueue([played(1),played(1)],{...options,prepare:()=>captures++});
  q.enqueue([played(1)],{...options,prepare:()=>captures++});
  assert.equal(captures,1);assert.equal(q.size,1);
  const item=q.take(0);assert.equal(item.type,'placement');assert.deepEqual(names(item),['travel','settle']);
  q.complete(item.key);assert.equal(q.busy,false);
  q.enqueue([played(1)],options);assert.equal(q.busy,false);
});

test('confirmed combat groups travel, impact, outcome and archive even though Archive is emitted first',()=>{
  const q=createPresentationQueue();q.enqueue([battle(4),archived(3),attack(1)],options);
  const item=q.take(0);
  assert.equal(item.type,'combat');assert.deepEqual(names(item),['commit','impact','impactHold','outcome','archive','return']);
  assert.deepEqual(item.payload.destroyedIds,['b']);assert.equal(item.payload.archived.length,1);
  assert.equal(q.take(10),null,'a second group cannot start in the middle of an outcome');
  q.complete('wrong-key');assert.equal(q.busy,true);q.complete(item.key);assert.equal(q.busy,false);
});

test('direct lethal keeps attack and signed REP ahead of the result gate',()=>{
  const q=createPresentationQueue();q.enqueue([attack(1,'a',null),{seq:2,type:'REPUTATION_CHANGED',playerId:'P2',data:{reason:'DIRECT_ATTACK',delta:-20}},{seq:3,type:'GAME_ENDED'}],options);
  const direct=q.take(0);assert.equal(direct.type,'direct');assert.deepEqual(names(direct),['commit','impact','impactHold','return']);
  assert.equal(direct.events.find(e=>e.type==='REPUTATION_CHANGED').data.delta,-20);
  q.complete(direct.key);assert.equal(q.take(1000).type,'result');
});

test('two rapid battles preserve exact attack pairing and serial event order',()=>{
  const q=createPresentationQueue();q.enqueue([attack(1,'a','b'),archived(2,'b'),battle(3,'a','b'),attack(4,'a','c'),archived(5,'c'),battle(6,'a','c')],options);
  const first=q.take(0);assert.equal(first.type,'combat');assert.equal(first.payload.attack.seq,1);assert.equal(first.payload.targetId,'b');
  q.complete(first.key);const second=q.take(1200);assert.equal(second.type,'combat');assert.equal(second.payload.attack.seq,4);assert.equal(second.payload.targetId,'c');
  assert.notEqual(first.key,second.key);
});

test('response-window split resolves an attack once without a second commit',()=>{
  const q=createPresentationQueue();q.enqueue([attack(1)],options);const first=q.take(0);q.complete(first.key);
  q.enqueue([archived(5),battle(6)],{...options,now:2000});const result=q.take(2000);
  assert.equal(result.payload.attack.seq,1);assert.deepEqual(names(result),['impact','impactHold','outcome','archive','return']);
});

test('an Action and its actual destruction/archive outcomes form one ordered group',()=>{
  const q=createPresentationQueue();q.enqueue([
    {seq:1,type:'CARD_PLAYED',cardInstanceId:'action',playerId:'P1',data:{cardType:'ACTION'}},
    archived(2,'one','action'),archived(3,'two','action'),
    {seq:4,type:'ACTION_RESOLVED',cardInstanceId:'action',playerId:'P1'},archived(5,'action')
  ],options);
  const result=q.take(0);assert.equal(result.type,'action');assert.deepEqual(names(result),['travel','resolve','archive']);
  assert.deepEqual(result.payload.archived.map(e=>e.cardInstanceId),['one','two','action']);
});

test('catch-up has bounded storage while retaining critical totals and match completion',()=>{
  const q=createPresentationQueue();const events=[];
  for(let i=0;i<30;i++) events.push(attack(i*4+1,`a${i}`,`b${i}`),archived(i*4+2,`b${i}`,`a${i}`),battle(i*4+3,`a${i}`,`b${i}`));
  events.push({seq:130,type:'REPUTATION_CHANGED',playerId:'P2',data:{delta:-9}},{seq:131,type:'GAME_ENDED'});
  q.enqueue(events,options);assert.ok(q.size<=6);const result=q.take(0);
  assert.equal(result.type,'summary');assert.equal(result.payload.battles,30);assert.equal(result.payload.archivedCount,30);
  assert.equal(result.payload.archived.length,30);assert.equal(result.payload.damage.P2,-9);assert.equal(result.payload.result,true);
  assert.ok(result.maxDuration<1000);
  q.complete(result.key);assert.equal(q.busy,false);
});

test('history hydration, room boundaries and takeover replay keep a monotonic watermark',()=>{
  const q=createPresentationQueue();q.enqueue([played(99)],{...options,present:false});
  q.enqueue([played(2),played(99)],options);assert.equal(q.busy,false);
  q.enqueue([played(100)],options);const live=q.take(0);q.complete(live.key);
  q.enqueue([played(100)],options);assert.equal(q.busy,false);
  q.enqueue([played(1)],{...options,roomId:'new'});assert.equal(q.size,1);
});

test('reduced motion skips spatial steps but retains ordered impact, outcome and Archive feedback',()=>{
  const q=createPresentationQueue();q.enqueue([attack(1),archived(2),battle(3)],options);
  const steps=presentationSteps(q.take(0),{reducedMotion:true});
  assert.equal(steps.find(s=>s.type==='commit').duration,0);
  assert.equal(steps.find(s=>s.type==='return').duration,0);
  for(const name of ['impact','outcome','archive']) assert.ok(steps.find(s=>s.type===name).duration>0);
  assert.ok(steps.every(s=>s.static));
});

test('viewport paths follow either opponent orientation and scale without hardcoded coordinates',()=>{
  const own={left:400,top:700,width:100,height:140,angle:3},opp={left:400,top:180,width:200,height:280,angle:0};
  const up=physicalPath(own,opp,{commit:true}),down=physicalPath(opp,own,{commit:true});
  assert.ok(up.top<own.top);assert.ok(down.top>opp.top);assert.equal(up.angle,3);assert.equal(down.angle,0);
  assert.deepEqual(physicalPath(own,opp),opp);assert.equal(physicalPath(null,opp),null);
  assert.ok(Math.abs(up.top-own.top)<=own.height*.55);
});

test('a field move and its play event share one arrival owner',()=>{
  const q=createPresentationQueue();
  const result=q.enqueue([{seq:1,type:'CARD_MOVED',cardInstanceId:'employee',data:{to:'EMPLOYEE_FIELD'}},played(2)],options);
  assert.deepEqual([...result.used].sort(),[1,2]);
  assert.equal(q.size,1);assert.deepEqual(names(q.take(0)),['travel','settle']);
});

test('catch-up preserves both damage and healing instead of cancelling the feedback',()=>{
  const q=createPresentationQueue();
  q.enqueue([...Array.from({length:8},(_,i)=>({seq:i+1,type:'ACTION_RESOLVED',playerId:'P1',cardInstanceId:`action${i}`})),
    {seq:9,type:'REPUTATION_CHANGED',playerId:'P2',data:{delta:-3}},
    {seq:10,type:'REPUTATION_CHANGED',playerId:'P2',data:{delta:3}}],options);
  const summary=q.take(0);assert.equal(summary.type,'summary');
  assert.deepEqual(summary.payload.repChanges.P2,{loss:-3,gain:3});
  assert.equal(summary.payload.resolutions,8);
});

test('redirects update a pending commit and history ingestion cannot restart it',()=>{
  const q=createPresentationQueue();q.enqueue([attack(1)],options);
  q.enqueue([{seq:2,type:'ATTACK_TARGET_REDIRECTED',data:{oldTargetId:'b',newTargetId:'c'}}],options);
  const commit=q.take(0);assert.equal(commit.payload.targetId,'c');q.complete(commit.key);
  q.enqueue([attack(1)],options);assert.equal(q.busy,false);
});

test('a wide destruction group uses one receipt without losing any Archive count',()=>{
  const q=createPresentationQueue();q.enqueue(Array.from({length:18},(_,i)=>archived(i+1,`removed${i}`,'wide-effect')),options);
  const receipt=q.take(0);assert.equal(receipt.type,'summary');
  assert.equal(receipt.payload.archivedCount,18);assert.equal(receipt.payload.archived.length,18);
  assert.deepEqual(receipt.payload.archivedByPlayer,{P1:0,P2:18});
  assert.deepEqual(names(receipt),['summary']);q.complete(receipt.key);assert.equal(q.busy,false);
});
