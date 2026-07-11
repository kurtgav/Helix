// Mock Maxicare adapter — a private HMO (the daily walk-in reality). Imaging
// and dialysis require an LOA; labs and consults do not. Driven by fixtures.

import maxicareFixture from "../fixtures/maxicare.json";
import { MockPayerAdapter } from "./base";

export function createMaxicareAdapter(): MockPayerAdapter {
  return new MockPayerAdapter(maxicareFixture);
}
