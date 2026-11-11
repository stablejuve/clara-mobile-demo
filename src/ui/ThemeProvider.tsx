import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { asyncStorageKv } from "../storage/asyncKv";
import { loadThemeOverride, saveThemeOverride } from "../storage/theme";
import { type Palette, PALETTES, resolveScheme, type Scheme, type ThemeOverride } from "./theme";

export type Theme = { scheme: Scheme; c: Palette; override: ThemeOverride; setOverride: (o: ThemeOverride) => void };

const Ctx = createContext<Theme | null>(null);

/** Esquema del sistema + override manual persistido (Perfil → Apariencia). Envuelve toda la app (App.tsx). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [override, setOverrideState] = useState<ThemeOverride>("system");
  useEffect(() => {
    let stale = false;
    void loadThemeOverride(asyncStorageKv).then((o) => { if (!stale) setOverrideState(o); });
    return () => { stale = true; };
  }, []);
  const setOverride = useCallback((o: ThemeOverride) => { setOverrideState(o); void saveThemeOverride(asyncStorageKv, o); }, []);
  const scheme = resolveScheme(override, system);
  const value = useMemo<Theme>(() => ({ scheme, c: PALETTES[scheme], override, setOverride }), [scheme, override, setOverride]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): Theme {
  const v = useContext(Ctx);
  if (v === null) throw new Error("useTheme fuera de ThemeProvider");
  return v;
}
