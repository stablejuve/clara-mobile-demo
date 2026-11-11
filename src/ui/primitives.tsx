import { type ReactNode, useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Easing, type Insets, Pressable, type StyleProp, Text, TextInput, type TextInputProps, type TextStyle, View, type ViewStyle } from "react-native";
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BadgeCheck, Banknote, Bell, Bug, Check as CheckGlyph, ChevronRight, CircleAlert, CircleCheck, Clock, Copy, CreditCard, Download,
  Eye, EyeOff, FileText, Gift, HandCoins, House, Info, Landmark, Lock, LogOut, QrCode, Receipt, ScanFace, Send, Settings, Share2, ShieldCheck, Smartphone, Snowflake, Sparkles, User, Wallet, X,
} from "lucide-react-native";
import { RADIUS, textStyle } from "./theme";
import { useTheme } from "./ThemeProvider";
import { btnVariants, type BtnVariant, type Tone, tone, type ToneName } from "./variants";
export type { BtnVariant, Tone, ToneName } from "./variants";

// ---------------------------------------------------------------------------
// Texto: w=peso, s=tamaño, lh=ratio, ls=em; mono (JetBrains). Sin color: inkStrong de la paleta.
export type TProps = {
  w?: number; s?: number; lh?: number; ls?: number; mono?: boolean; color?: string;
  style?: StyleProp<TextStyle>; numberOfLines?: number; children?: ReactNode; accessibilityLabel?: string; selectable?: boolean;
};

export function T({ w = 400, s = 14, lh, ls, mono, color, style, numberOfLines, accessibilityLabel, selectable, children }: TProps) {
  const { c } = useTheme();
  return (
    <Text numberOfLines={numberOfLines} accessibilityLabel={accessibilityLabel} selectable={selectable} style={[textStyle(w, s, { lh, ls, mono, color: color ?? c.inkStrong }), style]}>
      {children}
    </Text>
  );
}

/** Eyebrow mono de Relayer: 10.5 px, peso 500, tracking .08em, mayúsculas. Sin color: ink55. */
export function Tag({ children, color, s = 10.5, style }: { children: ReactNode; color?: string; s?: number; style?: StyleProp<TextStyle> }) {
  const { c } = useTheme();
  return <T w={500} s={s} lh={1} ls={0.08} mono color={color ?? c.ink55} style={style}>{typeof children === "string" ? children.toUpperCase() : children}</T>;
}

export type TouchProps = {
  onPress?: () => void; onLongPress?: () => void; delayLongPress?: number; style?: StyleProp<ViewStyle>; children?: ReactNode; disabled?: boolean;
  hitSlop?: number | Insets; accessibilityLabel?: string;
};

export function Touch({ onPress, onLongPress, delayLongPress, style, children, disabled, hitSlop, accessibilityLabel }: TouchProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [style, pressed && !disabled ? { opacity: 0.72 } : null]}
    >
      {children}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Iconos lucide.
const ICONS = {
  back: ArrowLeft, arrow: ArrowRight, down: ArrowDown, up: ArrowUp, chevron: ChevronRight,
  home: House, gift: Gift, user: User, card: CreditCard, bank: Landmark, shield: ShieldCheck, faceId: ScanFace, send: Send,
  wallet: Wallet, settings: Settings, check: CheckGlyph, copy: Copy, share: Share2, freeze: Snowflake, bell: Bell, lock: Lock,
  alert: CircleAlert, ok: CircleCheck, clock: Clock, phone: Smartphone, receipt: Receipt, verified: BadgeCheck, eye: Eye, eyeOff: EyeOff,
  close: X, doc: FileText, info: Info, logout: LogOut, download: Download, bug: Bug, banknote: Banknote, qr: QrCode, sparkles: Sparkles, coins: HandCoins,
} as const;
export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 16, color, strokeWidth = 1.8 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const { c } = useTheme();
  const Cmp = ICONS[name];
  return <Cmp size={size} color={color ?? c.inkStrong} strokeWidth={strokeWidth} />;
}

// ---------------------------------------------------------------------------
// Superficies.
export type CardProps = { children?: ReactNode; style?: StyleProp<ViewStyle>; bd?: string; bg?: string; pad?: number; gap?: number };

