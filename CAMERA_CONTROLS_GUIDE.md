# ESP32 Camera Controls Guide

Complete guide for LED/Night Vision, Sound Control, and Photo Saving features.

---

## 🎛️ New Features

### 1. LED / Night Vision Control
Toggle the built-in flash LED for better visibility in low light conditions.

**Commands:**
- `led_on` - Turn LED on
- `led_off` - Turn LED off
- `toggle_led` - Toggle LED state

**Hardware:**
- GPIO 4 (built-in flash LED on most ESP32-CAM boards)

### 2. Sound / Buzzer Control
Play sounds for notifications and alerts.

**Commands:**
- `play_sound` - Play a tone (customizable frequency and duration)

**Payload:**
```json
{
  "tone": "beep",
  "duration": 500,
  "frequency": 2000
}
```

**Hardware:**
- GPIO 2 (connect passive buzzer)
- Circuit: GPIO 2 → Buzzer+ → Buzzer- → GND

### 3. Save Photo to Database
Save the current frame from the live stream to permanent storage.

**Button:** "Save Frame" in Camera Controls

**What it does:**
1. Gets latest frame from in-memory storage
2. Uploads to Supabase Storage (`camera-photos` bucket)
3. Saves record to `camera_photos` table with metadata
4. Makes photo accessible in Photo Gallery

---

## 🎮 Dashboard Controls

### Camera Control Panel

Located on the left side when a camera is selected:

| Button | Icon | Action | Command |
|--------|------|--------|---------|
| **Take Photo** | 📷 | Captures and uploads a photo | `take_photo` |
| **Save Frame** | 💾 | Saves current stream frame to DB | API call to `/save-photo` |
| **Night Vision** | 💡 | Toggles LED for night vision | `toggle_led` |
| **Play Sound** | 🔊 | Plays beep on ESP32 | `play_sound` |
| **Start Video** | 🎥 | Starts video recording | `start_video` |
| **Stop Video** | ⏹️ | Stops video recording | `stop_video` |
| **Get Status** | 📊 | Requests status update | `get_status` |
| **Reboot** | 🔄 | Restarts ESP32 | `reboot` |

**Note:** All buttons are disabled when camera is offline.

---

## 🔧 ESP32 Hardware Setup

### Complete Wiring Diagram

```
ESP32-S3 AI Camera
├── Camera: OV2640 (built-in)
├── LED: GPIO 4 (built-in flash)
└── Buzzer: GPIO 2 (optional)
    ├── Buzzer+ → GPIO 2
    └── Buzzer- → GND
```

### LED (Night Vision)
Most ESP32-CAM boards have a built-in flash LED on GPIO 4. No additional wiring needed!

### Buzzer (Optional)
Connect a **passive buzzer** for sound features:

1. **Positive (+)** → GPIO 2
2. **Negative (-)** → GND

**Buzzer Type:** Use passive buzzer (not active). Passive buzzers can play different frequencies.

**Recommended:** 5V passive buzzer

---

## 📡 API Endpoints

### Save Photo
```
POST /api/cameras/[id]/save-photo
```

**Description:** Saves the latest frame to Supabase Storage and database

**Response:**
```json
{
  "success": true,
  "photo": {
    "id": "...",
    "camera_id": "...",
    "photo_url": "https://...",
    "taken_at": "2025-10-29T10:00:00.000Z",
    "metadata": {
      "size": 28672,
      "frame_age_ms": 125,
      "saved_via": "api"
    }
  },
  "message": "Photo saved successfully"
}
```

**Requirements:**
- Camera must be online and uploading frames
- Frame must be < 10 seconds old
- Supabase Storage bucket `camera-photos` must exist

---

## 🔌 ESP32 Code

### Complete Implementation

File: `ESP32_COMPLETE_WITH_CONTROLS.ino`

**Features:**
- Frame upload (5 FPS)
- Command polling (every 2 seconds)
- LED control
- Buzzer control
- Command execution and response
- Status updates (every 30 seconds)

### Configuration

```cpp
// WiFi
const char* WIFI_SSID = "YourWiFiName";
const char* WIFI_PASSWORD = "YourWiFiPassword";

// GPIO Pins
#define LED_PIN 4        // Flash LED
#define BUZZER_PIN 2     // Buzzer (optional)
```

### Command Handling Flow

```
1. Dashboard → Send Command → Laura API
2. Command stored in database (status: pending)
3. ESP32 polls /api/cameras/[id]/command (every 2s)
4. ESP32 receives command
5. ESP32 executes command (LED on, sound, etc.)
6. ESP32 sends response → Laura API
7. Command status updated to "completed"
```

### Sound Functions

```cpp
// Pre-defined sounds
playBeep();       // Short beep
playSuccess();    // Two-tone success
playError();      // Two-tone error

// Custom sound
playSound(duration, frequency);
playSound(500, 2000);  // 500ms at 2000Hz
```

### LED Functions

```cpp
ledOn();          // Turn LED on
ledOff();         // Turn LED off
toggleLed();      // Toggle LED state
```

---

## 🧪 Testing

### Test LED Control

1. Go to https://laura.heysalad.app/cameras
2. Select your camera
3. Click "Night Vision" button
4. LED should turn on (visible on ESP32 board)
5. Click again to turn off

**Serial Monitor:**
```
[Command] Received: toggle_led (ID: abc123)
[LED] ON (Night vision enabled)
[Command] ✓ Response sent: LED turned ON
```

### Test Sound

1. Click "Play Sound" button
2. ESP32 buzzer should beep for 500ms

**Serial Monitor:**
```
[Command] Received: play_sound (ID: def456)
[Sound] Playing 2000Hz for 500ms
[Sound] Done
[Command] ✓ Response sent: Sound played
```

