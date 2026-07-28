# Deploy runbook

Two ways to ship this site. Automatic on push to `main`, and manual when you need
to force something out. Both build the same `dist/` from the same `npm run build`.

## Why automatic deploy exists now

For most of this project's life the only way to deploy was for a person to run
`npm run deploy` on their laptop. That is how five commits of legal corrections sat
finished, reviewed and pushed while production carried on serving statements that
were false. Nothing was broken; nobody ran the command.

Automating the deploy removes that failure mode. It does not remove the guard rails:
CI still has to pass, and the manual path stays.

---

## Part 1: enable Cloudflare Workers Builds

Cloudflare pulls from GitHub and builds on its own infrastructure. **No Cloudflare
API token is stored in GitHub**, which is the arrangement worth having: a token in
GitHub Actions is a deploy credential sitting in a place that does not need one.

In the Cloudflare dashboard:

1. **Workers & Pages** → select the **`hamdam-website`** Worker.
2. **Settings** → **Build** → **Connect** (Cloudflare calls this Workers Builds).
3. Authorise the **Cloudflare Workers and Pages** GitHub App when prompted. Scope it
   to the `ealiaaziz/hamdam-website` repository only, not to all repositories.
4. Configure the build:

   | Field | Value |
   |---|---|
   | Repository | `ealiaaziz/hamdam-website` |
   | Branch | `main` |
   | Build command | `npm run build` |
   | Deploy command | `npx wrangler deploy` |
   | Root directory | `/` |
   | Build variables | none needed |

5. **Leave preview/branch deploys off.** Turn on production branch only. Preview
   deployments would put unreviewed copies of the legal pages on a public
   `*.workers.dev` URL, which is the last thing this site needs.
6. Save, then push a trivial commit to `main` and confirm the build runs.

**Do not** point the build at the designated feature branch, and do not enable
"deploy on every branch".

### What this changes about `main`

`main` becomes production. Once this is on, merging to `main` ships. Treat the merge
as the deploy decision, because it now is one.

---

## Part 2: what happens to `predeploy-check.mjs`

Read `scripts/predeploy-check.mjs`'s own header before deciding anything here. It
exists because on 2026-07-25 the site was deployed from a local `dist` while four
commits sat unpushed, so production was ahead of GitHub and the only record of what
was serving lived on one laptop.

**Keep it. Do not delete it.**

Under Workers Builds it is structurally redundant for the automatic path: Cloudflare
builds from the pushed commit on `main`, so "deploying something unpushed" is not
expressible. The guard cannot fire because the condition cannot occur.

But it still guards the manual path, which is exactly the path that caused the
incident. `npm run deploy` from a laptop can still ship a dirty tree. That is the
case the check was written for, and that case does not go away.

So:

- `npm run deploy` keeps running `predeploy-check` first. No change to `package.json`.
- The automatic path never invokes it, because Cloudflare runs `npm run build` and
  `npx wrangler deploy` directly rather than the `deploy` script.
- The escape hatch `npm run deploy -- --force` stays as-is.

### When to use the manual path after this

Rarely, and deliberately:

- Cloudflare's build service is down and something must ship.
- You need to roll production back faster than a revert commit can land.
- You are deploying from a commit that is deliberately not on `main`.

In all three cases the check firing is a feature. If it blocks you, read the message
rather than reaching for `--force`.

---

## Part 3: the gate. Not optional.

CI (`.github/workflows/ci.yml`) runs on every push and pull request: build, unit
tests, the Persian byte check, and the dash check. It holds no deploy credentials
and must never be given any.

**Cloudflare's build and GitHub's CI are independent systems. Neither waits for the
other.** Turning on Workers Builds without the step below produces a pipeline that
looks like a gate and is not one: CI goes red, Cloudflare deploys anyway, and the
red tick sits next to a commit that is already serving in production. That is worse
than having no CI at all, because it manufactures confidence rather than merely
lacking it.

### Required step, do this in the same sitting as Part 1

1. GitHub → the repository → **Settings** → **Branches** → **Add branch ruleset**
   (or classic branch protection rule) targeting **`main`**.
2. Enable **Require status checks to pass before merging**.
3. Add the check named **`verify`** (the job id in `ci.yml`).
4. Enable **Require a pull request before merging**. Without it, a direct push to
   `main` bypasses the status check entirely and deploys.
5. Enable **Do not allow bypassing the above settings**, or accept that admin pushes
   skip the gate. Since the account that would bypass it is the same one that would
   be deploying in a hurry, prefer enabling it.

**Verify the rule actually works before trusting it.** Open a pull request that
deliberately fails one check (add an em dash to a legal page, which the dash check
will catch), and confirm GitHub blocks the merge. A protection rule that was
configured but never exercised is an assumption, not a gate.

### Why not gate inside Cloudflare instead

You could prefix Cloudflare's build command with the checks
(`npm run check:dashes && npm run check:persian && npm run build`). It works, but it
runs the checks twice, reports failures in a dashboard nobody is watching rather than
on the pull request, and leaves `main` accepting broken commits. Use branch
protection.

---

## Part 4: verifying a deploy

After any deploy, automatic or manual:

1. Cloudflare dashboard → the Worker → **Deployments**: confirm the newest entry
   matches the commit you expect.
2. Load `https://hamdam.com.au/` and `https://hamdam.com.au/fa/` and confirm both
   render.
3. Spot-check whatever the deploy actually changed. For a legal-page change, open
   `/privacy/` and `/fa/privacy/` and read the section you edited. A build that
   succeeded is not evidence that the content is right.
4. `curl -sI https://hamdam.com.au/ | grep -i content-security-policy` to confirm
   `public/_headers` is still being served. The CSP is enforcing, and a missing
   `_headers` file has silently broken it before (see `docs/progress.md:47`).
