import type { ExpoConfig } from "expo/config";

// Demo del módulo Recibo dentro de "Acme Beneficios" (spec D4/D9). Sin servicios reales: nada de `extra` ni env.
const bundleIdentifier = "fi.relayer.mobiledemo";
const PAPER = "#F6F6F4";   // --surface-page light (src/ui/theme.ts LIGHT.page)
const CARBON = "#1A1A19";  // --surface-page dark  (DARK.page)
const faceIDPermission = "Acme Beneficios usa Face ID para crear y usar tu wallet de Recibo.";

const config: ExpoConfig = {
  name: "Relayer HR",
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
    ["expo-image-picker", {
      cameraPermission: "Acme Beneficios usa la cámara para tomar la foto de tu identificación y tu selfie de verificación.",
      photosPermission: "Acme Beneficios abre tus fotos para que subas tu identificación.",
      microphonePermission: false,
    }],
    ["expo-splash-screen", { image: "./assets/splash-mark.png", imageWidth: 140, resizeMode: "contain", backgroundColor: PAPER, dark: { backgroundColor: CARBON } }],
  ],
};

export default config;
