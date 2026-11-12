import { View } from "react-native";
import type { AppCtx } from "../../ctx";
import { useTween } from "../../hooks/useTween";
import { t } from "../../i18n/es";
import { formatCents, usdcToMxnCents } from "../../relayer/money";
import { cardShadow, Eyebrow, Group, Hairline, Ico, ListRow, Press } from "../../ui/kit";
import { LargeTitleScreen } from "../../ui/LargeTitle";
import { PromoCard } from "../PromoCard";
import { T } from "../../ui/primitives";
import { RADIUS } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";

/** Inicio de la anfitriona: saludo, atajo a Recibo (saldo o «Activar») y lo próximo de Acme. */
export function HomeScreen({ nav, module, openBalance }: AppCtx) {
  const { c, scheme } = useTheme();
  const shown = useTween(module.state.balanceUsdcCents);
  return (
    <LargeTitleScreen title={t("home.greeting")} smallTitle={t("tab.home")} brand={t("home.greetingTag")}>
      <View style={{ paddingHorizontal: 16, gap: 22 }}>
        {module.active ? (
          <Press scale={0.98} onPress={openBalance} accessibilityLabel="home-recibo"
            style={[{ gap: 14, padding: 20, borderRadius: RADIUS.card, backgroundColor: c.card }, cardShadow(scheme)]}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Eyebrow>{t("rc.name")}</Eyebrow>
              <Ico name="chevronRight" size={18} color={c.ink25} sw={2} />
            </View>
            <View style={{ gap: 4 }}>
              <T w={600} s={32} lh={1} ls={-0.025} color={c.inkStrong} style={{ fontVariant: ["tabular-nums"] }}>
                ${formatCents(usdcToMxnCents(shown))} <T w={500} s={14} color={c.ink40}>MXN</T>
              </T>
              <T w={400} s={13} mono color={c.ink55}>≈ {formatCents(shown)} USDC</T>
            </View>
          </Press>
        ) : (
          <PromoCard onPress={() => nav("onboarding")} cta={t("promo.cta")} accessibilityLabel="home-recibo" />
        )}
        <View style={{ gap: 8 }}>
          <Eyebrow style={{ paddingHorizontal: 4 }}>{t("home.next")}</Eyebrow>
          <Group>
            <ListRow title={t("home.payroll")} value={t("home.payrollDate")} valueMono />
            <Hairline />
            <ListRow title={t("home.vouchers")} value="$2,400" valueMono />
          </Group>
        </View>
      </View>
    </LargeTitleScreen>
  );
}
