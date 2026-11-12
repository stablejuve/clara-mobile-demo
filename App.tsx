import { Archivo_400Regular, Archivo_500Medium, Archivo_600SemiBold, Archivo_700Bold, Archivo_800ExtraBold_Italic } from "@expo-google-fonts/archivo";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, StatusBar, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { AppCtx } from "./src/ctx";
import { useCurrentScreen } from "./src/hooks/useCurrentScreen";
import { useFaceId } from "./src/hooks/useFaceId";
import { useModule } from "./src/hooks/useModule";
import { useNotifications } from "./src/hooks/useNotifications";
import { t } from "./src/i18n/es";
import { AppCtxProvider } from "./src/navigation/context";
import { parseDeepLink } from "./src/navigation/deepLink";
import { navigateTo } from "./src/navigation/ref";
import { isScreen, isSheet } from "./src/navigation/screens";
import { Navigator } from "./src/navigation/Navigator";
import { EMPTY_DRAFT, fillSample, KYC_SECTIONS, type KycDraft, toSubmission } from "./src/relayer/kyc";
import { EMPLOYER } from "./src/relayer/mock/fixtures";
import { createMockApi } from "./src/relayer/mock/mockApi";
import { tracer, withTrace } from "./src/relayer/trace";
import { useTraceBoot } from "./src/hooks/useTraceEnabled";
import { TraceOverlay } from "./src/ui/TraceOverlay";
import { formatMxn } from "./src/relayer/money";
import type { Movement } from "./src/relayer/types";
import { useAppStore } from "./src/store";
import { asyncStorageKv } from "./src/storage/asyncKv";
import { Banner, type BannerContent } from "./src/ui/Banner";
import { ThemeProvider, useTheme } from "./src/ui/ThemeProvider";

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 200 });

// Único punto que crea la implementación del API (D6): cambiar esta línea es cambiar el mock por el backend real.
const api = withTrace(createMockApi({ storage: asyncStorageKv, trace: (k) => { tracer.hit(k); } }), tracer);
const BANNER_MS = 4800;

const bannerFor = (m: Movement): BannerContent => ({
  title: t("notify.depositTitle", { from: m.fromLabel === EMPLOYER.name ? EMPLOYER.short : (m.fromLabel ?? t("common.employer")) }),
  body: `${m.amountMxnCents !== undefined ? formatMxn(m.amountMxnCents) : ""}${m.concept ? ` · ${m.concept.split(" · ")[0]}` : ""}`,
  movementId: m.id,
});

/** Solo desarrollo: alta completa con el expediente de ejemplo (capturas y recorridos sin tocar el simulador). */
async function seedActive(setDraft: (d: KycDraft) => void) {
  const draft = KYC_SECTIONS.reduce(fillSample, EMPTY_DRAFT);
  setDraft(draft);
  const s = await api.getModule();
  if (s.module === "active") return;
  if (s.module === "off" || s.module === "terms_pending") await api.acceptTerms();
  if ((await api.getModule()).kyc.status !== "approved") {
    await api.submitKyc(toSubmission(draft));
    await new Promise<void>((resolve) => { const un = api.subscribe((x) => { if (x.state.kyc.status !== "under_review") { un(); resolve(); } }); });
  }
  await api.createPasskey();
}

function Shell() {
  const { scheme } = useTheme();
  const scr = useCurrentScreen();
  const [draft, setDraft] = useState<KycDraft>(EMPTY_DRAFT);
  const [banner, setBanner] = useState<BannerContent | null>(null);
  useTraceBoot();
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifications = useNotifications((target) => { navigateTo("movement", { id: target.movementId }); });
  // Con la app al frente, el banner del diseño; en segundo plano, la notificación local del sistema.
  const module = useModule(api, (m) => {
    if (AppState.currentState !== "active") { void notifications.notifyDeposit(m); return; }
    setBanner(bannerFor(m));
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), BANNER_MS);
  });
  const store = useAppStore({ moduleActive: module.active, scr });
  const faceId = useFaceId();
  const openBalance = useCallback(() => navigateTo("balance"), []);
  // Solo desarrollo: relayermobiledemo://demo/open/<screen> abre una pantalla sin tocar el simulador.
  useEffect(() => {
    const handle = (url: string | null) => {
      const link = parseDeepLink(url, __DEV__);
      if (link?.kind === "open" && isScreen(link.screen) && !isSheet(link.screen)) navigateTo(link.screen);
      else if (link?.kind === "open" && (link.screen === "onboarding" || link.screen === "send")) navigateTo(link.screen);
      else if (link?.kind === "seed") void seedActive(setDraft);
    };
    Linking.getInitialURL().then(handle).catch(() => {});
    const sub = Linking.addEventListener("url", (e) => handle(e.url));
    return () => sub.remove();
  }, []);
  const ctx: AppCtx = { ...store, module, faceId, notifications, kyc: { draft, setDraft }, openBalance };
  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle={scheme === "dark" ? "light-content" : "dark-content"} />
      <AppCtxProvider value={ctx}><Navigator /></AppCtxProvider>
      <Banner content={banner} onPress={(b) => { setBanner(null); navigateTo("movement", { id: b.movementId }); }} />
      <TraceOverlay tracer={tracer} />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ Archivo_400Regular, Archivo_500Medium, Archivo_600SemiBold, Archivo_700Bold, Archivo_800ExtraBold_Italic });
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
