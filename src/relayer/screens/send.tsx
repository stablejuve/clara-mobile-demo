import * as Clipboard from "expo-clipboard";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import type { AppCtx } from "../../ctx";
import { useAction } from "../../hooks/useAction";
import { useNow } from "../../hooks/useNow";
import { t } from "../../i18n/es";
import { useFaceIdHud } from "../../ui/FaceIdHud";
import { DrawCheck, EASE_IOS, Grabber, Ico, Keypad, type KeypadKey, PrimaryButton, SoftPill, Spinner, useShake } from "../../ui/kit";
import { T } from "../../ui/primitives";
import { RADIUS } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import { bankFor, clabeValid } from "../clabe";
import { bankLabel } from "../display";
import { formatCents, mxnToUsdcCents, quoteFor } from "../money";
import type { Quote, Receipt } from "../types";

/** CLABE de la demo (BBVA, dígito de control válido) para «Pegar» cuando el portapapeles no trae una. */
export const DEMO_CLABE = "012180001234567899";
type ClabeState = "idle" | "verifying" | "ok";

/** «012 180 00123456789 9»: banco, plaza, cuenta, control. */
export const groupClabe = (c: string) => [c.slice(0, 3), c.slice(3, 6), c.slice(6, 17), c.slice(17)].filter(Boolean).join(" ");

/** Teclado del monto: un punto, dos decimales, siete dígitos. */
export function amountKey(v: string, k: KeypadKey): string {
  if (k === "del") return v.slice(0, -1);
  if (k === ".") return v.includes(".") ? v : `${v || "0"}.`;
  if (v.includes(".") && v.split(".")[1].length >= 2) return v;
  if (v === "0") return k;
  return v.replace(".", "").length < 7 ? v + k : v;
}

