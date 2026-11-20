import { Archivo_400Regular, Archivo_500Medium, Archivo_600SemiBold, Archivo_700Bold, Archivo_800ExtraBold_Italic } from "@expo-google-fonts/archivo";
import { AlumniSans_700Bold } from "@expo-google-fonts/alumni-sans";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stage } from "./src/backoffice/Stage";
import { Shell } from "./src/Shell";
import { ThemeProvider } from "./src/ui/ThemeProvider";

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 200 });

/** Ancho mínimo de la ventana web para mostrar el back office junto al teléfono. */
const STAGE_MIN_WIDTH = 1000;

/** En el teléfono, sólo la app del empleado. En web ancha, la vista de demo: back office de la empresa + teléfono. */
function Root() {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width >= STAGE_MIN_WIDTH ? <Stage /> : <Shell />;
}

export default function App() {
  const [fontsLoaded] = useFonts({ Archivo_400Regular, Archivo_500Medium, Archivo_600SemiBold, Archivo_700Bold, Archivo_800ExtraBold_Italic, AlumniSans_700Bold });
  useEffect(() => { if (fontsLoaded) void SplashScreen.hideAsync(); }, [fontsLoaded]);
  if (!fontsLoaded) return null; // el splash nativo sigue en pantalla
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider><Root /></ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
