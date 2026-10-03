import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Clock, Moon, Trash2, Zap } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AppHeader,
  Button,
  Card,
  EmptyState,
  Field,
  LoadingView,
  Rise,
  Segmented,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import type { TraccarNotification } from "@w3ctrl/api";
import {
  useCreateNotification,
  useDeleteNotification,
  useNotifications,
} from "../api/hooks";
import type { RootNav } from "../navigation/types";

type WhenKind = "schedule" | "event";
type ThenAction = "nightArm" | "nightDisarm" | "digest";

interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  when: { kind: WhenKind; time?: string; days?: number[]; eventType?: string };
  then: { action: ThenAction; note?: string };
}

const RULES_KEY = "w3ctrl-rules";
const NIGHT_SCHEDULE_KEY = "w3ctrl-night-schedule";
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EVENT_OPTIONS: { value: string; label: string }[] = [
  { value: "ignitionOn", label: "Ignition on" },
  { value: "geofenceExit", label: "Geofence exit" },
  { value: "overspeed", label: "Overspeed" },
  { value: "alarm", label: "Alarm (shock / SOS)" },
];

const THEN_OPTIONS: { value: ThenAction; label: string }[] = [
  { value: "nightArm", label: "Arm night mode" },
  { value: "nightDisarm", label: "Disarm night mode" },
  { value: "digest", label: "Note to self" },
];

/** The notification bundle that "night mode" arms. */
const NIGHT_DEFS = [
  { type: "ignitionOn", attributes: { nightMode: "1" } },
  { type: "geofenceExit", attributes: { nightMode: "1" } },
  { type: "alarm", attributes: { nightMode: "1", alarms: "shock,sos" } },
];

function isNightNotification(n: TraccarNotification): boolean {
  return n.attributes?.nightMode === "1";
}

