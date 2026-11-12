import { useEffect, useRef, useState } from "react";
import { Animated, Linking, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AppCtx } from "../../ctx";
import { useAction } from "../../hooks/useAction";
import { reasonCopy, t } from "../../i18n/es";
import { useFaceIdHud } from "../../ui/FaceIdHud";
import { CloseButton, DrawCheck, EASE_IOS, Grabber, Group, Hairline, Ico, type IcoName, Isotype, PoweredLabel, PrimaryButton, Spinner, Toggle } from "../../ui/kit";
import { T } from "../../ui/primitives";
import { RADIUS } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import { shortAddress } from "../format";
import { draftDone, KYC_SECTIONS, type KycDraft, type KycSection, sectionDone, toSubmission } from "../kyc";
import { onboardingPage } from "../state";
import { kycRowSummary } from "./kycForm";

const PAGES = 4;
const BRIDGE_TERMS = "https://www.bridge.xyz/legal";
const RELAYER_TERMS = "https://relayer.fi";

/** Hoja de alta del diseño: carril de 4 páginas con segmentos de progreso arriba. */
export function OnboardingSheet(ctx: AppCtx) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState<number>(() => onboardingPage(ctx.module.state));
  const x = useRef(new Animated.Value(-page * width)).current;
  useEffect(() => { Animated.timing(x, { toValue: -page * width, duration: 520, easing: EASE_IOS, useNativeDriver: true }).start(); }, [page, width, x]);
  const hud = useFaceIdHud(ctx.faceId);
  const go = (p: number) => setPage(Math.min(PAGES - 1, p));
  return (
    <View style={{ flex: 1, backgroundColor: c.page }}>
      <Grabber />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 10, paddingHorizontal: 16 }}>
        <View style={{ flex: 1, flexDirection: "row", gap: 4 }}>
          {Array.from({ length: PAGES }, (_, i) => <View key={i} style={{ flex: 1, height: 3, borderRadius: RADIUS.pill, backgroundColor: i <= page ? c.brand : c.ink15 }} />)}
        </View>
        <CloseButton onPress={ctx.back} />
      </View>
      <View style={{ flex: 1, overflow: "hidden", marginTop: 5 }}>
        <Animated.View style={{ flexDirection: "row", width: width * PAGES, flex: 1, transform: [{ translateX: x }] }}>
          <View style={{ width }}><IntroPage next={() => go(1)} /></View>
          <View style={{ width }}><TermsPage ctx={ctx} next={() => go(2)} /></View>
          <View style={{ width }}><KycPage ctx={ctx} next={() => go(3)} /></View>
          <View style={{ width }}><PasskeyPage ctx={ctx} auth={hud.auth} /></View>
        </Animated.View>
      </View>
      {hud.node}
    </View>
  );
}

function useBottom(): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, 12) + 12;
}

function PageTitle({ title, sub }: { title: string; sub: string }) {
  const { c } = useTheme();
  return (
    <>
      <View style={{ paddingHorizontal: 8 }}><T w={700} s={30} lh={1.1} ls={-0.025} color={c.inkStrong}>{title}</T></View>
      <View style={{ paddingTop: 8, paddingHorizontal: 8 }}><T w={400} s={17} lh={1.35} color={c.ink55}>{sub}</T></View>
    </>
  );
}

