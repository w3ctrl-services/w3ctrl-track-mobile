import React, { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  AdSlider,
  AppHeader,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  LoadingView,
  Rise,
  Row,
  Segmented,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import type { TraccarUser } from "@w3ctrl/api";
import { useDevices, useUpdateUser, useUsers } from "../api/hooks";
import type { RootNav } from "../navigation/types";

type Attrs = Record<string, unknown>;
type Role = "customer" | "admin" | "superadmin";
type Plan = "basic" | "plus" | "fleet";

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function roleOf(u: TraccarUser): Role {
  const r = str((u.attributes ?? {}) as Attrs["role"]);
  return r === "admin" || r === "superadmin" ? r : "customer";
}

function roleLabel(role: Role, t: (k: string) => string): string {
  if (role === "superadmin") return t("Superadmin");
  if (role === "admin") return t("Admin");
  return t("Customer");
}

function planLabel(plan: string, t: (k: string) => string): string {
  if (plan === "plus") return t("Plus");
  if (plan === "fleet") return t("Fleet");
  return t("Basic");
}

interface UpgradeRequest {
  plan?: unknown;
  note?: unknown;
  at?: unknown;
}

function upgradeRequestOf(u: TraccarUser): UpgradeRequest | null {
  const r = ((u.attributes ?? {}) as Attrs).upgradeRequest;
  return r != null && typeof r === "object" ? (r as UpgradeRequest) : null;
}

function featureRequestOf(u: TraccarUser): { text?: unknown; at?: unknown } | null {
  const r = ((u.attributes ?? {}) as Attrs).featureRequest;
  return r != null && typeof r === "object"
    ? (r as { text?: unknown; at?: unknown })
    : null;
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flex: 1, minWidth: "46%" }}>
      <Txt variant="title">{value}</Txt>
      <Txt variant="caption" color="#8a8a95" style={{ marginTop: 4 }}>
        {label}
      </Txt>
    </Card>
  );
}

function Avatar({ name }: { name: string }) {
  const p = useTheme();
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: p.brandSoft,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
      }}
    >
      <Txt variant="small" style={{ color: p.brandInk, fontWeight: "700", fontSize: 14 }}>
        {(name ?? "?").charAt(0).toUpperCase()}
      </Txt>
    </View>
  );
}

