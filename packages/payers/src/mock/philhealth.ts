// Mock PhilHealth adapter — government universal cover. Benefits flow via case
// rates / eClaims rather than HMO-style LOAs, so services do not gate on an
// LOA here. Driven by fixtures.

import philhealthFixture from "../fixtures/philhealth.json";
import { MockPayerAdapter } from "./base";

export function createPhilHealthAdapter(): MockPayerAdapter {
  return new MockPayerAdapter(philhealthFixture);
}
