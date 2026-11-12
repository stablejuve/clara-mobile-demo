import { BlurView } from "expo-blur";
import { useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, useWindowDimensions, View } from "react-native";
import type { AppCtx } from "../../ctx";
import { useAction } from "../../hooks/useAction";
import { t } from "../../i18n/es";
import { CARD_RATIO, CardBack, CardFront, cardLift, cardRadius } from "../../ui/CardArt";
import { useFaceIdHud } from "../../ui/FaceIdHud";
import { EASE_IOS, Eyebrow, Group, Hairline, Ico, type IcoName, LARGE_GAP, ListRow, PrimaryButton, Press, Toggle } from "../../ui/kit";
import { LargeTitleScreen } from "../../ui/LargeTitle";
import { T } from "../../ui/primitives";
import { RADIUS, RL } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import { BeneRow, NewBeneRow, sortBenes } from "./beneRow";
import { formatCents, usdcToMxnCents } from "../money";
import type { CardDetails } from "../types";

type Phase = "none" | "issuing" | "authorize" | "expired" | "reconfirming" | "active";

/** Tarjeta Visa virtual: pedir → emitiendo → autorizar con Face ID → tarjeta que se voltea, se congela y va a la Wallet. */
export function CardScreen({ module, faceId, nav, kyc }: AppCtx) {
  const { c } = useTheme();
  const { state, api } = module;
  const { error, run } = useAction();
  const hud = useFaceIdHud(faceId);
  const card = state.card;
  const { width: winW } = useWindowDimensions();
  const cardW = Math.min(winW, 440) - 40;
  const cardH = cardW / CARD_RATIO;
  const phase: Phase =
    card.status === "none" ? "none"
      : card.status === "requested" || card.status === "endorsement_pending" ? "issuing"
        : card.status === "endorsement_expired" ? (state.kyc.status === "under_review" ? "reconfirming" : "expired")
          : card.authorizedAt === null ? "authorize" : "active";
  const [details, setDetails] = useState<CardDetails | null>(null);
  const [frozenUi, setFrozenUi] = useState(card.status === "frozen");
  const [flipped, setFlipped] = useState(false);
  const benes = sortBenes(state.beneficiaries);
  const [online, setOnline] = useState(true);
  const [contactless, setContactless] = useState(true);
  const p = kyc.draft.personal;
  const holder = p.firstName ? `${p.firstName} ${p.lastName.split(" ")[0] ?? ""}`.trim().toUpperCase() : null;
  // Si la tarjeta ya estaba activa al entrar no hay animación de entrada; si se activa aquí, sí.
  const enter = useRef(new Animated.Value(phase === "active" ? 1 : 0)).current;
  const flip = useRef(new Animated.Value(0)).current;
  const frost = useRef(new Animated.Value(frozenUi ? 1 : 0)).current;

  useEffect(() => { setFrozenUi(card.status === "frozen"); }, [card.status]);
  useEffect(() => {
    if (phase !== "active") return;
    void api.getCard().then(setDetails).catch(() => {});
    Animated.parallel([
      Animated.spring(enter, { toValue: 1, useNativeDriver: true, damping: 13, stiffness: 120 }),
    ]).start();
  }, [phase, api, enter]);
  useEffect(() => { Animated.timing(flip, { toValue: flipped ? 1 : 0, duration: 650, easing: EASE_IOS, useNativeDriver: true }).start(); }, [flipped, flip]);
  useEffect(() => { Animated.timing(frost, { toValue: frozenUi ? 1 : 0, duration: 450, useNativeDriver: true }).start(); }, [frozenUi, frost]);

  const action = async () => {
    if (phase === "none") await run(() => api.requestCard());
    else if (phase === "authorize") { if (await hud.auth(t("rc.authorized"), t("rc.card.authReason"))) await run(() => api.authorizeCard()); }
    else if (phase === "expired") await run(() => api.reconfirmKyc());
  };
  const toggleFreeze = (v: boolean) => {
    setFrozenUi(v); setFlipped(false);
    void run(() => api.freezeCard(v)).then((r) => { if (!r) setFrozenUi(!v); });
  };
  const addWallet = async () => {
    if (await hud.auth(t("rc.added"), t("rc.card.walletReason"))) await run(() => api.addToWallet(Platform.OS === "android" ? "google" : "apple"));
  };

  const busy = phase === "issuing" || phase === "reconfirming";
  const title = phase === "authorize" ? t("rc.card.authTitle") : phase === "expired" || phase === "reconfirming" ? t("rc.card.expiredTitle") : t("rc.card.title");
  const sub = phase === "authorize" ? t("rc.card.authSub") : phase === "expired" || phase === "reconfirming" ? t("rc.card.expiredSub") : t("rc.card.sub");
  const btn = phase === "authorize" ? t("rc.card.authBtn") : busy ? (phase === "issuing" ? t("rc.card.issuing") : t("rc.verifying")) : phase === "expired" ? t("rc.card.expiredBtn") : t("rc.card.request");
  const walletName = Platform.OS === "android" ? "Google Wallet" : "Apple Wallet";
  const frontRot = flip.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backRot = flip.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });

  return (
    <View style={{ flex: 1 }}>
      <LargeTitleScreen title={t("rc.card")} back={t("rc.name")} titleGap={24}>
        <View style={{ paddingHorizontal: 20 }}>
          {phase !== "active" ? (
            <>
              <View style={[cardLift, { width: cardW, borderRadius: cardRadius(cardW) }]}>
                <CardFront width={cardW} brand={t("rc.name")} mode={phase === "issuing" ? "issuing" : phase === "expired" || phase === "reconfirming" ? "muted" : "preview"} holder={holder} />
              </View>
              <View style={{ paddingTop: 32, paddingHorizontal: 4, gap: 6 }}>
                <T w={600} s={22} lh={1.2} ls={-0.015} color={c.inkStrong} style={{ textAlign: "center" }}>{title}</T>
                <T w={400} s={15} lh={1.4} color={c.ink55} style={{ textAlign: "center" }}>{sub}</T>
                {error ? <T w={400} s={14} lh={1.4} color={c.error} style={{ textAlign: "center", paddingTop: 6 }}>{error}</T> : null}
              </View>
              <PrimaryButton label={btn} size={16} dim={busy} icon={phase === "authorize" ? "faceId" : undefined} onPress={() => { void action(); }} style={{ marginTop: 28 }} accessibilityLabel="card-action" />
            </>
          ) : (
            <>
              <Animated.View style={{
                opacity: enter,
                transform: [
                  { perspective: 1200 },
                  { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
                  { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
                  { rotateX: enter.interpolate({ inputRange: [0, 1], outputRange: ["18deg", "0deg"] }) },
                ],
              }}>
                <Pressable onPress={() => { if (!frozenUi) setFlipped((f) => !f); }} accessibilityLabel="card-flip" style={[cardLift, { width: cardW, height: cardH, borderRadius: cardRadius(cardW) }]}>
                  <Animated.View style={[faceStyle, { transform: [{ perspective: 1200 }, { rotateY: frontRot }] }]}>
                    <CardFront width={cardW} brand={t("rc.name")} mode="active" last4={details?.last4 ?? card.last4} holder={details?.holder ?? holder} expiry={details?.expiry ?? card.expiry}>
                      <Animated.View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: frost, alignItems: "center", justifyContent: "center" }}>
                        <BlurView intensity={8} tint="light" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
                        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: RL.frost }} />
                        <Ico name="freeze" size={44} color={RL.petrolDeep} sw={1.6} />
                      </Animated.View>
                    </CardFront>
                  </Animated.View>
                  <Animated.View style={[faceStyle, { transform: [{ perspective: 1200 }, { rotateY: backRot }] }]}>
                    <CardBack width={cardW}>
                      <T w={500} s={20} ls={0.06} mono color={RL.cream}>{details?.number ?? ""}</T>
                      <View style={{ flexDirection: "row", gap: 36 }}>
                        <CardField k={t("rc.card.expires")} v={details?.expiry ?? ""} />
                        <CardField k="CVV" v={details?.cvv ?? ""} />
                      </View>
                    </CardBack>
                  </Animated.View>
                </Pressable>
              </Animated.View>
              <T w={400} s={13} color={c.ink40} style={{ textAlign: "center", paddingTop: 14, paddingBottom: 26 }}>
                {frozenUi ? t("rc.card.frozen") : flipped ? t("rc.card.hide") : t("rc.card.show")}
              </T>
              <View style={{ gap: LARGE_GAP }}>
                <View style={{ alignItems: "center", gap: 2, marginTop: -8 }}>
                  <T w={400} s={13} color={c.ink55}>{t("rc.card.available")}</T>
                  <T w={600} s={24} ls={-0.02} color={c.inkStrong} style={{ fontVariant: ["tabular-nums"] }}>${formatCents(usdcToMxnCents(state.balanceUsdcCents))} MXN</T>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "center", gap: 36 }}>
                  <CardAction icon="arrowUpRight" label={t("rc.card.withdraw")} onPress={() => nav("send")} a11y="card-withdraw" />
                  <CardAction icon="eye" label={flipped ? t("rc.card.hideShort") : t("rc.card.details")} on={flipped} disabled={frozenUi} onPress={() => setFlipped((f) => !f)} a11y="card-details" />
                  <CardAction icon="freeze" label={frozenUi ? t("rc.card.unfreeze") : t("rc.card.freezeShort")} on={frozenUi} onPress={() => toggleFreeze(!frozenUi)} a11y="card-freeze" />
                </View>
                <Section title={t("rc.card.speiTitle")}>
                  {benes.slice(0, 3).map((b) => (
                    <View key={b.id}>
                      <BeneRow b={b} onPress={() => nav("send", { beneficiaryId: b.id })} />
                      <Hairline inset={68} />
                    </View>
                  ))}
                  {benes.length > 3 ? (
                    <>
                      <ListRow title={t("rc.bene.manage")} value={String(benes.length)} chevron onPress={() => nav("send")} accessibilityLabel="card-spei-all" />
                      <Hairline inset={16} />
                    </>
                  ) : null}
                  <NewBeneRow onPress={() => nav("beneficiary")} />
                </Section>
                <Section title={t("rc.card.controls")}>
                  <ToggleRow icon="bag" label={t("rc.card.online")} on={online} onChange={setOnline} />
                  <Hairline inset={48} />
                  <ToggleRow icon="nfc" label={t("rc.card.contactless")} on={contactless} onChange={setContactless} />
                </Section>
                <Section title={t("rc.card.limits")}>
                  <ListRow icon="gauge" title={t("rc.card.limitDaily")} value={t("rc.card.limitDailyValue")} valueMono />
                  <Hairline inset={48} />
                  <ListRow icon="landmark" title={t("rc.card.limitSpei")} value={t("rc.card.limitSpeiValue")} valueMono />
                </Section>
                {state.pass.status === "added" ? (
                  <View style={{ height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Ico name="check" size={18} color={c.success} sw={2.4} />
                    <T w={500} s={15} color={c.success}>{t("rc.card.inWallet", { wallet: walletName })}</T>
                  </View>
                ) : (
                  <Press onPress={() => { void addWallet(); }} accessibilityLabel="card-add-wallet"
                    style={{ height: 52, borderRadius: RADIUS.pill, backgroundColor: c.inkStrong, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <Ico name="wallet" size={20} color={c.page} sw={1.9} />
                    <T w={600} s={16} color={c.page}>{t("rc.card.addWallet", { wallet: walletName })}</T>
                  </Press>
                )}
                {error ? <T w={400} s={14} lh={1.4} color={c.error} style={{ textAlign: "center" }}>{error}</T> : null}
              </View>
            </>
          )}
        </View>
      </LargeTitleScreen>
      {hud.node}
    </View>
  );
}

