import * as L from "../src/gdb/ledger";

// Pruebas obligatorias del spec «Clara Global Cards — Mobile MVP» (sección 6) y la tabla de ejemplo de la sección 3.
const T0 = 1_700_000_000_000;
const BANK: L.Bank = { name: "Banco Andino", account: "03214567890" };
const un = (r: L.Result): L.State => { if (!r.ok) throw new Error(r.code); return r.state; };
const code = (r: L.Result) => (r.ok ? null : r.code);
const pick = (s: L.State) => { const b = L.balances(s); return [b.posted, b.available, b.pending, b.reserved]; };

const invited = L.initialState({ employer: "Acme Mexico", employee: "Alex Rivera", country: "CO", amount: 100_00 });
/** Acepta la invitación y aprueba el KYC: el empleado ya tiene su cuenta USD. */
const verify = (s: L.State): L.State => un(L.resolveKyc(un(L.submitKyc(un(L.acceptInvitation(s)))), "approved"));
const verified = verify(invited);
// La empresa sólo puede enviar el beneficio cuando la cuenta ya existe.
const funded0 = un(L.createFunding(verified, 100_00, "ACME-BEN-001", T0));
const fid = funded0.fundings[0].id;
const approved = funded0;
const credited = un(L.confirmFunding(approved, fid, T0));
const active = un(L.activateCard(credited));

function auth(s: L.State, amount: number) {
  const r = L.authorize(s, "Café Bogotá", amount, T0);
  if ("code" in r) throw new Error(r.code);
  return r;
}

test("la tabla de ejemplo del spec: Posted / Available / Pending / Reserved en cada momento", () => {
  expect(pick(funded0)).toEqual([0, 0, 100_00, 0]);
  expect(pick(credited)).toEqual([100_00, 100_00, 0, 0]);
  const a = auth(active, 20_00);
  expect(pick(a.state)).toEqual([100_00, 80_00, 0, 20_00]);
  const cleared = un(L.clear(a.state, a.auth.id, T0));
  expect(pick(cleared)).toEqual([80_00, 80_00, 0, 0]);
  expect(pick(un(L.settle(cleared, a.auth.id, T0)))).toEqual([80_00, 80_00, 0, 0]);
});

test("sin invitación del admin no hay fondeo ni consentimiento; invitar es idempotente", () => {
  const blank = L.initialState({ employer: "Acme Mexico", employee: "Alex Rivera", country: "CO", amount: 100_00 }, false);
  expect(blank.invitation.status).toBe("none");
  expect(code(L.createFunding(blank, 100_00, "ACME-BEN-001", T0))).toBe("invalid_transition");
  expect(code(L.acceptInvitation(blank))).toBe("invalid_transition");
  const sent = un(L.invite(blank));
  expect(sent.invitation.status).toBe("sent");
  expect(un(L.invite(sent))).toBe(sent);
  // Invitado pero sin cuenta: todavía no hay a dónde enviar.
  expect(code(L.createFunding(sent, 100_00, "ACME-BEN-001", T0))).toBe("kyc_required");
  expect(pick(un(L.createFunding(verify(sent), 100_00, "ACME-BEN-001", T0)))).toEqual([0, 0, 100_00, 0]);
});

test("el beneficio sale de la cuenta de la empresa en Clara cuando Finanzas lo paga, y RH no puede comprometer más de lo que hay", () => {
  const acme = verify(L.initialState({ employer: "Acme Mexico", employee: "Alex Rivera", country: "CO", amount: 100_00 }, true, 150_00));
  const sent = un(L.createFunding(acme, 100_00, "ACME-BEN-001", T0, "bo.concept.remote"));
  expect(sent.companyBalance).toBe(150_00); // enviado por RH, aún sin pagar
  expect(L.committed(sent)).toBe(100_00);
  expect(sent.fundings[0]).toMatchObject({ amount: 100_00, status: "pending", concept: "bo.concept.remote" });
  expect(code(L.createFunding(sent, 50_01, "ACME-BEN-002", T0))).toBe("insufficient_funds");
  const two = un(L.createFunding(sent, 50_00, "ACME-BEN-002", T0));
  const paid = un(L.confirmFunding(two, two.fundings[0].id, T0));
  expect(paid.companyBalance).toBe(50_00);
  expect(L.committed(paid)).toBe(50_00);
  expect(un(L.confirmFunding(paid, paid.fundings[1].id, T0)).companyBalance).toBe(0);
  expect(un(L.confirmFunding(paid, paid.fundings[0].id, T0 + 1))).toBe(paid); // pagar dos veces no descuenta dos
});

