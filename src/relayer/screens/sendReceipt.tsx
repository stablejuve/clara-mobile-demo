import { useEffect, useState } from "react";
import { Share, View } from "react-native";
import type { AppCtx } from "../../ctx";
import { errorCopy } from "../../i18n/errors";
import { t } from "../../i18n/es";
import { formatWhen } from "../format";
import { formatMxn, formatRate, formatUsdc } from "../money";
import type { Receipt } from "../types";
import { Body, Btn, Card, KVList, Skeleton, StatusCard, T, Tag, type ToneName, Warn } from "../../ui/primitives";
import { PoweredBy } from "./PoweredBy";

export function SendReceiptScreen({ S, module, nav }: AppCtx) {
  const { api, state } = module;
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [missing, setMissing] = useState(false);
  const id = S.receiptId;
  // Se vuelve a pedir cuando el envío cambia de estado (submitted → completed | failed).
  useEffect(() => {
    if (!id) { setMissing(true); return; }
    let stale = false;
    api.getReceipt(id).then((r) => { if (!stale) setReceipt(r); }).catch(() => { if (!stale) setMissing(true); });
    return () => { stale = true; };
  }, [api, id, state.send.status]);

  if (missing) {
    return (
      <Body gap={12}>
        <Warn tone="neutral" title={t("receipt.missingTitle")} body={t("receipt.missingBody")} />
        <Btn label={t("balance.back")} variant="control" onPress={() => nav("balance")} />
      </Body>
    );
  }
  if (!receipt) return <Body gap={12}><Skeleton h={120} /><Skeleton.Row /><Skeleton.Row /></Body>;

  const tone: ToneName = receipt.status === "completed" ? "success" : receipt.status === "failed" ? "error" : "info";
  const body = receipt.status === "failed" && receipt.failureCode ? errorCopy(receipt.failureCode) : t(`receipt.status.${receipt.status}.body`);
  const share = () => {
    void Share.share({ message: t("receipt.shareMessage", { folio: receipt.folio, mxn: formatMxn(receipt.amountMxnCents), usdc: formatUsdc(receipt.amountUsdcCents), bank: receipt.bankName, last4: receipt.clabeLast4 }) });
  };
  return (
    <Body gap={14}>
      <StatusCard tag={t(`receipt.status.${receipt.status}.tag`)} title={t(`receipt.status.${receipt.status}.title`)} body={body} tone={tone} busy={receipt.status === "submitted"} />
      <Card gap={6}>
        <Tag>{t("receipt.folio")}</Tag>
        <T w={600} s={20} lh={1.1} mono selectable>{receipt.folio}</T>
        <KVList top rows={[
          { label: t("send.youSendTag"), value: formatUsdc(receipt.amountUsdcCents) },
          { label: t("send.fee"), value: formatUsdc(receipt.feeUsdcCents) },
          { label: t("send.rate"), value: formatRate(receipt.rate) },
          { label: t("send.receives"), value: formatMxn(receipt.amountMxnCents) },
          { label: t("send.to"), value: `${receipt.bankName} ···· ${receipt.clabeLast4}` },
          { label: t("receipt.created"), value: formatWhen(receipt.createdAt) },
          { label: t("receipt.completed"), value: receipt.completedAt ? formatWhen(receipt.completedAt) : "—" },
        ]} />
      </Card>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Btn label={t("common.share")} icon="share" variant="control" flex={1} onPress={share} accessibilityLabel="receipt-share" />
        <Btn label={t("balance.back")} variant="primary" flex={1} onPress={() => nav("balance")} accessibilityLabel="receipt-back" />
      </View>
      <PoweredBy center />
    </Body>
  );
}
