# Hamdam Marketing Pipeline

Two scheduled Cowork tasks, one review gate, one human approval step. Nothing publishes without Ealia or Sima acting.

    Monday 07:00  MASTER task (strongest model)
        reads: FACTS.md, Search Console, repo state, queue backlog
        writes: marketing/briefs/YYYY-MM-DD.md to main
    Monday 12:00  CHANNEL task (Sonnet class)
        reads: newest brief, FACTS.md
        writes: drafts to marketing/queue/ via PR, each draft carrying both audit verdicts
    Ealia reviews the queue PR
        replaces [FA] placeholders with authored Persian text
        forwards Instagram drafts to Sima
        merges the PR as the approval record
    Publishing is manual, or via Composio on explicit instruction per item

## Directories
- marketing/briefs/         weekly brief, committed by the master task
- marketing/queue/          audited drafts awaiting human review, via PR only
- marketing/claim-audit/    the gate (see its README)

## Standing prompts
- pipeline/MASTER_TASK_PROMPT.md    paste into the weekly master scheduled task
- pipeline/CHANNEL_TASK_PROMPT.md   paste into the weekly channel scheduled task

## Invariants
1. FACTS.md at HEAD of main is the only claims source. Change it by PR only.
2. Every queue draft carries its own layer 1 and layer 2 verdicts verbatim.
3. Persian text in generated drafts exists only as [FA] placeholders; Ealia authors all final Persian copy.
4. Instagram output is a draft for Sima, never a direct post.
5. A channel with 2 or more unactioned queue drafts receives no new content.
6. Merging the queue PR is the approval record. No merge, no publish.
7. Cadence is weekly. Increasing frequency is a decision for Ealia, not for a task.

Prepared by: Ealia Azizollahi
Initiative origin: Hamdam marketing pipeline build, 7 August 2026
