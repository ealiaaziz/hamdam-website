#!/usr/bin/env node
// Generates the OG share images (EN + FA) and the webmanifest icons.
//
// Rendering strategy: headless Chrome renders an HTML template so the real
// brand fonts (Source Serif Pro / Vazirmatn woff2 from node_modules) are
// used — sharp/librsvg cannot load webfonts. Sharp then converts to JPEG
// and resizes icons. Re-run any time: `node scripts/generate-og.mjs`.
//
// Persian text is imported from src/data/siteCopy.ts (never hand-typed).

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { faCopy } from '../src/data/siteCopy.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME =
  process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const fontUrl = (rel) => pathToFileURL(join(root, 'node_modules', rel)).href;
const SSP_600 = fontUrl('@fontsource/source-serif-pro/files/source-serif-pro-latin-600-normal.woff2');
const SSP_400I = fontUrl('@fontsource/source-serif-pro/files/source-serif-pro-latin-400-italic.woff2');
const VAZIR_500 = fontUrl('@fontsource/vazirmatn/files/vazirmatn-arabic-500-normal.woff2');

// FA wordmark is the first word of the approved tagline (before the comma).
const faWordmark = faCopy.tagline.split('،')[0].trim();

function template({ lang, dir, wordmark, tagline, wordmarkFont, taglineFont, taglineStyle }) {
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<style>
  @font-face { font-family: 'SSP'; src: url('${SSP_600}') format('woff2'); font-weight: 600; }
  @font-face { font-family: 'SSP'; src: url('${SSP_400I}') format('woff2'); font-weight: 400; font-style: italic; }
  @font-face { font-family: 'Vazir'; src: url('${VAZIR_500}') format('woff2'); font-weight: 500; }
  * { margin: 0; }
  body {
    width: 1200px; height: 630px; overflow: hidden;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 36px; text-align: center;
    background: linear-gradient(to bottom, #E8A03D 0%, #C9502C 58%, #1A1611 100%);
  }
  .wordmark { font-family: ${wordmarkFont}; font-weight: ${wordmarkFont.includes('Vazir') ? 500 : 600}; font-size: 150px; color: #F5EEE0; letter-spacing: 0.01em; }
  .tagline { font-family: ${taglineFont}; font-style: ${taglineStyle}; font-size: 44px; color: #F5EEE0; opacity: 0.92; max-width: 980px; line-height: 1.5; }
</style>
</head>
<body>
  <div class="wordmark">${wordmark}</div>
  <div class="tagline">${tagline}</div>
</body>
</html>`;
}

const variants = [
  {
    out: 'public/og/hamdam-dawn-1200x630.jpg',
    html: template({
      lang: 'en', dir: 'ltr',
      wordmark: 'Hamdam',
      tagline: 'Hamdam reflects your heart and your sky.',
      wordmarkFont: "'SSP', serif", taglineFont: "'SSP', serif", taglineStyle: 'italic',
    }),
  },
  {
    out: 'public/og/hamdam-dawn-fa-1200x630.jpg',
    html: template({
      lang: 'fa', dir: 'rtl',
      wordmark: faWordmark,
      tagline: faCopy.tagline,
      wordmarkFont: "'Vazir', sans-serif", taglineFont: "'Vazir', sans-serif", taglineStyle: 'normal',
    }),
  },
];

const work = mkdtempSync(join(tmpdir(), 'hamdam-og-'));
for (const v of variants) {
  const htmlPath = join(work, 'og.html');
  const pngPath = join(work, 'og.png');
  writeFileSync(htmlPath, v.html);
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--window-size=1200,630', '--force-device-scale-factor=1',
    '--virtual-time-budget=5000',
    `--screenshot=${pngPath}`, pathToFileURL(htmlPath).href,
  ], { stdio: 'pipe' });
  await sharp(pngPath).jpeg({ quality: 85, mozjpeg: true }).toFile(join(root, v.out));
  console.log('wrote', v.out);
}
rmSync(work, { recursive: true, force: true });

// Manifest icons from the app icon, when the source copy exists.
const iconSource = join(root, 'public/icons/icon-source-1024.png');
if (existsSync(iconSource)) {
  for (const size of [512, 192]) {
    await sharp(iconSource).resize(size, size).png().toFile(join(root, `public/icons/icon-${size}.png`));
    console.log(`wrote public/icons/icon-${size}.png`);
  }
} else {
  console.warn('icon-source-1024.png not found — manifest icons skipped (copy the app icon first)');
}
