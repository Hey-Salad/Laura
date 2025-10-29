# ESP32-S3 AI Camera Remote Control Integration

## Architecture Overview

Using **Supabase Realtime** as the communication layer between Laura dashboard and ESP32-S3 cameras.

```
┌─────────────────────────────────────────────────────────────┐
│                    Laura Dashboard                          │
│  - View connected cameras                                   │
│  - Send commands (take photo, start video, etc.)            │
│  - View live photos/status                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              Supabase Realtime Channels                     │
│                                                              │
│  Channel: camera-{camera_id}                                │
│  ├─ commands (Laura → ESP32)                                │
│  ├─ photos (ESP32 → Laura)                                  │
│  ├─ status (ESP32 → Laura)                                  │
│  └─ responses (ESP32 → Laura)                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                 ESP32-S3 AI Camera                          │
│  - Connects to Supabase via WiFi                            │
│  - Subscribes to camera-{id} channel                        │
│  - Listens for commands                                     │
│  - Sends photos (base64 or upload to Supabase Storage)     │
│  - Reports battery, WiFi signal, location                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

```sql
-- Add to your Supabase project

-- Cameras table
create table if not exists cameras (
  id uuid primary key default uuid_generate_v4(),
  camera_id text unique not null, -- Hardware device ID
  camera_name text not null,
  device_type text not null default 'esp32-s3-ai',
  firmware_version text,
  assigned_to text, -- Driver name or location
  status text not null check (status in ('online', 'offline', 'busy', 'error')) default 'offline',
  battery_level integer check (battery_level >= 0 and battery_level <= 100),
  wifi_signal integer, -- RSSI
  last_seen timestamptz,
  location_lat double precision,
  location_lon double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

-- Camera photos table
create table if not exists camera_photos (
  id uuid primary key default uuid_generate_v4(),
  camera_id uuid references cameras(id) on delete cascade not null,
  photo_url text not null, -- Supabase Storage URL
  thumbnail_url text,
  taken_at timestamptz not null default now(),
  command_id text, -- Reference to command that triggered photo
  metadata jsonb default '{}'::jsonb, -- Location, AI detections, etc.
  created_at timestamptz not null default now()
);

-- Camera commands table (optional, for logging)
create table if not exists camera_commands (
  id uuid primary key default uuid_generate_v4(),
  camera_id uuid references cameras(id) on delete cascade not null,
  command_type text not null, -- 'take_photo', 'start_video', 'get_status', etc.
  command_payload jsonb default '{}'::jsonb,
  status text not null check (status in ('pending', 'sent', 'completed', 'failed', 'timeout')) default 'pending',
  sent_at timestamptz,
  completed_at timestamptz,
  response jsonb default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_cameras_status on cameras(status);
create index if not exists idx_cameras_last_seen on cameras(last_seen desc);
create index if not exists idx_camera_photos_camera_id on camera_photos(camera_id);
create index if not exists idx_camera_photos_taken_at on camera_photos(taken_at desc);
create index if not exists idx_camera_commands_camera_id on camera_commands(camera_id);
create index if not exists idx_camera_commands_status on camera_commands(status);

-- RLS Policies
alter table cameras enable row level security;
alter table camera_photos enable row level security;
alter table camera_commands enable row level security;

create policy "Service role manage cameras" on cameras
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role manage photos" on camera_photos
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role manage commands" on camera_commands
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Supabase Storage bucket for photos
-- Run this in Supabase Storage UI or via API
-- Bucket name: camera-photos
-- Public: true (or false with signed URLs)
```

---

## Message Protocol

### Commands (Laura → ESP32)

```json
{
  "type": "command",
  "command": "take_photo",
  "command_id": "cmd-123",
  "timestamp": "2025-10-29T12:00:00Z",
  "payload": {
    "quality": 85,
    "resolution": "1280x720"
  }
}
```

**Command Types:**
- `take_photo` - Capture single photo
- `start_video` - Start video recording (duration in payload)
- `stop_video` - Stop recording
- `get_status` - Request battery, WiFi, location
- `update_settings` - Change camera settings
- `reboot` - Restart device

### Responses (ESP32 → Laura)

```json
{
  "type": "response",
  "command_id": "cmd-123",
  "status": "completed",
  "timestamp": "2025-10-29T12:00:05Z",
  "data": {
    "photo_id": "photo-456",
    "size_kb": 245
  }
}
```

### Status Updates (ESP32 → Laura)

```json
{
  "type": "status",
  "camera_id": "CAM001",
  "timestamp": "2025-10-29T12:00:00Z",
  "data": {
    "battery_level": 85,
    "wifi_signal": -45,
    "status": "online",
    "location": {
      "lat": 52.52,
      "lon": 13.405
    }
  }
}
```

### Photos (ESP32 → Laura)

**Option A: Upload to Supabase Storage (Recommended)**
```json
{
  "type": "photo",
  "command_id": "cmd-123",
  "timestamp": "2025-10-29T12:00:05Z",
  "data": {
    "photo_url": "https://supabase.co/storage/v1/object/public/camera-photos/CAM001/photo-456.jpg",
    "thumbnail_url": "https://..../thumb-456.jpg",
    "metadata": {
      "resolution": "1280x720",
      "size_kb": 245,
      "location": {"lat": 52.52, "lon": 13.405}
    }
  }
}
```

**Option B: Send base64 (For small images only)**
```json
{
  "type": "photo",
  "command_id": "cmd-123",
  "data": {
    "base64": "/9j/4AAQSkZJRg...", // Truncated
    "format": "jpeg"
  }
}
```

---

## ESP32-S3 Arduino Code

### Install Dependencies

In your HeySalad ESP32 project:

```cpp
// platformio.ini
[env:esp32-s3]
platform = espressif32
board = esp32-s3-devkitc-1
framework = arduino
lib_deps =
    bblanchon/ArduinoJson@^7.0.0
    khoih-prog/AsyncWebServer_ESP32_SC_W5500@^1.8.1
    // Add Supabase realtime library or use WebSocket client
    links2004/WebSockets@^2.4.1
```

### Camera Manager with Realtime

```cpp
// camera_realtime.h
#ifndef CAMERA_REALTIME_H
#define CAMERA_REALTIME_H

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include "camera.h" // Your existing camera code

class CameraRealtime {
private:
    WebSocketsClient wsClient;
    String cameraId;
    String supabaseUrl;
    String supabaseKey;
    bool isConnected = false;

    void handleCommand(JsonDocument& doc);
    void sendPhoto(String commandId);
    void sendStatus();
    void sendResponse(String commandId, String status, JsonObject data);

public:
    CameraRealtime(String camId, String url, String key);
    void begin();
    void loop();
    void connect();
    void onWebSocketEvent(WStype_t type, uint8_t* payload, size_t length);
};

#endif
```

```cpp
// camera_realtime.cpp
#include "camera_realtime.h"

CameraRealtime::CameraRealtime(String camId, String url, String key) {
    cameraId = camId;
    supabaseUrl = url;
    supabaseKey = key;
}

void CameraRealtime::begin() {
    // Connect to Supabase Realtime WebSocket
    // Format: wss://[project-ref].supabase.co/realtime/v1/websocket

    String wsUrl = supabaseUrl;
    wsUrl.replace("https://", "");
    wsUrl.replace("http://", "");

    wsClient.beginSSL(wsUrl.c_str(), 443, "/realtime/v1/websocket?apikey=" + supabaseKey + "&vsn=1.0.0");
    wsClient.onEvent([this](WStype_t type, uint8_t* payload, size_t length) {
        this->onWebSocketEvent(type, payload, length);
    });
}

void CameraRealtime::loop() {
    wsClient.loop();

    // Send status every 30 seconds
    static unsigned long lastStatus = 0;
    if (millis() - lastStatus > 30000) {
        sendStatus();
        lastStatus = millis();
    }
}

void CameraRealtime::onWebSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
    switch(type) {
        case WStype_CONNECTED:
            Serial.println("WebSocket Connected!");
            isConnected = true;

            // Subscribe to camera channel
            {
                JsonDocument doc;
                doc["topic"] = "realtime:camera-" + cameraId;
                doc["event"] = "phx_join";
                doc["payload"] = JsonObject();
                doc["ref"] = "1";

                String output;
                serializeJson(doc, output);
                wsClient.sendTXT(output);
            }
            break;

        case WStype_TEXT:
            {
                JsonDocument doc;
                deserializeJson(doc, payload, length);

                String event = doc["event"];
                if (event == "command") {
                    handleCommand(doc["payload"]);
                }
            }
            break;

        case WStype_DISCONNECTED:
            Serial.println("WebSocket Disconnected!");
            isConnected = false;
            break;
    }
}

void CameraRealtime::handleCommand(JsonDocument& doc) {
    String command = doc["command"];
    String commandId = doc["command_id"];

    Serial.println("Received command: " + command);

    if (command == "take_photo") {
        sendPhoto(commandId);
    }
    else if (command == "get_status") {
        sendStatus();
    }
    else if (command == "reboot") {
        sendResponse(commandId, "completed", JsonObject());
        delay(1000);
        ESP.restart();
    }
}

void CameraRealtime::sendPhoto(String commandId) {
    // Take photo
    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) {
        sendResponse(commandId, "failed", JsonObject());
        return;
    }

    // Option 1: Upload to Supabase Storage
    // TODO: Implement HTTP upload to Supabase Storage
    // For now, send base64 (only for small images!)

    // Option 2: Send base64 (for small images)
    String base64 = base64::encode(fb->buf, fb->len);

    JsonDocument doc;
    doc["type"] = "photo";
    doc["command_id"] = commandId;
    doc["timestamp"] = "2025-10-29T12:00:00Z"; // TODO: Real timestamp
    doc["data"]["base64"] = base64;
    doc["data"]["format"] = "jpeg";
    doc["data"]["size_kb"] = fb->len / 1024;

    String output;
    serializeJson(doc, output);

    // Send via WebSocket
    JsonDocument broadcastDoc;
    broadcastDoc["topic"] = "realtime:camera-" + cameraId;
    broadcastDoc["event"] = "broadcast";
    broadcastDoc["payload"]["type"] = "broadcast";
    broadcastDoc["payload"]["event"] = "photo";
    broadcastDoc["payload"]["payload"] = doc;
    broadcastDoc["ref"] = String(millis());

    String broadcastOutput;
    serializeJson(broadcastDoc, broadcastOutput);
    wsClient.sendTXT(broadcastOutput);

    esp_camera_fb_return(fb);

    sendResponse(commandId, "completed", doc["data"]);
}

