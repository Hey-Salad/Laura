/*
 * ESP32-S3 Camera with Streaming + Laura Integration
 *
 * This sketch enables:
 * - Live MJPEG video stream on http://YOUR_IP:81/stream
 * - Single snapshot on http://YOUR_IP/capture
 * - Status updates to Laura dashboard
 *
 * SETUP INSTRUCTIONS:
 * 1. Install ESP32 board support in Arduino IDE
 * 2. Install "ESP32" library by Espressif
 * 3. Select board: "ESP32S3 Dev Module"
 * 4. Update WiFi credentials below
 * 5. Update Laura API credentials below
 * 6. Upload to ESP32
 * 7. Open Serial Monitor to see stream URL
 * 8. Configure Laura with your ESP32's IP address
 */

#include "esp_camera.h"
#include "esp_http_server.h"
#include <WiFi.h>
#include <HTTPClient.h>

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================

// WiFi Credentials
const char* WIFI_SSID = "YourWiFiName";
const char* WIFI_PASSWORD = "YourWiFiPassword";

// Laura API Configuration
const char* SUPABASE_URL = "https://ybecdgbzgldafwvzwkpd.supabase.co";
const char* SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliZWNkZ2J6Z2xkYWZ3dnp3a3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcxMDYwMTksImV4cCI6MjA0MjY4MjAxOX0.H4NkweM9hwVUYxpcaeLCQjs1KBXZfGH0dqCKlyx2S-U";
const char* API_CAMERAS_URL = "https://laura.heysalad.app/api/cameras";
const String CAMERA_ID = "CAM001";
const String CAMERA_UUID = "63b6ea55-cdd5-4244-84c4-ed07281ab2e4";

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
httpd_handle_t stream_httpd = NULL;
httpd_handle_t camera_httpd = NULL;
unsigned long lastStatusUpdate = 0;
const unsigned long STATUS_UPDATE_INTERVAL = 30000; // 30 seconds

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
  config.jpeg_quality = 12;  // 0-63, lower = better quality
  config.fb_count = 1;

  // Initialize camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    return false;
  }

  // Adjust camera settings
  sensor_t * s = esp_camera_sensor_get();
  s->set_brightness(s, 0);     // -2 to 2
  s->set_contrast(s, 0);       // -2 to 2
  s->set_saturation(s, 0);     // -2 to 2
  s->set_special_effect(s, 0); // 0 to 6 (0 - No Effect)
  s->set_whitebal(s, 1);       // 0 = disable , 1 = enable
  s->set_awb_gain(s, 1);       // 0 = disable , 1 = enable
  s->set_wb_mode(s, 0);        // 0 to 4
  s->set_exposure_ctrl(s, 1);  // 0 = disable , 1 = enable
  s->set_aec2(s, 0);           // 0 = disable , 1 = enable
  s->set_gain_ctrl(s, 1);      // 0 = disable , 1 = enable
  s->set_agc_gain(s, 0);       // 0 to 30
  s->set_gainceiling(s, (gainceiling_t)0); // 0 to 6
  s->set_bpc(s, 0);            // 0 = disable , 1 = enable
  s->set_wpc(s, 1);            // 0 = disable , 1 = enable
  s->set_raw_gma(s, 1);        // 0 = disable , 1 = enable
  s->set_lenc(s, 1);           // 0 = disable , 1 = enable
  s->set_hmirror(s, 0);        // 0 = disable , 1 = enable
  s->set_vflip(s, 0);          // 0 = disable , 1 = enable
  s->set_dcw(s, 1);            // 0 = disable , 1 = enable
  s->set_colorbar(s, 0);       // 0 = disable , 1 = enable

  Serial.println("Camera initialized successfully");
  return true;
}

// ============================================
// MJPEG STREAM HANDLER
// ============================================
static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t * fb = NULL;
  esp_err_t res = ESP_OK;
  size_t _jpg_buf_len = 0;
  uint8_t * _jpg_buf = NULL;
  char * part_buf[64];

  res = httpd_resp_set_type(req, "multipart/x-mixed-replace;boundary=frame");
  if(res != ESP_OK) {
    return res;
  }

  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  while(true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("Camera capture failed");
      res = ESP_FAIL;
    } else {
      if(fb->format != PIXFORMAT_JPEG) {
        bool jpeg_converted = frame2jpg(fb, 80, &_jpg_buf, &_jpg_buf_len);
        esp_camera_fb_return(fb);
        fb = NULL;
        if(!jpeg_converted) {
          Serial.println("JPEG compression failed");
          res = ESP_FAIL;
        }
      } else {
        _jpg_buf_len = fb->len;
        _jpg_buf = fb->buf;
      }
    }

    if(res == ESP_OK) {
      size_t hlen = snprintf((char *)part_buf, 64,
        "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n",
        _jpg_buf_len);
      res = httpd_resp_send_chunk(req, "--frame\r\n", 8);
    }
    if(res == ESP_OK) {
      res = httpd_resp_send_chunk(req, (const char *)part_buf, strlen((char *)part_buf));
    }
    if(res == ESP_OK) {
      res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
    }
    if(res == ESP_OK) {
      res = httpd_resp_send_chunk(req, "\r\n", 2);
    }

    if(fb) {
      esp_camera_fb_return(fb);
      fb = NULL;
      _jpg_buf = NULL;
    } else if(_jpg_buf) {
      free(_jpg_buf);
      _jpg_buf = NULL;
    }

    if(res != ESP_OK) {
      break;
    }
  }
  return res;
}

