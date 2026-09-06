// Browser contract tests. Pass a Playwright Page containing a static copy of the real
// Match DOM and shipped styles, without app.js/SSE. No browser dependency is added.
import { strict as assert } from 'node:assert';

export async function verifyPhysicalPresentation(page) {
  await page.evaluate(async()=>{
    const {createMatchVfx}=await import('/match-vfx.js');
    window.vfxSteps=[];
    window.vfxTest=createMatchVfx({archiveLabel:()=> 'ARCHIVED',onStep:(e,s)=>window.vfxSteps.push(`${e.type}:${s.type}`)});
    window.vfxMatch={viewerId:'P1',turnNumber:1,activePlayerId:'P1',phase:'MAIN',lastEventSeq:1,status:'ACTIVE'};
    const source=document.querySelector('.own-hand > .card');
    if(!source) throw new Error('Fixture requires a real visible hand card');
    window.vfxCardId=source.dataset.cardRef;
    window.vfxEvent={seq:1,type:'CARD_PLAYED',playerId:'P1',cardInstanceId:window.vfxCardId,data:{cardType:'EMPLOYEE'}};
    window.vfxTest.enqueue([window.vfxEvent],{roomId:'fixture',match:window.vfxMatch,present:true});
    const destination=document.querySelector('#ownBoard .employee-row .empty-slot');
    if(!destination) throw new Error('Fixture requires an empty own Employee slot');
    const card=source.cloneNode(true);card.classList.remove('hand-fan-card');card.style.cssText='';destination.replaceWith(card);source.remove();
    window.vfxTest.sync(window.vfxMatch);
    window.vfxProxy=document.querySelector('.presentation-proxy');
    const app=document.querySelector('#app');app.innerHTML=app.innerHTML;
    window.vfxTest.enqueue([window.vfxEvent],{roomId:'fixture',match:window.vfxMatch,present:true});
    window.vfxTest.sync(window.vfxMatch);
    window.vfxDuring={
      count:document.querySelectorAll('.presentation-proxy').length,
      same:window.vfxProxy===document.querySelector('.presentation-proxy'),
      pointer:getComputedStyle(window.vfxProxy).pointerEvents,
      inert:window.vfxProxy.inert,
      selectors:window.vfxProxy.querySelectorAll('[data-card-ref],[data-play-hand],[id],[tabindex]').length,
      hand:getComputedStyle(document.querySelector('.own-hand')).pointerEvents,
      card:getComputedStyle(document.querySelector('.own-hand > .card')).pointerEvents,
      destinationOpacity:getComputedStyle(document.querySelector('[data-presentation-hidden]')).opacity
    };
  });
  const during=await page.evaluate(()=>window.vfxDuring);
  assert.equal(during.count,1);assert.equal(during.same,true,'unrelated DOM replacement must retain the travelling proxy');
  assert.equal(during.pointer,'none');assert.equal(during.inert,true);assert.equal(during.selectors,0,'proxy must not acquire gameplay/focus selectors');
  assert.equal(during.hand,'none');assert.equal(during.card,'auto');
  assert.equal(during.destinationOpacity,'0','no transition may leave a second card visible during travel');
  await page.waitForFunction(()=>!window.vfxTest.busy);
  const cleaned=await page.evaluate(()=>({proxies:document.querySelectorAll('.presentation-proxy').length,hidden:document.querySelectorAll('[data-presentation-hidden]').length}));
  assert.equal(cleaned.proxies,0);assert.equal(cleaned.hidden,0);
  await page.evaluate(()=>{
    window.vfxTest.enqueue([window.vfxEvent],{roomId:'fixture',match:window.vfxMatch,present:true});
    window.vfxTest.sync(window.vfxMatch);
  });
  assert.equal(await page.evaluate(()=>window.vfxTest.busy),false);
  assert.equal(await page.evaluate(()=>window.vfxSteps.filter(s=>s==='placement:travel').length),1);

  // The concealed opponent source is a full existing back, not a fabricated face.
  await page.evaluate(()=>{
    const original=document.querySelector('#ownBoard .employee-row .card');
    const back=document.querySelector('.ocg-card-back');
    if(!back) throw new Error('Fixture requires a real card-back asset');
    const concealed=original.cloneNode(false);concealed.dataset.cardRef='hidden-support:fixture';concealed.appendChild(back.cloneNode(true));
    document.querySelector('#opponentBoard .support-row .empty-slot').replaceWith(concealed);
    window.vfxTest.enqueue([{seq:2,type:'CARD_ARCHIVED',playerId:'P2',cardInstanceId:'hidden-support:fixture',data:{fromZone:'SUPPORT_FIELD'}}],{roomId:'fixture',match:window.vfxMatch,present:true});
    concealed.remove();window.vfxTest.sync(window.vfxMatch);
  });
  await page.waitForFunction(()=>document.querySelector('.presentation-proxy'));
  const concealed=await page.evaluate(()=>({backs:document.querySelectorAll('.presentation-proxy .ocg-card-back').length,faces:document.querySelectorAll('.presentation-proxy .card-name').length}));
  assert.equal(concealed.backs,1);assert.equal(concealed.faces,0);
  await page.waitForFunction(()=>!window.vfxTest.busy);
  assert.equal(await page.locator('.presentation-proxy').count(),0);
  await page.evaluate(()=>window.vfxTest.reset());
  return {placementOnce:true,rerenderStable:true,pointerTransparent:true,cleanup:true,hiddenOpponentBack:true,mobileHandContract:true};
}

