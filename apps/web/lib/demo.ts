// Seeded demo data for the v0 slice. Synthetic only — no real patient data.
// The demo org is "Helix Diagnostics, Makati". ROI events below feed
// @helix/core computeRoi so the dashboard shows a believable running total.

import type { OrgId, RoiSnapshot } from "@helix/shared";
import { computeRoi, type RoiEvent, type RoiWindow } from "@helix/core";

export const DEMO_ORG_ID = "org_helix_diagnostics_makati" as OrgId;
export const DEMO_ORG_NAME = "Helix Diagnostics, Makati";

// Payers the front desk can pick. IDs match the payer adapter registry keys.
export interface PayerOption {
  id: string;
  name: string;
}

export const DEMO_PAYERS: readonly PayerOption[] = [
  { id: "maxicare", name: "Maxicare" },
  { id: "philhealth", name: "PhilHealth" },
];

// Common walk-in services (administrative catalog only).
export interface ServiceOption {
  code: string;
  name: string;
  category:
    | "consult"
    | "laboratory"
    | "imaging"
    | "procedure"
    | "dialysis"
    | "dental"
    | "other";
}

export const DEMO_SERVICES: readonly ServiceOption[] = [
  { code: "MRI-BRAIN", name: "MRI (Brain, plain)", category: "imaging" },
  { code: "CBC", name: "Complete Blood Count (CBC)", category: "laboratory" },
  { code: "HD-SESSION", name: "Hemodialysis session", category: "dialysis" },
  { code: "CONSULT-IM", name: "Consult (Internal Medicine)", category: "consult" },
];

// A month of synthetic activity for the demo org. Deterministic so the panel
// reads the same on every load. Roughly: ~180 checks, 37 denials prevented,
// ~22 hours saved — the numbers in the demo script.
function seededEvents(): RoiEvent[] {
  const events: RoiEvent[] = [];
  const base = Date.UTC(2026, 6, 1, 9, 0, 0); // 2026-07-01
  const day = 24 * 60 * 60 * 1000;

  // 180 eligibility checks spread across the month; each displaces ~7 min of
  // manual portal/phone verification (0.117 hr) and takes ~1.8s of agent time.
  for (let i = 0; i < 180; i++) {
    events.push({
      type: "eligibility.checked",
      orgId: DEMO_ORG_ID,
      at: new Date(base + (i % 28) * day).toISOString(),
      durationMs: 1500 + (i % 5) * 150,
      manualBaselineHours: 0.117,
    });
  }

  // 37 would-be denials caught before submission, varied peso value.
  const claimValues = [8500, 12000, 3200, 22000, 6400];
  for (let i = 0; i < 37; i++) {
    events.push({
      type: "denial.prevented",
      orgId: DEMO_ORG_ID,
      at: new Date(base + (i % 28) * day).toISOString(),
      pesosRecovered: claimValues[i % claimValues.length]!,
    });
  }

  // Extra admin time saved by drafting LOAs automatically.
  for (let i = 0; i < 6; i++) {
    events.push({
      type: "time.saved",
      orgId: DEMO_ORG_ID,
      at: new Date(base + (i % 28) * day).toISOString(),
      hoursSaved: 0.25,
    });
  }

  return events;
}

const DEMO_WINDOW: RoiWindow = {
  orgId: DEMO_ORG_ID,
  windowStart: "2026-07-01T00:00:00.000Z",
  windowEnd: "2026-07-31T23:59:59.999Z",
};

/** Compute the demo org's ROI snapshot from seeded events (pure). */
export function demoRoiSnapshot(): RoiSnapshot {
  return computeRoi(seededEvents(), DEMO_WINDOW);
}
