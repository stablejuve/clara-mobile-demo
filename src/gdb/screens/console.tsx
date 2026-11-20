import { View } from "react-native";
import { Eyebrow, Group, Hairline, ListRow } from "../../ui/kit";
import { T } from "../../ui/primitives";
import { useTheme } from "../../ui/ThemeProvider";
import { type Key, tr, usd } from "../copy";
import { CONSOLE_ACTIONS, type ConsoleAction, useGdb } from "../store";
import { SheetFrame } from "../ui";

type Row = [ConsoleAction, Key, string?];

/** Consola de demo (solo desarrollo): los atajos del spec para disparar cada estado y restaurar el escenario. */
export function ConsoleSheet() {
  const { c } = useTheme();
  const { s, b, flags } = useGdb();
  const groups: [Key, Row[]][] = [
    ["con.scenario", [["reset", "con.reset"]]],
    ["con.companyS", [["invite", "con.invite", s.invitation.status]]],
    ["con.identity", [["kycFill", "con.kycFill"], ["approveKyc", "con.approveKyc", s.kyc.status], ["kycRetry", "con.kycRetry", flags.nextKyc === "retry_required" ? "✓" : ""], ["kycReject", "con.kycReject", flags.nextKyc === "rejected" ? "✓" : ""]]],
    ["con.fundingS", [["fundPending", "con.fundPending", usd(b.pending)], ["fundHold", "con.fundHold", usd(b.onHold)], ["fundRelease", "con.fundRelease", usd(b.available)]]],
    ["con.cardS", [["tap", "con.tap"], ["payBig", "con.payBig"], ["move", "con.move"], ["clear", "con.clear"], ["settle", "con.settle"], ["freeze", s.card.status === "frozen" ? "con.unfreeze" : "con.freeze", s.card.status]]],
    ["con.moneyS", [["expire", "con.expire"], ["beneFail", "con.beneFail", flags.failNextBene ? "✓" : ""], ["failWd", "con.failWd", flags.failNextWithdrawal ? "✓" : ""], ["reversal", "con.reversal"]]],
  ];
  return (
    <SheetFrame title={tr("con.title")} console={false}>
      {groups.map(([title, rows]) => (
        <View key={title} style={{ gap: 8 }}>
          <Eyebrow style={{ paddingHorizontal: 4 }}>{tr(title)}</Eyebrow>
          <Group>
            {rows.map(([action, label, value], n) => (
              <View key={action}>
                {n > 0 ? <Hairline /> : null}
                <ListRow title={tr(label)} value={value} valueMono onPress={CONSOLE_ACTIONS[action]} accessibilityLabel={`console-${action}`} py={12} />
              </View>
            ))}
          </Group>
        </View>
      ))}
      <T w={400} s={13} color={c.ink40} style={{ textAlign: "center" }}>{tr("con.note")}</T>
    </SheetFrame>
  );
}
