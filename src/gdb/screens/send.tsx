import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Eyebrow, Group, Hairline, Ico, Keypad, type KeypadKey, ListRow, PrimaryButton, SoftPill } from "../../ui/kit";
import { T } from "../../ui/primitives";
import { F, RADIUS } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import { toLocal } from "../activity";
import { beneBank, beneTitle, sortBenes } from "../beneficiaries";
import { cop, tr, usd } from "../copy";
import { DEMO, gdb, useGdb } from "../store";
import { back, nav, Notice, SheetFrame, StateBlock } from "../ui";
import { BeneRow, NewBeneRow } from "./beneficiary";

/** Mínimo de un retiro a Colombia (el de Bridge para pesos colombianos), en centavos de COP. */
const MIN_LOCAL = 4_000_00;
type Unit = "cop" | "usd";

/** Teclado del monto. En pesos: sólo enteros, hasta ocho dígitos. En dólares: un punto, dos decimales, seis dígitos. */
export function amountKey(v: string, k: KeypadKey, unit: Unit): string {
  if (k === "del") return v.slice(0, -1);
  if (unit === "cop") return k === "." ? v : v === "" && k === "0" ? v : v.length < 8 ? v + k : v;
  if (k === ".") return v.includes(".") ? v : `${v || "0"}.`;
  if (v.includes(".") && v.split(".")[1].length >= 2) return v;
  if (v === "0") return k;
  return v.replace(".", "").length < 6 ? v + k : v;
}

/** Retirar (pantallas 06 y 07): a quién (cuentas guardadas o una nueva) → monto, en pesos con los dólares debajo → revisar con la
 *  tasa fija por un minuto → estado del retiro. Lo que teclea es lo que recibe el destinatario: no hay comisión aparte, va
 *  dentro de la tasa. Una cotización vencida se bloquea y hay que pedir otra; un retiro fallido devuelve
 *  los fondos cuando el banco confirma. No hay un «convertir» aparte: la conversión es parte del retiro. */
