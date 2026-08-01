import type { Priority } from './itil.js';
import { clarifyingQuestionFor, matchArticles, type KbMatchResult } from './kb.js';

// What the assistant is allowed to do, in one readable file.
//
// The alternative -- letting the rules live inside a prompt -- means the
// answer to "can it email a P1 requester?" is whatever the model inferred
// this time. Here it is a line of code with a test next to it.
//
// Every path returns an explicit action. There is no default branch that
// quietly does nothing, because "nothing" on a support desk is a requester
// waiting.

export type AgentAction =
  | { action: 'send_solution'; articleId: string; reason: string }
  | { action: 'ask_clarifying'; question: string; articleId: string; reason: string }
  | { action: 'escalate'; reason: string };

/** After this many assistant turns, a person takes over regardless of progress. */
export const MAX_ASSISTANT_TURNS = 3;

/**
 * Phrases that hand the conversation to a person immediately. Checked
 * before everything else: a requester asking for a human has asked for a
 * human, and no confidence score outranks that.
 */
const HUMAN_REQUEST_PHRASES = [
  'speak to a human',
  'talk to a human',
  'real person',
  'speak to someone',
  'talk to someone',
  'stop replying',
  'stop emailing',
  'is this a bot',
  'are you a bot',
  'this is automated',
  'human please',
];

export function requestedAHuman(text: string): boolean {
  const haystack = text.toLowerCase();
  return HUMAN_REQUEST_PHRASES.some((phrase) => haystack.includes(phrase));
}

export interface AgentContext {
  priority: Priority;
  /** Subject + all requester text on the ticket so far. */
  conversationText: string;
  /** How many replies the assistant has already sent on this ticket. */
  assistantTurns: number;
  /** Clarifying questions already asked, so it never repeats one. */
  askedQuestions: readonly string[];
}

export function decideAgentAction(ctx: AgentContext, match: KbMatchResult = matchArticles(ctx.conversationText)): AgentAction {
  // 1. An explicit request for a person always wins.
  if (requestedAHuman(ctx.conversationText)) {
    return { action: 'escalate', reason: 'requester asked for a person' };
  }

  // 2. Severity gate. The assistant never touches a P1 or P2, however well
  //    it thinks it knows the answer: those are the tickets where being
  //    wrong, or merely slow, costs the most.
  if (ctx.priority === 'P1' || ctx.priority === 'P2') {
    return { action: 'escalate', reason: `priority ${ctx.priority} is handled by a person` };
  }

  // 3. A conversation that is not converging reaches a human on a fixed
  //    deadline rather than when the model runs out of ideas.
  if (ctx.assistantTurns >= MAX_ASSISTANT_TURNS) {
    return { action: 'escalate', reason: `reached ${MAX_ASSISTANT_TURNS} assistant turns without resolving` };
  }

  // 4. Nothing in the knowledge base covers this. Escalating is the whole
  //    point: an unmatched ticket is exactly where invention would happen.
  if (match.best === null || match.confidence === 'none') {
    return { action: 'escalate', reason: 'no knowledge base article matches' };
  }

  // 5. Confident match: propose the reviewed answer.
  if (match.confidence === 'confident') {
    return {
      action: 'send_solution',
      articleId: match.best.article.id,
      reason: `matched "${match.best.article.id}" on ${match.best.hits} symptoms`,
    };
  }

  // 6. Plausible but not certain: ask, using the article's own question.
  const question = clarifyingQuestionFor(match.best, ctx.askedQuestions);
  if (question === null) {
    return { action: 'escalate', reason: 'partial match with no unasked clarifying question left' };
  }
  return {
    action: 'ask_clarifying',
    question,
    articleId: match.best.article.id,
    reason: `partial match on "${match.best.article.id}"`,
  };
}
