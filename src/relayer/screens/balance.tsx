import { useEffect, useState } from "react";
import { View } from "react-native";
import type { AppCtx } from "../../ctx";
import { t } from "../../i18n/es";
import type { Screen } from "../../navigation/screens";
import { formatWhen, shortAddress } from "../format";
import { formatCents, formatMxn, formatRate } from "../money";
import type { Balance, Movement } from "../types";
import { Body, Btn, Card, Icon, KVList, Reveal, Row, Skeleton, T, Tag, Touch } from "../../ui/primitives";
import { alpha } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import { PoweredBy } from "./PoweredBy";

/** Botón ⚙ de la cabecera (MODULE_HEADER_RIGHT.balance). */
export function SettingsButton({ nav }: AppCtx) {
  return (
    <Touch onPress={() => nav("settings")} hitSlop={10} accessibilityLabel="balance-settings"><Icon name="settings" size={20} /></Touch>
  );
}

function MovementRow({ m, onPress }: { m: Movement; onPress: () => void }) {
  const { c } = useTheme();
  const dot = m.status === "pending" ? c.warning : m.status === "failed" ? c.error : m.kind === "deposit" ? c.success : c.ink40;
  const sign = m.kind === "deposit" ? "+" : "−";
  return (
    <Row dot={dot} title={m.kind === "deposit" ? (m.fromLabel ?? t("movement.kind.deposit")) : t("movement.kind.withdrawal")}
      sub={`${formatWhen(m.at)} · ${m.concept ?? t(`movement.status.${m.status}`)}`}
      right={`${sign}${formatCents(m.amountUsdcCents)}`} rightFg={m.status === "failed" ? c.ink40 : m.kind === "deposit" ? c.success : c.inkStrong}
      onPress={onPress} accessibilityLabel={`movement-${m.id}`} />
  );
}

export function BalanceScreen({ nav, module }: AppCtx) {
  const { c } = useTheme();
  const { state, movements, api } = module;
  const [bal, setBal] = useState<Balance | null>(null);
  // getBalance es del contrato (latencia real); después, el saldo del snapshot dispara el refresco.
  useEffect(() => {
    let stale = false;
    api.getBalance().then((b) => { if (!stale) setBal(b); }).catch(() => {});
    return () => { stale = true; };
  }, [api, state.balanceUsdcCents]);
  const hasCard = state.card.status === "active" || state.card.status === "frozen";
  const cardTarget: Screen = hasCard ? (state.card.authorizedAt ? "card" : "cardAuthorize") : "cardRequest";
  const sendTarget: Screen = state.bank.status === "verified" ? "send" : "bankAccount";
  return (
    <Body gap={14}>
      <Card bg={c.brand} bd={c.brand} gap={10}>
        <Tag color={alpha(c.onBrand, 0.7)}>{t("balance.availableTag")}</Tag>
        {bal === null ? <Skeleton h={40} w="60%" /> : (
          <Reveal>
            <T w={600} s={40} lh={1} ls={-0.03} mono color={c.onBrand}>{formatCents(bal.usdcCents)} <T w={500} s={16} mono color={alpha(c.onBrand, 0.7)}>USDC</T></T>
            <T w={500} s={12.5} lh={1.3} mono color={alpha(c.onBrand, 0.85)} style={{ marginTop: 6 }}>≈ {formatMxn(bal.mxnCents)} · {formatRate(bal.rate)}</T>
          </Reveal>
        )}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
          <Btn label={t("balance.card")} icon="card" variant="control" flex={1} onPress={() => nav(cardTarget)} accessibilityLabel="balance-card" />
          <Btn label={t("balance.send")} icon="send" variant="control" flex={1} onPress={() => nav(sendTarget)} accessibilityLabel="balance-send" />
        </View>
      </Card>
      <Card><KVList rows={[
        { label: t("balance.kvWallet"), value: `${shortAddress(state.wallet.address)} · Base` },
        { label: t("balance.kvCard"), value: t(`card.status.${state.card.status}`) },
        { label: t("balance.kvBank"), value: state.bank.status === "verified" ? `${state.bank.bankName} ···· ${(state.bank.clabe ?? "").slice(-4)}` : t(`bank.status.${state.bank.status}`) },
      ]} /></Card>
      <Tag>{t("balance.movementsTag")}</Tag>
      {movements.length === 0 ? (
        <Card><T w={400} s={13} lh={1.45} color={c.ink55}>{t("balance.empty")}</T></Card>
      ) : movements.map((m) => (
        <MovementRow key={m.id} m={m} onPress={() => (m.kind === "deposit" ? nav("deposit", { depositId: m.id }) : nav("sendReceipt", { receiptId: m.receiptId }))} />
      ))}
      <PoweredBy />
    </Body>
  );
}
