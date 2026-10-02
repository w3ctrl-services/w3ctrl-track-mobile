import React, { useState } from "react";
import { Pressable, ScrollView, Switch, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Bell, Check, Mail } from "lucide-react-native";
import {
  AppHeader,
  Button,
  Card,
  DeviceDot,
  Rise,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { NOTIFICATION_TYPES, getDeviceType } from "@w3ctrl/api";
import {
  useCreateNotification,
  useDevices,
  useLinkPermission,
} from "../api/hooks";
import type { RootNav } from "../navigation/types";

export default function AlertRulesScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<RootNav>();

  const [type, setType] = useState<string>("geofenceEnter");
  const [web, setWeb] = useState(true);
  const [mail, setMail] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: devices } = useDevices();
  const createNotification = useCreateNotification();
  const linkPermission = useLinkPermission();

  function toggle(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function save() {
    if (selected.length === 0) {
      setError(t("Select at least one device."));
      return;
    }
    const notificators = [web ? "web" : "", mail ? "mail" : ""]
      .filter(Boolean)
      .join(",");
    if (!notificators) {
      setError(t("Choose at least one notification channel."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const n = await createNotification.mutateAsync({
        type,
        notificators,
        attributes: {},
      });
      for (const deviceId of selected) {
        await linkPermission.mutateAsync({ deviceId, notificationId: n.id });
      }
      navigation.goBack();
    } catch {
      setError(t("Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  const kicker = {
    fontSize: 12,
    fontWeight: "700" as const,
    color: p.muted,
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <AppHeader title={t("New rule")} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Rise delay={0}>
          <Txt style={kicker}>{t("Alarm types")}</Txt>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 16 }}
            style={{ marginBottom: 16 }}
          >
            {NOTIFICATION_TYPES.map((nt) => {
              const active = nt.value === type;
              return (
                <Pressable
                  key={nt.value}
                  onPress={() => setType(nt.value)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? p.brand : p.line,
                    backgroundColor: active ? p.brandSoft : p.surface,
                  }}
                >
                  <Txt
                    variant="body"
                    color={active ? p.brandInk : p.ink}
                    style={active ? { fontWeight: "700" } : undefined}
                  >
                    {t(nt.label)}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        </Rise>

        <Rise delay={60}>
          <Txt style={kicker}>{t("Notify me by")}</Txt>
          <Card style={{ marginBottom: 16, paddingVertical: 6 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 8,
              }}
            >
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
                <Bell size={18} color={p.brandInk} />
              </View>
              <Txt variant="body" style={{ flex: 1 }}>
                {t("App")}
              </Txt>
              <Switch
                value={web}
                onValueChange={setWeb}
                trackColor={{ true: p.brand, false: p.surface3 }}
              />
            </View>
            <View style={{ height: 1, backgroundColor: p.line, marginVertical: 4 }} />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 8,
              }}
            >
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
                <Mail size={18} color={p.brandInk} />
              </View>
              <Txt variant="body" style={{ flex: 1 }}>
                {t("Email alerts")}
              </Txt>
              <Switch
                value={mail}
                onValueChange={setMail}
                trackColor={{ true: p.brand, false: p.surface3 }}
              />
            </View>
          </Card>
        </Rise>

        <Rise delay={120}>
          <Txt style={kicker}>{t("Link devices")}</Txt>
          <Card style={{ marginBottom: 16 }}>
            {(devices ?? []).map((d) => {
              const checked = selected.includes(d.id);
              return (
                <Pressable
                  key={d.id}
                  onPress={() => toggle(d.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: p.line,
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: checked ? p.brand : p.lineStrong,
                      backgroundColor: checked ? p.brand : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {checked ? <Check color="#12100d" size={16} /> : null}
                  </View>
                  <DeviceDot type={getDeviceType(d)} />
                  <Txt variant="body" style={{ flex: 1 }} numberOfLines={1}>
                    {d.name}
                  </Txt>
                </Pressable>
              );
            })}
            {(devices ?? []).length === 0 ? (
              <Txt variant="small" color={p.muted}>
                {t("No devices yet.")}
              </Txt>
            ) : null}
          </Card>
        </Rise>

        {error ? (
          <Txt variant="small" color={p.alert} style={{ marginBottom: 12 }}>
            {error}
          </Txt>
        ) : null}
        <Rise delay={180}>
          <Button title={t("Save")} onPress={save} loading={busy} />
        </Rise>
        <View style={{ height: 8 }} />
      </ScrollView>
    </View>
  );
}
