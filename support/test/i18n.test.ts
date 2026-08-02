import { describe, expect, it } from 'vitest';
import { detectLocale, direction, localePath, parseLocale, strings, LOCALES } from '../src/i18n.js';

// Hamdam is a Persian poetry app whose support desk answered everyone in
// English. These tests are mostly about the ways a bilingual desk goes wrong
// quietly: a missing string, an English sentence in a Persian reply, a
// conversation that changes language halfway through.

describe('parseLocale', () => {
  it('only ever returns a language the desk actually has', () => {
    expect(parseLocale('fa')).toBe('fa');
    for (const value of [undefined, null, '', 'en', 'ar', 'fa-IR', 'FA', '../fa']) {
      expect(parseLocale(value), String(value)).toBe(parseLocale(value) === 'fa' ? 'fa' : 'en');
    }
    expect(parseLocale('ar')).toBe('en');
    expect(parseLocale('../fa')).toBe('en');
  });
});

describe('direction', () => {
  it('is a property of the language, not of a page', () => {
    expect(direction('fa')).toBe('rtl');
    expect(direction('en')).toBe('ltr');
  });
});

describe('localePath', () => {
  it('keeps a reader in the language they arrived in', () => {
    expect(localePath('fa', '/track')).toBe('/fa/track');
    expect(localePath('fa', '/')).toBe('/fa');
    expect(localePath('en', '/track')).toBe('/track');
    expect(localePath('en', '/')).toBe('/');
  });

  it('tolerates a path with no leading slash', () => {
    expect(localePath('fa', 'track')).toBe('/fa/track');
  });
});

describe('detectLocale', () => {
  it('reads a Persian message as Persian', () => {
    expect(detectLocale('سلام، برنامه باز نمی‌شود')).toBe('fa');
    expect(detectLocale('موضوع: مشکل در ورود')).toBe('fa');
  });

  it('reads an English message as English', () => {
    expect(detectLocale('The daily verse is blank')).toBe('en');
    expect(detectLocale('')).toBe('en');
    expect(detectLocale('12345 !!! ???')).toBe('en');
  });

  it('does not flip an English message that quotes one Persian word', () => {
    // Answering this in Persian would be a worse mistake than the one it is
    // trying to avoid.
    expect(detectLocale('The app shows the word همدم and then crashes on my iPhone every morning')).toBe('en');
  });

  it('reads a mostly Persian message with a Latin product name as Persian', () => {
    expect(detectLocale('برنامه Hamdam روی گوشی من باز نمی‌شود و پیام خطا می‌دهد')).toBe('fa');
  });
});

describe('strings', () => {
  it('has every key in every language', () => {
    // A missing Farsi string is an English sentence dropped into a Persian
    // page, which is the exact failure this table exists to prevent.
    const en = strings('en') as unknown as Record<string, unknown>;
    for (const locale of LOCALES) {
      const s = strings(locale) as unknown as Record<string, unknown>;
      for (const key of Object.keys(en)) {
        expect(s[key], `${locale}.${key}`).toBeDefined();
        expect(typeof s[key], `${locale}.${key}`).toBe(typeof en[key]);
        if (typeof s[key] === 'string') expect((s[key] as string).length, `${locale}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('writes Persian in Persian, not Arabic, letterforms', () => {
    // U+064A ARABIC YEH and U+0643 ARABIC KAF are the classic wrong
    // characters. Persian uses U+06CC and U+06A9, and the difference shows
    // up as the wrong shape on an Iranian reader's screen.
    const fa = strings('fa') as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(fa)) {
      if (typeof value !== 'string') continue;
      expect(value, `${key} uses Arabic yeh`).not.toMatch(/ي/);
      expect(value, `${key} uses Arabic kaf`).not.toMatch(/ك/);
    }
  });

  it('carries no leftover English in the Farsi replies', () => {
    const fa = strings('fa');
    for (const key of ['replyOutsideWritten', 'replyExhausted', 'replyHamdamUnsourced', 'replyGeneralAdvice'] as const) {
      expect(fa[key], key).toMatch(/[؀-ۿ]/);
      expect(fa[key], key).not.toMatch(/\b(the|and|please|sorry)\b/i);
    }
  });

  it('points each language at the other one', () => {
    expect(strings('en').otherLanguageHref).toBe('/fa');
    expect(strings('fa').otherLanguageHref).toBe('/');
  });
});
