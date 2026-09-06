// Pure presentation planning. Event IDs and outcomes come exclusively from the server.
import { VFX_TIMING as timing } from './vfx-timing.js';
export const PRESENTATION_BUDGET_MS = timing.queueBudget;
export const PRESENTATION_MAX_PENDING = 6;
const duration = { travel:timing.cardTravel, commit:timing.attackCommit, impact:timing.impact,
  impactHold:timing.impactHold, outcome:timing.outcomeHold, archive:timing.archiveTravel,
  return:timing.attackerReturn, settle:timing.placementSettle, resolve:timing.actionResolve,
  result:timing.lethalHold, summary:timing.summary };
const critical = new Set(['impact','impactHold','outcome','archive','resolve','result','summary']);
const step = (type) => ({ type, duration:duration[type], critical:critical.has(type) });
const isPlay = (e) => e.type === 'CARD_PLAYED' || e.type === 'INCIDENT_SET';

export function presentationSteps(entry, { reducedMotion = false, catchUp = false } = {}) {
  return entry.steps.map((s) => ({ ...s, duration:
    catchUp && !s.critical ? 0 : reducedMotion && ['travel','commit','return'].includes(s.type) ? 0 :
    (reducedMotion || catchUp) && s.type === 'archive' ? timing.staticArchive :
    reducedMotion && s.type === 'outcome' ? timing.staticOutcome :
    reducedMotion && s.type === 'result' ? timing.staticLethal : s.duration,
    static:reducedMotion || catchUp
  }));
}

