import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Bell, Home, Layers, Map as MapIcon, MoreHorizontal } from "lucide-react-native";
import { LoadingView } from "@w3ctrl/ui";
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
import MoreScreen from "../screens/MoreScreen";
import TripsScreen from "../screens/TripsScreen";
import FleetScreen from "../screens/FleetScreen";
import FleetDriversScreen from "../screens/FleetDriversScreen";
import FleetCalendarsScreen from "../screens/FleetCalendarsScreen";
import FleetAttributesScreen from "../screens/FleetAttributesScreen";
import FleetMaintenanceScreen from "../screens/FleetMaintenanceScreen";
import FleetCommandsScreen from "../screens/FleetCommandsScreen";
import InsightsScreen from "../screens/InsightsScreen";
import AutomationScreen from "../screens/AutomationScreen";
import NotificationsScreen from "../screens/NotificationsScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
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
        tabBarActiveTintColor: "#ff9900",
        tabBarInactiveTintColor: "#8e8e99",
        tabBarStyle: { backgroundColor: "#ffffff", borderTopColor: "#e9e9ee" },
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
        name="More"
        component={MoreScreen}
        options={{ title: t("More"), tabBarIcon: icon(MoreHorizontal) }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { user, restoring } = useAuth();

  if (restoring) {
    return <LoadingView text="W3ctrl Track" />;
  }

  // Every screen renders its own AppHeader (with onBack where needed),
  // so the native stack header stays off on all routes.
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Auth" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="DeviceDetail" component={DeviceDetailScreen} />
          <Stack.Screen name="TripReplay" component={TripReplayScreen} />
          <Stack.Screen name="Geofences" component={GeofencesScreen} />
          <Stack.Screen name="GeofenceEdit" component={GeofenceEditScreen} />
          <Stack.Screen name="AlertRules" component={AlertRulesScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen name="Admin" component={AdminScreen} />
          <Stack.Screen name="Trips" component={TripsScreen} />
          <Stack.Screen name="Fleet" component={FleetScreen} />
          <Stack.Screen name="FleetDrivers" component={FleetDriversScreen} />
          <Stack.Screen name="FleetCalendars" component={FleetCalendarsScreen} />
          <Stack.Screen name="FleetAttributes" component={FleetAttributesScreen} />
          <Stack.Screen name="FleetMaintenance" component={FleetMaintenanceScreen} />
          <Stack.Screen name="FleetCommands" component={FleetCommandsScreen} />
          <Stack.Screen name="Insights" component={InsightsScreen} />
          <Stack.Screen name="Automation" component={AutomationScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
