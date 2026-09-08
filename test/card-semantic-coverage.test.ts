import { strict as assert } from 'node:assert';
import { createMatch, getLegalActions } from '../src/engine.js';
import { alphaDefinitions } from '../src/cards.js';
import { alphaDeckPresets } from '../src/decks.js';

const ids = ['CS-019','IT-005','IT-007','IT-008','IT-016','OFC-002','OFC-010','OFC-011','OFC-012','OFC-013','OFC-014','OFC-015','MKT-002','MKT-006','MKT-014','PRD-003','PRD-005','PRD-010'];
for (const id of ids) {
  const definition = alphaDefinitions[id];
  assert.ok(definition, `${id} definition missing`);
  assert.ok(definition.rulesText, `${id} has no rules text`);
  const state = createMatch({ matchId:`coverage-${id}`, seed:76977, firstPlayerId:'P1', definitions:alphaDefinitions,
    p1Deck: [{ definitionId:id, copies:1 }, ...alphaDeckPresets['it-starter'].cards], p2Deck:alphaDeckPresets['it-starter'].cards,
    qaSetup:{ forceOpeningDefinitionIds:[id] } });
  state.status = 'ACTIVE'; state.phase = 'MAIN'; state.turnNumber = 1;
  const handId = state.players.P1.hand.find(cardId => state.cards[cardId].definitionId === id);
  assert.ok(handId, `${id} was not dealt into the semantic fixture`);
  const legal = getLegalActions(state, 'P1');
  assert.ok(handId && legal.handEligibility?.[handId], `${id} has no eligibility projection`);
}
console.log(`Card semantic coverage: ${ids.length} cards exercised`);