// CARD_ARCHIVED precedes BATTLE_RESOLVED in the engine. Match exact reported IDs;
// never infer destruction from Power, a missing DOM node, or a candidate list.
export function planPresentations(events, attacks = new Map()) {
  const used = new Set();
  const entries = [];
  const add = (type, anchor, related, steps, payload = {}) => {
    related.forEach((e) => used.add(e.seq));
    const ordered = [...related].sort((a,b) => a.seq-b.seq);
    const entry = { key:`${type}:${anchor.seq}`, type, seq:ordered[0]?.seq ?? anchor.seq,
      priority:type === 'result' ? 2 : 1, events:ordered, payload, steps:steps.map(step), startedAt:null };
    entry.sfxPreset=type; // Optional future hook; no audio dependency or playback here.
    for (const s of entry.steps) {
      if(s.type==='travel') s.duration=type.startsWith('action') ? timing.actionStage :
        anchor.type==='INCIDENT_SET'||anchor.data?.cardType==='SYSTEM' ? timing.supportTravel : timing.cardTravel;
      if(type==='direct' && s.type==='impactHold') s.duration=timing.repHold;
    }
    entry.maxDuration = entry.steps.reduce((sum,s) => sum+s.duration,0) + timing.lifetimeSlack;
    entries.push(entry);
  };
  for (const event of events) if (event.type === 'ATTACK_DECLARED') attacks.set(event.cardInstanceId,event);
  for (const event of events) if (event.type === 'ATTACK_TARGET_REDIRECTED') {
    for (const [id,attack] of attacks) if (attack.data?.targetId === event.data?.oldTargetId) {
      attacks.set(id,{...attack,data:{...attack.data,targetId:event.data.newTargetId}});
    }
  }
  for (const event of events) {
    const d = event.data ?? {};
    const battle = event.type === 'BATTLE_RESOLVED';
    const direct = event.type === 'REPUTATION_CHANGED' && d.reason === 'DIRECT_ATTACK';
    if (!battle && !direct) continue;
    const candidates=[...attacks.values(),...events.filter(e=>e.type==='ATTACK_DECLARED')].filter(a=>a.seq<event.seq).sort((a,b)=>b.seq-a.seq);
    const attackerId = battle ? d.attackerId ?? event.cardInstanceId
      : candidates.find((a) => a.playerId !== event.playerId && a.data?.targetId == null)?.cardInstanceId;
    const attack = candidates.find(a=>a.cardInstanceId===attackerId);
    const freshAttack = attack && events.some((e) => e.seq === attack.seq);
    const related = events.filter((e) => !used.has(e.seq) && (
      e.seq === event.seq || (freshAttack && e.seq === attack.seq) ||
      (battle && e.type === 'CARD_ARCHIVED' && (d.destroyedIds ?? []).includes(e.cardInstanceId) && e.seq < event.seq && e.seq > (attack?.seq ?? -1)) ||
      (battle && e.type === 'REPUTATION_CHANGED' && e.data?.reason === 'BREAKTHROUGH' && e.seq < event.seq && e.seq > (attack?.seq ?? -1)) ||
      (battle && e.type === 'BREAKTHROUGH_DAMAGE' && e.cardInstanceId === attackerId && e.seq < event.seq && e.seq > (attack?.seq ?? -1))
    ));
    const archived = related.filter((e) => e.type === 'CARD_ARCHIVED');
    add(battle ? 'combat' : 'direct',event,related,
      [...(freshAttack ? ['commit'] : []),'impact','impactHold',...(battle ? ['outcome'] : []),...(archived.length ? ['archive'] : []),'return'],
      { attackerId, targetId:d.targetId ?? null, defenderId:direct ? event.playerId : null,
        attack, archived, destroyedIds:battle ? d.destroyedIds ?? [] : [], winnerId:d.winnerId ?? null });
    if((attacks.get(attackerId)?.seq??0)<event.seq) attacks.delete(attackerId);
  }
  for (const event of events) {
    if (used.has(event.seq) || event.type !== 'ACTION_RESOLVED') continue;
    const related = events.filter((e) => !used.has(e.seq) && (e.seq === event.seq ||
      (isPlay(e) && e.cardInstanceId === event.cardInstanceId) ||
      (e.type === 'CARD_ARCHIVED' && (e.cardInstanceId === event.cardInstanceId || e.data?.causeSourceId === event.cardInstanceId))));
    add('action',event,related,[...(related.some(isPlay) ? ['travel'] : []),'resolve',...(related.some(e=>e.type==='CARD_ARCHIVED') ? ['archive'] : [])],
      { cardId:event.cardInstanceId, playerId:event.playerId, archived:related.filter(e=>e.type==='CARD_ARCHIVED') });
  }
  for (const event of events) {
    if (used.has(event.seq)) continue;
    if (isPlay(event)) {
      const action = event.data?.cardType === 'ACTION';
      const related=events.filter(e=>!used.has(e.seq)&&(e.seq===event.seq || (e.type==='CARD_MOVED'&&e.cardInstanceId===event.cardInstanceId&&['EMPLOYEE_FIELD','SUPPORT_FIELD'].includes(e.data?.to))));
      add(action ? 'action-play' : 'placement',event,related,['travel','settle'],{cardId:event.cardInstanceId,playerId:event.playerId});
    } else if (event.type === 'ATTACK_DECLARED') {
      add('attack',event,[event],['commit','return'],{attackerId:event.cardInstanceId,targetId:event.data?.targetId ?? null,playerId:event.playerId});
    } else if (event.type === 'CARD_ARCHIVED') {
      const related = events.filter(e=>!used.has(e.seq) && e.type==='CARD_ARCHIVED' && e.data?.causeSourceId===event.data?.causeSourceId);
      add('archive',event,related,['outcome','archive'],{archived:related});
    } else if (event.type === 'REPUTATION_CHANGED' && Number(event.data?.delta ?? event.data?.amount)) {
      add('damage',event,[event],['impact']);
    } else if (event.type === 'GAME_ENDED') {
      add('result',event,[event],['result']);
    }
  }
  // Keep at most the current attack per card, even across open response windows.
  while (attacks.size > 18) attacks.delete(attacks.keys().next().value);
  return { entries:entries.sort((a,b)=>a.priority-b.priority || a.seq-b.seq), used };
}

