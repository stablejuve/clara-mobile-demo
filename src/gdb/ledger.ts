// Global Dollar Benefits · ledger puro (sin React ni reloj propio). Spec «Clara Global Cards — Mobile MVP», secciones 3 y 6.
// Montos en CENTAVOS de USD enteros. Las pantallas no cambian números: llaman a estas transiciones, que son atómicas
// (devuelven un estado nuevo o un código de error) e idempotentes (repetir una confirmación no duplica movimientos).

export type KycStatus = "not_started" | "pending" | "approved" | "retry_required" | "rejected";
/** `pending`: enviado por RH, por pagar en Clara · `on_hold`: retenido por cumplimiento · `processing`: Finanzas ya lo pagó y el
 *  dinero va en camino a la cuenta del empleado (no es instantáneo) · `completed`: acreditado. */
export type FundingStatus = "pending" | "on_hold" | "processing" | "completed";
export type CardStatus = "none" | "issued" | "active" | "frozen";
export type AuthStatus = "authorized" | "cleared" | "settled" | "declined";
export type DeclineReason = "insufficient_funds" | "card_frozen" | "card_not_active";
export type QuoteStatus = "open" | "accepted" | "expired";
export type WithdrawalStatus = "processing" | "completed" | "failed" | "reversed";

/** `none`: la empresa aún no invita al empleado (arranque del guion); `sent`: invitado; `accepted`: consintió. */
export type Invitation = { employer: string; employee: string; country: string; amount: number; status: "none" | "sent" | "accepted" };
/** Beneficio enviado por RH: `pending` (por pagar en Clara) y `on_hold` no suman a Posted ni a Available; el empleado no los ve. */
export type Funding = { id: string; amount: number; status: FundingStatus; reference: string; /** Qué beneficio es (clave de copy o texto). */ concept: string; at: number };
/** Compra con tarjeta de Clara sobre fondos custodiados en Bridge (ver `rail.ts`):
 *  authorized → Mastercard confirmó la aprobación; Clara reserva el monto e instruye a Bridge la transferencia wallet del empleado
 *    → wallet de Clara (`transferId`). Mientras se procesa hay reserva; al confirmarse (`movedAt`) el cargo queda contabilizado.
 *  cleared → la red compensa la compra (los fondos ya salieron: no hay segundo cargo).
 *  settled → Clara liquida con Mastercard a través del banco liquidador. */
export type Authorization = {
  id: string; merchant: string; amount: number; status: AuthStatus; declineReason: DeclineReason | null; at: number;
  /** Monto en la moneda del comercio (centavos de COP), que es como lo ve el empleado; null si no se informó. */ local: number | null;
  /** Transferencia de Bridge wallet → wallet; null si la compra se rechazó. */ transferId: string | null;
  /** Cuándo salieron los fondos de la wallet del empleado; null mientras la transferencia se procesa. */ movedAt: number | null;
  clearedAt: number | null; settledAt: number | null;
};
/** Cotización de un retiro. `local`: lo que recibe el destinatario, exactamente lo que tecleó el empleado. `usd`: lo que sale de
 *  su saldo a esa `rate`. La comisión ya va dentro de la tasa: `feeUsd` es sólo el dato interno de cuánto de `usd` es comisión,
 *  no un cobro aparte. */
export type FxQuote = { id: string; usd: number; feeUsd: number; rate: number; local: number; currency: "COP"; status: QuoteStatus; expiresAt: number };
/** Destino de un retiro: banco (o «Bre-B»), cuenta o llave, y a nombre de quién está guardada la cuenta. */
export type Bank = { name: string; account: string; holder?: string };
/** Retiro: processing reserva; completed lo carga; failed sigue reservado hasta que la reversión se confirma (reversed). */
export type Withdrawal = { id: string; quoteId: string; usd: number; feeUsd: number; local: number; currency: "COP"; bank: Bank; status: WithdrawalStatus; at: number; doneAt: number | null };
/** Asiento contabilizado: lo único que mueve el saldo Posted. */
export type LedgerEntry = { id: string; kind: "funding" | "card" | "withdrawal"; ref: string; amount: number; at: number };

