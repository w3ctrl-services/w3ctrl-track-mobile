import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Bell, Home, Layers, Map as MapIcon, Settings } from "lucide-react-native";
import { LoadingView, useTheme } from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { useAuth } from "../auth/AuthContext";
import type { MainTabParamList, RootStackParamList } from "./types";
import LoginScreen from "../screens/LoginScreen";
import DashboardScreen from "../screens/DashboardScreen";
import LiveMapScreen from "../screens/LiveMapScreen";
import DevicesScreen from "../screens/DevicesScreen";
import DeviceDetailScreen from "../screens/DeviceDetailScreen";
import TripReplayScreen from "../screens/TripReplayScreen";
import GeofencesScreen from "../screens/GeofencesScreen";
import GeofenceEditScreen from "../screens/GeofenceEditScreen";
import AlertsScreen from "../screens/AlertsScreen";
import AlertRulesScreen from "../screens/AlertRulesScreen";
import ReportsScreen from "../screens/ReportsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import AdminScreen from "../screens/AdminScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const p = useTheme();
  const t = useT();
  const icon =
    (Icon: React.ComponentType<{ color: string; size: number }>) =>
    ({ color, size }: { color: string; size: number }) => (
      <Icon color={color} size={size} />
    );
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: p.brand,
        tabBarInactiveTintColor: p.muted,
        tabBarStyle: { backgroundColor: p.surface, borderTopColor: p.line },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{ title: t("Home"), tabBarIcon: icon(Home) }}
      />
      <Tab.Screen
        name="Map"
        component={LiveMapScreen}
        options={{ title: t("Map"), tabBarIcon: icon(MapIcon) }}
      />
      <Tab.Screen
        name="Devices"
        component={DevicesScreen}
        options={{ title: t("Devices"), tabBarIcon: icon(Layers) }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{ title: t("Alerts"), tabBarIcon: icon(Bell) }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t("Settings"), tabBarIcon: icon(Settings) }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { user, restoring } = useAuth();
  const p = useTheme();
  const t = useT();

  if (restoring) {
    return <LoadingView text="W3ctrl Track" />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: p.surface },
        headerTintColor: p.ink,
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
      }}
    >
      {!user ? (
        <Stack.Screen
          name="Auth"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="DeviceDetail"
            component={DeviceDetailScreen}
            options={{ title: t("Devices") }}
          />
          <Stack.Screen
            name="TripReplay"
            component={TripReplayScreen}
            options={{ title: t("Replay") }}
          />
          <Stack.Screen
            name="Geofences"
            component={GeofencesScreen}
            options={{ title: t("Geofences") }}
          />
          <Stack.Screen
            name="GeofenceEdit"
            component={GeofenceEditScreen}
            options={{ title: t("New geofence") }}
          />
          <Stack.Screen
            name="AlertRules"
            component={AlertRulesScreen}
            options={{ title: t("New rule") }}
          />
          <Stack.Screen
            name="Reports"
            component={ReportsScreen}
            options={{ title: t("Reports") }}
          />
          <Stack.Screen
            name="Admin"
            component={AdminScreen}
            options={{ title: t("Admin") }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
