// Presentation only: consume authoritative events; never infer legality or outcomes.
import { createPresentationQueue, presentationSteps } from './presentation-queue.js';
import { VFX_TIMING, VFX_EASING, installVfxTiming } from './vfx-timing.js';
import { SIGNATURE_LIMITS, visibleSignatureMetadata, signaturePreset, signatureForStep, decorateSignature } from './vfx-signatures.js';
export { createPresentationQueue, presentationSteps } from './presentation-queue.js';
const MAX_EFFECTS = 16;
const MAX_PENDING = 24;
const MAX_AGE_MS = 1200;
const field = (id) => ({ type:'field', id });
const player = (id) => ({ type:'player', id });
const archive = (id) => ({ type:'archive', id });
const opposite = (id) => id === 'P1' ? 'P2' : id === 'P2' ? 'P1' : null;

export function feedbackForEvent(event, ownerOf = () => null) {
  const data = event.data ?? {};
  const source = field(event.cardInstanceId);
  const cue = (kind, target = source, extra = {}) => ({ kind, target, seq:event.seq, ...extra });
  switch (event.type) {
    case 'CARD_PLAYED':
      return ['EMPLOYEE','SYSTEM'].includes(data.cardType) ? [cue('arrive')] : [];
    case 'INCIDENT_SET': return [cue('arrive')];
    case 'CARD_MOVED':
      return ['EMPLOYEE_FIELD','SUPPORT_FIELD'].includes(data.to) ? [cue('arrive')] : [];
    case 'ATTACK_DECLARED': {
      const target = data.targetId == null ? player(opposite(event.playerId)) : field(data.targetId);
      return [cue('commit'), cue('travel', target, { source })];
    }
    case 'BATTLE_RESOLVED':
      return data.targetId ? [cue('impact', field(data.targetId))] : [];
    case 'ATTACK_TARGET_REDIRECTED':
      return [cue('redirect', field(data.newTargetId))];
    case 'REPUTATION_CHANGED': {
      const amount = Number(data.delta ?? data.amount ?? 0);
      return amount ? [cue(amount < 0 ? 'damage' : 'confirm', player(event.playerId), { amount })] : [];
    }
    case 'ACTION_RESOLVED':
      return [cue(data.negated ? 'denied' : 'resolve', source, { fallback:archive(ownerOf(event.cardInstanceId) ?? event.playerId) })];
    case 'ABILITY_ACTIVATED':
    case 'INCIDENT_ACTIVATED': return [cue('confirm')];
    case 'CHAIN_ITEM_DELAYED': return [cue('warning',source,{signatureKind:'delay'})];
    case 'POWER_MODIFIED': return Math.abs(Number(data.amount))>=3 ? [cue('confirm',source,{signatureKind:'major'})] : [];
    case 'DESTRUCTION_PREVENTED': return [cue('confirm')];
    case 'CARD_ARCHIVED':
      return [cue('archive'), cue('receive', archive(event.playerId ?? ownerOf(event.cardInstanceId)))];
    // Destruction also emits CARD_ARCHIVED. One send-off, including sacrifice/discard.
    default: return [];
  }
}

// Monotonic watermark is per room, independent of the UI's truncated log.
export function createFeedbackQueue() {
  let room = null;
  let watermark = -1;
  let pending = [];
  return {
    reset() { room = null; watermark = -1; pending = []; },
    enqueue(events, { roomId, present = true, now = Date.now(), ownerOf, skip = new Set() } = {}) {
      if (room !== roomId) { this.reset(); room = roomId; }
      const previous = watermark;
      const seen = new Set();
      for (const event of events) {
        if (!Number.isSafeInteger(event.seq) || event.seq <= previous || seen.has(event.seq)) continue;
        seen.add(event.seq);
        watermark = Math.max(watermark, event.seq);
        if (event.type === 'ATTACK_TARGET_REDIRECTED') pending = pending.filter((cue) => cue.kind !== 'travel');
        if (present && !skip.has(event.seq)) pending.push(...feedbackForEvent(event, ownerOf).map((cue) => ({ ...cue, at:now })));
      }
      pending = pending.slice(-MAX_PENDING);
    },
    drain(now = Date.now()) {
      const unique = new Map();
      for (const cue of pending) {
        if (now - cue.at <= MAX_AGE_MS) unique.set(`${cue.kind}:${cue.target.type}:${cue.target.id}`, cue);
      }
      pending = [];
      return [...unique.values()].slice(-MAX_EFFECTS);
    }
  };
}

