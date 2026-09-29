import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, SafeAreaView, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingView,
  Row,
  Screen,
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

type AlertsTab = "feed" | "rules";

function isSosEvent(e: TraccarEvent): boolean {
  return (
    e.type === "alarm" &&
    String(e.attributes?.alarm ?? "").toLowerCase().includes("sos")
  );
}

function EventCard({ event, deviceName }: { event: TraccarEvent; deviceName: string }) {
  const p = useTheme();
  const t = useT();
  const sos = isSosEvent(event);
  return (
    <Card
      style={{
        marginBottom: 12,
        ...(sos ? { borderColor: p.alert, backgroundColor: p.alertSoft } : {}),
      }}
    >
      <Row style={{ justifyContent: "space-between" }}>
        <Txt variant="subtitle" color={sos ? p.alert : undefined} style={{ flex: 1 }}>
          {eventLabel(event)}
        </Txt>
        {sos ? <Badge text={t("SOS")} tone="alert" /> : null}
      </Row>
      <Txt variant="small" color={p.muted} style={{ marginTop: 4 }}>
        {deviceName} · {formatRelative(event.eventTime, t)}
      </Txt>
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
      <Row style={{ justifyContent: "space-between" }}>
        <Txt variant="subtitle" style={{ flex: 1 }}>
          {notificationLabel(rule, t)}
        </Txt>
        <Button kind="ghost" title={t("Delete")} onPress={onDelete} />
      </Row>
      <Txt variant="small" color={p.muted} style={{ marginTop: 4 }}>
        {t("Notify me by")}: {channels}
      </Txt>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: p.paper }}>
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <Segmented<AlertsTab>
          options={[
            { value: "feed", label: t("Feed") },
            { value: "rules", label: t("Rules") },
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
            contentContainerStyle={{ padding: 16 }}
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
      ) : (
        <Screen>
          <Button
            title={t("New rule")}
            onPress={() => navigation.navigate("AlertRules")}
            style={{ marginBottom: 12 }}
          />
          {(notifications ?? []).length === 0 ? (
            <EmptyState title={t("No alert rules yet.")} />
          ) : (
            (notifications ?? []).map((n) => (
              <RuleCard key={n.id} rule={n} onDelete={() => confirmDeleteRule(n)} />
            ))
          )}
          <View style={{ height: 8 }} />
        </Screen>
      )}
    </SafeAreaView>
  );
}
