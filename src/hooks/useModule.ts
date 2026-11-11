import { useEffect, useRef, useState } from "react";
import type { MockApi } from "../relayer/mock/mockApi";
import type { ModuleSnapshot, Movement } from "../relayer/types";

/** Lo que las pantallas ven del módulo: la foto del mock (estado, movimientos, eventos) y el api para actuar. */
export type Module = ModuleSnapshot & { api: MockApi; active: boolean };

/** Se suscribe al mock; cada depósito nuevo que aparece en la foto dispara `onDeposit` (notificación local). */
export function useModule(api: MockApi, onDeposit: (m: Movement) => void): Module {
  const [snap, setSnap] = useState<ModuleSnapshot>(() => api.getSnapshot());
  const onDepositRef = useRef(onDeposit);
  onDepositRef.current = onDeposit;
  const seen = useRef<Set<string>>(new Set(api.getSnapshot().movements.map((m) => m.id)));
  useEffect(() => api.subscribe((s) => {
    setSnap(s);
    if (s.movements.length === 0) seen.current.clear(); // reset / desactivar: los ids vuelven a empezar
    for (const m of s.movements) {
      if (m.kind !== "deposit" || seen.current.has(m.id)) continue;
      seen.current.add(m.id);
      onDepositRef.current(m);
    }
  }), [api]);
  return { ...snap, api, active: snap.state.module === "active" };
}
