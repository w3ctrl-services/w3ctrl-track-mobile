import React from "react";
import { FlatList, RefreshControl, SafeAreaView, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Button,
  Card,
  EmptyState,
  LoadingView,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { parseCircle, type TraccarGeofence } from "@w3ctrl/api";
import { useGeofenceDevices, useGeofences } from "../api/hooks";
import type { RootNav } from "../navigation/types";

function GeofenceRow({
  geofence,
  onPress,
}: {
  geofence: TraccarGeofence;
  onPress: () => void;
}) {
  const p = useTheme();
  const t = useT();
  const { data: linked } = useGeofenceDevices(geofence.id);
  const circle = parseCircle(geofence.area);
  return (
    <Card onPress={onPress} style={{ marginBottom: 12 }}>
      <Txt variant="subtitle">{geofence.name}</Txt>
      <Txt variant="small" color={p.muted} style={{ marginTop: 4 }}>
        {circle
          ? `${t("Radius")}: ${Math.round(circle.radius)} m`
          : geofence.area}
      </Txt>
      {linked && linked.length > 0 ? (
        <Txt variant="caption" color={p.muted} style={{ marginTop: 4 }}>
          {t("Linked")}: {linked.length}
        </Txt>
      ) : null}
    </Card>
  );
}

export default function GeofencesScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<RootNav>();
  const { data, isLoading, refetch, isRefetching } = useGeofences();

  if (isLoading && !data) {
    return <LoadingView />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.paper }}>
      <FlatList
        data={data ?? []}
        keyExtractor={(g) => String(g.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={p.brand}
          />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: 12 }}>
            <Button
              title={t("New geofence")}
              onPress={() => navigation.navigate("GeofenceEdit", {})}
            />
          </View>
        }
        ListEmptyComponent={<EmptyState title={t("No geofences yet.")} />}
        renderItem={({ item }) => (
          <GeofenceRow
            geofence={item}
            onPress={() => navigation.navigate("GeofenceEdit", { geofenceId: item.id })}
          />
        )}
      />
    </SafeAreaView>
  );
}
