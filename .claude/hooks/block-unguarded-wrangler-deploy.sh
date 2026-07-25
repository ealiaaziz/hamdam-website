#!/usr/bin/env bash
# PreToolUse/Bash hook: refuse a bare `wrangler deploy`.
#
# Why: on 2026-07-25 a deploy of hamdam-website shipped four commits that were
# never pushed, so production was ahead of GitHub. The repo now guards this in
# `npm run deploy` (scripts/predeploy-check.mjs), but a bare `npx wrangler
# deploy` walks straight past that guard, and a bare `npx wrangler deploy` is
# exactly what got run that day.
#
# Allowed: `npm run deploy`, which runs the check first. Denied: anything else
# that reaches wrangler's deploy directly.
#
# Reads the hook payload on stdin, emits a PreToolUse permission decision.

set -uo pipefail

command_text=$(jq -r '.tool_input.command // ""' 2>/dev/null)

# Not a deploy at all: say nothing, decide nothing.
case "$command_text" in
  *"wrangler deploy"*) ;;
  *) exit 0 ;;
esac

# Going through the guarded npm script (or the guard itself) is the supported
# path. `npm run deploy` expands to wrangler deploy inside npm, which is not a
# Bash tool call and so never reaches this hook.
case "$command_text" in
  *"npm run deploy"*|*"predeploy-check"*) exit 0 ;;
esac

cat <<'JSON'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Bare `wrangler deploy` is blocked: it skips the pre-deploy check and can ship commits that were never pushed (this happened on 2026-07-25). Use `npm run deploy` instead, which verifies the working tree is clean and the branch matches origin before building and deploying. If you genuinely need to deploy unpushed work, `npm run deploy -- --force` says so out loud."
  }
}
JSON
exit 0
