import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { AppHeader, Button, Field, Txt, useTheme } from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { TraccarError } from "@w3ctrl/api";
import { useAuth } from "../auth/AuthContext";
import BrandMark from "../components/BrandMark";

export default function LoginScreen() {
  const p = useTheme();
  const t = useT();
  const { login } = useAuth();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeMode, setCodeMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function attempt(withCode?: string) {
    setBusy(true);
    setError(null);
    try {
      await login(userId, password, withCode);
      // AuthProvider flips state → the navigator switches to Main.
    } catch (e) {
      if (e instanceof TraccarError && e.status === 401) {
        if (!withCode) {
          // Wrong credentials, or TOTP required (WWW-Authenticate: TOTP).
          // Either way, reveal the code field — the second attempt tells us.
          setCodeMode(true);
          setError(t("Two-factor code required."));
        } else {
          setError(t("Wrong authenticator code — try again."));
        }
      } else if (e instanceof TraccarError && e.status === 429) {
        setError(t("Too many attempts — please wait a minute and try again."));
      } else {
        setError(t("Invalid user ID or password."));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <AppHeader title="">
        <BrandMark />
      </AppHeader>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 32,
            flexGrow: 1,
            justifyContent: "center",
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ marginBottom: 18 }}>
            <Txt
              variant="small"
              color={p.brandInk}
              style={{ fontWeight: "700", letterSpacing: 1.5 }}
            >
              {t("Sign in").toUpperCase()}
            </Txt>
            <Txt variant="display" style={{ marginTop: 8, lineHeight: 34 }}>
              {t("Welcome back")}
            </Txt>
            <Txt variant="small" color={p.muted} style={{ marginTop: 8, lineHeight: 20 }}>
              {t(
                "Log in to see live locations, trips, geofences and alerts for every vehicle.",
              )}
            </Txt>
          </View>

          {!codeMode ? (
            <>
              <Field
                label={t("User ID")}
                value={userId}
                onChangeText={setUserId}
                placeholder="Your Traccar username"
                keyboardType="email-address"
              />
              <Field
                label={t("Password")}
                value={password}
                onChangeText={setPassword}
                secure
                placeholder="••••••••"
              />
              {error ? (
                <Txt variant="small" color={p.alert} style={{ marginBottom: 12 }}>
                  {error}
                </Txt>
              ) : null}
              <Button
                title={busy ? t("Signing in…") : t("Login")}
                onPress={() => attempt()}
                loading={busy}
                disabled={!userId.trim() || !password}
              />
            </>
          ) : (
            <>
              <Field
                label={t("Authenticator code")}
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                keyboardType="numeric"
                hint={t("Enter the 6-digit code from your authenticator app.")}
              />
              {error ? (
                <Txt variant="small" color={p.alert} style={{ marginBottom: 12 }}>
                  {error}
                </Txt>
              ) : null}
              <Button
                title={t("Verify")}
                onPress={() => attempt(code)}
                loading={busy}
                disabled={code.length !== 6}
              />
              <Button
                kind="ghost"
                title={t("Back")}
                onPress={() => {
                  setCodeMode(false);
                  setCode("");
                  setError(null);
                }}
                style={{ marginTop: 8 }}
              />
            </>
          )}

          <Txt
            variant="small"
            color={p.muted}
            style={{ textAlign: "center", marginTop: 18, lineHeight: 20 }}
          >
            {t(
              "Using an authenticator app? You will be asked for your TOTP code right after you log in.",
            )}
          </Txt>
          <Txt
            variant="caption"
            color={p.muted}
            style={{ textAlign: "center", marginTop: 24, letterSpacing: 0.5 }}
          >
            Secured by Traccar · Made in India
          </Txt>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
