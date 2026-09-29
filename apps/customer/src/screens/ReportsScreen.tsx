import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Card,
  LoadingView,
  Row,
  Screen,
  Segmented,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { knotsToKmh } from "@w3ctrl/api";
import { useDevices, useSummary, useTrips } from "../api/hooks";
import { formatKm, monthStart, startOfDay, weekStart } from "../utils/format";
import TripRow from "../components/TripRow";
import type { TabNav } from "../navigation/types";

type Period = "today" | "week" | "month";

function periodRange(period: Period): { from: string; to: string } {
  const to = new Date().toISOString();
  if (period === "today") return { from: startOfDay().toISOString(), to };
  if (period === "week") return { from: weekStart().toISOString(), to };
  return { from: monthStart().toISOString(), to };
}

function StatCard({ label, value }: { label: string; value: string }) {
  const p = useTheme();
  return (
    <Card style={{ flex: 1, minWidth: "46%" }}>
      <Txt variant="caption" color={p.muted}>
        {label}
      </Txt>
      <Txt variant="title" style={{ marginTop: 4 }}>
        {value}
      </Txt>
    </Card>
  );
}

export default function ReportsScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<TabNav<"Settings">>();
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

  const s = summary?.[0];

  return (
    <Screen>
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
                  backgroundColor: active ? p.brand : p.surface2,
                  borderWidth: 1,
                  borderColor: active ? p.brand : p.line,
                }}
              >
                <Txt
                  variant="small"
                  style={{
                    color: active ? "#12100d" : p.ink2,
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

      <Segmented<Period>
        options={[
          { value: "today", label: t("Today") },
          { value: "week", label: t("This week") },
          { value: "month", label: t("This month") },
        ]}
        value={period}
        onChange={setPeriod}
      />
      <View style={{ height: 12 }} />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
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
    </Screen>
  );
}
