/**
 * The one big screen: tracking status, start/stop, live stats,
 * hold-for-SOS, and a background-permission banner.
 * Polls truth (isTracking + last report) every 10 s.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Linking, Pressable, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  AlertTriangle,
  Battery,
  CheckCircle2,
  Clock,
  Crosshair,
  Settings,
  Siren,
  Smartphone,
  Timer,
} from "lucide-react-native";
import {
  Button,
  Card,
  Row,
  Screen,
  Txt,
  styles,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import type { RootStackParamList } from "../App";
import { loadConfig } from "../config";
import {
  checkPermissions,
  isTracking,
  readLastReport,
  sendSos,
  startTracking,
  stopTracking,
  type LastReport,
} from "../tracking";

function ago(t: (k: string) => string, at: number | null): string {
  if (!at) return t("Never");
  const s = Math.floor((Date.now() - at) / 1000);
  if (s < 45) return t("Just now");
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} ${t("min ago")}`;
  return `${Math.floor(m / 60)} ${t("hr ago")}`;
}

function intervalLabel(
  t: (k: string) => string,
  sec: number,
): string {
  if (sec === 60) return t("Every 1 minute");
  if (sec === 180) return t("Every 3 minutes");
  if (sec === 300) return t("Every 5 minutes");
  return `${Math.max(1, Math.round(sec / 60))} min`;
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  const p = useTheme();
  return (
    <Card style={{ flex: 1, padding: 14, gap: 6 }}>
      <Row style={{ gap: 6 }}>
        {icon}
        <Txt variant="small" color={p.muted}>
          {label}
        </Txt>
      </Row>
      <Txt variant="subtitle">{value}</Txt>
    </Card>
  );
}

export default function MainScreen() {
  const t = useT();
  const p = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [trackingOn, setTrackingOn] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [intervalSec, setIntervalSec] = useState(180);
  const [perms, setPerms] = useState<{
    foreground: boolean;
    background: boolean;
  } | null>(null);
  const [last, setLast] = useState<LastReport | null>(null);
  const [toggling, setToggling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [holding, setHolding] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const [sosError, setSosError] = useState(false);
  const holdAnim = useRef(new Animated.Value(0)).current;

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!trackingOn) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [trackingOn, pulse]);

  const refresh = useCallback(async () => {
    const [on, rep, cfg, pm] = await Promise.all([
      isTracking().catch(() => false),
      readLastReport(),
      loadConfig().catch(() => null),
      checkPermissions().catch(() => null),
    ]);
    setTrackingOn(on);
    setLast(rep);
    if (cfg) {
      setDeviceId(cfg.deviceId);
      setIntervalSec(cfg.intervalSec);
    }
    if (pm) setPerms(pm);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const onToggle = async () => {
    setToggling(true);
    setActionError(null);
    try {
      if (trackingOn) {
        await stopTracking();
      } else {
        const cfg = await loadConfig();
        await startTracking(cfg.intervalSec);
      }
      await refresh();
    } catch (e) {
      // tracking.ts throws i18n keys as messages
      setActionError(t(e instanceof Error ? e.message : String(e)));
    } finally {
      setToggling(false);
    }
  };

  const beginHold = () => {
    if (!trackingOn) return;
    setHolding(true);
    setSosError(false);
    Animated.timing(holdAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  };

  const endHold = () => {
    holdAnim.stopAnimation();
    holdAnim.setValue(0);
    setHolding(false);
  };

  const fireSos = async () => {
    setHolding(false);
    holdAnim.setValue(0);
    try {
      await sendSos();
      setSosSent(true);
    } catch {
      setSosError(true);
    }
  };

  const batteryText =
    last?.battery != null ? `${last.battery}%` : t("Unknown");
  const accuracyText =
    last?.accuracy != null ? `±${Math.round(last.accuracy)} m` : t("Unknown");

  return (
    <Screen>
      {/* header */}
      <Row style={{ marginBottom: 16 }}>
        <Row style={{ gap: 10, flex: 1 }}>
          <Smartphone size={22} color={p.brandInk} />
          <Txt variant="title">{t("W3ctrl Tracker")}</Txt>
        </Row>
        <Pressable
          onPress={() => navigation.navigate("Pin")}
          hitSlop={12}
          accessibilityLabel={t("Settings")}
        >
          <Settings size={24} color={p.muted} />
        </Pressable>
      </Row>

      {/* background-permission banner */}
      {perms && !perms.background ? (
        <Card
          style={{
            marginBottom: 12,
            borderColor: p.warn,
            backgroundColor: p.warnSoft,
          }}
        >
          <Row style={{ gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={18} color={p.warn} />
            <Txt variant="small" color={p.ink} style={{ flex: 1 }}>
              {t(
                "Grant “Always” location permission, or tracking stops in the background.",
              )}
            </Txt>
          </Row>
          <Button
            title={t("Open settings")}
            kind="secondary"
            onPress={() => Linking.openSettings()}
          />
        </Card>
      ) : null}

      {actionError ? (
        <Card
          style={{
            marginBottom: 12,
            borderColor: p.alert,
            backgroundColor: p.alertSoft,
          }}
        >
          <Row style={{ gap: 8 }}>
            <AlertTriangle size={18} color={p.alert} />
            <Txt variant="small" color={p.alert} style={{ flex: 1 }}>
              {actionError}
            </Txt>
          </Row>
        </Card>
      ) : null}

      {/* status */}
      <Card style={{ marginBottom: 12 }}>
        <Row style={{ gap: 10, marginBottom: 8 }}>
          <Animated.View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: trackingOn ? p.ok : p.faint,
              opacity: pulse,
            }}
          />
          <Txt variant="subtitle">
            {trackingOn ? t("Tracking is ON") : t("Tracking is OFF")}
          </Txt>
        </Row>
        <Txt
          variant="small"
          color={p.muted}
          style={{ fontFamily: "monospace", marginBottom: 8 }}
        >
          {deviceId || "—"}
        </Txt>
        <Row style={{ gap: 16 }}>
          <Txt variant="small" color={p.muted}>
            {t("Last sent")}: {ago(t, last?.at ?? null)}
          </Txt>
          <Txt variant="small" color={p.muted}>
            {t("Battery")}: {batteryText}
          </Txt>
        </Row>
      </Card>

      <Button
        title={trackingOn ? t("Stop tracking") : t("Start tracking")}
        kind={trackingOn ? "secondary" : "primary"}
        onPress={onToggle}
        loading={toggling}
        style={{ marginBottom: 12 }}
      />

      {/* stats grid */}
      <Row style={{ gap: 12, marginBottom: 12 }}>
        <Stat
          icon={<Battery size={16} color={p.muted} />}
          label={t("Battery")}
          value={batteryText}
        />
        <Stat
          icon={<Clock size={16} color={p.muted} />}
          label={t("Last sent")}
          value={ago(t, last?.at ?? null)}
        />
      </Row>
      <Row style={{ gap: 12, marginBottom: 20 }}>
        <Stat
          icon={<Crosshair size={16} color={p.muted} />}
          label={t("Accuracy")}
          value={accuracyText}
        />
        <Stat
          icon={<Timer size={16} color={p.muted} />}
          label={t("Interval")}
          value={intervalLabel(t, intervalSec)}
        />
      </Row>

      {/* SOS */}
      <View style={{ alignItems: "center", marginBottom: 12 }}>
        <Pressable
          delayLongPress={1200}
          onPressIn={beginHold}
          onPressOut={endHold}
          onLongPress={fireSos}
          disabled={!trackingOn}
          style={({ pressed }) => ({
            width: 168,
            height: 168,
            borderRadius: 84,
            backgroundColor: p.alert,
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            opacity: !trackingOn ? 0.35 : pressed ? 0.92 : 1,
            shadowColor: "#000",
            shadowOpacity: 0.18,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 5,
          })}
          accessibilityLabel={t("Hold for SOS")}
        >
          <Siren size={40} color="#ffffff" />
          <Txt
            variant="subtitle"
            style={{ color: "#ffffff", textAlign: "center" }}
          >
            {t("Hold for SOS")}
          </Txt>
        </Pressable>

        {holding ? (
          <View style={{ width: 168, marginTop: 10 }}>
            <View
              style={{
                height: 6,
                borderRadius: 3,
                backgroundColor: p.surface3,
                overflow: "hidden",
              }}
            >
              <Animated.View
                style={{
                  height: 6,
                  backgroundColor: p.alert,
                  width: holdAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                }}
              />
            </View>
            <Txt
              variant="small"
              color={p.muted}
              style={{ textAlign: "center", marginTop: 6 }}
            >
              {t("Release to cancel")}
            </Txt>
          </View>
        ) : null}

        {!trackingOn ? (
          <Txt
            variant="small"
            color={p.muted}
            style={{ textAlign: "center", marginTop: 10 }}
          >
            {t("SOS is available while tracking is on.")}
          </Txt>
        ) : null}
      </View>

      {sosSent ? (
        <Card
          style={{
            borderColor: p.ok,
            backgroundColor: p.okSoft,
            marginBottom: 12,
          }}
        >
          <Row style={{ gap: 8 }}>
            <CheckCircle2 size={18} color={p.ok} />
            <Txt variant="small" color={p.ok} style={{ flex: 1 }}>
              {t("SOS sent — help is on the way.")}
            </Txt>
          </Row>
        </Card>
      ) : null}

      {sosError ? (
        <Card
          style={{
            borderColor: p.alert,
            backgroundColor: p.alertSoft,
            marginBottom: 12,
          }}
        >
          <Row style={{ gap: 8 }}>
            <AlertTriangle size={18} color={p.alert} />
            <Txt variant="small" color={p.alert} style={{ flex: 1 }}>
              {t("SOS failed — check your connection and try again.")}
            </Txt>
          </Row>
        </Card>
      ) : null}

      <View style={styles.gap} />
    </Screen>
  );
}
