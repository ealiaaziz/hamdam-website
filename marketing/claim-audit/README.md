# Hamdam Claim Audit Gate

Mandatory gate for all generated Hamdam marketing content. No draft enters a review queue (Ealia's or Sima's) without passing both layers. Depends on FACTS.md at the repo root (PR #14) as the single source of truth.

## Pipeline position

    generation sub-task (Sonnet/Opus)
        -> draft
        -> LAYER 1: audit_lint.py        (deterministic, this directory)
        -> LAYER 2: AUDIT_PROMPT.md      (semantic, run by a model against FACTS.md at HEAD of main)
        -> both PASS -> review queue (Ealia / Sima)
        -> human approves -> publish (Composio / GitHub PR)

A FAIL at either layer sends the draft back to the generation step. Fixed drafts are re-audited from scratch, both layers.

## Layer 1: deterministic lint

    python3 marketing/claim-audit/audit_lint.py draft.txt            # draft mode
    python3 marketing/claim-audit/audit_lint.py draft.txt --mode final
    python3 marketing/claim-audit/audit_lint.py draft.txt --json

Rules enforced:
- No dash or hyphen characters in copy (em dash, en dash, hyphen-minus, lookalikes). URLs, email addresses, and [FA] placeholder contents are exempt.
- Persian (Arabic-script) text only inside [FA]...[/FA] markers. All Persian copy is authored by Ealia; generated drafts carry markers only. Final mode rejects any remaining markers.
- Contested phrases (translation quality or provenance wording) hard fail.
- Dollar amounts hard fail; pricing defers to the App Store.
- Common American spellings warn (Australian English required). Warnings do not fail the draft; reviewers see them.

Exit codes: 0 PASS, 1 FAIL, 2 input error. Tests live in tests/ and were executed before this was committed; run them with:

    for t in marketing/claim-audit/tests/t*.txt; do python3 marketing/claim-audit/audit_lint.py "$t"; done

Expected: t1, t5, t8, t9, t10 PASS (t9 with warnings); t2, t3, t4, t6, t7, t11 FAIL; t5 additionally FAILS with --mode final.

## Layer 2: semantic audit

A model (Sonnet or better) is given AUDIT_PROMPT.md, the draft, and FACTS.md fetched fresh from HEAD of main. It classifies every factual claim as SUPPORTED, UNSUPPORTED, or CONTESTED and emits a JSON verdict. Fail closed: any UNSUPPORTED or CONTESTED claim fails the draft, and inability to fetch FACTS.md fails the draft.

## Change control

This gate changes only by PR to this repository, same review as FACTS.md. The generation tasks must not carry their own copies of these rules; they reference this directory so there is exactly one version of the truth.

Prepared by: Ealia Azizollahi
Initiative origin: Hamdam marketing pipeline build, 7 August 2026
