# HeySalad Dual-Camera IoT Ecosystem

Complete guide for operating two ESP32 cameras together in one unified system.

---

## 📱 The Two Devices

### Device 1: Arduino ESP32-S3 Kitchen Assistant
**Location:** `/Users/chilumbam/heysalad-kitchen-assistant/`
**Framework:** C++ with Arduino (PlatformIO)
**Hardware:** DFRobot DFR1154 ESP32-S3 AI Camera

**Specifications:**
- **Camera:** OV2640
- **Audio:** I2S Microphone + Speaker
- **IR LED:** GPIO 47 (infrared)
- **Connectivity:** WiFi + Cellular (SIM800L)
- **Power:** Battery monitoring

**Capabilities:**
- ✅ Voice AI with Laura (OpenAI Realtime API)
- ✅ Two-way audio conversations
- ✅ Camera streaming (MJPEG)
- ✅ Frame upload to Laura (5 FPS)
- ✅ Photo capture & upload to Supabase
- ✅ Power management
- ✅ Status updates every 60s
- ✅ P2P API client (talks to Display Camera)

**Camera ID:** `CAM001`
**UUID:** `63b6ea55-cdd5-4244-84c4-ed07281ab2e4`
**Local Stream:** `http://192.168.1.124/stream`

---

### Device 2: CircuitPython ESP32-S3 Display Camera
**Location:** `/Volumes/CIRCUITPY/`
**Framework:** CircuitPython
**Hardware:** ESP32-S3 with GC9A01 Round Display

**Specifications:**
- **Display:** GC9A01 Round (240x240)
- **Camera:** OV3660
- **LED:** GPIO D2 (night vision)
- **Buzzer:** GPIO D4 (alerts)
- **Connectivity:** WiFi + BLE

**Capabilities:**
- ✅ Visual feedback (colored display states)
- ✅ Camera streaming with display preview
- ✅ Frame upload to Laura (JPEG binary)
- ✅ 10 remote commands (LED, buzzer, camera)
- ✅ Command polling from Laura (every 2s)
- ✅ P2P API server (receives from Kitchen Assistant)
- ✅ BLE mobile connectivity
- ✅ Location simulation (5 Berlin neighborhoods)

**Camera ID:** `CAM_CP_001` (or similar)
**UUID:** `[Your CircuitPython camera UUID]`

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│              HEYSALAD DUAL-CAMERA ECOSYSTEM                  │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────┐       P2P API        ┌──────────────────────┐
│  Kitchen Assistant  │◄────────────────────►│   Display Camera     │
│  ESP32-S3 (C++)     │                      │   ESP32-S3 (Python)  │
├─────────────────────┤                      ├──────────────────────┤
│ • Voice AI         │                      │ • Round Display      │
│ • Audio I/O        │                      │ • Visual States      │
│ • OV2640 Camera    │                      │ • OV3660 Camera      │
│ • IR LED           │                      │ • LED Control        │
│ • Battery Monitor  │                      │ • Buzzer Alerts      │
│ • SIM800L Cellular │                      │ • BLE Mobile         │
└─────────────────────┘                      └──────────────────────┘
         │                                              │
         │  HTTPS                                       │  HTTPS
         │  • Frame Upload (5 FPS)                     │  • Frame Upload (5 FPS)
         │  • Status Updates (60s)                     │  • Command Poll (2s)
         │  • Photo Upload                             │  • Command Ack
         │                                              │
         └──────────────────┬──────────────────────────┘
                            │
                            ▼
           ┌────────────────────────────────┐
           │  laura.heysalad.app            │
           │  Unified Dashboard             │
           ├────────────────────────────────┤
           │ • Multi-Camera View            │
           │ • MJPEG Streaming (both)       │
           │ • Remote Commands              │
           │ • Photo Gallery (both)         │
           │ • Status Monitoring            │
           │ • Individual Controls          │
           └────────────────────────────────┘
                            │
                            ▼
           ┌────────────────────────────────┐
           │  Supabase Backend              │
           ├────────────────────────────────┤
           │ • PostgreSQL (cameras)         │
           │ • PostgreSQL (camera_commands) │
           │ • Storage (photos)             │
           │ • Real-time Updates            │
           └────────────────────────────────┘
