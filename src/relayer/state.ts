import type { Beneficiary, CardStatus, ModuleState, Movement, RelayerErrorCode, WalletProvider } from "./types";

// Máquina de estados del módulo (spec «Máquina de estados»). Pura: cada transición devuelve un estado nuevo o un código.
// La capa mock aplica estas funciones y les pone latencia; el backend real tendrá las mismas reglas del lado del servidor.

export type Result = { ok: true; state: ModuleState } | { ok: false; code: RelayerErrorCode };
const ok = (state: ModuleState): Result => ({ ok: true, state });
const fail = (code: RelayerErrorCode): Result => ({ ok: false, code });

/** D5: la tarjeta debe pedirse dentro de las 24 h posteriores a la aprobación del KYC. */
export const ENDORSEMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

export const INITIAL_STATE: ModuleState = {
  module: "off",
  kyc: { status: "not_started", approvedAt: null, rejectionReasons: [] },
  wallet: { status: "none", address: null, chain: "base" },
  card: { status: "none", last4: null, expiry: null, authorizedAt: null },
  pass: { status: "not_added", provider: null },
  beneficiaries: [],
  send: { status: "idle", quoteId: null, receiptId: null, beneficiaryId: null },
  balanceUsdcCents: 0,
};

// ── Alta ────────────────────────────────────────────────────────────────────
/** Beneficios → Activar: off → terms_pending. */
export function activate(s: ModuleState): Result {
  return s.module === "off" ? ok({ ...s, module: "terms_pending" }) : fail("invalid_transition");
}
/** Términos de Bridge + Relayer aceptados: terms_pending → kyc. */
export function acceptTerms(s: ModuleState): Result {
  return s.module === "terms_pending" ? ok({ ...s, module: "kyc" }) : fail("invalid_transition");
}
/** Abrir el KYC link: not_started | incomplete | rejected → incomplete. */
export function startKyc(s: ModuleState): Result {
  if (s.module !== "kyc") return fail("invalid_transition");
  if (!(["not_started", "incomplete", "rejected"] as const).some((k) => k === s.kyc.status)) return fail("invalid_transition");
  return ok({ ...s, kyc: { ...s.kyc, status: "incomplete", rejectionReasons: [] } });
}
/** Regreso por deep link: incomplete → under_review. */
export function completeKycReturn(s: ModuleState): Result {
  return s.kyc.status === "incomplete" ? ok({ ...s, kyc: { ...s.kyc, status: "under_review" } }) : fail("invalid_transition");
}
/** Veredicto de Bridge: under_review → approved (sella approved_at) | rejected (con razones). Tras un re-KYC por
 *  endorsement caducado, la tarjeta vuelve a `none` con ventana de 24 h nueva. */
export function resolveKyc(s: ModuleState, outcome: "approved" | "rejected", now: number, reasons: readonly string[] = []): Result {
  if (s.kyc.status !== "under_review") return fail("invalid_transition");
  if (outcome === "rejected") return ok({ ...s, kyc: { status: "rejected", approvedAt: null, rejectionReasons: reasons } });
  const card = s.card.status === "endorsement_expired" ? { ...s.card, status: "none" as const } : s.card;
  return ok({ ...s, kyc: { status: "approved", approvedAt: now, rejectionReasons: [] }, card });
}
/** Ceremonia de passkey (Face ID): kyc approved + wallet none → passkey_created, module wallet_ready. */
export function passkeyCreated(s: ModuleState): Result {
  if (s.module !== "kyc" || s.kyc.status !== "approved" || s.wallet.status !== "none") return fail("invalid_transition");
  return ok({ ...s, module: "wallet_ready", wallet: { ...s.wallet, status: "passkey_created" } });
}
/** Dirección en Base lista: passkey_created → address_ready, module active. */
export function walletReady(s: ModuleState, address: string): Result {
  if (s.wallet.status !== "passkey_created") return fail("invalid_transition");
  return ok({ ...s, module: "active", wallet: { status: "address_ready", address, chain: "base" } });
}

