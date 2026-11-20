import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, View } from "react-native";
import { Ico, PrimaryButton, Spinner } from "../../ui/kit";
import { T } from "../../ui/primitives";
import { RADIUS } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import { cop, type Key, tr, usd } from "../copy";
import type { Authorization } from "../ledger";
import { gdb, useGdb } from "../store";
import { back, nav, SheetFrame, StateBlock } from "../ui";

/** Lo que tarda el lector en responder (ms). */
const READ_MS = 900;

/** Pagar con la tarjeta (pantalla 05): pago sin contacto. El empleado no escribe ningún monto: acerca el teléfono al lector y el
 *  comercio cobra lo suyo. En la demo, tocar «Simular lector» hace de terminal: cobra el siguiente comercio de la lista
 *  (`DEMO.merchants`) y muestra si se aprobó o se rechazó. */
export function PaySheet() {
  const { c } = useTheme();
  const { s, flags } = useGdb();
  const [reading, setReading] = useState(false);
  const [result, setResult] = useState<Authorization | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const tap = () => {
    if (reading) return;
    setReading(true);
    timer.current = setTimeout(() => { setResult(gdb.tapPay()); setReading(false); }, READ_MS);
  };

  if (result) {
    const okd = result.status !== "declined";
    const frozen = result.declineReason === "card_frozen" && s.card.status === "frozen";
    const amounts = [result.local === null ? null : cop(result.local), flags.showUsd || result.local === null ? usd(result.amount) : null].filter(Boolean).join(" · ");
    return (
      <SheetFrame title={tr("pay.title")} footer={(
        <>
          {okd ? <PrimaryButton label={tr("pay.details")} onPress={() => { back(); nav("movement", { id: result.id }); }} accessibilityLabel="pay-details" />
            : frozen ? <PrimaryButton label={tr("tx.unfreeze")} onPress={() => { gdb.freeze(false); setResult(null); }} accessibilityLabel="pay-unfreeze" /> : null}
          <Pressable onPress={back} accessibilityLabel="pay-done" style={{ height: 48, alignItems: "center", justifyContent: "center" }}>
            <T w={500} s={17} color={c.brand}>{tr("common.done")}</T>
          </Pressable>
        </>
      )}>
        <StateBlock kind={okd ? "ok" : "bad"} title={okd ? tr("pay.approved") : tr("pay.declined")}
          sub={okd ? `${result.merchant}\n${amounts}` : `${result.merchant} · ${tr(`pay.r.${result.declineReason ?? "insufficient_funds"}` as Key)}`} />
      </SheetFrame>
    );
  }

  return (
    <SheetFrame title={tr("pay.title")} footer={(
      <>
        <PrimaryButton label={tr(reading ? "pay.reading" : "pay.simulate")} icon={reading ? undefined : "nfc"} dim={reading} onPress={tap} accessibilityLabel="pay-tap" />
        <T w={400} s={13} color={c.ink40} style={{ textAlign: "center" }}>{tr("pay.demoNote")}</T>
      </>
    )}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 28, paddingVertical: 24 }}>
        <Pressable onPress={tap} accessibilityLabel="pay-reader" style={{ width: 220, height: 220, alignItems: "center", justifyContent: "center" }}>
          {reading ? null : [0, 1, 2].map((n) => <Ring key={n} delay={n * 600} color={c.brand} />)}
          <View style={{ width: 104, height: 104, borderRadius: RADIUS.pill, backgroundColor: c.cta, alignItems: "center", justifyContent: "center" }}>
            {reading ? <Spinner size={34} color={c.onCta} sw={3} /> : <Ico name="nfc" size={44} color={c.onCta} sw={1.9} />}
          </View>
        </Pressable>
        <View style={{ alignItems: "center", gap: 6, paddingHorizontal: 12 }}>
          <T w={600} s={24} lh={1.2} ls={-0.01} color={c.inkStrong} style={{ textAlign: "center" }}>{tr("pay.hold")}</T>
          <T w={400} s={16} lh={1.35} color={c.ink55} style={{ textAlign: "center" }}>{tr("pay.holdSub", { last4: s.card.last4 ?? "••••" })}</T>
        </View>
      </View>
    </SheetFrame>
  );
}

/** Onda del pago sin contacto: un anillo que crece y se desvanece, en bucle. */
function Ring({ delay, color }: { delay: number; color: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [delay, v]);
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", width: 104, height: 104, borderRadius: RADIUS.pill, borderWidth: 2, borderColor: color,
      opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.45, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] }) }] }} />
  );
}
