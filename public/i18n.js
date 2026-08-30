import { en } from './locales/en.js';
import { de, deLegacyPhrases, deLegacyAttributes } from './locales/de.js';
import { deCards } from './locales/de-cards.js';

const STORAGE_KEY = 'office-card-game-locale-v1';
const dictionaries = Object.freeze({ en, de });
let locale = 'en';

function lookup(dictionary, key) {
  return String(key ?? '').split('.').reduce((value, part) => value && Object.prototype.hasOwnProperty.call(value, part) ? value[part] : undefined, dictionary);
}

function interpolate(value, params = {}) {
  return String(value).replace(/\{([A-Za-z0-9_]+)\}/g, (_, key) => params[key] == null ? `{${key}}` : String(params[key]));
}

export function availableLocales() { return Object.keys(dictionaries); }
export function currentLocale() { return locale; }
export function t(key, params = {}, fallback = null) {
  const localized = lookup(dictionaries[locale], key);
  const canonical = lookup(en, key);
  return interpolate(localized ?? canonical ?? fallback ?? key, params);
}
export function setLocale(nextLocale, { persist = true, notify = true } = {}) {
  const resolved = dictionaries[nextLocale] ? nextLocale : 'en';
  locale = resolved;
  if (persist) { try { localStorage.setItem(STORAGE_KEY, resolved); } catch {} }
  applyDocumentTranslations();
  if (notify) window.dispatchEvent(new CustomEvent('ocg:localechange', { detail:{ locale:resolved } }));
  return resolved;
}
export function initializeLocale() {
  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch {}
  return setLocale(saved && dictionaries[saved] ? saved : 'en', { persist:false, notify:false });
}
export function applyDocumentTranslations() {
  document.documentElement.lang = locale;
  document.querySelectorAll('[data-i18n]').forEach((node) => { const key=node.getAttribute('data-i18n'); if (key) node.textContent=t(key); });
  const titleNode=document.querySelector('[data-i18n-title]');
  if (titleNode) document.title=t(titleNode.getAttribute('data-i18n-title'), {}, document.title);
  applyLegacyAppTranslations();
}
export function localizedCard(definition) {
  if (!definition || locale !== 'de') return definition;
  const overlay = deCards[definition.id];
  return overlay ? { ...definition, ...overlay } : definition;
}

export function cardTypeLabel(type) {
  if (locale !== 'de') return type;
  return ({ EMPLOYEE:'MITARBEITER', ACTION:'AKTION', INCIDENT:'VORFALL', SYSTEM:'SYSTEM', WORKPLACE:'ARBEITSPLATZ' })[type] ?? type;
}

export function localizedCardCoverage() {
  return { locale, translated:Object.keys(deCards).length };
}


