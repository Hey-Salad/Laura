# No-Code AI Integration Setup for Restaurants

Your HeySalad reCamera system now has **truly no-code** AI integration! Here's the selling point and setup process.

## 🎯 Restaurant Selling Points

✅ **No programming required** - Just import and click
✅ **Copy/paste setup** - URL auto-generates with security built-in
✅ **Visual flow editor** - Node-RED drag-and-drop interface
✅ **Instant AI responses** - OpenAI GPT-4o with voice
✅ **Automatic camera control** - AI moves gimbal based on what it sees
✅ **Secure by design** - API keys never exposed, enterprise-grade security

## 🚀 What's Ready (Already Deployed)

✅ Cloudflare Worker - Secure WebSocket proxy with query parameter support
✅ Laura API - Returns complete WebSocket URL with embedded token
✅ Node-RED Flow - Auto-fetches URL and displays for copy/paste
✅ Documentation - Complete guides with troubleshooting

## 📋 Setup Process (Restaurant Owner View)

### Step 1: One-Time Database Setup (You Do Once)
```sql
-- Run this in Supabase SQL Editor
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

### Step 2: Deploy Cloudflare Worker (You Do Once)
```bash
cd cloudflare-worker
npm install -g wrangler
wrangler login
wrangler secret put OPENAI_API_KEY
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
npm run deploy
```

### Step 3: Update Vercel Environment (You Do Once)
```bash
vercel env add CLOUDFLARE_WORKER_URL production
# Enter: wss://heysalad-openai-proxy.YOUR-SUBDOMAIN.workers.dev
vercel --prod
```

### Step 4: Restaurant Setup (They Do - NO CODE!)

**Time: 5 minutes**

1. **Import Flow**
   - Open Node-RED: `http://<recamera-ip>:1880`
   - Menu → Import → Select `recamera-ai-integration-flow.json`
   - Click Deploy

2. **Copy the URL**
   - Look at Debug panel (right side)
   - Find message: `🎯 COPY THIS URL TO WEBSOCKET CLIENT CONFIG`
   - Copy the URL shown (looks like: `wss://...?token=xxx`)

3. **Paste the URL**
   - Scroll to bottom of flow
   - Double-click the gray `openai_ws_client` config node
   - Paste URL into "Path" field
   - Click Done
   - Click Deploy

4. **Test It!**
   - Click "Test: TTS" inject node → Hears AI voice
   - Click "Test: Gimbal Left" inject node → Camera moves
   - Click "Test: Ask AI" inject node → Full AI conversation

**That's it! No code, no configuration files, no API keys to manage.**

## 🎬 Demo Script for Restaurants

"Let me show you how easy this is..."

1. Open browser to Node-RED
2. Click Import → Select file → Deploy (10 seconds)
3. "See this URL in the debug panel? Copy it."
4. Double-click config node → Paste → Done → Deploy (20 seconds)
5. Click Test button → "The AI is now talking to your camera!"

**Total time: 30 seconds**

## 🔐 Security Benefits

Restaurant owners never see:
- ❌ OpenAI API keys
- ❌ Supabase credentials
- ❌ Cloudflare tokens
- ❌ Any sensitive configuration

They only see:
- ✅ A WebSocket URL (looks like a website address)
- ✅ Visual flow editor
- ✅ Test buttons

The token is embedded in the URL but:
- ✅ Only works for their specific camera
- ✅ Can be rotated from your admin panel
- ✅ Validated against Supabase on every connection
- ✅ Requires camera status = 'online'

## 💰 Cost Structure for Restaurants

**Hardware**: One-time reCamera purchase
**AI Service**: $10-25/month per camera (usage-based)
**Infrastructure**: Included in your HeySalad platform

No hidden fees, no developer costs, no maintenance contracts.

## 📊 Restaurant Benefits

**Labor Savings**:
- Automated kitchen monitoring
- AI-powered alerts
- Smart camera positioning
- Voice notifications

**Ease of Use**:
- No IT staff required
- No training needed
- Works out of the box
- Visual interface

**Scalability**:
- Add more cameras anytime
- Same simple setup
- Centralized management
- Cloud-based (no servers)

## 🆘 Support Process

**Restaurant calls with issue** → You check Laura dashboard → See camera logs → Fix remotely

They never need to:
- SSH into device
- Edit code
- Read documentation
- Understand APIs

## 📱 Marketing Copy

### Headline
"AI-Powered Kitchen Cameras That Anyone Can Set Up"

### Features
- ✅ 5-minute setup with zero coding
- ✅ Drag-and-drop visual programming
- ✅ Enterprise-grade security built-in
- ✅ AI voice responses in real-time
- ✅ Automatic camera control

### Call to Action
"See how easy it is - book a 5-minute demo"

## 📁 Files Ready for Restaurant

Give them:
1. `recamera-ai-integration-flow.json` - The flow to import
2. One-page PDF with 3 screenshots:
   - Import screen
   - Debug panel with URL
   - Config node with paste location

That's literally all they need!

## 🎓 Training Video Script (2 minutes)

1. "Open your browser and go to the reCamera IP address"
2. "Click the hamburger menu, then Import"
3. "Select the flow file we emailed you and click Deploy"
4. "Look at the right panel - see that URL? Copy it"
5. "Scroll down, double-click this gray box at the bottom"
6. "Paste the URL here and click Done, then Deploy"
7. "Now click this button to test - you'll hear the AI speaking!"
8. "That's it! Your AI camera is live."

## 🔮 Future Enhancements (Still No-Code)

- Pre-built flows for common scenarios
- Flow marketplace
- One-click flow deployment
- Mobile app for flow management
- Voice commands for flow testing

All while maintaining the no-code promise!

---

## Developer Notes

The magic happens here:

1. **Laura API** returns URL with token embedded: `?token=xxx`
2. **Cloudflare Worker** extracts token from query param
3. **Node-RED** just copies and pastes - doesn't understand tokens
4. **Restaurant owner** never touches API keys or credentials

This is the power of abstraction - complexity hidden, simplicity exposed.
