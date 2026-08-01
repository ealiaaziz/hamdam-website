import { KB_ARTICLES, type KbArticle } from './data/kb.js';

// Matching a ticket to a known answer.
//
// This is deliberately dull: phrase overlap and a threshold, not a model.
// The question it answers is "has the desk already written this answer
// down?", and a wrong yes means emailing someone confident instructions for
// a problem they do not have. Keyword matching fails in ways you can read
// off the article's symptom list; a model fails in ways you find out about
// from the requester.
//
// The model's job comes later and is phrasing only. Nothing here chooses
// what to say, only which reviewed article is on the table.

export interface KbMatch {
  article: KbArticle;
  /** Count of distinct symptom phrases found in the ticket text. */
  hits: number;
}

/** Two independent symptoms is a real match; one could be a coincidence of wording. */
export const CONFIDENT_HITS = 2;

export interface KbMatchResult {
  best: KbMatch | null;
  /** Every article with at least one hit, strongest first. */
  candidates: KbMatch[];
  confidence: 'confident' | 'partial' | 'none';
}

export function matchArticles(text: string, articles: readonly KbArticle[] = KB_ARTICLES): KbMatchResult {
  const haystack = text.toLowerCase();

  const candidates = articles
    .map((article) => ({
      article,
      hits: article.symptoms.reduce((n, symptom) => (haystack.includes(symptom) ? n + 1 : n), 0),
    }))
    .filter((m) => m.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.article.id.localeCompare(b.article.id));

  const best = candidates[0] ?? null;

  // A tie between two articles is not confidence, whatever the hit count:
  // if "cannot sign in" and "verse not loading" score equally, we do not
  // know which problem this is, and asking is the honest move.
  const tied = candidates.length > 1 && candidates[1].hits === best?.hits;

  const confidence: KbMatchResult['confidence'] =
    best === null ? 'none' : best.hits >= CONFIDENT_HITS && !tied ? 'confident' : 'partial';

  return { best, candidates, confidence };
}

/**
 * The question to ask when a match is plausible but not certain. Drawn from
 * the article's own list so the desk controls the wording; returns null when
 * the candidate has none, which the policy treats as a reason to escalate
 * rather than to improvise a question.
 */
export function clarifyingQuestionFor(match: KbMatch, alreadyAsked: readonly string[]): string | null {
  return match.article.clarifying.find((q) => !alreadyAsked.includes(q)) ?? null;
}

export { KB_ARTICLES };
export type { KbArticle };
