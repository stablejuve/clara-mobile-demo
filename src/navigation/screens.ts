// Pantallas y conjuntos puros (sin react-native).

export type HostScreen = "home" | "benefits" | "profile";
/** Pila de Beneficios: cuenta → tarjeta y actividad. */
export type ModuleScreen = "balance" | "card" | "activity";
/** Hojas modales sobre toda la app: activar, convertir/retirar, detalle de movimiento, pagar, consola de demo, «Detrás del pago» y documentos legales. */
export type SheetScreen = "onboarding" | "send" | "movement" | "pay" | "console" | "rail" | "legal" | "kycForm" | "beneficiary";
export type Screen = HostScreen | ModuleScreen | SheetScreen;

export const HOST_SCREENS: readonly HostScreen[] = ["home", "benefits", "profile"];
export const MODULE_SCREENS: readonly ModuleScreen[] = ["balance", "card", "activity"];
export const SHEET_SCREENS: readonly SheetScreen[] = ["onboarding", "send", "movement", "pay", "console", "rail", "legal", "kycForm", "beneficiary"];

/** Pestaña que se ilumina en cada pantalla de pestaña. */
export const ROOT_OF: Record<HostScreen | ModuleScreen, HostScreen> = {
  home: "home", benefits: "benefits", profile: "profile", balance: "benefits", card: "benefits", activity: "benefits",
};

export const isSheet = (s: Screen): s is SheetScreen => (SHEET_SCREENS as readonly string[]).includes(s);

/** Guard para strings externos (deep links de desarrollo). */
export function isScreen(v: string): v is Screen {
  return [...HOST_SCREENS, ...MODULE_SCREENS, ...SHEET_SCREENS].includes(v as Screen);
}
