import * as Clipboard from "expo-clipboard";
import type { AppCtx } from "../../ctx";
import { t } from "../../i18n/es";
import { formatWhen } from "../format";
import { formatCents, formatMxn } from "../money";
import { Body, Btn, Card, Chip, KVList, T, Tag, Warn } from "../../ui/primitives";
import { alpha } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";

export function DepositScreen({ S, module, nav }: AppCtx) {
  const { c } = useTheme();
  const m = module.movements.find((x) => x.id === S.depositId && x.kind === "deposit");
  if (!m) {
    return (
      <Body gap={12}>
        <Warn tone="neutral" title={t("deposit.missingTitle")} body={t("deposit.missingBody")} />
        <Btn label={t("balance.back")} variant="control" onPress={() => nav("balance")} />
      </Body>
    );
  }
  return (
    <Body gap={14}>
      <Card bg={c.brand} bd={c.brand} gap={6}>
        <Tag color={alpha(c.onBrand, 0.7)}>{t("deposit.receivedTag")}</Tag>
        <T w={600} s={34} lh={1} ls={-0.03} mono color={c.onBrand}>+{formatCents(m.amountUsdcCents)}</T>
        <T w={500} s={12} lh={1.3} mono color={alpha(c.onBrand, 0.85)}>USDC{m.amountMxnCents !== undefined ? ` · ≈ ${formatMxn(m.amountMxnCents)}` : ""}</T>
      </Card>
      <Card><KVList rows={[
        { label: t("deposit.from"), value: m.fromLabel ?? "—" },
        { label: t("deposit.concept"), value: m.concept ?? "—" },
        { label: t("deposit.reference"), value: m.reference ?? "—" },
        { label: t("deposit.when"), value: formatWhen(m.at) },
        { label: t("deposit.network"), value: "Base" },
        { label: t("deposit.status"), value: t(`movement.status.${m.status}`) },
      ]} /></Card>
      <Card gap={8}>
        <Tag>{t("deposit.hashTag")}</Tag>
        <T w={500} s={11.5} lh={1.5} mono selectable>{m.txHash ?? "—"}</T>
        {m.txHash ? <Chip label={t("common.copy")} onPress={() => { void Clipboard.setStringAsync(m.txHash ?? ""); }} style={{ alignSelf: "flex-start" }} accessibilityLabel="deposit-copy-hash" /> : null}
      </Card>
      <T w={400} s={12} lh={1.45} color={c.ink55}>{t("deposit.footnote")}</T>
    </Body>
  );
}
