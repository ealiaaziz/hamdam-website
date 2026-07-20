# Ealia's to-do — Cloudflare / DNS dashboard

Everything below requires the Cloudflare dashboard or registrar panel — none
of it is fixable from the repo, so it can't be done by a coding session.
Re-verified 2026-07-13; two items from the original 2026-07-11 audit have
since been fixed automatically (Cloudflare or the registrar handled them) —
noted below, not repeated as open items.

## Open

- [ ] **SPF record incomplete.** Current TXT record is
      `v=spf1 include:secureserver.net -all` — only authorizes GoDaddy.
      Mail actually flows through Microsoft 365 (MX confirmed:
      `hamdam-com-au.mail.protection.outlook.com`), so mail sent from
      `developer@hamdam.com.au` risks landing in spam at strict receivers.
      Fix: add `include:spf.protection.outlook.com` to the SPF TXT record.
- [ ] **DKIM not configured.** No `selector1._domainkey` /
      `selector2._domainkey` CNAMEs exist, despite DMARC being set to
      `p=quarantine` with strict alignment (`adkim=r; aspf=r`) — mail can
      fail DMARC without DKIM. Fix: enable DKIM in the Microsoft 365 admin
      center, add the two resulting CNAME records.
- [ ] **WHOIS privacy — confirmed exposed, not just "inconclusive."**
      `whois hamdam.com.au` returns the registrant's full name and ABN in
      the clear (no redaction). If that's not intended, check the registrar
      panel for a WHOIS privacy / ID protection option — `.au` domains
      don't always default to private the way `.com` ones do.
- [ ] **CAA record** (optional hardening, low priority). None exists —
      would restrict which CAs can issue TLS certs for the domain.

## Already fixed (no action needed)

- [x] ~~"Always Use HTTPS"~~ — confirmed live 2026-07-13:
      `http://hamdam.com.au` now 301-redirects to `https://`. Was flagged as
      a blocker on 2026-07-11; resolved since.
- [x] ~~`www` vs apex canonical redirect~~ — fixed in-repo, not a dashboard
      task: `public/_redirects` now sends `www.hamdam.com.au/*` to the apex
      with a 301 (commit `ad60379`, 2026-07-21). **Confirmed still live and
      unfixed in production as of this note** — `www.hamdam.com.au` was
      still serving an independent 200 with no redirect when checked
      2026-07-21, meaning this commit has not been deployed yet. Deploying
      the current `main` closes this; no further Cloudflare dashboard work
      needed for this specific item.

## Reference

Full original findings (legal/privacy/security/SEO, all now fixed in-repo):
`LAUNCH_READINESS_AUDIT.md`. Phase W1 relaunch record: `docs/progress.md`.
