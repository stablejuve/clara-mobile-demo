import type { NavigatorScreenParams } from "@react-navigation/native";
import { HOST_SCREENS, MODULE_GATED, MODULE_SCREENS, type ModuleScreen, type Screen } from "./screens";

// Tabla de rutas de react-navigation. Pura: sin react-native.

export type TabName = "HomeTab" | "BenefitsTab" | "ProfileTab";

export type HomeStackParamList = { home: undefined };
export type BenefitsStackParamList = Record<"benefits" | ModuleScreen, undefined>;
export type ProfileStackParamList = { profile: undefined };
export type TabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList> | undefined;
  BenefitsTab: NavigatorScreenParams<BenefitsStackParamList> | undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList> | undefined;
};
export type RootParamList = { Tabs: NavigatorScreenParams<TabParamList> | undefined };

export const TAB_ORDER: readonly TabName[] = ["HomeTab", "BenefitsTab", "ProfileTab"];

export const TAB_ROOT: Record<TabName, Screen> = { HomeTab: "home", BenefitsTab: "benefits", ProfileTab: "profile" };

export const TAB_OF: Record<Screen, TabName> = {
  home: "HomeTab", benefits: "BenefitsTab", profile: "ProfileTab",
  ...(Object.fromEntries(MODULE_SCREENS.map((s) => [s, "BenefitsTab"])) as Record<ModuleScreen, TabName>),
};

export const SCREENS_ALL: readonly Screen[] = [...HOST_SCREENS, ...MODULE_SCREENS];

/** Nombre de ruta enfocada → pantalla; null para navegadores (`Tabs`, `*Tab`) o sin estado. */
export function screenOfRoute(name: string | undefined): Screen | null {
  return name !== undefined && (SCREENS_ALL as readonly string[]).includes(name) ? (name as Screen) : null;
}

/** Gate del módulo: sin módulo activo, las pantallas de MODULE_GATED pasan por `activate` recordando el destino. */
export function gateTarget(moduleActive: boolean, target: Screen): { screen: Screen; next?: ModuleScreen } {
  if (moduleActive || !(MODULE_GATED as readonly Screen[]).includes(target)) return { screen: target };
  return { screen: "activate", next: target as ModuleScreen };
}
