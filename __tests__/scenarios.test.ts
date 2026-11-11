import { memoryKv } from "../src/storage/kv";
import { DEFAULT_SCENARIO, loadScenario, parseScenario, rulesFor, saveScenario, SCENARIO_KEY, SCENARIOS } from "../src/relayer/mock/scenarios";

test("los seis escenarios del spec; happy es el default", () => {
  expect(SCENARIOS).toEqual(["happy", "kyc_rejected", "cards_unavailable_region", "endorsement_expired", "send_failed", "bank_verification_failed"]);
  expect(DEFAULT_SCENARIO).toBe("happy");
});

test("cada escenario cambia exactamente una regla respecto a happy", () => {
  const base = rulesFor("happy");
  expect(base).toEqual({ kycOutcome: "approved", kycRejectionReasons: [], kycApprovedAgoMs: 0, cardsAvailable: true, bankOutcome: "verified", sendOutcome: "completed" });
  expect(rulesFor("kyc_rejected")).toEqual({ ...base, kycOutcome: "rejected", kycRejectionReasons: ["id_document_unreadable", "address_mismatch"] });
  expect(rulesFor("cards_unavailable_region")).toEqual({ ...base, cardsAvailable: false });
  expect(rulesFor("endorsement_expired")).toEqual({ ...base, kycApprovedAgoMs: 25 * 60 * 60 * 1000 });
  expect(rulesFor("send_failed")).toEqual({ ...base, sendOutcome: "failed" });
  expect(rulesFor("bank_verification_failed")).toEqual({ ...base, bankOutcome: "failed" });
});

test("parseScenario cae a happy; load/save persisten bajo relayer.scenario.v1", async () => {
  expect(parseScenario("send_failed")).toBe("send_failed");
  expect(parseScenario("nope")).toBe("happy");
  expect(parseScenario(null)).toBe("happy");
  const kv = memoryKv();
  expect(await loadScenario(kv)).toBe("happy");
  await saveScenario(kv, "kyc_rejected");
  expect(kv.data[SCENARIO_KEY]).toBe("kyc_rejected");
  expect(await loadScenario(kv)).toBe("kyc_rejected");
});
