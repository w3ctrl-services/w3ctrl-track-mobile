/**
 * EN/HI strings for the mobile apps. Same convention as the web app:
 * keys are English, the `en` dictionary is empty (lookup falls back to
 * the key), `hi` gains translations incrementally — the toggle never
 * renders a blank label.
 */
import React, { createContext, useCallback, useContext, useState } from "react";

export type Lang = "en" | "hi";

const hi: Record<string, string> = {
  // auth
  "Welcome back": "वापस स्वागत है",
  "Sign in to your W3ctrl Track account.": "अपने W3ctrl Track खाते में साइन इन करें।",
  Email: "ईमेल",
  Password: "पासवर्ड",
  "Sign in": "साइन इन",
  "Signing in…": "साइन इन हो रहा…",
  "Authenticator code": "ऑथेंटिकेटर कोड",
  "Enter the 6-digit code from your authenticator app.": "अपने ऑथेंटिकेटर ऐप से 6 अंकों का कोड डालें।",
  Verify: "सत्यापित करें",
  "Invalid email or password.": "गलत ईमेल या पासवर्ड।",
  "Two-factor code required.": "टू-फैक्टर कोड आवश्यक है।",
  "Wrong authenticator code — try again.": "गलत ऑथेंटिकेटर कोड — फिर कोशिश करें।",
  "Sign out": "साइन आउट",
  // nav
  Home: "होम",
  Map: "मैप",
  Devices: "डिवाइस",
  Alerts: "अलर्ट",
  Settings: "सेटिंग्स",
  Trips: "यात्राएँ",
  Geofences: "जियोफेंस",
  Reports: "रिपोर्ट",
  Admin: "एडमिन",
  // dashboard
  "Good morning": "सुप्रभात",
  "Good afternoon": "नमस्ते",
  "Good evening": "शुभ संध्या",
  "devices online": "डिवाइस ऑनलाइन",
  "Total distance today": "आज की कुल दूरी",
  "Active alerts": "सक्रिय अलर्ट",
  "Latest alerts": "ताज़ा अलर्ट",
  "View all": "सभी देखें",
  "No alerts in the last 7 days.": "पिछले 7 दिनों में कोई अलर्ट नहीं।",
  // devices
  "Add device": "डिवाइस जोड़ें",
  "Device name": "डिवाइस का नाम",
  "Device ID": "डिवाइस ID",
  Online: "ऑनलाइन",
  Offline: "ऑफलाइन",
  Unknown: "अज्ञात",
  "Last seen": "अंतिम बार देखा",
  "Battery": "बैटरी",
  "Speed": "गति",
  "Ignition on": "इग्निशन चालू",
  "Ignition off": "इग्निशन बंद",
  "Stop engine": "इंजन बंद करें",
  "Start engine": "इंजन चालू करें",
  "Engine cut-off is blocked above 5 km/h for safety.": "सुरक्षा के लिए 5 km/h से ऊपर इंजन बंद करना अवरुद्ध है।",
  "Are you sure? This stops the engine remotely.": "क्या आप निश्चित हैं? इससे इंजन दूर से बंद होगा।",
  Cancel: "रद्द करें",
  Confirm: "पुष्टि करें",
  "Trip history": "यात्रा इतिहास",
  "No trips in this period.": "इस अवधि में कोई यात्रा नहीं।",
  "Replay": "रीप्ले",
  // map
  "Live map": "लाइव मैप",
  "All devices": "सभी डिवाइस",
  // alerts
  "Alert rules": "अलर्ट नियम",
  "New rule": "नया नियम",
  "Rule name": "नियम का नाम",
  "When": "कब",
  "Notify me by": "सूचना माध्यम",
  "App": "ऐप",
  "Email alerts": "ईमेल अलर्ट",
  "Delete": "हटाएँ",
  "Save": "सहेजें",
  "SOS": "SOS",
  // geofences
  "New geofence": "नया जियोफेंस",
  "Geofence name": "जियोफेंस का नाम",
  "Radius (metres)": "त्रिज्या (मीटर)",
  "Use map centre": "मैप केंद्र उपयोग करें",
  "Tap on the map to place the centre, then set the radius.": "केंद्र रखने के लिए मैप पर टैप करें, फिर त्रिज्या सेट करें।",
  Linked: "लिंक्ड",
  "Link devices": "डिवाइस लिंक करें",
  // reports
  "Today": "आज",
  "This week": "इस सप्ताह",
  "This month": "इस महीने",
  "Distance": "दूरी",
  "Top speed": "अधिकतम गति",
  "Engine hours": "इंजन घंटे",
  "Fuel used": "ईंधन खर्च",
  "Est. fuel cost": "अनुमानित ईंधन लागत",
  // settings
  "Profile": "प्रोफ़ाइल",
  "Language": "भाषा",
  "English": "English",
  "Hindi": "हिन्दी",
  "Plan": "प्लान",
  "Basic": "बेसिक",
  "Plus": "प्लस",
  "Fleet": "फ्लीट",
  "Security": "सुरक्षा",
  "Two-factor authentication": "टू-फैक्टर प्रमाणीकरण",
  "Change password": "पासवर्ड बदलें",
  "Current password": "वर्तमान पासवर्ड",
  "New password": "नया पासवर्ड",
  // customer app — added 2026-09-30
  "Too many attempts — please wait a minute and try again.":
    "बहुत प्रयास हुए — एक मिनट रुककर फिर कोशिश करें।",
  Details: "विवरण",
  All: "सभी",
  Vehicle: "वाहन",
  Phone: "फ़ोन",
  Laptop: "लैपटॉप",
  Asset: "संपत्ति",
  Pet: "पालतू",
  Type: "प्रकार",
  "The tracker ID — IMEI for GPS trackers.": "ट्रैकर ID — GPS ट्रैकर के लिए IMEI।",
  "Please enter a name and device ID.": "कृपया नाम और डिवाइस ID डालें।",
  "No devices yet.": "अभी कोई डिवाइस नहीं।",
  "Tap + to add your first tracker.": "पहला ट्रैकर जोड़ने के लिए + दबाएँ।",
  "just now": "अभी",
  "days ago": "दिन पहले",
  min: "मिनट",
  hr: "घंटा",
  Ignition: "इग्निशन",
  Address: "पता",
  "Last update": "अंतिम अपडेट",
  "Avg speed": "औसत गति",
  Engine: "इंजन",
  "Engine is stopped.": "इंजन बंद है।",
  "Engine is running.": "इंजन चालू है।",
  Play: "चलाएँ",
  Pause: "रोकें",
  Duration: "अवधि",
  "Edit geofence": "जियोफेंस संपादित करें",
  Radius: "त्रिज्या",
  "No geofences yet.": "अभी कोई जियोफेंस नहीं।",
  "Name the geofence, tap the map to set the centre, and set a radius.":
    "जियोफेंस का नाम दें, केंद्र के लिए मैप पर टैप करें और त्रिज्या सेट करें।",
  Feed: "फ़ीड",
  Rules: "नियम",
  "No alert rules yet.": "अभी कोई अलर्ट नियम नहीं।",
  "Select at least one device.": "कम से कम एक डिवाइस चुनें।",
  "Choose at least one notification channel.": "कम से कम एक सूचना माध्यम चुनें।",
  "Alarm (shock / SOS / tamper)": "अलार्म (झटका / SOS / छेड़छाड़)",
  "Geofence enter": "जियोफेंस में प्रवेश",
  "Geofence exit": "जियोफेंस से निकास",
  Overspeed: "अधिक गति",
  "Device offline": "डिवाइस ऑफ़लाइन",
  "Upgrade plan": "प्लान अपग्रेड करें",
  "Request upgrade": "अपग्रेड का अनुरोध करें",
  "Upgrade request sent.": "अपग्रेड अनुरोध भेजा गया।",
  "Note (optional)": "नोट (वैकल्पिक)",
  "Plan expiry": "प्लान समाप्ति",
  "YYYY-MM-DD": "YYYY-MM-DD",
  "Generate key": "कुंजी बनाएँ",
  "Verify & enable": "सत्यापित करें और चालू करें",
  "Copy the key into your authenticator app, then enter the code below to verify.":
    "कुंजी को अपने ऑथेंटिकेटर ऐप में डालें, फिर सत्यापन के लिए नीचे कोड डालें।",
  "Long-press the key to copy it.": "कॉपी करने के लिए कुंजी को देर तक दबाएँ।",
  "Please enter your current password.": "कृपया अपना वर्तमान पासवर्ड डालें।",
  Disable: "बंद करें",
  "Two-factor is enabled.": "टू-फैक्टर चालू है।",
  "Password changed.": "पासवर्ड बदल गया।",
  "Use at least 6 characters for the new password.":
    "नए पासवर्ड में कम से कम 6 अक्षर रखें।",
  "Wrong current password.": "गलत वर्तमान पासवर्ड।",
  "Something went wrong.": "कुछ गलत हो गया।",
  "Are you sure you want to sign out?": "क्या आप साइन आउट करना चाहते हैं?",
  "Manage users, plans and requests.": "उपयोगकर्ता, प्लान और अनुरोध प्रबंधित करें।",
  "Upgrade request": "अपग्रेड अनुरोध",
  "Feature request": "फ़ीचर अनुरोध",
  Requests: "अनुरोध",
  Users: "उपयोगकर्ता",
  "No users found.": "कोई उपयोगकर्ता नहीं मिला।",
  Approve: "स्वीकार करें",
  Dismiss: "खारिज करें",
  Customer: "ग्राहक",
  Superadmin: "सुपरएडमिन",
  Role: "भूमिका",
  "This action cannot be undone.": "यह क्रिया वापस नहीं होगी।",
  // tracker app
  "W3ctrl Tracker": "W3ctrl ट्रैकर",
  "Start tracking": "ट्रैकिंग शुरू करें",
  "Stop tracking": "ट्रैकिंग बंद करें",
  "Tracking is ON": "ट्रैकिंग चालू है",
  "Tracking is OFF": "ट्रैकिंग बंद है",
  "Set up this phone": "इस फ़ोन को सेट करें",
  "Enter the device ID from your W3ctrl Track account.":
    "अपने W3ctrl Track खाते से डिवाइस ID डालें।",
  "Server URL": "सर्वर URL",
  "Set PIN": "PIN सेट करें",
  "Enter PIN": "PIN डालें",
  "Choose a 4-digit PIN to lock settings.": "सेटिंग्स लॉक करने के लिए 4 अंकों का PIN चुनें।",
  "Wrong PIN.": "गलत PIN।",
  "Last sent": "अंतिम बार भेजा",
  "Accuracy": "सटीकता",
  "Update interval": "अपडेट अंतराल",
  "Every 1 minute": "हर 1 मिनट",
  "Every 3 minutes": "हर 3 मिनट",
  "Every 5 minutes": "हर 5 मिनट",
  "Grant “Always” location permission, or tracking stops in the background.":
    "“Always” लोकेशन अनुमति दें, वरना बैकग्राउंड में ट्रैकिंग रुक जाएगी।",
  "Open settings": "सेटिंग्स खोलें",
  "Hold for SOS": "SOS के लिए दबाए रखें",
  "SOS sent — help is on the way.": "SOS भेजा गया — मदद आ रही है।",
  "Release to cancel": "रद्द करने के लिए छोड़ें",
  // tracker app — setup
  "Add this phone in your W3ctrl Track account first (Devices → Add → Phone), then enter its Device ID here.":
    "पहले इस फ़ोन को अपने W3ctrl Track खाते में जोड़ें (डिवाइस → जोड़ें → फ़ोन), फिर उसका डिवाइस ID यहाँ डालें।",
  "Test connection": "कनेक्शन जाँचें",
  "Connection OK — the server accepted this device.":
    "कनेक्शन ठीक है — सर्वर ने इस डिवाइस को स्वीकार कर लिया।",
  "Unknown device ID — add this phone in your W3ctrl Track account first (Devices → Add → Phone).":
    "अज्ञात डिवाइस ID — पहले इस फ़ोन को अपने W3ctrl Track खाते में जोड़ें (डिवाइस → जोड़ें → फ़ोन)।",
  "Connection failed. Check the server URL and try again.":
    "कनेक्शन विफल। सर्वर URL जाँचें और फिर कोशिश करें।",
  "Phone identity": "फ़ोन की पहचान",
  "Confirm PIN": "PIN की पुष्टि करें",
  "PINs do not match — try again.": "PIN मेल नहीं खा रहे — फिर कोशिश करें।",
  "Enter a 4-digit PIN in both fields.": "दोनों फ़ील्ड में 4 अंकों का PIN डालें।",
  "Finish setup": "सेटअप पूरा करें",
  "This phone's location is shared with your W3ctrl Track account.":
    "इस फ़ोन की लोकेशन आपके W3ctrl Track खाते के साथ साझा की जाती है।",
  // tracker app — background engine (thrown as i18n keys, translated in UI)
  "Location permission is required to track this phone.":
    "इस फ़ोन को ट्रैक करने के लिए लोकेशन अनुमति आवश्यक है।",
  "Background (“Always”) location permission is required for background tracking.":
    "बैकग्राउंड ट्रैकिंग के लिए “हमेशा” लोकेशन अनुमति आवश्यक है।",
  "Set up this phone first.": "पहले इस फ़ोन का सेटअप करें।",
  // tracker app — main screen
  "Just now": "अभी",
  "min ago": "मिनट पहले",
  "hr ago": "घंटे पहले",
  Never: "कभी नहीं",
  Interval: "अंतराल",
  "SOS is available while tracking is on.":
    "ट्रैकिंग चालू होने पर SOS उपलब्ध है।",
  "SOS failed — check your connection and try again.":
    "SOS विफल — अपना कनेक्शन जाँचें और फिर कोशिश करें।",
  // tracker app — PIN / settings
  "Enter PIN to unlock settings.": "सेटिंग्स खोलने के लिए PIN डालें।",
  Back: "वापस",
  Saved: "सहेजा गया",
  "Re-check permissions": "अनुमतियाँ फिर जाँचें",
  "Permissions OK — background tracking allowed.":
    "अनुमतियाँ ठीक हैं — बैकग्राउंड ट्रैकिंग अनुमत है।",
  "Location permission missing.": "लोकेशन अनुमति नहीं मिली।",
  "Reset app": "ऐप रीसेट करें",
  "Tap again to confirm reset": "रीसेट की पुष्टि के लिए फिर टैप करें",
  "This clears all settings and returns to setup.":
    "इससे सभी सेटिंग्स मिट जाएँगी और सेटअप स्क्रीन पर वापस जाएँगे।",
};

type Dict = Record<Lang, Record<string, string>>;
const dict: Dict = { en: {}, hi };

const LangContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}>({ lang: "en", setLang: () => {}, t: (k) => k });

export function LanguageProvider({
  children,
  initial = "en",
  onChange,
}: {
  children: React.ReactNode;
  initial?: Lang;
  onChange?: (l: Lang) => void;
}) {
  const [lang, setLangState] = useState<Lang>(initial);
  const setLang = useCallback(
    (l: Lang) => {
      setLangState(l);
      onChange?.(l);
    },
    [onChange],
  );
  const t = useCallback((key: string) => dict[lang][key] ?? key, [lang]);
  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

/** Translate a key against the active language. */
export function useT(): (key: string) => string {
  return useLang().t;
}
