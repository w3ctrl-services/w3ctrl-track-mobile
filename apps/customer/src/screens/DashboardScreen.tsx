import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, ScrollView, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  AdSlider,
  AppHeader,
  Badge,
  Card,
  EmptyState,
  LoadingView,
  Rise,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { batteryOf, knotsToKmh, type TraccarDevice } from "@w3ctrl/api";
import { useAuth } from "../auth/AuthContext";
import { useDevices, useEvents, usePositionMap, useSummary } from "../api/hooks";
import { formatKm, formatRelative, startOfDay } from "../utils/format";
import type { TabNav } from "../navigation/types";

/** Matches the web portal: above 5 km/h counts as moving. */
const MOVING_KMH = 5;
/** Battery % below which a device gets the red "Batt N%" badge. */
const LOW_BATT_PCT = 20;

function PulseDot({ size = 10 }: { size?: number }) {
  const p = useTheme();
  const a = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(a, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: p.ok,
        opacity: a,
      }}
    />
  );
}

/** Green live pill for the black header, e.g. "2 moving". */
function LivePill({ text }: { text: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(46, 204, 113, 0.16)",
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <PulseDot />
      <Txt variant="small" style={{ color: "#7ddba3", fontWeight: "700" }}>
        {text}
      </Txt>
    </View>
  );
}

function Stat({
  value,
  unit,
  label,
  accent,
}: {
  value: string;
  unit?: string;
  label: string;
  accent?: string;
}) {
  const p = useTheme();
  return (
    <Card style={{ flexGrow: 1, flexBasis: "46%" }}>
      <Txt variant="display" color={accent}>
        {value}
        {unit ? (
          <Txt variant="small" color={p.muted}>
            {" "}
            {unit}
          </Txt>
        ) : null}
      </Txt>
      <Txt variant="caption" color={p.muted} style={{ marginTop: 4 }}>
        {label}
      </Txt>
    </Card>
  );
}

type BadgeTone = "neutral" | "ok" | "warn" | "alert" | "brand";

function DeviceRow({
  device,
  speedKmh,
  batt,
  last,
  onPress,
}: {
  device: TraccarDevice;
  speedKmh: number;
  batt: number | null;
  last: boolean;
  onPress: () => void;
}) {
  const p = useTheme();
  const t = useT();
  const moving = speedKmh > MOVING_KMH;
  const lowBatt = batt != null && batt < LOW_BATT_PCT;
  const badge: { text: string; tone: BadgeTone } = lowBatt
    ? { text: `Batt ${batt}%`, tone: "alert" }
    : moving
      ? { text: t("Moving"), tone: "ok" }
      : { text: t("Parked"), tone: "neutral" };
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 12,
          ...(last ? {} : { borderBottomWidth: 1, borderBottomColor: p.line }),
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: lowBatt ? p.alertSoft : p.brandSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Txt variant="subtitle" color={lowBatt ? p.alert : p.brandInk}>
            {device.name.charAt(0).toUpperCase()}
          </Txt>
        </View>
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Txt variant="subtitle" numberOfLines={1} style={{ flex: 1 }}>
              {device.name}
            </Txt>
            <Badge text={badge.text} tone={badge.tone} />
          </View>
          <Txt
            variant="small"
            color={p.muted}
            numberOfLines={1}
            style={{ marginTop: 3 }}
          >
            {moving ? `${speedKmh} km/h · ` : ""}
            {t("Last seen")} {formatRelative(device.lastUpdate, t)}
          </Txt>
        </View>
      </View>
    </Pressable>
  );
}

function isSosEvent(e: { type: string; attributes?: Record<string, unknown> }): boolean {
  return (
    e.type === "alarm" &&
    String(e.attributes?.alarm ?? "").toLowerCase().includes("sos")
  );
}