export async function verifyReducedPresentation(page) {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(async()=>{
    const {createMatchVfx}=await import('/match-vfx.js');
    window.reducedSteps=[];window.reducedProxyCount=0;window.reducedArchiveCount=0;
    new MutationObserver(rs=>{for(const r of rs)for(const n of r.addedNodes)if(n.nodeType===1){
      if(n.matches('.presentation-proxy')) window.reducedProxyCount++;
      if(n.matches('.vfx-archive')) window.reducedArchiveCount++;
    }}).observe(document.body,{childList:true,subtree:true});
    window.reducedVfx=createMatchVfx({archiveLabel:()=> 'ARCHIVED',onStep:(e,s)=>window.reducedSteps.push(s.type)});
    const a=document.querySelector('#ownBoard .employee-row .card'), b=document.querySelector('#opponentBoard .employee-row .card');
    const attackerId=a.dataset.cardRef,targetId=b.dataset.cardRef;
    const match={viewerId:'P1',turnNumber:1,activePlayerId:'P1',phase:'BATTLE',lastEventSeq:4,status:'ACTIVE'};
    window.reducedVfx.enqueue([
      {seq:1,type:'ATTACK_DECLARED',playerId:'P1',cardInstanceId:attackerId,data:{targetId}},
      {seq:2,type:'CARD_ARCHIVED',playerId:'P2',cardInstanceId:targetId},
      {seq:3,type:'BATTLE_RESOLVED',playerId:'P1',cardInstanceId:attackerId,data:{attackerId,targetId,destroyedIds:[targetId],winnerId:attackerId}}
    ],{roomId:'reduced',present:true,match});
    b.remove();window.reducedVfx.sync(match);
  });
  await page.waitForFunction(()=>!window.reducedVfx.busy);
  assert.equal(await page.evaluate(()=>window.reducedProxyCount),0);
  assert.equal(await page.evaluate(()=>window.reducedArchiveCount),1);
  assert.equal(await page.evaluate(()=>window.reducedSteps.join(',')),'commit,impact,outcome,archive,return');
  assert.equal(await page.locator('[data-presentation-hidden]').count(),0);
  await page.evaluate(()=>window.reducedVfx.reset());
  await page.emulateMedia({reducedMotion:'no-preference'});
  return {noPhysicalTravel:true,orderedOutcomes:true,archiveVisible:true,cleanup:true};
}

