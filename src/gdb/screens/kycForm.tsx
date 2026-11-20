import { useState } from "react";
import { Pressable, View } from "react-native";
import { Field, Rows, Select } from "../../ui/form";
import { Eyebrow, Ico, PrimaryButton, SoftPill, Toggle } from "../../ui/kit";
import { T } from "../../ui/primitives";
import { BF, RADIUS } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import { type Key, tr } from "../copy";
import {
  ACCOUNT_PURPOSES, DEPARTMENTS_CO, EMPLOYMENT, fillSample, ID_TYPES, type KycDraft, type KycSection, missing, MONTHLY, NATIONALITIES, SAMPLE, SOURCES,
} from "../kyc";
import { gdb, useGdb } from "../store";
import { back, SheetFrame } from "../ui";

/** Lo que muestra la fila de una sección en la lista del expediente. */
export function kycRowSummary(d: KycDraft, s: KycSection, done: boolean): string {
  if (!done) return tr("kyc.pendingRow");
  switch (s) {
    case "personal": return `${d.personal.firstName} ${d.personal.lastName}`.trim();
    case "address": return `${d.address.city} · ${d.address.postalCode}`;
    case "id": return `${tr(`kyc.idType.${d.id.type}`)} · NIT ${d.id.taxId}`;
    case "selfie": return tr("kyc.selfieReady");
    case "usage": return tr(`kyc.purpose.${d.usage.accountPurpose}` as Key);
  }
}

/** Hoja de una sección del expediente: los campos que pide Bridge, «Llenar con ejemplo» y Guardar (sólo con la sección completa;
 *  debajo se lista lo que falta). */
export function KycFormSheet({ section }: { section: KycSection }) {
  const { c } = useTheme();
  const { kyc } = useGdb();
  const [local, setLocal] = useState<KycDraft>(kyc.draft);
  const miss = missing(local, section, new Date());
  const save = () => { if (miss.length > 0) return; gdb.saveKycSection(section, local); back(); };
  return (
    <SheetFrame title={tr(`kyc.s.${section}`)} console={false} footer={(
      <>
        {miss.length > 0 ? (
          <T w={400} s={13} lh={1.4} color={c.ink55} style={{ textAlign: "center" }} accessibilityLabel="kyc-form-missing">
            {tr("kyc.missing", { fields: miss.map((f) => tr(`kyc.f.${f}` as Key)).join(", ") })}
          </T>
        ) : null}
        <PrimaryButton label={tr("kyc.save")} dim={miss.length > 0} onPress={save} accessibilityLabel="kyc-form-save" />
      </>
    )}>
      <View style={{ gap: 14, paddingHorizontal: 4 }}>
        <T w={400} s={15} lh={1.4} color={c.ink55}>{tr(`kyc.i.${section}`)}</T>
        <View style={{ flexDirection: "row" }}><SoftPill icon="sparkles" label={tr("kyc.fill")} onPress={() => setLocal((d) => fillSample(d, section))} accessibilityLabel="kyc-fill-sample" /></View>
      </View>
      {section === "personal" ? <PersonalForm d={local} set={setLocal} /> : null}
      {section === "address" ? <AddressForm d={local} set={setLocal} /> : null}
      {section === "id" ? <IdForm d={local} set={setLocal} /> : null}
      {section === "selfie" ? <SelfieForm d={local} set={setLocal} /> : null}
      {section === "usage" ? <UsageForm d={local} set={setLocal} /> : null}
    </SheetFrame>
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
/** «3001234567» → «300 123 4567». */
const maskPhone = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10)].filter(Boolean).join(" ");
};

