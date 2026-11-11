import { useState } from "react";
import type { AppCtx } from "../../ctx";
import { useAction } from "../../hooks/useAction";
import { t } from "../../i18n/es";
import type { WalletProvider } from "../types";
import { Body, Btn, Card, Icon, Segmented, StatusCard, Steps, T } from "../../ui/primitives";
import { useTheme } from "../../ui/ThemeProvider";
import { PoweredBy } from "./PoweredBy";

export function AddToWalletScreen({ nav, module }: AppCtx) {
  const { c } = useTheme();
  const { state, api } = module;
  const { busy, error, run } = useAction();
  const [provider, setProvider] = useState<WalletProvider>("apple");
  const add = async () => { await run(() => api.addToWallet(provider)); };
  if (state.pass.status === "added") {
    const p = t(`addToWallet.provider.${state.pass.provider ?? "apple"}`);
    return (
      <Body gap={14}>
        <StatusCard tag={t("addToWallet.doneTag")} title={t("addToWallet.doneTitle", { provider: p })} body={t("addToWallet.doneBody")} tone="success" />
        <Btn label={t("addToWallet.backToCard")} variant="primary" onPress={() => nav("card")} accessibilityLabel="add-to-wallet-back" />
        <PoweredBy center />
      </Body>
    );
  }
  const p = t(`addToWallet.provider.${provider}`);
  return (
    <Body gap={14}>
      <T w={400} s={14} lh={1.5} color={c.inkBody}>{t("addToWallet.lede")}</T>
      <Segmented options={[["apple", t("addToWallet.provider.apple")], ["google", t("addToWallet.provider.google")]] as const} value={provider} onChange={setProvider} />
      <Card gap={8} style={{ alignItems: "center", paddingVertical: 28 }}>
        <Icon name="phone" size={40} color={c.ink40} />
        <T w={600} s={16} lh={1.2}>{t("addToWallet.preview", { provider: p })}</T>
        <T w={400} s={12.5} lh={1.4} color={c.ink55}>{t("addToWallet.previewSub")}</T>
      </Card>
      <Steps items={(["1", "2"] as const).map((i) => ({ title: t(`addToWallet.step${i}.title`), body: t(`addToWallet.step${i}.body`) }))} />
      {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
      <Btn label={t("addToWallet.cta", { provider: p })} variant="primary" arrow busy={busy} onPress={() => { void add(); }} accessibilityLabel="add-to-wallet" />
      <T w={400} s={12} lh={1.45} color={c.ink55}>{t("addToWallet.footnote")}</T>
      <PoweredBy center />
    </Body>
  );
}
