import { View } from "react-native";
import type { AppCtx } from "../../ctx";
import { t } from "../../i18n/es";
import { resumeScreen } from "../state";
import { Body, Btn, Card, Icon, Steps, T, Tag, Warn } from "../../ui/primitives";
import { alpha } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import { PoweredBy } from "./PoweredBy";

const WHAT = [["receive", "coins"], ["spend", "card"], ["send", "bank"]] as const;

export function ActivateScreen({ nav, module, S, set }: AppCtx) {
  const { c } = useTheme();
  const { state } = module;
  const cta = () => {
    if (state.module === "active") { const next = S.next ?? "balance"; set({ next: undefined }); nav(next); return; }
    nav(resumeScreen(state));
  };
  const label = state.module === "active" ? t("activate.ctaOpen") : state.module === "off" ? t("activate.ctaStart") : t("activate.ctaResume");
  return (
    <Body gap={16}>
      <Card bg={c.brand} bd={c.brand} gap={8}>
        <Tag color={alpha(c.onBrand, 0.7)}>{t("common.poweredBy")}</Tag>
        <T w={600} s={26} lh={1.1} ls={-0.02} color={c.onBrand}>{t("activate.title")}</T>
        <T w={400} s={14} lh={1.5} color={alpha(c.onBrand, 0.85)}>{t("activate.lede")}</T>
      </Card>
      {S.next && state.module !== "active" ? <Warn tone="info" title={t("activate.heldTitle")} body={t("activate.heldBody")} /> : null}
      <Tag>{t("activate.whatTag")}</Tag>
      <Card gap={12}>
        {WHAT.map(([k, icon]) => (
          <View key={k} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            <Icon name={icon} size={18} color={c.brand} />
            <View style={{ flex: 1 }}>
              <T w={600} s={14} lh={1.3}>{t(`activate.what.${k}.title`)}</T>
              <T w={400} s={13} lh={1.45} color={c.ink72}>{t(`activate.what.${k}.body`)}</T>
            </View>
          </View>
        ))}
      </Card>
      <Tag>{t("activate.stepsTag")}</Tag>
      <Steps items={(["1", "2", "3"] as const).map((i) => ({ title: t(`activate.step${i}.title`), body: t(`activate.step${i}.body`) }))} />
      <Btn label={label} variant="primary" arrow onPress={cta} accessibilityLabel="activate-cta" />
      <T w={400} s={12} lh={1.45} color={c.ink55}>{t("activate.footnote")}</T>
      <PoweredBy />
    </Body>
  );
}
