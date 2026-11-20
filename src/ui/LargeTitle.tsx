import { useNavigation } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { type ReactNode, useRef } from "react";
import { Animated, Platform, Pressable, type StyleProp, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ico, Isotype, Wordmark } from "./kit";
import { T } from "./primitives";
import { F } from "./theme";
import { useTheme } from "./ThemeProvider";

/** Alto de la barra de navegación sin la zona de estado. */
export const NAV_H = 44;
/** Hueco inferior de las páginas con tab bar (`padding-bottom: 120px`). */
export const PAGE_BOTTOM = 120;
/** Radio superior del panel blanco de contenido. */
export const SHEET_RADIUS = 28;

/**
 * Página con cabecera crema y panel blanco de contenido (como la app de Betterfly), con título grande que, al hacer scroll, se colapsa en una barra translúcida con título centrado (iOS):
 * el fondo de la barra aparece en los primeros 12 px y el título pequeño entre 30 y 44 px.
 * `smallTitle` puede diferir del grande (Inicio: «Hola, Ana» → «Inicio»). `back` = etiqueta del botón «‹ Atrás».
 */
export function LargeTitleScreen({ title, smallTitle, back, brand, brandRight, header, right, titleGap = 18, children, contentStyle }: {
  title: string; smallTitle?: string; back?: string; /** Marca de la app arriba del título (sólo Inicio). */ brand?: string; /** Elemento a la derecha de la marca (nivel). */ brandRight?: ReactNode; /** Contenido que se queda en la cabecera crema, bajo el título (contadores de Inicio). */ header?: ReactNode; /** Elemento a la derecha de la barra de navegación. */ right?: ReactNode; titleGap?: number; children: ReactNode; contentStyle?: StyleProp<ViewStyle>;
}) {
  const { c, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const y = useRef(new Animated.Value(0)).current;
  const barH = insets.top + NAV_H;
  const bgO = y.interpolate({ inputRange: [0, 12], outputRange: [0, 1], extrapolate: "clamp" });
  const tO = y.interpolate({ inputRange: [30, 44], outputRange: [0, 1], extrapolate: "clamp" });
  return (
    <View style={{ flex: 1, backgroundColor: c.page }}>
      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[{ paddingTop: barH, flexGrow: 1 }, contentStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: true })}
      >
        {brand ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingBottom: 8 }}>
            <Isotype box={24} glyph={13} radius={6} />
            <View accessibilityLabel={brand}><Wordmark height={15} color={c.inkStrong} /></View>
            <View style={{ flex: 1 }} />
            {brandRight}
          </View>
        ) : null}
        <View style={{ paddingHorizontal: 20, paddingBottom: header ? 4 : 16 }}>
          <T s={46} lh={1} color={c.inkStrong} style={{ fontFamily: F.display }}>{title}</T>
        </View>
        {header ? <View style={{ paddingBottom: 18 }}>{header}</View> : null}
        {/* Panel blanco de contenido: esquinas redondeadas sobre la cabecera crema; el relleno inferior cubre el rebote del scroll. */}
        <View style={{ flexGrow: 1, backgroundColor: c.sheet, borderTopLeftRadius: SHEET_RADIUS, borderTopRightRadius: SHEET_RADIUS, paddingTop: Math.max(titleGap, 20), paddingBottom: PAGE_BOTTOM }}>
          {children}
          {/* Sólo en nativo: en web un hijo absoluto sí alarga el scroll y dejaba 900 px en blanco bajo el contenido. */}
          {Platform.OS === "web" ? null : <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: "100%", height: 900, backgroundColor: c.sheet }} />}
        </View>
      </Animated.ScrollView>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: barH, zIndex: 5 }} pointerEvents="box-none">
        <Animated.View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: bgO, borderBottomWidth: 0.5, borderBottomColor: c.ink15, overflow: "hidden" }}>
          <BlurView intensity={40} tint={scheme === "dark" ? "dark" : "light"} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.page, opacity: 0.82 }} />
        </Animated.View>
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: NAV_H, flexDirection: "row", alignItems: "center", paddingHorizontal: 8 }} pointerEvents="box-none">
          {back ? (
            <Pressable onPress={() => navigation.goBack()} accessibilityLabel="back" hitSlop={6}
              style={({ pressed }) => ({ height: NAV_H, flexDirection: "row", alignItems: "center", paddingRight: 8, opacity: pressed ? 0.5 : 1, zIndex: 2 })}>
              <Ico name="chevronLeft" size={26} color={c.brand} sw={2.2} />
              <T w={400} s={17} color={c.brand}>{back}</T>
            </Pressable>
          ) : null}
          {right ? <View style={{ position: "absolute", right: 12, zIndex: 2 }}>{right}</View> : null}
          <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, alignItems: "center", opacity: tO }}>
            <T w={600} s={17} color={c.inkStrong}>{smallTitle ?? title}</T>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}
