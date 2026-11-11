// Contraste WCAG 2.x (sólo lo usan los tests de tema). Acepta "#RRGGBB" y "rgba(r,g,b,a)"; un fg translúcido se compone
// sobre el fondo porque los ink-NN de Relayer son alfa sobre página/card.
type Rgba = [number, number, number, number];

function parse(color: string): Rgba {
  if (color.startsWith("#")) {
    const h = color.slice(1);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const m = /rgba?\(([^)]+)\)/.exec(color);
  if (!m) throw new Error(`color no soportado: ${color}`);
  const p = m[1].split(",").map(Number);
  return [p[0], p[1], p[2], p[3] ?? 1];
}

function over(fg: Rgba, bg: [number, number, number]): [number, number, number] {
  const a = fg[3];
  return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a)];
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Relación de contraste fg/bg redondeada a 2 decimales (4.5 = AA texto normal; 3 = AA texto grande / UI). */
export function contrast(fg: string, bg: string): number {
  const solidBg = over(parse(bg), [0, 0, 0]);
  const l1 = luminance(over(parse(fg), solidBg));
  const l2 = luminance(solidBg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return +((hi + 0.05) / (lo + 0.05)).toFixed(2);
}
