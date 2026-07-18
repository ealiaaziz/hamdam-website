import { describe, it, expect } from 'vitest';
import { computeCtaState, shouldShowFloatingCta, isPastScrollThreshold, CTA_STATE } from '../stickyCta.js';

describe('computeCtaState', () => {
  it('returns NONE when nothing is visible', () => {
    expect(computeCtaState({})).toBe(CTA_STATE.NONE);
    expect(computeCtaState({ hero: false, mid: false, ceremony: false })).toBe(CTA_STATE.NONE);
  });

  it('returns HERO when the hero CTA is visible, regardless of others', () => {
    expect(computeCtaState({ hero: true })).toBe(CTA_STATE.HERO);
    expect(computeCtaState({ hero: true, mid: true, ceremony: true })).toBe(CTA_STATE.HERO);
  });

  it('returns MID when mid is visible and hero is not', () => {
    expect(computeCtaState({ mid: true })).toBe(CTA_STATE.MID);
    expect(computeCtaState({ mid: true, ceremony: true })).toBe(CTA_STATE.MID);
  });

  it('returns CEREMONY only when hero and mid are both out of view', () => {
    expect(computeCtaState({ ceremony: true })).toBe(CTA_STATE.CEREMONY);
  });
});

describe('shouldShowFloatingCta', () => {
  it('shows the floating CTA only when state is NONE', () => {
    expect(shouldShowFloatingCta(CTA_STATE.NONE)).toBe(true);
    expect(shouldShowFloatingCta(CTA_STATE.HERO)).toBe(false);
    expect(shouldShowFloatingCta(CTA_STATE.MID)).toBe(false);
    expect(shouldShowFloatingCta(CTA_STATE.CEREMONY)).toBe(false);
  });
});

describe('isPastScrollThreshold', () => {
  it('defaults to a 24px threshold', () => {
    expect(isPastScrollThreshold(0)).toBe(false);
    expect(isPastScrollThreshold(24)).toBe(false);
    expect(isPastScrollThreshold(25)).toBe(true);
  });

  it('accepts a custom threshold', () => {
    expect(isPastScrollThreshold(10, 5)).toBe(true);
    expect(isPastScrollThreshold(4, 5)).toBe(false);
  });
});
