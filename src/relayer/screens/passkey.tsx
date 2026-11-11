import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import type { AppCtx } from "../../ctx";
import { useAction } from "../../hooks/useAction";
import { t } from "../../i18n/es";
import { Body, Btn, Card, Chip, Icon, KVList, StatusCard, Steps, T, Tag, TouchCard } from "../../ui/primitives";
import { alpha } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import { PoweredBy } from "./PoweredBy";

export function PasskeyScreen({ nav, module, faceId, S, set }: AppCtx) {
  const { c } = useTheme();
  const { state, api } = module;
  const { busy, error, run, setError } = useAction();
  const address = state.wallet.address;
  const create = async () => {
    const ok = await faceId.authenticate(t("passkey.prompt"));
    if (!ok) { setError(t("errors.passkey_cancelled")); return; }
    await run(() => api.createPasskey());
  };
  const next = () => { const target = S.next ?? "balance"; set({ next: undefined }); nav(target); };

  if (address) {
    return (
      <Body gap={14}>
        <StatusCard tag={t("passkey.doneTag")} title={t("passkey.doneTitle")} body={t("passkey.doneBody")} tone="success" />
        <Card gap={12} style={{ alignItems: "center" }}>
          <QRCode value={address} size={160} color={c.inkStrong} backgroundColor={c.card} />
          <Tag>{t("passkey.addressTag")}</Tag>
          <T w={500} s={12} lh={1.5} mono selectable style={{ textAlign: "center" }}>{address}</T>
          <Chip label={t("common.copy")} onPress={() => { void Clipboard.setStringAsync(address); }} accessibilityLabel="passkey-copy" />
        </Card>
        <Card><KVList rows={[{ label: t("passkey.chain"), value: "Base" }, { label: t("passkey.custody"), value: t("passkey.custodyValue") }]} /></Card>
        <Btn label={t("common.continue")} variant="primary" arrow onPress={next} accessibilityLabel="passkey-continue" />
        <PoweredBy center />
      </Body>
    );
  }

  return (
    <Body gap={14}>
      <Card bg={c.brand} bd={c.brand} gap={8}>
        <Tag color={alpha(c.onBrand, 0.7)}>{t("passkey.tag")}</Tag>
        <T w={600} s={24} lh={1.1} ls={-0.02} color={c.onBrand}>{t("passkey.title")}</T>
        <T w={400} s={13.5} lh={1.5} color={alpha(c.onBrand, 0.85)}>{t("passkey.lede")}</T>
      </Card>
      <Steps items={(["1", "2", "3"] as const).map((i) => ({ title: t(`passkey.how${i}.title`), body: t(`passkey.how${i}.body`) }))} />
      {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
      <TouchCard onPress={() => { void create(); }} disabled={busy} bg={c.btnPrimary} bd={c.btnPrimary} accessibilityLabel="passkey-create" style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          {busy ? <ActivityIndicator color={c.onBtnPrimary} /> : <Icon name="faceId" size={26} color={c.onBtnPrimary} />}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <T w={600} s={16} lh={1.2} color={c.onBtnPrimary}>{busy ? t("passkey.creating") : t("passkey.create")}</T>
          <Tag color={alpha(c.onBtnPrimary, 0.7)}>{t("passkey.createSub")}</Tag>
        </View>
      </TouchCard>
      <T w={400} s={12} lh={1.45} color={c.ink55}>{t("passkey.footnote")}</T>
      <PoweredBy center />
    </Body>
  );
}
