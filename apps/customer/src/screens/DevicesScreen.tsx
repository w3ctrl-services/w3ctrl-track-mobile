import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  View,
} from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Plus, X } from "lucide-react-native";
import {
  Badge,
  Button,
  Card,
  DeviceDot,
  EmptyState,
  Field,
  LoadingView,
  Row,
  Segmented,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import {
  batteryOf,
  getDeviceType,
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

function statusTone(status: string): "ok" | "alert" | "neutral" {
  if (status === "online") return "ok";
  if (status === "offline") return "alert";
  return "neutral";
}

function statusKey(status: string): string {
  if (status === "online") return "Online";
  if (status === "offline") return "Offline";
  return "Unknown";
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
  return (
    <Pressable onPress={onPress}>
      <Card style={{ marginBottom: 12 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <Row style={{ gap: 10, flex: 1 }}>
            <DeviceDot type={getDeviceType(device)} size={14} />
            <Txt variant="subtitle" style={{ flex: 1 }} numberOfLines={1}>
              {device.name}
            </Txt>
          </Row>
          <Badge text={t(statusKey(device.status))} tone={statusTone(device.status)} />
        </Row>
        <Row style={{ gap: 12, marginTop: 8 }}>
          <Txt variant="small" color={p.muted}>
            {t("Last seen")}: {formatRelative(device.lastUpdate, t)}
          </Txt>
          {batt != null ? (
            <Txt variant="small" color={batteryColor(p, batt)}>
              {t("Battery")}: {batt}%
            </Txt>
          ) : null}
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
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (route.params?.openAdd) {
      setAddOpen(true);
      tabNavigation.setParams({ openAdd: undefined });
    }
  }, [route.params?.openAdd, tabNavigation]);

  const filtered = useMemo(
    () =>
      (devices ?? []).filter(
        (d) => filter === "all" || getDeviceType(d) === filter,
      ),
    [devices, filter],
  );

  if (isLoading && !devices) {
    return <LoadingView />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.paper }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Row style={{ gap: 8, paddingRight: 16 }}>
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
          </Row>
        </ScrollView>
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
        renderItem={({ item }) => (
          <DeviceRow
            device={item}
            pos={posMap.get(item.id)}
            onPress={() => navigation.navigate("DeviceDetail", { deviceId: item.id })}
          />
        )}
      />

      <Pressable
        onPress={() => setAddOpen(true)}
        accessibilityLabel={t("Add device")}
        style={{
          position: "absolute",
          right: 20,
          bottom: 24,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: p.brand,
          alignItems: "center",
          justifyContent: "center",
          elevation: 4,
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
        }}
      >
        <Plus color="#12100d" size={28} />
      </Pressable>

      <AddDeviceModal open={addOpen} onClose={() => setAddOpen(false)} />
    </SafeAreaView>
  );
}
