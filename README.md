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
- **Settings** — Environment variable checklist for production deployment
- **Passwordless Auth** — Magic link authentication via SendGrid with admin whitelist
- **APIs** — SSE basket stream, Twilio voice calls, driver rewards, and device telemetry

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
