import { Pressable, View } from "react-native";
import { t } from "../../i18n/es";
import { Ico, Spinner } from "../../ui/kit";
import { T } from "../../ui/primitives";
import { RADIUS } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import { beneBank, beneTitle, initials } from "../beneficiaries";
import type { Beneficiary } from "../types";

/** Avatar con iniciales: la cuenta propia en petróleo, los terceros en tinta suave. */
export function BeneAvatar({ b, size = 40 }: { b: Pick<Beneficiary, "name" | "owner">; size?: number }) {
  const { c } = useTheme();
  const self = b.owner === "self";
  return (
    <View style={{ width: size, height: size, borderRadius: RADIUS.pill, backgroundColor: self ? c.brand : c.ink08, alignItems: "center", justifyContent: "center" }}>
      <T w={600} s={Math.round(size * 0.36)} color={self ? c.onBrand : c.ink72}>{initials(b.name)}</T>
    </View>
  );
}

/** Fila de una cuenta guardada: alias, banco y terminación; estado de verificación a la derecha. */
export function BeneRow({ b, onPress, selected, chevron = true }: { b: Beneficiary; onPress?: () => void; selected?: boolean; chevron?: boolean }) {
  const { c } = useTheme();
  const ready = b.status === "verified";
  const sub = b.status === "failed" ? t("rc.bene.failed") : beneBank(b);
  return (
    <Pressable disabled={!ready || !onPress} onPress={onPress} accessibilityLabel={`bene-${b.id}`}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 16, backgroundColor: pressed ? c.ink04 : "transparent" })}>
      <View style={{ opacity: b.status === "failed" ? 0.5 : 1 }}><BeneAvatar b={b} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <T w={500} s={16} color={c.inkStrong} numberOfLines={1} style={{ flexShrink: 1 }}>{beneTitle(b)}</T>
          {b.owner === "self" ? (
            <View style={{ paddingHorizontal: 7, height: 18, borderRadius: RADIUS.pill, backgroundColor: c.ink08, justifyContent: "center" }}>
              <T w={500} s={11} color={c.ink72}>{t("rc.bene.yours")}</T>
            </View>
          ) : null}
        </View>
        <T w={400} s={13} color={b.status === "failed" ? c.error : c.ink55} numberOfLines={1}>{sub}</T>
      </View>
      {b.status === "pending_verification" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Spinner size={13} color={c.ink40} />
          <T w={400} s={12} color={c.ink40}>{t("rc.bene.verifying")}</T>
        </View>
      ) : selected ? <Ico name="check" size={18} color={c.brand} sw={2.4} />
        : chevron && ready && onPress ? <Ico name="chevronRight" size={18} color={c.ink25} sw={2} /> : null}
    </Pressable>
  );
}

/** Fila «Nueva cuenta». */
export function NewBeneRow({ onPress }: { onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityLabel="bene-new"
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 16, backgroundColor: pressed ? c.ink04 : "transparent" })}>
      <View style={{ width: 40, height: 40, borderRadius: RADIUS.pill, borderWidth: 1.5, borderColor: c.brand, alignItems: "center", justifyContent: "center" }}>
        <Ico name="plus" size={18} color={c.brand} sw={2.2} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T w={500} s={16} color={c.brand}>{t("rc.bene.new")}</T>
        <T w={400} s={13} color={c.ink55}>{t("rc.bene.newSub")}</T>
      </View>
    </Pressable>
  );
}

/** Self primero, luego lo más reciente. */
export const sortBenes = (list: readonly Beneficiary[]) =>
  [...list].sort((a, b) => (a.owner === "self" ? -1 : 0) - (b.owner === "self" ? -1 : 0) || b.createdAt - a.createdAt);
