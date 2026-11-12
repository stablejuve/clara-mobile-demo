import type { NavigatorScreenParams } from "@react-navigation/native";
import type { KycSection } from "../relayer/kyc";
import { HOST_SCREENS, type HostScreen, MODULE_GATED, MODULE_SCREENS, type ModuleScreen, type Screen, SHEET_SCREENS } from "./screens";

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
export type SheetParams = { onboarding: undefined; kycForm: { section: KycSection }; send: undefined; movement: { id: string } };
export type RootParamList = { Tabs: NavigatorScreenParams<TabParamList> | undefined } & SheetParams;

export const TAB_ORDER: readonly TabName[] = ["HomeTab", "BenefitsTab", "ProfileTab"];
export const TAB_ROOT: Record<TabName, HostScreen> = { HomeTab: "home", BenefitsTab: "benefits", ProfileTab: "profile" };
export const TAB_OF: Record<HostScreen | ModuleScreen, TabName> = {
  home: "HomeTab", benefits: "BenefitsTab", profile: "ProfileTab", balance: "BenefitsTab", card: "BenefitsTab", demoPanel: "BenefitsTab",
};

export const SCREENS_ALL: readonly Screen[] = [...HOST_SCREENS, ...MODULE_SCREENS, ...SHEET_SCREENS];

/** Nombre de ruta enfocada → pantalla; null para navegadores (`Tabs`, `*Tab`) o sin estado. */
export function screenOfRoute(name: string | undefined): Screen | null {
  return name !== undefined && (SCREENS_ALL as readonly string[]).includes(name) ? (name as Screen) : null;
}

/** Gate del módulo: sin módulo activo, saldo/tarjeta/transferir/detalle abren la hoja de alta. */
export function gateTarget(moduleActive: boolean, target: Screen): Screen {
  return moduleActive || !MODULE_GATED.includes(target) ? target : "onboarding";
}
