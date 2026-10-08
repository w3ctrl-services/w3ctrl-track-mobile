import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider } from "@w3ctrl/ui";
import { LanguageProvider, type Lang } from "@w3ctrl/i18n";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { RootNavigator } from "./navigation/RootNavigator";
import { navigationRef } from "./navigation/navRef";
import { useSmartAlerts } from "./hooks/useSmartAlerts";
import { usePushNotifications } from "./push/usePushNotifications";
import { registerSmartAlertTask } from "./smart-alert-task";

const LANG_KEY = "w3ctrl_lang";

// Foreground smart alerts show as banners while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Runs the foreground smart-alert engine once auth is ready. */
function SmartAlertEngine() {
  const { user, restoring } = useAuth();
  useSmartAlerts(!restoring && !!user);
  return null;
}

/** Registers the FCM push token and wires notification tap deep-links. */
function PushEngine() {
  const { user, restoring } = useAuth();
  usePushNotifications(!restoring && !!user);
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const [lang, setLang] = useState<Lang>("en");
  const [langReady, setLangReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY)
      .then((v) => {
        if (v === "hi" || v === "en") setLang(v);
      })
      .catch(() => {})
      .finally(() => setLangReady(true));
    // Register the ~15-minute background smart-alert check (OS-scheduled).
    void registerSmartAlertTask();
  }, []);

  function persistLang(l: Lang) {
    setLang(l);
    AsyncStorage.setItem(LANG_KEY, l).catch(() => {});
  }

  // Native splash stays up until the persisted language is loaded.
  if (!langReady) return null;

  return (
    <ThemeProvider>
      <LanguageProvider initial={lang} onChange={persistLang}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <NavigationContainer ref={navigationRef}>
              <StatusBar style="light" />
              <SmartAlertEngine />
              <PushEngine />
              <RootNavigator />
            </NavigationContainer>
          </AuthProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
