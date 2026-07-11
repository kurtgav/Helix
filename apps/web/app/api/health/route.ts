import { NextResponse } from "next/server";

// Liveness/readiness probe. No PHI, no secrets — safe to expose. Reports whether
// a database is configured (mode) without revealing the connection string.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  const hasDb = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());
  return NextResponse.json({
    ok: true,
    service: "helix",
    mode: hasDb ? "persistent" : "mock",
    time: new Date().toISOString(),
  });
}
