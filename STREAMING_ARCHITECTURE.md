# Camera Streaming Architecture

## Overview

Laura uses a **centralized streaming architecture** where ESP32 cameras upload frames to Laura's backend, and Laura serves the stream to multiple viewers.

```
┌─────────────┐                    ┌──────────────────┐                    ┌────────────────┐
│   ESP32     │                    │  Laura Backend   │                    │   Dashboard    │
│  Camera     │                    │                  │                    │   (Browser)    │
│             │                    │                  │                    │                │
│  Captures   │ ──POST frames──>   │ Stores frames    │ <──GET stream───   │  Displays      │
│  5 FPS      │                    │ in memory        │                    │  live video    │
│             │                    │                  │                    │                │
└─────────────┘                    └──────────────────┘                    └────────────────┘
```

## Why This Architecture?

### ✅ Advantages

1. **Remote Access** - No port forwarding or VPN needed
2. **Multiple Viewers** - Unlimited dashboard users can watch simultaneously
3. **Recording Ready** - Easy to add frame recording to database/storage
4. **Analytics Ready** - Can process frames for AI/ML features
5. **Consistent** - Same pattern as status updates and commands
6. **Scalable** - Add Redis for distributed deployments
7. **Secure** - All traffic goes through HTTPS

### ❌ Trade-offs

1. **Latency** - Slightly higher than direct stream (~200-500ms additional)
2. **Bandwidth** - Frames traverse internet twice (ESP32→Laura, Laura→Browser)
3. **Server Load** - Laura backend processes all frames

---

## API Endpoints

### 1. POST `/api/cameras/[id]/frame`

**Purpose:** ESP32 uploads JPEG frames

**Request:**
```
POST /api/cameras/63b6ea55-cdd5-4244-84c4-ed07281ab2e4/frame
Content-Type: image/jpeg
apikey: [SUPABASE_ANON_KEY]

[JPEG binary data]
```

**Response:**
```json
{
  "success": true,
  "cameraId": "63b6ea55-cdd5-4244-84c4-ed07281ab2e4",
  "size": 28672,
  "timestamp": "2025-10-29T10:00:00.000Z"
}
```

**Features:**
- Validates JPEG format (checks for FF D8 FF signature)
- Enforces size limits (100 bytes min, 5MB max)
- Stores latest frame in memory (or Redis)
- Returns upload stats

---

### 2. GET `/api/cameras/[id]/stream`

**Purpose:** Serve MJPEG stream to dashboard

**Request:**
```
GET /api/cameras/63b6ea55-cdd5-4244-84c4-ed07281ab2e4/stream
```

**Response:**
```
HTTP/1.1 200 OK
Content-Type: multipart/x-mixed-replace; boundary=frame
Connection: keep-alive

--frame
Content-Type: image/jpeg
Content-Length: 28672

[JPEG data]

--frame
Content-Type: image/jpeg
Content-Length: 29184

[JPEG data]

... (repeats at 10 FPS)
```

**Features:**
- Serves frames at 10 FPS (100ms interval)
- Streams continuously until client disconnects
- Handles multiple simultaneous viewers
- Falls back gracefully when no frame available

---

### 3. GET `/api/cameras/[id]/snapshot`

**Purpose:** Get single latest frame

**Request:**
```
GET /api/cameras/63b6ea55-cdd5-4244-84c4-ed07281ab2e4/snapshot
```

**Response:**
```
HTTP/1.1 200 OK
Content-Type: image/jpeg
X-Frame-Timestamp: 2025-10-29T10:00:00.000Z
X-Frame-Age: 125ms

[JPEG binary data]
```

**Features:**
- Returns latest frame immediately
- Includes frame age in headers
- Used for snapshot mode (auto-refresh every 3s)

---

## Frame Storage

### In-Memory (Current Implementation)

**File:** `src/lib/frameStorage.ts`

```typescript
interface CameraFrame {
  buffer: Buffer;
  timestamp: Date;
  contentType: string;
  size: number;
}

// Stores latest frame for each camera
const frames: Map<string, CameraFrame> = new Map();
```

**Features:**
- Fast access (O(1) lookup)
- Auto-cleanup of stale frames (10s TTL)
- Memory efficient (stores only latest frame per camera)

**Limitations:**
- Lost on server restart
- Not suitable for distributed deployments
- No persistence

