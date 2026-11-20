import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Animated, Linking, Platform, Pressable, ScrollView, useWindowDimensions, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FullWindowOverlay } from "react-native-screens";
import { EASE_IOS, Ico } from "../ui/kit";
import { T } from "../ui/primitives";
import { RADIUS } from "../ui/theme";
import { tr } from "./copy";
import { type Endpoint, ENDPOINTS, endpointSummary } from "./endpoints";
import type { TraceHit, Tracer } from "./trace";

// Modo explicativo: un chip con el endpoint que llamaría la acción; al tocarlo, el detalle (qué hace, a quién le pega, si ya
// existe en relayer-core y enlaces a la documentación). Superficie oscura fija en ambos temas: se lee como «consola», no como
// parte de la app del empleado.

const SURFACE = "#121819";
const INK = "#F4EFE0";
const INK_DIM = "rgba(244,239,224,0.62)";
const LINE = "rgba(244,239,224,0.12)";
const METHOD_COLOR: Record<Endpoint["method"], string> = { GET: "#66C8A8", POST: "#ECE6D6", PATCH: "#33D6DD", HOOK: "#E9C46A" };
const VISIBLE_MS = 5200;

/** `anchor`: en la vista web va pegado al teléfono (lo coloca la escena) y con letra más grande; sin él, arriba del teléfono. */
export function TraceOverlay({ tracer, anchor }: { tracer: Tracer; anchor?: ViewStyle }) {
  const hits = useSyncExternalStore(tracer.subscribe, tracer.getHits, tracer.getHits);
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<TraceHit | null>(null);
  const visible = hits.slice(-2);
  if (visible.length === 0 && !open) return null;
  const k = anchor ? 1.16 : 1;
  const body = (
    <View pointerEvents="box-none" style={anchor ? [{ position: "absolute", gap: 8, zIndex: 50 }, anchor] : { position: "absolute", top: insets.top + 6, left: 12, right: 12, gap: 6 }}>
      {open ? <Detail hit={open} k={k} onClose={() => { tracer.dismiss(open.id); setOpen(null); }} />
        : visible.map((h) => <Chip key={h.id} hit={h} k={k} onPress={() => setOpen(h)} onDone={() => tracer.dismiss(h.id)} />)}
    </View>
  );
  if (anchor) return body;
  // En iOS va en una ventana aparte para quedar encima de las hojas modales.
  if (Platform.OS === "ios") return <FullWindowOverlay>{body}</FullWindowOverlay>;
  return <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}>{body}</View>;
}

function MethodBadge({ m }: { m: Endpoint["method"] }) {
  return (
    <View style={{ paddingHorizontal: 6, height: 18, borderRadius: 4, backgroundColor: "rgba(244,239,224,0.1)", justifyContent: "center" }}>
      <T w={700} s={10.5} mono color={METHOD_COLOR[m]}>{m === "HOOK" ? "← HOOK" : m}</T>
    </View>
  );
}

function Chip({ hit, k, onPress, onDone }: { hit: TraceHit; k: number; onPress: () => void; onDone: () => void }) {
  const e: Endpoint = ENDPOINTS[hit.key];
  const a = useRef(new Animated.Value(0)).current;
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 320, easing: EASE_IOS, useNativeDriver: true }).start();
    const id = setTimeout(() => Animated.timing(a, { toValue: 0, duration: 240, useNativeDriver: true }).start(() => done.current()), VISIBLE_MS);
    return () => clearTimeout(id);
  }, [a]);
  return (
    <Animated.View style={{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }] }}>
      <Pressable onPress={onPress} accessibilityLabel={`trace-${hit.key}`}
        style={({ pressed }) => ({ backgroundColor: SURFACE, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, gap: 4, opacity: pressed ? 0.85 : 1,
          shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 })}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <MethodBadge m={e.method} />
          <T w={500} s={12.5 * k} mono color={INK} numberOfLines={1} style={{ flex: 1 }}>{e.path}</T>
          <Ico name="chevronRight" size={14} color={INK_DIM} sw={2.2} />
        </View>
        <T w={400} s={12.5 * k} lh={1.35} color={INK_DIM} numberOfLines={k > 1 ? 3 : 2}>{tr(endpointSummary(hit.key))}</T>
      </Pressable>
    </Animated.View>
  );
}

function Detail({ hit, k, onClose }: { hit: TraceHit; k: number; onClose: () => void }) {
  const e: Endpoint = ENDPOINTS[hit.key];
  const { height } = useWindowDimensions();
  return (
    <View accessibilityLabel="trace-detail" style={{ backgroundColor: SURFACE, borderRadius: 16, maxHeight: height * 0.62, overflow: "hidden",
      shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <MethodBadge m={e.method} />
          <View style={{ flex: 1 }} />
          <View style={{ paddingHorizontal: 8, height: 20, borderRadius: RADIUS.pill, justifyContent: "center", backgroundColor: e.status === "exists" ? "rgba(102,200,168,0.16)" : "rgba(233,196,106,0.16)" }}>
            <T w={600} s={11} color={e.status === "exists" ? METHOD_COLOR.GET : METHOD_COLOR.HOOK}>{tr(e.status === "exists" ? "trace.exists" : "trace.planned")}</T>
          </View>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="trace-close"><Ico name="close" size={18} color={INK_DIM} sw={2} /></Pressable>
        </View>
        <T w={500} s={14 * k} mono color={INK} selectable>{e.path}</T>
        <T w={400} s={14.5 * k} lh={1.4} color={INK}>{tr(endpointSummary(hit.key))}</T>
        {e.upstream.length > 0 ? (
          <Section label={tr(e.method === "HOOK" ? "trace.from" : "trace.calls")}>
            {e.upstream.map((u) => <T key={u} w={400} s={12.5 * k} lh={1.4} mono color={INK_DIM}>{u}</T>)}
          </Section>
        ) : null}
        {hit.lines?.length ? (
          <Section label={tr("trace.example")}>
            {hit.lines.map((l) => <T key={l} w={400} s={12 * k} lh={1.45} mono color={INK} selectable>{l}</T>)}
          </Section>
        ) : null}
        {e.nearest ? <Section label={tr("trace.nearest")}><T w={400} s={12.5} mono color={INK_DIM}>{e.nearest}</T></Section> : null}
        {e.docs.length > 0 ? (
          <Section label={tr("trace.docs")}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {e.docs.map((d) => (
                <Pressable key={d.url} onPress={() => { void Linking.openURL(d.url).catch(() => {}); }} accessibilityLabel={`trace-doc-${d.label}`}
                  style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, height: 30, paddingHorizontal: 11, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: LINE, backgroundColor: pressed ? LINE : "transparent" })}>
                  <T w={500} s={12.5} color={INK}>{d.label}</T>
                  <Ico name="arrowUpRight" size={12} color={INK_DIM} sw={2.2} />
                </Pressable>
              ))}
            </View>
          </Section>
        ) : null}
        <T w={400} s={11.5} lh={1.4} color={INK_DIM}>{tr("trace.note")}</T>
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