test("KYC bloquea la emisión: sin aprobación no hay tarjeta, ni activación, ni se le puede enviar un beneficio", () => {
  const pending = un(L.submitKyc(un(L.acceptInvitation(invited))));
  expect(pending.card.status).toBe("none");
  expect(code(L.activateCard(pending))).toBe("kyc_required");
  expect(code(L.createFunding(pending, 100_00, "ACME-BEN-001", T0))).toBe("kyc_required");
  expect(pending.companyBalance).toBe(invited.companyBalance);
  const retry = un(L.resolveKyc(pending, "retry_required"));
  expect(retry.card.status).toBe("none");
  expect(un(L.resolveKyc(pending, "rejected")).card.status).toBe("none");
  // El reintento conserva el expediente y sí puede aprobarse.
  expect(un(L.resolveKyc(un(L.submitKyc(retry)), "approved")).card.status).toBe("issued");
  expect(code(L.submitKyc(un(L.resolveKyc(pending, "rejected"))))).toBe("invalid_transition");
});

test("un fondeo pending u on_hold no se puede gastar", () => {
  const act = un(L.activateCard(approved));
  const r = auth(act, 20_00);
  expect(r.auth).toMatchObject({ status: "declined", declineReason: "insufficient_funds" });
  expect(pick(r.state)).toEqual([0, 0, 100_00, 0]);
  const held = un(L.holdFunding(act, fid));
  expect(L.balances(held)).toMatchObject({ pending: 0, onHold: 100_00, available: 0 });
  expect(L.balances(un(L.confirmFunding(held, fid, T0))).available).toBe(100_00);
});

test("el depósito no es instantáneo: Finanzas paga, queda en camino sin sumar al saldo, y al llegar se acredita una vez", () => {
  const paid = un(L.payFunding(funded0, fid));
  expect(paid.fundings[0].status).toBe("processing");
  expect(paid.companyBalance).toBe(funded0.companyBalance - 100_00);
  expect(L.balances(paid)).toMatchObject({ posted: 0, available: 0, pending: 0, inTransit: 100_00 });
  expect(L.committed(paid)).toBe(0);
  expect(un(L.payFunding(paid, fid))).toBe(paid);
  const arrived = un(L.confirmFunding(paid, fid, T0));
  expect(arrived.companyBalance).toBe(paid.companyBalance); // no se descuenta otra vez
  expect(L.balances(arrived)).toMatchObject({ posted: 100_00, available: 100_00, inTransit: 0 });
  expect(un(L.confirmFunding(arrived, fid, T0 + 1))).toBe(arrived);
});

test("confirmar el fondeo dos veces acredita una sola", () => {
  const twice = un(L.confirmFunding(credited, fid, T0 + 1));
  expect(twice).toBe(credited);
  expect(L.balances(twice).posted).toBe(100_00);
});

test("la autorización reserva y el clearing no duplica el cargo", () => {
  const a = auth(active, 20_00);
  expect(a.auth.status).toBe("authorized");
  expect(L.balances(a.state)).toMatchObject({ posted: 100_00, available: 80_00, cardHolds: 20_00 });
  const cleared = un(L.clear(a.state, a.auth.id, T0));
  const again = un(L.clear(cleared, a.auth.id, T0 + 1));
  expect(again).toBe(cleared);
  expect(cleared.entries.filter((e) => e.kind === "card")).toHaveLength(1);
  expect(code(L.settle(a.state, a.auth.id, T0))).toBe("invalid_transition");
  const settled = un(L.settle(cleared, a.auth.id, T0));
  expect(settled.entries).toHaveLength(cleared.entries.length);
});

test("tarjeta congelada o sin saldo: se rechaza sin mover saldo ni crear reserva", () => {
  const frozen = un(L.freezeCard(active, true));
  const f = auth(frozen, 20_00);
  expect(f.auth).toMatchObject({ status: "declined", declineReason: "card_frozen" });
  expect(pick(f.state)).toEqual(pick(active));
  const big = auth(active, 100_01);
  expect(big.auth).toMatchObject({ status: "declined", declineReason: "insufficient_funds" });
  expect(pick(big.state)).toEqual(pick(active));
  expect(big.state.entries).toEqual(active.entries);
  // Descongelada vuelve a autorizar; sin activar, tampoco gasta.
  expect(auth(un(L.freezeCard(frozen, false)), 20_00).auth.status).toBe("authorized");
  expect(auth(credited, 20_00).auth.declineReason).toBe("card_not_active");
});

