import type { Quote, RelayerErrorCode } from "./types";

// Dinero del módulo: centavos enteros, tipo de cambio fijo de demo, redondeo half-up, mínimo 50 MXN (D5). Puro.

/** MXN por USDC, fijo en la demo (el real lo cotiza Bridge). */
export const DEMO_RATE = 17.25;
/** Comisión del envío a banco: 0.50 % del monto, dentro del monto. */
export const SEND_FEE_BPS = 50;
/** Retiro mínimo: 50 MXN recibidos. */
export const MIN_SEND_MXN_CENTS = 50_00;
/** Vigencia de una cotización. */
export const QUOTE_TTL_MS = 60_000;

const roundHalfUp = (n: number): number => Math.floor(n + 0.5);
export const usdcToMxnCents = (usdcCents: number, rate = DEMO_RATE): number => roundHalfUp(usdcCents * rate);
export const mxnToUsdcCents = (mxnCents: number, rate = DEMO_RATE): number => roundHalfUp(mxnCents / rate);
export const feeCents = (usdcCents: number): number => roundHalfUp((usdcCents * SEND_FEE_BPS) / 10_000);

const group = (int: string): string => int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** 125000 → "1,250.00"; negativos con «−» (U+2212). */
export function formatCents(cents: number): string {
  const abs = Math.abs(cents);
  return `${cents < 0 ? "−" : ""}${group(String(Math.floor(abs / 100)))}.${String(abs % 100).padStart(2, "0")}`;
}
export const formatUsdc = (cents: number): string => `${formatCents(cents)} USDC`;
export const formatMxn = (cents: number): string => `$${formatCents(cents)} MXN`;
export const formatRate = (rate: number): string => `1 USDC = $${rate.toFixed(2)} MXN`;

/** "1,250.5" | "1250" | "0.05" → centavos; null si no es un monto (comas = miles; punto = decimal; máx. 2 decimales). */
export function parseAmount(input: string): number | null {
  const s = input.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  const [i, d = ""] = s.split(".");
  return Number(i) * 100 + Number((d + "00").slice(0, 2));
}

export type QuoteCheck = { ok: true; quote: Omit<Quote, "id" | "expiresAt"> } | { ok: false; code: RelayerErrorCode };

/** Cotización pura: comisión dentro del monto; el mínimo se mide en MXN recibidos; `balanceUsdcCents` para el saldo. */
export function quoteFor(amountUsdcCents: number, balanceUsdcCents: number, rate = DEMO_RATE): QuoteCheck {
  if (!Number.isInteger(amountUsdcCents) || amountUsdcCents <= 0) return { ok: false, code: "below_minimum" };
  const feeUsdcCents = feeCents(amountUsdcCents);
  const netUsdcCents = amountUsdcCents - feeUsdcCents;
  const amountMxnCents = usdcToMxnCents(netUsdcCents, rate);
  if (amountMxnCents < MIN_SEND_MXN_CENTS) return { ok: false, code: "below_minimum" };
  if (amountUsdcCents > balanceUsdcCents) return { ok: false, code: "insufficient_balance" };
  return { ok: true, quote: { amountUsdcCents, feeUsdcCents, netUsdcCents, amountMxnCents, rate } };
}
