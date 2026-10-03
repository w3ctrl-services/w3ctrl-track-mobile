import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type {
  CompositeNavigationProp,
  NavigatorScreenParams,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type MainTabParamList = {
  Home: undefined;
  Map: undefined;
  Devices: { openAdd?: boolean } | undefined;
  Alerts: { tab?: "feed" | "smart" | "rules" } | undefined;
  More: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  DeviceDetail: { deviceId: number };
  TripReplay: { deviceId: number; from: string; to: string; tripIndex: number };
  Geofences: undefined;
  GeofenceEdit: { geofenceId?: number } | undefined;
  AlertRules: undefined;
  Reports: undefined;
  Admin: undefined;
  Trips: undefined;
  Fleet: undefined;
  FleetDrivers: undefined;
  FleetCalendars: undefined;
  FleetAttributes: undefined;
  FleetMaintenance: undefined;
  FleetCommands: undefined;
  Insights: undefined;
  Automation: undefined;
  Settings: undefined;
};

/** Navigation for stack-level screens (DeviceDetail, TripReplay, …). */
export type RootNav = NativeStackNavigationProp<RootStackParamList>;

/** Navigation inside a tab — can reach both tab and stack screens. */
export type TabNav<T extends keyof MainTabParamList> = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, T>,
  NativeStackNavigationProp<RootStackParamList>
>;
