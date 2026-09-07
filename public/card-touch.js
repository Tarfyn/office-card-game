// Delegated once: stable across SSE renders. Never captures the pointer or blocks pan.
export function installCardTouchInspector(root, open, { threshold = 450, tolerance = 12 } = {}) {
  let press = null;
  let suppressUntil = 0;
  const cancel = () => { if (press) clearTimeout(press.timer); press = null; };
  const down = event => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    if (!event.isPrimary || press) { suppressUntil = Date.now() + 800; cancel(); return; }
    const card = event.target.closest?.('.card[data-card-info]');
    if (!card || !root.contains(card) || card.closest('[aria-hidden="true"], [inert], .match-vfx-host, .presentation-proxy')) return;
    const current = { id:event.pointerId, x:event.clientX, y:event.clientY, card, timer:null };
    press = current;
    current.timer = setTimeout(() => {
      if (press !== current || !card.isConnected) return cancel();
      suppressUntil = Date.now() + 1000;
      current.fired = true;
      open(card.dataset.cardInfo);
    }, threshold);
  };
  const move = event => {
    if (press?.id === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > tolerance) {
      suppressUntil = Date.now() + 800;
      cancel();
    }
  };
  const up = event => { if (press?.id === event.pointerId) { if (press.fired) suppressUntil = Date.now() + 800; cancel(); } };
  const abort = () => { if (press) suppressUntil = Date.now() + 800; cancel(); };
  const click = event => {
    if (Date.now() < suppressUntil && event.detail !== 0) {
      event.preventDefault(); event.stopImmediatePropagation(); suppressUntil = 0;
    }
  };
  root.addEventListener('pointerdown', down, true);
  root.addEventListener('pointermove', move, true);
  root.addEventListener('pointerup', up, true);
  root.addEventListener('pointercancel', abort, true);
  root.addEventListener('click', click, true);
  root.addEventListener('scroll', cancel, true);
  return () => {
    cancel();
    for (const [name, handler] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',abort],['click',click],['scroll',cancel]]) root.removeEventListener(name, handler, true);
  };
}
