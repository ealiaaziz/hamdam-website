import { decideAgentAction, requestedAHuman, MAX_ASSISTANT_TURNS, type AgentContext } from './agentPolicy.js';
import { matchArticles, KB_ARTICLES, type KbArticle } from './kb.js';
import { generateModelReply, type ModelReply } from './assistantModel.js';
import type { Topic } from './itil.js';
import { strings, type Locale } from './i18n.js';

// The assistant's visible reply in the ticket thread.
//
// This exists because of what HAM-3 looked like from the requester's side.
// They pressed "this did not help" three times on the same article, asked a
// real follow-up question, and the thread showed nothing back. The engine
// was working -- matching, drafting, notifying -- but every one of those
// outputs went somewhere the requester could not see. To them the desk was
// silent while repeating itself.
//
// So: every portal reply gets an answer in the thread, immediately, and the
// answer is never an article they have already rejected. Escalating is also
// an answer, and saying "I do not have this one, a person is picking it up"
// is worth more than silence dressed up as processing.

/** Shown as the author on assistant messages. Never a person's name. */
export const ASSISTANT_NAME = 'Hamdam Assistant (automated)';

export interface AssistantReply {
  body: string;
  action: 'send_solution' | 'ask_clarifying' | 'escalate';
  articleId?: string;
  question?: string;
  reason: string;
  /** True when a person now needs to take this on. */
  escalated: boolean;
}

export interface AssistantReplyInput extends AgentContext {
  /** Articles the requester has already said did not help. */
  rejectedArticles: readonly string[];
  /** True once this ticket has already been handed to a person. */
  alreadyEscalated?: boolean;
  /** Whether this ticket is about the app or about general computing. */
  topic?: Topic;
  /** The language to answer in. */
  locale?: Locale;
}

function stepsAsText(article: KbArticle): string {
  return article.steps
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
}

export function composeAssistantReply(
  input: AssistantReplyInput,
  articles: readonly KbArticle[] = KB_ARTICLES,
): AssistantReply {
  const t = strings(input.locale ?? 'en');
  // Rejection is the strongest signal short of leaving. An article the
  // requester has already turned down is out of the running entirely, not
  // merely ranked lower.
  const available = articles.filter((a) => !input.rejectedArticles.includes(a.id));
  const match = matchArticles(input.conversationText, available);
  const decision = decideAgentAction(input, match);

  if (decision.action === 'send_solution' && match.best) {
    return {
      body: `${t.replySolutionIntro}\n\n${match.best.article.title}\n\n${stepsAsText(match.best.article)}\n\n${t.replySolutionOutro}`,
      action: 'send_solution',
      articleId: decision.articleId,
      reason: decision.reason,
      escalated: false,
    };
  }

  if (decision.action === 'ask_clarifying') {
    return {
      body: `${t.replyClarifyIntro}\n\n${decision.question}`,
      action: 'ask_clarifying',
      articleId: decision.articleId,
      question: decision.question,
      reason: decision.reason,
      escalated: false,
    };
  }

  // Everything else is an escalation. Which words depend on why, because a
  // single canned paragraph repeated at every turn is what makes an
  // assistant read as broken rather than honest.

  // Already handed over: acknowledge and stop re-announcing it. Seen live --
  // the same "handing it to a person" paragraph came back twice in a row,
  // which tells the requester nothing they did not already know and makes
  // the desk look stuck.
  if (input.alreadyEscalated) {
    return {
      body: t.replyAlreadyEscalated,
      action: 'escalate',
      reason: 'already escalated; acknowledged without repeating the handover',
      escalated: true,
    };
  }

  // "Run out of things to try" is only true if we actually had something to
  // try for *this* question. Basing it on whether any article was ever
  // rejected meant a brand new topic -- "how does Windows 11 password reset
  // work?" -- was answered as though it were a continuation of a thread it
  // had nothing to do with.
  const hadCandidates = matchArticles(input.conversationText, articles).best !== null;
  const exhausted = hadCandidates && available.length < articles.length;

  const body = exhausted ? t.replyExhausted : t.replyOutsideWritten;

  return { body, action: 'escalate', reason: decision.reason, escalated: true };
}

// ---- the live, model-backed reply ----------------------------------------
//
// `composeAssistantReply` above is the floor: it always returns something,
// needs no network and no key, and is what the tests pin. What follows adds
// the model on top of it without moving any of the rules into a prompt.
//
// The order matters. The guards that must never be negotiable run *before*
// the model is asked anything, so a P1, a request for a person, or a
// conversation that has gone three turns without landing never reaches an
// API call at all. Only after those pass does the model get to write, and
// anything it returns that fails validation is dropped in favour of the
// deterministic answer. The requester cannot tell which one they got, and
// that is the point: the desk degrades to plainer language, never to silence.

