import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQueries } from "@tanstack/react-query";
import { Play } from "lucide-react-native";
import {
  AppHeader,
  Badge,
  Card,
  Divider,
  EmptyState,
  LoadingView,
  Rise,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { knotsToKmh, traccar, type TraccarTrip } from "@w3ctrl/api";
import { useDevices } from "../api/hooks";
import { formatDuration, formatKm } from "../utils/format";
import type { RootNav } from "../navigation/types";

type RangeKey = "today" | "yesterday" | "week";

function rangeFor(key: RangeKey): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (key === "today") {
    end.setHours(23, 59, 59, 999);
  } else if (key === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
  } else {
    start.setDate(start.getDate() - 6);
    end.setHours(23, 59, 59, 999);
  }
  return { from: start.toISOString(), to: end.toISOString() };
}

function timeOf(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function TripCard({
  trip,
  deviceName,
  index,
  onOpen,
}: {
  trip: TraccarTrip;
  deviceName: string;
  index: number;
  onOpen: () => void;
}) {
  const p = useTheme();
  const t = useT();
  return (
    <Rise delay={Math.min(index, 8) * 60}>
      <Card onPress={onOpen} style={{ marginBottom: 12 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <Txt variant="subtitle" style={{ fontWeight: "800" }} numberOfLines={2}>
              {trip.startAddress || t("Trip")} → {trip.endAddress || t("Trip")}
            </Txt>
            <Txt variant="small" color={p.muted} style={{ marginTop: 4 }}>
              {deviceName} · {timeOf(trip.startTime)} – {timeOf(trip.endTime)}
            </Txt>
          </View>
          <Badge text={`${formatKm(trip.distance)} ${t("km")}`} tone="brand" />
        </View>
        <Divider />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Txt variant="small" color={p.muted}>
            {formatDuration(trip.duration, t)} · {t("top")}{" "}
            <Txt variant="small" style={{ fontWeight: "700" }}>
              {Math.round(knotsToKmh(trip.maxSpeed))} {t("km/h")}
            </Txt>
          </Txt>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: p.ink,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            <Play size={13} color="#ffffff" />
            <Txt variant="small" style={{ color: "#ffffff", fontWeight: "700" }}>
              {t("Replay")}
            </Txt>
          </View>
        </View>
      </Card>
    </Rise>
  );
}

export default function TripsScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<RootNav>();
  const [rangeKey, setRangeKey] = useState<RangeKey>("today");
  const [selectedDevice, setSelectedDevice] = useState<number | "all">("all");

  const range = useMemo(() => rangeFor(rangeKey), [rangeKey]);
  const { data: devices, isLoading: devicesLoading } = useDevices();

  const targetIds = useMemo(() => {
    if (!devices || devices.length === 0) return [];
    if (selectedDevice === "all") return devices.map((d) => d.id);
    return [selectedDevice];
  }, [devices, selectedDevice]);

  const tripQueries = useQueries({
    queries: targetIds.map((deviceId) => ({
      queryKey: ["trips", deviceId, range.from, range.to] as const,
      queryFn: () => traccar.tripsReport(deviceId, range.from, range.to),
    })),
  });

  const tripsLoading = tripQueries.some((q) => q.isLoading);
  const tripsError = tripQueries.find((q) => q.isError)?.error;

  const allTrips = useMemo(() => {
    const rows: {
      trip: TraccarTrip;
      deviceId: number;
      deviceName: string;
      tripIndex: number;
    }[] = [];
    tripQueries.forEach((q, qi) => {
      const deviceId = targetIds[qi];
      const deviceName =
        devices?.find((d) => d.id === deviceId)?.name ?? t("Vehicle");
      (q.data ?? []).forEach((trip, i) => {
        rows.push({ trip, deviceId, deviceName, tripIndex: i });
      });
    });
    rows.sort(
      (a, b) =>
        new Date(b.trip.startTime).getTime() -
        new Date(a.trip.startTime).getTime(),
    );
    return rows;
  }, [tripQueries, targetIds, devices, t]);

  const totalKm = useMemo(
    () => allTrips.reduce((s, r) => s + r.trip.distance, 0),
    [allTrips],
  );

  const headerSubtitle =
    allTrips.length > 0
      ? `${allTrips.length} ${t("trips")} · ${formatKm(totalKm)} ${t("km")}`
      : undefined;

  const dateChips: { key: RangeKey; label: string }[] = [
    { key: "today", label: t("Today") },
    { key: "yesterday", label: t("Yesterday") },
    { key: "week", label: t("Last 7 days") },
  ];

  const loading = devicesLoading || (tripsLoading && allTrips.length === 0);

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <AppHeader
        title={t("Trips")}
        subtitle={headerSubtitle}
        onBack={() => navigation.goBack()}
      />
      {loading ? (
        <LoadingView text={t("Loading trips…")} />
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              gap: 8,
              alignItems: "center",
            }}
            style={{ maxHeight: 60, flexGrow: 0 }}
          >
            {dateChips.map((c) => {
              const on = rangeKey === c.key;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => setRangeKey(c.key)}
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    backgroundColor: on ? p.ink : p.surface,
                    borderWidth: 1,
                    borderColor: on ? p.ink : p.line,
                  }}
                >
                  <Txt
                    variant="small"
                    style={{ fontWeight: "700", color: on ? "#ffffff" : p.ink2 }}
                  >
                    {c.label}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              gap: 8,
              alignItems: "center",
            }}
            style={{ maxHeight: 60, flexGrow: 0 }}
          >
            <Pressable
              onPress={() => setSelectedDevice("all")}
              style={{
                borderRadius: 999,
                paddingHorizontal: 14,
                paddingVertical: 8,
                backgroundColor:
                  selectedDevice === "all" ? p.brandSoft : p.surface,
                borderWidth: 1,
                borderColor: selectedDevice === "all" ? p.brand : p.line,
              }}
            >
              <Txt
                variant="small"
                style={{
                  fontWeight: "700",
                  color: selectedDevice === "all" ? p.brandInk : p.ink2,
                }}
              >
                {t("All vehicles")}
              </Txt>
            </Pressable>
            {(devices ?? []).map((d) => {
              const on = selectedDevice === d.id;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => setSelectedDevice(d.id)}
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 14,
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
                    {d.name}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>
          {tripsError && allTrips.length === 0 ? (
            <EmptyState
              title={t("Couldn't load trips")}
              hint={t("Pull to refresh or try again later.")}
            />
          ) : allTrips.length === 0 ? (
            <EmptyState
              title={t("No trips in this period.")}
              hint={t("Try a different date or vehicle.")}
            />
          ) : (
            <FlatList
              data={allTrips}
              keyExtractor={(r) => `${r.deviceId}-${r.tripIndex}`}
              contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
              refreshControl={
                <RefreshControl
                  refreshing={tripQueries.some((q) => q.isFetching)}
                  onRefresh={() => tripQueries.forEach((q) => q.refetch())}
                  tintColor={p.brand}
                />
              }
              renderItem={({ item, index }) => (
                <TripCard
                  trip={item.trip}
                  deviceName={item.deviceName}
                  index={index}
                  onOpen={() =>
                    navigation.navigate("TripReplay", {
                      deviceId: item.deviceId,
                      from: range.from,
                      to: range.to,
                      tripIndex: item.tripIndex,
                    })
                  }
                />
              )}
            />
          )}
        </>
      )}
    </View>
  );
}
