import { View } from "react-native";
import { type Key, tr } from "../../gdb/copy";
import { DEMO, useGdb } from "../../gdb/store";
import { cardEdge, Eyebrow, Ico, type IcoName } from "../../ui/kit";
import { LargeTitleScreen } from "../../ui/LargeTitle";
import { T } from "../../ui/primitives";
import { BF } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import { BfTag, type BfTagTone, ChallengeCard, LevelPill, StatsPill } from "../betterfly";
import { DollarBenefit } from "../DollarBenefit";

/** Beneficios del plan, con el color y la etiqueta con que Betterfly los agrupa. */
const TILES: readonly { icon: IcoName; tone: BfTagTone; tag: Key; title: Key; value: Key }[] = [
  { icon: "shield", tone: "cyan", tag: "home.t.protection", title: "home.b.life", value: "home.b.lifeV" },
  { icon: "user", tone: "pink", tag: "home.t.wellbeing", title: "home.b.mind", value: "home.b.mindV" },
  { icon: "activity", tone: "lime", tag: "home.t.wellbeing", title: "home.b.gym", value: "home.b.gymV" },
  { icon: "gift", tone: "green", tag: "home.t.benefit", title: "home.b.vouchers", value: "home.b.vouchersV" },
];

/** Inicio de Betterfly: la app anfitriona con su vida propia (nivel, Betterflies, desafío, beneficios del plan) y, arriba de
 *  todo, la pieza de Global Dollar Benefits: la invitación mientras no hay cuenta, el saldo cuando ya existe. */
export function HomeScreen() {
  const { c } = useTheme();
  useGdb();
  return (
    <LargeTitleScreen title={tr("home.hi", { name: DEMO.firstName })} smallTitle={tr("tab.home")} brand="Betterfly" brandRight={<LevelPill level={3} />}
      header={(
        <View style={{ paddingHorizontal: 16, gap: 14 }}>
          <T w={400} s={15} color={c.ink55} style={{ paddingHorizontal: 4 }}>{tr("home.plan", { employer: DEMO.employer })}</T>
          <StatsPill initials={DEMO.initials} betterflies="1,240" coins="320" coverage="$50K" />
        </View>
      )}>
      <View style={{ paddingHorizontal: 16, gap: 22 }}>
        <DollarBenefit />
        <ChallengeCard steps={6240} goal={8000} reward={200} />
        <View style={{ gap: 10 }}>
          <Eyebrow style={{ paddingHorizontal: 4 }}>{tr("home.benefits")}</Eyebrow>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {TILES.map((b) => (
              <View key={b.title} accessibilityLabel={`home-benefit-${b.icon}`} style={[{ width: "48.4%", padding: 14, gap: 14, borderRadius: 16, backgroundColor: c.card }, cardEdge(c)]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: BF[b.tone], alignItems: "center", justifyContent: "center" }}>
                    <Ico name={b.icon} size={19} color={BF.ink} sw={2} />
                  </View>
                  <BfTag label={tr(b.tag)} tone="mint" />
                </View>
                <View style={{ gap: 2 }}>
                  <T w={600} s={16} color={c.inkStrong}>{tr(b.title)}</T>
                  <T w={400} s={14} color={c.ink55}>{tr(b.value)}</T>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </LargeTitleScreen>
  );
}
