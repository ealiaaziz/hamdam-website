# Hamdam Website

Marketing site for Hamdam — a reflection companion grounded in Persian poetic
wisdom, launching on iPhone August 2026.

## Stack

- [Astro](https://astro.build) (static output, minimal client JS)
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- TypeScript strict
- Google Fonts: Source Serif Pro, Vazirmatn
- No analytics, no tracking, no third-party SDKs

## Routes

- `/` — English landing page
- `/privacy` — English Privacy Policy (placeholder content)
- `/terms` — English Terms of Service (placeholder content)
- `/fa` — Persian landing page (RTL shell, English placeholder body pending native-speaker review)
- `/fa/privacy` — Persian Privacy Policy (placeholder)
- `/fa/terms` — Persian Terms of Service (placeholder)

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
- Deploy: `npm run build && npx wrangler deploy`
- Custom domains: hamdam.com.au, www.hamdam.com.au (both route to the same
  Worker -- see `TODO-Ealia.md` for the open www-&gt;apex redirect issue this
  causes)
