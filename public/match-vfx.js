// Presentation only: consume authoritative events; never infer legality or outcomes.
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
    case 'CHAIN_ITEM_DELAYED': return [cue('warning')];
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
    enqueue(events, { roomId, present = true, now = Date.now(), ownerOf } = {}) {
      if (room !== roomId) { this.reset(); room = roomId; }
      const previous = watermark;
      const seen = new Set();
      for (const event of events) {
        if (!Number.isSafeInteger(event.seq) || event.seq <= previous || seen.has(event.seq)) continue;
        seen.add(event.seq);
        watermark = Math.max(watermark, event.seq);
        if (event.type === 'ATTACK_TARGET_REDIRECTED') pending = pending.filter((cue) => cue.kind !== 'travel');
        if (present) pending.push(...feedbackForEvent(event, ownerOf).map((cue) => ({ ...cue, at:now })));
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

export function createMatchVfx({ archiveLabel }) {
  const queue = createFeedbackQueue();
  const active = new Map();
  let host = null;
  let room = null;
  let phase = null;
  let previousRects = new Map();
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const remove = (node) => {
    clearTimeout(active.get(node));
    active.delete(node);
    node.remove();
  };
  const clear = () => { for (const node of active.keys()) remove(node); };
  // One set of listeners per application; never installed from render().
  window.addEventListener('resize', () => { clear(); previousRects.clear(); }, { passive:true });
  window.addEventListener('scroll', () => { clear(); previousRects.clear(); }, { passive:true, capture:true });
  document.addEventListener('visibilitychange', () => { clear(); queue.drain(Infinity); });
  media.addEventListener('change', clear);

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
    if (!node) return null;
    const r = node.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return null;
    return { left:r.left, top:r.top, width:r.width, height:r.height };
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
    enqueue(events, options) {
      if (room !== options.roomId) { this.reset(); room = options.roomId; }
      queue.enqueue(events, { ...options, present:options.present && !document.hidden });
    },
    sync(match) {
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
        const lifetime = parseFloat(getComputedStyle(node).getPropertyValue('--vfx-life')) || 700;
        active.set(node, setTimeout(() => remove(node), lifetime));
      }
    },
    reset() { clear(); queue.reset(); previousRects.clear(); phase = null; room = null; host?.remove(); host = null; }
  };
}
