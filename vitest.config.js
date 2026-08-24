import { configDefaults, defineConfig } from 'vitest/config';

// Added 2026-08-01, when the support desk (support/) landed in this repo.
//
// Vitest's default discovery is repo-wide, so the root `npm test` silently
// started running support/'s suite too. That looks like free coverage but
// isn't: support/ is a separate package with its own dependencies, and CI's
// root `npm ci` never installs them. Its CLI test shells out to `npx tsx`,
// which then has to fetch tsx from the network on every run -- a test that
// passes only because the runner happens to have working npm egress.
//
// So: the root suite covers the site, support/ runs its own suite with its
// own deps (see the support steps in .github/workflows/ci.yml). Both run in
// CI; neither pretends to be the other.
//
// computer/ was added on 2026-08-24 and is excluded for exactly the same
// reason, before it could repeat the same discovery: it is a third package
// with a third dependency tree, and @cloudflare/computer is not installed by
// the root `npm ci` either.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'support/**', 'computer/**'],
  },
});
