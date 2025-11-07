# QuickStart: Secure AI Integration

Your Laura dashboard has been updated with secure AI integration! Here's what you need to do next.

## ✅ What's Already Done

- ✅ Laura API deployed with secure endpoints
- ✅ Database migration created for camera tokens
- ✅ Cloudflare Worker code ready to deploy
- ✅ Node-RED flows updated
- ✅ Documentation complete

## 🚀 Next Steps (You Need To Do)

### Step 1: Run Database Migration (5 minutes)

Go to your Supabase SQL Editor and run:

```sql
-- Add camera token column
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS api_token TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_cameras_api_token ON cameras(api_token);

-- Function to generate tokens
CREATE OR REPLACE FUNCTION generate_camera_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Generate token for your camera
UPDATE cameras SET api_token = generate_camera_token()
WHERE camera_id = '34236c48-2dae-4fe6-9bae-27e640f84d71';

-- Verify it worked
SELECT camera_id, api_token, status FROM cameras
WHERE camera_id = '34236c48-2dae-4fe6-9bae-27e640f84d71';
```

**Save the token that's returned** - you'll need it!

### Step 2: Deploy Cloudflare Worker (10 minutes)

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Go to worker directory
cd cloudflare-worker

# Set secrets (you'll be prompted for each)
wrangler secret put OPENAI_API_KEY
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY

# Deploy!
npm install
npm run deploy
```

You'll get a URL like: `https://heysalad-openai-proxy.YOUR-NAME.workers.dev`

**Save this URL!**

### Step 3: Update Vercel Environment Variable

```bash
# Add Worker URL to Vercel
vercel env add CLOUDFLARE_WORKER_URL production

# When prompted, enter (replace with your actual URL):
wss://heysalad-openai-proxy.YOUR-NAME.workers.dev

# Redeploy Laura
vercel --prod
```

### Step 4: Test It Works

```bash
# Test the OpenAI endpoint
curl -X POST https://laura.heysalad.app/api/ai/openai-realtime \
  -H "Content-Type: application/json" \
  -d '{"camera_id": "34236c48-2dae-4fe6-9bae-27e640f84d71"}'
```

You should see:
```json
{
  "websocket_url": "wss://heysalad-openai-proxy.YOUR-NAME.workers.dev/openai-realtime",
  "camera_token": "YOUR_CAMERA_TOKEN_HERE",
  "model": "gpt-4o-realtime-preview-2024-10-01"
}
```

**Important**: The `camera_token` is returned (not your OpenAI API key). This is secure! ✅

### Step 5: Configure Node-RED on reCamera (No-Code!)

1. Import the flow: `recamera-ai-integration-flow.json`
2. **Deploy** the flow (it will fetch the WebSocket URL automatically)
3. Watch the Debug panel for the message: `🎯 COPY THIS URL TO WEBSOCKET CLIENT CONFIG`
4. Double-click the `openai_ws_client` config node at the bottom
5. **Paste the URL** from the debug message (token is already included!)
6. Deploy again and test!

**That's it!** No headers, no manual token configuration - just copy/paste the URL! 🎉

## 📚 Complete Documentation

- **Full Setup Guide**: [AI_INTEGRATION_SETUP.md](AI_INTEGRATION_SETUP.md)
- **Cloudflare Worker Guide**: [cloudflare-worker/README.md](cloudflare-worker/README.md)
- **Architecture Details**: [AGENTS.md](AGENTS.md#ai-integration-openai--elevenlabs)

## 🆘 Getting Errors?

### "Camera not found"
→ Make sure camera exists in Supabase with correct `camera_id`

### "Camera not configured for AI integration"
→ Run the database migration (Step 1 above)

### "ElevenLabs API key not configured"
→ Add to Vercel: `vercel env add ELEVENLABS_API_KEY production`

### WebSocket connection fails
→ Verify Worker is deployed: `curl https://your-worker.workers.dev/health`

## 💰 Costs

**Cloudflare Workers**: Free (up to 100k requests/day)
**OpenAI Realtime API**: ~$5-20/month per camera
**ElevenLabs**: Free tier or $5/month

## 🎉 What You Get

- ✅ Secure WebSocket proxy (API keys never exposed)
- ✅ Camera token authentication
- ✅ AI object detection → OpenAI conversation → TTS → Gimbal control
- ✅ All in real-time!

## Need Help?

See the full setup guide: [AI_INTEGRATION_SETUP.md](AI_INTEGRATION_SETUP.md)

Check troubleshooting section for common issues and solutions.
