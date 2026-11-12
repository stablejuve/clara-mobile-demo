// Pantallas y conjuntos puros (sin react-native). store.ts los re-exporta.

export type HostScreen = "home" | "benefits" | "profile";
/** Pila de Beneficios: saldo → tarjeta (y el panel oculto). */
export type ModuleScreen = "balance" | "card" | "demoPanel";
/** Hojas modales sobre toda la app (diseño «Recibo Minimal»): alta, formulario KYC, transferir, nueva cuenta y detalle de movimiento. */
export type SheetScreen = "onboarding" | "kycForm" | "send" | "beneficiary" | "movement";
export type Screen = HostScreen | ModuleScreen | SheetScreen;

export const HOST_SCREENS: readonly HostScreen[] = ["home", "benefits", "profile"];
export const MODULE_SCREENS: readonly ModuleScreen[] = ["balance", "card", "demoPanel"];
export const SHEET_SCREENS: readonly SheetScreen[] = ["onboarding", "kycForm", "send", "beneficiary", "movement"];
/** Exigen módulo activo: sin él, el gate abre la hoja de alta. */
export const MODULE_GATED: readonly Screen[] = ["balance", "card", "send", "beneficiary", "movement"];

/** Pestaña que se ilumina en cada pantalla de pestaña. */
export const ROOT_OF: Record<HostScreen | ModuleScreen, HostScreen> = {
  home: "home", benefits: "benefits", profile: "profile", balance: "benefits", card: "benefits", demoPanel: "benefits",
};

export const isSheet = (s: Screen): s is SheetScreen => (SHEET_SCREENS as readonly string[]).includes(s);

/** Guard para strings externos (deep links de desarrollo). */
export function isScreen(v: string): v is Screen {
  return [...HOST_SCREENS, ...MODULE_SCREENS, ...SHEET_SCREENS].includes(v as Screen);
}
