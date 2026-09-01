import type { Env } from './types.js';
import type { NewOutboundEmail } from './db.js';
import {
  clearAgentOutcome,
  getBotChange,
  getTicketById,
  addComment,
  markDeployed,
  mayDeploy,
  proposeChange,
  recordAgentOutcome,
  ticketsAwaitingBotFollowUp,
  type BotChangeRow,
} from './db.js';
import { changeRef } from './changeApproval.js';
import {
  canReachRepo,
  deployStateFor,
  getPull,
  listIssueComments,
  parseAgentOutcome,
  parseAgentReport,
  parseHeldReason,
  type IssueComment,
} from './github.js';
import { ticketPublicId } from './ids.js';
import {
  agentBlockedEmail,
  agentQuestionEmail,
  changeHeldEmail,
  changeProposalEmail,
  changeShippedEmail,
} from './render/botEmail.js';

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
export type SendEmail = (email: NewOutboundEmail) => Promise<boolean>;

/**
 * How long a send may keep failing before the desk stops retrying it.
 *
 * An hour, measured from when the desk first had something to tell her. Long
 * enough to ride out a Graph outage or a D1 blip, short enough that an address
 * which will never accept mail does not write one dead outbound row a minute
 * until somebody notices. What stops after an hour is the retrying; the ticket
 * keeps the failure and the reason, which is where a person looks.
 */
const RETRY_SEND_FOR_MS = 60 * 60_000;

/**
 * How long a merged change may go without a confirmed deploy before she hears
 * about the wait itself.
 *
 * Fifteen minutes. The deploy runs typecheck, the full suite and the
 * migrations before it publishes, so several minutes is ordinary and saying
 * anything sooner would be noise. Past that, not knowing is the news.
 */
const CONFIRM_DEPLOY_WITHIN_MS = 15 * 60_000;

export interface FollowUpSummary {
  /** Tickets with a change in flight, whether or not this pass did anything. */
  watching: number;
  proposed: number;
  shipped: number;
  failures: number;
}

