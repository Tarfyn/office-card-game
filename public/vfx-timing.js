// Presentation milliseconds only. No authoritative game/transport timer uses these.
export const VFX_TIMING = Object.freeze({
  cardTravel:360, supportTravel:340, placementSettle:80,
  actionStage:220, actionResolve:180,
  attackCommit:300, impact:40, impactHold:150, repHold:260,
  outcomeHold:420, archiveTravel:420, attackerReturn:100, lethalHold:220,
  summary:620, lifetimeSlack:300, queueBudget:2900, catchUpAge:1600,
  staticOutcome:240, staticArchive:180, staticLethal:160, lateCritical:160,
  cue:760, commitCue:420, directionCue:520, archiveCue:940, repCue:950, reducedCue:500,
  snap:180, legacySettle:420, legacyArchiveDelay:940
});

const controlledEase='cubic-bezier(.25,.4,.5,1)';
export const VFX_EASING = Object.freeze({ travel:controlledEase, feedback:controlledEase });

// CSS and JS share the same runtime owner; there is no separately tuned CSS copy.
export function installVfxTiming(style) {
  for (const [name,value] of Object.entries(VFX_TIMING)) {
    const property=name.replace(/[A-Z]/g,c=>`-${c.toLowerCase()}`);
    style.setProperty(`--vfx-time-${property}`,String(value));
  }
  style.setProperty('--vfx-ease',VFX_EASING.feedback);
}
