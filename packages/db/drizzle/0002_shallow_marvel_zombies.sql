-- Additive + reversible: deterministic policy-intelligence checks (coverage
-- window, waiting period, PEC, benefit limit, filing window) persisted with
-- each eligibility check. Nullable so rows written before the policy layer
-- shipped simply have none.
-- Rollback: ALTER TABLE "eligibility_checks" DROP COLUMN "policy_checks";
ALTER TABLE "eligibility_checks" ADD COLUMN "policy_checks" jsonb;
