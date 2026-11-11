import { View } from "react-native";
import type { AppCtx } from "../../ctx";
import { t } from "../../i18n/es";
import { formatMxn, formatUsdc, usdcToMxnCents } from "../../relayer/money";
import { Body, Card, Icon, Row, T, Tag, TouchCard } from "../../ui/primitives";
import { alpha } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";

/** Inicio de la anfitriona: relleno estático de "Acme Beneficios" + atajo a Recibo. */
export function HomeScreen({ nav, requireModule, module }: AppCtx) {
  const { c } = useTheme();
  const balance = module.state.balanceUsdcCents;
  return (
    <Body gap={14}>
      <Card bg={c.brand} bd={c.brand} gap={6}>
        <Tag color={alpha(c.onBrand, 0.7)}>{t("home.greetingTag")}</Tag>
        <T w={600} s={24} lh={1.1} ls={-0.02} color={c.onBrand}>{t("home.greeting")}</T>
        <T w={400} s={13} lh={1.45} color={alpha(c.onBrand, 0.85)}>{t("home.subtitle")}</T>
      </Card>
      <Tag>{t("home.sectionNext")}</Tag>
      <Row icon="banknote" title={t("home.payrollTitle")} sub={t("home.payrollSub")} right={t("home.payrollRight")} />
      <Row icon="gift" title={t("home.vouchersTitle")} sub={t("home.vouchersSub")} right={t("home.vouchersRight")} />
      <Tag>{t("home.sectionRecibo")}</Tag>
      {module.active ? (
        <TouchCard onPress={() => requireModule("balance")} accessibilityLabel="home-recibo" style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Icon name="coins" size={16} color={c.brand} /><Tag color={c.brand}>{t("home.reciboTag")}</Tag></View>
          <T w={600} s={22} lh={1.1} mono>{formatUsdc(balance)}</T>
          <T w={400} s={12.5} lh={1.4} color={c.ink55}>≈ {formatMxn(usdcToMxnCents(balance))}</T>
        </TouchCard>
      ) : (
        <TouchCard onPress={() => nav("activate")} accessibilityLabel="home-recibo" style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Icon name="coins" size={16} color={c.brand} /><Tag color={c.brand}>{t("home.reciboTag")}</Tag></View>
          <T w={600} s={15} lh={1.3}>{t("home.reciboOff")}</T>
          <T w={500} s={13} lh={1.3} color={c.brand}>{t("home.reciboCta")} →</T>
        </TouchCard>
      )}
    </Body>
  );
}
