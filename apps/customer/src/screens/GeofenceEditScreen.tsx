import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { Check } from "lucide-react-native";
import {
  Button,
  Card,
  DeviceDot,
  Field,
  MapView,
  Row,
  Screen,
  Txt,
  useTheme,
  type MapCircle,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { circleArea, getDeviceType, parseCircle, type DeviceType } from "@w3ctrl/api";
import {
  useCreateGeofence,
  useDeleteGeofence,
  useDevices,
  useGeofenceDevices,
  useGeofences,
  useLinkPermission,
  useUnlinkPermission,
  useUpdateGeofence,
} from "../api/hooks";
import type { RootNav, RootStackParamList } from "../navigation/types";

function DeviceCheck({
  name,
  dtype,
  checked,
  onToggle,
}: {
  name: string;
  dtype: DeviceType;
  checked: boolean;
  onToggle: () => void;
}) {
  const p = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: p.line,
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: checked ? p.brand : p.lineStrong,
          backgroundColor: checked ? p.brand : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked ? <Check color="#12100d" size={16} /> : null}
      </View>
      <DeviceDot type={dtype} />
      <Txt variant="body" style={{ flex: 1 }} numberOfLines={1}>
        {name}
      </Txt>
    </Pressable>
  );
}

export default function GeofenceEditScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<RootNav>();
  const route = useRoute<RouteProp<RootStackParamList, "GeofenceEdit">>();
  const geofenceId = route.params?.geofenceId;
  const editing = geofenceId != null;

  const { data: geofences } = useGeofences();
  const existing = geofences?.find((g) => g.id === geofenceId);
  const { data: devices } = useDevices();
  const { data: linkedDevices } = useGeofenceDevices(geofenceId);

  const [name, setName] = useState("");
  const [radius, setRadius] = useState("200");
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  const createGeofence = useCreateGeofence();
  const updateGeofence = useUpdateGeofence();
  const deleteGeofence = useDeleteGeofence();
  const linkPermission = useLinkPermission();
  const unlinkPermission = useUnlinkPermission();

  useLayoutEffect(() => {
    navigation.setOptions({ title: editing ? t("Edit geofence") : t("New geofence") });
  }, [navigation, editing, t]);

  useEffect(() => {
    if (existing && !initialized.current) {
      initialized.current = true;
      setName(existing.name);
      const c = parseCircle(existing.area);
      if (c) {
        setRadius(String(Math.round(c.radius)));
        setCenter({ lat: c.lat, lng: c.lng });
      }
    }
  }, [existing]);

  useEffect(() => {
    if (editing && linkedDevices) {
      setSelected(linkedDevices.map((d) => d.id));
    }
  }, [editing, linkedDevices]);

  const radiusNum = parseFloat(radius);
  const circles: MapCircle[] =
    center && radiusNum > 0
      ? [{ id: "draft", lat: center.lat, lng: center.lng, radiusM: radiusNum, color: p.brand }]
      : [];

  function toggle(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function save() {
    if (!name.trim() || !center || !(radiusNum > 0)) {
      setError(t("Name the geofence, tap the map to set the centre, and set a radius."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let id = geofenceId;
      const area = circleArea(center.lat, center.lng, radiusNum);
      if (id == null) {
        const created = await createGeofence.mutateAsync({
          name: name.trim(),
          area,
          attributes: {},
        });
        id = created.id;
      } else if (existing) {
        await updateGeofence.mutateAsync({
          id,
          data: { ...existing, name: name.trim(), area },
        });
      }
      if (id == null) throw new Error("no geofence id");
      const prev = new Set((linkedDevices ?? []).map((d) => d.id));
      const next = new Set(selected);
      for (const deviceId of next) {
        if (!prev.has(deviceId)) {
          await linkPermission.mutateAsync({ deviceId, geofenceId: id });
        }
      }
      for (const deviceId of prev) {
        if (!next.has(deviceId)) {
          await unlinkPermission.mutateAsync({ deviceId, geofenceId: id });
        }
      }
      navigation.goBack();
    } catch {
      setError(t("Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    if (geofenceId == null) return;
    Alert.alert(t("Delete"), t("This action cannot be undone."), [
      { text: t("Cancel"), style: "cancel" },
      {
        text: t("Delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteGeofence.mutateAsync(geofenceId);
            navigation.goBack();
          } catch {
            setError(t("Something went wrong."));
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <Field
        label={t("Geofence name")}
        value={name}
        onChangeText={setName}
        placeholder={t("Geofence name")}
      />
      <Field
        label={t("Radius (metres)")}
        value={radius}
        onChangeText={(v) => setRadius(v.replace(/[^0-9.]/g, ""))}
        keyboardType="numeric"
        placeholder="200"
      />
      <Txt variant="small" color={p.muted} style={{ marginBottom: 8 }}>
        {t("Tap on the map to place the centre, then set the radius.")}
      </Txt>
      <View
        style={{
          height: 280,
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 16,
          borderWidth: 1,
          borderColor: p.line,
        }}
      >
        <MapView
          markers={
            center
              ? [{ id: "center", lat: center.lat, lng: center.lng, color: p.brand, selected: true }]
              : []
          }
          circles={circles}
          center={center ? [center.lat, center.lng] : null}
          zoom={14}
          onTap={(lat, lng) => setCenter({ lat, lng })}
        />
      </View>

      <Txt variant="subtitle" style={{ marginBottom: 4 }}>
        {t("Link devices")}
      </Txt>
      <Card style={{ marginBottom: 16 }}>
        {(devices ?? []).map((d) => (
          <DeviceCheck
            key={d.id}
            name={d.name}
            dtype={getDeviceType(d)}
            checked={selected.includes(d.id)}
            onToggle={() => toggle(d.id)}
          />
        ))}
        {(devices ?? []).length === 0 ? (
          <Txt variant="small" color={p.muted}>
            {t("No devices yet.")}
          </Txt>
        ) : null}
      </Card>

      {error ? (
        <Txt variant="small" color={p.alert} style={{ marginBottom: 12 }}>
          {error}
        </Txt>
      ) : null}
      <Button title={t("Save")} onPress={save} loading={busy} />
      {editing ? (
        <Button
          kind="danger"
          title={t("Delete")}
          onPress={confirmDelete}
          style={{ marginTop: 12 }}
        />
      ) : null}
      <View style={{ height: 8 }} />
    </Screen>
  );
}
