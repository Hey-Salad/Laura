# ESP32-S3 Camera - Quick Start Guide

Copy-paste ready configuration for your ESP32-S3 AI Camera.

---

## 🔧 Configuration Values

### WiFi
```cpp
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
```

### Supabase
```cpp
const char* SUPABASE_URL = "https://ybecdgbzgldafwvzwkpd.supabase.co";
const char* SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliZWNkZ2J6Z2xkYWZ3dnp3a3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcxMDYwMTksImV4cCI6MjA0MjY4MjAxOX0.H4NkweM9hwVUYxpcaeLCQjs1KBXZfGH0dqCKlyx2S-U";
const char* SUPABASE_REALTIME_WS = "wss://ybecdgbzgldafwvzwkpd.supabase.co/realtime/v1/websocket";
```

### Camera
```cpp
const char* CAMERA_ID = "CAM001";  // Change for each device
const char* CAMERA_NAME = "HeySalad Camera 1";
```

---

## 📡 API Endpoints

### Register Camera
```
POST https://laura.heysalad.app/api/cameras

Headers:
- Content-Type: application/json
- apikey: {SUPABASE_ANON_KEY}
- Authorization: Bearer {SUPABASE_ANON_KEY}

Body:
{
  "camera_id": "CAM001",
  "camera_name": "HeySalad Camera 1",
  "device_type": "esp32-s3-ai",
  "firmware_version": "1.0.0"
}

Response:
{
  "camera": {
    "id": "uuid-here",  // Save this!
    "camera_id": "CAM001",
    "status": "offline",
    ...
  }
}
```

### Upload Photo
```
POST https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object/camera-photos/{path}

Headers:
- Content-Type: image/jpeg
- apikey: {SUPABASE_ANON_KEY}
- Authorization: Bearer {SUPABASE_ANON_KEY}

Body: [JPEG bytes]

Response: Returns file key

Then POST to:
https://laura.heysalad.app/api/cameras/{camera_uuid}/photos
{
  "photo_url": "https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object/public/camera-photos/{path}",
  "command_id": "cmd-123"
}
```

---

## 🔌 WebSocket Messages

### Connect & Join
```
1. Connect to: wss://ybecdgbzgldafwvzwkpd.supabase.co/realtime/v1/websocket?apikey={ANON_KEY}&vsn=1.0.0

2. Send join:
{
  "topic": "camera-CAM001",
  "event": "phx_join",
  "payload": {},
  "ref": "1"
}
```

### Receive Commands (from Laura)
```json
{
  "topic": "camera-CAM001",
  "event": "broadcast",
  "payload": {
    "type": "broadcast",
    "event": "command",
    "payload": {
      "type": "command",
      "command": "take_photo",
      "command_id": "cmd-1234567890",
      "timestamp": "2025-10-29T12:00:00Z",
      "payload": {
        "quality": 85
      }
    }
  }
}
```

### Send Status (to Laura)
```json
{
  "topic": "camera-CAM001",
  "event": "broadcast",
  "ref": "timestamp",
  "payload": {
    "type": "broadcast",
    "event": "status",
    "payload": {
      "type": "status",
      "camera_id": "CAM001",
      "timestamp": "2025-10-29T12:00:00Z",
      "data": {
        "battery_level": 85,
        "wifi_signal": -65,
        "status": "online",
        "free_heap": 245760
      }
    }
  }
}
```

### Send Photo Notification (to Laura)
```json
{
  "topic": "camera-CAM001",
  "event": "broadcast",
  "ref": "timestamp",
  "payload": {
    "type": "broadcast",
    "event": "photo",
    "payload": {
      "type": "photo",
      "command_id": "cmd-1234567890",
      "timestamp": "2025-10-29T12:00:00Z",
      "data": {
        "photo_url": "https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object/public/camera-photos/CAM001/1234567890.jpg"
      }
    }
  }
}
```

---

## 🎯 Commands You'll Receive

1. **take_photo** - Capture and upload photo
2. **start_video** - Start recording video
3. **stop_video** - Stop recording
4. **get_status** - Send current status
5. **reboot** - Restart ESP32

---

## 📦 Required Arduino Libraries

```
- ArduinoWebsockets by Gil Maimon
- ArduinoJson by Benoit Blanchon
- HTTPClient (built-in)
- WiFi (built-in)
- esp_camera (built-in)
```

---

## 🚀 Startup Flow

```
1. Connect WiFi
2. Init Camera
3. Register with Laura (POST /api/cameras) → Get UUID
4. Connect WebSocket
5. Join channel "camera-{CAMERA_ID}"
6. Send status "online"
7. Listen for commands
8. Send status every 30 seconds
```

---

## 📝 Complete Arduino Code

Full working code is in: `ESP32_CAMERA_MAIN.ino`

Just update:
- WiFi credentials
- CAMERA_ID (for additional cameras)

Everything else is pre-configured!
