import { useEffect, useRef, useState } from "react";
import type { RelayerModuleApi } from "../relayer/api";

export type LiveRate = { rate: number; updatedAt: number; dir: "up" | "down" | null };

/** Tipo de cambio en vivo (USD→MXN): lo lee del API cada `everyMs` y marca si subió o bajó. */
export function useRate(api: Pick<RelayerModuleApi, "getRate">, fallback: number, everyMs = 3000): LiveRate {
  const [r, setR] = useState<LiveRate>({ rate: fallback, updatedAt: Date.now(), dir: null });
  const last = useRef<number | null>(null);
  useEffect(() => {
    let alive = true;
    const read = () => {
      void api.getRate().then(({ rate, updatedAt }) => {
        if (!alive) return;
        const prev = last.current;
        last.current = rate;
        setR((cur) => (cur.rate === rate && prev !== null ? cur : { rate, updatedAt, dir: prev === null || prev === rate ? cur.dir : rate > prev ? "up" : "down" }));
      }).catch(() => {});
    };
    read();
    const id = setInterval(read, everyMs);
    return () => { alive = false; clearInterval(id); };
  }, [api, everyMs]);
  return r;
}
