import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { useMemo } from "react";
import { BenefitsScreen } from "../host/screens/benefits";
import { HomeScreen } from "../host/screens/home";
import { ProfileScreen } from "../host/screens/profile";
import { MODULE_COMPONENTS, MODULE_HEADER_RIGHT } from "../relayer/screens";
import { withPage } from "../ui/Page";
import { TabBar } from "../ui/TabBar";
import { useTheme } from "../ui/ThemeProvider";
import { flushPending, navigationRef } from "./ref";
import type { BenefitsStackParamList, HomeStackParamList, ProfileStackParamList, RootParamList, TabParamList } from "./routes";
import { MODULE_SCREENS } from "./screens";

const Root = createNativeStackNavigator<RootParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const BenefitsStack = createNativeStackNavigator<BenefitsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const Home = withPage("home", HomeScreen);
const Benefits = withPage("benefits", BenefitsScreen);
const Profile = withPage("profile", ProfileScreen);
const MODULE_PAGES = MODULE_SCREENS.map((s) => [s, withPage(s, MODULE_COMPONENTS[s], { headerRight: MODULE_HEADER_RIGHT[s] })] as const);

/** Cabecera propia y gesto estándar de iOS; fondo de la paleta para que no haya flash blanco en dark. */
function useStackOptions(): NativeStackNavigationOptions {
  const { c } = useTheme();
  return useMemo(() => ({ headerShown: false, gestureEnabled: true, fullScreenGestureEnabled: false, animation: "default", contentStyle: { backgroundColor: c.page } }), [c]);
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
      {MODULE_PAGES.map(([name, component]) => <BenefitsStack.Screen key={name} name={name} component={component} />)}
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
  return (
    <NavigationContainer ref={navigationRef} onReady={flushPending} theme={theme}>
      <Root.Navigator screenOptions={o}>
        <Root.Screen name="Tabs" component={TabsNav} />
      </Root.Navigator>
    </NavigationContainer>
  );
}
