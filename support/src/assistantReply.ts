import { decideAgentAction, type AgentContext } from './agentPolicy.js';
import { matchArticles, KB_ARTICLES, type KbArticle } from './kb.js';

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

  // Everything else is an escalation, and each variety gets its own wording.
  // A requester told "a person will pick this up" after asking for a person
  // has been heard; one told the same after a failed suggestion has not,
  // unless we say plainly that we do not know the answer.
  const exhausted = input.rejectedArticles.length > 0;
  const body = exhausted
    ? "I have run out of things I know to try for this one, so I am handing it to a person on the team. They can see everything you have written here, so you will not need to repeat yourself."
    : "I do not have a written answer for this one, so I am passing it to a person on the team rather than guessing. They can see this whole conversation.";

  return { body, action: 'escalate', reason: decision.reason, escalated: true };
}
