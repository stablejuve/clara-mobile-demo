import { InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold } from "@expo-google-fonts/instrument-sans";
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_700Bold } from "@expo-google-fonts/jetbrains-mono";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef } from "react";
import { Linking, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { AppCtx } from "./src/ctx";
import { useCurrentScreen } from "./src/hooks/useCurrentScreen";
import { useFaceId } from "./src/hooks/useFaceId";
import { useModule } from "./src/hooks/useModule";
import { useNotifications } from "./src/hooks/useNotifications";
import { AppCtxProvider } from "./src/navigation/context";
import { parseDeepLink } from "./src/navigation/deepLink";
import { isScreen } from "./src/navigation/screens";
import { devFlags } from "./src/dev/flags";
import { Navigator } from "./src/navigation/Navigator";
import { createMockApi } from "./src/relayer/mock/mockApi";
import { type AppStore, useAppStore } from "./src/store";
import { asyncStorageKv } from "./src/storage/asyncKv";
import { ThemeProvider, useTheme } from "./src/ui/ThemeProvider";

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 200 });

// Único punto que crea la implementación del API (D6): cambiar esta línea es cambiar el mock por el backend real.
const api = createMockApi({ storage: asyncStorageKv });

function Shell() {
  const { scheme } = useTheme();
  const scr = useCurrentScreen();
  const storeRef = useRef<AppStore | null>(null);
  // Tap en la notificación de depósito: abre el detalle respetando el gate.
  const notifications = useNotifications((target) => { storeRef.current?.requireModule("deposit", { depositId: target.movementId }); });
  const module = useModule(api, (m) => { void notifications.notifyDeposit(m); });
  const store = useAppStore({ moduleActive: module.active, scr });
  storeRef.current = store;
  const faceId = useFaceId();
  const { nav } = store;
  const kycReturn = useCallback(async () => {
    try { await api.completeKycReturn(); } catch { /* ya estaba en revisión o no había KYC abierto: kycPending lo explica */ }
    nav("kycPending");
  }, [nav]);
  // Deep link relayermobiledemo://recibo/kyc-return: en caliente (listener) y en frío (initial URL).
  useEffect(() => {
    const handle = (url: string | null) => {
      const link = parseDeepLink(url, __DEV__);
      if (link?.kind === "kyc-return") void kycReturn();
      else if (link?.kind === "open" && isScreen(link.screen)) { devFlags.scrollEndOnMount = link.scrollEnd; nav(link.screen); }
    };
    Linking.getInitialURL().then(handle).catch(() => {});
    const sub = Linking.addEventListener("url", (e) => handle(e.url));
    return () => sub.remove();
  }, [kycReturn]);
  const ctx: AppCtx = { ...store, module, faceId, notifications, kycReturn };
  return (
    <>
      <StatusBar barStyle={scheme === "dark" ? "light-content" : "dark-content"} />
      <AppCtxProvider value={ctx}><Navigator /></AppCtxProvider>
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold,
    JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_700Bold,
  });
  useEffect(() => { if (fontsLoaded) void SplashScreen.hideAsync(); }, [fontsLoaded]);
  if (!fontsLoaded) return null; // el splash nativo sigue en pantalla
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider><Shell /></ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
