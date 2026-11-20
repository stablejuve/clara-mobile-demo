import type { ReactNode } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { goBackIfCan, navigateTo } from "../navigation/ref";
import { CloseButton, DrawCheck, Grabber, Ico, type IcoName, Press, Spinner } from "../ui/kit";
import { T } from "../ui/primitives";
import { alpha, RADIUS } from "../ui/theme";
import { useTheme } from "../ui/ThemeProvider";
import { type ActivityItem, isVoid, subLabel, type TxStatus } from "./activity";

// Piezas compartidas de Global Dollar Benefits. Convenciones de iOS: una acción principal por pantalla, listas agrupadas,
// títulos de 17 pt en hojas, objetivos táctiles de 44 pt o más y poco texto.

export const nav = navigateTo;
export const back = goBackIfCan;
/** Abre la consola de demo sobre lo que haya (también sobre otra hoja). */
export const openConsole = (): void => navigateTo("console");

/** Botón discreto de la consola de demo (solo desarrollo) para barras y cabeceras de hoja. */
export function ConsoleButton() {
  const { c } = useTheme();
  return (
    <Pressable onPress={openConsole} hitSlop={10} accessibilityLabel="demo-console" style={{ width: 30, height: 30, alignItems: "center", justifyContent: "center" }}>
      <Ico name="gauge" size={18} color={c.ink25} sw={1.8} />
    </Pressable>
  );
}

/** Hoja modal: agarradera, título centrado, cerrar a la derecha, contenido con scroll y la acción principal fija abajo. */
export function SheetFrame({ title, children, footer, console: withConsole = true }: { title: string; children: ReactNode; footer?: ReactNode; console?: boolean }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    // En iOS la hoja ya empieza bajo la barra de estado; en web ocupa toda la pantalla del teléfono y hay que bajarla.
    <View style={{ flex: 1, backgroundColor: c.sheet, paddingTop: Platform.OS === "web" ? insets.top : 0 }}>
      {Platform.OS === "web" ? null : <Grabber />}
      <View style={{ height: 50, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
        {withConsole ? <View style={{ position: "absolute", left: 14 }}><ConsoleButton /></View> : null}
        <T w={600} s={17} color={c.inkStrong}>{title}</T>
        <View style={{ position: "absolute", right: 16 }}><CloseButton onPress={back} /></View>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 24, flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12) + 8, gap: 10 }}>{footer}</View> : null}
    </View>
  );
}

/** Tono de un aviso en línea. */
export type Tone = "ok" | "wait" | "bad" | "muted";
export function toneColor(c: { success: string; warning: string; error: string; ink55: string }, tone: Tone): string {
  return tone === "ok" ? c.success : tone === "wait" ? c.warning : tone === "bad" ? c.error : c.ink55;
}

/** Aviso en línea: una frase que explica por qué el dinero no está disponible o qué falló. */
export function Notice({ tone, text }: { tone: Tone; text: string }) {
  const { c } = useTheme();
  const color = toneColor(c, tone);
  return (
    <View style={{ flexDirection: "row", gap: 10, padding: 14, borderRadius: 14, backgroundColor: alpha(tone === "ok" ? c.success : tone === "bad" ? c.error : c.warning, 0.1) }}>
      <View style={{ paddingTop: 1 }}><Ico name={tone === "ok" ? "check" : "alert"} size={17} color={color} sw={2} /></View>
      <T w={400} s={15} lh={1.35} color={c.inkBody} style={{ flex: 1 }}>{text}</T>
    </View>
  );
}

/** Estado a pantalla completa de una hoja: icono, una línea de título y una de apoyo. */
export function StateBlock({ kind, title, sub }: { kind: "ok" | "wait" | "bad"; title: string; sub?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 32 }}>
      <View style={{ height: 84, alignItems: "center", justifyContent: "center" }}>
        {kind === "ok" ? <DrawCheck drawn size={76} color={c.success} />
          : kind === "wait" ? <Spinner size={44} color={c.ink40} sw={3} />
            : <View style={{ width: 72, height: 72, borderRadius: RADIUS.pill, backgroundColor: alpha(c.error, 0.1), alignItems: "center", justifyContent: "center" }}><Ico name="alert" size={34} color={c.error} sw={2} /></View>}
      </View>
      <T w={600} s={22} lh={1.2} ls={-0.01} color={c.inkStrong} style={{ textAlign: "center" }}>{title}</T>
      {sub ? <T w={400} s={16} lh={1.35} color={c.ink55} style={{ textAlign: "center" }}>{sub}</T> : null}
    </View>
  );
}

const KIND_ICON: Record<ActivityItem["kind"], IcoName> = { funding: "arrowDownLeft", card: "bag", withdrawal: "landmark" };
export const kindIcon = (k: ActivityItem["kind"]): IcoName => KIND_ICON[k];

