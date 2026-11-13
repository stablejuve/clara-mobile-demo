import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import type { AppCtx } from "../../ctx";
import { useRate } from "../../hooks/useRate";
import { useTween } from "../../hooks/useTween";
import { t } from "../../i18n/es";
import { DEMO_RATE, formatCents, usdcToMxnCents } from "../../relayer/money";
import { cardShadow, Eyebrow, Group, Hairline, Ico, type IcoName, ListRow, Press } from "../../ui/kit";
import { LargeTitleScreen } from "../../ui/LargeTitle";
import { T } from "../../ui/primitives";
import { RADIUS } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import { PromoCard } from "../PromoCard";

const STEPS = 6240;
const GOAL = 8000;
const BENEFITS: readonly { icon: IcoName; title: "home.b.life" | "home.b.mind" | "home.b.gym" | "home.b.vouchers"; sub: "home.b.lifeSub" | "home.b.mindSub" | "home.b.gymSub" | "home.b.vouchersSub"; tint: string }[] = [
  { icon: "shield", title: "home.b.life", sub: "home.b.lifeSub", tint: "#5B8DEF" },
  { icon: "user", title: "home.b.mind", sub: "home.b.mindSub", tint: "#B36BD4" },
  { icon: "activity", title: "home.b.gym", sub: "home.b.gymSub", tint: "#E0823D" },
  { icon: "gift", title: "home.b.vouchers", sub: "home.b.vouchersSub", tint: "#3DA083" },
];

/** Inicio de la app de beneficios (Relayer HR): bienestar, beneficios del plan de Acme y la cuenta global como un beneficio más. */
export function HomeScreen({ nav, module, openBalance }: AppCtx) {
  const { c, scheme } = useTheme();
  const shown = useTween(module.state.balanceUsdcCents);
  const live = useRate(module.api, DEMO_RATE);
  return (
    <LargeTitleScreen title={t("home.greeting")} smallTitle={t("tab.home")} titleGap={4}>
      <View style={{ paddingHorizontal: 16, gap: 22 }}>
        <T w={400} s={15} color={c.ink55} style={{ paddingHorizontal: 4, marginTop: -2 }}>{t("home.plan")}</T>

        {/* Bienestar: puntos y meta de pasos */}
        <View style={[{ flexDirection: "row", alignItems: "center", gap: 16, padding: 18, borderRadius: 16, backgroundColor: c.card }, cardShadow(scheme)]}>
          <StepsRing pct={STEPS / GOAL} />
          <View style={{ flex: 1, gap: 4 }}>
            <T w={500} s={13} color={c.ink55}>{t("home.points")}</T>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
              <T w={700} s={30} lh={1} ls={-0.02} color={c.inkStrong} style={{ fontVariant: ["tabular-nums"] }}>1,240</T>
              <T w={500} s={14} color={c.ink40}>{t("home.pts")}</T>
            </View>
            <T w={400} s={13} color={c.ink55}>{t("home.steps", { n: "6,240", goal: "8,000" })}</T>
          </View>
          <View style={{ paddingHorizontal: 12, height: 30, borderRadius: RADIUS.pill, backgroundColor: c.ink08, justifyContent: "center" }}>
            <T w={600} s={13} color={c.inkStrong}>{t("home.redeem")}</T>
          </View>
        </View>

        {/* Beneficios del plan */}
        <View style={{ gap: 8 }}>
          <Eyebrow style={{ paddingHorizontal: 4 }}>{t("home.benefits")}</Eyebrow>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {BENEFITS.map((b) => (
              <Press key={b.title} scale={0.97} onPress={() => nav("benefits")} accessibilityLabel={`home-benefit-${b.icon}`}
                style={{ width: "48.4%", padding: 14, gap: 12, borderRadius: 14, backgroundColor: c.card }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: b.tint + "22", alignItems: "center", justifyContent: "center" }}>
                  <Ico name={b.icon} size={19} color={b.tint} sw={2} />
                </View>
                <View style={{ gap: 2 }}>
                  <T w={600} s={15} color={c.inkStrong}>{t(b.title)}</T>
                  <T w={400} s={13} color={c.ink55}>{t(b.sub)}</T>
                </View>
              </Press>
            ))}
          </View>
        </View>

        {/* La cuenta global: un beneficio que se adquiere */}
        <View style={{ gap: 8 }}>
          <Eyebrow style={{ paddingHorizontal: 4 }}>{module.active ? t("rc.name") : t("home.newBenefit")}</Eyebrow>
          {module.active ? (
            <Press scale={0.98} onPress={openBalance} accessibilityLabel="home-recibo"
              style={[{ flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: 16, backgroundColor: c.card }, cardShadow(scheme)]}>
              <View style={{ flex: 1, gap: 4 }}>
                <T w={600} s={28} lh={1} ls={-0.025} color={c.inkStrong} style={{ fontVariant: ["tabular-nums"] }}>
                  ${formatCents(usdcToMxnCents(shown, live.rate))} <T w={500} s={14} color={c.ink40}>MXN</T>
                </T>
                <T w={400} s={13} mono color={c.ink55}>≈ {formatCents(shown)} USDC</T>
              </View>
              <Ico name="chevronRight" size={18} color={c.ink25} sw={2} />
            </Press>
          ) : (
            <PromoCard onPress={() => nav("onboarding")} cta={t("promo.cta")} accessibilityLabel="home-recibo" />
          )}
        </View>

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

/** Anillo de la meta de pasos. */
function StepsRing({ pct }: { pct: number }) {
  const { c } = useTheme();
  const r = 26, len = 2 * Math.PI * r;
  return (
    <View style={{ width: 64, height: 64, alignItems: "center", justifyContent: "center" }}>
      <Svg width={64} height={64} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={32} cy={32} r={r} stroke={c.ink08} strokeWidth={6} fill="none" />
        <Circle cx={32} cy={32} r={r} stroke={c.settled} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={`${len}`} strokeDashoffset={len * (1 - Math.min(1, pct))} />
      </Svg>
      <Ico name="activity" size={22} color={c.settled} sw={2.2} />
    </View>
  );
}
