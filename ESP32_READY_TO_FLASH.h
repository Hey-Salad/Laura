/*
 * HeySalad Laura - ESP32-S3 Camera Configuration
 * READY TO FLASH - Just update WiFi credentials
 *
 * All API keys and endpoints pre-configured for your deployment
 */

#ifndef ESP32_READY_TO_FLASH_H
#define ESP32_READY_TO_FLASH_H

// ============================================================================
// 🔧 CONFIGURE THESE - WiFi Credentials
// ============================================================================
const char* WIFI_SSID = "YOUR_WIFI_NAME";           // ← CHANGE THIS
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";   // ← CHANGE THIS

// ============================================================================
// 📡 Supabase Configuration (Pre-configured)
// ============================================================================
const char* SUPABASE_URL = "https://ybecdgbzgldafwvzwkpd.supabase.co";
const char* SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliZWNkZ2J6Z2xkYWZ3dnp3a3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcxMDYwMTksImV4cCI6MjA0MjY4MjAxOX0.H4NkweM9hwVUYxpcaeLCQjs1KBXZfGH0dqCKlyx2S-U";

// WebSocket URL for real-time communication
const char* SUPABASE_REALTIME_WS = "wss://ybecdgbzgldafwvzwkpd.supabase.co/realtime/v1/websocket";

// ============================================================================
// 📷 Camera Configuration
// ============================================================================
// OPTION 1: Use existing camera CAM001 (recommended for first test)
const char* CAMERA_ID = "CAM001";
const char* CAMERA_UUID = "63b6ea55-cdd5-4244-84c4-ed07281ab2e4";  // Already registered

// OPTION 2: Create new camera (comment out above, uncomment below)
// const char* CAMERA_ID = "CAM002";  // Change this for each new camera
// const char* CAMERA_UUID = "";      // Will be fetched on first boot

const char* CAMERA_NAME = "HeySalad Camera 1";
const char* DEVICE_TYPE = "esp32-s3-ai";
const char* FIRMWARE_VERSION = "1.0.0";

// ============================================================================
// 🌐 Laura API Endpoints (Pre-configured)
// ============================================================================
const char* LAURA_BASE_URL = "https://laura.heysalad.app";

// REST API Endpoints
const char* API_CAMERAS = "https://laura.heysalad.app/api/cameras";

// Camera-specific endpoints (UUID will be inserted)
// POST https://laura.heysalad.app/api/cameras/{CAMERA_UUID}/photos
// POST https://laura.heysalad.app/api/cameras/{CAMERA_UUID}/command

// ============================================================================
// 📦 Supabase Storage Configuration
// ============================================================================
const char* STORAGE_BUCKET = "camera-photos";
const char* STORAGE_BASE_URL = "https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object";

// Upload endpoint: POST {STORAGE_BASE_URL}/camera-photos/{path}
// Public URL format: {STORAGE_BASE_URL}/public/camera-photos/{path}

// ============================================================================
// 🔌 WebSocket Channel Configuration
// ============================================================================
// Channel format: camera-{CAMERA_ID}
// Example: camera-CAM001
String getRealtimeChannelName() {
  return "camera-" + String(CAMERA_ID);
}

// Full WebSocket connection URL with API key
String getWebSocketURL() {
  return String(SUPABASE_REALTIME_WS) + "?apikey=" + String(SUPABASE_ANON_KEY) + "&vsn=1.0.0";
}

// ============================================================================
// 📸 Camera Settings
// ============================================================================
const int PHOTO_QUALITY = 85;         // JPEG quality (0-100)
const int PHOTO_WIDTH = 1280;         // Image width
const int PHOTO_HEIGHT = 720;         // Image height

// Status update interval (milliseconds)
const unsigned long STATUS_UPDATE_INTERVAL = 30000;  // 30 seconds

// Command timeout (milliseconds)
const unsigned long COMMAND_TIMEOUT = 10000;  // 10 seconds

// ============================================================================
// 🛠️ Helper Functions
// ============================================================================

// Get full API endpoint for uploading photos
String getPhotosEndpoint() {
  return String(LAURA_BASE_URL) + "/api/cameras/" + String(CAMERA_UUID) + "/photos";
}

// Get full API endpoint for command history
String getCommandsEndpoint() {
  return String(LAURA_BASE_URL) + "/api/cameras/" + String(CAMERA_UUID) + "/command";
}

// Generate storage path for photo upload
// Format: CAM001/timestamp.jpg
String getStoragePath() {
  unsigned long timestamp = millis();
  return String(CAMERA_ID) + "/" + String(timestamp) + ".jpg";
}

// Get public URL for uploaded photo
String getPublicPhotoURL(String storagePath) {
  return String(STORAGE_BASE_URL) + "/public/" + String(STORAGE_BUCKET) + "/" + storagePath;
}

// Get upload URL for Supabase Storage
String getStorageUploadURL(String storagePath) {
  return String(STORAGE_BASE_URL) + "/" + String(STORAGE_BUCKET) + "/" + storagePath;
}

// ============================================================================
// 📋 API Request Headers Helper
// ============================================================================

// Add standard headers to HTTP request
void addSupabaseHeaders(HTTPClient& http) {
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
}

void addJSONHeaders(HTTPClient& http) {
  http.addHeader("Content-Type", "application/json");
  addSupabaseHeaders(http);
}

void addImageHeaders(HTTPClient& http) {
  http.addHeader("Content-Type", "image/jpeg");
  addSupabaseHeaders(http);
}

// ============================================================================
// ℹ️  Quick Reference
// ============================================================================

/*
ENDPOINTS YOUR ESP32 WILL USE:

1. Register Camera (on first boot if CAMERA_UUID is empty):
   POST https://laura.heysalad.app/api/cameras
   Body: { "camera_id": "CAM001", "camera_name": "HeySalad Camera 1" }
   Response: { "camera": { "id": "uuid-here" } }

2. Upload Photo to Storage:
   POST https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object/camera-photos/CAM001/123456.jpg
   Headers: apikey, Authorization, Content-Type: image/jpeg
   Body: [JPEG bytes]

3. Register Photo in Database:
   POST https://laura.heysalad.app/api/cameras/{uuid}/photos
   Body: { "photo_url": "https://...", "command_id": "cmd-123" }

4. Send Status Update via WebSocket:
   Channel: camera-CAM001
   Event: broadcast -> status
   Payload: { "battery_level": 85, "wifi_signal": -65, "status": "online" }

5. Receive Commands via WebSocket:
   Channel: camera-CAM001
   Event: broadcast -> command
   Payload: { "command": "take_photo", "command_id": "cmd-123" }

WEBSOCKET CONNECTION:
  wss://ybecdgbzgldafwvzwkpd.supabase.co/realtime/v1/websocket?apikey={key}&vsn=1.0.0

VIEW IN LAURA:
  https://laura.heysalad.app/cameras
*/

#endif // ESP32_READY_TO_FLASH_H
