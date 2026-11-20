import { contrast } from "../src/ui/contrast";
import { alpha, DARK, fam, LIGHT, PALETTES, RADIUS, resolveScheme, RL, textStyle } from "../src/ui/theme";

test("las dos paletas tienen los mismos nombres y los colores de la interfaz de Betterfly", () => {
  expect(Object.keys(LIGHT)).toEqual(Object.keys(DARK));
  expect([LIGHT.page, LIGHT.canvas, LIGHT.card, LIGHT.sub]).toEqual(["#F7F5EB", "#EFECDF", "#FFFFFF", "#EDEADD"]);
  expect([LIGHT.inkStrong, LIGHT.inkBody, LIGHT.ink55]).toEqual(["#0F1C14", "#1B2B21", "rgba(15,28,20,0.58)"]);
  expect([LIGHT.brand, LIGHT.onBrand, LIGHT.settled]).toEqual(["#066C32", "#FFFFFF", "#098F43"]);
  expect([DARK.page, DARK.card, DARK.inkStrong, DARK.brand, DARK.onBrand]).toEqual(["#0F1C14", "#1A2B20", "#FFFFFF", "#19F578", "#0F1C14"]);
  expect([DARK.success, DARK.error]).toEqual(["#4CF89B", "#D87B92"]);
  expect(RL.petrol).toBe("#066C32");
  expect(RADIUS).toEqual({ card: 6, control: 6, sheet: 12, pill: 9999 });
});

describe.each(["light", "dark"] as const)("contraste WCAG · %s", (scheme) => {
  const c = PALETTES[scheme];
  test.each(["page", "card"] as const)("texto sobre %s", (bg) => {
    for (const k of ["inkStrong", "inkBody", "ink72", "brand", "info", "error"] as const) expect(contrast(c[k], c[bg])).toBeGreaterThanOrEqual(4.5);
    for (const k of ["ink55", "success", "warning"] as const) expect(contrast(c[k], c[bg])).toBeGreaterThanOrEqual(3);
    // settled (+montos de depósito) es token del diseño: 2.96:1 sobre Paper, siempre en 15 px/500 junto al signo «+».
    expect(contrast(c.settled, c[bg])).toBeGreaterThanOrEqual(2.9);
  });
  test("texto sobre la marca y sobre el botón primario", () => {
    expect(contrast(c.onBrand, c.brand)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.onCta, c.cta)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.onBtnPrimary, c.btnPrimary)).toBeGreaterThanOrEqual(4.5);
  });
});

test("live es relleno (punto), nunca texto: en light no llega a 3:1 sobre página", () => {
  expect(contrast(LIGHT.live, LIGHT.page)).toBeLessThan(3);
});

test("ink40 es placeholder/deshabilitado: no se usa como texto (queda por debajo de 3:1 en light)", () => {
  expect(contrast(LIGHT.ink40, LIGHT.page)).toBeLessThan(3);
});

test("alpha convierte #RRGGBB a rgba", () => {
  expect(alpha("#B57100", 0.12)).toBe("rgba(181,113,0,0.12)");
  expect(alpha("#FFFFFF", 1)).toBe("rgba(255,255,255,1)");
});

test("resolveScheme: el override manual gana; system sigue al teléfono; sin dato, light", () => {
  expect(resolveScheme("dark", "light")).toBe("dark");
  expect(resolveScheme("light", "dark")).toBe("light");
  expect(resolveScheme("system", "dark")).toBe("dark");
  expect(resolveScheme("system", null)).toBe("light");
  expect(resolveScheme("system", undefined)).toBe("light");
});

test("fuentes: Archivo por peso; la mono es la del sistema", () => {
  expect([fam(400), fam(500), fam(600), fam(700), fam(800)]).toEqual(["Archivo_400Regular", "Archivo_500Medium", "Archivo_600SemiBold", "Archivo_700Bold", "Archivo_700Bold"]);
  expect(fam(500, "mono")).toBe(fam(400, "mono"));
});

test("textStyle convierte lh (ratio) y ls (em) a px y sólo pone color si se pide", () => {
  expect(textStyle(600, 24, { lh: 1.1, ls: -0.02 })).toEqual({ fontFamily: "Archivo_600SemiBold", fontSize: 24, lineHeight: 26, letterSpacing: -0.48 });
  expect(textStyle(500, 10.5, { mono: true, color: "#012821" })).toEqual({ fontFamily: fam(500, "mono"), fontSize: 10.5, color: "#012821" });
});
