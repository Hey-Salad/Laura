# HeySalad Laura – Agent Playbook

## System Snapshot
- **Stack**: Next.js 16 (App Router) + TypeScript + Tailwind + Supabase + Mapbox + Twilio + SendGrid
- **Primary UX flows**: dashboard (`/dashboard`) for baskets/map, driver roster (`/drivers`), orders (`/orders`), devices (`/devices`), **reCamera gimbal command center** (`/cameras`), environment checklist (`/settings`)
- **Realtime**: Supabase Postgres changes (channels: `baskets`, `drivers`, `orders`, `devices`, `cameras`) and SSE via `/api/baskets/stream` + MJPEG camera streams via `/api/cameras/[id]/stream`
- **Auth**: Custom passwordless flow (magic links → `/auth/verify` → `/auth/callback`), middleware enforces `sb-*` cookies except for routes listed in `middleware.ts`
- **Back-end API surface**: App Router handlers under `src/app/api`; many depend on the Supabase service role key, so guardrails are critical
- **Camera Architecture**: Polling-based command system where reCamera Node-RED flows poll `/api/cameras/[id]/commands` every 2 seconds, execute locally, then acknowledge via `/api/cameras/[id]/commands/[cmdId]`

## Environment Setup
1. `npm install`
2. Create `.env.local` from `.env.example` (or README table). Required keys:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
   - `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `ADMIN_EMAILS`
   - `NEXT_PUBLIC_APP_URL`, `REWARDS_THRESHOLD_MINUTES`
   - `OPENAI_API_KEY`, `ELEVENLABS_API_KEY` (optional, for AI integration)
3. Apply Supabase SQL (see `README.md` instructions)
4. Start dev server: `npm run dev` (port 3000)
5. Lint before shipping: `npm run lint`; formatting check: `npm run format`

## Development Workflow
- New routes/components live under `src/app/(routes)` or `src/components/**/*`
- Shared logic: `src/lib` (Supabase client, Twilio, SendGrid) + `src/utils`
- Types live in `src/types`; extend here before widening API responses
- When adding realtime features, prefer Supabase channels via `@supabase/supabase-js`; keep clean-up logic in `useEffect` hooks
- Use `@/lib/hooks/useToast` for client feedback instead of ad-hoc alerts
- CSS tokens are Tailwind classes defined in `tailwind.config.ts` (brand colors, fonts)

## Testing & Verification
- UI smoke-test via `npm run dev` since no automated e2e suite exists
- Run `npm run lint` for type/lint coverage (Next.js built-in ESLint config)
- Manual API checks: `curl` + Supabase SQL inspector; `/api/baskets/stream` is SSE (use `curl -N`)
- Device/camera workflows rely on live Supabase tables (`devices`, `device_alerts`, `camera_commands`, `camera_photos`); seed data via Supabase SQL if running locally

## External Integrations
| Domain | Usage | Notes |
| --- | --- | --- |
| Supabase | Postgres, Auth, Realtime, Storage | Service role key currently used server-side; keep out of client bundles |
| Mapbox GL | Map rendering (`MapView`, `CameraMapView`) | Requires browser-safe public token |
| Twilio Voice | `/api/call/[driver_id]` + `/api/twilio/prompt` | Ensure `NEXT_PUBLIC_APP_URL` matches deployed origin |
| SendGrid | Magic link emails via `src/lib/sendgrid.ts` | Disables click/open tracking to avoid link burn |

## Security Guardrails
- Review `middleware.ts` whenever exposing new API routes; only whitelist endpoints that must be public (IoT devices, Twilio webhooks)
- The Supabase **service role key** in API routes gives full DB access—never pass it to the browser or logs
- `/api/cameras/**` endpoints currently run unauthenticated for ESP32 devices; changes here must consider hardware auth + rate limiting
- Magic link routes log sensitive data today; scrub logs before production hardening

## Observability & Troubleshooting Tips
- Realtime debugging: browser devtools for SSE/Supabase events, server logs under `DashboardClient` / camera hooks
- Camera stream relies on in-memory `frameStorage`; restarting the server drops frames (acceptable for dev). For prod, swap in Redis as hinted in `src/lib/frameStorage.ts`
- Twilio voice script lives entirely in `/api/twilio/prompt`; adjust TwiML there

## ReCamera Gimbal Integration

### Architecture Overview
Laura integrates with Seeed Studio reCamera Gimbal devices via a polling-based command system:

1. **Command Creation**: Dashboard/API sends commands to Laura → stored in `camera_commands` table with status `pending`
2. **Command Polling**: reCamera Node-RED flow polls `/api/cameras/[id]/commands` every 2 seconds
3. **Local Execution**: Node-RED executes gimbal commands locally on the device
4. **Acknowledgment**: Node-RED acknowledges completion via `/api/cameras/[id]/commands/[cmdId]` → status updates to `completed` or `failed`

### Supported Commands

| Command Type | Parameters | Description |
|--------------|------------|-------------|
| `gimbal_set_angle` | `yaw_angle` (-180 to 180), `pitch_angle` (-90 to 90), `speed` (1-255) | Set absolute gimbal position |
| `gimbal_offset` | `yaw_delta`, `pitch_delta`, `speed` | Move by relative offset |
| `gimbal_get_angle` | none | Get current gimbal position |
| `gimbal_preset` | `preset` (center/left/right/up/down), `speed` | Move to preset position |
| `gimbal_stop` | none | Emergency stop gimbal movement |
| `take_photo` | none | Capture photo |
| `get_status` | none | Get device status |

### Node-RED Setup

**Files**:
- `recamera-laura-flow.json` - Command polling and execution
- `recamera-streaming-flow.json` - Frame upload (5 FPS) to Laura
- `heysalad-dashboard-flow.json` - Custom HeySalad branded dashboard UI

**Configuration** (in Node-RED):
```javascript
flow.set('CAMERA_ID', '34236c48-2dae-4fe6-9bae-27e640f84d71');
flow.set('LAURA_API_URL', 'https://laura.heysalad.app');
flow.set('POLL_INTERVAL', 2000); // 2 seconds
```

### Camera Streaming

**RTSP Stream** (built-in on reCamera):
- URL: `rtsp://<recamera-ip>:8554/live`
- Access via VLC or similar RTSP player

**MJPEG Stream** (via Laura):
- Endpoint: `/api/cameras/[id]/stream`
- Frame upload: reCamera uploads frames every 200ms (5 FPS)
- Laura serves via SSE multipart/x-mixed-replace

**Frame Storage**: In-memory (`src/lib/frameStorage.ts`) - consider Redis for multi-instance deployments

### Testing Commands

```bash
# Send gimbal preset command
curl -X POST https://laura.heysalad.app/api/cameras/34236c48-2dae-4fe6-9bae-27e640f84d71/command \
  -H "Content-Type: application/json" \
  -d '{"command_type": "gimbal_preset", "payload": {"preset": "center"}}'

# Check pending commands (what reCamera polls)
curl https://laura.heysalad.app/api/cameras/34236c48-2dae-4fe6-9bae-27e640f84d71/commands

# View command history
curl https://laura.heysalad.app/api/cameras/34236c48-2dae-4fe6-9bae-27e640f84d71/command-history
```

### Dashboard Access

- **Laura Web Dashboard**: `https://laura.heysalad.app/cameras` - View all cameras, send commands, view streams
- **reCamera Local Dashboard**: `http://<recamera-ip>:1880/dashboard` - Node-RED Dashboard with HeySalad branding
- **Node-RED Editor**: `http://<recamera-ip>:1880` - Edit flows

## AI Integration (OpenAI + ElevenLabs)

### Overview
Laura provides **secure** AI integration via Cloudflare Workers WebSocket proxy. The reCamera can capture video/audio, detect objects, query OpenAI for intelligent responses, convert responses to speech, and execute gimbal commands based on AI decisions.

**Security Model**:
- OpenAI API keys are never exposed to cameras
- WebSocket connections proxied through Cloudflare Workers
- Camera token authentication for all AI endpoints
- Tokens validated against Supabase `cameras` table

**📘 Complete Setup Guide**: See [AI_INTEGRATION_SETUP.md](AI_INTEGRATION_SETUP.md) for detailed deployment instructions.

### Architecture Flow
1. **Camera Capture** → reCamera captures video frames + audio
2. **AI Detection** → On-device object detection using `model` node
3. **OpenAI Analysis** → Send detections to OpenAI Realtime API via WebSocket
4. **Response Generation** → GPT-4o generates intelligent text response
5. **Text-to-Speech** → ElevenLabs converts response to natural speech
6. **Audio Playback** → Play audio through reCamera speaker
7. **Action Execution** → Parse response for gimbal commands and execute

### API Endpoints

#### OpenAI Realtime API Connection
**POST** `/api/ai/openai-realtime`

Returns WebSocket connection details for OpenAI Realtime API.

**Request Body**:
```json
{
  "camera_id": "34236c48-2dae-4fe6-9bae-27e640f84d71"
}
```

**Response**:
```json
{
  "websocket_url": "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01",
  "authorization": "Bearer <openai_api_key>",
  "model": "gpt-4o-realtime-preview-2024-10-01"
}
```

**Note**: Next.js App Router doesn't support direct WebSocket upgrades. The reCamera should connect directly to the OpenAI WebSocket URL using the provided authorization header.

#### ElevenLabs Text-to-Speech
**POST** `/api/ai/elevenlabs`

Converts text to natural speech audio.

**Request Body**:
```json
{
  "text": "Hello from HeySalad! I can see a person in the kitchen.",
  "voice_id": "21m00Tcm4TlvDq8ikWAM",
  "camera_id": "34236c48-2dae-4fe6-9bae-27e640f84d71"
}
```

**Response**: `audio/mpeg` stream (MP3 format)

**GET** `/api/ai/elevenlabs`

List available ElevenLabs voices.

**Response**:
```json
{
  "voices": [
    {
      "voice_id": "21m00Tcm4TlvDq8ikWAM",
      "name": "Rachel",
      "labels": {"accent": "american", "gender": "female"}
    }
  ]
}
```

### Environment Variables

Required in `.env.local` and Vercel:
```bash
OPENAI_API_KEY=your_openai_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

### Node-RED AI Integration Flow

**File**: `recamera-ai-integration-flow.json`

This comprehensive flow integrates:
- Camera capture with audio
- AI object detection
- OpenAI Realtime API communication
- ElevenLabs TTS conversion
- Gimbal control based on AI responses

**Key Nodes**:
- `camera` (option: 0, audio: true) - Capture video + audio
- `model` - On-device AI object detection
- `websocket out/in` - OpenAI Realtime API communication
- `http request` - ElevenLabs TTS API calls
- `exec` - Audio playback (`aplay`)
- `function` - Parse AI responses for gimbal commands

**Configuration**:
```javascript
flow.set('CAMERA_ID', '34236c48-2dae-4fe6-9bae-27e640f84d71');
flow.set('LAURA_API_URL', 'https://laura.heysalad.app');
flow.set('OPENAI_MODEL', 'gpt-4o-realtime-preview-2024-10-01');
flow.set('ELEVENLABS_VOICE_ID', '21m00Tcm4TlvDq8ikWAM'); // Rachel voice
```

### Testing AI Integration

```bash
# Test ElevenLabs TTS
curl -X POST https://laura.heysalad.app/api/ai/elevenlabs \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello from HeySalad!", "voice_id": "21m00Tcm4TlvDq8ikWAM"}' \
  --output test_tts.mp3

# Get OpenAI connection details
curl -X POST https://laura.heysalad.app/api/ai/openai-realtime \
  -H "Content-Type: application/json" \
  -d '{"camera_id": "34236c48-2dae-4fe6-9bae-27e640f84d71"}'

# List available ElevenLabs voices
curl https://laura.heysalad.app/api/ai/elevenlabs
```

### Example AI Workflow

1. **Object Detection**: Camera detects "person" and "pizza" in frame
2. **Query OpenAI**: "I see the following objects in the kitchen: person, pizza. What should I do?"
3. **AI Response**: "I can see someone is preparing a meal! I'll look left to check the counter."
4. **TTS Conversion**: ElevenLabs converts text to speech
5. **Audio Playback**: Speaker plays the response
6. **Gimbal Action**: Parse "look left" → execute `gimbal_preset` with `preset: "left"`

### Troubleshooting

**Issue**: WebSocket connection fails to OpenAI
- **Solution**: Ensure `OPENAI_API_KEY` is valid and has Realtime API access
- **Check**: OpenAI API usage limits and billing status

**Issue**: ElevenLabs returns 401 Unauthorized
- **Solution**: Verify `ELEVENLABS_API_KEY` in Vercel environment variables
- **Check**: ElevenLabs API quota and subscription status

**Issue**: Audio doesn't play on reCamera
- **Solution**: Install audio tools: `apt-get install alsa-utils` and test with `aplay`
- **Check**: Speaker hardware connection and volume settings

**Issue**: Gimbal commands not executing from AI responses
- **Solution**: Verify command parsing in "Parse Gimbal Action" function node
- **Check**: Keywords in AI responses ("look left", "center", "look up", etc.)

## Reference Docs in Repo
- `README.md` – product overview, env vars
- `supabase/*.sql` – schema for baskets, devices, cameras, auth
- `RECAMERA_GIMBAL_INTEGRATION.md` – Complete reCamera gimbal setup guide
- `DUAL_CAMERA_ECOSYSTEM.md` – Multi-camera system architecture
- `ESP32_CAMERA_INTEGRATION.md` – ESP32-S3 camera integration (alternative hardware)
- `recamera-laura-flow.json` – Node-RED command polling flow
- `recamera-streaming-flow.json` – Node-RED streaming flow
- `heysalad-dashboard-flow.json` – Custom HeySalad dashboard UI
- `recamera-ai-integration-flow.json` – Node-RED AI integration flow (OpenAI + ElevenLabs)

## When Picking Up Work
1. Sync with latest `main`; inspect `git status` for firmware artifacts that shouldn’t be touched
2. Confirm env vars for any integration you plan to touch
3. For UI work, favor server components when data is static; otherwise wrap client components with `"use client"`
4. For API handlers, always validate inputs and scope Supabase queries; consider rate-limits for device-facing routes
5. Document anything non-obvious in `AGENTS.md` or relevant README so the next agent can ramp quickly
