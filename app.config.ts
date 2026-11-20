import type { ExpoConfig } from "expo/config";

// Demo interna de Global Dollar Benefits con la marca Betterfly. Todo es front: sin servicios reales, sin permisos del
// dispositivo, nada de `extra` ni env.
const bundleIdentifier = "fi.relayer.mobiledemo";
const BF_DEEP = "#02190C"; // fondo del icono de la app de Betterfly (assets/icon.png)
const PAPER = "#F6F6F4";   // --surface-page light (src/ui/theme.ts LIGHT.page)

const config: ExpoConfig = {
  name: "Betterfly",
  slug: "relayer-mobiledemo",
  version: "0.1.0",
  orientation: "portrait",
  // 1024x1024 sin alfa (Apple lo exige): el icono de la app de Betterfly. OJO: scripts/make-placeholder-assets.mjs lo sobrescribe.
  icon: "./assets/icon.png",
  scheme: "relayermobiledemo",
  userInterfaceStyle: "automatic",
  backgroundColor: PAPER,
  ios: {
    bundleIdentifier,
    buildNumber: "1",
    supportsTablet: false,
    backgroundColor: PAPER,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: { package: bundleIdentifier },
  plugins: [
    "expo-font",
    ["expo-build-properties", { ios: { deploymentTarget: "18.0" } }],
    ["expo-splash-screen", { image: "./assets/splash-mark.png", imageWidth: 160, resizeMode: "contain", backgroundColor: BF_DEEP, dark: { backgroundColor: BF_DEEP } }],
  ],
};

export default config;
