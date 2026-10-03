/**
 * W3ctrl Tracker — the child app. Setup once, then three tabs:
 * Home (protected status), SOS (hold-to-alert), Settings (parent PIN gate).
 * ThemeProvider > LanguageProvider (persisted "w3ctrl_lang") >
 * NavigationContainer with a stack: Setup | QrScan | Main (bottom tabs).
 */
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { Home as HomeIcon, Settings as SettingsIcon, Siren } from "lucide-react-native";
import { LoadingView, ThemeProvider } from "@w3ctrl/ui";
import { LanguageProvider, useT } from "@w3ctrl/i18n";
import type { Lang } from "@w3ctrl/i18n";
import "./tracking"; // registers the background location task at module scope
import { loadConfig } from "./config";
import SetupScreen from "./screens/SetupScreen";
import QrScanScreen from "./screens/QrScanScreen";
import HomeScreen from "./screens/HomeScreen";
import SosScreen from "./screens/SosScreen";
import SettingsScreen from "./screens/SettingsScreen";

export type RootStackParamList = {
  Setup: { scanned?: { server: string; deviceId: string } } | undefined;
  QrScan: undefined;
  Main: undefined;
};

export type TabParamList = {
  Home: undefined;
  SOS: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const LANG_KEY = "w3ctrl_lang";

function MainTabs() {
  const t = useT();
  const icon =
    (Icon: React.ComponentType<{ color: string; size: number }>) =>
    ({ color, size }: { color: string; size: number }) => (
      <Icon color={color} size={size} />
    );
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#ff9900",
        tabBarInactiveTintColor: "#a7a7b0",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e8e8ed",
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: t("Home"), tabBarIcon: icon(HomeIcon) }}
      />
      <Tab.Screen
        name="SOS"
        component={SosScreen}
        options={{ title: t("SOS"), tabBarIcon: icon(Siren) }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t("Settings"), tabBarIcon: icon(SettingsIcon) }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [boot, setBoot] = useState<{
    route: "Setup" | "Main";
    lang: Lang;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const [cfg, stored] = await Promise.all([
        loadConfig(),
        AsyncStorage.getItem(LANG_KEY).catch(() => null),
      ]);
      setBoot({
        route: cfg.done && cfg.deviceId ? "Main" : "Setup",
        lang: stored === "hi" ? "hi" : "en",
      });
    })();
  }, []);

  if (!boot) {
    return (
      <ThemeProvider>
        <LoadingView text="W3ctrl Tracker" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <LanguageProvider
        initial={boot.lang}
        onChange={(l) => {
          AsyncStorage.setItem(LANG_KEY, l).catch(() => {});
        }}
      >
        <StatusBar style="dark" />
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName={boot.route}
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Setup" component={SetupScreen} />
            <Stack.Screen name="QrScan" component={QrScanScreen} />
            <Stack.Screen name="Main" component={MainTabs} />
          </Stack.Navigator>
        </NavigationContainer>
      </LanguageProvider>
    </ThemeProvider>
  );
}
