## Current state (Phase W1, shipped 2026-07-13)

Cinematic warm-dawn bilingual landing site for the 2 August 2026 app launch.
Astro 7 + Tailwind v4, deployed to hamdam.com.au as a **Cloudflare Worker with
Static Assets** (corrected 2026-07-21 -- this line previously said "Pages" and
"on push to main"; both were wrong. There is no CI/CD: every deploy is a
manual `npm run build && wrangler deploy`, and pushing to `main` alone
deploys nothing). EN at `/`, Farsi (RTL, Vazirmatn) at `/fa/`. Scroll-driven sunrise
hero: pure timeline logic in `src/lib/cinematic.js`, night → morning over the
first 100vh, reduced-motion renders static morning; pin with `?dawn=N` for
review. Locale logic in `src/lib/locale.js`; store link state in
`src/lib/appStore.js` — `APP_STORE.RELEASED` is the launch-day flip that swaps
the "Coming soon" pill for the official badge. Verses come byte-exact from the
iOS app's verse bank via generated `src/data/verses.ts`; Farsi hero copy from
generated `src/data/siteCopy.ts`. Never hand-type Persian — regenerate.
`npm test` (Vitest, 60 cases) and `npm run check:persian` (also a pre-commit
hook) must pass. OG images/icons regenerate via `node scripts/generate-og.mjs`.
CSP is enforcing (`public/_headers`): no inline styles or scripts, so keep
`inlineStylesheets: 'never'` and `assetsInlineLimit: 0` in astro.config.
History and verification matrix: `docs/progress.md`.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
