import { defineConfig } from 'vitest/config';

// Same reason support/vitest.config.js exists: without a config here, Vitest
// ascends to the repository root, loads a config whose `vitest` import resolves
// only in the root node_modules, and crashes on startup in any CI job that
// installed exactly one of the two dependency trees. Pinning `root` keeps this
// package self-contained.
export default defineConfig({
  test: {
    root: import.meta.dirname,
  },
});
