import * as L from "../src/gdb/ledger";
import { BRIDGE_CALLS, cardRail } from "../src/gdb/rail";

// Esquema «Tarjeta de Clara. Fondos en Bridge.»: al confirmarse la aprobación en Mastercard, Clara mueve los fondos entre wallets
// de Bridge; la compensación y el settlement con la red llegan después y no vuelven a cobrar.

function funded(): L.State {
  let s = L.initialState({ employer: "Acme", employee: "Alex", country: "CO", amount: 100_00 });
  const step = (r: L.Result): void => { if (!r.ok) throw new Error(r.code); s = r.state; };
  step(L.acceptInvitation(s)); step(L.submitKyc(s)); step(L.resolveKyc(s, "approved"));
  step(L.createFunding(s, 100_00, "REF", 1)); step(L.confirmFunding(s, "fund_1", 2)); step(L.activateCard(s));
  return s;
}
const states = (xs: { state: string }[]) => xs.map((x) => x.state);

test("aprobada: se reserva y la transferencia en Bridge queda en proceso; todavía no sale nada de la wallet", () => {
  const r = L.authorize(funded(), "Café Bogotá", 20_00, 3);
  if ("code" in r) throw new Error(r.code);
  const rail = cardRail(r.auth);
  expect(rail.usdc).toBe("20.00");
  expect(rail.stage).toBe("moving");
  expect(r.auth.transferId).toBe(`btr_${r.auth.id}`);
  expect(r.auth.movedAt).toBeNull();
  expect(states(rail.authorization)).toEqual(["done", "done", "done"]);
  expect(states(rail.settlement)).toEqual(["current", "todo", "todo", "todo"]);
  expect(rail.settlement[0].call).toBe(BRIDGE_CALLS.walletToWallet);
  expect(L.balances(r.state)).toMatchObject({ posted: 100_00, cardHolds: 20_00, available: 80_00 });
});

test("transferencia confirmada: los fondos salen una sola vez y el Available no cambia; compensación y settlement no vuelven a cobrar", () => {
  const r = L.authorize(funded(), "Café Bogotá", 20_00, 3);
  if ("code" in r) throw new Error(r.code);
  const m = L.confirmTransfer(r.state, r.auth.id, 4);
  if (!m.ok) throw new Error(m.code);
  expect(m.state.auths[0]).toMatchObject({ status: "authorized", movedAt: 4 });
  expect(L.balances(m.state)).toMatchObject({ posted: 80_00, cardHolds: 0, available: 80_00 });
  expect(cardRail(m.state.auths[0]).stage).toBe("moved");
  expect(states(cardRail(m.state.auths[0]).settlement)).toEqual(["done", "done", "todo", "todo"]);
  const again = L.confirmTransfer(m.state, r.auth.id, 5);
  expect(again.ok && again.state).toBe(m.state);

  const c = L.clear(m.state, r.auth.id, 6);
  if (!c.ok) throw new Error(c.code);
  expect(c.state.entries.filter((e) => e.kind === "card")).toHaveLength(1);
  expect(states(cardRail(c.state.auths[0]).settlement)).toEqual(["done", "done", "current", "todo"]);
  expect(cardRail(c.state.auths[0]).settlement[2].call).toBe(BRIDGE_CALLS.offRamp);

  const st = L.settle(c.state, r.auth.id, 7);
  if (!st.ok) throw new Error(st.code);
  expect(states(cardRail(st.state.auths[0]).settlement)).toEqual(["done", "done", "done", "done"]);
  expect(L.balances(st.state)).toMatchObject({ posted: 80_00, cardHolds: 0, available: 80_00 });
});

test("rechazada: el emisor la corta en la autorización; no hay transferencia ni movimiento de fondos", () => {
  const r = L.authorize(funded(), "Café Bogotá", 150_00, 3);
  if ("code" in r) throw new Error(r.code);
  const rail = cardRail(r.auth);
  expect(rail.stage).toBe("declined");
  expect(r.auth.transferId).toBeNull();
  expect(states(rail.authorization)).toEqual(["done", "done", "bad"]);
  expect(states(rail.settlement)).toEqual(["todo", "todo", "todo", "todo"]);
  expect(L.confirmTransfer(r.state, r.auth.id, 4)).toEqual({ ok: false, code: "invalid_transition" });
});