export default function DashboardScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<TabNav<"Home">>();
  const { user } = useAuth();

  const { data: devices, isLoading: devicesLoading } = useDevices();
  const posMap = usePositionMap();
  const from = useMemo(() => startOfDay().toISOString(), []);
  const to = useMemo(() => new Date().toISOString(), []);
  const ids = useMemo(() => (devices ?? []).map((d) => d.id), [devices]);
  const { data: summary } = useSummary(ids, from, to);
  const { data: events } = useEvents(undefined, 7);

  if (devicesLoading && !devices) {
    return (
      <View style={{ flex: 1, backgroundColor: p.paper }}>
        <LoadingView text={t("devices online")} />
      </View>
    );
  }

  const list = devices ?? [];
  const total = list.length;
  const online = list.filter((d) => d.status === "online").length;
  const distanceKm = formatKm((summary ?? []).reduce((s, r) => s + r.distance, 0));
  const sosCount = (events ?? []).filter(isSosEvent).length;
  const dayStart = startOfDay().getTime();
  const alertsToday = (events ?? []).filter(
    (e) => new Date(e.eventTime).getTime() >= dayStart,
  ).length;
  const moving = list.filter(
    (d) => knotsToKmh(posMap.get(d.id)?.speed ?? 0) > MOVING_KMH,
  ).length;
  const firstName = (user?.name ?? "").split(" ")[0];
  const initial = (firstName || "W").charAt(0).toUpperCase();
  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  let latestFix: string | null = null;
  posMap.forEach((pos) => {
    if (!latestFix || pos.fixTime > latestFix) latestFix = pos.fixTime;
  });

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <AppHeader title="">
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "rgba(255,255,255,0.14)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Txt style={{ color: "#ffffff", fontSize: 18, fontWeight: "700" }}>
                {initial}
              </Txt>
            </View>
            <View>
              <Txt style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>
                {t("Sat Sri Akal")}
                {firstName ? `, ${firstName}` : ""}
              </Txt>
              <Txt style={{ color: "#b9b9c2", fontSize: 11, marginTop: 2 }}>
                {dateStr}
              </Txt>
            </View>
          </View>
          <LivePill text={`${moving} ${t("moving")}`} />
        </View>
      </AppHeader>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Rise delay={0}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <Stat value={`${online}/${total}`} label={t("devices online")} accent={p.ok} />
            <Stat value={distanceKm} unit="km" label={t("Total distance today")} />
            <Stat value={String(alertsToday)} label={t("Alerts today")} />
            <Stat
              value={String(sosCount)}
              label={t("SOS")}
              accent={sosCount > 0 ? p.alert : undefined}
            />
          </View>
        </Rise>

        <Rise delay={60}>
          <View style={{ marginTop: 16 }}>
            <AdSlider />
          </View>
        </Rise>

        <Rise delay={120}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 20,
              marginBottom: 8,
            }}
          >
            <Txt variant="subtitle">{t("My vehicles")}</Txt>
            <Pressable
              onPress={() => navigation.navigate("Main", { screen: "Devices" })}
            >
              <Txt variant="small" color={p.brandInk}>
                {t("View all")}
              </Txt>
            </Pressable>
          </View>
          <Card style={{ paddingVertical: 4, paddingHorizontal: 14 }}>
            {total === 0 ? (
              <EmptyState title={t("No devices yet.")} />
            ) : (
              list.map((d, i) => {
                const pos = posMap.get(d.id);
                return (
                  <DeviceRow
                    key={d.id}
                    device={d}
                    speedKmh={Math.round(knotsToKmh(pos?.speed ?? 0))}
                    batt={batteryOf(pos ?? null)}
                    last={i === total - 1}
                    onPress={() =>
                      navigation.navigate("DeviceDetail", { deviceId: d.id })
                    }
                  />
                );
              })
            )}
          </Card>
        </Rise>

        <Rise delay={180}>
          <Card style={{ marginTop: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <PulseDot />
              <Txt
                variant="small"
                color={p.muted}
                style={{ flex: 1, lineHeight: 20 }}
              >
                {t("All")} {total} {t("trackers reporting")}.{" "}
                {t("Last position update")} {formatRelative(latestFix, t)}.
              </Txt>
            </View>
          </Card>
        </Rise>
      </ScrollView>
    </View>
  );
}
