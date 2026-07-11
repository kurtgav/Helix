// Deterministic demo dataset for Helix Diagnostics, Makati.
//
// PURE + DETERMINISTIC: no Math.random, no Date.now. Every id, timestamp, and
// ROI number is derived from fixed seed constants so the demo renders the same
// numbers on every run. ADMINISTRATIVE only — eligibility/LOA outcomes here are
// illustrative fixtures, never clinical reasoning.
//
// The same dataset feeds two sinks (see seed.ts): a live @helix/db insert when
// DATABASE_URL is set, and a seed-data.json emitted for the web ROI panel's
// mock mode otherwise.

import { createHash } from "node:crypto";
import type {
  OrgId,
  UserId,
  PatientId,
  CoverageId,
  EncounterId,
  PayerId,
  Role,
  Payer,
  Patient,
  Coverage,
  Service,
  ServiceCategory,
  EligibilityResult,
  LOARequest,
  RoiSnapshot,
} from "@helix/shared";
import { computeRoi, type RoiEvent, type RoiWindow } from "@helix/core";

// --- Deterministic primitives -------------------------------------------

/** Fixed wall-clock anchor for the demo window (never Date.now). */
const BASE_ISO = "2026-07-01T08:00:00.000Z";
const BASE_MS = Date.parse(BASE_ISO);
const MINUTE_MS = 60_000;

/** ISO timestamp offset a fixed number of minutes from the anchor. */
function ts(minutesFromBase: number): string {
  return new Date(BASE_MS + minutesFromBase * MINUTE_MS).toISOString();
}

/**
 * Deterministic RFC-4122-shaped UUID (v5-style) from a seed string. Stable and
 * valid for Postgres uuid columns, so the same seed always maps to the same row
 * without needing DB round-trips to resolve foreign keys.
 */
