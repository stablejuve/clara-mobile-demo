// Tipos del módulo Recibo: lo que RelayerModuleApi devuelve y lo que la máquina de estados mueve (spec «Máquina de estados»).
// Montos en CENTAVOS enteros: USDC se muestra con 2 decimales; MXN con 2. Tiempos en ms epoch.

export type ModuleStatus = "off" | "terms_pending" | "kyc" | "wallet_ready" | "active";
export type KycStatus = "not_started" | "incomplete" | "under_review" | "approved" | "rejected";
export type WalletStatus = "none" | "passkey_created" | "address_ready";
export type CardStatus = "none" | "requested" | "endorsement_pending" | "active" | "frozen" | "endorsement_expired";
export type PassStatus = "not_added" | "added";
export type BankStatus = "none" | "pending_verification" | "verified" | "failed";
export type SendStatus = "idle" | "quoting" | "confirming" | "submitted" | "completed" | "failed";
export type WalletProvider = "apple" | "google";

export type ModuleState = {
  module: ModuleStatus;
  kyc: { status: KycStatus; approvedAt: number | null; rejectionReasons: readonly string[] };
  wallet: { status: WalletStatus; address: string | null; chain: "base" };
  /** `authorizedAt`: la autorización on-chain única (D3); la tarjeta gasta sólo después de ella. */
  card: { status: CardStatus; last4: string | null; expiry: string | null; authorizedAt: number | null };
  pass: { status: PassStatus; provider: WalletProvider | null };
  bank: { status: BankStatus; clabe: string | null; bankName: string | null; ownerName: string | null };
  send: { status: SendStatus; quoteId: string | null; receiptId: string | null };
  balanceUsdcCents: number;
};

export type MovementKind = "deposit" | "withdrawal";
export type MovementStatus = "completed" | "pending" | "failed";
export type Movement = {
  id: string; kind: MovementKind; status: MovementStatus; amountUsdcCents: number; at: number;
  /** Depósito: quién pagó, concepto y referencia que mandó la empresa (eco en `deposit.received`), hash on-chain. */
  fromLabel?: string; concept?: string; reference?: string; txHash?: string; amountMxnCents?: number;
  /** Retiro: recibo asociado. */
  receiptId?: string;
};

export type Balance = { usdcCents: number; mxnCents: number; rate: number };
export type KycLinks = { tosLink: string; kycLink: string; redirectUri: string };
export type CardDetails = ModuleState["card"] & { holder: string; number: string | null; cvv: string | null };
export type BankAccount = ModuleState["bank"];
export type Quote = { id: string; amountUsdcCents: number; feeUsdcCents: number; netUsdcCents: number; amountMxnCents: number; rate: number; expiresAt: number };
export type ReceiptStatus = "submitted" | "completed" | "failed";
export type Receipt = {
  id: string; folio: string; status: ReceiptStatus; amountUsdcCents: number; feeUsdcCents: number; amountMxnCents: number; rate: number;
  bankName: string; clabeLast4: string; createdAt: number; completedAt: number | null; failureCode: RelayerErrorCode | null;
};

export type EventType = "module.activated" | "kyc.approved" | "kyc.rejected" | "wallet.ready" | "card.issued" | "deposit.received" | "withdrawal.completed" | "module.deactivated";
export type ModuleEvent = { id: string; type: EventType; at: number; payload: Record<string, string | number | null> };

/** Todo lo que `useModule` entrega a las pantallas en una sola foto. */
export type ModuleSnapshot = { state: ModuleState; movements: readonly Movement[]; events: readonly ModuleEvent[] };

export type RelayerErrorCode =
  | "invalid_transition" | "kyc_rejected" | "cards_unavailable_region" | "endorsement_expired" | "send_failed"
  | "bank_verification_failed" | "bank_not_verified" | "insufficient_balance" | "below_minimum" | "card_not_active"
  | "clabe_invalid" | "quote_expired" | "passkey_cancelled" | "not_found";

/** Error tipado del API (spec «Capa mock»): la UI lo traduce con i18n/errors.ts. */
export class RelayerError extends Error {
  readonly code: RelayerErrorCode;
  constructor(code: RelayerErrorCode, message?: string) {
    super(message ?? code);
    this.name = "RelayerError";
    this.code = code;
  }
}
export const isRelayerError = (e: unknown): e is RelayerError => e instanceof RelayerError;