/** Card de Relayer: fondo card, hairline ink08, radio 2. */
export function Card({ children, style, bd, bg, pad = 16, gap }: CardProps) {
  const { c } = useTheme();
  return (
    <View style={[{ padding: pad, borderRadius: RADIUS.card, borderWidth: 1, borderColor: bd ?? c.ink08, backgroundColor: bg ?? c.card, gap }, style]}>
      {children}
    </View>
  );
}

export function TouchCard({ onPress, onLongPress, delayLongPress, children, style, bd, bg, pad = 16, disabled, accessibilityLabel }: TouchProps & { bd?: string; bg?: string; pad?: number }) {
  const { c } = useTheme();
  return (
    <Touch onPress={onPress} onLongPress={onLongPress} delayLongPress={delayLongPress} disabled={disabled} accessibilityLabel={accessibilityLabel}
      style={[{ padding: pad, borderRadius: RADIUS.card, borderWidth: 1, borderColor: bd ?? c.ink08, backgroundColor: bg ?? c.card }, style]}>
      {children}
    </Touch>
  );
}

/** Fila clave/valor: clave mono ink55, valor mono inkStrong. */
export function KV({ k, v, vFg, kFg }: { k: string; v: string; vFg?: string; kFg?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
      <T w={500} s={10.5} lh={1.4} ls={0.08} mono color={kFg ?? c.ink55}>{k.toUpperCase()}</T>
      <T w={500} s={12.5} lh={1.4} mono color={vFg ?? c.inkStrong} style={{ textAlign: "right", flexShrink: 1 }} selectable>{v}</T>
    </View>
  );
}

export type KVRow = { label: string; value: string; fg?: string };

export function KVList({ rows, top, gap = 8, style }: { rows: KVRow[]; top?: boolean; gap?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ gap, paddingTop: top ? 10 : 0, borderTopWidth: top ? 1 : 0, borderTopColor: c.ink08 }, style]}>
      {rows.map((r, i) => <KV key={i} k={r.label} v={r.value} vFg={r.fg} />)}
    </View>
  );
}

export function Hair({ style }: { style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <View style={[{ height: 1, backgroundColor: c.ink08 }, style]} />;
}

/** Punto de estado (pill): live, success, warning, error o cualquier color. */
export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: RADIUS.pill, backgroundColor: color }} />;
}

/** Chip rectangular (radio control): filtros, escenarios, marcas. `on` = fondo ink, texto página. */
export type ChipProps = {
  label: string; on?: boolean; fg?: string; bd?: string; bg?: string; onPress?: () => void; mono?: boolean;
  s?: number; py?: number; px?: number; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
};

export function Chip({ label, on, fg, bd, bg, onPress, mono, s = 11.5, py = 7, px = 11, style, accessibilityLabel }: ChipProps) {
  const { c } = useTheme();
  const colors = on ? { fg: c.onBtnPrimary, bd: c.btnPrimary, bg: c.btnPrimary } : { fg: fg ?? c.ink72, bd: bd ?? c.ink15, bg: bg ?? "transparent" };
  const inner = <T w={mono ? 500 : 600} s={s} lh={1} mono={mono} color={colors.fg}>{label}</T>;
  const box: ViewStyle = { paddingVertical: py, paddingHorizontal: px, borderRadius: RADIUS.control, borderWidth: 1, borderColor: colors.bd, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" };
  if (onPress) return <Touch onPress={onPress} accessibilityLabel={accessibilityLabel} style={[box, style]}>{inner}</Touch>;
  return <View style={[box, style]}>{inner}</View>;
}

// ---------------------------------------------------------------------------
// Botones. Alturas de Relayer: md 40 (py 11), lg 46 (py 14).
export type BtnProps = {
  label: string; onPress?: () => void; variant?: BtnVariant; arrow?: boolean; icon?: IconName; s?: number; py?: number;
  style?: StyleProp<ViewStyle>; disabled?: boolean; flex?: number; busy?: boolean; accessibilityLabel?: string;
};

/** `busy` muestra un spinner en lugar del icono y bloquea el toque; `disabled` baja opacidad. */
export function Btn({ label, onPress, variant = "control", arrow, icon, s = 14, py = 14, style, disabled, flex, busy, accessibilityLabel }: BtnProps) {
  const { c } = useTheme();
  const v = btnVariants(c)[variant];
  return (
    <Touch
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityLabel={accessibilityLabel}
      style={[{
        flex, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        paddingVertical: py, paddingHorizontal: 18, borderRadius: RADIUS.control,
        borderWidth: 1, borderColor: v.bd, backgroundColor: v.bg, opacity: disabled ? 0.45 : 1,
      }, style]}
    >
      {busy ? <ActivityIndicator size="small" color={v.fg} /> : icon ? <Icon name={icon} size={16} color={v.fg} /> : null}
      <T w={v.w} s={s} lh={1} color={v.fg}>{label}</T>
      {arrow && !busy ? <Icon name="arrow" size={15} color={v.fg} /> : null}
    </Touch>
  );
}

// ---------------------------------------------------------------------------
// Selectores y formularios.
export type SegmentedProps<K extends string> = { options: readonly (readonly [K, string])[]; value: K; onChange: (k: K) => void };

export function Segmented<K extends string>({ options, value, onChange }: SegmentedProps<K>) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 2, padding: 2, borderRadius: RADIUS.control, backgroundColor: c.sub, borderWidth: 1, borderColor: c.ink08 }}>
      {options.map(([k, label]) => {
        const on = value === k;
        return (
          <Touch key={k} onPress={() => onChange(k)} accessibilityLabel={`segment-${k}`}
            style={{ flex: 1, paddingVertical: 9, paddingHorizontal: 6, borderRadius: RADIUS.control, backgroundColor: on ? c.card : "transparent", borderWidth: 1, borderColor: on ? c.ink15 : "transparent", alignItems: "center" }}>
            <T w={600} s={13} lh={1} color={on ? c.inkStrong : c.ink55}>{label}</T>
          </Touch>
        );
      })}
    </View>
  );
}

