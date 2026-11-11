import { useCallback, useState } from "react";
import { t } from "./i18n/es";
import { goBackIfCan, navigateTo, switchTab as switchTabRoute } from "./navigation/ref";
import { gateTarget, type TabName } from "./navigation/routes";
import type { ModuleScreen, Screen } from "./navigation/screens";

export { CAN_BACK, HOST_SCREENS, MODULE_GATED, MODULE_OPEN, MODULE_SCREENS, type ModuleScreen, ROOT_OF, type Screen, SHOW_TABS } from "./navigation/screens";

/** Sólo datos: la pila y la pantalla activa viven en react-navigation. */
export type StoreState = {
  /** Movimiento abierto en `deposit`. */
  depositId?: string;
  /** Recibo abierto en `sendReceipt`. */
  receiptId?: string;
  /** Destino que el gate retuvo (`activate` lo lleva al terminar el alta). */
  next?: ModuleScreen;
};
export type Patch = Partial<StoreState>;
export const INITIAL: StoreState = {};

/** Título y subtítulo de la cabecera propia (Page.tsx), desde i18n. */
export function headerFor(screen: Screen): [string, string] {
  return [t(`screen.${screen}.title`), t(`screen.${screen}.sub`)];
}

export type AppStore = {
  S: StoreState;
  set: (patch: Patch) => void;
  nav: (screen: Screen, patch?: Patch) => void;
  back: () => void;
  /** Gate: con módulo activo navega; sin él, va a `activate` y guarda `next`. */
  requireModule: (target: Screen, patch?: Patch) => void;
  /** Tab bar: enfoca la pestaña conservando su pila. */
  switchTab: (tab: TabName) => void;
  /** Pantalla enfocada según react-navigation. */
  scr: Screen;
  moduleActive: boolean;
};

export function useAppStore({ moduleActive, scr }: { moduleActive: boolean; scr: Screen }): AppStore {
  const [S, setS] = useState<StoreState>(INITIAL);
  const set = useCallback((patch: Patch) => setS((s) => ({ ...s, ...patch })), []);
  const nav = useCallback((screen: Screen, patch?: Patch) => { if (patch) set(patch); navigateTo(screen); }, [set]);
  const back = useCallback(() => goBackIfCan(), []);
  const requireModule = useCallback((target: Screen, patch?: Patch) => {
    const g = gateTarget(moduleActive, target);
    nav(g.screen, g.next ? { ...patch, next: g.next } : patch);
  }, [moduleActive, nav]);
  const switchTab = useCallback((tab: TabName) => switchTabRoute(tab), []);
  return { S, set, nav, back, requireModule, switchTab, scr, moduleActive };
}
