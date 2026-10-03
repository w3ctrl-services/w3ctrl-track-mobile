/**
 * One-time setup, 3 steps — install (done), location permission (live OS
 * check), pair with the parent's app (QR scan, or manual entry). Then child
 * details, update interval, and a settings PIN. On finish the config is
 * saved and background tracking starts immediately — if starting fails the
 * user stays here with the error instead of being stranded on Main.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Image, Linking, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Phone,
  QrCode,
  Timer,
  User,
} from "lucide-react-native";
import {
  Button,
  Card,
  Field,
  Rise,
  Row,
  Screen,
  Segmented,
  Txt,
  styles,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { TraccarError } from "@w3ctrl/api";
import type { RootStackParamList } from "../App";
import { DEFAULT_INTERVAL_SEC, DEFAULT_SERVER, saveConfig } from "../config";
import { checkPermissions, sendTestReport, startTracking } from "../tracking";

type Props = NativeStackScreenProps<RootStackParamList, "Setup">;

const cleanPin = (v: string) => v.replace(/\D/g, "").slice(0, 4);

function StepRow({
  n,
  done,
  title,
  sub,
  last,
}: {
  n: number;
  done: boolean;
  title: string;
  sub: string;
  last?: boolean;
}) {
  const p = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 14,
        alignItems: "flex-start",
        marginBottom: last ? 0 : 20,
      }}
    >
      {done ? (
        <CheckCircle2 size={30} color={p.ok} />
      ) : (
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            borderWidth: 2,
            borderColor: p.lineStrong,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Txt variant="small" color={p.faint} style={{ fontWeight: "700" }}>
            {n}
          </Txt>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Txt style={{ fontWeight: "800", fontSize: 14.5 }}>{title}</Txt>
        <Txt variant="small" color={p.muted} style={{ marginTop: 3 }}>
          {sub}
        </Txt>
      </View>
    </View>
  );
}

export default function SetupScreen({ navigation, route }: Props) {
  const t = useT();
  const p = useTheme();

  const [deviceId, setDeviceId] = useState("");
  const [server, setServer] = useState(DEFAULT_SERVER);
  const [interval, setInterval] = useState(String(DEFAULT_INTERVAL_SEC));
  const [childName, setChildName] = useState("");
  const [contact1Name, setContact1Name] = useState("");
  const [contact1Phone, setContact1Phone] = useState("");
  const [contact2Name, setContact2Name] = useState("");
  const [contact2Phone, setContact2Phone] = useState("");
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [perms, setPerms] = useState<{
    foreground: boolean;
    background: boolean;
  } | null>(null);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Values scanned from the parent's QR land here once, then are cleared
     so a re-render can't overwrite the user's manual edits. */
  const scannedApplied = useRef(false);
  useEffect(() => {
    const s = route.params?.scanned;
    if (s && !scannedApplied.current) {
      scannedApplied.current = true;
      setDeviceId(s.deviceId);
      setServer(s.server);
      setTest(null);
      navigation.setParams({ scanned: undefined });
    }
  }, [route.params?.scanned, navigation]);

  /* Real permission state: checked on mount and every time the screen is
     focused (the user may have just come back from system settings). */
  const refreshPerms = useCallback(async () => {
    try {
      setPerms(await checkPermissions());
    } catch {
      setPerms(null);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      setPerms(null);
      refreshPerms();
    }, [refreshPerms]),
  );

  const onTest = async () => {
    const id = deviceId.trim();
    if (!id) {
      setTest({ ok: false, msg: t("Enter the device ID first.") });
      return;
    }
    setTesting(true);
    setTest(null);
    try {
      await sendTestReport(server.trim() || DEFAULT_SERVER, id);
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

  const onFinish = async () => {
    setError(null);
    const id = deviceId.trim();
    const a = cleanPin(pin1);
    const b = cleanPin(pin2);
    const intervalSec = parseInt(interval, 10) || DEFAULT_INTERVAL_SEC;
    if (!id) {
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
        deviceId: id,
        server: server.trim() || DEFAULT_SERVER,
        pin: a,
        intervalSec,
        childName: childName.trim(),
        contact1Name: contact1Name.trim(),
        contact1Phone: contact1Phone.trim(),
        contact2Name: contact2Name.trim(),
        contact2Phone: contact2Phone.trim(),
        done: true,
      });
    } catch {
      setSaving(false);
      setError(t("Couldn't save the settings. Try again."));
      return;
    }
    try {
      await startTracking(intervalSec);
    } catch (e) {
      setSaving(false);
      setError(
        e instanceof Error
          ? t(e.message)
          : t("Couldn't start tracking. Try again."),
      );
      return; // stay on setup — don't strand the user on Main with no tracking
    }
    navigation.replace("Main");
  };

  const bgOn = perms?.background === true;
  const step2Sub = !perms
    ? t("Checking…")
    : bgOn
      ? t("Background tracking is on")
      : perms.foreground
        ? t("Only “While using” — sharing stops when the app closes")
        : t("Location is off for this app");
  const paired = deviceId.trim().length > 0;

  return (
    <Screen>
      {/* header — real logo, "Track" wordmark, per the redesign */}
      <Rise>
        <Row style={{ gap: 10, marginBottom: 14, alignItems: "center" }}>
          <Image
            source={require("../assets/logo.png")}
            style={{ width: 77, height: 30 }}
            resizeMode="contain"
          />
          <Txt style={{ fontSize: 17, fontWeight: "800", letterSpacing: -0.2 }}>
            {t("Track")}
          </Txt>
        </Row>
        <Txt variant="title" style={{ marginBottom: 4 }}>
          {t("Get")} <Text style={{ color: "#ff7a00" }}>{t("protected")}</Text>
        </Txt>
        <Txt variant="small" color={p.muted} style={{ marginBottom: 16 }}>
          {t("3 quick steps — do it once, then forget the app")}
        </Txt>
      </Rise>

      {/* the 3 steps */}
      <Rise delay={80}>
        <Card>
          <StepRow
            n={1}
            done
            title={t("Install the app")}
            sub={t("Done — you're here")}
          />
          <StepRow
            n={2}
            done={bgOn}
            title={t("Allow location “Always”")}
            sub={step2Sub}
          />
          <StepRow
            n={3}
            done={paired}
            last
            title={t("Pair with parent's app")}
            sub={
              paired
                ? `${t("Paired")}: ${deviceId.trim()}`
                : t("Scan the QR in the parent's app, or enter the code")
            }
          />
        </Card>
      </Rise>

      {/* honest permission warning, only when background isn't granted */}
      {perms && !bgOn ? (
        <Rise delay={120}>
          <Card
            style={{
              marginTop: 12,
              backgroundColor: p.warnSoft,
              borderColor: p.warn,
            }}
          >
            <Row style={{ gap: 10, marginBottom: 8 }}>
              <AlertTriangle size={20} color={p.warn} />
              <Txt style={{ fontWeight: "800", color: p.warn, flex: 1 }}>
                {t("Location isn't set to “Always”")}
              </Txt>
            </Row>
            <Txt variant="small" color={p.ink2} style={{ marginBottom: 12 }}>
              {perms.foreground
                ? t(
                    "With “While using” only, sharing stops the moment the app is closed. Choose “Allow all the time” so the phone keeps sharing in the background.",
                  )
                : t(
                    "Location is turned off for this app, so nothing can be shared. Turn it on to continue.",
                  )}
            </Txt>
            <Button
              title={t("Open system settings")}
              kind="secondary"
              onPress={() => Linking.openSettings()}
            />
          </Card>
        </Rise>
      ) : null}

      <View style={styles.gap} />

      {/* pair this phone */}
      <Rise delay={160}>
        <Card>
          <Row style={{ gap: 8, marginBottom: 14 }}>
            <QrCode size={18} color={p.brandInk} />
            <Txt
              variant="small"
              color={p.muted}
              style={{ fontWeight: "800", textTransform: "uppercase" }}
            >
              {t("Pair this phone")}
            </Txt>
          </Row>
          <Button
            title={t("Scan QR code")}
            onPress={() => navigation.navigate("QrScan")}
            style={{ marginBottom: 12 }}
          />
          <Txt
            variant="small"
            color={p.muted}
            style={{ textAlign: "center", marginBottom: 12 }}
          >
            {t("or enter the details manually")}
          </Txt>
          <Field
            label={t("Device ID")}
            value={deviceId}
            onChangeText={setDeviceId}
            placeholder="aarav-phone"
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
      </Rise>

      <View style={styles.gap} />

      {/* update interval */}
      <Rise delay={200}>
        <Card>
          <Row style={{ gap: 10, marginBottom: 12 }}>
            <Timer size={18} color={p.muted} />
            <Txt variant="subtitle">{t("Location updates")}</Txt>
          </Row>
          <Txt variant="small" color={p.muted} style={{ marginBottom: 10 }}>
            {t("How often this phone reports its location.")}
          </Txt>
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
      </Rise>

      <View style={styles.gap} />

      {/* child details — optional */}
      <Rise delay={240}>
        <Card>
          <Row style={{ gap: 10, marginBottom: 12 }}>
            <User size={18} color={p.muted} />
            <Txt variant="subtitle">{t("Child's details")}</Txt>
          </Row>
          <Txt variant="small" color={p.muted} style={{ marginBottom: 10 }}>
            {t("Optional — shown to the parent in the app.")}
          </Txt>
          <Field
            label={t("Child's name")}
            value={childName}
            onChangeText={setChildName}
            placeholder="Aarav"
            autoCapitalize="words"
          />
          <Row style={{ gap: 8, marginBottom: 12, marginTop: 4 }}>
            <Phone size={16} color={p.muted} />
            <Txt
              variant="small"
              color={p.muted}
              style={{ fontWeight: "800", textTransform: "uppercase" }}
            >
              {t("Emergency contact 1")}
            </Txt>
          </Row>
          <Field
            label={t("Contact 1 name")}
            value={contact1Name}
            onChangeText={setContact1Name}
            autoCapitalize="words"
          />
          <Field
            label={t("Contact 1 phone")}
            value={contact1Phone}
            onChangeText={setContact1Phone}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
          <Row style={{ gap: 8, marginBottom: 12, marginTop: 4 }}>
            <Phone size={16} color={p.muted} />
            <Txt
              variant="small"
              color={p.muted}
              style={{ fontWeight: "800", textTransform: "uppercase" }}
            >
              {t("Emergency contact 2")}
            </Txt>
          </Row>
          <Field
            label={t("Contact 2 name")}
            value={contact2Name}
            onChangeText={setContact2Name}
            autoCapitalize="words"
          />
          <Field
            label={t("Contact 2 phone")}
            value={contact2Phone}
            onChangeText={setContact2Phone}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
        </Card>
      </Rise>

      <View style={styles.gap} />

      {/* PIN */}
      <Rise delay={280}>
        <Card>
          <Row style={{ gap: 10, marginBottom: 12 }}>
            <KeyRound size={18} color={p.muted} />
            <Txt variant="subtitle">{t("Set PIN")}</Txt>
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
      </Rise>

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
        onPress={onFinish}
        loading={saving}
        style={{ marginBottom: 16 }}
      />
    </Screen>
  );
}
