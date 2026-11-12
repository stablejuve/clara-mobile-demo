import { ENDPOINTS, type TraceKey } from "./endpoints";

// Registro de llamadas para el modo explicativo. `withTrace` envuelve el API sin tocar pantallas; el mock reporta lo que llega
// solo (webhooks). La UI (src/ui/TraceOverlay.tsx) se suscribe y muestra un chip por llamada.

export type TraceHit = { id: number; key: TraceKey; at: number; state: "pending" | "ok" | "error" };
type Listener = (hits: readonly TraceHit[]) => void;

export function createTracer(max = 3) {
  let hits: readonly TraceHit[] = [];
  let seq = 0;
  let enabled = true;
  const listeners = new Set<Listener>();
  const emit = () => { for (const l of listeners) l(hits); };
  const set = (next: readonly TraceHit[]) => { hits = next; emit(); };
  return {
    /** Registra una llamada; devuelve su id (para marcarla ok/error). Las lecturas `quiet` no sacan chip. */
    hit(key: TraceKey, state: TraceHit["state"] = "ok", at = Date.now()): number | null {
      if (!enabled || ENDPOINTS[key].quiet) return null;
      const id = ++seq;
      set([...hits, { id, key, at, state }].slice(-max));
      return id;
    },
    settle(id: number | null, state: "ok" | "error") { if (id !== null) set(hits.map((h) => (h.id === id ? { ...h, state } : h))); },
    dismiss(id: number) { set(hits.filter((h) => h.id !== id)); },
    clear() { set([]); },
    get hits() { return hits; },
    get enabled() { return enabled; },
    setEnabled(v: boolean) { enabled = v; if (!v) hits = []; emit(); },
    subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; },
  };
}
export type Tracer = ReturnType<typeof createTracer>;

/** El de la app (App.tsx lo conecta al API y al mock; Perfil lo enciende o apaga). */
export const tracer = createTracer();
export const TRACE_KEY = "relayer.trace.v1";

/** Envuelve cada método del API que esté en el catálogo: chip «pending» al llamar, «ok»/«error» al resolver. */
export function withTrace<T extends object>(api: T, tracer: Tracer): T {
  return new Proxy(api, {
    get(target, prop, receiver) {
      const v = Reflect.get(target, prop, receiver);
      if (typeof v !== "function" || typeof prop !== "string" || !(prop in ENDPOINTS)) return v;
      const key = prop as TraceKey;
      return (...args: unknown[]) => {
        const id = tracer.hit(key, "pending");
        const out = (v as (...a: unknown[]) => unknown).apply(target, args);
        if (out instanceof Promise) return out.then((r) => { tracer.settle(id, "ok"); return r; }, (e: unknown) => { tracer.settle(id, "error"); throw e; });
        tracer.settle(id, "ok");
        return out;
      };
    },
  });
}
