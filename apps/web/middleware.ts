import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Per-request Content-Security-Policy with a script nonce — the official Next.js
// pattern (https://nextjs.org/docs/app/building-your-application/configuring/
// content-security-policy). This is what lets production drop 'unsafe-inline'
// from script-src entirely.
//
// WHY nonce + 'strict-dynamic' is safe and replaces 'unsafe-inline':
//   • Every request mints a fresh, unguessable nonce. Next stamps that nonce onto
//     the scripts IT emits (hydration/bootstrap) by reading the `x-nonce` request
//     header we set below. Only scripts carrying the matching nonce execute.
//   • 'strict-dynamic' says: trust scripts loaded by an already-trusted (nonced)
//     script, and IGNORE host allowlists. So a smuggled `<script>` an attacker
//     injects via XSS has no nonce and is refused — 'unsafe-inline' is gone in
//     prod, which is the whole point.
//   • The nonce changes per request, so a static CSP header (which next.config
//     used to emit) cannot express it — that is why CSP now lives here, and the
//     static Content-Security-Policy entry was removed from next.config.mjs.
//
// Dev is deliberately different. `next dev` drives HMR/React-Refresh through
// eval() and injects inline scripts that are NOT nonced, so it needs both
// 'unsafe-eval' and an EFFECTIVE 'unsafe-inline'. Critically, the moment a
// nonce or hash appears in script-src, browsers IGNORE 'unsafe-inline' — so dev
// must NOT carry a nonce/'strict-dynamic', or those inline HMR scripts break and
// the dev app renders but is inert. Hence: nonce+strict-dynamic in prod ONLY,
// permissive script-src in dev.
//
// One prod exception: the marketing landing ("/") is STATICALLY generated, so
// its <script> tags are prerendered at build time and cannot carry a per-request
// nonce. A nonce+'strict-dynamic' policy would block its own bootstrap scripts.
// It hosts no authenticated or data-bearing actions, so it gets the standard
// hardened CSP with 'unsafe-inline' for scripts (the pre-nonce baseline). Every
// DYNAMIC app surface — /verify, /dashboard, /console, /revenue, /agents, where
// coverage data and approvals live — keeps the strict per-request nonce policy
// with NO 'unsafe-inline'. Nonce is verified present on those pages' scripts.
export function middleware(request: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV !== "production";
  // "/" is the only statically-prerendered document surface.
  const isStaticPublic = request.nextUrl.pathname === "/";

  let scriptSrc: string;
  if (isDev) {
    scriptSrc = "'self' 'unsafe-inline' 'unsafe-eval'";
  } else if (isStaticPublic) {
    scriptSrc = "'self' 'unsafe-inline'";
  } else {
    scriptSrc = `'self' 'nonce-${nonce}' 'strict-dynamic'`;
  }

  // Single-line CSP. Everything but script-src matches the hardening baseline the
  // app already shipped; style-src keeps 'unsafe-inline' (unavoidable for the
  // inline critical CSS / style attributes React emits — documented tradeoff).
  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  // Forward the nonce to the app on the REQUEST so Next (and any Server Component
  // that needs an inline <script nonce>) can read it via headers().get("x-nonce"),
  // and set the CSP on the request too, per the Next docs, so the framework sees
  // the exact policy it must satisfy.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  // And set it on the RESPONSE so the browser actually enforces it.
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

// Run on pages AND api routes so every HTML document gets a nonce'd CSP. Skip
// only static assets — `_next/static`, `_next/image`, `favicon.ico`, and any path
// with a file extension (a dot) — where a per-request nonce is pointless. API
// JSON responses picking up the header is harmless. The `missing` conditions skip
// router prefetches (RSC payloads, not documents), matching the official matcher.
export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "x-middleware-prefetch" },
      ],
    },
  ],
};
