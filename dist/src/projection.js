import { getCurrentPower, getLegalActions, getPowerBreakdown } from "./engine.js";
function isPublicCard(card) {
    if (card.zone === "ARCHIVE" || card.zone === "EMPLOYEE_FIELD" || card.zone === "PENDING")
        return true;
    if (card.zone === "SUPPORT_FIELD" && card.faceUp)
        return true;
    return false;
}
function hiddenSupportId(card) {
    return `hidden-support:${card.controllerId}:${card.slot ?? -1}:${card.objectVersion}`;
}
function hasSupportRevealPermission(state, viewerId, controllerId) {
    return state.revealPermissions.some((permission) => permission.viewerId === viewerId && permission.controllerId === controllerId && permission.expiresAtTurnNumber >= state.turnNumber);
}
export function clientCardRef(state, viewerId, instanceId) {
    const card = state.cards[instanceId];
    if (!card)
        return null;
    const viewerOwnsKnowledge = card.ownerId === viewerId || card.controllerId === viewerId;
    const temporarilyRevealed = card.zone === "SUPPORT_FIELD" && !card.faceUp && hasSupportRevealPermission(state, viewerId, card.controllerId);
    if (viewerOwnsKnowledge || isPublicCard(card) || temporarilyRevealed)
        return instanceId;
    if (card.zone === "SUPPORT_FIELD" && !card.faceUp)
        return hiddenSupportId(card);
    return null;
}
function projectLegalActions(state, viewerId, legal) {
    const mapCandidates = (ids) => ids.map((id) => clientCardRef(state, viewerId, id)).filter((id) => id !== null);
    const mapTargetChoices = (choices) => choices.map((choice) => ({
        ...choice,
        candidateIds: mapCandidates(choice.candidateIds)
    }));
    return {
        ...structuredClone(legal),
        responseOptions: legal.responseOptions.map((option) => ({ ...option, targetChoices: mapTargetChoices(option.targetChoices) })),
        playableActions: legal.playableActions.map((option) => ({ ...option, targetChoices: mapTargetChoices(option.targetChoices) })),
        activatableAbilities: legal.activatableAbilities.map((option) => ({ ...option, targetChoices: mapTargetChoices(option.targetChoices) })),
        attacks: legal.attacks.map((attack) => ({ ...attack, targetIds: attack.targetIds.map((id) => id === null ? null : clientCardRef(state, viewerId, id)).filter((id) => id !== null || attack.targetIds.includes(null)) }))
    };
}
function projectedSourceIdentity(state, viewerId, sourceInstanceId) {
    if (!sourceInstanceId)
        return {};
    const sourceRef = clientCardRef(state, viewerId, sourceInstanceId);
    if (sourceRef !== sourceInstanceId)
        return {};
    const source = state.cards[sourceInstanceId];
    return source ? { sourceId: sourceRef, sourceDefinitionId: source.definitionId } : {};
}
function projectLiveStatuses(state, viewerId, instanceId) {
    const card = state.cards[instanceId];
    const statuses = [];
    if (card.onboarding)
        statuses.push({ kind: "ONBOARDING", label: "Onboarding", detail: "Cannot attack this turn." });
    if (card.attacksUsed > 0)
        statuses.push({ kind: "ATTACK_USED", label: "Attack used", detail: `${card.attacksUsed} / ${card.maxAttacks} attacks used.` });
    const restrictionActive = card.cannotAttackUntilTurnNumber === state.turnNumber || (card.cannotAttackThroughControllerTurnsStarted !== null && state.players[card.controllerId].turnsStarted <= card.cannotAttackThroughControllerTurnsStarted);
    if (restrictionActive)
        statuses.push({
            kind: "ATTACK_RESTRICTED", label: "Attack restricted", detail: "This Employee cannot declare an attack in the current restriction window.",
            ...projectedSourceIdentity(state, viewerId, card.attackRestrictionSourceInstanceId),
            ...(card.attackRestrictionAbilityId ? { abilityId: card.attackRestrictionAbilityId } : {}),
            ...(card.attackRestrictionDuration ? { duration: card.attackRestrictionDuration } : {})
        });
    if (card.maxAttacks !== 1)
        statuses.push({ kind: "ATTACK_LIMIT", label: `Max attacks ${card.maxAttacks}`, detail: "Current attack allowance differs from the normal 1." });
    for (const modifier of card.keywordModifiers)
        statuses.push({
            kind: "KEYWORD", label: modifier.keyword, detail: "Granted keyword.",
            ...projectedSourceIdentity(state, viewerId, modifier.sourceInstanceId),
            ...(modifier.abilityId ? { abilityId: modifier.abilityId } : {}),
            ...(modifier.duration ? { duration: modifier.duration } : {})
        });
    for (const shield of card.destructionShields)
        statuses.push({
            kind: "DESTRUCTION_SHIELD", label: "Destruction shield", detail: shield.onlyOpponentSource ? "Prevents an applicable opponent card-effect destruction." : "Prevents an applicable card-effect destruction.",
            ...projectedSourceIdentity(state, viewerId, shield.sourceInstanceId),
            ...(shield.abilityId ? { abilityId: shield.abilityId } : {}),
            ...(shield.duration ? { duration: shield.duration } : {})
        });
    return statuses;
}
function projectPowerBreakdown(state, viewerId, instanceId) {
    return getPowerBreakdown(state, instanceId).contributions.map((contribution) => {
        const identity = projectedSourceIdentity(state, viewerId, contribution.sourceInstanceId);
        return {
            kind: contribution.kind,
            amount: contribution.amount,
            ...identity,
            ...(identity.sourceId && contribution.abilityId ? { abilityId: contribution.abilityId } : {}),
            ...(contribution.duration ? { duration: contribution.duration } : {})
        };
    });
}
function projectCard(state, viewerId, instanceId) {
    const card = state.cards[instanceId];
    const viewerOwnsKnowledge = card.ownerId === viewerId || card.controllerId === viewerId;
    const temporarilyRevealed = card.zone === "SUPPORT_FIELD" && !card.faceUp && hasSupportRevealPermission(state, viewerId, card.controllerId);
    const visible = viewerOwnsKnowledge || isPublicCard(card) || temporarilyRevealed;
    const syntheticHiddenSupport = card.zone === "SUPPORT_FIELD" && !card.faceUp && !viewerOwnsKnowledge && !temporarilyRevealed;
    const view = {
        instanceId: syntheticHiddenSupport ? hiddenSupportId(card) : card.instanceId,
        ownerId: card.ownerId,
        controllerId: card.controllerId,
        zone: card.zone,
        faceUp: card.faceUp,
        slot: card.slot
    };
    if (visible)
        view.definitionId = card.definitionId;
    if (card.zone === "EMPLOYEE_FIELD" && visible) {
        view.onboarding = card.onboarding;
        view.attacksUsed = card.attacksUsed;
        view.maxAttacks = card.maxAttacks;
        view.currentPower = getCurrentPower(state, instanceId);
        view.powerBreakdown = projectPowerBreakdown(state, viewerId, instanceId);
        view.liveStatuses = projectLiveStatuses(state, viewerId, instanceId);
    }
    return view;
}
function projectPlayer(state, viewerId, playerId) {
    const player = state.players[playerId];
    return {
        id: playerId,
        reputation: player.reputation,
        maxCapacity: player.maxCapacity,
        availableCapacity: player.availableCapacity,
        handCount: player.hand.length,
        deckCount: player.deck.length,
        hand: playerId === viewerId ? player.hand.map((id) => projectCard(state, viewerId, id)) : [],
        employeeField: player.employeeField.map((id) => id ? projectCard(state, viewerId, id) : null),
        supportField: player.supportField.map((id) => id ? projectCard(state, viewerId, id) : null),
        archive: player.archive.map((id) => projectCard(state, viewerId, id))
    };
}
function projectChain(state, viewerId) {
    return state.chain.map((item, index) => {
        const sourceId = clientCardRef(state, viewerId, item.sourceInstanceId);
        const targets = {};
        if (sourceId) {
            for (const [selectorId, ids] of Object.entries(item.targets)) {
                targets[selectorId] = ids
                    .map((id) => clientCardRef(state, viewerId, id))
                    .filter((id) => id !== null);
            }
        }
        return {
            id: item.id,
            position: index + 1,
            sourceId,
            controllerId: item.controllerId,
            ...(sourceId ? { abilityId: item.abilityId } : {}),
            negated: item.negated,
            delayed: item.delayed,
            targets
        };
    });
}
function projectPendingResolutions(state, viewerId) {
    return state.pendingResolutions.flatMap((pending) => {
        const sourceId = clientCardRef(state, viewerId, pending.sourceInstanceId);
        if (!sourceId)
            return [];
        return [{
                id: pending.id,
                sourceId,
                card: projectCard(state, viewerId, pending.sourceInstanceId),
                controllerId: pending.controllerId,
                abilityId: pending.abilityId,
                dueTurnsStarted: pending.dueTurnsStarted,
                phase: pending.phase
            }];
    });
}
function projectScheduledEffects(state, viewerId) {
    return state.scheduledEffects.flatMap((scheduled) => {
        const sourceId = clientCardRef(state, viewerId, scheduled.sourceInstanceId);
        if (!sourceId)
            return [];
        return [{
                id: scheduled.id,
                sourceId,
                controllerId: scheduled.controllerId,
                duePlayerId: scheduled.duePlayerId,
                dueTurnsStarted: scheduled.dueTurnsStarted,
                phase: scheduled.phase
            }];
    });
}
function projectPendingAttack(state, viewerId) {
    const pending = state.pendingAttack;
    if (!pending)
        return null;
    const attackerId = clientCardRef(state, viewerId, pending.attackerId);
    if (!attackerId)
        return null;
    const targetId = pending.targetId === null ? null : clientCardRef(state, viewerId, pending.targetId);
    if (pending.targetId !== null && !targetId)
        return null;
    return { attackerId, targetId, controllerId: pending.controllerId, cancelled: pending.cancelled };
}
export function projectStateForViewer(state, viewerId) {
    const selection = state.pendingDeckSelection && state.pendingDeckSelection.playerId === viewerId
        ? {
            id: state.pendingDeckSelection.id,
            playerId: viewerId,
            mode: state.pendingDeckSelection.mode,
            candidateIds: [...state.pendingDeckSelection.candidateIds],
            visibleCards: state.pendingDeckSelection.visibleIds.map((id) => projectCard(state, viewerId, id)),
            min: state.pendingDeckSelection.min,
            max: state.pendingDeckSelection.max
        }
        : null;
    const pendingChoice = state.pendingChoice
        ? {
            id: state.pendingChoice.id,
            playerId: state.pendingChoice.playerId,
            options: state.pendingChoice.playerId === viewerId ? state.pendingChoice.options.map((x) => x.id) : []
        }
        : null;
    return {
        matchId: state.matchId,
        status: state.status,
        phase: state.phase,
        activePlayerId: state.activePlayerId,
        firstPlayerId: state.firstPlayerId,
        turnNumber: state.turnNumber,
        winnerId: state.winnerId,
        reason: state.reason,
        viewerId,
        players: {
            P1: projectPlayer(state, viewerId, "P1"),
            P2: projectPlayer(state, viewerId, "P2")
        },
        pendingChoice,
        pendingDeckSelection: selection,
        pendingTriggerTargetSelection: state.pendingTriggerTargetSelection ? {
            id: state.pendingTriggerTargetSelection.id,
            playerId: state.pendingTriggerTargetSelection.playerId,
            targetChoices: state.pendingTriggerTargetSelection.playerId === viewerId
                ? projectLegalActions(state, viewerId, {
                    canMulligan: false, mulliganCardIds: [], archiveExcessHandIds: [], canAdvancePhase: false, canPassPriority: false,
                    canResolveChoice: false, canResolveDeckSelection: false, canResolveTriggerTargetSelection: false, canResolveHandSelection: false,
                    responseOptions: [], playableEmployees: [], playableActions: [{ cardId: "", targetChoices: state.pendingTriggerTargetSelection.targetChoices }],
                    playableSystems: [], settableIncidents: [], activatableAbilities: [], attacks: []
                }).playableActions[0].targetChoices
                : []
        } : null,
        pendingHandSelection: state.pendingHandSelection ? {
            id: state.pendingHandSelection.id,
            playerId: state.pendingHandSelection.playerId,
            candidateIds: state.pendingHandSelection.playerId === viewerId ? [...state.pendingHandSelection.candidateIds] : [],
            min: state.pendingHandSelection.min,
            max: state.pendingHandSelection.max
        } : null,
        priorityPlayerId: state.priorityPlayerId,
        responseWindow: state.responseWindow ? structuredClone(state.responseWindow) : null,
        chainLength: state.chain.length,
        chain: projectChain(state, viewerId),
        pendingResolutions: projectPendingResolutions(state, viewerId),
        scheduledEffects: projectScheduledEffects(state, viewerId),
        pendingAttack: projectPendingAttack(state, viewerId),
        lastEventSeq: state.eventSeq,
        stateVersion: state.stateVersion,
        legalActions: projectLegalActions(state, viewerId, getLegalActions(state, viewerId))
    };
}
function redactEvent(state, viewerId, event) {
    const out = structuredClone(event);
    const isOwnerEvent = event.playerId === viewerId;
    if (event.type === "DECK_SELECTION_REQUIRED" || event.type === "TOP_CARDS_VIEWED" || event.type === "HAND_SELECTION_REQUIRED") {
        if (!isOwnerEvent)
            return null;
    }
    if (event.type === "DECK_SELECTION_RESOLVED" && !isOwnerEvent && out.data) {
        out.data = { selectionId: out.data.selectionId };
    }
    if (event.type === "CHOICE_REQUIRED" && !isOwnerEvent && out.data) {
        out.data = { choiceId: out.data.choiceId };
    }
    if (event.type === "CARD_REVEALED" && out.data?.to === "CONTROLLER" && !isOwnerEvent)
        return null;
    if (event.type === "CARD_DRAWN" && !isOwnerEvent) {
        delete out.cardInstanceId;
    }
    if (event.type === "INCIDENT_SET" && !isOwnerEvent) {
        delete out.cardInstanceId;
    }
    if (event.type === "CARD_MOVED" && !isOwnerEvent) {
        const to = out.data?.to;
        if (to === "HAND" || to === "DECK")
            delete out.cardInstanceId;
        if (to === "SUPPORT_FIELD") {
            const id = event.cardInstanceId;
            const card = id ? state.cards[id] : undefined;
            if (card && !card.faceUp)
                delete out.cardInstanceId;
        }
    }
    return out;
}
export function projectEventsSince(state, viewerId, afterSeq = 0) {
    return state.eventLog
        .filter((event) => event.seq > afterSeq)
        .map((event) => redactEvent(state, viewerId, event))
        .filter((event) => event !== null);
}