export type State = {
  invitation: Invitation;
  /** Saldo de la empresa en su cuenta de Clara: de ahí sale cada fondeo. */
  companyBalance: number;
  /** `reasons`: códigos del proveedor cuando pide correcciones (`retry_required`); cada uno apunta a una sección del expediente. */
  kyc: { status: KycStatus; attempts: number; reasons: readonly string[] };
  card: { status: CardStatus; last4: string | null; inWallet: boolean };
  fundings: readonly Funding[];
  auths: readonly Authorization[];
  quotes: readonly FxQuote[];
  withdrawals: readonly Withdrawal[];
  entries: readonly LedgerEntry[];
  seq: number;
};

export type ErrorCode =
  | "invalid_transition" | "not_found" | "kyc_required" | "insufficient_funds" | "invalid_amount"
  | "quote_expired" | "quote_not_accepted" | "quote_used";
export type Result = { ok: true; state: State } | { ok: false; code: ErrorCode };
const ok = (state: State): Result => ({ ok: true, state });
const fail = (code: ErrorCode): Result => ({ ok: false, code });

export const QUOTE_TTL_MS = 60_000;
/** Comisión de conversión: 1 % del monto. Va dentro de la tasa que ve el empleado; no se le cobra ni se le muestra aparte. */
export const FX_FEE_BPS = 100;

export function initialState(invitation: Omit<Invitation, "status">, invited = true, companyBalance = 25_000_00): State {
  return {
    invitation: { ...invitation, status: invited ? "sent" : "none" },
    companyBalance,
    kyc: { status: "not_started", attempts: 0, reasons: [] },
    card: { status: "none", last4: null, inWallet: false },
    fundings: [], auths: [], quotes: [], withdrawals: [], entries: [], seq: 0,
  };
}

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

export type Balances = {
  /** Fondos contabilizados. */ posted: number;
  /** Lo único que se puede gastar, convertir o retirar. */ available: number;
  /** Enviado por la empresa, aún sin acreditar. */ pending: number;
  /** En revisión de cumplimiento. */ onHold: number;
  /** Depósitos ya pagados por la empresa que vienen en camino: aún no suman al saldo. */ inTransit: number;
  /** Compras aprobadas cuyos fondos aún no salen de la wallet. */ cardHolds: number;
  /** Retiros en curso (o fallidos a la espera de la reversión). */ withdrawalHolds: number;
  /** cardHolds + withdrawalHolds. */ reserved: number;
};

/** Available = Posted − reservas de tarjeta − reservas de retiro. Un inbound pending no suma a nada gastable. */
export function balances(s: State): Balances {
  const posted = sum(s.entries.map((e) => e.amount));
  const cardHolds = sum(s.auths.filter((a) => a.status === "authorized" && a.movedAt === null).map((a) => a.amount));
  const withdrawalHolds = sum(s.withdrawals.filter((w) => w.status === "processing" || w.status === "failed").map((w) => w.usd));
  return {
    posted, cardHolds, withdrawalHolds, reserved: cardHolds + withdrawalHolds, available: posted - cardHolds - withdrawalHolds,
    pending: sum(s.fundings.filter((f) => f.status === "pending").map((f) => f.amount)),
    onHold: sum(s.fundings.filter((f) => f.status === "on_hold").map((f) => f.amount)),
    inTransit: sum(s.fundings.filter((f) => f.status === "processing").map((f) => f.amount)),
  };
}

const next = (s: State, prefix: string): [string, number] => [`${prefix}_${s.seq + 1}`, s.seq + 1];
const patch = <T extends { id: string }>(xs: readonly T[], id: string, p: Partial<T>): T[] => xs.map((x) => (x.id === id ? { ...x, ...p } : x));

// ── Invitación y KYC ─────────────────────────────────────────────────────────

/** El admin de la empresa invita al empleado. Repetirlo no cambia nada. */
export function invite(s: State): Result {
  return s.invitation.status === "none" ? ok({ ...s, invitation: { ...s.invitation, status: "sent" } }) : ok(s);
}

