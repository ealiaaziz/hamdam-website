import type { Priority } from './itil.js';
import { clarifyingQuestionFor, matchArticles, type KbMatchResult } from './kb.js';
import { normalizePersian } from './i18n.js';

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
  // The same request in Persian.
  //
  // This list was English-only while the desk answers in two languages:
  // i18n.ts reads a ticket as Persian at thirty per cent Persian letters, and
  // assistantModel.ts then instructs a reply written entirely in Persian. So
  // the one sentence that outranks every confidence score in this file did
  // not work for the audience most likely to write it, and a Persian speaker
  // asking for a person was told, in Persian, by a machine, that a machine
  // had it in hand.
  //
  // Phrases, not words, and the first draft of this list got that wrong in a
  // way worth recording. It contained the bare noun «انسان», which matches
  // «خطای انسانی» (human error) and «منابع انسانی» (HR), and the bare
  // «جواب نده», which is a prefix of «جواب ندهد» -- as in «اگر برنامه جواب
  // ندهد», "if the app doesn't respond", roughly the most common sentence a
  // support desk receives. Both would have escalated ordinary tickets
  // straight past the assistant and into a person's inbox, which is the
  // failure this list can least afford: a guard that fires on everything is
  // indistinguishable from no assistant at all, and it gets switched off.
  //
  // So each entry carries enough context to be a request. The verb still
  // varies -- «می‌خواهم ... صحبت کنم», «باید ... صحبت کنم» -- so the match
  // sits on the stable middle, and the ZWNJ-optional forms are spelled out
  // where Persian writers differ on it.
  'با انسان صحبت',
  'با یک انسان صحبت',
  'با انسان حرف',
  'با یک انسان حرف',
  'با آدم واقعی',
  'با یک آدم',
  'با کسی صحبت کنم',
  'با یکی صحبت کنم',
  'با یکی حرف بزنم',
  'با یک نفر صحبت',
  'با یه نفر صحبت',
  'با کارشناس صحبت',
  // «اپراتور» is also the ordinary Persian word for a phone or internet
  // carrier, so "I called my operator and it did not help" is a support
  // ticket, not a request for a person. The phrases below are the ones that
  // only mean the switchboard sense.
  'اپراتور انسانی',
  'به اپراتور وصل',
  'با اپراتور صحبت',
  // The forms that are not "talk to X": refer it, have someone call me, and
  // the flat refusal of the bot, which is how most people actually say it.
  'با ربات حرف',
  'با ربات صحبت',
  'شما ربات',
  'ربات هستی',
  'ربات هستید',
  'به یک انسان ارجاع',
  'به انسان ارجاع',
  'به یک نفر ارجاع',
  'یک نفر با من تماس',
  'کسی با من تماس',
  'با پشتیبانی صحبت کنم',
  'این پیام خودکار',
  // «پاسخ خودکار» and «جواب خودکار» were here and are gone. "I never
  // received your automatic reply" is a ticket about the acknowledgement
  // email, not a request for a person, and one hit escalates the ticket for
  // the rest of its life: `requestedAHuman` runs over the whole conversation
  // on every turn, so a false positive is not one bad reply, it is an
  // assistant that never speaks on that thread again.
  'دیگر ایمیل نزنید',
  'دیگه ایمیل نزنید',
  'به من ایمیل نزنید',
  'ایمیل نفرستید',
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
  // Translated for the same reason the human-request list above was, and
  // missed on the first pass. Without these a Persian speaker cannot close a
  // ticket from the thread at all: they say it is sorted, the desk carries on
  // as though it is not, and the honesty problem this list exists to prevent
  // -- an assistant that says it closed something and did not -- is simply
  // moved into the other language.
  'این درخواست را ببندید',
  'این تیکت را ببندید',
  'درخواست را ببندید',
  'میتوانید ببندید',
  'لطفا ببندید',
  'مشکل حل شد',
  'مشکلم حل شد',
  'درست شد ممنون',
  'دیگر نیازی نیست',
  'دیگه نیازی نیست',
  'همین را میخواستم',
];

/**
 * Both lists are matched against normalized text, and the needles are
 * normalized once at module load, so a phrase written here in one Persian
 * spelling matches every spelling of it. `toLowerCase` does nothing to
 * Persian script; it is kept for the English half. See normalizePersian.
 */
const CLOSE_NEEDLES = CLOSE_REQUEST_PHRASES.map((p) => normalizePersian(p));
const HUMAN_NEEDLES = HUMAN_REQUEST_PHRASES.map((p) => normalizePersian(p));

export function requestedClosure(text: string): boolean {
  const haystack = normalizePersian(text.toLowerCase());
  return CLOSE_NEEDLES.some((phrase) => haystack.includes(phrase));
}

export function requestedAHuman(text: string): boolean {
  const haystack = normalizePersian(text.toLowerCase());
  return HUMAN_NEEDLES.some((phrase) => haystack.includes(phrase));
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
