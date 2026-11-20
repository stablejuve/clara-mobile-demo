import { type ReactNode, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { conceptLabel, type Key, tr, usd } from "../gdb/copy";
import { committed } from "../gdb/ledger";
import { DEMO, gdb, type Office, useGdb } from "../gdb/store";
import { ClaraLogo } from "../ui/CardArt";
import { Isotype, Wordmark } from "../ui/kit";
import { T } from "../ui/primitives";
import { F, RADIUS } from "../ui/theme";

// Back office de la empresa (A1 del spec), fuera de la app del empleado. Betterfly y Clara son partners y cada uno pone lo suyo:
//  · Recursos Humanos de la empresa, dentro del back office de Betterfly, invita al empleado y, cuando éste ya tiene su cuenta
//    USD activa, decide qué beneficio enviarle. Arriba se ve quién opera (una persona de Acme) para que no parezca Betterfly.
//  · El dinero sale de la cuenta de la empresa en Clara; Finanzas lo ve en la plataforma de Clara (Global Cards).
// Son dos miradas del mismo estado, no dos escenarios. Demo hipotética: no implica un acuerdo real entre las marcas.

type Skin = { bg: string; card: string; ink: string; sub: string; line: string; primary: string; onPrimary: string; titleFont: string; titleSize: number };
const SKINS: Record<Office, Skin> = {
  betterfly: { bg: "#F7F5EB", card: "#FFFFFF", ink: "#0F1C14", sub: "rgba(15,28,20,0.58)", line: "rgba(15,28,20,0.12)", primary: "#0F1C14", onPrimary: "#FFFFFF", titleFont: F.display, titleSize: 46 },
  clara: { bg: "#F5F5F3", card: "#FFFFFF", ink: "#1F2223", sub: "rgba(31,34,35,0.6)", line: "rgba(31,34,35,0.12)", primary: "#1F2223", onPrimary: "#FFFFFF", titleFont: "Georgia", titleSize: 34 },
};
const TONE = { ok: "#098F43", wait: "#A66700", muted: "rgba(15,28,20,0.5)" } as const;

export function BackOffice() {
  const { flags } = useGdb();
  const k = SKINS[flags.office];
  const hr = flags.office === "betterfly";
  const op = DEMO.operators[flags.office];
  return (
    <View style={{ flex: 1, borderRadius: 18, overflow: "hidden", backgroundColor: k.bg, shadowColor: "#0F1C14", shadowOpacity: 0.16, shadowRadius: 30, shadowOffset: { width: 0, height: 16 } }}>
      {/* Barra de la plataforma */}
      <View style={{ height: 64, paddingHorizontal: 28, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: k.card, borderBottomWidth: 1, borderBottomColor: k.line }}>
        {hr ? <><Isotype box={28} radius={7} /><Wordmark height={17} color={k.ink} /></> : <ClaraLogo height={22} color={k.ink} />}
        <View style={{ width: 1, height: 20, backgroundColor: k.line, marginHorizontal: 4 }} />
        <T w={500} s={15} color={k.sub}>{tr(hr ? "bo.p.betterfly" : "bo.p.clara")} · {tr("bo.workspace", { employer: DEMO.employer })}</T>
        <View style={{ flex: 1 }} />
        {/* Quién opera: una persona de la empresa, dentro de la plataforma del partner. */}
        <View style={{ alignItems: "flex-end" }}>
          <T w={600} s={14} color={k.ink} accessibilityLabel="bo-operator">{op.name}</T>
          <T w={400} s={12} color={k.sub}>{tr(hr ? "bo.role.betterfly" : "bo.role.clara", { employer: DEMO.employer })}</T>
        </View>
        <View style={{ width: 34, height: 34, borderRadius: RADIUS.pill, backgroundColor: k.bg, alignItems: "center", justifyContent: "center" }}>
          <T w={700} s={12} color={k.ink}>{op.initials}</T>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 28, gap: 22 }} showsVerticalScrollIndicator={false}>
        {hr ? <People k={k} /> : <Finance k={k} />}
      </ScrollView>
    </View>
  );
}