/** Input de Relayer: etiqueta eyebrow + caja input con hairline ink15 (alto lg 46). */
export function Field({ label, hint, error, right, ...input }: { label: string; hint?: string; error?: string; right?: ReactNode } & TextInputProps) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Tag>{label}</Tag>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderRadius: RADIUS.control, borderWidth: 1, borderColor: error ? c.error : c.ink15, backgroundColor: c.input }}>
        <TextInput placeholderTextColor={c.ink40} autoCorrect={false} {...input} style={[textStyle(500, 15, { color: c.inkStrong }), { flex: 1, paddingVertical: 12 }, input.style]} />
        {right}
      </View>
      {error ? <T w={400} s={12} lh={1.4} color={c.error}>{error}</T> : hint ? <T w={400} s={12} lh={1.4} color={c.ink55}>{hint}</T> : null}
    </View>
  );
}

/** Casilla con texto (términos). */
export function Check({ checked, onChange, children, accessibilityLabel }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; accessibilityLabel: string }) {
  const { c } = useTheme();
  return (
    <Touch onPress={() => onChange(!checked)} accessibilityLabel={accessibilityLabel} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <View style={{ width: 22, height: 22, borderRadius: RADIUS.control, borderWidth: 1, borderColor: checked ? c.btnPrimary : c.ink25, backgroundColor: checked ? c.btnPrimary : c.input, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
        {checked ? <Icon name="check" size={14} color={c.onBtnPrimary} strokeWidth={2.4} /> : null}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Touch>
  );
}

/** Lista numerada (Activar: 3 pasos; Pedir tarjeta: condiciones). */
export function Steps({ items }: { items: readonly { title: string; body: string }[] }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      {items.map((it, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ width: 26, height: 26, borderRadius: RADIUS.control, backgroundColor: c.sub, borderWidth: 1, borderColor: c.ink08, alignItems: "center", justifyContent: "center" }}>
            <T w={500} s={11} lh={1} mono color={c.ink72}>{String(i + 1).padStart(2, "0")}</T>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T w={600} s={14} lh={1.3}>{it.title}</T>
            <T w={400} s={13} lh={1.45} color={c.ink72}>{it.body}</T>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Fila de lista: icono o punto, título + subtítulo, valor a la derecha, chevron si navega. */
export function Row({ icon, dot, title, sub, right, rightFg, onPress, accessibilityLabel }: { icon?: IconName; dot?: string; title: string; sub?: string; right?: string; rightFg?: string; onPress?: () => void; accessibilityLabel?: string }) {
  const { c } = useTheme();
  const inner = (
    <>
      {icon ? <View style={{ width: 36, height: 36, borderRadius: RADIUS.control, backgroundColor: c.sub, alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={17} color={c.ink72} /></View> : null}
      {dot ? <Dot color={dot} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T w={600} s={14} lh={1.25} numberOfLines={1}>{title}</T>
        {sub ? <T w={400} s={12} lh={1.3} color={c.ink55} numberOfLines={1} style={{ marginTop: 3 }}>{sub}</T> : null}
      </View>
      {right ? <T w={500} s={13} lh={1} mono color={rightFg ?? c.inkStrong}>{right}</T> : null}
      {onPress ? <Icon name="chevron" size={16} color={c.ink40} /> : null}
    </>
  );
  const box: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.ink08, backgroundColor: c.card };
  return onPress ? <Touch onPress={onPress} accessibilityLabel={accessibilityLabel} style={box}>{inner}</Touch> : <View style={box}>{inner}</View>;
}

// ---------------------------------------------------------------------------
// Avisos y estados.
export function Warn({ title, body, tone: name = "warning", children }: { title: string; body?: string; tone?: ToneName; children?: ReactNode }) {
  const { c } = useTheme();
  const t = tone(c, name);
  return (
    <Card bd={t.bd} bg={t.bg} pad={14} gap={6}>
      <T w={600} s={13} lh={1.3} color={t.fg}>{title}</T>
      {body ? <T w={400} s={12.5} lh={1.45} color={c.inkBody}>{body}</T> : null}
      {children}
    </Card>
  );
}

/** Tarjeta de estado (KYC, endorsement, verificación, recibo): eyebrow + título + cuerpo en el tono. */
export function StatusCard({ tag, title, body, tone: name, busy, children }: { tag: string; title: string; body?: string; tone: ToneName; busy?: boolean; children?: ReactNode }) {
  const { c } = useTheme();
  const t = tone(c, name);
  return (
    <Card bd={t.bd} bg={t.bg} pad={16} gap={8}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {busy ? <ActivityIndicator size="small" color={t.fg} /> : <Dot color={t.fg} />}
        <Tag color={t.fg}>{tag}</Tag>
      </View>
      <T w={600} s={18} lh={1.2} ls={-0.01}>{title}</T>
      {body ? <T w={400} s={13} lh={1.5} color={c.inkBody}>{body}</T> : null}
      {children}
    </Card>
  );
}

/** Cuerpo de pantalla: padding horizontal 18 y gap. (El `Page` de ruta vive en Page.tsx.) */
export function Body({ children, style, gap = 12, top = 12 }: { children?: ReactNode; style?: StyleProp<ViewStyle>; gap?: number; top?: number }) {
  return <View style={[{ paddingTop: top, paddingHorizontal: 18, paddingBottom: 24, gap }, style]}>{children}</View>;
}

// ---------------------------------------------------------------------------
// Skeletons (heredados): un solo pulso compartido con refcount.
const PULSE = new Animated.Value(1);
let pulseLoop: Animated.CompositeAnimation | null = null;
let pulseMounted = 0;

function usePulse(): Animated.Value {
  useEffect(() => {
    if (pulseMounted++ === 0) {
      pulseLoop = Animated.loop(Animated.sequence([
        Animated.timing(PULSE, { toValue: 0.45, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(PULSE, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]));
      pulseLoop.start();
    }
    return () => { if (--pulseMounted === 0) { pulseLoop?.stop(); pulseLoop = null; PULSE.setValue(1); } };
  }, []);
  return PULSE;
}

type SkeletonProps = { w?: number | `${number}%`; h?: number; style?: StyleProp<ViewStyle> };

function SkeletonBlock({ w = "100%", h = 12, style }: SkeletonProps) {
  const { c } = useTheme();
  const opacity = usePulse();
  return <Animated.View style={[{ width: w, height: h, borderRadius: RADIUS.control, backgroundColor: c.ink08, opacity }, style]} />;
}

function SkeletonRow() {
  return (
    <Card pad={13} style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
      <View style={{ flex: 1, gap: 6 }}><SkeletonBlock h={14} w="40%" /><SkeletonBlock h={11} w="60%" /></View>
      <SkeletonBlock h={13} w={72} />
    </Card>
  );
}

export const Skeleton = Object.assign(SkeletonBlock, { Row: SkeletonRow });

/** El contenido entra con un fade de 150 ms (skeleton → dato). */
export function Reveal({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start(); }, [opacity]);
  return <Animated.View style={[{ opacity }, style]}>{children}</Animated.View>;
}
