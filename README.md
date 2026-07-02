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

Cloudflare Pages, connected to this repo's `main` branch.

- Framework preset: Astro
- Build command: `npm run build`
- Build output directory: `dist`
- Custom domain: hamdam.com.au