/** Color del estado de un movimiento: pendiente en ámbar, lo que no pasó en rojo, lo hecho en gris. */
export function statusColor(c: { warning: string; error: string; ink55: string }, st: TxStatus): string {
  return st === "pending" ? c.warning : st === "done" ? c.ink55 : c.error;
}

/** Fila de un movimiento: icono, nombre, estado o fecha, y a la derecha el monto en moneda local con los dólares debajo
 *  (`showUsd` los oculta). */
export function ActivityRow({ item, showUsd, onPress }: { item: ActivityItem; showUsd: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const voided = isVoid(item);
  return (
    <Press onPress={onPress} scale={0.99} accessibilityLabel={`activity-${item.id}`} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 16, minHeight: 64 }}>
      <View style={{ width: 38, height: 38, borderRadius: RADIUS.pill, backgroundColor: c.ink04, alignItems: "center", justifyContent: "center" }}>
        <Ico name={KIND_ICON[item.kind]} size={18} color={c.ink72} sw={1.9} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <T w={500} s={16} color={c.inkStrong} numberOfLines={1}>{item.title}</T>
        <T w={400} s={13} color={statusColor(c, item.status)} numberOfLines={1}>{subLabel(item)}</T>
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <T w={500} s={16} color={voided ? c.ink40 : item.kind === "funding" ? c.success : c.inkStrong}
          style={{ fontVariant: ["tabular-nums"], textDecorationLine: voided ? "line-through" : "none" }}>{item.primary}</T>
        {showUsd && item.secondary ? <T w={400} s={13} color={c.ink55} style={{ fontVariant: ["tabular-nums"] }}>{item.secondary}</T> : null}
      </View>
    </Press>
  );
}

export type Step = { label: string; sub?: string; /** Línea en mono (p. ej. la llamada de API del paso). */ code?: string; state: "done" | "current" | "todo" | "bad" };

/** Línea de tiempo vertical: lo hecho en verde, lo actual con anillo, lo que falta en gris. */
export function Timeline({ steps }: { steps: readonly Step[] }) {
  const { c } = useTheme();
  return (
    <View>
      {steps.map((st, n) => {
        const color = st.state === "bad" ? c.error : st.state === "todo" ? c.ink25 : st.state === "current" ? c.warning : c.success;
        return (
          <View key={st.label} style={{ flexDirection: "row", gap: 14, minHeight: 54 }}>
            <View style={{ width: 22, alignItems: "center" }}>
              <View style={{ width: 22, height: 22, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center", backgroundColor: st.state === "done" || st.state === "bad" ? color : "transparent", borderWidth: st.state === "done" || st.state === "bad" ? 0 : 2, borderColor: color }}>
                {st.state === "done" ? <Ico name="check" size={12} color="#FFFFFF" sw={3} /> : st.state === "bad" ? <Ico name="close" size={11} color="#FFFFFF" sw={3} /> : null}
              </View>
              {n < steps.length - 1 ? <View style={{ flex: 1, width: 2, marginVertical: 3, backgroundColor: st.state === "done" ? c.success : c.ink15 }} /> : null}
            </View>
            <View style={{ flex: 1, gap: 2, paddingBottom: 14 }}>
              <T w={st.state === "todo" ? 400 : 600} s={16} color={st.state === "todo" ? c.ink40 : c.inkStrong}>{st.label}</T>
              {st.sub ? <T w={400} s={14} color={st.state === "todo" ? c.ink25 : c.ink55}>{st.sub}</T> : null}
              {st.code ? <T w={400} s={11.5} mono color={st.state === "todo" ? c.ink25 : c.ink40} style={{ paddingTop: 2 }}>{st.code}</T> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Acción redonda con etiqueta (Card / Convert / Withdraw). */
export function RoundAction({ icon, label, onPress, disabled, on, a11y }: { icon: IcoName; label: string; onPress: () => void; disabled?: boolean; on?: boolean; a11y: string }) {
  const { c } = useTheme();
  return (
    <Press scale={0.94} onPress={onPress} disabled={disabled} accessibilityLabel={a11y} style={{ alignItems: "center", gap: 8, width: 88, opacity: disabled ? 0.35 : 1 }}>
      <View style={{ width: 56, height: 56, borderRadius: RADIUS.pill, backgroundColor: on ? c.cta : c.page, alignItems: "center", justifyContent: "center" }}>
        <Ico name={icon} size={22} color={on ? c.onCta : c.inkStrong} sw={1.9} />
      </View>
      <T w={500} s={13} color={c.inkStrong}>{label}</T>
    </Press>
  );
}