export interface LiveReplyOptions {
  /**
   * The Workers AI binding. Absent means the deterministic path, not an
   * error: local development and CI run without it on purpose.
   */
  ai?: Ai;
  /** Full thread in order, so the model sees its own previous replies. */
  turns: readonly { author: 'requester' | 'assistant'; body: string }[];
  ticketSubject: string;
  /**
   * Claims one call against the daily budget. Returns false when it is spent,
   * and false means a plainer answer, never a refused ticket.
   */
  claim?: () => Promise<boolean>;
  /** Seam for tests. Production never passes this. */
  generate?: typeof generateModelReply;
}

/**
 * Tells the requester when an answer is general advice rather than something
 * the desk has checked.
 *
 * An answer drawn from an article carries a person's review behind it. An
 * answer drawn from general knowledge carries a model's confidence and
 * nothing else, and those two things read identically on a screen unless one
 * of them says so. Saying so costs a sentence and buys the requester the
 * ability to weigh it, which matters more here than it would behind a
 * frontier model.
 */
function withProvenance(reply: ModelReply, locale: Locale = 'en'): string {
  // From a reviewed article, or from the desk's own reference on how the app
  // behaves. Both are the desk speaking about its own product, and neither
  // needs a disclaimer. Adding one put "that is general advice" underneath a
  // verbatim, correct answer about iCloud sync, which reads as the desk not
  // trusting itself.
  if (reply.articleId || reply.referenceId) return reply.body;
  return `${reply.body}\n\n${strings(locale).replyGeneralAdvice}`;
}

/**
 * Hosts the desk is willing to put in front of a requester.
 *
 * Short on purpose. Every entry is somewhere the desk would send a person
 * anyway: its own site, Apple because that is where the app lives and where
 * purchases and restores happen, and Lifeline because the crisis guidance in
 * the prompt names it and that is the one link that must never be missing.
 * Subdomains of these are allowed, so support.apple.com and any future
 * kb.hamdam.com.au work without another entry.
 */
const ALLOWED_LINK_HOSTS = ['hamdam.com.au', 'apple.com', 'support.apple.com', 'lifeline.org.au'];

/**
 * The domain the desk's own replies may hand out an address at, subdomains
 * included.
 *
 * Subdomains were excluded at first and links were not, which made the rule
 * disagree with itself: `support.apple.com` was a fine host to link to and
 * `anyone@support.hamdam.com.au` was a forgery. There is no version of this
 * where the desk's own subdomain is less trustworthy than Apple's.
 */
const ALLOWED_EMAIL_DOMAIN = 'hamdam.com.au';

