import { View } from "react-native";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import { toLocal } from "../gdb/activity";
import { cop, tr, usd } from "../gdb/copy";
import { DEMO, useGdb } from "../gdb/store";
import { nav } from "../gdb/ui";
import { CardFront } from "../ui/CardArt";
import { cardEdge, Ico, Press, Spinner } from "../ui/kit";
import { T } from "../ui/primitives";
import { BF, F, RADIUS } from "../ui/theme";
import { useTheme } from "../ui/ThemeProvider";
import { BfTag } from "./betterfly";

const POINTS = ["home.p.usd", "home.p.card", "home.p.cash"] as const;

/** La pieza de Global Dollar Benefits: invitación → verificación → saldo. La empresa sólo puede enviar el beneficio cuando la
 *  cuenta ya existe, así que la invitación nunca anuncia un monto. */
export function DollarBenefit({ a11y = "home" }: { a11y?: string }) {
  const { c } = useTheme();
  const { s, b, flags } = useGdb();
  const kyc = s.kyc.status;
  if (s.invitation.status === "none") return null; // la empresa aún no invita
  if (kyc === "approved") {
    return (
      <Press scale={0.98} onPress={() => nav("balance")} accessibilityLabel={`${a11y}-account`}
        style={[{ padding: 20, gap: 6, borderRadius: 20, backgroundColor: c.card }, cardEdge(c)]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <T w={500} s={14} color={c.ink55}>{tr("acct.available")}</T>
          <Ico name="chevronRight" size={18} color={c.ink25} sw={2} />
        </View>
        <T s={48} lh={1} color={c.inkStrong} accessibilityLabel="home-available" style={{ fontFamily: F.display }}>{cop(toLocal(b.available, DEMO.rate))}</T>
        {flags.showUsd ? <T w={400} s={15} color={c.ink55}>{usd(b.available)} USD</T> : null}
        {b.inTransit > 0 ? <T w={500} s={14} color={c.warning} accessibilityLabel="home-deposit" style={{ paddingTop: 4 }}>{tr("acct.n.deposit", { employer: s.invitation.employer })}</T> : null}
      </Press>
    );
  }
  const waiting = kyc === "pending";
  const title = waiting ? tr("home.review.title") : kyc === "retry_required" ? tr("home.verify.title") : kyc === "rejected" ? tr("kyc.rejected")
    : tr("home.invited.title", { employer: s.invitation.employer });
  const cta = waiting || kyc === "rejected" ? null : kyc === "retry_required" ? tr("home.verify.cta") : tr("home.invite.cta");
  // Con la invitación abierta, la pieza explica el beneficio: la tarjeta que llegará y para qué sirve la cuenta.
  const pitch = cta !== null && kyc !== "retry_required";
  const sub = kyc === "rejected" ? tr("kyc.rejectedSub") : pitch ? null : tr("gdb.sub");
  return (
    <View style={{ padding: 22, gap: 18, borderRadius: 24, backgroundColor: BF.greenDeep, overflow: "hidden" }}>
      {/* Superficie verde bosque de Betterfly, con luz arriba a la izquierda. Va en un contenedor a sangre: un porcentaje
          directo se mediría contra la caja de contenido (sin el padding) y dejaría una costura. */}
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="gdbBase" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={BF.forest} />
            <Stop offset="0.65" stopColor={BF.greenDeep} />
            <Stop offset="1" stopColor={BF.night} />
          </LinearGradient>
          <RadialGradient id="gdbLight" cx="0.08" cy="0" r="0.9">
            <Stop offset="0" stopColor={BF.green} stopOpacity="0.22" />
            <Stop offset="1" stopColor={BF.green} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#gdbBase)" />
        <Rect width="100%" height="100%" fill="url(#gdbLight)" />
      </Svg>
      </View>
      {/* La tarjeta Clara × Betterfly en miniatura, inclinada y saliendo por la esquina. */}
      {kyc === "rejected" ? null : (
        <View pointerEvents="none" style={{ position: "absolute", right: -40, top: 26, transform: [{ rotate: "-12deg" }],
          shadowColor: "#000000", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } }}>
          <CardFront width={150} brand="Betterfly" mode="preview" />
        </View>
      )}
      <View style={{ gap: 8, paddingRight: kyc === "rejected" ? 0 : 108, minHeight: 112 }}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {pitch ? <BfTag label={tr("home.tag.new")} tone="cyan" /> : null}
          <BfTag label={tr("gdb.name")} tone="mint" />
        </View>
        <T s={34} lh={1} color="#FFFFFF" style={{ fontFamily: F.display }}>{title}</T>
        {sub ? <T w={400} s={15} color="rgba(247,245,235,0.7)">{sub}</T> : null}
      </View>
      {pitch ? (
        <View style={{ gap: 10 }}>
          {POINTS.map((k) => (
            <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 20, height: 20, borderRadius: RADIUS.pill, backgroundColor: BF.green, alignItems: "center", justifyContent: "center" }}>
                <Ico name="check" size={12} color={BF.ink} sw={3} />
              </View>
              <T w={500} s={15} color="rgba(247,245,235,0.92)" style={{ flex: 1 }}>{tr(k)}</T>
            </View>
          ))}
        </View>
      ) : null}
      {cta ? (
        <Press onPress={() => nav("onboarding")} accessibilityLabel={`${a11y}-activate`}
          style={{ height: 50, borderRadius: RADIUS.pill, backgroundColor: BF.green, alignItems: "center", justifyContent: "center" }}>
          <T w={600} s={17} color={BF.ink}>{cta}</T>
        </Press>
      ) : waiting ? <View style={{ height: 50, alignItems: "flex-start", justifyContent: "center" }}><Spinner size={22} color={BF.green} sw={2.6} /></View> : null}
    </View>
  );
}
