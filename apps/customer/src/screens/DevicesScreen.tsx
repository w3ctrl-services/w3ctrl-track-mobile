import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Plus, Search, X } from "lucide-react-native";
import {
  AdSlider,
  AppHeader,
  Badge,
  Button,
  Card,
  DeviceDot,
  EmptyState,
  Field,
  LoadingView,
  Rise,
  Row,
  Segmented,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import {
  batteryOf,
  getDeviceType,
  knotsToKmh,
  type DeviceType,
  type TraccarDevice,
  type TraccarPosition,
} from "@w3ctrl/api";
import { batteryColor } from "@w3ctrl/theme";
import {
  useCreateDevice,
  useDevices,
  usePositionMap,
  useUpdateDevice,
} from "../api/hooks";
import { formatRelative } from "../utils/format";
import type { MainTabParamList, TabNav } from "../navigation/types";

const FILTERS: Array<"all" | DeviceType> = [
  "all",
  "vehicle",
  "phone",
  "laptop",
  "asset",
  "pet",
];

function filterLabel(f: "all" | DeviceType, t: (k: string) => string): string {
  if (f === "all") return t("All");
  if (f === "vehicle") return t("Vehicle");
  if (f === "phone") return t("Phone");
  if (f === "laptop") return t("Laptop");
  if (f === "asset") return t("Asset");
  return t("Pet");
}

type MotionStatus = "moving" | "parked" | "offline";

function motionStatus(
  device: TraccarDevice,
  pos: TraccarPosition | undefined,
): MotionStatus {
  if (device.status === "offline") return "offline";
  return knotsToKmh(pos?.speed ?? 0) > 0 ? "moving" : "parked";
}

function statusTone(s: MotionStatus): "ok" | "alert" | "neutral" {
  if (s === "moving") return "ok";
  if (s === "offline") return "alert";
  return "neutral";
}

function statusKey(s: MotionStatus): string {
  if (s === "moving") return "Moving";
  if (s === "offline") return "Offline";
  return "Parked";
}

function DeviceTile({
  device,
  pos,
}: {
  device: TraccarDevice;
  pos: TraccarPosition | undefined;
}) {
  const p = useTheme();
  const batt = batteryOf(pos ?? null);
  const st = motionStatus(device, pos);
  const low = batt != null && batt < 30;
  const bg = low ? p.alertSoft : st === "moving" ? p.okSoft : p.surface3;
  const fg = low ? p.alert : st === "moving" ? p.ok : p.muted;
  const initial = (device.name.trim().charAt(0) || "•").toUpperCase();
  return (
    <View
      style={{
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Txt variant="subtitle" style={{ color: fg, fontWeight: "800" }}>
        {initial}
      </Txt>
    </View>
  );
}

function DeviceRow({
  device,
  pos,
  onPress,
}: {
  device: TraccarDevice;
  pos: TraccarPosition | undefined;
  onPress: () => void;
}) {
  const p = useTheme();
  const t = useT();
  const batt = batteryOf(pos ?? null);
  const kmh = Math.round(knotsToKmh(pos?.speed ?? 0));
  const st = motionStatus(device, pos);
  const sub =
    st === "moving"
      ? `${kmh} km/h`
      : (pos?.address ?? `${t("Last seen")} ${formatRelative(device.lastUpdate, t)}`);
  return (
    <Pressable onPress={onPress}>
      <Card style={{ marginBottom: 12 }}>
        <Row style={{ gap: 12 }}>
          <DeviceTile device={device} pos={pos} />
          <View style={{ flex: 1 }}>
            <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
              <Txt variant="subtitle" style={{ flex: 1 }} numberOfLines={1}>
                {device.name}
              </Txt>
              <Badge text={t(statusKey(st))} tone={statusTone(st)} />
            </Row>
            <Txt
              variant="small"
              color={p.muted}
              style={{ marginTop: 3 }}
              numberOfLines={1}
            >
              {device.uniqueId} · {sub}
            </Txt>
            {batt != null ? (
              <Row style={{ alignItems: "center", gap: 8, marginTop: 8 }}>
                <View
                  style={{
                    flex: 1,
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
                  variant="caption"
                  style={{ color: batteryColor(p, batt), fontWeight: "700" }}
                >
                  {batt}%
                </Txt>
              </Row>
            ) : null}
          </View>
        </Row>
      </Card>
    </Pressable>
  );
}

function AddDeviceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const p = useTheme();
  const t = useT();
  const [name, setName] = useState("");
  const [uniqueId, setUniqueId] = useState("");
  const [dtype, setDtype] = useState<DeviceType>("vehicle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createDevice = useCreateDevice();
  const updateDevice = useUpdateDevice();

  async function save() {
    if (!name.trim() || !uniqueId.trim()) {
      setError(t("Please enter a name and device ID."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createDevice.mutateAsync({
        name: name.trim(),
        uniqueId: uniqueId.trim(),
      });
      await updateDevice.mutateAsync({
        ...created,
        attributes: { ...(created.attributes ?? {}), deviceType: dtype },
      });
      setName("");
      setUniqueId("");
      setDtype("vehicle");
      onClose();
    } catch {
      setError(t("Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: p.paper }}>
        <View style={{ flex: 1, padding: 16 }}>
          <Row style={{ justifyContent: "space-between", marginBottom: 16 }}>
            <Txt variant="title">{t("Add device")}</Txt>
            <Pressable onPress={onClose} hitSlop={12}>
              <X color={p.muted} size={24} />
            </Pressable>
          </Row>
          <Field
            label={t("Device name")}
            value={name}
            onChangeText={setName}
            placeholder={t("Device name")}
          />
          <Field
            label={t("Device ID")}
            value={uniqueId}
            onChangeText={setUniqueId}
            placeholder={t("Device ID")}
            hint={t("The tracker ID — IMEI for GPS trackers.")}
          />
          <Txt
            variant="small"
            color={p.ink2}
            style={{ fontWeight: "600", marginBottom: 6 }}
          >
            {t("Type")}
          </Txt>
          <Segmented<DeviceType>
            options={(
              ["vehicle", "phone", "laptop", "asset", "pet"] as DeviceType[]
            ).map((v) => ({ value: v, label: filterLabel(v, t) }))}
            value={dtype}
            onChange={setDtype}
          />
          {error ? (
            <Txt variant="small" color={p.alert} style={{ marginTop: 12 }}>
              {error}
            </Txt>
          ) : null}
          <View style={{ flex: 1 }} />
          <Button title={t("Save")} onPress={save} loading={busy} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default function DevicesScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<TabNav<"Devices">>();
  const tabNavigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList, "Devices">>();
  const route = useRoute<RouteProp<MainTabParamList, "Devices">>();
  const { data: devices, isLoading, refetch, isRefetching } = useDevices();
  const posMap = usePositionMap();
  const [filter, setFilter] = useState<"all" | DeviceType>("all");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (route.params?.openAdd) {
      setAddOpen(true);
      tabNavigation.setParams({ openAdd: undefined });
    }
  }, [route.params?.openAdd, tabNavigation]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (devices ?? [])
      .filter((d) => filter === "all" || getDeviceType(d) === filter)
      .filter(
        (d) =>
          !q ||
          d.name.toLowerCase().includes(q) ||
          d.uniqueId.toLowerCase().includes(q),
      );
  }, [devices, filter, query]);

  const onlineCount = (devices ?? []).filter(
    (d) => d.status !== "offline",
  ).length;

  if (isLoading && !devices) {
    return <LoadingView />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <AppHeader
        title={t("Devices")}
        subtitle={`${devices?.length ?? 0} ${t("Trackers")} · ${onlineCount} ${t("Online")}`}
        right={
          <Pressable
            onPress={() => setAddOpen(true)}
            accessibilityLabel={t("Add device")}
            hitSlop={10}
          >
            <Plus color="#ffffff" size={22} />
          </Pressable>
        }
      />

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Rise delay={40}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: p.surface,
              borderColor: p.line,
              borderWidth: 1,
              borderRadius: 14,
              paddingHorizontal: 12,
              height: 46,
            }}
          >
            <Search color={p.faint} size={18} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("Search by name or ID…")}
              placeholderTextColor={p.faint}
              style={{
                flex: 1,
                marginLeft: 8,
                fontSize: 15,
                color: p.ink,
              }}
            />
            {query ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <X color={p.muted} size={18} />
              </Pressable>
            ) : null}
          </View>
        </Rise>

        <Rise delay={80}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 12 }}
            contentContainerStyle={{ gap: 8, paddingRight: 16 }}
          >
            {FILTERS.map((f) => {
              const active = f === filter;
              return (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: active ? p.brand : p.surface2,
                    borderWidth: 1,
                    borderColor: active ? p.brand : p.line,
                  }}
                >
                  {f !== "all" ? <DeviceDot type={f} size={10} /> : null}
                  <Txt
                    variant="small"
                    style={{
                      color: active ? "#12100d" : p.ink2,
                      fontWeight: active ? "700" : "500",
                    }}
                  >
                    {filterLabel(f, t)}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        </Rise>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(d) => String(d.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={p.brand}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title={t("No devices yet.")}
            hint={t("Tap + to add your first tracker.")}
          />
        }
        ListFooterComponent={<AdSlider style={{ marginTop: 4 }} />}
        renderItem={({ item, index }) => (
          <Rise delay={120 + Math.min(index, 6) * 50}>
            <DeviceRow
              device={item}
              pos={posMap.get(item.id)}
              onPress={() =>
                navigation.navigate("DeviceDetail", { deviceId: item.id })
              }
            />
          </Rise>
        )}
      />

      <AddDeviceModal open={addOpen} onClose={() => setAddOpen(false)} />
    </View>
  );
}