export async function verifyResizeCancellation(page) {
  await page.evaluate(async()=>{
    const {createMatchVfx}=await import('/match-vfx.js');
    window.resizeVfx=createMatchVfx({archiveLabel:()=> 'ARCHIVED'});
    const card=document.querySelector('#ownBoard .employee-row .card');
    window.resizeEvent={seq:1,type:'ATTACK_DECLARED',playerId:'P1',cardInstanceId:card.dataset.cardRef,data:{targetId:null}};
    window.resizeMatch={viewerId:'P1',turnNumber:1,activePlayerId:'P1',phase:'BATTLE',lastEventSeq:1,status:'ACTIVE'};
    window.resizeVfx.enqueue([window.resizeEvent],{roomId:'resize',present:true,match:window.resizeMatch});window.resizeVfx.sync(window.resizeMatch);
  });
  assert.equal(await page.locator('.presentation-proxy').count(),1);
  const viewport=page.viewportSize();
  await page.setViewportSize({...viewport,width:viewport.width-1});
  await page.waitForFunction(()=>!document.querySelector('.presentation-proxy'));
  await page.waitForFunction(()=>!window.resizeVfx.busy);
  assert.equal(await page.locator('[data-presentation-hidden]').count(),0);
  await page.evaluate(()=>{window.resizeVfx.enqueue([window.resizeEvent],{roomId:'resize',present:true,match:window.resizeMatch});window.resizeVfx.sync(window.resizeMatch);});
  assert.equal(await page.evaluate(()=>window.resizeVfx.busy),false);
  await page.evaluate(()=>window.resizeVfx.reset());
  await page.setViewportSize(viewport);
  return {resizeCancels:true,noStaleReturn:true,noReplay:true};
}

export async function verifyDestroyedAttacker(page) {
  await page.evaluate(async()=>{
    const {createMatchVfx}=await import('/match-vfx.js');
    const a=document.querySelector('#ownBoard .employee-row .card'),b=document.querySelector('#opponentBoard .employee-row .card');
    const attackerId=a.dataset.cardRef,targetId=b.dataset.cardRef;
    const html=`<div class="battle-resolution-overlay"><div class="battle-stage"><div class="battle-card-side archived"><div class="battle-card-shell">${a.outerHTML}<b class="archive-stamp">ARCHIVED</b></div></div><div class="battle-vs">VS</div><div class="battle-card-side winner"><div class="battle-card-shell">${b.outerHTML}</div></div></div></div>`;
    window.loserVfx=createMatchVfx({archiveLabel:()=> 'ARCHIVED',captureCombat:()=>html,onCombat:entry=>{
      document.querySelector('#combatPresentationHost')?.remove();
      if(entry){const host=document.createElement('div');host.id='combatPresentationHost';host.className='combat-presentation-host queued-combat';host.innerHTML=entry.html;document.body.appendChild(host);}
    }});
    const match={viewerId:'P1',turnNumber:1,activePlayerId:'P1',phase:'BATTLE',lastEventSeq:3,status:'ACTIVE'};
    window.loserVfx.enqueue([
      {seq:1,type:'ATTACK_DECLARED',playerId:'P1',cardInstanceId:attackerId,data:{targetId}},
      {seq:2,type:'CARD_ARCHIVED',playerId:'P1',cardInstanceId:attackerId},
      {seq:3,type:'BATTLE_RESOLVED',playerId:'P1',cardInstanceId:attackerId,data:{attackerId,targetId,destroyedIds:[attackerId],winnerId:targetId}}
    ],{roomId:'loser',present:true,match});a.remove();window.loserVfx.sync(match);
    window.loserProxy=document.querySelector('.presentation-proxy');window.loserWidth=window.loserProxy.style.width;
  });
  await page.locator('.battle-resolution-overlay').waitFor();
  assert.equal(await page.locator('.battle-resolution-overlay').evaluate(n=>getComputedStyle(n).opacity),'1');
  await page.waitForFunction(()=>document.querySelector('.vfx-archive'));
  const result=await page.evaluate(()=>{const n=document.querySelector('.presentation-proxy');return {same:n===window.loserProxy,width:n.style.width,cardWidth:n.firstElementChild.style.width,initialWidth:window.loserWidth};});
  assert.equal(result.same,true);assert.equal(result.width,result.cardWidth);assert.notEqual(result.width,result.initialWidth);
  await page.waitForFunction(()=>!window.loserVfx.busy);
  assert.equal(await page.locator('.presentation-proxy,[data-presentation-hidden]').count(),0);
  await page.evaluate(()=>window.loserVfx.reset());
  return {destroyedAttackerReconciles:true,outcomeVisible:true,sameProxy:true,cleanup:true};
}
