# ESP32 Camera Streaming Setup Guide

## How It Works

```
┌─────────────┐                    ┌──────────────────┐
│   ESP32     │ <── Fetches ───    │  Laura Dashboard │
│  (Server)   │     Stream         │    (Client)      │
│             │                    │                  │
│ Stream URL: │                    │ Displays stream  │
│ 192.168.x.x │                    │ in browser       │
└─────────────┘                    └──────────────────┘
```

The ESP32 hosts a web server that serves:
- `/stream` - Live MJPEG video stream
- `/capture` - Single snapshot image

Laura's dashboard connects to your ESP32's IP address to fetch and display the stream.

---

## Step 1: Add Streaming Code to Your ESP32

### Option A: If you're using ESP32-CAM library

Add this to your Arduino sketch:

```cpp
#include "esp_camera.h"
#include "esp_http_server.h"

// Global variables
httpd_handle_t stream_httpd = NULL;
httpd_handle_t camera_httpd = NULL;

// MJPEG Stream Handler
static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t * fb = NULL;
  esp_err_t res = ESP_OK;
  size_t _jpg_buf_len = 0;
  uint8_t * _jpg_buf = NULL;
  char * part_buf[64];

  res = httpd_resp_set_type(req, "multipart/x-mixed-replace;boundary=frame");
  if(res != ESP_OK){
    return res;
  }

  while(true){
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("Camera capture failed");
      res = ESP_FAIL;
    } else {
      if(fb->format != PIXFORMAT_JPEG){
        bool jpeg_converted = frame2jpg(fb, 80, &_jpg_buf, &_jpg_buf_len);
        esp_camera_fb_return(fb);
        fb = NULL;
        if(!jpeg_converted){
          Serial.println("JPEG compression failed");
          res = ESP_FAIL;
        }
      } else {
        _jpg_buf_len = fb->len;
        _jpg_buf = fb->buf;
      }
    }
    if(res == ESP_OK){
      size_t hlen = snprintf((char *)part_buf, 64,
        "--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n",
        _jpg_buf_len);
      res = httpd_resp_send_chunk(req, (const char *)part_buf, hlen);
    }
    if(res == ESP_OK){
      res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
    }
    if(res == ESP_OK){
      res = httpd_resp_send_chunk(req, "\r\n", 2);
    }
    if(fb){
      esp_camera_fb_return(fb);
      fb = NULL;
      _jpg_buf = NULL;
    } else if(_jpg_buf){
      free(_jpg_buf);
      _jpg_buf = NULL;
    }
    if(res != ESP_OK){
      break;
    }
  }
  return res;
}

// Snapshot/Capture Handler
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

// Start Camera Web Server
void startCameraServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;

  httpd_uri_t capture_uri = {
    .uri       = "/capture",
    .method    = HTTP_GET,
    .handler   = capture_handler,
    .user_ctx  = NULL
  };

  httpd_uri_t stream_uri = {
    .uri       = "/stream",
    .method    = HTTP_GET,
    .handler   = stream_handler,
    .user_ctx  = NULL
  };

  Serial.printf("Starting camera server on port %d\n", config.server_port);

  if (httpd_start(&camera_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(camera_httpd, &capture_uri);
  }

  config.server_port += 1;  // Port 81 for stream
  config.ctrl_port += 1;

  if (httpd_start(&stream_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(stream_httpd, &stream_uri);
  }
}

void setup() {
  Serial.begin(115200);

  // Initialize camera (your existing camera init code)
  // ...

  // Connect to WiFi (your existing WiFi code)
  // ...

  // Start the camera server
  startCameraServer();

  // Print access URLs
  Serial.println("\n====================================");
  Serial.println("Camera Stream Ready!");
  Serial.printf("Stream URL:   http://%s:81/stream\n", WiFi.localIP().toString().c_str());
  Serial.printf("Snapshot URL: http://%s/capture\n", WiFi.localIP().toString().c_str());
  Serial.println("====================================\n");
}
```

---

## Step 2: Flash ESP32 and Get Its IP Address

1. **Upload the code** to your ESP32
2. **Open Serial Monitor** (115200 baud)
3. **Look for output** like this:

```
Camera Stream Ready!
Stream URL:   http://192.168.1.100:81/stream
Snapshot URL: http://192.168.1.100/capture
```

4. **Write down the IP address** (e.g., `192.168.1.100`)

---

## Step 3: Test the Stream in Your Browser

Before configuring Laura, test that streaming works:

