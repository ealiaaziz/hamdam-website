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

/**
 * Routes that exist in one document for both languages, so there is no
 * locale-prefixed twin to switch to.
 *
 * Only /404 so far. Static hosting serves exactly one custom 404 document, so
 * 404.astro carries English and Persian in the same page on purpose, and there
 * is deliberately no /fa/404/. The nav's language toggle did not know that and
 * computed one anyway, so a Farsi speaker who hit a dead link and pressed
 * "فارسی" to get help in their own language hit a second dead link. Found
 * 2026-09-14 by walking every internal href in the built site.
 */
const NO_LOCALE_PAIR = new Set(['/404']);

export function switchLocalePath(currentPath, target) {
  const stripped = currentPath.replace(/^\/fa(?=\/|$)/, '') || '/';
  // No twin to go to, so go to that language's home rather than to a 404.
  // Compared with any trailing slash removed: BaseLayout passes '/404' and
  // Astro.url.pathname gives '/404/', and the first version of this check only
  // knew the first form, so the nav toggle kept pointing at /fa/404/.
  if (NO_LOCALE_PAIR.has(stripped.replace(/\/$/, '') || '/')) {
    return target === LOCALES.FA ? '/fa/' : '/';
  }
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
