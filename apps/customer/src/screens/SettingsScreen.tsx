import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { BellRing, ChevronRight, Key, KeyRound, LogOut, ShieldCheck } from "lucide-react-native";
import {
  AdSlider,
  AppHeader,
  Badge,
  Button,
  Card,
  Divider,
  Field,
  Rise,
  Row,
  Segmented,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { login, mintToken, TraccarError, type TraccarUser } from "@w3ctrl/api";
import { useAuth } from "../auth/AuthContext";
import { authedFetch } from "../api/client";
import { generateTotpSecret, useUpdateUser } from "../api/hooks";
import { formatDate } from "../utils/format";
import BrandMark from "../components/BrandMark";
import type { RootNav } from "../navigation/types";
import { pushStatus } from "../push/push";

type Attrs = Record<string, unknown>;

/** Small badge showing whether push is ready on this phone. */
function PushBadge() {
  const t = useT();
  const [ready, setReady] = useState<boolean | null>(null);
  useEffect(() => {
    pushStatus()
      .then((s) => setReady(s.permission && s.token))
      .catch(() => setReady(false));
  }, []);
  if (ready === null) return null;
  return <Badge text={ready ? t("On") : t("Off")} tone={ready ? "ok" : "neutral"} />;
}

function attrsOf(user: TraccarUser | null): Attrs {
  return (user?.attributes ?? {}) as Attrs;
}

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function planLabel(plan: string, t: (k: string) => string): string {
  if (plan === "plus") return t("Plus");
  if (plan === "fleet") return t("Fleet");
  return t("Basic");
}

function planPrice(plan: string): string {
  if (plan === "plus") return "₹499 / year";
  if (plan === "fleet") return "₹149 / device / year";
  return "₹299 / year";
}

function Kicker({ children }: { children: string }) {
  const p = useTheme();
  return (
    <Txt
      variant="caption"
      color={p.muted}
      style={{
        marginTop: 20,
        marginBottom: 10,
        marginLeft: 4,
        textTransform: "uppercase",
        letterSpacing: 1,
        fontWeight: "600",
      }}
    >
      {children}
    </Txt>
  );
}

/* ------------------------------------------------------- TOTP section */

function TotpBody() {
  const p = useTheme();
  const t = useT();
  const { user, refreshUser } = useAuth();
  const updateUser = useUpdateUser();
  const [password, setPassword] = useState("");
  const [key, setKey] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabled = !!user?.totpKey;

  async function fullUser(): Promise<TraccarUser> {
    return authedFetch<TraccarUser>(`/users/${user!.id}`);
  }

  async function generate() {
    if (!password) {
      setError(t("Please enter your current password."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const secret = await generateTotpSecret();
      if (!secret) throw new Error("empty secret");
      setKey(secret);
    } catch {
      setError(t("Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  async function verifyAndEnable() {
    if (!key || !user) return;
    if (code.trim().length !== 6) {
      setError(t("Enter the 6-digit code from your authenticator app."));
      return;
    }
    setBusy(true);
    setError(null);
    let keySet = false;
    try {
      const full = await fullUser();
      full.totpKey = key;
      await updateUser.mutateAsync(full);
      keySet = true;
      // Confirm the code actually works before calling it done.
      await login(user.email, password, code.trim());
      setKey(null);
      setCode("");
      setPassword("");
      await refreshUser();
    } catch {
      if (keySet) {
        // Roll back: a half-enabled authenticator locks the user out.
        try {
          const full = await fullUser();
          full.totpKey = null;
          await updateUser.mutateAsync(full);
        } catch {
          /* best effort */
        }
      }
      setError(t("Wrong authenticator code — try again."));
    } finally {
      setBusy(false);
    }
  }

  function confirmDisable() {
    Alert.alert(t("Two-factor authentication"), t("This action cannot be undone."), [
      { text: t("Cancel"), style: "cancel" },
      {
        text: t("Disable"),
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          setError(null);
          try {
            const full = await fullUser();
            full.totpKey = null;
            await updateUser.mutateAsync(full);
            await refreshUser();
          } catch {
            setError(t("Something went wrong."));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  return (
    <View>
      {enabled ? (
        <>
          <Txt variant="small" color={p.ok} style={{ marginBottom: 12 }}>
            {t("Two-factor is enabled.")}
          </Txt>
          <Button
            kind="secondary"
            title={t("Disable")}
            onPress={confirmDisable}
            loading={busy}
          />
        </>
      ) : key ? (
        <>
          <Txt variant="small" color={p.muted} style={{ marginBottom: 8 }}>
            {t("Copy the key into your authenticator app, then enter the code below to verify.")}
          </Txt>
          <Txt
            variant="mono"
            selectable
            style={{
              backgroundColor: p.surface2,
              padding: 12,
              borderRadius: 8,
              marginBottom: 4,
            }}
          >
            {key}
          </Txt>
          <Txt variant="caption" color={p.faint} style={{ marginBottom: 12 }}>
            {t("Long-press the key to copy it.")}
          </Txt>
          <Field
            label={t("Authenticator code")}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
            keyboardType="numeric"
            placeholder="123456"
          />
          {error ? (
            <Txt variant="small" color={p.alert} style={{ marginBottom: 12 }}>
              {error}
            </Txt>
          ) : null}
          <Button
            title={t("Verify & enable")}
            onPress={verifyAndEnable}
            loading={busy}
            disabled={code.trim().length !== 6}
          />
          <Button
            kind="ghost"
            title={t("Cancel")}
            onPress={() => {
              setKey(null);
              setCode("");
              setError(null);
            }}
            style={{ marginTop: 8 }}
          />
        </>
      ) : (
        <>
          <Field
            label={t("Current password")}
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
          <Button title={t("Generate key")} onPress={generate} loading={busy} />
        </>
      )}
    </View>
  );
}

/* ----------------------------------------------------- password section */

function PasswordBody() {
  const p = useTheme();
  const t = useT();
  const { user, refreshUser } = useAuth();
  const updateUser = useUpdateUser();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function save() {
    if (!user) return;
    if (next.length < 6) {
      setError(t("Use at least 6 characters for the new password."));
      return;
    }
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      // Verify the current password first — Traccar's user PUT does not check it.
      await login(user.email, current);
      const full = await authedFetch<TraccarUser>(`/users/${user.id}`);
      // Read-modify-write: Traccar replaces the row, so send the full object.
      await updateUser.mutateAsync({ ...full, password: next } as TraccarUser);
      setCurrent("");
      setNext("");
      setDone(true);
      await refreshUser();
    } catch (e) {
      setError(
        e instanceof TraccarError && e.status === 401
          ? t("Wrong current password.")
          : t("Something went wrong."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      <Field
        label={t("Current password")}
        value={current}
        onChangeText={setCurrent}
        secure
        placeholder="••••••••"
      />
      <Field
        label={t("New password")}
        value={next}
        onChangeText={setNext}
        secure
        placeholder="••••••••"
      />
      {error ? (
        <Txt variant="small" color={p.alert} style={{ marginBottom: 12 }}>
          {error}
        </Txt>
      ) : null}
      {done ? (
        <Txt variant="small" color={p.ok} style={{ marginBottom: 12 }}>
          {t("Password changed.")}
        </Txt>
      ) : null}
      <Button title={t("Save")} onPress={save} loading={busy} disabled={!next} />
    </View>
  );
}

/* ------------------------------------------------------- API token section */

function ApiTokensBody() {
  const p = useTheme();
  const t = useT();
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const far = new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000).toISOString();
      setToken(await mintToken(far));
    } catch {
      setError(t("Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      <Txt variant="small" color={p.muted} style={{ marginBottom: 12 }}>
        {t(
          "Long-lived tokens for scripts and integrations. Anyone with a token can act as you — keep it secret.",
        )}
      </Txt>
      {token ? (
        <>
          <Txt
            variant="mono"
            selectable
            style={{
              backgroundColor: p.surface2,
              padding: 12,
              borderRadius: 8,
              marginBottom: 4,
            }}
          >
            {token}
          </Txt>
          <Txt variant="caption" color={p.faint} style={{ marginBottom: 12 }}>
            {t("Long-press the token to copy it. It won't be shown again.")}
          </Txt>
        </>
      ) : null}
      {error ? (
        <Txt variant="small" color={p.alert} style={{ marginBottom: 12 }}>
          {error}
        </Txt>
      ) : null}
      <Button
        title={token ? t("Generate a new token") : t("Generate token")}
        onPress={generate}
        loading={busy}
      />
    </View>
  );
}

/* ---------------------------------------------------------- plan section */

type Plan = "basic" | "plus" | "fleet";

function PlanBody() {
  const p = useTheme();
  const t = useT();
  const { user, refreshUser } = useAuth();
  const updateUser = useUpdateUser();
  const [open, setOpen] = useState(false);
  const [newPlan, setNewPlan] = useState<Plan>("plus");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attrs = attrsOf(user);
  const plan = str(attrs.plan) ?? "basic";
  const expiry = str(attrs.planExpiry);
  const req = attrs.upgradeRequest as
    | { plan?: unknown; note?: unknown; at?: unknown }
    | null
    | undefined;
  const pending = req != null && typeof req === "object";

  async function requestUpgrade() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const full = await authedFetch<TraccarUser>(`/users/${user.id}`);
      await updateUser.mutateAsync({
        ...full,
        attributes: {
          ...((full.attributes ?? {}) as Attrs),
          upgradeRequest: {
            plan: newPlan,
            note: note.trim() || undefined,
            at: new Date().toISOString(),
          },
        },
      });
      await refreshUser();
      setOpen(false);
      setNote("");
    } catch {
      setError(t("Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
        <Txt variant="title" style={{ color: "#ffffff" }}>
          {planLabel(plan, t)}
        </Txt>
        <Badge
          text={pending ? t("Upgrade requested") : t("Active")}
          tone={pending ? "warn" : "brand"}
        />
      </Row>
      <Txt variant="small" style={{ color: "#b9b9c2", marginTop: 4 }}>
        {planPrice(plan)} · {t("Plan expiry")}: {formatDate(expiry)}
      </Txt>
      {pending ? (
        <Txt variant="small" color={p.warn} style={{ marginTop: 12 }}>
          {t("Upgrade request sent.")}
        </Txt>
      ) : open ? (
        <View
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 12,
            padding: 12,
            marginTop: 12,
          }}
        >
          <Segmented<Plan>
            options={[
              { value: "basic", label: t("Basic") },
              { value: "plus", label: t("Plus") },
              { value: "fleet", label: t("Fleet") },
            ]}
            value={newPlan}
            onChange={setNewPlan}
          />
          <View style={{ height: 12 }} />
          <Field
            label={t("Note (optional)")}
            value={note}
            onChangeText={setNote}
            placeholder={t("Note (optional)")}
          />
          {error ? (
            <Txt variant="small" color={p.alert} style={{ marginBottom: 12 }}>
              {error}
            </Txt>
          ) : null}
          <Button title={t("Request upgrade")} onPress={requestUpgrade} loading={busy} />
          <Button
            kind="ghost"
            title={t("Cancel")}
            onPress={() => setOpen(false)}
            style={{ marginTop: 8 }}
          />
        </View>
      ) : (
        <Button
          kind="secondary"
          title={t("Upgrade plan")}
          onPress={() => setOpen(true)}
          style={{ marginTop: 14 }}
        />
      )}
    </View>
  );
}

/* ---------------------------------------------------------------- screen */

export default function SettingsScreen() {
  const p = useTheme();
  const t = useT();
  const { user, logout } = useAuth();
  const navigation = useNavigation<RootNav>();
  const [totpOpen, setTotpOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [apiTokenOpen, setApiTokenOpen] = useState(false);

  const attrs = attrsOf(user);
  const role = str(attrs.role) ?? "customer";
  const plan = str(attrs.plan) ?? "basic";
  const isAdmin = role === "admin" || role === "superadmin";
  const totpEnabled = !!user?.totpKey;

  function confirmSignOut() {
    Alert.alert(t("Sign out"), t("Are you sure you want to sign out?"), [
      { text: t("Cancel"), style: "cancel" },
      { text: t("Sign out"), style: "destructive", onPress: () => logout() },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <AppHeader title="" onBack={() => navigation.goBack()}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <BrandMark />
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: p.brandSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Txt
              variant="small"
              style={{ color: p.brandInk, fontWeight: "700", fontSize: 15 }}
            >
              {(user?.name ?? "?").charAt(0).toUpperCase()}
            </Txt>
          </View>
        </View>
        <Txt style={{ fontSize: 20, fontWeight: "700", color: p.ink }}>
          {t("Settings")}
        </Txt>
        <Txt variant="caption" color={p.muted} style={{ marginTop: 2 }}>
          {t("Account & preferences")}
        </Txt>
      </AppHeader>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Rise delay={0}>
          <Card>
            <Row style={{ alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: p.brandSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Txt variant="title" style={{ color: p.brandInk }}>
                  {(user?.name ?? "?").charAt(0).toUpperCase()}
                </Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="subtitle">{user?.name ?? ""}</Txt>
                <Txt variant="small" color={p.muted} style={{ marginTop: 2 }}>
                  {user?.email ?? ""}
                </Txt>
              </View>
              <Badge text={planLabel(plan, t)} tone="brand" />
            </Row>
          </Card>
        </Rise>

        <Rise delay={60}>
          <Kicker>{t("Security")}</Kicker>
          <Card style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
            <Pressable onPress={() => setTotpOpen((v) => !v)}>
              <Row style={{ alignItems: "center", paddingVertical: 14, gap: 12 }}>
                <ShieldCheck color={p.muted} size={20} />
                <View style={{ flex: 1 }}>
                  <Txt variant="small" style={{ fontWeight: "600", fontSize: 14 }}>
                    {t("Two-factor auth")}
                  </Txt>
                  <Txt variant="caption" color={p.muted} style={{ marginTop: 2 }}>
                    {t("Authenticator app")}
                  </Txt>
                </View>
                {totpEnabled ? (
                  <Badge text={t("On")} tone="ok" />
                ) : (
                  <Txt variant="small" style={{ color: p.brandInk, fontWeight: "700" }}>
                    {t("Set up →")}
                  </Txt>
                )}
              </Row>
            </Pressable>
            {totpOpen ? (
              <>
                <Divider />
                <View style={{ paddingVertical: 12 }}>
                  <TotpBody />
                </View>
              </>
            ) : null}
            <Divider />
            <Pressable onPress={() => setPwdOpen((v) => !v)}>
              <Row style={{ alignItems: "center", paddingVertical: 14, gap: 12 }}>
                <KeyRound color={p.muted} size={20} />
                <View style={{ flex: 1 }}>
                  <Txt variant="small" style={{ fontWeight: "600", fontSize: 14 }}>
                    {t("Change password")}
                  </Txt>
                </View>
                <ChevronRight color={p.muted} size={20} />
              </Row>
            </Pressable>
            {pwdOpen ? (
              <>
                <Divider />
                <View style={{ paddingVertical: 12 }}>
                  <PasswordBody />
                </View>
              </>
            ) : null}
            <Divider />
            <Pressable onPress={() => setApiTokenOpen((v) => !v)}>
              <Row style={{ alignItems: "center", paddingVertical: 14, gap: 12 }}>
                <Key color={p.muted} size={20} />
                <View style={{ flex: 1 }}>
                  <Txt variant="small" style={{ fontWeight: "600", fontSize: 14 }}>
                    {t("API tokens")}
                  </Txt>
                  <Txt variant="caption" color={p.muted} style={{ marginTop: 2 }}>
                    {t("For scripts and integrations")}
                  </Txt>
                </View>
                <ChevronRight color={p.muted} size={20} />
              </Row>
            </Pressable>
            {apiTokenOpen ? (
              <>
                <Divider />
                <View style={{ paddingVertical: 12 }}>
                  <ApiTokensBody />
                </View>
              </>
            ) : null}
          </Card>
        </Rise>

        <Rise delay={90}>
          <Kicker>{t("Notifications")}</Kicker>
          <Card style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
            <Pressable onPress={() => navigation.navigate("Notifications")}>
              <Row style={{ alignItems: "center", paddingVertical: 14, gap: 12 }}>
                <BellRing color={p.muted} size={20} />
                <View style={{ flex: 1 }}>
                  <Txt variant="small" style={{ fontWeight: "600", fontSize: 14 }}>
                    {t("Push notifications")}
                  </Txt>
                  <Txt variant="caption" color={p.muted} style={{ marginTop: 2 }}>
                    {t("Alert pushes on this phone")}
                  </Txt>
                </View>
                <PushBadge />
                <ChevronRight color={p.muted} size={20} />
              </Row>
            </Pressable>
          </Card>
        </Rise>

        <Rise delay={180}>
          <Kicker>{t("Plan")}</Kicker>
          <View
            style={{
              backgroundColor: "#101014",
              borderRadius: 18,
              padding: 16,
            }}
          >
            <PlanBody />
          </View>
        </Rise>

        {isAdmin ? (
          <Rise delay={240}>
            <Kicker>{t("Admin")}</Kicker>
            <Pressable onPress={() => navigation.navigate("Admin")}>
              <Card>
                <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Txt variant="subtitle">{t("Admin")}</Txt>
                  <ChevronRight color={p.muted} size={20} />
                </Row>
                <Txt variant="small" color={p.muted} style={{ marginTop: 4 }}>
                  {t("Manage users, plans and requests.")}
                </Txt>
              </Card>
            </Pressable>
          </Rise>
        ) : null}

        <Rise delay={isAdmin ? 300 : 240}>
          <View style={{ height: 20 }} />
          <Button kind="danger" title={t("Sign out")} onPress={confirmSignOut} />
          <Row style={{ justifyContent: "center", marginTop: 16, gap: 8 }}>
            <LogOut color={p.faint} size={14} />
            <Txt variant="caption" color={p.faint}>
              W3ctrl Track
            </Txt>
          </Row>
          <View style={{ height: 8 }} />
        </Rise>

        <Rise delay={isAdmin ? 360 : 300}>
          <AdSlider />
        </Rise>
      </ScrollView>
    </View>
  );
}
