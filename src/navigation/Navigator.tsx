import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DarkTheme, DefaultTheme, NavigationContainer, type RouteProp, useRoute } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { type ComponentType, type ReactElement, useMemo } from "react";
import type { AppCtx } from "../ctx";
import { BenefitsScreen } from "../host/screens/benefits";
import { HomeScreen } from "../host/screens/home";
import { ProfileScreen } from "../host/screens/profile";
import { BalanceScreen, CardScreen, DemoPanelScreen, KycFormSheet, MovementSheet, OnboardingSheet, BeneficiaryFormSheet, SendSheet } from "../relayer/screens";
import { TabBar } from "../ui/TabBar";
import { useTheme } from "../ui/ThemeProvider";
import { useAppCtx } from "./context";
import { flushPending, navigationRef } from "./ref";
import type { BenefitsStackParamList, HomeStackParamList, ProfileStackParamList, RootParamList, TabParamList } from "./routes";

const Root = createNativeStackNavigator<RootParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const BenefitsStack = createNativeStackNavigator<BenefitsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

/** Registra una pantalla como ruta: recibe el ctx (y los params de la ruta) como props. */
function withCtx<P extends object = object>(Component: ComponentType<AppCtx & P>, name: string): () => ReactElement {
  const Wrapped = () => {
    const ctx = useAppCtx();
    const route = useRoute<RouteProp<Record<string, object | undefined>, string>>();
    return <Component {...ctx} {...({ params: route.params ?? {} } as unknown as P)} />;
  };
  Wrapped.displayName = `Ctx(${name})`;
  return Wrapped;
}

const Home = withCtx(HomeScreen, "home");
const Benefits = withCtx(BenefitsScreen, "benefits");
const Profile = withCtx(ProfileScreen, "profile");
const Balance = withCtx(BalanceScreen, "balance");
const Card = withCtx(CardScreen, "card");
const DemoPanel = withCtx(DemoPanelScreen, "demoPanel");
const Onboarding = withCtx(OnboardingSheet, "onboarding");
const KycForm = withCtx(KycFormSheet, "kycForm");
const Send = withCtx(SendSheet, "send");
const Beneficiary = withCtx(BeneficiaryFormSheet, "beneficiary");
const Movement = withCtx(MovementSheet, "movement");

/** Sin cabecera nativa (cada pantalla dibuja la suya), push de iOS con su gesto; fondo de la paleta para no ver blanco en dark. */
function useStackOptions(): NativeStackNavigationOptions {
  const { c } = useTheme();
  return useMemo(() => ({ headerShown: false, gestureEnabled: true, animation: "default", contentStyle: { backgroundColor: c.page } }), [c]);
}

function HomeTab() {
  const o = useStackOptions();
  return <HomeStack.Navigator screenOptions={o}><HomeStack.Screen name="home" component={Home} /></HomeStack.Navigator>;
}
function BenefitsTab() {
  const o = useStackOptions();
  return (
    <BenefitsStack.Navigator screenOptions={o}>
      <BenefitsStack.Screen name="benefits" component={Benefits} />
      <BenefitsStack.Screen name="balance" component={Balance} />
      <BenefitsStack.Screen name="card" component={Card} />
      <BenefitsStack.Screen name="demoPanel" component={DemoPanel} />
    </BenefitsStack.Navigator>
  );
}
function ProfileTab() {
  const o = useStackOptions();
  return <ProfileStack.Navigator screenOptions={o}><ProfileStack.Screen name="profile" component={Profile} /></ProfileStack.Navigator>;
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
  // Hojas del diseño: pageSheet de iOS (la app de atrás se encoge y se oscurece) y una hoja media para el detalle.
  const page: NativeStackNavigationOptions = { presentation: "pageSheet", animation: "slide_from_bottom" };
  return (
    <NavigationContainer ref={navigationRef} onReady={flushPending} theme={theme}>
      <Root.Navigator screenOptions={o}>
        <Root.Screen name="Tabs" component={TabsNav} />
        <Root.Screen name="onboarding" component={Onboarding} options={page} />
        <Root.Screen name="kycForm" component={KycForm} options={page} />
        <Root.Screen name="send" component={Send} options={page} />
        <Root.Screen name="beneficiary" component={Beneficiary} options={page} />
        <Root.Screen name="movement" component={Movement}
          options={{ presentation: "formSheet", sheetAllowedDetents: "fitToContents", sheetGrabberVisible: true, sheetCornerRadius: 12, contentStyle: { backgroundColor: c.page } }} />
      </Root.Navigator>
    </NavigationContainer>
  );
}
