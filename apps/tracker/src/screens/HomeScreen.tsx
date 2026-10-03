/**
 * Tracker home tab — the "Protected home" view. One calm message: the phone
 * is sharing, nothing to do. Every number on screen comes from the live
 * tracking engine; no start/stop toggle by design (tamper-proof).
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Siren } from "lucide-react-native";
import { AdSlider, Button, Card, Rise, type Promo } from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { BrandHeader } from "../components/Header";
import type { TabParamList } from "../App";
import {
  checkPermissions,
  isTracking,
  readLastReport,
  readReportsToday,
  type LastReport,
} from "../tracking";
import { loadConfig } from "../config";

/* ------------------------------------------------------------------ bits */

/** Family-safety promos for the dashboard slider (static ads, not data). */
const FAMILY_PROMOS: Promo[] = [
  {
    title: "Family Plus",
    body: "5 members, one plan — everyone protected.",
    cta: "Go Family · ₹999/yr",
    from: "#101014",
    to: "#7a5200",
  },
  {
    title: "SOS pendant",
    body: "One press alerts the family — even without the phone.",
    cta: "₹999",
    from: "#0b3b2e",
    to: "#12a37a",
  },
  {
    title: "Safe-walk alerts",
    body: "Know the moment they reach school or home.",
    cta: "Included",
    from: "#1a2b4a",
    to: "#1760d6",
  },
];

