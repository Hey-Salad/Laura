# ESP32 LauraClient - Troubleshooting Guide

Quick solutions for common issues with your ESP32 camera integration.

---

## ❌ Issue: HTTP POST failed. Status: 308

### Problem
```
[Laura] HTTP POST https://laura.heysalad.app/api/cameras/ failed. Status: 308
[Laura] Camera registration request failed
```

### Cause
Trailing slash in API URL causes Next.js redirect.

### Solution
**In your code, ensure API_CAMERAS_URL has NO trailing slash:**

```cpp
// ❌ WRONG
const String API_CAMERAS_URL = "https://laura.heysalad.app/api/cameras/";
                                                                        ↑ Remove!

// ✅ CORRECT
const String API_CAMERAS_URL = "https://laura.heysalad.app/api/cameras";
```

**Update your `configure()` call:**
```cpp
laura.configure(
    CAMERA_ID,
    "https://laura.heysalad.app/api/cameras",  // NO trailing slash!
    STORAGE_URL,
    SUPABASE_ANON_KEY
);
```

**Test from terminal:**
```bash
# Should return 200 OK
curl https://laura.heysalad.app/api/cameras \
  -H "apikey: YOUR_KEY"
```

---

## ❌ Issue: Camera registration failed

### Problem
```
[Laura] ❌ Registration failed
```

### Possible Causes & Solutions

#### 1. Wrong API Key
**Check:** Is your Supabase anon key correct?

```cpp
const String SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

**Test:**
```bash
curl https://laura.heysalad.app/api/cameras \
  -H "apikey: YOUR_KEY"

# Should return: {"cameras":[...]}
# Not: {"error":"..."}
```

#### 2. WiFi Not Connected
**Check:** WiFi status before calling `configure()`

```cpp
if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Error] WiFi not connected!");
    return;
}
```

#### 3. HTTPS Certificate Issue
**Check:** ESP32 needs CA certificate for HTTPS

```cpp
#include <WiFiClientSecure.h>

WiFiClientSecure client;
client.setInsecure(); // For testing only! Use proper cert in production
```

#### 4. Firewall/Network Block
**Check:** Can ESP32 reach the internet?

```bash
# Test from same network
ping laura.heysalad.app
```

---

## ❌ Issue: Photo upload failed

### Problem
```
[Laura] ❌ Photo upload failed
```

### Solutions

#### 1. Check Storage Bucket Exists
Go to Supabase Dashboard → Storage → Check for `camera-photos` bucket

**If missing:**
1. Create bucket named `camera-photos`
2. Make it public (or configure RLS)

#### 2. Verify Storage URL Format
```cpp
// ✅ CORRECT
const String STORAGE_URL = "https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object";

// ❌ WRONG (includes bucket name)
const String STORAGE_URL = "https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object/camera-photos";
```

#### 3. Check Photo Size
ESP32 has limited memory. Keep photos < 200KB.

```cpp
// In your camera init
config.jpeg_quality = 85;  // Lower = smaller file
config.frame_size = FRAMESIZE_UXGA;  // 1600x1200
```

#### 4. Add Timeout
Long uploads may timeout.

```cpp
http.setTimeout(30000); // 30 seconds
```

---

## ❌ Issue: Not visible in Laura dashboard

### Problem
Camera doesn't appear at https://laura.heysalad.app/cameras

### Solutions

#### 1. Check Camera UUID
Must match what's in database.

```cpp
Serial.print("Camera UUID: ");
Serial.println(laura.getCameraUuid());
```

**Verify in Laura:**
```bash
curl https://laura.heysalad.app/api/cameras \
  -H "apikey: YOUR_KEY" | grep CAM001
