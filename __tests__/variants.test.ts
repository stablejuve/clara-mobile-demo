import { contrast } from "../src/ui/contrast";
import { DARK, LIGHT, PALETTES } from "../src/ui/theme";
import { btnVariants, tone } from "../src/ui/variants";

test.each(["light", "dark"] as const)("cada variante de botón se lee (%s)", (scheme) => {
  const c = PALETTES[scheme];
  const v = btnVariants(c);
  expect(v.primary).toEqual({ bg: c.btnPrimary, bd: c.btnPrimary, fg: c.onBtnPrimary, w: 600 });
  expect(v.brand).toEqual({ bg: c.brand, bd: c.brand, fg: c.onBrand, w: 600 });
  expect(v.control).toEqual({ bg: c.sub, bd: c.sub, fg: c.inkStrong, w: 600 });
  expect(v.outline).toEqual({ bg: "transparent", bd: c.ink15, fg: c.inkStrong, w: 600 });
  expect(v.ghost.fg).toBe(c.ink72);
  expect(v.danger.fg).toBe(c.error);
  for (const k of ["primary", "brand", "control"] as const) expect(contrast(v[k].fg, v[k].bg)).toBeGreaterThanOrEqual(4.5);
  for (const k of ["outline", "ghost"] as const) expect(contrast(v[k].fg, c.page)).toBeGreaterThanOrEqual(4.5);
});

test("tone: borde al 35 %, fondo al 12 %, texto del color; neutral usa sub/ink", () => {
  expect(tone(LIGHT, "warning")).toEqual({ bd: "rgba(181,113,0,0.35)", bg: "rgba(181,113,0,0.12)", fg: "#B57100" });
  expect(tone(DARK, "error")).toEqual({ bd: "rgba(216,123,146,0.35)", bg: "rgba(216,123,146,0.12)", fg: "#D87B92" });
  expect(tone(DARK, "neutral")).toEqual({ bd: DARK.ink15, bg: DARK.sub, fg: DARK.ink72 });
});
