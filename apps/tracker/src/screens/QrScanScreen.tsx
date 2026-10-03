/**
 * QR pairing scanner. The parent's web portal shows a QR encoding
 * `org.traccar.client:?url=<track-url>&id=<deviceId>&…` (see
 * w3ctrl-track/src/lib/qr-provision.ts); scanning it here fills the setup
 * form's server + device ID. Anything else shows an inline error and
 * scanning continues — there is no fake pairing code anywhere in this flow.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { BarcodeScanningResult } from "expo-camera";
import { AlertTriangle, Camera, ChevronLeft } from "lucide-react-native";
import { Button, LoadingView } from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import type { RootStackParamList } from "../App";

type Props = NativeStackScreenProps<RootStackParamList, "QrScan">;

const SCHEME = "org.traccar.client:";

/**
 * Parse a W3ctrl pairing QR into the setup form's fields. Returns null for
 * anything that isn't one — wrong app, wrong format, missing params.
 */
function parsePairingQr(
  data: string,
): { server: string; deviceId: string } | null {
  const raw = data.trim();
  if (!raw.startsWith(SCHEME)) return null;
  const q = raw.indexOf("?");
  if (q === -1) return null;
  const params = new URLSearchParams(raw.slice(q + 1));
  const url = params.get("url");
  const id = (params.get("id") ?? "").trim();
  if (!url || !id) return null;
  let origin: string;
  try {
    origin = new URL(url).origin;
  } catch {
    return null;
  }
  if (origin === "null") return null;
  return { server: origin, deviceId: id };
}

export default function QrScanScreen({ navigation }: Props) {
  const t = useT();
  const [permission, requestPermission] = useCameraPermissions();
  const [badScan, setBadScan] = useState(false);
  const [asked, setAsked] = useState(false);
  const done = useRef(false);

  // Request camera access once on mount; the grant state below handles denial.
  useEffect(() => {
    if (
      permission &&
      !permission.granted &&
      !asked &&
      permission.canAskAgain
    ) {
      setAsked(true);
      requestPermission();
    }
  }, [permission, asked, requestPermission]);

  const onScan = useCallback(
    (result: BarcodeScanningResult) => {
      if (done.current) return;
      const parsed = parsePairingQr(result.data);
      if (!parsed) {
        setBadScan(true); // keep scanning — the user can re-aim or go manual
        return;
      }
      done.current = true;
      navigation.navigate("Setup", { scanned: parsed });
    },
    [navigation],
  );

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  if (!permission) {
    return <LoadingView text={t("Preparing camera…")} />;
  }

  // Not granted (yet, or denied): explain + offer settings or manual entry.
  if (!permission.granted) {
    const blocked = !permission.canAskAgain;
    return (
      <SafeAreaView style={s.dark} edges={["top", "bottom"]}>
        <Pressable onPress={goBack} hitSlop={12} style={s.backBtn}>
          <ChevronLeft size={26} color="#ffffff" />
        </Pressable>
        <View style={s.grantWrap}>
          <Camera size={44} color="#ff9900" />
          <Text style={s.grantTitle}>{t("Camera access needed")}</Text>
          <Text style={s.grantBody}>
            {t(
              "Point the camera at the QR code in your parent's W3ctrl Track app to pair this phone.",
            )}
          </Text>
          <Button
            title={
              blocked ? t("Open system settings") : t("Allow camera access")
            }
            onPress={
              blocked ? () => Linking.openSettings() : requestPermission
            }
            style={{ width: "100%", marginTop: 8 }}
          />
          <Pressable onPress={goBack} style={{ marginTop: 16 }}>
            <Text style={s.manualLink}>
              {t("Enter the details manually instead")}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={s.dark}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={onScan}
      />
      <SafeAreaView
        style={StyleSheet.absoluteFill}
        edges={["top", "bottom"]}
        pointerEvents="box-none"
      >
        <View style={s.topBar}>
          <Pressable onPress={goBack} hitSlop={12} style={s.backBtnInline}>
            <ChevronLeft size={26} color="#ffffff" />
          </Pressable>
          <Text style={s.topTitle}>{t("Scan the QR code")}</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={s.center}>
          <View style={s.frame} />
          <Text style={s.hint}>
            {t("Point the camera at the QR code shown in the parent's app")}
          </Text>
        </View>

        {badScan ? (
          <View style={s.errorBanner}>
            <AlertTriangle size={18} color="#ff9d8a" />
            <Text style={s.errorText}>
              {t("This doesn't look like a W3ctrl pairing code.")}
            </Text>
          </View>
        ) : null}

        <View style={s.bottom}>
          <Pressable onPress={goBack}>
            <Text style={s.manualLink}>
              {t("Enter the details manually instead")}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  dark: {
    flex: 1,
    backgroundColor: "#0b0b0d",
  },
  backBtn: {
    width: 44,
    height: 44,
    marginLeft: 8,
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnInline: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 22,
  },
  grantWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  grantTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 8,
  },
  grantBody: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 6,
  },
  manualLink: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ff9900",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  topTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: "#ff9900",
    borderRadius: 24,
  },
  hint: {
    marginTop: 18,
    fontSize: 13.5,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    paddingHorizontal: 48,
    lineHeight: 19,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 24,
    marginBottom: 12,
    backgroundColor: "rgba(90,20,12,0.92)",
    borderWidth: 1,
    borderColor: "#7a2e1d",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    color: "#ffb3a3",
    lineHeight: 19,
  },
  bottom: {
    alignItems: "center",
    paddingBottom: 18,
    paddingTop: 4,
  },
});