```

Should show your camera with matching UUID.

#### 2. Use Existing Camera
For first test, use CAM001:

```cpp
const String CAMERA_ID = "CAM001";
const String CAMERA_UUID = "63b6ea55-cdd5-4244-84c4-ed07281ab2e4";
```

This is pre-registered in your database.

#### 3. Check Registration Response
```cpp
if (laura.ensureCameraRegistered()) {
    Serial.println("UUID: " + laura.getCameraUuid());
} else {
    Serial.println("Registration failed!");
}
```

---

## ❌ Issue: Status not updating in Laura

### Problem
Camera shows offline in Laura dashboard.

### Solutions

#### 1. WebSocket Not Connected
Check realtime URL is set:

```cpp
laura.setRealtimeUrl("wss://ybecdgbzgldafwvzwkpd.supabase.co/realtime/v1/websocket");
```

#### 2. Status Not Being Sent
Call `sendStatus()` periodically:

```cpp
void loop() {
    static unsigned long lastStatus = 0;

    if (millis() - lastStatus > 30000) {  // Every 30 seconds
        laura.sendStatus(85, WiFi.RSSI(), "online");
        lastStatus = millis();
    }
}
```

#### 3. Camera UUID Mismatch
Status updates use Camera UUID. Verify:

```cpp
Serial.println("Sending status for: " + laura.getCameraUuid());
```

---

## ❌ Issue: Compile errors

### Problem
```
error: 'LauraClient' does not name a type
```

### Solutions

#### 1. Check Header Include
```cpp
#include "LauraClient.h"
```

#### 2. Check Files in Same Directory
```
YourProject/
├── YourProject.ino
├── LauraClient.h
├── LauraClient.cpp
└── LauraClientConfig.h
```

#### 3. Add Library Dependencies
```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>  // If using JSON
```

---

## ✅ Verification Checklist

Before debugging, verify:

### Configuration
- [ ] WiFi SSID and password correct
- [ ] API URLs have NO trailing slashes
- [ ] Supabase anon key is complete
- [ ] Camera UUID matches database

### Network
- [ ] ESP32 connected to WiFi
- [ ] Can ping laura.heysalad.app
- [ ] Internet access working

### Laura Dashboard
- [ ] Can login to https://laura.heysalad.app
- [ ] Camera page loads: https://laura.heysalad.app/cameras
- [ ] Database has camera record

### Code
- [ ] `laura.isConfigured()` returns true
- [ ] `laura.canUpload()` returns true
- [ ] `ensureCameraRegistered()` succeeds
- [ ] Status updates called periodically

---

## 🧪 Test Sequence

Follow this to isolate the issue:

### 1. Test WiFi
```cpp
Serial.println(WiFi.status() == WL_CONNECTED ? "✓" : "✗");
Serial.println(WiFi.localIP());
```

### 2. Test Laura API (Manual)
```bash
curl https://laura.heysalad.app/api/cameras \
  -H "apikey: YOUR_KEY"
```

### 3. Test LauraClient Config
```cpp
laura.configure(...);
Serial.println(laura.isConfigured() ? "✓" : "✗");
```

### 4. Test Registration
```cpp
bool ok = laura.ensureCameraRegistered();
Serial.println(ok ? "✓" : "✗");
```

### 5. Test Photo Upload (Small File)
```cpp
uint8_t test[] = {0xFF, 0xD8, 0xFF, 0xE0};
String url;
bool ok = laura.uploadPhoto(test, sizeof(test), url);
Serial.println(ok ? "✓" : "✗");
Serial.println(url);
```

### 6. Test in Laura Dashboard
- Go to https://laura.heysalad.app/cameras
- Should see your camera
- Click "Take Photo"
- ESP32 should receive command

---

## 📊 Debug Output Template

Add this to see full diagnostics:

```cpp
void printDiagnostics() {
    Serial.println("\n═══ DIAGNOSTICS ═══");

    Serial.println("\n[WiFi]");
    Serial.print("  Status: ");
    Serial.println(WiFi.status() == WL_CONNECTED ? "✓ Connected" : "✗ Not Connected");
    Serial.print("  IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("  RSSI: ");
    Serial.println(WiFi.RSSI());

    Serial.println("\n[Laura Client]");
    Serial.print("  Configured: ");
    Serial.println(laura.isConfigured() ? "✓ YES" : "✗ NO");
    Serial.print("  Can Upload: ");
    Serial.println(laura.canUpload() ? "✓ YES" : "✗ NO");
    Serial.print("  Camera ID: ");
    Serial.println(laura.getCameraId());
    Serial.print("  Camera UUID: ");
    Serial.println(laura.getCameraUuid());

    Serial.println("\n[Memory]");
    Serial.print("  Free Heap: ");
    Serial.println(ESP.getFreeHeap());
    Serial.print("  Free PSRAM: ");
    Serial.println(ESP.getFreePsram());

    Serial.println("\n═══════════════════\n");
}
```

Call in `setup()` and before any operation.

---

## 🆘 Still Having Issues?

### Check These Files
- [ESP32_LAURA_CLIENT_CONFIG.h](ESP32_LAURA_CLIENT_CONFIG.h) - Correct configuration
- [ESP32_LAURA_CLIENT_EXAMPLE.ino](ESP32_LAURA_CLIENT_EXAMPLE.ino) - Working example
- [ESP32_FIX_308_ERROR.txt](ESP32_FIX_308_ERROR.txt) - 308 error fix

### Common Quick Fixes
1. **Remove trailing slashes** from ALL URLs
2. **Use CAM001** (pre-registered) for first test
3. **Check WiFi** is connected before any API call
4. **Increase timeout** to 30 seconds for uploads
5. **Reduce photo size** if memory errors

### View Logs in Laura
Once connected, go to:
- https://laura.heysalad.app/cameras
- Click on your camera
- View command history
- Check photo gallery

---

## ✅ Success Indicators

You'll know it's working when you see:

```
[Laura] ✓ Client configured
[Laura] ✓ Configuration valid
[Laura] ✓ Camera registered successfully
[Laura] Camera UUID: 63b6ea55-cdd5-4244-84c4-ed07281ab2e4
[Laura] ✓ Status sent
[Laura] ✓ Photo uploaded to storage
[Laura] ✓ Photo registered with Laura
```

And in Laura dashboard:
- Camera shows 🟢 **ONLINE**
- Battery and WiFi signal displayed
- "Take Photo" button works
- Photos appear in gallery

🎉 **You're ready to go!**