function UserEditor({ user, onDone }: { user: TraccarUser; onDone: () => void }) {
  const p = useTheme();
  const t = useT();
  const updateUser = useUpdateUser();
  const attrs = (user.attributes ?? {}) as Attrs;
  const [role, setRole] = useState<Role>(roleOf(user));
  const [plan, setPlan] = useState<Plan>(
    str(attrs.plan) === "plus" || str(attrs.plan) === "fleet" ? (str(attrs.plan) as Plan) : "basic",
  );
  const [expiry, setExpiry] = useState<string>(str(attrs.planExpiry)?.slice(0, 10) ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await updateUser.mutateAsync({
        ...user,
        attributes: {
          ...attrs,
          role,
          plan,
          planExpiry: expiry ? new Date(`${expiry}T00:00:00`).toISOString() : null,
        },
      });
      onDone();
    } catch {
      setError(t("Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ marginTop: 8, marginBottom: 12 }}>
      <Txt variant="small" style={{ fontWeight: "600", marginBottom: 6 }}>
        {t("Role")}
      </Txt>
      <Segmented<Role>
        options={[
          { value: "customer", label: t("Customer") },
          { value: "admin", label: t("Admin") },
          { value: "superadmin", label: t("Superadmin") },
        ]}
        value={role}
        onChange={setRole}
      />
      <View style={{ height: 12 }} />
      <Txt variant="small" style={{ fontWeight: "600", marginBottom: 6 }}>
        {t("Plan")}
      </Txt>
      <Segmented<Plan>
        options={[
          { value: "basic", label: t("Basic") },
          { value: "plus", label: t("Plus") },
          { value: "fleet", label: t("Fleet") },
        ]}
        value={plan}
        onChange={setPlan}
      />
      <View style={{ height: 12 }} />
      <Field
        label={t("Plan expiry")}
        value={expiry}
        onChangeText={setExpiry}
        placeholder="2027-09-30"
        hint={t("YYYY-MM-DD")}
      />
      {error ? (
        <Txt variant="small" color={p.alert} style={{ marginBottom: 12 }}>
          {error}
        </Txt>
      ) : null}
      <Row style={{ gap: 12 }}>
        <Button title={t("Save")} onPress={save} loading={busy} style={{ flex: 1 }} />
        <Button kind="secondary" title={t("Cancel")} onPress={onDone} style={{ flex: 1 }} />
      </Row>
    </Card>
  );
}

function UserRow({
  user,
  editing,
  onEdit,
  onDone,
}: {
  user: TraccarUser;
  editing: boolean;
  onEdit: () => void;
  onDone: () => void;
}) {
  const t = useT();
  const attrs = (user.attributes ?? {}) as Attrs;
  const role = roleOf(user);
  return (
    <View style={{ marginBottom: 12 }}>
      <Pressable onPress={onEdit}>
        <Card>
          <Row style={{ alignItems: "center" }}>
            <Avatar name={user.name} />
            <View style={{ flex: 1 }}>
              <Txt variant="small" style={{ fontWeight: "600", fontSize: 14 }} numberOfLines={1}>
                {user.name}
              </Txt>
              <Txt variant="caption" color="#8a8a95" style={{ marginTop: 2 }} numberOfLines={1}>
                {user.email} · {planLabel(str(attrs.plan) ?? "basic", t)}
              </Txt>
            </View>
            <Badge
              text={roleLabel(role, t)}
              tone={role === "customer" ? "neutral" : "alert"}
            />
          </Row>
        </Card>
      </Pressable>
      {editing ? <UserEditor user={user} onDone={onDone} /> : null}
    </View>
  );
}

function RequestCard({
  user,
  kind,
  onApprove,
  onDismiss,
  busy,
}: {
  user: TraccarUser;
  kind: "upgrade" | "feature";
  onApprove?: () => void;
  onDismiss: () => void;
  busy: boolean;
}) {
  const t = useT();
  const req = kind === "upgrade" ? upgradeRequestOf(user) : featureRequestOf(user);
  const detail =
    kind === "upgrade"
      ? `${t("Plan")}: ${planLabel(str((req as UpgradeRequest)?.plan) ?? "plus", t)}${
          str((req as UpgradeRequest)?.note) ? ` — ${str((req as UpgradeRequest)?.note)}` : ""
        }`
      : str((req as { text?: unknown })?.text) ?? "";
  return (
    <Card style={{ marginBottom: 12 }}>
      <Row style={{ alignItems: "center" }}>
        <Avatar name={user.name} />
        <View style={{ flex: 1 }}>
          <Txt variant="small" style={{ fontWeight: "600", fontSize: 14 }}>
            {user.name}
          </Txt>
          <Txt variant="caption" color="#8a8a95" style={{ marginTop: 2 }}>
            {user.email}
          </Txt>
        </View>
      </Row>
      <Txt variant="small" style={{ marginTop: 10 }}>
        {kind === "upgrade" ? t("Upgrade request") : t("Feature request")}: {detail}
      </Txt>
      <Row style={{ gap: 12, marginTop: 12 }}>
        {onApprove ? (
          <Button
            title={t("Approve")}
            onPress={onApprove}
            loading={busy}
            style={{ flex: 1 }}
          />
        ) : null}
        <Button
          kind="secondary"
          title={t("Dismiss")}
          onPress={onDismiss}
          disabled={busy}
          style={{ flex: 1 }}
        />
      </Row>
    </Card>
  );
}

export default function AdminScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<RootNav>();
  const { data: users, isLoading, refetch, isRefetching } = useUsers();
  const { data: devices } = useDevices();
  const updateUser = useUpdateUser();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const pending = useMemo(
    () =>
      (users ?? []).filter(
        (u) => upgradeRequestOf(u) !== null || featureRequestOf(u) !== null,
      ),
    [users],
  );
  const upgrades = useMemo(
    () => (users ?? []).filter((u) => upgradeRequestOf(u) !== null),
    [users],
  );
  const features = useMemo(
    () => (users ?? []).filter((u) => featureRequestOf(u) !== null),
    [users],
  );
  const adminCount = useMemo(
    () => (users ?? []).filter((u) => roleOf(u) !== "customer").length,
    [users],
  );

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusyKey(key);
    try {
      await fn();
      await refetch();
    } catch {
      /* errors surface on the next refetch; keep the UI simple */
    } finally {
      setBusyKey(null);
    }
  }

  function approveUpgrade(u: TraccarUser) {
    const req = upgradeRequestOf(u);
    if (!req) return;
    const plan: Plan = req.plan === "fleet" ? "fleet" : "plus";
    const attrs = (u.attributes ?? {}) as Attrs;
    const existing = str(attrs.planExpiry);
    const base =
      existing && new Date(existing).getTime() > Date.now()
        ? new Date(existing)
        : new Date();
    base.setFullYear(base.getFullYear() + 1);
    void run(`approve-${u.id}`, () =>
      updateUser.mutateAsync({
        ...u,
        attributes: {
          ...attrs,
          plan,
          planExpiry: base.toISOString(),
          upgradeRequest: null,
        },
      }),
    );
  }

  function dismiss(u: TraccarUser, field: "upgradeRequest" | "featureRequest") {
    const attrs = (u.attributes ?? {}) as Attrs;
    void run(`dismiss-${u.id}-${field}`, () =>
      updateUser.mutateAsync({ ...u, attributes: { ...attrs, [field]: null } }),
    );
  }

  if (isLoading && !users) {
    return <LoadingView />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <AppHeader
        title={t("Admin console")}
        subtitle={t("Manage users, plans and requests.")}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={p.brand}
          />
        }
      >
        <Rise delay={0}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <StatCard label={t("Users")} value={String(users?.length ?? 0)} />
            <StatCard label={t("Devices")} value={String(devices?.length ?? 0)} />
            <StatCard label={t("Pending")} value={String(pending.length)} />
            <StatCard label={t("Admins")} value={String(adminCount)} />
          </View>
        </Rise>

        {upgrades.length > 0 ? (
          <Rise delay={60}>
            <Kicker>{t("Upgrade queue")}</Kicker>
            {upgrades.map((u) => (
              <RequestCard
                key={`upgrade-${u.id}`}
                user={u}
                kind="upgrade"
                onApprove={() => approveUpgrade(u)}
                onDismiss={() => dismiss(u, "upgradeRequest")}
                busy={
                  busyKey === `approve-${u.id}` ||
                  busyKey === `dismiss-${u.id}-upgradeRequest`
                }
              />
            ))}
          </Rise>
        ) : null}

        {features.length > 0 ? (
          <Rise delay={120}>
            <Kicker>{t("Feature requests")}</Kicker>
            {features.map((u) => (
              <RequestCard
                key={`feature-${u.id}`}
                user={u}
                kind="feature"
                onDismiss={() => dismiss(u, "featureRequest")}
                busy={busyKey === `dismiss-${u.id}-featureRequest`}
              />
            ))}
          </Rise>
        ) : null}

        <Rise delay={180}>
          <Kicker>{t("Users")}</Kicker>
          {(users ?? []).length === 0 ? (
            <EmptyState title={t("No users found.")} />
          ) : (
            (users ?? []).map((u) => (
              <UserRow
                key={String(u.id)}
                user={u}
                editing={editingId === u.id}
                onEdit={() => setEditingId(editingId === u.id ? null : u.id)}
                onDone={() => {
                  setEditingId(null);
                  refetch();
                }}
              />
            ))
          )}
        </Rise>

        <Rise delay={240}>
          <AdSlider />
        </Rise>
      </ScrollView>
    </View>
  );
}
