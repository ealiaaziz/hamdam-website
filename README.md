# Hamdam Website

Marketing site for Hamdam, a daily reflection companion rooted in Persian
poetry and open to wherever you come from. Live on the App Store: the store
state is `APP_STORE.RELEASED` in `src/lib/appStore.js`, which is what the CTAs
read, so change it there rather than here.

## Stack

- [Astro](https://astro.build) (static output, minimal client JS)
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- TypeScript strict
- Google Fonts: Source Serif Pro, Vazirmatn
- No analytics, no tracking, no third-party SDKs

## Routes

- `/` — English landing page
- `/privacy` — English Privacy Policy
- `/terms` — English Terms of Service
- `/fa` — Persian landing page (RTL, Vazirmatn)
- `/fa/privacy` — Persian Privacy Policy
- `/fa/terms` — Persian Terms of Service

## Development

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # outputs to dist/
npm run preview   # preview the production build
```

## Deploy target

Cloudflare Workers with Static Assets (not Pages -- corrected 2026-07-21, the
prior "Pages, connected to `main`" claim here was stale and wrong: there is
no Git-triggered build, every deploy so far has been a manual `wrangler
deploy` run). Pushing to `main` does not deploy anything by itself.

- Build command: `npm run build`
- Assets directory: `dist` (see `wrangler.jsonc`)
- Deploy: `npm run deploy` (never a bare `wrangler deploy`: the npm script runs
  `scripts/predeploy-check.mjs` first, which refuses to ship a dirty tree, an
  unpushed branch, or a branch that is behind origin. Without CI, that check is
  the only thing keeping production and GitHub in step. Override, loudly and
  only when you mean it: `npm run deploy -- --force`.)
- Custom domains: hamdam.com.au, www.hamdam.com.au (both route to the same
  Worker -- see `TODO-Ealia.md` for the open www-&gt;apex redirect issue this
  causes)

## Support desk

`support/` is a separate, independently-deployed Cloudflare Worker -- the
Hamdam Support ticketing platform (public portal, email-in/out via
developer@hamdam.com.au, ITIL P1-P4 priority + SLA tracking, agent
dashboard). It does not share a build or deploy with this site. See
`support/README.md`.
