// Adapter registry — the single place business logic resolves a PayerAdapter.
// Guardrail: `live` mode is NOT implemented. Real payer automation must never
// run on unconfirmed rules (see brain/ph-payer-landscape.md), so we throw
// loudly rather than silently degrade to a mock or hit a real payer by accident.

import type { AdapterMode } from "@helix/shared";
import type { PayerAdapter } from "./adapter";
import { createMaxicareAdapter } from "./mock/maxicare";
import { createPhilHealthAdapter } from "./mock/philhealth";

export class NotImplementedError extends Error {
  readonly code = "not_implemented";
  constructor(message: string) {
    super(message);
    this.name = "NotImplementedError";
  }
}

export class UnknownPayerError extends Error {
  readonly code = "unknown_payer";
  constructor(payerId: string) {
    super(`No adapter registered for payer "${payerId}"`);
    this.name = "UnknownPayerError";
  }
}

type AdapterFactory = () => PayerAdapter;

// Registered mock adapters, keyed by canonical payer id.
const MOCK_FACTORIES: Readonly<Record<string, AdapterFactory>> = {
  maxicare: createMaxicareAdapter,
  philhealth: createPhilHealthAdapter,
};

/** Canonical payer ids that have a registered mock adapter. */
export function listPayerIds(): string[] {
  return Object.keys(MOCK_FACTORIES);
}

/**
 * Resolve a PayerAdapter for `payerId`.
 * @throws NotImplementedError when `mode === "live"` (guardrail).
 * @throws UnknownPayerError when no adapter is registered for `payerId`.
 */
export function getAdapter(payerId: string, mode: AdapterMode): PayerAdapter {
  if (mode === "live") {
    throw new NotImplementedError(
      `Live payer integration for "${payerId}" is not implemented. ` +
        "Real automation must not run on unconfirmed payer rules.",
    );
  }

  const factory = MOCK_FACTORIES[payerId];
  if (!factory) throw new UnknownPayerError(payerId);
  return factory();
}
