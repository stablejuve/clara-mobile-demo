import { useEffect, useRef } from "react";
import { Animated, Pressable, View } from "react-native";
import type { AppCtx } from "../../ctx";
import { useNow } from "../../hooks/useNow";
import { useTween } from "../../hooks/useTween";
import { t } from "../../i18n/es";
import { EASE_IOS, Eyebrow, Ico, type IcoName, PoweredLabel, Press } from "../../ui/kit";
import { LargeTitleScreen } from "../../ui/LargeTitle";
import { T } from "../../ui/primitives";
import { RADIUS } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import { movementMxnCents, movementSub, movementTitle } from "../display";
import { DEMO_RATE, formatCents, usdcToMxnCents } from "../money";
import { useRate } from "../../hooks/useRate";
import { RateBadge } from "./rateBadge";
import type { Movement } from "../types";

const ROW_H = 62.5;

/** Saldo de Recibo: cifra grande que corre, Tarjeta / Transferir y movimientos que entran desplegándose. */
export function BalanceScreen({ nav, module }: AppCtx) {
  const { c } = useTheme();
  const { state, movements } = module;
  const shown = useTween(state.balanceUsdcCents);
  const live = useRate(module.api, DEMO_RATE);
  const now = useNow(60_000);
  // Los movimientos que ya estaban al abrir no se animan; los que llegan después sí.
  const initial = useRef(new Set(movements.map((m) => m.id))).current;
  return (
    <LargeTitleScreen title={t("rc.name")} back={t("tab.benefits")} titleGap={0}>
      <View style={{ paddingTop: 34, paddingHorizontal: 20, paddingBottom: 30, alignItems: "center", gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <T w={600} s={formatCents(usdcToMxnCents(shown, live.rate)).length > 9 ? 48 : 56} lh={1} ls={-0.035} color={c.inkStrong} style={{ fontVariant: ["tabular-nums"] }} accessibilityLabel="balance-mxn">${formatCents(usdcToMxnCents(shown, live.rate))}</T>
          <T w={500} s={15} color={c.ink40}>MXN</T>
        </View>
        <T w={400} s={14} mono color={c.ink55} accessibilityLabel="balance-usdc">≈ {formatCents(shown)} USDC</T>
        <View style={{ paddingTop: 4 }}><RateBadge live={live} /></View>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 40, paddingBottom: 32 }}>
        <Action icon="card" label={t("rc.card")} onPress={() => nav("card")} />
        <Action icon="arrowUpRight" label={t("rc.transfer")} onPress={() => nav("send")} />
      </View>
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        <Eyebrow style={{ paddingHorizontal: 4 }}>{t("rc.movements")}</Eyebrow>
        {movements.length === 0 ? (
          <View style={{ paddingVertical: 36, paddingHorizontal: 16, borderRadius: RADIUS.card, backgroundColor: c.card, alignItems: "center" }}>
            <T w={400} s={15} color={c.ink40}>{t("rc.noMovements")}</T>
          </View>
        ) : (
          <View style={{ borderRadius: RADIUS.card, backgroundColor: c.card, overflow: "hidden" }}>
            {movements.map((m) => (
              <EnterRow key={m.id} animate={!initial.has(m.id)}>
                <MovementRow m={m} title={movementTitle(m)} sub={movementSub(m, now)} onPress={() => nav("movement", { id: m.id })} />
              </EnterRow>
            ))}
          </View>
        )}
        <Pressable onLongPress={() => nav("demoPanel")} delayLongPress={5000} accessibilityLabel="powered-by-relayer" style={{ paddingTop: 18 }}>
          <PoweredLabel />
        </Pressable>
      </View>
    </LargeTitleScreen>
  );
}

function Action({ icon, label, onPress }: { icon: IcoName; label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Press scale={0.94} onPress={onPress} accessibilityLabel={`action-${icon}`} style={{ alignItems: "center", gap: 8 }}>
      <View style={{ width: 58, height: 58, borderRadius: RADIUS.pill, backgroundColor: c.brand, alignItems: "center", justifyContent: "center" }}>
        <Ico name={icon} size={24} color={c.onBrand} sw={1.9} />
      </View>
      <T w={500} s={13} color={c.inkStrong}>{label}</T>
    </Press>
  );
}

/** Fila que entra desplegándose (alto 0 → fila, 500 ms) y aparece (400 ms tras 120 ms). */
function EnterRow({ animate, children }: { animate: boolean; children: React.ReactNode }) {
  const h = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const o = useRef(new Animated.Value(animate ? 0 : 1)).current;
  useEffect(() => {
    if (!animate) return;
    Animated.parallel([
      Animated.timing(h, { toValue: 1, duration: 500, easing: EASE_IOS, useNativeDriver: false }),
      Animated.timing(o, { toValue: 1, duration: 400, delay: 120, useNativeDriver: false }),
    ]).start();
  }, [animate, h, o]);
  return <Animated.View style={{ height: h.interpolate({ inputRange: [0, 1], outputRange: [0, ROW_H] }), opacity: o, overflow: "hidden" }}>{children}</Animated.View>;
}

export function MovementRow({ m, title, sub, onPress }: { m: Movement; title: string; sub: string; onPress: () => void }) {
  const { c } = useTheme();
  const isIn = m.kind === "deposit";
  return (
    <Pressable onPress={onPress} accessibilityLabel={`movement-${m.id}`}
      style={({ pressed }) => ({ height: ROW_H, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: c.ink08, backgroundColor: pressed ? c.ink04 : "transparent" })}>
      <View style={{ width: 38, height: 38, borderRadius: RADIUS.pill, backgroundColor: c.ink08, alignItems: "center", justifyContent: "center" }}>
        {m.kind === "card" ? <Ico name="card" size={18} color={c.ink72} sw={1.9} />
          : <Ico name="arrowDownLeft" size={18} color={isIn ? c.settled : c.ink72} sw={2} style={isIn ? undefined : { transform: [{ rotate: "180deg" }] }} />}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <T w={500} s={16} color={c.inkStrong} numberOfLines={1}>{title}</T>
        <T w={400} s={13} color={c.ink55}>{sub}</T>
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <T w={500} s={15} mono color={isIn ? c.settled : m.status === "failed" ? c.ink40 : c.inkStrong} style={m.status === "failed" && m.kind === "card" ? { textDecorationLine: "line-through" } : undefined}>{isIn ? "+" : "−"}${formatCents(movementMxnCents(m))}</T>
        <T w={400} s={11.5} mono color={c.ink40}>{formatCents(m.amountUsdcCents)} USDC</T>
      </View>
    </Pressable>
  );
}
