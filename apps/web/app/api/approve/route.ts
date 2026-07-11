import { NextResponse } from "next/server";
import { z } from "zod";
import { approveAction } from "@/lib/agents";
import type { ApiResponse, ApproveResultView } from "@/lib/api-types";

// Server-only. The human-in-the-loop gate: records a staffer's approve/reject
// decision on a proposed action. Enforces schema validation at the boundary.
export const runtime = "nodejs";

const approveRequestSchema = z.object({
  encounterId: z.string().min(1),
  decision: z.enum(["approved", "rejected"]),
  editedLoaBody: z.string().max(20000).optional(),
  note: z.string().max(2000).optional(),
});

export async function POST(
  request: Request,
): Promise<NextResponse<ApiResponse<ApproveResultView>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = approveRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid approval request." },
      { status: 422 },
    );
  }

  try {
    const data = await approveAction(parsed.data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[approve] decision record failed:", message);
    return NextResponse.json(
      { success: false, error: "Could not record the decision. Please retry." },
      { status: 500 },
    );
  }
}
