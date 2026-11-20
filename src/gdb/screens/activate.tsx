import { useState } from "react";
import { Pressable, View } from "react-native";
import { Eyebrow, Group, Hairline, Ico, ListRow, PrimaryButton, SoftPill } from "../../ui/kit";
import { T } from "../../ui/primitives";
import { RADIUS } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import { type Key, tr } from "../copy";
import { draftDone, KYC_SECTIONS, type KycDraft, type KycSection, reasonsFor, sectionDone, sectionsToFix } from "../kyc";
import { LEGAL_DOCS, legalBy, legalTitle } from "../legal";
import { gdb, useGdb } from "../store";
import { back, nav, Notice, SheetFrame, StateBlock } from "../ui";
import { kycRowSummary } from "./kycForm";

/** Activar la cuenta (pantalla 02): términos (consultables, con Bridge nombrado) → expediente KYC → veredicto.
 *  Los términos van primero porque Bridge no puede procesar datos de identidad sin esa aceptación. El expediente son las cinco
 *  secciones que Bridge pide; cada una abre su hoja con los campos reales y «Llenar con ejemplo». Sin KYC aprobado no hay tarjeta
 *  ni gasto; si el proveedor pide correcciones, se rehacen sólo las secciones señaladas y se reenvía. */
export function ActivateSheet() {
  const { c } = useTheme();
  const { s, kyc: file } = useGdb();
  const [agreed, setAgreed] = useState(false);
  const kyc = s.kyc.status;

  if (s.invitation.status === "sent") {
    return (
      <SheetFrame title={tr("act.title")} footer={<PrimaryButton label={tr("common.continue")} dim={!agreed} onPress={() => { if (agreed) gdb.accept(); }} accessibilityLabel="act-continue" />}>
        <Group>
          <ListRow title={tr("act.employer")} value={s.invitation.employer} />
          <Hairline />
          <ListRow title={tr("act.country")} value={tr("act.countryV")} />
        </Group>
        {/* Los documentos se pueden abrir y leer antes de aceptar; la aceptación va ANTES de pedir la identificación. */}
        <View style={{ gap: 8 }}>
          <Eyebrow style={{ paddingHorizontal: 4 }}>{tr("act.docs")}</Eyebrow>
          <Group>
            {LEGAL_DOCS.map((d, n) => (
              <View key={d}>
                {n > 0 ? <Hairline /> : null}
                <ListRow title={tr(legalTitle(d))} sub={tr(legalBy(d))} chevron onPress={() => nav("legal", { doc: d })} accessibilityLabel={`act-doc-${d}`} py={12} />
              </View>
            ))}
          </Group>
        </View>
        <Pressable onPress={() => setAgreed((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} accessibilityLabel="act-agree"
          style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44, paddingHorizontal: 4 }}>
          <View style={{ width: 24, height: 24, borderRadius: RADIUS.pill, borderWidth: agreed ? 0 : 2, borderColor: c.ink25, backgroundColor: agreed ? c.cta : "transparent", alignItems: "center", justifyContent: "center" }}>
            {agreed ? <Ico name="check" size={14} color={c.onCta} sw={3} /> : null}
          </View>
          <T w={400} s={16} color={c.inkStrong} style={{ flex: 1 }}>{tr("act.agree")}</T>
        </Pressable>
        <T w={400} s={13} lh={1.4} color={c.ink40} style={{ paddingHorizontal: 4 }}>{tr("act.disclosure")}</T>
      </SheetFrame>
    );
  }

  if (kyc === "pending") return <SheetFrame title={tr("kyc.title")}><StateBlock kind="wait" title={tr("kyc.pending")} sub={tr("kyc.pendingSub")} /></SheetFrame>;
  if (kyc === "approved") {
    return (
      <SheetFrame title={tr("kyc.title")} footer={<PrimaryButton label={tr("common.done")} onPress={back} accessibilityLabel="act-done" />}>
        <StateBlock kind="ok" title={tr("kyc.approved")} sub={tr("kyc.approvedSub")} />
      </SheetFrame>
    );
  }
  if (kyc === "rejected") {
    return (
      <SheetFrame title={tr("kyc.title")} footer={<PrimaryButton label={tr("common.close")} onPress={back} accessibilityLabel="act-close" />}>
        <StateBlock kind="bad" title={tr("kyc.rejected")} sub={tr("kyc.rejectedSub")} />
      </SheetFrame>
    );
  }

  // Expediente: en edición, o con correcciones pedidas por el proveedor (cada razón apunta a una sección).
  const now = new Date();
  const fixing = kyc === "retry_required";
  const toFix = fixing ? sectionsToFix(s.kyc.reasons) : [];
  const fixed = (sec: KycSection) => (file.savedAt[sec] ?? 0) > (file.rejectedAt ?? Infinity);
  const pending = toFix.filter((sec) => !fixed(sec));
  const ready = draftDone(file.draft, now) && pending.length === 0;
  return (
    <SheetFrame title={tr("kyc.title")} footer={<PrimaryButton label={tr(fixing ? "kyc.resend" : "kyc.send")} dim={!ready} onPress={() => { if (ready) gdb.submitKyc(); }} accessibilityLabel="act-submit" />}>
      {fixing ? (
        <Notice tone={pending.length > 0 ? "bad" : "ok"} text={pending.length > 0 ? tr("kyc.fixCount", { n: pending.length }) : tr("kyc.fixedAll")} />
      ) : (
        <View style={{ gap: 12, paddingHorizontal: 4 }}>
          <T w={400} s={15} lh={1.4} color={c.ink55}>{tr("kyc.sub")}</T>
          <View style={{ flexDirection: "row" }}><SoftPill icon="sparkles" label={tr("kyc.fillAll")} onPress={() => gdb.fillKycSample()} accessibilityLabel="kyc-fill-all" /></View>
        </View>
      )}
      <Group>
        {KYC_SECTIONS.map((sec, n) => (
          <View key={sec}>
            {n > 0 ? <Hairline inset={56} /> : null}
            <KycRow section={sec} draft={file.draft} done={sectionDone(file.draft, sec, now)}
              flag={toFix.includes(sec) ? (fixed(sec) ? "fixed" : reasonsFor(s.kyc.reasons, sec)) : null}
              onPress={() => nav("kycForm", { section: sec })} />
          </View>
        ))}
      </Group>
    </SheetFrame>
  );
}

