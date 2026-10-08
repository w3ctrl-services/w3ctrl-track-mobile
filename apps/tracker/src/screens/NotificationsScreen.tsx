/**
 * Notifications — the push inbox for the tracker phone.
 *
 * This phone reports location; pushes here are for parent→phone messages
 * (future). Every push the app sees is archived locally.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { BellRing, Trash2 } from "lucide-react-native";
import { Badge, Card, EmptyState, LoadingView, Txt, useTheme } from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { TitleHeader } from "../components/Header";
import type { RootStackParamList } from "../App";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  inboxClear,
  inboxList,
  inboxMarkAllRead,
  type InboxNotification,
} from "../push/notification-store";
import { pushStatus } from "../push/push";

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function NotificationsScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ready, setReady] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    const [list, st] = await Promise.all([inboxList(), pushStatus()]);
    setItems(list);
    setReady(st.permission && st.token);
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
              {timeAgo(item.receivedAt)}
            </Txt>
          </View>
        </View>
      </Card>
    ),
    [p, t],
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <TitleHeader
        title={t("Notifications")}
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
            ready === false ? (
              <Card style={{ marginBottom: 12 }}>
                <Txt variant="body" style={{ fontWeight: "700" }}>
                  {t("Push not fully on")}
                </Txt>
                <Txt variant="small" color={p.muted} style={{ marginTop: 4 }}>
                  {t("Enable notifications for W3ctrl Tracker in the phone's Settings.")}
                </Txt>
              </Card>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              title={t("No notifications yet")}
              hint={t("Messages from the parent account will land here.")}
            />
          }
        />
      )}
    </View>
  );
}
