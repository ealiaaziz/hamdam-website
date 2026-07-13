// App Store link/state logic. RELEASED is the launch-day switch: while
// false, CTAs render the approved "Coming soon" pill (Apple's badge
// guidelines only permit the official badge for available apps, and the
// store URL 404s pre-release). Flip to true on launch day.

export const APP_STORE = Object.freeze({
  ID: '6784461990',
  RELEASED: false,
  COUNTRY: 'au',
});

export function appStoreUrl(lang = 'en') {
  const base = `https://apps.apple.com/${APP_STORE.COUNTRY}/app/id${APP_STORE.ID}`;
  return lang === 'fa' ? `${base}?l=fa` : base;
}