export async function followUpBotChanges(env: Env, send: SendEmail): Promise<FollowUpSummary> {
  const summary: FollowUpSummary = { watching: 0, proposed: 0, shipped: 0, failures: 0 };
  if (!canReachRepo(env)) return summary;

  const ticketIds = await ticketsAwaitingBotFollowUp(env.DB);
  summary.watching = ticketIds.length;

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
  if (!report) {
    // No pull request, which is not the same as nothing happened. The agent
    // asks when her request is not specific enough to build from, and stands
    // down when the thing should not be done at all. Either has to reach her:
    // an acknowledgement followed by silence is the complaint this whole flow
    // was built to answer, and a feature request used to end exactly there.
    await relayOutcome(env, send, ticketId, change, comments.value, summary);
    return;
  }
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

  // Approved and not merged is a state this pass used to have no name for. It
  // returned here and waited, every minute, for a merge that in one real case
  // was never coming: the merge guard had declined the change on purpose and
  // said so on the pull request, which she has no reason to open. She asked
  // twice whether it had been applied. Silence on a change she authorised is
  // the same failure as silence on a change she asked for, and it is not
  // allowed either.
  if (!pull.value.merged) {
    await relayHeld(env, send, ticketId, change, summary);
    return;
  }

  // Merging is not shipping. This used to send "it is live" the moment the
  // pull request merged, which is true only while the deploy that follows
  // succeeds. A merge that lands and a deploy that then fails would have told
  // her a change was on the bot when it was not, and she would have gone and
  // tested behaviour that does not exist. Telling her something false is
  // worse than telling her nothing.
  const deployed = await deployStateFor(env, pull.value.merge_commit_sha ?? '');
  if (!deployed.ok) {
    summary.failures += 1;
    return;
  }

  if (deployed.value !== 'success') {
    // A deploy that failed is hers to hear about immediately. One that has
    // not answered yet is ordinary for the first minutes after a merge, so it
    // is left alone until the wait itself is the news.
    const waited = Date.now() - Date.parse(pull.value.merged_at ?? '') > CONFIRM_DEPLOY_WITHIN_MS;
    if (deployed.value === 'failed') await tellHeld(env, send, ticketId, 'DEPLOY_FAILED', summary);
    else if (waited) await tellHeld(env, send, ticketId, 'DEPLOY_NOT_CONFIRMED', summary);
    return;
  }

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

/**
 * Send her the agent's question, or its reason for not building.
 *
 * Sent once. `recordAgentOutcome` only reports true when the text differs from
 * what was last sent, so the minute cron does not mail her the same question
 * sixty times an hour, while a genuinely new question still gets through.
 *
 * Recorded before the send, for the reason markDeployed is: a send that fails
 * leaves a note on the ticket that a person can act on, and recording after a
 * failure would retry every minute forever.
 */
async function relayOutcome(
  env: Env,
  send: SendEmail,
  ticketId: number,
  change: BotChangeRow,
  comments: readonly IssueComment[],
  summary: FollowUpSummary,
): Promise<void> {
  const outcome = parseAgentOutcome(comments);
  if (!outcome) return;

  const fresh = await recordAgentOutcome(env.DB, ticketId, `${outcome.kind}:${outcome.text}`);
  if (!fresh) return;

  const ticket = await getTicketById(env.DB, ticketId);
  const email = outcome.kind === 'ask'
    ? agentQuestionEmail({ ticketId, question: outcome.text })
    : agentBlockedEmail({ ticketId, reason: outcome.text });

  const sent = await send({
    ticketId,
    commentId: null,
    kind: 'agent_reply',
    toEmail: ticket?.requester_email ?? '',
    subject: email.subject,
    bodyHtml: email.html,
    inReplyToMessageId: null,
  });

  if (!sent) {
    summary.failures += 1;

    // The mark says she has been told. She has not, so it comes off and the
    // next pass tries again, unless this has been failing long enough that
    // retrying is just writing dead rows. Either way the ticket says so out
    // loud: the failed outbound row alone is a thing nobody is looking at.
    const firstTried = Date.parse(change.last_outcome_at ?? '');
    const giveUp = Number.isFinite(firstTried) && Date.now() - firstTried > RETRY_SEND_FOR_MS;

    if (!giveUp) await clearAgentOutcome(env.DB, ticketId);
    await addComment(
      env.DB,
      ticketId,
      'system',
      null,
      giveUp
        ? 'Could not email the owner the agent\u2019s message, and have stopped retrying. She has not been told; somebody needs to send it.'
        : 'Could not email the owner the agent\u2019s message. Will try again on the next pass.',
    );
    return;
  }

  await addComment(
    env.DB,
    ticketId,
    'system',
    null,
    outcome.kind === 'ask'
      ? 'Asked the owner a question from the agent; nothing changes until she answers.'
      : 'Told the owner this will not be built, with the reason.',
  );
  summary.proposed += 1;
}

/**
 * Tell her a change she approved is stuck, once, with the reason.
 *
 * Deduplicated through `last_outcome` like the agent's questions are, so the
 * minute cron does not mail her the same holdup repeatedly, while a genuinely
 * different one still gets through. Recorded before the send for the reason
 * everything here is: a failed send that had already been recorded would go
 * quiet forever, so `relayOutcome`'s rollback applies to this too.
 */
async function relayHeld(
  env: Env,
  send: SendEmail,
  ticketId: number,
  change: BotChangeRow,
  summary: FollowUpSummary,
): Promise<void> {
  if (!change.pr_number) return;

  const comments = await listIssueComments(env, change.pr_number);
  if (!comments.ok) {
    summary.failures += 1;
    return;
  }

  const reason = parseHeldReason(comments.value);
  if (!reason) return;

  await tellHeld(env, send, ticketId, reason, summary);
}

/**
 * Tell her, once, that an approved change has not been applied, and why.
 *
 * Shared by the two things that can hold one: the merge guard standing down,
 * and a deploy that did not succeed. Deduplicated through `last_outcome` like
 * the agent's questions, and rolled back on a failed send for the same reason,
 * so a holdup she was never actually told about is retried rather than
 * recorded as delivered.
 */
async function tellHeld(
  env: Env,
  send: SendEmail,
  ticketId: number,
  reason: string,
  summary: FollowUpSummary,
): Promise<void> {
  const fresh = await recordAgentOutcome(env.DB, ticketId, `held:${reason}`);
  if (!fresh) return;

  const ticket = await getTicketById(env.DB, ticketId);
  const email = changeHeldEmail({ ticketId, reason });

  const sent = await send({
    ticketId,
    commentId: null,
    kind: 'status_change',
    toEmail: ticket?.requester_email ?? '',
    subject: email.subject,
    bodyHtml: email.html,
    inReplyToMessageId: null,
  });

  if (!sent) {
    summary.failures += 1;
    await clearAgentOutcome(env.DB, ticketId);
    await addComment(env.DB, ticketId, 'system', null, 'Could not tell the owner her approved change is held. Will try again.');
    return;
  }

  await addComment(env.DB, ticketId, 'system', null, `Told the owner her approved change is held: ${reason}`);
  summary.proposed += 1;
}
