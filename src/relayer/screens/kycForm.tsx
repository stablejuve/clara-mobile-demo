import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActionSheetIOS, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Field, Rows, Select } from "../../ui/form";
import type { AppCtx } from "../../ctx";
import { type Key, t } from "../../i18n/es";
import { Grabber, Ico, PrimaryButton, SoftPill, Toggle } from "../../ui/kit";
import { T } from "../../ui/primitives";
import { RADIUS, RL } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import {
  ACCOUNT_PURPOSES, EMPLOYMENT, fillSample, ID_TYPES, type KycDraft, type KycImage, type KycSection, missing, MONTHLY, NATIONALITIES, SAMPLE, sectionDone, SOURCES, STATES_MX,
} from "../kyc";
import type { SheetParams } from "../../navigation/routes";

/** Lo que muestra la fila de una sección en la hoja de alta. */
export function kycRowSummary(d: KycDraft, s: KycSection, done: boolean): string {
  if (!done) return t("kyc2.pending");
  switch (s) {
    case "personal": return `${d.personal.firstName} ${d.personal.lastName}`.trim();
    case "address": return `CP ${d.address.postalCode} · ${d.address.subdivision}`;
    case "id": return `${t(`kyc2.idType.${d.id.type}`)} · RFC ${d.id.rfc.toUpperCase()}`;
    case "selfie": return t("kyc2.selfieReady");
    case "usage": return t(`kyc2.purpose.${d.usage.accountPurpose}` as Key);
  }
}

/** Hoja de una sección del expediente: campos, «Llenar con ejemplo» y Guardar (sólo cuando la sección está completa). */
export function KycFormSheet(ctx: AppCtx & { params: SheetParams["kycForm"] }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { section } = ctx.params;
  const [local, setLocal] = useState<KycDraft>(ctx.kyc.draft);
  const now = new Date();
  const miss = missing(local, section, now);
  const save = () => { ctx.kyc.setDraft((d) => ({ ...d, [section]: local[section] })); ctx.back(); };
  const fill = () => setLocal((d) => fillSample(d, section));
  return (
    <View style={{ flex: 1, backgroundColor: c.page }}>
      <Grabber />
      <View style={{ height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 }}>
        <Pressable onPress={ctx.back} hitSlop={8} style={{ minWidth: 80 }} accessibilityLabel="kyc-form-cancel"><T w={400} s={17} color={c.brand}>{t("common.cancel")}</T></Pressable>
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, alignItems: "center" }}><T w={600} s={17} color={c.inkStrong}>{t(`kyc2.section.${section}`)}</T></View>
        <View style={{ minWidth: 80 }} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={60}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 22 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ gap: 14, paddingHorizontal: 4 }}>
            <T w={400} s={15} lh={1.4} color={c.ink55}>{t(`kyc2.intro.${section}`)}</T>
            <View style={{ flexDirection: "row" }}><SoftPill icon="sparkles" label={t("kyc2.fill")} onPress={fill} accessibilityLabel="kyc-fill-sample" /></View>
          </View>
          {section === "personal" ? <PersonalForm d={local} set={setLocal} /> : null}
          {section === "address" ? <AddressForm d={local} set={setLocal} /> : null}
          {section === "id" ? <IdForm d={local} set={setLocal} /> : null}
          {section === "selfie" ? <SelfieForm d={local} set={setLocal} /> : null}
          {section === "usage" ? <UsageForm d={local} set={setLocal} /> : null}
        </ScrollView>
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12) + 12, gap: 10 }}>
          {miss.length > 0 ? (
            <T w={400} s={13} lh={1.4} color={c.ink55} style={{ textAlign: "center" }}>
              {t("kyc2.missing", { fields: miss.map((f) => t(`kyc2.field.${f}` as Key)).join(", ") })}
            </T>
          ) : null}
          <PrimaryButton label={t("kyc2.save")} dim={!sectionDone(local, section, now)} onPress={save} accessibilityLabel="kyc-form-save" />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

