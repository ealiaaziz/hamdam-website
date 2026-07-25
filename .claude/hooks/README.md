# Deploy guard

Three layers stop this site being deployed from work that is not committed and
pushed. They exist because on 2026-07-25 a deploy shipped four unpushed commits
to production: the site was live from a local `dist` while GitHub had no record
of what was serving, and with no CI on this project nothing else was going to
notice.

| Layer | Where it lives | What it covers |
|---|---|---|
| `npm run deploy` | `package.json` + `scripts/predeploy-check.mjs` | every invocation, including a plain terminal outside Claude Code |
| Project hook | `.claude/settings.json` (committed) | Claude Code sessions whose working directory is inside this repo |
| User hook | `~/.claude/settings.json` (not committed, snippet below) | Claude Code sessions rooted anywhere else |

`npm run deploy` runs the pre-deploy check, then builds, then calls wrangler.
The check refuses a dirty working tree, a branch with unpushed commits, a branch
missing from origin, and a branch behind origin. `npm run deploy -- --force`
overrides it and says so in the output rather than passing silently.

Both hooks run `block-unguarded-wrangler-deploy.sh` in this directory, which
denies a bare `wrangler` deploy command and points at the npm script instead.

## Why two hooks

A project hook only fires when the session's working directory is inside this
repo. The deploy that caused all this was run from a session rooted in the
`hamdam-ios` checkout, where a project hook would never have fired. The
user-level entry closes that gap. When the working directory *is* inside this
repo both fire, which is harmless: two denials are still a denial.

## Restoring the user-level hook on a new machine

Not committed, because `~/.claude` also holds prompt history, session
transcripts, memory notes and shell snapshots, none of which belong in a git
repository. Only this snippet does. Merge it into the `hooks` key of
`~/.claude/settings.json`, keeping whatever else is already in that file:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "S=\"/Users/EA/Developer/hamdam-website/.claude/hooks/block-unguarded-wrangler-deploy.sh\"; if [ -x \"$S\" ]; then exec \"$S\"; fi; printf \"%s\" \"{\\\"hookSpecificOutput\\\":{\\\"hookEventName\\\":\\\"PreToolUse\\\",\\\"permissionDecision\\\":\\\"deny\\\",\\\"permissionDecisionReason\\\":\\\"Bare wrangler deploy is blocked, and the repo guard script was not found at $S to explain further. Deploy via npm run deploy from the hamdam-website checkout, which verifies the branch is committed and pushed first.\\\"}}\"",
            "if": "Bash(*wrangler deploy*)",
            "timeout": 10,
            "statusMessage": "Checking deploy is committed and pushed"
          }
        ]
      }
    ]
  }
}
```

It holds no copy of the logic: it executes the committed script above by
absolute path, so edits to that script apply to both layers. Update the path if
this repo is checked out somewhere other than
`/Users/EA/Developer/hamdam-website`. If the script is not found there, the
snippet denies with its own message rather than letting the deploy through,
which is the right default for a production deploy.

## Checking a hook actually fires

A hook that silently does nothing is worse than no hook, so verify rather than
assume. Pipe it a payload directly:

```bash
printf '{"tool_name":"Bash","tool_input":{"command":"npx wrangler deploy"}}' \
  | .claude/hooks/block-unguarded-wrangler-deploy.sh
```

A denial prints a JSON decision. `npm run deploy` and unrelated commands print
nothing and exit 0, which is what allowing looks like.
