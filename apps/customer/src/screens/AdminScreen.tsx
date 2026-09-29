import React, { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, SafeAreaView, View } from "react-native";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  LoadingView,
  Row,
  Segmented,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import type { TraccarUser } from "@w3ctrl/api";
import { useUpdateUser, useUsers } from "../api/hooks";
import { formatDate } from "../utils/format";

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
    <Card style={{ marginBottom: 12 }}>
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
  const p = useTheme();
  const t = useT();
  const attrs = (user.attributes ?? {}) as Attrs;
  return (
    <View style={{ marginBottom: 12 }}>
      <Pressable onPress={onEdit}>
        <Card>
          <Txt variant="subtitle" numberOfLines={1}>
            {user.name}
          </Txt>
          <Txt variant="small" color={p.muted} style={{ marginTop: 2 }} numberOfLines={1}>
            {user.email}
          </Txt>
          <Row style={{ gap: 8, marginTop: 8 }}>
            <Badge text={roleLabel(roleOf(user), t)} tone="neutral" />
            <Badge text={planLabel(str(attrs.plan) ?? "basic", t)} tone="brand" />
          </Row>
        </Card>
      </Pressable>
      {editing ? (
        <View style={{ marginTop: 8 }}>
          <UserEditor user={user} onDone={onDone} />
        </View>
      ) : null}
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
  const p = useTheme();
  const t = useT();
  const req = kind === "upgrade" ? upgradeRequestOf(user) : featureRequestOf(user);
  const detail =
    kind === "upgrade"
      ? `${t("Plan")}: ${planLabel(str((req as UpgradeRequest)?.plan) ?? "plus", t)}${
          str((req as UpgradeRequest)?.note) ? ` — ${str((req as UpgradeRequest)?.note)}` : ""
        }`
      : str((req as { text?: unknown })?.text) ?? "";
  return (
    <Card style={{ marginBottom: 12, borderColor: p.warn }}>
      <Txt variant="subtitle">{user.name}</Txt>
      <Txt variant="small" color={p.muted} style={{ marginTop: 2 }}>
        {user.email}
      </Txt>
      <Txt variant="body" style={{ marginTop: 8 }}>
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
  const { data: users, isLoading, refetch, isRefetching } = useUsers();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: p.paper }}>
      <FlatList
        data={users ?? []}
        keyExtractor={(u) => String(u.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={p.brand}
          />
        }
        ListHeaderComponent={
          <>
            {pending.length > 0 ? (
              <>
                <Txt variant="subtitle" style={{ marginBottom: 8 }}>
                  {t("Requests")}
                </Txt>
                {pending.map((u) => {
                  const up = upgradeRequestOf(u);
                  const feat = featureRequestOf(u);
                  return (
                    <View key={`req-${u.id}`}>
                      {up ? (
                        <RequestCard
                          user={u}
                          kind="upgrade"
                          onApprove={() => approveUpgrade(u)}
                          onDismiss={() => dismiss(u, "upgradeRequest")}
                          busy={busyKey === `approve-${u.id}` || busyKey === `dismiss-${u.id}-upgradeRequest`}
                        />
                      ) : null}
                      {feat ? (
                        <RequestCard
                          user={u}
                          kind="feature"
                          onDismiss={() => dismiss(u, "featureRequest")}
                          busy={busyKey === `dismiss-${u.id}-featureRequest`}
                        />
                      ) : null}
                    </View>
                  );
                })}
              </>
            ) : null}
            <Txt variant="subtitle" style={{ marginBottom: 8, marginTop: pending.length > 0 ? 8 : 0 }}>
              {t("Users")}
            </Txt>
          </>
        }
        ListEmptyComponent={<EmptyState title={t("No users found.")} />}
        renderItem={({ item }) => (
          <UserRow
            user={item}
            editing={editingId === item.id}
            onEdit={() => setEditingId(editingId === item.id ? null : item.id)}
            onDone={() => {
              setEditingId(null);
              refetch();
            }}
          />
        )}
      />
    </SafeAreaView>
  );
}
