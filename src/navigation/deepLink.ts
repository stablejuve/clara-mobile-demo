// Deep link de regreso del KYC (spec «Navegación»): en la demo lo dispara la pantalla simulada de Persona; en la fase real,
// el `redirect_uri` del KYC link de Bridge. Puro.
export const SCHEME = "relayermobiledemo";
export const KYC_RETURN_URL = `${SCHEME}://recibo/kyc-return`;

export type DeepLink = { kind: "kyc-return" } | { kind: "open"; screen: string; scrollEnd: boolean } | { kind: "seed"; to: "active" };

/** `relayermobiledemo://recibo/kyc-return` (producto) y, solo en desarrollo, `relayermobiledemo://demo/open/<screen>`
 *  para abrir una pantalla sin tocar el simulador (capturas, walkthrough automatizado). */
export function parseDeepLink(url: string | null | undefined, dev = false): DeepLink | null {
  if (!url) return null;
  if (/^relayermobiledemo:\/\/demo\/seed\/active\/?$/.test(url)) return dev ? { kind: "seed", to: "active" } : null;
  const open = /^relayermobiledemo:\/\/demo\/open\/([a-zA-Z]+)\/?(\?.*)?$/.exec(url);
  if (open) return dev ? { kind: "open", screen: open[1], scrollEnd: /[?&]scrollEnd=1/.test(open[2] ?? "") } : null;
  const m = /^relayermobiledemo:\/\/recibo\/([a-z-]+)\/?(\?.*)?$/.exec(url);
  if (!m) return null;
  return m[1] === "kyc-return" ? { kind: "kyc-return" } : null;
}
