import { useNavigation } from "@react-navigation/native";
import { useEffect, useRef, type ReactElement, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { devFlags } from "../dev/flags";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { AppCtx } from "../ctx";
import { useAppCtx } from "../navigation/context";
import { CAN_BACK, headerFor, ROOT_OF, type Screen, SHOW_TABS } from "../store";
import { Icon, T, Touch } from "./primitives";
import { tabBarHeight } from "./tabBarLayout";
import { RADIUS } from "./theme";
import { useTheme } from "./ThemeProvider";

/** Una página de react-navigation: cabecera propia (viaja con el gesto), fondo opaco, scroll. */
export function Page({ screen, children, headerRight }: { screen: Screen; children: ReactNode; headerRight?: ReactNode }) {
  const { c } = useTheme();
  const { back } = useAppCtx();
  const navigation = useNavigation();
  const [title, sub] = headerFor(screen);
  const isRoot = ROOT_OF[screen] === screen;
  const canBack = CAN_BACK.includes(screen) && navigation.canGoBack();
  const showTabs = SHOW_TABS.includes(screen);
  return (
    <View style={{ flex: 1, backgroundColor: c.page }}>
      <SafeAreaView style={{ flex: 1 }} edges={showTabs ? ["top"] : ["top", "bottom"]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 10, paddingHorizontal: 18, paddingBottom: 12, backgroundColor: c.page }}>
          {canBack ? (
            <Touch onPress={back} accessibilityLabel="back" style={{ width: 38, height: 38, borderRadius: RADIUS.control, borderWidth: 1, borderColor: c.ink15, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}>
              <Icon name="back" size={17} />
            </Touch>
          ) : null}
          <View style={{ flex: 1, minWidth: 0 }}>
            <T w={600} s={isRoot ? 24 : 20} lh={1.1} ls={-0.02} numberOfLines={1}>{title}</T>
            {sub ? <T w={500} s={10.5} lh={1.2} ls={0.08} mono color={c.ink55} numberOfLines={1} style={{ marginTop: 4 }}>{sub.toUpperCase()}</T> : null}
          </View>
          {headerRight}
        </View>
        <PageScroll screen={screen}>{children}</PageScroll>
      </SafeAreaView>
    </View>
  );
}

export function PageScroll({ screen, children }: { screen: Screen; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const showTabs = SHOW_TABS.includes(screen);
  const ref = useRef<ScrollView>(null);
  // Solo desarrollo: el deep link `demo/open/<screen>?scrollEnd=1` pide ver el final de la página (capturas).
  useEffect(() => {
    if (!__DEV__ || !devFlags.scrollEndOnMount) return;
    devFlags.scrollEndOnMount = false;
    const id = setTimeout(() => ref.current?.scrollToEnd({ animated: false }), 600);
    return () => clearTimeout(id);
  }, []);
  return (
    <ScrollView
      ref={ref}
      style={{ flex: 1 }}
      // Las raíces reservan el hueco de la tab bar absoluta; las del módulo no lo necesitan.
      contentContainerStyle={{ flexGrow: 1, paddingBottom: showTabs ? tabBarHeight(insets.bottom) : 0 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      {children}
    </ScrollView>
  );
}

/** Registra una pantalla como ruta: recibe el ctx por contexto y lo pasa como props. */
export function withPage(screen: Screen, Component: (ctx: AppCtx) => ReactElement, opts?: { headerRight?: (ctx: AppCtx) => ReactNode }): () => ReactElement {
  const Wrapped = () => {
    const ctx = useAppCtx();
    return <Page screen={screen} headerRight={opts?.headerRight?.(ctx)}><Component {...ctx} /></Page>;
  };
  Wrapped.displayName = `Page(${screen})`;
  return Wrapped;
}