export default function AutomationScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<RootNav>();

  const [booting, setBooting] = useState(true);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [schedule, setSchedule] = useState({ start: "23:00", end: "06:00" });
  const [nightBusy, setNightBusy] = useState(false);
  const [nightError, setNightError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [whenKind, setWhenKind] = useState<WhenKind>("schedule");
  const [time, setTime] = useState("23:00");
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [eventType, setEventType] = useState("ignitionOn");
  const [thenAction, setThenAction] = useState<ThenAction>("nightArm");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const notificationsQ = useNotifications();
  const createNotification = useCreateNotification();
  const deleteNotification = useDeleteNotification();

  /* load rules + night schedule */
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RULES_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as AutomationRule[];
          setRules(parsed.map((r) => ({ ...r, enabled: r.enabled ?? false })));
        }
        const sched = await AsyncStorage.getItem(NIGHT_SCHEDULE_KEY);
        if (sched) {
          const parsed = JSON.parse(sched) as { start?: string; end?: string };
          setSchedule({
            start: parsed.start ?? "23:00",
            end: parsed.end ?? "06:00",
          });
        }
      } catch {
        /* corrupt storage — keep defaults */
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  async function persistRules(next: AutomationRule[]) {
    setRules(next);
    try {
      await AsyncStorage.setItem(RULES_KEY, JSON.stringify(next));
    } catch {
      /* non-fatal */
    }
  }

  async function persistSchedule(next: { start: string; end: string }) {
    setSchedule(next);
    try {
      await AsyncStorage.setItem(NIGHT_SCHEDULE_KEY, JSON.stringify(next));
    } catch {
      /* non-fatal */
    }
  }

  const nightArmed = (notificationsQ.data ?? []).some(isNightNotification);

  async function armNightMode() {
    if ((notificationsQ.data ?? []).some(isNightNotification)) return;
    setNightBusy(true);
    setNightError(null);
    try {
      for (const def of NIGHT_DEFS) {
        await createNotification.mutateAsync({
          type: def.type,
          notificators: "web,mail",
          attributes: def.attributes,
        });
      }
    } catch {
      setNightError(t("Could not arm night mode. Please try again."));
    } finally {
      setNightBusy(false);
    }
  }

  async function disarmNightMode() {
    setNightBusy(true);
    setNightError(null);
    try {
      const night = (notificationsQ.data ?? []).filter(isNightNotification);
      for (const n of night) {
        await deleteNotification.mutateAsync(n.id);
      }
    } catch {
      setNightError(t("Could not disarm night mode. Please try again."));
    } finally {
      setNightBusy(false);
    }
  }

  async function toggleRule(rule: AutomationRule) {
    const next = !rule.enabled;
    const updated = rules.map((r) =>
      r.id === rule.id ? { ...r, enabled: next } : r,
    );
    await persistRules(updated);
    if (rule.then.action === "nightArm") {
      if (next) {
        await armNightMode();
      } else {
        const othersStillArmed = updated.some(
          (r) => r.enabled && r.then.action === "nightArm",
        );
        if (!othersStillArmed) await disarmNightMode();
      }
    }
  }

  function confirmDeleteRule(rule: AutomationRule) {
    Alert.alert(t("Delete rule"), t(`Delete "${rule.name}"?`), [
      { text: t("Cancel"), style: "cancel" },
      {
        text: t("Delete"),
        style: "destructive",
        onPress: () => {
          void persistRules(rules.filter((r) => r.id !== rule.id));
        },
      },
    ]);
  }

  function toggleDay(d: number) {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    );
  }

  function whenSummary(r: AutomationRule): string {
    if (r.when.kind === "event") {
      const lbl =
        EVENT_OPTIONS.find((o) => o.value === r.when.eventType)?.label ??
        r.when.eventType ??
        "";
      return `${t("When")} ${t(lbl)}`;
    }
    const d = (r.when.days ?? []).slice().sort((a, b) => a - b);
    const dayStr =
      d.length === 7 ? t("Daily") : d.map((x) => DAY_LABELS[x] ?? "").join(", ");
    return `${dayStr} · ${r.when.time ?? ""}`;
  }

  function thenSummary(r: AutomationRule): string {
    const lbl =
      THEN_OPTIONS.find((o) => o.value === r.then.action)?.label ?? r.then.action;
    return `${t("Then")} ${t(lbl)}`;
  }

  async function saveRule() {
    setFormError(null);
    if (!name.trim()) {
      setFormError(t("Give the rule a name."));
      return;
    }
    if (whenKind === "schedule" && !/^\d{1,2}:\d{2}$/.test(time.trim())) {
      setFormError(t("Enter a time like 23:00."));
      return;
    }
    const rule: AutomationRule = {
      id: `rule-${Date.now()}`,
      name: name.trim(),
      enabled: true,
      when:
        whenKind === "schedule"
          ? { kind: "schedule", time: time.trim(), days }
          : { kind: "event", eventType },
      then: {
        action: thenAction,
        ...(thenAction === "digest" && note.trim()
          ? { note: note.trim() }
          : {}),
      },
    };
    const next = [...rules, rule];
    await persistRules(next);
    if (thenAction === "nightArm") {
      await armNightMode();
    }
    setName("");
    setTime("23:00");
    setDays([0, 1, 2, 3, 4, 5, 6]);
    setEventType("ignitionOn");
    setThenAction("nightArm");
    setNote("");
    setFormOpen(false);
  }

  const enabledCount = rules.filter((r) => r.enabled).length;

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <AppHeader
        title={t("Automation")}
        subtitle={`${rules.length} ${t("rules")} · ${enabledCount} ${t("active")}`}
        onBack={() => navigation.goBack()}
      />
      {booting ? (
        <LoadingView text={t("Loading rules…")} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* night mode status */}
          <Rise delay={0}>
            <Card style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: p.brandSoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Moon size={20} color={p.brandInk} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="body" style={{ fontWeight: "700" }}>
                    {t("Night mode")}
                  </Txt>
                  <Txt variant="small" color={p.muted} style={{ marginTop: 2 }}>
                    {nightArmed
                      ? t("Armed — ignition, geofence & shock alerts on")
                      : t("Disarmed")}
                  </Txt>
                </View>
                {nightBusy ? (
                  <ActivityIndicator size="small" color={p.brand} />
                ) : (
                  <Button
                    title={nightArmed ? t("Disarm") : t("Arm")}
                    kind={nightArmed ? "secondary" : "primary"}
                    onPress={() =>
                      nightArmed ? disarmNightMode() : armNightMode()
                    }
                    style={{ paddingVertical: 10, paddingHorizontal: 18 }}
                  />
                )}
              </View>
              {nightError ? (
                <Txt variant="small" color={p.alert} style={{ marginTop: 10 }}>
                  {nightError}
                </Txt>
              ) : null}
            </Card>
          </Rise>

          {/* night schedule */}
          <Rise delay={60}>
            <Card style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: p.surface3,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Clock size={20} color={p.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="body" style={{ fontWeight: "700" }}>
                    {t("Night schedule")}
                  </Txt>
                  <Txt variant="small" color={p.muted} style={{ marginTop: 2 }}>
                    {t("Shared by night rules")}
                  </Txt>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label={t("Start")}
                    value={schedule.start}
                    onChangeText={(v) => persistSchedule({ ...schedule, start: v })}
                    placeholder="23:00"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label={t("End")}
                    value={schedule.end}
                    onChangeText={(v) => persistSchedule({ ...schedule, end: v })}
                    placeholder="06:00"
                  />
                </View>
              </View>
            </Card>
          </Rise>

          {/* rules list */}
          {rules.map((r, i) => (
            <Rise key={r.id} delay={Math.min(i, 6) * 60}>
              <Card
                style={{
                  marginBottom: 12,
                  opacity: r.enabled ? 1 : 0.72,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: r.enabled ? p.brandSoft : p.surface3,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Zap size={20} color={r.enabled ? p.brandInk : p.muted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="body" style={{ fontWeight: "700" }}>
                      {r.name}
                    </Txt>
                    <Txt
                      variant="small"
                      color={p.muted}
                      style={{ marginTop: 4, lineHeight: 18 }}
                    >
                      {whenSummary(r)}
                      {"\n"}
                      {thenSummary(r)}
                      {r.then.note ? `\n${r.then.note}` : ""}
                    </Txt>
                  </View>
                  <Switch
                    value={r.enabled}
                    onValueChange={() => toggleRule(r)}
                    trackColor={{ true: p.brand, false: p.surface3 }}
                  />
                  <Pressable
                    onPress={() => confirmDeleteRule(r)}
                    hitSlop={10}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      backgroundColor: p.alertSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Trash2 size={15} color={p.alert} />
                  </Pressable>
                </View>
              </Card>
            </Rise>
          ))}

          {rules.length === 0 ? (
            <EmptyState
              title={t("No rules yet")}
              hint={t("Build if-this-then-that rules for your fleet.")}
            />
          ) : null}

          {/* add-rule form */}
          {formOpen ? (
            <Rise delay={0}>
              <Card>
                <Txt variant="subtitle" style={{ marginBottom: 12 }}>
                  {t("New rule")}
                </Txt>
                <Field
                  label={t("Name")}
                  value={name}
                  onChangeText={setName}
                  placeholder={t("Night lockdown")}
                  autoCapitalize="words"
                />
                <Txt
                  variant="small"
                  color={p.muted}
                  style={{ fontWeight: "700", marginBottom: 8 }}
                >
                  {t("WHEN")}
                </Txt>
                <View style={{ marginBottom: 12 }}>
                  <Segmented<WhenKind>
                    options={[
                      { value: "schedule", label: t("Schedule") },
                      { value: "event", label: t("Event") },
                    ]}
                    value={whenKind}
                    onChange={setWhenKind}
                  />
                </View>
                {whenKind === "schedule" ? (
                  <>
                    <Field
                      label={t("Time")}
                      value={time}
                      onChangeText={setTime}
                      placeholder="23:00"
                      hint={t("24-hour format")}
                    />
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 6,
                        marginBottom: 14,
                      }}
                    >
                      {DAY_LABELS.map((label, d) => {
                        const on = days.includes(d);
                        return (
                          <Pressable
                            key={label}
                            onPress={() => toggleDay(d)}
                            style={{
                              flex: 1,
                              alignItems: "center",
                              paddingVertical: 9,
                              borderRadius: 10,
                              backgroundColor: on ? p.ink : p.surface2,
                            }}
                          >
                            <Txt
                              variant="small"
                              color={on ? "#fff" : p.ink}
                              style={{ fontWeight: "700" }}
                            >
                              {label[0]}
                            </Txt>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingRight: 16 }}
                    style={{ marginBottom: 14 }}
                  >
                    {EVENT_OPTIONS.map((o) => {
                      const active = o.value === eventType;
                      return (
                        <Pressable
                          key={o.value}
                          onPress={() => setEventType(o.value)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: active ? p.brand : p.line,
                            backgroundColor: active ? p.brandSoft : p.surface,
                          }}
                        >
                          <Txt
                            variant="body"
                            color={active ? p.brandInk : p.ink}
                            style={active ? { fontWeight: "700" } : undefined}
                          >
                            {t(o.label)}
                          </Txt>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
                <Txt
                  variant="small"
                  color={p.muted}
                  style={{ fontWeight: "700", marginBottom: 8 }}
                >
                  {t("THEN")}
                </Txt>
                <View style={{ marginBottom: 12 }}>
                  <Segmented<ThenAction>
                    options={THEN_OPTIONS.map((o) => ({
                      value: o.value,
                      label: t(o.label),
                    }))}
                    value={thenAction}
                    onChange={setThenAction}
                  />
                </View>
                {thenAction === "digest" ? (
                  <Field
                    label={t("Note")}
                    value={note}
                    onChangeText={setNote}
                    placeholder={t("Check parking lot before sleeping")}
                  />
                ) : null}
                {formError ? (
                  <Txt variant="small" color={p.alert} style={{ marginBottom: 12 }}>
                    {formError}
                  </Txt>
                ) : null}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Button title={t("Save rule")} onPress={saveRule} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      title={t("Cancel")}
                      kind="secondary"
                      onPress={() => {
                        setFormOpen(false);
                        setFormError(null);
                      }}
                    />
                  </View>
                </View>
              </Card>
            </Rise>
          ) : (
            <Rise delay={0}>
              <Button title={t("New rule")} onPress={() => setFormOpen(true)} />
            </Rise>
          )}

          <Txt
            variant="small"
            color={p.muted}
            style={{ textAlign: "center", marginTop: 16, lineHeight: 18 }}
          >
            {t(
              "Schedules and notes live on this phone and act while the app runs. Night mode arms real server alerts — it works even when the app is closed.",
            )}
          </Txt>
          <View style={{ height: 8 }} />
        </ScrollView>
      )}
    </View>
  );
}
