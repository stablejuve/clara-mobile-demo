import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { Animated, Easing, Pressable, type StyleProp, View, type ViewStyle } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { t } from "../i18n/es";
import { T } from "./primitives";
import { RADIUS, RL } from "./theme";
import { useTheme } from "./ThemeProvider";

// Kit del diseño «Recibo Minimal»: los SVG son los trazos exactos del archivo de diseño (lucide, viewBox 24).

/** Curva de iOS que el diseño usa en pilas, hojas y carriles: cubic-bezier(.32,.72,0,1). */
export const EASE_IOS = Easing.bezier(0.32, 0.72, 0, 1);

const ICON_PATHS = {
  chevronRight: ["m9 18 6-6-6-6"],
  chevronLeft: ["m15 18-6-6 6-6"],
  card: ["M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z", "M2 10h20"],
  arrowUpRight: ["M7 7h10v10", "M7 17 17 7"],
  arrowDownLeft: ["M17 7 7 17", "M17 17H7V7"],
  nfc: ["M6 8.32a7.43 7.43 0 0 1 0 7.36", "M9.46 6.21a11.76 11.76 0 0 1 0 11.58", "M12.91 4.1a15.91 15.91 0 0 1 .01 15.8", "M16.37 2a20.16 20.16 0 0 1 0 20"],
  freeze: ["M12 2v20M4.9 4.9l14.2 14.2M2 12h20M4.9 19.1 19.1 4.9"],
  wallet: ["M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1", "M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"],
  check: ["M20 6 9 17l-5-5"],
  plus: ["M5 12h14", "M12 5v14"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M5 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
  eye: ["M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0", "M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0"],
  gauge: ["m12 14 4-4", "M3.34 19a10 10 0 1 1 17.32 0"],
  bag: ["M16 10a4 4 0 0 1-8 0", "M3.103 6.034h17.794", "M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"],
  faceId: ["M3 7V5a2 2 0 0 1 2-2h2", "M17 3h2a2 2 0 0 1 2 2v2", "M21 17v2a2 2 0 0 1-2 2h-2", "M7 21H5a2 2 0 0 1-2-2v-2", "M8 14s1.5 2 4 2 4-2 4-2", "M9 9h.01", "M15 9h.01"],
  faceIdNose: ["M3 7V5a2 2 0 0 1 2-2h2", "M17 3h2a2 2 0 0 1 2 2v2", "M21 17v2a2 2 0 0 1-2 2h-2", "M7 21H5a2 2 0 0 1-2-2v-2", "M8 14s1.5 2 4 2 4-2 4-2", "M9 9h.01", "M15 9h.01", "M12 9v3"],
  globe: ["M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0", "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20", "M2 12h20"],
  banknote: ["M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z", "M10 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0", "M6 12h.01M18 12h.01"],
  landmark: ["M3 22h18", "M6 18v-7", "M10 18v-7", "M14 18v-7", "M18 18v-7", "M12 2 20 7H4z"],
  gift: ["M4 8h16a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z", "M12 8v13", "M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7", "M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"],
  home: ["M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"],
  user: ["M7 8a5 5 0 1 0 10 0a5 5 0 1 0-10 0", "M20 21a8 8 0 0 0-16 0"],
  shield: ["M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"],
  activity: ["M22 12h-4l-3 9L9 3l-3 9H2"],
  close: ["M18 6 6 18", "m6 6 12 12"],
  swap: ["m16 3 4 4-4 4", "M20 7H4", "m8 21-4-4 4-4", "M4 17h16"],
  camera: ["M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z", "M9 13a3 3 0 1 0 6 0a3 3 0 1 0-6 0"],
  sparkles: ["M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5A2 2 0 0 0 15.5 9.94l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z", "M20 3v4", "M22 5h-4"],
  idCard: ["M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z", "M16 10h2", "M16 14h2", "M6.17 15a3 3 0 0 1 5.66 0", "M7 11a2 2 0 1 0 4 0a2 2 0 1 0-4 0"],
  mapPin: ["M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0", "M9 10a3 3 0 1 0 6 0a3 3 0 1 0-6 0"],
  briefcase: ["M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16", "M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"],
  image: ["M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z", "M7 9a2 2 0 1 0 4 0a2 2 0 1 0-4 0", "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"],
  alert: ["M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0", "M12 8v4", "M12 16h.01"],
} as const;
export type IcoName = keyof typeof ICON_PATHS;

export function Ico({ name, size = 20, color, sw = 2, style }: { name: IcoName; size?: number; color: string; sw?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      {ICON_PATHS[name].map((d) => <Path key={d} d={d} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />)}
    </Svg>
  );
}

/** Isotipo de Relayer (assets/relayer-isotype-white.svg del diseño), 500×638. */
export const ISOTYPE = "M239.602 303.849C239.831 389.43 238.615 475.081 239.355 560.68C239.426 568.252 240.712 577.057 240.395 584.699C239.972 595.054 235.796 595.775 227.55 599.72C206.002 610.021 182.321 620.112 160.262 629.497C155.24 631.628 141.532 638.531 137.11 637.967C135.048 637.703 131.56 635.132 129.516 633.952C103.668 619.037 77.1864 600.09 51.885 583.783C46.5287 580.332 37.3137 577.726 36.5737 571.228C34.8999 556.753 36.3975 534.583 36.5561 519.281C37.9128 382.034 39.4457 244.593 39.5338 107.153L1.26448 46.4357C-0.462219 42.861 -0.72651 38.4411 2.42736 35.606L91.8281 0L96.0039 0.739591L498.378 206.68C500.844 209.744 499.77 214.798 499.752 218.514L479.578 321.317C477.816 324.258 471.032 327.234 467.843 328.801C446.912 339.049 424.359 346.428 403.321 356.536L398.723 357.275C355.608 335.704 313.744 311.526 271.422 288.423L239.602 303.849ZM483.542 215.256L93.2905 14.8975H90.4186L26.0021 40.4486L27.2355 42.5969L409.523 251.373L414.051 251.056L483.525 215.274L483.542 215.256ZM53.876 74.0647V153.324L390.917 338.134L393.014 336.655L403.832 266.675L403.268 264.28L63.179 77.7275L53.876 74.0471V74.0647ZM132.687 618.756L138.079 216.665L53.876 170.123C51.885 220.468 53.2945 271.025 52.9597 321.475C52.9421 324.222 51.9378 326.582 51.9202 329.083C51.374 407.884 51.515 486.651 50.9864 565.452L51.9554 567.354L132.687 618.756ZM255.724 279.653L152.879 223.92L150.959 329.593L255.724 279.653Z";

/** Cuadro petróleo con el isotipo blanco (tarjeta de Beneficios, intro del alta, banner). `object-fit: contain` en un cuadro `glyph`. */
export function Isotype({ box, glyph, radius = RADIUS.card }: { box: number; glyph: number; radius?: number }) {
  return (
    <View style={{ width: box, height: box, borderRadius: radius, backgroundColor: RL.petrol, alignItems: "center", justifyContent: "center" }}>
      <Svg width={glyph * (500 / 638)} height={glyph} viewBox="0 0 500 638"><Path d={ISOTYPE} fill="#FFFFFF" /></Svg>
    </View>
  );
}

/** Arco que gira (`animation: spin .8s linear infinite`). */
export function Spinner({ size = 16, color, sw = 2.4 }: { size?: number; color: string; sw?: number }) {
  const rot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(rot, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [rot]);
  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M12 3a9 9 0 1 0 9 9" stroke={color} strokeWidth={sw} strokeLinecap="round" /></Svg>
    </Animated.View>
  );
}

