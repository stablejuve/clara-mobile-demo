import { TAB_BAR_BASE, TAB_ROW_H, TAB_ROW_TOP, tabBarHeight } from "../src/ui/tabBarLayout";

test("la barra mide 49 + zona segura (83 en un iPhone con indicador): fila de 44 a 6 px del borde", () => {
  expect([TAB_ROW_TOP, TAB_ROW_H, TAB_BAR_BASE]).toEqual([6, 44, 49]);
  expect(tabBarHeight(34)).toBe(83);
  expect(tabBarHeight(0)).toBe(49);
});
