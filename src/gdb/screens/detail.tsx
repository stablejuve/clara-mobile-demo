import { Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CloseButton, Group, Hairline, Ico, ListRow, PrimaryButton } from "../../ui/kit";
import { T } from "../../ui/primitives";
import { F, RADIUS } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import { dateLabel, feed, isVoid, timeLabel } from "../activity";
import { type Key, tr, usd } from "../copy";
import { DEMO, gdb, useGdb } from "../store";
import { back, kindIcon, nav, statusColor } from "../ui";

/** Detalle de un movimiento, simple: qué fue, cuánto (moneda local primero, dólares debajo), si está pendiente, y fecha, hora y
 *  tipo. Si algo falló, la acción para resolverlo. Nada de estados internos del emisor: eso vive en «Detrás del pago» (demo). */
export function DetailSheet({ id }: { id: string }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const web = Platform.OS === "web";
  const { s, flags } = useGdb();
  const it = feed(s, DEMO.rate).find((x) => x.id === id);
  if (!it) return <View style={{ padding: 28, backgroundColor: c.sheet }} />;
  const a = s.auths.find((x) => x.id === id);
  const w = s.withdrawals.find((x) => x.id === id);

  // Estado en una línea; lo hecho no necesita etiqueta.
  const status = it.status === "done" ? null
    : it.status === "declined" ? `${tr("tx.st.declined")} · ${tr(`pay.r.${a?.declineReason ?? "insufficient_funds"}` as Key)}`
      : tr(`tx.st.${it.status}`);
  const rows: [string, string][] = [[tr("tx.date"), dateLabel(it.at)], [tr("tx.time"), timeLabel(it.at)], [tr("tx.type"), tr(`tx.t.${it.kind}`)]];
  if (it.note) rows.push([tr("act.benefit"), it.note]);
  if (w) rows.push([tr("tx.to"), `${w.bank.name} •••• ${w.bank.account.slice(-4)}`]);
  const action = a?.declineReason === "card_frozen" && s.card.status === "frozen" ? { label: tr("tx.unfreeze"), run: () => { gdb.freeze(false); back(); } }
    : w?.status === "reversed" ? { label: tr("tx.retry"), run: () => { back(); nav("send"); } } : null;

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: web ? insets.top + 36 : 28, paddingBottom: 28, gap: 22, backgroundColor: c.sheet }}>
      {/* En web no hay gesto para bajar la hoja: se cierra con el botón. */}
      {web ? <View style={{ position: "absolute", top: insets.top + 6, right: 16, zIndex: 2 }}><CloseButton onPress={back} /></View> : null}
      <View style={{ alignItems: "center", gap: 6 }}>
        <View style={{ width: 48, height: 48, borderRadius: RADIUS.pill, backgroundColor: c.ink04, alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
          <Ico name={kindIcon(it.kind)} size={22} color={c.ink72} sw={1.9} />
        </View>
        <T w={500} s={17} color={c.inkStrong} style={{ textAlign: "center" }}>{it.title}</T>
        <T s={48} lh={1} color={isVoid(it) ? c.ink40 : c.inkStrong} accessibilityLabel="detail-amount" style={{ fontFamily: F.display, textDecorationLine: isVoid(it) ? "line-through" : "none" }}>{it.primary}</T>
        {flags.showUsd && it.secondary ? <T w={400} s={16} color={c.ink55} accessibilityLabel="detail-usd">{it.secondary}</T> : null}
        {status ? <T w={500} s={15} color={statusColor(c, it.status)} accessibilityLabel="detail-status" style={{ textAlign: "center" }}>{status}</T> : null}
      </View>
      <Group>
        {rows.map(([k, v], n) => <View key={k}>{n > 0 ? <Hairline /> : null}<ListRow title={k} value={v} /></View>)}
      </Group>
      {action ? <PrimaryButton label={action.label} onPress={action.run} accessibilityLabel="detail-action" /> : null}
      <View style={{ alignItems: "center", gap: 4 }}>
        <T w={400} s={14} color={c.ink55}>{tr("tx.problem")}</T>
        <Pressable accessibilityRole="link" accessibilityLabel="detail-report" hitSlop={8}>
          <T w={500} s={14} color={c.brand} style={{ textDecorationLine: "underline" }}>{tr("tx.report")}</T>
        </Pressable>
      </View>
      {/* Sólo para quien presenta la demo: cómo se movió el dinero por detrás. */}
      {a ? (
        <Pressable onPress={() => nav("rail", { id: a.id })} accessibilityLabel="detail-rail" hitSlop={8} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Ico name="gauge" size={14} color={c.ink40} sw={1.8} />
          <T w={400} s={13} color={c.ink40}>{tr("rail.open")}</T>
        </Pressable>
      ) : null}
    </View>
  );
}