function summaryOf(entries) {
  const archived = new Set(), saved = new Set();
  const damage = { P1:0, P2:0 };
  const archivedByPlayer = { P1:0, P2:0 };
  const repChanges = { P1:{loss:0,gain:0}, P2:{loss:0,gain:0} };
  let battles=0, resolutions=0, denied=0, result=false, archivedCount=0;
  for (const entry of entries) {
    if (entry.type === 'summary') {
      const p=entry.payload;
      p.archived.forEach(id=>archived.add(id)); p.saved.forEach(id=>saved.add(id));
      damage.P1+=p.damage.P1; damage.P2+=p.damage.P2;
      for(const id of ['P1','P2']) archivedByPlayer[id]+=p.archivedByPlayer[id];
      for(const id of ['P1','P2']) for(const kind of ['loss','gain']) repChanges[id][kind]+=p.repChanges[id][kind];
      battles+=p.battles; resolutions+=p.resolutions; denied+=p.denied; result ||= p.result; archivedCount+=p.archivedCount;
      continue;
    }
    for (const e of entry.events) {
      if (e.type==='CARD_ARCHIVED') { archived.add(e.cardInstanceId); archivedCount++; if(e.playerId in archivedByPlayer) archivedByPlayer[e.playerId]++; }
      if (e.type==='DESTRUCTION_PREVENTED') saved.add(e.cardInstanceId);
      if (e.type==='REPUTATION_CHANGED' && e.playerId in damage) {
        const amount=Number(e.data?.delta ?? e.data?.amount ?? 0);
        damage[e.playerId]+=amount;repChanges[e.playerId][amount<0?'loss':'gain']+=amount;
      }
      if (e.type==='BATTLE_RESOLVED') { battles++; (e.data?.replacedOrPreventedIds ?? []).forEach(id=>saved.add(id)); }
      if (e.type==='ACTION_RESOLVED') { resolutions++; if(e.data?.negated) denied++; }
      if (e.type==='GAME_ENDED') result=true;
    }
  }
  return { archived:[...archived].slice(0,80), saved:[...saved].slice(0,80), archivedCount, archivedByPlayer, damage, repChanges, battles, resolutions, denied, result };
}

export function createPresentationQueue() {
  let room=null, watermark=-1, pending=[], current=null;
  const attacks=new Map();
  return {
    enqueue(events, {roomId, present=true, now=Date.now(), prepare=(e)=>e}={}) {
      if(room!==roomId) { this.reset(); room=roomId; }
      const previous=watermark, seen=new Set();
      const fresh=events.filter(e=>Number.isSafeInteger(e.seq)&&e.seq>previous&&!seen.has(e.seq)&&seen.add(e.seq)).sort((a,b)=>a.seq-b.seq);
      if(fresh.length) watermark=fresh.at(-1).seq;
      if(!present) { attacks.clear(); return {fresh:[],used:new Set()}; }
      for(const event of fresh) if(event.type==='ATTACK_TARGET_REDIRECTED') {
        for(const entry of pending) if(entry.type==='attack'&&entry.payload.targetId===event.data?.oldTargetId) entry.payload.targetId=event.data.newTargetId;
      }
      const planned=planPresentations(fresh,attacks);
      for(const entry of planned.entries) {
        entry.key=`${roomId}:${entry.key}`; entry.enqueuedAt=now;
        if((entry.payload.archived?.length??0)>4) {
          const payload=summaryOf([entry]);
          entry.type='summary';entry.payload=payload;entry.events=[];
          entry.steps=[step('summary')];entry.maxDuration=duration.summary+timing.lifetimeSlack;
        }
        prepare(entry); pending.push(entry);
      }
      pending.sort((a,b)=>a.priority-b.priority||a.seq-b.seq);
      const cost=pending.reduce((sum,e)=>sum+e.steps.reduce((s,x)=>s+x.duration,0),0);
      const remaining=current ? Math.max(0,current.steps.reduce((sum,s)=>sum+s.duration,0)-(now-current.startedAt)) : 0;
      if(pending.length>PRESENTATION_MAX_PENDING || cost+remaining>PRESENTATION_BUDGET_MS) {
        const important=pending.filter(e=>e.steps.some(s=>s.critical));
        if(important.length) {
          const first=important[0];
          pending=[{key:`${roomId}:summary:${first.seq}:${watermark}`,type:'summary',seq:first.seq,priority:1,
            events:[],payload:summaryOf(important),steps:[step('summary')],maxDuration:duration.summary+timing.lifetimeSlack,enqueuedAt:now,startedAt:null}];
        } else pending=pending.slice(-1);
      }
      return {fresh,used:planned.used};
    },
    take(now=Date.now()) {
      if(current || !pending.length) return null;
      current=pending.shift(); current.startedAt=now;
      current.catchUp=now-current.enqueuedAt>timing.catchUpAge;
      return current;
    },
    complete(key) { if(current?.key===key) current=null; },
    get busy() { return Boolean(current||pending.length); },
    get size() { return pending.length+(current?1:0); },
    get current() { return current; },
    reset() { pending=[];current=null;attacks.clear();watermark=-1;room=null; }
  };
}
