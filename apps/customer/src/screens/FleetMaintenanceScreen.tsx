import React, { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Trash2, Wrench } from "lucide-react-native";
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
import {
  useCreateMaintenance,
  useDeleteMaintenance,
  useMaintenance,
} from "../api/hooks";
import type { RootNav } from "../navigation/types";

export default function FleetMaintenanceScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<RootNav>();

  const {
    data: items,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useMaintenance();
  const createMaintenance = useCreateMaintenance();
  const deleteMaintenance = useDeleteMaintenance();

  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("scheduled");
  const [start, setStart] = useState("");
  const [period, setPeriod] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function addItem() {
    setFormError(null);
    if (!name.trim()) {
      setFormError(t("Give the reminder a name."));
      return;
    }
    if (!type.trim()) {
      setFormError(t("Enter a maintenance type."));
      return;
    }
    const startNum = start.trim() ? Number(start) : 0;
    const periodNum = period.trim() ? Number(period) : 0;
    if (!Number.isFinite(startNum) || !Number.isFinite(periodNum)) {
      setFormError(t("Start and period must be numbers."));
      return;
    }
    try {
      await createMaintenance.mutateAsync({
        name: name.trim(),
        type: type.trim(),
        start: startNum,
        period: periodNum,
        attributes: {},
      });
      setName("");
      setType("scheduled");
      setStart("");
      setPeriod("");
      setFormOpen(false);
    } catch {
      setFormError(t("Could not save the reminder. Please try again."));
    }
  }

  function confirmDelete(id: number, itemName: string) {
    Alert.alert(
      t("Delete reminder"),
      t(`Delete "${itemName}"?`),
      [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Delete"),
          style: "destructive",
          onPress: () =>
            deleteMaintenance.mutate(id, {
              onError: () =>
                Alert.alert(
                  t("Could not delete"),
                  t("The reminder could not be deleted. Please try again."),
                ),
            }),
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <AppHeader title={t("Maintenance")} onBack={() => navigation.goBack()} />
      {isLoading ? (
        <LoadingView text={t("Loading reminders…")} />
      ) : isError ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            title={t("Could not load reminders")}
            hint={t("Check your connection and try again.")}
          />
          <View style={{ paddingHorizontal: 16 }}>
            <Button
              title={t("Retry")}
              onPress={() => refetch()}
              loading={isRefetching}
            />
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {(items ?? []).map((m, i) => (
            <Rise key={m.id} delay={Math.min(i, 6) * 60}>
              <Card style={{ marginBottom: 12 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: p.brandSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Wrench size={20} color={p.brandInk} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="body" style={{ fontWeight: "700" }}>
                      {m.name}
                    </Txt>
                    <Txt variant="small" color={p.muted} style={{ marginTop: 2 }}>
                      {m.type ?? "—"}
                      {m.start ? ` · ${t("start")} ${m.start.toLocaleString()} km` : ""}
                      {m.period ? ` · ${t("every")} ${m.period.toLocaleString()} km` : ""}
                    </Txt>
                  </View>
                  <Pressable
                    onPress={() => confirmDelete(m.id, m.name)}
                    hitSlop={10}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: p.alertSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Trash2 size={17} color={p.alert} />
                  </Pressable>
                </View>
              </Card>
            </Rise>
          ))}

          {(items ?? []).length === 0 ? (
            <EmptyState
              title={t("No reminders yet")}
              hint={t(
                "Add oil changes, insurance renewals and pollution certificates so you never miss them.",
              )}
            />
          ) : null}

          {formOpen ? (
            <Rise delay={0}>
              <Card style={{ marginTop: 8 }}>
                <Txt variant="subtitle" style={{ marginBottom: 12 }}>
                  {t("New reminder")}
                </Txt>
                <Field
                  label={t("Name")}
                  value={name}
                  onChangeText={setName}
                  placeholder={t("Engine oil")}
                  autoCapitalize="words"
                />
                <Field
                  label={t("Type")}
                  value={type}
                  onChangeText={setType}
                  placeholder={t("scheduled")}
                  hint={t("Traccar maintenance type, e.g. scheduled")}
                />
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label={t("Start (km)")}
                      value={start}
                      onChangeText={setStart}
                      placeholder="10000"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label={t("Period (km)")}
                      value={period}
                      onChangeText={setPeriod}
                      placeholder="5000"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                {formError ? (
                  <Txt variant="small" color={p.alert} style={{ marginBottom: 12 }}>
                    {formError}
                  </Txt>
                ) : null}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      title={t("Save")}
                      onPress={addItem}
                      loading={createMaintenance.isPending}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      title={t("Cancel")}
                      kind="secondary"
                      onPress={() => {
                        setFormOpen(false);
                        setFormError(null);
                      }}
                    />
                  </View>
                </View>
              </Card>
            </Rise>
          ) : (
            <Rise delay={0}>
              <Button
                title={t("Add reminder")}
                onPress={() => setFormOpen(true)}
              />
            </Rise>
          )}
          <View style={{ height: 8 }} />
        </ScrollView>
      )}
    </View>
  );
}