/** Recursos Humanos en Betterfly: a quién invitar y qué beneficio enviar. El dinero se paga desde la cuenta de la empresa en Clara. */
function People({ k }: { k: Skin }) {
  const { s } = useGdb();
  const [concept, setConcept] = useState<string>(DEMO.concepts[0]);
  const [amount, setAmount] = useState<number>(DEMO.benefit);
  const invited = s.invitation.status !== "none";
  // Sólo se puede enviar cuando el empleado ya tiene su cuenta USD: ésa es la cuenta destino que queda vinculada.
  const active = s.kyc.status === "approved";
  const status: [Key, keyof typeof TONE] = !invited ? ["admin.notInvited", "muted"] : s.kyc.status === "approved" ? ["admin.activeV", "ok"] : s.invitation.status === "accepted" ? ["admin.verifying", "wait"] : ["admin.invited", "wait"];
  return (
    <>
      <View style={{ gap: 8 }}>
        <T s={k.titleSize} lh={1.05} color={k.ink} style={{ fontFamily: k.titleFont }}>{tr("gdb.name")}</T>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <T w={400} s={14} color={k.sub}>{tr("bo.sub.betterfly")}</T>
          <ClaraLogo height={13} color={k.ink} />
        </View>
      </View>
      <Panel k={k} title={tr("admin.employees")}>
        <Row k={k} head cells={[tr("bo.c.employee"), tr("act.country"), tr("card.status"), ""]} />
        <Row k={k} cells={[
          <View key="n" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 30, height: 30, borderRadius: RADIUS.pill, backgroundColor: k.bg, alignItems: "center", justifyContent: "center" }}><T w={700} s={11} color={k.ink}>{DEMO.initials}</T></View>
            <T w={500} s={15} color={k.ink}>{DEMO.employee}</T>
          </View>,
          tr("act.countryV"),
          <View key="s" style={{ gap: 2 }}>
            <Pill label={tr(status[0])} color={TONE[status[1]]} />
            {active ? <T w={400} s={12} mono color={k.sub} accessibilityLabel="bo-employee-account">{tr("bo.acctLinked", { account: DEMO.employeeAccount })}</T> : null}
          </View>,
          invited ? "" : <Button key="b" k={k} label={tr("bo.invite")} onPress={() => gdb.invite()} a11y="bo-invite" />,
        ]} />
      </Panel>
      <Panel k={k} title={tr("bo.sendTitle")}>
        <View style={{ padding: 20, gap: 16, borderTopWidth: 1, borderTopColor: k.line }}>
          <View style={{ gap: 16, opacity: active ? 1 : 0.4 }}>
            <Segments k={k} options={DEMO.concepts.map((c) => [c, conceptLabel(c)] as const)} value={concept} onChange={setConcept} disabled={!active} a11y="bo-concept" />
            <Segments k={k} options={DEMO.amounts.map((a) => [String(a), usd(a, true)] as const)} value={String(amount)} onChange={(v) => setAmount(Number(v))} disabled={!active} a11y="bo-amount" />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            {active ? (
              <View style={{ gap: 4, flexShrink: 1 }}>
                <T w={500} s={14} color={k.ink} numberOfLines={1}>{tr("bo.to", { name: DEMO.firstName, account: DEMO.employeeAccount })}</T>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ClaraLogo height={12} color={k.ink} />
                  <T w={400} s={13} color={k.sub} numberOfLines={1}>{tr("bo.paidFrom", { account: DEMO.claraAccount })}</T>
                </View>
              </View>
            ) : <T w={500} s={14} color={TONE.wait} style={{ flexShrink: 1 }} accessibilityLabel="bo-need-account">{tr("bo.needAccount", { name: DEMO.firstName })}</T>}
            <Button k={k} label={tr("bo.sendCta", { amount: usd(amount, true) })} disabled={!active || amount > s.companyBalance - committed(s)} onPress={() => { gdb.sendBenefit(amount, concept); }} a11y="bo-send" />
          </View>
        </View>
      </Panel>
      <Batches k={k} title={tr("bo.sentTitle")} />
      <T w={400} s={13} color={k.sub}>{tr("admin.note")}</T>
    </>
  );
}

/** Finanzas en Clara: de qué cuenta sale el dinero, qué beneficios falta pagar y cuánto se pagó. Aquí se paga cada beneficio que
 *  envió RH. Nunca se ve el gasto personal del empleado. */
function Finance({ k }: { k: Skin }) {
  const { s } = useGdb();
  const toPay = committed(s);
  const delivered = s.fundings.filter((f) => f.status === "processing" || f.status === "completed").reduce((n, f) => n + f.amount, 0);
  return (
    <>
      <View style={{ gap: 6 }}>
        <T s={k.titleSize} lh={1.05} color={k.ink} style={{ fontFamily: k.titleFont }}>{tr("bo.t.clara")}</T>
        <T w={400} s={15} color={k.sub}>{tr("bo.sub.clara")}</T>
      </View>
      <View style={{ flexDirection: "row", gap: 14 }}>
        <Stat k={k} label={`${tr("bo.acct")} ${DEMO.claraAccount}`} value={usd(s.companyBalance)} a11y="bo-balance" />
        <Stat k={k} label={tr("bo.toPay")} value={usd(toPay)} a11y="bo-to-pay" />
        <Stat k={k} label={tr("bo.paid")} value={usd(delivered)} a11y="bo-paid" />
      </View>
      <Batches k={k} title={tr("bo.payments")} pay />
      <T w={400} s={13} color={k.sub}>{tr("bo.finNote")}</T>
    </>
  );
}

/** Beneficios enviados: los mismos en las dos miradas. RH sólo ve el estado; Finanzas (`pay`) paga los pendientes desde la cuenta
 *  de la empresa en Clara, y es entonces cuando le llegan al empleado. */