test("nunca se reserva más que el Available", () => {
  const a = auth(active, 80_00);
  expect(auth(a.state, 20_01).auth.status).toBe("declined");
  expect(auth(a.state, 20_00).auth.status).toBe("authorized");
  const q = L.quote(a.state, 20_01, 3950.25, T0);
  expect(q).toEqual({ code: "insufficient_funds" });
});

test("una cotización vencida bloquea: hay que pedir otra", () => {
  const q = L.quote(active, 30_00, 3950.25, T0);
  if ("code" in q) throw new Error(q.code);
  // La comisión va dentro de la tasa: el destinatario recibe el equivalente completo y `feeUsd` es sólo el dato interno.
  expect(q.quote).toMatchObject({ usd: 30_00, feeUsd: 30, local: Math.round(30_00 * 3950.25), expiresAt: T0 + L.QUOTE_TTL_MS });
  // Con el monto en pesos que tecleó el empleado, eso es exactamente lo que llega.
  const typed = L.quote(active, 2_53, 3950.25, T0, 10_000_00);
  if ("code" in typed) throw new Error(typed.code);
  expect(typed.quote).toMatchObject({ usd: 2_53, local: 10_000_00 });
  expect(code(L.acceptQuote(q.state, q.quote.id, T0 + L.QUOTE_TTL_MS))).toBe("quote_expired");
  const expired = un(L.expireQuote(q.state, q.quote.id));
  expect(code(L.acceptQuote(expired, q.quote.id, T0))).toBe("quote_expired");
  expect(L.withdraw(expired, q.quote.id, BANK, T0)).toEqual({ code: "quote_expired" });
  expect(L.withdraw(q.state, q.quote.id, BANK, T0)).toEqual({ code: "quote_not_accepted" });
  expect(L.balances(expired).available).toBe(100_00);
});

function withdrawing(s: L.State, usd: number) {
  const q = L.quote(s, usd, 3950.25, T0);
  if ("code" in q) throw new Error(q.code);
  const w = L.withdraw(un(L.acceptQuote(q.state, q.quote.id, T0 + 1)), q.quote.id, BANK, T0 + 2);
  if ("code" in w) throw new Error(w.code);
  return { ...w, quoteId: q.quote.id };
}

test("retiro: processing reserva, completed carga una sola vez", () => {
  const w = withdrawing(active, 30_00);
  expect(L.balances(w.state)).toMatchObject({ posted: 100_00, available: 70_00, withdrawalHolds: 30_00 });
  expect(L.withdraw(w.state, w.quoteId, BANK, T0)).toEqual({ code: "quote_used" });
  const done = un(L.completeWithdrawal(w.state, w.withdrawal.id, T0));
  expect(pick(done)).toEqual([70_00, 70_00, 0, 0]);
  expect(un(L.completeWithdrawal(done, w.withdrawal.id, T0))).toBe(done);
});

test("un retiro fallido recupera los fondos exactamente una vez, y sólo tras confirmar la reversión", () => {
  const w = withdrawing(active, 30_00);
  const failed = un(L.failWithdrawal(w.state, w.withdrawal.id));
  expect(L.balances(failed)).toMatchObject({ posted: 100_00, available: 70_00, withdrawalHolds: 30_00 });
  const reversed = un(L.confirmReversal(failed, w.withdrawal.id, T0));
  expect(pick(reversed)).toEqual([100_00, 100_00, 0, 0]);
  expect(un(L.confirmReversal(reversed, w.withdrawal.id, T0 + 1))).toBe(reversed);
  expect(reversed.entries).toEqual(active.entries);
  expect(code(L.confirmReversal(w.state, w.withdrawal.id, T0))).toBe("invalid_transition");
  expect(code(L.completeWithdrawal(failed, w.withdrawal.id, T0))).toBe("invalid_transition");
  // Corregido el banco, un retiro nuevo sí pasa.
  const retry = withdrawing(reversed, 30_00);
  expect(pick(un(L.completeWithdrawal(retry.state, retry.withdrawal.id, T0)))).toEqual([70_00, 70_00, 0, 0]);
});
