# Set Camera Location - HeySalad Berlin Alexanderplatz

Quick guide to set your camera's location.

---

## 🎯 Option 1: Run SQL in Supabase (Fastest)

### Step 1: Go to Supabase Dashboard
https://supabase.com/dashboard → Your Project → SQL Editor

### Step 2: Run this SQL
```sql
UPDATE cameras
SET
  assigned_to = 'HeySalad Berlin Alexanderplatz',
  location_lat = 52.5219,  -- Berlin Alexanderplatz
  location_lon = 13.4132,
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{location_name}',
    '"HeySalad Berlin Alexanderplatz"'
  ),
  updated_at = now()
WHERE camera_id = 'CAM001';
```

### Step 3: Verify
```sql
SELECT
  camera_id,
  camera_name,
  assigned_to,
  location_lat,
  location_lon,
  metadata->>'location_name' as location_name
FROM cameras
WHERE camera_id = 'CAM001';
```

**Expected Result:**
```
camera_id: CAM001
camera_name: HeySalad Camera CAM001
assigned_to: HeySalad Berlin Alexanderplatz
location_lat: 52.5219
location_lon: 13.4132
location_name: HeySalad Berlin Alexanderplatz
```

---

## 🌐 Option 2: Update via API

### Using curl:
```bash
curl -X POST https://laura.heysalad.app/api/cameras \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliZWNkZ2J6Z2xkYWZ3dnp3a3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcxMDYwMTksImV4cCI6MjA0MjY4MjAxOX0.H4NkweM9hwVUYxpcaeLCQjs1KBXZfGH0dqCKlyx2S-U" \
  -d '{
    "camera_id": "CAM001",
    "camera_name": "HeySalad Camera CAM001",
    "assigned_to": "HeySalad Berlin Alexanderplatz"
  }'
```

### Then update location via status endpoint:
```bash
curl -X POST https://laura.heysalad.app/api/cameras/63b6ea55-cdd5-4244-84c4-ed07281ab2e4/status \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliZWNkZ2J6Z2xkYWZ3dnp3a3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcxMDYwMTksImV4cCI6MjA0MjY4MjAxOX0.H4NkweM9hwVUYxpcaeLCQjs1KBXZfGH0dqCKlyx2S-U" \
  -d '{
    "status": "online",
    "location_lat": 52.5219,
    "location_lon": 13.4132,
    "metadata": {
      "location_name": "HeySalad Berlin Alexanderplatz"
    }
  }'
```

---

## 📍 Berlin Alexanderplatz Coordinates

**Address:**
HeySalad Berlin Alexanderplatz
Alexanderplatz
10178 Berlin, Germany

**GPS Coordinates:**
- Latitude: 52.5219° N
- Longitude: 13.4132° E

**Google Maps:**
https://www.google.com/maps?q=52.5219,13.4132

---

## 🔧 Configure ESP32 to Send Location

If you want ESP32 to automatically send location with status updates:

### In your ESP32 code:
```cpp
// Add to your LauraClient status update call
laura.sendStatus(
  batteryPercent,
  wifiRssi,
  "online",
  52.5219,  // Berlin Alexanderplatz lat
  13.4132   // Berlin Alexanderplatz lon
);
```

### Or in JSON payload:
```json
{
  "status": "online",
  "battery_level": 100,
  "wifi_signal": -38,
  "location_lat": 52.5219,
  "location_lon": 13.4132,
  "metadata": {
    "location_name": "HeySalad Berlin Alexanderplatz"
  }
}
```

---

## 🌐 View in Laura Dashboard

After updating, go to:
**https://laura.heysalad.app/cameras**

You'll see:
```
Camera: CAM001
Location: 📍 52.52°N, 13.41°E
Assigned to: HeySalad Berlin Alexanderplatz
```

---

## 📋 For Multiple Locations

If you have cameras at different HeySalad locations:

### Camera 1 - Berlin Alexanderplatz
```sql
UPDATE cameras SET
  assigned_to = 'HeySalad Berlin Alexanderplatz',
  location_lat = 52.5219,
  location_lon = 13.4132
WHERE camera_id = 'CAM001';
```

### Camera 2 - Munich Marienplatz (Example)
```sql
UPDATE cameras SET
  assigned_to = 'HeySalad Munich Marienplatz',
  location_lat = 48.1374,
  location_lon = 11.5755
WHERE camera_id = 'CAM002';
```

### Camera 3 - Hamburg Hauptbahnhof (Example)
```sql
UPDATE cameras SET
  assigned_to = 'HeySalad Hamburg Hauptbahnhof',
  location_lat = 53.5528,
  location_lon = 10.0067
WHERE camera_id = 'CAM003';
```

---

## ✅ Quick Steps Summary

1. Go to Supabase SQL Editor
2. Copy and paste the UPDATE query
3. Click "Run"
4. Refresh https://laura.heysalad.app/cameras
5. See location displayed! 📍

**Done!** 🎉
