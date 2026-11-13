import { BlurView } from "expo-blur";
import { type ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import type { FaceId } from "../hooks/useFaceId";
import { t } from "../i18n/es";
import { DrawCheck, Ico } from "./kit";
import { T } from "./primitives";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
type HudState = { ok: boolean; fail?: boolean; label: string } | null;

/**
 * Face ID de la demo. Con Face ID inscrito, el del sistema (iOS dibuja su propio HUD). Sin él (simulador sin inscribir),
 * el HUD del diseño: escaneo 1.25 s → palomita con `label` → se cierra a los 2.1 s. `node` va como último hijo de la pantalla.
 */
export function useFaceIdHud(faceId: FaceId): { node: ReactElement | null; auth: (label: string, reason: string, opts?: { fail?: boolean }) => Promise<boolean> } {
  const [hud, setHud] = useState<HudState>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const auth = useCallback(async (label: string, reason: string, opts?: { fail?: boolean }) => {
    // `fail`: escenario de demo «no te reconoció» (siempre con el HUD simulado, aunque haya Face ID real).
    if (faceId.available === true && !opts?.fail) return faceId.authenticate(reason);
    setHud({ ok: false, label: t("rc.faceId") });
    await sleep(1250);
    if (opts?.fail) {
      if (alive.current) setHud({ ok: false, fail: true, label: t("rc.faceIdFail") });
      await sleep(1100);
      if (alive.current) setHud(null);
      return false;
    }
    if (alive.current) setHud({ ok: true, label });
    await sleep(850);
    if (alive.current) setHud(null);
    return true;
  }, [faceId]);
  return { node: hud ? <Hud ok={hud.ok} fail={hud.fail} label={hud.label} /> : null, auth };
}

function Hud({ ok, fail, label }: { ok: boolean; fail?: boolean; label: string }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const scanO = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  useEffect(() => { Animated.timing(scanO, { toValue: ok || fail ? 0 : 1, duration: 250, useNativeDriver: true }).start(); }, [ok, fail, scanO]);
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 45, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: 156, height: 156, borderRadius: 30, overflow: "hidden", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <BlurView intensity={60} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(30,30,28,0.72)" }} />
        <View style={{ width: 64, height: 64 }}>
          <Animated.View style={{ position: "absolute", opacity: Animated.multiply(scanO, pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] })), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }}>
            <Ico name="faceIdNose" size={64} color="#FFFFFF" sw={1.3} />
          </Animated.View>
          {fail ? (
            <View style={{ position: "absolute", width: 64, height: 64, alignItems: "center", justifyContent: "center" }}>
              <Ico name="close" size={52} color="#FF8A8A" sw={2.4} />
            </View>
          ) : null}
          <View style={{ position: "absolute" }}>
            <DrawCheck drawn={ok} size={64} color="#FFFFFF" ringMs={500} checkMs={350} checkDelay={250} checkWidth={4} />
          </View>
        </View>
        <T w={500} s={15} color="#FFFFFF">{label}</T>
      </View>
    </View>
  );
}
