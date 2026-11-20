import { type ReactNode, useEffect, useRef } from "react";
import { Animated, Easing, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { CLARA_PATHS, CLARA_VIEW } from "./clara";
import { Ico, Wordmark } from "./kit";
import { T } from "./primitives";

/** Proporción ISO/IEC 7810 ID-1 (85.60 × 53.98 mm). */
export const CARD_RATIO = 85.6 / 53.98;
/** Radio de esquina ISO (3.18 mm) relativo al ancho. */
export const cardRadius = (w: number) => Math.round(w * (3.18 / 85.6) * 1.15);

/** Tinta y papel de la tarjeta: blanca con tinta casi negra, como la Clara × L'Oréal. */
export const CARD_INK = "#0F1C14";
const CARD_PAPER = ["#FFFFFF", "#F8F8F5", "#EEEEEA"] as const;
const SILVER = ["#E9E9E6", "#CFCFCB", "#ADADA8"] as const;

/**
 * Material de la tarjeta: blanco con un juego de líneas curvas muy tenues (como la tarjeta de Clara) y un filo gris.
 * Lo comparten frente y reverso. `emboss` dibuja las líneas.
 */
export function CardSurface({ width, children, emboss = true, style }: { width: number; children?: ReactNode; emboss?: boolean; style?: StyleProp<ViewStyle> }) {
  const h = width / CARD_RATIO;
  const r = cardRadius(width);
  const cx = width * 1.02, cy = h * 1.28;
  const rings = Array.from({ length: 10 }, (_, n) => h * 0.42 + n * h * 0.115);
  return (
    <View style={[{ width, height: h, borderRadius: r, overflow: "hidden", backgroundColor: CARD_PAPER[0] }, style]}>
      <Svg width={width} height={h} style={{ position: "absolute" }}>
        <Defs>
          <LinearGradient id="base" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={CARD_PAPER[0]} />
            <Stop offset="0.6" stopColor={CARD_PAPER[1]} />
            <Stop offset="1" stopColor={CARD_PAPER[2]} />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={h} fill="url(#base)" />
        {emboss ? (
          <G>
            {rings.map((rad) => <Circle key={rad} cx={cx} cy={cy} r={rad} fill="none" stroke={CARD_INK} strokeOpacity={0.09} strokeWidth={Math.max(0.6, width * 0.0028)} />)}
          </G>
        ) : null}
        <Rect x={0.5} y={0.5} width={width - 1} height={h - 1} rx={r - 0.5} fill="none" stroke={CARD_INK} strokeOpacity={0.14} />
      </Svg>
      {children}
    </View>
  );
}

/** Chip EMV plateado. */
export function Chip({ w = 42 }: { w?: number }) {
  const h = w * 0.76;
  return (
    <Svg width={w} height={h} viewBox="0 0 42 32">
      <Defs>
        <LinearGradient id="chip" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={SILVER[0]} />
          <Stop offset="0.5" stopColor={SILVER[1]} />
          <Stop offset="1" stopColor={SILVER[2]} />
        </LinearGradient>
      </Defs>
      <Rect x={0.5} y={0.5} width={41} height={31} rx={6} fill="url(#chip)" />
      <Path d="M0.5 11h12M0.5 21h12M29.5 11h12M29.5 21h12M12.5 0.5v31M29.5 0.5v31M12.5 16h17M21 0.5v7M21 24.5v7"
        stroke="#6F6F6A" strokeOpacity={0.5} strokeWidth={0.9} fill="none" />
      <Rect x={12.5} y={7.5} width={17} height={17} rx={3} fill="none" stroke="#6F6F6A" strokeOpacity={0.5} strokeWidth={0.9} />
    </Svg>
  );
}

/** Logo de Clara (emisor), de un solo color. */
export function ClaraLogo({ height, color = CARD_INK }: { height: number; color?: string }) {
  return (
    <Svg width={height * (CLARA_VIEW.w / CLARA_VIEW.h)} height={height} viewBox={`0 0 ${CLARA_VIEW.w} ${CLARA_VIEW.h}`} accessibilityLabel="Clara">
      {CLARA_PATHS.map((d) => <Path key={d} d={d} fill={color} fillRule="evenodd" clipRule="evenodd" />)}
    </Svg>
  );
}

/** Marca de red en la esquina inferior: los dos círculos de Mastercard. Clara emite en la red Mastercard; no hay otra opción. */
function Network({ size }: { size: number }) {
  const d = size * 1.5;
  return (
    <Svg width={d * 1.62} height={d} viewBox="0 0 162 100" accessibilityLabel="Mastercard">
      <Circle cx={50} cy={50} r={50} fill="#EB001B" />
      <Circle cx={112} cy={50} r={50} fill="#F79E1B" />
      <Path d="M81 10.8a50 50 0 0 1 0 78.400a50 50 0 0 1 0-78.400z" fill="#FF5F00" />
    </Svg>
  );
}

export type CardMode = "preview" | "issuing" | "muted" | "active";

/**
 * Frente de la tarjeta como colaboración (no marca blanca): Clara, el emisor, arriba a la izquierda; el nivel arriba a la derecha;
 * chip y contactless; y abajo el socio (`brand`: wordmark de Betterfly con su leyenda `partnerTag`) frente a la red.
 * `preview` la muestra tal como llegará (sin número); `issuing` le pasa un brillo mientras se emite; `muted` la apaga.
 */
export function CardFront({ width, mode, last4, holder, expiry, brand, tier, partnerTag, children }: {
  width: number; mode: CardMode; last4?: string | null; holder?: string | null; expiry?: string | null; /** Nombre del socio (accesibilidad). */ brand: string;
  tier?: string; partnerTag?: string; children?: ReactNode;
}) {
  const h = width / CARD_RATIO;
  const pad = Math.round(width * 0.062);
  const ink = { color: CARD_INK } as const;
  const full = width >= 240; // la miniatura de la promo omite leyenda, titular y vencimiento
  return (
    <CardSurface width={width} style={{ opacity: mode === "muted" ? 0.55 : 1 }}>
      <View style={{ position: "absolute", top: pad, left: pad, right: pad, bottom: pad, justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <ClaraLogo height={Math.max(10, Math.round(width * 0.074))} />
          {tier ? <T w={700} s={Math.max(8, Math.round(width * 0.042))} ls={-0.01} {...ink}>{tier}</T> : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: Math.round(width * 0.03) }}>
          <Chip w={Math.round(width * 0.118)} />
          <Ico name="nfc" size={Math.max(11, Math.round(width * 0.055))} color={CARD_INK} sw={1.9} />
        </View>
        <View style={{ gap: 4 }}>
          <T w={500} s={Math.round(width * 0.046)} ls={0.06} mono {...ink} style={{ opacity: last4 ? 0.9 : 0.5 }}>
            {`•••• •••• •••• ${last4 ?? "••••"}`}
          </T>
          {full && (holder || expiry) ? (
            <View style={{ flexDirection: "row", gap: 16, alignItems: "flex-end" }}>
              {holder ? <T w={500} s={10.5} ls={0.1} numberOfLines={1} {...ink} style={{ opacity: 0.7, flexShrink: 1 }}>{holder}</T> : null}
              {expiry ? <T w={500} s={10.5} ls={0.06} mono {...ink} style={{ opacity: 0.7 }}>{expiry}</T> : null}
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View accessibilityLabel={brand} style={{ gap: Math.max(2, Math.round(width * 0.012)) }}>
            <Wordmark height={Math.max(8, Math.round(width * 0.05))} color={CARD_INK} />
            {full && partnerTag ? (
              <View style={{ borderTopWidth: 1, borderTopColor: "#B9A46A", paddingTop: 3 }}>
                <T w={500} s={Math.max(6.5, width * 0.022)} ls={0.24} {...ink} style={{ opacity: 0.8 }}>{partnerTag.toUpperCase()}</T>
              </View>
            ) : null}
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
      <View style={{ position: "absolute", top: h * 0.11, left: 0, right: 0, height: h * 0.17, backgroundColor: CARD_INK, opacity: 0.9 }} />
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
            <Stop offset="0" stopColor={CARD_INK} stopOpacity="0" />
            <Stop offset="0.5" stopColor={CARD_INK} stopOpacity="0.08" />
            <Stop offset="1" stopColor={CARD_INK} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect width={band} height={height * 1.6} fill="url(#sheen)" />
      </Svg>
    </Animated.View>
  );
}

/** Sombra de objeto físico: larga y suave (la tarjeta es blanca). */
export const cardLift: ViewStyle = {
  shadowColor: CARD_INK, shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 12,
};
