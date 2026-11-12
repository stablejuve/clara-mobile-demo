import { type ReactNode, useEffect, useRef } from "react";
import { Animated, Easing, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { ISOTYPE, Ico } from "./kit";
import { T } from "./primitives";
import { F, RL } from "./theme";

/** Proporción ISO/IEC 7810 ID-1 (85.60 × 53.98 mm). */
export const CARD_RATIO = 85.6 / 53.98;
/** Radio de esquina ISO (3.18 mm) relativo al ancho. */
export const cardRadius = (w: number) => Math.round(w * (3.18 / 85.6) * 1.15);

const CHAMPAGNE = ["#E6D9B4", "#C7B485", "#9F8C5C"] as const;

/**
 * Material de la tarjeta: verde petróleo con luz arriba a la izquierda, el isotipo de Relayer
 * grabado en gran formato (sale por el borde) y un filo de luz. Lo comparten frente y reverso.
 */
export function CardSurface({ width, children, emboss = true, style }: { width: number; children?: ReactNode; emboss?: boolean; style?: StyleProp<ViewStyle> }) {
  const h = width / CARD_RATIO;
  const r = cardRadius(width);
  const isoH = h * 1.55;
  const isoW = isoH * (500 / 638);
  return (
    <View style={[{ width, height: h, borderRadius: r, overflow: "hidden", backgroundColor: RL.petrolDeep }, style]}>
      <Svg width={width} height={h} style={{ position: "absolute" }}>
        <Defs>
          <LinearGradient id="base" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#0A4A40" />
            <Stop offset="0.55" stopColor={RL.petrolDeep} />
            <Stop offset="1" stopColor="#00140F" />
          </LinearGradient>
          <RadialGradient id="light" cx="0.12" cy="0" r="0.9" fx="0.12" fy="0">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.16" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="iso" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={RL.cream} stopOpacity="0.10" />
            <Stop offset="1" stopColor={RL.cream} stopOpacity="0.03" />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={h} fill="url(#base)" />
        {emboss ? (
          <G transform={`translate(${width - isoW * 0.62}, ${-h * 0.18}) scale(${isoH / 638})`}>
            <Path d={ISOTYPE} fill="url(#iso)" />
          </G>
        ) : null}
        <Rect width={width} height={h} fill="url(#light)" />
        <Rect x={0.5} y={0.5} width={width - 1} height={h - 1} rx={r - 0.5} fill="none" stroke="#FFFFFF" strokeOpacity={0.1} />
      </Svg>
      {children}
    </View>
  );
}

/** Chip EMV en champaña. */
export function Chip({ w = 42 }: { w?: number }) {
  const h = w * 0.76;
  return (
    <Svg width={w} height={h} viewBox="0 0 42 32">
      <Defs>
        <LinearGradient id="chip" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={CHAMPAGNE[0]} />
          <Stop offset="0.5" stopColor={CHAMPAGNE[1]} />
          <Stop offset="1" stopColor={CHAMPAGNE[2]} />
        </LinearGradient>
      </Defs>
      <Rect x={0.5} y={0.5} width={41} height={31} rx={6} fill="url(#chip)" />
      <Path d="M0.5 11h12M0.5 21h12M29.5 11h12M29.5 21h12M12.5 0.5v31M29.5 0.5v31M12.5 16h17M21 0.5v7M21 24.5v7"
        stroke="#7A6A42" strokeOpacity={0.55} strokeWidth={0.9} fill="none" />
      <Rect x={12.5} y={7.5} width={17} height={17} rx={3} fill="none" stroke="#7A6A42" strokeOpacity={0.55} strokeWidth={0.9} />
    </Svg>
  );
}

/** Wordmark VISA en cursiva gruesa, como la marca de red en la esquina inferior. */
function Network({ size }: { size: number }) {
  return <T w={800} s={size} ls={0.01} color={RL.cream} style={{ fontFamily: F.xb, lineHeight: size * 1.05 }}>VISA</T>;
}

export type CardMode = "preview" | "issuing" | "muted" | "active";

/**
 * Frente de la tarjeta. `preview` la muestra tal como llegará (sin número); `issuing` le pasa
 * un brillo mientras se emite; `muted` la apaga (datos por reconfirmar).
 */
export function CardFront({ width, mode, last4, holder, expiry, brand, children }: {
  width: number; mode: CardMode; last4?: string | null; holder?: string | null; expiry?: string | null; brand: string; children?: ReactNode;
}) {
  const h = width / CARD_RATIO;
  const pad = Math.round(width * 0.062);
  const ink = { color: RL.cream } as const;
  return (
    <CardSurface width={width} style={{ opacity: mode === "muted" ? 0.55 : 1 }}>
      <View style={{ position: "absolute", top: pad, left: pad, right: pad, bottom: pad, justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <T w={600} s={Math.max(9, Math.round(width * 0.047))} ls={-0.01} {...ink}>{brand}</T>
          <View style={{ opacity: 0.75 }}><Ico name="nfc" size={Math.max(12, Math.round(width * 0.055))} color={RL.cream} sw={1.7} /></View>
        </View>
        <View style={{ marginTop: -h * 0.02 }}><Chip w={Math.round(width * 0.118)} /></View>
        <T w={500} s={Math.round(width * 0.05)} ls={0.06} mono {...ink} style={{ opacity: last4 ? 0.95 : 0.55 }}>
          {`•••• •••• •••• ${last4 ?? "••••"}`}
        </T>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View style={{ flexDirection: "row", gap: 22, alignItems: "flex-end", flexShrink: 1 }}>
            {holder ? <T w={500} s={11} ls={0.1} numberOfLines={1} {...ink} style={{ opacity: 0.8, flexShrink: 1 }}>{holder}</T> : null}
            {expiry ? <T w={500} s={11} ls={0.06} mono {...ink} style={{ opacity: 0.8 }}>{expiry}</T> : null}
          </View>
          <Network size={Math.round(width * 0.068)} />
        </View>
      </View>
      {mode === "issuing" ? <Sheen width={width} height={h} /> : null}
      {children}
    </CardSurface>
  );
}

/** Reverso: banda magnética, número completo, vencimiento y CVV. */
export function CardBack({ width, children }: { width: number; children?: ReactNode }) {
  const h = width / CARD_RATIO;
  const pad = Math.round(width * 0.062);
  return (
    <CardSurface width={width} emboss={false}>
      <View style={{ position: "absolute", top: h * 0.11, left: 0, right: 0, height: h * 0.17, backgroundColor: "#000", opacity: 0.55 }} />
      <View style={{ position: "absolute", left: pad, right: pad, bottom: pad, gap: 14 }}>{children}</View>
    </CardSurface>
  );
}

/** Brillo diagonal que recorre la tarjeta mientras se emite. */
function Sheen({ width, height }: { width: number; height: number }) {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(x, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.delay(250),
      Animated.timing(x, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [x]);
  const band = width * 0.5;
  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [-band * 1.6, width + band * 0.6] });
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", top: -height * 0.3, width: band, height: height * 1.6, transform: [{ translateX }, { rotate: "18deg" }] }}>
      <Svg width={band} height={height * 1.6}>
        <Defs>
          <LinearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.16" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect width={band} height={height * 1.6} fill="url(#sheen)" />
      </Svg>
    </Animated.View>
  );
}

/** Sombra de objeto físico: larga, suave y teñida del color de la tarjeta. */
export const cardLift: ViewStyle = {
  shadowColor: "#00140F", shadowOpacity: 0.32, shadowRadius: 22, shadowOffset: { width: 0, height: 16 }, elevation: 14,
};
