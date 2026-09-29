import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, SafeAreaView, View } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { Pause, Play } from "lucide-react-native";
import {
  Card,
  EmptyState,
  LoadingView,
  MapView,
  Row,
  Txt,
  moveMapMarker,
  useTheme,
  type MapHandle,
  type MapMarker,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { knotsToKmh } from "@w3ctrl/api";
import { useDevices, usePositionHistory, useTrips } from "../api/hooks";
import { formatDuration, formatKm } from "../utils/format";
import type { RootStackParamList } from "../navigation/types";

/** Dependency-free scrub slider: drag across the track to seek. */
function ScrubBar({
  value,
  max,
  onScrub,
}: {
  value: number;
  max: number;
  onScrub: (v: number) => void;
}) {
  const p = useTheme();
  const [width, setWidth] = useState(0);
  const frac = max > 0 ? value / max : 0;
  const seek = (x: number) => {
    if (width <= 0 || max <= 0) return;
    onScrub(Math.min(max, Math.max(0, Math.round((x / width) * max))));
  };
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => seek(e.nativeEvent.locationX)}
      onResponderMove={(e) => seek(e.nativeEvent.locationX)}
      style={{ height: 40, justifyContent: "center" }}
    >
      <View style={{ height: 6, borderRadius: 3, backgroundColor: p.surface3 }}>
        <View
          style={{
            width: `${frac * 100}%`,
            height: 6,
            borderRadius: 3,
            backgroundColor: p.brand,
          }}
        />
      </View>
      <View
        style={{
          position: "absolute",
          left: `${frac * 100}%`,
          marginLeft: -9,
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: p.brand,
          borderWidth: 3,
          borderColor: "#ffffff",
        }}
      />
    </View>
  );
}

export default function TripReplayScreen() {
  const p = useTheme();
  const t = useT();
  const route = useRoute<RouteProp<RootStackParamList, "TripReplay">>();
  const { deviceId, from, to, tripIndex } = route.params;

  const { data: devices } = useDevices();
  const { data: trips } = useTrips(deviceId, from, to);
  const trip = trips?.[tripIndex];
  const { data: trail, isLoading: trailLoading } = usePositionHistory(
    deviceId,
    trip?.startTime,
    trip?.endTime,
  );

  const mapRef = useRef<MapHandle>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const deviceName = devices?.find((d) => d.id === deviceId)?.name ?? "";
  const points = useMemo(
    () =>
      [...(trail ?? [])].sort(
        (a, b) => new Date(a.fixTime).getTime() - new Date(b.fixTime).getTime(),
      ),
    [trail],
  );
  const path: [number, number][] = useMemo(
    () => points.map((pt) => [pt.longitude, pt.latitude]),
    [points],
  );
  const markers: MapMarker[] = useMemo(
    () =>
      points.length > 0
        ? [
            {
              id: "replay",
              lat: points[0].latitude,
              lng: points[0].longitude,
              color: p.brand,
              label: deviceName,
              selected: true,
            },
          ]
        : [],
    // markers are positioned once; playback moves the marker imperatively
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [points.length, deviceName],
  );

  // Playback advances the index; the marker follows imperatively (no WebView reload).
  useEffect(() => {
    if (!playing || points.length < 2) return;
    const step = Math.max(1, Math.floor(points.length / 90));
    const id = setInterval(() => {
      setIndex((i) => Math.min(i + step, points.length - 1));
    }, 500);
    return () => clearInterval(id);
  }, [playing, points]);

  useEffect(() => {
    const pt = points[index];
    if (pt) moveMapMarker(mapRef, "replay", pt.latitude, pt.longitude);
    if (playing && index >= points.length - 1 && points.length > 0) {
      setPlaying(false);
    }
  }, [index, points, playing]);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [tripIndex, trip?.startTime]);

  if (!trip || trailLoading) {
    return <LoadingView />;
  }
  if (points.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: p.paper }}>
        <EmptyState title={t("No trips in this period.")} />
      </SafeAreaView>
    );
  }

  const cur = points[Math.min(index, points.length - 1)];
  const curTime = new Date(cur.fixTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.paper }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Card>
          <Row style={{ gap: 16, flexWrap: "wrap" }}>
            <Txt variant="small" color={p.muted}>
              {t("Distance")}:{" "}
              <Txt variant="small" color={p.ink} style={{ fontWeight: "700" }}>
                {formatKm(trip.distance)} km
              </Txt>
            </Txt>
            <Txt variant="small" color={p.muted}>
              {t("Duration")}:{" "}
              <Txt variant="small" color={p.ink} style={{ fontWeight: "700" }}>
                {formatDuration(trip.duration, t)}
              </Txt>
            </Txt>
            <Txt variant="small" color={p.muted}>
              {t("Top speed")}:{" "}
              <Txt variant="small" color={p.ink} style={{ fontWeight: "700" }}>
                {Math.round(knotsToKmh(trip.maxSpeed))} km/h
              </Txt>
            </Txt>
          </Row>
        </Card>
      </View>

      <View style={{ flex: 1, marginHorizontal: 16, borderRadius: 16, overflow: "hidden" }}>
        <MapView ref={mapRef} markers={markers} path={path} />
      </View>

      <View style={{ padding: 16 }}>
        <Row style={{ gap: 12, alignItems: "center" }}>
          <Pressable
            onPress={() => {
              if (index >= points.length - 1) setIndex(0);
              setPlaying((v) => !v);
            }}
            accessibilityLabel={playing ? t("Pause") : t("Play")}
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: p.brand,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {playing ? (
              <Pause color="#12100d" size={24} />
            ) : (
              <Play color="#12100d" size={24} />
            )}
          </Pressable>
          <View style={{ flex: 1 }}>
            <ScrubBar
              value={index}
              max={points.length - 1}
              onScrub={(v) => {
                setPlaying(false);
                setIndex(v);
              }}
            />
          </View>
        </Row>
        <Row style={{ justifyContent: "space-between", marginTop: 4 }}>
          <Txt variant="caption" color={p.muted}>
            {curTime}
          </Txt>
          <Txt variant="caption" color={p.muted}>
            {t("Speed")}: {Math.round(knotsToKmh(cur.speed))} km/h
          </Txt>
        </Row>
      </View>
    </SafeAreaView>
  );
}
