// Visual composition only. Timings, event delivery and gameplay remain with their owners.
export const SIGNATURE_LIMITS = Object.freeze({ roots:3, particles:24, nodes:128 });
export const DEPARTMENT_MODIFIERS = Object.freeze({
  CUSTOMER_SERVICE:'routing', IT:'terminal', OFFICE:'approval', MARKETING:'momentum',
  PRODUCTION:'throughput', NEUTRAL:'paperwork'
});
export const HERO_PRESETS = Object.freeze({
  lethal:Object.freeze({level:'HERO',motif:'kpi-crash',particles:12,sfxPreset:'corporate-collapse'}),
  executive:Object.freeze({level:'HERO',motif:'executive-prism',particles:12,sfxPreset:'executive-arrival'}),
  // Reserved composition hooks; no reward/economy or audio side effects.
  reward:Object.freeze({level:'HERO',motif:'executive-prism',particles:12,sfxPreset:'reward-reveal'})
});
export function visibleSignatureMetadata(card, definition) {
  if(!card?.definitionId || definition?.id!==card.definitionId) return null;
  return {department:DEPARTMENT_MODIFIERS[definition.department] ? definition.department : 'NEUTRAL',
    executive:card.variantId===`${card.definitionId}-EXEC`};
}
export function signaturePreset(kind, metadata, {staticFeedback=false}={}) {
  const hero=HERO_PRESETS[kind];
  if(kind==='executive' && !metadata?.executive) return null;
  if(!hero && !['resolve','negate','scope','delay','major'].includes(kind)) return null;
  return {kind,level:hero?.level??'ENGINE',motif:hero?.motif??kind,
    modifier:DEPARTMENT_MODIFIERS[metadata?.department]??'paperwork',
    particles:staticFeedback ? 0 : hero?.particles??6, static:staticFeedback,
    sfxPreset:hero?.sfxPreset??`effect-${kind}`};
}
// Only server-confirmed REP zero qualifies. Tutorial completion, concession and
// nonlethal damage cannot become a corporate-disaster Hero through UI inference.
export function lethalOutcome(events) {
  const end=events.find(e=>e.type==='GAME_ENDED' && e.data?.reason==='REPUTATION_ZERO');
  return end && ['P1','P2'].includes(end.playerId) ? {seq:end.seq,playerId:end.playerId==='P1'?'P2':'P1'} : null;
}
export function signatureForStep(entry, step, metadata, options={}) {
  if(step==='settle' && ['placement','action-play'].includes(entry.type)) return signaturePreset('executive',metadata,options);
  if(step==='resolve') {
    if(entry.events.some(e=>e.type==='ACTION_RESOLVED' && e.data?.negated)) return signaturePreset('negate',metadata,options);
    if(metadata?.executive && entry.events.some(e=>e.type==='CARD_PLAYED')) return signaturePreset('executive',metadata,options);
    if((entry.payload.archived??[]).filter(e=>e.cardInstanceId!==entry.payload.cardId).length>1) return signaturePreset('resolve',metadata,options);
  }
  // The combat overlay owns the outcome. Fan-out becomes visible when it clears
  // for Archive, rather than drawing a second explanation beneath opaque cards.
  if(step==='archive' && entry.type!=='action' && (entry.payload.archived?.length??0)>1) return signaturePreset('scope',metadata,options);
  if(step==='summary') return signaturePreset(entry.payload.lethal ? 'lethal' : 'scope',metadata,options);
  return null; // CORE is deliberately untouched.
}

