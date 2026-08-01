// Served as a real stylesheet from GET /static/app.css (see src/index.ts),
// never inlined -- this Worker holds the same CSP discipline as the main
// site (style-src 'self', no 'unsafe-inline'), even though it is a
// separate deploy with its own CSP header.
//
// Palette borrows Hamdam's warm-dawn brand tokens (src/styles/tokens.css in
// the main site) for the public-facing pages, and a calmer, higher-contrast
// variant for the admin console, where legibility of dense tables matters
// more than atmosphere.

export const APP_CSS = /* css */ `
:root {
  --saffron: #E8B04B;
  --ember: #D07B3F;
  --dawn-cream: #F5EEE0;
  --dawn-pink: #F2C9A0;
  --night-deep: #1A1611;
  --text: #241E15;
  --text-soft: #574A38;
  --line: rgb(36 30 21 / 12%);

  --p1: #B4322A;
  --p1-bg: #FBEAE8;
  --p2: #B8641F;
  --p2-bg: #FBEFE1;
  --p3: #8A6A1F;
  --p3-bg: #FBF4E1;
  --p4: #5C5445;
  --p4-bg: #EFECE4;

  --ok: #2F6B4F;
  --ok-bg: #E7F1EA;

  color-scheme: light;
  font-family: ui-serif, Georgia, 'Source Serif Pro', serif;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--dawn-cream);
  color: var(--text);
  font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  line-height: 1.55;
}

a { color: var(--ember); }
a:focus-visible, button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible {
  outline: 2px solid var(--ember);
  outline-offset: 2px;
}

.shell {
  max-width: 46rem;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 5rem;
}

.shell--wide { max-width: 68rem; }

header.brand {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2.5rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--line);
}

header.brand .wordmark {
  font-family: ui-serif, Georgia, serif;
  font-size: 1.35rem;
  font-weight: 600;
  color: var(--text);
  text-decoration: none;
}

header.brand .wordmark span { color: var(--ember); }

header.brand nav a {
  font-size: 0.9rem;
  color: var(--text-soft);
  text-decoration: none;
  margin-left: 1.25rem;
}
header.brand nav a:hover { color: var(--ember); }

h1 {
  font-family: ui-serif, Georgia, serif;
  font-size: 2rem;
  line-height: 1.2;
  margin: 0 0 0.5rem;
}

h2 { font-size: 1.15rem; margin: 2rem 0 0.75rem; }

p.lede { color: var(--text-soft); margin: 0 0 2rem; max-width: 38rem; }

.card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 2px rgb(36 30 21 / 4%);
}

.field { margin-bottom: 1.25rem; }
.field label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem; color: var(--text); }
.field .hint { font-size: 0.8rem; color: var(--text-soft); margin-top: 0.3rem; }

input[type=text], input[type=email], textarea, select {
  width: 100%;
  font: inherit;
  font-size: 0.95rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid rgb(36 30 21 / 22%);
  border-radius: 0.5rem;
  background: #fff;
  color: var(--text);
}
textarea { resize: vertical; min-height: 8rem; }

.btn {
  display: inline-block;
  font: inherit;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0.65rem 1.4rem;
  border-radius: 0.5rem;
  border: 1px solid transparent;
  background: var(--ember);
  color: #fff;
  cursor: pointer;
  text-decoration: none;
}
.btn:hover { background: #b8672f; }
.btn.btn--ghost { background: transparent; border-color: rgb(36 30 21 / 25%); color: var(--text); }
.btn.btn--ghost:hover { background: rgb(36 30 21 / 5%); }

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
}
.badge--P1 { background: var(--p1-bg); color: var(--p1); }
.badge--P2 { background: var(--p2-bg); color: var(--p2); }
.badge--P3 { background: var(--p3-bg); color: var(--p3); }
.badge--P4 { background: var(--p4-bg); color: var(--p4); }
.badge--status { background: rgb(36 30 21 / 8%); color: var(--text-soft); }
.badge--resolved { background: var(--ok-bg); color: var(--ok); }
.badge--breach { background: var(--p1-bg); color: var(--p1); }

.thread { margin: 1.5rem 0; display: flex; flex-direction: column; gap: 1rem; }
.msg { border-radius: 0.6rem; padding: 0.9rem 1.1rem; border: 1px solid var(--line); }
.msg--requester { background: #fff; }
.msg--agent { background: #FCF6EC; border-color: rgb(208 123 63 / 30%); }
.msg--system { background: transparent; border-style: dashed; color: var(--text-soft); font-size: 0.85rem; }
.msg .meta { font-size: 0.78rem; color: var(--text-soft); margin-bottom: 0.35rem; display: flex; justify-content: space-between; gap: 1rem; }
.msg .body { white-space: normal; }

table.queue { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
table.queue th, table.queue td { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--line); vertical-align: top; }
table.queue th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-soft); }
table.queue tr:hover td { background: rgb(232 176 75 / 8%); }
table.queue a.subject { color: var(--text); text-decoration: none; font-weight: 600; }
table.queue a.subject:hover { color: var(--ember); }

.filters { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
.filters a {
  font-size: 0.8rem; text-decoration: none; color: var(--text-soft);
  padding: 0.3rem 0.7rem; border-radius: 999px; border: 1px solid var(--line);
}
.filters a.active { background: var(--text); color: #fff; border-color: var(--text); }

.notice { padding: 0.9rem 1.1rem; border-radius: 0.6rem; margin-bottom: 1.5rem; font-size: 0.92rem; }
.notice--ok { background: var(--ok-bg); color: var(--ok); }
.notice--error { background: var(--p1-bg); color: var(--p1); }

footer.meta {
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--line);
  font-size: 0.78rem;
  color: var(--text-soft);
}

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
@media (max-width: 40rem) {
  .grid-2 { grid-template-columns: 1fr; }
}

.sla-line { font-size: 0.85rem; color: var(--text-soft); display: flex; gap: 1.25rem; flex-wrap: wrap; }
.sla-line strong { color: var(--text); }
`;
