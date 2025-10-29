# HeySalad Laura - ESP32 Camera API Reference

Complete reference for all API endpoints and message formats for ESP32-S3 camera integration.

---

## Table of Contents

1. [REST API Endpoints](#rest-api-endpoints)
2. [WebSocket (Supabase Realtime)](#websocket-supabase-realtime)
3. [Message Formats](#message-formats)
4. [Error Handling](#error-handling)

---

## REST API Endpoints

### 1. Register/List Cameras

**Endpoint:** `POST /api/cameras`

**Headers:**
```http
Content-Type: application/json
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Payload:**
```json
{
  "camera_id": "CAM001",
  "camera_name": "HeySalad Camera 1",
  "device_type": "esp32-s3-ai",
  "firmware_version": "1.0.0",
  "assigned_to": "Driver 1"
}
```

**Response (201 Created):**
```json
{
  "camera": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "camera_id": "CAM001",
    "camera_name": "HeySalad Camera 1",
    "device_type": "esp32-s3-ai",
    "firmware_version": "1.0.0",
    "assigned_to": "Driver 1",
    "status": "offline",
    "battery_level": null,
    "wifi_signal": null,
    "last_seen": null,
    "location_lat": null,
    "location_lon": null,
    "created_at": "2025-10-29T12:00:00.000Z",
    "updated_at": "2025-10-29T12:00:00.000Z",
    "metadata": {}
  }
}
```

**Response (500 - Camera Already Exists):**
```json
{
  "error": "Failed to create camera",
  "details": "duplicate key value violates unique constraint..."
}
```

---

**Endpoint:** `GET /api/cameras`

**Query Parameters:**
- `status` (optional): Filter by status (online, offline, busy, error)
- `assigned_to` (optional): Filter by assignment

**Headers:**
```http
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "cameras": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "camera_id": "CAM001",
      "camera_name": "HeySalad Camera 1",
      "device_type": "esp32-s3-ai",
      "firmware_version": "1.0.0",
      "assigned_to": "Driver 1",
      "status": "online",
      "battery_level": 85,
      "wifi_signal": -65,
      "last_seen": "2025-10-29T12:05:00.000Z",
      "location_lat": 6.5244,
      "location_lon": 3.3792,
      "created_at": "2025-10-29T12:00:00.000Z",
      "updated_at": "2025-10-29T12:05:00.000Z",
      "metadata": {}
    }
  ]
}
```

---

### 2. Upload Photo

**Endpoint:** `POST /api/cameras/{camera_uuid}/photos`

**Headers:**
```http
Content-Type: application/json
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Payload:**
```json
{
  "photo_url": "https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object/public/camera-photos/CAM001/1730203200000.jpg",
  "thumbnail_url": "https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object/public/camera-photos/CAM001/1730203200000_thumb.jpg",
  "command_id": "cmd-1730203200000",
  "metadata": {
    "size_kb": 125,
    "location": {
      "lat": 6.5244,
      "lon": 3.3792
    },
    "resolution": "1280x720"
  }
}
```

**Response (201 Created):**
```json
{
  "photo": {
    "id": "f9e8d7c6-b5a4-3210-fedc-ba0987654321",
    "camera_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "photo_url": "https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object/public/camera-photos/CAM001/1730203200000.jpg",
    "thumbnail_url": "https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object/public/camera-photos/CAM001/1730203200000_thumb.jpg",
    "taken_at": "2025-10-29T12:10:00.000Z",
    "command_id": "cmd-1730203200000",
    "metadata": {
      "size_kb": 125,
      "location": {
        "lat": 6.5244,
        "lon": 3.3792
      }
    },
    "created_at": "2025-10-29T12:10:00.000Z"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Camera not found"
}
```

---

### 3. Get Photos

**Endpoint:** `GET /api/cameras/{camera_uuid}/photos`

**Query Parameters:**
- `limit` (optional, default: 50): Number of photos to return
- `offset` (optional, default: 0): Pagination offset

**Headers:**
```http
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "photos": [
    {
      "id": "f9e8d7c6-b5a4-3210-fedc-ba0987654321",
      "camera_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "photo_url": "https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object/public/camera-photos/CAM001/1730203200000.jpg",
      "thumbnail_url": null,
      "taken_at": "2025-10-29T12:10:00.000Z",
      "command_id": "cmd-1730203200000",
      "metadata": {},
      "created_at": "2025-10-29T12:10:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

---

### 4. Send Command (Laura → ESP32)

**Endpoint:** `POST /api/cameras/{camera_uuid}/command`

**Headers:**
```http
Content-Type: application/json
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Payload:**
```json
{
  "command_type": "take_photo",
  "payload": {
    "quality": 85,
    "resolution": "1280x720"
  }
}
```