// ── 1 · Intro ───────────────────────────────────────────────────────────────
function IntroPage({ next }: { next: () => void }) {
  const { c } = useTheme();
  const bottom = useBottom();
  const features: [IcoName, string, string][] = [
    ["globe", t("rc.intro.f1"), t("rc.intro.f1s")],
    ["banknote", t("rc.intro.f2"), t("rc.intro.f2s")],
    ["landmark", t("rc.intro.f3"), t("rc.intro.f3s")],
  ];
  return (
    <View style={{ flex: 1, paddingTop: 40, paddingHorizontal: 28, paddingBottom: bottom }}>
      <View style={{ alignSelf: "center" }}><Isotype box={72} glyph={34} /></View>
      <T w={700} s={34} lh={1.1} ls={-0.025} color={c.inkStrong} style={{ textAlign: "center", paddingTop: 22 }}>{t("rc.name")}</T>
      <T w={400} s={17} lh={1.35} color={c.ink55} style={{ textAlign: "center", paddingTop: 8 }}>{t("rc.intro.sub")}</T>
      <View style={{ gap: 26, paddingTop: 48, paddingHorizontal: 8 }}>
        {features.map(([icon, title, sub]) => (
          <View key={icon} style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
            <Ico name={icon} size={28} color={c.brand} sw={1.7} />
            <View style={{ gap: 2 }}>
              <T w={600} s={16} color={c.inkStrong}>{title}</T>
              <T w={400} s={15} color={c.ink55}>{sub}</T>
            </View>
          </View>
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <PrimaryButton label={t("common.continue")} onPress={next} accessibilityLabel="onboarding-intro-next" />
      <View style={{ paddingTop: 14 }}><PoweredLabel /></View>
    </View>
  );
}

// ── 2 · Términos ────────────────────────────────────────────────────────────
function TermsPage({ ctx, next }: { ctx: AppCtx; next: () => void }) {
  const { c } = useTheme();
  const bottom = useBottom();
  const { state, api } = ctx.module;
  const accepted = state.module !== "off" && state.module !== "terms_pending";
  const [agree, setAgree] = useState(accepted);
  const { busy, error, run } = useAction();
  const accept = async () => {
    if (accepted) { next(); return; }
    if (await run(() => api.acceptTerms())) next();
  };
  const link = (title: string, sub: string, url: string) => (
    <Pressable onPress={() => { void Linking.openURL(url).catch(() => {}); }} accessibilityLabel={`terms-${title}`}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: pressed ? c.ink04 : "transparent" })}>
      <View style={{ flex: 1, gap: 2 }}>
        <T w={500} s={16} color={c.inkStrong}>{title}</T>
        <T w={400} s={13} color={c.ink55}>{sub}</T>
      </View>
      <Ico name="chevronRight" size={18} color={c.ink25} sw={2} />
    </Pressable>
  );
  return (
    <View style={{ flex: 1, paddingTop: 40, paddingHorizontal: 20, paddingBottom: bottom }}>
      <PageTitle title={t("rc.terms.title")} sub={t("rc.terms.sub")} />
      <Group style={{ marginTop: 32 }}>
        {link("Bridge", t("rc.terms.bridge"), BRIDGE_TERMS)}
        <Hairline />
        {link("Relayer", t("rc.terms.relayer"), RELAYER_TERMS)}
      </Group>
      <Group style={{ marginTop: 22 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 16, minHeight: 52 }}>
          <T w={500} s={16} color={c.inkStrong} style={{ flex: 1 }}>{t("rc.terms.agree")}</T>
          <Toggle on={agree} onChange={setAgree} accessibilityLabel="terms-agree" />
        </View>
      </Group>
      {error ? <T w={400} s={14} lh={1.4} color={c.error} style={{ paddingTop: 14, paddingHorizontal: 8 }}>{error}</T> : null}
      <View style={{ flex: 1 }} />
      <PrimaryButton label={t("rc.terms.accept")} dim={!agree || busy} onPress={() => { void accept(); }} accessibilityLabel="terms-accept" />
    </View>
  );
}

// ── 3 · KYC ─────────────────────────────────────────────────────────────────
type KycPhase = "edit" | "review" | "ok" | "rejected";

function KycPage({ ctx, next }: { ctx: AppCtx; next: () => void }) {
  const { c } = useTheme();
  const bottom = useBottom();
  const { state, api } = ctx.module;
  const { draft } = ctx.kyc;
  const { busy, error, run } = useAction();
  const now = new Date();
  const k = state.kyc.status;
  const phase: KycPhase = k === "under_review" ? "review" : k === "approved" ? "ok" : k === "rejected" ? "rejected" : "edit";
  const editable = phase === "edit" || phase === "rejected";
  const complete = draftDone(draft, now);
  const submit = async () => { await run(() => api.submitKyc(toSubmission(draft))); };
  const action = () => {
    if (phase === "ok") next();
    else if (editable && complete) void submit();
  };
  const noteColor = phase === "ok" ? c.success : phase === "rejected" ? c.error : c.ink55;
  const btn = phase === "ok" ? t("common.continue") : phase === "review" || busy ? t("rc.verifying") : phase === "rejected" ? t("rc.kyc.resend") : t("rc.kyc.send");
  return (
    <View style={{ flex: 1, paddingBottom: bottom }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 40, paddingHorizontal: 20, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        <PageTitle title={t("rc.kyc.title")} sub={t("rc.kyc.sub")} />
        <Group style={{ marginTop: 32 }}>
          {KYC_SECTIONS.map((s) => (
            <KycRow key={s} section={s} draft={draft} done={phase === "review" || phase === "ok" || sectionDone(draft, s, now)} editable={editable}
              onPress={() => ctx.nav("kycForm", { section: s })} />
          ))}
        </Group>
        <View style={{ minHeight: 56, alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 6 }}>
          {phase !== "edit" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {phase === "review" ? <Spinner size={16} color={noteColor} /> : null}
              {phase === "ok" ? <Ico name="check" size={16} color={noteColor} sw={2.6} /> : null}
              {phase === "rejected" ? <Ico name="alert" size={16} color={noteColor} sw={2.2} /> : null}
              <T w={500} s={15} color={noteColor}>{phase === "ok" ? t("rc.kyc.approved") : phase === "rejected" ? t("rc.kyc.rejected") : t("rc.kyc.review")}</T>
            </View>
          ) : !complete ? (
            <T w={400} s={14} lh={1.4} color={c.ink55} style={{ textAlign: "center" }}>{t("rc.kyc.hint")}</T>
          ) : null}
          {phase === "rejected" ? state.kyc.rejectionReasons.map((r) => (
            <T key={r} w={400} s={13} lh={1.4} color={c.ink55} style={{ textAlign: "center", paddingHorizontal: 8 }}>{reasonCopy(r)}</T>
          )) : null}
          {error ? <T w={400} s={14} lh={1.4} color={c.error} style={{ textAlign: "center" }}>{error}</T> : null}
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 20 }}>
        <PrimaryButton label={btn} dim={phase === "review" || busy || (editable && !complete)} onPress={action} accessibilityLabel="kyc-action" />
      </View>
    </View>
  );
}

