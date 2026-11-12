import * as Clipboard from "expo-clipboard";
import { useEffect, useRef, useState } from "react";
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AppCtx } from "../../ctx";
import { useAction } from "../../hooks/useAction";
import { type Key, t } from "../../i18n/es";
import { Field, Rows, Select } from "../../ui/form";
import { EASE_IOS, Grabber, Group, Hairline, Ico, type IcoName, PrimaryButton, SoftPill, Toggle } from "../../ui/kit";
import { T } from "../../ui/primitives";
import { RADIUS } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import { type BeneDraft, beneMissing, EMPTY_BENE, fillBene, holderName, stepDone, stepsFor, toNewBeneficiary } from "../beneficiaries";
import { bankFor, clabeValid } from "../clabe";
import { STATES_MX } from "../kyc";
import type { BeneficiaryOwner } from "../types";
import { BeneAvatar } from "./beneRow";
import { groupClabe } from "./send";

const OWNERS: readonly { owner: BeneficiaryOwner; icon: IcoName }[] = [
  { owner: "self", icon: "user" },
  { owner: "individual", icon: "users" },
  { owner: "business", icon: "briefcase" },
];

/** Hoja «Nueva cuenta»: el asistente de beneficiarios de relayer-core en pasos de hoja. Guardar → addBeneficiary → se verifica sola. */
export function BeneficiaryFormSheet(ctx: AppCtx) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { api } = ctx.module;
  const { error, setError, run } = useAction();
  const me = ctx.kyc.draft.personal;
  const [d, setD] = useState<BeneDraft>(EMPTY_BENE);
  const [i, setI] = useState(0);
  const steps = stepsFor(d.owner);
  const step = steps[i];
  const miss = beneMissing(d, step);
  const last = i === steps.length - 1;
  const [saving, setSaving] = useState(false);
  const progress = useRef(new Animated.Value(1 / steps.length)).current;
  useEffect(() => { Animated.timing(progress, { toValue: (i + 1) / steps.length, duration: 380, easing: EASE_IOS, useNativeDriver: false }).start(); }, [i, steps.length, progress]);

  const set = (patch: Partial<BeneDraft>) => { setError(""); setD((x) => ({ ...x, ...patch })); };
  const pickOwner = (owner: BeneficiaryOwner) => set(owner === "self"
    ? { owner, firstName: [me.firstName, me.middleName].filter(Boolean).join(" "), lastName: me.lastName, businessName: "" }
    : { owner, ...(d.owner === "self" ? { firstName: "", lastName: "" } : {}) });
  const next = async () => {
    if (!stepDone(d, step) || saving) return;
    if (!last) { setI(i + 1); return; }
    setSaving(true);
    const b = await run(() => api.addBeneficiary(toNewBeneficiary(d)));
    setSaving(false);
    if (b) ctx.back();
  };
  const back = () => { setError(""); if (i === 0) ctx.back(); else setI(i - 1); };

  const intro = step === "identity" && d.owner === "self" ? t("bene.intro.identitySelf") : t(`bene.intro.${step}`);
  return (
    <View style={{ flex: 1, backgroundColor: c.page }}>
      <Grabber />
      <View style={{ height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 }}>
        <Pressable onPress={back} hitSlop={8} style={{ minWidth: 80 }} accessibilityLabel="bene-back"><T w={400} s={17} color={c.brand}>{i === 0 ? t("common.cancel") : t("rc.send.back")}</T></Pressable>
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, alignItems: "center" }}><T w={600} s={17} color={c.inkStrong}>{t("bene.title")}</T></View>
        <View style={{ minWidth: 80, alignItems: "flex-end" }}><T w={400} s={13} mono color={c.ink40}>{i + 1}/{steps.length}</T></View>
      </View>
      <View style={{ height: 2, marginHorizontal: 16, borderRadius: RADIUS.pill, backgroundColor: c.ink08, overflow: "hidden" }}>
        <Animated.View style={{ height: 2, backgroundColor: c.brand, width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={60}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 22, paddingBottom: 24, gap: 22 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ gap: 6, paddingHorizontal: 4 }}>
            <T w={600} s={24} lh={1.15} ls={-0.02} color={c.inkStrong}>{t(`bene.step.${step}`)}</T>
            <T w={400} s={15} lh={1.4} color={c.ink55}>{intro}</T>
            {step !== "owner" && step !== "review" ? (
              <View style={{ flexDirection: "row", paddingTop: 8 }}><SoftPill icon="sparkles" label={t("kyc2.fill")} onPress={() => setD((x) => fillBene(x, step, me))} accessibilityLabel="bene-fill-sample" /></View>
            ) : null}
          </View>

          {step === "owner" ? (
            <Group>
              {OWNERS.map(({ owner, icon }, k) => (
                <View key={owner}>
                  {k > 0 ? <Hairline inset={68} /> : null}
                  <Pressable onPress={() => pickOwner(owner)} accessibilityLabel={`bene-owner-${owner}`}
                    style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: pressed ? c.ink04 : "transparent" })}>
                    <View style={{ width: 38, height: 38, borderRadius: RADIUS.pill, backgroundColor: d.owner === owner ? c.brand : c.ink08, alignItems: "center", justifyContent: "center" }}>
                      <Ico name={icon} size={19} color={d.owner === owner ? c.onBrand : c.ink72} sw={1.9} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T w={500} s={16} color={c.inkStrong}>{t(`bene.owner.${owner}`)}</T>
                      <T w={400} s={13} color={c.ink55}>{t(`bene.owner.${owner}Sub`)}</T>
                    </View>
                    <View style={{ width: 22, height: 22, borderRadius: RADIUS.pill, borderWidth: d.owner === owner ? 0 : 1.5, borderColor: c.ink25, backgroundColor: d.owner === owner ? c.brand : "transparent", alignItems: "center", justifyContent: "center" }}>
                      {d.owner === owner ? <Ico name="check" size={13} color={c.onBrand} sw={3} /> : null}
                    </View>
                  </Pressable>
                </View>
              ))}
            </Group>
          ) : null}

          {step === "identity" ? (
            <Rows>
              {d.owner === "business"
                ? <Field label={t("bene.field.businessName")} value={d.businessName} onChange={(v) => set({ businessName: v })} placeholder="Papelería Lupita S.A. de C.V." autoCapitalize="words" />
                : <Field label={t("bene.field.firstName")} value={d.firstName} onChange={(v) => set({ firstName: v })} placeholder="María" autoCapitalize="words" editable={d.owner !== "self"} />}
              {d.owner !== "business"
                ? <Field label={t("bene.field.lastName")} value={d.lastName} onChange={(v) => set({ lastName: v })} placeholder="Medina Ruiz" autoCapitalize="words" editable={d.owner !== "self"} />
                : null}
              <Field label={t("bene.field.alias")} value={d.alias} onChange={(v) => set({ alias: v })} placeholder={d.owner === "self" ? "Mi Banorte" : "Mamá"} />
              {d.owner !== "self" ? <Field label={t("bene.field.email")} value={d.email} onChange={(v) => set({ email: v })} placeholder="nombre@correo.com" keyboardType="email-address" autoCapitalize="none" /> : null}
            </Rows>
          ) : null}

          {step === "address" ? (
            <Rows>
              <Field label={t("bene.field.street")} value={d.street} onChange={(v) => set({ street: v })} placeholder="Calle Pino 45" />
              <Field label={t("bene.field.city")} value={d.city} onChange={(v) => set({ city: v })} placeholder="Benito Juárez" />
              <Select label={t("bene.field.state")} value={d.state} options={[...STATES_MX, ...(d.state && !(STATES_MX as readonly string[]).includes(d.state) ? [d.state] : [])]} labelOf={(v) => v} onChange={(v) => set({ state: v })} />
              <Field label={t("bene.field.postalCode")} value={d.postalCode} onChange={(v) => set({ postalCode: v.replace(/\D/g, "").slice(0, 5) })} placeholder="03100" keyboardType="number-pad" />
            </Rows>
          ) : null}

          {step === "bank" ? (
            <View style={{ gap: 10 }}>
              <Rows>
                <Field label={t("bene.field.clabe")} value={groupClabe(d.clabe)} onChange={(v) => set({ clabe: v.replace(/\D/g, "").slice(0, 18) })} placeholder="000 000 00000000000 0" keyboardType="number-pad" />
                {d.owner !== "self" ? <Field label={t("bene.field.rfc")} value={d.rfc} onChange={(v) => set({ rfc: v.toUpperCase() })} placeholder="XAXX010101000" autoCapitalize="characters" /> : null}
              </Rows>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, minHeight: 32 }}>
                <ClabeNote clabe={d.clabe} />
                {!d.clabe ? <SoftPill label={t("rc.send.paste")} onPress={() => { void Clipboard.getStringAsync().then((x) => { const n = x.replace(/\D/g, ""); if (n.length === 18) set({ clabe: n }); }).catch(() => {}); }} accessibilityLabel="bene-paste" /> : null}
              </View>
            </View>
          ) : null}

          {step === "review" ? (
            <View style={{ gap: 18 }}>
              <View style={{ alignItems: "center", gap: 10, paddingTop: 4 }}>
                <BeneAvatar b={{ name: holderName(d), owner: d.owner }} size={56} />
                <T w={600} s={19} color={c.inkStrong} style={{ textAlign: "center" }}>{d.alias || holderName(d)}</T>
              </View>
              <Group>
                {([
                  [t("bene.review.type"), t(`bene.owner.${d.owner}`)],
                  [t("bene.review.holder"), holderName(d)],
                  [t("bene.review.bank"), bankFor(d.clabe) ?? t("rc.bank")],
                  [t("bene.field.clabe"), groupClabe(d.clabe)],
                  ...(d.owner !== "self" ? [[t("bene.review.address"), `${d.street}, ${d.city}, ${d.state} ${d.postalCode}`]] : []),
                ] as [string, string][]).map(([k, v], n) => (
                  <View key={k}>
                    {n > 0 ? <Hairline /> : null}
                    <View style={{ flexDirection: "row", gap: 12, paddingVertical: 13, paddingHorizontal: 16 }}>
                      <T w={400} s={15} color={c.ink55}>{k}</T>
                      <T w={500} s={15} mono={k === t("bene.field.clabe")} color={c.inkStrong} style={{ flex: 1, textAlign: "right" }}>{v}</T>
                    </View>
                  </View>
                ))}
              </Group>
              <Group>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 16, minHeight: 52 }}>
                  <T w={500} s={15} lh={1.3} color={c.inkStrong} style={{ flex: 1 }}>{t("bene.confirm", { name: holderName(d) })}</T>
                  <Toggle on={d.confirm} onChange={(v) => set({ confirm: v })} accessibilityLabel="bene-confirm" />
                </View>
              </Group>
            </View>
          ) : null}
        </ScrollView>
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12) + 12, gap: 10 }}>
          {error ? <T w={400} s={13} lh={1.4} color={c.error} style={{ textAlign: "center" }}>{error}</T>
            : miss.length > 0 && step !== "owner" ? (
              <T w={400} s={13} lh={1.4} color={c.ink55} style={{ textAlign: "center" }}>
                {t("kyc2.missing", { fields: miss.map((f) => t(`bene.field.${f}` as Key)).join(", ") })}
              </T>
            ) : null}
          <PrimaryButton label={last ? t("bene.save") : t("bene.next")} dim={!stepDone(d, step) || saving} onPress={() => { void next(); }} accessibilityLabel="bene-next" />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Banco detectado / dígitos / CLABE inválida. */
function ClabeNote({ clabe }: { clabe: string }) {
  const { c } = useTheme();
  const bank = clabe.length >= 3 ? bankFor(clabe) : null;
  const bad = clabe.length === 18 && !clabeValid(clabe);
  const ok = clabe.length === 18 && !bad;
  const text = bad ? t("errors.clabe_invalid") : bank ? t("bene.bankDetected", { bank }) : clabe ? t("rc.send.digits", { n: clabe.length }) : "";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 }}>
      {ok ? <Ico name="check" size={14} color={c.success} sw={2.6} /> : null}
      <T w={500} s={13} color={bad ? c.error : ok ? c.success : c.ink55} style={{ flexShrink: 1 }}>{text}</T>
    </View>
  );
}
