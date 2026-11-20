import { Pressable, useWindowDimensions, View } from "react-native";
import { SafeAreaFrameContext, SafeAreaInsetsContext } from "react-native-safe-area-context";
import { tr } from "../gdb/copy";
import { FrameWidthContext } from "../gdb/frame";
import { gdb, type Office, useGdb } from "../gdb/store";
import { tracer } from "../gdb/trace";
import { TraceOverlay } from "../gdb/TraceOverlay";
import { Shell } from "../Shell";
import { T } from "../ui/primitives";
import { RADIUS } from "../ui/theme";
import { BackOffice } from "./BackOffice";

const PHONE_W = 390;
const INK = "#0F1C14";

/** Vista de demo en web: a la izquierda el back office donde la empresa invita y fondea; a la derecha el teléfono del empleado.
 *  Todo corre en la misma página y comparte el mismo estado en memoria (no hay backend). */
export function Stage() {
  const { height } = useWindowDimensions();
  const { flags } = useGdb();
  const phoneH = Math.max(560, Math.min(844, height - 48));
  return (
    <View style={{ flex: 1, flexDirection: "row", justifyContent: "center", gap: 32, padding: 24, backgroundColor: "#DEDBD0" }}>
      <View style={{ flex: 1, maxWidth: 920, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 36 }}>
          <T w={500} s={13} color="rgba(15,28,20,0.55)">{tr("bo.demo")}</T>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: "row", padding: 3, borderRadius: RADIUS.pill, backgroundColor: "rgba(15,28,20,0.08)" }}>
            {(["betterfly", "clara"] as const).map((o: Office) => (
              <Pressable key={o} onPress={() => gdb.setOffice(o)} accessibilityLabel={`office-${o}`}
                style={{ height: 30, paddingHorizontal: 14, borderRadius: RADIUS.pill, justifyContent: "center", backgroundColor: flags.office === o ? "#FFFFFF" : "transparent" }}>
                <T w={flags.office === o ? 600 : 500} s={13} color={INK}>{tr(o === "betterfly" ? "bo.s.betterfly" : "bo.s.clara")}</T>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => gdb.setExplain(!flags.explain)} accessibilityLabel="stage-explain" accessibilityState={{ selected: flags.explain }}
            style={{ height: 30, paddingHorizontal: 12, borderRadius: RADIUS.pill, justifyContent: "center", backgroundColor: flags.explain ? INK : "rgba(15,28,20,0.08)" }}>
            <T w={600} s={13} color={flags.explain ? "#FFFFFF" : INK}>{tr("trace.toggle")}</T>
          </Pressable>
          <Pressable onPress={() => gdb.setLang(flags.lang === "en" ? "es" : "en")} accessibilityLabel="stage-lang" style={{ height: 36, paddingHorizontal: 10, justifyContent: "center" }}>
            <T w={500} s={13} color={INK}>{flags.lang === "en" ? "ES" : "EN"}</T>
          </Pressable>
          <Pressable onPress={() => gdb.reset()} accessibilityLabel="stage-reset" style={{ height: 36, paddingHorizontal: 10, justifyContent: "center" }}>
            <T w={500} s={13} color={INK}>{tr("con.reset")}</T>
          </Pressable>
        </View>
        <BackOffice />
      </View>
      <View style={{ width: PHONE_W + 20, height: phoneH + 20 }}>
      {/* Modo explicativo: junto al teléfono, a su izquierda, para leerlo sin cruzar la pantalla. */}
      <TraceOverlay tracer={tracer} anchor={{ right: PHONE_W + 20 + 14, top: 64, width: 400 }} />
      <View style={{ width: PHONE_W + 20, height: phoneH + 20, borderRadius: 54, borderWidth: 10, borderColor: INK, backgroundColor: INK, overflow: "hidden",
        shadowColor: INK, shadowOpacity: 0.28, shadowRadius: 40, shadowOffset: { width: 0, height: 24 } }}>
        <View style={{ flex: 1, borderRadius: 44, overflow: "hidden" }}>
          <FrameWidthContext.Provider value={PHONE_W}>
            <SafeAreaFrameContext.Provider value={{ x: 0, y: 0, width: PHONE_W, height: phoneH }}>
              <SafeAreaInsetsContext.Provider value={{ top: 50, bottom: 26, left: 0, right: 0 }}>
                <Shell />
              </SafeAreaInsetsContext.Provider>
            </SafeAreaFrameContext.Provider>
          </FrameWidthContext.Provider>
          {/* Barra de estado e isla, sólo de adorno */}
          <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 50, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 112, height: 32, borderRadius: RADIUS.pill, backgroundColor: "#000000" }} />
          </View>
        </View>
      </View>
      </View>
    </View>
  );
}
