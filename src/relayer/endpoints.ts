import type { RelayerModuleApi } from "./api";

// Modo explicativo: qué endpoint del backend (en la demo se presenta como de Clara; por dentro es relayer-core/apps/api) llamaría cada acción de la app, qué hace y qué le
// pide a Bridge / Stripe / Turnkey. Sólo visual: nada de esto se llama. «exists» = ya está en relayer-core; «planned» = propuesta
// para la fase de backend (con el endpoint actual más parecido en `nearest`). Fuente: docs/plans/2026-11-12-flujos-y-modo-explicativo.md.

export type Doc = { label: string; url: string };
export type Endpoint = {
  method: "GET" | "POST" | "PATCH" | "DELETE" | "HOOK";
  path: string;
  summary: string;
  /** Lo que nuestro backend le pide a terceros (o, si es HOOK, quién lo manda). */
  upstream: readonly string[];
  status: "exists" | "planned";
  nearest?: string;
  docs: readonly Doc[];
  /** Lecturas de fondo: se registran, pero no sacan chip. */
  quiet?: boolean;
};

/** Procesos que llegan solos (webhooks entrantes o eventos on-chain), emitidos por el mock. */
export type BackgroundKey = "kycVerdict" | "cardIssued" | "beneficiaryVerified" | "speiSettled" | "payrollDeposit" | "cardTransaction";
/** Acciones de UI que no son una llamada del contrato pero sí una del backend real. */
export type UiKey = "revealCard";
export type TraceKey = keyof RelayerModuleApi | BackgroundKey | UiKey;

const BRIDGE = (path: string, label = "Bridge"): Doc => ({ label, url: `https://apidocs.bridge.xyz/${path}` });
const STRIPE = (path: string, label = "Stripe Issuing"): Doc => ({ label, url: `https://docs.stripe.com/${path}` });
const TURNKEY: Doc = { label: "Turnkey", url: "https://docs.turnkey.com" };
const EU = "/v1/end-users/{id}";

