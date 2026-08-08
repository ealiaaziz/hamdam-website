// What crawlers are told about the support desk (added 2026-08-08).
//
// The desk is a real website, unlike the MTA-STS hostname next door, so this is
// a policy decision rather than a correction. The decision is: none of it.
//
// Nothing here wants to be a search result. The portal is reached from the app
// and from hamdam.com.au, not from a query. And the URLs that matter most are
// the ones that must never be indexed under any circumstances:
//
//   /tickets/:id?token=...  is somebody's support conversation, and the token
//                           that opens it is in the query string. The route
//                           already refuses without a matching tracking token,
//                           so this is not what keeps it private -- it is what
//                           stops a token-bearing URL becoming a search result
//                           if one ever leaks into a crawlable page.
//   /admin                  is behind Cloudflare Access and ADMIN_EMAILS.
//   /track, /tickets/lookup are lookup forms with nothing to rank for.
//
// robots.txt is a request, not a control, and none of the above relies on it.
// It is the layer that stops well-behaved crawlers creating problems nobody
// intended, which is exactly what it is for.
//
// This has to be served ABOVE the country check. Google documents 4xx on
// robots.txt -- explicitly including 403 -- as meaning "no robots.txt exists",
// which it reads as no restrictions at all. So a crawler arriving from outside
// ALLOWED_COUNTRIES would get the out-of-region 403 and conclude the whole desk
// was open to it. The same reasoning already puts /health and the MTA-STS
// policy above that check.

/** The desk's robots.txt. Disallow everything; see above for why. */
export const SUPPORT_ROBOTS_BODY = 'User-agent: *\nDisallow: /\n';
