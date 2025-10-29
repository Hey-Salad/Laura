/*
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  HEYSALAD LAURA - ESP32 CAMERA                                   ║
 * ║  COPY THIS TO TOP OF YOUR ARDUINO SKETCH                         ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// ============================================================================
// 🔧 YOUR WIFI - UPDATE THESE TWO LINES
// ============================================================================
const char* WIFI_SSID = "YOUR_WIFI_NAME";           // ← CHANGE THIS
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";   // ← CHANGE THIS

// ============================================================================
// 📡 SUPABASE - READY TO USE (Don't change)
// ============================================================================
const char* SUPABASE_URL = "https://ybecdgbzgldafwvzwkpd.supabase.co";
const char* SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliZWNkZ2J6Z2xkYWZ3dnp3a3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcxMDYwMTksImV4cCI6MjA0MjY4MjAxOX0.H4NkweM9hwVUYxpcaeLCQjs1KBXZfGH0dqCKlyx2S-U";
const char* WEBSOCKET_URL = "wss://ybecdgbzgldafwvzwkpd.supabase.co/realtime/v1/websocket";

// ============================================================================
// 📷 CAMERA - USE CAM001 FOR FIRST TEST (Don't change)
// ============================================================================
const char* CAMERA_ID = "CAM001";
const char* CAMERA_UUID = "63b6ea55-cdd5-4244-84c4-ed07281ab2e4";

// ============================================================================
// 🌐 LAURA API - READY TO USE (Don't change)
// ============================================================================
const char* API_BASE = "https://laura.heysalad.app/api";
const char* STORAGE_BASE = "https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object";

// ============================================================================
// ✅ THAT'S IT! The rest of your HTML/Arduino code goes below
// ============================================================================

void setup() {
  Serial.begin(115200);
  Serial.println("\n\nHeySalad Camera Starting...");

  // 1. Connect WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✓ WiFi Connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  // 2. Your camera setup code here...
  // initCamera();

  // 3. Connect to WebSocket
  // String wsUrl = String(WEBSOCKET_URL) + "?apikey=" + String(SUPABASE_KEY) + "&vsn=1.0.0";
  // webSocket.begin(wsUrl);

  Serial.println("\n🎉 Ready! View at https://laura.heysalad.app/cameras");
}

void loop() {
  // Your code here
}

// ============================================================================
// 📸 EXAMPLE: Upload Photo to Laura
// ============================================================================
void uploadPhoto(uint8_t* photoData, size_t photoSize) {
  // 1. Upload to Supabase Storage
  String path = String(CAMERA_ID) + "/" + String(millis()) + ".jpg";
  String uploadUrl = String(STORAGE_BASE) + "/camera-photos/" + path;

  HTTPClient http;
  http.begin(uploadUrl);
  http.addHeader("Content-Type", "image/jpeg");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);

  int httpCode = http.POST(photoData, photoSize);
  http.end();

  if (httpCode == 200) {
    // 2. Register in database
    String photoUrl = String(STORAGE_BASE) + "/public/camera-photos/" + path;
    String apiUrl = String(API_BASE) + "/cameras/" + String(CAMERA_UUID) + "/photos";

    http.begin(apiUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", SUPABASE_KEY);

    String json = "{\"photo_url\":\"" + photoUrl + "\"}";
    httpCode = http.POST(json);
    http.end();

    if (httpCode == 201) {
      Serial.println("✓ Photo uploaded to Laura!");
    }
  }
}

// ============================================================================
// 🔌 EXAMPLE: WebSocket Status Update
// ============================================================================
void sendStatus() {
  String message = "{"
    "\"topic\":\"camera-" + String(CAMERA_ID) + "\","
    "\"event\":\"broadcast\","
    "\"ref\":\"" + String(millis()) + "\","
    "\"payload\":{"
      "\"type\":\"broadcast\","
      "\"event\":\"status\","
      "\"payload\":{"
        "\"type\":\"status\","
        "\"camera_id\":\"" + String(CAMERA_ID) + "\","
        "\"timestamp\":\"" + getTimestamp() + "\","
        "\"data\":{"
          "\"battery_level\":85,"
          "\"wifi_signal\":" + String(WiFi.RSSI()) + ","
          "\"status\":\"online\""
        "}"
      "}"
    "}"
  "}";

  // webSocket.sendTXT(message);
  Serial.println("📊 Status sent");
}

// ============================================================================
// 🎯 QUICK REFERENCE
// ============================================================================
/*

YOUR ENDPOINTS:
  Register:     POST https://laura.heysalad.app/api/cameras
  Upload Photo: POST https://laura.heysalad.app/api/cameras/{uuid}/photos
  Storage:      POST https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object/camera-photos/{path}

WEBSOCKET:
  URL:          wss://ybecdgbzgldafwvzwkpd.supabase.co/realtime/v1/websocket?apikey={key}&vsn=1.0.0
  Channel:      camera-CAM001

VIEW DASHBOARD:
  https://laura.heysalad.app/cameras

COMMANDS YOU'LL RECEIVE:
  • take_photo    - Capture and upload photo
  • start_video   - Start recording
  • stop_video    - Stop recording
  • get_status    - Send current status
  • reboot        - Restart ESP32

*/
