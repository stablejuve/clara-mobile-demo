import type { KeyValueStorage } from "../../storage/kv";
import type { RelayerDemoApi, RelayerModuleApi } from "../api";
import { DEMO_RATE, QUOTE_TTL_MS, quoteFor, usdcToMxnCents } from "../money";
import * as M from "../state";
import { type Balance, type EventType, type ModuleEvent, type ModuleSnapshot, type ModuleState, type Movement, type Quote, type Receipt, RelayerError } from "../types";
import { bankFor, clabeValid } from "../clabe";
import { DEFAULT_DEPOSIT, DEMO_ADDRESS, DEMO_CARD, DEMO_USER, employerDeposit, KYC_LINKS } from "./fixtures";
import { DEFAULT_SCENARIO, loadScenario, rulesFor, saveScenario, type Scenario } from "./scenarios";

// Implementación en memoria de RelayerModuleApi (spec «Capa mock»): latencias 300–1200 ms por llamada, procesos de fondo
// (veredicto del KYC, endorsement, verificación de CLABE, liquidación SPEI) con `later`, y errores tipados RelayerError.
// Todo inyectable para los tests: `now`, `delay`, `later`, `storage`.

export type MockApi = RelayerModuleApi & RelayerDemoApi;
export type MockOptions = {
  storage: KeyValueStorage;
  now?: () => number;
  /** Latencia de cada llamada. */
  delay?: () => Promise<void>;
  /** Procesos de fondo. */
  later?: (fn: () => void, ms: number) => void;
};

export const randomLatency = (): Promise<void> => new Promise((r) => setTimeout(r, 300 + Math.floor(Math.random() * 900)));

/** Tiempos de los procesos de fondo (ms). */
export const BACKGROUND_MS = { kycVerdict: 2500, reconfirmVerdict: 1500, cardEndorsement: 1500, cardIssued: 4000, firstPayroll: 4000, bankVerification: 3000, speiSettlement: 3500 } as const;