// One coordinate space for hand, either field, Archive and REP: viewport CSS pixels.
export function readPresentationGeometry(node, { allowOffscreen=false }={}) {
  if (!node) return null;
  const r=node.getBoundingClientRect();
  if(!r.width || !r.height || (!allowOffscreen && (r.bottom<0 || r.top>innerHeight || r.right<0 || r.left>innerWidth))) return null;
  const css=getComputedStyle(node);
  if(css.display==='none' || css.visibility==='hidden') return null;
  const matrix=new DOMMatrixReadOnly(css.transform==='none' ? undefined : css.transform);
  return {left:r.left,top:r.top,width:r.width,height:r.height,angle:matrix.is2D ? Math.atan2(matrix.b,matrix.a)*180/Math.PI : 0};
}

// Freeze only already-rendered visible content, never reconstruct a hidden definition.
// Explicit computed layout keeps the same anatomy outside the hand/field CSS ancestry.
export function snapshotPresentationCard(node) {
  const rect=readPresentationGeometry(node);
  if(!rect) return null;
  const clone=node.cloneNode(true);
  const originals=[node,...node.querySelectorAll('*')], copies=[clone,...clone.querySelectorAll('*')];
  const properties='display position inset box-sizing width height min-width min-height max-width max-height padding margin gap grid-template-columns grid-template-rows grid-column grid-row flex flex-direction flex-wrap align-items justify-content align-self font-family font-size font-weight font-style line-height letter-spacing text-align text-transform white-space color background border border-radius overflow object-fit object-position opacity clip-path'.split(' ');
  originals.forEach((original,index)=>{
    const copy=copies[index],css=getComputedStyle(original);
    properties.forEach(p=>copy.style.setProperty(p,css.getPropertyValue(p)));
    for(const attr of [...copy.attributes]) if(attr.name==='id'||attr.name.startsWith('data-')||attr.name==='tabindex'||attr.name.startsWith('on')) copy.removeAttribute(attr.name);
    copy.style.setProperty('animation','none','important');
    copy.style.setProperty('transition','none','important');
    copy.style.setProperty('pointer-events','none','important');
  });
  Object.assign(clone.style,{position:'relative',inset:'auto',margin:'0',transform:'none',rotate:'none',scale:'none',opacity:'1',visibility:'visible'});
  clone.classList.remove('hand-fan-card','selected','attack-selected','legal-card');
  const width=node.offsetWidth || rect.width,height=node.offsetHeight || rect.height;
  Object.assign(clone.style,{width:`${width}px`,height:`${height}px`,minWidth:'0',minHeight:'0',maxWidth:'none',maxHeight:'none'});
  return {rect,width,height,template:clone};
}

export function physicalPath(from,to,{commit=false}={}) {
  if(!from||!to) return null;
  const dx=to.left+to.width/2-from.left-from.width/2,dy=to.top+to.height/2-from.top-from.height/2;
  if(!commit) return {...to,angle:to.angle??0};
  const distance=Math.hypot(dx,dy),reach=Math.min(distance*.22,from.height*.55);
  return {...from,left:from.left+(distance?dx/distance*reach:0),top:from.top+(distance?dy/distance*reach:0)};
}

