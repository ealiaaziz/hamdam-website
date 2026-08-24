# hamdam-computer

A sandbox Worker built on [`@cloudflare/computer`](https://github.com/cloudflare/computer),
Cloudflare's preview agent runtime. A Durable Object gets a persistent
SQLite-backed filesystem and a shell that runs against it, reachable over a
small HTTP surface.

It exists to answer "what is this thing, and is it worth using here" without
that question touching anything that matters. Cloudflare's own README says the
package is "suitable for experiments, exploration, and prototypes. It is NOT
suitable for production use at this time", and takes the same line on API
stability. So this is a fourth Worker rather than an import added to an
existing one:

| Worker | What it is | Deploys |
|---|---|---|
| `hamdam-website` (repo root) | the marketing site, static assets | push to `main`, via Workers Builds |
| `hamdam-support` (`support/`) | the ticketing desk, D1 and mail | `cd support && npm run deploy` |
| `hamdam-computer` (here) | this sandbox | nothing, by design |

The site has no Durable Object to put a Workspace in, and the desk handles real
mail for real people. Neither should carry a dependency whose author calls its
API unstable.

## It is not deployed

There is no `deploy` script in `package.json`, no route in `wrangler.jsonc`, and
both `workers_dev` and `preview_urls` are off. Nothing in CI deploys it and no
push deploys it. To put it somewhere, add a route deliberately in a diff, set
the secret first, and read the next section before you do.

## The token is the whole perimeter

`POST /exec` runs a shell command. There is no second control, so:

- **An unset `SANDBOX_TOKEN` denies every request.** That is the closed state,
  not the open one. A fresh deployment is exactly when a secret is most likely
  to be missing, and the alternative reading would leave a command endpoint open
  to whoever found it. Same shape as the support console's `ADMIN_EMAILS` check.
- **A wrong token gets 404, not 401.** An unauthorised caller cannot tell a
  deployment that refused them from a hostname that serves nothing.
- Comparison is constant-time, so a guess cannot be improved a byte at a time.

Set it with `npx wrangler secret put SANDBOX_TOKEN` before any deployment, and
locally by copying `.dev.vars.example` to `.dev.vars`.

The shell has no outbound network: the backend is configured `egress: { mode:
"none" }`. Turning that on, or adding the `curl` command group, makes this a
network client running on a Cloudflare address. Both are one line, and both are
decisions rather than defaults.

## Running it

```sh
cd computer
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

`npm run dev` needs the Worker Loader binding, which is what runs the shell in a
Dynamic Worker. If the account has no access to it, everything except `/exec`
still works: the filesystem is the Durable Object's own storage and needs no
backend at all.

```sh
T=local-development-only
B=http://localhost:8787

curl -X PUT  "$B/files/notes/todo.md" -H "x-sandbox-token: $T" --data-binary '- [ ] ship it'
curl         "$B/files/notes/todo.md" -H "x-sandbox-token: $T"
curl         "$B/ls/notes"            -H "x-sandbox-token: $T"
curl -X POST "$B/exec"                -H "x-sandbox-token: $T" \
     -H 'content-type: application/json' -d '{"command":"grep -r ship /"}'
```

## The surface

| Route | Does |
|---|---|
| `GET /` | prints this list |
| `GET /files/<path>` | reads a file |
| `PUT /files/<path>` | writes the body to a file, creating parents |
| `DELETE /files/<path>` | removes a file or directory |
| `GET /ls/<path>` | lists a directory |
| `POST /exec` | runs `{"command": "..."}` and returns exit code, stdout, stderr |

Every route takes `?workspace=<name>` and defaults to `sandbox`. One name is one
Durable Object is one computer, so two names share nothing.

Caps: 1 MB per write, 4 KB per command. A workspace shares the Durable Object's
storage, which tops out around 10 GB.

## Checks

```sh
npm run typecheck   # tsc --noEmit
npm test            # vitest, 19 cases over src/http.ts
npm run build       # wrangler deploy --dry-run, proves it still bundles
```

All three run in CI as their own job, the way `support/` does, because this is a
separate package with its own dependency tree. The root `npm test` excludes it
for the same reason it excludes `support/`: the root CI job never installs these
dependencies.

The tests cover `src/http.ts`, which is the request parsing and nothing else.
That split is deliberate: the path canonicalisation and the token comparison are
the parts worth asserting on, and keeping them free of `cloudflare:workers`
imports means they can be asserted on in plain Node.

## Type casts

Three casts in `src/index.ts` are the seam between this preview package's types
and the current `@cloudflare/workers-types`. They are grouped and commented in
one place so they can be deleted together when the package catches up. Trying
`@cloudflare/workers-types@^4`, which is what the package itself builds against,
does not remove them.

## If this gets used for something

Two things it does not have, because a sandbox does not need them and anything
real would:

- **No rate limiting.** The support desk meters every public surface per caller
  and per recipient (`support/src/rateLimit.ts`). Nothing here counts anything.
- **No audit trail.** Observability is on, so runs appear in Workers logs, but
  nothing records who ran what.
