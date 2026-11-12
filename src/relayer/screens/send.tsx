import { useEffect, useState } from "react";
import { View } from "react-native";
import type { AppCtx } from "../../ctx";
import { useAction } from "../../hooks/useAction";
import { useNow } from "../../hooks/useNow";
import { errorCopy } from "../../i18n/errors";
import { t } from "../../i18n/es";
import { useForward } from "../../navigation/useForward";
import { formatCents, formatMxn, formatRate, formatUsdc, MIN_SEND_MXN_CENTS, mxnToUsdcCents, parseAmount, quoteFor, usdcToMxnCents } from "../money";
import type { Quote } from "../types";
import { Body, Btn, Card, Chip, Field, KVList, Segmented, T, Tag } from "../../ui/primitives";
import { useTheme } from "../../ui/ThemeProvider";
import { PoweredBy } from "./PoweredBy";

type Unit = "mxn" | "usdc";

export function SendScreen({ nav, module, faceId }: AppCtx) {
  const { focused, forward } = useForward();
  const { c } = useTheme();
  const { state, api } = module;
  const { busy, error, run, setError } = useAction();
  const [unit, setUnit] = useState<Unit>("mxn");
  const [input, setInput] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const now = useNow(1000);
  useEffect(() => { if (focused && state.bank.status !== "verified") forward("bankAccount"); }, [state.bank.status, forward, focused]);

  const balance = state.balanceUsdcCents;
  const cents = parseAmount(input);
  const amountUsdc = cents === null ? null : unit === "usdc" ? cents : mxnToUsdcCents(cents);
  const preview = amountUsdc === null ? null : quoteFor(amountUsdc, balance);
  const account = `${state.bank.bankName ?? ""} ···· ${(state.bank.clabe ?? "").slice(-4)}`;
  const max = () => setInput(formatCents(unit === "usdc" ? balance : usdcToMxnCents(balance)).replace(/,/g, ""));
  const getQuote = async () => { if (amountUsdc === null) return; const q = await run(() => api.quoteSend(amountUsdc)); if (q) setQuote(q); };
  const confirm = async () => {
    if (!quote) return;
    const ok = await faceId.authenticate(t("send.prompt"));
    if (!ok) { setError(t("errors.passkey_cancelled")); return; }
    const r = await run(() => api.confirmSend(quote.id));
    if (r) { setQuote(null); nav("sendReceipt", { receiptId: r.id }); }
  };

  if (quote) {
    const left = Math.max(0, Math.ceil((quote.expiresAt - now) / 1000));
    return (
      <Body gap={14}>
        <Card gap={6}>
          <Tag>{t("send.youSendTag")}</Tag>
          <T w={600} s={32} lh={1} ls={-0.02} mono>{formatUsdc(quote.amountUsdcCents)}</T>
          <KVList top rows={[
            { label: t("send.fee"), value: formatUsdc(quote.feeUsdcCents) },
            { label: t("send.rate"), value: formatRate(quote.rate) },
            { label: t("send.receives"), value: formatMxn(quote.amountMxnCents), fg: c.success },
            { label: t("send.to"), value: account },
            { label: t("send.rail"), value: "SPEI" },
          ]} />
        </Card>
        <T w={500} s={11} lh={1.3} mono color={left === 0 ? c.error : c.ink55}>{left === 0 ? t("send.quoteExpired") : t("send.quoteTtl", { s: left })}</T>
        {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn label={t("common.edit")} variant="outline" disabled={busy} onPress={() => { setQuote(null); setError(""); }} style={{ width: 104 }} accessibilityLabel="send-edit" />
          <Btn label={t("send.confirm")} icon="faceId" variant="primary" flex={1} busy={busy} disabled={left === 0} onPress={() => { void confirm(); }} accessibilityLabel="send-confirm" />
        </View>
        <T w={400} s={12} lh={1.45} color={c.ink55}>{t("send.confirmFootnote")}</T>
      </Body>
    );
  }

  return (
    <Body gap={14}>
      <Segmented options={[["mxn", t("send.unitMxn")], ["usdc", t("send.unitUsdc")]] as const} value={unit} onChange={(u) => { setUnit(u); setInput(""); }} />
      <Field label={unit === "mxn" ? t("send.amountMxn") : t("send.amountUsdc")} value={input} onChangeText={setInput} keyboardType="decimal-pad" placeholder="0.00"
        right={<Chip label="MAX" mono onPress={max} accessibilityLabel="send-max" />}
        hint={preview === null
          ? t("send.available", { usdc: formatUsdc(balance), mxn: formatMxn(usdcToMxnCents(balance)) })
          : preview.ok ? t("send.preview", { usdc: formatUsdc(preview.quote.amountUsdcCents), mxn: formatMxn(preview.quote.amountMxnCents) }) : undefined}
        error={preview !== null && !preview.ok ? errorCopy(preview.code) : undefined}
        accessibilityLabel="send-amount" />
      <Card><KVList rows={[
        { label: t("send.to"), value: account },
        { label: t("send.minimum"), value: formatMxn(MIN_SEND_MXN_CENTS) },
        { label: t("send.feeLabel"), value: t("send.feeValue") },
      ]} /></Card>
      {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
      <Btn label={t("send.quote")} variant="primary" arrow busy={busy} disabled={preview === null || !preview.ok} onPress={() => { void getQuote(); }} accessibilityLabel="send-quote" />
      <T w={400} s={12} lh={1.45} color={c.ink55}>{t("send.footnote")}</T>
      <PoweredBy center />
    </Body>
  );
}
