import React from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  BellRing,
  ChevronRight,
  FileText,
  MapPin,
  Route,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react-native";
import {
  AppHeader,
  Badge,
  Button,
  Card,
  Rise,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { useAuth } from "../auth/AuthContext";
import type { TabNav } from "../navigation/types";

type TileRoute =
  | "Trips"
  | "Reports"
  | "Geofences"
  | "Fleet"
  | "Insights"
  | "Automation"
  | "Notifications"
  | "Settings"
  | "Admin";

export default function MoreScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<TabNav<"More">>();
  const { user, logout } = useAuth();

  const tiles: { route: TileRoute; label: string; icon: React.ReactNode }[] = [
    { route: "Trips", label: t("Trips"), icon: <Route size={20} color={p.brandInk} /> },
    { route: "Reports", label: t("Reports"), icon: <FileText size={20} color={p.brandInk} /> },
    { route: "Geofences", label: t("Geofences"), icon: <MapPin size={20} color={p.brandInk} /> },
    { route: "Fleet", label: t("Fleet"), icon: <Users size={20} color={p.brandInk} /> },
    { route: "Insights", label: t("AI Insights"), icon: <Sparkles size={20} color={p.brandInk} /> },
    { route: "Automation", label: t("Automation"), icon: <Zap size={20} color={p.brandInk} /> },
    { route: "Notifications", label: t("Notifications"), icon: <BellRing size={20} color={p.brandInk} /> },
    { route: "Settings", label: t("Settings"), icon: <Settings size={20} color={p.brandInk} /> },
  ];

  const showAdmin = !!user?.administrator;

  const planName = user?.attributes?.planName ?? user?.attributes?.plan;
  const planLabel =
    typeof planName === "string" && planName.trim()
      ? planName.trim()
      : null;

  function confirmLogout() {
    Alert.alert(t("Log out"), t("Log out of W3ctrl Track?"), [
      { text: t("Cancel"), style: "cancel" },
      {
        text: t("Log out"),
        style: "destructive",
        onPress: () => {
          logout().catch(() => {
            Alert.alert(t("Could not log out"), t("Please try again."));
          });
        },
      },
    ]);
  }

  const initials =
    (user?.name ?? user?.email ?? "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <AppHeader
        title={t("More")}
        subtitle={t("Everything else, one tap away")}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* profile card */}
        <Rise delay={0}>
          <Card
            onPress={() => navigation.navigate("Settings")}
            style={{ marginBottom: 16 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: p.brand,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Txt
                  variant="title"
                  color="#181200"
                  style={{ fontWeight: "800" }}
                >
                  {initials}
                </Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="body" style={{ fontWeight: "700" }}>
                  {user?.name ?? t("Account")}
                </Txt>
                <Txt variant="small" color={p.muted} style={{ marginTop: 2 }}>
                  {user?.email ?? ""}
                </Txt>
              </View>
              {planLabel ? <Badge text={planLabel} tone="brand" /> : null}
              <ChevronRight size={18} color={p.faint} />
            </View>
          </Card>
        </Rise>

        {/* menu grid */}
        <Rise delay={60}>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {tiles.map((tile) => (
              <Pressable
                key={tile.route}
                onPress={() => navigation.navigate(tile.route)}
                style={{
                  flexBasis: "47.5%",
                  flexGrow: 1,
                  backgroundColor: p.surface,
                  borderColor: p.line,
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 16,
                  gap: 11,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: p.brandSoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {tile.icon}
                </View>
                <Txt variant="body" style={{ fontWeight: "700", fontSize: 13.5 }}>
                  {tile.label}
                </Txt>
              </Pressable>
            ))}
            {showAdmin ? (
              <Pressable
                onPress={() => navigation.navigate("Admin")}
                style={{
                  flexBasis: "47.5%",
                  flexGrow: 1,
                  backgroundColor: p.surface,
                  borderColor: p.line,
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 16,
                  gap: 11,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: p.brandSoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ShieldCheck size={20} color={p.brandInk} />
                </View>
                <Txt variant="body" style={{ fontWeight: "700", fontSize: 13.5 }}>
                  {t("Admin")}
                </Txt>
              </Pressable>
            ) : null}
          </View>
        </Rise>

        {/* plan / billing */}
        <Rise delay={120}>
          <Card style={{ marginBottom: 16 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View>
                <Txt variant="body" style={{ fontWeight: "800" }}>
                  {planLabel ? `W3ctrl ${planLabel}` : t("Your plan")}
                </Txt>
                <Txt variant="small" color={p.muted} style={{ marginTop: 4 }}>
                  {planLabel
                    ? t("Plan details are managed on the web portal.")
                    : t("Plan information is available on the web portal.")}
                </Txt>
              </View>
              {planLabel ? <Badge text={planLabel} tone="brand" /> : null}
            </View>
          </Card>
        </Rise>

        {/* logout */}
        <Rise delay={160}>
          <Button
            title={t("Log out")}
            kind="danger"
            onPress={confirmLogout}
          />
        </Rise>
        <View style={{ height: 8 }} />
      </ScrollView>
    </View>
  );
}
