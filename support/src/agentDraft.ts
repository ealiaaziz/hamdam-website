import { decideAgentAction, type AgentContext } from './agentPolicy.js';
import { matchArticles, KB_ARTICLES, type KbArticle } from './kb.js';
import { assistantClarifyingEmail, assistantSolutionEmail } from './render/agentEmail.js';

// Turns a policy decision into a draft email, or into nothing.
//
// Kept separate from both the Worker and the routine so the same function
// produces the draft whichever channel triggered it, and so it can be tested
// without a database or a mailbox. The routine calls it through
// scripts/agent-draft.mjs; nothing here reaches for I/O.

export interface DraftProposal {
  kind: 'assistant_draft';
  action: 'send_solution' | 'ask_clarifying';
  articleId: string;
  reason: string;
  subject: string;
  bodyHtml: string;
  /** Present for clarifying drafts, so the turn is recorded and not repeated. */
  question?: string;
}

export interface DraftInput extends AgentContext {
  ticketId: number;
  ticketSubject: string;
  requesterName: string | null;
  trackingUrl: string;
}

/**
 * Returns a draft to queue, or null when the assistant should stay out of
 * it. Null covers every escalate case, and escalation is the common,
 * expected outcome rather than a failure -- anything the desk has not
 * written down belongs to a person.
 */
export function proposeDraft(input: DraftInput, articles: readonly KbArticle[] = KB_ARTICLES): DraftProposal | null {
  const match = matchArticles(input.conversationText, articles);
  const decision = decideAgentAction(input, match);

  if (decision.action === 'escalate') return null;
  if (match.best === null) return null;

  if (decision.action === 'send_solution') {
    const rendered = assistantSolutionEmail({
      ticketId: input.ticketId,
      subject: input.ticketSubject,
      article: match.best.article,
      requesterName: input.requesterName,
      trackingUrl: input.trackingUrl,
    });
    return {
      kind: 'assistant_draft',
      action: 'send_solution',
      articleId: decision.articleId,
      reason: decision.reason,
      subject: rendered.subject,
      bodyHtml: rendered.html,
    };
  }

  const rendered = assistantClarifyingEmail({
    ticketId: input.ticketId,
    subject: input.ticketSubject,
    question: decision.question,
    requesterName: input.requesterName,
    trackingUrl: input.trackingUrl,
  });
  return {
    kind: 'assistant_draft',
    action: 'ask_clarifying',
    articleId: decision.articleId,
    reason: decision.reason,
    subject: rendered.subject,
    bodyHtml: rendered.html,
    question: decision.question,
  };
}