export function createMockApi(opts: MockOptions): MockApi {
  const now = opts.now ?? Date.now;
  const delay = opts.delay ?? randomLatency;
  const later = opts.later ?? ((fn, ms) => { setTimeout(fn, ms); });

  let state: ModuleState = M.INITIAL_STATE;
  let movements: Movement[] = [];
  let events: ModuleEvent[] = [];
  const receipts = new Map<string, Receipt>();
  const quotes = new Map<string, Quote>();
  let scenario: Scenario = DEFAULT_SCENARIO;
  let seq = 0;
  const listeners = new Set<(snap: ModuleSnapshot) => void>();

  const id = (prefix: string) => `${prefix}_${String(++seq).padStart(4, "0")}`;
  // Más reciente primero; a igual instante (tests con `now` fijo), el id más alto primero.
  const snapshot = (): ModuleSnapshot => ({ state, movements: [...movements].sort((a, b) => b.at - a.at || b.id.localeCompare(a.id)), events: [...events] });
  const emit = () => { const s = snapshot(); for (const l of listeners) l(s); };
  /** Aplica una transición o lanza el error tipado. */
  const apply = (r: M.Result): ModuleState => { if (!r.ok) throw new RelayerError(r.code); state = r.state; emit(); return state; };
  /** Procesos de fondo: una transición inválida (p. ej. el usuario desactivó mientras tanto) se ignora. */
  const applySafe = (r: M.Result): boolean => { if (!r.ok) return false; state = r.state; emit(); return true; };
  const event = (type: EventType, payload: ModuleEvent["payload"]) => { events = [...events, { id: id("evt"), type, at: now(), payload }]; };
  const rules = () => rulesFor(scenario);
  const setMovement = (mid: string, patch: Partial<Movement>) => { movements = movements.map((m) => (m.id === mid ? { ...m, ...patch } : m)); };

  const ready = loadScenario(opts.storage).then((s) => { scenario = s; emit(); });
  /** Toda llamada espera el escenario persistido y la latencia. */
  const tick = async () => { await ready; await delay(); };

  const simulateEmployerDeposit: MockApi["simulateEmployerDeposit"] = async (input) => {
    const m = employerDeposit(id("mv"), now(), input);
    apply(M.deposit(state, m));
    movements = [...movements, m];
    event("deposit.received", { movement_id: m.id, amount_usdc_cents: m.amountUsdcCents, reference: m.reference ?? null, tx_hash: m.txHash ?? null });
    emit();
    return m;
  };

  return {
    // ── RelayerModuleApi ────────────────────────────────────────────────────
    async getModule() { await tick(); return state; },

    async acceptTerms() {
      await tick();
      if (state.module === "off") apply(M.activate(state));
      return apply(M.acceptTerms(state));
    },

    async startKyc() { await tick(); apply(M.startKyc(state)); return KYC_LINKS; },

    async completeKycReturn() {
      await tick();
      const s = apply(M.completeKycReturn(state));
      later(() => {
        const r = rules();
        if (applySafe(M.resolveKyc(state, r.kycOutcome, now() - r.kycApprovedAgoMs, r.kycRejectionReasons))) {
          event(r.kycOutcome === "approved" ? "kyc.approved" : "kyc.rejected", { status: r.kycOutcome });
          emit();
        }
      }, BACKGROUND_MS.kycVerdict);
      return s;
    },

    async reconfirmKyc() {
      await tick();
      const s = apply(M.reconfirmKyc(state));
      later(() => { if (applySafe(M.resolveKyc(state, "approved", now()))) { event("kyc.approved", { status: "approved", reconfirm: 1 }); emit(); } }, BACKGROUND_MS.reconfirmVerdict);
      return s;
    },

    async createPasskey() {
      await tick();
      apply(M.passkeyCreated(state));
      await delay(); // segunda latencia: derivar la dirección
      apply(M.walletReady(state, DEMO_ADDRESS));
      event("module.activated", { end_user: DEMO_USER.email });
      event("wallet.ready", { address: DEMO_ADDRESS, chain: "base" });
      emit();
      later(() => { if (state.module === "active" && movements.length === 0) void simulateEmployerDeposit(DEFAULT_DEPOSIT); }, BACKGROUND_MS.firstPayroll);
      return { address: DEMO_ADDRESS };
    },

    async getBalance(): Promise<Balance> {
      await tick();
      return { usdcCents: state.balanceUsdcCents, mxnCents: usdcToMxnCents(state.balanceUsdcCents), rate: DEMO_RATE };
    },

    async listMovements() { await tick(); return snapshot().movements as Movement[]; },

    async requestCard() {
      await tick();
      const r = M.requestCard(state, now(), rules().cardsAvailable);
      if (!r.ok && r.code === "endorsement_expired") { applySafe(M.markEndorsementExpired(state)); throw new RelayerError(r.code); }
      const s = apply(r);
      later(() => { applySafe(M.cardEndorsementPending(state)); }, BACKGROUND_MS.cardEndorsement);
      later(() => {
        if (applySafe(M.cardIssued(state, DEMO_CARD.last4, DEMO_CARD.expiry))) { event("card.issued", { last4: DEMO_CARD.last4, expiry: DEMO_CARD.expiry }); emit(); }
      }, BACKGROUND_MS.cardIssued);
      return s;
    },

    async authorizeCard() { await tick(); return apply(M.authorizeCard(state, now())); },

    async getCard() {
      await tick();
      const issued = state.card.last4 !== null;
      return { ...state.card, holder: DEMO_USER.name.toUpperCase(), number: issued ? DEMO_CARD.number : null, cvv: issued ? DEMO_CARD.cvv : null };
    },

    async freezeCard(frozen) { await tick(); return apply(M.freezeCard(state, frozen)); },

    async addToWallet(provider) { await tick(); return apply(M.addToWallet(state, provider)); },

    async addBankAccount(clabe) {
      await tick();
      const digits = clabe.replace(/\s/g, "");
      if (!clabeValid(digits)) throw new RelayerError("clabe_invalid");
      apply(M.addBankAccount(state, digits, bankFor(digits) ?? "Banco", DEMO_USER.name));
      later(() => { applySafe(M.resolveBank(state, rules().bankOutcome)); }, BACKGROUND_MS.bankVerification);
      return state.bank;
    },

    async quoteSend(amountUsdcCents) {
      await tick();
      const q = quoteFor(amountUsdcCents, state.balanceUsdcCents);
      if (!q.ok) throw new RelayerError(q.code);
      const quote: Quote = { id: id("q"), ...q.quote, expiresAt: now() + QUOTE_TTL_MS };
      apply(M.quoteSend(state, quote.id, amountUsdcCents));
      quotes.set(quote.id, quote);
      return quote;
    },

    async confirmSend(quoteId) {
      await ready;
      const quote = quotes.get(quoteId);
      if (!quote) throw new RelayerError("not_found");
      if (now() > quote.expiresAt) throw new RelayerError("quote_expired");
      apply(M.beginConfirm(state, quoteId));
      await tick();
      const receiptId = id("rcpt");
      const receipt: Receipt = {
        id: receiptId, folio: `RCB-${String(seq).padStart(6, "0")}`, status: "submitted",
        amountUsdcCents: quote.amountUsdcCents, feeUsdcCents: quote.feeUsdcCents, amountMxnCents: quote.amountMxnCents, rate: quote.rate,
        bankName: state.bank.bankName ?? "Banco", clabeLast4: (state.bank.clabe ?? "").slice(-4), createdAt: now(), completedAt: null, failureCode: null,
      };
      receipts.set(receiptId, receipt);
      const mid = id("mv");
      movements = [...movements, { id: mid, kind: "withdrawal", status: "pending", amountUsdcCents: quote.amountUsdcCents, at: now(), receiptId }];
      apply(M.submitSend(state, quoteId, quote.amountUsdcCents, receiptId));
      later(() => {
        const outcome = rules().sendOutcome;
        if (!applySafe(M.resolveSend(state, outcome, quote.amountUsdcCents))) return;
        receipts.set(receiptId, { ...receipt, status: outcome, completedAt: now(), failureCode: outcome === "failed" ? "send_failed" : null });
        setMovement(mid, { status: outcome });
        if (outcome === "completed") event("withdrawal.completed", { receipt_id: receiptId, amount_usdc_cents: quote.amountUsdcCents, amount_mxn_cents: quote.amountMxnCents });
        emit();
      }, BACKGROUND_MS.speiSettlement);
      return receipt;
    },

    async getReceipt(rid) {
      await tick();
      const r = receipts.get(rid);
      if (!r) throw new RelayerError("not_found");
      return r;
    },

    async getEvents() { await tick(); return [...events]; },

    async deactivate() {
      await tick();
      const s = apply(M.deactivate(state));
      movements = []; receipts.clear(); quotes.clear();
      event("module.deactivated", { end_user: DEMO_USER.email });
      emit();
      return s;
    },

    // ── RelayerDemoApi ──────────────────────────────────────────────────────
    getSnapshot: snapshot,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getScenario: () => scenario,
    // Espera la carga persistida: si no, el `then` de `ready` pisaría el escenario recién elegido.
    async setScenario(s) { await ready; scenario = s; await saveScenario(opts.storage, s); emit(); },
    simulateEmployerDeposit,
    async reset() { state = M.INITIAL_STATE; movements = []; events = []; receipts.clear(); quotes.clear(); seq = 0; emit(); },
  };
}
