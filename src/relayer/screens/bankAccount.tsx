import { useState } from "react";
import type { AppCtx } from "../../ctx";
import { useAction } from "../../hooks/useAction";
import { t } from "../../i18n/es";
import { bankFor, clabeValid } from "../clabe";
import type { BankAccount } from "../types";
import { Body, Btn, Card, Field, KVList, StatusCard, T } from "../../ui/primitives";
import { useTheme } from "../../ui/ThemeProvider";
import { PoweredBy } from "./PoweredBy";

function AccountCard({ bank }: { bank: BankAccount }) {
  return (
    <Card><KVList rows={[
      { label: t("bank.bank"), value: bank.bankName ?? "—" },
      { label: t("bank.clabeLabel"), value: `•••• •••• •••• ${(bank.clabe ?? "").slice(-4)}` },
      { label: t("bank.owner"), value: bank.ownerName ?? "—" },
      { label: t("bank.rail"), value: "SPEI" },
    ]} /></Card>
  );
}

export function BankAccountScreen({ nav, module }: AppCtx) {
  const { c } = useTheme();
  const { state, api } = module;
  const { busy, error, run } = useAction();
  const [clabe, setClabe] = useState("");
  const digits = clabe.replace(/\D/g, "");
  const bank = digits.length >= 3 ? bankFor(digits) : null;
  const valid = clabeValid(digits);
  const add = async () => { const b = await run(() => api.addBankAccount(digits)); if (b) setClabe(""); };
  const st = state.bank.status;
  const hint = digits.length === 18
    ? (valid ? t("bank.clabeOk", { bank: bank ?? t("bank.unknownBank") }) : t("errors.clabe_invalid"))
    : t("bank.clabeHint", { n: digits.length });
  return (
    <Body gap={14}>
      {st === "none" || st === "failed" ? (
        <>
          {st === "failed"
            ? <StatusCard tag={t("bank.failedTag")} title={t("bank.failedTitle")} body={t("bank.failedBody")} tone="error" />
            : <T w={400} s={14} lh={1.5} color={c.inkBody}>{t("bank.lede")}</T>}
          <Field label={t("bank.clabeLabel")} value={clabe} onChangeText={(v) => setClabe(v.replace(/[^\d ]/g, "").slice(0, 22))} keyboardType="number-pad"
            placeholder="000 0000 0000 0000 00" hint={hint} error={digits.length === 18 && !valid ? t("errors.clabe_invalid") : undefined} accessibilityLabel="bank-clabe" />
          <Card><KVList rows={[
            { label: t("bank.bank"), value: bank ?? "—" },
            { label: t("bank.owner"), value: t("bank.ownerValue") },
            { label: t("bank.rail"), value: "SPEI" },
          ]} /></Card>
          {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
          <Btn label={t("bank.cta")} variant="primary" arrow busy={busy} disabled={!valid} onPress={() => { void add(); }} accessibilityLabel="bank-add" />
          <T w={400} s={12} lh={1.45} color={c.ink55}>{t("bank.footnote")}</T>
        </>
      ) : null}
      {st === "pending_verification" ? (
        <>
          <StatusCard tag={t("bank.pendingTag")} title={t("bank.pendingTitle")} body={t("bank.pendingBody")} tone="info" busy />
          <AccountCard bank={state.bank} />
        </>
      ) : null}
      {st === "verified" ? (
        <>
          <StatusCard tag={t("bank.verifiedTag")} title={t("bank.verifiedTitle")} body={t("bank.verifiedBody")} tone="success" />
          <AccountCard bank={state.bank} />
          <Btn label={t("bank.goSend")} variant="primary" arrow onPress={() => nav("send")} accessibilityLabel="bank-go-send" />
        </>
      ) : null}
      <PoweredBy center />
    </Body>
  );
}
