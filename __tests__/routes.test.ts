import { gateTarget, SCREENS_ALL, screenOfRoute, TAB_OF, TAB_ORDER, TAB_ROOT } from "../src/navigation/routes";
import { CAN_BACK, HOST_SCREENS, MODULE_GATED, MODULE_OPEN, MODULE_SCREENS, ROOT_OF, SHOW_TABS } from "../src/navigation/screens";

test("tres pestañas; cada pantalla pertenece a una; el módulo vive bajo Beneficios", () => {
  expect(TAB_ORDER).toEqual(["HomeTab", "BenefitsTab", "ProfileTab"]);
  expect(SCREENS_ALL).toHaveLength(20);
  expect(SCREENS_ALL).toEqual([...HOST_SCREENS, ...MODULE_SCREENS]);
  for (const s of SCREENS_ALL) expect(ROOT_OF[s]).toBe(TAB_ROOT[TAB_OF[s]]);
  for (const s of MODULE_SCREENS) expect(TAB_OF[s]).toBe("BenefitsTab");
  expect(TAB_OF.home).toBe("HomeTab");
  expect(TAB_OF.profile).toBe("ProfileTab");
});

test("las 17 pantallas del módulo en el orden del spec; tabs sólo en las raíces; back en todo el módulo", () => {
  expect(MODULE_SCREENS).toEqual([
    "activate", "terms", "kyc", "kycPending", "kycRejected", "passkey", "balance", "deposit",
    "cardRequest", "cardAuthorize", "card", "addToWallet", "bankAccount", "send", "sendReceipt", "settings", "demoPanel",
  ]);
  expect([...SHOW_TABS]).toEqual(["home", "benefits", "profile"]);
  expect([...CAN_BACK]).toEqual([...MODULE_SCREENS]);
});

test("abiertas sin módulo activo: el alta y el panel; el resto exige módulo activo", () => {
  expect([...MODULE_OPEN]).toEqual(["activate", "terms", "kyc", "kycPending", "kycRejected", "passkey", "demoPanel"]);
  expect([...MODULE_GATED]).toEqual(["balance", "deposit", "cardRequest", "cardAuthorize", "card", "addToWallet", "bankAccount", "send", "sendReceipt", "settings"]);
});

test("screenOfRoute ignora navegadores", () => {
  expect(screenOfRoute("balance")).toBe("balance");
  expect(screenOfRoute("Tabs")).toBeNull();
  expect(screenOfRoute("BenefitsTab")).toBeNull();
  expect(screenOfRoute(undefined)).toBeNull();
});

test("gateTarget: sin módulo activo, recibo/* gated manda a activate recordando el destino", () => {
  expect(gateTarget(false, "balance")).toEqual({ screen: "activate", next: "balance" });
  expect(gateTarget(false, "send")).toEqual({ screen: "activate", next: "send" });
  expect(gateTarget(true, "balance")).toEqual({ screen: "balance" });
  expect(gateTarget(false, "terms")).toEqual({ screen: "terms" });
  expect(gateTarget(false, "demoPanel")).toEqual({ screen: "demoPanel" });
  expect(gateTarget(false, "home")).toEqual({ screen: "home" });
  for (const s of MODULE_GATED) expect(gateTarget(false, s).screen).toBe("activate");
  for (const s of MODULE_OPEN) expect(gateTarget(false, s).screen).toBe(s);
});
