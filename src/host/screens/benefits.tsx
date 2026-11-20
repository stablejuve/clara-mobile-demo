import { View } from "react-native";
import { tr } from "../../gdb/copy";
import { useGdb } from "../../gdb/store";
import { nav } from "../../gdb/ui";
import { Eyebrow, Group, Hairline, ListRow } from "../../ui/kit";
import { LargeTitleScreen } from "../../ui/LargeTitle";
import { DollarBenefit } from "../DollarBenefit";

/** Beneficios de Betterfly: Global Dollar Benefits se anuncia arriba mientras no hay cuenta; después es una fila más del catálogo. */
export function BenefitsScreen() {
  const { s } = useGdb();
  const open = () => nav(s.kyc.status === "approved" ? "balance" : "onboarding");
  return (
    <LargeTitleScreen title={tr("tab.benefits")}>
      <View style={{ paddingHorizontal: 16, gap: 24 }}>
        {s.invitation.status === "none" ? null : s.kyc.status === "approved" ? (
          <Group>
            <ListRow icon="globe" title={tr("gdb.name")} sub={tr("gdb.sub")} chevron onPress={open} accessibilityLabel="benefits-gdb" />
          </Group>
        ) : <DollarBenefit a11y="benefits" />}
        <View style={{ gap: 8 }}>
          <Eyebrow style={{ paddingHorizontal: 4 }}>{tr("home.more")}</Eyebrow>
          <Group>
            <ListRow icon="shield" title={tr("home.b.life")} value={tr("home.b.lifeV")} />
          <Hairline inset={48} />
          <ListRow icon="user" title={tr("home.b.mind")} value={tr("home.b.mindV")} />
          <Hairline inset={48} />
          <ListRow icon="activity" title={tr("home.b.gym")} value={tr("home.b.gymV")} />
            <Hairline inset={48} />
            <ListRow icon="gift" title={tr("home.b.vouchers")} value={tr("home.b.vouchersV")} />
          </Group>
        </View>
      </View>
    </LargeTitleScreen>
  );
}
