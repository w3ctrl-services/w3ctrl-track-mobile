import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Share, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Download } from "lucide-react-native";
import {
  AdSlider,
  AppHeader,
  Card,
  LoadingView,
  Rise,
  Row,
  Segmented,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { eventLabel, knotsToKmh } from "@w3ctrl/api";
import { useDevices, useEvents, useSummary, useTrips } from "../api/hooks";
import {
  formatDuration,
  formatKm,
  monthStart,
  startOfDay,
  weekStart,
} from "../utils/format";
import TripRow from "../components/TripRow";
import type { RootNav } from "../navigation/types";

/** Timeline event dot — matches the web prototype's blue. */
const EVENT_BLUE = "#175cd3";

type Period = "today" | "week" | "month";

function periodRange(period: Period): { from: string; to: string } {
  const to = new Date().toISOString();
  if (period === "today") return { from: startOfDay().toISOString(), to };
  if (period === "week") return { from: weekStart().toISOString(), to };
  return { from: monthStart().toISOString(), to };
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function StatCard({ label, value }: { label: string; value: string }) {
  const p = useTheme();
  return (
    <Card style={{ flex: 1, minWidth: "46%" }}>
      <Txt variant="title">{value}</Txt>
      <Txt variant="caption" color={p.muted} style={{ marginTop: 4 }}>
        {label}
      </Txt>
    </Card>
  );
}

interface TimelineItem {
  key: string;
  time: string;
  kind: "position" | "event";
  title: string;
  detail: string;
}

export default function ReportsScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<RootNav>();
  const { data: devices } = useDevices();

  const [deviceId, setDeviceId] = useState<number | null>(null);
  const [period, setPeriod] = useState<Period>("today");

  useEffect(() => {
    if (deviceId == null && devices && devices.length > 0) {
      setDeviceId(devices[0].id);
    }
  }, [devices, deviceId]);

  const { from, to } = useMemo(() => periodRange(period), [period]);
  const { data: summary } = useSummary(deviceId != null ? [deviceId] : [], from, to);
  const { data: trips, isLoading: tripsLoading } = useTrips(deviceId ?? undefined, from, to);
  const days = period === "today" ? 1 : period === "week" ? 7 : 30;
  const { data: events } = useEvents(deviceId ?? undefined, days);

  const s = summary?.[0];
  const deviceName = (devices ?? []).find((d) => d.id === deviceId)?.name;
  const periodLabel =
    period === "today" ? t("Today") : period === "week" ? t("This week") : t("This month");

  /* Combined feed: trips (orange "position" dots) interleaved with events
     (blue "event" dots), newest first. */
  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    (trips ?? []).forEach((trip, i) => {
      const start = new Date(trip.startTime);
      items.push({
        key: `trip-${trip.startTime}-${i}`,
        time: trip.startTime,
        kind: "position",
        title: `${fmtTime(start)} · ${t("Trip")} — ${formatKm(trip.distance)} km`,
        detail: `${formatDuration(trip.duration, t)} · ${t("Avg speed")}: ${Math.round(
          knotsToKmh(trip.averageSpeed),
        )} km/h`,
      });
    });
    (events ?? []).forEach((e) => {
      const start = new Date(e.eventTime);
      const dev = (devices ?? []).find((d) => d.id === e.deviceId);
      items.push({
        key: `event-${e.id}`,
        time: e.eventTime,
        kind: "event",
        title: `${fmtTime(start)} · ${eventLabel(e)}`,
        detail: dev?.name ?? "",
      });
    });
    return items.sort((a, b) => +new Date(b.time) - +new Date(a.time));
  }, [trips, events, devices, t]);

  const preview = timeline.slice(0, 12);

  /* One-tap CSV export: the orange CTA the redesign calls for shares the
     combined report as CSV via the OS sheet. */
  function exportCsv() {
    const rows: string[][] = [["time", "kind", "device", "title", "detail"]];
    timeline.forEach((it) =>
      rows.push([
        new Date(it.time).toLocaleString(),
        it.kind,
        deviceName ?? "",
        it.title,
        it.detail,
      ]),
    );
    const csv = rows
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    Share.share({ message: csv, title: t("Reports") }).catch(() => {});
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <AppHeader
        title={t("Reports")}
        subtitle={`${deviceName ?? t("All devices")} · ${periodLabel}`}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Rise delay={0}>
          <Txt variant="small" color={p.muted} style={{ marginBottom: 8 }}>
            {t("Devices")}
          </Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <Row style={{ gap: 8, paddingRight: 16 }}>
              {(devices ?? []).map((d) => {
                const active = d.id === deviceId;
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => setDeviceId(d.id)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: active ? p.brand : p.surface,
                      borderWidth: 1,
                      borderColor: active ? p.brand : p.line,
                    }}
                  >
                    <Txt
                      variant="small"
                      style={{
                        color: active ? "#181200" : p.ink2,
                        fontWeight: active ? "700" : "500",
                      }}
                    >
                      {d.name}
                    </Txt>
                  </Pressable>
                );
              })}
            </Row>
          </ScrollView>
        </Rise>

        <Rise delay={60}>
          <Segmented<Period>
            options={[
              { value: "today", label: t("Today") },
              { value: "week", label: t("This week") },
              { value: "month", label: t("This month") },
            ]}
            value={period}
            onChange={setPeriod}
          />
          <View style={{ height: 16 }} />
        </Rise>

        <Rise delay={120}>
          <Card style={{ marginBottom: 16 }}>
            <Txt variant="subtitle" style={{ marginBottom: 16 }}>
              {t("Combined")}
            </Txt>
            {preview.length === 0 ? (
              <Txt variant="small" color={p.muted}>
                {t("No activity in this period.")}
              </Txt>
            ) : (
              preview.map((it, i) => {
                const dot = it.kind === "event" ? EVENT_BLUE : p.brand;
                const last = i === preview.length - 1;
                return (
                  <View key={it.key} style={{ position: "relative", paddingLeft: 28 }}>
                    {!last ? (
                      <View
                        style={{
                          position: "absolute",
                          left: 8,
                          top: 18,
                          bottom: 0,
                          width: 2,
                          backgroundColor: p.line,
                        }}
                      />
                    ) : null}
                    <View
                      style={{
                        position: "absolute",
                        left: 2,
                        top: 4,
                        width: 14,
                        height: 14,
                        borderRadius: 7,
                        backgroundColor: dot,
                        borderWidth: 3,
                        borderColor: "#ffffff",
                        shadowColor: dot,
                        shadowOpacity: 0.9,
                        shadowRadius: 0,
                        shadowOffset: { width: 0, height: 0 },
                        elevation: 0,
                      }}
                    />
                    <View style={{ paddingBottom: last ? 0 : 18 }}>
                      <Txt variant="small" style={{ fontWeight: "600", fontSize: 13.5 }}>
                        {it.title}
                      </Txt>
                      {it.detail ? (
                        <Txt variant="caption" color={p.muted} style={{ marginTop: 3 }}>
                          {it.detail}
                        </Txt>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </Card>
        </Rise>

        <Rise delay={180}>
          <Pressable
            onPress={exportCsv}
            style={({ pressed }) => [
              {
                backgroundColor: p.brand,
                borderRadius: 16,
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: pressed ? 0.85 : 1,
                marginBottom: 16,
              },
            ]}
          >
            <Download color="#181200" size={18} />
            <Txt style={{ color: "#181200", fontWeight: "600", fontSize: 16 }}>
              {t("Export CSV")}
            </Txt>
          </Pressable>
        </Rise>

        <Rise delay={240}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <StatCard label={t("Distance")} value={`${formatKm(s?.distance ?? 0)} km`} />
            <StatCard
              label={t("Top speed")}
              value={`${Math.round(knotsToKmh(s?.maxSpeed ?? 0))} km/h`}
            />
            <StatCard
              label={t("Engine hours")}
              value={`${(s?.engineHours ?? 0).toFixed(1)} h`}
            />
            <StatCard label={t("Trips")} value={String(trips?.length ?? 0)} />
          </View>
        </Rise>

        <Rise delay={300}>
          <Txt variant="subtitle" style={{ marginBottom: 8 }}>
            {t("Trip history")}
          </Txt>
          {tripsLoading ? (
            <LoadingView />
          ) : (
            (trips ?? []).map((trip, i) => (
              <TripRow
                key={`${trip.startTime}-${i}`}
                trip={trip}
                onReplay={
                  deviceId != null
                    ? () =>
                        navigation.navigate("TripReplay", {
                          deviceId,
                          from,
                          to,
                          tripIndex: i,
                        })
                    : undefined
                }
              />
            ))
          )}
          <View style={{ height: 8 }} />
        </Rise>

        <Rise delay={360}>
          <AdSlider />
        </Rise>
      </ScrollView>
    </View>
  );
}