// Deliberately looser than a URL parser, because the job is to notice a link,
// not to resolve one. A bare "evil.example/reset" with no scheme is still a
// thing a requester will type into a browser, so it has to count.
//
// The schemeless half ends `\.[a-z]{2,}\/`, which is to say it insists the
// last label before the slash looks like a top level domain. Without that it
// only asked for "labels, a dot, a slash", and the sentences a support desk
// writes are full of those: "this affects iOS 17.4/17.5", "fixed in 2.1/2.2",
// "the ratio was 3.5/10". Every one of them was read as a hostname, failed the
// allow-list, and silently threw away the model's whole answer. A hostname's
// last label is alphabetic in every case that matters, and a numeric address
// like `http://192.0.2.1/x` is still caught by the scheme half above.
const URL_PATTERN =
  /\b(?:https?:\/\/|www\.)[^\s<>()[\]{}"']+|\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}\/[^\s<>()[\]{}"']*/gi;
const EMAIL_PATTERN = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi;

function hostOf(candidate: string): string | null {
  const withScheme = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  try {
    const host = new URL(withScheme).hostname.toLowerCase();
    // A trailing dot is a legal fully qualified name and is not how any of
    // the allowed hosts are written, so it would otherwise be a free bypass.
    return host.replace(/\.$/, '');
  } catch {
    return null;
  }
}

function hostIsAllowed(host: string): boolean {
  return ALLOWED_LINK_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

/** Every address written anywhere in a block of text, folded for comparison. */
function addressesIn(text: string): Set<string> {
  return new Set((text.match(EMAIL_PATTERN) ?? []).map((address) => address.toLowerCase()));
}

function emailIsAllowed(address: string, fromTheThread: ReadonlySet<string>): boolean {
  const lower = address.toLowerCase();
  const domain = lower.slice(lower.lastIndexOf('@') + 1);
  if (domain === ALLOWED_EMAIL_DOMAIN || domain.endsWith(`.${ALLOWED_EMAIL_DOMAIN}`)) return true;
  // Not a new address, then. It is one the requester already put on this
  // ticket, being read back to them.
  return fromTheThread.has(lower);
}

/**
 * Whether a model-written reply hands the requester a link or an address the
 * desk does not publish.
 *
 * This is the control the prompt cannot be trusted to enforce. The body of a
 * reply is composed by a language model that has just read text a stranger
 * wrote, and the highest-value thing that text can ask for is a sentence like
 * "reset your password at hamdam-support.example" or "email
 * billing@hamdam-help.example" arriving in a message the requester already
 * believes, because it came from their support desk and is signed by the
 * domain. Everything else the model gets wrong costs somebody time; this one
 * costs them a credential.
 *
 * An allow-list rather than a block-list, because the set of hosts the desk
 * legitimately links to is four items long and the set of hostile ones is
 * every other name that exists.
 *
 * `threadText` is the requester's own words on this ticket, and it exists
 * because the first version of this check had no notion of them and broke the
 * most ordinary sentence a support desk writes. "I will follow up at
 * jane@gmail.com, as you asked" is not the desk introducing a new address, it
 * is the desk repeating one the requester supplied two messages ago, and
 * throwing the reply away over it made the assistant unable to confirm a
 * detail back to the person who gave it. So an address is allowed when it is
 * the desk's own domain, or when that exact address is already written
 * somewhere in the thread being answered. Nothing new gets introduced either
 * way, which is the property actually being defended.
 *
 * What this does not catch, stated because the comment here used to claim
 * otherwise: a hostname mentioned with no scheme, no `www.` and no path.
 * "See evil.example" goes through. Catching it would mean treating any two
 * dotted labels as a host, and support replies are full of `Info.plist`,
 * `config.json` and `Node.js`, so the cure is worse. The scheme, the `www.`
 * and the path are what make a string something a requester can act on
 * without retyping it, and those are the ones that matter.
 *
 * A false positive here is not free but it is survivable: the reply is
 * replaced by the deterministic one and the requester still gets an answer,
 * just a plainer one, with the reason recorded on the ticket.
 */
export function carriesUnapprovedContact(body: string, threadText = ''): boolean {
  const fromTheThread = addressesIn(threadText);

  for (const match of body.match(EMAIL_PATTERN) ?? []) {
    if (!emailIsAllowed(match, fromTheThread)) return true;
  }

  for (const match of body.match(URL_PATTERN) ?? []) {
    // An address already cleared above would otherwise be re-read here as a
    // hostname with a local part stuck to the front of it.
    if (match.includes('@')) continue;
    const host = hostOf(match);
    if (host === null || !hostIsAllowed(host)) return true;
  }

  return false;
}

/** Why a given reply came out the way it did. Written to the agent state. */
function reasonFor(reply: ModelReply): string {
  const source = reply.articleId
    ? `article "${reply.articleId}"`
    : reply.referenceId
      ? `app reference "${reply.referenceId}"`
      : 'general knowledge';
  return `model ${reply.action} from ${source}`;
}

export async function composeAssistantReplyLive(
  input: AssistantReplyInput,
  opts: LiveReplyOptions,
  articles: readonly KbArticle[] = KB_ARTICLES,
): Promise<AssistantReply> {
  // The fallback, with a note about why it fired. The note is written to the
  // ticket's agent state and shows in the console, because "the assistant
  // answered from keywords" and "the assistant tried and could not" look
  // identical to a requester and should not look identical to an agent.
  const deterministic = (note?: string): AssistantReply => {
    const reply = composeAssistantReply(input, articles);
    return note ? { ...reply, reason: `${reply.reason} (${note})` } : reply;
  };

  // Non-negotiable, and checked here rather than asked of the model. A
  // prompt can be talked out of a rule; an if statement cannot.
  if (requestedAHuman(input.conversationText)) return deterministic();
  if (input.priority === 'P1' || input.priority === 'P2') return deterministic();
  if (input.assistantTurns >= MAX_ASSISTANT_TURNS) return deterministic();
  if (!opts.ai) return deterministic();

  // The budget check sits with the guards rather than inside the model
  // module, because running out of money is a policy outcome, not an API
  // error. Anything that throws here spends nothing and answers anyway.
  try {
    if (opts.claim && !(await opts.claim())) return deterministic("today's model budget is spent");
  } catch {
    return deterministic('budget check failed');
  }

  const available = articles.filter((a) => !input.rejectedArticles.includes(a.id));
  const rejectedTitles = articles.filter((a) => input.rejectedArticles.includes(a.id)).map((a) => a.title);

  let reply: ModelReply | null = null;
  try {
    reply = await (opts.generate ?? generateModelReply)(opts.ai, {
      priority: input.priority,
      ticketSubject: opts.ticketSubject,
      turns: opts.turns,
      articles: available,
      askedQuestions: input.askedQuestions,
      rejectedTitles,
      alreadyEscalated: input.alreadyEscalated,
      locale: input.locale,
    });
  } catch (error) {
    // Timeout, busy inference queue, allocation exhausted, outage. All the
    // same from here: the requester still gets an answer this request, just
    // a plainer one. Logged because a silently degraded desk looks exactly
    // like a working one, and the day the allocation runs out should not be
    // something anyone has to infer from the tone of the replies.
    const message = error instanceof Error ? error.message : String(error);
    console.warn('assistant: model call failed', message);
    return deterministic(`model call failed: ${message.slice(0, 160)}`);
  }

  if (!reply) return deterministic('model returned nothing');

  // Before the action branches, not inside one of them.
  //
  // Where a check sits decides what it covers, and this one has to cover
  // everything the model wrote. An escalation body and a clarifying question
  // are read by the requester exactly as attentively as an answer is, and a
  // planted link is if anything more convincing inside "a person is picking
  // this up, in the meantime see ..." than inside a set of steps. Putting
  // this above the branches means a future fourth action inherits it rather
  // than quietly not having it.
  // The question as well as the body, because the question is not a summary
  // of the body: it is a separate field the model fills in, it is stored on
  // the ticket, and `assistantClarifyingEmail` renders it into the email on
  // its own line in bold. Checking only the body left the one field that gets
  // the requester's full attention unchecked.
  //
  // `conversationText` is the subject plus every requester message on this
  // ticket, which is exactly the set of words the requester has written here.
  // Passing it lets the check tell "the desk is introducing an address" apart
  // from "the desk is repeating one you gave it", and only the first of those
  // is the attack.
  const threadText = input.conversationText;
  if (carriesUnapprovedContact(reply.body, threadText) || carriesUnapprovedContact(reply.question ?? '', threadText)) {
    console.warn('assistant: model reply carried an unapproved link or address; using the deterministic reply');
    return deterministic('model reply carried a link or address the desk does not publish');
  }

  // A question about Hamdam answered from general knowledge is a guess about
  // someone else's product, dressed as support.
  //
  // Live, this produced two confident wrong answers to "where do I buy
  // Hamdam Plus": first the App Store *restore* flow, which is a different
  // thing entirely, then "go to the app's settings or a similar section
  // where purchases are usually available, however the exact steps may
  // vary". The second one is the model telling you it does not know, in a
  // register that reads as if it does.
  //
  // The prompt already said not to. Prompts are advice. This is the rule:
  // on a Hamdam ticket, an answer must come from a reviewed article or from
  // the app reference, or it is not an answer. Asking a clarifying question
  // is still fine, since a question asserts nothing.
  //
  // Escalations are held to the same rule, which they were not. The prompt
  // asks for a full escalation: say everything you do know, then say which
  // part you do not have and that a person is picking it up. That is the
  // right instruction and it means an escalation body carries Hamdam claims
  // in it, written in the same confident register as an answer, with a
  // handover sentence at the end that a requester reads as reassurance
  // rather than as a caveat on the paragraph above. Sourcing "answer" only
  // let every unsourced product claim through as long as the model attached
  // a handover to it. 'ask' stays exempt, because a question still asserts
  // nothing.
  if (input.topic === 'hamdam' && reply.action !== 'ask' && !reply.articleId && !reply.referenceId) {
    return {
      body: strings(input.locale ?? 'en').replyHamdamUnsourced,
      action: 'escalate',
      reason: 'model answered a Hamdam question from general knowledge; refused',
      escalated: true,
    };
  }

  if (reply.action === 'escalate') {
    return {
      body: reply.body,
      action: 'escalate',
      articleId: reply.articleId ?? undefined,
      reason: reasonFor(reply),
      escalated: true,
    };
  }

  if (reply.action === 'ask') {
    return {
      body: reply.body,
      action: 'ask_clarifying',
      articleId: reply.articleId ?? undefined,
      question: reply.question ?? undefined,
      reason: reasonFor(reply),
      escalated: false,
    };
  }

  return {
    body: withProvenance(reply, input.locale ?? 'en'),
    action: 'send_solution',
    articleId: reply.articleId ?? undefined,
    reason: reasonFor(reply),
    escalated: false,
  };
}