/** Pressable con el `style-active` del diseño (escala al tocar). */
export function Press({ onPress, onLongPress, delayLongPress, disabled, style, scale = 0.97, pressedStyle, children, accessibilityLabel }: {
  onPress?: () => void; onLongPress?: () => void; delayLongPress?: number; disabled?: boolean; style?: StyleProp<ViewStyle>; scale?: number;
  pressedStyle?: StyleProp<ViewStyle>; children?: ReactNode; accessibilityLabel?: string;
}) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} onLongPress={onLongPress} delayLongPress={delayLongPress} accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [style, pressed && !disabled ? [{ transform: [{ scale }] }, pressedStyle] : null]}>
      {children}
    </Pressable>
  );
}

/** Botón principal: pill de 52, petróleo (crema en dark), 17/600. `dim` = opacidad .35 y sin acción. */
export function PrimaryButton({ label, onPress, dim, icon, size = 17, height = 52, style, accessibilityLabel }: {
  label: string; onPress?: () => void; dim?: boolean; icon?: IcoName; size?: number; height?: number; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  const o = useAnimatedNumber(dim ? 0.35 : 1, 250);
  return (
    <Press onPress={onPress} disabled={dim} accessibilityLabel={accessibilityLabel ?? label} style={style}>
      <Animated.View style={{ height, borderRadius: RADIUS.pill, backgroundColor: c.cta, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, opacity: o }}>
        {icon ? <Ico name={icon} size={20} color={c.onCta} sw={1.9} /> : null}
        <T w={600} s={size} color={c.onCta}>{label}</T>
      </Animated.View>
    </Press>
  );
}

/** Valor animado que sigue a `to` con timing (opacidades, colores numéricos). */
export function useAnimatedNumber(to: number, duration: number, easing: (v: number) => number = Easing.linear, native = false): Animated.Value {
  const v = useRef(new Animated.Value(to)).current;
  useEffect(() => { Animated.timing(v, { toValue: to, duration, easing, useNativeDriver: native }).start(); }, [to, duration, easing, native, v]);
  return v;
}

/** Switch iOS 51×31 del diseño: fondo marca/ink-15, perilla blanca de 27 que se desliza 20 px. */
export function Toggle({ on, onChange, accessibilityLabel }: { on: boolean; onChange: (v: boolean) => void; accessibilityLabel?: string }) {
  const { c } = useTheme();
  const x = useAnimatedNumber(on ? 1 : 0, 300, EASE_IOS);
  const bg = x.interpolate({ inputRange: [0, 1], outputRange: [c.ink15, c.brand] });
  return (
    <Pressable onPress={() => onChange(!on)} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={accessibilityLabel} hitSlop={6}>
      <Animated.View style={{ width: 51, height: 31, borderRadius: RADIUS.pill, backgroundColor: bg }}>
        <Animated.View style={{
          position: "absolute", top: 2, left: 2, width: 27, height: 27, borderRadius: RADIUS.pill, backgroundColor: "#FFFFFF",
          shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 2,
          transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }],
        }} />
      </Animated.View>
    </Pressable>
  );
}

