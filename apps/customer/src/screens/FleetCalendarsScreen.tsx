import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { CalendarDays, Plus, Trash2 } from "lucide-react-native";
import {
  AppHeader,
  Button,
  Card,
  EmptyState,
  Field,
  LoadingView,
  Rise,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import {
  useCalendars,
  useCreateCalendar,
  useDeleteCalendar,
} from "../api/hooks";
import type { RootNav } from "../navigation/types";

const DAY_CODES = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;
type DayCode = (typeof DAY_CODES)[number];

function dayLabel(code: string, t: (k: string) => string): string {
  const labels: Record<string, string> = {
    MO: t("Mon"),
    TU: t("Tue"),
    WE: t("Wed"),
    TH: t("Thu"),
    FR: t("Fri"),
    SA: t("Sat"),
    SU: t("Sun"),
  };
  return labels[code] ?? code;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Build a minimal weekly iCalendar event from the schedule form. */
function buildICal(days: DayCode[], start: string, end: string): string {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}T${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}${pad2(now.getUTCSeconds())}Z`;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const y = now.getFullYear();
  const m = pad2(now.getMonth() + 1);
  const d = pad2(now.getDate());
  const dtstart = `${y}${m}${d}T${pad2(sh)}${pad2(sm)}00`;
  // Overnight windows (e.g. 23:00–06:00) end the next day.
  const endDay = new Date(now);
  if (eh < sh || (eh === sh && em <= sm)) endDay.setDate(endDay.getDate() + 1);
  const dtend = `${endDay.getFullYear()}${pad2(endDay.getMonth() + 1)}${pad2(endDay.getDate())}T${pad2(eh)}${pad2(em)}00`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//W3ctrl//Fleet Calendar//EN",
    "BEGIN:VEVENT",
    `UID:${now.getTime()}-w3ctrl@w3ctrl`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${days.join(",")}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Human summary parsed back out of stored iCalendar data. */
function describeSchedule(
  data: string | undefined,
  t: (k: string) => string,
): string | undefined {
  if (!data) return undefined;
  const byday = /BYDAY=([A-Z,]+)/.exec(data)?.[1];
  const dtstart = /DTSTART:(\d{8}T\d{6})/.exec(data)?.[1];
  const dtend = /DTEND:(\d{8}T\d{6})/.exec(data)?.[1];
  const parts: string[] = [];
  if (byday) parts.push(byday.split(",").map((c) => dayLabel(c, t)).join(" "));
  const fmt = (s: string | undefined) =>
    s ? `${s.slice(9, 11)}:${s.slice(11, 13)}` : undefined;
  const s = fmt(dtstart);
  const e = fmt(dtend);
  if (s && e) parts.push(`${s} – ${e}`);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function CalendarRow({
  name,
  data,
  index,
  onDelete,
}: {
  name: string;
  data?: string;
  index: number;
  onDelete: () => void;
}) {
  const p = useTheme();
  const t = useT();
  const summary = describeSchedule(data, t);
  return (
    <Rise delay={Math.min(index, 8) * 60}>
      <Card style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              backgroundColor: p.brandSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CalendarDays size={20} color={p.brandInk} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="subtitle" style={{ fontWeight: "700" }}>
              {name}
            </Txt>
            {summary ? (
              <Txt variant="small" color={p.muted} style={{ marginTop: 2 }}>
                {summary}
              </Txt>
            ) : null}
          </View>
          <Pressable
            onPress={onDelete}
            hitSlop={10}
            accessibilityLabel={t("Delete calendar")}
            style={{ padding: 6 }}
          >
            <Trash2 size={18} color={p.alert} />
          </Pressable>
        </View>
      </Card>
    </Rise>
  );
}

export default function FleetCalendarsScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<RootNav>();
  const { data, isLoading, isRefetching, refetch, isError } = useCalendars();
  const createCalendar = useCreateCalendar();
  const deleteCalendar = useDeleteCalendar();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [days, setDays] = useState<DayCode[]>(["MO", "TU", "WE", "TH", "FR"]);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [formError, setFormError] = useState<string | null>(null);

  const toggleDay = (code: DayCode) =>
    setDays((prev) =>
      prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code],
    );

  const resetForm = () => {
    setAdding(false);
    setName("");
    setDays(["MO", "TU", "WE", "TH", "FR"]);
    setStart("09:00");
    setEnd("18:00");
    setFormError(null);
  };

  const handleCreate = () => {
    if (!name.trim()) {
      setFormError(t("Name is required."));
      return;
    }
    if (days.length === 0) {
      setFormError(t("Pick at least one day."));
      return;
    }
    if (!TIME_RE.test(start) || !TIME_RE.test(end)) {
      setFormError(t("Times must look like 09:00 and 18:00."));
      return;
    }
    setFormError(null);
    const ordered = [...DAY_CODES].filter((c) => days.includes(c));
    const data = buildICal(ordered, start, end);
    createCalendar.mutate(
      { name: name.trim(), data },
      {
        onSuccess: resetForm,
        onError: (e) =>
          setFormError(
            e instanceof Error ? e.message : t("Couldn't add the calendar."),
          ),
      },
    );
  };

  const handleDelete = (id: number, calName: string) => {
    Alert.alert(t("Delete calendar"), `${t("Remove")} ${calName}?`, [
      { text: t("Cancel"), style: "cancel" },
      {
        text: t("Delete"),
        style: "destructive",
        onPress: () =>
          deleteCalendar.mutate(id, {
            onError: (e) =>
              Alert.alert(
                t("Couldn't delete"),
                e instanceof Error ? e.message : "",
              ),
          }),
      },
    ]);
  };

  if (isLoading && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: p.paper }}>
        <AppHeader
          title={t("Calendars")}
          subtitle={t("Shifts & quiet hours")}
          onBack={() => navigation.goBack()}
        />
        <LoadingView text={t("Loading calendars…")} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <AppHeader
        title={t("Calendars")}
        subtitle={
          data && data.length > 0
            ? `${data.length} ${t("calendars")}`
            : undefined
        }
        onBack={() => navigation.goBack()}
        right={
          <Pressable
            onPress={() => setAdding((a) => !a)}
            hitSlop={12}
            accessibilityLabel={t("Add calendar")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: p.brand,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Plus size={15} color="#181200" />
            <Txt variant="small" style={{ fontWeight: "700", color: "#181200" }}>
              {t("Add")}
            </Txt>
          </Pressable>
        }
      />
      <FlatList
        data={data ?? []}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ paddingBottom: 96 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={p.brand}
          />
        }
        ListHeaderComponent={
          <>
            {adding ? (
              <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                <Card>
                  <Field
                    label={t("Name")}
                    value={name}
                    onChangeText={setName}
                    placeholder={t("e.g. Office hours")}
                    autoCapitalize="words"
                  />
                  <Txt
                    variant="small"
                    style={{ fontWeight: "700", marginBottom: 8 }}
                  >
                    {t("Days")}
                  </Txt>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    {DAY_CODES.map((code) => {
                      const on = days.includes(code);
                      return (
                        <Pressable
                          key={code}
                          onPress={() => toggleDay(code)}
                          style={{
                            borderRadius: 999,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            backgroundColor: on ? p.brandSoft : p.surface,
                            borderWidth: 1,
                            borderColor: on ? p.brand : p.line,
                          }}
                        >
                          <Txt
                            variant="small"
                            style={{
                              fontWeight: "700",
                              color: on ? p.brandInk : p.ink2,
                            }}
                          >
                            {dayLabel(code, t)}
                          </Txt>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Field
                        label={t("Start")}
                        value={start}
                        onChangeText={setStart}
                        placeholder="09:00"
                        hint={t("HH:MM, 24-hour")}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field
                        label={t("End")}
                        value={end}
                        onChangeText={setEnd}
                        placeholder="18:00"
                        hint={t("HH:MM, 24-hour")}
                      />
                    </View>
                  </View>
                  {formError ? (
                    <Txt
                      variant="small"
                      color={p.alert}
                      style={{ marginBottom: 8 }}
                    >
                      {formError}
                    </Txt>
                  ) : null}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Button
                        title={t("Add calendar")}
                        onPress={handleCreate}
                        loading={createCalendar.isPending}
                        disabled={!name.trim()}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button
                        title={t("Cancel")}
                        kind="secondary"
                        onPress={resetForm}
                      />
                    </View>
                  </View>
                </Card>
              </View>
            ) : null}
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: adding ? 0 : 12,
                paddingBottom: 12,
              }}
            >
              <Txt variant="small" color={p.muted}>
                {t(
                  "Calendars pause alerts & automations outside these hours — they never block position storage.",
                )}
              </Txt>
            </View>
            {isError && !data ? (
              <EmptyState
                title={t("Couldn't load calendars")}
                hint={t("Pull to refresh or try again later.")}
              />
            ) : !data || data.length === 0 ? (
              <EmptyState
                title={t("No calendars yet")}
                hint={t("Add a weekly schedule, e.g. office hours, so alerts and automations only fire when they should.")}
              />
            ) : null}
          </>
        }
        ListHeaderComponentStyle={{ paddingBottom: 4 }}
        renderItem={({ item, index }) => (
          <View style={{ paddingHorizontal: 16 }}>
            <CalendarRow
              name={item.name}
              data={item.data}
              index={index}
              onDelete={() => handleDelete(item.id, item.name)}
            />
          </View>
        )}
      />
    </View>
  );
}