---

### Redis (Production Recommendation)

For production, use Redis with Upstash:

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

// Store frame
await redis.setex(
  `camera:${cameraId}:frame`,
  10, // TTL 10 seconds
  buffer.toString('base64')
);

// Retrieve frame
const frameData = await redis.get(`camera:${cameraId}:frame`);
const buffer = Buffer.from(frameData as string, 'base64');
```

**Benefits:**
- Persistence across restarts
- Works with distributed deployments (multiple Vercel instances)
- Better memory management
- Easy to add frame history

**Setup:**
1. Create free Redis database at https://upstash.com
2. Add `REDIS_URL` and `REDIS_TOKEN` to `.env.local`
3. Install: `npm install @upstash/redis`
4. Update `frameStorage.ts` to use Redis

---

## ESP32 Configuration

### Frame Upload Code

**File:** `ESP32_UPLOAD_FRAMES.ino`

**Key Settings:**
```cpp
const char* LAURA_API_URL = "https://laura.heysalad.app";
const String CAMERA_UUID = "63b6ea55-cdd5-4244-84c4-ed07281ab2e4";
const unsigned long FRAME_INTERVAL = 200;  // 5 FPS
```

**Frame Upload Logic:**
```cpp
void uploadFrame() {
  // 1. Capture frame
  camera_fb_t * fb = esp_camera_fb_get();

  // 2. POST to Laura
  HTTPClient http;
  http.begin(frameUrl);
  http.addHeader("Content-Type", "image/jpeg");
  http.POST(fb->buf, fb->len);

  // 3. Release buffer
  esp_camera_fb_return(fb);
}
```

**Performance Stats:**
- Upload Rate: 5 FPS (configurable)
- Frame Size: ~20-40 KB per frame
- Bandwidth: ~100-200 KB/s upload
- Success Rate: Displayed in serial monitor

---

## Dashboard Integration

### Stream Display

**Component:** `CameraStreamPreview.tsx`

```tsx
<div className="camera-feed">
  {/* Live MJPEG Stream */}
  <img
    src={`/api/cameras/${camera.id}/stream`}
    alt="Live Camera Feed"
    className="w-full"
  />

  {/* Or Snapshot Mode */}
  <img
    src={`/api/cameras/${camera.id}/snapshot?t=${Date.now()}`}
    alt="Camera Snapshot"
    className="w-full"
  />
</div>
```

**Modes:**
- **Live** - Continuous MJPEG stream (10 FPS)
- **Snapshot** - Auto-refresh image every 3 seconds

---

## Performance Tuning

### Frame Rate

**ESP32 Side:**
```cpp
// Faster: More bandwidth, smoother video
const unsigned long FRAME_INTERVAL = 100;  // 10 FPS

// Slower: Less bandwidth, choppier video
const unsigned long FRAME_INTERVAL = 500;  // 2 FPS

// Balanced (recommended):
const unsigned long FRAME_INTERVAL = 200;  // 5 FPS
```

**Laura Side:**
```typescript
// Stream endpoint interval
const interval = setInterval(() => {
  // Send frame
}, 100); // 10 FPS - should be >= ESP32 upload rate
```

### Image Quality

```cpp
config.frame_size = FRAMESIZE_VGA;  // 640x480 (recommended)
// or
config.frame_size = FRAMESIZE_SVGA; // 800x600 (higher quality, larger files)
// or
config.frame_size = FRAMESIZE_QVGA; // 320x240 (lower quality, smaller files)

config.jpeg_quality = 12;  // 0-63, lower = better (12 recommended)
```

### Bandwidth Usage

| Frame Size | FPS | Bandwidth (Upload) | Bandwidth (per viewer) |
|------------|-----|-------------------|------------------------|
| 640x480, Q12 | 5 | ~150 KB/s | ~150 KB/s |
| 640x480, Q12 | 10 | ~300 KB/s | ~300 KB/s |
| 800x600, Q12 | 5 | ~250 KB/s | ~250 KB/s |

**Note:** Laura serves the same frames to multiple viewers efficiently.

---

## Deployment

### Step 1: Deploy Laura Backend

```bash
# Commit changes
git add .
git commit -m "Add frame upload streaming"

