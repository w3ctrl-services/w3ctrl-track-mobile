import React, { useMemo, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { Power } from "lucide-react-native";
import {
  AdSlider,
  AppHeader,
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingView,
  Rise,
  Row,
  Segmented,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { batteryOf, getDeviceType, knotsToKmh } from "@w3ctrl/api";
import { batteryColor } from "@w3ctrl/theme";
import { useDevices, usePositionMap, useSendCommand, useTrips } from "../api/hooks";
import { formatRelative, startOfDay, weekStart } from "../utils/format";
import TripRow from "../components/TripRow";
import type { RootNav, RootStackParamList } from "../navigation/types";

function typeLabel(
  d: { attributes?: Record<string, unknown> } | undefined,
  t: (k: string) => string,
): string {
  const v = (d?.attributes?.deviceType as string) ?? "vehicle";
  if (v === "phone") return t("Phone");
  if (v === "laptop") return t("Laptop");
  if (v === "asset") return t("Asset");
  if (v === "pet") return t("Pet");
  return t("Vehicle");
}

function DeviceTile({ name, tone }: { name: string; tone: "ok" | "alert" | "neutral" }) {
  const p = useTheme();
  const bg = tone === "ok" ? p.okSoft : tone === "alert" ? p.alertSoft : p.surface3;
  const fg = tone === "ok" ? p.ok : tone === "alert" ? p.alert : p.muted;
  return (
    <View
      style={{
        width: 58,
        height: 58,
        borderRadius: 18,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Txt variant="title" style={{ color: fg, fontWeight: "800" }}>
        {(name.trim().charAt(0) || "•").toUpperCase()}
      </Txt>
    </View>
  );
}

type Period = "today" | "week";

export default function DeviceDetailScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<RootNav>();
  const route = useRoute<RouteProp<RootStackParamList, "DeviceDetail">>();
  const { deviceId } = route.params;

  const { data: devices } = useDevices();
  const posMap = usePositionMap();
  const device = devices?.find((d) => d.id === deviceId);
  const pos = posMap.get(deviceId);

  const [engineStopped, setEngineStopped] = useState(false);
  const [cmdBusy, setCmdBusy] = useState(false);
  const [cmdError, setCmdError] = useState<string | null>(null);
  const sendCommand = useSendCommand();

  const [period, setPeriod] = useState<Period>("today");
  const from = useMemo(
    () => (period === "today" ? startOfDay() : weekStart()).toISOString(),
    [period],
  );
  const to = useMemo(() => new Date().toISOString(), [period]);
  const { data: trips, isLoading: tripsLoading } = useTrips(deviceId, from, to);

  if (!device) {
    return <LoadingView />;
  }

  const batt = batteryOf(pos ?? null);
  const kmh = knotsToKmh(pos?.speed ?? 0);
  const ignition = pos?.attributes?.ignition;
  const isVehicle = getDeviceType(device) === "vehicle";
  const offline = device.status === "offline";
  const tileTone = offline ? "alert" : kmh > 0 ? "ok" : "neutral";

  async function runCommand(type: "engineStop" | "engineResume", stopped: boolean) {
    setCmdBusy(true);
    setCmdError(null);
    try {
      await sendCommand.mutateAsync({ deviceId, type });
      setEngineStopped(stopped);
    } catch {
      setCmdError(t("Something went wrong."));
    } finally {
      setCmdBusy(false);
    }
  }

  function confirmStop() {
    if (kmh > 5) {
      setCmdError(t("Engine cut-off is blocked above 5 km/h for safety."));
      return;
    }
    Alert.alert(t("Stop engine"), t("Are you sure? This stops the engine remotely."), [
      { text: t("Cancel"), style: "cancel" },
      {
        text: t("Confirm"),
        style: "destructive",
        onPress: () => runCommand("engineStop", true),
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <AppHeader
        title={device.name}
        subtitle={device.uniqueId}
        onBack={() => navigation.goBack()}
        right={
          <Badge
            text={t(
              device.status === "online"
                ? "Online"
                : device.status === "offline"
                  ? "Offline"
                  : "Unknown",
            )}
            tone={
              device.status === "online"
                ? "ok"
                : device.status === "offline"
                  ? "alert"
                  : "neutral"
            }
          />
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Rise delay={40}>
          <Card style={{ marginBottom: 14 }}>
            <Row style={{ gap: 14, alignItems: "center" }}>
              <DeviceTile name={device.name} tone={tileTone} />
              <View style={{ flex: 1 }}>
                <Txt variant="subtitle" style={{ fontSize: 18 }} numberOfLines={1}>
                  {device.name}
                </Txt>
                <Txt variant="small" color={p.muted} style={{ marginTop: 3 }}>
                  {device.uniqueId}
                </Txt>
                <Row style={{ gap: 8, marginTop: 8 }}>
                  <Badge text={typeLabel(device, t)} tone="brand" />
                  <Badge
                    text={t(
                      device.status === "online"
                        ? "Online"
                        : device.status === "offline"
                          ? "Offline"
                          : "Unknown",
                    )}
                    tone={
                      device.status === "online"
                        ? "ok"
                        : device.status === "offline"
                          ? "alert"
                          : "neutral"
                    }
                  />
                </Row>
              </View>
            </Row>
          </Card>
        </Rise>

        {isVehicle ? (
          <Rise delay={80}>
            <Card
              style={{
                marginBottom: 14,
                backgroundColor: p.brandSoft,
                borderColor: p.brandEdge,
                borderWidth: 1.5,
              }}
            >
              <Row style={{ gap: 10, alignItems: "center", marginBottom: 10 }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 11,
                    backgroundColor: p.brandEdge,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Power color={p.brandInk} size={18} />
                </View>
                <Txt variant="subtitle">{t("Engine")}</Txt>
              </Row>
              <Txt variant="small" color={p.muted} style={{ marginBottom: 12 }}>
                {engineStopped ? t("Engine is stopped.") : t("Engine is running.")}
              </Txt>
              {cmdError ? (
                <Txt variant="small" color={p.alert} style={{ marginBottom: 12 }}>
                  {cmdError}
                </Txt>
              ) : null}
              {!engineStopped ? (
                <Button
                  kind="danger"
                  title={t("Stop engine")}
                  onPress={confirmStop}
                  loading={cmdBusy}
                />
              ) : (
                <Button
                  kind="secondary"
                  title={t("Start engine")}
                  onPress={() => runCommand("engineResume", false)}
                  loading={cmdBusy}
                />
              )}
              <Txt
                variant="small"
                style={{
                  marginTop: 10,
                  color: p.warn,
                  fontWeight: "600",
                  lineHeight: 20,
                }}
              >
                {!engineStopped && kmh > 5
                  ? `${t("Blocked above 5 km/h — moving at")} ${Math.round(kmh)} km/h.`
                  : t("Blocked above 5 km/h for safety.")}
              </Txt>
            </Card>
          </Rise>
        ) : null}

        <Rise delay={120}>
          <Card
            style={{ marginBottom: 14, paddingVertical: 6, paddingHorizontal: 14 }}
          >
            <Row
              style={{
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 11,
                borderBottomWidth: 1,
                borderBottomColor: p.line,
              }}
            >
              <Txt variant="body">{t("Ignition")}</Txt>
              <Badge
                text={ignition ? t("Ignition on") : t("Ignition off")}
                tone={ignition ? "ok" : "neutral"}
              />
            </Row>
            <Row
              style={{
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 11,
                borderBottomWidth: 1,
                borderBottomColor: p.line,
              }}
            >
              <Txt variant="body">{t("Speed")}</Txt>
              <Txt variant="body" style={{ fontWeight: "700" }}>
                {Math.round(kmh)} km/h
              </Txt>
            </Row>
            <Row
              style={{
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 11,
                borderBottomWidth: 1,
                borderBottomColor: p.line,
              }}
            >
              <Txt variant="body">{t("Battery")}</Txt>
              <Row style={{ alignItems: "center", gap: 8 }}>
                {batt != null ? (
                  <>
                    <View
                      style={{
                        width: 70,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: p.surface3,
                      }}
                    >
                      <View
                        style={{
                          width: `${batt}%`,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: batteryColor(p, batt),
                        }}
                      />
                    </View>
                    <Txt
                      variant="body"
                      style={{
                        fontWeight: "700",
                        color: batteryColor(p, batt),
                      }}
                    >
                      {batt}%
                    </Txt>
                  </>
                ) : (
                  <Txt variant="body" color={p.muted}>
                    {t("Unknown")}
                  </Txt>
                )}
              </Row>
            </Row>
            <Row
              style={{
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 11,
              }}
            >
              <Txt variant="body">{t("Last update")}</Txt>
              <Txt variant="small" color={p.muted}>
                {formatRelative(device.lastUpdate, t)}
              </Txt>
            </Row>
            {pos?.address ? (
              <Row
                style={{
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 11,
                  borderTopWidth: 1,
                  borderTopColor: p.line,
                }}
              >
                <Txt variant="body">{t("Address")}</Txt>
                <Txt
                  variant="small"
                  color={p.muted}
                  style={{ textAlign: "right", maxWidth: "60%" }}
                  numberOfLines={2}
                >
                  {pos.address}
                </Txt>
              </Row>
            ) : null}
          </Card>
        </Rise>

        <Rise delay={160}>
          <Txt variant="subtitle" style={{ marginBottom: 8 }}>
            {t("Trip history")}
          </Txt>
          <Segmented<Period>
            options={[
              { value: "today", label: t("Today") },
              { value: "week", label: t("This week") },
            ]}
            value={period}
            onChange={setPeriod}
          />
          <View style={{ height: 12 }} />
          {tripsLoading ? (
            <LoadingView />
          ) : !trips || trips.length === 0 ? (
            <EmptyState title={t("No trips in this period.")} />
          ) : (
            trips.map((trip, i) => (
              <TripRow
                key={`${trip.startTime}-${i}`}
                trip={trip}
                onReplay={() =>
                  navigation.navigate("TripReplay", {
                    deviceId,
                    from,
                    to,
                    tripIndex: i,
                  })
                }
              />
            ))
          )}
          <View style={{ height: 8 }} />
          <AdSlider />
        </Rise>
      </ScrollView>
    </View>
  );
}
