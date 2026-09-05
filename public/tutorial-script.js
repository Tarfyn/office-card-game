// The Tutorial is a guided view over the real Match engine. This file is deliberately
// data-first so copy, focus and phase policy stay reviewable in one place.
export const TUTORIAL_STEPS = Object.freeze([
  { id:'opening-hand', phase:'MULLIGAN', labelKey:'openingLabel', copyKey:'stepOpening', focus:'hand', allowed:['MULLIGAN'] },
  { id:'start-phase', phase:'START', labelKey:'startLabel', copyKey:'stepStart', focus:'phase', allowed:['ADVANCE_PHASE'] },
  { id:'draw-phase', phase:'DRAW', labelKey:'drawLabel', copyKey:'stepDraw', focus:'phase', allowed:['ADVANCE_PHASE'] },
  { id:'play-employee', phase:'MAIN', labelKey:'employeeLabel', copyKey:'stepEmployee', focus:'hand', allowed:['PLAY_EMPLOYEE'] },
  { id:'play-support', phase:'MAIN', labelKey:'supportLabel', copyKey:'stepSupport', focus:'hand', allowed:['PLAY_SYSTEM','PLAY_ACTION','SET_INCIDENT','RESOLVE_TRIGGER_TARGET','RESOLVE_CHOICE'] },
  { id:'response-setup', phase:'MAIN', labelKey:'incidentLabel', copyKey:'stepIncident', focus:'hand', allowed:['SET_INCIDENT','ADVANCE_PHASE'] },
  { id:'battle', phase:'BATTLE', labelKey:'battleLabel', copyKey:'stepBattle', focus:'phase', allowed:['ADVANCE_PHASE'] },
  { id:'attack-employee', phase:'BATTLE', labelKey:'attackEmployeeLabel', copyKey:'stepAttackEmployee', focus:'employees', allowed:['DECLARE_ATTACK'] },
  { id:'direct-attack', phase:'BATTLE', labelKey:'directAttackLabel', copyKey:'stepDirectAttack', focus:'opponent', allowed:['DECLARE_ATTACK'] },
  { id:'end-phase', phase:'END', labelKey:'endLabel', copyKey:'stepEnd', focus:'phase', allowed:['ADVANCE_PHASE'] },
  { id:'coach-turn', phase:null, labelKey:'coachLabel', copyKey:'stepCoach', focus:'opponent', allowed:[] },
  { id:'response', phase:null, labelKey:'responseLabel', copyKey:'stepResponse', focus:'response', allowed:['ACTIVATE_RESPONSE','PASS_PRIORITY'] },
  { id:'complete', phase:null, labelKey:'completeLabel', copyKey:'stepComplete', focus:'result', allowed:[] }
]);

function hasCard(cards) { return (cards ?? []).some(Boolean); }

function hasPlayableSupport(match) {
  const legal = match?.legalActions ?? {};
  return [...(legal.playableSystems ?? []), ...(legal.playableActions ?? []), ...(legal.settableIncidents ?? [])].some((item) => item?.cardId);
}

function hasPlayedDefinition(match, definitionId) {
  const player = match?.players?.[match.viewerId] ?? {};
  return [...(player.hand ?? []), ...(player.employeeField ?? []), ...(player.supportField ?? []), ...(player.archive ?? [])]
    .some((card) => card?.definitionId === definitionId);
}

function hasEmployeeAttack(match) {
  return (match?.eventLog ?? []).some((event) => event.type === 'ATTACK_DECLARED' && event.playerId === match.viewerId && event.data?.targetId != null);
}

function hasDirectAttack(match) {
  return (match?.eventLog ?? []).some((event) => event.type === 'ATTACK_DECLARED' && event.playerId === match.viewerId && event.data?.targetId == null);
}

function hasSetIncident(match) {
  const player = match?.players?.[match.viewerId] ?? {};
  return (player.supportField ?? []).some((card) => card?.definitionId === 'CS-010' && !card.faceUp);
}

function hasSupportLesson(match) {
  return hasSetIncident(match) || hasPlayedDefinition(match, 'N-009');
}

export function tutorialStepForMatch(match) {
  if (!match) return TUTORIAL_STEPS[0];
  const me = match.players?.[match.viewerId] ?? {};
  const opponentId = match.viewerId === 'P1' ? 'P2' : 'P1';
  const opponent = match.players?.[opponentId] ?? {};
  if (match.status === 'ENDED') return TUTORIAL_STEPS.find((step) => step.id === 'complete');
  // Passing an empty response window is still an authoritative step. Hiding
  // it makes a guided attack look stalled when the player simply needs to
  // pass priority.
  if (match.responseWindow) {
    return TUTORIAL_STEPS.find((step) => step.id === 'response');
  }
  if (match.pendingTriggerTargetSelection || match.pendingChoice) return TUTORIAL_STEPS.find((step) => step.id === 'play-support');
  if (match.phase === 'MULLIGAN') return TUTORIAL_STEPS.find((step) => step.id === 'opening-hand');
  if (match.activePlayerId !== match.viewerId) return TUTORIAL_STEPS.find((step) => step.id === 'coach-turn');
  if (match.phase === 'START') return TUTORIAL_STEPS.find((step) => step.id === 'start-phase');
  if (match.phase === 'DRAW') return TUTORIAL_STEPS.find((step) => step.id === 'draw-phase');
  if (match.phase === 'MAIN') {
    if (!hasCard(me.employeeField)) return TUTORIAL_STEPS.find((step) => step.id === 'play-employee');
    if (!hasSupportLesson(match)) return TUTORIAL_STEPS.find((step) => step.id === 'play-support');
    if (hasEmployeeAttack(match) && !hasDirectAttack(match) && !hasSetIncident(match)) return TUTORIAL_STEPS.find((step) => step.id === 'response-setup');
    return TUTORIAL_STEPS.find((step) => step.id === 'battle');
  }
  if (match.phase === 'BATTLE') {
    if (!(match.legalActions?.attacks ?? []).length) return TUTORIAL_STEPS.find((step) => step.id === 'end-phase');
    if (match.pendingAttack || hasCard(opponent.employeeField)) return TUTORIAL_STEPS.find((step) => step.id === 'attack-employee');
    return TUTORIAL_STEPS.find((step) => step.id === 'direct-attack');
  }
  if (match.phase === 'END') return TUTORIAL_STEPS.find((step) => step.id === 'end-phase');
  return TUTORIAL_STEPS[0];
}

export function tutorialActionAllowed(match, intent) {
  const step = tutorialStepForMatch(match);
  return !step?.allowed?.length || step.allowed.includes(intent?.type);
}
