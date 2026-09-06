import { strict as assert } from 'node:assert';

// Run against the real Match DOM/styles with app.js omitted, as in the Phase 2 contract.
export async function verifyHeroPresentation(page,{reduced=false}={}) {
  await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
  await page.evaluate(async()=>{
    const {createMatchVfx}=await import('/match-vfx.js');
    window.heroSeen=[];window.heroSteps=[];
    new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1&&n.matches('.vfx-signature'))heroSeen.push(n.dataset.signature);}).observe(document.body,{childList:true,subtree:true});
    window.heroVfx=createMatchVfx({archiveLabel:()=> 'ARCHIVED',onStep:(e,s)=>heroSteps.push(`${e.type}:${s.type}`),
      cardMetadata:id=>({card:{instanceId:id,definitionId:'N-002',variantId:'N-002-EXEC'},definition:{id:'N-002',department:'NEUTRAL'}})});
    window.heroMatch={viewerId:'P1',turnNumber:1,activePlayerId:'P1',phase:'MAIN',lastEventSeq:1,status:'ACTIVE'};
    const source=document.querySelector('.own-hand > .card');
    window.heroId=source.dataset.cardRef;
    window.heroPlay={seq:1,type:'CARD_PLAYED',cardInstanceId:heroId,playerId:'P1',data:{cardType:'EMPLOYEE'}};
    heroVfx.enqueue([heroPlay],{roomId:'hero-browser',match:heroMatch,present:true});
    const card=source.cloneNode(true);card.classList.remove('hand-fan-card');card.style.cssText='';document.querySelector('#ownBoard .employee-row .empty-slot').replaceWith(card);source.remove();
    heroVfx.sync(heroMatch);
  });
  await page.waitForSelector('.signature-executive');
  const first=await page.evaluate(()=>{
    const n=document.querySelector('.signature-executive');window.savedHero=n;
    const r=n.getBoundingClientRect();
    return {pointer:getComputedStyle(n).pointerEvents,inert:n.inert,static:n.classList.contains('signature-static'),particles:n.querySelectorAll('.signature-paper').length,rect:{width:r.width,height:r.height}};
  });
  assert.equal(first.pointer,'none');assert.equal(first.inert,true);assert.equal(first.static,reduced);
  assert.ok(first.rect.width>0&&first.rect.height>0);assert.equal(first.particles,reduced?0:12);
  await page.evaluate(()=>{const app=document.querySelector('#app');app.innerHTML=app.innerHTML;heroVfx.enqueue([heroPlay],{roomId:'hero-browser',match:heroMatch,present:true});heroVfx.sync(heroMatch);});
  assert.equal(await page.evaluate(()=>savedHero===document.querySelector('.signature-executive')),true);
  await page.waitForFunction(()=>!heroVfx.busy&&!document.querySelector('.signature-executive'));
  assert.equal(await page.evaluate(()=>heroSeen.filter(x=>x==='executive').length),1);
  await page.evaluate(()=>{
    window.lethalEvents=[{seq:2,type:'ATTACK_DECLARED',cardInstanceId:heroId,playerId:'P1',data:{}},{seq:3,type:'REPUTATION_CHANGED',playerId:'P2',data:{reason:'DIRECT_ATTACK',delta:-1,after:0}},{seq:4,type:'GAME_ENDED',playerId:'P1',data:{reason:'REPUTATION_ZERO'}}];
    heroMatch={...heroMatch,status:'ENDED',phase:'BATTLE',lastEventSeq:4};heroVfx.enqueue(lethalEvents,{roomId:'hero-browser',match:heroMatch,present:true});heroVfx.sync(heroMatch);
  });
  await page.waitForSelector('.signature-lethal');
  const lethal=await page.evaluate(()=>({static:document.querySelector('.signature-lethal').classList.contains('signature-static'),particles:document.querySelectorAll('.signature-paper').length,proxies:document.querySelectorAll('.presentation-proxy').length}));
  assert.equal(lethal.static,reduced);assert.ok(lethal.particles<=24);assert.ok(lethal.proxies<=4);
  await page.waitForFunction(()=>!heroVfx.busy);
  assert.equal(await page.locator('.signature-lethal').count(),0,'result transition must not retain the Hero overlay');
  await page.evaluate(()=>{heroVfx.enqueue(lethalEvents,{roomId:'hero-browser',match:heroMatch,present:true});heroVfx.sync(heroMatch);});
  assert.equal(await page.evaluate(()=>heroSeen.filter(x=>x==='lethal').length),1);
  await page.evaluate(()=>heroVfx.reset());
  assert.equal(await page.locator('.vfx-signature,.presentation-proxy,[data-presentation-hidden]').count(),0);
  return {executiveOnce:true,lethalOnce:true,pointerSafe:true,reduced,cleanup:true};
}

