// Pure locale logic, with no DOM, no Astro imports, unit-tested in isolation.

export const LOCALES = Object.freeze({ EN: 'en', FA: 'fa' });

export const LOCALE_META = Object.freeze({
  en: { code: 'en', dir: 'ltr', label: 'English', htmlLang: 'en-AU', pathPrefix: '' },
  fa: { code: 'fa', dir: 'rtl', label: 'فارسی', htmlLang: 'fa', pathPrefix: '/fa' },
});

export function resolveLocaleFromPath(pathname) {
  if (pathname === '/fa' || pathname.startsWith('/fa/')) return LOCALES.FA;
  return LOCALES.EN;
}

export function switchLocalePath(currentPath, target) {
  const stripped = currentPath.replace(/^\/fa(?=\/|$)/, '') || '/';
  return target === LOCALES.FA
    ? (stripped === '/' ? '/fa/' : `/fa${stripped}`)
    : stripped;
}

/**
 * The home path for a locale.
 *
 * Used where a page has no counterpart in the other locale, so switchLocalePath
 * would name a route that does not exist. That is not hypothetical: the 404
 * document is deliberately bilingual in a single file (see 404.astro), so
 * `/fa/404/` was being advertised for a page that was never built, and Google
 * Search Console reported the 404 it found there on 2026-08-08.
 *
 * @param {'en' | 'fa'} locale
 * @returns {string}
 */
export function localeHomePath(locale) {
  return locale === LOCALES.FA ? '/fa/' : '/';
}

export function detectPreferredLocale(navigatorLanguages) {
  if (!navigatorLanguages?.length) return LOCALES.EN;
  for (const lang of navigatorLanguages) {
    const l = lang.toLowerCase();
    if (l === 'fa' || l.startsWith('fa-') || l === 'prs' || l.startsWith('prs-')) return LOCALES.FA;
  }
  return LOCALES.EN;
}
