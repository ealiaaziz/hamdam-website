import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseImpact, parseUrgency } from '../src/itil.js';

// Regression tests for a security review on 2026-08-07. Three findings, three
// blocks below, each asserting the property that was violated rather than the
// shape of the fix.

const here = dirname(fileURLToPath(import.meta.url));
const read = (f: string) => readFileSync(join(here, '..', 'src', f), 'utf8');

describe('upsertRequester does not let a stranger rewrite a stored name', () => {
  // The clause read COALESCE(excluded.name, requesters.name), which prefers the
  // incoming value, so every new ticket naming an existing address overwrote
  // that address's name. Nothing gated it: the portal accepts any address, and
  // the email path reaches upsertRequester before the authentication check that
  // only guards appends. That name is what the console queue and the escalation
  // email show, on all of the requester's tickets at once.
  //
  // Asserted against the source because nothing in this suite talks to D1, the
  // same reasoning sqlBindings.test.ts is built on.
  const source = read('db.ts');
  const clause = /ON CONFLICT\(email\) DO UPDATE SET name = COALESCE\(([^)]*)\)/.exec(source);

  it('still has exactly one requester conflict clause to check', () => {
    expect(clause).not.toBeNull();
  });

  it('prefers the stored name over the incoming one', () => {
    // Order is the whole fix: first operand wins in COALESCE.
    expect(clause![1].replace(/\s+/g, ' ').trim()).toBe('requesters.name, excluded.name');
  });

  it('never writes excluded.name ahead of requesters.name anywhere in db.ts', () => {
    // Comments stripped first: the fix's own comment quotes the old clause to
    // explain what was wrong with it, and that is documentation, not SQL.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/COALESCE\(\s*excluded\.name\s*,\s*requesters\.name\s*\)/);
  });
});

describe('parseImpact / parseUrgency reject anything not in the enum', () => {
  // These two were the only enums on the desk reaching storage through a bare
  // `as` cast. classifyFromMatrix then does MATRIX[impact][urgency], so a bogus
  // impact threw on property access and the public form answered 500 rather
  // than 400.
  it('accepts the three real values', () => {
    for (const v of ['high', 'medium', 'low']) {
      expect(parseImpact(v)).toBe(v);
      expect(parseUrgency(v)).toBe(v);
    }
  });

  it('falls back to medium for unknown, empty and wrong-typed input', () => {
    for (const v of ['x', '', 'HIGH', 'p1', null, undefined, 42, {}, []]) {
      expect(parseImpact(v)).toBe('medium');
      expect(parseUrgency(v)).toBe('medium');
    }
  });

  it('is not fooled by inherited Object properties', () => {
    // `impact=constructor` used to resolve to the string "Object" and travel on
    // as a priority instead of throwing, which is the quieter half of the bug.
    for (const v of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      expect(parseImpact(v)).toBe('medium');
      expect(parseUrgency(v)).toBe('medium');
    }
  });

  it('is what index.ts actually calls, with no cast left behind', () => {
    const source = read('index.ts');
    expect(source).toMatch(/parseImpact\(form\.get\('impact'\)\)/);
    expect(source).toMatch(/parseUrgency\(form\.get\('urgency'\)\)/);
    expect(source).not.toMatch(/as Impact\)/);
    expect(source).not.toMatch(/as Urgency\)/);
  });
});

describe('the inbound email path cleans what it stores', () => {
  // Nothing under inbound.ts or ingest.ts imported validation.ts, so a subject
  // or display name arriving by mail kept its control characters, its bidi
  // overrides and its unbounded length. The portal had been hardened; email is
  // the channel that is not geo-restricted and needs no browser.
  const source = read('ingest.ts');

  it('imports the same cleaners the portal uses', () => {
    expect(source).toMatch(/import \{[^}]*cleanLine[^}]*\} from '\.\/validation\.js'/s);
    expect(source).toMatch(/import \{[^}]*cleanText[^}]*\} from '\.\/validation\.js'/s);
  });

  it('never reads the sender display name except through cleanLine', () => {
    // Every occurrence, not just the ones near a known call site: the property
    // that matters is that the raw value has no unguarded reader at all.
    const all = source.match(/message\.fromName/g) ?? [];
    const cleaned = source.match(/cleanLine\(message\.fromName,/g) ?? [];
    expect(all.length).toBeGreaterThan(0);
    expect(cleaned.length).toBe(all.length);
  });

  it('caps the subject, the name and the body at the shared limits', () => {
    expect(source).toMatch(/cleanLine\(cleanSubject\(message\.subject\), MAX_SUBJECT_CHARS\)/);
    expect(source).toMatch(/cleanLine\(message\.fromName, MAX_NAME_CHARS\)/);
    expect(source).toMatch(/cleanText\((?:rawBody|plan\.body), MAX_BODY_CHARS\)/);
  });
});