```

---

## 🔄 How They Work Together

### Scenario 1: Smart Kitchen Voice + Visual
**Flow:**
1. User asks Kitchen Assistant: "Laura, what's in my fridge?"
2. Kitchen Assistant:
   - Captures audio → OpenAI Realtime API
   - Captures video frame → Laura API
   - Sends P2P request to Display Camera:
     ```
     POST http://192.168.1.X/api/peer/display
     {
       "laura_state": "listening",
       "message": "Analyzing fridge..."
     }
     ```
3. Display Camera:
   - Updates display to YELLOW (listening state)
   - Also captures frame → Laura API
4. Laura Dashboard:
   - Shows both camera streams side-by-side
   - AI analyzes both perspectives
5. Response displayed on both devices

### Scenario 2: Remote Night Vision Control
**Flow:**
1. Operator at https://laura.heysalad.app/cameras
2. Sees both cameras:
   - "Kitchen Assistant CAM001"
   - "Display Camera CAM_CP_001"
3. Clicks "Night Vision" on Display Camera
4. Laura sends command:
   ```
   POST /api/cameras/[uuid]/command
   {
     "command_type": "toggle_led",
     "payload": {}
   }
   ```
5. Command stored in `camera_commands` table (status: pending)
6. Display Camera polls (every 2s):
   ```
   GET /api/cameras/[uuid]/commands
   → Returns: [{"id": "...", "type": "toggle_led", "params": {}}]
   ```
7. Display Camera executes → LED turns ON
8. Display Camera acknowledges:
   ```
   POST /api/cameras/[uuid]/commands/[cmd_id]
   {
     "status": "completed",
     "result": {"led_state": true}
   }
   ```
9. Both cameras now stream with better lighting
10. Operator clicks "Save Frame" on both → Photos saved

### Scenario 3: Delivery Documentation
**Flow:**
1. Delivery driver arrives
2. Kitchen Assistant detects motion (IR LED)
3. Automatically triggers Display Camera via P2P
4. Both cameras capture frames
5. Dashboard operator clicks "Save Frame" on both
6. Photos saved with metadata:
   - Timestamp
   - Location (Berlin Alexanderplatz)
   - Camera ID
   - Frame size
7. Photos appear in unified gallery

---

## 📡 Laura API Endpoints

### Common to Both Devices

#### Frame Upload
```
POST /api/cameras/[id]/frame
Content-Type: image/jpeg
apikey: [SUPABASE_ANON_KEY]

[BINARY JPEG DATA]
```

#### Status Update
```
POST /api/cameras/[id]/status
Content-Type: application/json

{
  "status": "online",
  "battery_level": 100,
  "wifi_signal": -38,
  "location_lat": 52.5219,
  "location_lon": 13.4132,
  "metadata": {
    "device_type": "kitchen_assistant", // or "display_camera"
    "firmware_version": "1.0.0",
    "led_state": "on"
  }
}
```

#### Camera Registration
```
POST /api/cameras
Content-Type: application/json

{
  "camera_id": "CAM001",
  "camera_name": "Kitchen Assistant",
  "device_type": "esp32-s3-ai",
  "assigned_to": "HeySalad Berlin Alexanderplatz",
  "metadata": {
    "hardware": "DFRobot DFR1154",
    "capabilities": ["voice", "audio", "cellular"]
  }
}
```

#### Streaming (Dashboard Consumes)
```
GET /api/cameras/[id]/stream     // MJPEG multipart
GET /api/cameras/[id]/snapshot   // Single JPEG
```

---

### CircuitPython-Specific Endpoints

#### Command Polling (NEW!)
```
GET /api/cameras/[id]/commands

