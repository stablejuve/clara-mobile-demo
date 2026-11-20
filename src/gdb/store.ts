import { useSyncExternalStore } from "react";
import * as B from "./beneficiaries";
import { cop, type Key, type Lang, setLangValue, tr, usd } from "./copy";
import * as K from "./kyc";
import * as L from "./ledger";
import { tracer } from "./trace";

// Store de la demo: envuelve el ledger puro con un reloj, los procesos de fondo simulados (veredicto del KYC, banco) y los
// atajos de la consola. Todo es ficticio: no hay proveedor de identidad, emisor, FX ni banco reales detrás.

export const DEMO = {
  employer: "Acme Mexico", employee: "Alex Rivera", firstName: "Alex", initials: "AR", country: "CO",
  benefit: 100_00, merchant: "Café Bogotá", rate: 3950.25,
  /** Comercios (ficticios) que «cobran» al acercar el teléfono al lector: cada toque usa el siguiente. Montos en centavos de COP. */
  merchants: [
    { name: "Café Bogotá", local: 18_500_00 }, { name: "Mercado La 85", local: 142_300_00 },
    { name: "Droguería Central", local: 56_900_00 }, { name: "Librería Candelaria", local: 74_000_00 },
  ],
  /** Cuenta de Acme en Clara (ficticia): de ahí sale el dinero de los beneficios. */
  companyBalance: 25_000_00, claraAccount: "•••• 4410",
  /** Cuenta USD que Clara le habilita al empleado al aprobar su KYC: el destino de los beneficios. */
  employeeAccount: "•••• 7731",
  /** Personas de Acme que operan cada plataforma (ficticias): RH desde Betterfly, Finanzas desde Clara. */
  operators: { betterfly: { name: "Mariana Torres", initials: "MT" }, clara: { name: "Diego Herrera", initials: "DH" } },
  concepts: ["bo.concept.remote", "bo.concept.wellness", "bo.concept.reimb"], amounts: [50_00, 100_00, 200_00],
  /** Cuenta de ahorros colombiana (ficticia), 11 dígitos. */
  bank: { name: "Banco Andino", account: "03214567890" } as L.Bank,
} as const;

/** Latencias simuladas (ms). */
const LAG = { kyc: 2200, transfer: 2600, bank: 3200, reversal: 6000, bene: 2200, deposit: 5000 } as const;

export type Notice = { id: number; title: string; body: string; ref: string | null };
/** Desde qué plataforma opera la empresa en el back office de la demo web: la de Betterfly o la de Clara. */
export type Office = "betterfly" | "clara";
export type Flags = { lang: Lang; nextKyc: "approved" | "retry_required" | "rejected"; failNextWithdrawal: boolean; office: Office; /** Modo explicativo: mostrar el endpoint que llamaría cada acción. */ explain: boolean; /** La próxima cuenta guardada falla la verificación del banco. */ failNextBene: boolean; /** Mostrar también el monto en dólares bajo la moneda local. */ showUsd: boolean };
/** Expediente KYC que el empleado va llenando: `savedAt` = cuándo guardó cada sección; `rejectedAt` = cuándo pidieron correcciones
 *  (una sección marcada queda corregida si se volvió a guardar después). */
export type KycFile = { draft: K.KycDraft; savedAt: Partial<Record<K.KycSection, number>>; rejectedAt: number | null };
/** Razones con que el proveedor pide correcciones en la demo: dos secciones, para que se vea el arreglo por sección. */
const RETRY_REASONS = ["id_document_unreadable", "address_mismatch"] as const;
export type Snapshot = { s: L.State; b: L.Balances; flags: Flags; notice: Notice | null; kyc: KycFile; /** Cuentas guardadas para retirar. */ benes: readonly B.Beneficiary[] };

function fresh(): L.State {
  // Punto de partida del guion: la empresa todavía no invita. Invita desde el back office; el beneficio se envía cuando el
  // empleado ya tiene su cuenta.
  return L.initialState({ employer: DEMO.employer, employee: DEMO.employee, country: DEMO.country, amount: DEMO.benefit }, false, DEMO.companyBalance);
}

