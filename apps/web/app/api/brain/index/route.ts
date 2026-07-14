import { NextResponse } from "next/server";
import { getVault } from "@/lib/brain/vault";
import { assertActorCan, AuthorizationError } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rateLimit";
import type { ApiResponse } from "@/lib/api-types";
import type { BrainSearchDoc } from "@/lib/brain/types";

// Search corpus for the brain explorer: every note's plain text + metadata.
// RBAC-gated with the SAME permission as the pages (brain.read) so a viewer
// cannot read company memory by skipping the UI and hitting the API. Contains
// strategy notes only — no PHI by construction (see lib/brain/vault.ts).
export const runtime = "nodejs";

export async function GET(
  request: Request,
): Promise<NextResponse<ApiResponse<{ docs: BrainSearchDoc[] }>>> {
  const rl = rateLimit(clientKey(request));
  if (!rl.ok) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  try {
    assertActorCan("brain.read");
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, error: "You do not have permission to read the brain." },
        { status: 403 },
      );
    }
    throw err;
  }

  return NextResponse.json({ success: true, data: { docs: getVault().searchDocs } });
}
