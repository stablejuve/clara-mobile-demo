import { Platform, type TextStyle } from "react-native";

// Estructura de tokens de Relayer Wallets v4 (diseño «Recibo Minimal») con los colores de la interfaz de Betterfly: crema + verde casi
// negro en claro, verde casi negro + verde brillante en oscuro. Paper (light) y Ash (dark) con los
// mismos nombres semánticos. Las pantallas leen `useTheme().c`; aquí viven los únicos hex de la UI.

export type Scheme = "light" | "dark";
export type ThemeOverride = Scheme | "system";

/** Identidad fija, independiente del esquema (arte de tarjeta, promo, CTA de la anfitriona). Valores de la app de Betterfly:
 *  `petrol` = verde de marca legible, `petrolDeep` = verde casi negro de sus fondos, `cream` = su crema de página. */
export const RL = { petrol: "#066C32", petrolDeep: "#0F1C14", cream: "#F7F5EB", carbon: "#0F1C14", frost: "rgba(247,245,235,0.42)" } as const;

/** Acentos de la interfaz de Betterfly (muestreados de las capturas de su app en el App Store): verde brillante de las
 *  Betterflies y el nivel, y los colores de sus etiquetas (lima «CAMINATA», rosa «UNIDO», cian «NUEVO», menta «BIENESTAR»). */
export const BF = { green: "#19F578", greenDeep: "#042914", forest: "#0B3B1F", night: "#020F08", lime: "#E6FC13", pink: "#FFAAFF", cyan: "#7EF9E7", mint: "#C0FBDC", ink: "#0F1C14" } as const;

/** Radios v4: tarjetas 6, pill para botones, switches y avatares. */
export const RADIUS = { card: 6, control: 6, sheet: 12, pill: 9999 } as const;

export type Palette = {
  page: string; /** Panel blanco de contenido sobre la cabecera crema (como en la app de Betterfly). */ sheet: string; canvas: string; card: string; elev: string; input: string; sub: string;
  inkStrong: string; inkBody: string; ink72: string; ink55: string; ink40: string; ink25: string; ink15: string; ink08: string; ink04: string;
  brand: string; brandH: string; onBrand: string;
  /** Botón principal: carbón en claro, beige de marca en oscuro. */
  cta: string; onCta: string; live: string; settled: string;
  info: string; success: string; warning: string; error: string;
  backdrop: string;
  btnPrimary: string; btnPrimaryH: string; onBtnPrimary: string;
};

export const LIGHT: Palette = {
  page: "#F7F5EB", sheet: "#FFFFFF", canvas: "#EFECDF", card: "#FFFFFF", elev: "#FFFFFF", input: "#FFFFFF", sub: "#EDEADD",
  inkStrong: "#0F1C14", inkBody: "#1B2B21",
  ink72: "rgba(15,28,20,0.72)", ink55: "rgba(15,28,20,0.58)", ink40: "rgba(15,28,20,0.40)", ink25: "rgba(15,28,20,0.25)",
  ink15: "rgba(15,28,20,0.12)", ink08: "rgba(15,28,20,0.07)", ink04: "rgba(15,28,20,0.04)",
  brand: "#066C32", brandH: "#034A22", onBrand: "#FFFFFF", cta: "#0F1C14", onCta: "#FFFFFF", live: "#19F578", settled: "#098F43",
  info: "#3D5A7B", success: "#098F43", warning: "#A66700", error: "#8B2940",
  backdrop: "rgba(15,28,20,0.40)",
  btnPrimary: "#0F1C14", btnPrimaryH: "#1B2B21", onBtnPrimary: "#FFFFFF",
};

export const DARK: Palette = {
  page: "#0F1C14", sheet: "#14231A", canvas: "#0B150F", card: "#1A2B20", elev: "#203327", input: "#0C1710", sub: "#0A130D",
  inkStrong: "#FFFFFF", inkBody: "#F7F5EB",
  ink72: "rgba(247,245,235,0.72)", ink55: "rgba(247,245,235,0.55)", ink40: "rgba(247,245,235,0.40)", ink25: "rgba(247,245,235,0.25)",
  ink15: "rgba(247,245,235,0.10)", ink08: "rgba(247,245,235,0.06)", ink04: "rgba(247,245,235,0.04)",
  brand: "#19F578", brandH: "#4CF89B", onBrand: "#0F1C14", cta: "#19F578", onCta: "#0F1C14", live: "#19F578", settled: "#4CF89B",
  info: "#8FA8C4", success: "#4CF89B", warning: "#E8B25C", error: "#D87B92",
  backdrop: "rgba(0,0,0,0.65)",
  btnPrimary: "#19F578", btnPrimaryH: "#4CF89B", onBtnPrimary: "#0F1C14",
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
  /** Titulares condensados como los de la app de Betterfly (Alumni Sans). */
  display: "AlumniSans_700Bold",
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
