import { useEffect, useState } from "react";

/** Tick de `everyMs` para cuentas regresivas (vigencia de la cotización). */
export function useNow(everyMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), everyMs); return () => clearInterval(t); }, [everyMs]);
  return now;
}
