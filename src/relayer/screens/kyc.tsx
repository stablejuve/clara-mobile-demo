import { useEffect, useRef, useState } from "react";
import { Linking, View } from "react-native";
import type { AppCtx } from "../../ctx";
import { useAction } from "../../hooks/useAction";
import { t } from "../../i18n/es";
import { KYC_RETURN_URL } from "../../navigation/deepLink";
import type { KycLinks } from "../types";
import { Body, Btn, Card, Chip, Icon, type IconName, Row, StatusCard, T, Tag, Warn } from "../../ui/primitives";
import { useTheme } from "../../ui/ThemeProvider";

type StepName = "document" | "selfie" | "address";
type Step = "intro" | StepName | "done";
const STEPS: readonly StepName[] = ["document", "selfie", "address"];
const STEP_ICON: Record<StepName, IconName> = { document: "doc", selfie: "faceId", address: "home" };
const NEED: readonly { key: "id" | "selfie" | "address"; icon: IconName }[] = [{ key: "id", icon: "doc" }, { key: "selfie", icon: "faceId" }, { key: "address", icon: "home" }];
const RETURN_FALLBACK_MS = 1500;

export function KycScreen({ nav, module, kycReturn }: AppCtx) {
  const { c } = useTheme();
  const { state, api } = module;
  const [step, setStep] = useState<Step>(state.kyc.status === "incomplete" ? "document" : "intro");
  const [links, setLinks] = useState<KycLinks | null>(null);
  const { busy, error, run } = useAction();
  const kycRef = useRef(state.kyc.status);
  kycRef.current = state.kyc.status;
  useEffect(() => { if (state.kyc.status === "approved") nav("passkey"); }, [state.kyc.status, nav]);

  const open = async () => {
    const l = await run(() => api.startKyc());
    if (l) { setLinks(l); setStep("document"); }
  };
  // Fin del proveedor: regresa a la app por el deep link del redirect_uri. Si el sistema no lo entrega (o tarda), el fallback
  // llama al mismo manejador que usaría el listener de Linking.
  const finish = async () => {
    setStep("done");
    try {
      await Linking.openURL(KYC_RETURN_URL);
      setTimeout(() => { if (kycRef.current === "incomplete") void kycReturn(); }, RETURN_FALLBACK_MS);
    } catch {
      await kycReturn();
    }
  };

  if (step === "intro") {
    return (
      <Body gap={14}>
        <StatusCard tag={t("kyc.tag")} title={t("kyc.introTitle")} body={t("kyc.introBody")} tone="info" />
        <Tag>{t("kyc.needTag")}</Tag>
        {NEED.map((n) => <Row key={n.key} icon={n.icon} title={t(`kyc.need.${n.key}.title`)} sub={t(`kyc.need.${n.key}.sub`)} />)}
        {state.kyc.status === "rejected" ? <Warn tone="warning" title={t("kyc.retryTitle")} body={t("kyc.retryBody")} /> : null}
        {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
        <Btn label={t("kyc.open")} variant="primary" arrow busy={busy} onPress={() => { void open(); }} accessibilityLabel="kyc-open" />
        <T w={400} s={12} lh={1.45} color={c.ink55}>{t("kyc.footnote")}</T>
      </Body>
    );
  }

  const idx = step === "done" ? STEPS.length : STEPS.indexOf(step);
  return (
    <Body gap={14}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Chip label={t("kyc.providerTag")} mono />
        {links ? <T w={500} s={10} mono color={c.ink40} numberOfLines={1} style={{ flexShrink: 1 }}>{links.redirectUri}</T> : null}
      </View>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {STEPS.map((s, i) => <View key={s} style={{ flex: 1, height: 3, backgroundColor: i < idx || (i === idx && step !== "done") ? c.brand : c.ink15 }} />)}
      </View>
      {step === "done" ? (
        <StatusCard tag={t("kyc.doneTag")} title={t("kyc.doneTitle")} body={t("kyc.doneBody")} tone="success" busy />
      ) : (
        <>
          <Card gap={8} style={{ minHeight: 220, justifyContent: "center", alignItems: "center" }}>
            <Icon name={STEP_ICON[step]} size={44} color={c.ink40} />
            <T w={600} s={18} lh={1.2}>{t(`kyc.step.${step}.title`)}</T>
            <T w={400} s={13} lh={1.5} color={c.ink72} style={{ textAlign: "center" }}>{t(`kyc.step.${step}.body`)}</T>
          </Card>
          <Btn label={step === "address" ? t("kyc.finish") : t("common.continue")} variant="primary" arrow
            onPress={() => { if (step === "address") void finish(); else setStep(STEPS[idx + 1]); }} accessibilityLabel={`kyc-step-${step}`} />
          <Btn label={t("common.cancel")} variant="ghost" onPress={() => setStep("intro")} />
        </>
      )}
    </Body>
  );
}