let state = fresh();
let flags: Flags = { lang: "en", nextKyc: "approved", failNextWithdrawal: false, office: "betterfly", explain: true, failNextBene: false, showUsd: true };
const freshKyc = (): KycFile => ({ draft: K.EMPTY_DRAFT, savedAt: {}, rejectedAt: null });
let kyc: KycFile = freshKyc();
/** El empleado arranca con su propia cuenta ya verificada; las demás las agrega en «Nueva cuenta». */
const freshBenes = (): B.Beneficiary[] => [{ id: "bene_1", owner: "self", name: DEMO.employee, alias: "", method: "bank", bankName: DEMO.bank.name, account: DEMO.bank.account, status: "verified", createdAt: 0 }];
let benes: readonly B.Beneficiary[] = freshBenes();
let notice: Notice | null = null;
let noticeSeq = 0;
let snap: Snapshot = { s: state, b: L.balances(state), flags, notice, kyc, benes };
const listeners = new Set<() => void>();
let timers: ReturnType<typeof setTimeout>[] = [];

function emit(): void {
  snap = { s: state, b: L.balances(state), flags, notice, kyc, benes };
  for (const l of listeners) l();
}
const later = (fn: () => void, ms: number): void => { timers.push(setTimeout(fn, ms)); };
/** Aplica una transición: si es válida, publica el estado nuevo; devuelve si se aplicó. */
function apply(r: L.Result): boolean {
  if (!r.ok) return false;
  if (r.state !== state) { state = r.state; emit(); }
  return true;
}
function notify(title: Key, body: Key | null, vars: Record<string, string | number> = {}, ref: string | null = null): void {
  notice = { id: ++noticeSeq, title: tr(title, vars), body: body ? tr(body, vars) : "", ref };
  emit();
}

function resolveKycNow(): void {
  const outcome = flags.nextKyc;
  if (!apply(L.resolveKyc(state, outcome, outcome === "retry_required" ? RETRY_REASONS : []))) return;
  kyc = { ...kyc, rejectedAt: outcome === "retry_required" ? Date.now() : null };
  tracer.hit("kycVerdict");
  flags = { ...flags, nextKyc: "approved" }; // el reintento sí pasa
  if (outcome === "approved") notify("n.kyc", "n.kycSub");
  else if (outcome === "retry_required") notify("n.kycRetry", "n.kycRetrySub");
  else emit();
}

function finishWithdrawal(id: string): void {
  const w = state.withdrawals.find((x) => x.id === id);
  if (!w || w.status !== "processing") return;
  tracer.hit("withdrawalSettled");
  if (flags.failNextWithdrawal) {
    flags = { ...flags, failNextWithdrawal: false };
    if (apply(L.failWithdrawal(state, id))) { notify("n.wdFail", "n.wdFailSub", {}, id); later(() => gdb.confirmReversal(id), LAG.reversal); }
  } else if (apply(L.completeWithdrawal(state, id, Date.now()))) notify("n.wdDone", null, {}, id);
}

const first = <T,>(xs: readonly T[], pred: (x: T) => boolean): T | undefined => xs.find(pred);
const last = <T,>(xs: readonly T[], pred: (x: T) => boolean): T | undefined => [...xs].reverse().find(pred);