export async function verifySignatureBudget(page) {
  return page.evaluate(async()=>{
    const {createMatchVfx}=await import('/match-vfx.js');const {SIGNATURE_LIMITS}=await import('/vfx-signatures.js');
    const vfx=createMatchVfx({archiveLabel:()=> 'ARCHIVED'});
    const match={viewerId:'P1',turnNumber:1,activePlayerId:'P1',phase:'MAIN',status:'ACTIVE'};
    const ids=[...document.querySelectorAll('.board-lane .card[data-card-ref]')].map(n=>n.dataset.cardRef);
    const events=ids.map((id,i)=>({seq:i+1,type:'POWER_MODIFIED',cardInstanceId:id,data:{amount:3}}));
    vfx.enqueue(events,{roomId:'budget',match,present:true});vfx.sync(match);
    const result={roots:document.querySelectorAll('.vfx-signature').length,particles:document.querySelectorAll('.signature-paper').length,nodes:document.querySelectorAll('.vfx-signature,.vfx-signature *').length};
    if(result.roots>SIGNATURE_LIMITS.roots||result.particles>SIGNATURE_LIMITS.particles||result.nodes>SIGNATURE_LIMITS.nodes)throw new Error('Signature budget exceeded');
    vfx.reset();return result;
  });
}

export async function previewEngine(page,department='IT',negated=false) {
  await page.evaluate(async({department,negated})=>{
    const {createMatchVfx}=await import('/match-vfx.js');
    window.engineVfx=createMatchVfx({archiveLabel:()=> 'ARCHIVED',cardMetadata:id=>({card:{instanceId:id,definitionId:'fixture-action'},definition:{id:'fixture-action',department}})});
    const source=document.querySelector('.own-hand > .card'),a=document.querySelector('#ownBoard .employee-row .card'),b=document.querySelector('#opponentBoard .employee-row .card');
    const id=source.dataset.cardRef,aid=a.dataset.cardRef,bid=b.dataset.cardRef;
    const events=[{seq:1,type:'CARD_PLAYED',playerId:'P1',cardInstanceId:id,data:{cardType:'ACTION'}}];
    if(!negated)events.push({seq:2,type:'CARD_ARCHIVED',playerId:'P1',cardInstanceId:aid,data:{causeSourceId:id}},{seq:3,type:'CARD_ARCHIVED',playerId:'P2',cardInstanceId:bid,data:{causeSourceId:id}});
    events.push({seq:4,type:'ACTION_RESOLVED',playerId:'P1',cardInstanceId:id,data:{negated}},{seq:5,type:'CARD_ARCHIVED',playerId:'P1',cardInstanceId:id,data:{causeSourceId:id}});
    const match={viewerId:'P1',turnNumber:1,activePlayerId:'P1',phase:'MAIN',status:'ACTIVE',lastEventSeq:5};
    engineVfx.enqueue(events,{roomId:'engine',match,present:true});source.remove();if(!negated){a.remove();b.remove();}engineVfx.sync(match);
  },{department,negated});
}

export async function verifyDenseHero(page) {
  const during=await page.evaluate(async()=>{
    const {createMatchVfx}=await import('/match-vfx.js');
    window.denseHero=createMatchVfx({archiveLabel:()=> 'ARCHIVED',summaryLabel:p=>`${p.archivedCount} archived`});
    const events=Array.from({length:8},(_,i)=>({seq:i+1,type:'CARD_ARCHIVED',playerId:'P2',cardInstanceId:'b'+i,data:{causeSourceId:'effect'+i}}));
    events.push({seq:9,type:'GAME_ENDED',playerId:'P1',data:{reason:'REPUTATION_ZERO'}});
    const match={viewerId:'P1',turnNumber:1,activePlayerId:'P1',phase:'BATTLE',status:'ENDED',lastEventSeq:9};
    denseHero.enqueue(events,{roomId:'denseHero',match,present:true});denseHero.sync(match);
    return {lethal:document.querySelectorAll('.signature-lethal').length,static:document.querySelector('.signature-lethal')?.classList.contains('signature-static'),particles:document.querySelectorAll('.signature-paper').length,receipt:document.querySelector('.presentation-summary')?.textContent};
  });
  assert.equal(during.lethal,1);assert.equal(during.static,true);assert.equal(during.particles,0);assert.equal(during.receipt,'8 archived');
  await page.waitForFunction(()=>!denseHero.busy);
  assert.equal(await page.locator('.vfx-signature,.presentation-summary,.presentation-proxy').count(),0);
  await page.evaluate(()=>denseHero.reset());return during;
}