type FormProps = { d: KycDraft; set: React.Dispatch<React.SetStateAction<KycDraft>> };

/** «19940318» → «1994-03-18» mientras se teclea. */
const maskDate = (raw: string, parts: number[]) => {
  const d = raw.replace(/\D/g, "").slice(0, parts.reduce((a, b) => a + b, 0));
  const out: string[] = [];
  let i = 0;
  for (const p of parts) { if (i >= d.length) break; out.push(d.slice(i, i + p)); i += p; }
  return out.join("-");
};
const maskPhone = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  return [d.slice(0, 2), d.slice(2, 6), d.slice(6, 10)].filter(Boolean).join(" ");
};

// ── Secciones ───────────────────────────────────────────────────────────────
function PersonalForm({ d, set }: FormProps) {
  const p = d.personal;
  const up = (patch: Partial<typeof p>) => set((x) => ({ ...x, personal: { ...x.personal, ...patch } }));
  return (
    <>
      <Rows>{[
        <Field key="f" label={t("kyc2.field.firstName")} value={p.firstName} onChange={(v) => up({ firstName: v })} placeholder="Ana" autoCapitalize="words" textContentType="givenName" />,
        <Field key="m" label={t("kyc2.field.middleName")} value={p.middleName} onChange={(v) => up({ middleName: v })} placeholder={t("kyc2.optional")} autoCapitalize="words" textContentType="middleName" />,
        <Field key="l" label={t("kyc2.field.lastName")} value={p.lastName} onChange={(v) => up({ lastName: v })} placeholder="Torres Medina" autoCapitalize="words" textContentType="familyName" />,
        <Field key="b" label={t("kyc2.field.birthDate")} value={p.birthDate} onChange={(v) => up({ birthDate: maskDate(v, [4, 2, 2]) })} placeholder="AAAA-MM-DD" keyboardType="number-pad" />,
        <Select key="n" label={t("kyc2.field.nationality")} value={p.nationality} options={NATIONALITIES} labelOf={(v) => t(`kyc2.country.${v}`)} onChange={(v) => up({ nationality: v })} />,
      ]}</Rows>
      <Rows>{[
        <Field key="e" label={t("kyc2.field.email")} value={p.email} onChange={(v) => up({ email: v })} placeholder="ana@correo.com" keyboardType="email-address" autoCapitalize="none" textContentType="emailAddress" />,
        <Field key="ph" label={t("kyc2.field.phone")} value={p.phone} onChange={(v) => up({ phone: maskPhone(v) })} placeholder="55 1234 5678" prefix="+52" keyboardType="phone-pad" textContentType="telephoneNumber" />,
      ]}</Rows>
    </>
  );
}

function AddressForm({ d, set }: FormProps) {
  const a = d.address;
  const up = (patch: Partial<typeof a>) => set((x) => ({ ...x, address: { ...x.address, ...patch } }));
  return (
    <Rows>{[
      <Field key="s1" label={t("kyc2.field.streetLine1")} value={a.streetLine1} onChange={(v) => up({ streetLine1: v })} placeholder="Av. Insurgentes Sur 1458" textContentType="streetAddressLine1" />,
      <Field key="s2" label={t("kyc2.field.streetLine2")} value={a.streetLine2} onChange={(v) => up({ streetLine2: v })} placeholder="Col. Actipan" textContentType="streetAddressLine2" />,
      <Field key="c" label={t("kyc2.field.city")} value={a.city} onChange={(v) => up({ city: v })} placeholder="Benito Juárez" textContentType="addressCity" />,
      <Select key="st" label={t("kyc2.field.subdivision")} value={a.subdivision} options={STATES_MX} labelOf={(v) => v} onChange={(v) => up({ subdivision: v })} />,
      <Field key="cp" label={t("kyc2.field.postalCode")} value={a.postalCode} onChange={(v) => up({ postalCode: v.replace(/\D/g, "").slice(0, 5) })} placeholder="03230" keyboardType="number-pad" textContentType="postalCode" />,
      <Field key="co" label={t("kyc2.field.country")} value={t("kyc2.country.MEX")} onChange={() => {}} editable={false} />,
    ]}</Rows>
  );
}

