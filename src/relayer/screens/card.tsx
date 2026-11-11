import { useEffect, useState } from "react";
import { View } from "react-native";
import type { AppCtx } from "../../ctx";
import { useAction } from "../../hooks/useAction";
import { t } from "../../i18n/es";
import { formatWhen } from "../format";
import type { CardDetails } from "../types";
import { Body, Btn, Card, KVList, Row, T, Warn } from "../../ui/primitives";
import { useTheme } from "../../ui/ThemeProvider";
import { CardArt } from "./cardRequest";
import { PoweredBy } from "./PoweredBy";

export function CardScreen({ nav, module }: AppCtx) {
  const { c } = useTheme();
  const { state, api } = module;
  const { busy, error, run } = useAction();
  const [details, setDetails] = useState<CardDetails | null>(null);
  const [revealed, setRevealed] = useState(false);
  const frozen = state.card.status === "frozen";
  useEffect(() => { if (state.card.status === "none" || state.card.status === "endorsement_expired") nav("cardRequest"); }, [state.card.status, nav]);
  // Los datos completos (PAN, CVV) se piden al api pero sólo se pintan con «Ver datos».
  useEffect(() => {
    let stale = false;
    api.getCard().then((d) => { if (!stale) setDetails(d); }).catch(() => {});
    return () => { stale = true; };
  }, [api, state.card.status]);
  const toggleFreeze = async () => { await run(() => api.freezeCard(!frozen)); };
  return (
    <Body gap={14}>
      <CardArt last4={state.card.last4} expiry={state.card.expiry} holder={details?.holder ?? "—"} number={revealed ? details?.number : null} cvv={revealed ? details?.cvv : null} dim={frozen} />
      {frozen ? <Warn tone="info" title={t("card.frozenTitle")} body={t("card.frozenBody")} /> : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Btn label={revealed ? t("card.hide") : t("card.reveal")} icon={revealed ? "eyeOff" : "eye"} variant="control" flex={1} disabled={details === null} onPress={() => setRevealed((v) => !v)} accessibilityLabel="card-reveal" />
        <Btn label={frozen ? t("card.unfreeze") : t("card.freeze")} icon={frozen ? "sparkles" : "freeze"} variant="control" flex={1} busy={busy} onPress={() => { void toggleFreeze(); }} accessibilityLabel="card-freeze" />
      </View>
      {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
      <Card><KVList rows={[
        { label: t("card.kvStatus"), value: t(`card.status.${state.card.status}`) },
        { label: t("card.kvAuthorized"), value: state.card.authorizedAt ? formatWhen(state.card.authorizedAt) : "—" },
        { label: t("card.kvNetwork"), value: t("card.kvNetworkValue") },
      ]} /></Card>
      {state.pass.status === "added" ? (
        <Row icon="phone" title={t("card.inWalletTitle")} sub={t(`addToWallet.provider.${state.pass.provider ?? "apple"}`)} right={t("common.ready")} rightFg={c.success} />
      ) : (
        <Btn label={t("card.addToPhone")} icon="phone" variant="primary" arrow disabled={frozen} onPress={() => nav("addToWallet")} accessibilityLabel="card-add-to-wallet" />
      )}
      <T w={400} s={12} lh={1.45} color={c.ink55}>{t("card.footnote")}</T>
      <PoweredBy center />
    </Body>
  );
}
