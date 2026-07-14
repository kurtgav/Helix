import { NextResponse } from "next/server";
import { intakeInputSchema } from "@helix/shared";
import { runEligibilityAction } from "@/lib/agents";
import { assertActorCan, AuthorizationError } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rateLimit";
import type { ApiResponse, VerifyProposalView } from "@/lib/api-types";

// Server-only. Rate-limited + RBAC-gated. Validates intake at the boundary, runs
// the Eligibility agent, and returns a flattened proposal. Never logs the request
// body (PHI).
export const runtime = "nodejs";

export async function POST(
  request: Request,
): Promise<NextResponse<ApiResponse<VerifyProposalView>>> {
  // Abuse control first — throttle before doing any work or parsing a body.
  const rl = rateLimit(clientKey(request));
  if (!rl.ok) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }
  // Authorization — the acting role must be permitted to run eligibility.
  try {
    assertActorCan("eligibility.run");
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, error: "You do not have permission to run eligibility." },
        { status: 403 },
      );
    }
    throw err;
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = intakeInputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid intake input." },
      { status: 422 },
    );
  }

  try {
    const view = await runEligibilityAction(parsed.data);
    return NextResponse.json({ success: true, data: view });
  } catch (error) {
    // Log without PHI — message only, never the patient/coverage payload.
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[verify] eligibility run failed:", message);
    return NextResponse.json(
      { success: false, error: "Eligibility check failed. Please retry." },
      { status: 500 },
    );
  }
}
