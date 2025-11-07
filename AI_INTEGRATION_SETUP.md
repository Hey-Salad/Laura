# HeySalad AI Integration Setup Guide

Complete setup guide for secure OpenAI + ElevenLabs integration with reCamera gimbal.

## Overview

This setup provides:
- ✅ Secure WebSocket proxy via Cloudflare Workers (OpenAI keys stay server-side)
- ✅ Camera token authentication
- ✅ ElevenLabs text-to-speech integration
- ✅ Gimbal control based on AI responses
- ✅ On-device object detection

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   reCamera  │────▶│ Cloudflare Worker│────▶│   OpenAI    │
│  + Node-RED │     │   (Proxy + Auth) │     │ Realtime API│
└─────────────┘     └──────────────────┘     └─────────────┘
       │                     ▲
       │                     │ validates
       │                     │ camera token
       ▼                     │
┌─────────────┐     ┌──────────────────┐
│    Laura    │────▶│    Supabase      │
│  Dashboard  │     │   (camera_tokens)│
└─────────────┘     └──────────────────┘
```

## Prerequisites

- Cloudflare account (free tier is sufficient)
- OpenAI API key with Realtime API access
- ElevenLabs API key (optional)
- reCamera with Node-RED installed
- Access to Supabase database
- Vercel account for Laura deployment

## Step 1: Database Setup

Apply the camera tokens migration to Supabase:

```bash
# Run this SQL in Supabase SQL Editor or via CLI
cat supabase/migrations/20251107_add_camera_tokens.sql | supabase db push
```

Or manually run in Supabase SQL Editor:

```sql
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS api_token TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_cameras_api_token ON cameras(api_token);

CREATE OR REPLACE FUNCTION generate_camera_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

UPDATE cameras SET api_token = generate_camera_token() WHERE api_token IS NULL;
```

### Verify Camera Token

Get your camera's API token:

```sql
SELECT camera_id, api_token, status FROM cameras
WHERE camera_id = '34236c48-2dae-4fe6-9bae-27e640f84d71';
```

Save this token - you'll need it for testing!

## Step 2: Deploy Cloudflare Worker

### Install Wrangler

```bash
npm install -g wrangler
```

### Login to Cloudflare

```bash
wrangler login
```

### Set Secrets

```bash
cd cloudflare-worker

# Set OpenAI API Key
wrangler secret put OPENAI_API_KEY
# Paste your OpenAI API key when prompted

# Set Supabase URL
wrangler secret put SUPABASE_URL
# Paste your Supabase project URL (e.g., https://xxx.supabase.co)

# Set Supabase Anon Key
wrangler secret put SUPABASE_ANON_KEY
# Paste your Supabase anon key
```

### Deploy Worker

```bash
npm install
npm run deploy
```

You'll get a URL like: `https://heysalad-openai-proxy.YOUR-SUBDOMAIN.workers.dev`

**Save this URL!**

### Test Worker

```bash
# Health check
curl https://heysalad-openai-proxy.YOUR-SUBDOMAIN.workers.dev/health

# Expected: {"status":"ok","service":"openai-proxy"}
```

## Step 3: Update Laura (Vercel)

### Add Environment Variables

In Vercel dashboard or CLI:

```bash
# Set Cloudflare Worker URL
vercel env add CLOUDFLARE_WORKER_URL production
# Enter: wss://heysalad-openai-proxy.YOUR-SUBDOMAIN.workers.dev

# Set ElevenLabs API Key (if not already set)
vercel env add ELEVENLABS_API_KEY production
# Paste your ElevenLabs API key
```

### Deploy Laura

```bash
# Commit and push (Vercel auto-deploys)
git add .
git commit -m "Add secure AI integration with Cloudflare Workers"
git push

# Or manual deploy
vercel --prod
```

### Test Laura API

```bash
# Get OpenAI connection details
curl -X POST https://laura.heysalad.app/api/ai/openai-realtime \
  -H "Content-Type: application/json" \
  -d '{"camera_id": "34236c48-2dae-4fe6-9bae-27e640f84d71"}'
```

Expected response:
```json
{
  "websocket_url": "wss://heysalad-openai-proxy.YOUR-SUBDOMAIN.workers.dev/openai-realtime",
  "camera_token": "BASE64_TOKEN_HERE",
  "model": "gpt-4o-realtime-preview-2024-10-01",
  "instructions": "Connect using WebSocket with X-Camera-Token header",
  "usage": {
    "headers": {
      "X-Camera-Token": "BASE64_TOKEN_HERE"
    }
  }
}
```

## Step 4: Configure reCamera Node-RED

### Import Flow

1. Open Node-RED: `http://<recamera-ip>:1880`
2. Menu (☰) → Import → Select File
3. Import: `recamera-ai-integration-flow.json`

### Configure WebSocket Client

The WebSocket client node needs manual configuration to add the camera token header:

1. Double-click the "openai_ws_client" configuration node (at the bottom of the flow)
2. Update the **Path** field with your Cloudflare Worker URL:
   ```
   wss://heysalad-openai-proxy.YOUR-SUBDOMAIN.workers.dev/openai-realtime
   ```
3. **Important**: Node-RED's WebSocket client doesn't support custom headers directly

#### Workaround for WebSocket Headers

Since Node-RED's built-in WebSocket client doesn't support custom headers, you have two options:

**Option A: Use WebSocket URL with Token (Simpler)**

