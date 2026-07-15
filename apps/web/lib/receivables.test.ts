import { describe, it, expect } from "vitest";
import {
  toClaimRecord,
  toClaimRecords,
  buildLedgerRows,
  resolveLedgerMessage,
} from "./receivables";
import {
  DEMO_CLAIM_LEDGER,
  demoClaimSubmittedAt,
  demoClaimDecidedAt,
} from "./demo";
import { assessReceivables } from "@helix/agents";
import type { ReceivableFinding } from "@helix/shared";

// Pure-helper coverage for the Receivables seam. The agent run + resolve gate
// need a request scope (cookies) and RBAC and are exercised by e2e; here we
// test the deterministic mappers and the resolve message the UI renders.

describe("toClaimRecord", () => {
  it("lowercases the payer name into the adapter registry key", () => {
    const row = DEMO_CLAIM_LEDGER.find((c) => c.payer === "PhilHealth")!;
    const mapped = toClaimRecord(row);
    expect(mapped.payerId).toBe("philhealth");
    expect(mapped.payerName).toBe("PhilHealth");
  });

  it("derives timestamps from the demo clock and keeps ageDays", () => {
    const row = DEMO_CLAIM_LEDGER[0]!; // Maxicare MRI, paid
    const mapped = toClaimRecord(row);
    expect(mapped.submittedAt).toBe(demoClaimSubmittedAt(row));
    expect(mapped.decidedAt).toBe(demoClaimDecidedAt(row));
    expect(mapped.ageDays).toBe(row.submittedAgoDays);
    expect(mapped.amountPaid).toBe(row.amountPaid);
  });

  it("omits optional fields on open claims instead of writing undefined", () => {
    const row = DEMO_CLAIM_LEDGER.find((c) => c.status === "submitted")!;
    const mapped = toClaimRecord(row);
    expect("decidedAt" in mapped).toBe(false);
    expect("amountPaid" in mapped).toBe(false);
  });
});

describe("toClaimRecords + the demo ledger story", () => {
  it("maps every row and keeps the ledger's deliberate mix of standings", () => {
    const claims = toClaimRecords(DEMO_CLAIM_LEDGER);
    expect(claims).toHaveLength(DEMO_CLAIM_LEDGER.length);

    const findings = assessReceivables(claims);
    const standings = new Set(findings.map((finding) => finding.standing));
    // The demo ledger must exercise every standing the UI can render.
    expect(standings).toContain("on_track");
    expect(standings).toContain("due_soon");
    expect(standings).toContain("overdue");
    expect(standings).toContain("settled");
    expect(standings).toContain("underpaid");
    expect(standings).toContain("denied");
  });

  it("keeps the PhilHealth overdue claim past the verified 60-day window", () => {
    const claims = toClaimRecords(DEMO_CLAIM_LEDGER);
    const findings = assessReceivables(claims);
    const phOverdue = findings.find(
      (finding) =>
        finding.standing === "overdue" &&
        claims.find((claim) => claim.id === finding.claimId)?.payerId ===
          "philhealth",
    );
    expect(phOverdue).toBeDefined();
    expect(phOverdue!.deadline?.ruleRef).toBe(
      "reg:philhealth/philhealth-claim-payment",
    );
  });
});

describe("buildLedgerRows", () => {
  it("joins findings to claim facts in finding order", () => {
    const claims = toClaimRecords(DEMO_CLAIM_LEDGER);
    const findings = assessReceivables(claims);
    const rows = buildLedgerRows(findings, claims);

    expect(rows).toHaveLength(findings.length);
    expect(rows.map((row) => row.claimId)).toEqual(
      findings.map((finding) => finding.claimId),
    );
    const first = rows[0]!;
    expect(first.serviceName).toBe(claims[0]!.serviceName);
    expect(first.submittedAt).toBe(claims[0]!.submittedAt.slice(0, 10));
  });

  it("renders a finding whose claim is missing instead of dropping it", () => {
    const orphan: ReceivableFinding = {
      claimId: "ghost_1",
      standing: "on_track",
      amountOutstanding: 500,
      daysOutstanding: 3,
      rationale: "r",
    };
    const [row] = buildLedgerRows([orphan], []);
    expect(row!.serviceName).toBe("ghost_1");
    expect(row!.amountOutstanding).toBe(500);
  });
});

describe("resolveLedgerMessage", () => {
  it("names the chased pesos on approval and stays quiet on hold", () => {
    expect(resolveLedgerMessage("approved", 20400)).toContain("₱20,400");
    expect(resolveLedgerMessage("rejected", 20400)).toBe("Follow-ups held — logged.");
  });
});
