import type { ReactNode } from "react";
import { type StyleProp, Text, type TextStyle } from "react-native";
import { textStyle } from "./theme";
import { useTheme } from "./ThemeProvider";

// Texto: w=peso, s=tamaño, lh=ratio, ls=em; mono (la del sistema). Sin color: inkStrong de la paleta.
export type TProps = {
  w?: number; s?: number; lh?: number; ls?: number; mono?: boolean; color?: string;
  style?: StyleProp<TextStyle>; numberOfLines?: number; children?: ReactNode; accessibilityLabel?: string; selectable?: boolean;
};

export function T({ w = 400, s = 14, lh, ls, mono, color, style, numberOfLines, accessibilityLabel, selectable, children }: TProps) {
  const { c } = useTheme();
  return (
    <Text numberOfLines={numberOfLines} accessibilityLabel={accessibilityLabel} selectable={selectable} style={[textStyle(w, s, { lh, ls, mono, color: color ?? c.inkStrong }), style]}>
      {children}
    </Text>
  );
}
