import { strict as assert } from "node:assert";
import { alphaDefinitions } from "../src/cards.js";
import { alphaDeckPresets } from "../src/decks.js";
import { ALPHA_FORMAT } from "../src/formats.js";
import { PlayerProfileService, type GuestCredentialStoreSnapshot, type PlayerDataStoreSnapshot } from "../src/profile.js";

let passed = 0;
function test(name:string, fn:()=>void):void { fn(); passed += 1; console.log(`✓ ${name}`); }

const service = new PlayerProfileService({
  idFactory:() => "deck-owner",
  tokenFactory:() => "deck-token",
  nowFactory:(() => { let now = 1000; return () => ++now; })(),
  starterCards:alphaDeckPresets["customer-service-starter"].cards,
  deckDefinitions:alphaDefinitions,
  deckFormat:ALPHA_FORMAT,
  builtInDeckIds:["customer-service-starter"]
});
const created = service.create();
const starterCards = alphaDeckPresets["customer-service-starter"].cards;

test("v7.69.29 creates and persists a player deck with a stable id", () => {
  const profile = service.createDeck(created.profileToken, { id:"deck-alpha", name:"Alpha Build", cards:starterCards });
  assert.equal(profile.decks[0].id, "deck-alpha");
  assert.equal(service.get(created.profileToken).decks[0].name, "Alpha Build");
});

test("v7.69.29 selected deck persists and stale revisions are rejected", () => {
  service.setSelectedDeck(created.profileToken, "customer-service-starter");
  assert.equal(service.get(created.profileToken).selectedDeckId, "customer-service-starter");
  service.selectDeck(created.profileToken, "deck-alpha");
  assert.equal(service.get(created.profileToken).selectedDeckId, "deck-alpha");
  service.updateDeck(created.profileToken, "deck-alpha", { name:"Renamed", cards:starterCards }, 1);
  assert.throws(() => service.updateDeck(created.profileToken, "deck-alpha", { name:"Stale", cards:starterCards }, 1), /DECK_CONFLICT/);
});

test("v7.69.29 restores saved decks from the existing profile stores", () => {
  let players: PlayerDataStoreSnapshot | null = null;
  let credentials: GuestCredentialStoreSnapshot | null = null;
  const stores = {
    playerPersistence:{ storageLabel:"TEST_PLAYERS", load:() => players, save:(snapshot:PlayerDataStoreSnapshot) => { players = structuredClone(snapshot); } },
    credentialPersistence:{ storageLabel:"TEST_CREDENTIALS", load:() => credentials, save:(snapshot:GuestCredentialStoreSnapshot) => { credentials = structuredClone(snapshot); } }
  };
  const first = new PlayerProfileService({ ...stores, idFactory:() => "persisted-player", tokenFactory:() => "persisted-token", starterCards, deckDefinitions:alphaDefinitions, deckFormat:ALPHA_FORMAT });
  const account = first.create();
  first.createDeck(account.profileToken, { id:"persisted-deck", name:"Across Devices", cards:starterCards });
  const restarted = new PlayerProfileService({ ...stores, idFactory:() => "unused", tokenFactory:() => "unused", deckDefinitions:alphaDefinitions, deckFormat:ALPHA_FORMAT });
  assert.equal(restarted.get(account.profileToken).decks[0].id, "persisted-deck");
});

test("v7.69.29 keeps valid-format missing-card decks visible but unusable", () => {
  const profile = service.createDeck(created.profileToken, { id:"deck-missing", name:"Needs Cards", cards:alphaDeckPresets["it-starter"].cards });
  const view = service.listDecks(created.profileToken).decks.find((deck) => deck.id === profile.decks.find((deck) => deck.id === "deck-missing")?.id);
  assert.equal(view?.validation.state, "INVALID_MISSING_CARDS");
  assert.throws(() => service.selectDeck(created.profileToken, "deck-missing"), /DECK_NOT_VALID/);
});

test("v7.69.29 imports browser decks idempotently without collapsing same-name variants", () => {
  const result = service.importDecks(created.profileToken, [
    { id:"local-one", name:"Same Name", cards:starterCards },
    { id:"local-two", name:"Same Name", cards:alphaDeckPresets["it-starter"].cards }
  ]);
  assert.equal(result.imported.length, 2);
  const repeated = service.importDecks(created.profileToken, [
    { id:"local-one", name:"Same Name", cards:starterCards },
    { id:"local-two", name:"Same Name", cards:alphaDeckPresets["it-starter"].cards }
  ]);
  assert.equal(repeated.imported.length, 0);
  assert.equal(service.get(created.profileToken).decks.filter((deck) => deck.name === "Same Name").length, 2);
});

test("v7.69.29 deck ownership is isolated between profiles", () => {
  const other = new PlayerProfileService({ idFactory:() => "other-owner", tokenFactory:() => "other-token", starterCards:[], deckDefinitions:alphaDefinitions, deckFormat:ALPHA_FORMAT }).create();
  assert.equal(other.profile.decks.length, 0);
  assert.throws(() => service.get(other.profileToken), /INVALID_PROFILE_TOKEN/);
});

test("v7.69.29 malformed and over-limit deck input is rejected", () => {
  assert.throws(() => service.createDeck(created.profileToken, { name:"Bad", cards:[{ definitionId:"NOPE", copies:1 }] }), /DECK_UNKNOWN_CARD/);
  assert.throws(() => service.createDeck(created.profileToken, { name:"Too Many", cards:[{ definitionId:"CS-001", copies:ALPHA_FORMAT.defaultCopyLimit + 1 }] }), /DECK_COPY_LIMIT/);
});

service.deleteDeck(created.profileToken, "deck-missing");
assert.equal(service.get(created.profileToken).decks.some((deck) => deck.id === "deck-missing"), false);
console.log(`\n${passed}/7 v7.69.29 deck persistence tests passed.`);
