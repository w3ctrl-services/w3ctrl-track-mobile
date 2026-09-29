import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Bell, Map as MapIcon, Plus, ShieldCheck } from "lucide-react-native";
import {
  Badge,
  Card,
  EmptyState,
  LoadingView,
  Row,
  Screen,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { eventLabel, type TraccarDevice } from "@w3ctrl/api";
import { useAuth } from "../auth/AuthContext";
import { useDevices, useEvents, useSummary } from "../api/hooks";
import { formatKm, formatRelative, greetingKey, startOfDay } from "../utils/format";
import type { TabNav } from "../navigation/types";

function Kpi({ value, label, accent }: { value: string; label: string; accent?: string }) {
  const p = useTheme();
  return (
    <Card style={{ flex: 1 }}>
      <Txt variant="display" color={accent}>
        {value}
      </Txt>
      <Txt variant="caption" color={p.muted} style={{ marginTop: 4 }}>
        {label}
      </Txt>
    </Card>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <Card style={{ alignItems: "center", gap: 8, paddingVertical: 16 }}>
        {icon}
        <Txt variant="small" style={{ textAlign: "center" }}>
          {label}
        </Txt>
      </Card>
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
  const from = useMemo(() => startOfDay().toISOString(), []);
  const to = useMemo(() => new Date().toISOString(), []);
  const ids = useMemo(() => (devices ?? []).map((d) => d.id), [devices]);
  const { data: summary } = useSummary(ids, from, to);
  const { data: events } = useEvents(undefined, 7);

  const byId = useMemo(() => {
    const m = new Map<number, TraccarDevice>();
    (devices ?? []).forEach((d) => m.set(d.id, d));
    return m;
  }, [devices]);

  if (devicesLoading && !devices) {
    return <LoadingView text={t("devices online")} />;
  }

  const online = (devices ?? []).filter((d) => d.status === "online").length;
  const total = (devices ?? []).length;
  const distanceKm = formatKm((summary ?? []).reduce((s, r) => s + r.distance, 0));
  const sosCount = (events ?? []).filter(isSosEvent).length;
  const latest = (events ?? []).slice(0, 5);
  const firstName = (user?.name ?? "").split(" ")[0];

  return (
    <Screen>
      <Txt variant="display">
        {t(greetingKey())}
        {firstName ? `, ${firstName}` : ""}
      </Txt>
      <Txt variant="small" color={p.muted} style={{ marginTop: 4, marginBottom: 16 }}>
        {t("devices online")}: {online}/{total}
      </Txt>

      <Row style={{ gap: 12, marginBottom: 16 }}>
        <Kpi value={`${online}/${total}`} label={t("devices online")} accent={p.ok} />
        <Kpi value={distanceKm} label={`${t("Total distance today")} (km)`} />
        <Kpi
          value={String(sosCount)}
          label={t("SOS")}
          accent={sosCount > 0 ? p.alert : undefined}
        />
      </Row>

      <Row style={{ gap: 12, marginBottom: 16 }}>
        <QuickAction
          icon={<MapIcon color={p.brandInk} size={24} />}
          label={t("Live map")}
          onPress={() => navigation.navigate("Main", { screen: "Map" })}
        />
        <QuickAction
          icon={<Plus color={p.brandInk} size={24} />}
          label={t("Add device")}
          onPress={() =>
            navigation.navigate("Main", { screen: "Devices", params: { openAdd: true } })
          }
        />
        <QuickAction
          icon={<ShieldCheck color={p.brandInk} size={24} />}
          label={t("Alert rules")}
          onPress={() =>
            navigation.navigate("Main", { screen: "Alerts", params: { tab: "rules" } })
          }
        />
      </Row>

      <Row style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <Txt variant="subtitle">{t("Latest alerts")}</Txt>
        <Pressable onPress={() => navigation.navigate("Main", { screen: "Alerts" })}>
          <Txt variant="small" color={p.brandInk}>
            {t("View all")}
          </Txt>
        </Pressable>
      </Row>

      {latest.length === 0 ? (
        <EmptyState title={t("No alerts in the last 7 days.")} />
      ) : (
        latest.map((e) => {
          const sos = isSosEvent(e);
          const name = byId.get(e.deviceId)?.name ?? `#${e.deviceId}`;
          return (
            <Card
              key={e.id}
              style={{
                marginBottom: 12,
                ...(sos ? { borderColor: p.alert, backgroundColor: p.alertSoft } : {}),
              }}
            >
              <Row style={{ justifyContent: "space-between" }}>
                <Txt variant="subtitle" color={sos ? p.alert : undefined} style={{ flex: 1 }}>
                  {eventLabel(e)}
                </Txt>
                {sos ? <Badge text={t("SOS")} tone="alert" /> : null}
              </Row>
              <Txt variant="small" color={p.muted} style={{ marginTop: 4 }}>
                {name} · {formatRelative(e.eventTime, t)}
              </Txt>
            </Card>
          );
        })
      )}
      <View style={{ height: 8 }} />
    </Screen>
  );
}
