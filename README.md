## Laura — HeySalad Logistics Command Center

Laura is a modern, dark-themed operations dashboard that unifies delivery telemetry, IoT device management, driver communications, and rewards tracking for HeySalad. Built with **Next.js 16**, **TypeScript**, **Supabase**, **Tailwind CSS v3**, **Mapbox GL JS**, **Twilio**, and **SendGrid**.

### Design System
- **Brand Colors**: Cherry Red (#ed4c4c), Peach (#faa09a), Light Peach (#ffd0cd)
- **Typography**: Figtree font family for all text
- **Background**: Pure black with zinc/charcoal overlays and glass-morphism effects

### Features
- **Dashboard** — Mapbox dark map showing each basket's live position, temperature, status, ETA, and dynamic cost model
- **Drivers** — Supabase-powered roster with one-click Twilio voice call outs
- **Orders** — Delivery status list tied to baskets with auto-calculated ETAs
- **IoT Devices** — Meshtastic device management with telemetry monitoring, battery levels, signal strength, and location tracking
- **🤖 AI Camera Integration** — OpenAI Realtime API + ElevenLabs TTS + reCamera with gimbal control (NEW)
- **📹 Smart Kitchen Monitoring** — Real-time object detection with YOLO11n on reCamera devices (NEW)
- **🎯 Automated Gimbal Control** — AI-driven camera positioning based on detected objects (NEW)
- **🔊 Voice Responses** — Natural text-to-speech feedback using ElevenLabs (NEW)
- **Settings** — Environment variable checklist for production deployment
- **Passwordless Auth** — Magic link authentication via SendGrid with admin whitelist
- **APIs** — SSE basket stream, Twilio voice calls, driver rewards, device telemetry, and AI integration

### Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Duplicate `.env.example` → `.env.local` and set credentials (Supabase, Mapbox, Twilio, SendGrid).
3. Apply the database schemas to your Supabase project:
   ```bash
   # Run these SQL files in your Supabase SQL Editor:
   # 1. supabase/schema.sql (core tables)
   # 2. supabase/meshtastic_devices.sql (IoT device tables)
   # 3. supabase/auth_schema.sql (passwordless auth tables)
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Visit [http://localhost:3000](http://localhost:3000) — you’ll be redirected to `/dashboard`.

### Required Environment Variables
| Key | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key used on secure API routes |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Mapbox GL JS token |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | Twilio voice call credentials |
| `SENDGRID_API_KEY` | SendGrid API key for magic link emails |
| `SENDGRID_FROM_EMAIL` | Verified sender email for SendGrid |
| `ADMIN_EMAILS` | Comma-separated list of admin emails for passwordless auth |
| `NEXT_PUBLIC_APP_URL` | Public URL used in callbacks (http://localhost:3000 for dev) |
| `REWARDS_THRESHOLD_MINUTES` | Minutes under ETA required to award rewards (default: 5) |
| `OPENAI_API_KEY` | OpenAI API key for Realtime API (NEW) |
| `ELEVENLABS_API_KEY` | ElevenLabs API key for text-to-speech (NEW) |
| `CLOUDFLARE_WORKER_URL` | Cloudflare Worker URL for WebSocket proxy (NEW) |

### Scripts
| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production server |
| `npm run lint` | Run Next.js ESLint |
| `npm run format` | Check formatting with Prettier |

### Deployment Notes
- Deploy on Vercel and configure the environment variables above.
- The `/api/baskets/stream` endpoint streams Supabase realtime updates through Server-Sent Events.
- Twilio callbacks hit `/api/twilio/prompt`, which returns TwiML audio instructions.

### Folder Highlights
- `src/app/(routes)/*` — App Router pages for dashboard, drivers, orders, devices, settings
- `src/app/login/*` — Magic link authentication login page
- `src/app/auth/*` — Auth routes (verify, callback) for passwordless authentication
- `src/app/api/*` — API routes for basket streaming, driver calls, rewards, Twilio prompts, auth
- `src/components/*` — Layout shell with logout, map view, tables, device management
- `src/lib/*` — Supabase client, Twilio client, SendGrid email utilities
- `src/utils/*` — Haversine distance and cost/time calculations
- `src/types/*` — TypeScript type definitions for all entities
- `supabase/schema.sql` — Core schema for baskets, drivers, orders, rewards
- `supabase/meshtastic_devices.sql` — IoT device management schema
- `supabase/auth_schema.sql` — Passwordless authentication schema

### IoT Device Management
Laura supports Meshtastic IoT devices for real-time basket tracking:
- **Device Provisioning** — Register new Meshtastic hardware
- **Telemetry Monitoring** — Battery level, signal strength, GPS location, temperature
- **Alert System** — Low battery, offline, signal loss, geofence violations
- **Device Commands** — Send commands to devices remotely
- **Basket Assignment** — Link devices to delivery baskets

### 🤖 AI Camera Integration (reCamera)
Laura now includes complete AI-powered camera integration for smart kitchen monitoring:

**Features:**
- **Real-time Object Detection** — YOLO11n AI detection running on reCamera edge devices
- **OpenAI Realtime API** — Voice and text-based AI conversation about detected objects
- **ElevenLabs TTS** — Natural voice responses (Rachel voice) for AI feedback
- **Gimbal Control** — Automated camera positioning based on AI detection and commands
- **Laura API Integration** — 2-second polling for command execution and status updates
- **Interactive Dashboards** — Two web-based control panels for monitoring and testing
- **Cloudflare Worker** — Secure WebSocket proxy for OpenAI API with token validation

**Quick Start:**
1. Deploy Node-RED flow to your reCamera:
   ```bash
   # Import to Node-RED: http://[RECAMERA-IP]:1880
   recamera-ultimate-complete.json  # Complete system (recommended)
   ```

2. Access the dashboards:
   ```bash
   Main Control:  http://[RECAMERA-IP]:1880/dashboard/heysalad
   AI Assistant:  http://[RECAMERA-IP]:1880/dashboard/ai-assistant
   ```

**What's Included:**
- ✅ 57 pre-configured Node-RED nodes
- ✅ 2 interactive dashboard pages
- ✅ All API credentials pre-configured
- ✅ Test inject nodes for manual testing
- ✅ Real-time activity logging
- ✅ Connection status monitoring

**Documentation:**
- [ULTIMATE_DEPLOYMENT.md](ULTIMATE_DEPLOYMENT.md) — Complete deployment guide
- [COMPLETE_SYSTEM_SUMMARY.md](COMPLETE_SYSTEM_SUMMARY.md) — System overview
- [SYSTEM_EVOLUTION.md](SYSTEM_EVOLUTION.md) — Development history

**Components:**
- `recamera-ultimate-complete.json` — Complete integrated system (57 nodes)
- `recamera-production-complete.json` — Production-ready system (51 nodes)
- `recamera-ai-integration-flow.json` — AI features only (24 nodes)
- `recamera-laura-flow.json` — Laura API integration (15 nodes)
- `heysalad-dashboard-flow.json` — Dashboard UI (4 nodes)
- `cloudflare-worker/openai-proxy.js` — WebSocket proxy

**Architecture:**
```
reCamera (Node-RED)
    ↓
AI Detection (YOLO11n)
    ↓
OpenAI Realtime API ──→ Gimbal Commands ──→ Laura API
    ↓                         ↓
ElevenLabs TTS            Database (Supabase)
    ↓
Audio Output (Speaker)
```

### Passwordless Authentication
Magic link authentication system using SendGrid:
- Admin whitelist via `ADMIN_EMAILS` environment variable
- 15-minute expiring magic links with one-time use tokens
- Secure token generation using crypto.randomBytes(32)
- Rate limiting (3 requests per minute per email)
- Email enumeration protection
- Activity logging and audit trail
- No passwords required
- Session cookie management
- Logout functionality

**Auth Flow:**
1. User enters email on `/login` page
2. System validates email against admin whitelist
3. Magic link sent via SendGrid (with click tracking disabled)
4. User clicks link → `/auth/verify` validates token
5. System creates/finds user → generates session
6. Redirect to `/auth/callback` → establishes session cookies
7. User redirected to `/dashboard`

---

Enjoy orchestrating HeySalad logistics with Laura! 🥗