### Test Save Photo

1. Ensure camera is streaming (frames uploading)
2. Click "Save Frame" button
3. Check Photo Gallery for new saved photo

**Serial Monitor:**
```
✓ Frame #125 | 28 KB | Success: 98.0%
```

**Browser Console:**
```
Photo saved to database successfully!
```

---

## 🐛 Troubleshooting

### LED Not Working

**Problem:** LED doesn't turn on when clicking Night Vision

**Solutions:**
1. Check GPIO pin number (usually GPIO 4)
2. Test LED manually:
   ```cpp
   digitalWrite(LED_PIN, HIGH);  // Should turn on
   ```
3. Verify ESP32-CAM board has built-in LED
4. Check command is being received in Serial Monitor

### Buzzer Not Working

**Problem:** No sound when clicking Play Sound

**Solutions:**
1. Verify buzzer is connected to GPIO 2
2. Check buzzer type (must be **passive buzzer**)
3. Test buzzer manually:
   ```cpp
   tone(BUZZER_PIN, 2000, 500);
   ```
4. Try different frequency (some buzzers only work in specific ranges)
5. Check buzzer polarity (+ to GPIO, - to GND)

### Save Photo Fails

**Problem:** "No recent frame available to save"

**Solutions:**
1. Check ESP32 is uploading frames:
   ```bash
   curl https://laura.heysalad.app/api/cameras/[id]/frame
   # Should return: {"hasFrame": true}
   ```
2. Verify camera is online in dashboard
3. Check Serial Monitor for upload success messages
4. Wait 1-2 seconds for frame to upload, then try save again

**Problem:** "Failed to upload photo"

**Solutions:**
1. Check Supabase Storage bucket exists: `camera-photos`
2. Verify bucket permissions allow public access
3. Check Supabase credentials in `.env.local`
4. Look at Vercel deployment logs for errors

### Commands Not Executing

**Problem:** Clicking buttons does nothing

**Solutions:**
1. Check camera status is "online" (buttons disabled if offline)
2. Verify ESP32 is polling for commands (Serial Monitor)
3. Check WiFi connection on ESP32
4. Restart ESP32 and wait for "READY TO STREAM" message
5. Check browser console for API errors

---

## 📊 Command Polling

ESP32 polls for commands every 2 seconds:

```cpp
void pollCommands() {
  // GET /api/cameras/[id]/command
  // If command exists:
  //   - Execute command
  //   - Send response
  //   - Update command status
}
```

**Polling Interval:**
- Current: 2000ms (2 seconds)
- Faster: 1000ms (more responsive, more bandwidth)
- Slower: 5000ms (less responsive, less bandwidth)

**Change polling interval:**
```cpp
const unsigned long COMMAND_POLL_INTERVAL = 2000;  // milliseconds
```

---

## 🎯 Use Cases

### Night Delivery Monitoring
1. Camera detects low light conditions
2. Dashboard operator clicks "Night Vision"
3. LED turns on for better visibility
4. Driver delivers package
5. Click "Save Frame" to capture delivery proof
6. LED turns off after delivery

### Quality Control Alert
1. Camera spots quality issue
2. Dashboard operator clicks "Play Sound"
3. ESP32 beeps to alert worker
4. Worker fixes issue
5. Click "Save Frame" to document resolution

### Time-lapse Photography
1. Set up camera at farm location
2. Every hour, click "Save Frame"
3. Collect photos in gallery
4. Create time-lapse of crop growth

---

## 🚀 Advanced Features

### Custom Sound Patterns

Add custom sounds in ESP32 code:

```cpp
void playSiren() {
  for (int i = 0; i < 3; i++) {
    tone(BUZZER_PIN, 1000);
    delay(200);
    tone(BUZZER_PIN, 2000);
    delay(200);
  }
  noTone(BUZZER_PIN);
}

// In executeCommand():
else if (commandType == "play_siren") {
  playSiren();
  success = true;
  message = "Siren played";
}
```

### LED Brightness Control

Use PWM for LED dimming:

```cpp
void setLedBrightness(int brightness) {
  // brightness: 0-255
  analogWrite(LED_PIN, brightness);
}

// In executeCommand():
else if (commandType == "set_led_brightness") {
  int brightness = payload["brightness"].as<int>();
  setLedBrightness(brightness);
  success = true;
  message = "LED brightness set to " + String(brightness);
}
```

### Auto Night Vision

Automatically turn on LED in low light:

```cpp
void autoNightVision() {
  camera_fb_t * fb = esp_camera_fb_get();

  // Calculate average brightness
  int brightness = calculateBrightness(fb);

  if (brightness < 50) {  // Dark
    ledOn();
  } else {
    ledOff();
  }

  esp_camera_fb_return(fb);
}
```

---

## 📝 Summary

✅ **LED Control** - Toggle night vision from dashboard
✅ **Sound Control** - Play alerts and notifications
✅ **Save Photos** - Capture stream frames to permanent storage
✅ **Command System** - Two-way communication ESP32 ↔ Laura
✅ **Live Monitoring** - Real-time control and feedback

**Next Steps:**
1. Flash `ESP32_COMPLETE_WITH_CONTROLS.ino` to your ESP32
2. Open https://laura.heysalad.app/cameras
3. Select your camera
4. Try all the control buttons!

**Files:**
- `ESP32_COMPLETE_WITH_CONTROLS.ino` - Complete Arduino code
- `/api/cameras/[id]/save-photo` - Photo save endpoint
- `CameraControl.tsx` - Dashboard UI with all buttons

Enjoy your fully-controlled AI camera! 🎥🎛️
