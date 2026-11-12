import { createNavigationContainerRef } from "@react-navigation/native";
import { type RootParamList, screenOfRoute, type SheetParams, TAB_OF, type TabName, TAB_ROOT } from "./routes";
import { isSheet, type Screen, type SheetScreen } from "./screens";

// Adaptador de navegación: las pantallas hablan en `Screen`; aquí se traduce a rutas anidadas.
// react-navigation v7: `navigate` a una ruta ya presente la APILA de nuevo; sólo vuelve a la existente con `pop: true`.
// `initial: false` en pantallas no raíz: si la pila se monta en frío, la pantalla pedida se apila SOBRE la raíz de la pestaña.
export const navigationRef = createNavigationContainerRef<RootParamList>();

let pending: (() => void)[] = [];

function run(fn: () => void): void {
  if (navigationRef.isReady()) fn();
  else pending.push(fn);
}

/** Lo llama `onReady` del container: aplica lo encolado antes de que estuviera listo (deep link en frío). */
export function flushPending(): void {
  const q = pending;
  pending = [];
  for (const fn of q) fn();
}

/** Pestaña: enfoca la pestaña dueña y apila (o vuelve a) la pantalla. Hoja: la presenta sobre todo. */
export function navigateTo<S extends Screen>(screen: S, params?: S extends SheetScreen ? SheetParams[S] : undefined): void {
  run(() => {
    if (isSheet(screen)) { (navigationRef.navigate as (n: string, p?: object) => void)(screen, params ?? undefined); return; }
    const tab = TAB_OF[screen as keyof typeof TAB_OF];
    const nested = screen === TAB_ROOT[tab] ? { screen, pop: true } : { screen, initial: false, pop: true };
    navigationRef.navigate("Tabs", { screen: tab, params: nested } as never, { pop: true });
  });
}

/** Sólo enfoca la pestaña (tab bar): su pila se conserva tal cual. */
export function switchTab(tab: TabName): void {
  run(() => navigationRef.navigate("Tabs", { screen: tab }, { pop: true }));
}

export function goBackIfCan(): void {
  run(() => { if (navigationRef.canGoBack()) navigationRef.goBack(); });
}

export function currentScreen(): Screen | null {
  return navigationRef.isReady() ? screenOfRoute(navigationRef.getCurrentRoute()?.name) : null;
}
