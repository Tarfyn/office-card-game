import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { alphaDefinitions } from "../src/cards.js";
import { applyRewardGrant, collectionPlayableCapacity, createPlayerMetaProfile, starterOnboardingRequired } from "../src/economy.js";
import { cosmeticIsOwned, normalizePlayerCosmetics } from "../src/cosmetics.js";
import { PlayerProfileService } from "../src/profile.js";
import { ALPHA_FORMAT } from "../src/formats.js";
import { alphaDeckPresets } from "../src/decks.js";
import { buildStarterPackagePlan, createPendingAccountMeta, isTrainingLoanerDeck, normalizeStarterDepartment, STARTER_BOOSTER_CONFIG, STARTER_DEPARTMENT_CONFIG, trainingLoanerAllowed, trainingLoanerIds } from "../src/starter-access.js";
import { validatePlayerDeck } from "../src/player-decks.js";

const definitions = Object.values(alphaDefinitions);

for (const config of Object.values(STARTER_DEPARTMENT_CONFIG)) {
  assert.equal(config.coreCards.reduce((sum, entry) => sum + entry.copies, 0), 10, `${config.id} core must contain 10 cards`);
  for (const entry of config.coreCards) assert.ok(alphaDefinitions[entry.definitionId], `${config.id} references an unknown core card ${entry.definitionId}`);
  if (config.trainingDeckId && !config.testOnly) assert.ok(alphaDeckPresets[config.trainingDeckId], `${config.id} training deck must exist`);
}
assert.equal(trainingLoanerIds().length, 5);
assert.equal(trainingLoanerIds(true).includes("accounting-test-loaner"), true, "test-only departments may extend the loaner registry without entering production");
for (const loanerId of trainingLoanerIds()) {
  assert.equal(alphaDeckPresets[loanerId]?.trainingLoaner, true, `${loanerId} must be marked as a Training loaner preset`);
  assert.equal(validatePlayerDeck(alphaDeckPresets[loanerId], alphaDefinitions, ALPHA_FORMAT).state, "VALID");
}
const serverSource = readFileSync(fileURLToPath(new URL("../../server/server.mjs", import.meta.url)), "utf8");
const appSource = readFileSync(fileURLToPath(new URL("../../public/app.js", import.meta.url)), "utf8");
const stylesSource = readFileSync(fileURLToPath(new URL("../../public/styles.css", import.meta.url)), "utf8");
assert.match(serverSource, /!trainingMode[\s\S]*isTrainingLoanerDeck\(selection\)[\s\S]*Training loaner decks are only available in Training/);
assert.match(serverSource, /validateOwnedDeck\(profile, deckSelection, mode\)/);
assert.match(serverSource, /function projectAccountProfile\(profile\)/);
assert.match(serverSource, /starterOnboardingRequired\(profile\)/);
assert.match(appSource, /function starterOnboardingErrorMessage\(error\)/);
assert.match(appSource, /status === 'PENDING' \|\| status === 'IN_PROGRESS'/);
assert.match(appSource, /await reconcileStarterOnboardingAfterError\(\)/);
assert.doesNotMatch(appSource, /state\.starterOnboardingMessage = error\.message/);
assert.match(appSource, /function pvpDeckStatus[\s\S]*summary\.trainingLoaner[\s\S]*summary\.ownedReady === false/);
assert.match(appSource, /if \(!pvpStatus\.valid\) throw new Error\(pvpStatus\.message\)/);
assert.match(appSource, /training\.loanerExplanation/);
assert.match(appSource, /ALPHA ACCESS · NOT OWNED','ALPHA-ZUGANG · NICHT IM BESITZ/);
assert.match(appSource, /starterOnboardingCompleteNotice = true/);
assert.match(appSource, /starter-complete-next[\s\S]*starterAccess\.complete\.next/);
assert.match(appSource, /achievementTotal = achievementItems\.length \|\| achievements\.length/);
assert.match(appSource, /function scrollActiveSurfaceToTop\(\)[\s\S]*window\.scrollTo\(0,0\)/);
assert.match(appSource, /async function enterPlayerFile[\s\S]*render\(\);[\s\S]*scrollActiveSurfaceToTop\(\)/);
assert.doesNotMatch(appSource, /COPYIES/);
assert.match(stylesSource, /--text-on-dark:#f1eadc/);
assert.match(stylesSource, /\.account-strip #logoutAccount[^{]*\{[^}]*color:var\(--text-on-dark\)/);
assert.match(stylesSource, /body\.collection-mode \.collection-toolbar,[\s\S]*color:var\(--text-on-dark\)/);
assert.match(stylesSource, /\.desktop-match-utility-panel \.match-feed-heading strong \{ color:var\(--text-on-dark\)/);
assert.match(stylesSource, /\.desk-agenda-sheet \.bot-match-controls\{grid-column:2/);
assert.match(stylesSource, /\.desk-agenda-sheet \.bot-match-controls>div small\{color:var\(--text-on-dark-muted\)/);
const departmentHandler = appSource.match(/async function completeStarterOnboarding[\s\S]*?async function advanceStarterBooster/)?.[0] ?? "";
assert.ok(departmentHandler, "department onboarding handler should remain discoverable");
assert.doesNotMatch(departmentHandler, /await syncServerDecks\(\)/);

for (const department of ["CUSTOMER_SERVICE", "IT", "OFFICE", "MARKETING", "PRODUCTION"]) {
  const plan = buildStarterPackagePlan(department, definitions, ALPHA_FORMAT, "account-1", 100);
  assert.equal(plan.department, department);
  assert.equal(plan.grants.length, 2 + STARTER_BOOSTER_CONFIG.boosterCount);
  assert.equal(plan.grants.find((grant) => grant.sourceRef?.endsWith(":department-core"))?.cards.reduce((sum, item) => sum + item.quantity, 0), 10);
  assert.equal(plan.grants.find((grant) => grant.sourceRef?.endsWith(":neutral-core"))?.cards.reduce((sum, item) => sum + item.quantity, 0), 10);
  assert.equal(plan.grants.filter((grant) => grant.sourceRef?.includes(":booster:")).length, 8);
  assert.equal(plan.cardsGranted, 60, `${department} should receive the deterministic v1 package`);
  assert.equal(plan.firstDayDeck.reduce((sum, entry) => sum + entry.copies, 0), ALPHA_FORMAT.deckSize);
  assert.equal(validatePlayerDeck({ cards:plan.firstDayDeck }, alphaDefinitions, ALPHA_FORMAT).state, "VALID");
}

const unconstrainedSafetyPlan = buildStarterPackagePlan("IT", definitions, ALPHA_FORMAT, "safety-fixture", 100);
let unconstrainedSafetyProfile = createPlayerMetaProfile([]);
for (const reward of unconstrainedSafetyPlan.grants) unconstrainedSafetyProfile = applyRewardGrant(unconstrainedSafetyProfile, reward, 100).profile;
const ownedSafetyIds = Object.entries(unconstrainedSafetyProfile.ownedCards).filter(([, copies]) => Number(copies) > 0).map(([id]) => id);
assert.ok(ownedSafetyIds.length >= 39, "safety fixture needs enough real card identities to constrain capacity");
const spareSafetyId = ownedSafetyIds.find((id) => Number(unconstrainedSafetyProfile.ownedCards[id]) === 1);
assert.ok(spareSafetyId, "safety fixture needs one singly owned card with one legal copy of room");
const spareSafetyCardId = spareSafetyId as string;
const constrainedLimits = Object.fromEntries(definitions.map((card) => [card.id, 0]));
for (const id of ownedSafetyIds.filter((item) => item !== spareSafetyCardId).slice(0, 38)) constrainedLimits[id] = 1;
constrainedLimits[spareSafetyCardId] = 2;
const constrainedFormat = { ...ALPHA_FORMAT, cardLimits:constrainedLimits };
const safetyPlan = buildStarterPackagePlan("IT", definitions, constrainedFormat, "safety-fixture", 100);
const safetyGrants = safetyPlan.grants.filter((grant) => grant.sourceRef?.endsWith(":safety"));
assert.equal(safetyGrants.length, 1, "constrained capacity should add one Safety Grant");
assert.equal(safetyGrants[0].cards.reduce((sum, item) => sum + item.quantity, 0), 1, "Safety Grant should add only the missing copy");
let safetyProfile = createPlayerMetaProfile([]);
for (const reward of safetyPlan.grants) safetyProfile = applyRewardGrant(safetyProfile, reward, 100).profile;
assert.equal(safetyPlan.cardsGranted, 61);
assert.equal(collectionPlayableCapacity(safetyProfile, { deckSize:constrainedFormat.deckSize, defaultCopyLimit:constrainedFormat.defaultCopyLimit, cardLimits:constrainedFormat.cardLimits, legalDefinitionIds:definitions.map((card) => card.id) }), constrainedFormat.deckSize);
assert.equal(safetyPlan.firstDayDeck.reduce((sum, entry) => sum + entry.copies, 0), constrainedFormat.deckSize);
assert.equal(validatePlayerDeck({ cards:safetyPlan.firstDayDeck }, alphaDefinitions, constrainedFormat).state, "VALID");
const safetyReplay = applyRewardGrant(safetyProfile, safetyGrants[0], 101).profile;
assert.deepEqual(safetyReplay.ownedCards, safetyProfile.ownedCards, "Safety Grant sourceRef must be idempotent");

assert.equal(normalizeStarterDepartment("accounting_test"), null, "test-only departments must stay out of production selectors");
assert.ok(normalizeStarterDepartment("accounting_test", true));
const accountingPlan = buildStarterPackagePlan("ACCOUNTING_TEST", definitions, ALPHA_FORMAT, "accounting-fixture", 100, true);
assert.equal(accountingPlan.cardsGranted, 60);
assert.equal(validatePlayerDeck({ cards:accountingPlan.firstDayDeck }, alphaDefinitions, ALPHA_FORMAT).state, "VALID");
assert.equal(isTrainingLoanerDeck("customer-service-starter"), true);
assert.equal(isTrainingLoanerDeck("custom-deck"), false);
assert.equal(trainingLoanerAllowed("TRAINING", "it-starter"), true);
assert.equal(trainingLoanerAllowed("FRIENDLY", "it-starter"), false);
assert.equal(trainingLoanerAllowed("RANKED", "it-starter"), false);

const pendingMeta = createPendingAccountMeta();
assert.equal(starterOnboardingRequired(pendingMeta), true, "fresh profile marker makes onboarding required");
assert.equal(starterOnboardingRequired({ meta:{ profileVersion:2, ownedCards:{ "CS-001":3 }, starterOnboarding:undefined } }), false, "legacy profile without v1 metadata is grandfathered");
assert.equal(starterOnboardingRequired({ meta:{ profileVersion:2, ownedCards:{}, starterOnboarding:{ version:1, status:"PENDING" } } }), true, "fresh v1 profile requires onboarding from its explicit marker");
assert.equal(starterOnboardingRequired({ meta:{ profileVersion:2, starterOnboarding:{ version:1, status:"IN_PROGRESS" } } }), true, "in-progress v1 profile requires onboarding");
assert.equal(starterOnboardingRequired({ meta:{ profileVersion:2, starterOnboarding:{ version:1, status:"COMPLETE" } } }), false, "completed v1 profile does not require onboarding");
assert.equal(starterOnboardingRequired({ meta:{ profileVersion:2, ownedCards:{} } }), false, "legacy zero-card profile is not inferred to be fresh");
assert.equal(pendingMeta.alphaPlaytestAccess?.enabled, true);
assert.equal(Object.keys(pendingMeta.ownedCards).length, 0, "Alpha access must not mint owned cards");
assert.equal(pendingMeta.starterOnboarding.status, "PENDING");
assert.equal(pendingMeta.cosmetics.loadout.avatarId, "COS-AVA-007");
assert.equal(pendingMeta.cosmetics.loadout.avatarFrameId, null);
assert.deepEqual(pendingMeta.cosmetics.owned.map((grant) => grant.cosmeticId), ["COS-BOARD-001", "COS-AVA-007", "COS-BACK-001"]);
assert.equal(pendingMeta.rewardGrants.filter((grant) => grant.sourceRef === "starter:cosmetics:v2").length, 1, "starter avatar grant is idempotently sourced");
assert.equal(cosmeticIsOwned(pendingMeta.cosmetics, "COS-AVA-001"), false);
assert.equal(cosmeticIsOwned(pendingMeta.cosmetics, "COS-AVA-002"), false);
assert.equal(cosmeticIsOwned(pendingMeta.cosmetics, "COS-FRAME-002"), false, "Blue Silver must not be a fresh-account starter cosmetic");
const legacyBlueSilver = normalizePlayerCosmetics({ owned:[{ cosmeticId:"COS-FRAME-002", acquiredAt:1, source:"starter", sourceRef:"starter:alpha:v1" }] }, 2);
assert.equal(cosmeticIsOwned(legacyBlueSilver, "COS-FRAME-002"), true, "explicit legacy ownership remains intact");

const plan = buildStarterPackagePlan("IT", definitions, ALPHA_FORMAT, "idempotent-account", 100);
let granted = pendingMeta;
for (const reward of plan.grants) granted = applyRewardGrant(granted, reward, 100).profile;
const ownedAfterFirstGrant = Object.values(granted.ownedCards).reduce((sum, copies) => sum + Number(copies), 0);
for (const reward of plan.grants) granted = applyRewardGrant(granted, reward, 101).profile;
assert.equal(Object.values(granted.ownedCards).reduce((sum, copies) => sum + Number(copies), 0), ownedAfterFirstGrant, "replaying starter sourceRefs must not duplicate cards");

let deckSequence = 0;
const service = new PlayerProfileService({
  playerIdFactory:() => "account-player",
  tokenFactory:() => "account-token",
  deckIdFactory:() => `deck-${++deckSequence}`,
  nowFactory:() => 100,
  deckDefinitions:alphaDefinitions,
  deckFormat:ALPHA_FORMAT,
  alphaPlaytest:true
});
const created = service.create(createPendingAccountMeta());
const started = service.completeStarterOnboarding(created.profileToken, "IT");
assert.equal(started.meta.starterOnboarding.status, "IN_PROGRESS");
assert.equal(started.meta.starterOnboarding.selectedDepartment, "IT");
assert.equal(started.meta.starterOnboarding.boosterCount, 8);
assert.equal(started.meta.starterOnboarding.boosterPresentationCount, 0);
assert.equal(started.meta.alphaPlaytestAccess?.enabled, true);
assert.equal(started.decks.length, 0, "First Day Deck waits until the final booster presentation");
const repeatedDepartment = service.completeStarterOnboarding(created.profileToken, "IT");
assert.equal(repeatedDepartment.meta.starterOnboarding.status, "IN_PROGRESS", "repeated department selection must resume the saved booster step");
assert.deepEqual(repeatedDepartment.meta.ownedCards, started.meta.ownedCards, "repeated department selection must not duplicate the core grants");
assert.throws(() => service.advanceStarterBooster(created.profileToken, 2), /starter/i, "packs must be presented sequentially");
let completed = started;
for (let packNumber = 1; packNumber <= 8; packNumber += 1) {
  const result = service.advanceStarterBooster(created.profileToken, packNumber);
  assert.equal(result.booster?.packNumber, packNumber);
  assert.equal(result.booster?.cards.reduce((sum, item) => sum + item.quantity, 0), 5);
  completed = result.profile;
  assert.equal(completed.meta.starterOnboarding.boosterPresentationCount, packNumber);
}
assert.equal(completed.meta.starterOnboarding.status, "COMPLETE");
assert.equal(completed.selectedDeckId, completed.meta.starterOnboarding.firstDayDeckId);
assert.equal(completed.decks.length, 1);
assert.equal(completed.decks[0].name, "First Day Deck");
const repeatedCompletion = service.completeStarterOnboarding(created.profileToken, "IT");
assert.equal(repeatedCompletion.meta.starterOnboarding.status, "COMPLETE", "completed onboarding must remain complete after a repeated request");
assert.equal(repeatedCompletion.meta.starterOnboarding.firstDayDeckId, completed.meta.starterOnboarding.firstDayDeckId);
const repeated = service.advanceStarterBooster(created.profileToken, 8);
assert.equal(repeated.profile.decks.length, 1, "final booster presentation must be idempotent");
assert.deepEqual(repeated.profile.meta.ownedCards, completed.meta.ownedCards);
assert.throws(() => service.completeStarterOnboarding(created.profileToken, "OFFICE"), /STARTER_ONBOARDING_COMPLETE/);

console.log("Starter grant, Alpha access and Training loaner tests passed.");
