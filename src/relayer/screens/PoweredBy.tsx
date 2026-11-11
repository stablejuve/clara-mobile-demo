import { useAppCtx } from "../../navigation/context";
import { t } from "../../i18n/es";
import { Dot, Tag, Touch } from "../../ui/primitives";
import { RL } from "../../ui/theme";

/** Pie «powered by Relayer» (D4). Toque largo de 5 s → panel de demo (spec «Capa mock»). */
export function PoweredBy({ center }: { center?: boolean }) {
  const { nav } = useAppCtx();
  return (
    <Touch onLongPress={() => nav("demoPanel")} delayLongPress={5000} accessibilityLabel="powered-by-relayer"
      style={{ flexDirection: "row", alignItems: "center", justifyContent: center ? "center" : "flex-start", gap: 8, paddingVertical: 10 }}>
      <Dot color={RL.turq} size={7} />
      <Tag>{t("common.poweredBy")}</Tag>
    </Touch>
  );
}
