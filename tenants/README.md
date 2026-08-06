# Tenant deployments

One directory per business the desk is run for. Each is a separate Cloudflare
Worker with its own D1 database, mailbox, knowledge base and Access
application, built from the same source in `../support/src`. Nothing is shared
at runtime, which is the entire tenancy model: isolation by construction
rather than by a `tenant_id` column somebody has to remember to filter on.

Commands are run from `../support`, with the tenant named once:

```sh
cd support
TENANT=circuitenergy npm run kb:generate:tenant   # after editing kb/
TENANT=circuitenergy npm run tenant:migrate       # schema onto its D1
TENANT=circuitenergy npm run tenant:build         # bundle, no deploy
TENANT=circuitenergy npm run tenant:deploy        # ships it
```

`tenant:build` and `tenant:deploy` run the same pre-deploy check the main desk
uses, so neither can ship a dirty tree or a branch that is not on origin.

## The one line to check in every tenant's wrangler.jsonc

```jsonc
"alias": { "./data/kb.js": "./kb.generated.ts" }
```

Without it the deployment bundles Hamdam's knowledge base and answers that
business's staff about a Persian poetry app, confidently. The bundle is worth
grepping after any change to the build:

```sh
grep -c verse-not-loading tenants/<name>/dist/*.js   # must be 0
```
