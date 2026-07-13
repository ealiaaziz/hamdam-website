// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://hamdam.com.au',
  integrations: [sitemap()],
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
