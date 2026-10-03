/**
 * Tracker app headers — light chrome: white background, dark text,
 * orange accents. Black is used only as a content accent, never as chrome.
 */
import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";

/** Brand bar: W3ctrl logo + "Track" wordmark, optional right-side node. */
export function BrandHeader({ right }: { right?: React.ReactNode }) {
  return (
    <SafeAreaView edges={["top"]} style={{ backgroundColor: "#ffffff" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 18,
          paddingTop: 10,
          paddingBottom: 14,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          {/* NOTE: the task spec said "../assets/logo.png"; the file lives at
              apps/tracker/assets/logo.png, so from src/components/ this is
              ../../assets/logo.png */}
          <Image
            source={require("../../assets/logo.png")}
            style={{ height: 30, aspectRatio: 2.56 }}
            resizeMode="contain"
          />
          <Text
            style={{
              fontSize: 17,
              fontWeight: "800",
              color: "#0B0B0D",
              letterSpacing: -0.3,
            }}
          >
            Track
          </Text>
        </View>
        {right ?? null}
      </View>
    </SafeAreaView>
  );
}

/** Title bar for inner tabs: dark title/subtitle, hairline bottom border. */
export function TitleHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <SafeAreaView
      edges={["top"]}
      style={{
        backgroundColor: "#ffffff",
        borderBottomWidth: 1,
        borderBottomColor: "#e8e8ed",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 18,
          paddingTop: 8,
          paddingBottom: 14,
        }}
      >
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={10} style={{ marginLeft: -6 }}>
            <ChevronLeft color="#0B0B0D" size={24} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
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
          {subtitle ? (
            <Text style={{ fontSize: 12.5, color: "#71717B", marginTop: 3 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ?? null}
      </View>
    </SafeAreaView>
  );
}
