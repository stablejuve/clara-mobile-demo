import { useState } from "react";
import { Pressable, View } from "react-native";
import { Field, Rows, Select } from "../../ui/form";
import { Group, Hairline, Ico, ListRow, PrimaryButton, SoftPill, Spinner, Toggle } from "../../ui/kit";
import { T } from "../../ui/primitives";
import { RADIUS } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import {
  ACCOUNT_TYPES, BANK_CODES, BANKS, BENE_METHODS, BENE_OWNERS, BENE_STEPS, type BeneDraft, type Beneficiary, beneBank, beneMissing, type BeneStep, beneTitle, DOC_TYPES,
  EMPTY_BENE, fillBene, holderName, initials,
} from "../beneficiaries";
import { type Key, tr } from "../copy";
import { gdb, useGdb } from "../store";
import { back, SheetFrame } from "../ui";

/** Avatar con iniciales: la cuenta propia rellena, los terceros en tinta suave. */
function BeneAvatar({ b, size = 40 }: { b: Pick<Beneficiary, "name" | "owner">; size?: number }) {
  const { c } = useTheme();
  const self = b.owner === "self";
  return (
    <View style={{ width: size, height: size, borderRadius: RADIUS.pill, backgroundColor: self ? c.cta : c.ink08, alignItems: "center", justifyContent: "center" }}>
      <T w={600} s={Math.round(size * 0.36)} color={self ? c.onCta : c.ink72}>{initials(b.name)}</T>
    </View>
  );
}

/** Fila de una cuenta guardada: alias, banco y terminación; a la derecha, si se está verificando o si es la elegida. */
export function BeneRow({ b, onPress, selected }: { b: Beneficiary; onPress?: () => void; selected?: boolean }) {
  const { c } = useTheme();
  const ready = b.status === "verified";
  return (
    <Pressable disabled={!ready || !onPress} onPress={onPress} accessibilityLabel={`bene-${b.id}`} accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 16, minHeight: 62, backgroundColor: pressed ? c.ink04 : "transparent" })}>
      <View style={{ opacity: b.status === "failed" ? 0.5 : 1 }}><BeneAvatar b={b} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <T w={500} s={16} color={c.inkStrong} numberOfLines={1} style={{ flexShrink: 1 }}>{beneTitle(b)}</T>
          {b.owner === "self" ? (
            <View style={{ paddingHorizontal: 7, height: 18, borderRadius: RADIUS.pill, backgroundColor: c.ink08, justifyContent: "center" }}>
              <T w={500} s={11} color={c.ink72}>{tr("bene.yours")}</T>
            </View>
          ) : null}
        </View>
        <T w={400} s={13} color={b.status === "failed" ? c.error : c.ink55} numberOfLines={1}>{b.status === "failed" ? tr("bene.failed") : beneBank(b)}</T>
      </View>
      {b.status === "verifying" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Spinner size={13} color={c.ink40} />
          <T w={400} s={12} color={c.ink40}>{tr("bene.verifying")}</T>
        </View>
      ) : selected ? <Ico name="check" size={18} color={c.success} sw={2.6} /> : null}
    </Pressable>
  );
}

/** Fila «Nueva cuenta». */
export function NewBeneRow({ onPress }: { onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityLabel="bene-new"
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 16, minHeight: 62, backgroundColor: pressed ? c.ink04 : "transparent" })}>
      <View style={{ width: 40, height: 40, borderRadius: RADIUS.pill, borderWidth: 1.5, borderColor: c.brand, alignItems: "center", justifyContent: "center" }}>
        <Ico name="plus" size={18} color={c.brand} sw={2.2} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T w={500} s={16} color={c.brand}>{tr("bene.new")}</T>
        <T w={400} s={13} color={c.ink55}>{tr("bene.newSub")}</T>
      </View>
    </Pressable>
  );
}

/** Asistente «Nueva cuenta»: de quién es → titular → datos de la cuenta → revisar. Cada paso con «Llenar con ejemplo»; al guardar,
 *  la cuenta queda verificándose (Bridge comprueba que exista y que el titular coincida). */
