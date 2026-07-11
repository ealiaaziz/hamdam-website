# Hamdam Website — Launch Readiness Audit

Audited: hamdam.com.au (repo: hamdam-website). Completed 2026-07-11.

## Executive summary

Eight phases audited (legal claims, privacy/consent, Apple readiness, security, i18n/RTL, SEO).
Ten fix commits landed and pushed to `main`, all build-verified. Two real trade mark wording
gaps, one Apple logo misuse, one third-party privacy exposure (Google Fonts), zero security
headers, a missing HTTP→HTTPS redirect, and a mismatched mail-auth (SPF/DKIM) setup were the
highest-value findings. Everything fixable from within the repo is done. What remains is
entirely outside the repo: five DNS/Cloudflare-dashboard actions (HTTPS enforcement, HSTS toggle,
www/apex canonicalization, SPF, DKIM), one WHOIS privacy check, one OG image (blocked on
Higgsfield credits), and confirming the App Store Connect privacy nutrition label matches the
Privacy Policy. No legal/privacy/Apple-facing wording was changed without being shown as a diff
first. Nothing was deployed or merged without approval — every commit was reviewed and pushed on
explicit instruction, one concern per commit.

## Status table

| Area | Item | Status | Severity | Recommendation | Owner |
|---|---|---|---|---|---|
| Footer/Brand | Personal names in public footer, incomplete trade mark notice | Fixed | High | — | Done |
| Legal claims | Trade mark app. number/date missing on Privacy §footer, Terms §15 | Fixed | Medium | — | Done |
| Legal claims | Homepage JSON-LD publisher was a personal name | Fixed | Low | — | Done |
| Legal claims | Health/medical claims | Pass | — | — | — |
| Legal claims | Cultural authenticity (poets, no Forough, no Middle-East framing) | Pass | — | — | — |
| Legal claims | Availability language ("Coming to iPhone", not "Download now") | Pass | — | — | — |
| Legal claims | Pricing claims (none displayed publicly) | Pass | — | — | — |
| Legal claims | Testimonials | Pass (none exist) | — | — | — |
| Legal claims | Poet attribution | Pass | — | — | — |
| Privacy | Location tied to "calendar" instead of "cultural moments" | Fixed | Medium | — | Done |
| Privacy | Crash reporting undisclosed | Fixed | Medium | — | Done |
| Privacy | Google Fonts undisclosed third party | Fixed (eliminated — self-hosted) | Medium | — | Done |
| Privacy | Privacy Policy exists, linked, covers HealthKit/EventKit/iCloud/StoreKit | Pass | — | — | — |
| Privacy | App Store Connect nutrition label vs. Privacy Policy alignment | **Unverified** | Blocker | Confirm ASC declarations match `privacy.astro` §1 before submission | Ealia |
| Apple readiness | Custom Apple logomark SVG in coming-soon badge | Fixed | High | — | Done |
| Apple readiness | "iPhone"/"Apple Watch"/"Apple Health" phrasing | Pass | — | — | — |
| Apple readiness | Screenshots (mockups presented as real) | N/A (none exist) | — | — | — |
| Apple readiness | In-app purchase / off-platform payment language | Pass | — | — | — |
| Apple readiness | Age suitability, restricted claims (featured/award) | Pass | — | — | — |
| Security | HTTP does not redirect to HTTPS | Open | **Blocker** | Cloudflare → SSL/TLS → Edge Certificates → "Always Use HTTPS" | Ealia |
| Security | No HSTS header | Fixed (via `_headers`) | Blocker→Done | Verify live after next deploy | Ealia to confirm post-deploy |
| Security | `www` and apex both serve independently, no canonical redirect | Open | High | Cloudflare Redirect Rule, or repo `_redirects` (untested, needs deploy) | Ealia |
| Security | SPF authorizes GoDaddy only; MX is Microsoft 365 | Open | High | Add `include:spf.protection.outlook.com` to SPF TXT record | Ealia (DNS, outside repo) |
| Security | No DKIM configured for M365 mailbox | Open | High | Enable DKIM in M365 admin center, add resulting CNAMEs | Ealia (DNS, outside repo) |
| Security | No CSP / security headers | Fixed | Medium→Done | — | Done |
| Security | No CAA record | Open | Low | Optional hardening | Ealia (DNS, outside repo) |
| Security | No MTA-STS record | Open | Low | Optional hardening | Ealia (DNS, outside repo) |
| Security | WHOIS privacy exposure | **Inconclusive** | Low–Medium (personal safety) | Check directly at whois.auda.org.au or registrar panel | Ealia |
| Security | `.git`/`.env`/admin/source-map exposure | Pass | — | — | — |
| Security | Forms (rate limiting, honeypot, enumeration) | N/A (no forms exist) | — | — | — |
| Security | Cookies | N/A (none set) | — | — | — |
| Security | Third-party scripts | Pass (zero, post Phase 3/5) | — | — | — |
| Security | Image/video EXIF | N/A (no images exist) | — | — | — |
| Security | Accessibility (skip link, focus, contrast, landmarks) | Pass (static review only) | — | Live screen-reader/keyboard pass recommended before launch | Ealia |
| i18n/RTL | RTL layout, bidi isolation | Pass | — | — | — |
| i18n/RTL | Persian byte integrity | Pass | — | — | — |
| i18n/RTL | hreflang tags missing | Fixed | Medium | — | Done |
| i18n/RTL | `/fa` landing page MT not disclosed | Fixed | Medium | — | Done |
| i18n/RTL | `lang="fa"` on 100%-English placeholder/footer content | Fixed | Low | — | Done |
| SEO | Title/description accuracy | Pass | — | — | — |
| SEO | OG/Twitter card image missing | Open | Medium | Generate branded 1200×630 asset once Higgsfield credits are available | Ealia |
| SEO | Structured data overclaims (ratings/awards) | Pass | — | — | — |
| SEO | Broken links, orphan pages | Pass | — | — | — |