function IdForm({ d, set }: FormProps) {
  const { c } = useTheme();
  const i = d.id;
  const up = (patch: Partial<typeof i>) => set((x) => ({ ...x, id: { ...x.id, ...patch } }));
  return (
    <>
      <Rows>{[
        <Select key="ty" label={t("kyc2.field.idType")} value={i.type} options={ID_TYPES} labelOf={(v) => t(`kyc2.idType.${v}`)} onChange={(v) => up({ type: v, back: v === "passport" ? null : i.back })} />,
        <Field key="nu" label={i.type === "ine" ? t("kyc2.field.idNumberIne") : t("kyc2.field.idNumberPassport")} value={i.number} onChange={(v) => up({ number: v.toUpperCase() })} placeholder={i.type === "ine" ? "TRMDAN94031809M700" : "G12345678"} autoCapitalize="characters" autoCorrect={false} />,
        <Field key="ex" label={t("kyc2.field.expiration")} value={i.expiration} onChange={(v) => up({ expiration: maskDate(v, [4, 2]) })} placeholder="AAAA-MM" keyboardType="number-pad" />,
      ]}</Rows>
      <View style={{ gap: 8 }}>
        <View style={{ paddingHorizontal: 4 }}><T w={500} s={10.5} ls={0.08} mono color={c.ink55}>{t("kyc2.photosTag").toUpperCase()}</T></View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <PhotoTile label={t("kyc2.front")} image={i.front} side="front" onPick={(img) => up({ front: img })} />
          {i.type === "ine" ? <PhotoTile label={t("kyc2.back")} image={i.back} side="back" onPick={(img) => up({ back: img })} /> : <View style={{ flex: 1 }} />}
        </View>
        <View style={{ paddingHorizontal: 4 }}><T w={400} s={13} lh={1.4} color={c.ink55}>{t("kyc2.photosHint")}</T></View>
      </View>
      <Rows>{[
        <Field key="rfc" label={t("kyc2.field.rfc")} value={i.rfc} onChange={(v) => up({ rfc: v.toUpperCase().replace(/\s/g, "").slice(0, 13) })} placeholder="TOMA940318KJ3" autoCapitalize="characters" autoCorrect={false} />,
      ]}</Rows>
      <View style={{ paddingHorizontal: 4, marginTop: -14 }}><T w={400} s={13} lh={1.4} color={c.ink55}>{t("kyc2.rfcHint")}</T></View>
    </>
  );
}

