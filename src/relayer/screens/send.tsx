import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import type { AppCtx } from "../../ctx";
import { useAction } from "../../hooks/useAction";
import { useNow } from "../../hooks/useNow";
import { t } from "../../i18n/es";
import { useFaceIdHud } from "../../ui/FaceIdHud";
import { DrawCheck, EASE_IOS, Eyebrow, Grabber, Group, Hairline, Ico, Keypad, type KeypadKey, PrimaryButton, SoftPill, Spinner, useShake } from "../../ui/kit";
import { T } from "../../ui/primitives";
import { RADIUS } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import { beneBank, beneTitle } from "../beneficiaries";
import type { SheetParams } from "../../navigation/routes";
import { BeneRow, NewBeneRow, sortBenes } from "./beneRow";
import { formatCents, mxnToUsdcCents, quoteFor } from "../money";
import type { Quote, Receipt } from "../types";

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

/** Hoja Transferir: a quién (cuentas guardadas, como los beneficiarios de relayer-core) → monto → revisar → listo.
 *  Con `beneficiaryId` (desde la tarjeta) arranca en el monto. */
export function SendSheet(ctx: AppCtx & { params?: SheetParams["send"] }) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { state, api, movements } = ctx.module;
  const hud = useFaceIdHud(ctx.faceId);
  const preset = ctx.params?.beneficiaryId ?? null;
  const [beneId, setBeneId] = useState<string | null>(preset);
  const bene = state.beneficiaries.find((b) => b.id === beneId) ?? null;
  const [idx, setIdx] = useState(preset ? 1 : 0);
  const x = useRef(new Animated.Value(-idx * width)).current;
  useEffect(() => { Animated.timing(x, { toValue: -idx * width, duration: 520, easing: EASE_IOS, useNativeDriver: true }).start(); }, [idx, width, x]);
  const [shakeX, shake] = useShake();
  const { error, setError, run } = useAction();
  const bottom = Math.max(insets.bottom, 12) + 12;

  // ── A quién ──
  const pick = (id: string) => { setError(""); setBeneId(id); setIdx(1); };
  const list = sortBenes(state.beneficiaries);

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
    if (!beneId) return;
    const q = await run(() => api.quoteSend(usdc, beneId));
    if (q) { setQuote(q); setIdx(2); }
  };

  // ── Revisar ──
  const now = useNow(1000);
  const left = quote ? Math.max(0, Math.min(60, Math.ceil((quote.expiresAt - now) / 1000))) : 60;
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [confirming, setConfirming] = useState(false);
  const confirm = async () => {
    if (!quote || confirming) return;
    if (left <= 0) { if (!beneId) return; const q = await run(() => api.quoteSend(quote.amountUsdcCents, beneId)); if (q) setQuote(q); return; }
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

  const backLabel = idx === 1 || idx === 2 ? t("rc.send.back") : idx === 3 ? "" : t("common.cancel");
  const titles = [t("rc.send.account"), t("rc.transfer"), t("rc.send.review"), ""];
  const onBack = () => { setError(""); if (idx === 2 || idx === 1) setIdx(idx - 1); else if (idx !== 3) ctx.back(); };

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
          {/* A quién */}
          <View style={{ width }}>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: bottom, gap: 22 }} showsVerticalScrollIndicator={false}>
              <Group><NewBeneRow onPress={() => ctx.nav("beneficiary")} /></Group>
              {list.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <Eyebrow style={{ paddingHorizontal: 4 }}>{t("rc.bene.saved")}</Eyebrow>
                  <Group>
                    {list.map((b, k) => (
                      <View key={b.id}>
                        {k > 0 ? <Hairline inset={68} /> : null}
                        <BeneRow b={b} selected={b.id === beneId} onPress={() => pick(b.id)} />
                      </View>
                    ))}
                  </Group>
                </View>
              ) : null}
            </ScrollView>
          </View>
          {/* Monto */}
          <View style={{ width, paddingHorizontal: 16, paddingBottom: bottom }}>
            <View style={{ alignItems: "center", paddingTop: 6 }}>
              {bene ? <SoftPill icon="landmark" label={`${beneTitle(bene)} · ${beneBank(bene)}`} onPress={() => setIdx(0)} accessibilityLabel="send-change-bene" /> : null}
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
                [t("rc.send.to"), bene ? beneTitle(bene) : "—"],
                [t("rc.bene.account"), bene ? beneBank(bene) : "—"],
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
