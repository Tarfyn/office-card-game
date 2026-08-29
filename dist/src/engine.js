import { RulesError } from "./errors.js";
import { mulberry32, shuffle } from "./rng.js";
import { ALPHA_FORMAT } from "./formats.js";
export { ALPHA_FORMAT } from "./formats.js";
const STARTING_REPUTATION = 20;
const MAX_REPUTATION = 30;
const HAND_LIMIT = 8;
const EMPLOYEE_SLOTS = 5;
const SUPPORT_SLOTS = 4;
const CAPACITY_CAP = 7;
export function validateDeck(entries, definitions, format = ALPHA_FORMAT) {
    const errors = [];
    const counts = new Map();
    let total = 0;
    for (const entry of entries) {
        if (!Number.isInteger(entry.copies) || entry.copies <= 0) {
            errors.push(`${entry.definitionId}: copies must be a positive integer.`);
            continue;
        }
        total += entry.copies;
        if (!definitions[entry.definitionId])
            errors.push(`Unknown card definition: ${entry.definitionId}.`);
        counts.set(entry.definitionId, (counts.get(entry.definitionId) ?? 0) + entry.copies);
    }
    if (total !== format.deckSize)
        errors.push(`Deck must contain exactly ${format.deckSize} cards (found ${total}).`);
    for (const [definitionId, copies] of counts) {
        const limit = format.cardLimits?.[definitionId] ?? format.defaultCopyLimit;
        if (copies > limit) {
            errors.push(limit === 0
                ? `${definitionId} is Forbidden in ${format.id}.`
                : `${definitionId}: maximum ${limit} cop${limit === 1 ? "y" : "ies"} allowed in ${format.id} (found ${copies}).`);
        }
    }
    return { valid: errors.length === 0, errors };
}
export function assertLegalDeck(entries, definitions, format = ALPHA_FORMAT) {
    const result = validateDeck(entries, definitions, format);
    if (!result.valid)
        throw new RulesError(result.errors.join(" "));
}
function opponentOf(playerId) {
    return playerId === "P1" ? "P2" : "P1";
}
function relativePlayer(controllerId, relative) {
    return relative === "SELF" ? controllerId : opponentOf(controllerId);
}
function emptyTurnCounters() {
    return { actionsPlayedTotal: 0, actionsPlayedByDepartment: {}, cardsPlayedByTag: {} };
}
function assertActive(state, playerId) {
    if (state.status !== "ACTIVE")
        throw new RulesError("The match is not active.");
    if (state.activePlayerId !== playerId)
        throw new RulesError("It is not this player's turn.");
}
function assertNoOpenResponse(state) {
    if (state.responseWindow)
        throw new RulesError("Resolve the current Response Window first.");
    if (state.pendingChoice)
        throw new RulesError("Resolve the pending choice first.");
    if (state.pendingDeckSelection)
        throw new RulesError("Resolve the pending deck selection first.");
    if (state.pendingTriggerTargetSelection)
        throw new RulesError("Resolve the pending trigger target selection first.");
    if (state.pendingHandSelection)
        throw new RulesError("Resolve the pending hand selection first.");
}
function emit(state, type, payload = {}) {
    state.eventSeq += 1;
    state.eventLog.push({ seq: state.eventSeq, type, ...payload });
}
function makePlayer(id) {
    return {
        id,
        reputation: STARTING_REPUTATION,
        maxCapacity: 0,
        availableCapacity: 0,
        turnsStarted: 0,
        deck: [],
        hand: [],
        employeeField: Array(EMPLOYEE_SLOTS).fill(null),
        supportField: Array(SUPPORT_SLOTS).fill(null),
        archive: [],
        mulliganDone: false,
        turnCounters: emptyTurnCounters(),
        promotionReductions: []
    };
}
function expandDeck(playerId, entries, definitions, cards) {
    const ids = [];
    let serial = 0;
    for (const entry of entries) {
        const def = definitions[entry.definitionId];
        if (!def)
            throw new RulesError(`Unknown card definition: ${entry.definitionId}`);
        for (let i = 0; i < entry.copies; i++) {
            serial += 1;
            const instanceId = `${playerId}-${entry.definitionId}-${serial}`;
            cards[instanceId] = {
                instanceId,
                definitionId: entry.definitionId,
                ownerId: playerId,
                controllerId: playerId,
                zone: "DECK",
                objectVersion: 1,
                faceUp: false,
                slot: null,
                onboarding: false,
                attacksUsed: 0,
                maxAttacks: 1,
                powerModifiers: [],
                keywordModifiers: [],
                destructionShields: [],
                setTurnNumber: null,
                lastPlayMethod: null,
                enteredFieldTurnNumber: null,
                cannotAttackUntilTurnNumber: null,
                cannotAttackThroughControllerTurnsStarted: null,
                cannotPlayUntilTurnNumber: null,
                promotionValueModifiers: [],
                directDamageRiders: []
            };
            ids.push(instanceId);
        }
    }
    return ids;
}
export function createMatch(args) {
    if (args.format) {
        assertLegalDeck(args.p1Deck, args.definitions, args.format);
        assertLegalDeck(args.p2Deck, args.definitions, args.format);
    }
    const cards = {};
    const p1 = makePlayer("P1");
    const p2 = makePlayer("P2");
    const rng = mulberry32(args.seed);
    p1.deck = shuffle(expandDeck("P1", args.p1Deck, args.definitions, cards), rng);
    p2.deck = shuffle(expandDeck("P2", args.p2Deck, args.definitions, cards), rng);
    const state = {
        matchId: args.matchId,
        stateVersion: 0,
        seed: args.seed,
        status: "SETUP",
        phase: "MULLIGAN",
        activePlayerId: args.firstPlayerId,
        firstPlayerId: args.firstPlayerId,
        turnNumber: 0,
        winnerId: null,
        reason: null,
        players: { P1: p1, P2: p2 },
        cards,
        definitions: args.definitions,
        eventLog: [],
        eventSeq: 0,
        effectUsage: {},
        chain: [],
        responseWindow: null,
        priorityPlayerId: null,
        consecutivePasses: 0,
        pendingAttack: null,
        pendingBattleResolution: null,
        chainSeq: 0,
        scheduledEffects: [],
        pendingResolutions: [],
        pendingChoice: null,
        pendingDeckSelection: null,
        pendingTriggerTargetSelection: null,
        pendingHandSelection: null,
        scheduleSeq: 0,
        pendingSeq: 0,
        choiceSeq: 0,
        deckSelectionSeq: 0,
        triggerTargetSelectionSeq: 0,
        handSelectionSeq: 0,
        pendingTriggers: [],
        triggerSeq: 0,
        resolvingTriggerEvent: null,
        currentTurnActivity: { activePlayerId: null, incidentsActivatedBy: {}, employeesDestroyedByOpponent: {} },
        previousTurnActivity: { activePlayerId: null, incidentsActivatedBy: {}, employeesDestroyedByOpponent: {} },
        revealPermissions: []
    };
    emit(state, "MATCH_CREATED", { data: { firstPlayerId: args.firstPlayerId, seed: args.seed } });
    drawCards(state, "P1", 5, false);
    drawCards(state, "P2", 5, false);
    return state;
}
export function mulligan(state, playerId, returnIds) {
    if (state.phase !== "MULLIGAN" || state.status !== "SETUP")
        throw new RulesError("Mulligan is not available.");
    const player = state.players[playerId];
    if (player.mulliganDone)
        throw new RulesError("Mulligan already completed.");
    const unique = [...new Set(returnIds)];
    for (const id of unique) {
        if (!player.hand.includes(id))
            throw new RulesError("Can only mulligan cards from your opening hand.");
    }
    player.hand = player.hand.filter((id) => !unique.includes(id));
    drawCards(state, playerId, unique.length, false);
    const rng = mulberry32(state.seed ^ (playerId === "P1" ? 0x1234abcd : 0xabcd1234));
    for (const id of unique) {
        const card = state.cards[id];
        card.zone = "DECK";
        card.objectVersion += 1;
        player.deck.push(id);
    }
    player.deck = shuffle(player.deck, rng);
    player.mulliganDone = true;
    emit(state, "MULLIGAN_COMPLETED", { playerId, data: { returned: unique.length } });
    if (state.players.P1.mulliganDone && state.players.P2.mulliganDone) {
        state.status = "ACTIVE";
        startTurn(state, state.firstPlayerId);
    }
}
function startTurn(state, playerId) {
    if (state.currentTurnActivity.activePlayerId !== null)
        state.previousTurnActivity = structuredClone(state.currentTurnActivity);
    state.currentTurnActivity = { activePlayerId: playerId, incidentsActivatedBy: {}, employeesDestroyedByOpponent: {} };
    state.activePlayerId = playerId;
    state.turnNumber += 1;
    state.phase = "START";
    const player = state.players[playerId];
    player.turnsStarted += 1;
    for (const card of Object.values(state.cards)) {
        if (card.controllerId === playerId) {
            card.destructionShields = card.destructionShields.filter((shield) => shield.expiresAtControllerTurnsStarted === undefined || shield.expiresAtControllerTurnsStarted > player.turnsStarted);
        }
        card.powerModifiers = card.powerModifiers.filter((modifier) => modifier.expiresAtPlayerId !== playerId || modifier.expiresAtTurnsStarted === undefined || modifier.expiresAtTurnsStarted > player.turnsStarted);
    }
    player.maxCapacity = Math.min(1 + player.turnsStarted, CAPACITY_CAP);
    player.availableCapacity = player.maxCapacity;
    player.turnCounters = emptyTurnCounters();
    player.promotionReductions = player.promotionReductions.filter((modifier) => modifier.expiresAtTurnNumber >= state.turnNumber);
    for (const id of player.employeeField) {
        if (!id)
            continue;
        const card = state.cards[id];
        card.onboarding = false;
        card.attacksUsed = 0;
        card.maxAttacks = 1;
    }
    emit(state, "TURN_STARTED", {
        playerId,
        data: {
            turnNumber: state.turnNumber,
            maxCapacity: player.maxCapacity,
            availableCapacity: player.availableCapacity
        }
    });
    processScheduledBoundary(state, playerId, "START");
}
function expireEndOfTurnEffects(state) {
    for (const player of Object.values(state.players))
        player.promotionReductions = player.promotionReductions.filter((modifier) => modifier.expiresAtTurnNumber > state.turnNumber);
    state.revealPermissions = state.revealPermissions.filter((permission) => permission.expiresAtTurnNumber > state.turnNumber);
    for (const card of Object.values(state.cards)) {
        card.powerModifiers = card.powerModifiers.filter((modifier) => modifier.expiresAtTurnNumber === undefined || modifier.expiresAtTurnNumber > state.turnNumber);
        card.keywordModifiers = card.keywordModifiers.filter((modifier) => modifier.expiresAtTurnNumber > state.turnNumber);
        card.destructionShields = card.destructionShields.filter((modifier) => modifier.expiresAtTurnNumber === undefined || modifier.expiresAtTurnNumber > state.turnNumber);
        card.promotionValueModifiers = card.promotionValueModifiers.filter((modifier) => modifier.expiresAtTurnNumber > state.turnNumber);
        card.directDamageRiders = card.directDamageRiders.filter((modifier) => modifier.expiresAtTurnNumber > state.turnNumber);
        if (card.cannotPlayUntilTurnNumber !== null && card.cannotPlayUntilTurnNumber <= state.turnNumber)
            card.cannotPlayUntilTurnNumber = null;
        if (card.zone === "EMPLOYEE_FIELD")
            card.maxAttacks = 1;
    }
}
function drawCards(state, playerId, amount, enforceDeckOut) {
    const player = state.players[playerId];
    for (let i = 0; i < amount; i++) {
        const id = player.deck.pop();
        if (!id) {
            if (enforceDeckOut)
                endGame(state, opponentOf(playerId), "DECK_OUT");
            return;
        }
        const card = state.cards[id];
        card.zone = "HAND";
        card.objectVersion += 1;
        card.faceUp = false;
        player.hand.push(id);
        emit(state, "CARD_DRAWN", { playerId, cardInstanceId: id });
    }
}
export function advancePhase(state, playerId) {
    assertActive(state, playerId);
    assertNoOpenResponse(state);
    const transitions = {
        START: "DRAW",
        DRAW: "MAIN",
        MAIN: "BATTLE",
        BATTLE: "END",
        END: "START"
    };
    if (state.phase === "MULLIGAN")
        throw new RulesError("Cannot advance from mulligan with this command.");
    if (state.phase === "END" && state.players[playerId].hand.length > HAND_LIMIT) {
        throw new RulesError(`Hand limit is ${HAND_LIMIT}. Archive excess cards before ending the turn.`);
    }
    const next = transitions[state.phase];
    if (state.phase === "END") {
        expireEndOfTurnEffects(state);
        startTurn(state, opponentOf(playerId));
        return;
    }
    state.phase = next;
    emit(state, "PHASE_CHANGED", { playerId, data: { phase: next } });
    if (next === "MAIN") {
        processPendingResolutions(state, playerId);
        processScheduledBoundary(state, playerId, "MAIN");
    }
    if (next === "END")
        processScheduledBoundary(state, playerId, "END");
    if (next === "DRAW") {
        const isOpeningTurnForFirstPlayer = state.turnNumber === 1 && playerId === state.firstPlayerId;
        if (isOpeningTurnForFirstPlayer) {
            emit(state, "DRAW_SKIPPED", { playerId, data: { reason: "OPENS_THE_OFFICE" } });
        }
        else {
            drawCards(state, playerId, 1, true);
        }
    }
}
export function archiveCardsFromHand(state, playerId, ids) {
    assertActive(state, playerId);
    if (state.phase !== "END")
        throw new RulesError("Excess hand cards can only be archived during End Phase.");
    const player = state.players[playerId];
    for (const id of ids) {
        if (!player.hand.includes(id))
            throw new RulesError("Card is not in hand.");
        moveToArchive(state, id);
    }
}
function payCapacity(state, playerId, amount) {
    const player = state.players[playerId];
    if (player.availableCapacity < amount)
        throw new RulesError("Not enough Capacity.");
    player.availableCapacity -= amount;
    emit(state, "CAPACITY_CHANGED", { playerId, data: { availableCapacity: player.availableCapacity, delta: -amount } });
}
function recordCardPlayed(state, playerId, def) {
    const counters = state.players[playerId].turnCounters;
    for (const tag of def.tags ?? [])
        counters.cardsPlayedByTag[tag] = (counters.cardsPlayedByTag[tag] ?? 0) + 1;
    if (def.cardType === "ACTION") {
        counters.actionsPlayedTotal += 1;
        counters.actionsPlayedByDepartment[def.department] = (counters.actionsPlayedByDepartment[def.department] ?? 0) + 1;
    }
}
function queueCardPlayedEvent(state, playerId, instanceId, eligibleSources, playMethod) {
    const def = state.definitions[state.cards[instanceId].definitionId];
    queueTriggerEvent(state, {
        event: "CARD_PLAYED",
        playerId,
        cardInstanceId: instanceId,
        causeSourceId: instanceId,
        causeDepartment: def.department,
        causeTags: def.tags ?? [],
        playMethod
    }, eligibleSources);
}
function removeFromCurrentZone(state, instanceId) {
    const card = state.cards[instanceId];
    const controller = state.players[card.controllerId];
    if (card.zone === "HAND")
        controller.hand = controller.hand.filter((id) => id !== instanceId);
    if (card.zone === "DECK")
        controller.deck = controller.deck.filter((id) => id !== instanceId);
    if (card.zone === "ARCHIVE")
        controller.archive = controller.archive.filter((id) => id !== instanceId);
    if (card.zone === "EMPLOYEE_FIELD" && card.slot !== null)
        controller.employeeField[card.slot] = null;
    if (card.zone === "SUPPORT_FIELD" && card.slot !== null)
        controller.supportField[card.slot] = null;
}
function moveCard(state, instanceId, zone, slot = null) {
    const card = state.cards[instanceId];
    removeFromCurrentZone(state, instanceId);
    card.zone = zone;
    card.slot = slot;
    card.objectVersion += 1;
    card.setTurnNumber = null;
    card.powerModifiers = [];
    card.keywordModifiers = [];
    card.destructionShields = [];
    card.directDamageRiders = [];
    card.attacksUsed = 0;
    card.maxAttacks = 1;
    card.faceUp = zone === "EMPLOYEE_FIELD" || zone === "SUPPORT_FIELD" || zone === "ARCHIVE" || zone === "PENDING";
    if (zone === "EMPLOYEE_FIELD")
        card.enteredFieldTurnNumber = state.turnNumber;
    else
        card.enteredFieldTurnNumber = null;
    if (zone !== "EMPLOYEE_FIELD")
        card.onboarding = false;
    if (zone === "HAND" || zone === "ARCHIVE" || zone === "DECK")
        card.lastPlayMethod = null;
    const destinationPlayer = state.players[card.controllerId];
    if (zone === "HAND") {
        card.faceUp = false;
        state.players[card.ownerId].hand.push(instanceId);
        card.controllerId = card.ownerId;
    }
    else if (zone === "ARCHIVE") {
        destinationPlayer.archive.push(instanceId);
    }
    else if (zone === "EMPLOYEE_FIELD") {
        if (slot === null)
            throw new RulesError("Employee field move requires a slot.");
        destinationPlayer.employeeField[slot] = instanceId;
    }
    else if (zone === "SUPPORT_FIELD") {
        if (slot === null)
            throw new RulesError("Support field move requires a slot.");
        destinationPlayer.supportField[slot] = instanceId;
    }
    emit(state, "CARD_MOVED", { playerId: card.controllerId, cardInstanceId: instanceId, data: { to: zone, slot } });
}
function assertCardCanBePlayed(state, instanceId) {
    const card = state.cards[instanceId];
    if (card.cannotPlayUntilTurnNumber !== null && card.cannotPlayUntilTurnNumber >= state.turnNumber) {
        throw new RulesError("This card cannot be played this turn.");
    }
}
function promotionValue(state, instanceId) {
    const card = state.cards[instanceId];
    return 1 + card.promotionValueModifiers.reduce((sum, modifier) => sum + modifier.amount, 0);
}
function activePromotionReduction(state, playerId, department) {
    return state.players[playerId].promotionReductions.find((modifier) => modifier.department === department && modifier.expiresAtTurnNumber >= state.turnNumber) ?? null;
}
function effectivePromotionRequired(state, playerId, def) {
    if (!def.promotion)
        return 0;
    const modifier = activePromotionReduction(state, playerId, def.department);
    return modifier ? Math.max(modifier.minimumRequired, def.promotion.required - modifier.amount) : def.promotion.required;
}
function consumePromotionReduction(state, playerId, def) {
    const modifier = activePromotionReduction(state, playerId, def.department);
    if (!modifier)
        return;
    state.players[playerId].promotionReductions = state.players[playerId].promotionReductions.filter((entry) => entry.id !== modifier.id);
}
function getActionPlayLimit(state, playerId) {
    let limit = null;
    for (const source of Object.values(state.cards)) {
        if ((source.zone !== "EMPLOYEE_FIELD" && source.zone !== "SUPPORT_FIELD") || !source.faceUp || source.controllerId !== playerId)
            continue;
        const def = state.definitions[source.definitionId];
        for (const ability of def.abilities ?? []) {
            if (ability.type !== "CONTINUOUS")
                continue;
            if (ability.phases && !ability.phases.includes(state.phase))
                continue;
            if (!evaluateAllConditions(state, source.controllerId, ability.conditions))
                continue;
            for (const effect of ability.effects) {
                if (effect.type === "SET_ACTION_PLAY_LIMIT")
                    limit = limit === null ? effect.amount : Math.min(limit, effect.amount);
            }
        }
    }
    return limit;
}
function assertActionPlayLimit(state, playerId) {
    const limit = getActionPlayLimit(state, playerId);
    if (limit !== null && state.players[playerId].turnCounters.actionsPlayedTotal >= limit)
        throw new RulesError(`You cannot play more than ${limit} Actions this turn.`);
}
export function playEmployee(state, playerId, instanceId, slot, promotionMaterials = []) {
    assertActive(state, playerId);
    assertNoOpenResponse(state);
    if (state.phase !== "MAIN")
        throw new RulesError("Employees can only be played during Main Phase.");
    const player = state.players[playerId];
    if (slot < 0 || slot >= EMPLOYEE_SLOTS)
        throw new RulesError("Invalid Employee slot.");
    if (!player.hand.includes(instanceId))
        throw new RulesError("Employee must be in hand.");
    const card = state.cards[instanceId];
    assertCardCanBePlayed(state, instanceId);
    const def = state.definitions[card.definitionId];
    if (def.cardType !== "EMPLOYEE")
        throw new RulesError("Card is not an Employee.");
    const promotion = def.promotion;
    const uniqueMaterials = [...new Set(promotionMaterials)];
    if (promotion) {
        const requiredPromotionValue = effectivePromotionRequired(state, playerId, def);
        if (uniqueMaterials.reduce((sum, id) => sum + promotionValue(state, id), 0) < requiredPromotionValue)
            throw new RulesError(`Promotion requires material value at least ${requiredPromotionValue}.`);
        for (const id of uniqueMaterials) {
            if (!player.employeeField.includes(id))
                throw new RulesError("Promotion material must be an Employee you control on the field.");
            if (!cardMatchesFilter(state, id, { cardType: "EMPLOYEE", ...promotion.materials }))
                throw new RulesError("Illegal Promotion material.");
        }
    }
    else if (uniqueMaterials.length > 0) {
        throw new RulesError("This Employee does not require Promotion materials.");
    }
    const occupant = player.employeeField[slot];
    if (occupant && !uniqueMaterials.includes(occupant))
        throw new RulesError("Employee slot is occupied.");
    const costCalculation = getCardCost(state, playerId, instanceId, "PLAY");
    payCalculatedCost(state, playerId, costCalculation, instanceId, "PLAY");
    const cost = costCalculation.finalCost;
    for (const materialId of uniqueMaterials)
        moveToArchive(state, materialId);
    const eligiblePlayTriggers = triggerSourceSnapshot(state);
    moveCard(state, instanceId, "EMPLOYEE_FIELD", slot);
    card.faceUp = true;
    card.onboarding = true;
    card.attacksUsed = 0;
    card.maxAttacks = 1;
    card.lastPlayMethod = promotion ? "PROMOTION" : "NORMAL";
    recordCardPlayed(state, playerId, def);
    queueCardPlayedEvent(state, playerId, instanceId, eligiblePlayTriggers, card.lastPlayMethod);
    if (promotion) {
        consumePromotionReduction(state, playerId, def);
        emit(state, "PROMOTION_COMPLETED", { playerId, cardInstanceId: instanceId, data: { materials: uniqueMaterials } });
    }
    emit(state, "CARD_PLAYED", { playerId, cardInstanceId: instanceId, data: { cardType: "EMPLOYEE", slot, cost, playMethod: card.lastPlayMethod } });
    openPendingTriggerChainAndAutoPassEmpty(state);
}
export function playSystem(state, playerId, instanceId, slot) {
    assertActive(state, playerId);
    assertNoOpenResponse(state);
    if (state.phase !== "MAIN")
        throw new RulesError("Systems can only be played during Main Phase.");
    const player = state.players[playerId];
    if (slot < 0 || slot >= SUPPORT_SLOTS)
        throw new RulesError("Invalid Support slot.");
    if (player.supportField[slot])
        throw new RulesError("Support slot is occupied.");
    if (!player.hand.includes(instanceId))
        throw new RulesError("System must be in hand.");
    const card = state.cards[instanceId];
    assertCardCanBePlayed(state, instanceId);
    const def = state.definitions[card.definitionId];
    if (def.cardType !== "SYSTEM")
        throw new RulesError("Card is not a System.");
    const costCalculation = getCardCost(state, playerId, instanceId, "PLAY");
    payCalculatedCost(state, playerId, costCalculation, instanceId, "PLAY");
    const cost = costCalculation.finalCost;
    const eligiblePlayTriggers = triggerSourceSnapshot(state);
    moveCard(state, instanceId, "SUPPORT_FIELD", slot);
    card.lastPlayMethod = "NORMAL";
    recordCardPlayed(state, playerId, def);
    queueCardPlayedEvent(state, playerId, instanceId, eligiblePlayTriggers, card.lastPlayMethod);
    emit(state, "CARD_PLAYED", { playerId, cardInstanceId: instanceId, data: { cardType: "SYSTEM", slot, cost } });
    openPendingTriggerChainAndAutoPassEmpty(state);
}
function cardMatchesFilter(state, instanceId, filter) {
    const def = state.definitions[state.cards[instanceId].definitionId];
    if (filter.anyOf && !filter.anyOf.some((part) => cardMatchesFilter(state, instanceId, part)))
        return false;
    if (filter.allOf && !filter.allOf.every((part) => cardMatchesFilter(state, instanceId, part)))
        return false;
    if (filter.cardType && def.cardType !== filter.cardType)
        return false;
    if (filter.excludeDefinitionId && def.id === filter.excludeDefinitionId)
        return false;
    if (filter.department && def.department !== filter.department)
        return false;
    if (filter.rank && def.rank !== filter.rank)
        return false;
    if (filter.tag && !(def.tags ?? []).includes(filter.tag))
        return false;
    if (filter.tagsAny && !filter.tagsAny.some((tag) => (def.tags ?? []).includes(tag)))
        return false;
    if (filter.tagsAll && !filter.tagsAll.every((tag) => (def.tags ?? []).includes(tag)))
        return false;
    if (filter.team && !(def.teams ?? []).includes(filter.team))
        return false;
    if (filter.printedCapacityCost) {
        const printed = def.cost?.play ?? def.cost?.set ?? 0;
        if (filter.printedCapacityCost.min !== undefined && printed < filter.printedCapacityCost.min)
            return false;
        if (filter.printedCapacityCost.max !== undefined && printed > filter.printedCapacityCost.max)
            return false;
    }
    if (filter.enteredFieldThisTurn !== undefined) {
        const enteredThisTurn = state.cards[instanceId].enteredFieldTurnNumber === state.turnNumber;
        if (enteredThisTurn !== filter.enteredFieldThisTurn)
            return false;
    }
    return true;
}
function idsInZone(state, playerId, zone) {
    const player = state.players[playerId];
    if (zone === "HAND")
        return [...player.hand];
    if (zone === "DECK")
        return [...player.deck];
    if (zone === "ARCHIVE")
        return [...player.archive];
    if (zone === "EMPLOYEE_FIELD")
        return player.employeeField.filter((id) => Boolean(id));
    if (zone === "SUPPORT_FIELD")
        return player.supportField.filter((id) => Boolean(id));
    return Object.values(state.cards).filter((card) => card.controllerId === playerId && card.zone === zone).map((card) => card.instanceId);
}
function evaluateCondition(state, controllerId, condition, context = {}) {
    if (condition.type === "CONTROL_COUNT") {
        const playerId = relativePlayer(controllerId, condition.controller);
        const ids = idsInZone(state, playerId, condition.zone);
        const count = condition.filter ? ids.filter((id) => cardMatchesFilter(state, id, condition.filter)).length : ids.length;
        return count >= condition.min;
    }
    if (condition.type === "TURN_COUNTER_EQUALS") {
        const playerId = relativePlayer(controllerId, condition.controller);
        const counters = state.players[playerId].turnCounters;
        return (counters.actionsPlayedByDepartment[condition.department] ?? 0) === condition.value;
    }
    if (condition.type === "CARDS_PLAYED_BY_TAG_EQUALS") {
        const counters = state.players[relativePlayer(controllerId, condition.controller)].turnCounters;
        return (counters.cardsPlayedByTag[condition.tag] ?? 0) === condition.value;
    }
    if (condition.type === "CARDS_PLAYED_BY_TAG_AT_LEAST") {
        const counters = state.players[relativePlayer(controllerId, condition.controller)].turnCounters;
        return (counters.cardsPlayedByTag[condition.tag] ?? 0) >= condition.value;
    }
    if (condition.type === "ACTIONS_PLAYED_TOTAL_EQUALS") {
        return state.players[relativePlayer(controllerId, condition.controller)].turnCounters.actionsPlayedTotal === condition.value;
    }
    if (condition.type === "ACTIVE_PLAYER_IS") {
        return state.activePlayerId === relativePlayer(controllerId, condition.player);
    }
    if (condition.type === "TARGET_MATCHES_FILTER") {
        const ids = context.targets?.[condition.target] ?? [];
        return ids.length > 0 && ids.every((id) => cardMatchesFilter(state, id, condition.filter));
    }
    if (condition.type === "HAS_AVAILABLE_CAPACITY") {
        return state.players[relativePlayer(controllerId, condition.player)].availableCapacity >= condition.amount;
    }
    if (condition.type === "HAS_FREE_SLOT") {
        const player = state.players[relativePlayer(controllerId, condition.player)];
        return condition.zone === "EMPLOYEE_FIELD" ? player.employeeField.some((id) => id === null) : player.supportField.some((id) => id === null);
    }
    if (condition.type === "SOURCE_PRINTED_COST_AT_LEAST") {
        let sourceId = context.sourceId;
        if (context.triggeringChainItemId)
            sourceId = state.chain.find((x) => x.id === context.triggeringChainItemId)?.sourceInstanceId ?? sourceId;
        if (!sourceId)
            return false;
        const def = state.definitions[state.cards[sourceId].definitionId];
        return (def.cost?.play ?? def.cost?.set ?? 0) >= condition.amount;
    }
    if (condition.type === "TARGET_ATTACKS_USED_AT_LEAST") {
        const id = context.targets?.[condition.target]?.[0];
        return Boolean(id && state.cards[id] && state.cards[id].attacksUsed >= condition.amount);
    }
    if (condition.type === "EVENT_BATTLE_EXCESS_POWER_AT_LEAST") {
        return (context.triggerEvent?.battleExcessPower ?? 0) >= condition.amount;
    }
    if (condition.type === "EVENT_BREAKTHROUGH_NOT_APPLIED") {
        return !context.triggerEvent?.breakthroughApplied;
    }
    if (condition.type === "CHAIN_ITEM_HAS_EFFECT") {
        const chainId = context.triggeringChainItemId;
        if (!chainId)
            return false;
        const item = state.chain.find((entry) => entry.id === chainId);
        return Boolean(item && item.effects.some((effect) => effect.type === condition.effectType));
    }
    if (condition.type === "TARGET_IS_TRIGGERING_CHAIN_TARGET") {
        const chainId = context.triggeringChainItemId;
        if (!chainId)
            return false;
        const item = state.chain.find((entry) => entry.id === chainId);
        const targetIds = context.targets?.[condition.target] ?? [];
        const triggeringTargets = new Set(Object.values(item?.targets ?? {}).flat());
        return targetIds.length > 0 && targetIds.every((id) => triggeringTargets.has(id));
    }
    if (condition.type === "TARGET_IS_SAME_OBJECT_IN_ZONE" || condition.type === "TARGET_NOT_SAME_OBJECT_IN_ZONE") {
        const ids = context.targets?.[condition.target] ?? [];
        const same = ids.some((id) => {
            const card = state.cards[id];
            const expected = context.targetObjectVersions?.[condition.target]?.[id];
            return Boolean(card && expected !== undefined && card.objectVersion === expected && card.zone === condition.zone);
        });
        return condition.type === "TARGET_IS_SAME_OBJECT_IN_ZONE" ? same : !same;
    }
    if (condition.type === "INCIDENT_ACTIVATED_DURING_OPPONENT_LAST_TURN") {
        return state.previousTurnActivity.activePlayerId === opponentOf(controllerId) && (state.previousTurnActivity.incidentsActivatedBy[controllerId] ?? 0) > 0;
    }
    if (condition.type === "EMPLOYEE_DESTROYED_BY_OPPONENT_LAST_TURN") {
        return state.previousTurnActivity.activePlayerId === opponentOf(controllerId) && (state.previousTurnActivity.employeesDestroyedByOpponent[controllerId] ?? 0) > 0;
    }
    return false;
}
function validateConditions(state, controllerId, conditions, context = {}) {
    for (const condition of conditions ?? []) {
        if (!evaluateCondition(state, controllerId, condition, context))
            throw new RulesError("Ability conditions are not met.");
    }
}
function selectorZones(zone) {
    return Array.isArray(zone) ? zone : [zone];
}
function idsInSelectorZones(state, playerId, zone) {
    return selectorZones(zone).flatMap((z) => idsInZone(state, playerId, z));
}
function targetMatchesSelectorContext(state, controllerId, selector, instanceId, context = {}) {
    const card = state.cards[instanceId];
    if (!card)
        return false;
    if (selector.excludeSource && context.sourceId === instanceId)
        return false;
    if (selector.excludeSourceDefinition && context.sourceId) {
        const source = state.cards[context.sourceId];
        if (source && source.definitionId === card.definitionId)
            return false;
    }
    if (selector.excludeEventAttacker && context.triggerEvent?.attackerId === instanceId)
        return false;
    if (selector.excludeCurrentAttackTarget && state.pendingAttack?.targetId === instanceId)
        return false;
    if (selector.excludeTriggeringChainCurrentTargets && context.triggeringChainItemId) {
        const triggering = state.chain.find((entry) => entry.id === context.triggeringChainItemId);
        if (triggering && Object.values(triggering.targets).flat().includes(instanceId))
            return false;
    }
    if (selector.mustBeLegalForTriggeringChainFirstTarget) {
        if (!context.triggeringChainItemId)
            return false;
        const triggering = state.chain.find((entry) => entry.id === context.triggeringChainItemId);
        if (!triggering)
            return false;
        const targetKey = Object.keys(triggering.targets).find((key) => (triggering.targets[key]?.length ?? 0) > 0);
        const originalSelector = targetKey ? triggering.targetSelectors.find((entry) => entry.id === targetKey) : undefined;
        if (!originalSelector)
            return false;
        if (!targetMatchesSelectorContext(state, triggering.controllerId, originalSelector, instanceId, {
            sourceId: triggering.sourceInstanceId,
            targets: triggering.targets,
            targetObjectVersions: triggering.targetObjectVersions,
            triggeringChainItemId: triggering.triggeringChainItemId
        }))
            return false;
    }
    if (selector.subsetOf && context.targets?.[selector.subsetOf] && !(context.targets[selector.subsetOf] ?? []).includes(instanceId))
        return false;
    if (selector.mustBeTriggeringChainTarget) {
        if (!context.triggeringChainItemId)
            return false;
        const item = state.chain.find((entry) => entry.id === context.triggeringChainItemId);
        if (!item || !Object.values(item.targets).flat().includes(instanceId))
            return false;
    }
    if (selector.mustBePendingBattleDestruction && !state.pendingBattleResolution?.destructionCandidateIds.includes(instanceId))
        return false;
    const expectedController = selector.controller === "ANY" ? null : relativePlayer(controllerId, selector.controller);
    if (expectedController && card.controllerId !== expectedController)
        return false;
    if (!selectorZones(selector.zone).includes(card.zone))
        return false;
    return cardMatchesFilter(state, instanceId, selector);
}
function validateTargets(state, controllerId, selectors, supplied, context = {}) {
    const resolved = {};
    for (const selector of selectors ?? []) {
        const ids = supplied[selector.id] ?? [];
        const unique = [...new Set(ids)];
        if (unique.length < selector.min || unique.length > selector.max)
            throw new RulesError(`Invalid target count for ${selector.id}.`);
        for (const id of unique) {
            if (!targetMatchesSelectorContext(state, controllerId, selector, id, { ...context, targets: { ...(context.targets ?? {}), ...resolved } }))
                throw new RulesError(`Illegal target for ${selector.id}.`);
        }
        resolved[selector.id] = unique;
    }
    return resolved;
}
function usageKey(sourceId, abilityId, group) {
    return `${sourceId}:${group ?? abilityId}`;
}
function usageAvailable(state, sourceId, abilityId, usageLimit) {
    if (!usageLimit)
        return true;
    const key = usageKey(sourceId, abilityId, usageLimit?.group);
    const current = state.effectUsage[key];
    const countThisTurn = current?.turnNumber === state.turnNumber ? current.count : 0;
    return countThisTurn < usageLimit.count;
}
function consumeUsage(state, sourceId, abilityId, usageLimit) {
    if (!usageLimit)
        return;
    if (!usageAvailable(state, sourceId, abilityId, usageLimit))
        throw new RulesError("Ability usage limit reached for this turn.");
    const key = usageKey(sourceId, abilityId, usageLimit?.group);
    const current = state.effectUsage[key];
    const countThisTurn = current?.turnNumber === state.turnNumber ? current.count : 0;
    state.effectUsage[key] = { turnNumber: state.turnNumber, count: countThisTurn + 1 };
}
function validateAndConsumeUsage(state, sourceId, ability) {
    consumeUsage(state, sourceId, ability.id, ability.usageLimit);
}
export function getCardCost(state, playerId, instanceId, mode) {
    const card = state.cards[instanceId];
    if (!card)
        throw new RulesError("Unknown card.");
    const def = state.definitions[card.definitionId];
    const printedCost = mode === "SET" ? (def.cost?.set ?? 0) : (def.cost?.play ?? 0);
    const modifiers = [];
    for (const source of Object.values(state.cards)) {
        if ((source.zone !== "EMPLOYEE_FIELD" && source.zone !== "SUPPORT_FIELD") || !source.faceUp)
            continue;
        const sourceDef = state.definitions[source.definitionId];
        for (const ability of sourceDef.abilities ?? []) {
            if (ability.type !== "CONTINUOUS")
                continue;
            if (ability.phases && !ability.phases.includes(state.phase))
                continue;
            if (!usageAvailable(state, source.instanceId, ability.id, ability.usageLimit))
                continue;
            if (!evaluateAllConditions(state, source.controllerId, ability.conditions))
                continue;
            if (!selectorMatchesCard(state, source.controllerId, ability.appliesTo, instanceId, source.instanceId))
                continue;
            for (const effect of ability.effects) {
                if (effect.type === "MODIFY_COST")
                    modifiers.push({ sourceInstanceId: source.instanceId, abilityId: ability.id, amount: effect.amount });
            }
        }
    }
    const increases = modifiers.filter((x) => x.amount > 0).reduce((sum, x) => sum + x.amount, 0);
    const reductions = modifiers.filter((x) => x.amount < 0).reduce((sum, x) => sum + x.amount, 0);
    const finalCost = Math.max(0, printedCost + increases + reductions);
    return { printedCost, finalCost, modifiers };
}
function commitCostCalculation(state, calculation) {
    const seen = new Set();
    for (const modifier of calculation.modifiers) {
        const key = `${modifier.sourceInstanceId}:${modifier.abilityId}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        const def = state.definitions[state.cards[modifier.sourceInstanceId].definitionId];
        const ability = (def.abilities ?? []).find((x) => x.id === modifier.abilityId);
        if (ability?.type === "CONTINUOUS" && ability.usageLimit)
            consumeUsage(state, modifier.sourceInstanceId, ability.id, ability.usageLimit);
    }
}
function payCalculatedCost(state, playerId, calculation, instanceId, mode) {
    payCapacity(state, playerId, calculation.finalCost);
    commitCostCalculation(state, calculation);
    emit(state, "COST_CALCULATED", { playerId, cardInstanceId: instanceId, data: { mode, printedCost: calculation.printedCost, finalCost: calculation.finalCost, modifiers: calculation.modifiers } });
}
function triggerSourceSnapshot(state) {
    return Object.values(state.cards)
        .filter((card) => (card.zone === "EMPLOYEE_FIELD" || card.zone === "SUPPORT_FIELD") && card.faceUp)
        .map((card) => ({ id: card.instanceId, objectVersion: card.objectVersion }));
}
function queuedTriggerMatchesEvent(state, sourceId, ability, event) {
    const source = state.cards[sourceId];
    const trigger = ability.trigger;
    if (trigger.event === "CARD_PLAYED" && event.event === "CARD_PLAYED") {
        if (!event.playerId || relativePlayer(source.controllerId, trigger.controller) !== event.playerId)
            return false;
        if (trigger.cardFilter && (!event.cardInstanceId || !cardMatchesFilter(state, event.cardInstanceId, trigger.cardFilter)))
            return false;
        if (trigger.playMethod && event.playMethod !== trigger.playMethod)
            return false;
        return true;
    }
    if (trigger.event === "REPUTATION_RESTORED" && event.event === "REPUTATION_RESTORED") {
        if (!event.playerId || relativePlayer(source.controllerId, trigger.player) !== event.playerId)
            return false;
        if (trigger.causedByTag && !(event.causeTags ?? []).includes(trigger.causedByTag))
            return false;
        if (trigger.causeMustNotBeSource && event.causeSourceId === sourceId)
            return false;
        return true;
    }
    if (trigger.event === "ACTION_RESOLVED" && event.event === "ACTION_RESOLVED") {
        if (!event.playerId || relativePlayer(source.controllerId, trigger.controller) !== event.playerId)
            return false;
        if (trigger.cardFilter && (!event.cardInstanceId || !cardMatchesFilter(state, event.cardInstanceId, trigger.cardFilter)))
            return false;
        return true;
    }
    if (trigger.event === "CARD_RETURNED_FROM_ARCHIVE" && event.event === "CARD_RETURNED_FROM_ARCHIVE") {
        if (!event.playerId || relativePlayer(source.controllerId, trigger.controller) !== event.playerId)
            return false;
        if (trigger.cardFilter && (!event.cardInstanceId || !cardMatchesFilter(state, event.cardInstanceId, trigger.cardFilter)))
            return false;
        if (trigger.causedByTag && !(event.causeTags ?? []).includes(trigger.causedByTag))
            return false;
        return true;
    }
    if (trigger.event === "REPUTATION_LOST" && event.event === "REPUTATION_LOST") {
        if (!event.playerId || relativePlayer(source.controllerId, trigger.player) !== event.playerId)
            return false;
        if (trigger.causedByDepartment && event.causeDepartment !== trigger.causedByDepartment)
            return false;
        return true;
    }
    if (trigger.event === "BATTLE_EMPLOYEE_DESTROYED" && event.event === "BATTLE_EMPLOYEE_DESTROYED") {
        if (trigger.attackerController && (!event.actorId || relativePlayer(source.controllerId, trigger.attackerController) !== event.actorId))
            return false;
        if (trigger.attackerFilter && (!event.attackerId || !cardMatchesFilter(state, event.attackerId, trigger.attackerFilter)))
            return false;
        if (trigger.destroyedController) {
            if (!event.defenderId || state.cards[event.defenderId]?.controllerId !== relativePlayer(source.controllerId, trigger.destroyedController))
                return false;
        }
        if (trigger.destroyedFilter && (!event.defenderId || !cardMatchesFilter(state, event.defenderId, trigger.destroyedFilter)))
            return false;
        return true;
    }
    if (trigger.event === "CARD_DELAYED" && event.event === "CARD_DELAYED") {
        if (!event.playerId || relativePlayer(source.controllerId, trigger.controller) !== event.playerId)
            return false;
        return true;
    }
    if (trigger.event === "CARD_ARCHIVED" && event.event === "CARD_ARCHIVED") {
        if (!event.playerId || relativePlayer(source.controllerId, trigger.controller) !== event.playerId)
            return false;
        if (trigger.sourceOnly && event.cardInstanceId !== sourceId)
            return false;
        if (trigger.cardFilter && (!event.cardInstanceId || !cardMatchesFilter(state, event.cardInstanceId, trigger.cardFilter)))
            return false;
        if (trigger.causedByTag && !(event.causeTags ?? []).includes(trigger.causedByTag))
            return false;
        if (trigger.causedByController && (!event.causedByControllerId || relativePlayer(source.controllerId, trigger.causedByController) !== event.causedByControllerId))
            return false;
        return true;
    }
    return false;
}
function queueTriggerEvent(state, event, eligibleSources = triggerSourceSnapshot(state)) {
    for (const snapshot of eligibleSources) {
        const source = state.cards[snapshot.id];
        if (!source || source.objectVersion !== snapshot.objectVersion)
            continue;
        const def = state.definitions[source.definitionId];
        for (const ability of def.abilities ?? []) {
            const selfArchiveTrigger = event.event === "CARD_ARCHIVED" && event.cardInstanceId === source.instanceId && source.zone === "ARCHIVE" && ability.type === "TRIGGERED" && ability.trigger.event === "CARD_ARCHIVED" && ability.trigger.sourceOnly;
            if (!selfArchiveTrigger && ((source.zone !== "EMPLOYEE_FIELD" && source.zone !== "SUPPORT_FIELD") || !source.faceUp))
                continue;
            if (ability.type !== "TRIGGERED")
                continue;
            if (!queuedTriggerMatchesEvent(state, source.instanceId, ability, event))
                continue;
            if (!usageAvailable(state, source.instanceId, ability.id, ability.usageLimit))
                continue;
            const triggerContext = { sourceId: source.instanceId, triggerEvent: event };
            if (!evaluateAllConditions(state, source.controllerId, ability.conditions, triggerContext))
                continue;
            if (!responseTargetsPotentiallyLegal(state, source.controllerId, ability.targets, triggerContext))
                continue;
            consumeUsage(state, source.instanceId, ability.id, ability.usageLimit);
            state.triggerSeq += 1;
            state.pendingTriggers.push({
                id: `TRIGGER-${state.triggerSeq}`,
                sourceInstanceId: source.instanceId,
                sourceObjectVersion: source.objectVersion,
                controllerId: source.controllerId,
                abilityId: ability.id,
                event: structuredClone(event)
            });
            emit(state, "TRIGGER_QUEUED", { playerId: source.controllerId, cardInstanceId: source.instanceId, data: { triggerId: `TRIGGER-${state.triggerSeq}`, abilityId: ability.id, event: event.event } });
        }
    }
}
function openPendingTriggerChain(state) {
    if (state.pendingChoice || state.pendingDeckSelection || state.pendingHandSelection || state.pendingTriggerTargetSelection || state.responseWindow)
        return false;
    if (state.pendingTriggers.length > 0) {
        const active = state.activePlayerId;
        state.pendingTriggers = [
            ...state.pendingTriggers.filter((x) => x.controllerId === active),
            ...state.pendingTriggers.filter((x) => x.controllerId !== active)
        ];
    }
    let added = 0;
    while (state.pendingTriggers.length > 0) {
        const pending = state.pendingTriggers.shift();
        const source = state.cards[pending.sourceInstanceId];
        if (!source || source.objectVersion !== pending.sourceObjectVersion)
            continue;
        const def = state.definitions[source.definitionId];
        const ability = (def.abilities ?? []).find((x) => x.id === pending.abilityId);
        if (!ability || ability.type !== "TRIGGERED")
            continue;
        const selfArchiveTrigger = pending.event.event === "CARD_ARCHIVED" && pending.event.cardInstanceId === source.instanceId && source.zone === "ARCHIVE" && ability.trigger.event === "CARD_ARCHIVED" && ability.trigger.sourceOnly;
        if (!selfArchiveTrigger && ((source.zone !== "EMPLOYEE_FIELD" && source.zone !== "SUPPORT_FIELD") || !source.faceUp))
            continue;
        const selectors = ability.targets ?? [];
        if (selectors.length > 0) {
            const context = { sourceId: source.instanceId, triggerEvent: pending.event };
            const choices = legalTargetChoices(state, source.controllerId, selectors, context);
            if (choices.some((choice) => choice.candidateIds.length < choice.min))
                continue;
            state.triggerTargetSelectionSeq += 1;
            state.pendingTriggerTargetSelection = {
                id: `TRGTSEL-${state.triggerTargetSelectionSeq}`,
                playerId: source.controllerId,
                sourceInstanceId: source.instanceId,
                sourceObjectVersion: source.objectVersion,
                abilityId: ability.id,
                event: structuredClone(pending.event),
                targetChoices: choices
            };
            emit(state, "TRIGGER_TARGET_SELECTION_REQUIRED", {
                playerId: source.controllerId,
                cardInstanceId: source.instanceId,
                data: { selectionId: state.pendingTriggerTargetSelection.id, abilityId: ability.id }
            });
            return false;
        }
        addChainItem(state, {
            sourceInstanceId: source.instanceId,
            controllerId: source.controllerId,
            abilityId: ability.id,
            effects: ability.effects,
            targets: {},
            targetSelectors: selectors,
            negated: false,
            triggeringChainItemId: null,
            archiveSourceAfterResolve: false,
            triggerEvent: pending.event
        }, false);
        added += 1;
    }
    if (state.chain.length > 0 && !state.responseWindow) {
        openResponseForTopChainItem(state);
        emit(state, "TRIGGER_CHAIN_CREATED", { data: { count: added || state.chain.length } });
        return true;
    }
    return false;
}
export function resolveTriggerTargetSelection(state, playerId, selectionId, suppliedTargets) {
    const pending = state.pendingTriggerTargetSelection;
    if (!pending || pending.id !== selectionId)
        throw new RulesError("No matching pending trigger target selection.");
    if (pending.playerId !== playerId)
        throw new RulesError("This trigger target selection belongs to the other player.");
    const source = state.cards[pending.sourceInstanceId];
    if (!source || source.objectVersion !== pending.sourceObjectVersion || (source.zone !== "EMPLOYEE_FIELD" && source.zone !== "SUPPORT_FIELD") || !source.faceUp) {
        state.pendingTriggerTargetSelection = null;
        openPendingTriggerChain(state);
        return;
    }
    const def = state.definitions[source.definitionId];
    const ability = (def.abilities ?? []).find((x) => x.id === pending.abilityId);
    if (!ability || ability.type !== "TRIGGERED")
        throw new RulesError("Triggered ability no longer exists.");
    const context = { sourceId: source.instanceId, triggerEvent: pending.event };
    const targets = validateTargets(state, playerId, ability.targets, suppliedTargets, context);
    state.pendingTriggerTargetSelection = null;
    addChainItem(state, {
        sourceInstanceId: source.instanceId,
        controllerId: source.controllerId,
        abilityId: ability.id,
        effects: ability.effects,
        targets,
        targetSelectors: ability.targets ?? [],
        negated: false,
        triggeringChainItemId: null,
        archiveSourceAfterResolve: false,
        triggerEvent: pending.event
    }, false);
    emit(state, "TRIGGER_TARGET_SELECTION_RESOLVED", { playerId, cardInstanceId: source.instanceId, data: { selectionId, abilityId: ability.id } });
    if (!openPendingTriggerChain(state) && !state.pendingTriggerTargetSelection && state.chain.length > 0 && !state.responseWindow)
        openResponseForTopChainItem(state);
}
function openPendingTriggerChainAndAutoPassEmpty(state) {
    if (!openPendingTriggerChain(state))
        return;
    let safety = 0;
    while (state.responseWindow && state.priorityPlayerId && !state.pendingChoice && safety < 8) {
        const priority = state.priorityPlayerId;
        if (getAvailableResponses(state, priority).length > 0)
            break;
        passPriority(state, priority);
        safety += 1;
    }
}
function resolvePendingTriggersImmediately(state) {
    while (state.pendingTriggers.length > 0 && state.status === "ACTIVE") {
        const pending = state.pendingTriggers.shift();
        const source = state.cards[pending.sourceInstanceId];
        if (!source || source.objectVersion !== pending.sourceObjectVersion)
            continue;
        const def = state.definitions[source.definitionId];
        const ability = (def.abilities ?? []).find((x) => x.id === pending.abilityId);
        if (!ability || ability.type !== "TRIGGERED")
            continue;
        const selfArchiveTrigger = pending.event.event === "CARD_ARCHIVED" && pending.event.cardInstanceId === source.instanceId && source.zone === "ARCHIVE" && ability.trigger.event === "CARD_ARCHIVED" && ability.trigger.sourceOnly;
        if (!selfArchiveTrigger && ((source.zone !== "EMPLOYEE_FIELD" && source.zone !== "SUPPORT_FIELD") || !source.faceUp))
            continue;
        if ((ability.targets ?? []).length > 0) {
            state.pendingTriggers.unshift(pending);
            openPendingTriggerChain(state);
            return;
        }
        executeEffects(state, { sourceId: source.instanceId, controllerId: source.controllerId, abilityId: ability.id, targets: {}, triggerEvent: pending.event }, ability.effects);
    }
}
function hasKeyword(state, instanceId, keyword) {
    const card = state.cards[instanceId];
    if (!card)
        return false;
    const def = state.definitions[card.definitionId];
    return (def.keywords ?? []).includes(keyword) || card.keywordModifiers.some((x) => x.keyword === keyword);
}
function snapshotTargetVersions(state, targets) {
    const result = {};
    for (const [key, ids] of Object.entries(targets)) {
        result[key] = {};
        for (const id of ids)
            if (state.cards[id])
                result[key][id] = state.cards[id].objectVersion;
    }
    return result;
}
function firstFreeEmployeeSlot(state, playerId) {
    return state.players[playerId].employeeField.findIndex((id) => id === null);
}
function firstFreeSupportSlot(state, playerId) {
    return state.players[playerId].supportField.findIndex((id) => id === null);
}
function scheduleEffect(state, context, timing, condition, effects) {
    const controller = state.players[context.controllerId];
    let dueTurnsStarted = controller.turnsStarted;
    let phase = "END";
    if (timing === "START_OF_NEXT_OWN_TURN") {
        dueTurnsStarted += 1;
        phase = "START";
    }
    else if (timing === "END_OF_NEXT_OWN_TURN") {
        dueTurnsStarted += 1;
        phase = "END";
    }
    else if (timing === "START_OF_NEXT_CONTROLLER_MAIN_PHASE") {
        dueTurnsStarted += 1;
        phase = "MAIN";
    }
    state.scheduleSeq += 1;
    state.scheduledEffects.push({
        id: `SCHEDULE-${state.scheduleSeq}`,
        controllerId: context.controllerId,
        sourceInstanceId: context.sourceId,
        sourceObjectVersion: state.cards[context.sourceId]?.objectVersion ?? 0,
        abilityId: context.abilityId,
        duePlayerId: context.controllerId,
        dueTurnsStarted,
        phase,
        targets: structuredClone(context.targets),
        targetObjectVersions: snapshotTargetVersions(state, context.targets),
        condition,
        effects
    });
    emit(state, "SCHEDULED_EFFECT_CREATED", { playerId: context.controllerId, cardInstanceId: context.sourceId, data: { timing, dueTurnsStarted, phase } });
}
function delayChainItem(state, chainItemId, delayedById) {
    const item = state.chain.find((entry) => entry.id === chainItemId);
    if (!item || item.delayed)
        return;
    item.delayed = true;
    state.pendingSeq += 1;
    state.pendingResolutions.push({
        id: `PENDING-${state.pendingSeq}`,
        sourceInstanceId: item.sourceInstanceId,
        sourceObjectVersion: state.cards[item.sourceInstanceId]?.objectVersion ?? item.sourceObjectVersion,
        controllerId: item.controllerId,
        abilityId: item.abilityId,
        dueTurnsStarted: state.players[item.controllerId].turnsStarted + 1,
        phase: "MAIN",
        effects: structuredClone(item.effects),
        targets: structuredClone(item.targets),
        targetObjectVersions: structuredClone(item.targetObjectVersions)
    });
    const eligibleSources = triggerSourceSnapshot(state);
    emit(state, "CHAIN_ITEM_DELAYED", { playerId: item.controllerId, cardInstanceId: item.sourceInstanceId, data: { chainItemId, delayedById } });
    emit(state, "CARD_DELAYED", { playerId: item.controllerId, cardInstanceId: item.sourceInstanceId, data: { chainItemId, delayedById } });
    queueTriggerEvent(state, { event: "CARD_DELAYED", playerId: item.controllerId, cardInstanceId: item.sourceInstanceId, causeSourceId: delayedById }, eligibleSources);
}
function shufflePlayerDeck(state, playerId) {
    // Deterministic for replayability: same state/event sequence => same shuffle.
    const salt = playerId === "P1" ? 0x51f15e1d : 0x7a3c9b27;
    const rng = mulberry32((state.seed ^ salt ^ state.eventSeq ^ state.turnNumber) >>> 0);
    state.players[playerId].deck = shuffle(state.players[playerId].deck, rng);
    emit(state, "DECK_SHUFFLED", { playerId, data: { remaining: state.players[playerId].deck.length } });
}
function startDeckSelection(state, context, args) {
    if (state.pendingDeckSelection || state.pendingChoice)
        throw new RulesError("Another player decision is already pending.");
    const effectiveMax = Math.min(args.max, args.candidateIds.length);
    const effectiveMin = args.candidateIds.length === 0 ? 0 : Math.min(args.min, effectiveMax);
    state.deckSelectionSeq += 1;
    const sourceDef = state.definitions[state.cards[context.sourceId].definitionId];
    state.pendingDeckSelection = {
        id: `DECKSEL-${state.deckSelectionSeq}`,
        playerId: args.playerId,
        controllerId: context.controllerId,
        sourceId: context.sourceId,
        abilityId: context.abilityId,
        resolvingChainItemId: context.resolvingChainItemId ?? null,
        triggeringChainItemId: context.triggeringChainItemId ?? null,
        mode: args.mode,
        candidateIds: [...args.candidateIds],
        visibleIds: [...args.visibleIds],
        min: effectiveMin,
        max: effectiveMax,
        selectedDestination: args.selectedDestination,
        unselectedDestination: args.unselectedDestination,
        revealSelected: args.revealSelected,
        shuffleAfter: args.shuffleAfter,
        allowReorderUnselected: args.allowReorderUnselected,
        archiveSourceAfterResolve: sourceDef.cardType === "ACTION"
    };
    state.responseWindow = null;
    state.priorityPlayerId = null;
    state.consecutivePasses = 0;
    emit(state, "DECK_SELECTION_REQUIRED", {
        playerId: args.playerId,
        cardInstanceId: context.sourceId,
        data: {
            selectionId: state.pendingDeckSelection.id,
            mode: args.mode,
            visibleIds: args.visibleIds,
            candidateIds: args.candidateIds,
            min: effectiveMin,
            max: effectiveMax
        }
    });
    return "PAUSED";
}
function startHandSelection(state, context, playerId, min, max) {
    if (state.pendingDeckSelection || state.pendingChoice || state.pendingHandSelection || state.pendingTriggerTargetSelection) {
        throw new RulesError("Another player decision is already pending.");
    }
    const candidates = [...state.players[playerId].hand];
    const effectiveMax = Math.min(max, candidates.length);
    const effectiveMin = candidates.length === 0 ? 0 : Math.min(min, effectiveMax);
    state.handSelectionSeq += 1;
    const sourceDef = state.definitions[state.cards[context.sourceId].definitionId];
    state.pendingHandSelection = {
        id: `HANDSEL-${state.handSelectionSeq}`,
        playerId,
        controllerId: context.controllerId,
        sourceId: context.sourceId,
        abilityId: context.abilityId,
        resolvingChainItemId: context.resolvingChainItemId ?? null,
        triggeringChainItemId: context.triggeringChainItemId ?? null,
        candidateIds: candidates,
        min: effectiveMin,
        max: effectiveMax,
        archiveSourceAfterResolve: sourceDef.cardType === "ACTION"
    };
    state.responseWindow = null;
    state.priorityPlayerId = null;
    state.consecutivePasses = 0;
    emit(state, "HAND_SELECTION_REQUIRED", {
        playerId,
        cardInstanceId: context.sourceId,
        data: { selectionId: state.pendingHandSelection.id, candidateIds: candidates, min: effectiveMin, max: effectiveMax }
    });
    return "PAUSED";
}
export function resolveHandSelection(state, playerId, selectionId, selectedIds) {
    const pending = state.pendingHandSelection;
    if (!pending || pending.id !== selectionId)
        throw new RulesError("No matching pending hand selection.");
    if (pending.playerId !== playerId)
        throw new RulesError("This hand selection belongs to the other player.");
    const selected = [...new Set(selectedIds)];
    if (selected.length < pending.min || selected.length > pending.max)
        throw new RulesError("Invalid hand selection count.");
    const candidates = new Set(pending.candidateIds);
    if (selected.some((id) => !candidates.has(id) || !state.players[playerId].hand.includes(id)))
        throw new RulesError("Selected card is not a legal hand candidate.");
    for (const id of selected)
        moveToArchive(state, id);
    state.pendingHandSelection = null;
    emit(state, "HAND_SELECTION_RESOLVED", { playerId, cardInstanceId: pending.sourceId, data: { selectionId, selectedIds: selected } });
    if (pending.resolvingChainItemId) {
        const top = state.chain[state.chain.length - 1];
        if (!top || top.id !== pending.resolvingChainItemId)
            throw new RulesError("Hand selection lost its Chain position.");
        top.effectsResolved = true;
        resolveInteractiveWindow(state);
        return;
    }
    resolvePendingTriggersImmediately(state);
}
function removeIdsFromDeck(player, ids) {
    const remove = new Set(ids);
    player.deck = player.deck.filter((id) => !remove.has(id));
}
function placeDeckIds(player, idsInDisplayOrder, destination) {
    if (destination === "TOP") {
        // Display order is draw order: first id should be drawn first, so it must be the array's last element.
        player.deck.push(...[...idsInDisplayOrder].reverse());
    }
    else {
        // For BOTTOM, supplied order is deepest-bottom first.
        player.deck.unshift(...idsInDisplayOrder);
    }
}
export function resolveDeckSelection(state, playerId, selectionId, selectedIds, unselectedOrder) {
    const pending = state.pendingDeckSelection;
    if (!pending || pending.id !== selectionId)
        throw new RulesError("No matching pending deck selection.");
    if (pending.playerId !== playerId)
        throw new RulesError("This deck selection belongs to the other player.");
    const selected = [...new Set(selectedIds)];
    if (selected.length < pending.min || selected.length > pending.max)
        throw new RulesError("Invalid deck selection count.");
    const candidates = new Set(pending.candidateIds);
    if (selected.some((id) => !candidates.has(id)))
        throw new RulesError("Selected card is not a legal candidate.");
    const player = state.players[playerId];
    const visibleSet = new Set(pending.visibleIds);
    if (pending.visibleIds.some((id) => !player.deck.includes(id)))
        throw new RulesError("Deck changed while selection was pending.");
    const unselected = pending.visibleIds.filter((id) => !selected.includes(id));
    let orderedUnselected = unselected;
    if (unselectedOrder !== undefined) {
        if (!pending.allowReorderUnselected)
            throw new RulesError("This effect does not allow reordering the unselected cards.");
        const supplied = [...new Set(unselectedOrder)];
        if (supplied.length !== unselected.length || supplied.some((id) => !visibleSet.has(id) || selected.includes(id))) {
            throw new RulesError("Invalid unselected card order.");
        }
        orderedUnselected = supplied;
    }
    if (pending.mode === "TOP")
        removeIdsFromDeck(player, pending.visibleIds);
    for (const id of selected) {
        if (pending.revealSelected)
            emit(state, "CARD_REVEALED", { playerId, cardInstanceId: id, data: { to: "BOTH" } });
        if (pending.selectedDestination === "HAND")
            moveCard(state, id, "HAND");
    }
    if (pending.mode === "TOP") {
        const selectedStillDeck = selected.filter((id) => state.cards[id].zone === "DECK");
        if (selectedStillDeck.length > 0)
            placeDeckIds(player, selectedStillDeck, pending.selectedDestination);
        if (orderedUnselected.length > 0 && pending.unselectedDestination)
            placeDeckIds(player, orderedUnselected, pending.unselectedDestination);
    }
    if (pending.shuffleAfter)
        shufflePlayerDeck(state, playerId);
    state.pendingDeckSelection = null;
    emit(state, "DECK_SELECTION_RESOLVED", {
        playerId,
        cardInstanceId: pending.sourceId,
        data: { selectionId, selectedIds: selected, unselectedOrder: orderedUnselected }
    });
    if (pending.resolvingChainItemId) {
        const top = state.chain[state.chain.length - 1];
        if (!top || top.id !== pending.resolvingChainItemId)
            throw new RulesError("Deck selection lost its Chain position.");
        top.effectsResolved = true;
        resolveInteractiveWindow(state);
        return;
    }
    const source = state.cards[pending.sourceId];
    if (source && pending.archiveSourceAfterResolve && source.zone === "PENDING") {
        emit(state, "ACTION_RESOLVED", { playerId: pending.controllerId, cardInstanceId: pending.sourceId, data: { abilityId: pending.abilityId } });
        moveToArchive(state, pending.sourceId);
    }
    resolvePendingTriggersImmediately(state);
}
function effectTargetIds(context, target) {
    if (target === "SOURCE")
        return [context.sourceId];
    if (target === "EVENT_CARD")
        return context.triggerEvent?.cardInstanceId ? [context.triggerEvent.cardInstanceId] : [];
    return context.targets[target] ?? [];
}
function executeEffects(state, context, effects) {
    for (const effect of effects) {
        if (state.status === "ENDED")
            return "DONE";
        if (effect.type === "DRAW") {
            drawCards(state, relativePlayer(context.controllerId, effect.player), effect.amount, true);
        }
        else if (effect.type === "SHUFFLE_DECK") {
            shufflePlayerDeck(state, relativePlayer(context.controllerId, effect.player));
        }
        else if (effect.type === "REVEAL_TARGET") {
            for (const targetId of context.targets[effect.target] ?? []) {
                emit(state, "CARD_REVEALED", { playerId: context.controllerId, cardInstanceId: targetId, data: { to: effect.to } });
            }
        }
        else if (effect.type === "SEARCH_DECK") {
            const playerId = relativePlayer(context.controllerId, effect.player);
            const visibleIds = [...state.players[playerId].deck];
            const candidateIds = effect.filter ? visibleIds.filter((id) => cardMatchesFilter(state, id, effect.filter)) : visibleIds;
            return startDeckSelection(state, context, {
                playerId,
                mode: "SEARCH",
                visibleIds,
                candidateIds,
                min: effect.min,
                max: effect.max,
                selectedDestination: effect.destination,
                revealSelected: effect.revealSelected ?? false,
                shuffleAfter: effect.shuffleAfter ?? true,
                allowReorderUnselected: false
            });
        }
        else if (effect.type === "LOOK_AT_TOP_SELECT") {
            const playerId = relativePlayer(context.controllerId, effect.player);
            const player = state.players[playerId];
            const visibleIds = player.deck.slice(-effect.amount).reverse();
            const candidateIds = effect.filter ? visibleIds.filter((id) => cardMatchesFilter(state, id, effect.filter)) : visibleIds;
            emit(state, "TOP_CARDS_VIEWED", { playerId, cardInstanceId: context.sourceId, data: { amount: visibleIds.length, cardInstanceIds: visibleIds } });
            return startDeckSelection(state, context, {
                playerId,
                mode: "TOP",
                visibleIds,
                candidateIds,
                min: effect.min,
                max: effect.max,
                selectedDestination: effect.selectedDestination,
                unselectedDestination: effect.unselectedDestination,
                revealSelected: effect.revealSelected ?? false,
                shuffleAfter: false,
                allowReorderUnselected: effect.allowReorderUnselected ?? false
            });
        }
        else if (effect.type === "GAIN_CAPACITY") {
            const playerId = relativePlayer(context.controllerId, effect.player);
            const player = state.players[playerId];
            player.availableCapacity += effect.amount;
            emit(state, "CAPACITY_CHANGED", { playerId, data: { availableCapacity: player.availableCapacity, delta: effect.amount } });
        }
        else if (effect.type === "PAY_CAPACITY") {
            payCapacity(state, relativePlayer(context.controllerId, effect.player), effect.amount);
        }
        else if (effect.type === "LOSE_AVAILABLE_CAPACITY") {
            const playerId = relativePlayer(context.controllerId, effect.player);
            const player = state.players[playerId];
            const amount = Math.min(effect.amount, player.availableCapacity);
            player.availableCapacity -= amount;
            if (amount > 0)
                emit(state, "CAPACITY_CHANGED", { playerId, data: { availableCapacity: player.availableCapacity, delta: -amount } });
        }
        else if (effect.type === "LOSE_REPUTATION") {
            const amount = typeof effect.amount === "number" ? effect.amount : (context.triggerEvent?.battleExcessPower ?? 0);
            changeReputation(state, relativePlayer(context.controllerId, effect.player), -amount, "CARD_EFFECT", context.sourceId);
        }
        else if (effect.type === "RESTORE_REPUTATION") {
            changeReputation(state, relativePlayer(context.controllerId, effect.player), effect.amount, "CARD_EFFECT", context.sourceId);
        }
        else if (effect.type === "MODIFY_POWER") {
            for (const targetId of effectTargetIds(context, effect.target)) {
                const card = state.cards[targetId];
                if (!card || card.zone !== "EMPLOYEE_FIELD")
                    continue;
                card.powerModifiers.push({
                    id: `${context.sourceId}:${context.abilityId}:${state.eventSeq + 1}:${targetId}`,
                    amount: effect.amount,
                    sourceInstanceId: context.sourceId,
                    abilityId: context.abilityId,
                    duration: effect.duration,
                    expiresAtTurnNumber: effect.duration === "END_OF_TURN" ? state.turnNumber : undefined,
                    expiresAtPlayerId: effect.duration === "UNTIL_START_OF_NEXT_OWN_TURN" ? context.controllerId : undefined,
                    expiresAtTurnsStarted: effect.duration === "UNTIL_START_OF_NEXT_OWN_TURN" ? state.players[context.controllerId].turnsStarted + 1 : undefined
                });
                emit(state, "POWER_MODIFIED", { playerId: card.controllerId, cardInstanceId: targetId, data: { amount: effect.amount, duration: effect.duration } });
            }
        }
        else if (effect.type === "GRANT_KEYWORD") {
            for (const targetId of effectTargetIds(context, effect.target)) {
                const card = state.cards[targetId];
                if (!card || card.zone !== "EMPLOYEE_FIELD")
                    continue;
                card.keywordModifiers.push({
                    id: `${context.sourceId}:${context.abilityId}:${state.eventSeq + 1}:${targetId}:${effect.keyword}`,
                    keyword: effect.keyword,
                    sourceInstanceId: context.sourceId,
                    abilityId: context.abilityId,
                    duration: effect.duration,
                    expiresAtTurnNumber: state.turnNumber
                });
                emit(state, "KEYWORD_GRANTED", { playerId: card.controllerId, cardInstanceId: targetId, data: { keyword: effect.keyword, duration: effect.duration } });
            }
        }
        else if (effect.type === "MODIFY_MAX_ATTACKS") {
            for (const targetId of effectTargetIds(context, effect.target)) {
                const card = state.cards[targetId];
                if (!card || card.zone !== "EMPLOYEE_FIELD")
                    continue;
                card.maxAttacks += effect.amount;
                emit(state, "ATTACKS_MODIFIED", { playerId: card.controllerId, cardInstanceId: targetId, data: { amount: effect.amount, maxAttacks: card.maxAttacks } });
            }
        }
        else if (effect.type === "ADD_STATUS") {
            for (const targetId of effectTargetIds(context, effect.target)) {
                const card = state.cards[targetId];
                if (!card)
                    continue;
                if (effect.status === "ONBOARDING")
                    card.onboarding = true;
            }
        }
        else if (effect.type === "REMOVE_STATUS") {
            for (const targetId of effectTargetIds(context, effect.target)) {
                const card = state.cards[targetId];
                if (!card)
                    continue;
                if (effect.status === "ONBOARDING")
                    card.onboarding = false;
            }
        }
        else if (effect.type === "PREVENT_ATTACK") {
            for (const targetId of effectTargetIds(context, effect.target)) {
                const card = state.cards[targetId];
                if (!card || card.zone !== "EMPLOYEE_FIELD")
                    continue;
                if (effect.duration === "END_OF_TURN")
                    card.cannotAttackUntilTurnNumber = state.turnNumber;
                else
                    card.cannotAttackThroughControllerTurnsStarted = state.players[card.controllerId].turnsStarted + 1;
                card.attackRestrictionSourceInstanceId = context.sourceId;
                card.attackRestrictionAbilityId = context.abilityId;
                card.attackRestrictionDuration = effect.duration;
            }
        }
        else if (effect.type === "FOR_EACH_MATCHING") {
            const ids = Object.values(state.cards)
                .filter((card) => selectorMatchesCard(state, context.controllerId, effect.selector, card.instanceId, context.sourceId))
                .map((card) => card.instanceId);
            const nestedContext = {
                ...context,
                targets: { ...context.targets, [effect.selector.id]: ids },
                targetObjectVersions: { ...(context.targetObjectVersions ?? {}), [effect.selector.id]: Object.fromEntries(ids.map((id) => [id, state.cards[id].objectVersion])) }
            };
            const nested = executeEffects(state, nestedContext, effect.effects);
            if (nested === "PAUSED")
                return "PAUSED";
        }
        else if (effect.type === "RESET_TARGET_TEMPORARY") {
            for (const targetId of effectTargetIds(context, effect.target)) {
                const card = state.cards[targetId];
                if (!card)
                    continue;
                card.powerModifiers = [];
                card.keywordModifiers = [];
                card.maxAttacks = 1;
                card.cannotAttackUntilTurnNumber = null;
                card.cannotAttackThroughControllerTurnsStarted = null;
                card.attackRestrictionSourceInstanceId = undefined;
                card.attackRestrictionAbilityId = undefined;
                card.attackRestrictionDuration = undefined;
                emit(state, "CARD_RESET", { playerId: card.controllerId, cardInstanceId: targetId });
            }
        }
        else if (effect.type === "ADD_DESTRUCTION_SHIELD") {
            for (const targetId of context.targets[effect.target] ?? []) {
                const card = state.cards[targetId];
                if (!card)
                    continue;
                card.destructionShields.push({
                    id: `${context.sourceId}:${context.abilityId}:${state.eventSeq + 1}:${targetId}`,
                    cause: effect.cause,
                    sourceInstanceId: context.sourceId,
                    abilityId: context.abilityId,
                    duration: effect.duration,
                    expiresAtTurnNumber: effect.duration === "END_OF_TURN" ? state.turnNumber : undefined,
                    expiresAfterChainItemId: effect.duration === "UNTIL_CHAIN_ITEM_RESOLVES" ? (context.triggeringChainItemId ?? undefined) : undefined,
                    expiresAtControllerTurnsStarted: effect.duration === "UNTIL_START_OF_NEXT_OWN_TURN" ? state.players[card.controllerId].turnsStarted + 1 : undefined,
                    onlyOpponentSource: effect.onlyOpponentSource
                });
            }
        }
        else if (effect.type === "ADD_DESTRUCTION_SHIELD_TO_TRIGGERING_TARGETS") {
            const triggering = context.triggeringChainItemId ? state.chain.find((entry) => entry.id === context.triggeringChainItemId) : undefined;
            if (triggering) {
                for (const targetId of [...new Set(Object.values(triggering.targets).flat())]) {
                    const card = state.cards[targetId];
                    if (!card || (effect.filter && !cardMatchesFilter(state, targetId, effect.filter)))
                        continue;
                    card.destructionShields.push({
                        id: `${context.sourceId}:${context.abilityId}:${state.eventSeq + 1}:${targetId}`,
                        cause: effect.cause,
                        sourceInstanceId: context.sourceId,
                        abilityId: context.abilityId,
                        duration: effect.duration,
                        expiresAfterChainItemId: triggering.id
                    });
                }
            }
        }
        else if (effect.type === "DESTROY_TARGET") {
            for (const targetId of context.targets[effect.target] ?? []) {
                destroyCardByEffect(state, targetId, context.sourceId, context.resolvingChainItemId ?? context.triggeringChainItemId ?? null);
            }
        }
        else if (effect.type === "MOVE_TARGET") {
            for (const targetId of context.targets[effect.target] ?? []) {
                const before = state.cards[targetId];
                const oldZone = before?.zone;
                const eligibleSources = oldZone === "ARCHIVE" && effect.to === "EMPLOYEE_FIELD" ? triggerSourceSnapshot(state) : [];
                if (effect.to === "ARCHIVE")
                    moveToArchive(state, targetId, context.sourceId);
                else if (effect.to === "HAND")
                    moveToHand(state, targetId);
                else if (effect.to === "DECK") {
                    moveCard(state, targetId, "DECK");
                    state.players[state.cards[targetId].ownerId].deck.push(targetId);
                    if (effect.shuffleAfter)
                        shufflePlayerDeck(state, state.cards[targetId].ownerId);
                }
                else {
                    const card = state.cards[targetId];
                    const slot = effect.firstFreeSlot ? firstFreeEmployeeSlot(state, card.controllerId) : -1;
                    if (slot < 0)
                        continue;
                    moveCard(state, targetId, "EMPLOYEE_FIELD", slot);
                    card.faceUp = true;
                    card.lastPlayMethod = effect.playMethod ?? "RETURN_FROM_ARCHIVE";
                    card.attacksUsed = 0;
                    card.maxAttacks = 1;
                    if (oldZone === "ARCHIVE") {
                        const causeDef = state.definitions[state.cards[context.sourceId].definitionId];
                        queueTriggerEvent(state, {
                            event: "CARD_RETURNED_FROM_ARCHIVE",
                            playerId: card.controllerId,
                            cardInstanceId: targetId,
                            causeSourceId: context.sourceId,
                            causeDepartment: causeDef.department,
                            causeTags: causeDef.tags ?? []
                        }, eligibleSources);
                    }
                }
            }
        }
        else if (effect.type === "PLAY_TARGET") {
            for (const targetId of context.targets[effect.target] ?? []) {
                const card = state.cards[targetId];
                const def = state.definitions[card.definitionId];
                if (card.zone !== "HAND" || (def.cardType !== "SYSTEM" && def.cardType !== "EMPLOYEE"))
                    continue;
                assertCardCanBePlayed(state, targetId);
                const slot = def.cardType === "SYSTEM"
                    ? (effect.firstFreeSupportSlot ? firstFreeSupportSlot(state, card.controllerId) : -1)
                    : (effect.firstFreeEmployeeSlot ? firstFreeEmployeeSlot(state, card.controllerId) : -1);
                if (slot < 0)
                    continue;
                let paidCost = 0;
                if (!effect.ignoreCapacityCost) {
                    const calculation = getCardCost(state, card.controllerId, targetId, "PLAY");
                    calculation.finalCost = Math.max(0, calculation.finalCost + (effect.costAdjustment ?? 0));
                    payCalculatedCost(state, card.controllerId, calculation, targetId, "PLAY");
                    paidCost = calculation.finalCost;
                }
                const eligiblePlayTriggers = triggerSourceSnapshot(state);
                if (def.cardType === "SYSTEM") {
                    moveCard(state, targetId, "SUPPORT_FIELD", slot);
                    card.faceUp = true;
                }
                else {
                    moveCard(state, targetId, "EMPLOYEE_FIELD", slot);
                    card.faceUp = true;
                    card.onboarding = true;
                    card.attacksUsed = 0;
                    card.maxAttacks = 1;
                }
                card.lastPlayMethod = effect.playMethod;
                recordCardPlayed(state, card.controllerId, def);
                queueCardPlayedEvent(state, card.controllerId, targetId, eligiblePlayTriggers, effect.playMethod);
                emit(state, "CARD_PLAYED", { playerId: card.controllerId, cardInstanceId: targetId, data: { cardType: def.cardType, slot, cost: paidCost, playMethod: effect.playMethod } });
            }
        }
        else if (effect.type === "NEGATE_CHAIN_ITEM") {
            const chainItemId = context.triggeringChainItemId;
            if (!chainItemId)
                continue;
            const item = state.chain.find((entry) => entry.id === chainItemId);
            if (item && !item.negated) {
                item.negated = true;
                emit(state, "CHAIN_ITEM_NEGATED", { playerId: context.controllerId, cardInstanceId: context.sourceId, data: { chainItemId } });
            }
        }
        else if (effect.type === "REDIRECT_ATTACK_TARGET") {
            const pending = state.pendingAttack;
            if (!pending || pending.targetId === null)
                continue;
            const newTargetId = effect.newTarget === "SOURCE" ? context.sourceId : (context.targets[effect.newTarget]?.[0] ?? null);
            if (!newTargetId || newTargetId === pending.targetId)
                throw new RulesError("Redirect requires a different legal attack target.");
            const target = state.cards[newTargetId];
            const defendingPlayer = opponentOf(pending.controllerId);
            if (!target || target.zone !== "EMPLOYEE_FIELD" || target.controllerId !== defendingPlayer)
                throw new RulesError("Illegal redirected attack target.");
            const oldTargetId = pending.targetId;
            pending.targetId = newTargetId;
            emit(state, "ATTACK_TARGET_REDIRECTED", { playerId: context.controllerId, cardInstanceId: context.sourceId, data: { oldTargetId, newTargetId } });
        }
        else if (effect.type === "REDIRECT_CHAIN_TARGET") {
            if (!context.triggeringChainItemId)
                continue;
            const item = state.chain.find((entry) => entry.id === context.triggeringChainItemId);
            if (!item)
                continue;
            const targetKey = effect.targetKey === "FIRST_TARGET"
                ? Object.keys(item.targets).find((key) => (item.targets[key]?.length ?? 0) > 0)
                : effect.targetKey;
            if (!targetKey)
                throw new RulesError("No chain target is available to redirect.");
            const newTargetId = effect.newTarget === "SOURCE" ? context.sourceId : (context.targets[effect.newTarget]?.[0] ?? null);
            if (!newTargetId)
                throw new RulesError("Redirect requires a new target.");
            const oldTargets = item.targets[targetKey] ?? [];
            if (oldTargets.length !== 1 || oldTargets[0] === newTargetId)
                throw new RulesError("This redirect requires one different target.");
            const selector = item.targetSelectors.find((x) => x.id === targetKey);
            if (!selector || !selectorMatchesCard(state, item.controllerId, selector, newTargetId, item.sourceInstanceId))
                throw new RulesError("New target is not legal for the original effect.");
            item.targets[targetKey] = [newTargetId];
            item.targetObjectVersions[targetKey] = { [newTargetId]: state.cards[newTargetId].objectVersion };
            emit(state, "CHAIN_TARGET_REDIRECTED", { playerId: context.controllerId, cardInstanceId: context.sourceId, data: { chainItemId: item.id, targetKey, oldTargetId: oldTargets[0], newTargetId } });
        }
        else if (effect.type === "DELAY_CHAIN_ITEM") {
            if (context.triggeringChainItemId)
                delayChainItem(state, context.triggeringChainItemId, context.sourceId);
        }
        else if (effect.type === "ARCHIVE_FROM_HAND_SELECT") {
            return startHandSelection(state, context, relativePlayer(context.controllerId, effect.player), effect.min, effect.max);
        }
        else if (effect.type === "RESTRICT_PLAY_TARGET") {
            for (const targetId of effectTargetIds(context, effect.target)) {
                const card = state.cards[targetId];
                if (!card)
                    continue;
                card.cannotPlayUntilTurnNumber = state.turnNumber;
                emit(state, "CARD_PLAY_RESTRICTED", { playerId: card.ownerId, cardInstanceId: targetId, data: { duration: effect.duration } });
            }
        }
        else if (effect.type === "MODIFY_PROMOTION_VALUE") {
            for (const targetId of effectTargetIds(context, effect.target)) {
                const card = state.cards[targetId];
                if (!card)
                    continue;
                card.promotionValueModifiers.push({ id: `${context.sourceId}:${context.abilityId}:${state.eventSeq + 1}:${targetId}`, amount: effect.amount, expiresAtTurnNumber: state.turnNumber });
            }
        }
        else if (effect.type === "ADD_NEXT_PROMOTION_REDUCTION") {
            const playerId = relativePlayer(context.controllerId, effect.player);
            state.players[playerId].promotionReductions.push({
                id: `${context.sourceId}:${context.abilityId}:${state.eventSeq + 1}`,
                department: effect.department,
                amount: effect.amount,
                minimumRequired: effect.minimumRequired,
                expiresAtTurnNumber: state.turnNumber
            });
        }
        else if (effect.type === "ADD_DIRECT_DAMAGE_RIDER") {
            for (const targetId of effectTargetIds(context, effect.target)) {
                const card = state.cards[targetId];
                if (!card || card.zone !== "EMPLOYEE_FIELD")
                    continue;
                card.directDamageRiders.push({ id: `${context.sourceId}:${context.abilityId}:${state.eventSeq + 1}:${targetId}`, sourceInstanceId: context.sourceId, amount: effect.amount, expiresAtTurnNumber: state.turnNumber });
            }
        }
        else if (effect.type === "ARCHIVE_SOURCE") {
            if (state.cards[context.sourceId] && state.cards[context.sourceId].zone !== "ARCHIVE")
                moveToArchive(state, context.sourceId, context.sourceId);
        }
        else if (effect.type === "MOVE_TRIGGERING_CHAIN_SOURCE") {
            if (!context.triggeringChainItemId)
                continue;
            const triggering = state.chain.find((entry) => entry.id === context.triggeringChainItemId);
            if (!triggering)
                continue;
            const target = state.cards[triggering.sourceInstanceId];
            if (!target)
                continue;
            moveToHand(state, target.instanceId);
            if (effect.restrictPlayForTurn) {
                target.cannotPlayUntilTurnNumber = state.turnNumber;
                emit(state, "CARD_PLAY_RESTRICTED", { playerId: target.ownerId, cardInstanceId: target.instanceId, data: { duration: "END_OF_TURN" } });
            }
        }
        else if (effect.type === "REVEAL_RANDOM_HAND_CARD") {
            const targetPlayerId = relativePlayer(context.controllerId, effect.player);
            const hand = state.players[targetPlayerId].hand;
            if (hand.length === 0)
                continue;
            const salt = (state.eventSeq + 1) * 2654435761;
            const rng = mulberry32((state.seed ^ salt ^ state.turnNumber) >>> 0);
            const targetId = hand[Math.floor(rng() * hand.length)];
            context.targets[effect.storeAs] = [targetId];
            emit(state, "CARD_REVEALED", { playerId: context.controllerId, cardInstanceId: targetId, data: { to: effect.to, random: true } });
        }
        else if (effect.type === "REVEAL_FACE_DOWN_SUPPORT") {
            const controllerId = relativePlayer(context.controllerId, effect.player);
            const viewerId = relativePlayer(context.controllerId, effect.to);
            state.revealPermissions.push({ viewerId, controllerId, expiresAtTurnNumber: state.turnNumber });
            emit(state, "REVEAL_PERMISSION_GRANTED", { playerId: viewerId, cardInstanceId: context.sourceId, data: { controllerId, duration: effect.duration } });
        }
        else if (effect.type === "PREVENT_ATTACK_EXCEPT") {
            const except = new Set(effectTargetIds(context, effect.except));
            for (const targetId of effectTargetIds(context, effect.targets)) {
                if (except.has(targetId))
                    continue;
                const card = state.cards[targetId];
                if (card?.zone === "EMPLOYEE_FIELD") {
                    card.cannotAttackUntilTurnNumber = state.turnNumber;
                    card.attackRestrictionSourceInstanceId = context.sourceId;
                    card.attackRestrictionAbilityId = context.abilityId;
                    card.attackRestrictionDuration = effect.duration;
                }
            }
        }
        else if (effect.type === "END_CURRENT_ATTACK") {
            if (state.pendingAttack) {
                state.pendingAttack.cancelled = true;
                emit(state, "ATTACK_ENDED", { playerId: context.controllerId, cardInstanceId: context.sourceId });
            }
        }
        else if (effect.type === "SCHEDULE") {
            scheduleEffect(state, context, effect.timing, effect.condition, effect.effects);
        }
        else if (effect.type === "OFFER_CHOICE") {
            const triggering = context.triggeringChainItemId ? state.chain.find((x) => x.id === context.triggeringChainItemId) : undefined;
            const choicePlayer = effect.player === "TRIGGERING_PLAYER"
                ? (triggering?.controllerId ?? opponentOf(context.controllerId))
                : relativePlayer(context.controllerId, effect.player);
            const choiceEvalContext = {
                sourceId: context.sourceId,
                targets: context.targets,
                targetObjectVersions: context.targetObjectVersions,
                triggeringChainItemId: context.triggeringChainItemId
            };
            let legalOptions = effect.options.filter((option) => (option.availableIf ?? []).every((condition) => evaluateCondition(state, context.controllerId, condition, choiceEvalContext)));
            if (legalOptions.length === 0 && effect.fallbackOption) {
                const fallback = effect.options.find((option) => option.id === effect.fallbackOption);
                if (fallback)
                    legalOptions = [fallback];
            }
            if (legalOptions.length === 0)
                throw new RulesError("Choice effect has no legal options.");
            state.choiceSeq += 1;
            state.pendingChoice = {
                id: `CHOICE-${state.choiceSeq}`,
                playerId: choicePlayer,
                chainItemId: context.resolvingChainItemId ?? "",
                sourceId: context.sourceId,
                controllerId: context.controllerId,
                abilityId: context.abilityId,
                triggeringChainItemId: context.triggeringChainItemId ?? null,
                targets: structuredClone(context.targets),
                targetObjectVersions: structuredClone(context.targetObjectVersions ?? snapshotTargetVersions(state, context.targets)),
                options: structuredClone(legalOptions),
                fallbackOption: effect.fallbackOption
            };
            state.responseWindow = null;
            state.priorityPlayerId = null;
            state.consecutivePasses = 0;
            emit(state, "CHOICE_REQUIRED", { playerId: choicePlayer, cardInstanceId: context.sourceId, data: { choiceId: state.pendingChoice.id, options: legalOptions.map((x) => x.id) } });
            return "PAUSED";
        }
        else if (effect.type === "IF") {
            if (evaluateCondition(state, context.controllerId, effect.condition, {
                sourceId: context.sourceId,
                targets: context.targets,
                targetObjectVersions: context.targetObjectVersions,
                triggeringChainItemId: context.triggeringChainItemId,
                triggerEvent: context.triggerEvent
            })) {
                const result = executeEffects(state, context, effect.then);
                if (result === "PAUSED")
                    return result;
            }
        }
    }
    return "DONE";
}
function targetsStillSameObjects(state, targets, versions) {
    const out = {};
    for (const [key, ids] of Object.entries(targets)) {
        out[key] = ids.filter((id) => state.cards[id] && versions[key]?.[id] === state.cards[id].objectVersion);
    }
    return out;
}
function processScheduledBoundary(state, playerId, phase) {
    const turnsStarted = state.players[playerId].turnsStarted;
    const due = state.scheduledEffects.filter((x) => x.duePlayerId === playerId && x.dueTurnsStarted === turnsStarted && x.phase === phase);
    if (due.length === 0)
        return;
    state.scheduledEffects = state.scheduledEffects.filter((x) => !due.includes(x));
    for (const scheduled of due) {
        const context = {
            sourceId: scheduled.sourceInstanceId,
            controllerId: scheduled.controllerId,
            abilityId: scheduled.abilityId,
            targets: structuredClone(scheduled.targets),
            targetObjectVersions: structuredClone(scheduled.targetObjectVersions)
        };
        const conditionOk = !scheduled.condition || evaluateCondition(state, scheduled.controllerId, scheduled.condition, {
            sourceId: scheduled.sourceInstanceId,
            targets: scheduled.targets,
            targetObjectVersions: scheduled.targetObjectVersions
        });
        if (conditionOk)
            executeEffects(state, context, scheduled.effects);
        emit(state, "SCHEDULED_EFFECT_RESOLVED", { playerId: scheduled.controllerId, cardInstanceId: scheduled.sourceInstanceId, data: { scheduledId: scheduled.id, conditionMet: conditionOk } });
    }
    resolvePendingTriggersImmediately(state);
}
function processPendingResolutions(state, playerId) {
    const turnsStarted = state.players[playerId].turnsStarted;
    const due = state.pendingResolutions.filter((x) => x.controllerId === playerId && x.dueTurnsStarted === turnsStarted && x.phase === "MAIN");
    if (due.length === 0)
        return;
    state.pendingResolutions = state.pendingResolutions.filter((x) => !due.includes(x));
    for (const pending of due) {
        const source = state.cards[pending.sourceInstanceId];
        if (!source || source.zone !== "PENDING" || source.objectVersion !== pending.sourceObjectVersion)
            continue;
        const liveTargets = targetsStillSameObjects(state, pending.targets, pending.targetObjectVersions);
        executeEffects(state, {
            sourceId: pending.sourceInstanceId,
            controllerId: pending.controllerId,
            abilityId: pending.abilityId,
            targets: liveTargets,
            targetObjectVersions: pending.targetObjectVersions
        }, pending.effects);
        if (state.cards[pending.sourceInstanceId]?.zone === "PENDING")
            moveToArchive(state, pending.sourceInstanceId);
        emit(state, "PENDING_EFFECT_RESOLVED", { playerId: pending.controllerId, cardInstanceId: pending.sourceInstanceId, data: { pendingId: pending.id } });
    }
}
export function resolveChoice(state, playerId, choiceId, optionId) {
    const choice = state.pendingChoice;
    if (!choice || choice.id !== choiceId)
        throw new RulesError("No matching pending choice.");
    if (choice.playerId !== playerId)
        throw new RulesError("This choice belongs to the other player.");
    const option = choice.options.find((x) => x.id === optionId);
    if (!option)
        throw new RulesError("Unknown choice option.");
    const evalContext = {
        sourceId: choice.sourceId,
        targets: choice.targets,
        targetObjectVersions: choice.targetObjectVersions,
        triggeringChainItemId: choice.triggeringChainItemId
    };
    for (const condition of option.availableIf ?? []) {
        if (!evaluateCondition(state, choice.controllerId, condition, evalContext))
            throw new RulesError("Choice option is not currently available.");
    }
    state.pendingChoice = null;
    const result = executeEffects(state, {
        sourceId: choice.sourceId,
        controllerId: choice.controllerId,
        abilityId: choice.abilityId,
        targets: choice.targets,
        targetObjectVersions: choice.targetObjectVersions,
        triggeringChainItemId: choice.triggeringChainItemId,
        resolvingChainItemId: choice.chainItemId
    }, option.effects);
    emit(state, "CHOICE_RESOLVED", { playerId, cardInstanceId: choice.sourceId, data: { choiceId, optionId } });
    if (result === "PAUSED")
        return;
    const top = state.chain[state.chain.length - 1];
    if (!top || top.id !== choice.chainItemId)
        throw new RulesError("Choice resolution lost its Chain position.");
    top.effectsResolved = true;
    resolveInteractiveWindow(state);
}
export function playAction(state, playerId, instanceId, targets = {}) {
    assertActive(state, playerId);
    assertNoOpenResponse(state);
    if (state.phase !== "MAIN")
        throw new RulesError("Actions can only be played during Main Phase.");
    const player = state.players[playerId];
    if (!player.hand.includes(instanceId))
        throw new RulesError("Action must be in hand.");
    const card = state.cards[instanceId];
    assertCardCanBePlayed(state, instanceId);
    const def = state.definitions[card.definitionId];
    if (def.cardType !== "ACTION")
        throw new RulesError("Card is not an Action.");
    const ability = (def.abilities ?? []).find((entry) => entry.type === "ACTIVATED");
    if (!ability || ability.type !== "ACTIVATED")
        throw new RulesError("Action has no activated ability.");
    const resolvedTargets = validateTargets(state, playerId, ability.targets, targets);
    validateConditions(state, playerId, ability.conditions, { sourceId: instanceId, targets: resolvedTargets, targetObjectVersions: snapshotTargetVersions(state, resolvedTargets) });
    assertActionPlayLimit(state, playerId);
    const costCalculation = getCardCost(state, playerId, instanceId, "PLAY");
    payCalculatedCost(state, playerId, costCalculation, instanceId, "PLAY");
    const cost = costCalculation.finalCost;
    const eligiblePlayTriggers = triggerSourceSnapshot(state);
    moveCard(state, instanceId, "PENDING");
    recordCardPlayed(state, playerId, def);
    queueCardPlayedEvent(state, playerId, instanceId, eligiblePlayTriggers, "NORMAL");
    emit(state, "CARD_PLAYED", { playerId, cardInstanceId: instanceId, data: { cardType: "ACTION", cost } });
    const result = executeEffects(state, { sourceId: instanceId, controllerId: playerId, abilityId: ability.id, targets: resolvedTargets }, ability.effects);
    if (result === "PAUSED")
        return;
    const eligibleResolveTriggers = triggerSourceSnapshot(state);
    emit(state, "ACTION_RESOLVED", { playerId, cardInstanceId: instanceId, data: { abilityId: ability.id } });
    if (state.cards[instanceId].zone === "PENDING")
        moveToArchive(state, instanceId);
    queueTriggerEvent(state, { event: "ACTION_RESOLVED", playerId, cardInstanceId: instanceId }, eligibleResolveTriggers);
    resolvePendingTriggersImmediately(state);
}
export function activateAbility(state, playerId, sourceId, abilityId, targets = {}) {
    assertActive(state, playerId);
    assertNoOpenResponse(state);
    const source = state.cards[sourceId];
    if (!source)
        throw new RulesError("Unknown source card.");
    if (source.controllerId !== playerId)
        throw new RulesError("You do not control this card.");
    if (source.zone !== "EMPLOYEE_FIELD" && source.zone !== "SUPPORT_FIELD")
        throw new RulesError("Ability source is not in play.");
    const def = state.definitions[source.definitionId];
    const ability = (def.abilities ?? []).find((entry) => entry.id === abilityId);
    if (!ability || ability.type !== "ACTIVATED")
        throw new RulesError("Activated ability not found.");
    if (ability.timing === "OWN_MAIN_PHASE" && state.phase !== "MAIN")
        throw new RulesError("Ability can only be activated during your Main Phase.");
    const resolvedTargets = validateTargets(state, playerId, ability.targets, targets);
    validateConditions(state, playerId, ability.conditions, { sourceId: sourceId, targets: resolvedTargets, targetObjectVersions: snapshotTargetVersions(state, resolvedTargets) });
    validateAndConsumeUsage(state, sourceId, ability);
    emit(state, "ABILITY_ACTIVATED", { playerId, cardInstanceId: sourceId, data: { abilityId } });
    const result = executeEffects(state, { sourceId, controllerId: playerId, abilityId, targets: resolvedTargets }, ability.effects);
    if (result === "PAUSED")
        return;
    resolvePendingTriggersImmediately(state);
}
function selectorMatchesCard(state, sourceControllerId, selector, instanceId, sourceId) {
    const card = state.cards[instanceId];
    if (!card)
        return false;
    if (selector.sourceOnly && sourceId !== instanceId)
        return false;
    if (selector.excludeSource && sourceId && sourceId === instanceId)
        return false;
    if (selector.mustBePendingBattleDestruction && !state.pendingBattleResolution?.destructionCandidateIds.includes(instanceId))
        return false;
    const expectedController = selector.controller === "ANY" ? null : relativePlayer(sourceControllerId, selector.controller);
    if ((expectedController && card.controllerId !== expectedController) || !selectorZones(selector.zone).includes(card.zone))
        return false;
    return cardMatchesFilter(state, instanceId, selector);
}
function continuousPowerContributions(state, targetId) {
    const contributions = [];
    for (const source of Object.values(state.cards)) {
        if ((source.zone !== "EMPLOYEE_FIELD" && source.zone !== "SUPPORT_FIELD") || !source.faceUp)
            continue;
        const def = state.definitions[source.definitionId];
        for (const ability of def.abilities ?? []) {
            if (ability.type !== "CONTINUOUS")
                continue;
            if (ability.phases && !ability.phases.includes(state.phase))
                continue;
            if (!evaluateAllConditions(state, source.controllerId, ability.conditions))
                continue;
            if (!selectorMatchesCard(state, source.controllerId, ability.appliesTo, targetId, source.instanceId))
                continue;
            for (const effect of ability.effects)
                if (effect.type === "MODIFY_POWER" && effect.amount !== 0)
                    contributions.push({
                        kind: "CONTINUOUS",
                        amount: effect.amount,
                        sourceInstanceId: source.instanceId,
                        abilityId: ability.id
                    });
        }
    }
    return contributions;
}
export function getPowerBreakdown(state, instanceId) {
    const card = state.cards[instanceId];
    const def = state.definitions[card.definitionId];
    const temporary = card.powerModifiers.filter((modifier) => modifier.amount !== 0).map((modifier) => ({
        kind: "TEMPORARY",
        amount: modifier.amount,
        sourceInstanceId: modifier.sourceInstanceId,
        abilityId: modifier.abilityId,
        duration: modifier.duration
    }));
    const contributions = [...temporary, ...continuousPowerContributions(state, instanceId)];
    const printed = def.power ?? 0;
    const current = Math.max(0, printed + contributions.reduce((sum, contribution) => sum + contribution.amount, 0));
    return { printed, current, contributions };
}
function evaluateAllConditions(state, controllerId, conditions, context = {}) {
    return (conditions ?? []).every((condition) => evaluateCondition(state, controllerId, condition, context));
}
export function getCurrentPower(state, instanceId) {
    return getPowerBreakdown(state, instanceId).current;
}
function resolveEmployeeBattle(state, controllerId, attackerId, targetId) {
    const eligibleSources = triggerSourceSnapshot(state);
    const attackerPower = getCurrentPower(state, attackerId);
    const defenderPower = getCurrentPower(state, targetId);
    let winnerId = null;
    let destroyedId = null;
    const destroyedIds = [];
    let breakthroughApplied = false;
    const excessPower = Math.max(0, attackerPower - defenderPower);
    if (attackerPower > defenderPower) {
        winnerId = attackerId;
        destroyedId = targetId;
        destroyedIds.push(targetId);
        destroyEmployee(state, targetId, attackerId);
        if (excessPower > 0 && hasKeyword(state, attackerId, "BREAKTHROUGH")) {
            breakthroughApplied = true;
            const opponentId = opponentOf(controllerId);
            changeReputation(state, opponentId, -excessPower, "BREAKTHROUGH");
            emit(state, "BREAKTHROUGH_DAMAGE", { playerId: controllerId, cardInstanceId: attackerId, data: { targetId, excessPower } });
        }
        const event = {
            event: "BATTLE_EMPLOYEE_DESTROYED",
            actorId: controllerId,
            attackerId,
            defenderId: targetId,
            attackerPower,
            defenderPower,
            battleExcessPower: excessPower,
            breakthroughApplied
        };
        queueTriggerEvent(state, event, eligibleSources);
    }
    else if (attackerPower < defenderPower) {
        winnerId = targetId;
        destroyedId = attackerId;
        destroyedIds.push(attackerId);
        destroyEmployee(state, attackerId, targetId);
    }
    else {
        destroyedIds.push(targetId, attackerId);
        destroyEmployee(state, targetId, attackerId);
        destroyEmployee(state, attackerId, targetId);
    }
    emit(state, "BATTLE_RESOLVED", {
        playerId: controllerId,
        cardInstanceId: attackerId,
        data: { attackerId, targetId, attackerPower, defenderPower, winnerId, destroyedId, destroyedIds, excessPower, breakthroughApplied }
    });
}
export function declareAttack(state, playerId, attackerId, targetId) {
    assertActive(state, playerId);
    assertNoOpenResponse(state);
    if (state.phase !== "BATTLE")
        throw new RulesError("Attacks can only be declared during Battle Phase.");
    const player = state.players[playerId];
    const opponentId = opponentOf(playerId);
    const opponent = state.players[opponentId];
    const attacker = state.cards[attackerId];
    if (!player.employeeField.includes(attackerId))
        throw new RulesError("Attacker is not on your Employee field.");
    if (attacker.onboarding)
        throw new RulesError("Employee is still in Onboarding.");
    if (attacker.cannotAttackUntilTurnNumber === state.turnNumber)
        throw new RulesError("Employee cannot attack this turn.");
    if (attacker.cannotAttackThroughControllerTurnsStarted !== null && state.players[playerId].turnsStarted <= attacker.cannotAttackThroughControllerTurnsStarted)
        throw new RulesError("Employee cannot attack during this Battle Phase.");
    if (attacker.attacksUsed >= attacker.maxAttacks)
        throw new RulesError("Employee has no attacks remaining.");
    const opponentEmployees = opponent.employeeField.filter((id) => Boolean(id));
    if (targetId === null && opponentEmployees.length > 0)
        throw new RulesError("Cannot attack Company Reputation while the opponent controls an Employee.");
    if (targetId !== null && !opponentEmployees.includes(targetId))
        throw new RulesError("Target is not an opposing Employee.");
    attacker.attacksUsed += 1;
    emit(state, "ATTACK_DECLARED", { playerId, cardInstanceId: attackerId, data: { targetId } });
    if (targetId === null) {
        const damage = getCurrentPower(state, attackerId);
        changeReputation(state, opponentId, -damage, "DIRECT_ATTACK");
        applyDirectDamageRiders(state, attackerId, opponentId);
        resolvePendingTriggersImmediately(state);
        return;
    }
    resolveEmployeeBattle(state, playerId, attackerId, targetId);
    resolvePendingTriggersImmediately(state);
}
function recordEmployeeDestroyedByOpponent(state, instanceId, byId) {
    const destroyed = state.cards[instanceId];
    const cause = state.cards[byId];
    if (!destroyed || !cause || destroyed.controllerId === cause.controllerId)
        return;
    state.currentTurnActivity.employeesDestroyedByOpponent[destroyed.controllerId] = (state.currentTurnActivity.employeesDestroyedByOpponent[destroyed.controllerId] ?? 0) + 1;
}
function destroyCardByEffect(state, instanceId, byId, chainItemId) {
    const card = state.cards[instanceId];
    if (!card || (card.zone !== "EMPLOYEE_FIELD" && card.zone !== "SUPPORT_FIELD"))
        return false;
    emit(state, "DESTRUCTION_ATTEMPTED", { playerId: card.controllerId, cardInstanceId: instanceId, data: { byId, cause: "CARD_EFFECT", chainItemId } });
    const destructionSource = state.cards[byId];
    const shieldIndex = card.destructionShields.findIndex((shield) => shield.cause === "CARD_EFFECT" &&
        (shield.expiresAfterChainItemId === undefined || shield.expiresAfterChainItemId === chainItemId) &&
        (!shield.onlyOpponentSource || Boolean(destructionSource && destructionSource.controllerId !== card.controllerId)));
    if (shieldIndex >= 0) {
        const [shield] = card.destructionShields.splice(shieldIndex, 1);
        emit(state, "DESTRUCTION_PREVENTED", { playerId: card.controllerId, cardInstanceId: instanceId, data: { byId, shieldId: shield.id, cause: "CARD_EFFECT" } });
        return false;
    }
    const def = state.definitions[card.definitionId];
    if (def.cardType === "EMPLOYEE") {
        recordEmployeeDestroyedByOpponent(state, instanceId, byId);
        emit(state, "EMPLOYEE_DESTROYED", { cardInstanceId: instanceId, data: { byId, cause: "CARD_EFFECT" } });
    }
    emit(state, "CARD_DESTROYED", { playerId: card.controllerId, cardInstanceId: instanceId, data: { byId, cause: "CARD_EFFECT" } });
    moveToArchive(state, instanceId);
    return true;
}
function destroyEmployee(state, instanceId, byId) {
    recordEmployeeDestroyedByOpponent(state, instanceId, byId);
    emit(state, "EMPLOYEE_DESTROYED", { cardInstanceId: instanceId, data: { byId } });
    moveToArchive(state, instanceId);
}
function moveToArchive(state, instanceId, causeSourceId) {
    const card = state.cards[instanceId];
    const fromZone = card.zone;
    const eligibleSources = triggerSourceSnapshot(state);
    if ((fromZone === "EMPLOYEE_FIELD" || fromZone === "SUPPORT_FIELD") && !eligibleSources.some((entry) => entry.id === instanceId)) {
        eligibleSources.push({ id: instanceId, objectVersion: card.objectVersion });
    }
    const cause = causeSourceId ? state.cards[causeSourceId] : undefined;
    const causeDef = cause ? state.definitions[cause.definitionId] : undefined;
    const archivedControllerId = card.controllerId;
    moveCard(state, instanceId, "ARCHIVE");
    for (const snapshot of eligibleSources)
        if (snapshot.id === instanceId)
            snapshot.objectVersion = card.objectVersion;
    card.faceUp = true;
    card.onboarding = false;
    emit(state, "CARD_ARCHIVED", { playerId: archivedControllerId, cardInstanceId: instanceId, data: { fromZone, causeSourceId } });
    queueTriggerEvent(state, {
        event: "CARD_ARCHIVED",
        playerId: archivedControllerId,
        cardInstanceId: instanceId,
        causeSourceId,
        causeDepartment: causeDef?.department,
        causeTags: causeDef?.tags ?? [],
        archivedFromZone: fromZone,
        causedByControllerId: cause?.controllerId
    }, eligibleSources);
}
function moveToHand(state, instanceId) {
    moveCard(state, instanceId, "HAND");
}
function applyReputationLossReplacements(state, playerId, amount, reason, causeSourceId) {
    if (amount <= 0 || reason !== "CARD_EFFECT" || !causeSourceId)
        return amount;
    const cause = state.cards[causeSourceId];
    if (!cause)
        return amount;
    let remaining = amount;
    for (const source of Object.values(state.cards)) {
        if (remaining <= 0)
            break;
        if ((source.zone !== "EMPLOYEE_FIELD" && source.zone !== "SUPPORT_FIELD") || !source.faceUp || source.controllerId !== playerId)
            continue;
        const def = state.definitions[source.definitionId];
        for (const ability of def.abilities ?? []) {
            if (ability.type !== "REPLACEMENT" || ability.replacement !== "REPUTATION_LOSS" || ability.reason !== "CARD_EFFECT")
                continue;
            if (relativePlayer(source.controllerId, ability.sourceController) !== cause.controllerId)
                continue;
            if (!usageAvailable(state, source.instanceId, ability.id, ability.usageLimit))
                continue;
            const reduced = Math.min(remaining, ability.amount);
            if (reduced <= 0)
                continue;
            remaining -= reduced;
            consumeUsage(state, source.instanceId, ability.id, ability.usageLimit);
            emit(state, "REPUTATION_LOSS_REDUCED", { playerId, cardInstanceId: source.instanceId, data: { amount: reduced, causeSourceId } });
        }
    }
    return remaining;
}
function applyDirectDamageRiders(state, attackerId, opponentId) {
    const attacker = state.cards[attackerId];
    if (!attacker)
        return;
    for (const rider of [...attacker.directDamageRiders]) {
        if (rider.expiresAtTurnNumber < state.turnNumber)
            continue;
        changeReputation(state, opponentId, -rider.amount, "CARD_EFFECT", rider.sourceInstanceId);
        emit(state, "DIRECT_DAMAGE_RIDER", { playerId: attacker.controllerId, cardInstanceId: attackerId, data: { amount: rider.amount, sourceInstanceId: rider.sourceInstanceId } });
    }
}
function changeReputation(state, playerId, delta, reason, causeSourceId) {
    if (delta < 0)
        delta = -applyReputationLossReplacements(state, playerId, -delta, reason, causeSourceId);
    const eligibleSources = reason === "CARD_EFFECT" && delta !== 0 ? triggerSourceSnapshot(state) : [];
    const player = state.players[playerId];
    const before = player.reputation;
    player.reputation = Math.max(0, Math.min(MAX_REPUTATION, player.reputation + delta));
    const actualDelta = player.reputation - before;
    emit(state, "REPUTATION_CHANGED", {
        playerId,
        data: { before, after: player.reputation, delta: actualDelta, reason, causeSourceId }
    });
    if (actualDelta < 0 && reason === "CARD_EFFECT" && causeSourceId) {
        const causeDef = state.definitions[state.cards[causeSourceId].definitionId];
        queueTriggerEvent(state, {
            event: "REPUTATION_LOST",
            playerId,
            causeSourceId,
            causeDepartment: causeDef.department,
            causeTags: causeDef.tags ?? []
        }, eligibleSources);
    }
    if (actualDelta > 0 && reason === "CARD_EFFECT" && causeSourceId) {
        const causeDef = state.definitions[state.cards[causeSourceId].definitionId];
        queueTriggerEvent(state, {
            event: "REPUTATION_RESTORED",
            playerId,
            causeSourceId,
            causeDepartment: causeDef.department,
            causeTags: causeDef.tags ?? []
        }, eligibleSources);
    }
    if (player.reputation === 0)
        endGame(state, opponentOf(playerId), "REPUTATION_ZERO");
}
function endGame(state, winnerId, reason) {
    if (state.status === "ENDED")
        return;
    state.status = "ENDED";
    state.winnerId = winnerId;
    state.reason = reason;
    emit(state, "GAME_ENDED", { playerId: winnerId, data: { reason } });
}
function validateAttackDeclaration(state, playerId, attackerId, targetId) {
    if (state.phase !== "BATTLE")
        throw new RulesError("Attacks can only be declared during Battle Phase.");
    const player = state.players[playerId];
    const opponent = state.players[opponentOf(playerId)];
    const attacker = state.cards[attackerId];
    if (!player.employeeField.includes(attackerId))
        throw new RulesError("Attacker is not on your Employee field.");
    if (attacker.onboarding)
        throw new RulesError("Employee is still in Onboarding.");
    if (attacker.cannotAttackUntilTurnNumber === state.turnNumber)
        throw new RulesError("Employee cannot attack this turn.");
    if (attacker.cannotAttackThroughControllerTurnsStarted !== null && state.players[playerId].turnsStarted <= attacker.cannotAttackThroughControllerTurnsStarted)
        throw new RulesError("Employee cannot attack during this Battle Phase.");
    if (attacker.attacksUsed >= attacker.maxAttacks)
        throw new RulesError("Employee has no attacks remaining.");
    const opposing = opponent.employeeField.filter((id) => Boolean(id));
    if (targetId === null && opposing.length > 0)
        throw new RulesError("Cannot attack Company Reputation while the opponent controls an Employee.");
    if (targetId !== null && !opposing.includes(targetId))
        throw new RulesError("Target is not an opposing Employee.");
}
export function setIncident(state, playerId, instanceId, slot) {
    assertActive(state, playerId);
    assertNoOpenResponse(state);
    if (state.phase !== "MAIN")
        throw new RulesError("Incidents can only be set during Main Phase.");
    const player = state.players[playerId];
    if (slot < 0 || slot >= SUPPORT_SLOTS)
        throw new RulesError("Invalid Support slot.");
    if (player.supportField[slot])
        throw new RulesError("Support slot is occupied.");
    if (!player.hand.includes(instanceId))
        throw new RulesError("Incident must be in hand.");
    const card = state.cards[instanceId];
    assertCardCanBePlayed(state, instanceId);
    const def = state.definitions[card.definitionId];
    if (def.cardType !== "INCIDENT")
        throw new RulesError("Card is not an Incident.");
    const costCalculation = getCardCost(state, playerId, instanceId, "SET");
    payCalculatedCost(state, playerId, costCalculation, instanceId, "SET");
    const cost = costCalculation.finalCost;
    const eligiblePlayTriggers = triggerSourceSnapshot(state);
    moveCard(state, instanceId, "SUPPORT_FIELD", slot);
    card.faceUp = false;
    card.setTurnNumber = state.turnNumber;
    recordCardPlayed(state, playerId, def);
    queueCardPlayedEvent(state, playerId, instanceId, eligiblePlayTriggers, "NORMAL");
    emit(state, "INCIDENT_SET", { playerId, cardInstanceId: instanceId, data: { slot, cost } });
    openPendingTriggerChainAndAutoPassEmpty(state);
}
function addChainItem(state, item, openResponse = true) {
    state.chainSeq += 1;
    const full = {
        ...item,
        id: `CHAIN-${state.chainSeq}`,
        sourceObjectVersion: state.cards[item.sourceInstanceId]?.objectVersion ?? 0,
        targetObjectVersions: snapshotTargetVersions(state, item.targets),
        targetSelectors: structuredClone(item.targetSelectors ?? []),
        delayed: false,
        effectsResolved: false,
        archiveWindowOffered: false,
        resolutionEventEmitted: false
    };
    state.chain.push(full);
    if (openResponse) {
        state.responseWindow = { event: "CHAIN_ITEM_ACTIVATED", actorId: full.controllerId, triggeringChainItemId: full.id };
        state.priorityPlayerId = opponentOf(full.controllerId);
        state.consecutivePasses = 0;
    }
    emit(state, "CHAIN_ITEM_ADDED", { playerId: full.controllerId, cardInstanceId: full.sourceInstanceId, data: { chainItemId: full.id, abilityId: full.abilityId } });
    return full;
}
function openResponseForTopChainItem(state) {
    const top = state.chain[state.chain.length - 1];
    if (!top)
        return false;
    state.responseWindow = { event: "CHAIN_ITEM_ACTIVATED", actorId: top.controllerId, triggeringChainItemId: top.id };
    state.priorityPlayerId = opponentOf(top.controllerId);
    state.consecutivePasses = 0;
    return true;
}
export function playActionInteractive(state, playerId, instanceId, targets = {}) {
    assertActive(state, playerId);
    assertNoOpenResponse(state);
    if (state.phase !== "MAIN")
        throw new RulesError("Actions can only be played during Main Phase.");
    const player = state.players[playerId];
    if (!player.hand.includes(instanceId))
        throw new RulesError("Action must be in hand.");
    const card = state.cards[instanceId];
    assertCardCanBePlayed(state, instanceId);
    const def = state.definitions[card.definitionId];
    if (def.cardType !== "ACTION")
        throw new RulesError("Card is not an Action.");
    const ability = (def.abilities ?? []).find((entry) => entry.type === "ACTIVATED");
    if (!ability || ability.type !== "ACTIVATED")
        throw new RulesError("Action has no activated ability.");
    validateConditions(state, playerId, ability.conditions);
    const resolvedTargets = validateTargets(state, playerId, ability.targets, targets);
    assertActionPlayLimit(state, playerId);
    const costCalculation = getCardCost(state, playerId, instanceId, "PLAY");
    payCalculatedCost(state, playerId, costCalculation, instanceId, "PLAY");
    const cost = costCalculation.finalCost;
    const eligiblePlayTriggers = triggerSourceSnapshot(state);
    moveCard(state, instanceId, "PENDING");
    recordCardPlayed(state, playerId, def);
    queueCardPlayedEvent(state, playerId, instanceId, eligiblePlayTriggers, "NORMAL");
    emit(state, "CARD_PLAYED", { playerId, cardInstanceId: instanceId, data: { cardType: "ACTION", cost, interactive: true } });
    addChainItem(state, {
        sourceInstanceId: instanceId,
        controllerId: playerId,
        abilityId: ability.id,
        effects: ability.effects,
        targets: resolvedTargets,
        targetSelectors: ability.targets ?? [],
        negated: false,
        triggeringChainItemId: null,
        archiveSourceAfterResolve: true
    });
}
export function declareAttackInteractive(state, playerId, attackerId, targetId) {
    assertActive(state, playerId);
    assertNoOpenResponse(state);
    validateAttackDeclaration(state, playerId, attackerId, targetId);
    state.cards[attackerId].attacksUsed += 1;
    state.pendingAttack = { attackerId, targetId, originalTargetId: targetId, controllerId: playerId, cancelled: false };
    state.responseWindow = { event: "ATTACK_DECLARED", actorId: playerId, triggeringChainItemId: null };
    state.priorityPlayerId = opponentOf(playerId);
    state.consecutivePasses = 0;
    emit(state, "ATTACK_DECLARED", { playerId, cardInstanceId: attackerId, data: { targetId, interactive: true } });
}
function triggerMatches(state, playerId, sourceId, ability) {
    const window = state.responseWindow;
    if (!window)
        return false;
    const trigger = ability.trigger;
    if (trigger.event === "ATTACK_DECLARED" && window.event === "ATTACK_DECLARED") {
        if (relativePlayer(playerId, trigger.actor) !== window.actorId)
            return false;
        if (trigger.targetController || trigger.targetFilter || trigger.targetMustNotBeSource) {
            const targetId = state.pendingAttack?.targetId;
            if (!targetId)
                return false;
            const target = state.cards[targetId];
            if (!target)
                return false;
            if (trigger.targetController && target.controllerId !== relativePlayer(playerId, trigger.targetController))
                return false;
            if (trigger.targetFilter && !cardMatchesFilter(state, targetId, trigger.targetFilter))
                return false;
            if (trigger.targetMustNotBeSource && targetId === sourceId)
                return false;
        }
        return true;
    }
    if (trigger.event === "BATTLE_DESTRUCTION_PENDING" && window.event === "BATTLE_DESTRUCTION_PENDING") {
        const candidateIds = window.destructionCandidateIds;
        const expectedController = relativePlayer(playerId, trigger.controller);
        return candidateIds.some((id) => {
            const card = state.cards[id];
            if (!card || card.controllerId !== expectedController)
                return false;
            if (trigger.cardFilter && !cardMatchesFilter(state, id, trigger.cardFilter))
                return false;
            return true;
        });
    }
    if (trigger.event === "BATTLE_EMPLOYEE_DESTROYED" && window.event === "BATTLE_EMPLOYEE_DESTROYED") {
        const candidateIds = window.destroyedIds;
        if (trigger.attackerController && relativePlayer(playerId, trigger.attackerController) !== window.actorId)
            return false;
        return candidateIds.some((id) => {
            const card = state.cards[id];
            if (!card)
                return false;
            if (trigger.destroyedController && card.controllerId !== relativePlayer(playerId, trigger.destroyedController))
                return false;
            if (trigger.destroyedFilter && !cardMatchesFilter(state, id, trigger.destroyedFilter))
                return false;
            return true;
        });
    }
    if (trigger.event === "ACTION_WOULD_BE_ARCHIVED" && window.event === "ACTION_WOULD_BE_ARCHIVED") {
        if (relativePlayer(playerId, trigger.controller) !== window.actorId)
            return false;
        const action = state.cards[window.actionId];
        if (!action)
            return false;
        if (trigger.cardFilter && !cardMatchesFilter(state, action.instanceId, trigger.cardFilter))
            return false;
        return true;
    }
    if (trigger.event === "ACTION_ACTIVATED" && window.event === "CHAIN_ITEM_ACTIVATED") {
        const item = state.chain.find((entry) => entry.id === window.triggeringChainItemId);
        if (!item)
            return false;
        const sourceDef = state.definitions[state.cards[item.sourceInstanceId].definitionId];
        return sourceDef.cardType === "ACTION" && relativePlayer(playerId, trigger.controller) === item.controllerId;
    }
    if (trigger.event === "CHAIN_ITEM_ACTIVATED" && window.event === "CHAIN_ITEM_ACTIVATED") {
        if (relativePlayer(playerId, trigger.controller) !== window.actorId)
            return false;
        const item = state.chain.find((entry) => entry.id === window.triggeringChainItemId);
        if (!item)
            return false;
        if (trigger.targeted && Object.values(item.targets).flat().length === 0)
            return false;
        if (trigger.targetController || trigger.targetFilter || trigger.targetMustNotBeSource) {
            const expectedController = trigger.targetController ? relativePlayer(playerId, trigger.targetController) : null;
            const targetIds = Object.values(item.targets).flat();
            const found = targetIds.some((id) => {
                const card = state.cards[id];
                if (!card)
                    return false;
                if (expectedController && card.controllerId !== expectedController)
                    return false;
                if (trigger.targetFilter && !cardMatchesFilter(state, id, trigger.targetFilter))
                    return false;
                if (trigger.targetMustNotBeSource && id === sourceId)
                    return false;
                return true;
            });
            if (!found)
                return false;
        }
        return true;
    }
    return false;
}
function selectorLegalIds(state, controllerId, selector, context = {}) {
    const ids = selector.controller === "ANY"
        ? [...idsInSelectorZones(state, controllerId, selector.zone), ...idsInSelectorZones(state, opponentOf(controllerId), selector.zone)]
        : idsInSelectorZones(state, relativePlayer(controllerId, selector.controller), selector.zone);
    return [...new Set(ids)].filter((id) => targetMatchesSelectorContext(state, controllerId, selector, id, context));
}
function responseTargetsPotentiallyLegal(state, controllerId, selectors, context = {}) {
    return (selectors ?? []).every((selector) => selectorLegalIds(state, controllerId, selector, context).length >= selector.min);
}
function responseRedirectsPotentiallyLegal(state, sourceId, ability, context) {
    for (const effect of ability.effects) {
        if (effect.type === "REDIRECT_ATTACK_TARGET" && effect.newTarget === "SOURCE") {
            const pending = state.pendingAttack;
            const source = state.cards[sourceId];
            if (!pending || pending.targetId === null || pending.targetId === sourceId || !source || source.zone !== "EMPLOYEE_FIELD" || source.controllerId !== opponentOf(pending.controllerId))
                return false;
        }
        if (effect.type === "REDIRECT_CHAIN_TARGET" && effect.newTarget === "SOURCE") {
            if (!context.triggeringChainItemId)
                return false;
            const item = state.chain.find((entry) => entry.id === context.triggeringChainItemId);
            if (!item)
                return false;
            const targetKey = effect.targetKey === "FIRST_TARGET"
                ? Object.keys(item.targets).find((key) => (item.targets[key]?.length ?? 0) > 0)
                : effect.targetKey;
            if (!targetKey)
                return false;
            const oldTargets = item.targets[targetKey] ?? [];
            if (oldTargets.length !== 1 || oldTargets[0] === sourceId)
                return false;
            const originalSelector = item.targetSelectors.find((entry) => entry.id === targetKey);
            if (!originalSelector || !targetMatchesSelectorContext(state, item.controllerId, originalSelector, sourceId, {
                sourceId: item.sourceInstanceId,
                targets: item.targets,
                targetObjectVersions: item.targetObjectVersions,
                triggeringChainItemId: item.triggeringChainItemId
            }))
                return false;
        }
    }
    return true;
}
export function getAvailableResponses(state, playerId) {
    if (!state.responseWindow || state.priorityPlayerId !== playerId)
        return [];
    const result = [];
    const sources = [
        ...state.players[playerId].supportField.filter((id) => Boolean(id)),
        ...state.players[playerId].employeeField.filter((id) => Boolean(id))
    ];
    for (const id of sources) {
        const card = state.cards[id];
        const def = state.definitions[card.definitionId];
        const isIncident = def.cardType === "INCIDENT";
        if (isIncident) {
            if (card.faceUp || card.setTurnNumber === state.turnNumber)
                continue;
        }
        else if (!card.faceUp || (def.cardType !== "EMPLOYEE" && def.cardType !== "SYSTEM")) {
            continue;
        }
        for (const ability of def.abilities ?? []) {
            if (ability.type !== "TRIGGERED")
                continue;
            if (state.responseWindow.event === "BATTLE_EMPLOYEE_DESTROYED" && !isIncident)
                continue;
            if (state.responseWindow.event === "ACTION_WOULD_BE_ARCHIVED" && !isIncident)
                continue;
            if (!usageAvailable(state, id, ability.id, ability.usageLimit))
                continue;
            if (!triggerMatches(state, playerId, id, ability))
                continue;
            const responseContext = { sourceId: id, triggeringChainItemId: state.responseWindow.triggeringChainItemId };
            if (!evaluateAllConditions(state, playerId, ability.conditions, responseContext))
                continue;
            if (!responseTargetsPotentiallyLegal(state, playerId, ability.targets, responseContext))
                continue;
            if (!responseRedirectsPotentiallyLegal(state, id, ability, responseContext))
                continue;
            result.push({ sourceId: id, abilityId: ability.id, sourceType: isIncident ? "INCIDENT" : "IN_PLAY" });
        }
    }
    return result;
}
export function getAvailableIncidentResponses(state, playerId) {
    return getAvailableResponses(state, playerId)
        .filter((x) => x.sourceType === "INCIDENT")
        .map(({ sourceId, abilityId }) => ({ sourceId, abilityId }));
}
export function activateResponse(state, playerId, sourceId, abilityId, targets = {}) {
    if (state.status !== "ACTIVE")
        throw new RulesError("The match is not active.");
    if (!state.responseWindow || state.priorityPlayerId !== playerId)
        throw new RulesError("You do not have priority to respond.");
    const card = state.cards[sourceId];
    if (!card || card.controllerId !== playerId)
        throw new RulesError("You do not control this response source.");
    const def = state.definitions[card.definitionId];
    const isIncident = def.cardType === "INCIDENT";
    if (isIncident) {
        if (card.zone !== "SUPPORT_FIELD" || card.faceUp)
            throw new RulesError("Incident is not set face-down on your field.");
        if (card.setTurnNumber === state.turnNumber)
            throw new RulesError("Incident cannot be activated in the turn it was set.");
    }
    else {
        if ((card.zone !== "EMPLOYEE_FIELD" && card.zone !== "SUPPORT_FIELD") || !card.faceUp)
            throw new RulesError("Response source is not face-up in play.");
    }
    const ability = (def.abilities ?? []).find((entry) => entry.id === abilityId);
    if (!ability || ability.type !== "TRIGGERED")
        throw new RulesError("Triggered response ability not found.");
    if (!usageAvailable(state, sourceId, ability.id, ability.usageLimit))
        throw new RulesError("Ability usage limit reached for this turn.");
    if (!triggerMatches(state, playerId, sourceId, ability))
        throw new RulesError("Response trigger does not match the current Response Window.");
    const triggeringChainItemId = state.responseWindow.triggeringChainItemId;
    const resolvedTargets = validateTargets(state, playerId, ability.targets, targets, { sourceId, triggeringChainItemId });
    validateConditions(state, playerId, ability.conditions, { sourceId, triggeringChainItemId, targets: resolvedTargets, targetObjectVersions: snapshotTargetVersions(state, resolvedTargets) });
    consumeUsage(state, sourceId, ability.id, ability.usageLimit);
    if (isIncident) {
        state.currentTurnActivity.incidentsActivatedBy[playerId] = (state.currentTurnActivity.incidentsActivatedBy[playerId] ?? 0) + 1;
        moveCard(state, sourceId, "PENDING");
        card.faceUp = true;
        emit(state, "INCIDENT_ACTIVATED", { playerId, cardInstanceId: sourceId, data: { abilityId } });
    }
    else {
        emit(state, "ABILITY_ACTIVATED", { playerId, cardInstanceId: sourceId, data: { abilityId, response: true } });
    }
    addChainItem(state, {
        sourceInstanceId: sourceId,
        controllerId: playerId,
        abilityId,
        effects: ability.effects,
        targets: resolvedTargets,
        targetSelectors: ability.targets ?? [],
        negated: false,
        triggeringChainItemId,
        archiveSourceAfterResolve: isIncident
    });
}
export function activateIncident(state, playerId, sourceId, abilityId, targets = {}) {
    const def = state.definitions[state.cards[sourceId]?.definitionId];
    if (!def || def.cardType !== "INCIDENT")
        throw new RulesError("Card is not an Incident.");
    activateResponse(state, playerId, sourceId, abilityId, targets);
}
export function passPriority(state, playerId) {
    if (!state.responseWindow || !state.priorityPlayerId)
        throw new RulesError("There is no open Response Window.");
    if (state.priorityPlayerId !== playerId)
        throw new RulesError("You do not have priority.");
    state.consecutivePasses += 1;
    emit(state, "PRIORITY_PASSED", { playerId, data: { consecutivePasses: state.consecutivePasses } });
    if (state.consecutivePasses < 2) {
        state.priorityPlayerId = opponentOf(playerId);
        return;
    }
    resolveInteractiveWindow(state);
}
function emitActionResolutionIfNeeded(state, item) {
    if (item.resolutionEventEmitted || item.delayed)
        return;
    const source = state.cards[item.sourceInstanceId];
    if (!source)
        return;
    const sourceDef = state.definitions[source.definitionId];
    if (sourceDef.cardType !== "ACTION")
        return;
    const eligibleResolveTriggers = triggerSourceSnapshot(state);
    emit(state, "ACTION_RESOLVED", { playerId: item.controllerId, cardInstanceId: item.sourceInstanceId, data: { abilityId: item.abilityId, interactive: true, negated: item.negated } });
    queueTriggerEvent(state, { event: "ACTION_RESOLVED", playerId: item.controllerId, cardInstanceId: item.sourceInstanceId }, eligibleResolveTriggers);
    item.resolutionEventEmitted = true;
}
function offerActionArchiveResponse(state, item) {
    if (item.archiveWindowOffered || item.delayed)
        return false;
    const source = state.cards[item.sourceInstanceId];
    if (!source || source.zone !== "PENDING")
        return false;
    const def = state.definitions[source.definitionId];
    if (def.cardType !== "ACTION")
        return false;
    item.archiveWindowOffered = true;
    state.responseWindow = { event: "ACTION_WOULD_BE_ARCHIVED", actorId: item.controllerId, triggeringChainItemId: item.id, actionId: item.sourceInstanceId };
    state.consecutivePasses = 0;
    emit(state, "ACTION_ARCHIVE_PENDING", { playerId: item.controllerId, cardInstanceId: item.sourceInstanceId, data: { chainItemId: item.id } });
    state.priorityPlayerId = item.controllerId;
    if (getAvailableResponses(state, item.controllerId).length > 0)
        return true;
    const other = opponentOf(item.controllerId);
    state.priorityPlayerId = other;
    if (getAvailableResponses(state, other).length > 0)
        return true;
    state.responseWindow = null;
    state.priorityPlayerId = null;
    return false;
}
function resolveInteractiveWindow(state) {
    while (state.chain.length > 0) {
        const item = state.chain[state.chain.length - 1];
        if (!item.effectsResolved) {
            if (!item.negated && !item.delayed) {
                const result = executeEffects(state, {
                    sourceId: item.sourceInstanceId,
                    controllerId: item.controllerId,
                    abilityId: item.abilityId,
                    targets: item.targets,
                    targetObjectVersions: item.targetObjectVersions,
                    triggeringChainItemId: item.triggeringChainItemId,
                    resolvingChainItemId: item.id,
                    triggerEvent: item.triggerEvent ?? null
                }, item.effects);
                if (result === "PAUSED")
                    return;
            }
            item.effectsResolved = true;
        }
        if (item.archiveSourceAfterResolve && !item.delayed) {
            emitActionResolutionIfNeeded(state, item);
            if (state.cards[item.sourceInstanceId]?.zone === "PENDING" && offerActionArchiveResponse(state, item))
                return;
            if (state.cards[item.sourceInstanceId]?.zone === "PENDING")
                moveToArchive(state, item.sourceInstanceId);
        }
        for (const card of Object.values(state.cards))
            card.destructionShields = card.destructionShields.filter((shield) => shield.expiresAfterChainItemId !== item.id);
        state.chain.pop();
    }
    emit(state, "CHAIN_RESOLVED", {});
    state.responseWindow = null;
    state.priorityPlayerId = null;
    state.consecutivePasses = 0;
    if (state.pendingAttack)
        resolvePendingAttack(state);
    if (state.responseWindow)
        return;
    if (state.pendingBattleResolution)
        finalizePendingBattleResolution(state);
    if (state.responseWindow)
        return;
    if (openPendingTriggerChain(state))
        return;
}
function resolvePendingAttack(state) {
    const pending = state.pendingAttack;
    state.pendingAttack = null;
    if (!pending || pending.cancelled)
        return;
    const attacker = state.cards[pending.attackerId];
    if (!attacker || attacker.zone !== "EMPLOYEE_FIELD")
        return;
    const opponentId = opponentOf(pending.controllerId);
    if (pending.targetId === null) {
        if (state.players[opponentId].employeeField.some(Boolean))
            return;
        changeReputation(state, opponentId, -getCurrentPower(state, pending.attackerId), "DIRECT_ATTACK");
        applyDirectDamageRiders(state, pending.attackerId, opponentId);
        return;
    }
    const target = state.cards[pending.targetId];
    if (!target || target.zone !== "EMPLOYEE_FIELD" || target.controllerId !== opponentId)
        return;
    beginPendingBattleResolution(state, pending.controllerId, pending.attackerId, pending.targetId);
}
function beginPendingBattleResolution(state, controllerId, attackerId, targetId) {
    const attacker = state.cards[attackerId];
    const target = state.cards[targetId];
    if (!attacker || !target || attacker.zone !== "EMPLOYEE_FIELD" || target.zone !== "EMPLOYEE_FIELD")
        return;
    const attackerPower = getCurrentPower(state, attackerId);
    const defenderPower = getCurrentPower(state, targetId);
    const destructionCandidateIds = attackerPower > defenderPower
        ? [targetId]
        : attackerPower < defenderPower
            ? [attackerId]
            : [targetId, attackerId];
    const winnerId = attackerPower > defenderPower ? attackerId : attackerPower < defenderPower ? targetId : null;
    state.pendingBattleResolution = {
        attackerId,
        targetId,
        controllerId,
        attackerPower,
        defenderPower,
        attackerObjectVersion: attacker.objectVersion,
        targetObjectVersion: target.objectVersion,
        destructionCandidateIds,
        winnerId,
        excessPower: Math.max(0, attackerPower - defenderPower)
    };
    emit(state, "BATTLE_DESTRUCTION_PENDING", {
        playerId: controllerId,
        cardInstanceId: attackerId,
        data: { attackerId, targetId, attackerPower, defenderPower, destructionCandidateIds }
    });
    state.responseWindow = { event: "BATTLE_DESTRUCTION_PENDING", actorId: controllerId, triggeringChainItemId: null, destructionCandidateIds: [...destructionCandidateIds] };
    state.consecutivePasses = 0;
    const preferred = state.cards[destructionCandidateIds[0]]?.controllerId ?? opponentOf(controllerId);
    state.priorityPlayerId = preferred;
    if (getAvailableResponses(state, preferred).length > 0)
        return;
    const other = opponentOf(preferred);
    state.priorityPlayerId = other;
    if (getAvailableResponses(state, other).length > 0)
        return;
    state.responseWindow = null;
    state.priorityPlayerId = null;
    finalizePendingBattleResolution(state);
}
function finalizePendingBattleResolution(state) {
    const pending = state.pendingBattleResolution;
    state.pendingBattleResolution = null;
    if (!pending)
        return;
    const eligibleSources = triggerSourceSnapshot(state);
    const actualDestroyedIds = [];
    let breakthroughApplied = false;
    const attacker = state.cards[pending.attackerId];
    const defender = state.cards[pending.targetId];
    const attackerSame = Boolean(attacker && attacker.zone === "EMPLOYEE_FIELD" && attacker.objectVersion === pending.attackerObjectVersion);
    const defenderSame = Boolean(defender && defender.zone === "EMPLOYEE_FIELD" && defender.objectVersion === pending.targetObjectVersion);
    if (pending.destructionCandidateIds.includes(pending.targetId) && defenderSame) {
        destroyEmployee(state, pending.targetId, pending.attackerId);
        actualDestroyedIds.push(pending.targetId);
    }
    if (pending.destructionCandidateIds.includes(pending.attackerId) && attackerSame) {
        destroyEmployee(state, pending.attackerId, pending.targetId);
        actualDestroyedIds.push(pending.attackerId);
    }
    const defenderActuallyDestroyed = actualDestroyedIds.includes(pending.targetId);
    const attackerStillPresent = Boolean(state.cards[pending.attackerId]?.zone === "EMPLOYEE_FIELD");
    if (pending.attackerPower > pending.defenderPower && defenderActuallyDestroyed && attackerStillPresent) {
        if (pending.excessPower > 0 && hasKeyword(state, pending.attackerId, "BREAKTHROUGH")) {
            breakthroughApplied = true;
            const opponentId = opponentOf(pending.controllerId);
            changeReputation(state, opponentId, -pending.excessPower, "BREAKTHROUGH");
            emit(state, "BREAKTHROUGH_DAMAGE", { playerId: pending.controllerId, cardInstanceId: pending.attackerId, data: { targetId: pending.targetId, excessPower: pending.excessPower } });
        }
        queueTriggerEvent(state, {
            event: "BATTLE_EMPLOYEE_DESTROYED",
            actorId: pending.controllerId,
            attackerId: pending.attackerId,
            defenderId: pending.targetId,
            attackerPower: pending.attackerPower,
            defenderPower: pending.defenderPower,
            battleExcessPower: pending.excessPower,
            breakthroughApplied
        }, eligibleSources);
    }
    emit(state, "BATTLE_RESOLVED", {
        playerId: pending.controllerId,
        cardInstanceId: pending.attackerId,
        data: {
            attackerId: pending.attackerId,
            targetId: pending.targetId,
            attackerPower: pending.attackerPower,
            defenderPower: pending.defenderPower,
            winnerId: pending.winnerId,
            destructionCandidateIds: pending.destructionCandidateIds,
            destroyedIds: actualDestroyedIds,
            replacedOrPreventedIds: pending.destructionCandidateIds.filter((id) => !actualDestroyedIds.includes(id)),
            excessPower: pending.excessPower,
            breakthroughApplied
        }
    });
    if (actualDestroyedIds.length > 0) {
        state.responseWindow = { event: "BATTLE_EMPLOYEE_DESTROYED", actorId: pending.controllerId, triggeringChainItemId: null, destroyedIds: [...actualDestroyedIds] };
        state.consecutivePasses = 0;
        const preferred = state.cards[actualDestroyedIds[0]]?.controllerId ?? pending.controllerId;
        state.priorityPlayerId = preferred;
        if (getAvailableResponses(state, preferred).length > 0)
            return;
        const other = opponentOf(preferred);
        state.priorityPlayerId = other;
        if (getAvailableResponses(state, other).length > 0)
            return;
        state.responseWindow = null;
        state.priorityPlayerId = null;
    }
}
function legalTargetChoices(state, controllerId, selectors, context = {}) {
    return (selectors ?? []).map((selector) => ({
        selectorId: selector.id,
        min: selector.min,
        max: selector.max,
        candidateIds: selectorLegalIds(state, controllerId, selector, context)
    }));
}
function choosePromotionMaterialSets(state, ids, requiredValue) {
    const result = [];
    const totalMasks = 1 << ids.length;
    for (let mask = 1; mask < totalMasks; mask += 1) {
        const picked = ids.filter((_, index) => (mask & (1 << index)) !== 0);
        const value = picked.reduce((sum, id) => sum + promotionValue(state, id), 0);
        if (value < requiredValue)
            continue;
        const hasRedundantMaterial = picked.some((dropId) => picked.filter((id) => id !== dropId).reduce((sum, id) => sum + promotionValue(state, id), 0) >= requiredValue);
        if (!hasRedundantMaterial)
            result.push(picked);
    }
    return result;
}
function chooseCombinations(ids, count) {
    if (count === 0)
        return [[]];
    if (count < 0 || count > ids.length)
        return [];
    const result = [];
    const visit = (start, picked) => {
        if (picked.length === count) {
            result.push([...picked]);
            return;
        }
        for (let i = start; i <= ids.length - (count - picked.length); i += 1) {
            picked.push(ids[i]);
            visit(i + 1, picked);
            picked.pop();
        }
    };
    visit(0, []);
    return result;
}
export function getLegalActions(state, playerId) {
    const empty = {
        canMulligan: false,
        mulliganCardIds: [],
        archiveExcessHandIds: [],
        canAdvancePhase: false,
        canPassPriority: false,
        canResolveChoice: false,
        canResolveDeckSelection: false,
        canResolveTriggerTargetSelection: false,
        canResolveHandSelection: false,
        responseOptions: [],
        playableEmployees: [],
        playableActions: [],
        playableSystems: [],
        settableIncidents: [],
        activatableAbilities: [],
        attacks: []
    };
    if (state.phase === "MULLIGAN" && state.status === "SETUP") {
        const player = state.players[playerId];
        if (!player.mulliganDone) {
            return { ...empty, canMulligan: true, mulliganCardIds: [...player.hand] };
        }
        return empty;
    }
    if (state.status !== "ACTIVE")
        return empty;
    if (state.pendingChoice) {
        return {
            ...empty,
            canResolveChoice: state.pendingChoice.playerId === playerId
        };
    }
    if (state.pendingDeckSelection) {
        return {
            ...empty,
            canResolveDeckSelection: state.pendingDeckSelection.playerId === playerId
        };
    }
    if (state.pendingTriggerTargetSelection) {
        return {
            ...empty,
            canResolveTriggerTargetSelection: state.pendingTriggerTargetSelection.playerId === playerId
        };
    }
    if (state.pendingHandSelection) {
        return {
            ...empty,
            canResolveHandSelection: state.pendingHandSelection.playerId === playerId
        };
    }
    if (state.responseWindow) {
        if (state.priorityPlayerId !== playerId)
            return empty;
        return {
            ...empty,
            canPassPriority: true,
            responseOptions: getAvailableResponses(state, playerId).map((option) => {
                const def = state.definitions[state.cards[option.sourceId].definitionId];
                const ability = (def.abilities ?? []).find((entry) => entry.id === option.abilityId);
                return {
                    ...option,
                    targetChoices: ability && ability.type === "TRIGGERED" ? legalTargetChoices(state, playerId, ability.targets, { sourceId: option.sourceId, triggeringChainItemId: state.responseWindow?.triggeringChainItemId ?? null }) : []
                };
            })
        };
    }
    if (state.activePlayerId !== playerId)
        return empty;
    const player = state.players[playerId];
    const canAdvancePhase = state.phase !== "MULLIGAN" && !(state.phase === "END" && player.hand.length > HAND_LIMIT);
    const result = {
        ...empty,
        canAdvancePhase,
        archiveExcessHandIds: state.phase === "END" && player.hand.length > HAND_LIMIT ? [...player.hand] : []
    };
    if (state.phase === "MAIN") {
        const emptyEmployeeSlots = player.employeeField
            .map((id, slot) => id === null ? slot : -1)
            .filter((slot) => slot >= 0);
        const emptySupportSlots = player.supportField
            .map((id, slot) => id === null ? slot : -1)
            .filter((slot) => slot >= 0);
        for (const id of player.hand) {
            const runtimeCard = state.cards[id];
            if (runtimeCard.cannotPlayUntilTurnNumber !== null && runtimeCard.cannotPlayUntilTurnNumber >= state.turnNumber)
                continue;
            const def = state.definitions[runtimeCard.definitionId];
            if (def.cardType === "EMPLOYEE") {
                if (getCardCost(state, playerId, id, "PLAY").finalCost > player.availableCapacity)
                    continue;
                const promotion = def.promotion;
                if (!promotion) {
                    const options = emptyEmployeeSlots.map((slot) => ({ slot, promotionMaterialIds: [] }));
                    if (options.length > 0)
                        result.playableEmployees.push({ cardId: id, options });
                    continue;
                }
                const eligibleMaterials = player.employeeField
                    .filter((fieldId) => Boolean(fieldId))
                    .filter((fieldId) => cardMatchesFilter(state, fieldId, { cardType: "EMPLOYEE", ...promotion.materials }));
                const materialSets = choosePromotionMaterialSets(state, eligibleMaterials, effectivePromotionRequired(state, playerId, def));
                const options = [];
                for (const materials of materialSets) {
                    const freedSlots = materials.map((materialId) => state.cards[materialId].slot).filter((slot) => slot !== null);
                    const legalSlots = [...new Set([...emptyEmployeeSlots, ...freedSlots])].sort((a, b) => a - b);
                    for (const slot of legalSlots)
                        options.push({ slot, promotionMaterialIds: [...materials] });
                }
                if (options.length > 0)
                    result.playableEmployees.push({ cardId: id, options });
            }
            else if (def.cardType === "ACTION") {
                const actionLimit = getActionPlayLimit(state, playerId);
                if (actionLimit !== null && player.turnCounters.actionsPlayedTotal >= actionLimit)
                    continue;
                const ability = (def.abilities ?? []).find((x) => x.type === "ACTIVATED");
                if (!ability || ability.type !== "ACTIVATED")
                    continue;
                if (getCardCost(state, playerId, id, "PLAY").finalCost > player.availableCapacity)
                    continue;
                if (!evaluateAllConditions(state, playerId, ability.conditions, { sourceId: id }))
                    continue;
                if (!responseTargetsPotentiallyLegal(state, playerId, ability.targets))
                    continue;
                result.playableActions.push({ cardId: id, targetChoices: legalTargetChoices(state, playerId, ability.targets) });
            }
            else if (def.cardType === "SYSTEM") {
                if (emptySupportSlots.length > 0 && getCardCost(state, playerId, id, "PLAY").finalCost <= player.availableCapacity) {
                    result.playableSystems.push({ cardId: id, slots: [...emptySupportSlots] });
                }
            }
            else if (def.cardType === "INCIDENT") {
                if (emptySupportSlots.length > 0 && getCardCost(state, playerId, id, "SET").finalCost <= player.availableCapacity) {
                    result.settableIncidents.push({ cardId: id, slots: [...emptySupportSlots] });
                }
            }
        }
        const inPlay = [...player.employeeField, ...player.supportField].filter((id) => Boolean(id));
        for (const id of inPlay) {
            const card = state.cards[id];
            if (!card.faceUp)
                continue;
            const def = state.definitions[card.definitionId];
            for (const ability of def.abilities ?? []) {
                if (ability.type !== "ACTIVATED" || ability.timing !== "OWN_MAIN_PHASE")
                    continue;
                if (!usageAvailable(state, id, ability.id, ability.usageLimit))
                    continue;
                if (!evaluateAllConditions(state, playerId, ability.conditions, { sourceId: id }))
                    continue;
                if (!responseTargetsPotentiallyLegal(state, playerId, ability.targets))
                    continue;
                result.activatableAbilities.push({
                    sourceId: id,
                    abilityId: ability.id,
                    targetChoices: legalTargetChoices(state, playerId, ability.targets)
                });
            }
        }
    }
    if (state.phase === "BATTLE") {
        const opposing = state.players[opponentOf(playerId)].employeeField.filter((id) => Boolean(id));
        for (const id of player.employeeField) {
            if (!id)
                continue;
            const card = state.cards[id];
            if (card.onboarding || card.attacksUsed >= card.maxAttacks)
                continue;
            result.attacks.push({ attackerId: id, targetIds: opposing.length > 0 ? [...opposing] : [null] });
        }
    }
    return result;
}
export function getCardName(state, instanceId) {
    return state.definitions[state.cards[instanceId].definitionId].name;
}
export function findInHandByDefinition(state, playerId, definitionId) {
    return state.players[playerId].hand.find((id) => state.cards[id].definitionId === definitionId);
}
export function activateAbilityInteractive(state, playerId, sourceId, abilityId, targets = {}) {
    assertActive(state, playerId);
    assertNoOpenResponse(state);
    const source = state.cards[sourceId];
    if (!source)
        throw new RulesError("Unknown source card.");
    if (source.controllerId !== playerId)
        throw new RulesError("You do not control this card.");
    if (source.zone !== "EMPLOYEE_FIELD" && source.zone !== "SUPPORT_FIELD")
        throw new RulesError("Ability source is not in play.");
    if (!source.faceUp)
        throw new RulesError("Ability source must be face-up.");
    const def = state.definitions[source.definitionId];
    const ability = (def.abilities ?? []).find((entry) => entry.id === abilityId);
    if (!ability || ability.type !== "ACTIVATED")
        throw new RulesError("Activated ability not found.");
    if (ability.timing === "OWN_MAIN_PHASE" && (state.activePlayerId !== playerId || state.phase !== "MAIN")) {
        throw new RulesError("Ability can only be activated during your Main Phase.");
    }
    if (!usageAvailable(state, sourceId, ability.id, ability.usageLimit))
        throw new RulesError("Ability usage limit reached for this turn.");
    const resolvedTargets = validateTargets(state, playerId, ability.targets, targets);
    validateConditions(state, playerId, ability.conditions, {
        sourceId,
        targets: resolvedTargets,
        targetObjectVersions: snapshotTargetVersions(state, resolvedTargets)
    });
    consumeUsage(state, sourceId, ability.id, ability.usageLimit);
    emit(state, "ABILITY_ACTIVATED", { playerId, cardInstanceId: sourceId, data: { abilityId, interactive: true } });
    addChainItem(state, {
        sourceInstanceId: sourceId,
        controllerId: playerId,
        abilityId,
        effects: ability.effects,
        targets: resolvedTargets,
        targetSelectors: ability.targets ?? [],
        negated: false,
        triggeringChainItemId: null,
        archiveSourceAfterResolve: false
    });
}
export function resign(state, playerId, reason = "RESIGN") {
    if (state.status === "ENDED")
        throw new RulesError("The match has already ended.");
    endGame(state, opponentOf(playerId), reason);
}