// ── Saldo ───────────────────────────────────────────────────────────────────
/** Depósito de la empresa a la dirección: sólo con módulo activo. */
export function deposit(s: ModuleState, m: Movement): Result {
  if (s.module !== "active" || m.kind !== "deposit") return fail("invalid_transition");
  return ok({ ...s, balanceUsdcCents: s.balanceUsdcCents + m.amountUsdcCents });
}

// ── Tarjeta ─────────────────────────────────────────────────────────────────
export function endorsementExpired(s: ModuleState, now: number): boolean {
  return s.kyc.approvedAt !== null && now - s.kyc.approvedAt > ENDORSEMENT_WINDOW_MS;
}
/** Pedir tarjeta: kyc approved + wallet address_ready + card none, dentro de las 24 h; `cardsAvailable` = el programa cubre el país. */
export function requestCard(s: ModuleState, now: number, cardsAvailable = true): Result {
  if (s.module !== "active" || s.kyc.status !== "approved" || s.wallet.status !== "address_ready") return fail("invalid_transition");
  if (s.card.status !== "none") return fail("invalid_transition");
  if (!cardsAvailable) return fail("cards_unavailable_region");
  if (endorsementExpired(s, now)) return fail("endorsement_expired");
  return ok({ ...s, card: { ...s.card, status: "requested" } });
}
/** El mock marca la caducidad para que la UI ofrezca «confirma tus datos». */
export function markEndorsementExpired(s: ModuleState): Result {
  return s.card.status === "none" ? ok({ ...s, card: { ...s.card, status: "endorsement_expired" } }) : fail("invalid_transition");
}
/** «Confirma tus datos»: endorsement_expired → kyc under_review (corto); la tarjeta espera. */
export function reconfirmKyc(s: ModuleState): Result {
  if (s.card.status !== "endorsement_expired" || s.kyc.status !== "approved") return fail("invalid_transition");
  return ok({ ...s, kyc: { ...s.kyc, status: "under_review", approvedAt: null } });
}
/** Bridge pide el endorsement `cards`: requested → endorsement_pending. */
export function cardEndorsementPending(s: ModuleState): Result {
  return s.card.status === "requested" ? ok({ ...s, card: { ...s.card, status: "endorsement_pending" } }) : fail("invalid_transition");
}
/** Emitida (Stripe Issuing): endorsement_pending → active, todavía sin autorizar (authorizedAt null). */
export function cardIssued(s: ModuleState, last4: string, expiry: string): Result {
  return s.card.status === "endorsement_pending" ? ok({ ...s, card: { status: "active", last4, expiry, authorizedAt: null } }) : fail("invalid_transition");
}
/** Autorización on-chain única (Face ID): active sin sello → active con sello. */
export function authorizeCard(s: ModuleState, now: number): Result {
  if (s.card.status !== "active" || s.card.authorizedAt !== null) return fail("invalid_transition");
  return ok({ ...s, card: { ...s.card, authorizedAt: now } });
}
export function freezeCard(s: ModuleState, frozen: boolean): Result {
  const from: CardStatus = frozen ? "active" : "frozen";
  if (s.card.status !== from) return fail("invalid_transition");
  return ok({ ...s, card: { ...s.card, status: frozen ? "frozen" : "active" } });
}
/** Agregar al teléfono: exige tarjeta activa y autorizada. */
export function addToWallet(s: ModuleState, provider: WalletProvider): Result {
  if (s.card.status !== "active" || s.card.authorizedAt === null) return fail("card_not_active");
  if (s.pass.status === "added") return fail("invalid_transition");
  return ok({ ...s, pass: { status: "added", provider } });
}

// ── Banco ───────────────────────────────────────────────────────────────────
/** CLABE como cuenta externa: none | failed → pending_verification (depósito de 0.01 MXN). */
/** Nueva cuenta guardada: entra en `pending_verification` (Bridge valida titular y CLABE). Sin CLABEs repetidas. */
export function addBeneficiary(s: ModuleState, b: Beneficiary): Result {
  if (s.module !== "active") return fail("invalid_transition");
  if (s.beneficiaries.some((x) => x.clabe === b.clabe && x.status !== "failed")) return fail("beneficiary_duplicate");
  return ok({ ...s, beneficiaries: [...s.beneficiaries.filter((x) => x.clabe !== b.clabe), b] });
}
export function resolveBeneficiary(s: ModuleState, id: string, outcome: "verified" | "failed"): Result {
  const b = s.beneficiaries.find((x) => x.id === id);
  if (!b || b.status !== "pending_verification") return fail("invalid_transition");
  return ok({ ...s, beneficiaries: s.beneficiaries.map((x) => (x.id === id ? { ...x, status: outcome } : x)) });
}