/** Fila de una sección: hecha (palomita), pendiente, o señalada por el proveedor con su razón y «Corregir». */
function KycRow({ section, draft, done, flag, onPress }: { section: KycSection; draft: KycDraft; done: boolean; flag: readonly string[] | "fixed" | null; onPress: () => void }) {
  const { c } = useTheme();
  const bad = Array.isArray(flag);
  const summary = bad ? (flag as readonly string[]).map((r) => tr(`kyc.reason.${r}` as Key)).join(" ") : flag === "fixed" ? tr("kyc.fixed") : kycRowSummary(draft, section, done);
  return (
    <Pressable onPress={onPress} accessibilityLabel={`kyc-row-${section}`}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, paddingHorizontal: 16, minHeight: 62, backgroundColor: pressed ? c.ink04 : "transparent" })}>
      <View style={{ width: 26, height: 26, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center", backgroundColor: bad ? c.error : done ? c.success : c.ink08 }}>
        {bad ? <T w={700} s={14} color="#FFFFFF">!</T> : done ? <Ico name="check" size={14} color="#FFFFFF" sw={3} /> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <T w={500} s={16} color={c.inkStrong}>{tr(`kyc.s.${section}`)}</T>
        <T w={400} s={13} lh={1.35} color={bad ? c.error : flag === "fixed" ? c.success : c.ink55} numberOfLines={bad ? 3 : 1}>{summary}</T>
      </View>
      {bad ? (
        <View style={{ paddingHorizontal: 10, height: 26, borderRadius: RADIUS.pill, backgroundColor: c.error, justifyContent: "center" }}>
          <T w={600} s={12.5} color="#FFFFFF">{tr("kyc.fixCta")}</T>
        </View>
      ) : <Ico name="chevronRight" size={18} color={c.ink25} sw={2} />}
    </Pressable>
  );
}