function PersonalForm({ d, set }: FormProps) {
  const p = d.personal;
  const up = (patch: Partial<typeof p>) => set((x) => ({ ...x, personal: { ...x.personal, ...patch } }));
  return (
    <>
      <Rows>{[
        <Field key="f" label={tr("kyc.f.firstName")} value={p.firstName} onChange={(v) => up({ firstName: v })} placeholder={SAMPLE.personal.firstName} autoCapitalize="words" textContentType="givenName" />,
        <Field key="m" label={tr("kyc.f.middleName")} value={p.middleName} onChange={(v) => up({ middleName: v })} placeholder={tr("kyc.optional")} autoCapitalize="words" textContentType="middleName" />,
        <Field key="l" label={tr("kyc.f.lastName")} value={p.lastName} onChange={(v) => up({ lastName: v })} placeholder={SAMPLE.personal.lastName} autoCapitalize="words" textContentType="familyName" />,
        <Field key="b" label={tr("kyc.f.birthDate")} value={p.birthDate} onChange={(v) => up({ birthDate: maskDate(v, [4, 2, 2]) })} placeholder={tr("kyc.ph.date")} keyboardType="number-pad" />,
        <Select key="n" label={tr("kyc.f.nationality")} value={p.nationality} options={NATIONALITIES} labelOf={(v) => tr(`kyc.country.${v}`)} onChange={(v) => up({ nationality: v })} choose={tr("kyc.choose")} />,
      ]}</Rows>
      <Rows>{[
        <Field key="e" label={tr("kyc.f.email")} value={p.email} onChange={(v) => up({ email: v })} placeholder={SAMPLE.personal.email} keyboardType="email-address" autoCapitalize="none" textContentType="emailAddress" />,
        <Field key="ph" label={tr("kyc.f.phone")} value={p.phone} onChange={(v) => up({ phone: maskPhone(v) })} placeholder={SAMPLE.personal.phone} prefix="+57" keyboardType="phone-pad" textContentType="telephoneNumber" />,
      ]}</Rows>
    </>
  );
}

function AddressForm({ d, set }: FormProps) {
  const a = d.address;
  const up = (patch: Partial<typeof a>) => set((x) => ({ ...x, address: { ...x.address, ...patch } }));
  return (
    <Rows>{[
      <Field key="s1" label={tr("kyc.f.streetLine1")} value={a.streetLine1} onChange={(v) => up({ streetLine1: v })} placeholder={SAMPLE.address.streetLine1} textContentType="streetAddressLine1" />,
      <Field key="s2" label={tr("kyc.f.streetLine2")} value={a.streetLine2} onChange={(v) => up({ streetLine2: v })} placeholder={SAMPLE.address.streetLine2} textContentType="streetAddressLine2" />,
      <Field key="c" label={tr("kyc.f.city")} value={a.city} onChange={(v) => up({ city: v })} placeholder={SAMPLE.address.city} textContentType="addressCity" />,
      <Select key="st" label={tr("kyc.f.subdivision")} value={a.subdivision} options={DEPARTMENTS_CO} labelOf={(v) => v} onChange={(v) => up({ subdivision: v })} choose={tr("kyc.choose")} />,
      <Field key="cp" label={tr("kyc.f.postalCode")} value={a.postalCode} onChange={(v) => up({ postalCode: v.replace(/\D/g, "").slice(0, 6) })} placeholder={SAMPLE.address.postalCode} keyboardType="number-pad" textContentType="postalCode" />,
      <Field key="co" label={tr("kyc.f.country")} value={tr("kyc.country.COL")} onChange={() => {}} editable={false} />,
    ]}</Rows>
  );
}

