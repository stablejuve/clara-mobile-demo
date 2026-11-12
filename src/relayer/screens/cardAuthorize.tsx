import { useEffect } from "react";
import type { AppCtx } from "../../ctx";
import { useAction } from "../../hooks/useAction";
import { t } from "../../i18n/es";
import { useForward } from "../../navigation/useForward";
import { shortAddress } from "../format";
import { Body, Btn, Card, KVList, StatusCard, T, Tag } from "../../ui/primitives";
import { useTheme } from "../../ui/ThemeProvider";
import { PoweredBy } from "./PoweredBy";

export function CardAuthorizeScreen({ nav, module, faceId }: AppCtx) {
  const { focused, forward } = useForward();
  const { c } = useTheme();
  const { state, api } = module;
  const { busy, error, run, setError } = useAction();
  useEffect(() => { if (focused && state.card.authorizedAt !== null) forward("card"); }, [state.card.authorizedAt, forward, focused]);
  const authorize = async () => {
    const ok = await faceId.authenticate(t("cardAuthorize.prompt"));
    if (!ok) { setError(t("errors.passkey_cancelled")); return; }
    const s = await run(() => api.authorizeCard());
    if (s) forward("card");
  };
  return (
    <Body gap={14}>
      <StatusCard tag={t("cardAuthorize.tag")} title={t("cardAuthorize.title")} body={t("cardAuthorize.body")} tone="info" />
      <Card gap={8}>
        <Tag>{t("cardAuthorize.whatTag")}</Tag>
        <KVList rows={[
          { label: t("cardAuthorize.kvWallet"), value: shortAddress(state.wallet.address) },
          { label: t("cardAuthorize.kvSpender"), value: t("cardAuthorize.kvSpenderValue") },
          { label: t("cardAuthorize.kvLimit"), value: t("cardAuthorize.kvLimitValue") },
          { label: t("cardAuthorize.kvRevoke"), value: t("cardAuthorize.kvRevokeValue") },
        ]} />
      </Card>
      {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
      <Btn label={t("cardAuthorize.cta")} icon="faceId" variant="primary" busy={busy} onPress={() => { void authorize(); }} accessibilityLabel="card-authorize" />
      <T w={400} s={12} lh={1.45} color={c.ink55}>{t("cardAuthorize.footnote")}</T>
      <PoweredBy center />
    </Body>
  );
}