Update the Cloudflare Worker to accept token as query parameter:
```
wss://heysalad-openai-proxy.YOUR-SUBDOMAIN.workers.dev/openai-realtime?token=YOUR_CAMERA_TOKEN
```

**Option B: Use node-red-contrib-websocket-client (Better)**

Install the advanced WebSocket client that supports headers:
```bash
# On reCamera via SSH
cd ~/.node-red
npm install node-red-contrib-websocket-client
```

Then restart Node-RED and use the new WebSocket client node with custom headers.

### Deploy Flow

1. Click **Deploy** button (top right)
2. Monitor debug output in the Debug panel

## Step 5: Testing

### Test AI Detection Flow

1. In Node-RED, trigger the "Test: Ask AI" inject node
2. Watch debug output for:
   - ✅ Secure WebSocket proxy configured
   - 📤 Sending to OpenAI
   - 🤖 OpenAI response
   - 🔊 Audio received
   - 🎮 Gimbal command

### Test TTS

1. Trigger "Test: TTS" inject node
2. Should hear audio through reCamera speaker
3. Check Laura logs for TTS request

### Test Gimbal Control

1. Trigger "Test: Gimbal Left" inject node
2. Gimbal should move left
3. Check command history in Laura dashboard

## Troubleshooting

### "Invalid camera token" Error

**Cause**: Camera token not valid or camera not online

**Fix**:
```sql
-- Check camera status
SELECT camera_id, api_token, status FROM cameras
WHERE camera_id = '34236c48-2dae-4fe6-9bae-27e640f84d71';

-- Update status if needed
UPDATE cameras SET status = 'online'
WHERE camera_id = '34236c48-2dae-4fe6-9bae-27e640f84d71';
```

### "Camera not configured for AI integration"

**Cause**: Camera has no `api_token`

**Fix**:
```sql
UPDATE cameras
SET api_token = encode(gen_random_bytes(32), 'base64')
WHERE camera_id = '34236c48-2dae-4fe6-9bae-27e640f84d71';
```

### WebSocket Connection Fails

**Cause**: Worker URL incorrect or secrets not set

**Fix**:
1. Verify Worker URL in Laura env: `vercel env ls`
2. Test Worker health: `curl https://your-worker.workers.dev/health`
3. Check Worker secrets: `wrangler secret list`

### OpenAI API Errors

**Common issues**:
- API key doesn't have Realtime API access → Upgrade OpenAI plan
- Billing not configured → Add payment method in OpenAI dashboard
- Rate limits exceeded → Check usage at platform.openai.com

### ElevenLabs TTS Fails

**Cause**: API key not set or quota exceeded

**Fix**:
```bash
# Verify key is set
vercel env ls | grep ELEVENLABS

# Test endpoint
curl -X POST https://laura.heysalad.app/api/ai/elevenlabs \
  -H "Content-Type: application/json" \
  -d '{"text": "Test", "camera_id": "34236c48-2dae-4fe6-9bae-27e640f84d71"}'
```

### Audio Doesn't Play on reCamera

**Cause**: Audio tools not installed

**Fix**:
```bash
# SSH into reCamera
ssh root@<recamera-ip>

# Install audio tools
apt-get update
apt-get install -y alsa-utils

# Test speaker
speaker-test -t wav -c 2

# Adjust volume
alsamixer
```

## Monitoring

### Cloudflare Worker Logs

```bash
# Real-time logs
wrangler tail

# Or view in dashboard:
# Workers & Pages → heysalad-openai-proxy → Logs
```

### Laura API Logs

```bash
# Vercel logs
vercel logs --follow

# Or in Vercel dashboard:
# Project → Deployments → [Latest] → Logs
```

### Node-RED Debug

In Node-RED, enable debug nodes and watch the Debug panel for:
- 📍 WebSocket URL
- ✅ Connection status
- 📤 Outgoing messages
- 🤖 OpenAI responses
- 🎮 Gimbal commands

## Cost Estimate

**Cloudflare Workers** (Free Tier):
- 100,000 requests/day
- Sufficient for 3-4 cameras running 24/7
- Cost if exceeded: $5/month for 10M requests

**OpenAI Realtime API**:
- Audio input: $0.06 / minute
- Audio output: $0.24 / minute
- Text input/output: $0.005 / 1K tokens
- Estimate: $5-20/month per camera (depends on usage)

**ElevenLabs**:
- Free tier: 10,000 characters/month
- Paid: Starting at $5/month for 30,000 characters

**Total**: ~$10-30/month per camera for moderate AI usage

## Security Best Practices

1. ✅ **Never commit secrets** to git
2. ✅ **Rotate camera tokens** periodically
3. ✅ **Monitor API usage** for anomalies
4. ✅ **Use custom domain** for Worker (optional but recommended)
5. ✅ **Enable Cloudflare rate limiting** for additional protection
6. ✅ **Set status to 'offline'** for decommissioned cameras

## Next Steps

1. Monitor logs for first 24 hours
2. Adjust gimbal response parsing keywords as needed
3. Customize OpenAI system prompt for your use case
4. Add rate limiting in Cloudflare if needed
5. Set up alerting for API errors

## Support

- Cloudflare Workers: https://developers.cloudflare.com/workers/
- OpenAI Realtime API: https://platform.openai.com/docs/guides/realtime
- ElevenLabs: https://elevenlabs.io/docs
- Node-RED: https://nodered.org/docs/
