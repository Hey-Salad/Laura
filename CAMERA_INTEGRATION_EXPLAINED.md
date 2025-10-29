# HeySalad Laura - Camera Integration Explained

A comprehensive guide to understanding how ESP32-S3 AI cameras integrate with Laura for remote control and photo delivery.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Components](#architecture-components)
3. [Communication Flow](#communication-flow)
4. [Real-World Scenarios](#real-world-scenarios)
5. [Technical Deep Dive](#technical-deep-dive)
6. [Deployment Guide](#deployment-guide)

---

## System Overview

### What We Built

A **real-time camera control system** where:
- **Laura Dashboard** (web app) sends commands to remote ESP32 cameras
- **ESP32-S3 cameras** capture photos and send them back
- Everything happens **instantly** via WebSocket
- All data is stored in **Supabase** (database + storage + realtime)

### Why This Architecture?

Traditional approaches would require:
- ❌ Complex server infrastructure
- ❌ Port forwarding/NAT traversal
- ❌ Polling (wasteful, slow)

**Our approach:**
- ✅ Serverless (Vercel + Supabase)
- ✅ Real-time bidirectional communication
- ✅ Works from anywhere (no networking setup)
- ✅ Scales automatically

---

## Architecture Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         LAURA DASHBOARD                         │
│              https://laura.heysalad.app/cameras                 │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Camera List  │  │   Controls   │  │Photo Gallery │        │
│  │              │  │              │  │              │        │
│  │ • CAM001     │  │ • Take Photo │  │ [📷][📷][📷] │        │
│  │ • CAM002     │  │ • Get Status │  │ [📷][📷][📷] │        │
│  │ • CAM003     │  │ • Reboot     │  │ [📷][📷][📷] │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└───────────┬─────────────────────────────────────────────────────┘
            │
            │ REST API + WebSocket
            ↓
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE (Backend)                         │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │   PostgreSQL     │  │  Realtime (WS)   │  │   Storage    │ │
│  │   Database       │  │                  │  │              │ │
│  │                  │  │  ┌────────────┐  │  │  ┌────────┐  │ │
│  │ • cameras        │  │  │ camera-    │  │  │  │ photos │  │ │
│  │ • camera_photos  │  │  │ CAM001     │  │  │  │ videos │  │ │
│  │ • camera_commands│  │  │ channel    │  │  │  └────────┘  │ │
│  │                  │  │  └────────────┘  │  │              │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
└───────────┬─────────────────────────────────────────────────────┘
            │
            │ WebSocket + REST API
            ↓
┌─────────────────────────────────────────────────────────────────┐
│                      ESP32-S3 CAMERAS                           │
│                     (Physical Devices)                          │
│                                                                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │
│  │   CAM001    │   │   CAM002    │   │   CAM003    │          │
│  │             │   │             │   │             │          │
│  │ 📷 Camera   │   │ 📷 Camera   │   │ 📷 Camera   │          │
│  │ 📡 WiFi     │   │ 📡 WiFi     │   │ 📡 WiFi     │          │
│  │ 🔋 Battery  │   │ 🔋 Battery  │   │ 🔋 Battery  │          │
│  │ 📍 GPS      │   │ 📍 GPS      │   │ 📍 GPS      │          │
│  └─────────────┘   └─────────────┘   └─────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture Components

### 1. Laura Dashboard (Frontend)

**Technology:** Next.js 16, React, TypeScript, Tailwind CSS

**Location:** `https://laura.heysalad.app/cameras`

**What it does:**
- Displays all registered cameras with live status
- Provides control buttons (Take Photo, Reboot, etc.)
- Shows photo gallery with thumbnails
- Receives real-time updates via WebSocket

**Key Files:**
- `src/app/(routes)/cameras/page.tsx` - Main page with realtime subscriptions
- `src/components/cameras/CameraList.tsx` - Camera grid display
- `src/components/cameras/CameraControl.tsx` - Command buttons
- `src/components/cameras/PhotoGallery.tsx` - Photo viewer with lightbox

### 2. Laura API (Backend)

**Technology:** Next.js API Routes (serverless functions on Vercel)

**What it does:**
- CRUD operations for cameras
- Command creation and logging
- Photo metadata storage
- Authentication/authorization

**Endpoints:**
```
GET/POST  /api/cameras                      - List/register cameras
POST      /api/cameras/[id]/command         - Send command
GET       /api/cameras/[id]/command         - Command history
GET/POST  /api/cameras/[id]/photos          - Photo management
```

**Key Files:**
- `src/app/api/cameras/route.ts`
- `src/app/api/cameras/[id]/command/route.ts`
- `src/app/api/cameras/[id]/photos/route.ts`

### 3. Supabase (Database + Realtime + Storage)

**What it provides:**

#### PostgreSQL Database
```sql
cameras          - Camera devices and metadata
camera_photos    - Photo records with URLs
camera_commands  - Command log and status
```

#### Realtime (WebSocket)
- Channel-based pub/sub messaging
- Each camera has its own channel: `camera-{CAMERA_ID}`
- Bidirectional: Laura ↔ ESP32
- Events: `command`, `status`, `photo`

#### Storage
- Bucket: `camera-photos`
- Organized by camera: `CAM001/timestamp.jpg`
- Public URLs for easy access
- CDN-backed for fast delivery

### 4. ESP32-S3 Cameras (IoT Devices)

**Hardware:** Seeed XIAO ESP32S3 Sense or similar

**Capabilities:**
- OV2640 2MP camera sensor
- WiFi connectivity
- Battery monitoring (if equipped)
- GPS/location (optional)

**Software:** Arduino sketch with libraries:
- `ArduinoWebsockets` - WebSocket client
- `ArduinoJson` - JSON parsing
- `esp_camera` - Camera control
- `HTTPClient` - REST API calls

**What it does:**
1. Connects to WiFi on boot
2. Registers with Laura API (gets UUID)
3. Opens WebSocket to Supabase Realtime
4. Listens for commands on `camera-{CAMERA_ID}` channel
5. Broadcasts status every 30 seconds
6. Captures photos when commanded
7. Uploads photos to Supabase Storage
8. Notifies Laura via WebSocket

---

## Communication Flow

### Startup Flow (ESP32 → Laura)

```
ESP32 Powers On
       ↓
[1] Connect to WiFi
       ↓
[2] Initialize Camera Hardware
       ↓
[3] POST /api/cameras
    {
      "camera_id": "CAM001",
      "camera_name": "HeySalad Camera 1"
    }
       ↓
    Response: { "camera": { "id": "uuid-here" } }
       ↓
[4] Save UUID to memory
       ↓
[5] Connect WebSocket
    wss://ybecdgbzgldafwvzwkpd.supabase.co/realtime/v1/websocket
       ↓
[6] Join Channel "camera-CAM001"
    Send: { "event": "phx_join", "topic": "camera-CAM001" }
       ↓
[7] Broadcast Status "online"
    {
      "event": "status",
      "data": {
        "status": "online",
        "battery_level": 85,
        "wifi_signal": -65
      }
    }
       ↓
[8] Laura Dashboard Updates
    Camera CAM001 status: OFFLINE → ONLINE ✅
       ↓
[9] ESP32 Enters Listen Loop
    • Listen for commands on WebSocket
    • Send status every 30 seconds
    • Keep connection alive
```

---

### Command Flow (Laura → ESP32 → Laura)

#### User Clicks "Take Photo" Button

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: User Action in Laura                                   │
└─────────────────────────────────────────────────────────────────┘

User clicks "Take Photo" on Camera CAM001
       ↓
Laura Frontend sends:
  POST /api/cameras/{uuid}/command
  {
    "command_type": "take_photo",
    "payload": { "quality": 85 }
  }

┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Laura API Processes Command                            │
└─────────────────────────────────────────────────────────────────┘

1. Create record in camera_commands table
   {
     "command_type": "take_photo",
     "status": "pending",
     "sent_at": "2025-10-29T12:00:00Z"
   }
       ↓
2. Generate command_id: "cmd-1730203200000"
       ↓
3. Broadcast to Supabase Realtime channel "camera-CAM001"
   {
     "event": "broadcast",
     "payload": {
       "type": "command",
       "command": "take_photo",
       "command_id": "cmd-1730203200000",
       "payload": { "quality": 85 }
     }
   }
       ↓
4. Update command status: "pending" → "sent"
       ↓
5. Return response to Laura Frontend
   { "message": "Command sent successfully" }

┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: ESP32 Receives Command                                 │
└─────────────────────────────────────────────────────────────────┘

ESP32 receives WebSocket message on channel "camera-CAM001"
       ↓
Parse JSON: command = "take_photo", command_id = "cmd-1730203200000"
       ↓
Call handleTakePhoto(command_id)

┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: ESP32 Captures Photo                                   │
└─────────────────────────────────────────────────────────────────┘

1. Broadcast status: "busy"
       ↓
2. Call esp_camera_fb_get() → Capture photo
       ↓
3. Photo captured: 125KB JPEG @ 1280x720
       ↓
4. Upload to Supabase Storage:
   POST https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object/camera-photos/CAM001/1730203200000.jpg
   Headers: { apikey, Authorization }
   Body: [JPEG bytes]
       ↓
5. Storage returns success
       ↓
6. Photo URL: https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object/public/camera-photos/CAM001/1730203200000.jpg

┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: ESP32 Reports Photo to Laura API                       │
└─────────────────────────────────────────────────────────────────┘

POST /api/cameras/{uuid}/photos
{
  "photo_url": "https://.../CAM001/1730203200000.jpg",
  "command_id": "cmd-1730203200000",
  "metadata": {
    "size_kb": 125,
    "resolution": "1280x720"
  }
}
       ↓
Laura API:
1. Insert into camera_photos table
2. Update camera_commands: status → "completed"
       ↓
Response: { "photo": { "id": "photo-uuid" } }

┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: ESP32 Broadcasts Photo Notification                    │
└─────────────────────────────────────────────────────────────────┘

Broadcast to channel "camera-CAM001":
{
  "event": "photo",
  "payload": {
    "type": "photo",
    "command_id": "cmd-1730203200000",
    "data": {
      "photo_url": "https://.../CAM001/1730203200000.jpg"
    }
  }
}
       ↓
Broadcast status: "online"

┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: Laura Dashboard Updates                                │
└─────────────────────────────────────────────────────────────────┘

Laura receives photo notification via WebSocket subscription
       ↓
1. Show toast: "New photo received from camera" 🎉
2. Photo appears in gallery automatically
3. Command status updates to "completed" ✅
4. Camera status returns to "online"

Total Time: ~2-5 seconds from click to photo display!
```

---

## Real-World Scenarios

### Scenario 1: Delivery Proof Photo

**Context:** Driver delivers food, needs photo proof of delivery

**Flow:**
1. Driver arrives at customer location
2. Places food at doorstep
3. Laura Dashboard shows driver's assigned camera (CAM002)
4. Dispatcher clicks "Take Photo" in Laura
5. ESP32 camera (attached to driver) captures photo
6. Photo uploads and appears in Laura instantly
7. Photo linked to order in database
8. Customer receives delivery notification with photo

**Benefits:**
- Instant proof of delivery
- No driver action needed
- Photo automatically linked to order
- Reduces disputes

---

### Scenario 2: Remote Kitchen Monitoring

**Context:** Monitor multiple kitchen stations with cameras

**Flow:**
1. 5 cameras installed: Prep, Grill, Assembly, Packing, Exit
2. All cameras show in Laura dashboard with live status
3. Manager clicks camera to see current status
4. Can request photo from any station on-demand
5. Photo gallery shows history of all stations
6. Identify bottlenecks and quality issues

**Benefits:**
- Real-time visibility
- Historical photo log
- No extra hardware needed
- Accessible from anywhere

---

### Scenario 3: Basket Tracking (Future)

**Context:** Track delivery baskets with mounted cameras

**Flow:**
1. Camera mounted on each delivery basket
2. Camera captures photo every 5 minutes (auto-command)
3. GPS coordinates embedded in metadata
4. Laura shows basket locations on map
5. If basket goes off-route, alert triggered
6. Can capture on-demand photo to verify contents

**Benefits:**
- Asset tracking
- Theft prevention
- Route verification
- Content verification

---

## Technical Deep Dive

### Why WebSocket Over Polling?

**Polling (Traditional):**
```
ESP32 → Laura: "Any commands for me?" (every 5 seconds)
Laura → ESP32: "No"
ESP32 → Laura: "Any commands for me?"
Laura → ESP32: "No"
ESP32 → Laura: "Any commands for me?"
Laura → ESP32: "Yes! Take photo"
```
- ❌ Wasteful (99% empty responses)
- ❌ Battery drain
- ❌ 5-second delay
- ❌ Server load

**WebSocket (Our Approach):**
```
ESP32 ↔ Laura: [Connection open, idle]
Laura → ESP32: "Take photo" [instant]
ESP32 → Laura: "Photo captured" [instant]
```
- ✅ Instant (no delay)
- ✅ Battery efficient (idle = no data)
- ✅ Scalable (1 connection per camera)
- ✅ Bidirectional

---

### Why Supabase Realtime?

**Alternatives Considered:**

1. **Socket.IO Server**
   - ❌ Need to run server 24/7
   - ❌ Vercel timeout limit (10s)
   - ❌ State management across serverless functions
   - ❌ Additional cost

2. **AWS IoT Core**
   - ❌ Complex setup
   - ❌ MQTT certificates
   - ❌ Separate service
   - ❌ Higher cost

3. **Pusher/Ably**
   - ❌ Additional service
   - ❌ Extra cost
   - ❌ Another auth system

**Supabase Realtime:**
- ✅ Already using Supabase for database
- ✅ Built-in (no extra service)
- ✅ Free tier sufficient
- ✅ Same auth system
- ✅ Channel-based (easy scaling)
- ✅ Works with serverless (Vercel)

---

### Database Schema Design

```sql
-- cameras: The device registry
CREATE TABLE cameras (
  id UUID PRIMARY KEY,              -- Internal UUID
  camera_id TEXT UNIQUE,            -- Hardware ID (CAM001)
  camera_name TEXT,                 -- Human name
  status TEXT,                      -- online/offline/busy/error
  battery_level INT,                -- 0-100
  wifi_signal INT,                  -- RSSI in dBm
  last_seen TIMESTAMPTZ,            -- Last contact
  location_lat FLOAT,               -- GPS coordinates
  location_lon FLOAT,
  metadata JSONB                    -- Flexible data
);

-- camera_photos: Photo records
CREATE TABLE camera_photos (
  id UUID PRIMARY KEY,
  camera_id UUID REFERENCES cameras(id),  -- Which camera
  photo_url TEXT,                         -- Supabase Storage URL
  taken_at TIMESTAMPTZ,                   -- When captured
  command_id TEXT,                        -- Link to command
  metadata JSONB                          -- Location, size, etc.
);

-- camera_commands: Command log
CREATE TABLE camera_commands (
  id UUID PRIMARY KEY,
  camera_id UUID REFERENCES cameras(id),
  command_type TEXT,                -- take_photo, reboot, etc.
  status TEXT,                      -- pending/sent/completed/failed
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  response JSONB                    -- Response data
);
```

**Why this design?**
- Camera lookup by UUID (fast)
- Photos linked to cameras (foreign key)
- Commands tracked for debugging
- Metadata in JSONB (flexible)
- Timestamps for analytics

---

### Security Considerations

#### Authentication Flow

1. **Laura Dashboard ↔ API:**
   - User logged in via magic link
   - Session cookie with JWT
   - Middleware validates on each request

2. **ESP32 ↔ Supabase:**
   - Uses `SUPABASE_ANON_KEY` (public key)
   - Row Level Security (RLS) enabled
   - Service role for API routes

3. **Laura API ↔ Supabase:**
   - Uses `SUPABASE_SERVICE_ROLE_KEY`
   - Bypasses RLS
   - Only on server-side

#### RLS Policies

```sql
-- Only service role can manage cameras
CREATE POLICY "Service role manage cameras"
  ON cameras
  FOR ALL
  USING (auth.role() = 'service_role');
```

This ensures:
- ESP32 cameras can't see other cameras
- Only Laura API can modify data
- Anon key is safe to embed in ESP32

---

### Photo Upload Flow

```
┌─────────────────────────────────────────────────────────┐
│ OPTION 1: Direct Storage Upload (Recommended)          │
└─────────────────────────────────────────────────────────┘

ESP32 → Supabase Storage API (multipart/form-data)
    [Binary JPEG upload]
         ↓
    Returns: Storage path
         ↓
ESP32 → Laura API (JSON)
    { "photo_url": "public URL" }
         ↓
    Database record created

Benefits:
✅ Efficient (binary upload)
✅ Fast (direct to CDN)
✅ Automatic compression
✅ Public URLs

┌─────────────────────────────────────────────────────────┐
│ OPTION 2: Base64 via API (Not Recommended)             │
└─────────────────────────────────────────────────────────┘

ESP32 → Laura API (JSON)
    {
      "photo_base64": "data:image/jpeg;base64,/9j/4AAQ..."
    }
         ↓
    API decodes and uploads to storage
         ↓
    Returns URL

Downsides:
❌ 33% larger payload (base64 overhead)
❌ API timeout risk
❌ Memory usage on ESP32
```

**We use Option 1** in the Arduino code.

---

## Deployment Guide

### Prerequisites

1. ✅ Supabase project created
2. ✅ Tables created (cameras, camera_photos, camera_commands)
3. ✅ Storage bucket created (camera-photos)
4. ✅ Laura deployed to Vercel
5. ✅ Environment variables set in Vercel

### ESP32 Setup

**Hardware:**
- Seeed XIAO ESP32S3 Sense (or compatible)
- USB-C cable
- WiFi network

**Software:**
1. Install Arduino IDE
2. Add ESP32 board support
3. Install libraries:
   - ArduinoWebsockets
   - ArduinoJson
4. Open `ESP32_CAMERA_MAIN.ino`
5. Update WiFi credentials
6. Update CAMERA_ID if using multiple cameras
7. Flash to ESP32

**First Boot:**
```
Serial Monitor Output:
========================================
HeySalad Laura - ESP32-S3 AI Camera
========================================

Connecting to WiFi: YourNetwork
..........
✓ WiFi connected
IP Address: 192.168.1.100
Signal Strength: -55 dBm

✓ Camera initialized
Registering camera...
✓ Camera registered with UUID: a1b2c3d4-e5f6-7890-abcd-ef1234567890

Connecting to WebSocket...
✓ WebSocket connected
Joining channel: camera-CAM001
✓ Channel joined successfully

🎉 Camera is ONLINE and ready!

📊 Status update sent: online
```

### Multiple Cameras

To add more cameras:

1. **In Laura (Option A - UI):**
   - Not yet implemented
   - Coming soon: "Register Camera" button in dashboard

2. **In Laura (Option B - API):**
   ```bash
   curl -X POST https://laura.heysalad.app/api/cameras \
     -H "Content-Type: application/json" \
     -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -d '{
       "camera_id": "CAM002",
       "camera_name": "Kitchen Camera",
       "device_type": "esp32-s3-ai",
       "assigned_to": "Kitchen Station 2"
     }'
   ```

3. **Update ESP32 Code:**
   ```cpp
   const char* CAMERA_ID = "CAM002";  // Change this
   const char* CAMERA_NAME = "Kitchen Camera";
   ```

4. **Flash to new ESP32**

Each camera needs:
- Unique `camera_id`
- Own WebSocket channel: `camera-{camera_id}`
- Separate UUID in database

---

## Monitoring & Debugging

### Check Camera Status in Laura

```
1. Go to https://laura.heysalad.app/cameras
2. Look for your camera in the list
3. Status indicators:
   🟢 Online  - Camera connected and ready
   🔴 Offline - Camera disconnected
   🟡 Busy    - Camera processing command
   🔴 Error   - Camera encountered error
```

### ESP32 Serial Monitor

```
📩 Received: {"event":"broadcast","payload":{"type":"command"...}}
🎯 Command received: take_photo
   Command ID: cmd-1730203200000
📸 Taking photo for command: cmd-1730203200000
📸 Capturing photo...
✓ Photo captured: 128543 bytes
Uploading photo to: https://ybecdgbzgldafwvzwkpd.supabase.co/...
✓ Photo uploaded successfully
✓ Photo reported to Laura
📸 Photo notification sent
📊 Status update sent: online
```

### Common Issues

**Camera shows "Offline":**
- Check ESP32 WiFi connection
- Check WebSocket connection in serial monitor
- Verify Supabase credentials
- Check Supabase Realtime service status

**Commands not received:**
- Verify channel name: `camera-{CAMERA_ID}`
- Check WebSocket join message
- Ensure camera UUID matches in Laura

**Photos not uploading:**
- Check storage bucket exists: `camera-photos`
- Verify bucket is public
- Check ESP32 memory (heap)
- Verify Supabase Storage API keys

---

## Summary

### What You Built

A **production-ready, scalable, real-time camera control system** with:

- ✅ Web dashboard for controlling cameras
- ✅ ESP32 firmware for camera devices
- ✅ Real-time bidirectional communication
- ✅ Photo storage and gallery
- ✅ Command logging and history
- ✅ Status monitoring
- ✅ Multi-camera support
- ✅ Serverless architecture (scales automatically)

### Key Technologies

- **Frontend:** Next.js 16, React, TypeScript, Tailwind
- **Backend:** Next.js API Routes (Vercel serverless)
- **Database:** Supabase PostgreSQL
- **Realtime:** Supabase Realtime (WebSocket)
- **Storage:** Supabase Storage (S3-compatible)
- **IoT:** ESP32-S3, Arduino, C++

### Next Steps

1. ✅ Flash ESP32 with provided code
2. ✅ Watch camera go online in Laura
3. ✅ Test "Take Photo" command
4. ⬜ Add more cameras as needed
5. ⬜ Integrate with delivery workflow
6. ⬜ Add GPS/location tracking
7. ⬜ Implement video recording
8. ⬜ Add AI image analysis (future)

---

**Questions? Check:**
- [ESP32_API_REFERENCE.md](ESP32_API_REFERENCE.md) - Complete API docs
- [ESP32_QUICK_START.md](ESP32_QUICK_START.md) - Quick reference
- [ESP32_DEVICE.env](ESP32_DEVICE.env) - Configuration values
- [ESP32_CAMERA_MAIN.ino](ESP32_CAMERA_MAIN.ino) - Arduino code

You now have a complete understanding of the camera integration! 🎉
