// Deep links de desarrollo de la demo (capturas y recorridos automatizados sin tocar el simulador). Puro.
export const SCHEME = "relayermobiledemo";

export type DeepLink = { kind: "open"; screen: string; scrollEnd: boolean } | { kind: "seed"; to: "active" } | { kind: "run"; action: string };

/** `relayermobiledemo://demo/open/<pantalla>`, `…/demo/run/<acción>` y `…/demo/seed/active`. Fuera de desarrollo, nada. */
export function parseDeepLink(url: string | null | undefined, dev = false): DeepLink | null {
  if (!url || !dev) return null;
  if (/^relayermobiledemo:\/\/demo\/seed\/active\/?$/.test(url)) return { kind: "seed", to: "active" };
  const run = /^relayermobiledemo:\/\/demo\/run\/([a-zA-Z0-9]+)\/?$/.exec(url);
  if (run) return { kind: "run", action: run[1] };
  const open = /^relayermobiledemo:\/\/demo\/open\/([a-zA-Z]+)\/?(\?.*)?$/.exec(url);
  return open ? { kind: "open", screen: open[1], scrollEnd: /[?&]scrollEnd=1/.test(open[2] ?? "") } : null;
}
