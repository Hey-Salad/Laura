/*
 * HeySalad Laura - ESP32-S3 AI Camera
 *
 * Full Arduino sketch for remote camera control via Supabase Realtime
 *
 * Required Libraries (install via Arduino Library Manager):
 * - ArduinoWebsockets by Gil Maimon
 * - ArduinoJson by Benoit Blanchon
 * - HTTPClient (built-in with ESP32)
 *
 * Hardware:
 * - ESP32-S3 with OV2640 camera module
 * - Seeed XIAO ESP32S3 Sense or similar
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include "esp_camera.h"
#include "ESP32_CONFIG.h"

using namespace websockets;

// ============================================================================
// Global Variables
// ============================================================================
WebsocketsClient wsClient;
String cameraUUID = "";  // Will be fetched from database on startup
bool cameraOnline = false;
unsigned long lastStatusUpdate = 0;

// ============================================================================
// Camera Pin Configuration (XIAO ESP32S3 Sense)
// Adjust these for your specific ESP32-S3 board
// ============================================================================
#define PWDN_GPIO_NUM     -1
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM     10
#define SIOD_GPIO_NUM     40
#define SIOC_GPIO_NUM     39
#define Y9_GPIO_NUM       48
#define Y8_GPIO_NUM       11
#define Y7_GPIO_NUM       12
#define Y6_GPIO_NUM       14
#define Y5_GPIO_NUM       16
#define Y4_GPIO_NUM       18
#define Y3_GPIO_NUM       17
#define Y2_GPIO_NUM       15
#define VSYNC_GPIO_NUM    38
#define HREF_GPIO_NUM     47
#define PCLK_GPIO_NUM     13

// ============================================================================
// Setup Functions
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n========================================");
  Serial.println("HeySalad Laura - ESP32-S3 AI Camera");
  Serial.println("========================================\n");

  // Initialize camera
  if (!initCamera()) {
    Serial.println("❌ Camera initialization failed!");
    return;
  }
  Serial.println("✓ Camera initialized");

  // Connect to WiFi
  if (!connectWiFi()) {
    Serial.println("❌ WiFi connection failed!");
    return;
  }
  Serial.println("✓ WiFi connected");

  // Register camera and get UUID
  if (!registerCamera()) {
    Serial.println("❌ Camera registration failed!");
    return;
  }
  Serial.println("✓ Camera registered with UUID: " + cameraUUID);

  // Connect to Supabase Realtime
  if (!connectRealtimeWebSocket()) {
    Serial.println("❌ WebSocket connection failed!");
    return;
  }
  Serial.println("✓ WebSocket connected");

  cameraOnline = true;
  Serial.println("\n🎉 Camera is ONLINE and ready!\n");

  // Send initial status update
  sendStatusUpdate("online");
}

void loop() {
  // Keep WebSocket connection alive
  if (wsClient.available()) {
    wsClient.poll();
  } else {
    Serial.println("⚠️  WebSocket disconnected, reconnecting...");
    connectRealtimeWebSocket();
  }

  // Send periodic status updates
  if (millis() - lastStatusUpdate > STATUS_UPDATE_INTERVAL) {
    sendStatusUpdate("online");
    lastStatusUpdate = millis();
  }

  delay(100);
}

// ============================================================================
// WiFi Functions
// ============================================================================

bool connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    return true;
  }

  return false;
}

// ============================================================================
// Camera Functions
// ============================================================================

bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.frame_size = FRAMESIZE_UXGA; // 1600x1200
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_LATEST;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.jpeg_quality = PHOTO_QUALITY;
  config.fb_count = 1;

  // Initialize camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    return false;
  }

  return true;
}

camera_fb_t* capturePhoto() {
  Serial.println("📸 Capturing photo...");
  camera_fb_t* fb = esp_camera_fb_get();

  if (!fb) {
    Serial.println("❌ Camera capture failed");
    return nullptr;
  }

  Serial.printf("✓ Photo captured: %d bytes\n", fb->len);
  return fb;
}

// ============================================================================
// API Functions
// ============================================================================

bool registerCamera() {
  HTTPClient http;
  http.begin(API_CAMERAS);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);

  // Create JSON payload
  StaticJsonDocument<512> doc;
  doc["camera_id"] = CAMERA_ID;
  doc["camera_name"] = CAMERA_NAME;
  doc["device_type"] = DEVICE_TYPE;
  doc["firmware_version"] = FIRMWARE_VERSION;

  String payload;
  serializeJson(doc, payload);

  Serial.println("Registering camera...");
  int httpCode = http.POST(payload);

  if (httpCode == 201 || httpCode == 200) {
    String response = http.getString();
    Serial.println("Registration response: " + response);

    // Parse response to get UUID
    DynamicJsonDocument responseDoc(1024);
    deserializeJson(responseDoc, response);
    cameraUUID = responseDoc["camera"]["id"].as<String>();

    http.end();
    return true;
  } else if (httpCode == 500) {
    // Camera might already exist, try to get it
    Serial.println("Camera might already exist, fetching...");
    http.end();
    return fetchCameraUUID();
  }

  Serial.printf("Registration failed: %d\n", httpCode);
  http.end();
  return false;
}

bool fetchCameraUUID() {
  HTTPClient http;
  String url = String(API_CAMERAS) + "?camera_id=" + String(CAMERA_ID);
  http.begin(url);
  http.addHeader("apikey", SUPABASE_ANON_KEY);

  int httpCode = http.GET();

  if (httpCode == 200) {
    String response = http.getString();
    DynamicJsonDocument doc(2048);
    deserializeJson(doc, response);

    if (doc["cameras"].size() > 0) {
      cameraUUID = doc["cameras"][0]["id"].as<String>();
      http.end();
      return true;
    }
  }

  http.end();
  return false;
}

String uploadPhotoToStorage(camera_fb_t* fb) {
  if (!fb) return "";

  HTTPClient http;
  String path = getStoragePath();
  String url = STORAGE_UPLOAD_URL + path;

  Serial.println("Uploading photo to: " + url);

  http.begin(url);
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("Content-Type", "image/jpeg");

  int httpCode = http.POST(fb->buf, fb->len);

  if (httpCode == 200 || httpCode == 201) {
    Serial.println("✓ Photo uploaded successfully");
    http.end();

    // Return public URL
    return String(SUPABASE_URL) + "/storage/v1/object/public/" + STORAGE_BUCKET + "/" + path;
  }

  Serial.printf("❌ Upload failed: %d\n", httpCode);
  Serial.println(http.getString());
  http.end();
  return "";
}

bool reportPhotoToAPI(String photoUrl, String commandId) {
  HTTPClient http;
  String endpoint = getPhotosEndpoint(cameraUUID);
  http.begin(endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);

  StaticJsonDocument<512> doc;
  doc["photo_url"] = photoUrl;
  doc["command_id"] = commandId;

  JsonObject metadata = doc.createNestedObject("metadata");
  metadata["size_kb"] = 0; // Calculate if needed

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);
  http.end();

  return (httpCode == 200 || httpCode == 201);
}

// ============================================================================
// WebSocket Functions
// ============================================================================

bool connectRealtimeWebSocket() {
  String wsUrl = String(SUPABASE_REALTIME_URL) + "?apikey=" + String(SUPABASE_ANON_KEY) + "&vsn=1.0.0";

  Serial.println("Connecting to WebSocket...");
  Serial.println(wsUrl);

  wsClient.onMessage(onWebSocketMessage);
  wsClient.onEvent(onWebSocketEvent);

  bool connected = wsClient.connect(wsUrl);

  if (connected) {
    // Join the camera channel
    joinRealtimeChannel();
    return true;
  }

  return false;
}

void joinRealtimeChannel() {
  String channelName = getRealtimeChannelName();

  StaticJsonDocument<512> doc;
  doc["topic"] = channelName;
  doc["event"] = "phx_join";
  doc["payload"] = JsonObject();
  doc["ref"] = "1";

  String message;
  serializeJson(doc, message);

  Serial.println("Joining channel: " + channelName);
  wsClient.send(message);
}

void onWebSocketMessage(WebsocketsMessage message) {
  Serial.println("📩 Received: " + message.data());

  DynamicJsonDocument doc(2048);
  deserializeJson(doc, message.data());

  String event = doc["event"].as<String>();

  if (event == "broadcast") {
    JsonObject payload = doc["payload"];
    String type = payload["type"].as<String>();

    if (type == "command") {
      handleCommand(payload);
    }
  } else if (event == "phx_reply") {
    Serial.println("✓ Channel joined successfully");
  }
}

void onWebSocketEvent(WebsocketsEvent event, String data) {
  if (event == WebsocketsEvent::ConnectionOpened) {
    Serial.println("✓ WebSocket connected");
  } else if (event == WebsocketsEvent::ConnectionClosed) {
    Serial.println("⚠️  WebSocket disconnected");
    cameraOnline = false;
  } else if (event == WebsocketsEvent::GotPing) {
    Serial.println("💓 Got ping");
  }
}

// ============================================================================
// Command Handlers
// ============================================================================

void handleCommand(JsonObject payload) {
  String command = payload["command"].as<String>();
  String commandId = payload["command_id"].as<String>();

  Serial.println("🎯 Command received: " + command);
  Serial.println("   Command ID: " + commandId);

  if (command == "take_photo") {
    handleTakePhoto(commandId);
  } else if (command == "get_status") {
    sendStatusUpdate("online");
  } else if (command == "reboot") {
    Serial.println("🔄 Rebooting...");
    ESP.restart();
  } else {
    Serial.println("❌ Unknown command: " + command);
  }
}

void handleTakePhoto(String commandId) {
  Serial.println("📸 Taking photo for command: " + commandId);

  sendStatusUpdate("busy");

  // Capture photo
  camera_fb_t* fb = capturePhoto();
  if (!fb) {
    sendStatusUpdate("error");
    return;
  }

  // Upload to storage
  String photoUrl = uploadPhotoToStorage(fb);

  // Free framebuffer
  esp_camera_fb_return(fb);

  if (photoUrl.length() > 0) {
    // Report to API
    if (reportPhotoToAPI(photoUrl, commandId)) {
      Serial.println("✓ Photo reported to Laura");

      // Broadcast photo notification
      broadcastPhotoNotification(photoUrl, commandId);
    }
  }

  sendStatusUpdate("online");
}

// ============================================================================
// Status & Notification Functions
// ============================================================================

void sendStatusUpdate(String status) {
  StaticJsonDocument<1024> doc;
  doc["topic"] = getRealtimeChannelName();
  doc["event"] = "broadcast";
  doc["ref"] = String(millis());

  JsonObject payload = doc.createNestedObject("payload");
  payload["type"] = "status";
  payload["event"] = "status";

  JsonObject innerPayload = payload.createNestedObject("payload");
  innerPayload["type"] = "status";
  innerPayload["camera_id"] = CAMERA_ID;
  innerPayload["timestamp"] = getTimestamp();

  JsonObject data = innerPayload.createNestedObject("data");
  data["battery_level"] = getBatteryLevel();
  data["wifi_signal"] = WiFi.RSSI();
  data["status"] = status;
  data["free_heap"] = ESP.getFreeHeap();

  String message;
  serializeJson(doc, message);

  wsClient.send(message);
  Serial.println("📊 Status update sent: " + status);
}

void broadcastPhotoNotification(String photoUrl, String commandId) {
  StaticJsonDocument<1024> doc;
  doc["topic"] = getRealtimeChannelName();
  doc["event"] = "broadcast";
  doc["ref"] = String(millis());

  JsonObject payload = doc.createNestedObject("payload");
  payload["type"] = "photo";
  payload["event"] = "photo";

  JsonObject innerPayload = payload.createNestedObject("payload");
  innerPayload["type"] = "photo";
  innerPayload["command_id"] = commandId;
  innerPayload["timestamp"] = getTimestamp();

  JsonObject data = innerPayload.createNestedObject("data");
  data["photo_url"] = photoUrl;

  String message;
  serializeJson(doc, message);

  wsClient.send(message);
  Serial.println("📸 Photo notification sent");
}

// ============================================================================
// Helper Functions
// ============================================================================

String getTimestamp() {
  // Simple timestamp - in production, use NTP for real timestamps
  return String(millis());
}

int getBatteryLevel() {
  // TODO: Read actual battery voltage if connected
  // For now, return dummy value
  return 85;
}
