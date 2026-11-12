import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Animated, Linking, Platform, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { FullWindowOverlay } from "react-native-screens";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "../i18n/es";
import { ENDPOINTS, type Endpoint } from "../relayer/endpoints";
import type { TraceHit, Tracer } from "../relayer/trace";
import { EASE_IOS, Ico, Spinner } from "./kit";
import { T } from "./primitives";
import { RADIUS } from "./theme";

// Modo explicativo: chip arriba con el endpoint que llamaría la acción; al tocarlo, el detalle (qué hace, a quién le pega,
// si ya existe en relayer-core y enlaces a la documentación). Superficie oscura fija en ambos temas: se lee como «consola».

const SURFACE = "#121819";
const INK = "#F4EFE0";
const INK_DIM = "rgba(244,239,224,0.62)";
const LINE = "rgba(244,239,224,0.12)";
const METHOD_COLOR: Record<Endpoint["method"], string> = { GET: "#66C8A8", POST: "#ECE6D6", PATCH: "#33D6DD", DELETE: "#D87B92", HOOK: "#E9C46A" };
const VISIBLE_MS = 5200;

export function TraceOverlay({ tracer }: { tracer: Tracer }) {
  const hits = useSyncExternalStore(tracer.subscribe, () => tracer.hits);
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<TraceHit | null>(null);
  const visible = hits.slice(-2);
  if (visible.length === 0 && !open) return null;
  const Host = Platform.OS === "ios" ? FullWindowOverlay : View;
  return (
    <Host style={Platform.OS === "ios" ? undefined : { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
      <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top + 6, left: 12, right: 12, gap: 6 }}>
        {open ? <Detail hit={open} onClose={() => { tracer.dismiss(open.id); setOpen(null); }} />
          : visible.map((h) => <Chip key={h.id} hit={h} onPress={() => setOpen(h)} onDone={() => tracer.dismiss(h.id)} />)}
      </View>
    </Host>
  );
}

function MethodBadge({ m }: { m: Endpoint["method"] }) {
  return (
    <View style={{ paddingHorizontal: 6, height: 18, borderRadius: 4, backgroundColor: "rgba(244,239,224,0.1)", justifyContent: "center" }}>
      <T w={700} s={10.5} mono color={METHOD_COLOR[m]}>{m === "HOOK" ? "← HOOK" : m}</T>
    </View>
  );
}

function Chip({ hit, onPress, onDone }: { hit: TraceHit; onPress: () => void; onDone: () => void }) {
  const e = ENDPOINTS[hit.key];
  const a = useRef(new Animated.Value(0)).current;
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: 320, easing: EASE_IOS, useNativeDriver: true }).start(); }, [a]);
  // Se va sola cuando la llamada terminó (las pendientes se quedan hasta resolver).
  useEffect(() => {
    if (hit.state === "pending") return;
    const id = setTimeout(() => Animated.timing(a, { toValue: 0, duration: 240, useNativeDriver: true }).start(() => done.current()), VISIBLE_MS);
    return () => clearTimeout(id);
  }, [hit.state, a]);
  return (
    <Animated.View style={{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }] }}>
      <Pressable onPress={onPress} accessibilityLabel={`trace-${hit.key}`}
        style={({ pressed }) => ({ backgroundColor: SURFACE, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, gap: 4, opacity: pressed ? 0.85 : 1,
          shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 })}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <MethodBadge m={e.method} />
          <T w={500} s={12.5} mono color={INK} numberOfLines={1} style={{ flex: 1 }}>{e.path}</T>
          {hit.state === "pending" ? <Spinner size={13} color={INK_DIM} sw={2.4} />
            : hit.state === "error" ? <Ico name="alert" size={14} color={METHOD_COLOR.DELETE} sw={2.2} />
              : <Ico name="check" size={14} color={METHOD_COLOR.GET} sw={2.6} />}
        </View>
        <T w={400} s={12.5} lh={1.35} color={INK_DIM} numberOfLines={2}>{e.summary}</T>
      </Pressable>
    </Animated.View>
  );
}

function Detail({ hit, onClose }: { hit: TraceHit; onClose: () => void }) {
  const e = ENDPOINTS[hit.key];
  const { height } = useWindowDimensions();
  return (
    <View style={{ backgroundColor: SURFACE, borderRadius: 16, maxHeight: height * 0.62, overflow: "hidden",
      shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <MethodBadge m={e.method} />
          <View style={{ flex: 1 }} />
          <View style={{ paddingHorizontal: 8, height: 20, borderRadius: RADIUS.pill, justifyContent: "center", backgroundColor: e.status === "exists" ? "rgba(102,200,168,0.16)" : "rgba(233,196,106,0.16)" }}>
            <T w={600} s={11} color={e.status === "exists" ? METHOD_COLOR.GET : METHOD_COLOR.HOOK}>{e.status === "exists" ? t("trace.exists") : t("trace.planned")}</T>
          </View>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="trace-close"><Ico name="close" size={18} color={INK_DIM} sw={2} /></Pressable>
        </View>
        <T w={500} s={14} mono color={INK} selectable>{e.path}</T>
        <T w={400} s={14.5} lh={1.4} color={INK}>{e.summary}</T>
        {e.upstream.length > 0 ? (
          <Section label={e.method === "HOOK" ? t("trace.from") : t("trace.calls")}>
            {e.upstream.map((u) => <T key={u} w={400} s={12.5} lh={1.4} mono color={INK_DIM}>{u}</T>)}
          </Section>
        ) : null}
        {e.nearest ? <Section label={t("trace.nearest")}><T w={400} s={12.5} mono color={INK_DIM}>{e.nearest}</T></Section> : null}
        <Section label={t("trace.docs")}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {e.docs.map((d) => (
              <Pressable key={d.url} onPress={() => { void Linking.openURL(d.url); }} accessibilityLabel={`trace-doc-${d.label}`}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, height: 30, paddingHorizontal: 11, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: LINE, backgroundColor: pressed ? LINE : "transparent" })}>
                <T w={500} s={12.5} color={INK}>{d.label}</T>
                <Ico name="arrowUpRight" size={12} color={INK_DIM} sw={2.2} />
              </Pressable>
            ))}
          </View>
        </Section>
        <T w={400} s={11.5} lh={1.4} color={INK_DIM}>{t("trace.note")}</T>
      </ScrollView>
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6, paddingTop: 2, borderTopWidth: 0.5, borderTopColor: LINE }}>
      <T w={500} s={11} color={INK_DIM} style={{ paddingTop: 10 }}>{label}</T>
      {children}
    </View>
  );
}