**Valid command_type values:**
- `take_photo`
- `start_video`
- `stop_video`
- `get_status`
- `update_settings`
- `reboot`

**Response (200 OK):**
```json
{
  "message": "Command sent successfully",
  "command": {
    "id": "9a8b7c6d-5e4f-3210-fedc-ba0987654321",
    "camera_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "command_type": "take_photo",
    "command_payload": {
      "quality": 85,
      "resolution": "1280x720"
    },
    "status": "sent",
    "sent_at": "2025-10-29T12:15:00.000Z",
    "completed_at": null,
    "response": {},
    "error_message": null,
    "created_at": "2025-10-29T12:15:00.000Z"
  },
  "command_id": "cmd-1730203500000"
}
```

---

### 5. Get Command History

**Endpoint:** `GET /api/cameras/{camera_uuid}/command`

**Query Parameters:**
- `limit` (optional, default: 50): Number of commands to return
- `status` (optional): Filter by status (pending, sent, completed, failed, timeout)

**Headers:**
```http
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "commands": [
    {
      "id": "9a8b7c6d-5e4f-3210-fedc-ba0987654321",
      "camera_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "command_type": "take_photo",
      "command_payload": {
        "quality": 85
      },
      "status": "completed",
      "sent_at": "2025-10-29T12:15:00.000Z",
      "completed_at": "2025-10-29T12:15:05.000Z",
      "response": {
        "photo_id": "f9e8d7c6-b5a4-3210-fedc-ba0987654321"
      },
      "error_message": null,
      "created_at": "2025-10-29T12:15:00.000Z"
    }
  ]
}
```

---

### 6. Upload to Supabase Storage

**Endpoint:** `POST https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object/camera-photos/{path}`

**Headers:**
```http
Content-Type: image/jpeg
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Body:** Raw JPEG image bytes

**Example path:** `CAM001/1730203200000.jpg`

**Response (200 OK):**
```json
{
  "Key": "camera-photos/CAM001/1730203200000.jpg"
}
```

**Public URL Format:**
```
https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object/public/camera-photos/CAM001/1730203200000.jpg
```

---

## WebSocket (Supabase Realtime)

### Connection

**WebSocket URL:**
```
wss://ybecdgbzgldafwvzwkpd.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...&vsn=1.0.0
```

### Join Channel

After WebSocket connects, join your camera's channel:

**Send:**
```json
{
  "topic": "camera-CAM001",
  "event": "phx_join",
  "payload": {},
  "ref": "1"
}
```

**Receive:**
```json
{
  "topic": "camera-CAM001",
  "event": "phx_reply",
  "payload": {
    "status": "ok",
    "response": {}
  },
  "ref": "1"
}
```

---

## Message Formats

### 1. Command Message (Laura → ESP32)

ESP32 listens for these on the `broadcast` event.

**Receive:**
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
      "command_id": "cmd-1730203500000",
      "timestamp": "2025-10-29T12:15:00.000Z",
      "payload": {
        "quality": 85,
        "resolution": "1280x720"
      }
    }
  },
  "ref": null
}
```

**Command Types:**

#### take_photo
```json
{
  "command": "take_photo",
  "payload": {
    "quality": 85,
    "resolution": "1280x720"
  }
}
```

#### start_video
```json
{
  "command": "start_video",
  "payload": {
    "duration": 30,
    "resolution": "720p"
  }
}
```

#### stop_video
```json
{
  "command": "stop_video",
  "payload": {}
}
```

#### get_status
```json
{
  "command": "get_status",
  "payload": {}
}
```

#### update_settings
```json
{
  "command": "update_settings",
  "payload": {
    "photo_quality": 90,
    "status_interval": 60000
  }
}
```

#### reboot
```json
{
  "command": "reboot",
  "payload": {}
}
```

---

### 2. Status Update (ESP32 → Laura)

ESP32 broadcasts status updates every 30 seconds or when status changes.

**Send:**
```json
{
  "topic": "camera-CAM001",
  "event": "broadcast",
  "ref": "1730203600000",
  "payload": {
    "type": "broadcast",
    "event": "status",
    "payload": {
      "type": "status",
      "camera_id": "CAM001",
      "timestamp": "2025-10-29T12:20:00.000Z",
      "data": {
        "battery_level": 85,
        "wifi_signal": -65,
        "status": "online",
        "location": {
          "lat": 6.5244,
          "lon": 3.3792
        },
        "free_heap": 245760,
        "firmware_version": "1.0.0"
      }
    }
  }
}
```

