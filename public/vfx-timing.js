// Presentation milliseconds only. No authoritative game/transport timer uses these.
export const VFX_TIMING = Object.freeze({
  cardTravel:560, supportTravel:520, placementSettle:80,
  actionStage:420, actionResolve:200,
  attackCommit:480, impact:40, impactHold:240, repHold:260,
  outcomeHold:40, archiveTravel:620, attackerReturn:100, lethalHold:140, resultFallback:220,
  acknowledgement:1200, executiveResidual:850, engineResidual:850,
  summary:620, lifetimeSlack:300, queueBudget:2900, catchUpAge:1600,
  staticOutcome:240, staticImpactHold:150, staticArchive:180, staticLethal:160, lateCritical:160,
  cue:760, commitCue:420, directionCue:520, archiveCue:940, repCue:950, reducedCue:500,
  snap:180, legacySettle:420, legacyArchiveDelay:940
});

export const VFX_EASING = Object.freeze({ travel:'cubic-bezier(.3,.15,.65,.85)', feedback:'cubic-bezier(.2,.4,.5,1)', signature:'cubic-bezier(.2,.2,.6,1)' });

// CSS and JS share the same runtime owner; there is no separately tuned CSS copy.
export function installVfxTiming(style) {
  for (const [name,value] of Object.entries(VFX_TIMING)) {
    const property=name.replace(/[A-Z]/g,c=>`-${c.toLowerCase()}`);
    style.setProperty(`--vfx-time-${property}`,String(value));
  }
  style.setProperty('--vfx-ease',VFX_EASING.feedback);
  style.setProperty('--vfx-signature-ease',VFX_EASING.signature);
}