// ============================================
// SNAPSHOT/CAPTURE HANDLER
// ============================================
static esp_err_t capture_handler(httpd_req_t *req) {
  camera_fb_t * fb = NULL;
  esp_err_t res = ESP_OK;

  fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    httpd_resp_send_500(req);
    return ESP_FAIL;
  }

  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=capture.jpg");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
  esp_camera_fb_return(fb);

  return res;
}

// ============================================
// START CAMERA WEB SERVER
// ============================================
void startCameraServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;

  // Capture endpoint (single snapshot)
  httpd_uri_t capture_uri = {
    .uri       = "/capture",
    .method    = HTTP_GET,
    .handler   = capture_handler,
    .user_ctx  = NULL
  };

  Serial.printf("Starting camera server on port %d\n", config.server_port);
  if (httpd_start(&camera_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(camera_httpd, &capture_uri);
    Serial.println("Registered /capture handler");
  }

  // Stream endpoint (MJPEG stream)
  config.server_port = 81;
  config.ctrl_port = 32769;

  httpd_uri_t stream_uri = {
    .uri       = "/stream",
    .method    = HTTP_GET,
    .handler   = stream_handler,
    .user_ctx  = NULL
  };

  Serial.printf("Starting stream server on port %d\n", config.server_port);
  if (httpd_start(&stream_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(stream_httpd, &stream_uri);
    Serial.println("Registered /stream handler");
  }
}

// ============================================
// SEND STATUS UPDATE TO LAURA
// ============================================
void sendStatusUpdate() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String statusUrl = String(API_CAMERAS_URL) + "/" + CAMERA_UUID + "/status";

  http.begin(statusUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);

  String ipAddress = WiFi.localIP().toString();
  int rssi = WiFi.RSSI();

  String payload = "{";
  payload += "\"status\":\"online\",";
  payload += "\"battery_level\":100,";
  payload += "\"wifi_signal\":" + String(rssi) + ",";
  payload += "\"location_lat\":52.5219,";
  payload += "\"location_lon\":13.4132,";
  payload += "\"metadata\":{";
  payload += "\"ip_address\":\"" + ipAddress + "\",";
  payload += "\"stream_url\":\"http://" + ipAddress + ":81/stream\",";
  payload += "\"snapshot_url\":\"http://" + ipAddress + "/capture\",";
  payload += "\"location_name\":\"HeySalad Berlin Alexanderplatz\"";
  payload += "}}";

  Serial.println("[Laura] Sending status update...");
  int httpCode = http.POST(payload);

  if (httpCode == 200) {
    Serial.println("[Laura] ✓ Status update successful");
  } else {
    Serial.printf("[Laura] Status update failed. Code: %d\n", httpCode);
  }

  http.end();
}

// ============================================
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n\nESP32-S3 Camera with Streaming");
  Serial.println("================================");

  // Initialize camera
  Serial.println("Initializing camera...");
  if (!initCamera()) {
    Serial.println("Camera initialization failed!");
    return;
  }

  // Connect to WiFi
  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n✓ WiFi connected!");
  Serial.printf("IP Address: %s\n", WiFi.localIP().toString().c_str());
  Serial.printf("Signal: %d dBm\n", WiFi.RSSI());

  // Start camera web server
  Serial.println("\nStarting camera servers...");
  startCameraServer();

  // Print access information
  Serial.println("\n====================================");
  Serial.println("🎥 CAMERA READY!");
  Serial.println("====================================");
  Serial.printf("📷 Snapshot: http://%s/capture\n", WiFi.localIP().toString().c_str());
  Serial.printf("📹 Stream:   http://%s:81/stream\n", WiFi.localIP().toString().c_str());
  Serial.println("====================================");
  Serial.println("\nTest in browser:");
  Serial.printf("  http://%s:81/stream\n\n", WiFi.localIP().toString().c_str());

  // Send initial status to Laura
  delay(2000);
  sendStatusUpdate();
}

// ============================================
// LOOP
// ============================================
void loop() {
  // Send status update every 30 seconds
  unsigned long currentTime = millis();
  if (currentTime - lastStatusUpdate >= STATUS_UPDATE_INTERVAL) {
    sendStatusUpdate();
    lastStatusUpdate = currentTime;
  }

  delay(100);
}
