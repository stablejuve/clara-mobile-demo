import { useContext, useEffect } from "react";
import { Linking, StatusBar, View } from "react-native";
import { feed } from "./gdb/activity";
import { FrameWidthContext } from "./gdb/frame";
import { CONSOLE_ACTIONS, DEMO, gdb, isConsoleAction, useGdb } from "./gdb/store";
import { tracer } from "./gdb/trace";
import { TraceOverlay } from "./gdb/TraceOverlay";
import { parseDeepLink } from "./navigation/deepLink";
import { Navigator } from "./navigation/Navigator";
import { navigateTo } from "./navigation/ref";
import { isScreen } from "./navigation/screens";
import { Banner } from "./ui/Banner";
import { useTheme } from "./ui/ThemeProvider";

const BANNER_MS = 4200;
/** Pantallas que el deep link de desarrollo puede abrir (las registradas en el navegador). */
const OPENABLE = ["home", "benefits", "profile", "balance", "card", "activity", "onboarding", "pay", "send", "console"];

/** La app del empleado (Betterfly). Demo 100 % front: el estado vive en `src/gdb/store.ts`; no hay backend ni servicios reales. */
export function Shell() {
  const { scheme } = useTheme();
  const { notice } = useGdb();
  const inStage = useContext(FrameWidthContext) !== null;
  // Notificación en la app (pantalla 08): se oculta sola; tocarla abre el detalle del movimiento.
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => gdb.dismissNotice(), BANNER_MS);
    return () => clearTimeout(id);
  }, [notice]);
  // Solo desarrollo: `relayermobiledemo://demo/open/<pantalla>` abre una pantalla, `…/demo/run/<acción>` dispara un atajo de la
  // consola y `…/demo/seed/active` deja la cuenta verificada, fondeada y con tarjeta activa (capturas y recorridos sin tocar).
  useEffect(() => {
    const handle = (url: string | null) => {
      const link = parseDeepLink(url, __DEV__);
      if (link?.kind === "open" && isScreen(link.screen) && OPENABLE.includes(link.screen)) navigateTo(link.screen as "home");
      else if (link?.kind === "run" && link.action === "detail") { const it = feed(gdb.get().s, DEMO.rate)[0]; if (it) navigateTo("movement", { id: it.id }); }
      else if (link?.kind === "run" && link.action === "kycForm") navigateTo("kycForm", { section: "id" });
      else if (link?.kind === "run" && link.action === "legal") navigateTo("legal", { doc: "bridgeTerms" });
      else if (link?.kind === "run" && link.action === "rail") { const a = gdb.get().s.auths.at(-1); if (a) navigateTo("rail", { id: a.id }); }
      else if (link?.kind === "run" && isConsoleAction(link.action)) CONSOLE_ACTIONS[link.action]();
      else if (link?.kind === "seed") gdb.seedActive();
    };
    Linking.getInitialURL().then(handle).catch(() => {});
    const sub = Linking.addEventListener("url", (e) => handle(e.url));
    return () => sub.remove();
  }, []);
  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle={scheme === "dark" ? "light-content" : "dark-content"} />
      <Navigator />
      <Banner content={notice ? { title: notice.title, body: notice.body, movementId: notice.ref ?? "" } : null}
        onPress={(b) => { gdb.dismissNotice(); if (b.movementId) navigateTo("movement", { id: b.movementId }); }} />
      {/* Modo explicativo: en el teléfono va arriba; en la vista web lo dibuja la escena, sobre el back office. */}
      {inStage ? null : <TraceOverlay tracer={tracer} />}
    </View>
  );
}
