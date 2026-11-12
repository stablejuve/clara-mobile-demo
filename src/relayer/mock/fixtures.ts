import { mxnToUsdcCents } from "../money";
import type { Beneficiary, KycLinks, Movement } from "../types";

// Datos fijos de la demo (D2: empleada en México). Ningún valor es real; las URLs son ilustrativas.
export const DEMO_USER = { name: "Ana Torres", email: "ana.torres@acme.example", country: "MX", locale: "es-MX" } as const;
export const EMPLOYER = { name: "Acme", short: "Acme", legalName: "Acme S.A. de C.V." } as const;
export const DEMO_ADDRESS = "0x7A3f9C2e4B1d8E6f0A5c3D7b9E2f4A6c8B0d1E3f";
/** Cuentas guardadas con las que arranca la demo (CLABEs con dígito de control válido, ninguna real). */
export const DEMO_BENEFICIARIES: readonly Omit<Beneficiary, "createdAt">[] = [
  { id: "ben_self", owner: "self", name: "Ana Lucía Torres Medina", alias: "Mi cuenta", email: "", rfc: "TOMA940318KJ3", address: null,
    clabe: "012180001234567899", bankName: "BBVA México", status: "verified" },
  { id: "ben_mama", owner: "individual", name: "María Elena Medina Ruiz", alias: "Mamá", email: "maria.medina@correo.example", rfc: "",
    address: { street: "Calle Pino 45", city: "Puebla", state: "Puebla", postalCode: "72000" }, clabe: "072180004310562470", bankName: "Banorte", status: "verified" },
  { id: "ben_renta", owner: "individual", name: "Jorge Ruiz Salgado", alias: "Renta depa", email: "", rfc: "",
    address: { street: "Av. Universidad 1200", city: "Benito Juárez", state: "Ciudad de México", postalCode: "03100" }, clabe: "014180659229718401", bankName: "Santander", status: "verified" },
  { id: "ben_gym", owner: "business", name: "Gimnasio Fortis S.A. de C.V.", alias: "Gimnasio", email: "pagos@fortis.example", rfc: "GFO180512AB1",
    address: { street: "Insurgentes Sur 1458", city: "Benito Juárez", state: "Ciudad de México", postalCode: "03230" }, clabe: "646180158300125536", bankName: "STP", status: "verified" },
];
/** Compras con tarjeta de la demo (MXN; la tarjeta cobra en USD y descuenta USDC al tipo de la demo). */
export const CARD_PURCHASES: readonly { merchant: string; category: string; amountMxnCents: number }[] = [
  { merchant: "OXXO", category: "Tienda", amountMxnCents: 86_50 },
  { merchant: "Uber", category: "Transporte", amountMxnCents: 189_00 },
  { merchant: "Spotify", category: "Suscripción", amountMxnCents: 115_00 },
  { merchant: "Walmart", category: "Súper", amountMxnCents: 642_30 },
  { merchant: "Starbucks", category: "Café", amountMxnCents: 89_00 },
];
export const DEMO_CARD = { last4: "4821", expiry: "11/30", number: "4915 6637 0003 4821", cvv: "317" } as const;
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
