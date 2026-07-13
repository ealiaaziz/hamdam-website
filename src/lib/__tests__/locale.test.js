import { describe, it, expect } from 'vitest';
import {
  LOCALES,
  LOCALE_META,
  resolveLocaleFromPath,
  switchLocalePath,
  detectPreferredLocale,
} from '../locale.js';

describe('resolveLocaleFromPath', () => {
  it('resolves / to EN', () => {
    expect(resolveLocaleFromPath('/')).toBe(LOCALES.EN);
  });

  it('resolves /fa to FA', () => {
    expect(resolveLocaleFromPath('/fa')).toBe(LOCALES.FA);
  });

  it('resolves /fa/ to FA', () => {
    expect(resolveLocaleFromPath('/fa/')).toBe(LOCALES.FA);
  });

  it('resolves /fa/about to FA', () => {
    expect(resolveLocaleFromPath('/fa/about')).toBe(LOCALES.FA);
  });

  it('resolves /about to EN', () => {
    expect(resolveLocaleFromPath('/about')).toBe(LOCALES.EN);
  });

  it('does not treat /fal or /farsi as FA', () => {
    expect(resolveLocaleFromPath('/fal')).toBe(LOCALES.EN);
    expect(resolveLocaleFromPath('/farsi')).toBe(LOCALES.EN);
  });
});

describe('switchLocalePath', () => {
  it('switches / to /fa/', () => {
    expect(switchLocalePath('/', LOCALES.FA)).toBe('/fa/');
  });

  it('switches /about to /fa/about', () => {
    expect(switchLocalePath('/about', LOCALES.FA)).toBe('/fa/about');
  });

  it('switches /fa/ back to /', () => {
    expect(switchLocalePath('/fa/', LOCALES.EN)).toBe('/');
  });

  it('switches /fa back to /', () => {
    expect(switchLocalePath('/fa', LOCALES.EN)).toBe('/');
  });

  it('switches /fa/about back to /about', () => {
    expect(switchLocalePath('/fa/about', LOCALES.EN)).toBe('/about');
  });

  it('round-trips every EN path through FA and back', () => {
    for (const path of ['/', '/about', '/privacy', '/terms']) {
      const fa = switchLocalePath(path, LOCALES.FA);
      expect(resolveLocaleFromPath(fa)).toBe(LOCALES.FA);
      expect(switchLocalePath(fa, LOCALES.EN)).toBe(path);
    }
  });

  it('is idempotent when already in the target locale', () => {
    expect(switchLocalePath('/fa/about', LOCALES.FA)).toBe('/fa/about');
    expect(switchLocalePath('/about', LOCALES.EN)).toBe('/about');
  });
});

describe('detectPreferredLocale', () => {
  it('detects fa-IR', () => {
    expect(detectPreferredLocale(['fa-IR'])).toBe(LOCALES.FA);
  });

  it('detects bare fa', () => {
    expect(detectPreferredLocale(['fa'])).toBe(LOCALES.FA);
  });

  it('detects Dari (prs-AF)', () => {
    expect(detectPreferredLocale(['prs-AF'])).toBe(LOCALES.FA);
  });

  it('falls back to EN for pt-BR', () => {
    expect(detectPreferredLocale(['pt-BR'])).toBe(LOCALES.EN);
  });

  it('falls back to EN for an empty list', () => {
    expect(detectPreferredLocale([])).toBe(LOCALES.EN);
  });

  it('falls back to EN for null', () => {
    expect(detectPreferredLocale(null)).toBe(LOCALES.EN);
  });

  it('prefers the first Persian entry anywhere in the list', () => {
    expect(detectPreferredLocale(['en-AU', 'fa-IR'])).toBe(LOCALES.FA);
  });

  it('does not match languages that merely start with fa letters', () => {
    expect(detectPreferredLocale(['fan', 'fat-GH'])).toBe(LOCALES.EN);
  });
});

describe('LOCALE_META', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(LOCALE_META)).toBe(true);
    expect(Object.isFrozen(LOCALES)).toBe(true);
  });

  it('declares RTL for fa and LTR for en', () => {
    expect(LOCALE_META.fa.dir).toBe('rtl');
    expect(LOCALE_META.en.dir).toBe('ltr');
  });
});
