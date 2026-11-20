import { View } from "react-native";
import { CardFront, cardLift, cardRadius } from "../../ui/CardArt";
import { Eyebrow, Group, Hairline, ListRow, PrimaryButton } from "../../ui/kit";
import { LargeTitleScreen } from "../../ui/LargeTitle";
import { T } from "../../ui/primitives";
import { useTheme } from "../../ui/ThemeProvider";
import { feed } from "../activity";
import { tr } from "../copy";
import { useFrameWidth } from "../frame";
import { DEMO, gdb, useGdb } from "../store";
import { ActivityRow, ConsoleButton, nav, Notice, RoundAction } from "../ui";
import { openActivity } from "./account";

/** Tarjeta virtual Betterfly Mastercard (pantalla 04): se emite al aprobar el KYC, se activa con un toque y se puede congelar.
 *  Nunca muestra número completo ni CVV. Debajo van las compras hechas con ella. */
export function CardScreen() {
  const { c } = useTheme();
  const { s, flags } = useGdb();
  const purchases = feed(s, DEMO.rate).filter((it) => it.kind === "card");
  const width = useFrameWidth();
  const cardW = Math.min(width, 440) - 40;
  const st = s.card.status;
  const kyc = s.kyc.status;
  return (
    <LargeTitleScreen title={tr("card.title")} back={tr("acct.title")} right={<ConsoleButton />}>
      <View style={{ paddingHorizontal: 20, gap: 24 }}>
        <View style={[cardLift, { width: cardW, borderRadius: cardRadius(cardW) }]}>
          <CardFront width={cardW} brand="Betterfly" tier={tr("card.tier")} partnerTag={tr("card.partnerTag")}
            mode={st === "none" || st === "frozen" ? "muted" : st === "issued" ? "preview" : "active"} last4={s.card.last4} holder={st === "none" ? null : DEMO.employee.toUpperCase()} />
        </View>
        {st === "none" ? (
          <View style={{ gap: 18 }}>
            <T w={400} s={16} lh={1.35} color={c.ink55} style={{ textAlign: "center" }}>{tr(kyc === "pending" ? "card.review" : kyc === "rejected" ? "kyc.rejected" : "card.needKyc")}</T>
            {kyc === "pending" || kyc === "rejected" ? null : <PrimaryButton label={tr("card.verify")} onPress={() => nav("onboarding")} accessibilityLabel="card-verify" />}
          </View>
        ) : st === "issued" ? (
          <View style={{ gap: 18 }}>
            <View style={{ gap: 4 }}>
              <T w={600} s={22} color={c.inkStrong} style={{ textAlign: "center" }}>{tr("card.ready")}</T>
              <T w={400} s={16} color={c.ink55} style={{ textAlign: "center" }}>{tr("card.name")} · {tr("card.virtual", { last4: s.card.last4 ?? "" })}</T>
            </View>
            <PrimaryButton label={tr("card.activate")} onPress={() => { gdb.activateCard(); }} accessibilityLabel="card-activate" />
          </View>
        ) : (
          <View style={{ gap: 22 }}>
            <T w={400} s={15} color={c.ink55} style={{ textAlign: "center" }}>{tr("card.name")} · {tr("card.virtual", { last4: s.card.last4 ?? "" })}</T>
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 12 }}>
              <RoundAction icon="bag" label={tr("card.pay")} onPress={() => nav("pay")} a11y="card-pay" />
              <RoundAction icon="freeze" label={tr(st === "frozen" ? "card.unfreeze" : "card.freeze")} on={st === "frozen"} onPress={() => gdb.freeze(st !== "frozen")} a11y="card-freeze" />
              <RoundAction icon={s.card.inWallet ? "check" : "wallet"} label={tr("card.wallet")} disabled={st === "frozen" || s.card.inWallet} onPress={() => gdb.addToWallet()} a11y="card-wallet" />
            </View>
            {st === "frozen" ? <Notice tone="wait" text={tr("card.frozen")} /> : s.card.inWallet ? <Notice tone="ok" text={tr("card.inWallet")} /> : null}
          </View>
        )}
        {/* Las compras hechas con la tarjeta. La lista general (cuenta) suma además beneficios y retiros. */}
        {st === "active" || st === "frozen" ? (
          <View style={{ gap: 8, marginHorizontal: -4 }}>
            <Eyebrow style={{ paddingHorizontal: 4 }}>{tr("card.txs")}</Eyebrow>
            <Group>
              {purchases.length === 0 ? (
                <View style={{ paddingVertical: 28, alignItems: "center" }}><T w={400} s={15} color={c.ink40}>{tr("card.noTxs")}</T></View>
              ) : purchases.slice(0, 5).map((it, n) => (
                <View key={it.id}>
                  {n > 0 ? <Hairline inset={66} /> : null}
                  <ActivityRow item={it} showUsd={flags.showUsd} onPress={() => nav("movement", { id: it.id })} />
                </View>
              ))}
              {purchases.length > 5 ? <><Hairline /><ListRow title={tr("common.seeAll")} chevron onPress={() => openActivity("card")} accessibilityLabel="card-all" /></> : null}
            </Group>
          </View>
        ) : null}
        <T w={400} s={12} lh={1.4} color={c.ink40} style={{ textAlign: "center", paddingHorizontal: 12 }}>{tr("card.disclosure")}</T>
      </View>
    </LargeTitleScreen>
  );
}
