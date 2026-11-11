import { SCREENS_ALL } from "../src/navigation/routes";
import { headerFor, INITIAL } from "../src/store";

test("toda pantalla tiene título; las raíces no llevan subtítulo", () => {
  for (const s of SCREENS_ALL) expect(headerFor(s)[0].length).toBeGreaterThan(0);
  expect(headerFor("home")).toEqual(["Inicio", ""]);
  expect(headerFor("benefits")).toEqual(["Beneficios", ""]);
  expect(headerFor("profile")).toEqual(["Perfil", ""]);
  expect(headerFor("balance")).toEqual(["Recibo", "Saldo · USDC en Base"]);
  expect(headerFor("demoPanel")).toEqual(["Panel de demo", "Sólo para la demo"]);
});

test("el store arranca vacío", () => {
  expect(INITIAL).toEqual({});
});
