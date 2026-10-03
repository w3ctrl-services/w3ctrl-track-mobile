import React from "react";
import { ScrollView, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  CalendarDays,
  ChevronRight,
  Radio,
  Sigma,
  Users,
  Wrench,
} from "lucide-react-native";
import {
  AppHeader,
  Card,
  LoadingView,
  Rise,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import {
  useCalendars,
  useComputedAttributes,
  useDrivers,
  useMaintenance,
  useSavedCommands,
} from "../api/hooks";
import type { RootNav } from "../navigation/types";

type FleetRoute =
  | "FleetDrivers"
  | "FleetCalendars"
  | "FleetAttributes"
  | "FleetMaintenance"
  | "FleetCommands";

function FleetCard({
  icon,
  title,
  hint,
  count,
  index,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  count?: string;
  index: number;
  onPress: () => void;
}) {
  const p = useTheme();
  return (
    <Rise delay={Math.min(index, 8) * 60}>
      <Card onPress={onPress} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 15,
              backgroundColor: p.brandSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="subtitle" style={{ fontWeight: "800" }}>
              {title}
            </Txt>
            <Txt variant="small" color={p.muted} style={{ marginTop: 2 }}>
              {count ? `${count} · ` : ""}
              {hint}
            </Txt>
          </View>
          <ChevronRight size={18} color={p.faint} />
        </View>
      </Card>
    </Rise>
  );
}

export default function FleetScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<RootNav>();

  const { data: drivers, isLoading: driversLoading } = useDrivers();
  const { data: calendars, isLoading: calendarsLoading } = useCalendars();
  const { data: attrs, isLoading: attrsLoading } = useComputedAttributes();
  const { data: maintenance, isLoading: maintenanceLoading } = useMaintenance();
  const { data: commands, isLoading: commandsLoading } = useSavedCommands();

  const loading =
    driversLoading ||
    calendarsLoading ||
    attrsLoading ||
    maintenanceLoading ||
    commandsLoading;

  const cards: {
    icon: React.ReactNode;
    title: string;
    hint: string;
    count?: string;
    route: FleetRoute;
  }[] = [
    {
      icon: <Users size={22} color={p.brandInk} />,
      title: t("Drivers"),
      hint: t("Who drives what — names matched to devices"),
      count:
        drivers && drivers.length > 0
          ? `${drivers.length} ${t("drivers")}`
          : undefined,
      route: "FleetDrivers",
    },
    {
      icon: <CalendarDays size={22} color={p.brandInk} />,
      title: t("Calendars"),
      hint: t("Shifts & holidays that gate alerts"),
      count:
        calendars && calendars.length > 0
          ? `${calendars.length} ${t("calendars")}`
          : undefined,
      route: "FleetCalendars",
    },
    {
      icon: <Sigma size={22} color={p.brandInk} />,
      title: t("Computed attributes"),
      hint: t("Formulas evaluated on every position"),
      count:
        attrs && attrs.length > 0
          ? `${attrs.length} ${t("attributes")}`
          : undefined,
      route: "FleetAttributes",
    },
    {
      icon: <Wrench size={22} color={p.brandInk} />,
      title: t("Maintenance"),
      hint: t("Service reminders, per vehicle"),
      count:
        maintenance && maintenance.length > 0
          ? `${maintenance.length} ${t("reminders")}`
          : undefined,
      route: "FleetMaintenance",
    },
    {
      icon: <Radio size={22} color={p.brandInk} />,
      title: t("Commands"),
      hint: t("Talk to any tracker"),
      count:
        commands && commands.length > 0
          ? `${commands.length} ${t("saved")}`
          : undefined,
      route: "FleetCommands",
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <AppHeader
        title={t("Fleet")}
        subtitle={t("5 tools for your vehicles")}
        onBack={() => navigation.goBack()}
      />
      {loading && drivers === undefined ? (
        <LoadingView text={t("Loading fleet…")} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
          {cards.map((c, i) => (
            <FleetCard
              key={c.route}
              icon={c.icon}
              title={c.title}
              hint={c.hint}
              count={c.count}
              index={i}
              onPress={() => navigation.navigate(c.route)}
            />
          ))}
          <View style={{ paddingTop: 4, paddingHorizontal: 8 }}>
            <Txt
              variant="small"
              color={p.muted}
              style={{ textAlign: "center", lineHeight: 20 }}
            >
              {t(
                "Changes here apply fleet-wide. Keep driver names up to date so every trip, alert and report shows who was driving.",
              )}
            </Txt>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
