import { EMPTY_DRAFT, fillSample, KYC_SECTIONS, toSubmission } from "../src/relayer/kyc";
import { bankFor, clabeValid } from "../src/relayer/clabe";
import { createMockApi, type MockApi } from "../src/relayer/mock/mockApi";
import { DEFAULT_DEPOSIT } from "../src/relayer/mock/fixtures";
import type { Scenario } from "../src/relayer/mock/scenarios";
import { RelayerError } from "../src/relayer/types";
import { memoryKv } from "../src/storage/kv";

const NOW = Date.parse("2026-11-11T12:00:00Z");

function harness(scenario: Scenario = "happy") {
  const queue: (() => void)[] = [];
  const api = createMockApi({ storage: memoryKv({ "relayer.scenario.v1": scenario }), now: () => NOW, delay: async () => {}, later: (fn) => { queue.push(fn); }, rate: () => 17.25 });
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
  // La tarjeta se emite sola al activarse (Bridge: endorsement `cards` aprobado → 24 h para emitir).
  expect((await api.getModule()).card.status).toBe("requested");
  flush();
  const bal = await api.getBalance();
  expect(bal).toEqual({ usdcCents: 492_75, mxnCents: 8_499_94, rate: 17.25 });
  const movs = await api.listMovements();
  expect(movs).toHaveLength(1);
  expect(movs[0]).toMatchObject({ kind: "deposit", fromLabel: "Acme", reference: DEFAULT_DEPOSIT.reference, amountUsdcCents: 492_75 });

  expect(await codeOf(api.requestCard())).toBe("invalid_transition");
  expect((await api.getModule()).card).toMatchObject({ status: "active", last4: "4821", authorizedAt: null });
  expect(await codeOf(api.addToWallet("apple"))).toBe("card_not_active");
  await api.authorizeCard();
  const card = await api.getCard();
  expect(card).toMatchObject({ holder: "ANA TORRES", number: "4915 6637 0003 4821", cvv: "317" });
  await api.addToWallet("apple");
  expect((await api.getModule()).pass).toEqual({ status: "added", provider: "apple" });
  await api.freezeCard(true);
  expect((await api.getModule()).card.status).toBe("frozen");
  await api.freezeCard(false);

  // Al activarse trae las cuentas de la demo, ya verificadas; la propia primero.
  expect((await api.listBeneficiaries()).map((b) => [b.alias, b.status])).toEqual([["Mi cuenta", "verified"], ["Mamá", "verified"], ["Renta depa", "verified"], ["Gimnasio", "verified"]]);
  const NEW = { owner: "individual" as const, name: "Luis Gómez", alias: "Luis", email: "", rfc: "", address: { street: "a", city: "b", state: "c", postalCode: "03100" } };
  expect(await codeOf(api.addBeneficiary({ ...NEW, clabe: "012180001234567890" }))).toBe("clabe_invalid");
  expect(await codeOf(api.addBeneficiary({ ...NEW, clabe: "012180001234567899" }))).toBe("beneficiary_duplicate");
  const luis = await api.addBeneficiary({ ...NEW, clabe: "002 1807 0091 2345 673" });
  expect(luis).toMatchObject({ status: "pending_verification", bankName: "Citibanamex", clabe: "002180700912345673" });
  expect(await codeOf(api.quoteSend(100_00, luis.id))).toBe("bank_not_verified");
  flush();
  expect((await api.listBeneficiaries()).find((b) => b.id === luis.id)?.status).toBe("verified");

  expect(await codeOf(api.quoteSend(100, "ben_mama"))).toBe("below_minimum");
  expect(await codeOf(api.quoteSend(1_000_00, "ben_mama"))).toBe("insufficient_balance");
  const quote = await api.quoteSend(100_00, "ben_mama");
  expect(quote).toMatchObject({ amountUsdcCents: 100_00, feeUsdcCents: 50, netUsdcCents: 99_50, amountMxnCents: 1716_38, expiresAt: NOW + 60_000 });
  const receipt = await api.confirmSend(quote.id);
  expect(receipt).toMatchObject({ status: "submitted", amountMxnCents: 1716_38, beneficiaryName: "María Elena Medina Ruiz", bankName: "Banorte", clabeLast4: "2470", completedAt: null });
  // 492.75 − OXXO (86.50 MXN = 5.01 USDC, la primera compra tras autorizar) − 100.00 enviados.
  expect((await api.getBalance()).usdcCents).toBe(387_74);
  expect(await codeOf(api.confirmSend(quote.id))).toBe("invalid_transition");
  flush();
  expect(await api.getReceipt(receipt.id)).toMatchObject({ status: "completed", completedAt: NOW });
  expect((await api.listMovements()).map((m) => [m.kind, m.status, m.toLabel])).toEqual([["withdrawal", "completed", "Mamá"], ["card", "completed", undefined], ["deposit", "completed", undefined]]);
  expect((await api.getEvents()).map((e) => e.type)).toEqual(["kyc.approved", "module.activated", "wallet.ready", "card.issued", "deposit.received", "card.transaction", "withdrawal.completed"]);

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

test("endorsement_expired: la emisión automática marca la caducidad y reconfirmKyc la vuelve a emitir", async () => {
  const { api, flush } = harness("endorsement_expired");
  await activate(api, flush);
  expect((await api.getModule()).kyc.approvedAt).toBe(NOW - 25 * 60 * 60 * 1000);
  // La emisión automática choca con la ventana de 24 h y deja la tarjeta para «confirma tus datos».
  expect((await api.getModule()).card.status).toBe("endorsement_expired");
  await api.reconfirmKyc();
  expect((await api.getModule()).kyc.status).toBe("under_review");
  flush();
  expect((await api.getModule()).kyc).toMatchObject({ status: "approved", approvedAt: NOW });
  // Reaprobado: se vuelve a emitir sola.
  expect((await api.getModule()).card).toMatchObject({ status: "active", last4: "4821" });
});

test("bank_verification_failed: la cuenta nueva queda en failed y se puede volver a capturar", async () => {
  const { api, flush } = harness("bank_verification_failed");
  await activate(api, flush);
  const NEW = { owner: "self" as const, name: "Ana Torres", alias: "", email: "", rfc: "", address: null, clabe: "072180001122334459" };
  const b = await api.addBeneficiary(NEW);
  flush();
  expect((await api.listBeneficiaries()).find((x) => x.id === b.id)).toMatchObject({ status: "failed", bankName: "Banorte" });
  expect(await codeOf(api.quoteSend(100_00, b.id))).toBe("bank_not_verified");
  const again = await api.addBeneficiary(NEW);
  expect((await api.listBeneficiaries()).find((x) => x.id === again.id)?.status).toBe("pending_verification");
});

test("send_failed: el recibo termina en failed con código y el saldo regresa", async () => {
  const { api, flush } = harness("send_failed");
  await activate(api, flush);
  const q = await api.quoteSend(100_00, "ben_self");
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

test("submitKyc: el expediente capturado en la app pasa a revisión y, tras un rechazo, se puede reenviar", async () => {
  const body = toSubmission(KYC_SECTIONS.reduce(fillSample, EMPTY_DRAFT));
  const { api, flush } = harness("kyc_rejected");
  expect(await codeOf(api.submitKyc(body))).toBe("invalid_transition"); // sin aceptar términos
  await api.acceptTerms();
  expect((await api.submitKyc(body)).kyc.status).toBe("under_review");
  flush();
  expect((await api.getModule()).kyc.status).toBe("rejected");
  await api.setScenario("happy");
  expect((await api.submitKyc(body)).kyc.status).toBe("under_review");
  flush();
  expect((await api.getModule()).kyc.status).toBe("approved");
  expect((await api.getEvents()).map((e) => [e.type, e.payload.end_user])).toEqual([["kyc.rejected", "ana.torres@acme.example"], ["kyc.approved", "ana.torres@acme.example"]]);
});
