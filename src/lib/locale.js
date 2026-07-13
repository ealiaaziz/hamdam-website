// Pure locale logic — no DOM, no Astro imports, unit-tested in isolation.

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

export function detectPreferredLocale(navigatorLanguages) {
  if (!navigatorLanguages?.length) return LOCALES.EN;
  for (const lang of navigatorLanguages) {
    const l = lang.toLowerCase();
    if (l === 'fa' || l.startsWith('fa-') || l === 'prs' || l.startsWith('prs-')) return LOCALES.FA;
  }
  return LOCALES.EN;
}
