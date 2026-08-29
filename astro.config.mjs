// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

import { describeBeaconDecision } from './src/lib/analytics.js';

// One line, at config load, so the Workers Builds log says plainly whether the
// analytics beacon shipped. The failure mode this guards is silent: a renamed
// CI variable or an uncommitted token still builds and still renders, and the
// only symptom is a dashboard that stays empty.
console.log(describeBeaconDecision());

// https://astro.build/config
export default defineConfig({
  site: 'https://hamdam.com.au',
  // 'always': without this Astro defaults to 'ignore', which serves the same
  // page at /fa/terms and /fa/terms/ and lets Google index both. Search
  // Console on 2026-08-27 showed exactly that split: /fa/terms at position 9
  // with 2 impressions and /fa/terms/ at position 21 with 5, two entries
  // competing for one page. One canonical shape, chosen to match the
  // directory-style URLs Cloudflare already serves.
  trailingSlash: 'always',
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en-AU',
          fa: 'fa',
        },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Never inline bundled scripts/assets: the production CSP has no
      // 'unsafe-inline', so inline <script> tags would be blocked.
      assetsInlineLimit: 0,
    },
  },
  build: {
    // 'never': the production CSP is style-src 'self' with no unsafe-inline,
    // so inlined <style> tags would be blocked at the edge.
    inlineStylesheets: 'never',
  },
});
