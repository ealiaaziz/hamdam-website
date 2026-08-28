/**
 * Whether one inbound message may put an agent to work on the bot's code.
 *
 * This is the gate the whole change flow rests on, so it is a pure function
 * over facts the caller has already established, and every path returns an
 * explicit reason. inbound.ts explains why the email path is written this
 * way: the thing it replaced was a model session holding credentials and a
 * mailbox, reading text written by strangers, and it was the only place where
 * attacker-authored text met tools. This puts a tool back within reach of
 * that text, so the decision to reach it is made here, in code, and can be
 * read in one sitting.
 *
 * Four conditions, all required, checked in this order:
 *
 *   1. Exchange authenticated the sender. Not the `From` header, which is a
 *      line of text the sending client writes.
 *   2. The authenticated address is the channel owner's, matched literally.
 *   3. The message is about the bot.
 *   4. The day's dispatch ceiling has not been spent.
 *
 * What this deliberately does not do is read the message as instructions. It
 * reads a sender, a subject and a body, and decides one thing: whether an
 * issue gets opened. What the agent then does with the text is a separate
 * question answered somewhere else, under the rule that the body is a symptom
 * report from a non-technical owner rather than a set of orders.
 */

/** Dispatches one address may trigger in a day, before a person is asked. */
export const DEFAULT_DISPATCH_DAILY_LIMIT = 3;

export interface DispatchFacts {
  /** Did Exchange's own Authentication-Results header vouch for the sender? */
  senderAuthenticated: boolean;
  /** Is the authenticated address the channel owner's? See owner.ts. */
  senderIsOwner: boolean;
  /**
   * Subject and body of *this* message, without the quoted thread beneath it.
   *
   * The quoted history matters. Every reply carries the desk's own previous
   * emails inside it, and those are full of the desk's vocabulary; deciding
   * "is this about the bot" over the whole blob would find the words in last
   * week's message and dispatch on a reply that says nothing but "ممنون".
   */
  text: string;
  /** Dispatches already made for this sender today. */
  dispatchesToday: number;
  dailyLimit?: number;
}

export type DispatchDecision =
  | { dispatch: true; reason: string }
  | { dispatch: false; reason: string; suspicious?: true };

/**
 * Words that mean the sender is talking about the Telegram bot.
 *
 * Deliberately not a `Topic` in itil.ts. That enum decides an SLA clock for a
 * product the knowledge base covers, and the bot is a different product the
 * desk holds no articles about; widening it would change how every ticket is
 * prioritised in order to route one person's mail. This list only ever gates
 * a dispatch.
 *
 * "ticket" and "تیکت" are absent on purpose, and their absence is the whole
 * subtlety: they are the support desk's own word, printed in the subject of
 * every message it has ever sent. Matching them would make every reply on
 * every ticket look like a bot report. The bot's own domain words do the work
 * instead.
 */
const BOT_TERMS = [
  // Persian, which is what the owner actually writes in.
  'ربات', 'بات', 'کانال', 'آگهی', 'آگهی‌ها', 'مزایده', 'بلیط', 'فروشنده', 'خریدار',
  // English and the bot's own names.
  'bot', 'telegram', 'nl events', 'nl_events', 'channel', 'listing', 'auction', 'seller',
];

/** Whether this text is about the bot at all. */
export function mentionsBot(text: string): boolean {
  const haystack = text.toLowerCase();
  return BOT_TERMS.some((term) => haystack.includes(term));
}

/**
 * The decision, with the reason it was reached.
 *
 * The reason is not decoration. A refused dispatch is written to the ticket,
 * so "the owner wrote in and nothing happened" is answerable later without
 * re-deriving it from mail logs, and `suspicious` marks the one case that
 * should be read by a person rather than filed: mail that claims to be the
 * owner and did not authenticate.
 */
export function decideDispatch(facts: DispatchFacts): DispatchDecision {
  const limit = facts.dailyLimit ?? DEFAULT_DISPATCH_DAILY_LIMIT;

  // Authentication first, and the two failures are not the same event. An
  // unauthenticated message from an address claiming to be the owner is
  // somebody attempting the gate, and it is worth a person's attention;
  // ordinary mail from anyone else is just ordinary mail.
  if (!facts.senderAuthenticated) {
    return facts.senderIsOwner
      ? {
          dispatch: false,
          reason: 'claims to be the owner but Exchange did not authenticate the sender',
          suspicious: true,
        }
      : { dispatch: false, reason: 'sender not authenticated' };
  }

  if (!facts.senderIsOwner) {
    return { dispatch: false, reason: 'sender is not the channel owner' };
  }

  if (!mentionsBot(facts.text)) {
    return { dispatch: false, reason: 'message is not about the bot' };
  }

  // The ceiling is the answer to "what if her mailbox is taken". It cannot
  // stop the first dispatch, and it is not trying to: it bounds the damage to
  // something a person will notice and can undo, rather than to whatever an
  // afternoon of automated mail could produce.
  if (facts.dispatchesToday >= limit) {
    return { dispatch: false, reason: `daily dispatch ceiling reached (${facts.dispatchesToday}/${limit})` };
  }

  return { dispatch: true, reason: 'authenticated owner, about the bot, under the daily ceiling' };
}

/**
 * The gate in the order the checks have to happen.
 *
 * `decideDispatch` is pure and takes the day's count as a fact, which leaves
 * one thing unsaid: when that count may be incremented. It matters, because
 * the counter is the only check here with a side effect, and charging it
 * before the cheap checks have run turns a ceiling into a trap. The bot's own
 * daily ad cap was written that way. It was charged at the tap that started
 * an ad rather than at the ad itself, so being asked for a phone number and
 * not answering spent a slot, and three taps locked a seller out for the rest
 * of the day having published nothing. That was reported as "the bot is not
 * working", and it was right.
 *
 * So authentication, ownership and subject matter are settled first, for
 * free, and `consume` is called only once the message is one this desk would
 * dispatch. An ordinary email from the owner about anything else costs her
 * nothing.
 *
 * `consume` returns the count including the call it just made, which is what
 * consumeRateLimit already returns.
 */
export async function runDispatchGate(
  facts: Omit<DispatchFacts, 'dispatchesToday'>,
  consume: () => Promise<number>,
): Promise<DispatchDecision> {
  const preliminary = decideDispatch({ ...facts, dispatchesToday: 0 });
  if (!preliminary.dispatch) return preliminary;

  return decideDispatch({ ...facts, dispatchesToday: (await consume()) - 1 });
}
