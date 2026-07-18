// Pure state machine for the floating CTA (nav compact pill on desktop, the
// sticky mobile pill) plus the nav-backing scroll threshold. Exactly one
// App Store action is ever visible at once (15-conversion-specification.md
// §1, §2): the floating CTA shows only when none of hero/mid/ceremony's own
// CTA is currently in the viewport, and it also stays hidden across the
// footer (added post-launch, 2026-07-19 -- see computeCtaState).
//
// Sections register themselves with a `data-store-cta="hero|mid|ceremony|
// footer"` landmark as each one ships (Phase 3 for hero, Phase 7 for mid,
// Phase 9 for ceremony, footer added post-launch). Both floating CTAs stay
// gated behind APP_STORE.RELEASED regardless, so nothing new renders
// pre-release.

export const CTA_LANDMARK = Object.freeze({
  HERO: 'hero',
  MID: 'mid',
  CEREMONY: 'ceremony',
  FOOTER: 'footer',
});

export const CTA_STATE = Object.freeze({
  HERO: 'hero',
  MID: 'mid',
  CEREMONY: 'ceremony',
  FOOTER: 'footer',
  NONE: 'none',
});

/**
 * FOOTER is its own state, not folded into NONE (post-launch fix,
 * 2026-07-19): the footer is legal/nav content (privacy, terms, contact),
 * never a conversion moment, so the floating pill should stay hidden
 * there too rather than reappearing the instant ceremony's own CTA
 * scrolls out of view. Also covers privacy/terms pages, which have no
 * hero/mid/ceremony landmarks at all -- previously the pill floated for
 * the entire page there since computeCtaState always returned NONE.
 * @param {{ hero?: boolean, mid?: boolean, ceremony?: boolean, footer?: boolean }} visible
 */
export function computeCtaState(visible) {
  if (visible.hero) return CTA_STATE.HERO;
  if (visible.mid) return CTA_STATE.MID;
  if (visible.ceremony) return CTA_STATE.CEREMONY;
  if (visible.footer) return CTA_STATE.FOOTER;
  return CTA_STATE.NONE;
}

export function shouldShowFloatingCta(state) {
  return state === CTA_STATE.NONE;
}

export function isPastScrollThreshold(scrollY, thresholdPx = 24) {
  return scrollY > thresholdPx;
}

/**
 * Wires an IntersectionObserver over every [data-store-cta] landmark and
 * calls onChange(state) whenever the derived state changes. Safe no-op
 * (emits NONE once) when zero landmarks exist yet.
 * @param {(state: string) => void} onChange
 * @returns {() => void} disconnect
 */
export function observeCtaLandmarks(onChange) {
  const landmarks = document.querySelectorAll('[data-store-cta]');
  const visible = { hero: false, mid: false, ceremony: false, footer: false };
  let lastState = null;

  const emit = () => {
    const state = computeCtaState(visible);
    if (state !== lastState) {
      lastState = state;
      onChange(state);
    }
  };

  if (landmarks.length === 0) {
    emit();
    return () => {};
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const key = entry.target.getAttribute('data-store-cta');
      if (
        key === CTA_LANDMARK.HERO ||
        key === CTA_LANDMARK.MID ||
        key === CTA_LANDMARK.CEREMONY ||
        key === CTA_LANDMARK.FOOTER
      ) {
        visible[key] = entry.isIntersecting;
      }
    }
    emit();
  });

  landmarks.forEach((el) => observer.observe(el));
  emit();
  return () => observer.disconnect();
}
