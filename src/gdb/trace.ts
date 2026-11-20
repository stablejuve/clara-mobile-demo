import type { TraceKey } from "./endpoints";

// Registro de llamadas para el modo explicativo. El store reporta cada acción (y lo que llega solo: webhooks); la UI
// (`TraceOverlay`) se suscribe y muestra un chip por llamada. Puro.

/** `lines`: la llamada y su respuesta para este caso concreto (opcional). */
export type TraceHit = { id: number; key: TraceKey; at: number; lines?: readonly string[] };
type Listener = () => void;

export function createTracer(max = 3) {
  let hits: readonly TraceHit[] = [];
  let seq = 0;
  let enabled = true;
  const listeners = new Set<Listener>();
  const set = (next: readonly TraceHit[]) => { hits = next; for (const l of listeners) l(); };
  return {
    /** Registra una llamada (si el modo está encendido) y devuelve su id. Sólo se conservan las últimas `max`. */
    hit(key: TraceKey, lines?: readonly string[], at = Date.now()): number | null {
      if (!enabled) return null;
      const id = ++seq;
      // Una cotización que se repite al teclear reemplaza a la anterior en vez de apilarse.
      const prev = lines && hits.length > 0 && hits[hits.length - 1].key === key ? hits.slice(0, -1) : hits;
      set([...prev, { id, key, at, lines }].slice(-max));
      return id;
    },
    dismiss(id: number): void { set(hits.filter((h) => h.id !== id)); },
    clear(): void { set([]); },
    getHits: (): readonly TraceHit[] => hits,
    isEnabled: (): boolean => enabled,
    setEnabled(v: boolean): void { enabled = v; set(v ? hits : []); },
    subscribe(l: Listener): () => void { listeners.add(l); return () => { listeners.delete(l); }; },
  };
}
export type Tracer = ReturnType<typeof createTracer>;

/** El de la app: el store le reporta y Perfil (o la barra de la vista web) lo enciende o apaga. */
export const tracer = createTracer();
