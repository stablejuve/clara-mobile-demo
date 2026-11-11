import { InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold } from "@expo-google-fonts/instrument-sans";
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_700Bold } from "@expo-google-fonts/jetbrains-mono";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { T, Tag } from "./src/ui/primitives";
import { ThemeProvider, useTheme } from "./src/ui/ThemeProvider";

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 200 });

function Placeholder() {
  const { c, scheme } = useTheme();
  return (
    <>
      <StatusBar barStyle={scheme === "dark" ? "light-content" : "dark-content"} />
      <SafeAreaView style={{ flex: 1, backgroundColor: c.page }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 }}>
          <Tag>Acme Beneficios</Tag>
          <T w={600} s={28} lh={1.1} ls={-0.02}>Recibo</T>
          <T w={400} s={13} lh={1.4} color={c.ink72}>Cascarón vacío. El módulo llega en las siguientes tareas.</T>
        </View>
      </SafeAreaView>
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold,
    JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_700Bold,
  });
  useEffect(() => { if (fontsLoaded) void SplashScreen.hideAsync(); }, [fontsLoaded]);
  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider><Placeholder /></ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
