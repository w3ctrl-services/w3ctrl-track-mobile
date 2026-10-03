/**
 * Emergency SOS tab — press-and-hold 3s ring. Fires sendSos() which takes its
 * own high-accuracy fix, so SOS works regardless of tracking state.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Circle } from "react-native-svg";
import { CheckCircle2, Phone, ShieldCheck, TriangleAlert } from "lucide-react-native";
import { Button, Card, Rise } from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { TitleHeader } from "../components/Header";
import { sendSos } from "../tracking";
import { loadConfig } from "../config";

const HOLD_MS = 3000;
const SIZE = 216;
const R = 92;
const C = 2 * Math.PI * R;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Contact {
  name: string;
  phone: string;
  order: number;
}

const AVATAR_BG = ["#ff9900", "#7A5CFF", "#1760D6", "#1d7a4c"];

function ContactRow({ c, t }: { c: Contact; t: (k: string) => string }) {
  return (
    <Card style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: AVATAR_BG[c.order % AVATAR_BG.length],
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: "800", color: "#ffffff" }}>
            {c.name.trim().charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "800", color: "#0B0B0D" }}>
            {c.name}
          </Text>
          <Text style={{ fontSize: 12, color: "#71717B", marginTop: 3 }}>
            {c.phone}
            {c.order === 0
              ? ` · ${t("notified first")}`
              : c.order === 1
                ? ` · ${t("notified second")}`
                : ""}
          </Text>
        </View>
        <Pressable
          onPress={() => Linking.openURL(`tel:${c.phone}`)}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: "#E6F6EC",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Phone color="#149A4B" size={18} />
        </Pressable>
      </View>
    </Card>
  );
}

export default function SosScreen() {
  const t = useT();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [childName, setChildName] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<"sent" | "failed" | null>(null);
  const [secs, setSecs] = useState(3);

  const hold = useRef(new Animated.Value(0)).current;
  const holdRef = useRef<Animated.CompositeAnimation | null>(null);
  const doneRef = useRef(false);

  const loadContacts = useCallback(async () => {
    try {
      const cfg = await loadConfig();
      setChildName(cfg.childName);
      const list: Contact[] = [];
      if (cfg.contact1Name.trim() && cfg.contact1Phone.trim())
        list.push({
          name: cfg.contact1Name.trim(),
          phone: cfg.contact1Phone.trim(),
          order: 0,
        });
      if (cfg.contact2Name.trim() && cfg.contact2Phone.trim())
        list.push({
          name: cfg.contact2Name.trim(),
          phone: cfg.contact2Phone.trim(),
          order: 1,
        });
      setContacts(list);
    } catch {
      /* keep previous */
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [loadContacts]),
  );

  /* countdown label follows the ring progress */
  useEffect(() => {
    const id = hold.addListener(({ value }) => {
      const s = Math.max(1, Math.ceil((1 - value) * 3));
      setSecs((prev) => (prev === s ? prev : s));
    });
    return () => hold.removeListener(id);
  }, [hold]);

  const resetRing = useCallback(() => {
    holdRef.current?.stop();
    holdRef.current = null;
    hold.setValue(0);
    setSecs(3);
  }, [hold]);

  const fire = useCallback(async () => {
    resetRing();
    setSending(true);
    setResult(null);
    try {
      await sendSos();
      setResult("sent");
    } catch {
      setResult("failed");
    } finally {
      setSending(false);
    }
  }, [resetRing]);

  const startHold = useCallback(() => {
    if (sending) return;
    doneRef.current = false;
    setResult(null);
    holdRef.current = Animated.timing(hold, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false, // strokeDashoffset needs the JS driver
    });
    holdRef.current.start(({ finished }) => {
      if (finished && !doneRef.current) {
        doneRef.current = true;
        fire();
      }
    });
  }, [fire, hold, sending]);

  const cancelHold = useCallback(() => {
    resetRing();
  }, [resetRing]);

  const strokeOffset = hold.interpolate({
    inputRange: [0, 1],
    outputRange: [C, 0],
  });

  const who = childName.trim() || t("your child");

  return (
    <View style={{ flex: 1, backgroundColor: "#F3F3F5" }}>
      <TitleHeader
        title={t("Emergency SOS")}
        subtitle={
          childName.trim()
            ? `${childName.trim()}${t("'s phone")} · ${t("hold the button in any emergency")}`
            : t("hold the button in any emergency")
        }
      />
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 30,
          alignItems: "center",
          gap: 14,
        }}
      >
        {/* hold ring */}
        <Rise>
          <Pressable
            onPressIn={startHold}
            onPressOut={cancelHold}
            disabled={sending}
            style={{ opacity: sending ? 0.7 : 1 }}
          >
            <View
              style={{
                width: SIZE,
                height: SIZE,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 14,
              }}
            >
              <Svg
                width={SIZE}
                height={SIZE}
                style={{ position: "absolute" }}
              >
                <Circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  stroke="#F3D9D6"
                  strokeWidth={14}
                  fill="none"
                />
                <AnimatedCircle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  stroke="#d92d20"
                  strokeWidth={14}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${C} ${C}`}
                  strokeDashoffset={strokeOffset}
                  transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                />
              </Svg>
              <View
                style={{
                  width: SIZE - 44,
                  height: SIZE - 44,
                  borderRadius: (SIZE - 44) / 2,
                  backgroundColor: "#ffffff",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "#e8e8ed",
                }}
              >
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "900",
                    color: "#d92d20",
                    letterSpacing: 0.4,
                  }}
                >
                  {sending ? "..." : result === "sent" ? t("SENT") : secs === 3 ? t("HOLD") : `${secs}s`}
                </Text>
                <Text
                  style={{
                    fontSize: 10.5,
                    color: "#71717B",
                    fontWeight: "700",
                    letterSpacing: 1,
                    marginTop: 4,
                  }}
                >
                  {t("FOR SOS")}
                </Text>
              </View>
            </View>
          </Pressable>
        </Rise>

        <Text
          style={{
            fontSize: 13,
            color: "#71717B",
            lineHeight: 21,
            textAlign: "center",
            maxWidth: 260,
          }}
        >
          {t("Press and hold for 3 seconds. Your emergency contacts get your live location instantly — even with the app closed.")}
        </Text>

        {/* result cards */}
        {result === "sent" ? (
          <Card style={{ width: "100%", borderColor: "#149A4B" }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <CheckCircle2 color="#149A4B" size={22} />
              <Text style={{ flex: 1, fontSize: 14, color: "#0B0B0D", lineHeight: 20 }}>
                <Text style={{ fontWeight: "800" }}>{t("SOS sent.")} </Text>
                {t("Your emergency contacts have your live location.")}
              </Text>
            </View>
          </Card>
        ) : null}
        {result === "failed" ? (
          <Card style={{ width: "100%", borderColor: "#d92d20" }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <TriangleAlert color="#d92d20" size={22} />
              <Text style={{ flex: 1, fontSize: 14, color: "#0B0B0D", lineHeight: 20 }}>
                {t("SOS failed — check your connection and try again.")}
              </Text>
            </View>
            <View style={{ marginTop: 12 }}>
              <Button title={t("Retry")} onPress={fire} kind="secondary" />
            </View>
          </Card>
        ) : null}

        {/* contacts */}
        <View style={{ width: "100%", marginTop: 6 }}>
          <Text
            style={{
              fontSize: 15.5,
              fontWeight: "800",
              color: "#0B0B0D",
              marginBottom: 12,
              marginLeft: 4,
            }}
          >
            {t("Emergency contacts")}
          </Text>
          {contacts.length === 0 ? (
            <Card>
              <Text
                style={{
                  fontSize: 13.5,
                  color: "#71717B",
                  lineHeight: 20,
                  textAlign: "center",
                  paddingVertical: 8,
                }}
              >
                {t("No emergency contacts yet — ask a parent to add them in Settings.")}
              </Text>
            </Card>
          ) : (
            contacts.map((c) => <ContactRow key={c.order} c={c} t={t} />)
          )}
        </View>

        {/* honest reassurance card */}
        <View
          style={{
            width: "100%",
            backgroundColor: "#101014",
            borderRadius: 20,
            padding: 17,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: "rgba(255,153,0,0.16)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldCheck color="#ff9900" size={18} />
            </View>
            <Text
              style={{ flex: 1, fontSize: 12.5, color: "#C9C9D2", lineHeight: 21 }}
            >
              <Text style={{ fontWeight: "800", color: "#ffffff" }}>
                {t("Always protected.")}{" "}
              </Text>
              {t("SOS works even with the app closed, and")}{" "}
              {who} {t("can't turn it off without the parent PIN.")}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