function SelfieForm({ d, set }: FormProps) {
  const { c } = useTheme();
  const pick = async () => { const img = await pickImage("selfie"); if (img) set((x) => ({ ...x, selfie: img })); };
  return (
    <View style={{ alignItems: "center", gap: 18, paddingTop: 12 }}>
      <Pressable onPress={() => { void pick(); }} accessibilityLabel="kyc-selfie"
        style={{ width: 200, height: 200, borderRadius: RADIUS.pill, borderWidth: d.selfie ? 0 : 1.5, borderStyle: "dashed", borderColor: c.ink25, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
        {d.selfie?.kind === "uri" ? <Image source={{ uri: d.selfie.uri }} style={{ width: 200, height: 200 }} />
          : d.selfie?.kind === "sample" ? <SampleSelfie />
            : <Ico name="faceIdNose" size={72} color={c.ink25} sw={1.2} />}
      </Pressable>
      <SoftPill icon="camera" label={d.selfie ? t("kyc2.retake") : t("kyc2.takeSelfie")} onPress={() => { void pick(); }} />
      <T w={400} s={13} lh={1.4} color={c.ink55} style={{ textAlign: "center", paddingHorizontal: 24 }}>{t("kyc2.selfieHint")}</T>
    </View>
  );
}

function UsageForm({ d, set }: FormProps) {
  const { c } = useTheme();
  const u = d.usage;
  const up = (patch: Partial<typeof u>) => set((x) => ({ ...x, usage: { ...x.usage, ...patch } }));
  return (
    <Rows>{[
      <Select key="p" label={t("kyc2.field.accountPurpose")} value={u.accountPurpose} options={ACCOUNT_PURPOSES} labelOf={(v) => t(`kyc2.purpose.${v}`)} onChange={(v) => up({ accountPurpose: v })} />,
      <Select key="e" label={t("kyc2.field.employmentStatus")} value={u.employmentStatus} options={EMPLOYMENT} labelOf={(v) => t(`kyc2.employment.${v}`)} onChange={(v) => up({ employmentStatus: v })} />,
      <Field key="o" label={t("kyc2.field.occupation")} value={u.occupation} onChange={(v) => up({ occupation: v })} placeholder={SAMPLE.usage.occupation} autoCapitalize="sentences" />,
      <Select key="m" label={t("kyc2.field.monthlyPayments")} value={u.monthlyPayments} options={MONTHLY} labelOf={(v) => t(`kyc2.monthly.${v}`)} onChange={(v) => up({ monthlyPayments: v })} />,
      <Select key="s" label={t("kyc2.field.sourceOfFunds")} value={u.sourceOfFunds} options={SOURCES} labelOf={(v) => t(`kyc2.source.${v}`)} onChange={(v) => up({ sourceOfFunds: v })} />,
      <View key="i" style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 16, minHeight: 52 }}>
        <T w={500} s={16} color={c.inkStrong} style={{ flex: 1 }}>{t("kyc2.field.intermediary")}</T>
        <Toggle on={u.intermediary} onChange={(v) => up({ intermediary: v })} accessibilityLabel="kyc-intermediary" />
      </View>,
    ]}</Rows>
  );
}

// ── Fotos ───────────────────────────────────────────────────────────────────
/** Cámara o galería. En el simulador no hay cámara: cae a la galería. */
async function pickImage(kind: "id" | "selfie"): Promise<KycImage | null> {
  const choose = (): Promise<"camera" | "library" | null> => new Promise((resolve) => {
    const options = [t("kyc2.camera"), t("kyc2.library"), t("common.cancel")];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: 2 }, (i) => resolve(i === 0 ? "camera" : i === 1 ? "library" : null));
    } else {
      Alert.alert(kind === "selfie" ? t("kyc2.takeSelfie") : t("kyc2.photosTag"), undefined, [
        { text: options[0], onPress: () => resolve("camera") }, { text: options[1], onPress: () => resolve("library") }, { text: options[2], style: "cancel", onPress: () => resolve(null) },
      ]);
    }
  });
  const src = await choose();
  if (!src) return null;
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.7, allowsEditing: kind === "id", aspect: kind === "id" ? [8, 5] : [1, 1], cameraType: kind === "selfie" ? ImagePicker.CameraType.front : ImagePicker.CameraType.back };
  try {
    let r: ImagePicker.ImagePickerResult;
    if (src === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      r = perm.granted ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    } else {
      r = await ImagePicker.launchImageLibraryAsync(opts);
    }
    return r.canceled || !r.assets[0] ? null : { kind: "uri", uri: r.assets[0].uri };
  } catch {
    // Simulador sin cámara: la galería.
    const r = await ImagePicker.launchImageLibraryAsync(opts);
    return r.canceled || !r.assets[0] ? null : { kind: "uri", uri: r.assets[0].uri };
  }
}