/** Consentimiento: la invitación vincula empresa + partner + empleado. */
export function acceptInvitation(s: State): Result {
  return s.invitation.status === "sent" ? ok({ ...s, invitation: { ...s.invitation, status: "accepted" } }) : s.invitation.status === "accepted" ? ok(s) : fail("invalid_transition");
}

export function submitKyc(s: State): Result {
  if (s.invitation.status !== "accepted") return fail("invalid_transition");
  if (s.kyc.status !== "not_started" && s.kyc.status !== "retry_required") return fail("invalid_transition");
  return ok({ ...s, kyc: { status: "pending", attempts: s.kyc.attempts + 1, reasons: [] } });
}

/** Veredicto del proveedor. Sólo `approved` emite la tarjeta (queda `issued`, por activar). */
export function resolveKyc(s: State, outcome: "approved" | "retry_required" | "rejected", reasons: readonly string[] = []): Result {
  if (s.kyc.status !== "pending") return fail("invalid_transition");
  const kyc = { ...s.kyc, status: outcome, reasons: outcome === "retry_required" ? reasons : [] };
  return ok(outcome === "approved" ? { ...s, kyc, card: { status: "issued", last4: "4821", inWallet: false } } : { ...s, kyc });
}

// ── Fondeo ───────────────────────────────────────────────────────────────────

/** Recursos Humanos envía un beneficio: queda `pending` hasta que Finanzas lo paga desde la cuenta de la empresa en Clara. Sólo se
 *  puede enviar cuando el empleado ya tiene su cuenta USD (KYC aprobado): antes no hay cuenta destino. El saldo de la empresa no
 *  baja todavía, pero lo ya comprometido cuenta para no enviar más de lo que hay. */
export function createFunding(s: State, amount: number, reference: string, now: number, concept = ""): Result {
  if (s.invitation.status === "none") return fail("invalid_transition"); // sin invitación no hay a quién fondear
  if (s.kyc.status !== "approved") return fail("kyc_required"); // sin cuenta activa no hay a dónde enviar
  if (!Number.isInteger(amount) || amount <= 0) return fail("invalid_amount");
  if (amount > s.companyBalance - committed(s)) return fail("insufficient_funds");
  const [id, seq] = next(s, "fund");
  return ok({ ...s, seq, fundings: [...s.fundings, { id, amount, status: "pending", reference, concept, at: now }] });
}

/** Beneficios enviados por RH que Finanzas aún no paga. */
export const committed = (s: State): number => sum(s.fundings.filter((f) => f.status === "pending" || f.status === "on_hold").map((f) => f.amount));

export function holdFunding(s: State, id: string): Result {
  const f = s.fundings.find((x) => x.id === id);
  if (!f) return fail("not_found");
  return f.status === "pending" ? ok({ ...s, fundings: patch(s.fundings, id, { status: "on_hold" }) }) : f.status === "on_hold" ? ok(s) : fail("invalid_transition");
}

/** Finanzas paga el beneficio: sale de la cuenta de la empresa en Clara y queda en camino a la cuenta del empleado. Todavía no
 *  suma a su saldo. Repetirlo no descuenta dos veces. */
export function payFunding(s: State, id: string): Result {
  const f = s.fundings.find((x) => x.id === id);
  if (!f) return fail("not_found");
  if (f.status === "processing" || f.status === "completed") return ok(s);
  if (s.kyc.status !== "approved") return fail("kyc_required");
  if (f.amount > s.companyBalance) return fail("insufficient_funds");
  return ok({ ...s, companyBalance: s.companyBalance - f.amount, fundings: patch(s.fundings, id, { status: "processing" }) });
}

/** El depósito llegó: se acredita al empleado, una sola vez. Si Finanzas aún no lo había pagado (atajo de la consola), sale de
 *  la cuenta de la empresa en este mismo paso. */
export function confirmFunding(s: State, id: string, now: number): Result {
  const paid = payFunding(s, id);
  if (!paid.ok) return paid;
  const f = paid.state.fundings.find((x) => x.id === id);
  if (!f || f.status === "completed") return ok(s);
  const [eid, seq] = next(paid.state, "le");
  return ok({ ...paid.state, seq, fundings: patch(paid.state.fundings, id, { status: "completed" }), entries: [...paid.state.entries, { id: eid, kind: "funding", ref: id, amount: f.amount, at: now }] });
}

