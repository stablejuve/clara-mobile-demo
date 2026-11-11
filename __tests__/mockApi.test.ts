import { bankFor, clabeValid } from "../src/relayer/clabe";
import { createMockApi, type MockApi } from "../src/relayer/mock/mockApi";
import { DEFAULT_DEPOSIT } from "../src/relayer/mock/fixtures";
import type { Scenario } from "../src/relayer/mock/scenarios";
import { RelayerError } from "../src/relayer/types";
import { memoryKv } from "../src/storage/kv";

const NOW = Date.parse("2026-11-11T12:00:00Z");

function harness(scenario: Scenario = "happy") {
  const queue: (() => void)[] = [];
  const api = createMockApi({ storage: memoryKv({ "relayer.scenario.v1": scenario }), now: () => NOW, delay: async () => {}, later: (fn) => { queue.push(fn); } });
  const flush = () => { while (queue.length) queue.shift()!(); };
  return { api, flush };
}

async function codeOf(p: Promise<unknown>): Promise<string> {
  try { await p; return "ok"; } catch (e) { return e instanceof RelayerError ? e.code : "other"; }
}

/** Alta completa hasta módulo activo (sin tarjeta ni banco). */
async function activate(api: MockApi, flush: () => void) {
  await api.acceptTerms();
  await api.startKyc();
  await api.completeKycReturn();
  flush(); // veredicto del KYC
  await api.createPasskey();
  flush(); // primer depósito de nómina
}

test("CLABE: 18 dígitos con dígito de control 3-7-1; banco por prefijo", () => {
  expect(clabeValid("002010077777777771")).toBe(true);
  expect(clabeValid("012180001234567899")).toBe(true);
  expect(clabeValid("012180001234567890")).toBe(false);
  expect(clabeValid("01218000123456789")).toBe(false);
  expect(clabeValid("abc")).toBe(false);
  expect(bankFor("012180001234567899")).toBe("BBVA México");
  expect(bankFor("646180111222333443")).toBe("STP");
  expect(bankFor("999180111222333443")).toBeNull();
});

test("happy: alta, nómina, tarjeta, teléfono, CLABE y envío completo; eventos en orden", async () => {
  const { api, flush } = harness();
  await api.getModule(); // carga el escenario persistido
  expect(api.getScenario()).toBe("happy");
  await api.acceptTerms();
  expect((await api.getModule()).module).toBe("kyc");
  const links = await api.startKyc();
  expect(links.redirectUri).toBe("relayermobiledemo://recibo/kyc-return");
  await api.completeKycReturn();
  expect((await api.getModule()).kyc.status).toBe("under_review");
  flush();
  expect((await api.getModule()).kyc).toMatchObject({ status: "approved", approvedAt: NOW });
  const { address } = await api.createPasskey();
  expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  expect((await api.getModule()).module).toBe("active");
  flush();
  const bal = await api.getBalance();
  expect(bal).toEqual({ usdcCents: 492_75, mxnCents: 8_499_94, rate: 17.25 });
  const movs = await api.listMovements();
  expect(movs).toHaveLength(1);
  expect(movs[0]).toMatchObject({ kind: "deposit", fromLabel: "Acme Beneficios", reference: DEFAULT_DEPOSIT.reference, amountUsdcCents: 492_75 });

  await api.requestCard();
  expect((await api.getModule()).card.status).toBe("requested");
  flush();
  expect((await api.getModule()).card).toMatchObject({ status: "active", last4: "4821", authorizedAt: null });
  expect(await codeOf(api.addToWallet("apple"))).toBe("card_not_active");
  await api.authorizeCard();
  const card = await api.getCard();
  expect(card).toMatchObject({ holder: "ANA TORRES", number: "4000 1234 5678 4821", cvv: "317" });
  await api.addToWallet("apple");
  expect((await api.getModule()).pass).toEqual({ status: "added", provider: "apple" });
  await api.freezeCard(true);
  expect((await api.getModule()).card.status).toBe("frozen");
  await api.freezeCard(false);

  expect(await codeOf(api.addBankAccount("012180001234567890"))).toBe("clabe_invalid");
  const bank = await api.addBankAccount("012 1800 0123 4567 899");
  expect(bank).toMatchObject({ status: "pending_verification", bankName: "BBVA México", ownerName: "Ana Torres" });
  flush();
  expect((await api.getModule()).bank.status).toBe("verified");

  expect(await codeOf(api.quoteSend(100))).toBe("below_minimum");
  expect(await codeOf(api.quoteSend(1_000_00))).toBe("insufficient_balance");
  const quote = await api.quoteSend(100_00);
  expect(quote).toMatchObject({ amountUsdcCents: 100_00, feeUsdcCents: 50, netUsdcCents: 99_50, amountMxnCents: 1716_38, expiresAt: NOW + 60_000 });
  const receipt = await api.confirmSend(quote.id);
  expect(receipt).toMatchObject({ status: "submitted", amountMxnCents: 1716_38, bankName: "BBVA México", clabeLast4: "7899", completedAt: null });
  expect((await api.getBalance()).usdcCents).toBe(392_75);
  expect(await codeOf(api.confirmSend(quote.id))).toBe("invalid_transition");
  flush();
  expect(await api.getReceipt(receipt.id)).toMatchObject({ status: "completed", completedAt: NOW });
  expect((await api.listMovements()).map((m) => [m.kind, m.status])).toEqual([["withdrawal", "completed"], ["deposit", "completed"]]);
  expect((await api.getEvents()).map((e) => e.type)).toEqual(["kyc.approved", "module.activated", "wallet.ready", "deposit.received", "card.issued", "withdrawal.completed"]);

  await api.deactivate();
  expect((await api.getModule()).module).toBe("off");
  expect(await api.listMovements()).toEqual([]);
  expect((await api.getEvents()).at(-1)?.type).toBe("module.deactivated");
});