export const ENDPOINTS: Record<TraceKey, Endpoint> = {
  // ── Contrato (RelayerModuleApi) ──────────────────────────────────────────
  getModule: { method: "GET", path: `${EU}/module`, summary: "Estado del módulo para este empleado: alta, KYC, wallet, tarjeta y saldo.", upstream: [], status: "planned", nearest: "POST /v1/end-users", docs: [], quiet: true },
  acceptTerms: {
    method: "POST", path: `${EU}/consents`, summary: "Guarda la aceptación de términos de Clara y de Bridge (incluye los de la tarjeta) con IP y fecha.",
    upstream: ["Bridge POST /v0/customers/tos_links → signed_agreement_id"], status: "planned", nearest: "POST /app/kyc/customers/tos-link",
    docs: [BRIDGE("platform/customers/customers/tos", "Bridge · Términos")],
  },
  startKyc: {
    method: "POST", path: `${EU}/kyc/link`, summary: "Pide a Bridge un KYC Link hospedado con los endorsements base, SPEI y tarjeta.",
    upstream: ["Bridge GET /v0/customers/{id}/kyc_link?endorsement=cards"], status: "planned", nearest: "POST /app/kyc/customers/tos-link",
    docs: [BRIDGE("platform/customers/customers/kyclinks", "Bridge · KYC Links")],
  },
  completeKycReturn: { method: "POST", path: `${EU}/kyc/return`, summary: "El usuario volvió del KYC hospedado: se refresca el estado del Customer en Bridge.", upstream: ["Bridge GET /v0/customers/{id}"], status: "planned", nearest: "POST /app/kyc/customers/refresh", docs: [BRIDGE("api-reference/customers/get-a-single-customer-object", "Bridge · Customer")] },
  submitKyc: {
    method: "POST", path: `${EU}/kyc`, summary: "Manda el expediente capturado en la app (datos, domicilio, INE, RFC, uso de la cuenta) y crea el Customer en Bridge.",
    upstream: ["Bridge POST /v0/customers (endorsements: base, spei, cards)"], status: "planned", nearest: "POST /app/kyc/customers/submit",
    docs: [BRIDGE("api-reference/customers/create-a-customer", "Bridge · Crear Customer"), BRIDGE("platform/cards/overview/kyc", "Bridge · KYC de tarjetas")],
  },
  reconfirmKyc: {
    method: "POST", path: `${EU}/kyc/reconfirm`, summary: "Pasaron más de 24 h desde el KYC: pide a Bridge reconfirmar datos para reactivar el endorsement de tarjeta.",
    upstream: ["Bridge GET /v0/customers/{id}/kyc_link?endorsement=cards"], status: "planned", docs: [BRIDGE("platform/cards/overview/kyc", "Bridge · Vigencia de 24 h")],
  },
  createPasskey: {
    method: "POST", path: `${EU}/wallet`, summary: "Crea la passkey del empleado y su wallet no custodial en Base. Al quedar lista, emite la tarjeta en automático.",
    upstream: ["Turnkey: sub-org + passkey + wallet", "Stripe POST /v1/issuing/cards (automático)"], status: "planned", nearest: "POST /app/passkeys/register · POST /app/wallets/confirm",
    docs: [TURNKEY, BRIDGE("platform/cards/overview/stripe-issuing", "Bridge · Emitir tarjeta")],
  },
  getBalance: { method: "GET", path: `${EU}/balance`, summary: "Saldo USDC de la wallet y su equivalente en MXN.", upstream: ["Base RPC: balanceOf(USDC)"], status: "planned", nearest: "GET /v1/wallets/{walletId}", docs: [], quiet: true },
  listMovements: { method: "GET", path: `${EU}/movements`, summary: "Depósitos, compras con tarjeta y retiros del empleado.", upstream: [], status: "planned", nearest: "GET /v1/wallets/{walletId}/activity", docs: [], quiet: true },
  requestCard: {
    method: "POST", path: `${EU}/card`, summary: "Reintenta la emisión de la tarjeta virtual (normalmente sale sola al activar Recibo).",
    upstream: ["Stripe POST /v1/issuing/cards (crypto_wallet: base · usdc · standard)"], status: "planned",
    docs: [BRIDGE("platform/cards/overview/stripe-issuing", "Bridge · Stripe Issuing")],
  },
  authorizeCard: {
    method: "POST", path: `${EU}/card/allowance`, summary: "Límite de gasto: la wallet aprueba al contrato de Bridge para cobrar hasta un monto. Es lo que permite gastar.",
    upstream: ["Turnkey firma approve(spender, monto) en Base", "Bridge: spender de tarjetas no custodiales"], status: "planned",
    docs: [BRIDGE("platform/cards/overview/noncustodial", "Bridge · Tarjeta no custodial"), TURNKEY],
  },
  getCard: { method: "GET", path: `${EU}/card`, summary: "Estado de la tarjeta, últimos 4 y vencimiento.", upstream: ["Stripe GET /v1/issuing/cards/{id}"], status: "planned", docs: [BRIDGE("platform/cards/features", "Bridge · Tarjetas")], quiet: true },
  freezeCard: {
    method: "PATCH", path: `${EU}/card`, summary: "Congela o descongela la tarjeta: se rechaza cualquier compra mientras esté congelada.",
    upstream: ["Stripe POST /v1/issuing/cards/{id} status=inactive|active"], status: "planned", docs: [STRIPE("api/issuing/cards/update")],
  },
  addToWallet: {
    method: "POST", path: `${EU}/card/provisioning`, summary: "Push provisioning: agrega la tarjeta a Apple Wallet o Google Wallet sin teclear datos.",
    upstream: ["Stripe Issuing push provisioning"], status: "planned", docs: [STRIPE("issuing/cards/digital-wallets"), BRIDGE("platform/cards/features", "Bridge · Wallets")],
  },
  listBeneficiaries: { method: "GET", path: `${EU}/beneficiaries`, summary: "Cuentas CLABE guardadas del empleado.", upstream: [], status: "planned", nearest: "GET /v1/recipients/with-accounts", docs: [], quiet: true },
  addBeneficiary: {
    method: "POST", path: `${EU}/beneficiaries`, summary: "Guarda una cuenta CLABE (propia o de un tercero) y pide a Bridge darla de alta y verificar al titular.",
    upstream: ["Bridge POST /v0/customers/{id}/external_accounts (spei · clabe)"], status: "planned", nearest: "POST /v1/recipients · POST /v1/recipients/{id}/accounts",
    docs: [BRIDGE("api-reference/external-accounts/create-a-new-external-account", "Bridge · External accounts"), BRIDGE("platform/orchestration/external-accounts/verification-of-payee", "Bridge · Verificación del titular")],
  },
  quoteSend: {
    method: "POST", path: "/v1/offramp/quote", summary: "Estima cuántos pesos llegan: tipo de cambio en vivo de Bridge (sell_rate) + nuestra comisión. Valida el mínimo; Bridge no bloquea la tasa.",
    upstream: ["Bridge GET /v0/exchange_rates?from=usd&to=mxn (se actualiza ~30 s)"], status: "exists",
    docs: [BRIDGE("api-reference/exchange-rates/get-current-exchange-rate-between-two-currencies", "Bridge · Tipo de cambio")],
  },
  confirmSend: {
    method: "POST", path: `${EU}/withdrawals`, summary: "Valida cuenta verificada, saldo USDC on-chain y mínimo; recotiza; crea el transfer en Bridge y la wallet firma el envío de USDC a la dirección de depósito de Bridge, que paga en pesos por SPEI.",
    upstream: ["Bridge GET /v0/exchange_rates (recotiza)", "Bridge POST /v0/transfers (base/usdc → spei/mxn) → source_deposit_instructions", "Turnkey firma la transferencia USDC"], status: "planned", nearest: "POST /v1/payouts (nivel integrador)",
    docs: [BRIDGE("api-reference/transfers/create-a-transfer", "Bridge · Transfers"), BRIDGE("platform/orchestration/transfers/transfer", "Bridge · Depósito al transfer")],
  },
  getReceipt: { method: "GET", path: "/v1/payouts/{reference}/status", summary: "Estado y folio del retiro.", upstream: ["Bridge GET /v0/transfers/{id}"], status: "exists", docs: [], quiet: true },
  getEvents: { method: "GET", path: "/v1/webhooks", summary: "Eventos que Clara manda a la empresa (alta, depósitos, tarjeta, retiros).", upstream: [], status: "exists", docs: [], quiet: true },
  deactivate: { method: "DELETE", path: `${EU}/module`, summary: "Desactiva Recibo para el empleado (la wallet sigue siendo suya on-chain).", upstream: ["Stripe: cancela la tarjeta"], status: "planned", docs: [STRIPE("api/issuing/cards/update")] },

  // ── Acciones de UI ───────────────────────────────────────────────────────
  revealCard: {
    method: "POST", path: `${EU}/card/reveal`, summary: "Ver número, vencimiento y CVV. Los datos los sirve Stripe directo al teléfono; nunca pasan por nuestro backend.",
    upstream: ["Stripe ephemeral key → Issuing Elements"], status: "planned", docs: [STRIPE("issuing/elements"), BRIDGE("platform/cards/features", "Bridge · Mostrar datos")],
  },

  // ── Llegan solos ─────────────────────────────────────────────────────────
  kycVerdict: { method: "HOOK", path: "/hooks/bridge", summary: "Bridge avisa el veredicto del KYC (aprobado o rechazado con razones).", upstream: ["← Bridge webhook customer.updated"], status: "exists", docs: [BRIDGE("platform/customers/customers/endorsements", "Bridge · Endorsements")] },
  cardIssued: { method: "HOOK", path: "/hooks/stripe", summary: "Stripe confirma la tarjeta emitida (últimos 4 y vencimiento).", upstream: ["← Stripe webhook issuing_card.created"], status: "planned", nearest: "POST /hooks/bridge", docs: [BRIDGE("platform/cards/overview/webhooks", "Bridge · Webhooks de tarjeta")] },
  beneficiaryVerified: { method: "HOOK", path: "/hooks/bridge", summary: "Bridge confirma (o rechaza) al titular de la cuenta CLABE.", upstream: ["← Bridge webhook external_account.updated"], status: "exists", docs: [BRIDGE("platform/orchestration/external-accounts/verification-of-payee", "Bridge · Verificación del titular")] },
  speiSettled: { method: "HOOK", path: "/hooks/bridge", summary: "El SPEI liquidó (o falló y se reembolsa el saldo).", upstream: ["← Bridge webhook transfer.updated"], status: "exists", docs: [BRIDGE("platform/orchestration/transfers/transfer-states", "Bridge · Estados del transfer")] },
  payrollDeposit: { method: "HOOK", path: "/hooks/turnkey", summary: "Llega USDC de la empresa a la wallet; Clara avisa a la app y manda deposit.received a la empresa.", upstream: ["← on-chain (Base) vía Turnkey"], status: "exists", docs: [TURNKEY] },
  cardTransaction: { method: "HOOK", path: "/hooks/stripe", summary: "Compra con la tarjeta: Bridge valida que exista el approve y haya USDC suficiente y jala los fondos on-chain al momento. Visa convierte MXN→USD; la tarjeta gasta USDC 1:1.", upstream: ["← Stripe webhook issuing_authorization.created / issuing_transaction.created"], status: "planned", docs: [BRIDGE("platform/cards/overview/webhooks", "Bridge · Webhooks de tarjeta")] },
};

export const isBackground = (k: TraceKey): k is BackgroundKey => ENDPOINTS[k].method === "HOOK";