function IdForm({ d, set }: FormProps) {
  const { c } = useTheme();
  const i = d.id;
  const up = (patch: Partial<typeof i>) => set((x) => ({ ...x, id: { ...x.id, ...patch } }));
  const cedula = i.type === "cedula";
  return (
    <>
      <Rows>{[
        <Select key="ty" label={tr("kyc.f.idType")} value={i.type} options={ID_TYPES} labelOf={(v) => tr(`kyc.idType.${v}`)} onChange={(v) => up({ type: v, back: v === "passport" ? false : i.back })} choose={tr("kyc.choose")} />,
        <Field key="nu" label={tr(cedula ? "kyc.f.idNumberCedula" : "kyc.f.idNumberPassport")} value={i.number} onChange={(v) => up({ number: v.toUpperCase() })} placeholder={cedula ? SAMPLE.id.number : "AT123456"} autoCapitalize="characters" autoCorrect={false} />,
        cedula ? null : <Field key="ex" label={tr("kyc.f.expiration")} value={i.expiration} onChange={(v) => up({ expiration: maskDate(v, [4, 2]) })} placeholder={tr("kyc.ph.month")} keyboardType="number-pad" />,
      ]}</Rows>
      <View style={{ gap: 8 }}>
        <Eyebrow style={{ paddingHorizontal: 4 }}>{tr("kyc.photosTag")}</Eyebrow>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <PhotoTile label={tr("kyc.front")} added={i.front} side="front" onToggle={() => up({ front: !i.front })} />
          {cedula ? <PhotoTile label={tr("kyc.back")} added={i.back} side="back" onToggle={() => up({ back: !i.back })} /> : <View style={{ flex: 1 }} />}
        </View>
        <T w={400} s={13} lh={1.4} color={c.ink55} style={{ paddingHorizontal: 4 }}>{tr("kyc.photosHint")}</T>
      </View>
      <View style={{ gap: 8 }}>
        <Rows>{[
          <Field key="tax" label={tr("kyc.f.taxId")} value={i.taxId} onChange={(v) => up({ taxId: v.replace(/[^\d-]/g, "").slice(0, 12) })} placeholder={SAMPLE.id.taxId} keyboardType="numbers-and-punctuation" autoCorrect={false} />,
        ]}</Rows>
        <T w={400} s={13} lh={1.4} color={c.ink55} style={{ paddingHorizontal: 4 }}>{tr("kyc.taxHint")}</T>
      </View>
    </>
  );
}

function SelfieForm({ d, set }: FormProps) {
  const { c } = useTheme();
  const toggle = () => set((x) => ({ ...x, selfie: !x.selfie }));
  return (
    <View style={{ alignItems: "center", gap: 18, paddingTop: 12 }}>
      <Pressable onPress={toggle} accessibilityLabel="kyc-selfie"
        style={{ width: 200, height: 200, borderRadius: RADIUS.pill, borderWidth: d.selfie ? 0 : 1.5, borderStyle: "dashed", borderColor: c.ink25, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
        {d.selfie ? <SampleSelfie /> : <Ico name="faceIdNose" size={72} color={c.ink25} sw={1.2} />}
      </Pressable>
      <SoftPill icon="camera" label={tr(d.selfie ? "kyc.retakeSelfie" : "kyc.takeSelfie")} onPress={toggle} accessibilityLabel="kyc-selfie-action" />
      <T w={400} s={13} lh={1.4} color={c.ink55} style={{ textAlign: "center", paddingHorizontal: 24 }}>{tr("kyc.selfieHint")}</T>
    </View>
  );
}

function UsageForm({ d, set }: FormProps) {
  const { c } = useTheme();
  const u = d.usage;
  const up = (patch: Partial<typeof u>) => set((x) => ({ ...x, usage: { ...x.usage, ...patch } }));
  const choose = tr("kyc.choose");
  return (
    <Rows>{[
      <Select key="p" label={tr("kyc.f.accountPurpose")} value={u.accountPurpose} options={ACCOUNT_PURPOSES} labelOf={(v) => tr(`kyc.purpose.${v}`)} onChange={(v) => up({ accountPurpose: v })} choose={choose} />,
      <Select key="e" label={tr("kyc.f.employmentStatus")} value={u.employmentStatus} options={EMPLOYMENT} labelOf={(v) => tr(`kyc.employment.${v}`)} onChange={(v) => up({ employmentStatus: v })} choose={choose} />,
      <Field key="o" label={tr("kyc.f.occupation")} value={u.occupation} onChange={(v) => up({ occupation: v })} placeholder={SAMPLE.usage.occupation} autoCapitalize="sentences" />,
      <Select key="m" label={tr("kyc.f.monthlyPayments")} value={u.monthlyPayments} options={MONTHLY} labelOf={(v) => tr(`kyc.monthly.${v}`)} onChange={(v) => up({ monthlyPayments: v })} choose={choose} />,
      <Select key="s" label={tr("kyc.f.sourceOfFunds")} value={u.sourceOfFunds} options={SOURCES} labelOf={(v) => tr(`kyc.source.${v}`)} onChange={(v) => up({ sourceOfFunds: v })} choose={choose} />,
      <View key="i" style={{ gap: 4, paddingVertical: 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <T w={500} s={16} lh={1.3} color={c.inkStrong} style={{ flex: 1 }}>{tr("kyc.ownUse")}</T>
          <Toggle on={u.ownUse} onChange={(v) => up({ ownUse: v })} accessibilityLabel="kyc-own-use" />
        </View>
        <T w={400} s={13} lh={1.4} color={c.ink55}>{tr("kyc.ownUseHint")}</T>
      </View>,
    ]}</Rows>
  );
}

// ── Fotos (de muestra: la demo no usa la cámara) ────────────────────────────

function PhotoTile({ label, added, side, onToggle }: { label: string; added: boolean; side: "front" | "back"; onToggle: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onToggle} accessibilityLabel={`kyc-photo-${side}`} style={{ flex: 1, gap: 6 }}>
      <View style={{ aspectRatio: 1.586, borderRadius: 10, borderWidth: added ? 0 : 1.5, borderStyle: "dashed", borderColor: c.ink25, overflow: "hidden", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: added ? undefined : c.card }}>
        {added ? <SampleId side={side} /> : <><Ico name="camera" size={22} color={c.ink40} sw={1.8} /><T w={500} s={13} color={c.ink40}>{label}</T></>}
      </View>
      {added ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 2 }}>
          <Ico name="check" size={13} color={c.success} sw={2.6} />
          <T w={500} s={12.5} color={c.ink55}>{label}</T>
        </View>
      ) : null}
    </Pressable>
  );
}