function ago(t: (k: string) => string, at: number | null): string {
  if (!at) return t("Never");
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 10) return t("Just now");
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} ${t("min ago")}`;
  const h = Math.floor(m / 60);
  return `${h} ${t("hr ago")}`;
}

/** Green "Protected" pill, shown in the header while tracking. */
function ProtectedPill({ t }: { t: (k: string) => string }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        backgroundColor: "#E6F6EC",
        borderRadius: 999,
        paddingHorizontal: 13,
        paddingVertical: 7,
      }}
    >
      <Animated.View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: "#149A4B",
          opacity: pulse.interpolate({
            inputRange: [0, 1],
            outputRange: [0.5, 1],
          }),
          transform: [
            {
              scale: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.4],
              }),
            },
          ],
        }}
      />
      <Text style={{ fontSize: 12, fontWeight: "800", color: "#149A4B" }}>
        {t("Protected")}
      </Text>
    </View>
  );
}

/* ---------------------------------------------------------------- screen */

export default function HomeScreen() {
  const t = useT();
  const tabNav = useNavigation<BottomTabNavigationProp<TabParamList>>();

  const [tracking, setTracking] = useState<boolean | null>(null);
  const [last, setLast] = useState<LastReport | null>(null);
  const [today, setToday] = useState(0);
  const [bgOk, setBgOk] = useState<boolean | null>(null);
  const [childName, setChildName] = useState("");
  const [intervalSec, setIntervalSec] = useState(180);

  const refresh = useCallback(async () => {
    try {
      const [tr, lr, td, perms, cfg] = await Promise.all([
        isTracking(),
        readLastReport(),
        readReportsToday(),
        checkPermissions(),
        loadConfig(),
      ]);
      setTracking(tr);
      setLast(lr);
      setToday(td);
      setBgOk(perms.background);
      setChildName(cfg.childName);
      setIntervalSec(cfg.intervalSec);
    } catch {
      /* keep last-known values */
    }
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

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const title = childName.trim() ? `${childName.trim()}${t("'s phone")}` : t("This phone");
  const battery = last?.battery ?? null;
  const accuracy = last?.accuracy ?? null;
  const intervalLabel =
    intervalSec === 60
      ? t("Every 1 minute")
      : intervalSec === 300
        ? t("Every 5 minutes")
        : t("Every 3 minutes");

  return (
    <View style={{ flex: 1, backgroundColor: "#F3F3F5" }}>
      <BrandHeader right={tracking ? <ProtectedPill t={t} /> : undefined} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30, gap: 14 }}>
        <View>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: "#0B0B0D",
              letterSpacing: -0.4,
            }}
          >
            {title}
          </Text>
          <Text style={{ fontSize: 12.5, color: "#71717B", marginTop: 4 }}>
            {t("Family can see you are safe")}
          </Text>
        </View>

        {/* hero — dark status card */}
        <Rise>
          <View
            style={{
              backgroundColor: "#101014",
              borderRadius: 24,
              padding: 22,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 15,
              }}
            >
              <Animated.View
                style={{
                  width: 15,
                  height: 15,
                  borderRadius: 7.5,
                  backgroundColor: "#ff9900",
                  opacity: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.55, 1],
                  }),
                  transform: [
                    {
                      scale: pulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.35],
                      }),
                    },
                  ],
                  shadowColor: "#ff9900",
                  shadowOpacity: 0.9,
                  shadowRadius: 10,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "800",
                    color: "#ffffff",
                    letterSpacing: -0.3,
                  }}
                >
                  {tracking === false
                    ? t("Sharing paused")
                    : t("Sharing live location")}
                </Text>
                <Text
                  style={{
                    fontSize: 12.5,
                    color: "rgba(255,255,255,0.72)",
                    marginTop: 5,
                  }}
                >
                  {last
                    ? `${t("High accuracy")} · ${t("updated")} ${ago(t, last.at)}`
                    : `${t("High accuracy")} · ${t("Waiting for first fix")}`}
                </Text>
              </View>
            </View>
          </View>
        </Rise>

        {/* background-permission banner */}
        {bgOk === false ? (
          <Rise>
            <Card>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#0B0B0D" }}>
                {t("Location permission limited")}
              </Text>
              <Text
                style={{
                  fontSize: 12.5,
                  color: "#71717B",
                  marginTop: 6,
                  lineHeight: 19,
                }}
              >
                {t(
                  "Grant “Always” location permission, or tracking stops in the background.",
                )}
              </Text>
              <View style={{ marginTop: 12 }}>
                <Button
                  title={t("Open system settings")}
                  onPress={() => Linking.openSettings()}
                />
              </View>
            </Card>
          </Rise>
        ) : null}

        {/* battery + last fix */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Rise style={{ flex: 1 }}>
            <Card style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 10.5,
                  fontWeight: "800",
                  letterSpacing: 1.6,
                  color: "#71717B",
                }}
              >
                {t("Battery").toUpperCase()}
              </Text>
              <Text
                style={{
                  fontSize: 23,
                  fontWeight: "800",
                  color: "#0B0B0D",
                  marginVertical: 9,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {battery != null ? `${battery}%` : "—"}
              </Text>
              <View
                style={{
                  height: 8,
                  borderRadius: 99,
                  backgroundColor: "rgba(11,11,13,0.08)",
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    borderRadius: 99,
                    width: battery != null ? `${battery}%` : "0%",
                    backgroundColor:
                      battery != null && battery < 20 ? "#d92d20" : "#149A4B",
                  }}
                />
              </View>
              <Text style={{ fontSize: 11.5, color: "#71717B", marginTop: 8 }}>
                {t("Alert under 20%")}
              </Text>
            </Card>
          </Rise>
          <Rise delay={60} style={{ flex: 1 }}>
            <Card style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 10.5,
                  fontWeight: "800",
                  letterSpacing: 1.6,
                  color: "#71717B",
                }}
              >
                {t("Last fix").toUpperCase()}
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "800",
                  color: "#0B0B0D",
                  marginTop: 9,
                }}
                numberOfLines={1}
              >
                {last ? ago(t, last.at) : t("Never")}
              </Text>
              <Text style={{ fontSize: 11.5, color: "#71717B", marginTop: 6 }}>
                {accuracy != null
                  ? `±${Math.round(accuracy)} m`
                  : t("No fix yet")}
              </Text>
            </Card>
          </Rise>
        </View>

        {/* today */}
        <Rise delay={120}>
          <Card>
            <Text
              style={{
                fontSize: 10.5,
                fontWeight: "800",
                letterSpacing: 1.6,
                color: "#71717B",
              }}
            >
              {t("Today").toUpperCase()}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                gap: 8,
                marginTop: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 25,
                  fontWeight: "800",
                  color: "#0B0B0D",
                  fontVariant: ["tabular-nums"],
                }}
              >
                {today}
              </Text>
              <Text style={{ fontSize: 12.5, color: "#71717B" }}>
                {t("reports sent")}
              </Text>
            </View>
            <Text style={{ fontSize: 11.5, color: "#71717B", marginTop: 6 }}>
              {intervalLabel}
            </Text>
          </Card>
        </Rise>

        <Rise delay={180}>
          <AdSlider promos={FAMILY_PROMOS} />
        </Rise>

        {/* SOS nudge */}
        <Rise delay={240}>
          <Pressable onPress={() => tabNav.navigate("SOS")}>
            <Card>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 13,
                    backgroundColor: "#FCEBE9",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Siren color="#d92d20" size={18} />
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    lineHeight: 20,
                    color: "#71717B",
                  }}
                >
                  <Text style={{ fontWeight: "800", color: "#0B0B0D" }}>
                    {t("Feeling unsafe?")}{" "}
                  </Text>
                  {t("Open the SOS tab and hold the button — help is one press away.")}
                </Text>
              </View>
            </Card>
          </Pressable>
        </Rise>
      </ScrollView>
    </View>
  );
}