export function createMatchVfx({ archiveLabel, summaryLabel=()=>'', captureCombat=()=>'', onCombat=()=>{}, onIdle=()=>{}, onStep=()=>{}, cardMetadata=()=>null }) {
  installVfxTiming(document.documentElement.style);
  const queue = createFeedbackQueue();
  const presentation = createPresentationQueue();
  const active = new Map();
  const proxies = new Map();
  const suppressed = new Set();
  const actionOrigins = new Map();
  let timer=null, currentMatch=null, targeting=false, geometryEpoch=0, running=null;
  let host = null;
  let room = null;
  let phase = null;
  let previousRects = new Map();
  let lethalPresented=-1;
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const remove = (node) => {
    clearTimeout(active.get(node));
    active.delete(node);
    node.remove();
  };
  const clear = () => { for (const node of active.keys()) remove(node); };
  // One set of listeners per application; never installed from render().
  const invalidateGeometry=()=>{ clear(); previousRects.clear(); geometryEpoch++; stopMotion(); actionOrigins.clear(); };
  window.addEventListener('resize', invalidateGeometry, { passive:true });
  window.addEventListener('scroll', invalidateGeometry, { passive:true, capture:true });
  document.addEventListener('visibilitychange', () => { clear(); queue.drain(Infinity); stopMotion(); if(document.hidden) finishAll(); });
  media.addEventListener('change', () => { clear(); stopMotion(); });

  function targetNode(target, viewerId) {
    if (!target?.id) return null;
    const id = CSS.escape(target.id);
    if (target.type === 'field') return document.querySelector(`.board-lane .card[data-card-ref="${id}"]`);
    const board = target.id === viewerId ? '#ownBoard' : '#opponentBoard';
    if (target.type === 'player') return document.querySelector(`${board} .player-avatar-slot`);
    if (target.type === 'archive') return document.querySelector(`${board} .archive-compact summary`);
    return null;
  }
  function rectOf(node) {
    return readPresentationGeometry(node);
  }
  function archiveDestination(playerId) {
    // An offscreen stack still gives the correct exit direction. If collapsed,
    // use that player's outer board edge; no invented gameplay zone or pixels.
    const actual=readPresentationGeometry(targetNode(archive(playerId),currentMatch?.viewerId),{allowOffscreen:true});
    if(actual) return actual;
    const own=playerId===currentMatch?.viewerId;
    const board=rectOf(document.querySelector(own?'#ownBoard':'#opponentBoard'));
    return board ? {left:board.left+board.width,top:own?board.top+board.height:board.top,width:board.width*.025,height:board.height*.025,angle:0} : null;
  }

  function cueNow(cue,rect,sourceRect) {
    const key=`${cue.kind}:${cue.target.type}:${cue.target.id}`;
    if([...active.keys()].some(node=>node.dataset.vfxKey===key&&node.dataset.eventSeq===String(cue.seq))) return;
    const node=spawn(cue,rect,sourceRect);
    if(node) active.set(node,setTimeout(()=>remove(node),parseFloat(getComputedStyle(node).getPropertyValue('--vfx-life'))||VFX_TIMING.cue));
  }
  function fieldNode(id) { return targetNode(field(id),currentMatch?.viewerId); }
  function cardNode(id) { return document.querySelector(`.own-hand > .card[data-card-ref="${CSS.escape(id)}"]`) ?? fieldNode(id); }
  function stopMotion() {
    for(const {node,animation} of proxies.values()) { animation?.cancel();node.remove(); }
    proxies.clear(); suppressed.clear();
    document.querySelectorAll('[data-presentation-hidden]').forEach(n=>n.removeAttribute('data-presentation-hidden'));
  }
  function prepare(entry) {
    entry.epoch=geometryEpoch;
    entry.visuals=new Map();
    const metadata=cardMetadata(entry.payload.cardId??entry.payload.attackerId);
    entry.signatureMetadata=visibleSignatureMetadata(metadata?.card,metadata?.definition);
    const ids=new Set([entry.payload.attackerId,entry.payload.cardId,...entry.events.flatMap(e=>[e.cardInstanceId,e.data?.attackerId,e.data?.targetId,...(e.data?.destroyedIds??[])])].filter(Boolean));
    for(const id of ids) {
      const source=snapshotPresentationCard(cardNode(id));
      const saved=actionOrigins.get(id);
      if(source) entry.visuals.set(id,source);
      else if(saved && Date.now()-saved.at<3000) entry.visuals.set(id,saved.visual);
    }
    if(entry.type==='combat'||entry.type==='direct') entry.combatHtml=captureCombat(entry.events,entry.payload.attack);
  }
  function proxy(entry,id,from,to,duration,{fade=false,anticipate=false}={}) {
    const snapshot=entry.visuals?.get(id);
    if(!snapshot||!from||!to||media.matches||targeting||entry.epoch!==geometryEpoch||entry.catchUp||!duration) return;
    let item=proxies.get(id);
    if(!item) {
      // A maximum of four physical cards; larger outcomes use the static catch-up receipt.
      if(proxies.size>=4) return;
      if(!host) { host=document.createElement('div');host.id='matchVfxHost';host.setAttribute('aria-hidden','true');document.body.appendChild(host); }
      const node=document.createElement('div');node.className='presentation-proxy';node.inert=true;node.setAttribute('aria-hidden','true');
      node.dataset.presentationKey=entry.key;
      Object.assign(node.style,{width:`${snapshot.width}px`,height:`${snapshot.height}px`});
      node.appendChild(snapshot.template.cloneNode(true));host.appendChild(node);
      item={node,animation:null,snapshot};proxies.set(id,item);
    } else if(item.snapshot!==snapshot) {
      // A destroyed attacker now departs from the larger combat card. Keep the
      // proxy node, but reconcile its anatomy/size before using that geometry.
      item.node.replaceChildren(snapshot.template.cloneNode(true));
      Object.assign(item.node.style,{width:`${snapshot.width}px`,height:`${snapshot.height}px`});
      item.snapshot=snapshot;
    }
    const pose=(r)=>{
      const a=(r.angle??0)*Math.PI/180;
      const scale=r.width/(snapshot.width*Math.abs(Math.cos(a))+snapshot.height*Math.abs(Math.sin(a)));
      return `translate(${r.left+r.width/2-snapshot.width/2}px,${r.top+r.height/2-snapshot.height/2}px) rotate(${r.angle??0}deg) scale(${scale})`;
    };
    item.animation?.cancel();
    const frames=[{transform:pose(from),opacity:1}];
    if(anticipate) frames.push({offset:.18,transform:pose({...from,left:from.left-(to.left-from.left)*.08,top:from.top-(to.top-from.top)*.08}),opacity:1});
    // Keep the card solid through most of Archive travel, then tuck it away.
    if(fade) frames.push({offset:.7,transform:pose({...to,left:from.left+(to.left-from.left)*.85,top:from.top+(to.top-from.top)*.85,width:from.width+(to.width-from.width)*.85}),opacity:.85});
    frames.push({transform:pose(to),opacity:fade?0:1});
    item.animation=item.node.animate(frames,{duration,easing:VFX_EASING.travel,fill:'forwards'});
    suppressed.add(id);fieldNode(id)?.setAttribute('data-presentation-hidden','true');
  }
  function destination(entry,id) {
    return rectOf(fieldNode(id)) ?? (entry.epoch===geometryEpoch ? entry.visuals?.get(id)?.rect : null) ?? null;
  }
  function stage(entry) {
    if(entry.epoch!==geometryEpoch) return null;
    const source=entry.visuals?.get(entry.payload.cardId)?.rect;
    const divider=rectOf(document.querySelector('.board-phase-divider'));
    if(!source||!divider) return null;
    // A visual midpoint near the phase divider, not a gameplay zone.
    return {...source,left:divider.left+divider.width/2-source.width/2,top:divider.top+divider.height/2-source.height/2,angle:0};
  }
  function eventsCues(entry,types,{receipt=true}={}) {
    for(const event of entry.events.filter(e=>types.includes(e.type))) for(const cue of feedbackForEvent(event)) {
      if(!receipt&&cue.kind==='receive') continue;
      const before=entry.epoch===geometryEpoch ? entry.visuals?.get(cue.target.id)?.rect : null;
      cueNow(cue,rectOf(targetNode(cue.target,currentMatch?.viewerId))??before??rectOf(targetNode(cue.fallback,currentMatch?.viewerId)));
    }
  }
  function showSummary(entry) {
    const node=document.createElement('div');node.className='presentation-summary';node.setAttribute('role','status');node.textContent=summaryLabel(entry.payload);
    document.body.appendChild(node);entry.summaryNode=node;
    for(const [id,amount] of Object.entries(entry.payload.damage)) if(amount) cueNow({kind:amount<0?'damage':'confirm',target:player(id),seq:entry.seq,amount},rectOf(targetNode(player(id),currentMatch?.viewerId)));
    for(const id of ['P1','P2']) if(entry.payload.archivedByPlayer[id]) cueNow({kind:'receive',target:archive(id),seq:entry.seq},rectOf(targetNode(archive(id),currentMatch?.viewerId)));
  }
  function showSignature(entry,s) {
    const p=entry.payload,staticFeedback=s.static||targeting||entry.epoch!==geometryEpoch;
    let preset=signatureForStep(entry,s.type,entry.signatureMetadata,{staticFeedback});
    let rect,origin,targets=[],life;
    if(p.lethal && ['commit','impact','result','summary'].includes(s.type)) {
      // Authority has already confirmed lethal. Ignite the warning during approach;
      // the KPI/zero/paper response is activated together with the actual impact.
      if(s.type==='impact') for(const node of active.keys()) if(node.dataset.signature==='lethal') {
        node.classList.remove('signature-primed');
        node.style.setProperty('--signature-decay',String(VFX_TIMING.impact+VFX_TIMING.repHold+(p.resultHold??VFX_TIMING.resultFallback)));
      }
      if(lethalPresented===p.lethal.seq) return;
      lethalPresented=p.lethal.seq;
      preset=signaturePreset('lethal',null,{staticFeedback});
      rect=rectOf(document.querySelector(p.lethal.playerId===currentMatch?.viewerId?'#ownBoard':'#opponentBoard'));
      const steps=presentationSteps(entry,{reducedMotion:media.matches,catchUp:entry.catchUp});
      const index=steps.findIndex(step=>step.type===s.type);
      life=steps.slice(index).reduce((sum,step)=>sum+step.duration,0)+(['commit','impact'].includes(s.type)?(media.matches?VFX_TIMING.staticLethal:p.resultHold??VFX_TIMING.resultFallback):0);
    } else if(preset) {
      origin=entry.travelDestination??destination(entry,p.cardId??p.attackerId);
      targets=(p.archived??[]).filter(e=>e.cardInstanceId!==p.cardId).map(e=>destination(entry,e.cardInstanceId)).filter(Boolean);
      if(preset.kind==='executive') rect=origin;
      else {
        const points=[origin,...targets].filter(Boolean);
        if(points.length) {
          const left=Math.min(...points.map(r=>r.left)),top=Math.min(...points.map(r=>r.top));
          rect={left,top,width:Math.max(...points.map(r=>r.left+r.width))-left,height:Math.max(...points.map(r=>r.top+r.height))-top};
        } else rect=rectOf(document.querySelector('.board-phase-divider'));
      }
      // Arrival/resolve accents share the existing V1 cue lifetime, not a queue wait.
      life=staticFeedback?VFX_TIMING.reducedCue:preset.kind==='executive'?VFX_TIMING.executiveResidual:VFX_TIMING.engineResidual;
    }
    if(!preset||!rect) return;
    cueNow({kind:'signature',target:field(`${entry.key}:${preset.kind}`),seq:entry.seq,preset,life,origin,targets,primed:s.type==='commit'&&!s.static},rect);
  }
  function returnSurvivor(entry) {
    const id=entry.payload.attackerId;
    if(!entry.payload.destroyedIds?.includes(id) && fieldNode(id))
      proxy(entry,id,entry.commitDestination,destination(entry,id),VFX_TIMING.attackerReturn);
  }
  function runStep(entry,s) {
    onStep(entry,s);
    const p=entry.payload, id=p.cardId??p.attackerId;
    for(const node of active.keys()) if(node.dataset.vfxKey===`ack:field:${id}`) remove(node);
    if(s.static) stopMotion();
    if(s.type==='travel') {
      const from=entry.visuals?.get(id)?.rect;
      const to=entry.type==='placement' ? rectOf(fieldNode(id)) : stage(entry);
      entry.travelDestination=to;
      proxy(entry,id,from,to,s.duration);
      if(entry.type!=='placement' && entry.visuals?.has(id) && to) {
        actionOrigins.set(id,{at:Date.now(),visual:{...entry.visuals.get(id),rect:to}});
        while(actionOrigins.size>8) actionOrigins.delete(actionOrigins.keys().next().value);
      }
      if(s.static && from) cueNow({kind:'confirm',target:field(id),seq:entry.seq},from);
    } else if(s.type==='settle') {
      stopMotion();
      cueNow({kind:entry.type==='placement'?'arrive':'resolve',target:field(id),seq:entry.seq},entry.travelDestination??destination(entry,id));
    } else if(s.type==='commit') {
      const from=destination(entry,id);
      const attack=p.attack ?? entry.events.find(e=>e.type==='ATTACK_DECLARED');
      const target=p.targetId ? field(p.targetId) : player(p.defenderId??opposite(attack?.playerId??p.playerId));
      const to=rectOf(targetNode(target,currentMatch?.viewerId))??entry.visuals?.get(p.targetId)?.rect;
      entry.commitOrigin=from;entry.commitDestination=physicalPath(from,to,{commit:true});
      proxy(entry,id,from,entry.commitDestination,s.duration,{anticipate:true});
      cueNow({kind:'commit',target:field(id),seq:entry.seq},from);
      cueNow({kind:'travel',source:field(id),target,seq:entry.seq},to,from);
    } else if(s.type==='impact') {
      // Direct REP has no destruction outcome card: its portrait/delta is the
      // impact, and stays visible through the dedicated REP hold.
      if(entry.combatHtml) onCombat({key:entry.key,html:entry.combatHtml});
      eventsCues(entry,['BATTLE_RESOLVED','REPUTATION_CHANGED']);
    } else if(s.type==='impactHold') {
      // Impact/outcome remains active while a surviving direct attacker recovers.
      if((entry.type==='direct'||entry.type==='combat'&&!p.archived?.length)&&!s.static) returnSurvivor(entry);
    } else if(s.type==='outcome') {
      if(entry.combatHtml) onCombat({key:entry.key,html:entry.combatHtml});
      else eventsCues(entry,['CARD_ARCHIVED'],{receipt:false});
    } else if(s.type==='resolve') {
      // Retain a staged Action through its resolve beat, then reuse that same
      // proxy for Archive. The authoritative Action has already resolved.
      for(const event of entry.events.filter(e=>e.type==='ACTION_RESOLVED')) {
        const cue=feedbackForEvent(event)[0];
        cueNow(cue,entry.travelDestination??stage(entry)??rectOf(targetNode(cue.fallback,currentMatch?.viewerId)));
      }
    } else if(s.type==='archive') {
      // Read all coordinates first. The result host is still visible for its source cards.
      const moves=(p.archived??[]).map((e,index)=>{
        const overlay=document.querySelector('#combatPresentationHost');
        const side=e.cardInstanceId===p.attackerId ? 0 : 1;
        const combatCard=overlay?.querySelectorAll('.battle-card-shell > .card')[side];
        const visible=entry.combatHtml && combatCard ? snapshotPresentationCard(combatCard) : null;
        if(visible) entry.visuals.set(e.cardInstanceId,visible);
        const from=visible?.rect??(entry.epoch===geometryEpoch ? (e.cardInstanceId===p.cardId ? entry.travelDestination??stage(entry) : null)??entry.visuals?.get(e.cardInstanceId)?.rect : null);
        const to=archiveDestination(e.playerId);
        return {e,from,to,index};
      });
      onCombat(null);
      if(entry.type==='combat'&&!s.static) returnSurvivor(entry);
      for(const {e,from,to} of moves) {
        cueNow({kind:'archive',target:field(e.cardInstanceId),seq:e.seq},from);
        proxy(entry,e.cardInstanceId,from,to,s.duration,{fade:true});
        actionOrigins.delete(e.cardInstanceId);
      }
    } else if(s.type==='return') {
      onCombat(null);
      // An unresolved declaration has no impact/Archive window to overlap.
      if(entry.type==='attack'&&!s.static) returnSurvivor(entry);
    } else if(s.type==='summary') showSummary(entry);
    showSignature(entry,s);
  }
  function finishEntry(entry) {
    clearTimeout(timer);timer=null;stopMotion();onCombat(null);entry.summaryNode?.remove();
    if(entry.type==='result'||entry.payload.lethal&&entry.type==='summary') for(const node of active.keys()) if(node.dataset.signature==='lethal') remove(node);
    presentation.complete(entry.key);running=null;
    if(presentation.busy) pump(); else onIdle();
  }
  function pump() {
    if(running||!currentMatch||document.hidden) return;
    const entry=presentation.take();
    if(!entry) return;
    running=entry;
    if(entry.catchUp||entry.type==='summary') for(const node of active.keys())
      if(node.classList.contains('vfx-signature')&&node.dataset.signature!=='lethal') remove(node);
    const steps=presentationSteps(entry,{reducedMotion:media.matches,catchUp:entry.catchUp});
    let index=0;
    const next=()=>{
      if(running!==entry) return;
      if(index>=steps.length) { finishEntry(entry);return; }
      const planned=steps[index++];
      // A stalled main thread must not resume a long decorative backlog.
      // Critical beats still run in order with their short static fallback.
      const late=Date.now()-entry.startedAt>entry.maxDuration;
      const s=late ? {...planned,static:true,duration:planned.critical?Math.min(planned.duration,VFX_TIMING.lateCritical):0} : planned;
      runStep(entry,s);
      const complete=()=>{
        if(running!==entry) return;
        if(s.type==='archive') for(const e of entry.payload.archived??[]) {
          cueNow({kind:'receive',target:archive(e.playerId),seq:e.seq},rectOf(targetNode(archive(e.playerId),currentMatch?.viewerId)));
        }
        next();
      };
      if(!s.duration) complete(); else timer=setTimeout(complete,s.duration);
    };
    next();
  }
  function finishAll() {
    const wasBusy=presentation.busy;
    clearTimeout(timer);timer=null;stopMotion();running?.summaryNode?.remove();running=null;
    for(const node of active.keys()) if(node.classList.contains('vfx-signature')) remove(node);
    // Preserve the watermark: cancellation must not turn old events into new animations.
    while(presentation.busy) { const entry=presentation.current??presentation.take();if(entry)presentation.complete(entry.key); }
    onCombat(null);if(wasBusy) onIdle();
  }
  function spawn(cue, rect, sourceRect) {
    if (!rect || (cue.kind === 'travel' && (!sourceRect || media.matches))) return;
    if (!host) {
      host = document.createElement('div');
      host.id = 'matchVfxHost';
      host.setAttribute('aria-hidden', 'true');
      document.body.appendChild(host);
    }
    // Replace only duplicate live cues for the same surface, never an unrelated effect.
    const key = `${cue.kind}:${cue.target.type}:${cue.target.id}`;
    for (const node of active.keys()) if (node.dataset.vfxKey === key) remove(node);
    while (active.size >= MAX_EFFECTS) remove(active.keys().next().value);
    const node = document.createElement('div');
    node.className = `match-vfx vfx-${cue.kind}`;
    node.dataset.vfxKey = key;
    node.dataset.eventSeq = String(cue.seq);
    if(cue.life) node.style.setProperty('--vfx-life',String(cue.life));
    if (cue.kind === 'travel') {
      const x = sourceRect.left + sourceRect.width / 2;
      const y = sourceRect.top + sourceRect.height / 2;
      const dx = rect.left + rect.width / 2 - x;
      const dy = rect.top + rect.height / 2 - y;
      Object.assign(node.style, { left:`${x}px`, top:`${y}px`, width:`${Math.hypot(dx,dy)}px`, height:'2px', transform:`rotate(${Math.atan2(dy,dx)}rad)` });
    } else {
      Object.assign(node.style, { left:`${rect.left}px`, top:`${rect.top}px`, width:`${rect.width}px`, height:`${rect.height}px` });
    }
    const mark = document.createElement('i');
    mark.className = 'vfx-mark';
    node.appendChild(mark);
    const metadata=cue.signatureKind?cardMetadata(cue.target.id):null;
    const preset=cue.preset??(cue.signatureKind?signaturePreset(cue.signatureKind,visibleSignatureMetadata(metadata?.card,metadata?.definition),{staticFeedback:media.matches||targeting}):null);
    if(preset) {
      const roots=[...active.keys()].filter(n=>n.classList.contains('vfx-signature'));
      while(roots.length>=SIGNATURE_LIMITS.roots) remove(roots.shift());
      const particleRoom=Math.max(0,SIGNATURE_LIMITS.particles-document.querySelectorAll('.signature-paper').length);
      if(cue.kind==='signature') mark.remove();
      decorateSignature(node,preset,{rect,origin:cue.origin,targets:cue.targets,particleRoom});
      if(cue.primed) node.classList.add('signature-primed');
    }
    if (cue.kind === 'archive' || cue.amount) {
      const label = document.createElement('b');
      label.textContent = cue.kind === 'archive' ? archiveLabel() : `${cue.amount > 0 ? '+' : ''}${cue.amount} REP`;
      node.appendChild(label);
    }
    host.appendChild(node);
    active.set(node, null);
    return node;
  }

  return {
    // Source acknowledgement only: no destination, success, damage or speculative state.
    acknowledge(intent) {
      this.clearAcknowledgement();
      const id=intent.cardId??intent.attackerId;
      const rect=rectOf(id?cardNode(id):document.querySelector('.board-phase-divider .active'));
      if(rect) cueNow({kind:'ack',target:field(id??'phase'),seq:-1,life:VFX_TIMING.acknowledgement},rect);
    },
    clearAcknowledgement() { for(const node of active.keys()) if(node.classList.contains('vfx-ack')) remove(node); },
    enqueue(events, options) {
      if (room !== options.roomId) { this.reset(); room = options.roomId; }
      const present=options.present && !document.hidden;
      currentMatch=options.match??currentMatch;
      const {used,fresh}=presentation.enqueue(events,{...options,present,prepare});
      if(fresh.some(e=>e.type==='ATTACK_TARGET_REDIRECTED')) { stopMotion();if(running) running.catchUp=true; }
      queue.enqueue(events, { ...options, present,skip:used });
      return new Set(fresh.map(e=>e.seq));
    },
    sync(match,{isTargeting=false}={}) {
      currentMatch=match;targeting=isTargeting;
      if(targeting) {
        stopMotion();
        for(const node of active.keys()) if(node.classList.contains('vfx-signature')&&node.dataset.signature!=='lethal') remove(node);
      }
      if (!match || document.hidden) { clear(); queue.drain(Infinity); return; }
      const viewerId = match.viewerId;
      const cues = queue.drain();
      const placements = [];
      for (const cue of cues) {
        if (cue.kind === 'redirect') {
          for (const node of active.keys()) if (node.classList.contains('vfx-travel')) remove(node);
        }
        const before = cue.target.type === 'field' ? previousRects.get(cue.target.id) : null;
        const rect = cue.kind === 'archive' ? before : rectOf(targetNode(cue.target, viewerId)) ?? before ?? rectOf(targetNode(cue.fallback, viewerId));
        const sourceRect = cue.source ? rectOf(targetNode(cue.source, viewerId)) ?? previousRects.get(cue.source.id) : null;
        placements.push([cue, rect, sourceRect]);
      }
      const nextPhase = `${match.turnNumber}:${match.activePlayerId}:${match.phase}`;
      if (phase && phase !== nextPhase && match.status === 'ACTIVE') {
        placements.push([{ kind:match.activePlayerId === viewerId ? 'turn' : 'opponent-turn', target:{type:'phase',id:'active'}, seq:match.lastEventSeq }, rectOf(document.querySelector('.board-phase-divider .phase-track .active'))]);
      }
      phase = nextPhase;
      // At most 18 field cards; read geometry once per render, with no per-frame loop.
      previousRects = new Map([...document.querySelectorAll('.board-lane .card[data-card-ref]')].map((node) => [node.dataset.cardRef, rectOf(node)]));
      // Finish geometry reads before writes, then resolve CSS lifetimes as one read batch.
      const nodes = placements.map((args) => spawn(...args)).filter(Boolean);
      for (const node of nodes) {
        if (!active.has(node)) continue;
        const lifetime = parseFloat(getComputedStyle(node).getPropertyValue('--vfx-life')) || VFX_TIMING.cue;
        active.set(node, setTimeout(() => remove(node), lifetime));
      }
      for(const id of suppressed) fieldNode(id)?.setAttribute('data-presentation-hidden','true');
      pump();
    },
    get busy() { return presentation.busy; },
    get diagnostics() { return {size:presentation.size,proxies:proxies.size,key:running?.key??null}; },
    finish:finishAll,
    reset() { clearTimeout(timer);timer=null;stopMotion();running?.summaryNode?.remove();running=null;presentation.reset();onCombat(null);actionOrigins.clear();clear(); queue.reset(); previousRects.clear(); phase = null; room = null; lethalPresented=-1;host?.remove(); host = null;currentMatch=null; }
  };
}
