import { View } from "react-native";
import type { AppCtx } from "../../ctx";
import { useTween } from "../../hooks/useTween";
import { t } from "../../i18n/es";
import { formatCents, usdcToMxnCents } from "../../relayer/money";
import { cardShadow, Eyebrow, Group, Hairline, Ico, ListRow, Press } from "../../ui/kit";
import { LargeTitleScreen } from "../../ui/LargeTitle";
import { T } from "../../ui/primitives";
import { RADIUS, RL } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";

/** Inicio de la anfitriona: saludo, atajo a Recibo (saldo o «Activar») y lo próximo de Acme. */
export function HomeScreen({ nav, module, openBalance }: AppCtx) {
  const { c, scheme } = useTheme();
  const shown = useTween(module.state.balanceUsdcCents);
  return (
    <LargeTitleScreen title={t("home.greeting")} smallTitle={t("tab.home")}>
      <View style={{ paddingHorizontal: 16, gap: 22 }}>
        <Press scale={0.98} onPress={() => (module.active ? openBalance() : nav("onboarding"))} accessibilityLabel="home-recibo"
          style={[{ gap: 14, padding: 20, borderRadius: RADIUS.card, backgroundColor: c.card }, cardShadow(scheme)]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Eyebrow>{t("rc.name")}</Eyebrow>
            <Ico name="chevronRight" size={18} color={c.ink25} sw={2} />
          </View>
          {module.active ? (
            <View style={{ gap: 4 }}>
              <T w={600} s={32} lh={1} ls={-0.025} color={c.inkStrong} style={{ fontVariant: ["tabular-nums"] }}>
                {formatCents(shown)} <T w={500} s={14} color={c.ink40}>USDC</T>
              </T>
              <T w={400} s={13} mono color={c.ink55}>≈ ${formatCents(usdcToMxnCents(shown))} MXN</T>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <T w={600} s={17} lh={1.3} color={c.inkStrong}>{t("rc.globalCard")}</T>
              <View style={{ height: 32, paddingHorizontal: 16, justifyContent: "center", borderRadius: RADIUS.pill, backgroundColor: scheme === "dark" ? c.brand : RL.carbon }}>
                <T w={600} s={14} color={scheme === "dark" ? c.onBrand : "#FFFFFF"}>{t("rc.activate")}</T>
              </View>
            </View>
          )}
        </Press>
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
