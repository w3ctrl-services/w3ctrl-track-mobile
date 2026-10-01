/**
 * Smart alerts tab content for the customer app: overstay + low-battery
 * rules evaluated on-device, sharing the same rule schema as the web
 * portal (`user.attributes.smartAlerts`).
 */
import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from "react-native";
import * as Notifications from "expo-notifications";
import { useNavigation } from "@react-navigation/native";
import { BellRing, Plus, Smartphone, Trash2 } from "lucide-react-native";
import {
  Button,
  Card,
  DeviceDot,
  EmptyState,
  Row,
  Segmented,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import {
  BATTERY_PRESETS_PCT,
  OVERSTAY_PRESETS_MIN,
  SMART_ALERT_KINDS,
  defaultRuleName,
  deviceScopeLabel,
  getDeviceType,
  newRuleId,
  ruleSummary,
  sanitizeRule,
  type SmartAlertKind,
  type SmartAlertRule,
  type TraccarDevice,
  type TraccarGeofence,
} from "@w3ctrl/api";
import { useAuth } from "../auth/AuthContext";
import { useDevices, useGeofences, useUpdateUser } from "../api/hooks";
import { clearHits } from "../utils/smart-alerts";
import { useSmartAlertStore } from "../utils/smart-alert-store";
import { writeLocalRules } from "../utils/smart-alerts";
import { formatRelative } from "../utils/format";
import type { TabNav } from "../navigation/types";

const KIND_TONE: Record<SmartAlertKind, string> = {
  overstay: "#b45309",
  lowBattery: "#dc2626",
};

/* ------------------------------------------------------------ rule form */

function NewRuleForm({
  devices,
  geofences,
  onDone,
}: {
  devices: TraccarDevice[];
  geofences: TraccarGeofence[];
  onDone: () => void;
}) {
  const p = useTheme();
  const t = useT();
  const { user, refreshUser } = useAuth();
  const updateUser = useUpdateUser();
  const rules = useSmartAlertStore((s) => s.rules);
  const setRules = useSmartAlertStore((s) => s.setRules);

  const [kind, setKind] = useState<SmartAlertKind>("overstay");
  const [name, setName] = useState("");
  const [deviceIds, setDeviceIds] = useState<number[]>([]);
  const [dwellMinutes, setDwellMinutes] = useState(30);
  const [geofenceIds, setGeofenceIds] = useState<number[]>([]);
  const [batteryPct, setBatteryPct] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (list: number[], id: number) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const rule: SmartAlertRule = {
        id: newRuleId(),
        kind,
        name:
          name.trim() ||
          defaultRuleName(kind, { dwellMinutes, batteryPct, geofenceIds }),
        enabled: true,
        deviceIds,
        dwellMinutes,
        geofenceIds: kind === "overstay" ? geofenceIds : [],
        batteryPct,
        createdAt: new Date().toISOString(),
      };
      const next = [...rules, rule].map(sanitizeRule);
      await writeLocalRules(next);
      setRules(next);
      if (user) {
        await updateUser.mutateAsync({
          ...user,
          attributes: { ...(user.attributes ?? {}), smartAlerts: next },
        });
        await refreshUser();
      }
      onDone();
    } catch {
      setError(t("Could not save the rule."));
    } finally {
      setBusy(false);
    }
  }

  const chip = (active: boolean) => ({
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: active ? p.ink : p.line,
    backgroundColor: active ? p.ink : "transparent",
    marginRight: 8,
    marginBottom: 8,
  });

  return (
    <Card style={{ marginBottom: 16 }}>
      <Txt variant="subtitle" style={{ marginBottom: 8 }}>
        {t("New smart alert")}
      </Txt>
      <Segmented
        value={kind}
        onChange={(v) => setKind(v as SmartAlertKind)}
        options={SMART_ALERT_KINDS.map((k) => ({ value: k.value, label: t(k.label) }))}
      />
      <Txt variant="small" color={p.muted} style={{ marginTop: 6, marginBottom: 12 }}>
        {t(SMART_ALERT_KINDS.find((k) => k.value === kind)!.hint)}
      </Txt>

      <Txt variant="small" color={p.muted} style={{ marginBottom: 4 }}>
        {t("Rule name")}
      </Txt>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={defaultRuleName(kind, { dwellMinutes, batteryPct, geofenceIds })}
        placeholderTextColor={p.faint}
        style={{
          borderWidth: 1,
          borderColor: p.line,
          borderRadius: 12,
          padding: 12,
          color: p.ink,
          backgroundColor: p.surface,
          marginBottom: 12,
        }}
      />

      {kind === "overstay" ? (
        <>
          <Txt variant="small" color={p.muted} style={{ marginBottom: 6 }}>
            {t("Fire after stopped for")}
          </Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
            {OVERSTAY_PRESETS_MIN.map((m) => (
              <Pressable key={m} onPress={() => setDwellMinutes(m)} style={chip(dwellMinutes === m)}>
                <Txt variant="body" color={dwellMinutes === m ? p.paper : p.ink}>
                  {m} {t("min")}
                </Txt>
              </Pressable>
            ))}
          </View>
          <Txt variant="small" color={p.muted} style={{ marginBottom: 6 }}>
            {t("Where (optional)")} — {t("empty = everywhere")}
          </Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
            {geofences.map((g) => {
              const on = geofenceIds.includes(g.id);
              return (
                <Pressable key={g.id} onPress={() => setGeofenceIds(toggle(geofenceIds, g.id))} style={chip(on)}>
                  <Txt variant="body" color={on ? p.paper : p.ink}>
                    {g.name}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : (
        <>
          <Txt variant="small" color={p.muted} style={{ marginBottom: 6 }}>
            {t("Fire when battery drops below")}
          </Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
            {BATTERY_PRESETS_PCT.map((pct) => (
              <Pressable key={pct} onPress={() => setBatteryPct(pct)} style={chip(batteryPct === pct)}>
                <Txt variant="body" color={batteryPct === pct ? p.paper : p.ink}>
                  {pct}%
                </Txt>
              </Pressable>
            ))}
          </View>
          <Txt variant="small" color={p.muted} style={{ marginBottom: 12 }}>
            {t("Phones, laptops and trackers report battery percent; most vehicles report voltage instead.")}
          </Txt>
        </>
      )}

      <Txt variant="small" color={p.muted} style={{ marginBottom: 6 }}>
        {t("Devices")} — {t("empty = all")}
      </Txt>
      {devices.map((d) => {
        const on = deviceIds.includes(d.id);
        const dt = getDeviceType(d);
        return (
          <Pressable
            key={d.id}
            onPress={() => setDeviceIds(toggle(deviceIds, d.id))}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: p.line,
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                borderWidth: 1.5,
                borderColor: on ? p.brand : p.lineStrong,
                backgroundColor: on ? p.brand : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {on ? <Txt style={{ color: "#fff", fontSize: 13 }}>✓</Txt> : null}
            </View>
            <DeviceDot type={dt} />
            <Txt variant="body" style={{ flex: 1 }}>
              {d.name}
            </Txt>
            {(dt === "phone" || dt === "laptop") && (
              <Smartphone size={14} color={p.muted} />
            )}
          </Pressable>
        );
      })}

      {error ? (
        <Txt color={p.alert} style={{ marginTop: 8 }}>
          {error}
        </Txt>
      ) : null}

      <Row style={{ marginTop: 14, gap: 10 }}>
        <Button title={busy ? t("Saving…") : t("Save rule")} onPress={save} disabled={busy} />
        <Button title={t("Cancel")} kind="secondary" onPress={onDone} />
      </Row>
    </Card>
  );
}

/* ----------------------------------------------------------------- panel */

export function SmartAlertsPanel() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<TabNav<"Alerts">>();
  const { user, refreshUser } = useAuth();
  const updateUser = useUpdateUser();
  const { data: devices } = useDevices();
  const { data: geofences } = useGeofences();
  const rules = useSmartAlertStore((s) => s.rules);
  const hits = useSmartAlertStore((s) => s.hits);
  const setRules = useSmartAlertStore((s) => s.setRules);
  const refresh = useSmartAlertStore((s) => s.refresh);
  const [showForm, setShowForm] = useState(false);
  const [notifState, setNotifState] = useState<string | null>(null);

  const geofenceName = useMemo(() => {
    const m = new Map<number, string>();
    for (const g of geofences ?? []) m.set(g.id, g.name);
    return (id: number) => m.get(id);
  }, [geofences]);

  async function persist(next: SmartAlertRule[]) {
    const clean = next.map(sanitizeRule);
    await writeLocalRules(clean);
    setRules(clean);
    if (user) {
      await updateUser.mutateAsync({
        ...user,
        attributes: { ...(user.attributes ?? {}), smartAlerts: clean },
      });
      await refreshUser();
    }
  }

  function confirmDelete(rule: SmartAlertRule) {
    Alert.alert(
      t("Delete this smart alert?"),
      rule.name,
      [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Delete"),
          style: "destructive",
          onPress: () => void persist(rules.filter((r) => r.id !== rule.id)),
        },
      ],
    );
  }

  async function enableNotifications() {
    const res = await Notifications.requestPermissionsAsync();
    setNotifState(res.granted ? "granted" : "denied");
  }

  // Phone/laptop companion: server-side rules that cover what smart
  // alerts can't (offline + SOS fire even with the app closed).
  const phoneLaptopCount = (devices ?? []).filter((d) => {
    const dt = getDeviceType(d);
    return dt === "phone" || dt === "laptop";
  }).length;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <Card style={{ marginBottom: 12 }}>
        <Row style={{ gap: 12 }}>
          <BellRing size={20} color={p.brand} />
          <Txt variant="body" style={{ flex: 1 }}>
            {t("Overstay and low-battery checks run in this app while it is open, plus a background check about every 15 minutes. They are not 24/7 server watches.")}
          </Txt>
        </Row>
        {notifState !== "granted" && (
          <Button
            title={t("Enable notifications")}
            kind="secondary"
            onPress={enableNotifications}
            style={{ marginTop: 10 }}
          />
        )}
      </Card>

      {phoneLaptopCount > 0 && (
        <Card style={{ marginBottom: 12 }}>
          <Row style={{ gap: 8, marginBottom: 6 }}>
            <Smartphone size={16} color={p.muted} />
            <Txt variant="subtitle">
              {t("Phones & laptops")} ({phoneLaptopCount})
            </Txt>
          </Row>
          <Txt variant="small" color={p.muted} style={{ marginBottom: 10 }}>
            {t("Pair smart alerts with server rules that fire even when this app is closed: Device offline (app killed / laptop asleep) and Alarm → SOS.")}
          </Txt>
          <Button
            title={t("Add server rule")}
            kind="secondary"
            onPress={() => navigation.navigate("AlertRules")}
          />
        </Card>
      )}

      <Row style={{ justifyContent: "space-between", marginBottom: 8, marginTop: 4 }}>
        <Txt variant="subtitle">{t("Smart alert rules")}</Txt>
        {!showForm && (
          <Pressable
            onPress={() => setShowForm(true)}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Plus size={16} color={p.brand} />
            <Txt color={p.brand}>{t("New")}</Txt>
          </Pressable>
        )}
      </Row>

      {showForm && (
        <NewRuleForm
          devices={devices ?? []}
          geofences={geofences ?? []}
          onDone={() => {
            setShowForm(false);
            void refresh(user);
          }}
        />
      )}

      {rules.length === 0 && !showForm ? (
        <EmptyState
          title={t("No smart alerts yet")}
          hint={t("Watch for overstays and low batteries without any server setup.")}
        />
      ) : (
        rules.map((r) => (
          <Card key={r.id} style={{ marginBottom: 10 }}>
            <Row style={{ justifyContent: "space-between" }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Txt variant="body" style={{ fontWeight: "600" }}>
                  {r.name}
                </Txt>
                <Txt variant="small" color={p.muted} style={{ marginTop: 2 }}>
                  {ruleSummary(r, geofenceName, t)} · {deviceScopeLabel(r, t)}
                </Txt>
              </View>
              <Switch
                value={r.enabled}
                onValueChange={() =>
                  persist(rules.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)))
                }
                trackColor={{ true: p.brand, false: p.surface3 }}
              />
              <Pressable onPress={() => confirmDelete(r)} style={{ padding: 6 }}>
                <Trash2 size={17} color={p.muted} />
              </Pressable>
            </Row>
          </Card>
        ))
      )}

      <Row style={{ justifyContent: "space-between", marginBottom: 8, marginTop: 12 }}>
        <Txt variant="subtitle">{t("Recent smart alerts")}</Txt>
        {hits.length > 0 && (
          <Pressable
            onPress={() => {
              void clearHits().then(() => refresh(user));
            }}
          >
            <Txt variant="small" color={p.muted}>
              {t("Clear")}
            </Txt>
          </Pressable>
        )}
      </Row>
      {hits.length === 0 ? (
        <EmptyState
          title={t("Nothing fired yet")}
          hint={t("When a rule fires, it shows up here.")}
        />
      ) : (
        hits.slice(0, 20).map((h) => (
          <Card key={h.id} style={{ marginBottom: 10 }}>
            <Row style={{ gap: 10 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: KIND_TONE[h.kind],
                  marginTop: 6,
                }}
              />
              <View style={{ flex: 1 }}>
                <Txt variant="body">{h.message}</Txt>
                <Txt variant="small" color={p.muted} style={{ marginTop: 2 }}>
                  {h.ruleName} · {formatRelative(h.at, t)}
                </Txt>
              </View>
            </Row>
          </Card>
        ))
      )}
      <View style={{ height: 8 }} />
    </ScrollView>
  );
}
