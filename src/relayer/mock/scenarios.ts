import type { KeyValueStorage } from "../../storage/kv";

// Escenarios conmutables desde el panel de demo (spec «Capa mock»). Cada uno cambia una regla del mock; persisten en AsyncStorage.
export type Scenario = "happy" | "kyc_rejected" | "cards_unavailable_region" | "endorsement_expired" | "send_failed" | "bank_verification_failed";
export const SCENARIOS: readonly Scenario[] = ["happy", "kyc_rejected", "cards_unavailable_region", "endorsement_expired", "send_failed", "bank_verification_failed"];
export const DEFAULT_SCENARIO: Scenario = "happy";
export const SCENARIO_KEY = "relayer.scenario.v1";

export type ScenarioRules = {
  kycOutcome: "approved" | "rejected";
  kycRejectionReasons: readonly string[];
  /** endorsement_expired: el KYC se aprueba "hace 25 h", así la tarjeta cae fuera de la ventana de 24 h. */
  kycApprovedAgoMs: number;
  cardsAvailable: boolean;
  bankOutcome: "verified" | "failed";
  sendOutcome: "completed" | "failed";
};

export function rulesFor(s: Scenario): ScenarioRules {
  const base: ScenarioRules = { kycOutcome: "approved", kycRejectionReasons: [], kycApprovedAgoMs: 0, cardsAvailable: true, bankOutcome: "verified", sendOutcome: "completed" };
  switch (s) {
    case "happy": return base;
    case "kyc_rejected": return { ...base, kycOutcome: "rejected", kycRejectionReasons: ["id_document_unreadable", "address_mismatch"] };
    case "cards_unavailable_region": return { ...base, cardsAvailable: false };
    case "endorsement_expired": return { ...base, kycApprovedAgoMs: 25 * 60 * 60 * 1000 };
    case "send_failed": return { ...base, sendOutcome: "failed" };
    case "bank_verification_failed": return { ...base, bankOutcome: "failed" };
  }
}

export function parseScenario(raw: string | null | undefined): Scenario {
  return (SCENARIOS as readonly string[]).includes(raw ?? "") ? (raw as Scenario) : DEFAULT_SCENARIO;
}
export async function loadScenario(kv: KeyValueStorage): Promise<Scenario> {
  try { return parseScenario(await kv.getItem(SCENARIO_KEY)); } catch { return DEFAULT_SCENARIO; }
}
export async function saveScenario(kv: KeyValueStorage, s: Scenario): Promise<void> {
  try { await kv.setItem(SCENARIO_KEY, s); } catch { /* sin persistencia, vuelve a happy al relanzar */ }
}
