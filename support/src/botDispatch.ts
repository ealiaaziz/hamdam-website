import type { Env } from './types.js';
import { ticketPublicId } from './ids.js';
import { addComment, getBotChange, recordApproval, recordDispatch, recordRefusal } from './db.js';
import { consumeRateLimit } from './rateLimit.js';
import { runDispatchGate } from './dispatch.js';
import { commentOnIssue, canReachRepo, openIssue, postApproval } from './github.js';
import { isOwner } from './owner.js';
import { approvalVerdict, approvesChange } from './changeApproval.js';

/**
 * The side of the change flow that has effects: opening the issue, relaying
 * her later messages onto it, and recording her answer.
 *
 * Kept out of ingest.ts because that file is already the longest thing here
 * and this is a distinct job. The decisions themselves are elsewhere and pure:
 * dispatch.ts says whether to dispatch, changeApproval.ts says what a reply
 * means, and owner.ts says who she is. This file only sequences them.
 *
 * Nothing in here throws. It runs inside the ingest loop, where an exception
 * stops the batch and, because the checkpoint only advances on a clean pass,
 * the same message returns every minute forever. One email stopped all email
 * that way in August. A failure here is written to the ticket and the message
 * carries on being an ordinary support ticket, which is a working desk with a
 * feature missing rather than a broken one.
 */

export interface InboundFacts {
  ticketId: number;
  subject: string;
  body: string;
  fromEmail: string;
  senderAuthenticated: boolean;
}

/**
 * Consider a new ticket for dispatch, and open the issue if it qualifies.
 *
 * Every outcome writes a system comment, including the refusals. "She wrote
 * in and nothing happened" has to be answerable from the ticket a week later
 * without re-deriving it from mail logs, and the reasons are the difference
 * between a desk that declined and a desk that broke.
 *
 * Returns whether the bot flow now owns this ticket, which the caller uses to
 * keep the ordinary assistant out of it. The two must not both answer: the
 * assistant is grounded in a knowledge base about the iOS app and holds no
 * article about the Telegram bot, so on a bot report it can only say
 * something generic or hand over to a person, and both are wrong here. The
 * next thing she should hear is the change itself, in Farsi, from the
 * follow-up pass.
 */
export async function maybeDispatch(env: Env, facts: InboundFacts): Promise<boolean> {
  try {
    // Fails closed, unlike the console's ADMIN_EMAILS which deliberately fails
    // open when unset. Opposite defaults, opposite consequences: an unset
    // console allowlist admits whoever Cloudflare Access already admits, and
    // an unset owner list here would let any authenticated sender put an agent
    // on the repository. Unconfigured means nobody.
    const senderIsOwner = isOwner(env, facts.fromEmail);
    if (!senderIsOwner && !facts.senderAuthenticated) return false;

    const decision = await runDispatchGate(
      {
        senderAuthenticated: facts.senderAuthenticated,
        senderIsOwner,
        text: `${facts.subject}\n${facts.body}`,
      },
      async () => (await consumeRateLimit(env.DB, 'agent_dispatch', facts.fromEmail)).count,
    );

    if (!decision.dispatch) {
      // Only the cases that mean something to a person reading the ticket. A
      // stranger writing in about anything is the ordinary case and does not
      // need a note saying the desk declined to rebuild the bot for them.
      if ('suspicious' in decision) {
        await addComment(env.DB, facts.ticketId, 'system', null, `Dispatch refused: ${decision.reason}`);
      } else if (senderIsOwner && facts.senderAuthenticated) {
        await addComment(env.DB, facts.ticketId, 'system', null, `Not dispatched: ${decision.reason}`);
      }
      return false;
    }

    if (!canReachRepo(env)) {
      await addComment(env.DB, facts.ticketId, 'system', null, 'Would have dispatched, but GITHUB_TOKEN and GITHUB_REPO are not set.');
      return false;
    }

    const result = await openIssue(env, {
      ticketPublicId: ticketPublicId(facts.ticketId),
      subject: facts.subject,
      body: facts.body,
      locale: 'fa',
    });

    if (!result.ok) {
      await addComment(env.DB, facts.ticketId, 'system', null, `Dispatch failed: ${result.reason}`);
      return false;
    }

    await recordDispatch(env.DB, facts.ticketId, result.value.number);
    await addComment(
      env.DB,
      facts.ticketId,
      'system',
      null,
      `Dispatched to the bot repository as issue #${result.value.number}: ${result.value.html_url}. `
        + 'The assistant stands down on this ticket: it answers from articles about the app and '
        + 'holds none about the bot, so the next message here is the change itself.',
    );
    return true;
  } catch (error) {
    await noteFailure(env, facts.ticketId, error);
    return false;
  }
}

