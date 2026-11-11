import type { AppCtx } from "../../ctx";
import { t } from "../../i18n/es";
import { Body, Card, Row, Segmented, T, Tag } from "../../ui/primitives";
import type { ThemeOverride } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";

/** Perfil de la anfitriona: datos fijos, apariencia (override del tema) y atajo a los ajustes de Recibo. */
export function ProfileScreen({ requireModule, module }: AppCtx) {
  const { c, override, setOverride } = useTheme();
  return (
    <Body gap={14}>
      <Card gap={4}>
        <T w={600} s={20} lh={1.2}>{t("profile.name")}</T>
        <T w={400} s={13} lh={1.4} color={c.ink72}>{t("profile.role")}</T>
        <T w={500} s={11} lh={1.4} mono color={c.ink55}>{t("profile.employeeId")}</T>
      </Card>
      <Tag>{t("profile.appearance")}</Tag>
      <Segmented
        options={[["system", t("profile.theme.system")], ["light", t("profile.theme.light")], ["dark", t("profile.theme.dark")]] as const}
        value={override}
        onChange={(o: ThemeOverride) => setOverride(o)}
      />
      <Tag>{t("profile.accountTag")}</Tag>
      <Row icon="user" title={t("profile.rows.personal")} sub={t("profile.rows.personalSub")} />
      <Row icon="bell" title={t("profile.rows.notifications")} sub={t("profile.rows.notificationsSub")} />
      {module.active ? <Row icon="settings" title={t("profile.rows.recibo")} sub={t("profile.rows.reciboSub")} onPress={() => requireModule("settings")} accessibilityLabel="profile-recibo" /> : null}
      <T w={400} s={11.5} lh={1.4} color={c.ink40} style={{ textAlign: "center", marginTop: 12 }}>{t("profile.footer")}</T>
    </Body>
  );
}