**Status Values:**
- `online` - Camera is operational
- `offline` - Camera is disconnected
- `busy` - Camera is processing a command
- `error` - Camera encountered an error

---

### 3. Photo Notification (ESP32 → Laura)

After capturing and uploading a photo, ESP32 broadcasts a notification.

**Send:**
```json
{
  "topic": "camera-CAM001",
  "event": "broadcast",
  "ref": "1730203700000",
  "payload": {
    "type": "broadcast",
    "event": "photo",
    "payload": {
      "type": "photo",
      "command_id": "cmd-1730203500000",
      "timestamp": "2025-10-29T12:25:00.000Z",
      "data": {
        "photo_url": "https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object/public/camera-photos/CAM001/1730203700000.jpg",
        "thumbnail_url": "https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object/public/camera-photos/CAM001/1730203700000_thumb.jpg",
        "size_kb": 125,
        "format": "jpeg",
        "metadata": {
          "resolution": "1280x720",
          "location": {
            "lat": 6.5244,
            "lon": 3.3792
          }
        }
      }
    }
  }
}
```

---

### 4. Response Message (ESP32 → Laura)

For commands that don't produce photos, ESP32 can send a generic response.

**Send:**
```json
{
  "topic": "camera-CAM001",
  "event": "broadcast",
  "ref": "1730203800000",
  "payload": {
    "type": "broadcast",
    "event": "response",
    "payload": {
      "type": "response",
      "command_id": "cmd-1730203500000",
      "status": "completed",
      "timestamp": "2025-10-29T12:30:00.000Z",
      "data": {
        "message": "Command executed successfully"
      }
    }
  }
}
```

---

## Error Handling

### HTTP Error Responses

#### 400 Bad Request
```json
{
  "error": "command_type is required"
}
```

#### 404 Not Found
```json
{
  "error": "Camera not found"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to create camera",
  "details": "Database connection error"
}
```

### WebSocket Error Handling

If WebSocket disconnects:
1. ESP32 should attempt reconnection with exponential backoff
2. On reconnect, rejoin the camera channel
3. Send a status update to confirm online status

---

## Complete Flow Example

### 1. ESP32 Startup

```
1. Connect to WiFi
2. Register camera: POST /api/cameras
   Response: camera_uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
3. Connect WebSocket
4. Join channel: "camera-CAM001"
5. Send status: "online"
```

### 2. Laura Sends Command

```
1. User clicks "Take Photo" in Laura
2. Laura: POST /api/cameras/a1b2c3d4-e5f6-7890-abcd-ef1234567890/command
   {
     "command_type": "take_photo",
     "payload": { "quality": 85 }
   }
3. Laura broadcasts to WebSocket channel
4. ESP32 receives command via WebSocket
```

### 3. ESP32 Executes Command

```
1. ESP32 receives: { "command": "take_photo", "command_id": "cmd-123" }
2. ESP32 sends status: "busy"
3. Capture photo with camera
4. Upload to storage: POST https://...supabase.co/storage/v1/object/camera-photos/CAM001/123.jpg
   Response: photo_url
5. Report to API: POST /api/cameras/.../photos
   {
     "photo_url": "https://...",
     "command_id": "cmd-123"
   }
6. Broadcast photo notification via WebSocket
7. ESP32 sends status: "online"
```

### 4. Laura Receives Photo

```
1. Laura receives photo notification via WebSocket
2. Laura shows toast: "New photo received"
3. Photo appears in gallery automatically
4. Command status updated to "completed"
```

---

## Quick Reference

### URLs
- **Laura Base:** `https://laura.heysalad.app`
- **Supabase:** `https://ybecdgbzgldafwvzwkpd.supabase.co`
- **WebSocket:** `wss://ybecdgbzgldafwvzwkpd.supabase.co/realtime/v1/websocket`
- **Storage:** `https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object/camera-photos`

### Channel Name
`camera-{CAMERA_ID}` (e.g., `camera-CAM001`)

### Events
- **Laura → ESP32:** `broadcast` event `command`
- **ESP32 → Laura:** `broadcast` events: `status`, `photo`, `response`

### Camera Statuses
`online`, `offline`, `busy`, `error`

### Command Types
`take_photo`, `start_video`, `stop_video`, `get_status`, `update_settings`, `reboot`
