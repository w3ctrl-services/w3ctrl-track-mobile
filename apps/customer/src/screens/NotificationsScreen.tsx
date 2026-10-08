/**
 * Notifications — the push notification inbox.
 *
 * Every push the app receives (foreground) is archived locally; pushes
 * that arrive with the app closed are shown by the OS and land here the
 * next time the app opens. Tapping an item marks it read; items carrying
 * a Traccar event id deep-link to the Alerts tab.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { BellRing, Trash2 } from "lucide-react-native";
import {
  AppHeader,
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingView,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import type { TabNav } from "../navigation/types";
import {
  inboxClear,
  inboxList,
  inboxMarkAllRead,
  inboxMarkRead,
  type InboxNotification,
} from "../push/notification-store";
import { pushStatus } from "../push/push";

function timeAgo(iso: string, t: (k: string) => string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return t("just now");
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function NotificationsScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<TabNav<"More">>();
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<{ permission: boolean; token: boolean } | null>(null);

  const load = useCallback(async () => {
    const [list, st] = await Promise.all([inboxList(), pushStatus()]);
    setItems(list);
    setStatus({ permission: st.permission, token: st.token });
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openItem = useCallback(
    (item: InboxNotification) => {
      void inboxMarkRead(item.id);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, read: true } : i)));
      navigation.navigate("Main", { screen: "Alerts" });
    },
    [navigation],
  );

  const clearAll = useCallback(() => {
    Alert.alert(t("Clear notifications"), t("Delete the whole inbox?"), [
      { text: t("Cancel"), style: "cancel" },
      {
        text: t("Clear"),
        style: "destructive",
        onPress: () => {
          void inboxClear().then(() => setItems([]));
        },
      },
    ]);
  }, [t]);

  const renderItem = useCallback(
    ({ item }: { item: InboxNotification }) => (
      <Pressable onPress={() => openItem(item)}>
        <Card style={{ marginBottom: 10, opacity: item.read ? 0.75 : 1 }}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: item.read ? p.line : p.brandSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BellRing size={18} color={item.read ? p.muted : p.brandInk} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Txt variant="body" style={{ fontWeight: "700", flex: 1 }}>
                  {item.title}
                </Txt>
                {!item.read && <Badge text={t("new")} tone="brand" />}
              </View>
              {!!item.body && (
                <Txt variant="small" color={p.muted} style={{ marginTop: 4 }}>
                  {item.body}
                </Txt>
              )}
              <Txt variant="small" color={p.faint} style={{ marginTop: 6 }}>
                {timeAgo(item.receivedAt, t)}
              </Txt>
            </View>
          </View>
        </Card>
      </Pressable>
    ),
    [openItem, p, t],
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <AppHeader
        title={t("Notifications")}
        subtitle={t("Push alerts delivered to this phone")}
        onBack={() => navigation.goBack()}
        right={
          items.length > 0 ? (
            <Pressable onPress={clearAll} hitSlop={12} aria-label={t("Clear")}>
              <Trash2 size={20} color={p.muted} />
            </Pressable>
          ) : undefined
        }
      />
      {loading ? (
        <LoadingView text={t("Loading…")} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            status && (!status.permission || !status.token) ? (
              <Card style={{ marginBottom: 12 }}>
                <Txt variant="body" style={{ fontWeight: "700" }}>
                  {t("Push not fully on")}
                </Txt>
                <Txt variant="small" color={p.muted} style={{ marginTop: 4 }}>
                  {!status.permission
                    ? t("Notifications are blocked for W3ctrl Track — enable them in the phone's Settings.")
                    : t("No push token registered yet — reopen the app with the network on.")}
                </Txt>
              </Card>
            ) : items.length > 0 ? (
              <View style={{ marginBottom: 12, alignItems: "flex-end" }}>
                <Button
                  kind="ghost"
                  title={t("Mark all read")}
                  onPress={() => {
                    void inboxMarkAllRead().then(() =>
                      setItems((prev) => prev.map((i) => ({ ...i, read: true }))),
                    );
                  }}
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              title={t("No notifications yet")}
              hint={t("Overspeed, geofence and SOS pushes will land here.")}
            />
          }
        />
      )}
    </View>
  );
}