function SampleTag({ s = 6 }: { s?: number }) {
  return <View style={{ paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2, backgroundColor: BF.ink }}><T w={600} s={s} ls={0.08} mono color="#FFFFFF">{tr("kyc.sample").toUpperCase()}</T></View>;
}

/** Cédula de muestra (dibujada y marcada como muestra): lo que pone «Llenar con ejemplo». */
function SampleId({ side }: { side: "front" | "back" }) {
  const ink = BF.ink;
  const line = (w: number | `${number}%`, o = 0.35) => <View style={{ height: 4, width: w, borderRadius: 2, backgroundColor: ink, opacity: o }} />;
  return (
    <View style={{ width: "100%", height: "100%", backgroundColor: "#E7EEEA", padding: 8, gap: 5 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <T w={600} s={6.5} ls={0.08} mono color={ink}>{side === "front" ? "CÉDULA · COLOMBIA" : "ICCOL<<RIVERA<<ALEX"}</T>
        <SampleTag />
      </View>
      {side === "front" ? (
        <View style={{ flex: 1, flexDirection: "row", gap: 7 }}>
          <View style={{ width: "30%", borderRadius: 3, backgroundColor: "#C9D6CF", alignItems: "center", justifyContent: "flex-end", overflow: "hidden" }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#9DB3A8", marginBottom: 2 }} />
            <View style={{ width: 30, height: 14, borderTopLeftRadius: 15, borderTopRightRadius: 15, backgroundColor: "#9DB3A8" }} />
          </View>
          <View style={{ flex: 1, gap: 4, paddingTop: 2 }}>
            <T w={600} s={7} color={ink}>RIVERA GÓMEZ</T>
            <T w={600} s={7} color={ink}>ALEX</T>
            {line("90%")}{line("70%")}{line("80%")}
            <T w={500} s={6} mono color={ink}>1.020.304.050</T>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", gap: 1.5, height: 22 }}>
            {Array.from({ length: 34 }, (_, n) => <View key={n} style={{ width: n % 3 === 0 ? 2.5 : 1.2, backgroundColor: ink, opacity: 0.75 }} />)}
          </View>
          {line("100%", 0.25)}{line("100%", 0.25)}
          <T w={500} s={5.5} mono color={ink}>ICCOL1020304050&lt;&lt;&lt;&lt;&lt;&lt;</T>
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
      <View style={{ position: "absolute", top: 14 }}><SampleTag s={9} /></View>
    </View>
  );
}
