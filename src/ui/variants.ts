import { alpha, type Palette } from "./theme";

// Variantes de Btn y tonos de aviso (puros, testeados): reciben la paleta porque dependen del esquema.
export type BtnVariant = "primary" | "brand" | "control" | "outline" | "ghost" | "danger";
export type Variant = { bg: string; bd: string; fg: string; w: number };

export function btnVariants(c: Palette): Record<BtnVariant, Variant> {
  return {
    primary: { bg: c.btnPrimary, bd: c.btnPrimary, fg: c.onBtnPrimary, w: 600 },
    brand: { bg: c.brand, bd: c.brand, fg: c.onBrand, w: 600 },
    control: { bg: c.sub, bd: c.sub, fg: c.inkStrong, w: 600 },
    outline: { bg: "transparent", bd: c.ink15, fg: c.inkStrong, w: 600 },
    ghost: { bg: "transparent", bd: "transparent", fg: c.ink72, w: 600 },
    danger: { bg: alpha(c.error, 0.12), bd: "transparent", fg: c.error, w: 600 },
  };
}

export type ToneName = "info" | "success" | "warning" | "error" | "neutral";
export type Tone = { bd: string; bg: string; fg: string };

/** Tarjetas de estado y avisos: borde al 35 %, fondo al 12 %, texto del color semántico. */
export function tone(c: Palette, name: ToneName): Tone {
  if (name === "neutral") return { bd: c.ink15, bg: c.sub, fg: c.ink72 };
  const base = c[name];
  return { bd: alpha(base, 0.35), bg: alpha(base, 0.12), fg: base };
}
