import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { Button, Field, Screen, Txt, useTheme } from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { TraccarError } from "@w3ctrl/api";
import { useAuth } from "../auth/AuthContext";

export default function LoginScreen() {
  const p = useTheme();
  const t = useT();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeMode, setCodeMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function attempt(withCode?: string) {
    setBusy(true);
    setError(null);
    try {
      await login(email, password, withCode);
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
        setError(t("Invalid email or password."));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "center" }}
      >
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: p.brand,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Txt variant="display" style={{ color: "#12100d", fontWeight: "800" }}>
              W
            </Txt>
          </View>
          <Txt variant="display">W3ctrl Track</Txt>
          <Txt
            variant="small"
            color={p.muted}
            style={{ marginTop: 6, textAlign: "center" }}
          >
            {t("Sign in to your W3ctrl Track account.")}
          </Txt>
        </View>

        {!codeMode ? (
          <>
            <Field
              label={t("Email")}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
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
              title={busy ? t("Signing in…") : t("Sign in")}
              onPress={() => attempt()}
              loading={busy}
              disabled={!email.trim() || !password}
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
      </KeyboardAvoidingView>
    </Screen>
  );
}
