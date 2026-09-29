/**
 * Auth state for the customer app. The Bearer token lives in SecureStore
 * (key "w3ctrl_token"); a cached copy of the user lives in AsyncStorage
 * (key "w3ctrl_user") for offline boot. The api package's token provider is
 * wired to SecureStore once, at startup and after every login.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import {
  loginWithToken,
  logout as apiLogout,
  session as apiSession,
  setTokenProvider,
  TraccarError,
  type TraccarUser,
} from "@w3ctrl/api";

const TOKEN_KEY = "w3ctrl_token";
const USER_KEY = "w3ctrl_user";

export interface AuthContextValue {
  user: TraccarUser | null;
  token: string | null;
  restoring: boolean;
  login: (email: string, password: string, code?: string) => Promise<TraccarUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (u: TraccarUser) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  restoring: true,
  login: async () => {
    throw new Error("AuthProvider not mounted");
  },
  logout: async () => {},
  refreshUser: async () => {},
  setUser: async () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<TraccarUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);

  const clearStored = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    await AsyncStorage.removeItem(USER_KEY).catch(() => {});
    setToken(null);
    setUserState(null);
  }, []);

  useEffect(() => {
    setTokenProvider(() => SecureStore.getItemAsync(TOKEN_KEY));
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!storedToken) return;
        setToken(storedToken);
        try {
          const me = await apiSession();
          if (me) {
            setUserState(me);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(me)).catch(() => {});
          } else {
            // 404 — nobody logged in, the stored token is dead.
            await clearStored();
          }
        } catch (e) {
          if (e instanceof TraccarError && (e.status === 401 || e.status === 403)) {
            await clearStored();
          } else {
            // Network error — boot with the cached user; queries will retry.
            const cached = await AsyncStorage.getItem(USER_KEY).catch(() => null);
            if (cached) {
              try {
                setUserState(JSON.parse(cached) as TraccarUser);
              } catch {
                /* corrupt cache — stay logged out */
              }
            }
          }
        }
      } finally {
        setRestoring(false);
      }
    })();
  }, [clearStored]);

  const login = useCallback(
    async (email: string, password: string, code?: string) => {
      const cleanCode = code?.trim();
      const { user: u, token: t } = await loginWithToken(
        email.trim(),
        password,
        cleanCode || undefined,
      );
      setTokenProvider(() => SecureStore.getItemAsync(TOKEN_KEY));
      await SecureStore.setItemAsync(TOKEN_KEY, t);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(u)).catch(() => {});
      setToken(t);
      setUserState(u);
      return u;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      /* server logout is best-effort */
    }
    await clearStored();
  }, [clearStored]);

  const refreshUser = useCallback(async () => {
    const me = await apiSession();
    if (me) {
      setUserState(me);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(me)).catch(() => {});
    }
  }, []);

  const setUser = useCallback(async (u: TraccarUser) => {
    setUserState(u);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(u)).catch(() => {});
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, restoring, refreshUser, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
