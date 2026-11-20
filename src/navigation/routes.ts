import type { NavigatorScreenParams } from "@react-navigation/native";
import type { KycSection } from "../gdb/kyc";
import type { LegalDoc } from "../gdb/legal";
import { HOST_SCREENS, type HostScreen, MODULE_SCREENS, type ModuleScreen, type Screen, SHEET_SCREENS } from "./screens";

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
export type SheetParams = { onboarding: undefined; send: undefined; movement: { id: string }; pay: undefined; console: undefined; rail: { id: string }; legal: { doc: LegalDoc }; kycForm: { section: KycSection }; beneficiary: undefined };
export type RootParamList = { Tabs: NavigatorScreenParams<TabParamList> | undefined } & SheetParams;

export const TAB_ORDER: readonly TabName[] = ["HomeTab", "BenefitsTab", "ProfileTab"];
export const TAB_ROOT: Record<TabName, HostScreen> = { HomeTab: "home", BenefitsTab: "benefits", ProfileTab: "profile" };
export const TAB_OF: Record<HostScreen | ModuleScreen, TabName> = {
  home: "HomeTab", benefits: "BenefitsTab", profile: "ProfileTab", balance: "BenefitsTab", card: "BenefitsTab", activity: "BenefitsTab",
};

export const SCREENS_ALL: readonly Screen[] = [...HOST_SCREENS, ...MODULE_SCREENS, ...SHEET_SCREENS];

/** Nombre de ruta enfocada → pantalla; null para navegadores (`Tabs`, `*Tab`) o sin estado. */
export function screenOfRoute(name: string | undefined): Screen | null {
  return name !== undefined && (SCREENS_ALL as readonly string[]).includes(name) ? (name as Screen) : null;
}
