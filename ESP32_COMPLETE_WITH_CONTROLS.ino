/*
 * ESP32-S3 AI Camera - Complete with LED, Sound, and Command Handling
 *
 * Features:
 * - Frame upload to Laura (5 FPS)
 * - LED/Night vision control
 * - Buzzer/sound playback
 * - Command polling and execution
 * - Photo capture and save
 * - Status updates
 *
 * Hardware Setup:
 * - ESP32-S3 with OV2640 camera
 * - LED on GPIO 4 (built-in flash)
 * - Buzzer on GPIO 2 (optional)
 *
 * SETUP INSTRUCTIONS:
 * 1. Update WiFi credentials below
 * 2. Upload to ESP32-S3
 * 3. Open Serial Monitor (115200 baud)
 * 4. Control from: https://laura.heysalad.app/cameras
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ============================================
// CONFIGURATION
// ============================================

// WiFi
const char* WIFI_SSID = "YourWiFiName";
const char* WIFI_PASSWORD = "YourWiFiPassword";

// Laura API
const char* LAURA_API_URL = "https://laura.heysalad.app";
const char* SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliZWNkZ2J6Z2xkYWZ3dnp3a3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcxMDYwMTksImV4cCI6MjA0MjY4MjAxOX0.H4NkweM9hwVUYxpcaeLCQjs1KBXZfGH0dqCKlyx2S-U";
const String CAMERA_ID = "CAM001";
const String CAMERA_UUID = "63b6ea55-cdd5-4244-84c4-ed07281ab2e4";

// Intervals (milliseconds)
const unsigned long FRAME_INTERVAL = 200;         // 5 FPS
const unsigned long STATUS_INTERVAL = 30000;      // 30 seconds
const unsigned long COMMAND_POLL_INTERVAL = 2000; // 2 seconds

// GPIO Pins
#define LED_PIN 4        // Flash LED (built-in on most ESP32-CAM)
#define BUZZER_PIN 2     // Buzzer (optional)

// ============================================
// CAMERA PIN CONFIGURATION (ESP32-S3)
// ============================================
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

// ============================================
// GLOBAL VARIABLES
// ============================================
unsigned long lastFrameUpload = 0;
unsigned long lastStatusUpdate = 0;
unsigned long lastCommandPoll = 0;
unsigned long frameCount = 0;
unsigned long successCount = 0;
bool ledState = false;

// ============================================
// CAMERA INITIALIZATION
// ============================================
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
  config.frame_size = FRAMESIZE_VGA;  // 640x480
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.jpeg_quality = 12;
  config.fb_count = 1;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed: 0x%x\n", err);
    return false;
  }

  sensor_t * s = esp_camera_sensor_get();
  s->set_brightness(s, 0);
  s->set_contrast(s, 0);
  s->set_saturation(s, 0);
  s->set_whitebal(s, 1);
  s->set_awb_gain(s, 1);
  s->set_exposure_ctrl(s, 1);
  s->set_gain_ctrl(s, 1);
  s->set_lenc(s, 1);

  Serial.println("✓ Camera initialized");
  return true;
}

// ============================================
// LED CONTROL
// ============================================
void ledOn() {
  digitalWrite(LED_PIN, HIGH);
  ledState = true;
  Serial.println("[LED] ON (Night vision enabled)");
}

void ledOff() {
  digitalWrite(LED_PIN, LOW);
  ledState = false;
  Serial.println("[LED] OFF");
}

void toggleLed() {
  if (ledState) {
    ledOff();
  } else {
    ledOn();
  }
}

// ============================================
// BUZZER/SOUND CONTROL
// ============================================
void playSound(int duration = 500, int frequency = 2000) {
  Serial.printf("[Sound] Playing %dHz for %dms\n", frequency, duration);

  // Play tone on buzzer
  tone(BUZZER_PIN, frequency, duration);
  delay(duration);
  noTone(BUZZER_PIN);

  Serial.println("[Sound] Done");
}

void playBeep() {
  playSound(200, 2000);  // Short beep
}

void playSuccess() {
  playSound(100, 1000);
  delay(50);
  playSound(100, 1500);
}

void playError() {
  playSound(200, 500);
  delay(100);
  playSound(200, 500);
}

// ============================================
// UPLOAD FRAME TO LAURA
// ============================================
bool uploadFrame() {
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("✗ Camera capture failed");
    return false;
  }

  HTTPClient http;
  String frameUrl = String(LAURA_API_URL) + "/api/cameras/" + CAMERA_UUID + "/frame";

  http.begin(frameUrl);
  http.addHeader("Content-Type", "image/jpeg");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.setTimeout(5000);

  int httpCode = http.POST(fb->buf, fb->len);
  size_t frameSize = fb->len;
  esp_camera_fb_return(fb);

  bool success = (httpCode == 200);
  if (success) {
    successCount++;
    if (frameCount % 25 == 0) {
      Serial.printf("✓ Frame #%lu | %d KB | Success: %.1f%%\n",
        frameCount, frameSize / 1024,
        (successCount * 100.0) / frameCount);
    }
  } else {
    Serial.printf("✗ Upload failed: HTTP %d\n", httpCode);
  }

  http.end();
  frameCount++;
  return success;
}

// ============================================
// STATUS UPDATE
// ============================================
void sendStatusUpdate() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String statusUrl = String(LAURA_API_URL) + "/api/cameras/" + CAMERA_UUID + "/status";

  http.begin(statusUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);

  int rssi = WiFi.RSSI();
  float successRate = (frameCount > 0) ? (successCount * 100.0) / frameCount : 0;

  String payload = "{";
  payload += "\"status\":\"online\",";
  payload += "\"battery_level\":100,";
  payload += "\"wifi_signal\":" + String(rssi) + ",";
  payload += "\"location_lat\":52.5219,";
  payload += "\"location_lon\":13.4132,";
  payload += "\"metadata\":{";
  payload += "\"frames_uploaded\":" + String(frameCount) + ",";
  payload += "\"upload_success_rate\":" + String(successRate, 1) + ",";
  payload += "\"led_state\":\"" + String(ledState ? "on" : "off") + "\",";
  payload += "\"location_name\":\"HeySalad Berlin Alexanderplatz\"";
  payload += "}}";

  int httpCode = http.POST(payload);

  if (httpCode == 200) {
    Serial.println("[Status] ✓ Updated");
  } else {
    Serial.printf("[Status] ✗ Failed: %d\n", httpCode);
  }

  http.end();
}

// ============================================
// COMMAND POLLING & EXECUTION
// ============================================
void pollCommands() {
  HTTPClient http;
  String commandUrl = String(LAURA_API_URL) + "/api/cameras/" + CAMERA_UUID + "/command";

  http.begin(commandUrl);
  http.addHeader("apikey", SUPABASE_ANON_KEY);

  int httpCode = http.GET();

  if (httpCode == 200) {
    String response = http.getString();

    // Parse JSON response
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, response);

    if (doc.containsKey("command")) {
      String commandId = doc["id"].as<String>();
      String commandType = doc["command_type"].as<String>();

      Serial.printf("\n[Command] Received: %s (ID: %s)\n", commandType.c_str(), commandId.c_str());

      // Execute command
      executeCommand(commandType, commandId, doc["command_payload"]);
    }
  }

  http.end();
}

void executeCommand(String commandType, String commandId, JsonObject payload) {
  bool success = false;
  String message = "";

  // LED Commands
  if (commandType == "led_on") {
    ledOn();
    success = true;
    message = "LED turned ON";
  }
  else if (commandType == "led_off") {
    ledOff();
    success = true;
    message = "LED turned OFF";
  }
  else if (commandType == "toggle_led") {
    toggleLed();
    success = true;
    message = ledState ? "LED turned ON" : "LED turned OFF";
  }

  // Sound Commands
  else if (commandType == "play_sound") {
    int duration = payload.containsKey("duration") ? payload["duration"].as<int>() : 500;
    int frequency = payload.containsKey("frequency") ? payload["frequency"].as<int>() : 2000;
    playSound(duration, frequency);
    success = true;
    message = "Sound played";
  }

  // Photo Commands
  else if (commandType == "take_photo") {
    Serial.println("[Command] Taking photo...");
    if (uploadFrame()) {
      playSuccess();
      success = true;
      message = "Photo captured and uploaded";
    } else {
      playError();
      success = false;
      message = "Photo capture failed";
    }
  }

  // Status Command
  else if (commandType == "get_status") {
    sendStatusUpdate();
    success = true;
    message = "Status sent";
  }

  // Reboot Command
  else if (commandType == "reboot") {
    Serial.println("[Command] Rebooting in 2 seconds...");
    respondToCommand(commandId, true, "Rebooting device");
    delay(2000);
    ESP.restart();
  }

  // Unknown Command
  else {
    Serial.printf("[Command] Unknown: %s\n", commandType.c_str());
    success = false;
    message = "Unknown command";
  }

  // Send response
  respondToCommand(commandId, success, message);
}

void respondToCommand(String commandId, bool success, String message) {
  HTTPClient http;
  String responseUrl = String(LAURA_API_URL) + "/api/cameras/" + CAMERA_UUID + "/command/" + commandId;

  http.begin(responseUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);

  String payload = "{";
  payload += "\"status\":\"" + String(success ? "completed" : "failed") + "\",";
  payload += "\"response\":{";
  payload += "\"message\":\"" + message + "\",";
  payload += "\"timestamp\":\"" + String(millis()) + "\"";
  payload += "}}";

  int httpCode = http.POST(payload);

  if (httpCode == 200) {
    Serial.printf("[Command] ✓ Response sent: %s\n", message.c_str());
  } else {
    Serial.printf("[Command] ✗ Response failed: %d\n", httpCode);
  }

  http.end();
}

// ============================================
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n╔═══════════════════════════════════════════╗");
  Serial.println("║  ESP32-S3 AI Camera - Full Control      ║");
  Serial.println("╚═══════════════════════════════════════════╝\n");

  // Initialize GPIO
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  ledOff();

  // Initialize camera
  Serial.println("Initializing camera...");
  if (!initCamera()) {
    Serial.println("✗ Camera init failed!");
    while (1) {
      playError();
      delay(5000);
    }
  }

  // Connect to WiFi
  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n✗ WiFi connection failed!");
    while (1) {
      playError();
      delay(5000);
    }
  }

  Serial.println("\n✓ WiFi connected!");
  Serial.printf("IP: %s | Signal: %d dBm\n",
    WiFi.localIP().toString().c_str(), WiFi.RSSI());

  // Success beeps
  playSuccess();
  delay(200);
  playSuccess();

  // Send initial status
  Serial.println("\nSending initial status...");
  sendStatusUpdate();

  // Ready
  Serial.println("\n╔═══════════════════════════════════════════╗");
  Serial.println("║           🎥 READY TO STREAM             ║");
  Serial.println("╚═══════════════════════════════════════════╝");
  Serial.printf("Frame Rate: 5 FPS\n");
  Serial.printf("Command Poll: Every 2s\n");
  Serial.printf("View: %s/cameras\n\n", LAURA_API_URL);
}

// ============================================
// MAIN LOOP
// ============================================
void loop() {
  unsigned long now = millis();

  // Upload frame
  if (now - lastFrameUpload >= FRAME_INTERVAL) {
    if (WiFi.status() == WL_CONNECTED) {
      uploadFrame();
    } else {
      Serial.println("✗ WiFi disconnected, reconnecting...");
      WiFi.reconnect();
    }
    lastFrameUpload = now;
  }

  // Send status update
  if (now - lastStatusUpdate >= STATUS_INTERVAL) {
    sendStatusUpdate();
    lastStatusUpdate = now;
  }

  // Poll for commands
  if (now - lastCommandPoll >= COMMAND_POLL_INTERVAL) {
    pollCommands();
    lastCommandPoll = now;
  }

  delay(10);
}
