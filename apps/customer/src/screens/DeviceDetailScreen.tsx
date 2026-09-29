import React, { useLayoutEffect, useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import {
  Badge,
  Button,
  Card,
  DeviceDot,
  EmptyState,
  LoadingView,
  Row,
  Screen,
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

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  const p = useTheme();
  return (
    <Card style={{ flex: 1, minWidth: "46%" }}>
      <Txt variant="caption" color={p.muted}>
        {label}
      </Txt>
      <Txt variant="subtitle" color={color} style={{ marginTop: 4 }}>
        {value}
      </Txt>
    </Card>
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

  useLayoutEffect(() => {
    navigation.setOptions({ title: device?.name ?? t("Devices") });
  }, [navigation, device?.name, t]);

  if (!device) {
    return <LoadingView />;
  }

  const batt = batteryOf(pos ?? null);
  const kmh = knotsToKmh(pos?.speed ?? 0);
  const ignition = pos?.attributes?.ignition;
  const isVehicle = getDeviceType(device) === "vehicle";

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
    <Screen>
      <Row style={{ gap: 8, marginBottom: 16 }}>
        <DeviceDot type={getDeviceType(device)} size={14} />
        <Txt variant="display" style={{ flex: 1 }}>
          {device.name}
        </Txt>
      </Row>
      <Row style={{ gap: 8, marginBottom: 16 }}>
        <Badge text={typeLabel(device, t)} tone="brand" />
        <Badge
          text={t(device.status === "online" ? "Online" : device.status === "offline" ? "Offline" : "Unknown")}
          tone={device.status === "online" ? "ok" : device.status === "offline" ? "alert" : "neutral"}
        />
      </Row>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <Stat label={t("Speed")} value={`${Math.round(kmh)} km/h`} />
        <Stat
          label={t("Battery")}
          value={batt != null ? `${batt}%` : t("Unknown")}
          color={batteryColor(p, batt)}
        />
        <Stat
          label={t("Ignition")}
          value={ignition ? t("Ignition on") : t("Ignition off")}
          color={ignition ? p.ok : p.muted}
        />
        <Stat label={t("Last update")} value={formatRelative(device.lastUpdate, t)} />
      </View>

      {pos?.address ? (
        <Card style={{ marginBottom: 16 }}>
          <Txt variant="caption" color={p.muted}>
            {t("Address")}
          </Txt>
          <Txt variant="body" style={{ marginTop: 4 }}>
            {pos.address}
          </Txt>
        </Card>
      ) : null}

      {isVehicle ? (
        <Card style={{ marginBottom: 16 }}>
          <Txt variant="subtitle" style={{ marginBottom: 4 }}>
            {t("Engine")}
          </Txt>
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
        </Card>
      ) : null}

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
              navigation.navigate("TripReplay", { deviceId, from, to, tripIndex: i })
            }
          />
        ))
      )}
      <View style={{ height: 8 }} />
    </Screen>
  );
}