/** Hoja Transferir: carril CLABE → monto → revisar → listo. Con la CLABE ya verificada arranca en el monto. */
export function SendSheet(ctx: AppCtx) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { state, api, movements } = ctx.module;
  const hud = useFaceIdHud(ctx.faceId);
  const [idx, setIdx] = useState(state.bank.status === "verified" ? 1 : 0);
  const x = useRef(new Animated.Value(-idx * width)).current;
  useEffect(() => { Animated.timing(x, { toValue: -idx * width, duration: 520, easing: EASE_IOS, useNativeDriver: true }).start(); }, [idx, width, x]);
  const [shakeX, shake] = useShake();
  const { error, setError, run } = useAction();
  const bottom = Math.max(insets.bottom, 12) + 12;

  // ── CLABE ──
  const [clabe, setClabe] = useState(state.bank.status === "pending_verification" ? state.bank.clabe ?? "" : "");
  const [cstate, setCstate] = useState<ClabeState>(state.bank.status === "pending_verification" ? "verifying" : "idle");
  const [clabeErr, setClabeErr] = useState("");
  useEffect(() => {
    if (cstate !== "verifying") return;
    if (state.bank.status === "verified") setCstate("ok");
    if (state.bank.status === "failed") { setCstate("idle"); setClabeErr(t("rc.send.clabeFailed")); shake(); }
  }, [state.bank.status, cstate, shake]);
  // «Verificada» se ve un momento y la hoja pasa sola al monto.
  useEffect(() => {
    if (cstate !== "ok") return;
    const id = setTimeout(() => setIdx(1), 700);
    return () => clearTimeout(id);
  }, [cstate]);
  const clabeKey = (k: KeypadKey) => {
    if (cstate !== "idle") return;
    setClabeErr("");
    if (k === "del") setClabe((v) => v.slice(0, -1));
    else if (k !== ".") setClabe((v) => (v.length < 18 ? v + k : v));
  };
  const paste = async () => {
    const clip = (await Clipboard.getStringAsync().catch(() => "")).replace(/\D/g, "");
    setClabe(clip.length === 18 ? clip : DEMO_CLABE);
    setClabeErr("");
  };
  const verify = async () => {
    if (clabe.length !== 18 || cstate !== "idle") return;
    if (!clabeValid(clabe)) { setClabeErr(t("errors.clabe_invalid")); shake(); return; }
    setCstate("verifying");
    if (!(await run(() => api.addBankAccount(clabe)))) setCstate("idle");
  };
  const bankName = clabe.length >= 3 ? bankFor(clabe) : null;
  const clabeNote = cstate === "verifying" ? t("rc.send.verifyingOwner") : cstate === "ok" ? t("rc.send.verified") : clabeErr || bankName || (clabe ? t("rc.send.digits", { n: clabe.length }) : t("rc.send.yourName"));
  const clabeNoteColor = cstate === "ok" ? c.success : clabeErr ? c.error : c.ink55;

  // ── Monto ──
  const [unit, setUnit] = useState<"mxn" | "usdc">("mxn");
  const [input, setInput] = useState("");
  const v = parseFloat(input);
  const usdc = !input || !v ? 0 : unit === "mxn" ? mxnToUsdcCents(Math.round(v * 100)) : Math.round(v * 100);
  const check = usdc > 0 ? quoteFor(usdc, state.balanceUsdcCents) : null;
  const amtErr = check && !check.ok ? (check.code === "insufficient_balance" ? t("rc.send.insufficient") : t("rc.send.minimum")) : null;
  const recv = check?.ok ? check.quote.amountMxnCents : 0;
  const amtText = (unit === "mxn" ? "$" : "") + (input || "0");
  const convLine = !check ? t("rc.send.available", { amount: formatCents(state.balanceUsdcCents) })
    : amtErr ?? (unit === "mxn" ? t("rc.send.convMxn", { usdc: formatCents(usdc), mxn: formatCents(recv) }) : t("rc.send.convUsdc", { mxn: formatCents(recv) }));
  const [quote, setQuote] = useState<Quote | null>(null);
  const review = async () => {
    if (!check?.ok) { shake(); return; }
    const q = await run(() => api.quoteSend(usdc));
    if (q) { setQuote(q); setIdx(2); }
  };

  // ── Revisar ──
  const now = useNow(1000);
  const left = quote ? Math.max(0, Math.min(60, Math.ceil((quote.expiresAt - now) / 1000))) : 60;
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [confirming, setConfirming] = useState(false);
  const confirm = async () => {
    if (!quote || confirming) return;
    if (left <= 0) { const q = await run(() => api.quoteSend(quote.amountUsdcCents)); if (q) setQuote(q); return; }
    setConfirming(true);
    try {
      if (!(await hud.auth(t("common.ready"), t("rc.send.authReason")))) return;
      const r = await run(() => api.confirmSend(quote.id));
      if (r) { setReceipt(r); setIdx(3); }
    } finally { setConfirming(false); }
  };

  // ── Listo ──
  const mv = receipt ? movements.find((m) => m.receiptId === receipt.id) : undefined;
  const status = mv?.status ?? "pending";

  const backLabel = idx === 2 ? t("rc.send.back") : idx === 3 ? "" : t("common.cancel");
  const titles = [t("rc.send.account"), t("rc.transfer"), t("rc.send.review"), ""];
  const onBack = () => { setError(""); if (idx === 2) setIdx(1); else if (idx !== 3) ctx.back(); };

  return (
    <View style={{ flex: 1, backgroundColor: c.page }}>
      <Grabber />
      <View style={{ height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 }}>
        <Pressable onPress={onBack} hitSlop={8} style={{ minWidth: 80 }} accessibilityLabel="send-back"><T w={400} s={17} color={c.brand}>{backLabel}</T></Pressable>
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, alignItems: "center" }}><T w={600} s={17} color={c.inkStrong}>{titles[idx]}</T></View>
        <View style={{ minWidth: 80 }} />
      </View>
      <View style={{ flex: 1, overflow: "hidden" }}>
        <Animated.View style={{ flexDirection: "row", width: width * 4, flex: 1, transform: [{ translateX: x }] }}>
          {/* CLABE */}
          <View style={{ width, paddingHorizontal: 16, paddingBottom: bottom }}>
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }}>
              <T w={500} s={10.5} ls={0.08} mono color={c.ink55}>CLABE</T>
              <Animated.View style={{ minHeight: 34, transform: [{ translateX: shakeX }] }}>
                <T w={500} s={25} ls={0.04} mono color={clabe ? c.inkStrong : c.ink25}>{clabe ? groupClabe(clabe) : "000 000 00000000000 0"}</T>
              </Animated.View>
              <View style={{ height: 28, flexDirection: "row", alignItems: "center", gap: 8 }}>
                {cstate === "verifying" ? <Spinner size={15} color={clabeNoteColor} /> : null}
                {cstate === "ok" ? <Ico name="check" size={15} color={clabeNoteColor} sw={2.6} /> : null}
                <T w={500} s={14} color={clabeNoteColor}>{clabeNote}</T>
              </View>
              {!clabe ? <SoftPill label={t("rc.send.paste")} onPress={() => { void paste(); }} accessibilityLabel="send-paste" /> : <View style={{ height: 32 }} />}
            </View>
            <Keypad onKey={clabeKey} blankDot />
            <PrimaryButton label={t("rc.send.verify")} dim={clabe.length !== 18 || cstate !== "idle"} onPress={() => { void verify(); }} accessibilityLabel="send-verify" />
          </View>
          {/* Monto */}
          <View style={{ width, paddingHorizontal: 16, paddingBottom: bottom }}>
            <View style={{ alignItems: "center", paddingTop: 6 }}>
              {state.bank.clabe ? <SoftPill icon="landmark" label={bankLabel(state.bank)} /> : null}
            </View>
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }}>
              <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
                <T w={600} s={amtText.length > 7 ? 50 : 68} lh={1} ls={-0.035} color={input ? c.inkStrong : c.ink25} numberOfLines={1} style={{ fontVariant: ["tabular-nums"] }}>{amtText}</T>
              </Animated.View>
              <Pressable onPress={() => { setUnit((u) => (u === "mxn" ? "usdc" : "mxn")); setInput(""); }} accessibilityLabel="send-unit"
                style={{ height: 30, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: c.ink15 }}>
                <T w={500} s={13} mono color={c.ink72}>{unit === "mxn" ? "MXN" : "USDC"}</T>
                <Ico name="swap" size={13} color={c.ink72} sw={2.2} />
              </Pressable>
              <View style={{ height: 20 }}><T w={400} s={14} mono color={amtErr ? c.error : c.ink55}>{error && idx === 1 ? error : convLine}</T></View>
            </View>
            <Keypad onKey={(k) => setInput((s) => amountKey(s, k))} />
            <PrimaryButton label={t("rc.send.review")} dim={!check?.ok} onPress={() => { void review(); }} accessibilityLabel="send-review" />
          </View>
          {/* Revisar */}
          <View style={{ width, paddingHorizontal: 20, paddingBottom: bottom }}>
            <View style={{ paddingTop: 56, paddingBottom: 36, alignItems: "center", gap: 8 }}>
              <T w={500} s={10.5} ls={0.08} mono color={c.ink55}>{t("rc.send.youReceive").toUpperCase()}</T>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                <T w={600} s={48} lh={1} ls={-0.035} color={c.inkStrong} style={{ fontVariant: ["tabular-nums"] }}>${formatCents(quote?.amountMxnCents ?? 0)}</T>
                <T w={500} s={15} color={c.ink40}>MXN</T>
              </View>
            </View>
            <View style={{ borderRadius: RADIUS.card, backgroundColor: c.card, overflow: "hidden" }}>
              {quote ? [
                [t("rc.send.youSend"), `${formatCents(quote.amountUsdcCents)} USDC`],
                [t("rc.send.fee"), `${formatCents(quote.feeUsdcCents)} USDC`],
                [t("rc.send.rate"), `$${quote.rate.toFixed(2)}`],
                [t("rc.send.to"), bankLabel(state.bank)],
              ].map(([k, val]) => (
                <View key={k} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: c.ink08 }}>
                  <T w={400} s={15} color={c.ink55}>{k}</T>
                  <T w={500} s={15} mono color={c.inkStrong}>{val}</T>
                </View>
              )) : null}
            </View>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Svg width={18} height={18} viewBox="0 0 20 20" style={{ transform: [{ rotate: "-90deg" }] }}>
                <Circle cx={10} cy={10} r={8} fill="none" stroke={c.ink08} strokeWidth={2.2} />
                <Circle cx={10} cy={10} r={8} fill="none" stroke={left > 0 ? c.ink55 : c.error} strokeWidth={2.2} strokeLinecap="round" strokeDasharray="50.3" strokeDashoffset={50.3 * (1 - left / 60)} />
              </Svg>
              <T w={500} s={13} mono color={left > 0 ? c.ink55 : c.error}>{error && idx === 2 ? error : left > 0 ? t("rc.send.fixed", { s: left }) : t("rc.send.expired")}</T>
            </View>
            <PrimaryButton label={left > 0 ? t("rc.send.confirm") : t("rc.send.requote")} icon={left > 0 ? "faceId" : undefined} dim={confirming} onPress={() => { void confirm(); }} accessibilityLabel="send-confirm" />
          </View>
          {/* Listo */}
          <View style={{ width, alignItems: "center", paddingTop: 100, paddingHorizontal: 28, paddingBottom: bottom }}>
            <DrawCheck drawn={idx === 3 && status !== "failed"} color={c.success} />
            <T w={700} s={30} lh={1.1} ls={-0.025} color={c.inkStrong} style={{ paddingTop: 28, textAlign: "center" }}>
              {status === "completed" ? t("rc.send.completed") : status === "failed" ? t("rc.send.failed") : t("rc.send.submitted")}
            </T>
            <T w={400} s={17} lh={1.35} color={c.ink55} style={{ paddingTop: 8, textAlign: "center" }}>
              {receipt ? t("rc.send.doneSub", { mxn: formatCents(receipt.amountMxnCents), bank: receipt.bankName }) : ""}
            </T>
            <View style={{ marginTop: 24, height: 34, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: RADIUS.pill, backgroundColor: c.ink08 }}>
              {status === "pending" ? <Spinner size={14} color={c.ink72} sw={2.6} /> : null}
              <T w={500} s={13} mono color={status === "failed" ? c.error : c.ink72}>
                {status === "completed" ? t("rc.send.folio", { folio: receipt?.folio ?? "" }) : status === "failed" ? t("rc.send.refunded") : t("rc.send.settling")}
              </T>
            </View>
            <View style={{ flex: 1 }} />
            <PrimaryButton label={t("common.ready")} onPress={ctx.back} style={{ alignSelf: "stretch" }} accessibilityLabel="send-done" />
          </View>
        </Animated.View>
      </View>
      {hud.node}
    </View>
  );
}
