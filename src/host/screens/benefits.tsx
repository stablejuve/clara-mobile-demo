import { View } from "react-native";
import type { AppCtx } from "../../ctx";
import { t } from "../../i18n/es";
import { resumeScreen } from "../../relayer/state";
import { Body, Btn, Card, Chip, Dot, Icon, type IconName, T, Tag } from "../../ui/primitives";
import { RL } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";

const FILLERS: readonly { key: "health" | "gym" | "vouchers"; icon: IconName; status: "active" | "available" }[] = [
  { key: "health", icon: "shield", status: "active" },
  { key: "gym", icon: "sparkles", status: "available" },
  { key: "vouchers", icon: "gift", status: "active" },
];

/** Beneficios (pantalla 1 del spec): la tarjeta «Recibo · powered by Relayer» con Activar + relleno estático. */
export function BenefitsScreen({ nav, module }: AppCtx) {
  const { c } = useTheme();
  const { state } = module;
  const cta = state.module === "active" ? t("benefits.recibo.open") : state.module === "off" ? t("benefits.recibo.activate") : t("benefits.recibo.resume");
  const go = () => nav(state.module === "active" ? "balance" : state.module === "off" ? "activate" : resumeScreen(state));
  return (
    <Body gap={14}>
      <T w={400} s={14} lh={1.5} color={c.inkBody}>{t("benefits.intro")}</T>
      <Card gap={10} bd={c.brand}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name="coins" size={18} color={c.brand} />
          <T w={600} s={17} lh={1.2} style={{ flex: 1 }}>{t("benefits.recibo.title")}</T>
          {state.module === "active" ? <Chip label={t("benefits.status.active")} mono /> : null}
        </View>
        <T w={400} s={13.5} lh={1.5} color={c.ink72}>{t("benefits.recibo.sub")}</T>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Dot color={RL.turq} size={7} />
          <Tag>{t("common.poweredBy")}</Tag>
        </View>
        <Btn label={cta} variant="primary" arrow onPress={go} accessibilityLabel="benefits-recibo-cta" />
      </Card>
      {FILLERS.map((f) => (
        <Card key={f.key} gap={8}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name={f.icon} size={18} color={c.ink72} />
            <T w={600} s={15} lh={1.2} style={{ flex: 1 }}>{t(`benefits.${f.key}.title`)}</T>
            <Chip label={t(`benefits.status.${f.status}`)} mono />
          </View>
          <T w={400} s={13} lh={1.45} color={c.ink72}>{t(`benefits.${f.key}.sub`)}</T>
        </Card>
      ))}
    </Body>
  );
}
