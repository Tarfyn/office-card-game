import {replaceOnce} from './vfx-latency-loader.mjs';
import {strict as assert} from 'node:assert';

export function assertLatencyStages(result,{combat=false}={}) {
  for(const stage of ['input','request','received','consumed','ack','motion','complete'])
    assert.ok(result.trace.some(e=>e.stage===stage),`missing diagnostic stage: ${stage}`);
  const server=result.trace.find(e=>e.stage==='received'&&e.server?.ok)?.server;
  for(const key of ['received','accepted','emitted'])assert.ok(Number.isFinite(server?.[key]),`missing server ${key}`);
  assert.ok(result.authorityToMotion>=0,'success motion never precedes delivered authority');
  if(combat) {
    assert.ok(result.trace.some(e=>e.stage==='step'&&e.type==='impact'));
    assert.ok(result.trace.some(e=>e.stage==='outcomePaint'));
  }
}

// Browser-only instrumentation. The normal bundle exposes no diagnostic UI/data.
export async function instrumentLatency(context) {
  await context.addInitScript(()=>{
    window.__vfxTrace=[];
    window.__vfxMark=(stage,detail={})=>{
      __vfxTrace.push({stage,at:performance.timeOrigin+performance.now(),...detail});
      if(__vfxTrace.length>1024)__vfxTrace.shift();
    };
    const seen=new WeakSet();
    new MutationObserver(()=>{
      for(const n of document.querySelectorAll('.vfx-ack,.presentation-proxy,#combatPresentationHost'))if(!seen.has(n)) {
        seen.add(n);const stage=n.matches('.vfx-ack')?'ack':n.matches('.presentation-proxy')?'motion':'outcomePaint';
        requestAnimationFrame(()=>{if(n.isConnected)__vfxMark(stage);});
      }
    }).observe(document,{subtree:true,childList:true});
  });
  await context.route('**/app.js',async route=>{
    const response=await route.fetch();let code=await response.text();
    code=replaceOnce(code,'async function sendIntent(intent) {',`async function sendIntent(intent) { __vfxMark('input',{type:intent.type});`);
    code=replaceOnce(code,'async function postRoomIntent(intent, intentId, expectedStateVersion) {',`async function postRoomIntent(intent, intentId, expectedStateVersion) { __vfxMark('request',{id:intentId,type:intent.type});`);
    code=replaceOnce(code,'const body = await response.json().catch(() => ({}));',`const body = await response.json().catch(() => ({}));
      if(body.__latency)__vfxMark('received',{transport:'POST',server:body.__latency});
      if(path.includes('/state'))__vfxMark('readback');`);
    code=replaceOnce(code,'const view = JSON.parse(event.data);',`const view = JSON.parse(event.data); __vfxMark('received',{transport:'SSE',server:view.__latency,seq:view.match?.lastEventSeq});`);
    code=replaceOnce(code,'function appendEvents(events = [], { present = true } = {}) {',`function appendEvents(events = [], { present = true } = {}) {
      __vfxMark('consumed',{seq:events.at(-1)?.seq,queue:matchVfx.diagnostics.size,present});`);
    await route.fulfill({response,body:code});
  });
  await context.route('**/match-vfx.js',async route=>{
    const response=await route.fetch();let code=await response.text();
    code=replaceOnce(code,'function prepare(entry) {',`function prepare(entry) { __vfxMark('entry',{key:entry.key,seq:entry.seq,queue:presentation.size});`);
    code=replaceOnce(code,'function runStep(entry,s) {',`function runStep(entry,s) { __vfxMark('step',{key:entry.key,type:s.type,seq:entry.seq});`);
    code=replaceOnce(code,'entry.outcomeShown=true;',`entry.outcomeShown=true; __vfxMark('outcome',{key:entry.key});`);
    code=replaceOnce(code,'function finishEntry(entry) {',`function finishEntry(entry) { __vfxMark('complete',{key:entry.key});`);
    await route.fulfill({response,body:code});
  });
}

// Clock offset is measured, not assumed. Durations within a process use the same
// monotonic clock. Cross-process spans carry half-RTT uncertainty.
export async function calibrateClock(page) {
  return page.evaluate(async()=>{
    const samples=[];
    for(let i=0;i<7;i++) {
      const a=performance.timeOrigin+performance.now(),r=await fetch('/__qa_clock'),s=await r.json(),b=performance.timeOrigin+performance.now();
      samples.push({offset:s.now-(a+b)/2,uncertainty:(b-a)/2});
    }
    return samples.sort((a,b)=>a.uncertainty-b.uncertainty)[0];
  });
}

export function summarizeLatency(trace,clock) {
  const input=trace.find(e=>e.stage==='input'),request=trace.find(e=>e.stage==='request');
  const delivery=trace.find(e=>e.stage==='received'&&e.server?.id===request?.id);
  const ack=trace.find(e=>e.stage==='ack'),motion=trace.find(e=>e.stage==='motion');
  const entry=trace.find(e=>e.stage==='entry'),step=trace.find(e=>e.stage==='step');
  const consumed=trace.find(e=>e.stage==='consumed'&&e.at>=(delivery?.at??Infinity));
  const server=delivery?.server;
  const span=(a,b)=>!Number.isFinite(a)||!Number.isFinite(b)?null:b-a;
  return {type:input?.type,transport:delivery?.transport,accepted:server?.ok,
    inputToRequest:span(input?.at,request?.at),requestToAccepted:span(request?.at,server?.accepted-clock.offset),
    requestToServer:span(request?.at,server?.received-clock.offset),serverProcessing:span(server?.received,server?.accepted),
    acceptedToEmitted:span(server?.accepted,server?.emitted),emittedToReceived:span(server?.emitted-clock.offset,delivery?.at),
    receivedToAck:span(delivery?.at,ack?.at),ackToMotion:span(ack?.at,motion?.at),inputToAck:span(input?.at,ack?.at),
    inputToAuthority:span(input?.at,delivery?.at),authorityToMotion:span(delivery?.at,motion?.at),
    receivedToConsumed:span(delivery?.at,consumed?.at),queueAtArrival:entry?.queue,
    queueWait:span(entry?.at,step?.at),geometryPaint:span(step?.at,motion?.at),
    requestLatency:span(request?.at,trace.find(e=>e.stage==='received'&&e.transport==='POST'&&e.server?.id===request?.id)?.at),
    clockUncertainty:clock.uncertainty,trace};
}
