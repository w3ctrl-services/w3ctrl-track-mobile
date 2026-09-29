import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider } from "@w3ctrl/ui";
import { LanguageProvider, type Lang } from "@w3ctrl/i18n";
import { AuthProvider } from "./auth/AuthContext";
import { RootNavigator } from "./navigation/RootNavigator";

const LANG_KEY = "w3ctrl_lang";

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
            <NavigationContainer>
              <StatusBar style="auto" />
              <RootNavigator />
            </NavigationContainer>
          </AuthProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
