import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { tr } from "../gdb/copy";
import { cardShadow } from "../ui/kit";
import { T } from "../ui/primitives";
import { BF, F, RADIUS } from "../ui/theme";
import { useTheme } from "../ui/ThemeProvider";

// Detalles de la interfaz de Betterfly para la app anfitriona (demo interna): la mariposa de las Betterflies, sus etiquetas
// de color, la píldora de contadores de la cabecera, el nivel y la tarjeta de desafío. Referencia: capturas de su app en el App Store.

/** Mariposa de cuatro lóbulos con la que la app marca las Betterflies. */
export function ButterflyGlyph({ size = 18, color = BF.green }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={7.2} cy={8.4} r={5.4} fill={color} />
      <Circle cx={16.8} cy={8.4} r={5.4} fill={color} />
      <Circle cx={8.6} cy={16.4} r={4.1} fill={color} />
      <Circle cx={15.4} cy={16.4} r={4.1} fill={color} />
      <Rect x={9} y={8} width={6} height={9} fill={color} />
    </Svg>
  );
}

/** Moneda lima de la cabecera. */
function CoinGlyph({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9.5} fill={BF.lime} stroke="#B9CC00" strokeWidth={2} />
    </Svg>
  );
}

/** Escudo cian de la cobertura. */
function ShieldGlyph({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2.5 20 5.5v6c0 4.9-3.3 8.6-8 10.4-4.7-1.8-8-5.5-8-10.4v-6z" fill={BF.cyan} stroke="#2CC7B0" strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

export type BfTagTone = "lime" | "pink" | "cyan" | "mint" | "green";

/** Etiqueta en mayúsculas sobre color pleno, como las de sus desafíos y beneficios. */
export function BfTag({ label, tone, style }: { label: string; tone: BfTagTone; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, backgroundColor: BF[tone] }, style]}>
      <T w={700} s={10.5} lh={1.1} ls={0.04} color={BF.ink}>{label.toUpperCase()}</T>
    </View>
  );
}

/** Contador de Betterflies, compacto, para la cabecera de Inicio. */
export function BetterfliesPill({ count }: { count: string }) {
  const { c } = useTheme();
  return (
    <View accessibilityLabel={`Betterflies: ${count}`} style={{ height: 28, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 5, borderRadius: RADIUS.pill, backgroundColor: c.card }}>
      <ButterflyGlyph size={15} />
      <T w={600} s={13} color={c.inkStrong} style={{ fontVariant: ["tabular-nums"] }}>{count}</T>
    </View>
  );
}

/** Píldora «NIVEL n» en verde brillante. */
export function LevelPill({ level }: { level: number }) {
  return (
    <View style={{ height: 24, paddingHorizontal: 10, borderRadius: RADIUS.pill, backgroundColor: BF.green, justifyContent: "center" }}>
      <T w={700} s={11} ls={0.06} color={BF.ink}>{tr("bf.level", { n: level }).toUpperCase()}</T>
    </View>
  );
}

/** Cabecera de contadores: avatar, Betterflies, monedas y cobertura; a la derecha, «Canjear». */
export function StatsPill({ initials, betterflies, coins, coverage }: { initials: string; betterflies: string; coins: string; coverage: string }) {
  const { c, scheme } = useTheme();
  const stat = (glyph: ReactNode, value: string, label: string) => (
    <View accessibilityLabel={`${label}: ${value}`} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      {glyph}
      <T w={600} s={14} color={c.inkStrong} style={{ fontVariant: ["tabular-nums"] }}>{value}</T>
    </View>
  );
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 14, height: 56, paddingLeft: 6, paddingRight: 8, borderRadius: RADIUS.pill, backgroundColor: c.card }, cardShadow(scheme)]}>
      <View style={{ width: 44, height: 44, borderRadius: RADIUS.pill, backgroundColor: BF.mint, borderWidth: 2, borderColor: BF.green, alignItems: "center", justifyContent: "center" }}>
        <T w={700} s={14} color={BF.ink}>{initials}</T>
      </View>
      {stat(<ButterflyGlyph />, betterflies, tr("bf.stat.betterflies"))}
      {stat(<CoinGlyph />, coins, tr("bf.stat.coins"))}
      {stat(<ShieldGlyph />, coverage, tr("bf.stat.coverage"))}
      <View style={{ flex: 1 }} />
      <View style={{ paddingHorizontal: 12, height: 32, borderRadius: RADIUS.pill, backgroundColor: c.cta, justifyContent: "center" }}>
        <T w={600} s={13} color={c.onCta}>{tr("home.redeem")}</T>
      </View>
    </View>
  );
}

/** Desafío de caminata: etiquetas, titular condensado, avance de pasos y la recompensa en Betterflies. */
export function ChallengeCard({ steps, goal, reward }: { steps: number; goal: number; reward: number }) {
  const { c, scheme } = useTheme();
  const pct = Math.min(1, steps / goal);
  const r = 24, len = 2 * Math.PI * r;
  const fmt = (n: number) => n.toLocaleString("en-US");
  return (
    <View style={{ borderRadius: 20, padding: 18, gap: 14, backgroundColor: scheme === "dark" ? c.elev : BF.ink, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        <BfTag label={tr("bf.challenge.tagWalk")} tone="lime" />
        <BfTag label={tr("bf.challenge.tagJoined")} tone="pink" />
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <T s={30} lh={1} color="#FFFFFF" style={{ fontFamily: F.display }}>{tr("bf.challenge.title")}</T>
          <T w={400} s={14} color="rgba(247,245,235,0.72)">{tr("home.steps", { n: fmt(steps), goal: fmt(goal) })}</T>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 2 }}>
            <T w={600} s={15} color="#FFFFFF">{tr("bf.challenge.reward", { n: reward })}</T>
            <ButterflyGlyph size={17} />
          </View>
        </View>
        <View style={{ width: 60, height: 60, alignItems: "center", justifyContent: "center" }}>
          <Svg width={60} height={60} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
            <Circle cx={30} cy={30} r={r} stroke="rgba(247,245,235,0.16)" strokeWidth={5} fill="none" />
            <Circle cx={30} cy={30} r={r} stroke={BF.green} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={`${len}`} strokeDashoffset={len * (1 - pct)} />
          </Svg>
          <T w={700} s={14} color="#FFFFFF" style={{ fontVariant: ["tabular-nums"] }}>{Math.round(pct * 100)}%</T>
        </View>
      </View>
    </View>
  );
}
