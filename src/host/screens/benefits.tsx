import { View } from "react-native";
import type { AppCtx } from "../../ctx";
import { t } from "../../i18n/es";
import { cardShadow, Eyebrow, Group, Hairline, Isotype, ListRow, Press } from "../../ui/kit";
import { LargeTitleScreen } from "../../ui/LargeTitle";
import { T } from "../../ui/primitives";
import { RADIUS, RL } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";

/** Beneficios de la anfitriona: la tarjeta de Recibo (Activar / Abrir) y el resto del catálogo de Acme. */
export function BenefitsScreen({ nav, module }: AppCtx) {
  const { c, scheme } = useTheme();
  return (
    <LargeTitleScreen title={t("tab.benefits")}>
      <View style={{ paddingHorizontal: 16, gap: 22 }}>
        <View style={[{ gap: 18, padding: 20, borderRadius: RADIUS.card, backgroundColor: c.card }, cardShadow(scheme)]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Isotype box={48} glyph={24} />
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <T w={600} s={19} lh={1.2} ls={-0.01} color={c.inkStrong}>{t("rc.name")}</T>
              <T w={400} s={14} lh={1.35} color={c.ink55}>{t("rc.pitch")}</T>
            </View>
          </View>
          <Press onPress={() => (module.active ? nav("balance") : nav("onboarding"))} accessibilityLabel="benefits-recibo-cta"
            style={{ height: 46, borderRadius: RADIUS.pill, backgroundColor: RL.carbon, alignItems: "center", justifyContent: "center" }}>
            <T w={600} s={16} color="#FFFFFF">{module.active ? t("rc.open") : t("rc.activate")}</T>
          </Press>
        </View>
        <View style={{ gap: 8 }}>
          <Eyebrow style={{ paddingHorizontal: 4 }}>{t("benefits.more")}</Eyebrow>
          <Group>
            <ListRow icon="shield" title={t("benefits.health")} value={t("benefits.active")} valueColor={c.ink40} py={13} />
            <Hairline inset={48} />
            <ListRow icon="activity" title={t("benefits.gym")} value="−50 %" valueColor={c.ink40} py={13} />
            <Hairline inset={48} />
            <ListRow icon="gift" title={t("benefits.vouchers")} value="$2,400" valueMono valueColor={c.ink40} py={13} />
          </Group>
        </View>
      </View>
    </LargeTitleScreen>
  );
}
