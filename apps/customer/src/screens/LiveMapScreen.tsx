import React, { useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Layers, MapPin, Minus, Plus, Search, X } from "lucide-react-native";
import {
  AppHeader,
  Badge,
  Button,
  Card,
  LoadingView,
  MapView,
  Row,
  Txt,
  deviceColor,
  useTheme,
  type MapHandle,
  type MapMarker,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { batteryOf, getDeviceType, knotsToKmh } from "@w3ctrl/api";
import { batteryColor } from "@w3ctrl/theme";
import { useDevices, usePositionMap } from "../api/hooks";
import { formatRelative } from "../utils/format";
import type { TabNav } from "../navigation/types";
import BrandMark from "../components/BrandMark";

/** Matches the web portal: above 5 km/h counts as moving. */
const MOVING_KMH = 5;

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

const floatShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.18,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 4,
};

function MapCtl({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) {
  const p = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: p.surface,
        alignItems: "center",
        justifyContent: "center",
        ...floatShadow,
      }}
    >
      {children}
    </Pressable>
  );
}

export default function LiveMapScreen() {
  const p = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<TabNav<"Map">>();
  const { data: devices, isLoading } = useDevices();
  const posMap = usePositionMap();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const mapRef = useRef<MapHandle>(null);

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
  const kmh = Math.round(knotsToKmh(selectedPos?.speed ?? 0));
  const moving = kmh > MOVING_KMH;

  const total = (devices ?? []).length;
  let latestFix: string | null = null;
  posMap.forEach((pos) => {
    if (!latestFix || pos.fixTime > latestFix) latestFix = pos.fixTime;
  });

  function zoomIn() {
    mapRef.current?.injectJavaScript("map.zoomIn();true;");
  }

  function zoomOut() {
    mapRef.current?.injectJavaScript("map.zoomOut();true;");
  }

  function openDevice() {
    if (selected) navigation.navigate("DeviceDetail", { deviceId: selected.id });
  }

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
          <BrandMark />
          <Badge tone="ok" text={t("Live")} />
        </View>
        <Txt style={{ fontSize: 20, fontWeight: "700", marginTop: 12 }}>
          {t("Live map")}
        </Txt>
        <Txt style={{ color: p.muted, fontSize: 12.5, marginTop: 4 }}>
          {total} {t("vehicles")} · {t("updated")}{" "}
          {formatRelative(latestFix, t)}
        </Txt>
      </AppHeader>

      <View style={{ flex: 1 }}>
        {isLoading && markers.length === 0 ? (
          <LoadingView />
        ) : (
          <MapView
            ref={mapRef}
            markers={markers}
            onMarkerPress={(id) => setSelectedId(Number(id))}
            style={{ flex: 1 }}
          />
        )}

        {/* Decorative search bar over the map. */}
        <View
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            right: 76,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: p.surface,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 11,
            ...floatShadow,
          }}
        >
          <Search size={16} color={p.muted} />
          <Txt variant="small" color={p.muted}>
            {t("Search place…")}
          </Txt>
        </View>

        {/* Map controls: zoom is wired to the map; layers has no map-style
            logic in the app, so it stays decorative. */}
        <View style={{ position: "absolute", top: 12, right: 12, gap: 8 }}>
          <MapCtl onPress={zoomIn}>
            <Plus size={18} color={p.ink} />
          </MapCtl>
          <MapCtl onPress={zoomOut}>
            <Minus size={18} color={p.ink} />
          </MapCtl>
          <MapCtl onPress={() => {}}>
            <Layers size={18} color={p.ink} />
          </MapCtl>
        </View>

        {selected ? (
          <View
            style={{
              position: "absolute",
              left: 16,
              right: 16,
              bottom: 16 + insets.bottom,
            }}
          >
            <Card style={floatShadow}>
              <View style={{ alignItems: "center", marginBottom: 10 }}>
                <View
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: p.line,
                  }}
                />
              </View>
              <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Txt variant="subtitle" numberOfLines={1}>
                    {selected.name}
                  </Txt>
                  <Txt variant="small" color={p.muted} style={{ marginTop: 2 }}>
                    {moving ? t("Moving") : t(statusKey(selected.status))} ·{" "}
                    {kmh} km/h
                  </Txt>
                </View>
                <Pressable onPress={() => setSelectedId(null)} hitSlop={12}>
                  <X color={p.muted} size={20} />
                </Pressable>
              </Row>
              <Row style={{ gap: 10, marginTop: 10, alignItems: "center" }}>
                <Badge
                  text={moving ? t("Moving") : t(statusKey(selected.status))}
                  tone={moving ? "ok" : statusTone(selected.status)}
                />
                {batt != null ? (
                  <Txt variant="small" color={batteryColor(p, batt)}>
                    {t("Battery")}: {batt}%
                  </Txt>
                ) : null}
              </Row>
              <Row style={{ gap: 6, marginTop: 10, alignItems: "flex-start" }}>
                <MapPin size={14} color={p.muted} style={{ marginTop: 2 }} />
                <Txt variant="small" color={p.muted} style={{ flex: 1, lineHeight: 19 }}>
                  {selectedPos?.address ??
                    `${t("Last update")}: ${formatRelative(selected.lastUpdate, t)}`}
                </Txt>
              </Row>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <Button
                  kind="ghost"
                  title={t("Trips")}
                  onPress={openDevice}
                  style={{ flex: 1 }}
                />
                <Button
                  kind="danger"
                  title={t("Cut engine")}
                  onPress={openDevice}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          </View>
        ) : null}
      </View>
    </View>
  );
}
