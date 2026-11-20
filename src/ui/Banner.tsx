import { BlurView } from "expo-blur";
import { useEffect, useRef } from "react";
import { Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Isotype } from "./kit";
import { T } from "./primitives";
import { useTheme } from "./ThemeProvider";

export type BannerContent = { title: string; body: string; movementId: string };

/** Notificación en la app (diseño): cae desde arriba con rebote, cristal sobre la tarjeta, isotipo de Recibo. */
export function Banner({ content, onPress }: { content: BannerContent | null; onPress: (c: BannerContent) => void }) {
  const { c, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(-160)).current;
  const o = useRef(new Animated.Value(0)).current;
  const last = useRef<BannerContent | null>(content);
  if (content) last.current = content;
  useEffect(() => {
    const on = content !== null;
    Animated.parallel([
      Animated.spring(y, { toValue: on ? 0 : -160, useNativeDriver: true, damping: 14, stiffness: 140, mass: 0.9 }),
      Animated.timing(o, { toValue: on ? 1 : 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [content, y, o]);
  const shown = last.current;
  if (!shown) return null;
  return (
    <Animated.View pointerEvents={content ? "auto" : "none"}
      style={{ position: "absolute", top: insets.top + 2, left: 10, right: 10, zIndex: 40, opacity: o, transform: [{ translateY: y }],
        shadowColor: scheme === "dark" ? "#000" : "#0F1C14", shadowOpacity: scheme === "dark" ? 0.55 : 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 12 } }}>
      <Pressable onPress={() => onPress(shown)} accessibilityLabel="deposit-banner"
        style={{ borderRadius: 22, overflow: "hidden", flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
        <BlurView intensity={50} tint={scheme === "dark" ? "dark" : "light"} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.card, opacity: 0.78 }} />
        <Isotype box={38} glyph={19} radius={9} />
        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <T w={600} s={15} color={c.inkStrong} numberOfLines={1}>{shown.title}</T>
          {shown.body ? <T w={400} s={14} color={c.ink72} numberOfLines={1}>{shown.body}</T> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}
