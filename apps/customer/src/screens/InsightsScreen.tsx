import React, { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  AlertTriangle,
  Gauge,
  Moon,
  Route,
} from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";
import {
  AppHeader,
  Card,
  EmptyState,
  LoadingView,
  Rise,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { knotsToKmh, type TraccarPosition } from "@w3ctrl/api";
import {
  useDevices,
  usePositionHistory,
  useSummary,
  useTrips,
} from "../api/hooks";
import type { RootNav } from "../navigation/types";

function hourOf(iso: string): number {
  return new Date(iso).getHours();
}

interface ScoreResult {
  score: number;
  overspeedPenalty: number;
  harshPenalty: number;
  nightPenalty: number;
  harshCount: number;
  pointCount: number;
}

/**
 * Exact port of the web insights scoring (w3ctrl-track
 * src/app/app/insights/page.tsx — computeDrivingScore).
 */
function computeDrivingScore(positions: TraccarPosition[]): ScoreResult | null {
  const valid = positions.filter((p) => p.valid);
  const n = valid.length;
  if (n < 10) return null;

  const speeds = valid.map((p) => knotsToKmh(p.speed));
  const over = speeds.filter((s) => s > 80).length;
  const overspeedPenalty = (over / n) * 40;

  let harshCount = 0;
  for (let i = 1; i < speeds.length; i++) {
    if (speeds[i - 1] - speeds[i] > 30) harshCount++;
  }
  const harshPenalty = Math.min(30, harshCount * 3);

  const night = valid.filter((p) => {
    const h = hourOf(p.fixTime);
    return h >= 23 || h < 5;
  }).length;
  const nightPenalty = (night / n) * 10;

  const score = Math.max(
    0,
    Math.round(100 - overspeedPenalty - harshPenalty - nightPenalty),
  );
  return { score, overspeedPenalty, harshPenalty, nightPenalty, harshCount, pointCount: n };
}

const RING_R = 56;
const RING_C = 2 * Math.PI * RING_R;

function PenaltyBar({
  label,
  points,
  max,
}: {
  label: string;
  points: number;
  max: number;
}) {
  const p = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <Txt variant="small" color={p.muted}>
          {label}
        </Txt>
        <Txt variant="small" color={p.ink} style={{ fontWeight: "700" }}>
          −{points.toFixed(1)} pts
        </Txt>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: 99,
          backgroundColor: p.surface3,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: "100%",
            borderRadius: 99,
            backgroundColor: p.warn,
            width: `${Math.min(100, (points / max) * 100)}%`,
          }}
        />
      </View>
    </View>
  );
}

function Finding({
  icon,
  title,
  subtitle,
  tone,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone: "warn" | "alert" | "neutral" | "ok";
  delay: number;
}) {
  const p = useTheme();
  const tones = {
    warn: { bg: p.warnSoft, fg: p.warn },
    alert: { bg: p.alertSoft, fg: p.alert },
    neutral: { bg: p.surface3, fg: p.muted },
    ok: { bg: p.okSoft, fg: p.ok },
  } as const;
  const s = tones[tone];
  return (
    <Rise delay={delay}>
      <Card style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: s.bg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="body" style={{ fontWeight: "700" }}>
              {title}
            </Txt>
            <Txt variant="small" color={p.muted} style={{ marginTop: 2 }}>
              {subtitle}
            </Txt>
          </View>
        </View>
      </Card>
    </Rise>
  );
}