export const gdb = {
  get: (): Snapshot => snap,
  subscribe(l: () => void): () => void { listeners.add(l); return () => { listeners.delete(l); }; },
  dismissNotice(): void { if (notice) { notice = null; emit(); } },
  setLang(lang: Lang): void { setLangValue(lang); flags = { ...flags, lang }; emit(); },
  setOffice(office: Office): void { flags = { ...flags, office }; emit(); },
  setShowUsd(showUsd: boolean): void { flags = { ...flags, showUsd }; emit(); },
  setExplain(explain: boolean): void { flags = { ...flags, explain }; tracer.setEnabled(explain); emit(); },

  // ── Empleado ──
  accept(): void { if (state.invitation.status === "sent" && apply(L.acceptInvitation(state))) tracer.hit("acceptTerms"); },
  /** Guarda una sección del expediente (la hoja sólo deja guardar secciones válidas). */
  saveKycSection(section: K.KycSection, from: K.KycDraft): void {
    kyc = { ...kyc, draft: { ...kyc.draft, [section]: from[section] }, savedAt: { ...kyc.savedAt, [section]: Date.now() } };
    emit();
  },
  /** «Llenar todo con ejemplo»: las cinco secciones con los datos ficticios del empleado de la demo. */
  fillKycSample(): void {
    const now = Date.now();
    kyc = { ...kyc, draft: K.SAMPLE, savedAt: Object.fromEntries(K.KYC_SECTIONS.map((s) => [s, now])) };
    emit();
  },
  /** Envía el expediente a revisión; el veredicto llega solo, un momento después. */
  submitKyc(): void { if (apply(L.submitKyc(state))) { tracer.hit("submitKyc"); later(resolveKycNow, LAG.kyc); } },
  activateCard(): boolean { const was = state.card.status; const ok = apply(L.activateCard(state)); if (ok && was === "issued") tracer.hit("activateCard"); return ok; },
  freeze(frozen: boolean): void { if (apply(L.freezeCard(state, frozen))) tracer.hit("freezeCard"); },
  addToWallet(): void { if (apply(L.addToWallet(state))) tracer.hit("addToWallet"); },
  /** Compra simulada por un monto en dólares; el comercio cobra en pesos (`local`, por defecto el equivalente a la tasa de la
   *  demo). Devuelve la autorización (aprobada o rechazada). */
  pay(amount: number, merchant: string = DEMO.merchant, local: number = Math.round(amount * DEMO.rate)): L.Authorization | null {
    const r = L.authorize(state, merchant, amount, Date.now(), local);
    if ("code" in r) return null;
    state = r.state; emit();
    tracer.hit("cardAuthorization");
    if (r.auth.status === "authorized") {
      // Aprobada por Mastercard: Clara instruye la transferencia en Bridge; se confirma poco después, sin otro aviso.
      notify("n.paid", "n.paidSub", { merchant, amount: cop(local) }, r.auth.id);
      const id = r.auth.id;
      later(() => gdb.confirmTransfer(id), LAG.transfer);
    }
    else notify("n.declined", `pay.r.${r.auth.declineReason ?? "insufficient_funds"}` as Key, {}, r.auth.id);
    return r.auth;
  },
  /** Pago sin contacto: el empleado acerca el teléfono y el comercio cobra su monto (el siguiente de `DEMO.merchants`). */
  tapPay(): L.Authorization | null {
    const m = DEMO.merchants[state.auths.length % DEMO.merchants.length];
    return gdb.payLocal(m.local, m.name);
  },
  /** Compra por un monto en pesos (como cobra el comercio): se convierte a dólares con la tasa de la demo. */
  payLocal(local: number, merchant: string = DEMO.merchant): L.Authorization | null {
    return gdb.pay(Math.round(local / DEMO.rate), merchant, local);
  },
  /** Bridge confirmó la transferencia: los fondos salieron de la wallet del empleado. */
  confirmTransfer(id: string): void {
    const a = state.auths.find((x) => x.id === id);
    if (a && a.status !== "declined" && a.movedAt === null && apply(L.confirmTransfer(state, id, Date.now()))) tracer.hit("cardFundsMoved");
  },
  /** `local`: el monto en pesos que tecleó el empleado, para que la revisión muestre exactamente eso. */
  getQuote(amount: number, local?: number): L.FxQuote | L.ErrorCode {
    const r = L.quote(state, amount, DEMO.rate, Date.now(), local);
    if ("code" in r) return r.code;
    state = r.state; emit();
    gdb.traceQuote(amount, r.quote.local);
    return r.quote;
  },
  /** Modo explicativo: la cotización, con la llamada y la respuesta para ese monto. La pantalla del monto la dispara al teclear. */
  traceQuote(usdCents: number, localCents: number): void {
    const local = String(Math.round(localCents / 100));
    tracer.hit("quote", [
      `POST /v1/offramp/quote { "from": "usd", "to": "cop", "destination_amount": "${local}" }`,
      `→ { "rate": "${DEMO.rate.toFixed(2)}", "source_amount": "${(usdCents / 100).toFixed(2)}", "destination_amount": "${local}", "expires_in": ${L.QUOTE_TTL_MS / 1000} }`,
    ]);
  },
  /** Aceptar la tasa; si venció, la marca vencida y devuelve el código. */
  acceptQuote(id: string): L.ErrorCode | null {
    const r = L.acceptQuote(state, id, Date.now());
    if (r.ok) { apply(r); return null; }
    if (r.code === "quote_expired") apply(L.expireQuote(state, id));
    return r.code;
  },
  withdraw(quoteId: string, bank: L.Bank): L.Withdrawal | L.ErrorCode {
    const r = L.withdraw(state, quoteId, bank, Date.now());
    if ("code" in r) return r.code;
    state = r.state; emit();
    const id = r.withdrawal.id;
    tracer.hit("withdraw");
    later(() => finishWithdrawal(id), LAG.bank);
    return r.withdrawal;
  },
  /** Guarda una cuenta nueva: queda verificándose y, un momento después, verificada (o fallida si la consola lo pidió). */
  addBeneficiary(draft: B.BeneDraft): string {
    const id = `bene_${benes.length + 1}`;
    benes = [...benes, B.toBeneficiary(draft, id, Date.now())];
    emit();
    tracer.hit("addBeneficiary");
    later(() => {
      const status: B.BeneStatus = flags.failNextBene ? "failed" : "verified";
      flags = { ...flags, failNextBene: false };
      benes = benes.map((b) => (b.id === id ? { ...b, status } : b));
      emit();
      tracer.hit("beneficiaryVerified");
    }, LAG.bene);
    return id;
  },
  setFailNextBene(): void { flags = { ...flags, failNextBene: !flags.failNextBene }; emit(); },
  confirmReversal(id: string): void {
    const w = state.withdrawals.find((x) => x.id === id);
    if (w?.status === "failed" && apply(L.confirmReversal(state, id, Date.now()))) notify("n.wdBack", null, { amount: usd(w.usd) }, id);
  },

  // ── Admin de empresa ──
  invite(): void { if (state.invitation.status === "none" && apply(L.invite(state))) tracer.hit("invite"); },
  /** Recursos Humanos envía un beneficio desde Betterfly; el dinero sale de la cuenta de la empresa en Clara. */
  sendBenefit(amount: number = DEMO.benefit, concept: string = DEMO.concepts[0]): boolean {
    const ok = apply(L.createFunding(state, amount, `ACME-BEN-${String(state.fundings.length + 1).padStart(3, "0")}`, Date.now(), concept));
    if (ok) tracer.hit("sendBenefit");
    return ok;
  },

  // ── Consola de demo (atajos del spec) ──
  reset(): void {
    for (const t of timers) clearTimeout(t);
    timers = [];
    tracer.clear();
    state = fresh(); notice = null; kyc = freshKyc(); benes = freshBenes(); flags = { ...flags, nextKyc: "approved", failNextWithdrawal: false, failNextBene: false };
    emit();
  },
  /** Approve KYC: acepta, envía y aprueba lo que falte, sin esperar al proveedor. */
  approveKyc(): void {
    apply(L.invite(state));
    apply(L.acceptInvitation(state));
    if (!K.draftDone(kyc.draft, new Date())) gdb.fillKycSample();
    if (state.kyc.status === "not_started" || state.kyc.status === "retry_required") apply(L.submitKyc(state));
    flags = { ...flags, nextKyc: "approved" };
    resolveKycNow();
  },
  setNextKyc(outcome: Flags["nextKyc"]): void { flags = { ...flags, nextKyc: flags.nextKyc === outcome ? "approved" : outcome }; emit(); },
  /** Deja un beneficio en camino. Como sólo se puede enviar a una cuenta activa, antes verifica al empleado si hace falta. */
  setFundingPending(): void { apply(L.invite(state)); if (state.kyc.status !== "approved") gdb.approveKyc(); gdb.sendBenefit(); },
  holdFunding(): void {
    const f = first(state.fundings, (x) => x.status === "pending");
    if (f) apply(L.holdFunding(state, f.id)); // el empleado no se entera: sólo se le avisa cuando el dinero llega
  },
  /** Finanzas paga un beneficio desde la cuenta de la empresa en Clara. No llega al instante: queda en camino (el empleado lo ve
   *  como «pendiente», sin sumar a su saldo) y se acredita solo, unos segundos después. */
  payFunding(id: string): void {
    const f = state.fundings.find((x) => x.id === id);
    if (!f || f.status === "processing" || f.status === "completed" || !apply(L.payFunding(state, id))) return;
    tracer.hit("payBenefit");
    later(() => gdb.creditFunding(id), LAG.deposit);
  },
  /** El depósito llegó: se acredita y es cuando se le avisa al empleado. */
  creditFunding(id: string): void {
    const f = state.fundings.find((x) => x.id === id);
    if (!f || f.status === "completed" || !apply(L.confirmFunding(state, id, Date.now()))) return;
    tracer.hit("benefitArrived");
    notify("n.funded", "n.fundedSub", { amount: cop(Math.round(f.amount * DEMO.rate)), employer: DEMO.employer }, id);
  },
  /** Release funding (consola): paga y acredita al instante el primer beneficio que no haya llegado. */
  releaseFunding(): void {
    const f = first(state.fundings, (x) => x.status !== "completed");
    if (f) gdb.creditFunding(f.id);
  },
  authorize20(): void { gdb.pay(20_00); },
  clearPayment(): void {
    const a = first(state.auths, (x) => x.status === "authorized");
    if (!a) return;
    gdb.confirmTransfer(a.id); // si la transferencia seguía en proceso, se da por confirmada
    if (apply(L.clear(state, a.id, Date.now()))) tracer.hit("cardCleared");
  },
  /** Confirma ya la transferencia en proceso (sin esperar a Bridge). */
  moveFunds(): void {
    const a = first(state.auths, (x) => x.status === "authorized" && x.movedAt === null);
    if (a) gdb.confirmTransfer(a.id);
  },
  settle(): void {
    const a = first(state.auths, (x) => x.status === "cleared");
    if (a && apply(L.settle(state, a.id, Date.now()))) tracer.hit("cardSettled");
  },
  toggleFreeze(): void { gdb.freeze(state.card.status !== "frozen"); },
  expireQuote(): void {
    const q = last(state.quotes, (x) => x.status === "open");
    if (q) apply(L.expireQuote(state, q.id));
  },
  /** Fail withdrawal: falla el retiro en curso; si no hay ninguno, el próximo. */
  failWithdrawal(): void {
    const w = last(state.withdrawals, (x) => x.status === "processing");
    flags = { ...flags, failNextWithdrawal: true };
    if (w) finishWithdrawal(w.id); else emit();
  },
  confirmLastReversal(): void {
    const w = last(state.withdrawals, (x) => x.status === "failed");
    if (w) gdb.confirmReversal(w.id);
  },
  /** Atajo de desarrollo (deep link `demo/seed/active`): cuenta verificada, fondeada y con tarjeta activa. */
  seedActive(): void { apply(L.invite(state)); gdb.approveKyc(); if (state.fundings.length === 0) gdb.sendBenefit(); gdb.releaseFunding(); gdb.activateCard(); gdb.dismissNotice(); tracer.clear(); },
};

