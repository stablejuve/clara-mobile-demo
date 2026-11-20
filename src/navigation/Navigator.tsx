import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DarkTheme, DefaultTheme, NavigationContainer, type RouteProp, useRoute } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { useMemo } from "react";
import { AccountScreen, ActivityScreen } from "../gdb/screens/account";
import { ActivateSheet } from "../gdb/screens/activate";
import { BeneficiarySheet } from "../gdb/screens/beneficiary";
import { CardScreen } from "../gdb/screens/card";
import { ConsoleSheet } from "../gdb/screens/console";
import { DetailSheet } from "../gdb/screens/detail";
import { KycFormSheet } from "../gdb/screens/kycForm";
import { LegalSheet } from "../gdb/screens/legal";
import { PaySheet } from "../gdb/screens/pay";
import { RailSheet } from "../gdb/screens/rail";
import { SendSheet } from "../gdb/screens/send";
import { BenefitsScreen } from "../host/screens/benefits";
import { HomeScreen } from "../host/screens/home";
import { ProfileScreen } from "../host/screens/profile";
import { TabBar } from "../ui/TabBar";
import { useTheme } from "../ui/ThemeProvider";
import { flushPending, navigationRef } from "./ref";
import type { BenefitsStackParamList, HomeStackParamList, ProfileStackParamList, RootParamList, TabParamList } from "./routes";

// Navegación de Global Dollar Benefits dentro de Betterfly: tres pestañas, la cuenta y la tarjeta bajo Beneficios, y hojas
// modales para activar, pagar, convertir/retirar, el detalle y la consola de demo. El admin de empresa no está en la app:
// es el back office de la vista web (`src/backoffice`).
// Las pantallas leen el store (`useGdb`) directamente; no reciben props.

const Root = createNativeStackNavigator<RootParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const BenefitsStack = createNativeStackNavigator<BenefitsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function Detail() {
  const route = useRoute<RouteProp<RootParamList, "movement">>();
  return <DetailSheet id={route.params.id} />;
}

function KycForm() {
  const route = useRoute<RouteProp<RootParamList, "kycForm">>();
  return <KycFormSheet section={route.params.section} />;
}
function Legal() {
  const route = useRoute<RouteProp<RootParamList, "legal">>();
  return <LegalSheet doc={route.params.doc} />;
}
function Rail() {
  const route = useRoute<RouteProp<RootParamList, "rail">>();
  return <RailSheet id={route.params.id} />;
}

/** Sin cabecera nativa (cada pantalla dibuja la suya), push de iOS con su gesto; fondo de la paleta para no ver blanco en dark. */
function useStackOptions(): NativeStackNavigationOptions {
  const { c } = useTheme();
  return useMemo(() => ({ headerShown: false, gestureEnabled: true, animation: "default", contentStyle: { backgroundColor: c.page } }), [c]);
}

function HomeTab() {
  const o = useStackOptions();
  return <HomeStack.Navigator screenOptions={o}><HomeStack.Screen name="home" component={HomeScreen} /></HomeStack.Navigator>;
}
function BenefitsTab() {
  const o = useStackOptions();
  return (
    <BenefitsStack.Navigator screenOptions={o}>
      <BenefitsStack.Screen name="benefits" component={BenefitsScreen} />
      <BenefitsStack.Screen name="balance" component={AccountScreen} />
      <BenefitsStack.Screen name="card" component={CardScreen} />
      <BenefitsStack.Screen name="activity" component={ActivityScreen} />
    </BenefitsStack.Navigator>
  );
}
function ProfileTab() {
  const o = useStackOptions();
  return <ProfileStack.Navigator screenOptions={o}><ProfileStack.Screen name="profile" component={ProfileScreen} /></ProfileStack.Navigator>;
}

function TabsNav() {
  const { c } = useTheme();
  return (
    // backBehavior="none": el default v7 (`firstRoute`) deja `canGoBack()` en true en las pestañas que no son la primera.
    <Tabs.Navigator initialRouteName="HomeTab" backBehavior="none" tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, animation: "none", sceneStyle: { backgroundColor: c.page } }}>
      <Tabs.Screen name="HomeTab" component={HomeTab} />
      <Tabs.Screen name="BenefitsTab" component={BenefitsTab} />
      <Tabs.Screen name="ProfileTab" component={ProfileTab} />
    </Tabs.Navigator>
  );
}

export function Navigator() {
  const { c, scheme } = useTheme();
  const o = useStackOptions();
  const theme = useMemo(() => { const base = scheme === "dark" ? DarkTheme : DefaultTheme; return { ...base, colors: { ...base.colors, background: c.page, card: c.card, text: c.inkStrong, border: c.ink08, primary: c.brand } }; }, [c, scheme]);
  // Hojas: pageSheet de iOS para los flujos y la consola (se apila sobre otra hoja), y hoja ajustada al contenido para el detalle.
  const page: NativeStackNavigationOptions = { presentation: "pageSheet", animation: "slide_from_bottom", contentStyle: { backgroundColor: c.sheet } };
  return (
    <NavigationContainer ref={navigationRef} onReady={flushPending} theme={theme}>
      <Root.Navigator screenOptions={o}>
        <Root.Screen name="Tabs" component={TabsNav} />
        <Root.Screen name="onboarding" component={ActivateSheet} options={page} />
        <Root.Screen name="pay" component={PaySheet} options={page} />
        <Root.Screen name="send" component={SendSheet} options={page} />
        <Root.Screen name="movement" component={Detail}
          options={{ presentation: "formSheet", sheetAllowedDetents: "fitToContents", sheetGrabberVisible: true, sheetCornerRadius: 16, contentStyle: { backgroundColor: c.sheet } }} />
        <Root.Screen name="console" component={ConsoleSheet} options={page} />
        <Root.Screen name="rail" component={Rail} options={page} />
        <Root.Screen name="legal" component={Legal} options={page} />
        <Root.Screen name="kycForm" component={KycForm} options={page} />
        <Root.Screen name="beneficiary" component={BeneficiarySheet} options={page} />
      </Root.Navigator>
    </NavigationContainer>
  );
}
