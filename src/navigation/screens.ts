// Pantallas y conjuntos puros (sin react-native). store.ts los re-exporta.

export type HostScreen = "home" | "benefits" | "profile";
export type ModuleScreen =
  | "activate" | "terms" | "kyc" | "kycPending" | "kycRejected" | "passkey"
  | "balance" | "deposit" | "cardRequest" | "cardAuthorize" | "card" | "addToWallet"
  | "bankAccount" | "send" | "sendReceipt" | "settings" | "demoPanel";
export type Screen = HostScreen | ModuleScreen;

export const HOST_SCREENS: readonly HostScreen[] = ["home", "benefits", "profile"];
/** Orden del flujo del spec (Pantallas 2–16) más el panel oculto. */
export const MODULE_SCREENS: readonly ModuleScreen[] = [
  "activate", "terms", "kyc", "kycPending", "kycRejected", "passkey", "balance", "deposit",
  "cardRequest", "cardAuthorize", "card", "addToWallet", "bankAccount", "send", "sendReceipt", "settings", "demoPanel",
];
/** Se llega sin módulo activo: el alta (activar → términos → KYC → passkey) y el panel de demo. */
export const MODULE_OPEN: readonly ModuleScreen[] = ["activate", "terms", "kyc", "kycPending", "kycRejected", "passkey", "demoPanel"];
/** Exigen módulo activo: el gate manda a `activate` recordando el destino (spec «Navegación»). */
export const MODULE_GATED: readonly ModuleScreen[] = MODULE_SCREENS.filter((s) => !MODULE_OPEN.includes(s));

/** Raíces con tab bar. */
export const SHOW_TABS: readonly Screen[] = HOST_SCREENS;
/** Pantallas con botón ← (todas las del módulo: viven apiladas sobre Beneficios). */
export const CAN_BACK: readonly Screen[] = MODULE_SCREENS;

/** Pestaña que se ilumina en cada pantalla. */
export const ROOT_OF: Record<Screen, HostScreen> = {
  home: "home", benefits: "benefits", profile: "profile",
  activate: "benefits", terms: "benefits", kyc: "benefits", kycPending: "benefits", kycRejected: "benefits", passkey: "benefits",
  balance: "benefits", deposit: "benefits", cardRequest: "benefits", cardAuthorize: "benefits", card: "benefits", addToWallet: "benefits",
  bankAccount: "benefits", send: "benefits", sendReceipt: "benefits", settings: "benefits", demoPanel: "benefits",
};

/** Guard para strings externos (deep links de desarrollo). */
export function isScreen(v: string): v is Screen {
  return (HOST_SCREENS as readonly string[]).includes(v) || (MODULE_SCREENS as readonly string[]).includes(v);
}