# Deploy to Vercel
vercel --prod
```

### Step 2: Flash ESP32

1. Open `ESP32_UPLOAD_FRAMES.ino` in Arduino IDE
2. Update WiFi credentials
3. Upload to ESP32
4. Monitor serial output for upload stats

### Step 3: View Stream

1. Go to: https://laura.heysalad.app/cameras
2. Select your camera
3. See live stream in **Live Preview** panel

---

## Monitoring & Debugging

### ESP32 Serial Monitor

```
╔════════════════════════════════════════╗
║           🎥 STREAMING ACTIVE          ║
╚════════════════════════════════════════╝
Upload Rate: 5 FPS (every 200ms)
View stream: https://laura.heysalad.app/cameras

Uploading frames...

✓ Frame #25 uploaded | Size: 28 KB | Success rate: 100.0%
✓ Frame #50 uploaded | Size: 31 KB | Success rate: 98.0%
[Status] ✓ Update sent successfully
✓ Frame #75 uploaded | Size: 29 KB | Success rate: 97.3%
```

### Laura Backend Logs

```bash
# View deployment logs
vercel logs --prod

# Expected output:
[Stream 63b6ea55...] Started - client connected
[Stream 63b6ea55...] No frame available
Frame uploaded: 28672 bytes
[Stream 63b6ea55...] Client disconnected
```

### Frame Stats API

```bash
# Check if camera has recent frame
curl https://laura.heysalad.app/api/cameras/63b6ea55-cdd5-4244-84c4-ed07281ab2e4/frame

# Response:
{
  "cameraId": "63b6ea55-cdd5-4244-84c4-ed07281ab2e4",
  "hasFrame": true,
  "frameAge": 125,
  "frameAgeSeconds": 0.125
}
```

---

## Troubleshooting

### No Stream in Dashboard

**Check 1: ESP32 uploading frames?**
```
Open Serial Monitor → Look for "✓ Frame uploaded" messages
```

**Check 2: Frames reaching Laura?**
```bash
curl https://laura.heysalad.app/api/cameras/[id]/frame
# Should return: {"hasFrame": true}
```

**Check 3: Can you get snapshot?**
```bash
curl https://laura.heysalad.app/api/cameras/[id]/snapshot > test.jpg
# Open test.jpg - should be valid image
```

### Upload Failures

**Error: HTTP 400 - Invalid JPEG format**
```
ESP32 camera may be sending corrupt data
→ Restart ESP32
→ Check camera initialization
```

**Error: HTTP 413 - Frame too large**
```
JPEG file exceeds 5MB limit
→ Reduce frame_size or increase jpeg_quality number
```

**Error: HTTP 500 - Server error**
```
Laura backend issue
→ Check Vercel logs
→ Verify deployment successful
```

### Laggy Stream

- **Reduce FPS:** Increase `FRAME_INTERVAL` to 300-500ms
- **Reduce Quality:** Set `config.frame_size = FRAMESIZE_QVGA`
- **Check WiFi:** Ensure strong signal (< -70 dBm)
- **Check Bandwidth:** ESP32 upload speed sufficient?

---

## Future Enhancements

### Frame Recording
```typescript
// Save frames to Supabase Storage
await supabase.storage
  .from('camera-frames')
  .upload(`${cameraId}/${timestamp}.jpg`, buffer);
```

### Motion Detection
```typescript
// Compare consecutive frames
const motion = detectMotion(previousFrame, currentFrame);
if (motion > threshold) {
  await recordEvent('motion_detected', cameraId);
}
```

### AI Analysis
```typescript
// Send frame to OpenAI Vision
const analysis = await openai.chat.completions.create({
  model: "gpt-4-vision",
  messages: [{
    role: "user",
    content: [
      { type: "text", text: "What do you see?" },
      { type: "image_url", image_url: { url: frameBase64 } }
    ]
  }]
});
```

---

## Summary

✅ **Architecture:** ESP32 uploads → Laura stores → Dashboard displays
✅ **Endpoints:** POST /frame, GET /stream, GET /snapshot
✅ **Storage:** In-memory (dev) → Redis (production)
✅ **Performance:** 5 FPS, ~150 KB/s bandwidth
✅ **Scalability:** Multiple viewers, easy to add recording/analytics

Start streaming: Flash `ESP32_UPLOAD_FRAMES.ino` → View at https://laura.heysalad.app/cameras
