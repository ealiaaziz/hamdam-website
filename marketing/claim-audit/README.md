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
- Contested privacy phrases hard fail: whole-app claims such as "no tracking" and "nothing leaves your device". The narrow claims FACTS.md marks ALLOWED, "no account required", "no sign up", "no ads", keep passing on purpose.
- Bare "Free." as a complete price claim hard fails; it omits in-app purchases. "free to download" and "free trial" pass.
- Dollar amounts hard fail; pricing defers to the App Store.
- Common American spellings warn (Australian English required). Warnings do not fail the draft; reviewers see them.

Phrase rules match against apostrophe-normalised text, so a curly U+2019 cannot carry a blocked phrase past the gate.

Exit codes: 0 PASS, 1 FAIL, 2 input error. Tests live in tests/, one fixture per blocked phrase, with the expected verdicts in a table inside the runner:

    bash marketing/claim-audit/run_tests.sh

Exit 0 means every fixture behaved as expected. The expectations used to be a sentence in this README, which meant a broken rule failed a reader's attention rather than a command.

### Why the phrase lists are verbatim strings (2026-08-13)

The first version of the contested list was category-shaped: `careful(ly) translat`, `expert(ly) translat`, `scholarly translat`, and so on. It caught nothing that actually shipped, because what shipped was not of that shape. "A translation that doesn't flatten it" names no translator and claims no method; it asserts quality by comparison with unnamed others. Four published Instagram posts carry it, and the semantic layer passed them.

So the blocked strings from FACTS.md are now written out here literally, with a fixture each. Layer 2 is a model, and a model is the wrong place for a rule that can be spelled out.

One consequence to know about before it surprises someone: `faithful` and `uncompromising` are blocked as bare words, not only next to "translation". That is what FACTS.md lists, and it is deliberately blunt, so it will occasionally stop a sentence that was not making a translation claim at all. That is a review conversation, not a bug. If it fires often enough to be a nuisance, narrow it in FACTS.md first and here second, never the other way round.

## Layer 2: semantic audit

A model (Sonnet or better) is given AUDIT_PROMPT.md, the draft, and FACTS.md fetched fresh from HEAD of main. It classifies every factual claim as SUPPORTED, UNSUPPORTED, or CONTESTED and emits a JSON verdict. Fail closed: any UNSUPPORTED or CONTESTED claim fails the draft, and inability to fetch FACTS.md fails the draft.

## Change control

This gate changes only by PR to this repository, same review as FACTS.md. The generation tasks must not carry their own copies of these rules; they reference this directory so there is exactly one version of the truth.

Prepared by: Ealia Azizollahi
Initiative origin: Hamdam marketing pipeline build, 7 August 2026
