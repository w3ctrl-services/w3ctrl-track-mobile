import React from "react";
import { Button, Card, Row, Txt, useTheme } from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import { knotsToKmh, type TraccarTrip } from "@w3ctrl/api";
import { formatDuration, formatKm } from "../utils/format";

export default function TripRow({
  trip,
  onReplay,
}: {
  trip: TraccarTrip;
  onReplay?: () => void;
}) {
  const p = useTheme();
  const t = useT();
  const start = new Date(trip.startTime);
  return (
    <Card style={{ marginBottom: 12 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Txt variant="subtitle" style={{ flex: 1 }}>
          {start.toLocaleDateString()}{" "}
          {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Txt>
        {onReplay ? (
          <Button kind="ghost" title={t("Replay")} onPress={onReplay} />
        ) : null}
      </Row>
      <Row style={{ gap: 16, marginTop: 8, flexWrap: "wrap" }}>
        <Txt variant="small" color={p.muted}>
          {formatKm(trip.distance)} km
        </Txt>
        <Txt variant="small" color={p.muted}>
          {formatDuration(trip.duration, t)}
        </Txt>
        <Txt variant="small" color={p.muted}>
          {t("Avg speed")}: {Math.round(knotsToKmh(trip.averageSpeed))} km/h
        </Txt>
      </Row>
    </Card>
  );
}
