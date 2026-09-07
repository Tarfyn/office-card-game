import { strict as assert } from 'node:assert';

// Supply canonical combat HTML captured from renderCombatEvents and authoritative
// fixture events. Run on a fresh real Match DOM; no clock or animation mocking.
export async function verifyOutcomeDwell(page, {events,html,reduced=false,dense=false}) {
  await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
  const expected=await page.evaluate(async({events,html})=>{
    const {createMatchVfx,combatOutcomeDwell}=await import('/match-vfx.js');
    window.outcomeRun={steps:[],changes:[],proxyPeak:0};
    window.outcomeMatch={viewerId:'P1',turnNumber:1,activePlayerId:'P1',phase:'BATTLE',status:events.some(e=>e.type==='GAME_ENDED')?'ENDED':'ACTIVE'};
    window.outcomeEvents=events;
    window.outcomeVfx=createMatchVfx({archiveLabel:()=> 'ARCHIVED',captureCombat:()=>html,
      onStep:(entry,s)=>{
        outcomeRun.steps.push({type:s.type,at:performance.now(),key:entry.key});
        if(s.type==='impact' && ['combat','direct'].includes(entry.type)) outcomeRun.expected=combatOutcomeDwell(entry,matchMedia('(prefers-reduced-motion: reduce)').matches);
      },onCombat:entry=>{
        const old=document.querySelector('#combatPresentationHost');
        if(entry&&old?.dataset.presentationKey===entry.key || !entry&&!old) return;
        outcomeRun.changes.push({visible:!!entry,at:performance.now()});old?.remove();
        if(entry) {const n=document.createElement('div');n.id='combatPresentationHost';n.className='combat-presentation-host queued-combat';n.dataset.presentationKey=entry.key;n.innerHTML=entry.html;document.body.appendChild(n);}
      }});
    outcomeVfx.enqueue(events,{roomId:'outcome',present:true,match:outcomeMatch});
    for(const e of events.filter(e=>e.type==='CARD_ARCHIVED'))document.querySelector(`.board-lane [data-card-ref="${CSS.escape(e.cardInstanceId)}"]`)?.remove();
    outcomeVfx.sync(outcomeMatch);
    return events.some(e=>e.type==='GAME_ENDED');
  },{events,html});
  await page.waitForFunction(()=>document.querySelector('#combatPresentationHost'),{},{timeout:3000});
  const visible=await page.evaluate(()=>{
    const n=document.querySelector('#combatPresentationHost');window.outcomeSaved=n;
    outcomeVfx.enqueue(outcomeEvents,{roomId:'outcome',present:true,match:outcomeMatch});outcomeVfx.sync(outcomeMatch);
    return {same:n===document.querySelector('#combatPresentationHost'),pointer:getComputedStyle(n.querySelector('.battle-resolution-overlay')).pointerEvents,
      winners:n.querySelectorAll('.winner').length,losers:n.querySelectorAll('.archived').length,draw:n.querySelector('.battle-vs')?.textContent};
  });
  assert.ok(visible.same);assert.equal(visible.pointer,'none');
  await page.waitForFunction(()=>!outcomeVfx.busy,{},{timeout:4000});
  const idle=await page.evaluate(()=>({residual:!!document.querySelector('#combatPresentationHost'),proxies:outcomeVfx.diagnostics.proxies}));
  assert.equal(idle.proxies,0);
  if(!expected && !events.some(e=>e.type==='CARD_ARCHIVED')) assert.ok(idle.residual,'nonlethal outcome outlives blocking direct sequence');
  if(idle.residual) {
    const next=await page.evaluate(dense=>{
      const host=document.querySelector('#combatPresentationHost'),seq=Math.max(...outcomeEvents.map(e=>e.seq))+1;
      const events=dense ? Array.from({length:8},(_,i)=>({seq:seq+i,type:'CARD_ARCHIVED',playerId:'P2',cardInstanceId:`dense-${i}`,data:{causeSourceId:`effect-${i}`}}))
        : [{seq,type:'REPUTATION_CHANGED',playerId:'P2',data:{delta:-1}}];
      outcomeVfx.enqueue(events,{roomId:'outcome',present:true,match:outcomeMatch});outcomeVfx.sync(outcomeMatch);
      return {same:host===document.querySelector('#combatPresentationHost'),started:outcomeRun.steps.at(-1).type};
    },dense);
    assert.ok(next.same,'a new lightweight entry or catch-up receipt must not erase the critical prior result');
    assert.equal(next.started,dense?'summary':'impact','residual does not delay the next queue entry');
  }
  await page.waitForFunction(()=>!document.querySelector('#combatPresentationHost'),{},{timeout:2000});
  const trace=await page.evaluate(()=>outcomeRun);
  assert.equal(trace.changes.length,2,'rerender does not restart the outcome');
  assert.ok(trace.changes[1].at-trace.changes[0].at>=trace.expected-25,'visible result lasts its semantic dwell');
  const impact=trace.steps.find(s=>s.type==='impact').at,archive=trace.steps.find(s=>s.type==='archive')?.at;
  if(archive) assert.ok(archive<trace.changes[1].at,'Archive overlaps outcome; no new serial delay');
  await page.evaluate(()=>{outcomeVfx.enqueue(outcomeEvents,{roomId:'outcome',present:false,match:outcomeMatch});outcomeVfx.enqueue(outcomeEvents,{roomId:'outcome',present:true,match:outcomeMatch});outcomeVfx.sync(outcomeMatch);});
  assert.equal(await page.locator('#combatPresentationHost').count(),0,'history cannot replay outcome');
  await page.evaluate(()=>outcomeVfx.reset());
  assert.equal(await page.locator('.presentation-proxy,.vfx-signature,.match-vfx,#combatPresentationHost').count(),0);
  return {visible,impact,outcomeStart:trace.changes[0].at,outcomeEnd:trace.changes[1].at,archive,expected:trace.expected,idle};
}