function KycRow({ section, draft, done, editable, onPress }: { section: KycSection; draft: KycDraft; done: boolean; editable: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const summary = kycRowSummary(draft, section, done);
  return (
    <Pressable onPress={editable ? onPress : undefined} accessibilityLabel={`kyc-row-${section}`}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: c.ink08, backgroundColor: pressed && editable ? c.ink04 : "transparent" })}>
      <View style={{ width: 26, height: 26, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center", backgroundColor: done ? c.brand : c.ink08 }}>
        {done ? <Ico name="check" size={14} color={c.onBrand} sw={3} /> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <T w={500} s={16} color={done ? c.inkStrong : c.ink72}>{t(`kyc2.section.${section}`)}</T>
        <T w={400} s={13} color={c.ink55} numberOfLines={1}>{summary}</T>
      </View>
      {editable ? <Ico name="chevronRight" size={18} color={c.ink25} sw={2} /> : null}
    </Pressable>
  );
}

// ── 4 · Passkey ─────────────────────────────────────────────────────────────
function PasskeyPage({ ctx, auth }: { ctx: AppCtx; auth: (label: string, reason: string) => Promise<boolean> }) {
  const { c } = useTheme();
  const bottom = useBottom();
  const { state, api } = ctx.module;
  const done = state.wallet.status === "address_ready";
  const { busy, error, run } = useAction();
  const faceO = useRef(new Animated.Value(done ? 0 : 1)).current;
  const addr = useRef(new Animated.Value(done ? 1 : 0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(faceO, { toValue: done ? 0 : 1, duration: 350, useNativeDriver: true }),
      Animated.timing(addr, { toValue: done ? 1 : 0, duration: 500, delay: done ? 500 : 0, easing: EASE_IOS, useNativeDriver: true }),
    ]).start();
  }, [done, faceO, addr]);
  const create = async () => {
    if (!(await auth(t("common.ready"), t("rc.wallet.reason")))) return;
    await run(() => api.createPasskey());
  };
  const finish = () => {
    void ctx.notifications.ensurePermission(); // para avisar de la nómina con la app en segundo plano
    ctx.back();
    setTimeout(() => ctx.openBalance(), 420);
  };
  return (
    <View style={{ flex: 1, alignItems: "center", paddingTop: 72, paddingHorizontal: 28, paddingBottom: bottom }}>
      <View style={{ width: 96, height: 96 }}>
        <Animated.View style={{ position: "absolute", opacity: faceO, transform: [{ scale: faceO.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
          <Ico name="faceIdNose" size={96} color={c.brand} sw={1.2} />
        </Animated.View>
        <View style={{ position: "absolute" }}><DrawCheck drawn={done} color={c.success} /></View>
      </View>
      <T w={700} s={30} lh={1.1} ls={-0.025} color={c.inkStrong} style={{ paddingTop: 32, textAlign: "center" }}>{done ? t("rc.wallet.ready") : t("rc.wallet.title")}</T>
      <T w={400} s={17} lh={1.35} color={c.ink55} style={{ paddingTop: 8, textAlign: "center" }}>{done ? t("rc.wallet.readySub") : t("rc.wallet.sub")}</T>
      <Animated.View style={{ marginTop: 24, opacity: addr, transform: [{ translateY: addr.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
        <View style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: RADIUS.pill, backgroundColor: c.ink08 }}>
          <T w={500} s={13} mono color={c.ink72}>{shortAddress(state.wallet.address)} · Base</T>
        </View>
      </Animated.View>
      {error ? <T w={400} s={14} lh={1.4} color={c.error} style={{ textAlign: "center", paddingTop: 16 }}>{error}</T> : null}
      <View style={{ flex: 1 }} />
      <PrimaryButton label={done ? t("common.ready") : busy ? t("rc.wallet.creating") : t("rc.wallet.btn")} icon={done ? undefined : "faceId"} dim={busy}
        onPress={() => { if (done) finish(); else void create(); }} style={{ alignSelf: "stretch" }} accessibilityLabel="passkey-action" />
    </View>
  );
}