Response:
{
  "commands": [
    {
      "id": "abc-123",
      "type": "toggle_led",
      "params": {},
      "created_at": "2025-10-29T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### Command Acknowledgment (NEW!)
```
POST /api/cameras/[id]/commands/[cmd_id]
Content-Type: application/json

{
  "status": "completed",    // or "failed"
  "result": {
    "led_state": true,
    "message": "LED turned on"
  }
}
```

---

## 🎮 Dashboard Views

### Multi-Camera View
Visit: https://laura.heysalad.app/cameras

**Camera List shows:**
```
Cameras (2)
┌─────────────────────────────┐
│ Kitchen Assistant CAM001    │
│ 🟢 Online • 100% • -38 dBm │
│ 📍 52.52, 13.41             │
└─────────────────────────────┘

┌─────────────────────────────┐
│ Display Camera CAM_CP_001   │
│ 🟢 Online • N/A • -42 dBm   │
│ 📍 52.52, 13.41             │
└─────────────────────────────┘
```

**Controls (vary by device):**

Kitchen Assistant:
- 📷 Take Photo
- 💾 Save Frame
- 📊 Get Status
- 🔄 Reboot

Display Camera:
- 📷 Take Photo
- 💾 Save Frame
- 💡 Night Vision (LED)
- 🔊 Play Sound
- 📊 Get Status
- 🔄 Reboot

---

## 🔧 Setup Instructions

### Step 1: Register Both Cameras

**Kitchen Assistant:**
Already registered with UUID: `63b6ea55-cdd5-4244-84c4-ed07281ab2e4`

**Display Camera:**
Run registration on first boot (CircuitPython device does this automatically)

### Step 2: Configure Camera Metadata

Update each camera with specific capabilities:

```bash
# Kitchen Assistant
curl -X POST https://laura.heysalad.app/api/cameras \
  -H "Content-Type: application/json" \
  -d '{
    "camera_id": "CAM001",
    "camera_name": "Kitchen Assistant",
    "metadata": {
      "device_type": "kitchen_assistant",
      "capabilities": ["voice_ai", "audio", "cellular", "ir_led"],
      "hardware": "DFRobot DFR1154"
    }
  }'

# Display Camera
curl -X POST https://laura.heysalad.app/api/cameras \
  -H "Content-Type: application/json" \
  -d '{
    "camera_id": "CAM_CP_001",
    "camera_name": "Display Camera",
    "metadata": {
      "device_type": "display_camera",
      "capabilities": ["display", "led", "buzzer", "ble"],
      "hardware": "ESP32-S3 + GC9A01"
    }
  }'
```

### Step 3: Test Frame Upload

**Kitchen Assistant:**
```bash
# Check frames are uploading
curl https://laura.heysalad.app/api/cameras/63b6ea55-cdd5-4244-84c4-ed07281ab2e4/frame

# Should return:
{"hasFrame": true, "frameAge": 125, "frameAgeSeconds": 0.125}
```

**Display Camera:**
```bash
# Check frames are uploading
curl https://laura.heysalad.app/api/cameras/[display_camera_uuid]/frame

# Should return:
{"hasFrame": true, "frameAge": 89, "frameAgeSeconds": 0.089}
```

### Step 4: Test Command Polling (Display Camera)

```bash
# Send command from dashboard or API
curl -X POST https://laura.heysalad.app/api/cameras/[display_uuid]/command \
  -H "Content-Type: application/json" \
  -d '{"command_type": "toggle_led", "payload": {}}'

# Display Camera polls and executes
# Check device terminal:
[Command] Received: toggle_led
[LED] ON
[Command] ✓ Acknowledged
```

---

## 📊 Feature Comparison

| Feature | Kitchen Assistant | Display Camera |
|---------|------------------|----------------|
| **Voice AI** | ✅ Laura/OpenAI | ❌ |
| **Display** | ❌ | ✅ 240x240 Round |
| **Camera** | ✅ OV2640 | ✅ OV3660 |
| **Audio I/O** | ✅ Mic + Speaker | ❌ |
| **LED Control** | ❌ (IR only) | ✅ GPIO D2 |
| **Buzzer** | ❌ | ✅ GPIO D4 |
| **Frame Upload** | ✅ 5 FPS | ✅ 5 FPS |
| **Remote Commands** | ⚠️ Limited | ✅ Full (10 types) |
| **BLE** | ❌ | ✅ |
| **Cellular** | ✅ SIM800L | ❌ |
| **Battery Monitor** | ✅ | ❌ |
| **P2P API** | ✅ Client | ✅ Server |
| **Local Stream** | ✅ | ✅ |
| **Command Polling** | ❌ | ✅ Every 2s |

---

## 🧪 Testing Multi-Camera System

### Test 1: Simultaneous Streaming
1. Open https://laura.heysalad.app/cameras
2. Open Kitchen Assistant stream in one tab
3. Open Display Camera stream in another tab
4. ✅ Both should stream live video at ~5 FPS

### Test 2: Coordinated Control
1. Send command to Display Camera: "Night Vision"
2. LED turns on
3. Both camera streams should show improved lighting
4. Click "Save Frame" on both
5. ✅ Two photos saved from same moment

### Test 3: P2P Communication
1. Trigger Kitchen Assistant voice command
2. Kitchen Assistant sends P2P request to Display Camera
3. Display Camera updates display state
4. ✅ Visual feedback on Display Camera matches Kitchen Assistant state

### Test 4: Independent Operation
1. Disconnect Display Camera from WiFi
2. Kitchen Assistant should continue working
3. Reconnect Display Camera
4. ✅ Both resume normal operation independently

---

## 🐛 Troubleshooting

### Kitchen Assistant Not Streaming

**Check:**
```bash
# Is it uploading frames?
curl https://laura.heysalad.app/api/cameras/63b6ea55-cdd5-4244-84c4-ed07281ab2e4/frame

# Can you get a snapshot?
curl https://laura.heysalad.app/api/cameras/63b6ea55-cdd5-4244-84c4-ed07281ab2e4/snapshot > test.jpg
```

**Solutions:**
- Check device serial monitor for upload errors
- Verify WiFi connection
- Check frame upload code is enabled
- Restart device

### Display Camera 404 on Commands

**Was:** Getting 404 because endpoint was `/command` (singular)
**Now Fixed:** Created `/commands` (plural) endpoint

**Test:**
```bash
curl https://laura.heysalad.app/api/cameras/[display_uuid]/commands

# Should return:
{"commands": [], "count": 0}
```

### Commands Not Executing

**Check CircuitPython device terminal:**
```python
# Should see every 2 seconds:
[Poll] Checking for commands...
[Poll] 0 pending commands
```

**If not polling:**
- Check WiFi connection
- Verify camera UUID is correct
- Check API credentials

**If polling but not executing:**
- Send test command from dashboard
- Check terminal for command receipt
- Verify command type is supported

### Cameras Show as Offline

**Check status updates:**
```bash
# Kitchen Assistant updates every 60s
# Display Camera updates every 30s (or as configured)

# Check database:
curl https://laura.heysalad.app/api/cameras/[uuid]/status
```

**Solutions:**
- Verify status update code is running
- Check WiFi connectivity
- Look for HTTP errors in device terminal
- Restart devices

---

## 🚀 Next Steps

### 1. Add More Cameras
The system supports unlimited cameras! Just:
- Register new camera with unique `camera_id`
- Configure frame upload
- Add to dashboard

### 2. Implement Mobile App
Use Display Camera's BLE for mobile connectivity:
- Direct BLE control without WiFi
- Offline operation
- Local notifications

### 3. Add AI Analysis
Process frames from both cameras:
- Object detection
- Quality control
- Motion tracking
- Scene understanding

### 4. Create Automation Rules
```javascript
// Example: If motion detected on Kitchen Assistant
if (kitchenAssistant.motionDetected) {
  // Trigger Display Camera LED
  displayCamera.sendCommand('led_on');

  // Save frames from both
  kitchenAssistant.saveFrame();
  displayCamera.saveFrame();
}
```

---

## 📝 Summary

You now have a complete dual-camera IoT ecosystem with:

✅ **Two specialized ESP32 devices** working together
✅ **Unified Laura dashboard** controlling both
✅ **Real-time streaming** from both cameras (5 FPS)
✅ **Remote commands** with acknowledgment
✅ **Device-to-device P2P** communication
✅ **Multiple connectivity** options (WiFi/BLE/Cellular)
✅ **Centralized photo gallery** from both devices
✅ **Production-ready architecture**

**Total System Capabilities:**
- 2x Cameras (OV2640 + OV3660)
- Voice AI (Kitchen Assistant)
- Visual display (Display Camera)
- LED + Buzzer control
- Audio I/O
- Remote commands
- Frame upload (10 FPS combined)
- P2P coordination
- Mobile BLE access
- Cellular backup

This is a **professional-grade multi-camera IoT system**! 🎉🎥

**Dashboard:** https://laura.heysalad.app/cameras

---

## 🔗 Related Documentation

- [STREAMING_ARCHITECTURE.md](STREAMING_ARCHITECTURE.md) - Frame upload details
- [CAMERA_CONTROLS_GUIDE.md](CAMERA_CONTROLS_GUIDE.md) - LED, sound, photo saving
- [ESP32_COMPLETE_WITH_CONTROLS.ino](ESP32_COMPLETE_WITH_CONTROLS.ino) - Arduino code
- Kitchen Assistant project: `/Users/chilumbam/heysalad-kitchen-assistant/`
- CircuitPython project: `/Volumes/CIRCUITPY/`
