import React, { useState } from "react";
import { Pressable, Switch, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Check } from "lucide-react-native";
import {
  Button,
  Card,
  DeviceDot,
  Row,
  Screen,
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

  return (
    <Screen>
      <Txt variant="subtitle" style={{ marginBottom: 8 }}>
        {t("When")}
      </Txt>
      <Card style={{ marginBottom: 16, padding: 0 }}>
        {NOTIFICATION_TYPES.map((nt) => {
          const active = nt.value === type;
          return (
            <Pressable
              key={nt.value}
              onPress={() => setType(nt.value)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                padding: 14,
                borderBottomWidth: 1,
                borderBottomColor: p.line,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: active ? p.brand : p.lineStrong,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {active ? (
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: p.brand,
                    }}
                  />
                ) : null}
              </View>
              <Txt variant="body" style={{ flex: 1 }}>
                {t(nt.label)}
              </Txt>
            </Pressable>
          );
        })}
      </Card>

      <Txt variant="subtitle" style={{ marginBottom: 8 }}>
        {t("Notify me by")}
      </Txt>
      <Card style={{ marginBottom: 16 }}>
        <Row style={{ justifyContent: "space-between", paddingVertical: 6 }}>
          <Txt variant="body">{t("App")}</Txt>
          <Switch
            value={web}
            onValueChange={setWeb}
            trackColor={{ true: p.brand, false: p.surface3 }}
          />
        </Row>
        <Row style={{ justifyContent: "space-between", paddingVertical: 6 }}>
          <Txt variant="body">{t("Email alerts")}</Txt>
          <Switch
            value={mail}
            onValueChange={setMail}
            trackColor={{ true: p.brand, false: p.surface3 }}
          />
        </Row>
      </Card>

      <Txt variant="subtitle" style={{ marginBottom: 8 }}>
        {t("Link devices")}
      </Txt>
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

      {error ? (
        <Txt variant="small" color={p.alert} style={{ marginBottom: 12 }}>
          {error}
        </Txt>
      ) : null}
      <Button title={t("Save")} onPress={save} loading={busy} />
      <View style={{ height: 8 }} />
    </Screen>
  );
}
