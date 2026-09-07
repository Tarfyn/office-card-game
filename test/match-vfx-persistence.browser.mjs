import {strict as assert} from 'node:assert';

export async function verifyStaticStamp(page) {
  await page.emulateMedia({reducedMotion:'reduce'});
  const initial=await page.evaluate(async()=>{
    const {createMatchVfx}=await import('/match-vfx.js');window.staticStampVfx=createMatchVfx({archiveLabel:()=> 'ARCHIVED'});
    const match={viewerId:'P1',phase:'MAIN',turnNumber:1,activePlayerId:'P1',status:'ACTIVE'},card=document.querySelector('.board-lane .card');
    staticStampVfx.enqueue([{seq:1,type:'CARD_ARCHIVED',cardInstanceId:card.dataset.cardRef,playerId:'P1'}],{roomId:'static-stamp',present:true,match});staticStampVfx.sync(match);
    return {life:Number(getComputedStyle(document.querySelector('.vfx-archive')).getPropertyValue('--vfx-life')),proxies:staticStampVfx.diagnostics.proxies};
  });
  assert.equal(initial.life,900);assert.equal(initial.proxies,0);
  await page.waitForTimeout(650);assert.equal(await page.locator('.vfx-archive').count(),1);
  assert.equal(await page.evaluate(()=>staticStampVfx.busy),false,'static visual lease never holds the queue');
  await page.waitForFunction(()=>!document.querySelector('.vfx-archive'),{},{timeout:1000});
  await page.evaluate(()=>staticStampVfx.reset());return initial;
}

export async function verifyDecorativeCatchUp(page,{events,html}) {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(({events,html})=>import('/match-vfx.js').then(({createMatchVfx})=>{
    window.tailMatch={viewerId:'P1',turnNumber:1,activePlayerId:'P1',phase:'BATTLE',status:'ACTIVE'};
    window.tailSteps=[];window.tailVfx=createMatchVfx({archiveLabel:()=> 'ARCHIVED',captureCombat:()=>html,
      onCombat:e=>{document.querySelector('#combatPresentationHost')?.remove();if(e){const n=document.createElement('div');n.id='combatPresentationHost';n.innerHTML=e.html;document.body.appendChild(n);}},
      onStep:(e,s)=>tailSteps.push({type:s.type,at:performance.now()})});
    tailVfx.enqueue(events,{roomId:'tail',present:true,match:tailMatch});tailVfx.sync(tailMatch);
  }),{events,html});
  await page.waitForFunction(()=>tailSteps.some(s=>s.type==='impact'),{},{timeout:2000});
  await page.waitForTimeout(600); // Beyond critical 550 ms, inside the 800 ms visual lease.
  assert.equal(await page.locator('#combatPresentationHost').count(),1);
  const result=await page.evaluate(seq=>{
    const events=Array.from({length:8},(_,i)=>({seq:seq+i,type:'CARD_ARCHIVED',playerId:'P2',cardInstanceId:`dense-${i}`,data:{causeSourceId:`effect-${i}`}}));
    const start=performance.now();tailVfx.enqueue(events,{roomId:'tail',present:true,match:tailMatch});tailVfx.sync(tailMatch);
    return {tail:!!document.querySelector('#combatPresentationHost'),step:tailSteps.at(-1).type,wait:tailSteps.at(-1).at-start};
  },Math.max(...events.map(e=>e.seq))+1);
  assert.equal(result.tail,false,'catch-up drops only the expired critical outcome tail');
  assert.equal(result.step,'summary');assert.ok(result.wait<80,'residual adds no queue wait');
  await page.waitForFunction(()=>!tailVfx.busy,{},{timeout:2000});await page.evaluate(()=>tailVfx.reset());
  return result;
}

export async function verifyLethalResidual(page,{events,html,resultHtml,reduced=false,reset=false}) {
  await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
  await page.evaluate(({events,html,resultHtml})=>import('/match-vfx.js').then(({createMatchVfx})=>{
    window.residualTrace={};window.residualEvents=events;
    window.residualMatch={viewerId:'P1',turnNumber:1,activePlayerId:'P1',phase:'BATTLE',status:'ENDED'};
    window.residualVfx=createMatchVfx({archiveLabel:()=> 'ARCHIVED',captureCombat:()=>html,
      onStep:(e,s)=>{if(s.type==='impact')residualTrace.impact=performance.now();},
      onIdle:()=>{
        residualTrace.idle=performance.now();residualVfx.finish({preserveResiduals:true});
        if(!document.querySelector('.match-end-overlay')) document.body.insertAdjacentHTML('beforeend',resultHtml);
      }});
    const observer=new MutationObserver(()=>{
      if(residualTrace.impact&&!document.querySelector('.signature-lethal')) {residualTrace.end=performance.now();observer.disconnect();}
    });observer.observe(document.body,{childList:true,subtree:true});
    residualVfx.enqueue(events,{roomId:'residual',present:true,match:residualMatch});residualVfx.sync(residualMatch);
  }),{events,html,resultHtml});
  await page.waitForFunction(()=>window.residualTrace?.idle,{},{timeout:3000});
  const idle=await page.evaluate(()=>{
    const n=document.querySelector('.signature-lethal'),button=document.querySelector('.match-end-overlay button'),r=button.getBoundingClientRect();
    return {busy:residualVfx.busy,hero:!!n,particles:document.querySelectorAll('.signature-paper').length,
      roots:document.querySelectorAll('.vfx-signature').length,nodes:document.querySelectorAll('.vfx-signature *').length,
      proxies:document.querySelectorAll('.presentation-proxy').length,pointer:getComputedStyle(n).pointerEvents,
      button:button.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)),
      static:!document.querySelector('.signature-art').getAnimations({subtree:true}).some(a=>a.effect.getKeyframes().some(k=>k.transform&&k.transform!=='none'))};
  });
  assert.equal(idle.busy,false);assert.ok(idle.hero&&idle.button);assert.equal(idle.pointer,'none');
  assert.ok(idle.particles<=24&&idle.roots<=3&&idle.nodes<=128);assert.equal(idle.proxies,0);
  if(reduced)assert.ok(idle.static);
  if(reset)await page.evaluate(()=>residualVfx.reset());
  await page.waitForFunction(()=>!document.querySelector('.signature-lethal'),{},{timeout:2000});
  const trace=await page.evaluate(()=>residualTrace);
  if(!reset)assert.ok(trace.end-trace.impact>=975,'Hero persists for the full visual envelope after impact');
  assert.ok(trace.end>trace.idle,'visual cleanup follows critical queue idle');
  await page.evaluate(()=>{residualVfx.enqueue(residualEvents,{roomId:'residual',present:false,match:residualMatch});residualVfx.enqueue(residualEvents,{roomId:'residual',present:true,match:residualMatch});residualVfx.sync(residualMatch);});
  assert.equal(await page.locator('.signature-lethal').count(),0,'historical lethal cannot replay');
  await page.evaluate(()=>residualVfx.reset());
  assert.equal(await page.locator('.match-vfx,.presentation-proxy').count(),0);
  return {idle,trace};
}
