import type { TextStyle } from "react-native";

// Tokens de Relayer (relayer-core apps/web/app/tokens.css, paleta v5 Carbon/Petrol/Turquoise/Sage/Peach/Coral), spec D4.
// Dos paletas con los mismos nombres semánticos: Paper (light) y Carbon (dark). Las pantallas leen `useTheme().c`; aquí viven
// los únicos hex de la UI. Reglas: `live` es un punto, nunca texto; `ink40` sólo placeholders y deshabilitados.

export type Scheme = "light" | "dark";
export type ThemeOverride = Scheme | "system";

/** Identidad v5, independiente del esquema (arte de tarjeta, marca, puntos). */
export const RL = { carbon: "#121819", petrol: "#00594F", turq: "#72BDB1", sage: "#B5C8AA", peach: "#F0B395", coral: "#D87968" } as const;

/** Forma: Relayer es de esquinas rectas (2 px); el pill sólo para puntos y avatares. */
export const RADIUS = { card: 2, control: 2, pill: 9999 } as const;

export type Palette = {
  page: string; canvas: string; card: string; elev: string; input: string; sub: string;
  inkStrong: string; inkBody: string; ink72: string; ink55: string; ink40: string; ink25: string; ink15: string; ink08: string; ink04: string;
  brand: string; brandH: string; onBrand: string; live: string; settled: string;
  info: string; success: string; warning: string; error: string;
  backdrop: string;
  btnPrimary: string; btnPrimaryH: string; onBtnPrimary: string;
};

export const LIGHT: Palette = {
  page: "#FBFBFA", canvas: "#F5F5F4", card: "#FFFFFF", elev: "#FFFFFF", input: "#FFFFFF", sub: "#F1F1F0",
  inkStrong: "#121819", inkBody: "#24292B",
  ink72: "rgba(20,25,27,0.72)", ink55: "rgba(20,25,27,0.55)", ink40: "rgba(20,25,27,0.40)", ink25: "rgba(20,25,27,0.24)",
  ink15: "rgba(20,25,27,0.12)", ink08: "rgba(20,25,27,0.07)", ink04: "rgba(20,25,27,0.035)",
  brand: "#00594F", brandH: "#00473F", onBrand: "#FBFBF9", live: "#00C4CC", settled: "#3DA083",
  info: "#3D5A7B", success: "#2F8E5C", warning: "#B57100", error: "#8B2940",
  backdrop: "rgba(20,25,27,0.32)",
  btnPrimary: "#121819", btnPrimaryH: "#2A3536", onBtnPrimary: "#FFFFFF",
};

export const DARK: Palette = {
  page: "#121819", canvas: "#0D1213", card: "#1A2223", elev: "#222B2C", input: "#121819", sub: "#0F1516",
  inkStrong: "#FFFFFF", inkBody: "#E6ECEB",
  ink72: "rgba(230,236,235,0.74)", ink55: "rgba(230,236,235,0.58)", ink40: "rgba(230,236,235,0.40)", ink25: "rgba(230,236,235,0.24)",
  ink15: "rgba(230,236,235,0.12)", ink08: "rgba(230,236,235,0.07)", ink04: "rgba(230,236,235,0.04)",
  brand: "#72BDB1", brandH: "#8CCBC1", onBrand: "#121819", live: "#33D6DD", settled: "#66C8A8",
  info: "#8FA8C4", success: "#66C8A8", warning: "#E8B25C", error: "#D87968",
  backdrop: "rgba(0,0,0,0.65)",
  btnPrimary: "#72BDB1", btnPrimaryH: "#8FCCC2", onBtnPrimary: "#121819",
};

export const PALETTES: Record<Scheme, Palette> = { light: LIGHT, dark: DARK };

/** Esquema efectivo: el override manual gana; "system" sigue al teléfono (sin dato o "unspecified" → light). */
export function resolveScheme(override: ThemeOverride, system: string | null | undefined): Scheme {
  if (override !== "system") return override;
  return system === "dark" ? "dark" : "light";
}

/** "#RRGGBB" → "rgba(r,g,b,a)": tintes de fondo de avisos, chips y tarjetas (warning al 12 %, etc.). */
export function alpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}

// Familias cargadas en App.tsx: Instrument Sans (cuerpo) y JetBrains Mono (cifras, etiquetas). Archivo (display web) entra después.
export const F = {
  r: "InstrumentSans_400Regular",
  m: "InstrumentSans_500Medium",
  sb: "InstrumentSans_600SemiBold",
  b: "InstrumentSans_700Bold",
  mono: "JetBrainsMono_400Regular",
  monoM: "JetBrainsMono_500Medium",
  monoB: "JetBrainsMono_700Bold",
} as const;

export type FontKind = "mono";

export function fam(weight: number, kind?: FontKind): string {
  if (kind === "mono") return weight >= 700 ? F.monoB : weight >= 500 ? F.monoM : F.mono;
  if (weight >= 700) return F.b;
  if (weight >= 600) return F.sb;
  if (weight >= 500) return F.m;
  return F.r;
}

export type TypeOpts = { lh?: number; ls?: number; mono?: boolean; color?: string };

/** `font: <weight> <size>/<lh> <family>`; `ls` en em → px. Sin `color` no pone color (lo pone `T` con la paleta). */
export function textStyle(weight: number, size: number, { lh, ls = 0, mono = false, color }: TypeOpts = {}): TextStyle {
  const style: TextStyle = { fontFamily: fam(weight, mono ? "mono" : undefined), fontSize: size };
  if (lh) style.lineHeight = Math.round(size * lh);
  if (ls) style.letterSpacing = +(size * ls).toFixed(2);
  if (color) style.color = color;
  return style;
}
