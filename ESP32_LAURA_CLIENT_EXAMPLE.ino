/*
 * HeySalad Laura - ESP32 Camera Integration Example
 * Using LauraClient class
 */

#include <WiFi.h>
#include "LauraClient.h"
#include "LauraClientConfig.h"

// ============================================================================
// GLOBALS
// ============================================================================

LauraClient laura;
unsigned long lastStatusUpdate = 0;
const unsigned long STATUS_INTERVAL = 30000; // 30 seconds

// ============================================================================
// SETUP
// ============================================================================

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n\n╔════════════════════════════════════════╗");
    Serial.println("║  HeySalad Laura - Camera System       ║");
    Serial.println("╚════════════════════════════════════════╝\n");

    // 1. Connect to WiFi
    connectWiFi();

    // 2. Setup LauraClient
    setupLauraClient(laura);

    // 3. Initialize your camera hardware
    // initCamera();

    // 4. Setup your HTTP server for local HTML interface
    // setupWebServer();

    Serial.println("\n╔════════════════════════════════════════╗");
    Serial.println("║          System Ready!                 ║");
    Serial.println("╚════════════════════════════════════════╝");
    Serial.println();
    Serial.println("🌐 Local: http://" + WiFi.localIP().toString());
    Serial.println("🌐 Laura: https://laura.heysalad.app/cameras");
    Serial.println();

    // Send initial status
    sendStatusToLaura(laura);
}

// ============================================================================
// LOOP
// ============================================================================

void loop() {
    // Handle your web server requests
    // server.handleClient();

    // Send periodic status updates to Laura
    if (millis() - lastStatusUpdate > STATUS_INTERVAL) {
        sendStatusToLaura(laura);
        lastStatusUpdate = millis();
    }

    delay(10);
}

// ============================================================================
// WIFI CONNECTION
// ============================================================================

void connectWiFi() {
    Serial.print("[WiFi] Connecting to: ");
    Serial.println(WIFI_SSID);

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println();
        Serial.println("[WiFi] ✓ Connected!");
        Serial.print("[WiFi] IP: ");
        Serial.println(WiFi.localIP());
        Serial.print("[WiFi] Signal: ");
        Serial.print(WiFi.RSSI());
        Serial.println(" dBm");
    } else {
        Serial.println();
        Serial.println("[WiFi] ❌ Connection failed!");
        Serial.println("[WiFi] Check your credentials and try again");
    }
}

// ============================================================================
// CAMERA CAPTURE (Your Implementation)
// ============================================================================

void handleCaptureButton() {
    Serial.println("\n[Camera] 📸 Capture button pressed");

    // 1. Capture photo from your camera
    // uint8_t* photoData = capturePhoto();
    // size_t photoSize = getPhotoSize();

    // For testing, simulate photo data
    uint8_t dummyPhoto[] = {0xFF, 0xD8, 0xFF, 0xE0}; // JPEG header
    size_t photoSize = sizeof(dummyPhoto);

    // 2. Upload to Laura
    if (captureAndUploadToLaura(laura, dummyPhoto, photoSize)) {
        Serial.println("[Camera] ✓ Photo sent to Laura successfully!");
        Serial.println("[Camera] View at: https://laura.heysalad.app/cameras");

        // 3. Optional: Show success on your HTML interface
        // displayUploadSuccess();
    } else {
        Serial.println("[Camera] ❌ Photo upload failed");

        // 4. Optional: Show error on your HTML interface
        // displayUploadError();
    }
}

// ============================================================================
// EXAMPLE: Integrate with your HTML button
// ============================================================================

/*
In your web server handler, when user clicks "Capture" button:

server.on("/capture", HTTP_GET, []() {
    handleCaptureButton();
    server.send(200, "text/plain", "Photo captured and sent to Laura");
});
*/

// ============================================================================
// DEBUGGING
// ============================================================================

void printLauraConfig() {
    Serial.println("\n[Debug] LauraClient Configuration:");
    Serial.print("  Camera ID: ");
    Serial.println(laura.getCameraId());
    Serial.print("  Camera UUID: ");
    Serial.println(laura.getCameraUuid());
    Serial.print("  Is Configured: ");
    Serial.println(laura.isConfigured() ? "YES" : "NO");
    Serial.print("  Can Upload: ");
    Serial.println(laura.canUpload() ? "YES" : "NO");
}

// ============================================================================
// EXPECTED SERIAL OUTPUT
// ============================================================================

/*
╔════════════════════════════════════════╗
║  HeySalad Laura - Camera System       ║
╚════════════════════════════════════════╝

[WiFi] Connecting to: YourNetwork
..........
[WiFi] ✓ Connected!
[WiFi] IP: 192.168.1.124
[WiFi] Signal: -55 dBm

[Laura] Configuring client...
[Laura] ✓ Client configured
[Laura] ✓ Configuration valid
[Laura] Testing camera registration...
[Laura] ✓ Camera registered successfully
[Laura] Camera UUID: 63b6ea55-cdd5-4244-84c4-ed07281ab2e4

╔════════════════════════════════════════╗
║          System Ready!                 ║
╚════════════════════════════════════════╝

🌐 Local: http://192.168.1.124
🌐 Laura: https://laura.heysalad.app/cameras

[Laura] Sending status update...
[Laura] ✓ Status sent

--- When you click "Capture" ---

[Camera] 📸 Capture button pressed
[Laura] Starting photo upload...
[Laura] ✓ Photo uploaded to storage
[Laura] URL: https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object/public/camera-photos/CAM001/1730456789.jpg
[Laura] ✓ Photo registered with Laura
[Laura] 🎉 Photo upload complete!
[Camera] ✓ Photo sent to Laura successfully!
[Camera] View at: https://laura.heysalad.app/cameras
*/
