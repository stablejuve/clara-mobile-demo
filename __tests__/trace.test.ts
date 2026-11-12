import { ENDPOINTS } from "../src/relayer/endpoints";
import { createTracer, withTrace } from "../src/relayer/trace";

test("catálogo: cada entrada tiene ruta, descripción y documentación; las por construir dicen lo más parecido o son nuevas", () => {
  for (const [k, e] of Object.entries(ENDPOINTS)) {
    expect([k, e.path.startsWith("/")]).toEqual([k, true]);
    expect([k, e.summary.length > 10]).toEqual([k, true]);
    expect([k, e.docs.length > 0 && e.docs.every((d) => d.url.startsWith("https://"))]).toEqual([k, true]);
  }
  // Los que ya existen en relayer-core.
  expect(ENDPOINTS.quoteSend).toMatchObject({ method: "POST", path: "/v1/offramp/quote", status: "exists" });
  expect(ENDPOINTS.confirmSend).toMatchObject({ method: "POST", path: "/v1/payouts", status: "exists" });
  expect(ENDPOINTS.kycVerdict).toMatchObject({ method: "HOOK", path: "/hooks/bridge" });
});

test("withTrace: chip pendiente → ok / error; lecturas quiet y apagado no registran", async () => {
  const tr = createTracer();
  const api = withTrace({
    addBeneficiary: async () => "b",
    quoteSend: async () => { throw new Error("x"); },
    getModule: async () => "m",
    getSnapshot: () => "snap",
  }, tr);
  const p = api.addBeneficiary();
  expect(tr.hits.map((h) => [h.key, h.state])).toEqual([["addBeneficiary", "pending"]]);
  await p;
  expect(tr.hits.map((h) => h.state)).toEqual(["ok"]);
  await expect(api.quoteSend()).rejects.toThrow("x");
  expect(tr.hits.map((h) => [h.key, h.state])).toEqual([["addBeneficiary", "ok"], ["quoteSend", "error"]]);
  await api.getModule();
  expect(api.getSnapshot()).toBe("snap");
  expect(tr.hits).toHaveLength(2);
  tr.setEnabled(false);
  await api.addBeneficiary();
  expect(tr.hits).toHaveLength(0);
});

test("se ven como mucho 3; dismiss quita uno", () => {
  const tr = createTracer();
  for (const k of ["acceptTerms", "submitKyc", "createPasskey", "authorizeCard"] as const) tr.hit(k);
  expect(tr.hits.map((h) => h.key)).toEqual(["submitKyc", "createPasskey", "authorizeCard"]);
  tr.dismiss(tr.hits[0].id);
  expect(tr.hits.map((h) => h.key)).toEqual(["createPasskey", "authorizeCard"]);
});
