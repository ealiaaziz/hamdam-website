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
/* Distinct from every priority colour on purpose: it is not a severity, it
   is a note that the assistant stayed out of this one. */
.badge--android { background: rgb(61 122 90 / 14%); color: #2F5F46; }

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

.suggest { border-left: 3px solid var(--saffron); background: #FEFBF5; margin-bottom: 1.25rem; }
.suggest-lead { font-size: 0.85rem; color: var(--text-soft); margin: 0 0 0.35rem; }
.suggest-title { font-family: ui-serif, Georgia, serif; font-size: 1.1rem; margin: 0 0 0.75rem; }
.suggest-body ol { margin: 0 0 0.75rem; padding-left: 1.25rem; }
.suggest-body li { margin-bottom: 0.4rem; }
.suggest-body p { margin: 0 0 0.75rem; }
.suggest-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
.suggest .hint { font-size: 0.78rem; color: var(--text-soft); margin: 0; }

.draft { border: 1px solid rgb(232 176 75 / 55%); background: #FEFBF5; border-radius: 0.6rem; padding: 1rem 1.1rem; margin-bottom: 1.25rem; }
.draft-head { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
.badge--draft { background: var(--p3-bg); color: var(--p3); }
.draft-why { font-size: 0.78rem; color: var(--text-soft); }
.draft-meta { font-size: 0.78rem; color: var(--text-soft); margin: 0 0 0.75rem; }
.draft-body { background: #fff; border: 1px solid var(--line); border-radius: 0.5rem; padding: 0.75rem 1rem; margin-bottom: 0.85rem; font-size: 0.9rem; }
.draft .hint { font-size: 0.78rem; color: var(--text-soft); margin: 0.5rem 0 0; }

.sla-line { font-size: 0.85rem; color: var(--text-soft); display: flex; gap: 1.25rem; flex-wrap: wrap; }
.sla-line strong { color: var(--text); }

/* The declarations that used to be style="..." attributes on elements in
 * render/admin.ts and render/status.ts.
 *
 * They were not merely untidy, they were not applying. This Worker sends
 * style-src 'self' with no 'unsafe-inline', which is the whole point of the
 * comment at the top of this file, so every one of those attributes was
 * dropped by the browser before it was read. The badge rows were not flex,
 * the console's "Nothing here." was not soft, the approve and discard buttons
 * were on separate lines, and nobody noticed because the pages still read
 * fine and the console has two users.
 *
 * They are classes now, which is what the CSP was asking for. The other way
 * to make them work is to add 'unsafe-inline' to style-src, and that trades a
 * real control for a cosmetic convenience: an injected style attribute is not
 * a script but it is enough to overlay one element with another, which is a
 * convincing fake button on a page whose buttons resolve and close other
 * people's tickets. */
.page-head { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 0.5rem; }
.badge-row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 1rem; }
.inline-form { display: inline; }
.card--fit { height: fit-content; }
.flush { margin: 0; }
.flush-top { margin-top: 0; }
.hint--spaced { margin-top: 1rem; }
.queue-sub { font-size: 0.78rem; color: var(--text-soft); }
.queue-empty { color: var(--text-soft); }

/* Persian, without a webfont.
 *
 * The marketing site serves Vazirmatn. This portal deliberately does not: a
 * font file means a request in front of someone who already has a problem
 * and a layout shift on a page whose whole job is to be quick. The stack
 * reaches Vazirmatn when the reader already has it and lands on a system
 * Persian face otherwise. All of them render Persian correctly.
 *
 * It lives here rather than in a <style> tag because this response is served
 * under a style-src of self with no unsafe-inline, so an inline block would
 * simply not apply and the page would silently render Persian in a serif
 * face meant for Latin. */
html[lang='fa'] body,
html[lang='fa'] h1,
html[lang='fa'] h2,
html[lang='fa'] .wordmark,
html[lang='fa'] .lede,
html[lang='fa'] .btn,
html[lang='fa'] input,
html[lang='fa'] textarea,
html[lang='fa'] select {
  font-family: Vazirmatn, 'Iran Sans', IRANSans, Tahoma, 'Segoe UI', system-ui, sans-serif;
}

/* Right-to-left needs the text edges swapped, not the whole grid rebuilt:
 * the layout is already flow-relative almost everywhere. These are the
 * places that hard-coded a side. */
html[dir='rtl'] .msg { border-left: none; border-right: 3px solid var(--rule); padding-left: 0; padding-right: 0.85rem; }
html[dir='rtl'] .filters a { margin-right: 0; margin-left: 0.4rem; }
html[dir='rtl'] .queue th,
html[dir='rtl'] .queue td { text-align: right; }
`;