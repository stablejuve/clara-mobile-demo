import * as M from "../src/relayer/state";
import type { ModuleState, Movement } from "../src/relayer/types";

const NOW = Date.parse("2026-11-11T12:00:00Z");
const H = 60 * 60 * 1000;

function unwrap(r: M.Result): ModuleState {
  if (!r.ok) throw new Error(`expected ok, got ${r.code}`);
  return r.state;
}
const code = (r: M.Result) => (r.ok ? "ok" : r.code);

// Estados de referencia construidos sólo con transiciones válidas.
const atTerms = unwrap(M.activate(M.INITIAL_STATE));
const atKyc = unwrap(M.acceptTerms(atTerms));
const kycIncomplete = unwrap(M.startKyc(atKyc));
const kycReview = unwrap(M.completeKycReturn(kycIncomplete));
const kycApproved = unwrap(M.resolveKyc(kycReview, "approved", NOW));
const passkey = unwrap(M.passkeyCreated(kycApproved));
const active = unwrap(M.walletReady(passkey, "0xabc"));
const DEP: Movement = { id: "mv_1", kind: "deposit", status: "completed", amountUsdcCents: 500_00, at: NOW };
const funded = unwrap(M.deposit(active, DEP));
const cardRequested = unwrap(M.requestCard(funded, NOW + H));
const cardPending = unwrap(M.cardEndorsementPending(cardRequested));
const cardIssued = unwrap(M.cardIssued(cardPending, "4821", "09/29"));
const cardAuthorized = unwrap(M.authorizeCard(cardIssued, NOW + 2 * H));
const bankPending = unwrap(M.addBankAccount(cardAuthorized, "012180001234567899", "BBVA México", "Ana Torres"));
const bankVerified = unwrap(M.resolveBank(bankPending, "verified"));
const quoting = unwrap(M.quoteSend(bankVerified, "q_1", 100_00));
const confirming = unwrap(M.beginConfirm(quoting, "q_1"));
const submitted = unwrap(M.submitSend(confirming, "q_1", 100_00, "rcpt_1"));

test("camino feliz: module off → terms_pending → kyc → wallet_ready → active", () => {
  expect([M.INITIAL_STATE.module, atTerms.module, atKyc.module, passkey.module, active.module]).toEqual(["off", "terms_pending", "kyc", "wallet_ready", "active"]);
  expect([kycIncomplete.kyc.status, kycReview.kyc.status, kycApproved.kyc.status]).toEqual(["incomplete", "under_review", "approved"]);
  expect(kycApproved.kyc.approvedAt).toBe(NOW);
  expect(active.wallet).toEqual({ status: "address_ready", address: "0xabc", chain: "base" });
  expect(funded.balanceUsdcCents).toBe(500_00);
});

test("transiciones inválidas del alta", () => {
  expect(code(M.activate(atTerms))).toBe("invalid_transition");
  expect(code(M.acceptTerms(M.INITIAL_STATE))).toBe("invalid_transition");
  expect(code(M.acceptTerms(atKyc))).toBe("invalid_transition");
  expect(code(M.startKyc(atTerms))).toBe("invalid_transition");
  expect(code(M.startKyc(kycReview))).toBe("invalid_transition");
  expect(code(M.completeKycReturn(atKyc))).toBe("invalid_transition");
  expect(code(M.resolveKyc(kycIncomplete, "approved", NOW))).toBe("invalid_transition");
  expect(code(M.passkeyCreated(kycReview))).toBe("invalid_transition");
  expect(code(M.passkeyCreated(active))).toBe("invalid_transition");
  expect(code(M.walletReady(kycApproved, "0x1"))).toBe("invalid_transition");
  expect(code(M.deposit(kycApproved, DEP))).toBe("invalid_transition");
});

test("KYC rechazado guarda razones y permite reintentar", () => {
  const rejected = unwrap(M.resolveKyc(kycReview, "rejected", NOW, ["id_document_unreadable"]));
  expect(rejected.kyc).toEqual({ status: "rejected", approvedAt: null, rejectionReasons: ["id_document_unreadable"] });
  expect(unwrap(M.startKyc(rejected)).kyc.status).toBe("incomplete");
});

test("tarjeta: sólo con kyc approved + wallet address_ready + card none, dentro de las 24 h", () => {
  expect(code(M.requestCard(kycApproved, NOW))).toBe("invalid_transition");
  expect(code(M.requestCard(funded, NOW + 24 * H))).toBe("ok");          // justo 24 h: vale
  expect(code(M.requestCard(funded, NOW + 24 * H + 1))).toBe("endorsement_expired");
  expect(code(M.requestCard(funded, NOW, false))).toBe("cards_unavailable_region");
  expect(code(M.requestCard(cardRequested, NOW))).toBe("invalid_transition");
  expect([cardRequested.card.status, cardPending.card.status, cardIssued.card.status]).toEqual(["requested", "endorsement_pending", "active"]);
  expect(cardIssued.card).toEqual({ status: "active", last4: "4821", expiry: "09/29", authorizedAt: null });
  expect(cardAuthorized.card.authorizedAt).toBe(NOW + 2 * H);
  expect(code(M.authorizeCard(cardAuthorized, NOW))).toBe("invalid_transition");
  expect(code(M.cardIssued(cardRequested, "1", "1"))).toBe("invalid_transition");
});

