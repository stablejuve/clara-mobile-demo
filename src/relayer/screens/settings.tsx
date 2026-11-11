import { Alert, Linking, Share } from "react-native";
import type { AppCtx } from "../../ctx";
import { useAction } from "../../hooks/useAction";
import { t } from "../../i18n/es";
import { movementsCsv } from "../export";
import { shortAddress, SUPPORT_URL } from "../format";
import { Body, Btn, Card, KVList, Row, T } from "../../ui/primitives";
import { useTheme } from "../../ui/ThemeProvider";
import { PoweredBy } from "./PoweredBy";

export function SettingsScreen({ nav, module }: AppCtx) {
  const { c } = useTheme();
  const { state, movements, api } = module;
  const { busy, error, run } = useAction();
  const exportCsv = () => { void Share.share({ title: t("settings.exportTitle"), message: movementsCsv(movements) }); };
  const deactivate = () => {
    Alert.alert(t("settings.deactivateTitle"), t("settings.deactivateBody"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("settings.deactivateConfirm"), style: "destructive", onPress: () => { void run(() => api.deactivate()).then((s) => { if (s) nav("benefits"); }); } },
    ]);
  };
  return (
    <Body gap={14}>
      <Card><KVList rows={[
        { label: t("settings.kvStatus"), value: t(`module.status.${state.module}`) },
        { label: t("settings.kvWallet"), value: shortAddress(state.wallet.address) },
        { label: t("settings.kvCard"), value: t(`card.status.${state.card.status}`) },
        { label: t("settings.kvBank"), value: t(`bank.status.${state.bank.status}`) },
      ]} /></Card>
      <Row icon="download" title={t("settings.export")} sub={t("settings.exportSub", { n: movements.length })} onPress={exportCsv} accessibilityLabel="settings-export" />
      <Row icon="bell" title={t("settings.support")} sub={t("settings.supportSub")} onPress={() => { void Linking.openURL(SUPPORT_URL); }} accessibilityLabel="settings-support" />
      {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
      <Btn label={t("settings.deactivate")} icon="logout" variant="danger" busy={busy} onPress={deactivate} accessibilityLabel="settings-deactivate" />
      <T w={400} s={12} lh={1.45} color={c.ink55}>{t("settings.footnote")}</T>
      <PoweredBy center />
    </Body>
  );
}
