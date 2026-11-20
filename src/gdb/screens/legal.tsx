import { View } from "react-native";
import { Eyebrow, Ico } from "../../ui/kit";
import { T } from "../../ui/primitives";
import { useTheme } from "../../ui/ThemeProvider";
import { tr } from "../copy";
import { LEGAL_HOSTED, LEGAL_PROVIDER, type LegalDoc, legalBy, legalPoints, legalTitle } from "../legal";
import { Notice, SheetFrame } from "../ui";

/** Un documento legal (términos, contrato de la tarjeta, términos de Bridge, privacidad). En la demo es un esquema de muestra:
 *  quién lo publica y qué cubre. Se abre desde la hoja de activación y desde Perfil. */
export function LegalSheet({ doc }: { doc: LegalDoc }) {
  const { c } = useTheme();
  return (
    <SheetFrame title={tr("legal.title")} console={false}>
      <View style={{ gap: 6 }}>
        <T w={500} s={13} color={c.ink55}>{tr(legalBy(doc))}</T>
        <T w={600} s={24} lh={1.15} ls={-0.01} color={c.inkStrong}>{tr(legalTitle(doc))}</T>
      </View>
      <View style={{ gap: 12 }}>
        <Eyebrow>{tr("legal.covers")}</Eyebrow>
        {legalPoints(doc).map((k) => (
          <View key={k} style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ paddingTop: 3 }}><Ico name="check" size={15} color={c.ink55} sw={2.4} /></View>
            <T w={400} s={16} lh={1.35} color={c.inkBody} style={{ flex: 1 }}>{tr(k)}</T>
          </View>
        ))}
      </View>
      {LEGAL_HOSTED[doc] ? <Notice tone="ok" text={tr("legal.hosted", { provider: LEGAL_PROVIDER[doc] })} /> : null}
      <T w={400} s={13} lh={1.4} color={c.ink40}>{tr("legal.demo", { provider: LEGAL_PROVIDER[doc] })}</T>
    </SheetFrame>
  );
}
