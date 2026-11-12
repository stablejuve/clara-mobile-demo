import { useState } from "react";
import { Alert, View } from "react-native";
import type { AppCtx } from "../../ctx";
import { useAction } from "../../hooks/useAction";
import { t } from "../../i18n/es";
import { formatWhen } from "../format";
import { DEFAULT_DEPOSIT } from "../mock/fixtures";
import { type Scenario, SCENARIOS } from "../mock/scenarios";
import { formatCents, formatUsdc, parseAmount } from "../money";
import { Body, Btn, Card, Chip, Field, KV, T, Tag, Warn } from "../../ui/primitives";
import { useTheme } from "../../ui/ThemeProvider";
import { LargeTitleScreen } from "../../ui/LargeTitle";
import { EMPTY_DRAFT } from "../kyc";

export function DemoPanelScreen({ nav, module, faceId, notifications, kyc }: AppCtx) {
  const { c } = useTheme();
  const { state, events, api } = module;
  const { busy, error, run } = useAction();
  const [scenario, setScenario] = useState<Scenario>(api.getScenario());
  const [amount, setAmount] = useState(formatCents(DEFAULT_DEPOSIT.amountMxnCents).replace(/,/g, ""));
  const [concept, setConcept] = useState<string>(DEFAULT_DEPOSIT.concept);
  const [reference, setReference] = useState<string>(DEFAULT_DEPOSIT.reference);
  const amountCents = parseAmount(amount);
  const pick = (s: Scenario) => { void api.setScenario(s).then(() => setScenario(s)); };
  const pay = async () => { if (amountCents === null) return; await run(() => api.simulateEmployerDeposit({ amountMxnCents: amountCents, concept, reference })); };
  const reset = () => {
    Alert.alert(t("demo.resetTitle"), t("demo.resetBody"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("demo.resetConfirm"), style: "destructive", onPress: () => { void api.reset().then(() => { kyc.setDraft(EMPTY_DRAFT); nav("benefits"); }); } },
    ]);
  };
  const rows = [["module", state.module], ["kyc", state.kyc.status], ["wallet", state.wallet.status], ["card", state.card.status], ["pass", state.pass.status], ["beneficiaries", String(state.beneficiaries.length)], ["send", state.send.status]] as const;
  return (
    <LargeTitleScreen title={t("screen.demoPanel.title")} back={t("rc.name")}>
    <Body gap={14}>
      <Warn tone="info" title={t("demo.title")} body={t("demo.body")} />
      <Tag>{t("demo.scenarioTag")}</Tag>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {SCENARIOS.map((s) => <Chip key={s} label={t(`scenario.${s}`)} on={s === scenario} onPress={() => pick(s)} accessibilityLabel={`scenario-${s}`} />)}
      </View>
      <T w={400} s={12} lh={1.45} color={c.ink55}>{t(`scenario.${scenario}.hint`)}</T>
      <Tag>{t("demo.stateTag")}</Tag>
      <Card gap={6}>
        {rows.map(([k, v]) => <KV key={k} k={k} v={v} />)}
        <KV k={t("demo.kvBalance")} v={formatUsdc(state.balanceUsdcCents)} />
        <KV k={t("demo.kvFaceId")} v={faceId.available === null ? "…" : faceId.available ? t("common.yes") : t("demo.faceIdSimulated")} />
        <KV k={t("demo.kvPush")} v={notifications.permission} />
      </Card>
      <Tag>{t("demo.payTag")}</Tag>
      <Field label={t("demo.payAmount")} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" accessibilityLabel="demo-amount" />
      <Field label={t("demo.payConcept")} value={concept} onChangeText={setConcept} accessibilityLabel="demo-concept" />
      <Field label={t("demo.payReference")} value={reference} onChangeText={setReference} autoCapitalize="characters" accessibilityLabel="demo-reference" />
      {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
      <Btn label={t("demo.payCta")} icon="banknote" variant="brand" busy={busy} disabled={!module.active || amountCents === null} onPress={() => { void pay(); }} accessibilityLabel="demo-pay" />
      {!module.active ? <T w={400} s={12} lh={1.45} color={c.ink55}>{t("demo.payNeedsActive")}</T> : null}
      <Btn label={t("demo.cardPurchase")} icon="card" variant="ghost" busy={busy} disabled={!module.active || module.state.card.last4 === null} onPress={() => { void run(() => api.simulateCardPurchase()); }} accessibilityLabel="demo-card-purchase" />
      <Tag>{t("demo.eventsTag")}</Tag>
      {events.length === 0 ? <Card><T w={400} s={13} lh={1.45} color={c.ink55}>{t("demo.noEvents")}</T></Card> : [...events].reverse().map((e) => (
        <Card key={e.id} gap={4} pad={12}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <T w={600} s={12.5} mono>{e.type}</T>
            <T w={500} s={10.5} mono color={c.ink55}>{formatWhen(e.at)}</T>
          </View>
          <T w={400} s={11} lh={1.4} mono color={c.ink72}>{JSON.stringify(e.payload)}</T>
        </Card>
      ))}
      <Btn label={t("demo.reset")} icon="bug" variant="danger" onPress={reset} accessibilityLabel="demo-reset" />
      <Btn label={t("demo.goBenefits")} variant="ghost" onPress={() => nav("benefits")} />
    </Body>
    </LargeTitleScreen>
  );
}