/**
 * A later message on a ticket that has already dispatched.
 *
 * Two things can be true of the same reply and both are handled: it may
 * answer the change last put to her, and it may say something the agent needs
 * to see. A "بله، ولی دکمه هنوز اشتباه است" is an approval and a bug report.
 *
 * Returns whether the bot flow owns this ticket, for the same reason
 * maybeDispatch does: the assistant must not also answer here. Her reply on a
 * dispatched ticket is an answer to a question the desk asked, and an article
 * about the app is not a response to it.
 */
export async function relayReply(env: Env, facts: InboundFacts): Promise<boolean> {
  try {
    const change = await getBotChange(env.DB, facts.ticketId);
    if (!change) return false;

    // The same two locks as the dispatch itself. A ticket that has dispatched
    // is a ticket where a reply can approve a deploy, so the sender of that
    // reply has to be the owner and Exchange has to have said so. The ticket
    // id in the subject is a routing hint and never a credential.
    if (!facts.senderAuthenticated || !isOwner(env, facts.fromEmail)) return false;

    if (change.pending_change_ref) {
      const verdict = approvalVerdict(facts.body);
      if (verdict === 'refused') {
        await recordRefusal(env.DB, facts.ticketId);
        await addComment(env.DB, facts.ticketId, 'system', null, `Owner refused ${change.pending_change_ref}.`);
      } else if (approvesChange(facts.body, change.pending_change_ref)) {
        const took = await recordApproval(env.DB, facts.ticketId, change.pending_change_ref);
        await addComment(
          env.DB,
          facts.ticketId,
          'system',
          null,
          took
            ? `Owner approved ${change.pending_change_ref}.`
            : `Approval did not apply: ${change.pending_change_ref} is no longer the pending change.`,
        );

        // Only once the database agrees, and only with the sha that was put to
        // her. `took` is false when the pending change moved underneath the
        // reply, and telling the repository she approved something the desk
        // itself refused to record is how the two sides drift apart.
        if (took && change.pr_number && change.head_sha && canReachRepo(env)) {
          const posted = await postApproval(
            env,
            change.pr_number,
            change.head_sha,
            change.pending_change_ref,
          );
          if (!posted.ok) {
            await addComment(
              env.DB,
              facts.ticketId,
              'system',
              null,
              `Approval recorded but not delivered to the repository: ${posted.reason}. It will not merge until this is retried.`,
            );
          }
        }
      }
    }

    if (change.issue_number && canReachRepo(env)) {
      const relayed = await commentOnIssue(env, change.issue_number, facts.body);
      if (!relayed.ok) {
        await addComment(env.DB, facts.ticketId, 'system', null, `Relay to issue #${change.issue_number} failed: ${relayed.reason}`);
      }
    }

    return true;
  } catch (error) {
    await noteFailure(env, facts.ticketId, error);
    return false;
  }
}

/**
 * Write the failure where somebody will see it, and swallow it.
 *
 * Swallowing is right here and only here: this feature failing must not take
 * the mail path down with it. The comment is what stops that being silent.
 */
async function noteFailure(env: Env, ticketId: number, error: unknown): Promise<void> {
  const reason = error instanceof Error ? error.message : String(error);
  try {
    await addComment(env.DB, ticketId, 'system', null, `Bot dispatch error: ${reason}`);
  } catch {
    console.error('botDispatch: could not record failure', reason);
  }
}
