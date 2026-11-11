import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { type Key, t } from "../i18n/es";
import { useAppCtx } from "../navigation/context";
import { type TabName, TAB_ORDER, TAB_ROOT } from "../navigation/routes";
import { type HostScreen, ROOT_OF, type Screen, SHOW_TABS } from "../navigation/screens";
import { Icon, type IconName, T, Touch } from "./primitives";
import { ROW_BOTTOM, ROW_H, ROW_TOP, tabBarHeight } from "./tabBarLayout";
import { RADIUS } from "./theme";
import { useTheme } from "./ThemeProvider";

/** Pestañas de la anfitriona: etiqueta (clave i18n) e icono. */
export const TABS: Record<HostScreen, [Key, IconName]> = { home: ["tab.home", "home"], benefits: ["tab.benefits", "gift"], profile: ["tab.profile", "user"] };
const HIDE_MS = 220;

/** Tab bar custom (heredada): siempre montada, absoluta; se esconde deslizando en pantallas no raíz. */
export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { c } = useTheme();
  const { switchTab } = useAppCtx();
  const focusedTab = state.routes[state.index];
  const focusedScreen = (getFocusedRouteNameFromRoute(focusedTab) ?? TAB_ROOT[focusedTab.name as TabName]) as Screen;
  const visible = SHOW_TABS.includes(focusedScreen);
  const height = tabBarHeight(insets.bottom);
  const ty = useSharedValue(visible ? 0 : height);
  useEffect(() => { ty.value = withTiming(visible ? 0 : height, { duration: HIDE_MS }); }, [visible, height, ty]);
  const barStyle = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));

  const select = (name: TabName) => {
    const route = state.routes.find((r) => r.name === name)!;
    // tabPress siempre se emite: el listener de native-stack hace popToTop al re-tocar la pestaña enfocada.
    const e = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (route.key !== focusedTab.key && !e.defaultPrevented) switchTab(name);
  };

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[{ position: "absolute", left: 0, right: 0, bottom: 0, height, paddingTop: ROW_TOP, paddingBottom: insets.bottom + ROW_BOTTOM, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: c.ink08, backgroundColor: c.page }, barStyle]}
    >
      <View style={{ flexDirection: "row", height: ROW_H, gap: 4 }}>
        {TAB_ORDER.map((name) => {
          const root = TAB_ROOT[name] as HostScreen;
          const [labelKey, icon] = TABS[root];
          const on = ROOT_OF[focusedScreen] === root;
          const fg = on ? c.brand : c.ink55;
          return (
            <Touch key={name} onPress={() => select(name)} accessibilityLabel={`tab-${root}`}
              style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 5, borderRadius: RADIUS.control, backgroundColor: on ? c.sub : "transparent" }}>
              <Icon name={icon} size={19} color={fg} />
              <T w={500} s={10.5} lh={1} ls={0.06} mono color={fg}>{t(labelKey).toUpperCase()}</T>
            </Touch>
          );
        })}
      </View>
    </Animated.View>
  );
}