// ── Envío ───────────────────────────────────────────────────────────────────
/** Precondiciones del spec: beneficiario verificado y saldo suficiente (el mínimo de 50 MXN lo valida money.ts al cotizar). */
export function canSend(s: ModuleState, amountUsdcCents: number, beneficiaryId: string | null): RelayerErrorCode | null {
  if (s.module !== "active") return "invalid_transition";
  if (!beneficiaryId) return "bank_not_verified";
  const b = s.beneficiaries.find((x) => x.id === beneficiaryId);
  if (!b) return "not_found";
  if (b.status !== "verified") return "bank_not_verified";
  if (amountUsdcCents > s.balanceUsdcCents) return "insufficient_balance";
  return null;
}
export function quoteSend(s: ModuleState, quoteId: string, amountUsdcCents: number, beneficiaryId: string): Result {
  const why = canSend(s, amountUsdcCents, beneficiaryId);
  if (why) return fail(why);
  if (s.send.status === "confirming" || s.send.status === "submitted") return fail("invalid_transition");
  return ok({ ...s, send: { status: "quoting", quoteId, receiptId: null, beneficiaryId } });
}
/** Face ID en curso / Bridge recibiendo la orden: quoting → confirming. */
export function beginConfirm(s: ModuleState, quoteId: string): Result {
  if (s.send.status !== "quoting" || s.send.quoteId !== quoteId) return fail("invalid_transition");
  return ok({ ...s, send: { ...s.send, status: "confirming" } });
}
/** Bridge aceptó la transferencia: confirming → submitted; descuenta el saldo. */
export function submitSend(s: ModuleState, quoteId: string, amountUsdcCents: number, receiptId: string): Result {
  if (s.send.status !== "confirming" || s.send.quoteId !== quoteId) return fail("invalid_transition");
  const why = canSend(s, amountUsdcCents, s.send.beneficiaryId);
  if (why) return fail(why);
  return ok({ ...s, balanceUsdcCents: s.balanceUsdcCents - amountUsdcCents, send: { ...s.send, status: "submitted", quoteId, receiptId } });
}
/** SPEI liquidó o falló (reembolsa). */
export function resolveSend(s: ModuleState, outcome: "completed" | "failed", amountUsdcCents: number): Result {
  if (s.send.status !== "submitted") return fail("invalid_transition");
  const balanceUsdcCents = outcome === "failed" ? s.balanceUsdcCents + amountUsdcCents : s.balanceUsdcCents;
  return ok({ ...s, balanceUsdcCents, send: { ...s.send, status: outcome } });
}
/** Cancelar la cotización o cerrar el recibo: vuelve a idle. */
export function resetSend(s: ModuleState): Result {
  if (s.send.status === "confirming" || s.send.status === "submitted") return fail("invalid_transition");
  return ok({ ...s, send: { status: "idle", quoteId: null, receiptId: null, beneficiaryId: null } });
}

// ── Módulo ──────────────────────────────────────────────────────────────────
/** Ajustes → Desactivar: todo a cero (la wallet sigue siendo del usuario on-chain; la demo la olvida). */
export function deactivate(s: ModuleState): Result {
  return s.module === "off" ? fail("invalid_transition") : ok(INITIAL_STATE);
}

/** Página de la hoja de alta donde se retoma (0 intro · 1 términos · 2 KYC · 3 wallet) según dónde se quedó el módulo. */
export function onboardingPage(s: ModuleState): 0 | 1 | 2 | 3 {
  if (s.module === "off" || s.module === "terms_pending") return 0;
  if (s.module === "kyc") return s.kyc.status === "approved" ? 3 : 2;
  return 3;
}