1. Open your browser
2. Go to: `http://192.168.1.100:81/stream` (use your ESP32's IP)
3. You should see live video from the camera
4. Also test: `http://192.168.1.100/capture` for a single snapshot

**⚠️ Important:** Your computer/phone must be on the **same WiFi network** as the ESP32!

---

## Step 4: Configure Laura to Access Your Stream

### Method 1: Using API (Recommended)

Update your camera's metadata with the IP address:

```bash
curl -X POST https://laura.heysalad.app/api/cameras \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliZWNkZ2J6Z2xkYWZ3dnp3a3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcxMDYwMTksImV4cCI6MjA0MjY4MjAxOX0.H4NkweM9hwVUYxpcaeLCQjs1KBXZfGH0dqCKlyx2S-U" \
  -d '{
    "camera_id": "CAM001",
    "camera_name": "HeySalad Camera CAM001",
    "metadata": {
      "ip_address": "192.168.1.100",
      "location_name": "HeySalad Berlin Alexanderplatz"
    }
  }'
```

**Replace `192.168.1.100` with your actual ESP32 IP address!**

### Method 2: Using ESP32 Code

Add this to your ESP32's status update code:

```cpp
void updateLauraStatus() {
  HTTPClient http;

  String statusUrl = String(API_CAMERAS_URL) + "/" + String(CAMERA_UUID) + "/status";
  http.begin(statusUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);

  // Get local IP
  String ipAddress = WiFi.localIP().toString();

  String payload = "{";
  payload += "\"status\":\"online\",";
  payload += "\"battery_level\":" + String(getBatteryLevel()) + ",";
  payload += "\"wifi_signal\":" + String(WiFi.RSSI()) + ",";
  payload += "\"location_lat\":52.5219,";
  payload += "\"location_lon\":13.4132,";
  payload += "\"metadata\":{";
  payload += "\"ip_address\":\"" + ipAddress + "\",";
  payload += "\"stream_url\":\"http://" + ipAddress + ":81/stream\",";
  payload += "\"snapshot_url\":\"http://" + ipAddress + "/capture\",";
  payload += "\"location_name\":\"HeySalad Berlin Alexanderplatz\"";
  payload += "}}";

  int httpCode = http.POST(payload);
  http.end();
}
```

---

## Step 5: View Stream in Laura Dashboard

1. Go to: https://laura.heysalad.app/cameras
2. Select your camera (CAM001)
3. You'll see the **Live Preview** panel on the right
4. Click **"Live"** mode to see real-time MJPEG stream
5. Or use **"Snapshot"** mode for auto-refresh images every 3 seconds

---

## Troubleshooting

### Stream not showing in Laura?

**Check 1: Is ESP32 on the same network as your browser?**
- Laura dashboard runs in YOUR browser
- Your browser needs network access to ESP32
- If ESP32 is on local WiFi (192.168.x.x), you can only view the stream when connected to the same WiFi

**Check 2: Can you access stream directly?**
- Open: `http://YOUR_ESP32_IP:81/stream` in browser
- If this doesn't work, ESP32 server isn't running properly

**Check 3: Is IP address configured in Laura?**
- Run: `curl https://laura.heysalad.app/api/cameras | jq`
- Look for your camera's metadata - should contain `ip_address`

**Check 4: Firewall blocking?**
- Some networks block device-to-device communication
- Try connecting phone to same WiFi and test stream URL

### Stream is laggy?

- Reduce frame rate in ESP32 camera config:
  ```cpp
  config.frame_size = FRAMESIZE_VGA;  // Try SVGA or smaller
  config.jpeg_quality = 12;           // Lower = better quality but slower
  config.fb_count = 1;                // Use 2 for smoother stream
  ```

### Want to access stream remotely (outside WiFi)?

You'll need to:
1. **Set up port forwarding** on your router (forward port 81 to ESP32)
2. **Use your public IP** instead of local IP (e.g., `86.123.45.67:81/stream`)
3. **Or use ngrok/CloudFlare tunnel** for secure remote access

---

## Network Topology

```
                    Same WiFi Network
┌─────────────────────────────────────────────────────┐
│                                                       │
│  ┌──────────┐           ┌────────────────┐          │
│  │  ESP32   │           │  Your Computer │          │
│  │          │           │   (Browser)    │          │
│  │ Camera   │           │                │          │
│  │          │           │  Laura running │          │
│  │ IP: 192  │ <─Stream──│  fetches from  │          │
│  │ .168.1   │           │  ESP32 IP      │          │
│  │ .100     │           │                │          │
│  └──────────┘           └────────────────┘          │
│                                                       │
└─────────────────────────────────────────────────────┘
```

**Key Point:** Both devices must be on the same network (or you need port forwarding for remote access).

---

## Summary

✅ **ESP32 is the server** - hosts stream at its IP address
✅ **Laura is the client** - fetches stream from ESP32
✅ **Configuration needed:** Tell Laura the ESP32's IP address
✅ **Network requirement:** Same WiFi or port forwarding setup

Once configured, Laura will automatically display your camera's live stream!