// ── Tarjeta ──────────────────────────────────────────────────────────────────

export function activateCard(s: State): Result {
  if (s.kyc.status !== "approved") return fail("kyc_required");
  return s.card.status === "issued" ? ok({ ...s, card: { ...s.card, status: "active" } }) : s.card.status === "active" ? ok(s) : fail("invalid_transition");
}

export function freezeCard(s: State, frozen: boolean): Result {
  if (s.card.status !== "active" && s.card.status !== "frozen") return fail("invalid_transition");
  return ok({ ...s, card: { ...s.card, status: frozen ? "frozen" : "active" } });
}

export function addToWallet(s: State): Result {
  return s.card.status === "active" ? ok({ ...s, card: { ...s.card, inWallet: true } }) : fail("invalid_transition");
}

/** Autorización de compra: aprobada, reserva el monto y deja instruida la transferencia en Bridge. Un rechazo queda registrado
 *  (para Actividad) pero no mueve saldo, no crea reserva ni transferencia. */
export function authorize(s: State, merchant: string, amount: number, now: number, local: number | null = null): { state: State; auth: Authorization } | { code: ErrorCode } {
  if (!Number.isInteger(amount) || amount <= 0) return { code: "invalid_amount" };
  const reason: DeclineReason | null =
    s.card.status === "frozen" ? "card_frozen" : s.card.status !== "active" ? "card_not_active" : amount > balances(s).available ? "insufficient_funds" : null;
  const [id, seq] = next(s, "auth");
  const auth: Authorization = { id, merchant, amount, status: reason ? "declined" : "authorized", declineReason: reason, at: now, local, transferId: reason ? null : `btr_${id}`, movedAt: null, clearedAt: null, settledAt: null };
  return { state: { ...s, seq, auths: [...s.auths, auth] }, auth };
}

/** Bridge confirmó la transferencia wallet del empleado → wallet de Clara: la reserva se convierte en cargo contabilizado.
 *  Repetirlo no descuenta dos veces. */
export function confirmTransfer(s: State, id: string, now: number): Result {
  const a = s.auths.find((x) => x.id === id);
  if (!a) return fail("not_found");
  if (a.status === "declined") return fail("invalid_transition");
  if (a.movedAt !== null) return ok(s);
  const [eid, seq] = next(s, "le");
  return ok({ ...s, seq, auths: patch(s.auths, id, { movedAt: now }), entries: [...s.entries, { id: eid, kind: "card", ref: id, amount: -a.amount, at: now }] });
}

/** Clearing (compensación de la red). Los fondos ya salieron al aprobarse; si la transferencia seguía en proceso, se da por
 *  confirmada aquí. Repetirlo no descuenta dos veces. */
export function clear(s: State, id: string, now: number): Result {
  const a = s.auths.find((x) => x.id === id);
  if (!a) return fail("not_found");
  if (a.status === "cleared" || a.status === "settled") return ok(s);
  if (a.status !== "authorized") return fail("invalid_transition");
  const moved = confirmTransfer(s, id, now);
  return moved.ok ? ok({ ...moved.state, auths: patch(moved.state.auths, id, { status: "cleared", clearedAt: now }) }) : moved;
}

/** Settlement: Clara lleva la liquidez al banco liquidador y liquida en neto con Mastercard. No genera un segundo cargo. */
export function settle(s: State, id: string, now: number): Result {
  const a = s.auths.find((x) => x.id === id);
  if (!a) return fail("not_found");
  if (a.status === "settled") return ok(s);
  return a.status === "cleared" ? ok({ ...s, auths: patch(s.auths, id, { status: "settled", settledAt: now }) }) : fail("invalid_transition");
}

// ── Conversión y retiro ──────────────────────────────────────────────────────

/** Cotización USD → moneda local con vencimiento. No reserva fondos. `rate` es la tasa que ve el empleado, con la comisión ya
 *  incluida; `local` es lo que recibirá el destinatario (lo que tecleó el empleado; si se omite, el equivalente de `usd`). */
