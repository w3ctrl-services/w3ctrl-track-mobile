/**
 * One-time setup: phone identity + test connection, update interval,
 * settings PIN. Single scroll, three numbered steps.
 */
import React, { useState } from "react";
import { View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Languages,
  Smartphone,
  Timer,
} from "lucide-react-native";
import {
  Button,
  Card,
  Divider,
  Field,
  Row,
  Screen,
  Segmented,
  Txt,
  styles,
  useTheme,
} from "@w3ctrl/ui";
import { useLang, useT } from "@w3ctrl/i18n";
import { TraccarError } from "@w3ctrl/api";
import type { RootStackParamList } from "../App";
import { DEFAULT_SERVER, saveConfig } from "../config";
import { sendTestReport } from "../tracking";

type Props = NativeStackScreenProps<RootStackParamList, "Setup">;

function StepBadge({ n }: { n: number }) {
  const p = useTheme();
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: p.brand,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Txt variant="small" style={{ fontWeight: "700", color: "#12100d" }}>
        {n}
      </Txt>
    </View>
  );
}

const cleanPin = (v: string) => v.replace(/\D/g, "").slice(0, 4);

export default function SetupScreen({ navigation }: Props) {
  const t = useT();
  const p = useTheme();
  const { lang, setLang } = useLang();

  const [deviceId, setDeviceId] = useState("");
  const [server, setServer] = useState(DEFAULT_SERVER);
  const [interval, setInterval] = useState("180");
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onTest = async () => {
    setTesting(true);
    setTest(null);
    try {
      await sendTestReport(server.trim() || DEFAULT_SERVER, deviceId.trim());
      setTest({
        ok: true,
        msg: t("Connection OK — the server accepted this device."),
      });
    } catch (e) {
      const msg =
        e instanceof TraccarError && e.status === 400
          ? t(
              "Unknown device ID — add this phone in your W3ctrl Track account first (Devices → Add → Phone).",
            )
          : t("Connection failed. Check the server URL and try again.");
      setTest({ ok: false, msg });
    } finally {
      setTesting(false);
    }
  };

  const onSave = async () => {
    setError(null);
    const a = cleanPin(pin1);
    const b = cleanPin(pin2);
    if (!deviceId.trim()) {
      setError(t("Enter the device ID from your W3ctrl Track account."));
      return;
    }
    if (a.length !== 4 || b.length !== 4) {
      setError(t("Enter a 4-digit PIN in both fields."));
      return;
    }
    if (a !== b) {
      setError(t("PINs do not match — try again."));
      return;
    }
    setSaving(true);
    try {
      await saveConfig({
        deviceId: deviceId.trim(),
        server: server.trim() || DEFAULT_SERVER,
        pin: a,
        intervalSec: parseInt(interval, 10),
        done: true,
      });
      navigation.replace("Main");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Row style={{ gap: 10, marginBottom: 4 }}>
        <Smartphone size={22} color={p.brandInk} />
        <Txt variant="title">{t("Set up this phone")}</Txt>
      </Row>
      <Txt variant="small" color={p.muted} style={{ marginBottom: 16 }}>
        {t("This phone's location is shared with your W3ctrl Track account.")}
      </Txt>

      {/* step 1 — identity */}
      <Card>
        <Row style={{ gap: 10, marginBottom: 12 }}>
          <StepBadge n={1} />
          <Txt variant="subtitle">{t("Phone identity")}</Txt>
        </Row>
        <Field
          label={t("Device ID")}
          value={deviceId}
          onChangeText={setDeviceId}
          placeholder="phone-rahul"
          autoCapitalize="none"
          hint={t(
            "Add this phone in your W3ctrl Track account first (Devices → Add → Phone), then enter its Device ID here.",
          )}
        />
        <Field
          label={t("Server URL")}
          value={server}
          onChangeText={setServer}
          placeholder={DEFAULT_SERVER}
          autoCapitalize="none"
          keyboardType="default"
        />
        <Button
          title={t("Test connection")}
          kind="secondary"
          onPress={onTest}
          loading={testing}
        />
        {test ? (
          <Row style={{ gap: 8, marginTop: 10 }}>
            {test.ok ? (
              <CheckCircle2 size={18} color={p.ok} />
            ) : (
              <AlertCircle size={18} color={p.alert} />
            )}
            <Txt
              variant="small"
              color={test.ok ? p.ok : p.alert}
              style={{ flex: 1 }}
            >
              {test.msg}
            </Txt>
          </Row>
        ) : null}
      </Card>

      <View style={styles.gap} />

      {/* step 2 — interval */}
      <Card>
        <Row style={{ gap: 10, marginBottom: 12 }}>
          <StepBadge n={2} />
          <Txt variant="subtitle">{t("Update interval")}</Txt>
          <Timer size={18} color={p.muted} />
        </Row>
        <Segmented
          options={[
            { value: "60", label: t("Every 1 minute") },
            { value: "180", label: t("Every 3 minutes") },
            { value: "300", label: t("Every 5 minutes") },
          ]}
          value={interval}
          onChange={setInterval}
        />
      </Card>

      <View style={styles.gap} />

      {/* step 3 — PIN */}
      <Card>
        <Row style={{ gap: 10, marginBottom: 12 }}>
          <StepBadge n={3} />
          <Txt variant="subtitle">{t("Set PIN")}</Txt>
          <KeyRound size={18} color={p.muted} />
        </Row>
        <Txt variant="small" color={p.muted} style={{ marginBottom: 10 }}>
          {t("Choose a 4-digit PIN to lock settings.")}
        </Txt>
        <Field
          label={t("Enter PIN")}
          value={pin1}
          onChangeText={(v) => setPin1(cleanPin(v))}
          keyboardType="numeric"
          secure
        />
        <Field
          label={t("Confirm PIN")}
          value={pin2}
          onChangeText={(v) => setPin2(cleanPin(v))}
          keyboardType="numeric"
          secure
        />
      </Card>

      <View style={styles.gap} />

      {error ? (
        <Row style={{ gap: 8, marginBottom: 12 }}>
          <AlertCircle size={18} color={p.alert} />
          <Txt variant="small" color={p.alert} style={{ flex: 1 }}>
            {error}
          </Txt>
        </Row>
      ) : null}

      <Button
        title={t("Finish setup")}
        onPress={onSave}
        loading={saving}
        style={{ marginBottom: 16 }}
      />

      <Divider />
      <Row style={{ gap: 10, alignItems: "center" }}>
        <Languages size={18} color={p.muted} />
        <Txt variant="small" color={p.muted} style={{ flex: 1 }}>
          {t("Language")}
        </Txt>
        <View style={{ flex: 1.4 }}>
          <Segmented
            options={[
              { value: "en", label: t("English") },
              { value: "hi", label: t("Hindi") },
            ]}
            value={lang}
            onChange={setLang}
          />
        </View>
      </Row>
    </Screen>
  );
}
