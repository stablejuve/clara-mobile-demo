import type { ReactElement, ReactNode } from "react";
import type { AppCtx } from "../../ctx";
import type { ModuleScreen } from "../../navigation/screens";
import { PlaceholderScreen } from "./placeholder";

/** Pantalla de cada ruta recibo/*. Las Tasks 11–15 sustituyen cada placeholder por la pantalla real. */
export const MODULE_COMPONENTS: Record<ModuleScreen, (ctx: AppCtx) => ReactElement> = {
  activate: PlaceholderScreen, terms: PlaceholderScreen, kyc: PlaceholderScreen, kycPending: PlaceholderScreen, kycRejected: PlaceholderScreen,
  passkey: PlaceholderScreen, balance: PlaceholderScreen, deposit: PlaceholderScreen, cardRequest: PlaceholderScreen, cardAuthorize: PlaceholderScreen,
  card: PlaceholderScreen, addToWallet: PlaceholderScreen, bankAccount: PlaceholderScreen, send: PlaceholderScreen, sendReceipt: PlaceholderScreen,
  settings: PlaceholderScreen, demoPanel: PlaceholderScreen,
};

/** Botón a la derecha de la cabecera (balance → ajustes, Task 12). */
export const MODULE_HEADER_RIGHT: Partial<Record<ModuleScreen, (ctx: AppCtx) => ReactNode>> = {};
