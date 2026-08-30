import { readFile } from 'node:fs/promises';
import { deCards } from '../public/locales/de-cards.js';
import { deLegacyPhrases } from '../public/locales/de.js';

const cards = JSON.parse(await readFile(new URL('../data/cards.json', import.meta.url), 'utf8'));
const ids = new Set(cards.map((card) => card.id));
const translatedIds = new Set(Object.keys(deCards));
const missing = [...ids].filter((id) => !translatedIds.has(id));
const extra = [...translatedIds].filter((id) => !ids.has(id));
const incomplete = [];
for (const card of cards) {
  const de = deCards[card.id];
  if (!de) continue;
  if (!String(de.name ?? '').trim()) incomplete.push(`${card.id}:name`);
  if (String(card.rulesText ?? '').trim() && !String(de.rulesText ?? '').trim()) incomplete.push(`${card.id}:rulesText`);
  if (String(card.flavorText ?? '').trim() && !String(de.flavorText ?? '').trim()) incomplete.push(`${card.id}:flavorText`);
}
const requiredMatchPhrases = [
  'OPENING HANDS',
  'Keep this hand',
  'Select cards to replace',
  'Opening hand confirmed',
  'RIGHT-CLICK TO PIN INSPECTOR',
  'Build your board',
  'Choose your attacks',
  'Continue to Draw →',
  'Go to Battle →',
  'Live stream recovering',
  'ARCHIVED'
];
const missingMatchPhrases = requiredMatchPhrases.filter((phrase) => !String(deLegacyPhrases[phrase] ?? '').trim());
if (missing.length || extra.length || incomplete.length || missingMatchPhrases.length) {
  console.error(JSON.stringify({ missing, extra, incomplete, missingMatchPhrases }, null, 2));
  process.exit(1);
}
console.log(`I18N_AUDIT_OK · de ${translatedIds.size}/${cards.length} cards · names/rules/flavor covered · ${requiredMatchPhrases.length}/${requiredMatchPhrases.length} match UI anchors covered`);
