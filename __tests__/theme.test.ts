import { contrast } from "../src/ui/contrast";
import { alpha, DARK, fam, LIGHT, PALETTES, RADIUS, resolveScheme, RL, textStyle } from "../src/ui/theme";

test("las dos paletas tienen los mismos nombres y los valores de tokens.css", () => {
  expect(Object.keys(LIGHT)).toEqual(Object.keys(DARK));
  expect([LIGHT.page, LIGHT.canvas, LIGHT.card, LIGHT.sub]).toEqual(["#FBFBFA", "#F5F5F4", "#FFFFFF", "#F1F1F0"]);
  expect([LIGHT.inkStrong, LIGHT.inkBody, LIGHT.ink55]).toEqual(["#121819", "#24292B", "rgba(20,25,27,0.55)"]);
  expect([LIGHT.brand, LIGHT.brandH, LIGHT.onBrand, LIGHT.live, LIGHT.settled]).toEqual(["#00594F", "#00473F", "#FBFBF9", "#00C4CC", "#3DA083"]);
  expect([LIGHT.info, LIGHT.success, LIGHT.warning, LIGHT.error]).toEqual(["#3D5A7B", "#2F8E5C", "#B57100", "#8B2940"]);
  expect([DARK.page, DARK.canvas, DARK.card, DARK.sub]).toEqual(["#121819", "#0D1213", "#1A2223", "#0F1516"]);
  expect([DARK.inkStrong, DARK.inkBody, DARK.ink55]).toEqual(["#FFFFFF", "#E6ECEB", "rgba(230,236,235,0.58)"]);
  expect([DARK.brand, DARK.brandH, DARK.onBrand, DARK.live, DARK.settled]).toEqual(["#72BDB1", "#8CCBC1", "#121819", "#33D6DD", "#66C8A8"]);
  expect([DARK.info, DARK.success, DARK.warning, DARK.error]).toEqual(["#8FA8C4", "#66C8A8", "#E8B25C", "#D87968"]);
  expect([LIGHT.btnPrimary, LIGHT.onBtnPrimary, DARK.btnPrimary, DARK.onBtnPrimary]).toEqual(["#121819", "#FFFFFF", "#72BDB1", "#121819"]);
  expect(RL).toEqual({ carbon: "#121819", petrol: "#00594F", turq: "#72BDB1", sage: "#B5C8AA", peach: "#F0B395", coral: "#D87968" });
  expect(RADIUS).toEqual({ card: 2, control: 2, pill: 9999 });
});

describe.each(["light", "dark"] as const)("contraste WCAG · %s", (scheme) => {
  const c = PALETTES[scheme];
  test.each(["page", "card"] as const)("texto sobre %s", (bg) => {
    for (const k of ["inkStrong", "inkBody", "ink72", "brand", "info", "error"] as const) expect(contrast(c[k], c[bg])).toBeGreaterThanOrEqual(4.5);
    for (const k of ["ink55", "success", "warning", "settled"] as const) expect(contrast(c[k], c[bg])).toBeGreaterThanOrEqual(3);
  });
  test("texto sobre la marca y sobre el botón primario", () => {
    expect(contrast(c.onBrand, c.brand)).toBeGreaterThanOrEqual(4.5);
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

test("fuentes: Instrument Sans por peso, JetBrains Mono con tres cortes", () => {
  expect([fam(400), fam(500), fam(600), fam(700), fam(800)]).toEqual([
    "InstrumentSans_400Regular", "InstrumentSans_500Medium", "InstrumentSans_600SemiBold", "InstrumentSans_700Bold", "InstrumentSans_700Bold",
  ]);
  expect([fam(400, "mono"), fam(500, "mono"), fam(700, "mono")]).toEqual(["JetBrainsMono_400Regular", "JetBrainsMono_500Medium", "JetBrainsMono_700Bold"]);
});

test("textStyle convierte lh (ratio) y ls (em) a px y sólo pone color si se pide", () => {
  expect(textStyle(600, 24, { lh: 1.1, ls: -0.02 })).toEqual({ fontFamily: "InstrumentSans_600SemiBold", fontSize: 24, lineHeight: 26, letterSpacing: -0.48 });
  expect(textStyle(500, 10.5, { mono: true, color: "#121819" })).toEqual({ fontFamily: "JetBrainsMono_500Medium", fontSize: 10.5, color: "#121819" });
});