test("endorsement caducado: marcar → confirma tus datos → under_review → approved deja la tarjeta en none con ventana nueva", () => {
  const expired = unwrap(M.markEndorsementExpired(funded));
  expect(expired.card.status).toBe("endorsement_expired");
  expect(code(M.markEndorsementExpired(expired))).toBe("invalid_transition");
  expect(code(M.reconfirmKyc(funded))).toBe("invalid_transition");
  const review = unwrap(M.reconfirmKyc(expired));
  expect(review.kyc.status).toBe("under_review");
  expect(review.card.status).toBe("endorsement_expired");
  const again = unwrap(M.resolveKyc(review, "approved", NOW + 30 * H));
  expect(again.kyc.approvedAt).toBe(NOW + 30 * H);
  expect(again.card.status).toBe("none");
  expect(code(M.requestCard(again, NOW + 31 * H))).toBe("ok");
});

test("congelar/descongelar y agregar al teléfono (exige activa y autorizada)", () => {
  expect(code(M.addToWallet(cardIssued, "apple"))).toBe("card_not_active");
  const added = unwrap(M.addToWallet(cardAuthorized, "apple"));
  expect(added.pass).toEqual({ status: "added", provider: "apple" });
  expect(code(M.addToWallet(added, "google"))).toBe("invalid_transition");
  const frozen = unwrap(M.freezeCard(cardAuthorized, true));
  expect(frozen.card.status).toBe("frozen");
  expect(code(M.freezeCard(frozen, true))).toBe("invalid_transition");
  expect(code(M.addToWallet(frozen, "apple"))).toBe("card_not_active");
  expect(unwrap(M.freezeCard(frozen, false)).card.status).toBe("active");
});

test("cuenta bancaria: none | failed → pending_verification → verified | failed", () => {
  expect(bankPending.bank).toEqual({ status: "pending_verification", clabe: "012180001234567899", bankName: "BBVA México", ownerName: "Ana Torres" });
  expect(code(M.addBankAccount(bankPending, "1", "b", "o"))).toBe("invalid_transition");
  expect(code(M.addBankAccount(kycApproved, "1", "b", "o"))).toBe("invalid_transition");
  const failed = unwrap(M.resolveBank(bankPending, "failed"));
  expect(failed.bank.status).toBe("failed");
  expect(code(M.addBankAccount(failed, "072225009876543217", "Banorte", "Ana Torres"))).toBe("ok");
  expect(code(M.resolveBank(bankVerified, "verified"))).toBe("invalid_transition");
});

test("envío: precondiciones (bank verified, saldo) y ciclo quoting → confirming → submitted → completed | failed", () => {
  expect(M.canSend(bankPending, 100_00)).toBe("bank_not_verified");
  expect(M.canSend(bankVerified, 500_01)).toBe("insufficient_balance");
  expect(M.canSend(bankVerified, 500_00)).toBeNull();
  expect(code(M.quoteSend(cardAuthorized, "q", 100_00))).toBe("bank_not_verified");
  expect(quoting.send).toEqual({ status: "quoting", quoteId: "q_1", receiptId: null });
  expect(code(M.quoteSend(quoting, "q_2", 50_00))).toBe("ok");                // recotizar reemplaza
  expect(code(M.beginConfirm(quoting, "q_other"))).toBe("invalid_transition");
  expect(code(M.submitSend(quoting, "q_1", 100_00, "r"))).toBe("invalid_transition"); // sin beginConfirm
  expect(submitted.send).toEqual({ status: "submitted", quoteId: "q_1", receiptId: "rcpt_1" });
  expect(submitted.balanceUsdcCents).toBe(400_00);
  const done = unwrap(M.resolveSend(submitted, "completed", 100_00));
  expect([done.send.status, done.balanceUsdcCents]).toEqual(["completed", 400_00]);
  const failed = unwrap(M.resolveSend(submitted, "failed", 100_00));
  expect([failed.send.status, failed.balanceUsdcCents]).toEqual(["failed", 500_00]);  // reembolso
  expect(code(M.resolveSend(done, "completed", 1))).toBe("invalid_transition");
  expect(code(M.resetSend(confirming))).toBe("invalid_transition");
  expect(code(M.resetSend(submitted))).toBe("invalid_transition");
  expect(unwrap(M.resetSend(done)).send.status).toBe("idle");
  expect(unwrap(M.resetSend(quoting)).send.status).toBe("idle");
  expect(code(M.quoteSend(done, "q_3", 100_00))).toBe("ok");
});

test("desactivar vuelve a cero; no se puede desactivar lo que está off", () => {
  expect(unwrap(M.deactivate(bankVerified))).toEqual(M.INITIAL_STATE);
  expect(code(M.deactivate(M.INITIAL_STATE))).toBe("invalid_transition");
});

test("resumeScreen: a dónde vuelve «Continuar» según el estado", () => {
  expect(M.resumeScreen(M.INITIAL_STATE)).toBe("terms");
  expect(M.resumeScreen(atTerms)).toBe("terms");
  expect(M.resumeScreen(atKyc)).toBe("kyc");
  expect(M.resumeScreen(kycIncomplete)).toBe("kyc");
  expect(M.resumeScreen(kycReview)).toBe("kycPending");
  expect(M.resumeScreen(unwrap(M.resolveKyc(kycReview, "rejected", NOW)))).toBe("kycRejected");
  expect(M.resumeScreen(kycApproved)).toBe("passkey");
  expect(M.resumeScreen(passkey)).toBe("passkey");
  expect(M.resumeScreen(active)).toBe("balance");
});
