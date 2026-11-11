// kycRejected.tsx
import { Linking, View } from "react-native";
import type { AppCtx } from "../../ctx";
import { reasonCopy, t } from "../../i18n/es";
import { SUPPORT_URL } from "../format";
import { Body, Btn, Card, Icon, StatusCard, T, Tag } from "../../ui/primitives";
import { useTheme } from "../../ui/ThemeProvider";
import { PoweredBy } from "./PoweredBy";

export function KycRejectedScreen({ nav, module }: AppCtx) {
  const { c } = useTheme();
  const reasons = module.state.kyc.rejectionReasons;
  return (
    <Body gap={14}>
      <StatusCard tag={t("kycRejected.tag")} title={t("kycRejected.title")} body={t("kycRejected.body")} tone="error" />
      <Tag>{t("kycRejected.reasonsTag")}</Tag>
      <Card gap={10}>
        {reasons.length === 0 ? <T w={400} s={13} lh={1.45} color={c.ink72}>{t("kycRejected.noReasons")}</T> : reasons.map((r) => (
          <View key={r} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <Icon name="alert" size={16} color={c.error} />
            <T w={400} s={13.5} lh={1.45} style={{ flex: 1 }}>{reasonCopy(r)}</T>
          </View>
        ))}
      </Card>
      <Btn label={t("kycRejected.retry")} variant="primary" arrow onPress={() => nav("kyc")} accessibilityLabel="kyc-retry" />
      <Btn label={t("kycRejected.support")} variant="ghost" onPress={() => { void Linking.openURL(SUPPORT_URL); }} />
      <PoweredBy center />
    </Body>
  );
}