const NS='http://www.w3.org/2000/svg';
const paths={
  routing:'M20 32H58V16H82V38H58V64H20Z M30 40V56 M58 38H92 M84 30L92 38L84 46',
  terminal:'M16 20H84V80H16Z M26 38L36 46L26 54 M43 56H67 M22 70H78',
  approval:'M22 20H67L80 33V80H22Z M67 20V34H80 M34 55L44 65L67 42 M30 72H69',
  momentum:'M17 80V24 M17 80H85 M27 66L42 50L55 59L78 26 M64 26H78V40',
  throughput:'M16 36H84V65H16Z M24 74H76 M29 43L42 51L29 59 M55 43L68 51L55 59',
  paperwork:'M26 16H69L81 28V77H26Z M69 16V29H81 M18 29V85H69 M37 43H68 M37 55H62 M37 67H66'
};
function svgNode(tag,attrs={}) { const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n; }
// One finite SVG tree. No listeners, timers, filters, image fetches or frame loop.
export function decorateSignature(node,preset,{targets=[],origin=null,rect,particleRoom=SIGNATURE_LIMITS.particles}={}) {
  node.classList.add('vfx-signature',`signature-${preset.kind}`,`signature-${preset.level.toLowerCase()}`,`signature-${preset.modifier}`);
  if(preset.static) node.classList.add('signature-static');
  node.inert=true;node.setAttribute('aria-hidden','true');node.dataset.signature=preset.kind;
  const svg=svgNode('svg',{viewBox:'0 0 100 100',preserveAspectRatio:'none',class:'signature-art'});
  const line=(d,cls)=>svg.appendChild(svgNode('path',{d,class:cls,fill:'none','vector-effect':'non-scaling-stroke'}));
  line('M3 24V3H24 M76 3H97V24 M97 76V97H76 M24 97H3V76','signature-brackets');
  if(preset.kind==='lethal') {
    // Abstract failed KPI: no slogan, no new gameplay value, no localized text.
    line('M4 12H96 M4 88H96','signature-warning');
    // Right-hand margin stays outside the central combat/response presentation.
    line('M80 23V72H97 M82 30L85 37L87 31L89 41L91 35L94 67L97 67','signature-kpi');
    line('M94 59L97 67L99 59','signature-kpi');
    svg.appendChild(svgNode('ellipse',{cx:97,cy:67,rx:1,ry:3,class:'signature-zero'}));
  } else if(preset.kind==='executive') {
    line('M50 2L98 50L50 98L2 50Z M15 2H85 M15 98H85','signature-prism');
    line('M-20 100L80 0 M20 100L120 0','signature-sweep');
  } else {
    // Keep the department glyph square and readable instead of stretching it
    // over the affected-card bounding box. The propagation fan owns that area.
    const badge=svgNode('svg',{x:64,y:4,width:32,height:28,viewBox:'0 0 100 100',preserveAspectRatio:'xMidYMid meet',class:'signature-badge'});
    badge.appendChild(svgNode('rect',{x:6,y:6,width:88,height:88,rx:5,class:'signature-badge-plate'}));
    badge.appendChild(svgNode('path',{d:paths[preset.modifier],class:'signature-motif',fill:'none','vector-effect':'non-scaling-stroke'}));
    svg.appendChild(badge);
    if(preset.kind==='negate') line('M16 16L84 84 M84 16L16 84','signature-reject');
    else if(preset.kind==='delay') line('M65 16V35H84 M67 35L80 20','signature-pending');
  }
  // Shared source and one connected fan-out. Only confirmed affected IDs supply targets.
  if(origin && rect?.width && rect?.height) {
    const point=r=>[(r.left+r.width/2-rect.left)/rect.width*100,(r.top+r.height/2-rect.top)/rect.height*100];
    const [x,y]=point(origin);
    const d=targets.slice(0,8).map(r=>{const [tx,ty]=point(r);return `M${x} ${y}L${tx} ${ty}m-2 -2h4v4h-4Z`;}).join(' ');
    if(d) line(d,'signature-propagation');
  }
  const count=Math.min(preset.particles,particleRoom);
  for(let i=0;i<count;i++) {
    const paper=svgNode('rect',{x:8+(i*37)%84,y:8+(i*23)%80,width:2.4,height:4.3,class:'signature-paper'});
    paper.style.setProperty('--paper-x',`${(i%2?1:-1)*(8+i%4*3)}px`);
    paper.style.setProperty('--paper-y',`${(i%3-1)*15}px`);
    paper.style.setProperty('--paper-angle',`${(i%2?1:-1)*18}deg`);
    svg.appendChild(paper);
  }
  node.appendChild(svg);
  return node;
}