test("kyc_rejected: veredicto rechazado con razones; se puede reintentar", async () => {
  const { api, flush } = harness("kyc_rejected");
  await api.acceptTerms(); await api.startKyc(); await api.completeKycReturn(); flush();
  const s = await api.getModule();
  expect(s.kyc).toEqual({ status: "rejected", approvedAt: null, rejectionReasons: ["id_document_unreadable", "address_mismatch"] });
  expect((await api.getEvents()).map((e) => e.type)).toEqual(["kyc.rejected"]);
  expect(await codeOf(api.createPasskey())).toBe("invalid_transition");
  await api.startKyc();
  expect((await api.getModule()).kyc.status).toBe("incomplete");
});

test("cards_unavailable_region: requestCard falla tipado y la tarjeta sigue en none", async () => {
  const { api, flush } = harness("cards_unavailable_region");
  await activate(api, flush);
  expect(await codeOf(api.requestCard())).toBe("cards_unavailable_region");
  expect((await api.getModule()).card.status).toBe("none");
});

test("endorsement_expired: requestCard falla, el estado marca la caducidad, reconfirmKyc lo arregla", async () => {
  const { api, flush } = harness("endorsement_expired");
  await activate(api, flush);
  expect((await api.getModule()).kyc.approvedAt).toBe(NOW - 25 * 60 * 60 * 1000);
  expect(await codeOf(api.requestCard())).toBe("endorsement_expired");
  expect((await api.getModule()).card.status).toBe("endorsement_expired");
  await api.reconfirmKyc();
  expect((await api.getModule()).kyc.status).toBe("under_review");
  flush();
  expect((await api.getModule()).kyc).toMatchObject({ status: "approved", approvedAt: NOW });
  expect((await api.getModule()).card.status).toBe("none");
  await api.requestCard();
  expect((await api.getModule()).card.status).toBe("requested");
});

test("bank_verification_failed: la CLABE queda en failed y se puede volver a intentar", async () => {
  const { api, flush } = harness("bank_verification_failed");
  await activate(api, flush);
  await api.addBankAccount("072225009876543217");
  flush();
  expect((await api.getModule()).bank).toMatchObject({ status: "failed", bankName: "Banorte" });
  expect(await codeOf(api.quoteSend(100_00))).toBe("bank_not_verified");
  await api.addBankAccount("014180005556667772");
  expect((await api.getModule()).bank.status).toBe("pending_verification");
});

test("send_failed: el recibo termina en failed con código y el saldo regresa", async () => {
  const { api, flush } = harness("send_failed");
  await activate(api, flush);
  await api.addBankAccount("646180111222333443"); flush();
  const q = await api.quoteSend(100_00);
  const r = await api.confirmSend(q.id);
  flush();
  expect(await api.getReceipt(r.id)).toMatchObject({ status: "failed", failureCode: "send_failed" });
  expect((await api.getBalance()).usdcCents).toBe(492_75);
  expect((await api.listMovements())[0]).toMatchObject({ kind: "withdrawal", status: "failed" });
  expect((await api.getEvents()).some((e) => e.type === "withdrawal.completed")).toBe(false);
});

test("simular pago de Acme: crea el movimiento, suma saldo y emite deposit.received con la referencia", async () => {
  const { api, flush } = harness();
  await activate(api, flush);
  const m = await api.simulateEmployerDeposit({ amountMxnCents: 1_000_00, concept: "Bono", reference: "ACME-BONO-1" });
  expect(m).toMatchObject({ kind: "deposit", amountUsdcCents: 57_97, reference: "ACME-BONO-1", concept: "Bono" });
  expect((await api.getBalance()).usdcCents).toBe(492_75 + 57_97);
  expect((await api.getEvents()).at(-1)).toMatchObject({ type: "deposit.received", payload: { reference: "ACME-BONO-1", amount_usdc_cents: 57_97 } });
});

test("setScenario persiste; reset vuelve a cero; subscribe recibe cada cambio", async () => {
  const kv = memoryKv();
  const api = createMockApi({ storage: kv, now: () => NOW, delay: async () => {}, later: (fn) => fn() });
  const seen: string[] = [];
  const off = api.subscribe((s) => { seen.push(s.state.module); });
  await api.setScenario("send_failed");
  expect(kv.data["relayer.scenario.v1"]).toBe("send_failed");
  expect(api.getScenario()).toBe("send_failed");
  await api.acceptTerms();
  expect(seen).toContain("kyc");
  await api.reset();
  expect(api.getSnapshot()).toEqual({ state: expect.objectContaining({ module: "off" }), movements: [], events: [] });
  off();
});