export async function verifyOutcomeStamps(page) {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(async()=>{
    const {createMatchVfx}=await import('/match-vfx.js');
    const source=document.querySelector('.own-hand > .card'),id=source.dataset.cardRef;
    window.stampVfx=createMatchVfx({archiveLabel:()=> 'ARCHIVED'});
    const match={viewerId:'P1',turnNumber:1,activePlayerId:'P1',phase:'MAIN',status:'ACTIVE'};
    stampVfx.enqueue([{seq:1,type:'ACTION_RESOLVED',cardInstanceId:id,playerId:'P1',data:{negated:true}},
      {seq:2,type:'CARD_ARCHIVED',cardInstanceId:id,playerId:'P1'}],{roomId:'stamp',present:true,match});
    source.remove();stampVfx.sync(match);
  });
  const rejection=await page.locator('.vfx-denied .vfx-mark').evaluate(n=>{
    const a=n.getAnimations()[0],duration=a.effect.getTiming().duration;a.pause();a.currentTime=duration*.8;
    return {duration,opacity:Number(getComputedStyle(n).opacity)};
  });
  await page.waitForFunction(()=>document.querySelector('.vfx-archive > b'),{},{timeout:2000});
  const archive=await page.locator('.vfx-archive > b').evaluate(n=>{
    const a=n.getAnimations()[0],duration=a.effect.getTiming().duration;a.pause();a.currentTime=duration*.8;
    return {duration,opacity:Number(getComputedStyle(n).opacity),travel:document.querySelector('.presentation-proxy')?.getAnimations()[0].effect.getTiming().duration};
  });
  assert.ok(rejection.opacity>.8&&archive.opacity>.8);
  assert.equal(rejection.duration,600);assert.equal(archive.duration,600);assert.equal(archive.travel,620);
  await page.waitForFunction(()=>!stampVfx.busy);
  await page.evaluate(()=>stampVfx.reset());
  assert.equal(await page.locator('.match-vfx,.presentation-proxy').count(),0);
  return {rejection,archive};
}