export function BeneficiarySheet() {
  const { c } = useTheme();
  const { kyc } = useGdb();
  const [d, setD] = useState<BeneDraft>(EMPTY_BENE);
  const [n, setN] = useState(0);
  const step: BeneStep = BENE_STEPS[n];
  const miss = beneMissing(d, step);
  const up = (patch: Partial<BeneDraft>) => setD((x) => ({ ...x, ...patch }));
  const self = { firstName: kyc.draft.personal.firstName || "Alex", lastName: kyc.draft.personal.lastName || "Rivera Gómez" };
  const last = n === BENE_STEPS.length - 1;
  const next = () => { if (miss.length > 0) return; if (last) { gdb.addBeneficiary(d); back(); } else setN(n + 1); };
  const choose = tr("kyc.choose");
  return (
    <SheetFrame title={tr("bene.title")} console={false} footer={(
      <>
        {miss.length > 0 && step !== "owner" ? (
          <T w={400} s={13} lh={1.4} color={c.ink55} style={{ textAlign: "center" }} accessibilityLabel="bene-missing">
            {tr("kyc.missing", { fields: miss.map((f) => tr(`bene.f.${f}` as Key)).join(", ") })}
          </T>
        ) : null}
        <PrimaryButton label={tr(last ? "bene.save" : "common.continue")} dim={miss.length > 0} onPress={next} accessibilityLabel="bene-next" />
        {n > 0 ? (
          <Pressable onPress={() => setN(n - 1)} accessibilityLabel="bene-back" style={{ height: 44, alignItems: "center", justifyContent: "center" }}>
            <T w={500} s={17} color={c.brand}>{tr("common.back")}</T>
          </Pressable>
        ) : null}
      </>
    )}>
      <View style={{ flexDirection: "row", gap: 4, paddingHorizontal: 4 }}>
        {BENE_STEPS.map((s, i) => <View key={s} style={{ flex: 1, height: 3, borderRadius: RADIUS.pill, backgroundColor: i <= n ? c.brand : c.ink15 }} />)}
      </View>
      <View style={{ gap: 12, paddingHorizontal: 4 }}>
        <T w={600} s={22} lh={1.2} ls={-0.01} color={c.inkStrong}>{tr(`bene.s.${step}`)}</T>
        {step === "identity" || step === "bank" ? (
          <View style={{ flexDirection: "row" }}><SoftPill icon="sparkles" label={tr("kyc.fill")} onPress={() => setD((x) => fillBene(x, step, self))} accessibilityLabel="bene-fill" /></View>
        ) : null}
      </View>

      {step === "owner" ? (
        <Group>
          {BENE_OWNERS.map((o, i) => (
            <View key={o}>
              {i > 0 ? <Hairline /> : null}
              <Pressable onPress={() => setD({ ...EMPTY_BENE, owner: o })} accessibilityLabel={`bene-owner-${o}`} accessibilityState={{ selected: d.owner === o }}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 16, minHeight: 62, backgroundColor: pressed ? c.ink04 : "transparent" })}>
                <View style={{ flex: 1, gap: 2 }}>
                  <T w={500} s={16} color={c.inkStrong}>{tr(`bene.o.${o}`)}</T>
                  <T w={400} s={13} color={c.ink55}>{tr(`bene.o.${o}.sub`)}</T>
                </View>
                <View style={{ width: 22, height: 22, borderRadius: RADIUS.pill, borderWidth: d.owner === o ? 0 : 2, borderColor: c.ink25, backgroundColor: d.owner === o ? c.cta : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {d.owner === o ? <Ico name="check" size={13} color={c.onCta} sw={3} /> : null}
                </View>
              </Pressable>
            </View>
          ))}
        </Group>
      ) : null}

      {step === "identity" ? (
        <Rows>{[
          d.owner === "business" ? <Field key="b" label={tr("bene.f.businessName")} value={d.businessName} onChange={(v) => up({ businessName: v })} autoCapitalize="words" /> : null,
          d.owner === "business" ? null : <Field key="f" label={tr("kyc.f.firstName")} value={d.firstName} onChange={(v) => up({ firstName: v })} autoCapitalize="words" />,
          d.owner === "business" ? null : <Field key="l" label={tr("kyc.f.lastName")} value={d.lastName} onChange={(v) => up({ lastName: v })} autoCapitalize="words" />,
          <Field key="a" label={tr("bene.f.alias")} value={d.alias} onChange={(v) => up({ alias: v })} placeholder={tr("kyc.optional")} />,
        ]}</Rows>
      ) : null}

      {step === "bank" ? (
        <>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {BENE_METHODS.map((m) => {
              const on = d.method === m;
              return (
                <Pressable key={m} onPress={() => up({ method: m })} accessibilityLabel={`bene-method-${m}`} accessibilityState={{ selected: on }}
                  style={{ height: 36, paddingHorizontal: 14, borderRadius: RADIUS.pill, justifyContent: "center", backgroundColor: on ? c.cta : c.ink04 }}>
                  <T w={on ? 600 : 500} s={14} color={on ? c.onCta : c.inkStrong}>{tr(`bene.m.${m}`)}</T>
                </Pressable>
              );
            })}
          </View>
          {d.method === "bre_b" ? (
            <View style={{ gap: 8 }}>
              <Rows>{[<Field key="k" label={tr("bene.f.breBKey")} value={d.breBKey} onChange={(v) => up({ breBKey: v.replace(/\s/g, "") })} autoCapitalize="none" autoCorrect={false} />]}</Rows>
              <T w={400} s={13} lh={1.4} color={c.ink55} style={{ paddingHorizontal: 4 }}>{tr("bene.breBHint")}</T>
            </View>
          ) : (
            <>
              <Rows>{[
                <Select key="b" label={tr("bene.f.bankCode")} value={d.bankCode} options={BANK_CODES} labelOf={(v) => BANKS[v]} onChange={(v) => up({ bankCode: v })} choose={choose} />,
                <Select key="t" label={tr("bene.f.accountType")} value={d.accountType} options={ACCOUNT_TYPES} labelOf={(v) => tr(`bene.at.${v}`)} onChange={(v) => up({ accountType: v })} choose={choose} />,
                <Field key="n" label={tr("bene.f.accountNumber")} value={d.accountNumber} onChange={(v) => up({ accountNumber: v.replace(/\D/g, "").slice(0, 16) })} keyboardType="number-pad" />,
              ]}</Rows>
              <Rows>{[
                <Select key="dt" label={tr("bene.f.docType")} value={d.docType} options={DOC_TYPES} labelOf={(v) => tr(`bene.dt.${v}`)} onChange={(v) => up({ docType: v })} choose={choose} />,
                <Field key="dn" label={tr("bene.f.docNumber")} value={d.docNumber} onChange={(v) => up({ docNumber: v.toUpperCase().replace(/\s/g, "").slice(0, 12) })} autoCapitalize="characters" autoCorrect={false} />,
                <Field key="ph" label={tr("bene.f.phone")} value={d.phone} onChange={(v) => up({ phone: v.replace(/[^\d ]/g, "").slice(0, 12) })} prefix="+57" keyboardType="phone-pad" />,
              ]}</Rows>
            </>
          )}
        </>
      ) : null}

      {step === "review" ? (
        <>
          <Group>
            <ListRow title={tr("bene.holder")} value={holderName(d)} />
            <Hairline />
            <ListRow title={tr("bene.account")} value={d.method === "bank" ? `${BANKS[d.bankCode]} •••• ${d.accountNumber.slice(-4)}` : `Bre-B •••• ${d.breBKey.slice(-4)}`} />
            {d.method === "bank" ? <><Hairline /><ListRow title={tr("bene.f.accountType")} value={tr(`bene.at.${d.accountType}`)} /></> : null}
          </Group>
          <Group>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 16, minHeight: 52 }}>
              <T w={500} s={16} color={c.inkStrong} style={{ flex: 1 }}>{tr("bene.confirm")}</T>
              <Toggle on={d.confirm} onChange={(v) => up({ confirm: v })} accessibilityLabel="bene-confirm" />
            </View>
          </Group>
        </>
      ) : null}
    </SheetFrame>
  );
}
