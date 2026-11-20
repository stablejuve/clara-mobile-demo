import { feed as feedAt, filterFeed, isVoid } from "../src/gdb/activity";
import * as L from "../src/gdb/ledger";

const RATE = 3950.25;
const feed = (s: L.State) => feedAt(s, RATE);

// Movimientos como los ve el empleado: moneda local primero, dólares debajo, y sólo «pendiente», «hecho» o «no pasó».

function active(): L.State {
  let s = L.initialState({ employer: "Acme Mexico", employee: "Alex", country: "CO", amount: 100_00 });
  const step = (r: L.Result): void => { if (!r.ok) throw new Error(r.code); s = r.state; };
  step(L.acceptInvitation(s)); step(L.submitKyc(s)); step(L.resolveKyc(s, "approved"));
  step(L.createFunding(s, 100_00, "REF", 1, "Remote work stipend"));
  return s;
}
const pay = (s: L.State, usd: number, local: number, at: number) => { const r = L.authorize(s, "Café Bogotá", usd, at, local); if ("code" in r) throw new Error(r.code); return r; };

test("un beneficio que la empresa aún no paga no aparece; pagado, sale pendiente y al llegar entra en pesos con los dólares debajo", () => {
  const s = active();
  expect(feed(s)).toEqual([]);
  // Finanzas ya pagó: viene en camino y se ve como pendiente.
  const sent = L.payFunding(s, "fund_1");
  if (!sent.ok) throw new Error(sent.code);
  expect(feed(sent.state)).toMatchObject([{ kind: "funding", status: "pending", primary: "+COP 395,025" }]);
  const paid = L.confirmFunding(sent.state, "fund_1", 2);
  if (!paid.ok) throw new Error(paid.code);
  expect(feed(paid.state)).toMatchObject([{ kind: "funding", status: "done", primary: "+COP 395,025", secondary: "$100.00", note: "Remote work stipend" }]);
});

test("compra: pesos primero y dólares debajo; pendiente hasta que el dinero sale, luego hecha", () => {
  let s = active();
  const f = L.confirmFunding(s, "fund_1", 2); if (!f.ok) throw new Error(f.code);
  const c = L.activateCard(f.state); if (!c.ok) throw new Error(c.code);
  const a = pay(c.state, 20_25, 80_000_00, 3);
  expect(feed(a.state)[0]).toMatchObject({ kind: "card", status: "pending", primary: "COP 80,000", secondary: "$20.25" });
  const m = L.confirmTransfer(a.state, a.auth.id, 4); if (!m.ok) throw new Error(m.code);
  expect(feed(m.state)[0].status).toBe("done");
  // Rechazada: queda en la lista, tachada, sin tocar el saldo.
  const big = pay(m.state, 151_89, 600_000_00, 5);
  const top = feed(big.state)[0];
  expect(top).toMatchObject({ status: "declined", primary: "COP 600,000" });
  expect(isVoid(top)).toBe(true);
  s = big.state;
  expect(L.balances(s).available).toBe(100_00 - 20_25);
});

test("búsqueda por nombre sin acentos ni mayúsculas, y filtro por tipo", () => {
  const f = L.confirmFunding(active(), "fund_1", 2); if (!f.ok) throw new Error(f.code);
  const c = L.activateCard(f.state); if (!c.ok) throw new Error(c.code);
  const items = feed(pay(c.state, 20_25, 80_000_00, 3).state);
  expect(filterFeed(items, "bogota", "all").map((i) => i.kind)).toEqual(["card"]);
  expect(filterFeed(items, "ACME", "all").map((i) => i.kind)).toEqual(["funding"]);
  expect(filterFeed(items, "", "funding")).toHaveLength(1);
  expect(filterFeed(items, "bogota", "funding")).toEqual([]);
});
