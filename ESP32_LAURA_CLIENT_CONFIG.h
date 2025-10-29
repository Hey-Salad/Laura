/*
 * LauraClient Configuration for HeySalad
 * Drop-in configuration for your ESP32 camera
 */

#ifndef LAURA_CLIENT_CONFIG_H
#define LAURA_CLIENT_CONFIG_H

#include "LauraClient.h"

// ============================================================================
// 🔧 CONFIGURATION - UPDATE WiFi ONLY
// ============================================================================

// WiFi Credentials (UPDATE THESE)
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ============================================================================
// 📡 LAURA & SUPABASE - PRE-CONFIGURED (Don't change)
// ============================================================================

// Camera Identity
const String CAMERA_ID = "CAM001";
const String CAMERA_UUID = "63b6ea55-cdd5-4244-84c4-ed07281ab2e4";

// Laura API (NO TRAILING SLASHES!)
const String API_CAMERAS_URL = "https://laura.heysalad.app/api/cameras";

// Supabase Storage
const String STORAGE_URL = "https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object";

// Supabase Anon Key
const String SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliZWNkZ2J6Z2xkYWZ3dnp3a3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcxMDYwMTksImV4cCI6MjA0MjY4MjAxOX0.H4NkweM9hwVUYxpcaeLCQjs1KBXZfGH0dqCKlyx2S-U";

// WebSocket Realtime URL
const String REALTIME_URL = "wss://ybecdgbzgldafwvzwkpd.supabase.co/realtime/v1/websocket";

// ============================================================================
// 🎯 SETUP FUNCTION
// ============================================================================

void setupLauraClient(LauraClient& laura) {
    Serial.println("\n[Laura] Configuring client...");

    // Configure LauraClient
    laura.configure(
        CAMERA_ID,           // Camera ID
        API_CAMERAS_URL,     // API endpoint (NO trailing slash!)
        STORAGE_URL,         // Storage base URL
        SUPABASE_ANON_KEY    // Supabase key
    );

    laura.setRealtimeUrl(REALTIME_URL);
    laura.setCameraUuid(CAMERA_UUID);
    laura.setLogger(&Serial);

    Serial.println("[Laura] ✓ Client configured");

    // Verify configuration
    if (!laura.isConfigured()) {
        Serial.println("[Laura] ❌ Configuration incomplete!");
        return;
    }

    Serial.println("[Laura] ✓ Configuration valid");

    // Test registration
    Serial.println("[Laura] Testing camera registration...");
    if (laura.ensureCameraRegistered()) {
        Serial.println("[Laura] ✓ Camera registered successfully");
        Serial.print("[Laura] Camera UUID: ");
        Serial.println(laura.getCameraUuid());
    } else {
        Serial.println("[Laura] ❌ Registration failed");
        Serial.println("[Laura] Check:");
        Serial.println("  1. API URL has NO trailing slash");
        Serial.println("  2. Supabase key is correct");
        Serial.println("  3. Internet connection is stable");
    }
}

// ============================================================================
// 📸 HELPER FUNCTIONS
// ============================================================================

// Upload photo and notify Laura
bool captureAndUploadToLaura(LauraClient& laura, const uint8_t* photoData, size_t photoSize) {
    Serial.println("\n[Laura] Starting photo upload...");

    // 1. Upload to Supabase Storage
    String publicUrl;
    if (!laura.uploadPhoto(photoData, photoSize, publicUrl)) {
        Serial.println("[Laura] ❌ Photo upload failed");
        return false;
    }

    Serial.println("[Laura] ✓ Photo uploaded to storage");
    Serial.print("[Laura] URL: ");
    Serial.println(publicUrl);

    // 2. Notify Laura API
    if (!laura.notifyPhoto(publicUrl, "")) {
        Serial.println("[Laura] ❌ Photo notification failed");
        return false;
    }

    Serial.println("[Laura] ✓ Photo registered with Laura");
    Serial.println("[Laura] 🎉 Photo upload complete!");
    return true;
}

// Send status update to Laura
bool sendStatusToLaura(LauraClient& laura) {
    int batteryPercent = 85;  // TODO: Read actual battery level
    int wifiRssi = WiFi.RSSI();
    String status = "online";

    Serial.println("\n[Laura] Sending status update...");
    if (laura.sendStatus(batteryPercent, wifiRssi, status)) {
        Serial.println("[Laura] ✓ Status sent");
        return true;
    } else {
        Serial.println("[Laura] ❌ Status send failed");
        return false;
    }
}

// ============================================================================
// 📋 ENDPOINT REFERENCE
// ============================================================================

/*
YOUR LAURA CLIENT WILL USE:

1. REGISTER CAMERA:
   POST https://laura.heysalad.app/api/cameras
   → ensureCameraRegistered()

2. UPLOAD PHOTO:
   POST https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object/camera-photos/CAM001/{timestamp}.jpg
   → uploadPhoto()

3. NOTIFY PHOTO:
   POST https://laura.heysalad.app/api/cameras/63b6ea55-cdd5-4244-84c4-ed07281ab2e4/photos
   → notifyPhoto()

4. SEND STATUS:
   Via WebSocket channel "camera-CAM001"
   → sendStatus()

VIEW IN LAURA:
https://laura.heysalad.app/cameras
*/

#endif // LAURA_CLIENT_CONFIG_H