function translateLegacyLiteral(value) {
  if (locale !== 'de') return value;
  const exact = deLegacyPhrases[value];
  if (exact != null) return exact;

  const phaseName = (phase) => ({ START:'START', DRAW:'ZIEH', MAIN:'MAIN', BATTLE:'KAMPF', END:'END', MULLIGAN:'MULLIGAN' })[phase] ?? phase;
  let match = String(value).match(/^YOUR (START|DRAW|MAIN|BATTLE|END|MULLIGAN) PHASE$/);
  if (match) return `DEINE ${phaseName(match[1])}-PHASE`;
  match = String(value).match(/^OPPONENT (START|DRAW|MAIN|BATTLE|END|MULLIGAN) PHASE$/);
  if (match) return `GEGNERISCHE ${phaseName(match[1])}-PHASE`;
  match = String(value).match(/^Turn (\d+) · Capacity (\d+)\/(\d+)$/);
  if (match) return `Zug ${match[1]} · Kapazität ${match[2]}/${match[3]}`;
  match = String(value).match(/^Turn (\d+) · waiting for (.+)$/);
  if (match) return `Zug ${match[1]} · wartet auf ${match[2]}`;
  match = String(value).match(/^Turn (\d+) · (START|DRAW|MAIN|BATTLE|END)$/);
  if (match) return `Zug ${match[1]} · ${phaseName(match[2])}`;
  match = String(value).match(/^EMPLOYEE (\d+)$/);
  if (match) return `MITARBEITER ${match[1]}`;
  match = String(value).match(/^SUPPORT (\d+)$/);
  if (match) return `SUPPORT ${match[1]}`;
  match = String(value).match(/^(\d+) card(?:s)?$/);
  if (match) return `${match[1]} Karte${match[1] === '1' ? '' : 'n'}`;
  match = String(value).match(/^(\d+) hand play(?:s)? ready$/);
  if (match) return `${match[1]} Handkarte${match[1] === '1' ? '' : 'n'} spielbar`;
  match = String(value).match(/^(\d+) Employee(?:s)? ready to attack$/);
  if (match) return `${match[1]} Mitarbeiter angriffsbereit`;
  match = String(value).match(/^(\d+) activated (ability|abilities) ready$/);
  if (match) return `${match[1]} aktivierte ${match[1] === '1' ? 'Fähigkeit' : 'Fähigkeiten'} bereit`;
  match = String(value).match(/^(\d+) PLAYABLE$/);
  if (match) return `${match[1]} SPIELBAR`;
  match = String(value).match(/^(\d+) ATTACK(?:S)?$/);
  if (match) return `${match[1]} ANGRIFF${match[1] === '1' ? '' : 'E'}`;
  match = String(value).match(/^(\d+) ABILIT(?:Y|IES)$/);
  if (match) return `${match[1]} FÄHIGKEIT${match[1] === '1' ? '' : 'EN'}`;
  match = String(value).match(/^(\d+) RESPONSE(?:S)?$/);
  if (match) return `${match[1]} REAKTION${match[1] === '1' ? '' : 'EN'}`;
  match = String(value).match(/^(\d+) REMAIN$/);
  if (match) return `${match[1]} OFFEN`;
  match = String(value).match(/^Last: (.+)$/);
  if (match) return `Zuletzt: ${match[1]}`;
  match = String(value).match(/^Connection: (.+)$/);
  if (match) return `Verbindung: ${match[1]}`;
  match = String(value).match(/^Chain (\d+)$/i);
  if (match) return `Kette ${match[1]}`;
  return value;
}

export function applyLegacyAppTranslations(root = document.querySelector('#app')) {
  if (!root || locale !== 'de') return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes=[]; let node;
  while ((node=walker.nextNode())) nodes.push(node);
  for (const textNode of nodes) {
    const raw=textNode.nodeValue ?? '';
    const leading=raw.match(/^\s*/)?.[0] ?? '';
    const trailing=raw.match(/\s*$/)?.[0] ?? '';
    const core=raw.trim();
    if (!core) continue;
    let translated=translateLegacyLiteral(core);
    if (translated===core) {
      const ago=core.match(/^(\d+)s ago$/); if (ago) translated=`vor ${ago[1]} s`;
      else if (core.startsWith('Last live: ')) translated=`Letzter Sync: ${core.slice(11)}`;
      else if (core.endsWith(' cards')) translated=core.replace(/ cards$/,' Karten');
      else if (core.endsWith(' owned')) translated=core.replace(/ owned$/,' im Besitz');
    }
    if (translated!==core) textNode.nodeValue=`${leading}${translated}${trailing}`;
  }
  root.querySelectorAll('[placeholder]').forEach((el)=>{ const raw=el.getAttribute('placeholder'); const next=deLegacyAttributes[raw] ?? raw; if(next!==raw) el.setAttribute('placeholder',next); });
}

let translationObserver = null;
export function observeLocalizedApp(root = document.querySelector('#app')) {
  translationObserver?.disconnect();
  if (!root) return;
  translationObserver = new MutationObserver(() => queueMicrotask(() => applyLegacyAppTranslations(root)));
  translationObserver.observe(root,{subtree:true,childList:true,characterData:true});
  applyLegacyAppTranslations(root);
}

initializeLocale();
