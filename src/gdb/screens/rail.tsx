import { View } from "react-native";
import { Eyebrow } from "../../ui/kit";
import { T } from "../../ui/primitives";
import { useTheme } from "../../ui/ThemeProvider";
import { type Key, tr, usd } from "../copy";
import { cardRail, type RailStep } from "../rail";
import { DEMO, useGdb } from "../store";
import { Notice, SheetFrame, type Step, Timeline } from "../ui";

/** Vista de demo (no es pantalla del empleado): el esquema «Tarjeta de Clara. Fondos en Bridge.» con el estado real de esta
 *  compra. 01 autorización en tiempo real; 02 movimiento entre wallets de Bridge al confirmarse la aprobación, y settlement después. */
export function RailSheet({ id }: { id: string }) {
  const { c } = useTheme();
  const { s } = useGdb();
  const a = s.auths.find((x) => x.id === id);
  if (!a) return <SheetFrame title={tr("rail.title")}>{null}</SheetFrame>;
  const rail = cardRail(a);
  const vars = { name: DEMO.firstName, merchant: a.merchant, amount: usd(a.amount), usdc: rail.usdc };
  const sub = (st: RailStep): string => {
    switch (st.node) {
      case "payer": return tr("rail.payerSub", vars);
      case "network": return tr("rail.networkSub");
      case "issuer": return st.state === "bad" ? tr("rail.issuerBad", { reason: tr(`pay.r.${a.declineReason ?? "insufficient_funds"}` as Key) }) : tr("rail.issuerSub");
      case "userWallet": return tr(a.status === "declined" ? "rail.walletSame" : rail.moved ? "rail.walletOut" : "rail.walletHold", vars);
      case "claraWallet": return tr("rail.walletIn", vars);
      case "bank": return tr("rail.bankSub");
      case "netSettle": return tr("rail.netSub");
    }
  };
  const steps = (xs: RailStep[]): Step[] => xs.map((st) => ({ label: tr(`rail.${st.node}` as Key, vars), sub: sub(st), code: st.call ?? undefined, state: st.state }));
  return (
    <SheetFrame title={tr("rail.title")}>
      <View style={{ gap: 4 }}>
        <T w={600} s={22} lh={1.2} ls={-0.01} color={c.inkStrong}>{tr("rail.lead")}</T>
        <T w={400} s={15} lh={1.35} color={c.ink55}>{tr("rail.leadSub")}</T>
      </View>
      <View style={{ gap: 14 }}>
        <Eyebrow>{tr("rail.p1")}</Eyebrow>
        <Timeline steps={steps(rail.authorization)} />
      </View>
      <View style={{ gap: 14 }}>
        <Eyebrow>{tr("rail.p2")}</Eyebrow>
        <T w={400} s={15} lh={1.35} color={c.ink55}>{tr("rail.p2Note", vars)}</T>
        {rail.stage === "moving" ? <Notice tone="wait" text={tr("rail.moving")} /> : rail.stage === "moved" ? <Notice tone="ok" text={tr("rail.movedNote")} /> : null}
        <Timeline steps={steps(rail.settlement)} />
      </View>
      <T w={400} s={13} color={c.ink40} style={{ textAlign: "center" }}>{tr("rail.foot")}</T>
    </SheetFrame>
  );
}
