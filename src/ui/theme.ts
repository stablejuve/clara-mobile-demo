import { Platform, type TextStyle } from "react-native";

// Tokens Relayer Wallets v4 (diseño «Recibo Minimal»: tokens.css + spacing_and_effects.css). Paper (light) y Ash (dark) con los
// mismos nombres semánticos. Las pantallas leen `useTheme().c`; aquí viven los únicos hex de la UI.

export type Scheme = "light" | "dark";
export type ThemeOverride = Scheme | "system";

/** Identidad fija, independiente del esquema (arte de tarjeta, isotipo, CTA de la anfitriona). */
export const RL = { petrol: "#015F51", petrolDeep: "#012821", cream: "#F4EFE0", carbon: "#121819", frost: "rgba(236,230,214,0.42)" } as const;

/** Radios v4: tarjetas 6, pill para botones, switches y avatares. */
export const RADIUS = { card: 6, control: 6, sheet: 12, pill: 9999 } as const;

export type Palette = {
  page: string; canvas: string; card: string; elev: string; input: string; sub: string;
  inkStrong: string; inkBody: string; ink72: string; ink55: string; ink40: string; ink25: string; ink15: string; ink08: string; ink04: string;
  brand: string; brandH: string; onBrand: string;
  /** Botón principal: carbón en claro, beige de marca en oscuro. */
  cta: string; onCta: string; live: string; settled: string;
  info: string; success: string; warning: string; error: string;
  backdrop: string;
  btnPrimary: string; btnPrimaryH: string; onBtnPrimary: string;
};

export const LIGHT: Palette = {
  page: "#F6F6F4", canvas: "#EFEFEC", card: "#FFFFFF", elev: "#FFFFFF", input: "#FFFFFF", sub: "#ECECE8",
  inkStrong: "#012821", inkBody: "#0F3D34",
  ink72: "rgba(15,61,52,0.72)", ink55: "rgba(15,61,52,0.55)", ink40: "rgba(15,61,52,0.40)", ink25: "rgba(15,61,52,0.25)",
  ink15: "rgba(15,61,52,0.12)", ink08: "rgba(15,61,52,0.07)", ink04: "rgba(15,61,52,0.04)",
  brand: "#015F51", brandH: "#013E36", onBrand: "#F4EFE0", cta: "#121819", onCta: "#FFFFFF", live: "#00C4CC", settled: "#3DA083",
  info: "#3D5A7B", success: "#2F8E5C", warning: "#B57100", error: "#8B2940",
  backdrop: "rgba(15,61,52,0.32)",
  btnPrimary: "#015F51", btnPrimaryH: "#013E36", onBtnPrimary: "#F4EFE0",
};

export const DARK: Palette = {
  page: "#1A1A19", canvas: "#161614", card: "#272725", elev: "#2F2F2C", input: "#181816", sub: "#141413",
  inkStrong: "#FFFFFF", inkBody: "#EDE7D8",
  ink72: "rgba(237,231,216,0.72)", ink55: "rgba(237,231,216,0.55)", ink40: "rgba(237,231,216,0.40)", ink25: "rgba(237,231,216,0.25)",
  ink15: "rgba(237,231,216,0.10)", ink08: "rgba(237,231,216,0.06)", ink04: "rgba(237,231,216,0.04)",
  brand: "#ECE6D6", brandH: "#F4F0E8", onBrand: "#060606", cta: "#ECE6D6", onCta: "#060606", live: "#33D6DD", settled: "#66C8A8",
  info: "#8FA8C4", success: "#66C8A8", warning: "#E8B25C", error: "#D87B92",
  backdrop: "rgba(0,0,0,0.65)",
  btnPrimary: "#ECE6D6", btnPrimaryH: "#F4F0E8", onBtnPrimary: "#060606",
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

// Familias: Archivo (sans y display, cargada en App.tsx) y la mono del sistema (ui-monospace → Menlo en iOS).
const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "ui-monospace, SFMono-Regular, Menlo, monospace" }) as string;
export const F = {
  r: "Archivo_400Regular",
  m: "Archivo_500Medium",
  sb: "Archivo_600SemiBold",
  b: "Archivo_700Bold",
  xb: "Archivo_800ExtraBold_Italic",
  mono: MONO,
  monoM: MONO,
  monoB: MONO,
} as const;

export type FontKind = "mono";

export function fam(weight: number, kind?: FontKind): string {
  if (kind === "mono") return F.mono;
  if (weight >= 700) return F.b;
  if (weight >= 600) return F.sb;
  if (weight >= 500) return F.m;
  return F.r;
}

export type TypeOpts = { lh?: number; ls?: number; mono?: boolean; color?: string };

/** `font: <weight> <size>/<lh> <family>`; `ls` en em → px. Sin `color` no pone color (lo pone `T` con la paleta). */
export function textStyle(weight: number, size: number, { lh, ls = 0, mono = false, color }: TypeOpts = {}): TextStyle {
  const style: TextStyle = { fontFamily: fam(weight, mono ? "mono" : undefined), fontSize: size };
  if (mono && weight >= 600) style.fontWeight = "700"; // la mono del sistema sólo trae regular y bold
  if (lh) style.lineHeight = Math.round(size * lh);
  if (ls) style.letterSpacing = +(size * ls).toFixed(2);
  if (color) style.color = color;
  return style;
}
