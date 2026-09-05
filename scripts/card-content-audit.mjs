import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const cards = JSON.parse(readFileSync(`${root}/data/cards.json`, "utf8"));
const { deCards } = await import(pathToFileURL(`${root}/public/locales/de-cards.js`).href);
const cardTypes = new Set(["EMPLOYEE", "ACTION", "INCIDENT", "SYSTEM"]);
const departments = new Set(["CUSTOMER_SERVICE", "IT", "OFFICE", "MARKETING", "PRODUCTION", "NEUTRAL"]);
const report = { total:cards.length, intentionalVanilla:[], missingRulesText:[], localizationGaps:[], implementationTextMismatches:[], presentationIssues:[], invalidStructure:[] };
const seen = new Set();

for (const card of cards) {
  const id = String(card?.id ?? "");
  if (!id || seen.has(id)) report.invalidStructure.push(`${id || "<missing-id>"}: duplicate or missing id`);
  seen.add(id);
  if (!cardTypes.has(card?.cardType)) report.invalidStructure.push(`${id}: unknown cardType`);
  if (!departments.has(card?.department)) report.invalidStructure.push(`${id}: unknown department`);
  if (!card?.name?.trim()) report.invalidStructure.push(`${id}: missing name`);
  const costKey = card?.cardType === "INCIDENT" ? "set" : "play";
  if (!Number.isFinite(Number(card?.cost?.[costKey]))) report.invalidStructure.push(`${id}: missing ${costKey} cost`);
  if (card?.cardType === "EMPLOYEE" && !Number.isFinite(Number(card?.power))) report.invalidStructure.push(`${id}: missing Employee power`);
  const abilities = Array.isArray(card?.abilities) ? card.abilities : [];
  const rules = String(card?.rulesText ?? "").trim();
  if (!rules && card.intentionalVanilla === true && abilities.length === 0) report.intentionalVanilla.push({ id, name:card.name });
  if (!rules && card.intentionalVanilla !== true && abilities.length === 0) report.missingRulesText.push({ id, name:card.name, issue:"empty rulesText is not explicitly marked intentionalVanilla" });
  if (!rules && abilities.length > 0) report.missingRulesText.push({ id, name:card.name, implementationStatus:card.implementationStatus ?? "UNSPECIFIED" });
  if (rules && !deCards[id]?.rulesText?.trim()) report.localizationGaps.push(`${id}: missing German rulesText`);
  if (!deCards[id]) report.localizationGaps.push(`${id}: missing German card overlay`);
  if (abilities.length > 0 && card.implementationStatus === "TEXT_ONLY") report.implementationTextMismatches.push(`${id}: TEXT_ONLY card has executable abilities`);
  if (card.implementationStatus === "FULL" && !rules && abilities.length > 0) report.implementationTextMismatches.push(`${id}: FULL implementation has no rules text`);
  if (/no rules text\.?|placeholder|tbd/i.test(rules)) report.presentationIssues.push(`${id}: placeholder rules text`);
}

const hardFailures = Object.entries(report).filter(([key, value]) => key !== "intentionalVanilla" && Array.isArray(value) && value.length).map(([key, value]) => `${key}: ${value.length}`);
console.log(JSON.stringify(report, null, 2));
if (hardFailures.length) {
  console.error(`CARD_CONTENT_AUDIT_FAILED ${hardFailures.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(`CARD_CONTENT_AUDIT_OK total=${report.total} vanilla=${report.intentionalVanilla.length}`);
}
