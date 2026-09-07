// Presentation adapter only. The server's legal actions own gameplay eligibility.
export function handEligibility(match, card, { controls = true, busy = false, tutorialAllowed = true } = {}) {
  if (!controls) return { allowed:false, reasonCode:'OBSERVER' };
  if (busy) return { allowed:false, reasonCode:'BUSY' };
  const result = match?.legalActions?.handEligibility?.[card?.instanceId];
  if (result?.allowed && !tutorialAllowed) return { allowed:false, reasonCode:'TUTORIAL' };
  return result ?? { allowed:false, reasonCode:'UNAVAILABLE' };
}

export function eligibilityText(result, t, describeFilter) {
  if (result.allowed) return '';
  const params = result.reasonParams ?? {};
  if (result.reasonCode === 'PROMOTION') {
    return t(params.required === 1 ? 'eligibility.PROMOTION_ONE' : 'eligibility.PROMOTION', { ...params, requirement:describeFilter(params.filter) });
  }
  if (result.reasonCode === 'NO_TARGET') {
    const controller = ['OPPONENT','SELF'].includes(params.controller) ? t(`eligibility.${params.controller}`) : '';
    return t('eligibility.NO_TARGET', { requirement:[controller, describeFilter(params.filter)].filter(Boolean).join(' ') });
  }
  return t(`eligibility.${result.reasonCode ?? 'UNAVAILABLE'}`, params);
}
