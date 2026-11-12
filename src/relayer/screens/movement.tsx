import { useEffect, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AppCtx } from "../../ctx";
import { t } from "../../i18n/es";
import type { SheetParams } from "../../navigation/routes";
import { CloseButton } from "../../ui/kit";
import { T } from "../../ui/primitives";
import { RADIUS } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import { movementMxnCents, movementTitle } from "../display";
import { formatCents, formatMxn, formatUsdc } from "../money";
import type { Receipt } from "../types";

/** Detalle de un movimiento (hoja media): quién, cuánto y las referencias. */
export function MovementSheet(ctx: AppCtx & { params: SheetParams["movement"] }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { state, movements, api } = ctx.module;
  const m = movements.find((x) => x.id === ctx.params.id);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  useEffect(() => { if (m?.receiptId) void api.getReceipt(m.receiptId).then(setReceipt).catch(() => {}); }, [m?.receiptId, m?.status, api]);
  if (!m) return <View style={{ height: 200, backgroundColor: c.page }} />;
  const isIn = m.kind === "deposit";
  const rows: [string, string][] = m.kind === "card"
    ? [[t("rc.mv.merchant"), m.merchant ?? "—"], [t("rc.mv.category"), m.category ?? "—"], [t("rc.mv.charged"), formatUsdc(m.amountUsdcCents)],
      [t("rc.mv.status"), m.status === "failed" ? `${t("rc.mv.declined")} · ${t(`rc.mv.decline.${m.declineReason ?? "card_frozen"}`)}` : t("rc.mv.approved")],
      [t("rc.card"), `Visa ···· ${state.card.last4 ?? ""}`]]
    : isIn
    ? [[t("rc.mv.from"), m.fromLabel ?? t("common.employer")], [t("rc.mv.concept"), m.concept ?? "—"], [t("rc.mv.reference"), m.reference ?? "—"],
      [t("rc.mv.equals"), formatUsdc(m.amountUsdcCents)]]
    : [[t("rc.send.to"), m.toLabel ?? "—"], [t("rc.bene.account"), m.toBank ?? "—"], [t("rc.send.youReceive"), receipt ? formatMxn(receipt.amountMxnCents) : "—"],
      [t("rc.send.fee"), receipt ? formatUsdc(receipt.feeUsdcCents) : "—"], [t("rc.send.rate"), receipt ? `$${receipt.rate.toFixed(2)}` : "—"], [t("rc.mv.folio"), receipt?.folio ?? "—"]];
  return (
    <View style={{ backgroundColor: c.page, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 12) + 12 }}>
      <View style={{ alignItems: "flex-end", paddingTop: 18 }}><CloseButton onPress={ctx.back} /></View>
      <View style={{ alignItems: "center", gap: 6, paddingTop: 4, paddingBottom: 26 }}>
        <T w={500} s={15} color={c.ink55}>{movementTitle(m)}</T>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <T w={600} s={44} lh={1} ls={-0.035} color={isIn ? c.settled : c.inkStrong} style={[{ fontVariant: ["tabular-nums"] }, m.status === "failed" && m.kind === "card" ? { textDecorationLine: "line-through" } : null]}>{isIn ? "+" : "−"}${formatCents(movementMxnCents(m))}</T>
          <T w={500} s={15} color={c.ink40}>MXN</T>
        </View>
        <T w={400} s={13} mono color={c.ink55}>≈ {formatCents(m.amountUsdcCents)} USDC</T>
      </View>
      <View style={{ borderRadius: RADIUS.card, backgroundColor: c.card, overflow: "hidden" }}>
        {rows.map(([k, v]) => (
          <View key={k} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: c.ink08 }}>
            <T w={400} s={15} color={c.ink55}>{k}</T>
            <T w={500} s={14} mono color={c.inkStrong} style={{ textAlign: "right", flexShrink: 1 }}>{v}</T>
          </View>
        ))}
      </View>
    </View>
  );
}
