// kycPending.tsx
import { useEffect } from "react";
import type { AppCtx } from "../../ctx";
import { t } from "../../i18n/es";
import { Body, Btn, Card, StatusCard, T, Tag, Warn } from "../../ui/primitives";
import { useTheme } from "../../ui/ThemeProvider";
import { PoweredBy } from "./PoweredBy";

export function KycPendingScreen({ nav, module }: AppCtx) {
  const { c } = useTheme();
  const { state } = module;
  // El veredicto llega por el mock (2.5 s): aprobado → passkey (alta) o tarjeta (re-KYC con módulo activo); rechazado → razones.
  useEffect(() => {
    if (state.kyc.status === "approved") nav(state.module === "active" ? "cardRequest" : "passkey");
    if (state.kyc.status === "rejected") nav("kycRejected");
  }, [state.kyc.status, state.module, nav]);
  const inReview = state.kyc.status === "under_review";
  return (
    <Body gap={14}>
      {inReview ? (
        <StatusCard tag={t("kycPending.tag")} title={t("kycPending.title")} body={t("kycPending.body")} tone="info" busy />
      ) : (
        <Warn tone="neutral" title={t("kycPending.noneTitle")} body={t("kycPending.noneBody")}>
          <Btn label={t("kycPending.noneCta")} variant="control" onPress={() => nav("activate")} style={{ alignSelf: "flex-start", marginTop: 4 }} />
        </Warn>
      )}
      <Card gap={6}>
        <Tag>{t("kycPending.whatTag")}</Tag>
        <T w={400} s={13} lh={1.5} color={c.ink72}>{t("kycPending.whatBody")}</T>
      </Card>
      <Btn label={t("kycPending.back")} variant="ghost" onPress={() => nav("benefits")} />
      <PoweredBy center />
    </Body>
  );
}
