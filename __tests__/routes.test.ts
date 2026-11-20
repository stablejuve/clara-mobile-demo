import { SCREENS_ALL, screenOfRoute, TAB_OF, TAB_ORDER, TAB_ROOT } from "../src/navigation/routes";
import { HOST_SCREENS, isScreen, isSheet, MODULE_SCREENS, ROOT_OF, SHEET_SCREENS } from "../src/navigation/screens";

test("tres pestañas; cuenta, tarjeta y actividad viven bajo Beneficios; las hojas van sobre todo", () => {
  expect(TAB_ORDER).toEqual(["HomeTab", "BenefitsTab", "ProfileTab"]);
  expect(SCREENS_ALL).toEqual([...HOST_SCREENS, ...MODULE_SCREENS, ...SHEET_SCREENS]);
  for (const s of [...HOST_SCREENS, ...MODULE_SCREENS]) expect(ROOT_OF[s]).toBe(TAB_ROOT[TAB_OF[s]]);
  for (const s of MODULE_SCREENS) expect(TAB_OF[s]).toBe("BenefitsTab");
  expect([...SHEET_SCREENS]).toEqual(["onboarding", "send", "movement", "pay", "console", "rail", "legal", "kycForm", "beneficiary"]);
  for (const s of SHEET_SCREENS) expect(isSheet(s)).toBe(true);
  expect(isSheet("balance")).toBe(false);
  expect(isScreen("send")).toBe(true);
  expect(isScreen("admin")).toBe(false);
});

test("screenOfRoute ignora navegadores", () => {
  expect(screenOfRoute("balance")).toBe("balance");
  expect(screenOfRoute("onboarding")).toBe("onboarding");
  expect(screenOfRoute("Tabs")).toBeNull();
  expect(screenOfRoute("BenefitsTab")).toBeNull();
  expect(screenOfRoute(undefined)).toBeNull();
});