function Batches({ k, title, pay }: { k: Skin; title: string; pay?: boolean }) {
  const { s } = useGdb();
  return (
    <Panel k={k} title={title}>
      <Row k={k} head flex={BATCH_FLEX} cells={[tr("bo.c.employee"), tr("bo.c.concept"), tr("tx.reference"), tr("tx.amount"), tr("card.status")]} />
      {s.fundings.length === 0
        ? <View style={{ paddingVertical: 22, alignItems: "center", borderTopWidth: 1, borderTopColor: k.line }}><T w={400} s={14} color={k.sub}>{tr("admin.none")}</T></View>
        : s.fundings.map((f) => (
          <Row key={f.id} k={k} flex={BATCH_FLEX} cells={[
            // A quién se le paga y a qué cuenta: lo mismo que ve RH, para saber a quién corresponde cada pago.
            <View key="e" style={{ gap: 2 }} accessibilityLabel={`bo-payee-${f.id}`}>
              <T w={500} s={15} color={k.ink}>{DEMO.employee}</T>
              <T w={400} s={12} mono color={k.sub}>{tr("bo.acctLinked", { account: DEMO.employeeAccount })}</T>
            </View>,
            conceptLabel(f.concept) || tr("tx.s.benefit"), f.reference, usd(f.amount), pay && f.status === "pending"
            ? <Button key="b" k={k} label={tr("bo.payCta", { amount: usd(f.amount, true) })} disabled={f.amount > s.companyBalance} onPress={() => gdb.payFunding(f.id)} a11y={`bo-pay-${f.id}`} />
            : <Pill key="s" label={tr(`admin.s.${f.status}`)} color={f.status === "completed" ? TONE.ok : TONE.wait} />]} />
        ))}
    </Panel>
  );
}

function Stat({ k, label, value, a11y }: { k: Skin; label: string; value: string; a11y?: string }) {
  return (
    <View style={{ flex: 1, padding: 18, gap: 6, borderRadius: 14, backgroundColor: k.card, borderWidth: 1, borderColor: k.line }}>
      <T w={500} s={13} color={k.sub}>{label}</T>
      <T w={600} s={26} ls={-0.02} color={k.ink} accessibilityLabel={a11y} style={{ fontVariant: ["tabular-nums"] }}>{value}</T>
    </View>
  );
}

function Panel({ k, title, children }: { k: Skin; title: string; children: ReactNode }) {
  return (
    <View style={{ borderRadius: 14, backgroundColor: k.card, borderWidth: 1, borderColor: k.line, overflow: "hidden" }}>
      <View style={{ height: 56, paddingHorizontal: 20, justifyContent: "center" }}>
        <T w={600} s={17} color={k.ink}>{title}</T>
      </View>
      {children}
    </View>
  );
}

const FLEX = [3, 2, 2, 2] as const;
/** Beneficios: empleado y cuenta · beneficio · referencia · monto · estado o acción. */
const BATCH_FLEX = [3, 3, 2, 2, 2] as const;
function Row({ k, cells, head, flex = FLEX }: { k: Skin; cells: readonly ReactNode[]; head?: boolean; flex?: readonly number[] }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", minHeight: head ? 36 : 56, paddingVertical: head ? 0 : 8, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: k.line, backgroundColor: head ? k.bg : "transparent" }}>
      {cells.map((cell, n) => (
        <View key={n} style={{ flex: flex[n], alignItems: n === cells.length - 1 ? "flex-end" : "flex-start", paddingRight: n === cells.length - 1 ? 0 : 10 }}>
          {typeof cell === "string" ? <T w={head ? 500 : 400} s={head ? 12 : 15} color={head ? k.sub : k.ink}>{cell}</T> : cell}
        </View>
      ))}
    </View>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 7, height: 7, borderRadius: RADIUS.pill, backgroundColor: color }} />
      <T w={500} s={14} color={color}>{label}</T>
    </View>
  );
}

/** Opciones en línea (concepto, monto): una seleccionada, rellena. */
function Segments({ k, options, value, onChange, disabled, a11y }: { k: Skin; options: readonly (readonly [string, string])[]; value: string; onChange: (v: string) => void; disabled?: boolean; a11y: string }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map(([id, label]) => {
        const on = id === value;
        return (
          <Pressable key={id} onPress={() => onChange(id)} disabled={disabled} accessibilityLabel={`${a11y}-${id}`}
            style={{ height: 36, paddingHorizontal: 14, borderRadius: RADIUS.pill, justifyContent: "center", backgroundColor: on ? k.primary : "transparent", borderWidth: 1, borderColor: on ? k.primary : k.line }}>
            <T w={on ? 600 : 500} s={14} color={on ? k.onPrimary : k.ink}>{label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

function Button({ k, label, onPress, disabled, a11y }: { k: Skin; label: string; onPress: () => void; disabled?: boolean; a11y: string }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityLabel={a11y} accessibilityRole="button"
      style={({ pressed }) => ({ height: 36, paddingHorizontal: 16, borderRadius: RADIUS.pill, justifyContent: "center", backgroundColor: k.primary, opacity: disabled ? 0.3 : pressed ? 0.8 : 1 })}>
      <T w={600} s={14} color={k.onPrimary}>{label}</T>
    </Pressable>
  );
}
