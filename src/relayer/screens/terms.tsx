import { useState } from "react";
import type { AppCtx } from "../../ctx";
import { useAction } from "../../hooks/useAction";
import { t } from "../../i18n/es";
import { Body, Btn, Card, Check, T, Tag } from "../../ui/primitives";
import { useTheme } from "../../ui/ThemeProvider";
import { PoweredBy } from "./PoweredBy";

export function TermsScreen({ nav, module }: AppCtx) {
  const { c } = useTheme();
  const [checked, setChecked] = useState(false);
  const { busy, error, run } = useAction();
  const accept = async () => {
    // Ya aceptados (volvió con ←): sigue al KYC sin volver a llamar al api.
    if (module.state.module !== "off" && module.state.module !== "terms_pending") { nav("kyc"); return; }
    const s = await run(() => module.api.acceptTerms());
    if (s) nav("kyc");
  };
  return (
    <Body gap={14}>
      <T w={400} s={14} lh={1.5} color={c.inkBody}>{t("terms.lede")}</T>
      <Card gap={8}>
        <Tag>{t("terms.bridgeTag")}</Tag>
        <T w={600} s={15} lh={1.3}>{t("terms.bridgeTitle")}</T>
        <T w={400} s={13} lh={1.5} color={c.ink72}>{t("terms.bridgeBody")}</T>
      </Card>
      <Card gap={8}>
        <Tag>{t("terms.relayerTag")}</Tag>
        <T w={600} s={15} lh={1.3}>{t("terms.relayerTitle")}</T>
        <T w={400} s={13} lh={1.5} color={c.ink72}>{t("terms.relayerBody")}</T>
      </Card>
      <Card bg={c.sub} pad={12}>
        <T w={400} s={12.5} lh={1.5} color={c.ink72}>{t("terms.custodyNote")}</T>
      </Card>
      <Check checked={checked} onChange={setChecked} accessibilityLabel="terms-accept">
        <T w={400} s={13.5} lh={1.45}>{t("terms.checkbox")}</T>
      </Check>
      {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
      <Btn label={t("terms.cta")} variant="primary" arrow disabled={!checked} busy={busy} onPress={() => { void accept(); }} accessibilityLabel="terms-cta" />
      <PoweredBy center />
    </Body>
  );
}
