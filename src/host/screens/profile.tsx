import { View } from "react-native";
import { tr } from "../../gdb/copy";
import { LEGAL_DOCS, legalBy, legalTitle } from "../../gdb/legal";
import { DEMO, gdb, useGdb } from "../../gdb/store";
import { nav, openConsole } from "../../gdb/ui";
import { Eyebrow, Group, Hairline, ListRow, Toggle } from "../../ui/kit";
import { LargeTitleScreen } from "../../ui/LargeTitle";
import { T } from "../../ui/primitives";
import { BF, RADIUS } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";

/** Perfil: quién eres, idioma y apariencia, términos y privacidad, y la consola de demo. El admin de empresa vive en el back office web, no aquí. */
export function ProfileScreen() {
  const { c, scheme, setOverride } = useTheme();
  const { s, flags } = useGdb();
  const accepted = s.invitation.status === "accepted";
  return (
    <LargeTitleScreen title={tr("tab.profile")}>
      <View style={{ paddingHorizontal: 16, gap: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 4 }}>
          <View style={{ width: 56, height: 56, borderRadius: RADIUS.pill, backgroundColor: BF.mint, alignItems: "center", justifyContent: "center" }}>
            <T w={700} s={19} color={BF.ink}>{DEMO.initials}</T>
          </View>
          <View style={{ gap: 2 }}>
            <T w={600} s={19} color={c.inkStrong}>{DEMO.employee}</T>
            <T w={400} s={15} color={c.ink55}>{DEMO.employer}</T>
          </View>
        </View>
        <Group>
          <ListRow title={tr("profile.language")} value={flags.lang === "en" ? "English" : "Español"} chevron onPress={() => gdb.setLang(flags.lang === "en" ? "es" : "en")} accessibilityLabel="profile-language" />
          <Hairline />
          <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 16, minHeight: 52 }}>
            <T w={500} s={16} color={c.inkStrong} style={{ flex: 1 }}>{tr("profile.dark")}</T>
            <Toggle on={scheme === "dark"} onChange={(v) => setOverride(v ? "dark" : "light")} accessibilityLabel="profile-dark" />
          </View>
        </Group>
        {/* Términos y privacidad: siempre consultables; «Aceptado» cuando el empleado ya dio su consentimiento. */}
        {s.invitation.status === "none" ? null : (
          <View style={{ gap: 8 }}>
            <Eyebrow style={{ paddingHorizontal: 4 }}>{tr("profile.legal")}</Eyebrow>
            <Group>
              {LEGAL_DOCS.map((d, n) => (
                <View key={d}>
                  {n > 0 ? <Hairline /> : null}
                  <ListRow title={tr(legalTitle(d))} sub={tr(legalBy(d))} value={accepted ? tr("legal.accepted") : undefined} chevron onPress={() => nav("legal", { doc: d })} accessibilityLabel={`profile-doc-${d}`} py={12} />
                </View>
              ))}
            </Group>
          </View>
        )}
        <Group>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 16, minHeight: 52 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T w={500} s={16} color={c.inkStrong}>{tr("trace.toggle")}</T>
              <T w={400} s={13} color={c.ink55}>{tr("trace.toggleSub")}</T>
            </View>
            <Toggle on={flags.explain} onChange={(v) => gdb.setExplain(v)} accessibilityLabel="profile-explain" />
          </View>
          <Hairline />
          <ListRow title={tr("profile.console")} chevron onPress={openConsole} accessibilityLabel="profile-console" />
        </Group>
        <T w={400} s={13} color={c.ink40} style={{ textAlign: "center" }}>{tr("profile.footer")}</T>
      </View>
    </LargeTitleScreen>
  );
}
