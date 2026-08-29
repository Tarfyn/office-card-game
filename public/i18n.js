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
  return deLegacyPhrases[value] ?? value;
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
