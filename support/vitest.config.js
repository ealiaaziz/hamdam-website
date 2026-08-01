import { defineConfig } from 'vitest/config';

// This file exists to stop Vitest walking up into the parent repository.
//
// Without it, `vitest run` here finds no config in support/, ascends to
// ../vitest.config.js, and tries to import 'vitest/config' from a directory
// whose node_modules the support CI job never installs (it runs `npm ci`
// with working-directory: support). The result is a startup crash:
//
//   failed to load config from /.../vitest.config.js
//   Cannot find package 'vitest' imported from /.../vitest.config.js
//
// It passes locally only because a developer who has run `npm install` at
// the repo root happens to have both dependency trees on disk. CI, which
// installs exactly one, is the honest environment -- and it caught this.
//
// The root config excludes support/ from the site's suite; this one keeps
// support/ self-contained. Together they mean each package's tests run with
// its own dependencies and neither reaches into the other.
export default defineConfig({
  test: {
    root: import.meta.dirname,
  },
});
