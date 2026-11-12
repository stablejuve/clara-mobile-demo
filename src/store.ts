import { useCallback } from "react";
import { goBackIfCan, navigateTo, switchTab as switchTabRoute } from "./navigation/ref";
import { gateTarget, type SheetParams, type TabName } from "./navigation/routes";
import type { Screen, SheetScreen } from "./navigation/screens";

export { HOST_SCREENS, MODULE_GATED, MODULE_SCREENS, type ModuleScreen, ROOT_OF, type Screen, SHEET_SCREENS } from "./navigation/screens";

type Nav = <S extends Screen>(screen: S, params?: S extends SheetScreen ? SheetParams[S] : undefined) => void;

export type AppStore = {
  nav: Nav;
  back: () => void;
  /** Gate: con módulo activo navega; sin él, abre la hoja de alta. */
  requireModule: Nav;
  /** Tab bar: enfoca la pestaña conservando su pila. */
  switchTab: (tab: TabName) => void;
  /** Pantalla enfocada según react-navigation. */
  scr: Screen;
  moduleActive: boolean;
};

export function useAppStore({ moduleActive, scr }: { moduleActive: boolean; scr: Screen }): AppStore {
  const nav = useCallback(((screen, params) => navigateTo(screen, params)) as Nav, []);
  const back = useCallback(() => goBackIfCan(), []);
  const requireModule = useCallback(((target, params) => {
    const g = gateTarget(moduleActive, target);
    if (g === target) navigateTo(target, params); else navigateTo(g);
  }) as Nav, [moduleActive]);
  const switchTab = useCallback((tab: TabName) => switchTabRoute(tab), []);
  return { nav, back, requireModule, switchTab, scr, moduleActive };
}
