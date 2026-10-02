import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { AppHeader, Button, Field, Txt, useTheme } from "@w3ctrl/ui";
import { useLang, useT, type Lang } from "@w3ctrl/i18n";
import { TraccarError } from "@w3ctrl/api";
import { useAuth } from "../auth/AuthContext";

/** Orange W brand mark for the black header. */
function BrandMark() {
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#ff9900",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#12100d", fontWeight: "800", fontSize: 22 }}>W</Text>
    </View>
  );
}

/**
 * EN/हिं toggle for the login header. Uses the same language-switch logic as
 * the rest of the app (useLang().setLang — persisted by App.tsx).
 */
function LangToggle() {
  const { lang, setLang } = useLang();
  const opts: { value: Lang; label: string }[] = [
    { value: "en", label: "EN" },
    { value: "hi", label: "हिं" },
  ];
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "rgba(255,255,255,0.12)",
        borderRadius: 999,
        padding: 3,
      }}
    >
      {opts.map((o) => {
        const active = lang === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => setLang(o.value)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: active ? "#ffffff" : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: active ? "#101014" : "#b9b9c2",
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

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
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <AppHeader title="">
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <BrandMark />
            <View>
              <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "700" }}>
                W3ctrl Track
              </Text>
              <Text
                style={{
                  color: "#b9b9c2",
                  fontSize: 11,
                  letterSpacing: 1.5,
                  marginTop: 2,
                }}
              >
                GPS VEHICLE SECURITY
              </Text>
            </View>
          </View>
          <LangToggle />
        </View>
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
              {"नमस्ते,\ntrack your fleet."}
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
                label={t("Phone or email")}
                value={email}
                onChangeText={setEmail}
                placeholder="+91 98765 43210"
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
