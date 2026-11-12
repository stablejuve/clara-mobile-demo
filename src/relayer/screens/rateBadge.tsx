import { View } from "react-native";
import { useNow } from "../../hooks/useNow";
import type { LiveRate } from "../../hooks/useRate";
import { t } from "../../i18n/es";
import { Ico } from "../../ui/kit";
import { T } from "../../ui/primitives";
import { RADIUS } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";

/** Indicador del tipo de cambio en vivo: «1 USD = $17.2734 MXN ▲ · hace 4 s». */
export function RateBadge({ live }: { live: LiveRate }) {
  const { c } = useTheme();
  const now = useNow(1000);
  const ago = Math.max(0, Math.round((now - live.updatedAt) / 1000));
  const tone = live.dir === "up" ? c.settled : live.dir === "down" ? c.error : c.ink55;
  return (
    <View accessibilityLabel="send-rate" style={{ height: 30, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 7, borderRadius: RADIUS.pill, backgroundColor: c.ink08 }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.settled }} />
      <T w={500} s={12.5} mono color={c.ink72}>{t("rc.rate.live", { rate: live.rate.toFixed(4) })}</T>
      {live.dir ? <Ico name="arrowUpRight" size={12} color={tone} sw={2.4} style={live.dir === "down" ? { transform: [{ rotate: "90deg" }] } : undefined} /> : null}
      <T w={400} s={12} color={c.ink40}>{t("rc.rate.ago", { s: ago })}</T>
    </View>
  );
}
