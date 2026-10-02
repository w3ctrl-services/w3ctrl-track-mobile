import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import {
  AlertTriangle,
  Bell,
  BellRing,
  Gauge,
  MapPin,
  Power,
} from "lucide-react-native";
import {
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
import {
  NOTIFICATION_TYPES,
  eventLabel,
  type TraccarDevice,
  type TraccarEvent,
  type TraccarNotification,
} from "@w3ctrl/api";
import {
  useDeleteNotification,
  useDevices,
  useEvents,
  useNotifications,
} from "../api/hooks";
import { formatRelative } from "../utils/format";
import type { MainTabParamList, TabNav } from "../navigation/types";
import { SmartAlertsPanel } from "../components/SmartAlertsPanel";

type AlertsTab = "feed" | "smart" | "rules";
type Palette = ReturnType<typeof useTheme>;

function isSosEvent(e: TraccarEvent): boolean {
  return (
    e.type === "alarm" &&
    String(e.attributes?.alarm ?? "").toLowerCase().includes("sos")
  );
}

function eventVisual(type: string, p: Palette) {
  switch (type) {
    case "alarm":
      return { Icon: AlertTriangle, bg: p.alertSoft, fg: p.alert };
    case "overspeed":
      return { Icon: Gauge, bg: p.alertSoft, fg: p.alert };
    case "geofenceEnter":
    case "geofenceExit":
      return { Icon: MapPin, bg: p.brandSoft, fg: p.brandInk };
    case "ignitionOn":
    case "ignitionOff":
      return { Icon: Power, bg: p.okSoft, fg: p.ok };
    default:
      return { Icon: Bell, bg: p.surface3, fg: p.muted };
  }
}

function EventCard({ event, deviceName }: { event: TraccarEvent; deviceName: string }) {
  const p = useTheme();
  const t = useT();
  const sos = isSosEvent(event);
  const v = eventVisual(event.type, p);
  return (
    <Card
      style={{
        marginBottom: 12,
        ...(sos ? { borderColor: p.alert, backgroundColor: p.alertSoft } : {}),
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: v.bg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <v.Icon size={18} color={v.fg} />
        </View>
        <View style={{ flex: 1 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <Txt variant="subtitle" color={sos ? p.alert : undefined} style={{ flex: 1 }}>
              {eventLabel(event)}
            </Txt>
            {sos ? <Badge text={t("SOS")} tone="alert" /> : null}
          </Row>
          <Txt variant="small" color={p.muted} style={{ marginTop: 2 }}>
            {deviceName} · {formatRelative(event.eventTime, t)}
          </Txt>
        </View>
      </View>
    </Card>
  );
}

function notificationLabel(n: TraccarNotification, t: (k: string) => string): string {
  const found = NOTIFICATION_TYPES.find((nt) => nt.value === n.type);
  return found ? t(found.label) : n.type;
}

function RuleCard({ rule, onDelete }: { rule: TraccarNotification; onDelete: () => void }) {
  const p = useTheme();
  const t = useT();
  const channels = channelLabels(rule.notificators, t);
  return (
    <Card style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: p.brandSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BellRing size={18} color={p.brandInk} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="subtitle">{notificationLabel(rule, t)}</Txt>
          <Txt variant="small" color={p.muted} style={{ marginTop: 2 }}>
            {t("Notify me by")}: {channels}
          </Txt>
        </View>
        <Button kind="ghost" title={t("Delete")} onPress={onDelete} />
      </View>
    </Card>
  );
}

function channelLabels(notificators: string, t: (k: string) => string): string {
  return notificators
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s === "web" ? t("App") : s === "mail" ? t("Email alerts") : s))
    .join(", ");
}

export default function AlertsScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<TabNav<"Alerts">>();
  const route = useRoute<RouteProp<MainTabParamList, "Alerts">>();
  const [tab, setTab] = useState<AlertsTab>(route.params?.tab ?? "feed");

  useEffect(() => {
    if (route.params?.tab) setTab(route.params.tab);
  }, [route.params?.tab]);

  const { data: devices } = useDevices();
  const byId = useMemo(() => {
    const m = new Map<number, TraccarDevice>();
    (devices ?? []).forEach((d) => m.set(d.id, d));
    return m;
  }, [devices]);

  const { data: events, isLoading, refetch, isRefetching } = useEvents(undefined, 7);
  const { data: notifications } = useNotifications();
  const deleteNotification = useDeleteNotification();

  function confirmDeleteRule(rule: TraccarNotification) {
    Alert.alert(
      notificationLabel(rule, t),
      t("This action cannot be undone."),
      [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Delete"),
          style: "destructive",
          onPress: () => deleteNotification.mutate(rule.id),
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <AppHeader title={t("Alert center")} />
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Segmented<AlertsTab>
          options={[
            { value: "feed", label: t("Activity") },
            { value: "smart", label: t("Smart alerts") },
            { value: "rules", label: t("Alert rules") },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === "feed" ? (
        isLoading && !events ? (
          <LoadingView />
        ) : (
          <FlatList
            data={events ?? []}
            keyExtractor={(e) => String(e.id)}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingTop: 8 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => refetch()}
                tintColor={p.brand}
              />
            }
            ListEmptyComponent={
              <EmptyState title={t("No alerts in the last 7 days.")} />
            }
            renderItem={({ item }) => (
              <EventCard
                event={item}
                deviceName={byId.get(item.deviceId)?.name ?? `#${item.deviceId}`}
              />
            )}
          />
        )
      ) : tab === "smart" ? (
        <View style={{ flex: 1 }}>
          <SmartAlertsPanel />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 32 }}
        >
          <Rise delay={0}>
            <Button
              title={t("New rule")}
              onPress={() => navigation.navigate("AlertRules")}
              style={{ marginBottom: 12 }}
            />
          </Rise>
          {(notifications ?? []).length === 0 ? (
            <EmptyState title={t("No alert rules yet.")} />
          ) : (
            (notifications ?? []).map((n, i) => (
              <Rise key={n.id} delay={Math.min(i, 8) * 60}>
                <RuleCard rule={n} onDelete={() => confirmDeleteRule(n)} />
              </Rise>
            ))
          )}
          <View style={{ height: 8 }} />
        </ScrollView>
      )}
    </View>
  );
}
