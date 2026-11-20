import { type Key, tr } from "../src/gdb/copy";
import { ENDPOINTS, endpointSummary, TRACE_KEYS } from "../src/gdb/endpoints";
import { createTracer } from "../src/gdb/trace";

test("cada endpoint del catálogo tiene su frase; ninguno menciona el modelo anterior (passkey, Turnkey, Stripe)", () => {
  for (const k of TRACE_KEYS) {
    expect(tr(endpointSummary(k) as Key).length).toBeGreaterThan(10);
    const text = JSON.stringify(ENDPOINTS[k]) + tr(endpointSummary(k) as Key);
    expect(text).not.toMatch(/turnkey|passkey|stripe|spei|clabe/i);
  }
});

test("los que llegan solos son HOOK y dicen de dónde vienen", () => {
  for (const k of TRACE_KEYS) if (ENDPOINTS[k].method === "HOOK") expect(ENDPOINTS[k].upstream[0]).toMatch(/^←/);
});

test("el registro conserva las últimas llamadas, avisa a quien escucha y se apaga", () => {
  const t = createTracer(2);
  let n = 0;
  const off = t.subscribe(() => { n += 1; });
  t.hit("invite"); t.hit("acceptTerms"); const id = t.hit("submitKyc");
  expect(t.getHits().map((h) => h.key)).toEqual(["acceptTerms", "submitKyc"]);
  expect(n).toBe(3);
  t.dismiss(id as number);
  expect(t.getHits().map((h) => h.key)).toEqual(["acceptTerms"]);
  // Una cotización que se repite al teclear reemplaza a la anterior.
  t.hit("quote", ["a"]); t.hit("quote", ["b"]);
  expect(t.getHits().map((h) => h.lines?.[0] ?? h.key)).toEqual(["acceptTerms", "b"]);
  t.setEnabled(false);
  expect(t.getHits()).toEqual([]);
  expect(t.hit("quote")).toBeNull();
  off();
});
