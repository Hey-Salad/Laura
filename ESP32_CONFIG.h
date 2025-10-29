/*
 * HeySalad Laura - ESP32-S3 AI Camera Configuration
 *
 * Copy this file to your Arduino project and update:
 * - WiFi credentials
 * - Camera ID (register new cameras via Laura dashboard or API)
 */

#ifndef ESP32_CONFIG_H
#define ESP32_CONFIG_H

// ============================================================================
// WiFi Configuration
// ============================================================================
const char* WIFI_SSID = "YOUR_WIFI_NAME";           // Replace with your WiFi SSID
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";   // Replace with your WiFi password

// ============================================================================
// Supabase Configuration
// ============================================================================
const char* SUPABASE_URL = "https://ybecdgbzgldafwvzwkpd.supabase.co";
const char* SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliZWNkZ2J6Z2xkYWZ3dnp3a3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcxMDYwMTksImV4cCI6MjA0MjY4MjAxOX0.H4NkweM9hwVUYxpcaeLCQjs1KBXZfGH0dqCKlyx2S-U";

// Supabase Realtime WebSocket URL
const char* SUPABASE_REALTIME_URL = "wss://ybecdgbzgldafwvzwkpd.supabase.co/realtime/v1/websocket";

// ============================================================================
// Camera Configuration
// ============================================================================
const char* CAMERA_ID = "CAM001";                    // Unique camera ID (must exist in database)
const char* CAMERA_NAME = "HeySalad Camera 1";       // Human-readable name
const char* DEVICE_TYPE = "esp32-s3-ai";             // Device type identifier
const char* FIRMWARE_VERSION = "1.0.0";              // Your firmware version

// ============================================================================
// Laura API Endpoints (REST)
// ============================================================================
// Base URL for all API calls
const char* LAURA_BASE_URL = "https://laura.heysalad.app";

// Register/Update Camera
// POST to register new camera, GET to fetch camera info
const char* API_CAMERAS = "https://laura.heysalad.app/api/cameras";

// Upload Photos
// POST with: { photo_url, thumbnail_url, command_id, metadata }
// Note: Camera UUID will be fetched on startup
String API_PHOTOS_ENDPOINT = "/api/cameras/{camera_uuid}/photos";

// Fetch Camera Commands (polling fallback if WebSocket fails)
// GET command history
String API_COMMANDS_ENDPOINT = "/api/cameras/{camera_uuid}/command";

// ============================================================================
// Supabase Realtime Channel Configuration
// ============================================================================
// Channel name format: camera-{CAMERA_ID}
// This is where Laura sends commands and ESP32 listens
String getRealtimeChannelName() {
  return "camera-" + String(CAMERA_ID);
}

// ============================================================================
// Message Types (Supabase Realtime Events)
// ============================================================================
// Commands FROM Laura TO ESP32 (listen on "broadcast" event: "command")
// {
//   "type": "command",
//   "command": "take_photo" | "start_video" | "stop_video" | "get_status" | "reboot",
//   "command_id": "cmd-1234567890",
//   "timestamp": "2025-10-29T12:00:00Z",
//   "payload": { ... }
// }

// Status Updates FROM ESP32 TO Laura (broadcast on "status" event)
// {
//   "type": "status",
//   "camera_id": "CAM001",
//   "timestamp": "2025-10-29T12:00:00Z",
//   "data": {
//     "battery_level": 85,
//     "wifi_signal": -65,
//     "status": "online" | "offline" | "busy" | "error",
//     "location": { "lat": 6.5244, "lon": 3.3792 },
//     "free_heap": 245760
//   }
// }

// Photo Notifications FROM ESP32 TO Laura (broadcast on "photo" event)
// {
//   "type": "photo",
//   "command_id": "cmd-1234567890",
//   "timestamp": "2025-10-29T12:00:00Z",
//   "data": {
//     "photo_url": "https://...",
//     "thumbnail_url": "https://...",
//     "size_kb": 125,
//     "metadata": { ... }
//   }
// }

// ============================================================================
// Camera Settings
// ============================================================================
// Photo quality (0-100)
const int PHOTO_QUALITY = 85;

// Photo resolution
const int PHOTO_WIDTH = 1280;
const int PHOTO_HEIGHT = 720;

// Status update interval (milliseconds)
const unsigned long STATUS_UPDATE_INTERVAL = 30000; // 30 seconds

// Command timeout (milliseconds)
const unsigned long COMMAND_TIMEOUT = 10000; // 10 seconds

// ============================================================================
// Storage Configuration
// ============================================================================
// Supabase Storage bucket for photos
const char* STORAGE_BUCKET = "camera-photos";

// Storage API endpoint
// POST to upload: https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object/{bucket}/{path}
String STORAGE_UPLOAD_URL = "https://ybecdgbzgldafwvzwkpd.supabase.co/storage/v1/object/camera-photos/";

// ============================================================================
// Helper Functions
// ============================================================================

// Get full API endpoint with camera UUID
String getPhotosEndpoint(String cameraUUID) {
  String endpoint = API_PHOTOS_ENDPOINT;
  endpoint.replace("{camera_uuid}", cameraUUID);
  return String(LAURA_BASE_URL) + endpoint;
}

String getCommandsEndpoint(String cameraUUID) {
  String endpoint = API_COMMANDS_ENDPOINT;
  endpoint.replace("{camera_uuid}", cameraUUID);
  return String(LAURA_BASE_URL) + endpoint;
}

// Generate storage path for photo
// Format: {camera_id}/{year}/{month}/{timestamp}.jpg
String getStoragePath() {
  char filename[64];
  unsigned long timestamp = millis();
  snprintf(filename, sizeof(filename), "%s/%lu.jpg", CAMERA_ID, timestamp);
  return String(filename);
}

#endif // ESP32_CONFIG_H
