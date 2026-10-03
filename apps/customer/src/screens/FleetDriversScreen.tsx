import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Pencil, Plus, Trash2, UserRound } from "lucide-react-native";
import {
  AppHeader,
  Button,
  Card,
  EmptyState,
  Field,
  LoadingView,
  Rise,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import type { TraccarDriver } from "@w3ctrl/api";
import {
  useCreateDriver,
  useDeleteDriver,
  useDrivers,
  useUpdateDriver,
} from "../api/hooks";
import type { RootNav } from "../navigation/types";

function DriverRow({
  driver,
  index,
  editing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: {
  driver: TraccarDriver;
  index: number;
  editing: boolean;
  onEdit: () => void;
  onSave: (name: string, uniqueId: string) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const p = useTheme();
  const t = useT();
  const [name, setName] = useState(driver.name);
  const [uniqueId, setUniqueId] = useState(driver.uniqueId ?? "");

  if (editing) {
    return (
      <Card style={{ marginBottom: 12 }}>
        <Field label={t("Name")} value={name} onChangeText={setName} />
        <Field
          label={t("Tag ID (optional)")}
          value={uniqueId}
          onChangeText={setUniqueId}
          placeholder={t("RFID / iButton tag")}
          hint={t("Hardware identifier of the driver's tag.")}
        />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              title={t("Save")}
              onPress={() => onSave(name, uniqueId)}
              disabled={!name.trim()}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button title={t("Cancel")} kind="secondary" onPress={onCancel} />
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Rise delay={Math.min(index, 8) * 60}>
      <Card style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              backgroundColor: p.brandSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <UserRound size={20} color={p.brandInk} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="subtitle" style={{ fontWeight: "700" }}>
              {driver.name}
            </Txt>
            <Txt variant="small" color={p.muted} style={{ marginTop: 2 }}>
              {driver.uniqueId
                ? `${t("Tag")}: ${driver.uniqueId}`
                : t("No tag linked")}
            </Txt>
          </View>
          <Pressable
            onPress={onEdit}
            hitSlop={10}
            accessibilityLabel={t("Edit driver")}
            style={{ padding: 6 }}
          >
            <Pencil size={18} color={p.muted} />
          </Pressable>
          <Pressable
            onPress={onDelete}
            hitSlop={10}
            accessibilityLabel={t("Delete driver")}
            style={{ padding: 6 }}
          >
            <Trash2 size={18} color={p.alert} />
          </Pressable>
        </View>
      </Card>
    </Rise>
  );
}

export default function FleetDriversScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<RootNav>();
  const { data, isLoading, isRefetching, refetch, isError } = useDrivers();
  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver();
  const deleteDriver = useDeleteDriver();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [uniqueId, setUniqueId] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setAdding(false);
    setName("");
    setUniqueId("");
    setFormError(null);
  };

  const handleCreate = () => {
    if (!name.trim()) {
      setFormError(t("Name is required."));
      return;
    }
    setFormError(null);
    const payload: Omit<TraccarDriver, "id"> = { name: name.trim() };
    if (uniqueId.trim()) payload.uniqueId = uniqueId.trim();
    createDriver.mutate(payload, {
      onSuccess: resetForm,
      onError: (e) =>
        setFormError(
          e instanceof Error ? e.message : t("Couldn't add the driver."),
        ),
    });
  };

  const handleDelete = (driver: TraccarDriver) => {
    Alert.alert(t("Delete driver"), `${t("Remove")} ${driver.name}?`, [
      { text: t("Cancel"), style: "cancel" },
      {
        text: t("Delete"),
        style: "destructive",
        onPress: () =>
          deleteDriver.mutate(driver.id, {
            onError: (e) =>
              Alert.alert(
                t("Couldn't delete"),
                e instanceof Error ? e.message : "",
              ),
          }),
      },
    ]);
  };

  const handleSaveEdit = (
    driver: TraccarDriver,
    editName: string,
    editUniqueId: string,
  ) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      Alert.alert(t("Name is required."));
      return;
    }
    updateDriver.mutate(
      {
        id: driver.id,
        data: {
          ...driver,
          name: trimmed,
          uniqueId: editUniqueId.trim() || undefined,
        },
      },
      {
        onSuccess: () => setEditingId(null),
        onError: (e) =>
          Alert.alert(
            t("Couldn't save"),
            e instanceof Error ? e.message : "",
          ),
      },
    );
  };

  if (isLoading && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: p.paper }}>
        <AppHeader
          title={t("Drivers")}
          subtitle={t("Who drives what")}
          onBack={() => navigation.goBack()}
        />
        <LoadingView text={t("Loading drivers…")} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <AppHeader
        title={t("Drivers")}
        subtitle={
          data && data.length > 0
            ? `${data.length} ${t("drivers")}`
            : undefined
        }
        onBack={() => navigation.goBack()}
        right={
          <Pressable
            onPress={() => setAdding((a) => !a)}
            hitSlop={12}
            accessibilityLabel={t("Add driver")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: p.brand,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Plus size={15} color="#181200" />
            <Txt variant="small" style={{ fontWeight: "700", color: "#181200" }}>
              {t("Add")}
            </Txt>
          </Pressable>
        }
      />
      {adding ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <Card>
            <Field
              label={t("Name")}
              value={name}
              onChangeText={setName}
              placeholder={t("e.g. Harpreet Singh")}
              autoCapitalize="words"
            />
            <Field
              label={t("Tag ID (optional)")}
              value={uniqueId}
              onChangeText={setUniqueId}
              placeholder={t("RFID / iButton tag")}
            />
            {formError ? (
              <Txt variant="small" color={p.alert} style={{ marginBottom: 8 }}>
                {formError}
              </Txt>
            ) : null}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title={t("Add driver")}
                  onPress={handleCreate}
                  loading={createDriver.isPending}
                  disabled={!name.trim()}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title={t("Cancel")}
                  kind="secondary"
                  onPress={resetForm}
                />
              </View>
            </View>
          </Card>
        </View>
      ) : null}
      {isError && !data ? (
        <EmptyState
          title={t("Couldn't load drivers")}
          hint={t("Pull to refresh or try again later.")}
        />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title={t("No drivers yet")}
          hint={t("Add drivers so every trip, alert and report shows who was driving.")}
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(d) => String(d.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={p.brand}
            />
          }
          renderItem={({ item, index }) => (
            <DriverRow
              key={item.id}
              driver={item}
              index={index}
              editing={editingId === item.id}
              onEdit={() => setEditingId(item.id)}
              onCancel={() => setEditingId(null)}
              onSave={(n, u) => handleSaveEdit(item, n, u)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}
    </View>
  );
}
