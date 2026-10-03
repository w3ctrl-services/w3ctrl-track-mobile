import React, { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { TerminalSquare, Trash2 } from "lucide-react-native";
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
  useCreateSavedCommand,
  useDeleteSavedCommand,
  useDevices,
  useSavedCommands,
  useSendCommand,
} from "../api/hooks";
import type { RootNav } from "../navigation/types";

export default function FleetCommandsScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<RootNav>();

  const { data: devices, isLoading: devicesLoading } = useDevices();
  const {
    data: commands,
    isLoading: commandsLoading,
    isError,
    refetch,
    isRefetching,
  } = useSavedCommands();
  const sendCommand = useSendCommand();
  const createCommand = useCreateSavedCommand();
  const deleteCommand = useDeleteSavedCommand();

  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [cmdType, setCmdType] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);

  const activeDeviceId = selectedDevice ?? devices?.[0]?.id ?? null;

  function send(id: number, type: string) {
    if (activeDeviceId == null) {
      Alert.alert(t("No device"), t("Add a device before sending commands."));
      return;
    }
    setSendingId(id);
    sendCommand.mutate(
      { deviceId: activeDeviceId, type },
      {
        onSuccess: () => {
          setSendingId(null);
          Alert.alert(
            t("Command sent"),
            t("The command was queued for delivery to the tracker."),
          );
        },
        onError: () => {
          setSendingId(null);
          Alert.alert(
            t("Send failed"),
            t("The command could not be sent. Please try again."),
          );
        },
      },
    );
  }

  async function addCommand() {
    setFormError(null);
    if (!description.trim()) {
      setFormError(t("Give the command a name."));
      return;
    }
    if (!cmdType.trim()) {
      setFormError(t("Enter a command type."));
      return;
    }
    try {
      await createCommand.mutateAsync({
        description: description.trim(),
        type: cmdType.trim(),
        attributes: {},
      });
      setDescription("");
      setCmdType("");
      setFormOpen(false);
    } catch {
      setFormError(t("Could not save the command. Please try again."));
    }
  }

  function confirmDelete(id: number, label: string) {
    Alert.alert(t("Delete command"), t(`Delete "${label}"?`), [
      { text: t("Cancel"), style: "cancel" },
      {
        text: t("Delete"),
        style: "destructive",
        onPress: () =>
          deleteCommand.mutate(id, {
            onError: () =>
              Alert.alert(
                t("Could not delete"),
                t("The command could not be deleted. Please try again."),
              ),
          }),
      },
    ]);
  }

  const loading = devicesLoading || commandsLoading;

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <AppHeader
        title={t("Commands")}
        subtitle={t("Talk to any tracker")}
        onBack={() => navigation.goBack()}
      />
      {loading ? (
        <LoadingView text={t("Loading commands…")} />
      ) : isError ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            title={t("Could not load commands")}
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
          {/* device picker */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 16 }}
            style={{ marginBottom: 16 }}
          >
            {(devices ?? []).map((d) => {
              const active = d.id === activeDeviceId;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => setSelectedDevice(d.id)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? p.ink : p.line,
                    backgroundColor: active ? p.ink : p.surface,
                  }}
                >
                  <Txt
                    variant="body"
                    color={active ? "#fff" : p.ink}
                    style={active ? { fontWeight: "700" } : undefined}
                  >
                    {d.name}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>
          {(devices ?? []).length === 0 ? (
            <Txt variant="small" color={p.muted} style={{ marginBottom: 16 }}>
              {t("No devices yet.")}
            </Txt>
          ) : null}

          {/* saved commands */}
          {(commands ?? []).map((c, i) => (
            <Rise key={c.id} delay={Math.min(i, 6) * 60}>
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
                    <TerminalSquare size={20} color={p.brandInk} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="body" style={{ fontWeight: "700" }}>
                      {c.description ?? c.type}
                    </Txt>
                    <Txt variant="small" color={p.muted} style={{ marginTop: 2 }}>
                      {c.type}
                    </Txt>
                  </View>
                  <Pressable
                    onPress={() => confirmDelete(c.id, c.description ?? c.type)}
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
                <View style={{ marginTop: 12 }}>
                  <Button
                    title={sendingId === c.id ? t("Sending…") : t("Send")}
                    kind={c.type.includes("engineStop") ? "danger" : "primary"}
                    onPress={() => send(c.id, c.type)}
                    loading={sendingId === c.id}
                  />
                </View>
              </Card>
            </Rise>
          ))}

          {(commands ?? []).length === 0 ? (
            <EmptyState
              title={t("No saved commands")}
              hint={t(
                "Save commands like engineStop, locate or doorLock to send them to your trackers.",
              )}
            />
          ) : null}

          <Txt
            variant="small"
            color={p.muted}
            style={{ textAlign: "center", marginBottom: 16 }}
          >
            {t("Commands queue when the tracker is offline.")}
          </Txt>

          {formOpen ? (
            <Rise delay={0}>
              <Card style={{ marginTop: 4 }}>
                <Txt variant="subtitle" style={{ marginBottom: 12 }}>
                  {t("New command")}
                </Txt>
                <Field
                  label={t("Description")}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t("Engine cut-off")}
                  autoCapitalize="words"
                />
                <Field
                  label={t("Type")}
                  value={cmdType}
                  onChangeText={setCmdType}
                  placeholder={t("engineStop")}
                  hint={t("The command type your tracker supports.")}
                />
                {formError ? (
                  <Txt variant="small" color={p.alert} style={{ marginBottom: 12 }}>
                    {formError}
                  </Txt>
                ) : null}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      title={t("Save")}
                      onPress={addCommand}
                      loading={createCommand.isPending}
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
                title={t("Add command")}
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
