import { useEffect, useSyncExternalStore } from "react";
import { asyncStorageKv } from "../storage/asyncKv";
import { TRACE_KEY, tracer } from "../relayer/trace";

/** Carga una vez la preferencia del modo explicativo (default: encendido para la demo). */
export function useTraceBoot() {
  useEffect(() => { void asyncStorageKv.getItem(TRACE_KEY).then((v) => { if (v === "0") tracer.setEnabled(false); }).catch(() => {}); }, []);
}

/** Interruptor de Perfil. */
export function useTraceEnabled(): [boolean, (v: boolean) => void] {
  const on = useSyncExternalStore(tracer.subscribe, () => tracer.enabled);
  return [on, (v) => { tracer.setEnabled(v); void asyncStorageKv.setItem(TRACE_KEY, v ? "1" : "0").catch(() => {}); }];
}
