// Re-implements the seven checks an SEO Site Checkup run reported against
// hamdam.com.au on 2026-09-05, so they can be re-run without that service.
// Four of its seven verdicts were false positives, which is the reason this
// exists: the questions were worth asking and the answers were not worth
// trusting. Findings and reasoning: docs/seo/2026-09-05-site-checkup-audit.md
//
// Needs the site served somewhere Chromium can reach. Typically:
//   npm run build && npx http-server dist -p 8099
//   node scripts/seo-checkup.mjs http://127.0.0.1:8099/
//   node scripts/seo-checkup.mjs http://127.0.0.1:8099/fa/
//
// Chromium here comes from PLAYWRIGHT_BROWSERS_PATH; adjust executablePath if
// yours lives elsewhere.

import { chromium } from 'playwright-core';
const base = process.argv[2];
// Root-relative asset paths resolve against the ORIGIN, not the page URL.
// Appending them to a base of .../fa/ 404s every one and reads as a failure
// of the site rather than of the script.
const origin = new URL(base).origin;
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});

const row = (name, pass, detail) =>
  console.log(`${pass ? ' PASS' : ' FAIL'}  ${name.padEnd(28)} ${detail}`);

// Collect rendered facts at three viewport/DPR combinations.
const VPS = [{w:390,h:844,dpr:2},{w:390,h:844,dpr:3},{w:1440,h:900,dpr:2}];
const all = [];
for (const vp of VPS) {
  const p = await b.newPage({viewport:{width:vp.w,height:vp.h}, deviceScaleFactor:vp.dpr});
  await p.goto(base, {waitUntil:'networkidle'});
  const H = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < H; y += Math.floor(vp.h*0.8)) {
    await p.evaluate(v => window.scrollTo(0,v), y);
    await p.waitForTimeout(110);
  }
  await p.waitForLoadState('networkidle');
  await p.waitForTimeout(1200);
  const data = await p.evaluate(dpr => {
    const imgs = [...document.images].map(i => {
      const r = i.getBoundingClientRect(), cs = getComputedStyle(i);
      return { src:(i.currentSrc||i.src).replace(location.origin,''),
               nw:i.naturalWidth, nh:i.naturalHeight, cw:r.width, ch:r.height,
               fit:cs.objectFit, hasAlt:i.hasAttribute('alt'), alt:i.getAttribute('alt')||'',
               srcset:!!(i.srcset || i.closest('picture')?.querySelector('source[srcset]')) };
    });
    return {
      imgs,
      ga: /googletagmanager|google-analytics|gtag\(/.test(document.documentElement.innerHTML),
      iconLinks: [...document.querySelectorAll('link[rel~="icon"],link[rel="apple-touch-icon"]')]
                   .map(l => `${l.getAttribute('rel')}=${l.getAttribute('href')}`),
      sheets: document.querySelectorAll('head link[rel="stylesheet"]').length,
      inlineStyleTags: document.querySelectorAll('style').length,
      inlineStyleAttrs: document.querySelectorAll('[style]').length,
      labelled: document.querySelectorAll('[role="img"][aria-label], button[aria-label]').length,
    };
  }, vp.dpr);
  all.push({vp, ...data});
  await p.close();
}
await b.close();

const last = all[all.length-1];

// 1. Google Analytics
row('Google Analytics', !last.ga, last.ga ? 'a GA script is present' : 'absent, by design (privacy claim + CSP)');

// 2. Favicon
const wanted = ['/favicon.svg','/favicon.ico','/apple-touch-icon.png'];
const declared = wanted.filter(w => last.iconLinks.some(l => l.endsWith(w)));
const reach = [];
for (const w of wanted) {
  const r = await fetch(origin + w).catch(() => null);
  reach.push(`${w} ${r ? r.status : 'ERR'}`);
}
row('Favicon', declared.length === 3 && reach.every(r => r.endsWith('200')),
    `${declared.length}/3 declared, fetched: ${reach.join(', ')}`);

// 3. Responsive images: oversized by more than 1.35x with no srcset to fix it
const over = [];
for (const s of all) for (const i of s.imgs) {
  if (!i.cw || !i.nw || i.srcset) continue;
  const need = i.cw * s.vp.dpr;
  if (i.nw / need > 1.35) over.push(`${i.src.split('/').pop()} x${(i.nw/need).toFixed(1)}@${s.vp.w}/${s.vp.dpr}`);
}
const withSrcset = new Set(all.flatMap(s => s.imgs.filter(i => i.srcset).map(i => i.src))).size;
row('Responsive images', over.length === 0,
    over.length ? `${new Set(over).size} still oversized: ${[...new Set(over)].slice(0,4).join(', ')}`
                : `${withSrcset} distinct images carry a srcset, none oversized past 1.35x`);

// 4. Aspect ratio: only object-fit:fill can actually distort
let worst = 0, worstSrc = '';
for (const s of all) for (const i of s.imgs) {
  if (!i.cw || !i.ch || !i.nw || i.fit !== 'fill') continue;
  const skew = Math.abs(i.nw/i.nh - i.cw/i.ch) / (i.nw/i.nh);
  if (skew > worst) { worst = skew; worstSrc = i.src.split('/').pop(); }
}
row('Image aspect ratio', worst < 0.02, `largest skew on an object-fit:fill image ${(worst*100).toFixed(2)}% (${worstSrc})`);

// 5. Alt text
const missing = last.imgs.filter(i => !i.hasAlt).length;
const empty = last.imgs.filter(i => i.hasAlt && i.alt === '').length;
row('Image alt', missing === 0,
    `${last.imgs.length} imgs, ${missing} with no alt attribute, ${empty} deliberately empty, ${last.labelled} composites named on their wrapper`);

// 6. Media queries in the shipped CSS
let mq = 0, sheetList = [];
const html = await (await fetch(base)).text();
for (const href of [...new Set([...html.matchAll(/\/_astro\/[\w.-]+\.css/g)].map(m => m[0]))]) {
  const css = await (await fetch(origin + href)).text();
  const n = (css.match(/@media/g) || []).length;
  mq += n; sheetList.push(`${href.split('/').pop()}:${n}`);
}
row('CSS media queries', mq > 0, `${mq} in the shipped CSS (${sheetList.join(', ')})`);

// 7. Render-blocking / CSP posture
row('Render-blocking CSS', last.sheets <= 3,
    `${last.sheets} stylesheets in head; ${last.inlineStyleTags} inline <style>, ${last.inlineStyleAttrs} inline style= (CSP forbids both)`);
