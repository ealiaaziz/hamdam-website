import { decideAgentAction, requestedAHuman, MAX_ASSISTANT_TURNS, type AgentContext } from './agentPolicy.js';
import { matchArticles, KB_ARTICLES, type KbArticle } from './kb.js';
import { generateModelReply, type ModelReply } from './assistantModel.js';

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
  // Rejection is the strongest signal short of leaving. An article the
  // requester has already turned down is out of the running entirely, not
  // merely ranked lower.
  const available = articles.filter((a) => !input.rejectedArticles.includes(a.id));
  const match = matchArticles(input.conversationText, available);
  const decision = decideAgentAction(input, match);

  if (decision.action === 'send_solution' && match.best) {
    return {
      body: `Thanks for the extra detail. This looks like it might be the one:\n\n${match.best.article.title}\n\n${stepsAsText(match.best.article)}\n\nIf that does not do it, say so and I will pass this to one of the team.`,
      action: 'send_solution',
      articleId: decision.articleId,
      reason: decision.reason,
      escalated: false,
    };
  }

  if (decision.action === 'ask_clarifying') {
    return {
      body: `Thanks, that helps. One more thing and I should be able to narrow it down:\n\n${decision.question}`,
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
      body: 'Thanks, I have added that to the ticket. It is already with a person on the team and they will see it, so there is nothing you need to do.',
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

  const body = exhausted
    ? 'I have run out of things I know to try for this one, so I am handing it to a person on the team. They can see everything you have written here, so you will not need to repeat yourself.'
    : 'That is outside what I have written down, so I am passing it to a person rather than guessing at an answer. They can see this whole conversation.';

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
function withProvenance(reply: ModelReply): string {
  if (reply.articleId) return reply.body;
  return `${reply.body}\n\nThat is general advice rather than something from our own notes on the app, so tell me if it does not match what you are seeing and I will pass it to a person.`;
}

/** Why a given reply came out the way it did. Written to the agent state. */
function reasonFor(reply: ModelReply): string {
  const source = reply.articleId ? `article "${reply.articleId}"` : 'general knowledge';
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

  if (!reply) return deterministic('model returned nothing usable');

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
    body: withProvenance(reply),
    action: 'send_solution',
    articleId: reply.articleId ?? undefined,
    reason: reasonFor(reply),
    escalated: false,
  };
}