## Changes already applied (all committed and pushed to `origin/main`)

| Commit | Phase | Description |
|---|---|---|
| `d16c7f3` | 1 | Footer trade mark/copyright rewrite, personal names removed from public footer |
| `de46e1c` | 2 | Trade mark app. number/date fixed on Privacy/Terms; homepage JSON-LD publisher depersonalized |
| `ad3e4fd` | 3 | Self-hosted fonts, removed Google Fonts CDN dependency |
| `be05d88` | 3 | Privacy Policy accuracy: location wording, crash-reporting disclosure, font-hosting disclosure |
| `cba1aea` | 4 | Removed Apple logomark from coming-soon badge, replaced with Hamdam's own shamseh mark |
| `afc0d47` | 5 | Externalized inline script and print styles (CSP prerequisite) |
| `aba65a8` | 5 | Added CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy via `_headers` |
| `eb64888` | 6 | Added reciprocal hreflang alternate links (en/fa/x-default) |
| `3215788` | 6 | Disclosed machine-translation status on `/fa` landing page |
| `d6b782f` | 7 | Corrected `lang` attribute on English text embedded in FA-language pages |

## Proposed but not applied

- **OG/Twitter share image** — you chose "skip for now"; Higgsfield account has 0 credits (image would cost 7). No meta tags added since there's no asset to point at yet.
- **`_redirects` file for www→apex canonicalization** — I held off proposing a concrete file because I can't deploy to verify it in this session, and a Cloudflare Redirect Rule is the more standard, testable fix for this specific case. Say the word if you'd rather I draft the `_redirects` version instead.

## Requires action outside this repository

1. **Blocker** — Enable "Always Use HTTPS" in Cloudflare (SSL/TLS → Edge Certificates). Verified live: `http://hamdam.com.au` currently serves the full site over plain HTTP with no redirect.
2. **Blocker** — Confirm App Store Connect's privacy "nutrition label" declarations match `privacy.astro` §1 (HealthKit, EventKit, Location, iCloud, etc.) before submission. Not checkable from this repo.
3. **High** — Canonicalize `www.hamdam.com.au` → `hamdam.com.au` (or reverse) via a Cloudflare Redirect Rule. Verified live: both currently serve independent 200 OK responses.
4. **High** — Fix the SPF TXT record: add `include:spf.protection.outlook.com` (mail is on Microsoft 365; SPF currently only authorizes GoDaddy's `secureserver.net`).
5. **High** — Enable DKIM signing for the M365 mailbox (Microsoft 365 admin center → Exchange/Defender) and add the resulting CNAME records.
6. **Low** — Check WHOIS privacy status directly at whois.auda.org.au or your registrar's panel — inconclusive from CLI tooling, and you flagged this as a personal-safety concern.
7. **Low (optional hardening)** — Add a CAA record and an MTA-STS record if you want the extra defense-in-depth; not launch-blocking.
8. **When ready** — Generate and wire up the OG/Twitter share image once Higgsfield credits are topped up.
9. **When ready** — Native-speaker review of `/fa` (landing, currently MT-disclosed), `/fa/privacy`, and `/fa/terms` (currently English placeholders).

## Launch ready: **Conditional**

Every finding fixable from within the repo has been fixed, verified by build, and pushed. The
site is not launch-ready until:
- Item 1 (HTTPS enforcement) is fixed — this is a genuine security gap, not a nice-to-have.
- Item 2 (ASC nutrition label alignment) is confirmed — App Review can reject on this mismatch.
- Items 4–5 (SPF/DKIM) are fixed before you rely on `developer@hamdam.com.au`/`support@` for
  anything time-sensitive (App Review correspondence, user support) — mail could currently land
  in spam at strict receivers.

Items 3, 6, 7, 8, 9 are recommended before launch but not hard blockers on their own.
