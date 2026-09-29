import React, { useMemo, useState } from "react";
import { Pressable, SafeAreaView, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { X } from "lucide-react-native";
import {
  Badge,
  Button,
  Card,
  DeviceDot,
  LoadingView,
  MapView,
  Row,
  Txt,
  deviceColor,
  useTheme,
  type MapMarker,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { batteryOf, getDeviceType, knotsToKmh } from "@w3ctrl/api";
import { batteryColor } from "@w3ctrl/theme";
import { useDevices, usePositionMap } from "../api/hooks";
import type { TabNav } from "../navigation/types";

function statusKey(status: string): string {
  if (status === "online") return "Online";
  if (status === "offline") return "Offline";
  return "Unknown";
}

function statusTone(status: string): "ok" | "alert" | "neutral" {
  if (status === "online") return "ok";
  if (status === "offline") return "alert";
  return "neutral";
}

export default function LiveMapScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<TabNav<"Map">>();
  const { data: devices, isLoading } = useDevices();
  const posMap = usePositionMap();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const markers: MapMarker[] = useMemo(
    () =>
      (devices ?? [])
        .map((d) => {
          const pos = posMap.get(d.id);
          if (!pos) return null;
          const marker: MapMarker = {
            id: String(d.id),
            lat: pos.latitude,
            lng: pos.longitude,
            color: deviceColor(getDeviceType(d)),
            label: d.name,
            selected: d.id === selectedId,
          };
          return marker;
        })
        .filter((m): m is MapMarker => m !== null),
    [devices, posMap, selectedId],
  );

  const selected = (devices ?? []).find((d) => d.id === selectedId) ?? null;
  const selectedPos = selected ? posMap.get(selected.id) : undefined;
  const batt = batteryOf(selectedPos ?? null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.paper }}>
      {isLoading && markers.length === 0 ? (
        <LoadingView />
      ) : (
        <MapView
          markers={markers}
          onMarkerPress={(id) => setSelectedId(Number(id))}
          style={{ flex: 1 }}
        />
      )}
      {selected ? (
        <View style={{ position: "absolute", left: 16, right: 16, bottom: 24 }}>
          <Card>
            <Row style={{ justifyContent: "space-between" }}>
              <Row style={{ gap: 8, flex: 1 }}>
                <DeviceDot type={getDeviceType(selected)} />
                <Txt variant="subtitle" style={{ flex: 1 }} numberOfLines={1}>
                  {selected.name}
                </Txt>
              </Row>
              <Pressable onPress={() => setSelectedId(null)} hitSlop={12}>
                <X color={p.muted} size={20} />
              </Pressable>
            </Row>
            <Row style={{ gap: 10, marginTop: 10 }}>
              <Badge text={t(statusKey(selected.status))} tone={statusTone(selected.status)} />
              <Txt variant="small" color={p.muted}>
                {t("Speed")}: {Math.round(knotsToKmh(selectedPos?.speed ?? 0))} km/h
              </Txt>
              {batt != null ? (
                <Txt variant="small" color={batteryColor(p, batt)}>
                  {t("Battery")}: {batt}%
                </Txt>
              ) : null}
            </Row>
            <Button
              title={t("Details")}
              onPress={() => navigation.navigate("DeviceDetail", { deviceId: selected.id })}
              style={{ marginTop: 12 }}
            />
          </Card>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
