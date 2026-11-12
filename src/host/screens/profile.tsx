import { View } from "react-native";
import type { AppCtx } from "../../ctx";
import { t } from "../../i18n/es";
import { DEMO_USER, EMPLOYER } from "../../relayer/mock/fixtures";
import { Group, Hairline, Toggle } from "../../ui/kit";
import { useTraceEnabled } from "../../hooks/useTraceEnabled";
import { LargeTitleScreen } from "../../ui/LargeTitle";
import { T } from "../../ui/primitives";
import { RADIUS } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";

const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/** Perfil de la anfitriona: quién es la empleada y el modo oscuro. */
export function ProfileScreen(_: AppCtx) {
  const { c, scheme, setOverride } = useTheme();
  const [traceOn, setTrace] = useTraceEnabled();
  return (
    <LargeTitleScreen title={t("tab.profile")}>
      <View style={{ paddingHorizontal: 16, gap: 22 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: RADIUS.card, backgroundColor: c.card }}>
          <View style={{ width: 56, height: 56, borderRadius: RADIUS.pill, backgroundColor: c.ink08, alignItems: "center", justifyContent: "center" }}>
            <T w={600} s={19} color={c.ink72}>{initials(DEMO_USER.name)}</T>
          </View>
          <View style={{ gap: 3 }}>
            <T w={600} s={18} color={c.inkStrong}>{DEMO_USER.name}</T>
            <T w={400} s={14} color={c.ink55}>{EMPLOYER.name}</T>
          </View>
        </View>
        <Group>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 16, minHeight: 52 }}>
            <T w={500} s={16} color={c.inkStrong} style={{ flex: 1 }}>{t("profile.dark")}</T>
            <Toggle on={scheme === "dark"} onChange={(v) => setOverride(v ? "dark" : "light")} accessibilityLabel="dark-mode" />
          </View>
          <Hairline />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 16, minHeight: 52 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T w={500} s={16} color={c.inkStrong}>{t("profile.trace")}</T>
              <T w={400} s={13} lh={1.35} color={c.ink55}>{t("profile.traceSub")}</T>
            </View>
            <Toggle on={traceOn} onChange={setTrace} accessibilityLabel="trace-toggle" />
          </View>
        </Group>
      </View>
    </LargeTitleScreen>
  );
}