function PhotoTile({ label, image, side, onPick }: { label: string; image: KycImage | null; side: "front" | "back"; onPick: (i: KycImage) => void }) {
  const { c } = useTheme();
  const pick = async () => { const img = await pickImage("id"); if (img) onPick(img); };
  return (
    <Pressable onPress={() => { void pick(); }} accessibilityLabel={`kyc-photo-${side}`} style={{ flex: 1, gap: 6 }}>
      <View style={{ aspectRatio: 1.586, borderRadius: RADIUS.card, borderWidth: image ? 0 : 1.5, borderStyle: "dashed", borderColor: c.ink25, overflow: "hidden", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: image ? undefined : c.card }}>
        {image?.kind === "uri" ? <Image source={{ uri: image.uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          : image?.kind === "sample" ? <SampleId side={side} />
            : <><Ico name="camera" size={22} color={c.ink40} sw={1.8} /><T w={500} s={13} color={c.ink40}>{label}</T></>}
      </View>
      {image ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 2 }}>
          <Ico name="check" size={13} color={c.success} sw={2.6} />
          <T w={500} s={12.5} color={c.ink55}>{label}</T>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Credencial de muestra (dibujada, marcada como MUESTRA): lo que pone «Llenar con ejemplo». */
function SampleId({ side }: { side: "front" | "back" }) {
  const ink = RL.petrolDeep;
  const line = (w: number | `${number}%`, o = 0.35) => <View style={{ height: 4, width: w, borderRadius: 2, backgroundColor: ink, opacity: o }} />;
  return (
    <View style={{ width: "100%", height: "100%", backgroundColor: "#E7EEEA", padding: 8, gap: 5 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <T w={600} s={6.5} ls={0.08} mono color={ink}>{side === "front" ? "CREDENCIAL · MÉXICO" : "IDMEX<<TRMDAN94"}</T>
        <View style={{ paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2, backgroundColor: RL.petrol }}><T w={600} s={6} ls={0.08} mono color={RL.cream}>MUESTRA</T></View>
      </View>
      {side === "front" ? (
        <View style={{ flex: 1, flexDirection: "row", gap: 7 }}>
          <View style={{ width: "30%", borderRadius: 3, backgroundColor: "#C9D6CF", alignItems: "center", justifyContent: "flex-end", overflow: "hidden" }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#9DB3A8", marginBottom: 2 }} />
            <View style={{ width: 30, height: 14, borderTopLeftRadius: 15, borderTopRightRadius: 15, backgroundColor: "#9DB3A8" }} />
          </View>
          <View style={{ flex: 1, gap: 4, paddingTop: 2 }}>
            <T w={600} s={7} color={ink}>TORRES MEDINA</T>
            <T w={600} s={7} color={ink}>ANA LUCÍA</T>
            {line("90%")}{line("70%")}{line("80%")}
            <T w={500} s={6} mono color={ink}>TRMDAN94031809M700</T>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", gap: 1.5, height: 22 }}>
            {Array.from({ length: 34 }, (_, i) => <View key={i} style={{ width: i % 3 === 0 ? 2.5 : 1.2, backgroundColor: ink, opacity: 0.75 }} />)}
          </View>
          {line("100%", 0.25)}{line("100%", 0.25)}
          <T w={500} s={5.5} mono color={ink}>IDMEX1234567&lt;&lt;0000&lt;&lt;&lt;&lt;&lt;</T>
        </View>
      )}
    </View>
  );
}

function SampleSelfie() {
  return (
    <View style={{ width: 200, height: 200, backgroundColor: "#C9D6CF", alignItems: "center", justifyContent: "flex-end" }}>
      <View style={{ width: 78, height: 78, borderRadius: 39, backgroundColor: "#8FA89C", marginBottom: 8 }} />
      <View style={{ width: 150, height: 70, borderTopLeftRadius: 75, borderTopRightRadius: 75, backgroundColor: "#8FA89C" }} />
      <View style={{ position: "absolute", top: 14, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2, backgroundColor: RL.petrol }}><T w={600} s={9} ls={0.08} mono color={RL.cream}>MUESTRA</T></View>
    </View>
  );
}
