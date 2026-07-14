-- Additive + reversible: measured verify latency per eligibility check.
-- Nullable so pre-measurement rows stay honest (aggregator substitutes its
-- documented default). Rollback: ALTER TABLE "eligibility_checks" DROP COLUMN "duration_ms";
ALTER TABLE "eligibility_checks" ADD COLUMN "duration_ms" integer;
