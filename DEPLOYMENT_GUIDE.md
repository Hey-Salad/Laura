# Laura Deployment Guide - Vercel + Custom Domain

## Prerequisites

1. Vercel account (free tier works!)
2. GitHub account
3. Domain access for heysalad.app
4. All environment variables ready

---

## Step 1: Push to GitHub

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Prepare for Vercel deployment"

# Create repo on GitHub: https://github.com/new
# Name it: heysalad-laura

# Add remote and push
git remote add origin https://github.com/YOUR-USERNAME/heysalad-laura.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy to Vercel

### Option A: Via Vercel CLI (Fastest)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: heysalad-laura
# - Directory: ./
# - Override settings? No

# Deploy to production
vercel --prod
```

### Option B: Via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your GitHub repo
3. Configure:
   - **Framework**: Next.js
   - **Root Directory**: ./
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
4. Click **Deploy**

---

## Step 3: Configure Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables

Add ALL of these:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Mapbox
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# SendGrid
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=

# App Config
NEXT_PUBLIC_APP_URL=https://laura.heysalad.app
REWARDS_THRESHOLD_MINUTES=5
ADMIN_EMAILS=your-email@heysalad.com

# Node Environment
NODE_ENV=production
```

**After adding variables, redeploy:**
```bash
vercel --prod
```

---

## Step 4: Add Custom Domain (laura.heysalad.app)

### In Vercel Dashboard:

1. Go to **Project → Settings → Domains**
2. Click **Add Domain**
3. Enter: `laura.heysalad.app`
4. Click **Add**

Vercel will show DNS records to add:

```
Type: CNAME
Name: laura
Value: cname.vercel-dns.com
```

### In Your DNS Provider (Cloudflare/Namecheap/etc):

1. Log into your DNS provider for `heysalad.app`
2. Add CNAME record:
   - **Name**: `laura`
   - **Target/Value**: `cname.vercel-dns.com`
   - **TTL**: Auto or 3600
3. Save

**Wait 5-60 minutes** for DNS propagation.

### Verify:

```bash
# Check DNS
dig laura.heysalad.app

# Should show:
# laura.heysalad.app. 300 IN CNAME cname.vercel-dns.com.
```

Once verified, Vercel will automatically provision SSL certificate (free!).

---

## Step 5: Update Environment Variables

After domain is active, update:

```bash
NEXT_PUBLIC_APP_URL=https://laura.heysalad.app
```

Redeploy:
```bash
vercel --prod
```

---

## Step 6: Test Production Deployment

1. Visit https://laura.heysalad.app
2. Should redirect to `/login`
3. Test magic link auth
4. Test all pages work
5. Check real-time updates
6. Verify toast notifications

---

## Troubleshooting

### Build Fails

Check build logs in Vercel dashboard:
```bash
# Common issues:
# - Missing env vars
# - TypeScript errors
# - Dependency issues

# Test build locally first:
npm run build
```

### Domain Not Working

```bash
# Check DNS propagation
nslookup laura.heysalad.app

# Check SSL certificate
curl -I https://laura.heysalad.app
```

### API Routes 500 Error

- Check env vars are set in Vercel
- Check Supabase connection
- Check logs: Vercel Dashboard → Functions → Logs

### Real-Time Not Working

Update `NEXT_PUBLIC_APP_URL` to production domain and redeploy

---

## Monitoring

### Vercel Analytics (Free)

1. Go to Project → Analytics
2. Enable Analytics
3. Track:
   - Page views
   - API calls
   - Error rates

### Supabase Logs

1. Supabase Dashboard → Logs
2. Monitor API calls
3. Check for errors

---

## Continuous Deployment

Once setup, every push to `main` branch auto-deploys:

```bash
git add .
git commit -m "Update feature"
git push origin main

# Vercel auto-deploys!
# Check status: https://vercel.com/dashboard
```

---

## Domain Email (Bonus)

Setup magic link emails from `noreply@laura.heysalad.app`:

1. Configure SendGrid sender authentication
2. Add DNS records for SPF, DKIM
3. Update `SENDGRID_FROM_EMAIL`

---

## Cost Estimate

- **Vercel**: Free (Hobby tier includes 100GB bandwidth, unlimited requests)
- **Domain**: Already owned (heysalad.app)
- **SSL**: Free (Let's Encrypt via Vercel)
- **Total**: $0/month! 🎉

(Upgrade to Pro ($20/mo) if you need more bandwidth or team features)

---

## Next Steps After Deployment

1. ✅ Deploy to Vercel
2. ✅ Add custom domain
3. ✅ Test everything works
4. 🔄 Add features (see PRODUCTION_FEATURES.md)
5. 📊 Setup monitoring
6. 🚀 Launch!

---

Generated: 2025-10-28