export function useGdb(): Snapshot {
  return useSyncExternalStore(gdb.subscribe, gdb.get, gdb.get);
}

/** Acciones que la consola (y el deep link `demo/run/<acción>`) puede disparar por nombre. */
export const CONSOLE_ACTIONS = {
  reset: gdb.reset, approveKyc: gdb.approveKyc, fundPending: gdb.setFundingPending, fundRelease: gdb.releaseFunding, fundHold: gdb.holdFunding,
  auth20: gdb.authorize20, move: gdb.moveFunds, clear: gdb.clearPayment, settle: gdb.settle, freeze: gdb.toggleFreeze, expire: gdb.expireQuote,
  failWd: gdb.failWithdrawal, reversal: gdb.confirmLastReversal, seed: gdb.seedActive,
  kycFill: gdb.fillKycSample, kycRetry: () => gdb.setNextKyc("retry_required"), kycReject: () => gdb.setNextKyc("rejected"),
  invite: gdb.invite, accept: gdb.accept, submitKyc: gdb.submitKyc, activate: () => { gdb.activateCard(); },
  es: () => gdb.setLang("es"), en: () => gdb.setLang("en"),
  officeClara: () => gdb.setOffice("clara"), officeBetterfly: () => gdb.setOffice("betterfly"),
  // Solo para recorridos automatizados (deep link): cotizar $30, aceptar la última cotización y retirar con ella.
  quote30: () => { gdb.getQuote(30_00); },
  acceptQuote: () => { const q = last(gdb.get().s.quotes, (x) => x.status === "open"); if (q) gdb.acceptQuote(q.id); },
  withdraw: () => { const q = last(gdb.get().s.quotes, (x) => x.status === "accepted"); if (q) gdb.withdraw(q.id, DEMO.bank); },
  pay150: () => { gdb.pay(150_00); },
  pay80k: () => { gdb.payLocal(80_000_00); },
  tap: () => { gdb.tapPay(); },
  beneFail: gdb.setFailNextBene,
  explainOn: () => gdb.setExplain(true), explainOff: () => gdb.setExplain(false),
  payBig: () => { gdb.payLocal(600_000_00, "Tienda Tech"); },
} as const;
export type ConsoleAction = keyof typeof CONSOLE_ACTIONS;
export const isConsoleAction = (v: string): v is ConsoleAction => v in CONSOLE_ACTIONS;
