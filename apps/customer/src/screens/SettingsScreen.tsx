import React, { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ChevronRight, LogOut } from "lucide-react-native";
import {
  Badge,
  Button,
  Card,
  Divider,
  Field,
  Row,
  Screen,
  Segmented,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useLang, useT, type Lang } from "@w3ctrl/i18n";
import { login, TraccarError, type TraccarUser } from "@w3ctrl/api";
import { useAuth } from "../auth/AuthContext";
import { authedFetch } from "../api/client";
import { generateTotpSecret, useUpdateUser } from "../api/hooks";
import { formatDate } from "../utils/format";
import type { TabNav } from "../navigation/types";

type Attrs = Record<string, unknown>;

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

function SectionTitle({ children }: { children: string }) {
  const p = useTheme();
  return (
    <Txt variant="subtitle" color={p.ink} style={{ marginTop: 20, marginBottom: 8 }}>
      {children}
    </Txt>
  );
}

/* ------------------------------------------------------- TOTP section */

function TotpSection() {
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
    <Card>
      <Txt variant="subtitle" style={{ marginBottom: 4 }}>
        {t("Two-factor authentication")}
      </Txt>
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
    </Card>
  );
}

/* ----------------------------------------------------- password section */

function PasswordSection() {
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
    <Card>
      <Txt variant="subtitle" style={{ marginBottom: 12 }}>
        {t("Change password")}
      </Txt>
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
    </Card>
  );
}

/* ---------------------------------------------------------- plan section */

type Plan = "basic" | "plus" | "fleet";

function PlanSection() {
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
    <Card>
      <Row style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <Txt variant="subtitle">{t("Plan")}</Txt>
        <Badge text={planLabel(plan, t)} tone="brand" />
      </Row>
      <Txt variant="small" color={p.muted} style={{ marginBottom: 12 }}>
        {t("Plan expiry")}: {formatDate(expiry)}
      </Txt>
      {pending ? (
        <Txt variant="small" color={p.warn}>
          {t("Upgrade request sent.")}
        </Txt>
      ) : open ? (
        <>
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
        </>
      ) : (
        <Button kind="secondary" title={t("Upgrade plan")} onPress={() => setOpen(true)} />
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------- screen */

export default function SettingsScreen() {
  const p = useTheme();
  const t = useT();
  const { lang, setLang } = useLang();
  const navigation = useNavigation<TabNav<"Settings">>();
  const { user, logout } = useAuth();

  const attrs = attrsOf(user);
  const role = str(attrs.role) ?? "customer";
  const plan = str(attrs.plan) ?? "basic";
  const isAdmin = role === "admin" || role === "superadmin";

  function confirmSignOut() {
    Alert.alert(t("Sign out"), t("Are you sure you want to sign out?"), [
      { text: t("Cancel"), style: "cancel" },
      { text: t("Sign out"), style: "destructive", onPress: () => logout() },
    ]);
  }

  return (
    <Screen>
      <Card>
        <Txt variant="title">{user?.name ?? ""}</Txt>
        <Txt variant="small" color={p.muted} style={{ marginTop: 4 }}>
          {user?.email ?? ""}
        </Txt>
        <View style={{ marginTop: 10 }}>
          <Badge text={planLabel(plan, t)} tone="brand" />
        </View>
      </Card>

      <SectionTitle>{t("Language")}</SectionTitle>
      <Card>
        <Segmented<Lang>
          options={[
            { value: "en", label: t("English") },
            { value: "hi", label: t("Hindi") },
          ]}
          value={lang}
          onChange={setLang}
        />
      </Card>

      <SectionTitle>{t("Plan")}</SectionTitle>
      <PlanSection />

      <SectionTitle>{t("Security")}</SectionTitle>
      <TotpSection />
      <View style={{ height: 12 }} />
      <PasswordSection />

      {isAdmin ? (
        <>
          <SectionTitle>{t("Admin")}</SectionTitle>
          <Pressable onPress={() => navigation.navigate("Admin")}>
            <Card>
              <Row style={{ justifyContent: "space-between" }}>
                <Txt variant="subtitle">{t("Admin")}</Txt>
                <ChevronRight color={p.muted} size={20} />
              </Row>
              <Txt variant="small" color={p.muted} style={{ marginTop: 4 }}>
                {t("Manage users, plans and requests.")}
              </Txt>
            </Card>
          </Pressable>
        </>
      ) : null}

      <Divider />
      <Button kind="secondary" title={t("Sign out")} onPress={confirmSignOut} />
      <Row style={{ justifyContent: "center", marginTop: 16, gap: 8 }}>
        <LogOut color={p.faint} size={14} />
        <Txt variant="caption" color={p.faint}>
          W3ctrl Track
        </Txt>
      </Row>
      <View style={{ height: 8 }} />
    </Screen>
  );
}
