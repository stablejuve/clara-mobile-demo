import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Pressable, View } from "react-native";
import { type Key, t } from "../i18n/es";
import { useAppCtx } from "../navigation/context";
import { type TabName, TAB_ORDER, TAB_ROOT } from "../navigation/routes";
import type { HostScreen } from "../navigation/screens";
import { Ico, type IcoName } from "./kit";
import { T } from "./primitives";
import { TAB_ROW_H, TAB_ROW_TOP, tabBarHeight } from "./tabBarLayout";
import { useTheme } from "./ThemeProvider";

/** Pestañas de la anfitriona: etiqueta (clave i18n) e icono. */
export const TABS: Record<HostScreen, [Key, IcoName]> = { home: ["tab.home", "home"], benefits: ["tab.benefits", "gift"], profile: ["tab.profile", "user"] };

/** Tab bar iOS del diseño: translúcida, hairline arriba, icono 25 + etiqueta 10/500; activa en marca, inactiva ink-40. Siempre visible. */
export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { c, scheme } = useTheme();
  const { switchTab } = useAppCtx();
  const focusedTab = state.routes[state.index];
  const select = (name: TabName) => {
    const route = state.routes.find((r) => r.name === name)!;
    // tabPress siempre se emite: el listener de native-stack hace popToTop al re-tocar la pestaña enfocada.
    const e = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (route.key !== focusedTab.key && !e.defaultPrevented) switchTab(name);
  };
  return (
    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: tabBarHeight(insets.bottom), borderTopWidth: 0.5, borderTopColor: c.ink15, overflow: "hidden" }}>
      <BlurView intensity={40} tint={scheme === "dark" ? "dark" : "light"} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.page, opacity: 0.86 }} />
      <View style={{ flexDirection: "row", paddingTop: TAB_ROW_TOP, paddingHorizontal: 12 }}>
        {TAB_ORDER.map((name) => {
          const root = TAB_ROOT[name];
          const [labelKey, icon] = TABS[root];
          const fg = focusedTab.name === name ? c.brand : c.ink40;
          return (
            <Pressable key={name} onPress={() => select(name)} accessibilityLabel={`tab-${root}`} accessibilityRole="tab"
              style={{ flex: 1, height: TAB_ROW_H, alignItems: "center", justifyContent: "center", gap: 3 }}>
              <Ico name={icon} size={25} color={fg} sw={1.8} />
              <T w={500} s={10} color={fg}>{t(labelKey)}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