const faceStyle = { position: "absolute" as const, top: 0, left: 0, backfaceVisibility: "hidden" as const };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Eyebrow style={{ paddingHorizontal: 4 }}>{title}</Eyebrow>
      <Group>{children}</Group>
    </View>
  );
}

function ToggleRow({ icon, label, on, onChange }: { icon: IcoName; label: string; on: boolean; onChange: (v: boolean) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 16, minHeight: 52 }}>
      <Ico name={icon} size={20} color={c.ink55} sw={1.8} />
      <T w={500} s={16} color={c.inkStrong} style={{ flex: 1 }}>{label}</T>
      <Toggle on={on} onChange={onChange} accessibilityLabel={label} />
    </View>
  );
}

/** Botón redondo bajo la tarjeta; `on` lo rellena (p. ej. congelada). */
function CardAction({ icon, label, on, disabled, onPress, a11y }: { icon: IcoName; label: string; on?: boolean; disabled?: boolean; onPress: () => void; a11y: string }) {
  const { c } = useTheme();
  return (
    <Press scale={0.94} onPress={onPress} disabled={disabled} accessibilityLabel={a11y} style={{ alignItems: "center", gap: 8, width: 76, opacity: disabled ? 0.4 : 1 }}>
      <View style={{ width: 54, height: 54, borderRadius: RADIUS.pill, backgroundColor: on ? c.brand : c.card, alignItems: "center", justifyContent: "center" }}>
        <Ico name={icon} size={22} color={on ? c.onBrand : c.brand} sw={1.9} />
      </View>
      <T w={500} s={13} color={c.inkStrong}>{label}</T>
    </Press>
  );
}

function CardField({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ gap: 4 }}>
      <T w={500} s={9.5} ls={0.1} mono color={RL.cream} style={{ opacity: 0.55 }}>{k}</T>
      <T w={500} s={15} mono color={RL.cream}>{v}</T>
    </View>
  );
}

