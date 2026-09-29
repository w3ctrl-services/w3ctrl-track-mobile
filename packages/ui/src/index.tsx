/**
 * Shared UI kit for the W3ctrl Track mobile apps.
 * Warm-paper surfaces, amber signal colour, no emojis — matches the web app.
 */
import React, {
  createContext,
  forwardRef,
  useContext,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  useColorScheme,
  View,
  ViewStyle,
} from "react-native";
import { WebView } from "react-native-webview";
import {
  dark as darkPalette,
  light as lightPalette,
  Palette,
  radius,
  spacing,
  ThemeMode,
  type as typeScale,
} from "@w3ctrl/theme";
import type { DeviceType } from "@w3ctrl/api";

/* ------------------------------------------------------------------ theme */

const ThemeContext = createContext<{ mode: ThemeMode; p: Palette }>({
  mode: "light",
  p: lightPalette,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const mode: ThemeMode = scheme === "dark" ? "dark" : "light";
  const value = useMemo(
    () => ({ mode, p: mode === "dark" ? darkPalette : lightPalette }),
    [mode],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Palette {
  return useContext(ThemeContext).p;
}

export function useThemeMode(): ThemeMode {
  return useContext(ThemeContext).mode;
}

/* ------------------------------------------------------------------ text */

export function Txt({
  variant = "body",
  color,
  style,
  children,
  numberOfLines,
  selectable,
}: {
  variant?: keyof typeof typeScale;
  color?: string;
  style?: TextStyle;
  children: React.ReactNode;
  numberOfLines?: number;
  selectable?: boolean;
}) {
  const p = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      selectable={selectable}
      style={[
        typeScale[variant],
        { color: color ?? p.ink },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/* ------------------------------------------------------------------ screen */

export function Screen({
  children,
  scroll = true,
  padded = true,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
}) {
  const p = useTheme();
  const body = (
    <View style={[{ flex: 1 }, padded && { padding: spacing.lg }, style]}>
      {children}
    </View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.paper }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ card */

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const p = useTheme();
  const inner = (
    <View
      style={[
        {
          backgroundColor: p.surface,
          borderColor: p.line,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: spacing.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
      >
        {inner}
      </Pressable>
    );
  }
  return inner;
}

/* ------------------------------------------------------------------ button */

type ButtonKind = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  title,
  onPress,
  kind = "primary",
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: ButtonKind;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const p = useTheme();
  const styles: Record<ButtonKind, { bg: string; fg: string; border?: string }> = {
    primary: { bg: p.brand, fg: "#12100d" },
    secondary: { bg: p.surface, fg: p.ink, border: p.lineStrong },
    danger: { bg: p.alert, fg: "#ffffff" },
    ghost: { bg: "transparent", fg: p.brandInk },
  };
  const s = styles[kind];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: s.bg,
          borderRadius: radius.pill,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: spacing.sm,
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
          ...(s.border ? { borderWidth: 1, borderColor: s.border } : {}),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={s.fg} size="small" />
      ) : (
        <Text style={{ color: s.fg, fontSize: 16, fontWeight: "600" }}>{title}</Text>
      )}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ field */

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  keyboardType,
  autoCapitalize = "none",
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  hint?: string;
}) {
  const p = useTheme();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: p.ink2, marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={p.faint}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={{
          backgroundColor: p.surface,
          borderColor: p.line,
          borderWidth: 1,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          fontSize: 16,
          color: p.ink,
        }}
      />
      {hint ? (
        <Text style={{ fontSize: 12, color: p.faint, marginTop: 4 }}>{hint}</Text>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ badge */

export function Badge({
  text,
  tone = "neutral",
}: {
  text: string;
  tone?: "neutral" | "ok" | "warn" | "alert" | "brand";
}) {
  const p = useTheme();
  const tones = {
    neutral: { bg: p.surface3, fg: p.ink2 },
    ok: { bg: p.okSoft, fg: p.ok },
    warn: { bg: p.warnSoft, fg: p.warn },
    alert: { bg: p.alertSoft, fg: p.alert },
    brand: { bg: p.brandSoft, fg: p.brandInk },
  } as const;
  const s = tones[tone];
  return (
    <View
      style={{
        backgroundColor: s.bg,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color: s.fg, fontSize: 12, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ misc */

export function LoadingView({ text }: { text?: string }) {
  const p = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
      <ActivityIndicator size="large" color={p.brand} />
      {text ? <Txt variant="small" color={p.muted}>{text}</Txt> : null}
    </View>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  const p = useTheme();
  return (
    <View
      style={{
        alignItems: "center",
        padding: spacing.xxl,
        gap: 6,
      }}
    >
      <Txt variant="subtitle" color={p.ink}>
        {title}
      </Txt>
      {hint ? (
        <Txt variant="small" color={p.muted} style={{ textAlign: "center" }}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

export function Divider() {
  const p = useTheme();
  return <View style={{ height: 1, backgroundColor: p.line, marginVertical: spacing.md }} />;
}

export function Row({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center" }, style]}>
      {children}
    </View>
  );
}

/* ------------------------------------------------------- segmented */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const p = useTheme();
  return (
    <Row
      style={{
        backgroundColor: p.surface2,
        borderRadius: radius.pill,
        padding: 4,
        gap: 2,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: radius.pill,
              backgroundColor: active ? p.surface : "transparent",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: active ? "700" : "500",
                color: active ? p.ink : p.muted,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </Row>
  );
}

/* ------------------------------------------------------- device icon */

const TYPE_DOT: Record<DeviceType, string> = {
  vehicle: "#ff9900",
  phone: "#4f8cff",
  laptop: "#9b6bf3",
  asset: "#1d7a4c",
  pet: "#e06ba7",
};

export function DeviceDot({ type, size = 12 }: { type: DeviceType; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: TYPE_DOT[type],
      }}
    />
  );
}

export function deviceColor(type: DeviceType): string {
  return TYPE_DOT[type];
}

/* ------------------------------------------------------------------ map */

/**
 * MapLibre GL map inside a WebView — free OpenFreeMap tiles, no API keys, the same
 * tiles the web app uses. Markers, trip polylines and geofence circles are
 * rendered from props; taps report back via `onPress(lat, lng)`.
 */
export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  color: string;
  label?: string;
  selected?: boolean;
}

export interface MapCircle {
  id: string;
  lat: number;
  lng: number;
  radiusM: number;
  color: string;
}

function mapHtml(opts: {
  markers: MapMarker[];
  path: [number, number][];
  circles: MapCircle[];
  center: [number, number] | null;
  zoom: number;
  brand: string;
}): string {
  const markers = JSON.stringify(opts.markers);
  const path = JSON.stringify(opts.path);
  const circles = JSON.stringify(opts.circles);
  const center = opts.center ? `[${opts.center[1]}, ${opts.center[0]}]` : "null";
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet"/>
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<style>html,body,#m{margin:0;height:100%;width:100%;overflow:hidden}
.mk{width:26px;height:26px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.35);cursor:pointer}
.mk.sel{width:34px;height:34px;border-width:4px}
.lbl{background:rgba(18,16,13,.85);color:#fff;font:600 11px system-ui;padding:3px 8px;border-radius:999px;white-space:nowrap;transform:translateY(-32px)}</style>
</head><body><div id="m"></div><script>
var map=new maplibregl.Map({container:'m',style:'https://tiles.openfreemap.org/styles/positron',center:${center}||[77.2,28.6],zoom:${opts.zoom}});
map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
var markers=${markers}, path=${path}, circles=${circles};
var markerObjs={};
function draw(){
  markers.forEach(function(mk){
    var el=document.createElement('div');el.className='mk'+(mk.selected?' sel':'');
    el.style.background=mk.color;
    if(mk.label){var lb=document.createElement('div');lb.className='lbl';lb.textContent=mk.label;el.appendChild(lb);}
    markerObjs[mk.id]=new maplibregl.Marker({element:el}).setLngLat([mk.lng,mk.lat]).addTo(map);
    el.addEventListener('click',function(){window.ReactNativeWebView.postMessage(JSON.stringify({kind:'marker',id:mk.id}));});
  });
  if(path.length>1){map.addSource('path',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:path}}});
    map.addLayer({id:'path',type:'line',source:'path',paint:{'line-color':'${opts.brand}','line-width':4,'line-opacity':0.9}});}
  if(circles.length){var fc={type:'FeatureCollection',features:circles.map(function(c){
    var pts=[],R=6371000,rad=c.radiusM/R,lat=c.lat*Math.PI/180,lng=c.lng*Math.PI/180;
    for(var i=0;i<=48;i++){var a=i/48*2*Math.PI;pts.push([(lng+Math.asin(Math.sin(a)*Math.sin(rad)/Math.cos(lat)))*180/Math.PI,(Math.asin(Math.sin(lat)*Math.cos(rad)+Math.cos(lat)*Math.sin(rad)*Math.cos(a)))*180/Math.PI]);}
    return {type:'Feature',properties:{color:c.color},geometry:{type:'Polygon',coordinates:[pts]}};})};
    map.addSource('circles',{type:'geojson',data:fc});
    map.addLayer({id:'cf',type:'fill',source:'circles',paint:{'fill-color':['get','color'],'fill-opacity':0.18}});
    map.addLayer({id:'co',type:'line',source:'circles',paint:{'line-color':['get','color'],'line-width':2}});}
  if(markers.length===1&&!${center}){map.flyTo({center:[markers[0].lng,markers[0].lat],zoom:14});}
  else if(markers.length>1&&!${center}){var b=new maplibregl.LngLatBounds();markers.forEach(function(mk){b.extend([mk.lng,mk.lat]);});map.fitBounds(b,{padding:60});}
}
map.on('load',draw);
map.on('click',function(e){window.ReactNativeWebView.postMessage(JSON.stringify({kind:'tap',lat:e.lngLat.lat,lng:e.lngLat.lng}));});
window.__moveMarker=function(id,lat,lng){var m=markerObjs[id];if(m){m.setLngLat([lng,lat]);}};
window.__recenter=function(lat,lng,z){map.flyTo({center:[lng,lat],zoom:z||14});};
</script></body></html>`;
}

export interface MapViewProps {
  markers: MapMarker[];
  path?: [number, number][];
  circles?: MapCircle[];
  center?: [number, number] | null;
  zoom?: number;
  onTap?: (lat: number, lng: number) => void;
  onMarkerPress?: (id: string) => void;
  style?: ViewStyle;
}

/**
 * Minimal handle a MapView exposes to its parent — just script injection.
 * Kept structural (instead of the WebView class) so apps and this package
 * can resolve different react-native-webview copies without type clashes.
 */
export interface MapHandle {
  injectJavaScript: (script: string) => void;
}

/**
 * The WebView with only the props MapView uses, typed structurally.
 * react-native-webview v14's bundled types declare WebView as a plain
 * FunctionComponent (no ref/instance members); v13 declares the class.
 * The native runtime is class-based with injectJavaScript in both, so we
 * type the surface we actually touch instead of fighting the lib types.
 */
const OpaqueWebView = WebView as unknown as React.FC<{
  source: { html: string };
  style?: StyleProp<ViewStyle>;
  javaScriptEnabled?: boolean;
  domStorageEnabled?: boolean;
  onMessage?: (e: { nativeEvent: { data: string } }) => void;
  ref?: React.Ref<MapHandle>;
}>;

export const MapView = forwardRef<MapHandle, MapViewProps>(function MapView(
  {
    markers,
    path = [],
    circles = [],
    center = null,
    zoom = 12,
    onTap,
    onMarkerPress,
    style,
  }: MapViewProps,
  ref: React.Ref<MapHandle>,
) {
  const p = useTheme();
  const innerRef = useRef<MapHandle>(null);
  useImperativeHandle(
    ref,
    () => ({
      injectJavaScript: (script: string) => {
        innerRef.current?.injectJavaScript(script);
      },
    }),
    [],
  );
  const html = useMemo(
    () => mapHtml({ markers, path, circles, center, zoom, brand: p.brand }),
    // re-render the map when the data identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(markers), JSON.stringify(path), JSON.stringify(circles)],
  );
  return (
    <OpaqueWebView
      ref={innerRef}
      source={{ html }}
      style={[{ flex: 1 }, style]}
      javaScriptEnabled
      domStorageEnabled
      onMessage={(e) => {
        try {
          const msg = JSON.parse(e.nativeEvent.data);
          if (msg.kind === "tap") onTap?.(msg.lat, msg.lng);
          if (msg.kind === "marker") onMarkerPress?.(msg.id);
        } catch {
          /* ignore malformed messages */
        }
      }}
    />
  );
});

/**
 * Move a marker imperatively without re-rendering the WebView — used for
 * smooth trip-replay animation. The marker id must exist in `markers`.
 */
export function moveMapMarker(
  ref: React.RefObject<MapHandle | null>,
  id: string,
  lat: number,
  lng: number,
): void {
  ref.current?.injectJavaScript(
    `window.__moveMarker(${JSON.stringify(id)},${lat},${lng});true;`,
  );
}

/** Imperatively fly the map to a coordinate. */
export function recenterMap(ref: React.RefObject<WebView | null>, lat: number, lng: number, zoom = 14) {
  ref.current?.injectJavaScript(`window.__recenter(${lat},${lng},${zoom});true;`);
}

export const styles = StyleSheet.create({
  gap: { height: spacing.md },
});
