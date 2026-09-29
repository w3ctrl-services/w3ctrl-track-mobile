/**
 * W3ctrl Tracker — the child app. Setup once, then one big screen.
 * ThemeProvider > LanguageProvider (persisted "w3ctrl_lang") >
 * NavigationContainer with a single stack: Setup | Main | Pin.
 */
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { LoadingView, ThemeProvider } from "@w3ctrl/ui";
import { LanguageProvider } from "@w3ctrl/i18n";
import type { Lang } from "@w3ctrl/i18n";
import "./tracking"; // registers the background location task at module scope
import { loadConfig } from "./config";
import SetupScreen from "./screens/SetupScreen";
import MainScreen from "./screens/MainScreen";
import PinScreen from "./screens/PinScreen";

export type RootStackParamList = {
  Setup: undefined;
  Main: undefined;
  Pin: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const LANG_KEY = "w3ctrl_lang";

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
        <StatusBar style="auto" />
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName={boot.route}
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Setup" component={SetupScreen} />
            <Stack.Screen name="Main" component={MainScreen} />
            <Stack.Screen name="Pin" component={PinScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </LanguageProvider>
    </ThemeProvider>
  );
}
