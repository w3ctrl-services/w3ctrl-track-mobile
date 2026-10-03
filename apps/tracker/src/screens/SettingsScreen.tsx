/**
 * Tracker settings tab — merges the PIN gate (pin.html) and the tamper-proof
 * settings (settings.html). Locked by default; the parent PIN unlocks the
 * Parent controls section. Re-locks whenever the tab loses focus.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CommonActions } from "@react-navigation/native";
import { Delete, Lock, ShieldCheck } from "lucide-react-native";
import { Badge, Button, Card, Field, Rise, Segmented, Txt } from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { TitleHeader } from "../components/Header";
import type { RootStackParamList, TabParamList } from "../App";
import {
  checkPermissions,
  clearLastReport,
  isTracking,
  startTracking,
  stopTracking,
} from "../tracking";
import { loadConfig, saveConfig, clearConfig, type Config } from "../config";

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, "Settings">,
  NativeStackScreenProps<RootStackParamList>
>;

/* ------------------------------------------------------------------ pin */

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

function PinGate({
  t,
  onUnlock,
  cfg,
}: {
  t: (k: string) => string;
  onUnlock: () => void;
  cfg: Config;
}) {
  const [pin, setPin] = useState("");
  const [wrong, setWrong] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  const doShake = useCallback(() => {
    Animated.sequence(
      [-9, 9, -6, 6, 0].map((x) =>
        Animated.timing(shake, {
          toValue: x,
          duration: 55,
          useNativeDriver: true,
        }),
      ),
    ).start(() => shake.setValue(0));
  }, [shake]);

  const press = (k: string) => {
    if (wrong) return;
    if (k === "del") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (!k || pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) {
      if (next === cfg.pin) {
        onUnlock();
      } else {
        setWrong(true);
        doShake();
        setTimeout(() => {
          setPin("");
          setWrong(false);
        }, 650);
      }
    }
  };

  return (
    <View style={{ alignItems: "center", padding: 16, paddingBottom: 30 }}>
      <Rise>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: "#ff9900",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 18,
            marginBottom: 18,
          }}
        >
          <Lock color="#ffffff" size={28} />
        </View>
      </Rise>
      <Rise delay={60}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: "#0B0B0D",
            letterSpacing: -0.4,
          }}
        >
          {t("Parent access only")}
        </Text>
      </Rise>
      <Rise delay={100}>
        <Text
          style={{
            fontSize: 13.5,
            color: "#71717B",
            marginTop: 8,
            lineHeight: 22,
            textAlign: "center",
            maxWidth: 250,
          }}
        >
          {t("Enter the 4-digit parent PIN to change settings.")}
        </Text>
      </Rise>

      <Rise delay={140}>
        <Animated.View
          style={{
            flexDirection: "row",
            gap: 16,
            marginTop: 30,
            marginBottom: 8,
            transform: [{ translateX: shake }],
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor:
                  i < pin.length ? "#ff9900" : wrong ? "#d92d20" : "#D8D8DE",
              }}
            />
          ))}
        </Animated.View>
      </Rise>
      {wrong ? (
        <Text style={{ color: "#d92d20", fontSize: 13, marginTop: 4 }}>
          {t("Wrong PIN.")}
        </Text>
      ) : null}

      <Rise delay={180} style={{ width: "100%", maxWidth: 320 }}>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 22,
          }}
        >
          {KEYS.map((k, i) =>
            k === "" ? (
              <View key={i} style={{ width: "30%", aspectRatio: 1.6 }} />
            ) : (
              <Pressable
                key={i}
                onPress={() => press(k)}
                style={({ pressed }) => ({
                  width: "30%",
                  aspectRatio: 1.6,
                  borderWidth: 1,
                  borderColor: "#e8e8ed",
                  backgroundColor: pressed ? "#FFF4E2" : "#ffffff",
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                })}
              >
                {k === "del" ? (
                  <Delete color="#0B0B0D" size={23} />
                ) : (
                  <Text
                    style={{
                      fontSize: 23,
                      fontWeight: "700",
                      color: "#0B0B0D",
                    }}
                  >
                    {k}
                  </Text>
                )}
              </Pressable>
            ),
          )}
        </View>
      </Rise>

      <Rise delay={220} style={{ width: "100%", marginTop: 22 }}>
        <Card>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: "#FFF4E2",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Lock color="#9A5B00" size={18} />
            </View>
            <Text style={{ flex: 1, fontSize: 12.5, color: "#71717B", lineHeight: 21 }}>
              <Text style={{ fontWeight: "800", color: "#0B0B0D" }}>
                {t("Protected.")}{" "}
              </Text>
              {t("Your child can't turn off tracking, revoke permissions, or uninstall without this PIN.")}
            </Text>
          </View>
        </Card>
      </Rise>
      <Rise delay={260}>
        <Text style={{ fontSize: 12, color: "#A7A7B0", marginTop: 14 }}>
          {t("Forgot the PIN? Reset it from the parent's app.")}
        </Text>
      </Rise>
    </View>
  );
}

