import type { Key } from "./copy";

// Modo explicativo: qué endpoint del backend llamaría cada acción de la demo, y qué le pide ese backend a Bridge o al procesador
// emisor de Clara. Sólo visual: nada de esto se llama (la demo es 100 % front). Modelo vigente: tarjeta de Clara (Mastercard, con
// su issuer processor) y fondos custodiados en wallets de Bridge; sin passkeys ni firmas del usuario.
// «exists» = ya hay un endpoint así en relayer-core; «planned» = propuesta para la fase de backend (`nearest` = el más parecido
// que existe hoy). Los HOOK no los llama la app: llegan solos (webhooks de Bridge o del procesador emisor).

export type Doc = { label: string; url: string };
export type Endpoint = {
  method: "GET" | "POST" | "PATCH" | "HOOK";
  path: string;
  /** Lo que el backend le pide a terceros (o, si es HOOK, quién lo manda y qué dispara). */
  upstream: readonly string[];
  status: "exists" | "planned";
  nearest?: string;
  docs: readonly Doc[];
};

const BRIDGE = (path: string, label: string): Doc => ({ label, url: `https://apidocs.bridge.xyz/${path}` });
const EU = "/v1/end-users/{id}";
const TRANSFERS = BRIDGE("api-reference/transfers/create-a-transfer", "Bridge · Transfers");
const WALLETS = BRIDGE("platform/wallets/move-money", "Bridge · Wallets");
const COP = BRIDGE("get-started/guides/move-money/cop_integration_guide", "Bridge · COP");

