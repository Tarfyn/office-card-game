// The Tutorial is a guided view over the real Match engine. This file is deliberately
// data-first so copy, focus and phase policy stay reviewable in one place.
export const TUTORIAL_STEPS = Object.freeze([
  { id:'opening-hand', phase:'MULLIGAN', labelKey:'openingLabel', copyKey:'stepOpening', focus:'hand', allowed:['MULLIGAN'] },
  { id:'play-employee', phase:'MAIN', labelKey:'employeeLabel', copyKey:'stepEmployee', focus:'hand', allowed:['PLAY_EMPLOYEE'] },
  { id:'play-support', phase:'MAIN', labelKey:'supportLabel', copyKey:'stepSupport', focus:'hand', allowed:['PLAY_SYSTEM','PLAY_ACTION','SET_INCIDENT','RESOLVE_TRIGGER_TARGET','RESOLVE_CHOICE'] },
  { id:'battle', phase:'MAIN', labelKey:'battleLabel', copyKey:'stepBattle', focus:'phase', allowed:['ADVANCE_PHASE'] },
  { id:'attack-employee', phase:'BATTLE', labelKey:'attackEmployeeLabel', copyKey:'stepAttackEmployee', focus:'employees', allowed:['DECLARE_ATTACK'] },
  { id:'direct-attack', phase:'BATTLE', labelKey:'directAttackLabel', copyKey:'stepDirectAttack', focus:'opponent', allowed:['DECLARE_ATTACK'] },
  { id:'end-phase', phase:'END', labelKey:'endLabel', copyKey:'stepEnd', focus:'phase', allowed:['ADVANCE_PHASE','COMPLETE_TUTORIAL'] },
  { id:'complete', phase:null, labelKey:'completeLabel', copyKey:'stepComplete', focus:'result', allowed:[] }
]);

function hasCard(cards) { return (cards ?? []).some(Boolean); }

function hasPlayableSupport(match) {
  const legal = match?.legalActions ?? {};
  return [...(legal.playableSystems ?? []), ...(legal.playableActions ?? []), ...(legal.settableIncidents ?? [])].some((item) => item?.cardId);
}

function hasPlayedDefinition(match, definitionId) {
  const player = match?.players?.[match.viewerId] ?? {};
  return [...(player.employeeField ?? []), ...(player.supportField ?? []), ...(player.archive ?? [])]
    .some((card) => card?.definitionId === definitionId);
}

function hasPlayedEmployee(match) {
  if (match?.tutorialProgress?.playedEmployee) return true;
  const player = match?.players?.[match.viewerId] ?? {};
  return (player.employeeField ?? []).some((card) => card?.onboarding === true)
    || (match?.eventLog ?? []).some((event) => event.type === 'CARD_PLAYED' && event.playerId === match.viewerId && event.data?.cardType === 'EMPLOYEE');
}

function hasEmployeeAttack(match) {
  if (match?.tutorialProgress?.employeeAttack) return true;
  return (match?.eventLog ?? []).some((event) => event.type === 'ATTACK_DECLARED' && event.playerId === match.viewerId && event.data?.targetId != null);
}

function hasDirectAttack(match) {
  if (match?.tutorialProgress?.directAttack) return true;
  return (match?.eventLog ?? []).some((event) => event.type === 'ATTACK_DECLARED' && event.playerId === match.viewerId && event.data?.targetId == null);
}

function hasSetIncident(match) {
  const player = match?.players?.[match.viewerId] ?? {};
  return (player.supportField ?? []).some((card) => card?.definitionId === 'CS-010' && !card.faceUp);
}

function hasSupportLesson(match) {
  return hasSetIncident(match) || hasPlayedDefinition(match, 'N-009');
}

function hasMandatoryInteraction(match) {
  const legal = match?.legalActions ?? {};
  return Boolean(
    legal.canMulligan ||
    legal.archiveExcessHandIds?.length ||
    legal.canResolveChoice ||
    legal.canResolveDeckSelection ||
    legal.canResolveTriggerTargetSelection ||
    legal.canResolveHandSelection ||
    (match?.responseWindow && (legal.canPassPriority || legal.responseOptions?.length))
  );
}

export function tutorialStepForMatch(match, eventLog = match?.eventLog) {
  if (!match) return TUTORIAL_STEPS[0];
  if (eventLog && match.eventLog !== eventLog) match = { ...match, eventLog };
  const me = match.players?.[match.viewerId] ?? {};
  const opponentId = match.viewerId === 'P1' ? 'P2' : 'P1';
  const opponent = match.players?.[opponentId] ?? {};
  if (match.status === 'ENDED') return TUTORIAL_STEPS.find((step) => step.id === 'complete');
  if (match.phase === 'MULLIGAN') return TUTORIAL_STEPS.find((step) => step.id === 'opening-hand');
  if (hasMandatoryInteraction(match)) return TUTORIAL_STEPS.find((step) => step.id === 'play-support');
  if (match.activePlayerId !== match.viewerId) return TUTORIAL_STEPS.find((step) => step.id === 'battle');
  if (match.phase === 'MAIN') {
    if (!hasPlayedEmployee(match)) return TUTORIAL_STEPS.find((step) => step.id === 'play-employee');
    if (!hasSupportLesson(match)) return TUTORIAL_STEPS.find((step) => step.id === 'play-support');
    return TUTORIAL_STEPS.find((step) => step.id === 'battle');
  }
  if (match.phase === 'BATTLE') {
    if (hasEmployeeAttack(match) && hasDirectAttack(match)) return TUTORIAL_STEPS.find((step) => step.id === 'end-phase');
    if (hasCard(opponent.employeeField)) return TUTORIAL_STEPS.find((step) => step.id === 'attack-employee');
    return TUTORIAL_STEPS.find((step) => step.id === 'direct-attack');
  }
  if (match.phase === 'END') return TUTORIAL_STEPS.find((step) => step.id === 'end-phase');
  return TUTORIAL_STEPS[0];
}

export function tutorialActionAllowed(match, intent, eventLog = match?.eventLog) {
  if (hasMandatoryInteraction(match)) return true;
  const step = tutorialStepForMatch(match, eventLog);
  return !step?.allowed?.length || step.allowed.includes(intent?.type);
}
