## Current state (Phase W1, shipped 2026-07-13)

Cinematic warm-dawn bilingual landing site for the 2 August 2026 app launch.
Astro 7 + Tailwind v4, deployed to hamdam.com.au as a **Cloudflare Worker with
Static Assets** (corrected 2026-07-21 -- this line previously said "Pages" and
"on push to main"; both were wrong. There is no CI/CD: every deploy is a
manual `npm run deploy`, and pushing to `main` alone deploys nothing. Deploy
via that npm script, never a bare `wrangler deploy` -- it runs
`scripts/predeploy-check.mjs` first, which blocks deploying a dirty tree or an
unpushed branch. Added 2026-07-25 after a deploy shipped four unpushed commits
to production). EN at `/`, Farsi (RTL, Vazirmatn) at `/fa/`. Scroll-driven sunrise
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

**Outbound-host rule (added 2026-07-28):** the privacy policy's third-party
services section (`/privacy/` §5, mirrored in `/terms/` §12) is an exhaustive
list of every host the iOS app contacts. Any new outbound host in the app
updates both sections in the same commit that introduces it. As of 2026-07-28
the set is: `en.wikipedia.org`, `upload.wikimedia.org`, `itunes.apple.com`,
`music.apple.com`, `date.nager.at`, plus Apple framework traffic (iCloud,
HealthKit, EventKit, WeatherKit, StoreKit, MusicKit, Foundation Models).
`date.nager.at` is the only non-Apple service.
History and verification matrix: `docs/progress.md`.

**Continuing the redesign:** everything in `docs/website-redesign/33-universal-roots-and-homepage-handoff.md`
shipped 2026-07-25 and is live. What remains is in
`docs/website-redesign/34-next-steps.md` — read that first. Deploy with
`npm run deploy`, never a bare wrangler call; see `.claude/hooks/README.md`.

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