export const ENDPOINTS = {
  // ── Empresa (back office) ────────────────────────────────────────────────
  invite: { method: "POST", path: "/v1/end-users", upstream: [], status: "exists", docs: [] },
  sendBenefit: { method: "POST", path: "/v1/benefits", upstream: [], status: "planned", docs: [] },
  payBenefit: {
    method: "POST", path: "/v1/benefits/{id}/pay", status: "planned", nearest: "POST /v1/payouts",
    upstream: ["Bridge POST /v0/transfers · bridge_wallet (empresa) → bridge_wallet (empleado)", "El empleado lo ve como depósito pendiente hasta que Bridge confirma"],
    docs: [TRANSFERS, WALLETS],
  },
  benefitArrived: { method: "HOOK", path: "/hooks/bridge", upstream: ["← Bridge webhook transfer.updated (depósito completado)", "Se acredita el saldo y se avisa al empleado"], status: "exists", docs: [WALLETS] },
  // ── Alta del empleado ────────────────────────────────────────────────────
  acceptTerms: {
    method: "POST", path: `${EU}/consents`, status: "planned", nearest: "POST /app/kyc/customers/tos-link",
    upstream: ["Bridge POST /v0/customers/tos_links → signed_agreement_id"],
    docs: [BRIDGE("platform/customers/customers/tos", "Bridge · Términos")],
  },
  submitKyc: {
    method: "POST", path: `${EU}/kyc`, status: "planned", nearest: "POST /app/kyc/customers/submit",
    upstream: ["Bridge POST /v0/customers (individual · endorsements: base, cop)"],
    docs: [BRIDGE("api-reference/customers/create-a-customer", "Bridge · Crear customer"), BRIDGE("platform/customers/customers/endorsements", "Bridge · Endorsements")],
  },
  kycVerdict: {
    method: "HOOK", path: "/hooks/bridge", status: "exists",
    upstream: ["← Bridge webhook customer.updated", "Bridge POST /v0/customers/{id}/wallets (wallet custodiada)", "Issuer processor de Clara: emite la tarjeta Mastercard"],
    docs: [BRIDGE("platform/wallets/overview", "Bridge · Wallets custodiadas")],
  },
  // ── Tarjeta ──────────────────────────────────────────────────────────────
  activateCard: { method: "POST", path: `${EU}/card/activate`, upstream: ["Issuer processor de Clara: activa la tarjeta"], status: "planned", docs: [] },
  freezeCard: { method: "PATCH", path: `${EU}/card`, upstream: ["Issuer processor de Clara: bloquea o desbloquea autorizaciones"], status: "planned", docs: [] },
  addToWallet: { method: "POST", path: `${EU}/card/provisioning`, upstream: ["Issuer processor de Clara: push provisioning a Apple Wallet"], status: "planned", docs: [] },
  cardAuthorization: {
    method: "HOOK", path: "/hooks/issuer/authorization", status: "planned",
    upstream: ["← Mastercard → issuer processor de Clara: solicitud de autorización", "Clara valida Available y responde en tiempo real", "Aprobada → Bridge POST /v0/transfers · bridge_wallet (empleado) → bridge_wallet (Clara) · on_behalf_of"],
    docs: [TRANSFERS, WALLETS],
  },
  cardFundsMoved: { method: "HOOK", path: "/hooks/bridge", upstream: ["← Bridge webhook transfer.updated (wallet a wallet completada)"], status: "exists", docs: [WALLETS] },
  cardCleared: { method: "HOOK", path: "/hooks/issuer/clearing", upstream: ["← Mastercard → issuer processor de Clara: compensación (monto final)"], status: "planned", docs: [] },
  cardSettled: {
    method: "POST", path: "/v1/settlements", status: "planned",
    upstream: ["Bridge POST /v0/transfers · bridge_wallet (Clara) → wire USD (banco liquidador)", "Banco liquidador → Mastercard: settlement neto"],
    docs: [BRIDGE("get-started/guides/wallets/offramp", "Bridge · Offramp"), TRANSFERS],
  },
  // ── Convertir y retirar ──────────────────────────────────────────────────
  quote: {
    method: "POST", path: "/v1/offramp/quote", status: "exists",
    upstream: [
      "1 · Bridge GET /v0/exchange_rates?from=usd&to=cop → sell_rate (ya trae la comisión de Bridge)",
      "2 · Tasa al empleado = sell_rate con la comisión de Clara dentro (no hay renglón de comisión)",
      "3 · USD que salen del saldo = COP que recibe ÷ tasa",
      "4 · Se valida saldo disponible y el mínimo de Bridge (COP 4,000); la tasa queda fija 60 s",
    ],
    docs: [BRIDGE("api-reference/exchange-rates/get-current-exchange-rate-between-two-currencies", "Bridge · Tipo de cambio"), COP],
  },
  addBeneficiary: {
    method: "POST", path: `${EU}/beneficiaries`, status: "planned", nearest: "POST /v1/recipients · POST /v1/recipients/{id}/accounts",
    upstream: ["Bridge POST /v0/customers/{id}/external_accounts (cop · bre_b | co_bank_transfer)"],
    docs: [BRIDGE("api-reference/external-accounts/create-a-new-external-account", "Bridge · External accounts"), COP],
  },
  beneficiaryVerified: { method: "HOOK", path: "/hooks/bridge", upstream: ["← Bridge: validación Bre-B / PSE de la cuenta"], status: "exists", docs: [COP] },
  withdraw: {
    method: "POST", path: `${EU}/withdrawals`, status: "planned", nearest: "POST /v1/payouts",
    upstream: ["Bridge POST /v0/transfers · bridge_wallet (empleado) → cop (Bre-B o transferencia bancaria) · external_account_id"],
    docs: [TRANSFERS, COP],
  },
  withdrawalSettled: { method: "HOOK", path: "/hooks/bridge", upstream: ["← Bridge webhook transfer.updated (payment_processed, o devuelto)"], status: "exists", docs: [BRIDGE("platform/orchestration/transfers/transfer", "Bridge · Estados del transfer")] },
} as const satisfies Record<string, Endpoint>;

export type TraceKey = keyof typeof ENDPOINTS;
export const TRACE_KEYS = Object.keys(ENDPOINTS) as TraceKey[];
/** Clave de copy con la frase que explica el endpoint. */
export const endpointSummary = (k: TraceKey): Key => `ep.${k}`;