/* ------------------------------------------------------------ lock rows */

function LockRow({
  icon,
  title,
  sub,
  right,
  dim,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  right: React.ReactNode;
  dim?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        paddingVertical: 15,
        opacity: dim ? 0.55 : 1,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 13,
          backgroundColor: "rgba(11,11,13,0.06)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14.5, fontWeight: "700", color: "#0B0B0D" }}>
          {title}
        </Text>
        <Text style={{ fontSize: 12, color: "#71717B", marginTop: 3 }}>
          {sub}
        </Text>
      </View>
      {right}
    </View>
  );
}

/* ---------------------------------------------------------------- screen */

type IntervalKey = "60" | "180" | "300";

export default function SettingsScreen({ navigation }: Props) {
  const t = useT();
  const isFocused = useIsFocused();

  const [cfg, setCfg] = useState<Config | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [interval, setInterval] = useState<IntervalKey>("180");
  const [applying, setApplying] = useState(false);
  const [c1n, setC1n] = useState("");
  const [c1p, setC1p] = useState("");
  const [c2n, setC2n] = useState("");
  const [c2p, setC2p] = useState("");
  const [saved, setSaved] = useState(false);
  const [permMsg, setPermMsg] = useState<string | null>(null);
  const [resetArmed, setResetArmed] = useState(false);

  const load = useCallback(async () => {
    try {
      const c = await loadConfig();
      setCfg(c);
      const iv = String(c.intervalSec);
      setInterval(iv === "60" || iv === "300" ? (iv as IntervalKey) : "180");
      setC1n(c.contact1Name);
      setC1p(c.contact1Phone);
      setC2n(c.contact2Name);
      setC2p(c.contact2Phone);
    } catch {
      /* keep defaults */
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  /* Re-lock whenever the tab loses focus. */
  useEffect(() => {
    if (!isFocused) {
      setUnlocked(false);
      setResetArmed(false);
      setSaved(false);
      setPermMsg(null);
    }
  }, [isFocused]);

  const applyInterval = async (v: IntervalKey) => {
    setInterval(v);
    setApplying(true);
    try {
      const sec = Number(v);
      await saveConfig({ intervalSec: sec });
      if (await isTracking()) {
        // Apply live: restart the background task with the new cadence.
        await stopTracking();
        await startTracking(sec);
      }
    } catch {
      /* interval stays saved for next start */
    } finally {
      setApplying(false);
    }
  };

  const saveContacts = async () => {
    setSaved(false);
    try {
      await saveConfig({
        contact1Name: c1n.trim(),
        contact1Phone: c1p.trim(),
        contact2Name: c2n.trim(),
        contact2Phone: c2p.trim(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      /* surface nothing — fields keep their values */
    }
  };

  const recheck = async () => {
    setPermMsg(null);
    try {
      const p = await checkPermissions();
      setPermMsg(
        p.background
          ? t("Permissions OK — background tracking allowed.")
          : t("Location permission missing."),
      );
    } catch {
      setPermMsg(t("Location permission missing."));
    }
  };

  const resetApp = async () => {
    if (!resetArmed) {
      setResetArmed(true);
      setTimeout(() => setResetArmed(false), 4000);
      return;
    }
    try {
      await stopTracking();
    } catch {
      /* already stopped */
    }
    await clearConfig();
    await clearLastReport();
    navigation.getParent()?.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: "Setup" }] }),
    );
  };

  const childLabel = cfg?.childName?.trim() || t("Your child");

  return (
    <View style={{ flex: 1, backgroundColor: "#F3F3F5" }}>
      <TitleHeader
        title={t("Settings")}
        subtitle={unlocked ? t("Parent controls") : t("Locked by parent PIN")}
      />
      {!cfg ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#71717B" }}>{t("Loading…")}</Text>
        </View>
      ) : !unlocked ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <PinGate t={t} cfg={cfg} onUnlock={() => setUnlocked(true)} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30, gap: 14 }}>
          {/* tamper-proof rows */}
          <Rise>
            <Card>
              <LockRow
                dim
                icon={<Lock color="#71717B" size={18} />}
                title={t("Location mode")}
                sub={t("High accuracy")}
                right={<Badge text={t("Locked")} tone="neutral" />}
              />
              <LockRow
                icon={<Lock color="#71717B" size={18} />}
                title={t("Background tracking")}
                sub={t("Keeps sharing when the app is closed")}
                right={
                  <Switch
                    value
                    disabled
                    trackColor={{ false: "#D8D8DE", true: "#149A4B" }}
                    thumbColor="#ffffff"
                  />
                }
              />
              <LockRow
                icon={<ShieldCheck color="#71717B" size={18} />}
                title={t("Disconnect protection")}
                sub={t("Alerts parents if tracking stops")}
                right={<Badge text={t("Always on")} tone="ok" />}
              />
              <LockRow
                dim
                icon={<Lock color="#71717B" size={18} />}
                title={t("Battery saver mode")}
                sub={t("Off — full accuracy kept")}
                right={<Badge text={t("Locked")} tone="neutral" />}
              />
              <LockRow
                icon={<ShieldCheck color="#71717B" size={18} />}
                title={t("Uninstall protection")}
                sub={t("Needs the parent PIN to remove")}
                right={<Badge text={t("On")} tone="ok" />}
              />
            </Card>
          </Rise>

          {/* honest black card */}
          <Rise delay={60}>
            <View
              style={{
                backgroundColor: "#101014",
                borderRadius: 20,
                padding: 17,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 13,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 13,
                    backgroundColor: "rgba(255,153,0,0.16)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ShieldCheck color="#ff9900" size={20} />
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: "#C9C9D2",
                    lineHeight: 21,
                  }}
                >
                  <Text style={{ fontWeight: "800", color: "#ffffff" }}>
                    {childLabel}{" "}
                  </Text>
                  {t("cannot turn off tracking, revoke location permission, or uninstall this app without the parent PIN.")}
                </Text>
              </View>
            </View>
          </Rise>

          {/* parent controls */}
          <Rise delay={120}>
            <View style={{ marginTop: 4, marginLeft: 4 }}>
              <Txt variant="subtitle">{t("Parent controls")}</Txt>
            </View>
          </Rise>

          <Rise delay={160}>
            <Card>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: "#0B0B0D",
                  marginBottom: 10,
                }}
              >
                {t("Update interval")}
              </Text>
              <Segmented<IntervalKey>
                options={[
                  { value: "60", label: t("Every 1 minute") },
                  { value: "180", label: t("Every 3 minutes") },
                  { value: "300", label: t("Every 5 minutes") },
                ]}
                value={interval}
                onChange={(v) => {
                  if (!applying) void applyInterval(v);
                }}
              />
              <Text style={{ fontSize: 12, color: "#71717B", marginTop: 10 }}>
                {applying
                  ? t("Applying…")
                  : t("Applies live — no restart needed.")}
              </Text>
            </Card>
          </Rise>

          <Rise delay={200}>
            <Card>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: "#0B0B0D",
                  marginBottom: 12,
                }}
              >
                {t("Emergency contacts")}
              </Text>
              <Field
                label={t("Contact 1 name")}
                value={c1n}
                onChangeText={setC1n}
                placeholder={t("e.g. Papa")}
                autoCapitalize="words"
              />
              <Field
                label={t("Contact 1 phone")}
                value={c1p}
                onChangeText={setC1p}
                placeholder={t("e.g. +91 98140 22334")}
                keyboardType="phone-pad"
              />
              <Field
                label={t("Contact 2 name")}
                value={c2n}
                onChangeText={setC2n}
                placeholder={t("e.g. Mama")}
                autoCapitalize="words"
              />
              <Field
                label={t("Contact 2 phone")}
                value={c2p}
                onChangeText={setC2p}
                placeholder={t("e.g. +91 98720 44556")}
                keyboardType="phone-pad"
              />
              <Button title={saved ? t("Saved") : t("Save contacts")} onPress={saveContacts} />
            </Card>
          </Rise>

          <Rise delay={240}>
            <Button
              title={t("Re-check permissions")}
              onPress={recheck}
              kind="secondary"
            />
            {permMsg ? (
              <Text
                style={{
                  fontSize: 12.5,
                  color: "#71717B",
                  textAlign: "center",
                  marginTop: 10,
                }}
              >
                {permMsg}
              </Text>
            ) : null}
          </Rise>

          <Rise delay={280}>
            <Button
              title={
                resetArmed ? t("Tap again to confirm reset") : t("Reset app")
              }
              onPress={resetApp}
              kind="danger"
            />
            <Text
              style={{
                fontSize: 12,
                color: "#A7A7B0",
                textAlign: "center",
                marginTop: 10,
              }}
            >
              {t("This clears all settings and returns to setup.")}
            </Text>
          </Rise>

          <Text
            style={{
              fontSize: 12,
              color: "#A7A7B0",
              textAlign: "center",
              marginTop: 6,
            }}
          >
            {t("v1.0.0 · Family safety build")}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
