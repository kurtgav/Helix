# Helix demo seed

Deterministic demo data for **Helix Diagnostics, Makati** — a fixed dataset that
makes the ROI panel show real, repeatable numbers on every run.

## Run

```bash
pnpm tsx scripts/seed.ts
```

- **`DATABASE_URL` set** → inserts the dataset into `@helix/db` (idempotent:
  re-runs conflict-skip on primary keys, so it is safe to run repeatedly).
- **`DATABASE_URL` unset** → writes `scripts/seed-data.json` for the web ROI
  panel running in mock mode.

The script logs only counts and ROI totals — never patient data (PHI).

## What it creates

| Entity | Count | Notes |
| --- | --- | --- |
| Org | 1 | Helix Diagnostics, Makati |
| Users | 3 | `owner`, `staff`, `viewer` (RBAC roles) |
| Payers | 4 | Maxicare, Intellicare, Medicard (HMO), PhilHealth |
| Services | 8 | LOA-needed imaging/dialysis (MRI, CT, UTZ, HD) + no-LOA labs (CBC, FBS, Lipid) + consult |
| Encounters | 30 | Spread across all payers, mixing eligible / ineligible / needs-review |
| Eligibility checks | 30 | One per encounter, with requirements, gaps, and cited `Evidence` |
| LOA requests | — | Drafted only for eligible LOA-needed encounters |

### ROI outcomes

Each encounter emits `@helix/core` ROI events that aggregate (via `computeRoi`)
into a `RoiSnapshot`:

- **checksRun** — one automated eligibility check per encounter (30).
- **denialsPrevented / pesosRecovered** — a denial is prevented whenever the
  agent catches an inactive coverage or a missing LOA referral **before**
  submission; the preserved service cost is recovered.
- **hoursSaved** — 15 min saved per eligibility check + 30 min per
  auto-drafted LOA versus the manual phone/portal baseline.

All values are deterministic (no `Math.random` / `Date.now`), so
`buildDataset()` returns byte-identical output every run.

## Files

- `dataset.ts` — pure, deterministic dataset builder (import `buildDataset()`).
- `seed.ts` — CLI entrypoint: DB insert or JSON emit.
- `dataset.test.ts` — verifies internal consistency and `ROI > 0`.
