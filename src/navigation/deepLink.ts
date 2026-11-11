// Deep link de regreso del KYC (spec «Navegación»): en la demo lo dispara la pantalla simulada de Persona; en la fase real,
// el `redirect_uri` del KYC link de Bridge. Puro.
export const SCHEME = "relayermobiledemo";
export const KYC_RETURN_URL = `${SCHEME}://recibo/kyc-return`;

export type DeepLink = { kind: "kyc-return" };

export function parseDeepLink(url: string | null | undefined): DeepLink | null {
  if (!url) return null;
  const m = /^relayermobiledemo:\/\/recibo\/([a-z-]+)\/?(\?.*)?$/.exec(url);
  if (!m) return null;
  return m[1] === "kyc-return" ? { kind: "kyc-return" } : null;
}
