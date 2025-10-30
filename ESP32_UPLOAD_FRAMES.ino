/*
 * ESP32-S3 Camera with Frame Upload to Laura
 *
 * This approach UPLOADS frames to Laura instead of hosting a local stream.
 * Better for:
 * - Remote access (no port forwarding needed)
 * - Multiple viewers
 * - Recording & analytics
 * - Consistent architecture
 *
 * Architecture:
 * ESP32 captures frame → POST to Laura → Laura stores → Dashboard displays
 *
 * SETUP INSTRUCTIONS:
 * 1. Install ESP32 board support in Arduino IDE
 * 2. Install "ESP32" library by Espressif
 * 3. Select board: "ESP32S3 Dev Module"
 * 4. Update WiFi credentials below
 * 5. Upload to ESP32
 * 6. Open Serial Monitor to see upload status
 * 7. View stream at: https://laura.heysalad.app/cameras
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================

// WiFi Credentials
const char* WIFI_SSID = "YourWiFiName";
const char* WIFI_PASSWORD = "YourWiFiPassword";

// Laura API Configuration
const char* LAURA_API_URL = "https://laura.heysalad.app";
const char* SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliZWNkZ2J6Z2xkYWZ3dnp3a3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcxMDYwMTksImV4cCI6MjA0MjY4MjAxOX0.H4NkweM9hwVUYxpcaeLCQjs1KBXZfGH0dqCKlyx2S-U";
const String CAMERA_UUID = "63b6ea55-cdd5-4244-84c4-ed07281ab2e4";

// Frame Upload Settings
const unsigned long FRAME_INTERVAL = 200;  // Upload every 200ms = 5 FPS
const unsigned long STATUS_UPDATE_INTERVAL = 30000;  // Status every 30s

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
unsigned long frameCount = 0;
unsigned long successCount = 0;
unsigned long errorCount = 0;

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
  config.frame_size = FRAMESIZE_VGA;  // 640x480 - good balance
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.jpeg_quality = 12;  // 0-63, lower = better quality
  config.fb_count = 1;

  // Initialize camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    return false;
  }

  // Adjust camera settings for better quality
  sensor_t * s = esp_camera_sensor_get();
  s->set_brightness(s, 0);     // -2 to 2
  s->set_contrast(s, 0);       // -2 to 2
  s->set_saturation(s, 0);     // -2 to 2
  s->set_whitebal(s, 1);       // enable auto white balance
  s->set_awb_gain(s, 1);       // enable auto white balance gain
  s->set_exposure_ctrl(s, 1);  // enable auto exposure
  s->set_gain_ctrl(s, 1);      // enable auto gain
  s->set_lenc(s, 1);           // enable lens correction
  s->set_hmirror(s, 0);        // disable horizontal mirror
  s->set_vflip(s, 0);          // disable vertical flip

  Serial.println("✓ Camera initialized successfully");
  return true;
}

// ============================================
// UPLOAD FRAME TO LAURA
// ============================================
bool uploadFrame() {
  // Capture frame from camera
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("✗ Camera capture failed");
    return false;
  }

  // Prepare HTTP client
  HTTPClient http;
  String frameUrl = String(LAURA_API_URL) + "/api/cameras/" + CAMERA_UUID + "/frame";

  http.begin(frameUrl);
  http.addHeader("Content-Type", "image/jpeg");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.setTimeout(5000);  // 5 second timeout

  // Upload frame (raw JPEG binary)
  int httpCode = http.POST(fb->buf, fb->len);

  // Release frame buffer
  size_t frameSize = fb->len;
  esp_camera_fb_return(fb);

  // Check response
  bool success = (httpCode == 200);

  if (success) {
    successCount++;
    if (frameCount % 25 == 0) {  // Print every 25 frames (every 5 seconds at 5 FPS)
      Serial.printf("✓ Frame #%lu uploaded | Size: %d KB | Success rate: %.1f%%\n",
        frameCount, frameSize / 1024,
        (successCount * 100.0) / frameCount);
    }
  } else {
    errorCount++;
    Serial.printf("✗ Upload failed | HTTP: %d | Frame: %lu\n", httpCode, frameCount);
    if (httpCode > 0) {
      String response = http.getString();
      Serial.println("Response: " + response);
    }
  }

  http.end();
  frameCount++;

  return success;
}

// ============================================
// SEND STATUS UPDATE TO LAURA
// ============================================
void sendStatusUpdate() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String statusUrl = String(LAURA_API_URL) + "/api/cameras/" + CAMERA_UUID + "/status";

  http.begin(statusUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);

  int rssi = WiFi.RSSI();
  float fps = (frameCount > 0) ? (1000.0 / FRAME_INTERVAL) : 0;
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
  payload += "\"target_fps\":" + String(fps, 1) + ",";
  payload += "\"location_name\":\"HeySalad Berlin Alexanderplatz\"";
  payload += "}}";

  int httpCode = http.POST(payload);

  if (httpCode == 200) {
    Serial.println("[Status] ✓ Update sent successfully");
  } else {
    Serial.printf("[Status] ✗ Update failed: %d\n", httpCode);
  }

  http.end();
}

// ============================================
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n╔════════════════════════════════════════╗");
  Serial.println("║  ESP32-S3 Camera → Laura Streaming  ║");
  Serial.println("╚════════════════════════════════════════╝\n");

  // Initialize camera
  Serial.println("Initializing camera...");
  if (!initCamera()) {
    Serial.println("✗ Camera initialization failed!");
    Serial.println("System halted.");
    while (1) { delay(1000); }
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
    Serial.println("System halted.");
    while (1) { delay(1000); }
  }

  Serial.println("\n✓ WiFi connected!");
  Serial.printf("IP Address: %s\n", WiFi.localIP().toString().c_str());
  Serial.printf("Signal: %d dBm\n", WiFi.RSSI());

  // Send initial status
  Serial.println("\nSending initial status...");
  delay(1000);
  sendStatusUpdate();

  // Print streaming info
  Serial.println("\n╔════════════════════════════════════════╗");
  Serial.println("║           🎥 STREAMING ACTIVE          ║");
  Serial.println("╚════════════════════════════════════════╝");
  Serial.printf("Upload Rate: %d FPS (every %lums)\n", 1000 / FRAME_INTERVAL, FRAME_INTERVAL);
  Serial.printf("View stream: %s/cameras\n", LAURA_API_URL);
  Serial.println("\nUploading frames...\n");
}

// ============================================
// LOOP
// ============================================
void loop() {
  unsigned long currentTime = millis();

  // Upload frame at specified interval
  if (currentTime - lastFrameUpload >= FRAME_INTERVAL) {
    if (WiFi.status() == WL_CONNECTED) {
      uploadFrame();
    } else {
      Serial.println("✗ WiFi disconnected, reconnecting...");
      WiFi.reconnect();
    }
    lastFrameUpload = currentTime;
  }

  // Send status update every 30 seconds
  if (currentTime - lastStatusUpdate >= STATUS_UPDATE_INTERVAL) {
    sendStatusUpdate();
    lastStatusUpdate = currentTime;
  }

  // Small delay to prevent watchdog issues
  delay(10);
}
