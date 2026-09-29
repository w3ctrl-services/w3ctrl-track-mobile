/**
 * PIN gate for settings. After a correct PIN the settings live inline on
 * this screen: update interval (applies live), device ID, language,
 * permission re-check, and a two-tap app reset.
 */
import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  KeyRound,
  Languages,
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
import type { RootStackParamList } from "../App";
import { clearConfig, loadConfig, saveConfig } from "../config";
import {
  checkPermissions,
  clearLastReport,
  isTracking,
  startTracking,
  stopTracking,
} from "../tracking";

type Props = NativeStackScreenProps<RootStackParamList, "Pin">;

const cleanPin = (v: string) => v.replace(/\D/g, "").slice(0, 4);

export default function PinScreen({ navigation }: Props) {
  const t = useT();
  const p = useTheme();
  const { lang, setLang } = useLang();

  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [interval, setInterval] = useState("180");
  const [deviceId, setDeviceId] = useState("");
  const [savedTick, setSavedTick] = useState(false);
  const [permMsg, setPermMsg] = useState<string | null>(null);
  const [permOk, setPermOk] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    (async () => {
      const cfg = await loadConfig();
      setInterval(cfg.intervalSec.toString());
      setDeviceId(cfg.deviceId);
    })();
  }, []);

  const flashSaved = () => {
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1500);
  };

  const onSubmitPin = async () => {
    const cfg = await loadConfig();
    if (cleanPin(pin).length === 4 && cleanPin(pin) === cfg.pin) {
      setUnlocked(true);
      setError(null);
    } else {
      setError(t("Wrong PIN."));
    }
  };

  const onIntervalChange = async (v: string) => {
    setInterval(v);
    const sec = parseInt(v, 10);
    await saveConfig({ intervalSec: sec });
    // apply live: restart the background task with the new cadence
    const on = await isTracking().catch(() => false);
    if (on) {
      await stopTracking();
      await startTracking(sec);
    }
    flashSaved();
  };

  const onSaveDeviceId = async () => {
    await saveConfig({ deviceId: deviceId.trim() });
    flashSaved();
  };

  const onRecheck = async () => {
    const pm = await checkPermissions();
    const ok = pm.foreground && pm.background;
    setPermOk(ok);
    setPermMsg(
      ok
        ? t("Permissions OK — background tracking allowed.")
        : t("Location permission missing."),
    );
  };

  const onReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    await stopTracking().catch(() => {});
    await clearConfig();
    await clearLastReport();
    navigation.reset({ index: 0, routes: [{ name: "Setup" }] });
  };

  return (
    <Screen>
      <Row style={{ marginBottom: 16 }}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityLabel={t("Back")}
        >
          <ChevronLeft size={26} color={p.muted} />
        </Pressable>
        <Txt variant="title" style={{ marginLeft: 4 }}>
          {t("Settings")}
        </Txt>
      </Row>

      {!unlocked ? (
        <Card>
          <Row style={{ gap: 10, marginBottom: 10 }}>
            <KeyRound size={20} color={p.brandInk} />
            <Txt variant="subtitle">{t("Enter PIN")}</Txt>
          </Row>
          <Txt variant="small" color={p.muted} style={{ marginBottom: 10 }}>
            {t("Enter PIN to unlock settings.")}
          </Txt>
          <Field
            label={t("Enter PIN")}
            value={pin}
            onChangeText={(v) => setPin(cleanPin(v))}
            keyboardType="numeric"
            secure
          />
          {error ? (
            <Row style={{ gap: 8, marginBottom: 10 }}>
              <AlertCircle size={18} color={p.alert} />
              <Txt variant="small" color={p.alert}>
                {error}
              </Txt>
            </Row>
          ) : null}
          <Button title={t("Verify")} onPress={onSubmitPin} />
        </Card>
      ) : (
        <>
          {savedTick ? (
            <Row style={{ gap: 8, marginBottom: 12 }}>
              <CheckCircle2 size={18} color={p.ok} />
              <Txt variant="small" color={p.ok}>
                {t("Saved")}
              </Txt>
            </Row>
          ) : null}

          <Card style={{ marginBottom: 12 }}>
            <Row style={{ gap: 10, marginBottom: 10 }}>
              <Timer size={18} color={p.muted} />
              <Txt variant="subtitle">{t("Update interval")}</Txt>
            </Row>
            <Segmented
              options={[
                { value: "60", label: t("Every 1 minute") },
                { value: "180", label: t("Every 3 minutes") },
                { value: "300", label: t("Every 5 minutes") },
              ]}
              value={interval}
              onChange={onIntervalChange}
            />
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <Field
              label={t("Device ID")}
              value={deviceId}
              onChangeText={setDeviceId}
              autoCapitalize="none"
            />
            <Button
              title={t("Save")}
              kind="secondary"
              onPress={onSaveDeviceId}
            />
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <Row style={{ gap: 10, marginBottom: 10 }}>
              <Languages size={18} color={p.muted} />
              <Txt variant="subtitle">{t("Language")}</Txt>
            </Row>
            <Segmented
              options={[
                { value: "en", label: t("English") },
                { value: "hi", label: t("Hindi") },
              ]}
              value={lang}
              onChange={setLang}
            />
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <Button
              title={t("Re-check permissions")}
              kind="secondary"
              onPress={onRecheck}
            />
            {permMsg ? (
              <Row style={{ gap: 8, marginTop: 10 }}>
                {permOk ? (
                  <CheckCircle2 size={18} color={p.ok} />
                ) : (
                  <AlertCircle size={18} color={p.alert} />
                )}
                <Txt
                  variant="small"
                  color={permOk ? p.ok : p.alert}
                  style={{ flex: 1 }}
                >
                  {permMsg}
                </Txt>
              </Row>
            ) : null}
          </Card>

          <Card
            style={{
              borderColor: p.alert,
              backgroundColor: p.alertSoft,
            }}
          >
            <Button
              title={
                confirmReset ? t("Tap again to confirm reset") : t("Reset app")
              }
              kind="danger"
              onPress={onReset}
            />
            <Txt
              variant="small"
              color={p.muted}
              style={{ marginTop: 8, textAlign: "center" }}
            >
              {t("This clears all settings and returns to setup.")}
            </Txt>
          </Card>

          <View style={styles.gap} />
          <Divider />
        </>
      )}
    </Screen>
  );
}
