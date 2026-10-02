import React from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { BellRing, ChevronRight, MapPin, Pentagon, Plus } from "lucide-react-native";
import {
  AppHeader,
  Card,
  EmptyState,
  LoadingView,
  Rise,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { parseCircle, type TraccarGeofence } from "@w3ctrl/api";
import { useGeofenceDevices, useGeofences } from "../api/hooks";
import type { RootNav } from "../navigation/types";

function GeofenceRow({
  geofence,
  index,
  onPress,
}: {
  geofence: TraccarGeofence;
  index: number;
  onPress: () => void;
}) {
  const p = useTheme();
  const t = useT();
  const { data: linked } = useGeofenceDevices(geofence.id);
  const circle = parseCircle(geofence.area);
  const Icon = circle ? MapPin : Pentagon;
  return (
    <Rise delay={Math.min(index, 8) * 60}>
      <Card onPress={onPress} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              backgroundColor: circle ? p.brandSoft : p.surface3,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={20} color={circle ? p.brandInk : p.muted} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="subtitle">{geofence.name}</Txt>
            <Txt variant="small" color={p.muted} style={{ marginTop: 2 }}>
              {circle
                ? `${t("Circle")} · ${Math.round(circle.radius)} m`
                : t("Polygon")}
            </Txt>
            {linked && linked.length > 0 ? (
              <Txt variant="caption" color={p.muted} style={{ marginTop: 2 }}>
                {t("Linked")}: {linked.length}
              </Txt>
            ) : null}
          </View>
          <ChevronRight size={18} color={p.faint} />
        </View>
      </Card>
    </Rise>
  );
}

export default function GeofencesScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<RootNav>();
  const { data, isLoading, refetch, isRefetching } = useGeofences();

  if (isLoading && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: p.paper }}>
        <AppHeader title={t("Geofences")} onBack={() => navigation.goBack()} />
        <LoadingView />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <AppHeader
        title={t("Geofences")}
        subtitle={
          data && data.length > 0 ? `${data.length} ${t("zones")}` : undefined
        }
        onBack={() => navigation.goBack()}
      />
      <FlatList
        data={data ?? []}
        keyExtractor={(g) => String(g.id)}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={p.brand}
          />
        }
        ListHeaderComponent={
          <Rise delay={0}>
            <Card
              style={{
                marginBottom: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <BellRing size={18} color={p.brand} />
              <Txt
                variant="small"
                color={p.muted}
                style={{ flex: 1, lineHeight: 20 }}
              >
                {t(
                  "Enter/exit alerts for active zones land in the Alert center instantly.",
                )}
              </Txt>
            </Card>
          </Rise>
        }
        ListEmptyComponent={<EmptyState title={t("No geofences yet.")} />}
        renderItem={({ item, index }) => (
          <GeofenceRow
            geofence={item}
            index={index}
            onPress={() =>
              navigation.navigate("GeofenceEdit", { geofenceId: item.id })
            }
          />
        )}
      />
      <Pressable
        onPress={() => navigation.navigate("GeofenceEdit", {})}
        accessibilityLabel={t("New geofence")}
        style={({ pressed }) => [
          {
            position: "absolute",
            right: 20,
            bottom: 24,
            width: 58,
            height: 58,
            borderRadius: 29,
            backgroundColor: p.brand,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.9 : 1,
            shadowColor: "#000",
            shadowOpacity: 0.25,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          },
        ]}
      >
        <Plus size={28} color="#181200" />
      </Pressable>
    </View>
  );
}