void CameraRealtime::sendStatus() {
    JsonDocument doc;
    doc["type"] = "status";
    doc["camera_id"] = cameraId;
    doc["timestamp"] = "2025-10-29T12:00:00Z";
    doc["data"]["battery_level"] = 85; // TODO: Read actual battery
    doc["data"]["wifi_signal"] = WiFi.RSSI();
    doc["data"]["status"] = "online";
    doc["data"]["free_heap"] = ESP.getFreeHeap();

    // Broadcast status
    JsonDocument broadcastDoc;
    broadcastDoc["topic"] = "realtime:camera-" + cameraId;
    broadcastDoc["event"] = "broadcast";
    broadcastDoc["payload"]["type"] = "broadcast";
    broadcastDoc["payload"]["event"] = "status";
    broadcastDoc["payload"]["payload"] = doc;
    broadcastDoc["ref"] = String(millis());

    String output;
    serializeJson(broadcastDoc, output);
    wsClient.sendTXT(output);
}

void CameraRealtime::sendResponse(String commandId, String status, JsonObject data) {
    JsonDocument doc;
    doc["type"] = "response";
    doc["command_id"] = commandId;
    doc["status"] = status;
    doc["timestamp"] = "2025-10-29T12:00:00Z";
    doc["data"] = data;

    // Broadcast response
    JsonDocument broadcastDoc;
    broadcastDoc["topic"] = "realtime:camera-" + cameraId;
    broadcastDoc["event"] = "broadcast";
    broadcastDoc["payload"]["type"] = "broadcast";
    broadcastDoc["payload"]["event"] = "response";
    broadcastDoc["payload"]["payload"] = doc;
    broadcastDoc["ref"] = String(millis());

    String output;
    serializeJson(broadcastDoc, output);
    wsClient.sendTXT(output);
}
```

### Main Loop Integration

```cpp
// main.cpp
#include "camera_realtime.h"

CameraRealtime* cameraRealtime;

void setup() {
    Serial.begin(115200);

    // Initialize WiFi
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi Connected!");

    // Initialize camera (your existing code)
    initCamera();

    // Initialize realtime connection
    String cameraId = "CAM001"; // Or get from device ID
    String supabaseUrl = "https://your-project.supabase.co";
    String supabaseKey = "your-anon-key";

    cameraRealtime = new CameraRealtime(cameraId, supabaseUrl, supabaseKey);
    cameraRealtime->begin();
}

void loop() {
    cameraRealtime->loop();
    // Your other loop code
}
```

---

## Next Steps

1. **Run database schema** in Supabase SQL Editor
2. **Create Laura frontend interface** for camera control
3. **Flash ESP32-S3 firmware** with realtime code
4. **Test end-to-end** communication

Want me to implement the Laura frontend interface for camera control next?
