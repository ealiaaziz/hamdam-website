# Solution engine: design

An assistant that reads a ticket, finds a known answer, and talks the
requester through it -- asking for more detail when the picture is
incomplete, and handing over to a person when it should.

Status: **live on the portal, draft-first for email.** The portal answers
requesters immediately. Email replies are drafted for a person to approve
before they go out.

## What it is for

Most of a small desk's volume is the same handful of problems. A requester
writes in, waits, and eventually gets an answer someone has typed twenty
times before. If the desk already knows the answer, the requester should
have it in the first reply.

The cases worth automating are the low-severity ones: P3 and P4. They are
the bulk of the queue, the least damaging to get wrong, and the most
tedious for a human. P1 and P2 are the opposite on all three counts.

## Why this is not just "let the model reply"

The desk receives email from anyone. That email becomes input to a model
that holds database access, an email sender, and the requester's trust.
Three specific ways that goes wrong:

**It invents an answer.** A model asked "how do I fix X" will produce
confident instructions whether or not it knows. On a support desk those
instructions carry the desk's authority, arrive by email, and get followed.
"Delete the folder and reinstall" is a plausible sentence and a bad day.

**It follows the email instead of reading it.** This codebase has already
been bitten: the routine read a documentation file and carried out
instructions meant for a human. That was our own prose being obeyed. An
inbound email is the same shape of input, written by someone who may be
trying.

**It answers the wrong person.** The agent has read access to every ticket.
A reply assembled from the wrong ticket's context leaks one requester's
information to another.

The design answers each of these with a constraint rather than a
disposition, because a constraint holds when the model is having an off day.

## Shape

```
inbound email
     |
  classify (existing)  -> P1/P2 -> acknowledge, escalate, stop
     |
    P3/P4
     |
  match against the knowledge base (support/kb/*.md)
     |
  policy decides: solve | ask | escalate
     |
  draft reply  ->  [approval gate]  ->  send
     |
  requester replies -> loop, up to a turn limit
```

Four pieces, three of which are built:

* **Knowledge base** (`support/kb/*.md`, built): markdown articles, one per
  known problem, with the symptoms that identify it and the steps that fix
  it. Lives in the repo so an answer is reviewed like code, improves by pull
  request, and has history. Generated into `src/data/kb.ts` so the console
  can suggest articles too, the same pattern this repo already uses for the
  verse bank.
* **Matcher** (`src/kb.ts`, built): scores a ticket against articles by
  symptom overlap. Deliberately dull -- keyword scoring with a confidence
  threshold, not a model. Its job is to answer "do we already know this?",
  and a wrong yes is expensive.
* **Policy** (`src/agentPolicy.ts`, built): given a ticket, a match and the
  conversation so far, returns one of solve, ask, escalate. Pure, exhaustive
  and tested, so what the assistant is allowed to do is legible in one file
  rather than emergent from a prompt.
* **Composer** (not built): turns the chosen action into words. This is the
  only part that needs a model, and only for phrasing -- the *content* comes
  from the matched article.

That last split is the important one. The model chooses none of the facts.
It writes an article the desk has already reviewed into a sentence that fits
this requester's situation. If no article matches, there is nothing to
phrase and the ticket goes to a human.

## The rules, concretely

Encoded in `src/agentPolicy.ts`, in order:

1. **Requester asked for a person** -- any of "speak to a human", "real
   person", "stop replying" -- escalate immediately. Always available, never
   overridden.
2. **P1 or P2** -- escalate. The assistant never handles severe tickets,
   whatever it thinks it knows.
3. **Turn limit reached** (default 3 exchanges) -- escalate. A conversation
   going nowhere should reach a person by a fixed deadline rather than when
   the model gives up.
4. **Confident match** -- propose the solution.
5. **Partial match** -- ask one clarifying question drawn from the
   candidate articles.
6. **No match** -- escalate. Silence from the assistant, not a guess.

Escalation is not failure. It is the expected outcome for anything the desk
has not written down, and the queue is where those belong.

## What the assistant may never do

Enforced in the composer's instructions and reviewable in the draft:

* invent a step that is not in the matched article
* send anything on a P1 or P2 ticket
* email anyone except the requester on the ticket it is working
* include commands that delete data, change credentials, or move money
* quote another ticket
* claim a human has looked at it when none has

## Two speeds, and the portal is the fast one

The engine's matching and policy are pure bundled code with no model in
them, so a portal request can be answered **inside the same HTTP response**.
A requester on the tracking page sees a candidate answer immediately, while
they are still looking at the screen.

Only email is slow. The routine polls hourly, so an emailed exchange -- ask,
answer, respond -- takes at least two hours, and the turn limit means a
conversation can run most of a day. That is tolerable for "how do I change
my reminder time" and useless for anything pressing.

So the two channels get different treatment, for reasons that follow from
the mechanism rather than from taste:

| | Portal | Email |
|---|---|---|
| Speed | immediate | next hourly poll |
| Suggestion shown | on the page | as a drafted reply |
| Approval needed | no | yes, a person presses send |
| Requester can object | one click, right there | only by replying |

The portal needs no approval gate because nothing is sent. The requester
asked, is present, sees the suggestion framed as a suggestion, and has a
"this did not help" control with the same visual weight as the one that
accepts it. A wrong article costs them ten seconds. A wrong *email* costs
an apology, which is why that path keeps the human in it.

The acknowledgement email now says this plainly -- that the tracking page
answers straight away -- so requesters who want speed know where to get it.
That is the honest way to sell it: not "our AI replies instantly", but
"the page can answer now, the mailbox takes an hour".

### Recording that it did not help

The "this did not help" click is the most valuable signal the engine
produces, and it is stored as a system comment on the ticket. Resolutions
tell you the desk is working; rejections tell you which article is wrong or
missing, which is what turns into the next pull request.

## GitHub, concretely

Two integrations, both earning their place:

* **The knowledge base is the repo.** Articles are reviewed, versioned and
  improved through pull requests. When the assistant escalates for want of
  an article, the fix is a PR adding one -- so the desk gets better at a
  visible rate rather than in someone's head.
* **Tickets that are bugs become issues.** When a ticket is a defect rather
  than a question, an agent turns it into a GitHub issue linked to the
  ticket, so the fix and the reported symptom stay connected. Agent-initiated
  by design: deciding "this is a bug" is judgement, and filing issues
  automatically produces a graveyard of duplicates.

## The decision you have to make

**Does a drafted reply go out on its own, or does a person press send?**

|  | Draft first (recommended to start) | Auto-send |
|---|---|---|
| Requester waits | until an agent approves | one poll cycle |
| A wrong answer | caught in the console | arrives in their inbox |
| Your effort | one click per reply | none |
| Undo | delete the draft | an apology |

I would start in draft mode for a fortnight. It costs a click and it shows
you exactly what the assistant would have sent, on real tickets, before any
of it reaches a person. If the drafts are consistently right, moving P4 to
auto-send is a one-line config change, then P3 later.

Starting the other way round means finding out from a requester.

The mode is a Worker variable, not a code change, so it flips without a
deploy and can be flipped back as fast.

## Built, and not

| Piece | State |
|---|---|
| Knowledge base format and starter articles | built |
| Generator into `src/data/kb.ts` | built |
| Matcher with confidence scoring | built, tested |
| Policy engine | built, tested |
| Conversation state schema (0003) | built |
| Draft status on outbound email (0004) | built |
| **Portal suggestions, answered live** | **built, deployed** |
| "This did not help" feedback capture | built |
| Email drafting into the queue | not started |
| Console draft review and approval | not started |
| GitHub issue creation from a ticket | not started |
