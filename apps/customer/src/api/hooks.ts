/**
 * React Query hooks over the @w3ctrl/api Traccar client.
 * Polling replaces the WebSocket (see the api package header): positions
 * every 15s, events every 30s.
 */
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  traccar,
  type TraccarCalendar,
  type TraccarCommand,
  type TraccarComputedAttribute,
  type TraccarDevice,
  type TraccarDriver,
  type TraccarGeofence,
  type TraccarMaintenance,
  type TraccarNotification,
  type TraccarPosition,
  type TraccarUser,
} from "@w3ctrl/api";
import { authedFetch, authedText } from "./client";

/* ---------------------------------------------------------------- queries */

export function useDevices() {
  return useQuery({ queryKey: ["devices"], queryFn: traccar.devices });
}

export function usePositions() {
  return useQuery({
    queryKey: ["positions"],
    queryFn: traccar.positions,
    refetchInterval: 15000,
  });
}

/** Latest position per deviceId. */
export function usePositionMap(): Map<number, TraccarPosition> {
  const { data } = usePositions();
  return useMemo(() => {
    const m = new Map<number, TraccarPosition>();
    (data ?? []).forEach((p) => m.set(p.deviceId, p));
    return m;
  }, [data]);
}

export function useEvents(deviceId?: number, days = 7) {
  const from = useMemo(
    () => new Date(Date.now() - days * 86400000).toISOString(),
    [days],
  );
  const to = useMemo(() => new Date().toISOString(), []);
  return useQuery({
    queryKey: ["events", deviceId ?? "all", from],
    queryFn: () => traccar.events({ deviceId, from, to }),
    refetchInterval: 30000,
  });
}

export function useTrips(deviceId: number | undefined, from: string, to: string) {
  return useQuery({
    queryKey: ["trips", deviceId, from, to],
    queryFn: () => {
      if (deviceId == null) throw new Error("no device selected");
      return traccar.tripsReport(deviceId, from, to);
    },
    enabled: deviceId != null,
  });
}

export function useSummary(deviceIds: number[], from: string, to: string) {
  const key = deviceIds.join(",");
  return useQuery({
    queryKey: ["summary", key, from, to],
    queryFn: () => traccar.summaryReport(deviceIds, from, to),
    enabled: deviceIds.length > 0,
  });
}

export function usePositionHistory(
  deviceId: number | undefined,
  from: string | undefined,
  to: string | undefined,
) {
  return useQuery({
    queryKey: ["trail", deviceId, from, to],
    queryFn: () => {
      if (deviceId == null || !from || !to) throw new Error("missing range");
      return traccar.positionHistory(deviceId, from, to);
    },
    enabled: deviceId != null && !!from && !!to,
  });
}

export function useGeofences() {
  return useQuery({ queryKey: ["geofences"], queryFn: traccar.geofences });
}

export function useNotifications() {
  return useQuery({ queryKey: ["notifications"], queryFn: traccar.notifications });
}

export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: traccar.users });
}

/**
 * Devices linked to a geofence. Traccar's GET /api/permissions?geofenceId=
 * returns linked users AND devices — filter to devices (uniqueId present).
 * Failures resolve to an empty list so the UI degrades gracefully.
 */
export function useGeofenceDevices(geofenceId: number | undefined) {
  return useQuery({
    queryKey: ["geofence-devices", geofenceId],
    queryFn: async (): Promise<TraccarDevice[]> => {
      try {
        const items = await authedFetch<Array<TraccarDevice & { email?: string }>>(
          `/permissions?geofenceId=${geofenceId}`,
        );
        return items.filter((i) => typeof i.uniqueId === "string");
      } catch {
        return [];
      }
    },
    enabled: geofenceId != null,
    retry: false,
  });
}

/**
 * Raw TOTP secret from POST /api/users/totp. Traccar returns the base32
 * secret as plain text (older behaviour); accept a {key} JSON body too.
 */
export async function generateTotpSecret(): Promise<string> {
  const raw = (await authedText("/users/totp", { method: "POST" })).trim();
  if (raw.startsWith("{")) {
    try {
      const obj = JSON.parse(raw) as { key?: unknown };
      if (typeof obj.key === "string" && obj.key) return obj.key.trim();
    } catch {
      /* fall through to raw text */
    }
  }
  return raw;
}

/* -------------------------------------------------------------- mutations */

export function useCreateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; uniqueId: string }) =>
      traccar.createDevice(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });
}

export function useUpdateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (device: TraccarDevice) => traccar.updateDevice(device),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });
}

export function useCreateGeofence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<TraccarGeofence, "id">) => traccar.createGeofence(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["geofences"] }),
  });
}

export function useUpdateGeofence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TraccarGeofence }) =>
      traccar.updateGeofence(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["geofences"] }),
  });
}

export function useDeleteGeofence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => traccar.deleteGeofence(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["geofences"] }),
  });
}

export function useLinkPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, number>) => traccar.linkPermission(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["geofence-devices"] }),
  });
}

export function useUnlinkPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, number>) => traccar.unlinkPermission(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["geofence-devices"] }),
  });
}

export function useCreateNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<TraccarNotification, "id">) =>
      traccar.createNotification(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => traccar.deleteNotification(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useSendCommand() {
  return useMutation({
    mutationFn: ({ deviceId, type }: { deviceId: number; type: string }) =>
      traccar.sendCommand(deviceId, type),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (user: TraccarUser) => traccar.updateUser(user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

/* ------------------------------------------------------- fleet (Traccar) */

export function useDrivers() {
  return useQuery({ queryKey: ["drivers"], queryFn: traccar.drivers });
}

export function useCreateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<TraccarDriver, "id">) => traccar.createDriver(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drivers"] }),
  });
}

export function useUpdateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TraccarDriver }) =>
      traccar.updateDriver(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drivers"] }),
  });
}

export function useDeleteDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => traccar.deleteDriver(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drivers"] }),
  });
}

export function useCalendars() {
  return useQuery({ queryKey: ["calendars"], queryFn: traccar.calendars });
}

export function useCreateCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<TraccarCalendar, "id">) => traccar.createCalendar(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendars"] }),
  });
}

export function useUpdateCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TraccarCalendar }) =>
      traccar.updateCalendar(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendars"] }),
  });
}

export function useDeleteCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => traccar.deleteCalendar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendars"] }),
  });
}

export function useComputedAttributes() {
  return useQuery({
    queryKey: ["computedAttributes"],
    queryFn: traccar.computedAttributes,
  });
}

export function useCreateComputedAttribute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<TraccarComputedAttribute, "id">) =>
      traccar.createComputedAttribute(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["computedAttributes"] }),
  });
}

export function useDeleteComputedAttribute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => traccar.deleteComputedAttribute(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["computedAttributes"] }),
  });
}

export function useMaintenance() {
  return useQuery({ queryKey: ["maintenance"], queryFn: traccar.maintenance });
}

export function useCreateMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<TraccarMaintenance, "id">) => traccar.createMaintenance(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance"] }),
  });
}

export function useUpdateMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TraccarMaintenance }) =>
      traccar.updateMaintenance(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance"] }),
  });
}

export function useDeleteMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => traccar.deleteMaintenance(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance"] }),
  });
}

export function useSavedCommands() {
  return useQuery({ queryKey: ["savedCommands"], queryFn: traccar.savedCommands });
}

export function useCreateSavedCommand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<TraccarCommand, "id">) => traccar.createSavedCommand(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["savedCommands"] }),
  });
}

export function useDeleteSavedCommand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => traccar.deleteSavedCommand(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["savedCommands"] }),
  });
}