export function quote(s: State, usd: number, rate: number, now: number, local: number = Math.round(usd * rate)): { state: State; quote: FxQuote } | { code: ErrorCode } {
  if (!Number.isInteger(usd) || usd <= 0) return { code: "invalid_amount" };
  if (usd > balances(s).available) return { code: "insufficient_funds" };
  const feeUsd = Math.round((usd * FX_FEE_BPS) / 10_000);
  const [id, seq] = next(s, "fx");
  const q: FxQuote = { id, usd, feeUsd, rate, local, currency: "COP", status: "open", expiresAt: now + QUOTE_TTL_MS };
  return { state: { ...s, seq, quotes: [...s.quotes, q] }, quote: q };
}

export function expireQuote(s: State, id: string): Result {
  const q = s.quotes.find((x) => x.id === id);
  if (!q) return fail("not_found");
  return q.status === "open" ? ok({ ...s, quotes: patch(s.quotes, id, { status: "expired" }) }) : ok(s);
}

/** Aceptar la tasa. Vencida (por reloj o marcada) no se acepta: hay que pedir otra; nunca se cambia la tasa en silencio. */
export function acceptQuote(s: State, id: string, now: number): Result {
  const q = s.quotes.find((x) => x.id === id);
  if (!q) return fail("not_found");
  if (q.status === "accepted") return ok(s);
  if (q.status === "expired" || now >= q.expiresAt) return fail("quote_expired");
  return ok({ ...s, quotes: patch(s.quotes, id, { status: "accepted" }) });
}

/** Retiro al banco con una cotización aceptada: reserva el monto mientras se procesa. */
export function withdraw(s: State, quoteId: string, bank: Bank, now: number): { state: State; withdrawal: Withdrawal } | { code: ErrorCode } {
  const q = s.quotes.find((x) => x.id === quoteId);
  if (!q) return { code: "not_found" };
  if (q.status !== "accepted") return { code: q.status === "expired" ? "quote_expired" : "quote_not_accepted" };
  if (s.withdrawals.some((w) => w.quoteId === quoteId)) return { code: "quote_used" };
  if (q.usd > balances(s).available) return { code: "insufficient_funds" };
  const [id, seq] = next(s, "wd");
  const w: Withdrawal = { id, quoteId, usd: q.usd, feeUsd: q.feeUsd, local: q.local, currency: q.currency, bank, status: "processing", at: now, doneAt: null };
  return { state: { ...s, seq, withdrawals: [...s.withdrawals, w] }, withdrawal: w };
}

export function completeWithdrawal(s: State, id: string, now: number): Result {
  const w = s.withdrawals.find((x) => x.id === id);
  if (!w) return fail("not_found");
  if (w.status === "completed") return ok(s);
  if (w.status !== "processing") return fail("invalid_transition");
  const [eid, seq] = next(s, "le");
  return ok({ ...s, seq, withdrawals: patch(s.withdrawals, id, { status: "completed", doneAt: now }), entries: [...s.entries, { id: eid, kind: "withdrawal", ref: id, amount: -w.usd, at: now }] });
}

/** El banco rechazó el pago. Los fondos siguen reservados hasta confirmar la reversión. */
export function failWithdrawal(s: State, id: string): Result {
  const w = s.withdrawals.find((x) => x.id === id);
  if (!w) return fail("not_found");
  return w.status === "processing" ? ok({ ...s, withdrawals: patch(s.withdrawals, id, { status: "failed" }) }) : w.status === "failed" ? ok(s) : fail("invalid_transition");
}

/** Reversión confirmada: libera la reserva exactamente una vez (nunca hubo cargo, así que no hay crédito que duplicar). */
export function confirmReversal(s: State, id: string, now: number): Result {
  const w = s.withdrawals.find((x) => x.id === id);
  if (!w) return fail("not_found");
  if (w.status === "reversed") return ok(s);
  return w.status === "failed" ? ok({ ...s, withdrawals: patch(s.withdrawals, id, { status: "reversed", doneAt: now }) }) : fail("invalid_transition");
}
