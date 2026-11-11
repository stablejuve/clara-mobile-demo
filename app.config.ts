import type { ExpoConfig } from "expo/config";

// Demo del módulo Recibo dentro de "Acme Beneficios" (spec D4/D9). Sin servicios reales: nada de `extra` ni env.
const bundleIdentifier = "fi.relayer.mobiledemo";
const PAPER = "#FBFBFA";   // --surface-page light (src/ui/theme.ts LIGHT.page)
const CARBON = "#121819";  // --surface-page dark  (DARK.page)
const faceIDPermission = "Acme Beneficios usa Face ID para crear y usar tu wallet de Recibo.";

const config: ExpoConfig = {
  name: "Acme Beneficios",
  slug: "relayer-mobiledemo",
  version: "0.1.0",
  orientation: "portrait",
  // 1024x1024 sin alfa (Apple lo exige). Placeholder: scripts/make-placeholder-assets.mjs.
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
      NSFaceIDUsageDescription: faceIDPermission,
    },
  },
  android: { package: bundleIdentifier },
  plugins: [
    "expo-font",
    ["expo-secure-store", { faceIDPermission }],
    ["expo-local-authentication", { faceIDPermission }],
    ["expo-build-properties", { ios: { deploymentTarget: "18.0" } }],
    ["expo-notifications", { enableBackgroundRemoteNotifications: false }],
    ["expo-splash-screen", { image: "./assets/splash-mark.png", imageWidth: 140, resizeMode: "contain", backgroundColor: PAPER, dark: { backgroundColor: CARBON } }],
  ],
};

export default config;
