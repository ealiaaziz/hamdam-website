import type { Platform, Priority } from './itil.js';
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

/**
 * Phrases that mean "I am done with this", checked so the desk can actually
 * act on them.
 *
 * Live, a requester wrote "close this ticket" and the assistant replied
 * "This ticket is being closed as requested". Nothing closed it. That is the
 * worst kind of reply a support desk can send: it reads as an action taken,
 * so the person stops chasing, and the ticket sits open behind them. An
 * assistant that cannot do a thing must not say it did.
 *
 * Narrow on purpose. "Close" appears in plenty of sentences that are not a
 * request to close anything, so the word alone is not enough.
 */
const CLOSE_REQUEST_PHRASES = [
  'close this ticket',
  'close the ticket',
  'close this case',
  'close this',
  'closing this',
  'you can close',
  'please close',
  'no longer need',
  'sorted now',
  'all sorted',
  'that is all i needed',
  "that's all i needed",
];

export function requestedClosure(text: string): boolean {
  const haystack = text.toLowerCase();
  return CLOSE_REQUEST_PHRASES.some((phrase) => haystack.includes(phrase));
}

export function requestedAHuman(text: string): boolean {
  const haystack = text.toLowerCase();
  return HUMAN_REQUEST_PHRASES.some((phrase) => haystack.includes(phrase));
}

export interface AgentContext {
  priority: Priority;
  /**
   * Which platform the requester is on, when the desk could tell.
   *
   * Optional so every existing caller and test keeps compiling and keeps its
   * behaviour: absent means 'unspecified', which is what the desk knew about
   * every ticket before 2026-08-30.
   */
  platform?: Platform;
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

  // 2. Platform gate. Every article in the knowledge base describes the
  //    iOS app, because until the Android build went out for testing that
  //    was the only app there was. Several of them say so in as many words:
  //    `getting-the-app` opens with "Hamdam is an iPhone app ... there is no
  //    Android version" and links to the App Store, and it is a *good*
  //    article -- reviewed, sourced, and right about the public store.
  //
  //    It is also, on the symptoms an Android tester writes down, the one
  //    that matched. So the desk answered people testing the Android build
  //    by telling them, with a citation, that what they were testing did not
  //    exist. That is the failure mode the build record's second rule is
  //    about: not invention, but a reviewed fact repeated where it does not
  //    hold.
  //
  //    Sits above the severity gate deliberately. A P1 escalates anyway, so
  //    the order changes no outcome; what it changes is the reason recorded
  //    on the ticket, and "Android" is the more useful thing for the person
  //    picking it up to read. Nothing here is a judgement that the report is
  //    unimportant -- it escalates, which on this desk means a person, which
  //    is the fastest treatment the desk has.
  if (ctx.platform === 'android') {
    return {
      action: 'escalate',
      reason: 'Android: the knowledge base describes the iOS app, so a person answers this one',
    };
  }

  // 3. Severity gate. The assistant never touches a P1 or P2, however well
  //    it thinks it knows the answer: those are the tickets where being
  //    wrong, or merely slow, costs the most.
  if (ctx.priority === 'P1' || ctx.priority === 'P2') {
    return { action: 'escalate', reason: `priority ${ctx.priority} is handled by a person` };
  }

  // 4. A conversation that is not converging reaches a human on a fixed
  //    deadline rather than when the model runs out of ideas.
  if (ctx.assistantTurns >= MAX_ASSISTANT_TURNS) {
    return { action: 'escalate', reason: `reached ${MAX_ASSISTANT_TURNS} assistant turns without resolving` };
  }

  // 5. Nothing in the knowledge base covers this. Escalating is the whole
  //    point: an unmatched ticket is exactly where invention would happen.
  if (match.best === null || match.confidence === 'none') {
    return { action: 'escalate', reason: 'no knowledge base article matches' };
  }

  // 6. Confident match: propose the reviewed answer.
  if (match.confidence === 'confident') {
    return {
      action: 'send_solution',
      articleId: match.best.article.id,
      reason: `matched "${match.best.article.id}" on ${match.best.hits} symptoms`,
    };
  }

  // 7. Plausible but not certain: ask, using the article's own question.
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