function uuid(seed: string): string {
  const hex = createHash("sha256").update(seed).digest("hex").slice(0, 32);
  const chars = hex.split("");
  chars[12] = "5"; // version nibble
  const variant = ((parseInt(hex[16] ?? "0", 16) & 0x3) | 0x8).toString(16);
  chars[16] = variant;
  const h = chars.join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/** Index into a fixed array, asserting presence (satisfies noUncheckedIndexedAccess). */
function at<T>(arr: readonly T[], i: number): T {
  const v = arr[i % arr.length];
  if (v === undefined) {
    throw new Error(`dataset: empty pick set at index ${i}`);
  }
  return v;
}

// --- ROI tuning constants (the manual baseline we beat) -----------------

const MANUAL_VERIFY_HOURS = 0.25; // 15 min manual phone/portal check displaced
const LOA_DRAFT_HOURS = 0.5; // 30 min of manual LOA paperwork automated
const ENCOUNTER_COUNT = 30;

// --- Fixtures -----------------------------------------------------------

interface ServiceSpec extends Service {
  costPesos: number;
  needsLoa: boolean;
}

const SERVICE_SPECS: readonly ServiceSpec[] = [
  { code: "MRI-BRAIN", name: "MRI of the Brain", category: "imaging", costPesos: 12000, needsLoa: true },
  { code: "CT-CHEST", name: "CT Scan, Chest", category: "imaging", costPesos: 9000, needsLoa: true },
  { code: "UTZ-ABD", name: "Ultrasound, Whole Abdomen", category: "imaging", costPesos: 3500, needsLoa: true },
  { code: "CBC", name: "Complete Blood Count", category: "laboratory", costPesos: 450, needsLoa: false },
  { code: "FBS", name: "Fasting Blood Sugar", category: "laboratory", costPesos: 250, needsLoa: false },
  { code: "LIPID", name: "Lipid Profile", category: "laboratory", costPesos: 900, needsLoa: false },
  { code: "HD", name: "Hemodialysis Session", category: "dialysis", costPesos: 4000, needsLoa: true },
  { code: "CONSULT", name: "Specialist Consultation", category: "consult", costPesos: 800, needsLoa: false },
];

interface PayerSpec {
  key: string;
  name: string;
  kind: Payer["kind"];
}

const PAYER_SPECS: readonly PayerSpec[] = [
  { key: "maxicare", name: "Maxicare", kind: "hmo" },
  { key: "intellicare", name: "Intellicare", kind: "hmo" },
  { key: "medicard", name: "Medicard", kind: "hmo" },
  { key: "philhealth", name: "PhilHealth", kind: "philhealth" },
];

const PATIENT_NAMES: readonly string[] = [
  "Juan Dela Cruz", "Maria Santos", "Jose Rizal", "Andres Bonifacio",
  "Corazon Aquino", "Emilio Aguinaldo", "Gabriela Silang", "Apolinario Mabini",
  "Melchora Aquino", "Antonio Luna", "Gregorio del Pilar", "Teresa Magbanua",
  "Marcelo del Fajardo", "Rosa Reyes", "Diego Salazar", "Luisa Villanueva",
  "Ramon Aguilar", "Josefa Llanes", "Pedro Gomez", "Isabela Torres",
];

// --- Dataset shape ------------------------------------------------------

export interface SeedUser {
  id: UserId;
  orgId: OrgId;
  email: string;
  fullName: string;
  role: Role;
  createdAt: string;
}

export interface SeedEncounter {
  encounter: {
    id: EncounterId;
    orgId: OrgId;
    patientId: PatientId;
    coverageId: CoverageId;
    service: Service;
    status: "approved" | "rejected" | "awaiting_approval";
    createdAt: string;
  };
  payerId: PayerId;
  costPesos: number;
  needsLoa: boolean;
  eligibility: EligibilityResult;
  loa?: LOARequest;
  /** A denial was prevented on this encounter (ineligibility or missing LOA doc caught pre-submit). */
  denialPrevented: boolean;
}

export interface SeedDataset {
  org: { id: OrgId; name: string; createdAt: string };
  users: SeedUser[];
  payers: Payer[];
  services: Service[];
  patients: Patient[];
  coverages: Coverage[];
  encounters: SeedEncounter[];
  events: RoiEvent[];
  window: RoiWindow;
  roi: RoiSnapshot;
}

// --- Builder ------------------------------------------------------------

const ORG_ID = uuid("org:helix-diagnostics-makati") as OrgId;

export function buildDataset(): SeedDataset {
  const org = {
    id: ORG_ID,
    name: "Helix Diagnostics, Makati",
    createdAt: ts(0),
  };

  const users: SeedUser[] = [
    { role: "owner", fullName: "Grace Villanueva", email: "grace.owner@helixdx.ph" },
    { role: "staff", fullName: "Miguel Ramos", email: "miguel.staff@helixdx.ph" },
    { role: "viewer", fullName: "Liza Fernandez", email: "liza.viewer@helixdx.ph" },
  ].map((u, i) => ({
    id: uuid(`user:${u.email}`) as UserId,
    orgId: ORG_ID,
    email: u.email,
    fullName: u.fullName,
    role: u.role as Role,
    createdAt: ts(i + 1),
  }));

  const payers: Payer[] = PAYER_SPECS.map((p) => ({
    id: uuid(`payer:${p.key}`) as PayerId,
    name: p.name,
    kind: p.kind,
    mode: "mock",
  }));

  const services: Service[] = SERVICE_SPECS.map((s) => ({
    code: s.code,
    name: s.name,
    category: s.category as ServiceCategory,
  }));

  const patients: Patient[] = [];
  const coverages: Coverage[] = [];
  const encounters: SeedEncounter[] = [];
  const events: RoiEvent[] = [];

  for (let i = 0; i < ENCOUNTER_COUNT; i++) {
    const payerSpec = at(PAYER_SPECS, i);
    const payer = at(payers, i);
    const spec = at(SERVICE_SPECS, i);
    const name = at(PATIENT_NAMES, i);

    // Deterministic eligibility outcome mix.
    const isIneligible = i % 6 === 5; // ~5/30 fail coverage
    const needsReview = !isIneligible && i % 7 === 6; // a couple need review
    const eligible = !isIneligible && !needsReview;

    const patientId = uuid(`patient:${i}:${name}`) as PatientId;
    const coverageId = uuid(`coverage:${i}`) as CoverageId;
    const encounterId = uuid(`encounter:${i}`) as EncounterId;
    const createdAt = ts(60 + i * 20); // spread across the window

    patients.push({
      id: patientId,
      orgId: ORG_ID,
      fullName: name,
      birthDate: birthDateFor(i),
      sex: i % 2 === 0 ? "M" : "F",
      createdAt,
    });

    coverages.push({
      id: coverageId,
      patientId,
      payerId: payer.id,
      memberId: `${payerSpec.key.toUpperCase().slice(0, 3)}-${100000 + i}`,
      planName: planNameFor(payerSpec, i),
      status: isIneligible ? "inactive" : "active",
    });

    // Missing LOA doc caught for half of eligible LOA-needed imaging/dialysis.
    const missingLoaDoc = eligible && spec.needsLoa && i % 2 === 0;
    const denialPrevented = isIneligible || missingLoaDoc;

    const eligibility = buildEligibility(spec, payerSpec, {
      eligible,
      isIneligible,
      needsReview,
      missingLoaDoc,
      checkedAt: ts(61 + i * 20),
    });

    let loa: LOARequest | undefined;
    if (spec.needsLoa && eligible) {
      loa = {
        id: uuid(`loa:${i}`) as import("@helix/shared").LOARequestId,
        encounterId,
        payerId: payer.id,
        serviceCode: spec.code,
        status: missingLoaDoc ? "draft" : "ready",
        body: draftLoaBody(name, spec, payerSpec),
        requiredDocs: ["referral", "member_id"],
        missingDocs: missingLoaDoc ? ["referral"] : [],
        createdAt: ts(62 + i * 20),
      };
    }

    const status: SeedEncounter["encounter"]["status"] = isIneligible
      ? "rejected"
      : missingLoaDoc || needsReview
        ? "awaiting_approval"
        : "approved";

    encounters.push({
      encounter: {
        id: encounterId,
        orgId: ORG_ID,
        patientId,
        coverageId,
        service: at(services, i),
        status,
        createdAt,
      },
      payerId: payer.id,
      costPesos: spec.costPesos,
      needsLoa: spec.needsLoa,
      eligibility,
      loa,
      denialPrevented,
    });

    // --- ROI events derived from the encounter ---
    // Every encounter ran an automated eligibility check.
    events.push({
      type: "eligibility.checked",
      orgId: ORG_ID,
      at: ts(61 + i * 20),
      durationMs: 1500 + (i % 5) * 500, // deterministic 1.5s–3.5s
      manualBaselineHours: MANUAL_VERIFY_HOURS,
    });

    // A denial was prevented before a doomed submission.
    if (denialPrevented) {
      events.push({
        type: "denial.prevented",
        orgId: ORG_ID,
        at: ts(63 + i * 20),
        pesosRecovered: spec.costPesos,
      });
    }

    // LOA paperwork auto-drafted for eligible LOA-needed services.
    if (spec.needsLoa && eligible) {
      events.push({
        type: "time.saved",
        orgId: ORG_ID,
        at: ts(64 + i * 20),
        hoursSaved: LOA_DRAFT_HOURS,
      });
    }
  }

  const window: RoiWindow = {
    orgId: ORG_ID,
    windowStart: "2026-07-01T00:00:00.000Z",
    windowEnd: "2026-07-31T23:59:59.999Z",
  };
  const roi = computeRoi(events, window);

  return { org, users, payers, services, patients, coverages, encounters, events, window, roi };
}

// --- Fixture helpers ----------------------------------------------------

function birthDateFor(i: number): string {
  const year = 1958 + (i % 40);
  const month = String((i % 12) + 1).padStart(2, "0");
  const day = String((i % 27) + 1).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function planNameFor(payer: PayerSpec, i: number): string {
  if (payer.kind === "philhealth") return "PhilHealth Konsulta";
  const tiers = ["Platinum", "Gold", "Silver"];
  return `${payer.name} ${at(tiers, i)}`;
}

function buildEligibility(
  spec: ServiceSpec,
  payer: PayerSpec,
  opts: {
    eligible: boolean;
    isIneligible: boolean;
    needsReview: boolean;
    missingLoaDoc: boolean;
    checkedAt: string;
  },
): EligibilityResult {
  const evidence = [
    {
      source: `payer:${payer.key}/rules`,
      ref: `${payer.key}#${spec.category}`,
      snippet: spec.needsLoa
        ? `${spec.name} requires an approved Letter of Authorization (LOA) prior to service.`
        : `${spec.name} is covered without prior authorization.`,
    },
  ];

  if (opts.isIneligible) {
    return {
      status: "ineligible",
      requirements: [],
      gaps: [
        { kind: "coverage", message: "Coverage is inactive for the date of service.", blocking: true },
      ],
      evidence,
      checkedAt: opts.checkedAt,
    };
  }

  const requirements = spec.needsLoa
    ? [
        { type: "loa" as const, label: "Letter of Authorization", required: true, present: !opts.missingLoaDoc },
        { type: "referral" as const, label: "Doctor's referral", required: true, present: !opts.missingLoaDoc },
        { type: "member_id" as const, label: "HMO member ID", required: true, present: true },
      ]
    : [{ type: "member_id" as const, label: "HMO member ID", required: true, present: true }];

  const gaps = opts.missingLoaDoc
    ? [{ kind: "referral" as const, message: "Referral required for LOA is not on file.", blocking: true }]
    : [];

  return {
    status: opts.needsReview ? "needs_review" : "eligible",
    benefit: spec.needsLoa ? "Diagnostic benefit, subject to LOA approval." : "Outpatient benefit, no LOA required.",
    requirements,
    gaps,
    evidence,
    checkedAt: opts.checkedAt,
  };
}

function draftLoaBody(patientName: string, spec: ServiceSpec, payer: PayerSpec): string {
  return [
    `Request for Letter of Authorization`,
    `Payer: ${payer.name}`,
    `Member: ${patientName}`,
    `Service: ${spec.name} (${spec.code})`,
    `Administrative pre-authorization request drafted for staff review and approval.`,
  ].join("\n");
}