export function SendSheet() {
  const { c } = useTheme();
  const { s, b, benes, flags } = useGdb();
  const [step, setStep] = useState<"who" | "amount" | "review">("who");
  const [beneId, setBeneId] = useState<string | null>(null);
  const [unit, setUnit] = useState<Unit>("cop");
  const [input, setInput] = useState("");
  const [quoteId, setQuoteId] = useState<string | null>(null);
  // Al abrir, retoma un retiro en curso (o uno que falló y espera la devolución).
  const [wdId, setWdId] = useState<string | null>(() => [...gdb.get().s.withdrawals].reverse().find((x) => x.status === "processing" || x.status === "failed")?.id ?? null);
  const [now, setNow] = useState(() => Date.now());
  // Una cuenta recién agregada se elige sola en cuanto queda guardada.
  const known = useRef(benes.length);
  useEffect(() => { if (benes.length > known.current) { known.current = benes.length; setBeneId(benes[benes.length - 1].id); } }, [benes]);

  const list = sortBenes(benes);
  const dest = list.find((x) => x.id === beneId && x.status === "verified") ?? null;
  const q = s.quotes.find((x) => x.id === quoteId) ?? null;
  const w = s.withdrawals.find((x) => x.id === wdId) ?? null;
  const open = step === "review" && q?.status === "open";
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [open]);

  // Monto: lo que sale del saldo, tecleado en pesos (o en dólares) y convertido a la tasa del momento.
  const typed = Math.round((parseFloat(input) || 0) * 100);
  const usdCents = unit === "cop" ? Math.round(typed / DEMO.rate) : typed;
  const localCents = unit === "cop" ? typed : toLocal(typed, DEMO.rate);
  const over = usdCents > b.available;
  const low = typed > 0 && localCents < MIN_LOCAL;
  const valid = usdCents > 0 && !over && !low;
  const both = (usdAmount: number) => (flags.showUsd ? `${cop(toLocal(usdAmount, DEMO.rate))} · ${usd(usdAmount)}` : cop(toLocal(usdAmount, DEMO.rate)));
  // Cotiza mientras se teclea (con una pausa): es lo que alimenta el «≈» y, en el modo explicativo, muestra la llamada.
  useEffect(() => {
    if (step !== "amount" || !valid) return;
    const id = setTimeout(() => gdb.traceQuote(usdCents, localCents), 700);
    return () => clearTimeout(id);
  }, [step, valid, usdCents, localCents]);
  const getQuote = (amount: number, local?: number) => { const r = gdb.getQuote(amount, local); if (typeof r !== "string") { setNow(Date.now()); setQuoteId(r.id); setStep("review"); } };

  // ── 4 · Estado del retiro ──
  if (w) {
    const kind = w.status === "completed" ? "ok" : w.status === "processing" ? "wait" : "bad";
    const to = w.bank.holder ?? w.bank.name;
    return (
      <SheetFrame title={tr("wd.title")} footer={(
        <>
          {w.status === "reversed" ? <PrimaryButton label={tr("tx.retry")} onPress={() => { setWdId(null); setQuoteId(null); setStep("who"); }} accessibilityLabel="wd-retry" /> : null}
          {w.status === "processing" ? null : (
            <Pressable onPress={back} accessibilityLabel="wd-done" style={{ height: 48, alignItems: "center", justifyContent: "center" }}>
              <T w={500} s={17} color={c.brand}>{tr("common.done")}</T>
            </Pressable>
          )}
        </>
      )}>
        <StateBlock kind={kind} title={tr(`wd.${w.status}`)}
          sub={w.status === "completed" || w.status === "processing" ? tr(`wd.${w.status}Sub`, { local: cop(w.local), bank: to }) : tr(`wd.${w.status}Sub`, { amount: cop(w.local) })} />
      </SheetFrame>
    );
  }

  // ── 3 · Revisar ──
  if (step === "review" && q && dest) {
    const left = Math.max(0, Math.ceil((q.expiresAt - now) / 1000));
    const expired = q.status === "expired" || (q.status === "open" && left === 0);
    const confirm = () => {
      if (gdb.acceptQuote(q.id) !== null) return; // venció justo ahora: queda marcada y se pide otra
      const r = gdb.withdraw(q.id, { name: dest.bankName, account: dest.account, holder: beneTitle(dest) });
      if (typeof r !== "string") setWdId(r.id);
    };
    return (
      <SheetFrame title={tr("send.review")} footer={(
        <>
          {expired ? <PrimaryButton label={tr("fx.new")} onPress={() => getQuote(q.usd, q.local)} accessibilityLabel="fx-new" />
            : <PrimaryButton label={tr("wd.title")} onPress={confirm} accessibilityLabel="wd-cta" />}
          <Pressable onPress={() => setStep("amount")} accessibilityLabel="send-back" style={{ height: 44, alignItems: "center", justifyContent: "center" }}>
            <T w={500} s={17} color={c.brand}>{tr("common.back")}</T>
          </Pressable>
        </>
      )}>
        <View style={{ alignItems: "center", gap: 6, paddingTop: 8, opacity: expired ? 0.4 : 1 }}>
          <T w={500} s={15} color={c.ink55}>{tr("send.receive", { name: beneTitle(dest) })}</T>
          <T s={60} lh={1} color={c.inkStrong} accessibilityLabel="fx-receive" style={{ fontFamily: F.display }}>{cop(q.local)}</T>
        </View>
        {expired ? <Notice tone="bad" text={tr("fx.expired")} /> : (
          <View style={{ alignSelf: "center", height: 32, paddingHorizontal: 14, borderRadius: RADIUS.pill, backgroundColor: c.page, justifyContent: "center" }}>
            <T w={500} s={14} color={left <= 10 ? c.error : c.ink72} style={{ fontVariant: ["tabular-nums"] }}>{tr("fx.locked", { s: left })}</T>
          </View>
        )}
        <View style={{ opacity: expired ? 0.4 : 1 }}>
          <Group>
            <ListRow title={tr("send.fromBalance")} value={usd(q.usd)} />
            <Hairline />
            <ListRow title={tr("tx.rate")} value={`1 USD = COP ${q.rate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
            <Hairline />
            <ListRow title={tr("tx.to")} value={beneTitle(dest)} />
            <Hairline />
            <ListRow title={tr("bene.account")} value={beneBank(dest)} />
          </Group>
          <T w={400} s={13} color={c.ink40} style={{ textAlign: "center", paddingTop: 12 }}>{tr("send.allIn")}</T>
        </View>
      </SheetFrame>
    );
  }

  // ── 2 · Monto ──
  if (step !== "who" && dest) {
    const big = unit === "cop" ? `COP ${(parseInt(input, 10) || 0).toLocaleString("en-US")}` : `$${input || "0"}`;
    const other = usdCents <= 0 ? null : unit === "cop" ? usd(usdCents) : cop(localCents);
    return (
      <SheetFrame title={tr("send.amount")} footer={<PrimaryButton label={tr("send.review")} dim={!valid} onPress={() => { if (valid) getQuote(usdCents, localCents); }} accessibilityLabel="send-review" />}>
        <View style={{ alignItems: "center" }}>
          <SoftPill icon="landmark" label={`${beneTitle(dest)} · ${beneBank(dest)}`} onPress={() => setStep("who")} accessibilityLabel="send-change-bene" />
        </View>
        <View style={{ alignItems: "center", gap: 10, paddingTop: 4 }}>
          <T s={big.length > 11 ? 52 : 68} lh={1} color={input ? c.inkStrong : c.ink25} accessibilityLabel="send-amount" numberOfLines={1} style={{ fontFamily: F.display }}>{big}</T>
          {other && (flags.showUsd || unit === "usd") ? <T w={400} s={17} color={c.ink55} accessibilityLabel="send-other">≈ {other}</T> : null}
          <Pressable onPress={() => { setUnit((u) => (u === "cop" ? "usd" : "cop")); setInput(""); }} accessibilityLabel="send-unit"
            style={{ height: 30, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: c.ink15 }}>
            <T w={500} s={13} mono color={c.ink72}>{unit === "cop" ? "COP" : "USD"}</T>
            <Ico name="swap" size={13} color={c.ink72} sw={2.2} />
          </Pressable>
          <T w={500} s={13} mono color={c.ink55} accessibilityLabel="send-rate">{tr("send.rate", { rate: DEMO.rate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })}</T>
          <T w={400} s={15} color={over || low ? c.error : c.ink55} accessibilityLabel="send-hint">
            {over ? tr("fx.over") : low ? tr("send.min", { amount: cop(MIN_LOCAL) }) : tr("fx.available", { amount: both(b.available) })}
          </T>
        </View>
        <View style={{ flex: 1 }} />
        <Keypad blankDot={unit === "cop"} onKey={(k) => setInput((v) => amountKey(v, k, unit))} />
      </SheetFrame>
    );
  }

  // ── 1 · A quién ──
  return (
    <SheetFrame title={tr("send.who")}>
      <Group><NewBeneRow onPress={() => nav("beneficiary")} /></Group>
      <View style={{ gap: 8 }}>
        <Eyebrow style={{ paddingHorizontal: 4 }}>{tr("send.saved")}</Eyebrow>
        <Group>
          {list.map((x, n) => (
            <View key={x.id}>
              {n > 0 ? <Hairline inset={68} /> : null}
              <BeneRow b={x} selected={x.id === beneId} onPress={() => { setBeneId(x.id); setStep("amount"); }} />
            </View>
          ))}
        </Group>
      </View>
    </SheetFrame>
  );
}
