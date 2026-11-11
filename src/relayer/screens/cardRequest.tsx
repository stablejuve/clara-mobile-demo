import { useEffect } from "react";
import { View } from "react-native";
import type { AppCtx } from "../../ctx";
import { useAction } from "../../hooks/useAction";
import { t } from "../../i18n/es";
import { Body, Btn, StatusCard, Steps, T, Tag, Warn } from "../../ui/primitives";
import { DARK, RADIUS, RL } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import { PoweredBy } from "./PoweredBy";

/** Arte de la tarjeta (siempre carbon, con la paleta dark encima; independiente del esquema). */
export function CardArt({ last4, expiry, holder, number, cvv, dim }: { last4: string | null; expiry: string | null; holder: string; number?: string | null; cvv?: string | null; dim?: boolean }) {
  return (
    <View style={{ backgroundColor: RL.carbon, borderRadius: RADIUS.card, padding: 20, gap: 28, opacity: dim ? 0.55 : 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Tag color={RL.turq}>{t("card.artTag")}</Tag>
        <T w={700} s={14} ls={0.1} color={DARK.inkStrong}>VISA</T>
      </View>
      <T w={500} s={20} lh={1} ls={0.08} mono color={DARK.inkStrong}>{number ?? `•••• •••• •••• ${last4 ?? "••••"}`}</T>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View><Tag color={DARK.ink55}>{t("card.holder")}</Tag><T w={500} s={12.5} mono color={DARK.inkStrong} style={{ marginTop: 4 }}>{holder}</T></View>
        <View><Tag color={DARK.ink55}>{t("card.expiry")}</Tag><T w={500} s={12.5} mono color={DARK.inkStrong} style={{ marginTop: 4 }}>{expiry ?? "••/••"}</T></View>
        <View><Tag color={DARK.ink55}>CVV</Tag><T w={500} s={12.5} mono color={DARK.inkStrong} style={{ marginTop: 4 }}>{cvv ?? "•••"}</T></View>
      </View>
    </View>
  );
}

export function CardRequestScreen({ nav, module }: AppCtx) {
  const { c } = useTheme();
  const { state, api } = module;
  const { busy, error, code, run } = useAction();
  const st = state.card.status;
  useEffect(() => { if (st === "active" || st === "frozen") nav(state.card.authorizedAt ? "card" : "cardAuthorize"); }, [st, state.card.authorizedAt, nav]);
  const request = async () => { await run(() => api.requestCard()); };
  const reconfirm = async () => { const s = await run(() => api.reconfirmKyc()); if (s) nav("kycPending"); };
  return (
    <Body gap={14}>
      {st === "none" ? (
        <>
          <CardArt last4={null} expiry={null} holder={t("card.holderPlaceholder")} dim />
          <Tag>{t("cardRequest.conditionsTag")}</Tag>
          <Steps items={(["1", "2", "3"] as const).map((i) => ({ title: t(`cardRequest.cond${i}.title`), body: t(`cardRequest.cond${i}.body`) }))} />
          {code === "cards_unavailable_region" ? (
            <Warn tone="warning" title={t("cardRequest.unavailableTitle")} body={t("cardRequest.unavailableBody")}>
              <Btn label={t("cardRequest.notify")} variant="control" onPress={() => nav("balance")} style={{ alignSelf: "flex-start", marginTop: 4 }} accessibilityLabel="card-notify" />
            </Warn>
          ) : error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
          <Btn label={t("cardRequest.cta")} variant="primary" arrow busy={busy} onPress={() => { void request(); }} accessibilityLabel="card-request" />
        </>
      ) : null}
      {st === "endorsement_expired" ? (
        <>
          <StatusCard tag={t("cardRequest.expiredTag")} title={t("cardRequest.expiredTitle")} body={t("cardRequest.expiredBody")} tone="warning" />
          {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
          <Btn label={t("cardRequest.reconfirm")} variant="primary" arrow busy={busy} onPress={() => { void reconfirm(); }} accessibilityLabel="card-reconfirm" />
        </>
      ) : null}
      {st === "requested" || st === "endorsement_pending" ? (
        <StatusCard tag={t(`cardRequest.pending.${st}.tag`)} title={t(`cardRequest.pending.${st}.title`)} body={t(`cardRequest.pending.${st}.body`)} tone="info" busy />
      ) : null}
      <T w={400} s={12} lh={1.45} color={c.ink55}>{t("cardRequest.footnote")}</T>
      <PoweredBy center />
    </Body>
  );
}
