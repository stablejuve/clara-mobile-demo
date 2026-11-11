import { mxnToUsdcCents } from "../money";
import type { KycLinks, Movement } from "../types";

// Datos fijos de la demo (D2: empleada en México). Ningún valor es real; las URLs son ilustrativas.
export const DEMO_USER = { name: "Ana Torres", email: "ana.torres@acme.example", country: "MX", locale: "es-MX" } as const;
export const EMPLOYER = { name: "Acme Beneficios", legalName: "Acme Beneficios S.A. de C.V." } as const;
export const DEMO_ADDRESS = "0x7A3f9C2e4B1d8E6f0A5c3D7b9E2f4A6c8B0d1E3f";
export const DEMO_CARD = { last4: "4821", expiry: "09/29", number: "4000 1234 5678 4821", cvv: "317" } as const;
export const KYC_LINKS: KycLinks = {
  tosLink: "https://bridge.example/accept-terms-of-service?session_token=demo",
  kycLink: "https://bridge.example/kyc?session_token=demo&redirect_uri=relayermobiledemo%3A%2F%2Frecibo%2Fkyc-return",
  redirectUri: "relayermobiledemo://recibo/kyc-return",
};
/** «Simular pago de Acme» con los valores por defecto del panel y el primer depósito tras activar. */
export const DEFAULT_DEPOSIT = { amountMxnCents: 8_500_00, concept: "Nómina · 2.ª quincena", reference: "ACME-NOM-2026-11B" } as const;

/** Depósito de la empresa: MXN → USDC al tipo de la demo, hash pseudoaleatorio derivado del id. */
export function employerDeposit(id: string, at: number, input: { amountMxnCents: number; concept: string; reference: string }): Movement {
  const hex = Array.from({ length: 64 }, (_, i) => "0123456789abcdef"[(id.charCodeAt(i % id.length) * (i + 7)) % 16]).join("");
  return {
    id, kind: "deposit", status: "completed", at,
    amountUsdcCents: mxnToUsdcCents(input.amountMxnCents), amountMxnCents: input.amountMxnCents,
    fromLabel: EMPLOYER.name, concept: input.concept, reference: input.reference, txHash: `0x${hex}`,
  };
}