/** Eyebrow mono 10.5/500, tracking .08em, mayúsculas, ink-55 (el `padding:0 4px` de las secciones lo pone quien lo usa). */
export function Eyebrow({ children, color, style }: { children: string; color?: string; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <View style={style}><T w={500} s={10.5} ls={0.08} mono color={color ?? c.ink55}>{children.toUpperCase()}</T></View>;
}

/** «powered by Relayer»: mono 9.5, tracking .1em, ink-25. */
export function PoweredLabel() {
  const { c } = useTheme();
  return <T w={500} s={9.5} ls={0.1} mono color={c.ink25} style={{ textAlign: "center" }}>{t("common.poweredBy").toUpperCase()}</T>;
}

/** Grupo inset: tarjeta blanca radio 6 con filas; `Hairline` entre filas (0.5 px, ink-15, con sangría). */
export function Group({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <View style={[{ borderRadius: RADIUS.card, backgroundColor: c.card, overflow: "hidden" }, style]}>{children}</View>;
}
export function Hairline({ inset = 16, color }: { inset?: number; color?: string }) {
  const { c } = useTheme();
  return <View style={{ height: 0.5, backgroundColor: color ?? c.ink15, marginLeft: inset }} />;
}

/** Asa de las hojas: 36×5, ink-15. */
export function Grabber() {
  const { c } = useTheme();
  return <View style={{ alignItems: "center", paddingTop: 6 }}><View style={{ width: 36, height: 5, borderRadius: RADIUS.pill, backgroundColor: c.ink15 }} /></View>;
}

/** Botón ✕ redondo de 30 (ink-08, glifo ink-55). */
export function CloseButton({ onPress }: { onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityLabel="close"
      style={{ width: 30, height: 30, borderRadius: RADIUS.pill, backgroundColor: c.ink08, alignItems: "center", justifyContent: "center" }}>
      <Ico name="close" size={14} color={c.ink55} sw={2.6} />
    </Pressable>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Círculo que se dibuja + palomita (wallet lista, transferencia, HUD). viewBox 80; anillo r34, dash 214; check dash 48. */
export function DrawCheck({ drawn, size = 96, color, ringMs = 700, checkMs = 450, checkDelay = 450, checkWidth = 3.5 }: {
  drawn: boolean; size?: number; color: string; ringMs?: number; checkMs?: number; checkDelay?: number; checkWidth?: number;
}) {
  const ring = useRef(new Animated.Value(drawn ? 0 : 214)).current;
  const check = useRef(new Animated.Value(drawn ? 0 : 48)).current;
  useEffect(() => {
    if (drawn) {
      Animated.parallel([
        Animated.timing(ring, { toValue: 0, duration: ringMs, easing: EASE_IOS, useNativeDriver: false }),
        Animated.timing(check, { toValue: 0, duration: checkMs, delay: checkDelay, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      ]).start();
    } else { ring.setValue(214); check.setValue(48); }
  }, [drawn, ring, check, ringMs, checkMs, checkDelay]);
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <AnimatedCircle cx={40} cy={40} r={34} stroke={color} strokeWidth={3} strokeDasharray="214" strokeDashoffset={ring} transform="rotate(-90 40 40)" />
      <AnimatedPath d="M26 41l9 9 19-19" stroke={color} strokeWidth={checkWidth} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="48" strokeDashoffset={check} />
    </Svg>
  );
}

/** Teclado numérico 3×4 del diseño (alto 56, 28/400). `blankDot` deja vacía la tecla «.» (CLABE). */
export type KeypadKey = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "0" | "del";
const KEYS: readonly KeypadKey[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];
export function Keypad({ onKey, blankDot }: { onKey: (k: KeypadKey) => void; blankDot?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 4, paddingBottom: 16 }}>
      {KEYS.map((k) => (
        <View key={k} style={{ width: "33.333%" }}>
          {blankDot && k === "." ? <View style={{ height: 56 }} /> : (
            <Pressable onPress={() => onKey(k)} accessibilityLabel={`key-${k}`}
              style={({ pressed }) => ({ height: 56, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? c.ink08 : "transparent" })}>
              <T w={400} s={28} color={c.inkStrong}>{k === "del" ? "⌫" : k}</T>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

/** Píldora gris (Pegar, banco, dirección): 32 de alto, ink-08, 14/500 ink-72. */
export function SoftPill({ label, onPress, icon, mono, height = 32, accessibilityLabel }: { label: string; onPress?: () => void; icon?: IcoName; mono?: boolean; height?: number; accessibilityLabel?: string }) {
  const { c } = useTheme();
  const body = (
    <View style={{ height, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: RADIUS.pill, backgroundColor: c.ink08 }}>
      {icon ? <Ico name={icon} size={15} color={c.ink72} sw={2} /> : null}
      <T w={500} s={mono ? 13 : 14} mono={mono} color={c.ink72}>{label}</T>
    </View>
  );
  return onPress ? <Press onPress={onPress} accessibilityLabel={accessibilityLabel ?? label}>{body}</Press> : body;
}

/** Sacudida horizontal de error (12, −10, 7, −4, 0 cada 55 ms). */
export function useShake(): [Animated.Value, () => void] {
  const x = useRef(new Animated.Value(0)).current;
  const shake = useCallback(() => {
    Animated.sequence([12, -10, 7, -4, 0].map((toValue) => Animated.timing(x, { toValue, duration: 55, useNativeDriver: true }))).start();
  }, [x]);
  return [x, shake];
}

/** `--shadow-card`: 0 1px 0 (casi invisible en Paper; más marcada en Ash). */
export function cardShadow(scheme: "light" | "dark"): ViewStyle {
  return { shadowColor: scheme === "dark" ? "#000000" : "#0F3D34", shadowOpacity: scheme === "dark" ? 0.4 : 0.04, shadowRadius: 0, shadowOffset: { width: 0, height: 1 } };
}

/** Fila de lista: título 16/500 a la izquierda, valor a la derecha, icono opcional. */
export function ListRow({ title, value, valueMono, valueColor, icon, chevron, onPress, py = 14, sub, accessibilityLabel }: {
  title: string; value?: string; valueMono?: boolean; valueColor?: string; icon?: IcoName; chevron?: boolean; onPress?: () => void; py?: number; sub?: string; accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: py, paddingHorizontal: 16 }}>
      {icon ? <Ico name={icon} size={20} color={c.ink55} sw={1.8} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <T w={500} s={16} color={c.inkStrong}>{title}</T>
        {sub ? <T w={400} s={13} color={c.ink55}>{sub}</T> : null}
      </View>
      {value ? <T w={400} s={14} mono={valueMono} color={valueColor ?? c.ink55}>{value}</T> : null}
      {chevron ? <Ico name="chevronRight" size={18} color={c.ink25} sw={2} /> : null}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityLabel={accessibilityLabel ?? title} style={({ pressed }) => ({ backgroundColor: pressed ? c.ink04 : "transparent" })}>{body}</Pressable>
  ) : body;
}

/** Separación entre bloques de una página (`gap: 22px`). */
export const LARGE_GAP = 22;
