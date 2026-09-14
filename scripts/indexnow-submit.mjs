#!/usr/bin/env node
// Tells IndexNow that this site changed, rather than waiting to be crawled.
//
// Added 2026-09-14. Until then the only freshness signal the site gave was a
// sitemap with no lastmod in it, and the complaint that prompted this was that
// AI assistants were weeks behind on the 1.4 rename and the games. IndexNow is
// the one mechanism that pushes rather than waits: Bing, Yandex and Seznam
// consume it within minutes, and Bing's index is what Copilot reads and what
// ChatGPT's search draws on. Google does not participate, so Google still
// needs the sitemap, the lastmod and, for anything urgent, Request Indexing in
// Search Console by hand.
//
// The key is not a secret. IndexNow's whole ownership proof is that the key is
// publicly readable at keyLocation, so it is committed on purpose.
//
// Every URL in the sitemap is submitted rather than a computed diff. The
// protocol's guidance against resubmitting unchanged URLs is aimed at sites
// with six figures of them; this one has 26, and a fragile route-to-source
// diff that silently omits a changed page would be a worse failure than a
// slightly wasteful submission.

import { readFileSync } from 'node:fs';

const KEY = '7d08c30a32f93c21ce62ae05ba42e05a';
const HOST = 'hamdam.com.au';
const SITEMAP = new URL('../dist/sitemap-0.xml', import.meta.url);

const xml = readFileSync(SITEMAP, 'utf8');
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (urlList.length === 0) {
  console.error('indexnow: no URLs in the sitemap, refusing to submit an empty list');
  process.exit(1);
}

const body = {
  host: HOST,
  key: KEY,
  keyLocation: `https://${HOST}/${KEY}.txt`,
  urlList,
};

const res = await fetch('https://api.indexnow.org/IndexNow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

// 200 accepted, 202 accepted but key still being validated. Both are success.
const text = await res.text();
console.log(`indexnow: ${res.status} ${res.statusText} for ${urlList.length} URLs${text ? `: ${text}` : ''}`);
if (res.status !== 200 && res.status !== 202) process.exit(1);