export default function InsightsScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<RootNav>();

  const { data: devices, isLoading: devicesLoading } = useDevices();
  const [selectedDevice, setSelectedDevice] = React.useState<number | null>(null);

  const activeId = selectedDevice ?? devices?.[0]?.id ?? null;

  const range = useMemo(() => {
    const to = new Date().toISOString();
    const from = new Date(Date.now() - 7 * 86400000).toISOString();
    return { from, to };
  }, []);

  const trailQ = usePositionHistory(activeId ?? undefined, range.from, range.to);
  const tripsQ = useTrips(activeId ?? undefined, range.from, range.to);
  const summaryQ = useSummary(activeId != null ? [activeId] : [], range.from, range.to);

  const score = useMemo(
    () => (trailQ.data ? computeDrivingScore(trailQ.data) : undefined),
    [trailQ.data],
  );

  const loading = devicesLoading || trailQ.isLoading;

  const scoreColor =
    score && score.score >= 80
      ? p.ok
      : score && score.score >= 60
        ? p.warn
        : p.alert;
  const scoreLabel =
    score == null
      ? ""
      : score.score >= 80
        ? t("Excellent")
        : score.score >= 60
          ? t("Good")
          : score.score >= 40
            ? t("Fair")
            : t("Risky");

  const trips = tripsQ.data ?? [];
  const summary = summaryQ.data?.[0];
  const distanceKm = summary ? summary.distance / 1000 : 0;
  const avgKmh = summary ? knotsToKmh(summary.averageSpeed) : 0;
  const maxKmh = summary ? knotsToKmh(summary.maxSpeed) : 0;

  const valid = (trailQ.data ?? []).filter((x) => x.valid);
  const overCount = valid.filter((x) => knotsToKmh(x.speed) > 80).length;
  const overShare = valid.length ? overCount / valid.length : 0;
  const nightCount = valid.filter((x) => {
    const h = hourOf(x.fixTime);
    return h >= 23 || h < 5;
  }).length;
  const nightShare = valid.length ? nightCount / valid.length : 0;

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <AppHeader
        title={t("Insights")}
        subtitle={t("Last 7 days")}
        onBack={() => navigation.goBack()}
      />
      {devicesLoading ? (
        <LoadingView text={t("Loading insights…")} />
      ) : (devices ?? []).length === 0 ? (
        <EmptyState
          title={t("No devices yet")}
          hint={t("Add a GPS tracker to your account to see insights.")}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {/* device picker */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 16 }}
            style={{ marginBottom: 16 }}
          >
            {(devices ?? []).map((d) => {
              const active = d.id === activeId;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => setSelectedDevice(d.id)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? p.ink : p.line,
                    backgroundColor: active ? p.ink : p.surface,
                  }}
                >
                  <Txt
                    variant="body"
                    color={active ? "#fff" : p.ink}
                    style={active ? { fontWeight: "700" } : undefined}
                  >
                    {d.name}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>

          {loading ? (
            <LoadingView text={t("Crunching positions…")} />
          ) : score === null ? (
            <EmptyState
              title={t("Not enough data")}
              hint={t(
                "Need at least 10 GPS points in the last 7 days to compute a driving score.",
              )}
            />
          ) : score ? (
            <>
              {/* score ring */}
              <Rise delay={0}>
                <Card style={{ alignItems: "center", paddingVertical: 24 }}>
                  <View
                    style={{
                      width: 140,
                      height: 140,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Svg
                      width={140}
                      height={140}
                      viewBox="0 0 140 140"
                      style={{ position: "absolute" }}
                    >
                      <Circle
                        cx={70}
                        cy={70}
                        r={RING_R}
                        stroke={p.surface3}
                        strokeWidth={12}
                        fill="none"
                      />
                      <Circle
                        cx={70}
                        cy={70}
                        r={RING_R}
                        stroke={scoreColor}
                        strokeWidth={12}
                        fill="none"
                        strokeDasharray={`${(score.score / 100) * RING_C} ${RING_C}`}
                        strokeLinecap="round"
                        transform="rotate(-90 70 70)"
                      />
                    </Svg>
                    <View style={{ alignItems: "center" }}>
                      <Txt variant="display" style={{ fontWeight: "800" }}>
                        {score.score}
                      </Txt>
                      <Txt variant="small" color={p.muted}>
                        / 100
                      </Txt>
                    </View>
                  </View>
                  <Txt variant="subtitle" style={{ marginTop: 10 }}>
                    {t("Driving score")} · {scoreLabel}
                  </Txt>
                  <Txt variant="small" color={p.muted} style={{ marginTop: 4 }}>
                    {t(`${score.pointCount} GPS points scored`)}
                  </Txt>
                </Card>
              </Rise>

              {/* penalty breakdown */}
              <Rise delay={80}>
                <Card style={{ marginTop: 12 }}>
                  <Txt
                    variant="subtitle"
                    style={{ marginBottom: 12 }}
                  >
                    {t("What lowered the score")}
                  </Txt>
                  <PenaltyBar
                    label={t("Overspeeding (over 80 km/h)")}
                    points={score.overspeedPenalty}
                    max={40}
                  />
                  <PenaltyBar
                    label={t("Harsh braking")}
                    points={score.harshPenalty}
                    max={30}
                  />
                  <PenaltyBar
                    label={t("Night driving")}
                    points={score.nightPenalty}
                    max={10}
                  />
                </Card>
              </Rise>

              {/* context stats */}
              <Rise delay={120}>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    marginTop: 12,
                  }}
                >
                  <Card style={{ flex: 1 }}>
                    <Txt variant="display" style={{ fontWeight: "800" }}>
                      {distanceKm.toFixed(0)}
                      <Txt variant="small" color={p.muted}>
                        {" "}
                        {t("km")}
                      </Txt>
                    </Txt>
                    <Txt variant="small" color={p.muted} style={{ marginTop: 4 }}>
                      {t("Distance")}
                    </Txt>
                  </Card>
                  <Card style={{ flex: 1 }}>
                    <Txt variant="display" style={{ fontWeight: "800" }}>
                      {trips.length}
                    </Txt>
                    <Txt variant="small" color={p.muted} style={{ marginTop: 4 }}>
                      {t("Trips")}
                    </Txt>
                  </Card>
                  <Card style={{ flex: 1 }}>
                    <Txt variant="display" style={{ fontWeight: "800" }}>
                      {avgKmh.toFixed(0)}
                      <Txt variant="small" color={p.muted}>
                        {" "}
                        {t("km/h")}
                      </Txt>
                    </Txt>
                    <Txt variant="small" color={p.muted} style={{ marginTop: 4 }}>
                      {t("Avg speed")}
                    </Txt>
                  </Card>
                </View>
              </Rise>

              {/* findings */}
              <View style={{ marginTop: 12 }}>
                <Finding
                  icon={<AlertTriangle size={20} color={score.harshCount > 0 ? p.warn : p.ok} />}
                  title={t(`${score.harshCount} harsh-braking events`)}
                  subtitle={t("Sudden speed drops over 30 km/h.")}
                  tone={score.harshCount > 0 ? "warn" : "ok"}
                  delay={160}
                />
                <Finding
                  icon={<Gauge size={20} color={overShare > 0 ? p.alert : p.ok} />}
                  title={t(`${Math.round(overShare * 100)}% overspeeding`)}
                  subtitle={t(`${overCount} of ${valid.length} points over 80 km/h · top speed ${maxKmh.toFixed(0)} km/h.`)}
                  tone={overShare > 0 ? "alert" : "ok"}
                  delay={220}
                />
                <Finding
                  icon={<Moon size={20} color={p.muted} />}
                  title={t(`${Math.round(nightShare * 100)}% night driving`)}
                  subtitle={t(`${nightCount} points between 11 PM and 5 AM.`)}
                  tone="neutral"
                  delay={280}
                />
                <Finding
                  icon={<Route size={20} color={p.muted} />}
                  title={t(`${trips.length} trips this week`)}
                  subtitle={t(`${distanceKm.toFixed(0)} km driven in total.`)}
                  tone="neutral"
                  delay={340}
                />
              </View>
            </>
          ) : null}
          <View style={{ height: 8 }} />
        </ScrollView>
      )}
    </View>
  );
}
