import { useEffect, useRef, useState } from "react";

const easeOutQuart = (p: number) => 1 - Math.pow(1 - p, 4);

/** Número que corre hacia `to` en `ms` con ease-out cuártico (el saldo al llegar la nómina o al transferir). */
export function useTween(to: number, ms = 1100, delay = 450): number {
  const [shown, setShown] = useState(to);
  const from = useRef(to);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const start = from.current;
    if (start === to) return;
    let t0 = 0;
    const timer = setTimeout(() => {
      const step = (now: number) => {
        if (!t0) t0 = now;
        const p = Math.min(1, (now - t0) / ms);
        const v = Math.round(start + (to - start) * easeOutQuart(p));
        from.current = v;
        setShown(v);
        if (p < 1) raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    }, delay);
    return () => { clearTimeout(timer); if (raf.current !== null) cancelAnimationFrame(raf.current); };
  }, [to, ms, delay]);
  return shown;
}
