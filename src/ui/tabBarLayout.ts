// Geometría de la tab bar del diseño «Recibo Minimal» (83 px con el indicador de inicio de 34). Puro, para testearlo.
export const TAB_ROW_TOP = 6;
export const TAB_ROW_H = 44;
/** Alto de la barra sin la zona segura: 49 (6 + 44 − 1 de redondeo iOS). */
export const TAB_BAR_BASE = 49;

/** Alto total de la barra. */
export function tabBarHeight(insetBottom: number): number {
  return TAB_BAR_BASE + insetBottom;
}
