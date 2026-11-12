import { type ReactNode, useState } from "react";
import { Pressable, TextInput, type TextInputProps, View } from "react-native";
import { t } from "../i18n/es";
import { Group, Hairline, Ico } from "./kit";
import { T } from "./primitives";
import { useTheme } from "./ThemeProvider";

// Campos de las hojas de formulario (KYC y Nueva cuenta): etiqueta arriba, valor abajo, en grupos con filete.

export function Field({ label, value, onChange, placeholder, prefix, ...input }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; prefix?: string } & Omit<TextInputProps, "value" | "onChangeText" | "onChange">) {
  const { c } = useTheme();
  return (
    <View style={{ paddingVertical: 10, paddingHorizontal: 16, gap: 4 }}>
      <T w={400} s={13} color={c.ink55}>{label}</T>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {prefix ? <T w={500} s={16} mono color={c.ink55}>{prefix}</T> : null}
        <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={c.ink25} selectionColor={c.brand}
          style={{ flex: 1, padding: 0, fontFamily: "Archivo_500Medium", fontSize: 16, color: c.inkStrong, minHeight: 22 }} {...input} />
      </View>
    </View>
  );
}

export function Select<V extends string>({ label, value, options, labelOf, onChange }: { label: string; value: string; options: readonly V[]; labelOf: (v: V) => string; onChange: (v: V) => void }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable onPress={() => setOpen((o) => !o)} accessibilityLabel={`select-${label}`}
        style={({ pressed }) => ({ paddingVertical: 10, paddingHorizontal: 16, gap: 4, backgroundColor: pressed ? c.ink04 : "transparent" })}>
        <T w={400} s={13} color={c.ink55}>{label}</T>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <T w={500} s={16} color={value ? c.inkStrong : c.ink25} style={{ flex: 1 }}>{value ? labelOf(value as V) : t("kyc2.choose")}</T>
          <Ico name="chevronRight" size={18} color={c.ink25} sw={2} style={{ transform: [{ rotate: open ? "270deg" : "90deg" }] }} />
        </View>
      </Pressable>
      {open ? options.map((o) => (
        <Pressable key={o} onPress={() => { onChange(o); setOpen(false); }} accessibilityLabel={`option-${o}`}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", paddingVertical: 11, paddingLeft: 28, paddingRight: 16, backgroundColor: pressed ? c.ink08 : c.ink04 })}>
          <T w={o === value ? 600 : 400} s={15} color={c.inkStrong} style={{ flex: 1 }}>{labelOf(o)}</T>
          {o === value ? <Ico name="check" size={16} color={c.brand} sw={2.4} /> : null}
        </Pressable>
      )) : null}
    </View>
  );
}

export function Rows({ children }: { children: ReactNode[] }) {
  const items = children.filter(Boolean);
  return <Group>{items.map((ch, i) => <View key={i}>{i > 0 ? <Hairline /> : null}{ch}</View>)}</Group>;
}

