import type { Env } from './types.js';
import type { NewOutboundEmail } from './db.js';
import {
  getBotChange,
  getTicketById,
  addComment,
  markDeployed,
  mayDeploy,
  proposeChange,
  ticketsAwaitingBotFollowUp,
  type BotChangeRow,
} from './db.js';
import { changeRef } from './changeApproval.js';
import { canReachRepo, getPull, listIssueComments, parseAgentReport } from './github.js';
import { ticketPublicId } from './ids.js';
import { changeProposalEmail, changeShippedEmail } from './render/botEmail.js';

/**
 * The half of the change flow that nobody's email triggers.
 *
 * Two things happen away from the mailbox: the agent opens a pull request, and
 * a merge deploys it. Neither sends the desk anything, so the desk goes and
 * looks, on the cron it already runs every minute.
 *
 * Polling rather than a webhook on purpose. A webhook means a new public route
 * on a Worker whose only public surface is currently the portal, and a signing
 * secret to verify it, in exchange for saving up to sixty seconds on a flow
 * whose other steps are a person reading an email. The cheaper thing is also
 * the smaller attack surface here.
 */

/**
 * How this pass sends mail.
 *
 * Passed in rather than imported, because the sender lives in ingest.ts and
 * carries the recipient ceiling, the copy to the developer and the failure
 * bookkeeping with it. Reaching into that file from here would either
 * duplicate those or skip them, and skipping them is how a path that "just
 * sends one email" becomes the one path with no limit on it.
 */
export type SendEmail = (email: NewOutboundEmail) => Promise<void>;

export interface FollowUpSummary {
  proposed: number;
  shipped: number;
  failures: number;
}

export async function followUpBotChanges(env: Env, send: SendEmail): Promise<FollowUpSummary> {
  const summary: FollowUpSummary = { proposed: 0, shipped: 0, failures: 0 };
  if (!canReachRepo(env)) return summary;

  const ticketIds = await ticketsAwaitingBotFollowUp(env.DB);

  for (const ticketId of ticketIds) {
    try {
      const change = await getBotChange(env.DB, ticketId);
      if (!change) continue;

      if (mayDeploy(change)) await checkShipped(env, send, ticketId, change, summary);
      else await checkProposal(env, send, ticketId, change, summary);
    } catch (error) {
      summary.failures += 1;
      const reason = error instanceof Error ? error.message : String(error);
      console.error(`botFollowUp: ticket ${ticketId}: ${reason}`);
    }
  }

  return summary;
}

/**
 * Has the agent opened, or updated, a pull request we have not asked her about?
 *
 * Keyed on the head sha rather than on whether a proposal exists. A pull
 * request that moves after she was asked is a different change, and asking
 * again is the only honest thing to do: the alternative is her approval
 * standing over code she was never shown.
 */
async function checkProposal(
  env: Env,
  send: SendEmail,
  ticketId: number,
  change: BotChangeRow,
  summary: FollowUpSummary,
): Promise<void> {
  if (!change.issue_number) return;

  const comments = await listIssueComments(env, change.issue_number);
  if (!comments.ok) {
    summary.failures += 1;
    return;
  }

  const report = parseAgentReport(comments.value);
  if (!report) return;
  if (report.headSha === change.head_sha) return; // already asked about this one

  const ref = changeRef(ticketPublicId(ticketId), report.headSha);
  await proposeChange(env.DB, ticketId, {
    changeRef: ref,
    prNumber: report.prNumber,
    branch: null,
    headSha: report.headSha,
  });

  const ticket = await getTicketById(env.DB, ticketId);
  const email = changeProposalEmail({ ticketId, description: report.description, changeRef: ref });

  await send({
    ticketId,
    commentId: null,
    kind: 'agent_reply',
    toEmail: ticket?.requester_email ?? '',
    subject: email.subject,
    bodyHtml: email.html,
    inReplyToMessageId: null,
  });

  await addComment(env.DB, ticketId, 'system', null, `Asked the owner to approve ${ref} (PR #${report.prNumber}).`);
  summary.proposed += 1;
}

/** Has the change she approved actually merged? */
async function checkShipped(
  env: Env,
  send: SendEmail,
  ticketId: number,
  change: BotChangeRow,
  summary: FollowUpSummary,
): Promise<void> {
  if (!change.pr_number || change.deployed_at) return;

  const pull = await getPull(env, change.pr_number);
  if (!pull.ok) {
    summary.failures += 1;
    return;
  }
  if (!pull.value.merged) return;

  // Marked before the email, not after. A send that fails is a person not
  // told, which the ticket records and a person can fix; marking after a
  // failed send would have the desk try again every minute forever, and she
  // would get the same "it is live" email once a minute until somebody
  // noticed.
  await markDeployed(env.DB, ticketId);

  const ticket = await getTicketById(env.DB, ticketId);
  const comments = await listIssueComments(env, change.issue_number ?? change.pr_number);
  const description = comments.ok ? (parseAgentReport(comments.value)?.description ?? '') : '';
  const email = changeShippedEmail({ ticketId, description });

  await send({
    ticketId,
    commentId: null,
    kind: 'status_change',
    toEmail: ticket?.requester_email ?? '',
    subject: email.subject,
    bodyHtml: email.html,
    inReplyToMessageId: null,
  });

  await addComment(env.DB, ticketId, 'system', null, `${change.approved_ref} merged and deployed. Owner told.`);
  summary.shipped += 1;
}
