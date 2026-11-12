import { View } from "react-native";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import { t } from "../i18n/es";
import { CardFront } from "../ui/CardArt";
import { Ico, Press } from "../ui/kit";
import { T } from "../ui/primitives";
import { RADIUS, RL } from "../ui/theme";

const POINTS = ["promo.point.points", "promo.point.payroll", "promo.point.spei"] as const;

/** Anuncio del módulo (Inicio y Beneficios): superficie petróleo como la tarjeta, una Visa en miniatura inclinada y el CTA. */
export function PromoCard({ onPress, cta, accessibilityLabel }: { onPress: () => void; cta: string; accessibilityLabel: string }) {
  return (
    <View style={{ borderRadius: 16, overflow: "hidden", backgroundColor: RL.petrolDeep,
      shadowColor: "#00140F", shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 10 }}>
      <Svg width="100%" height="100%" style={{ position: "absolute" }}>
        <Defs>
          <LinearGradient id="promo" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#0A4A40" />
            <Stop offset="0.6" stopColor={RL.petrolDeep} />
            <Stop offset="1" stopColor="#00140F" />
          </LinearGradient>
          <RadialGradient id="promoLight" cx="0.1" cy="0" r="0.9">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.14" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#promo)" />
        <Rect width="100%" height="100%" fill="url(#promoLight)" />
      </Svg>
      {/* Visa en miniatura, inclinada y saliendo por la esquina */}
      <View pointerEvents="none" style={{ position: "absolute", right: -46, top: 40, transform: [{ rotate: "-14deg" }],
        shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } }}>
        <CardFront width={168} brand={t("rc.name")} mode="preview" last4="4821" />
      </View>
      <View style={{ padding: 20, gap: 16 }}>
        <View style={{ gap: 8, paddingRight: 128 }}>
          <T w={500} s={13} color={RL.cream} style={{ opacity: 0.7 }}>{t("rc.name")} · {t("promo.eyebrow")}</T>
          <T w={700} s={23} lh={1.15} ls={-0.02} color={RL.cream}>{t("promo.title")}</T>
        </View>
        <View style={{ gap: 9 }}>
          {POINTS.map((k) => (
            <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 20, height: 20, borderRadius: RADIUS.pill, backgroundColor: "rgba(244,239,224,0.14)", alignItems: "center", justifyContent: "center" }}>
                <Ico name="check" size={12} color={RL.cream} sw={2.8} />
              </View>
              <T w={500} s={14.5} color={RL.cream}>{t(k)}</T>
            </View>
          ))}
        </View>
        <Press onPress={onPress} accessibilityLabel={accessibilityLabel}
          style={{ height: 48, borderRadius: RADIUS.pill, backgroundColor: RL.cream, alignItems: "center", justifyContent: "center" }}>
          <T w={600} s={16} color={RL.petrolDeep}>{cta}</T>
        </Press>
      </View>
    </View>
  );
}
