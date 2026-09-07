import { strict as assert } from 'node:assert';

// Actual Match DOM with shipped CSS/modules. No fake clocks or frame-exact deadlines.
export async function verifyImmediateResidual(page,{reduced=false,dense=false}={}) {
  await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
  const onset=await page.evaluate(async()=>{
    const {createMatchVfx}=await import('/match-vfx.js');
    window.responseMatch={viewerId:'P1',turnNumber:1,activePlayerId:'P1',phase:'MAIN',status:'ACTIVE'};
    window.responseSteps=[];
    window.responseVfx=createMatchVfx({archiveLabel:()=> 'ARCHIVED',onStep:(e,s)=>responseSteps.push({key:e.key,step:s.type,at:performance.now()}),
      cardMetadata:id=>({card:{definitionId:'N-002',variantId:'N-002-EXEC'},definition:{id:'N-002',department:'NEUTRAL'}})});
    const source=document.querySelector('.own-hand > .card');window.responseId=source.dataset.cardRef;
    const start=performance.now();responseVfx.acknowledge({type:'PLAY_EMPLOYEE',cardId:responseId});
    const ack=document.querySelector('.vfx-ack'),mark=ack.querySelector('.vfx-mark');
    const result={synchronous:Boolean(ack),opacity:Number(getComputedStyle(mark).opacity),delay:mark.getAnimations()[0]?.effect.getTiming().delay??0,pointer:getComputedStyle(ack).pointerEvents};
    responseVfx.clearAcknowledgement();result.cancelled=!document.querySelector('.vfx-ack');
    window.responsePlay={seq:1,type:'CARD_PLAYED',cardInstanceId:responseId,playerId:'P1',data:{cardType:'EMPLOYEE'}};
    responseVfx.enqueue([responsePlay],{roomId:'response',present:true,match:responseMatch});
    const copy=source.cloneNode(true);copy.classList.remove('hand-fan-card');copy.style.cssText='';document.querySelector('#ownBoard .employee-row .empty-slot').replaceWith(copy);source.remove();
    responseVfx.sync(responseMatch);
    const animation=document.querySelector('.presentation-proxy')?.getAnimations()[0];
    result.travel=animation?.effect.getTiming().duration??0;result.travelDelay=animation?.effect.getTiming().delay??0;result.elapsed=performance.now()-start;
    return result;
  });
  assert.ok(onset.synchronous&&onset.opacity>.5&&onset.cancelled);assert.equal(onset.delay,0);assert.equal(onset.travelDelay,0);assert.equal(onset.pointer,'none');
  assert.ok(reduced?onset.travel===0:onset.travel>360);
  await page.waitForFunction(()=>!responseVfx.busy);
  const residual=await page.evaluate(()=>{
    const n=document.querySelector('.signature-executive');window.savedResidual=n;
    const result={present:Boolean(n),life:Number(n?.style.getPropertyValue('--vfx-life')),proxies:responseVfx.diagnostics.proxies};
    responseVfx.enqueue([responsePlay],{roomId:'response',present:true,match:responseMatch});responseVfx.sync(responseMatch);
    result.same=n===document.querySelector('.signature-executive');
    responseVfx.enqueue([{seq:2,type:'REPUTATION_CHANGED',playerId:'P2',data:{delta:-1}}],{roomId:'response',present:true,match:responseMatch});responseVfx.sync(responseMatch);
    result.nextStarted=responseSteps.some(s=>s.key==='response:damage:2');return result;
  });
  assert.ok(residual.present&&residual.same&&residual.nextStarted);assert.equal(residual.proxies,0);assert.ok(reduced?residual.life<=500:residual.life>=800);
  if(dense) {
    await page.evaluate(()=>{
      responseVfx.enqueue(Array.from({length:8},(_,i)=>({seq:10+i,type:'CARD_ARCHIVED',playerId:'P2',cardInstanceId:'archived'+i,data:{causeSourceId:'effect'+i}})),{roomId:'response',present:true,match:responseMatch});responseVfx.sync(responseMatch);
    });
    await page.waitForFunction(()=>document.querySelector('.presentation-summary'));
    assert.equal(await page.locator('.signature-executive').count(),0,'catch-up retires decorative residuals');
    await page.waitForFunction(()=>!responseVfx.busy);
  }
  await page.waitForFunction(()=>!document.querySelector('.signature-executive'));
  await page.evaluate(()=>{responseVfx.enqueue([responsePlay],{roomId:'response',present:true,match:responseMatch});responseVfx.sync(responseMatch);});
  assert.equal(await page.locator('.signature-executive').count(),0);
  await page.evaluate(()=>responseVfx.reset());
  assert.equal(await page.locator('.presentation-proxy,.vfx-signature,.vfx-ack').count(),0);
  return {onset,residual,cleanup:true,replay:false};
}

export async function verifyLethalEnvelope(page) {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(async()=>{
    const {createMatchVfx}=await import('/match-vfx.js');
    window.envelopeSteps=[];window.envelopeVfx=createMatchVfx({archiveLabel:()=> 'ARCHIVED',onStep:(e,s)=>envelopeSteps.push({step:s.type,at:performance.now()})});
    const id=document.querySelector('#ownBoard .employee-row .card').dataset.cardRef;
    window.envelopeEvents=[{seq:1,type:'ATTACK_DECLARED',cardInstanceId:id,playerId:'P1',data:{}},{seq:2,type:'REPUTATION_CHANGED',playerId:'P2',data:{reason:'DIRECT_ATTACK',delta:-1,after:0}},{seq:3,type:'GAME_ENDED',playerId:'P1',data:{reason:'REPUTATION_ZERO'}}];
    window.envelopeMatch={viewerId:'P1',turnNumber:1,activePlayerId:'P1',phase:'BATTLE',status:'ENDED'};
    envelopeVfx.enqueue(envelopeEvents,{roomId:'envelope',present:true,match:envelopeMatch});envelopeVfx.sync(envelopeMatch);
  });
  const initial=await page.evaluate(()=>{const n=document.querySelector('.signature-lethal');return {primed:n.classList.contains('signature-primed'),life:Number(n.style.getPropertyValue('--vfx-life')),warning:Number(getComputedStyle(n.querySelector('.signature-warning')).opacity),kpi:Number(getComputedStyle(n.querySelector('.signature-kpi')).opacity)};});
  assert.ok(initial.primed&&initial.warning>.5);assert.equal(initial.kpi,0);assert.equal(initial.life,920);
  await page.waitForFunction(()=>document.querySelector('.signature-lethal')&&!document.querySelector('.signature-lethal').classList.contains('signature-primed'));
  const impact=await page.evaluate(()=>({kpi:Number(getComputedStyle(document.querySelector('.signature-kpi')).opacity),steps:envelopeSteps.map(s=>s.step)}));
  assert.ok(impact.kpi>.5&&impact.steps.includes('impact'));
  await page.waitForFunction(()=>!envelopeVfx.busy);
  assert.equal(await page.locator('.signature-lethal,.presentation-proxy').count(),0);
  await page.evaluate(()=>{envelopeVfx.enqueue(envelopeEvents,{roomId:'envelope',present:true,match:envelopeMatch});envelopeVfx.sync(envelopeMatch);});
  assert.equal(await page.locator('.signature-lethal').count(),0);
  await page.evaluate(()=>envelopeVfx.reset());
  return {initial,impact,cleanup:true,noReplay:true};
}
