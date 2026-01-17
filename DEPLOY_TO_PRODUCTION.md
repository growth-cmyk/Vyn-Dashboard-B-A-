# Deploy Vyndo Dashboard v1.1 to Production

## Quick Deploy (5 Minutes)

### Step 1: Set Environment Variables in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables for **Production**, **Preview**, and **Development**:

```
VITE_SUPABASE_URL=https://gmorgozafqwevskcubff.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdtb3Jnb3phZnF3ZXZza2N1YmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MDI5NzQsImV4cCI6MjA1MjM3ODk3NH0.Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7E
```

**Note**: `BLOB_READ_WRITE_TOKEN` is automatically configured by Vercel

### Step 2: Enable Vercel Blob Storage

1. Go to Vercel Dashboard → Your Project → Storage
2. Click "Create Database" → Select "Blob"
3. Follow the prompts to enable Blob Storage

### Step 3: Deploy

```bash
# From project root
cd inventory-dashboard
vercel --prod
```

### Step 4: Verify Deployment

1. Visit your production URL
2. Navigate to "Data Management"
3. Upload a test CSV file
4. Check console for "✅ File uploaded to Vercel Blob"
5. Refresh the page
6. Verify data automatically loads
7. Check sidebar for green "Cloud Synced" indicator

---

## Detailed Deployment Steps

### Prerequisites

- [ ] Vercel account
- [ ] Vercel CLI installed (`npm i -g vercel`)
- [ ] Supabase project created
- [ ] Git repository connected to Vercel

### 1. Verify Local Build

```bash
cd inventory-dashboard
npm run build
```

Expected output:
```
✓ built in XXXms
```

### 2. Configure Vercel Project

If not already configured:

```bash
vercel
```

Follow prompts:
- Link to existing project? **Yes**
- Which scope? **Your account**
- Link to existing project? **Yes** (select your project)
- Which directory? **inventory-dashboard**

### 3. Set Environment Variables

**Option A: Via Vercel Dashboard**
1. Go to Settings → Environment Variables
2. Add variables for all environments
3. Click "Save"

**Option B: Via Vercel CLI**
```bash
vercel env add VITE_SUPABASE_URL production
# Paste: https://gmorgozafqwevskcubff.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY production
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Enable Blob Storage

1. Vercel Dashboard → Storage → Create Database
2. Select "Blob"
3. Choose region (closest to users)
4. Click "Create"

### 5. Deploy to Production

```bash
vercel --prod
```

Expected output:
```
🔍  Inspect: https://vercel.com/...
✅  Production: https://your-app.vercel.app
```

### 6. Post-Deployment Verification

**Test Upload Flow**:
1. Visit production URL
2. Go to Data Management
3. Upload inventory CSV
4. Check browser console:
   ```
   📦 Uploading inventory file to Vercel Blob: test.csv
   ✅ File uploaded to Vercel Blob: https://[blob-url]
   ✅ Inventory file backed up to Vercel Blob
   ```

**Test Re-hydration Flow**:
1. Refresh the page (F5)
2. Check browser console:
   ```
   🔄 Starting dashboard re-hydration from Vercel Blob...
   📥 Downloading file from Vercel Blob: https://[blob-url]
   ✅ Inventory file re-hydrated: test.csv
   📦 Processing inventory file from Blob...
   ✅ Loaded 150 inventory items
   ✅ Dashboard re-hydration complete!
   ```
3. Verify data displays automatically
4. Check sidebar shows green "Cloud Synced" indicator

**Test Business Logic**:
1. Navigate to Replenishment Planner
2. Verify "Statistical ROP" is active (not "Simple")
3. Check 15-day lead time for Blinkit items
4. Verify 6-month expiry calculations

---

## Troubleshooting

### Issue: "Blob upload failed"

**Solution**:
1. Check Vercel Blob Storage is enabled
2. Verify `BLOB_READ_WRITE_TOKEN` exists (auto-generated)
3. Check Vercel logs: `vercel logs`

### Issue: "Re-hydration not working"

**Solution**:
1. Check Supabase `file_uploads` table has entries
2. Verify environment variables are set
3. Check browser console for errors
4. Verify Blob URLs are accessible

### Issue: "Environment variables not found"

**Solution**:
1. Redeploy after setting variables: `vercel --prod --force`
2. Verify variables are set for "Production" environment
3. Check variable names match exactly (case-sensitive)

### Issue: "Statistical ROP shows 'Simple'"

**Solution**:
1. Verify sales file was uploaded
2. Check console for "Building demand map" message
3. Refresh page to trigger re-hydration
4. Upload sales file again if needed

---

## Monitoring

### Vercel Dashboard

**Check**:
- Deployments → Latest deployment status
- Analytics → Page views and performance
- Logs → Real-time application logs
- Storage → Blob usage metrics

### Supabase Dashboard

**Check**:
- Table Editor → `file_uploads` table
- Database → Storage usage
- API → Request logs

### Browser Console

**Monitor**:
- Upload success messages
- Re-hydration progress
- Error messages
- Performance metrics

---

## Rollback Plan

If deployment fails:

```bash
# Rollback to previous deployment
vercel rollback
```

Or via Vercel Dashboard:
1. Go to Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

---

## Performance Optimization

### After Deployment

1. **Enable Edge Functions** (optional):
   - Vercel Dashboard → Settings → Functions
   - Select "Edge" runtime for API routes

2. **Configure Caching**:
   - Add cache headers in `vercel.json`
   - Enable Vercel Edge Network

3. **Monitor Performance**:
   - Check Vercel Analytics
   - Monitor Blob Storage usage
   - Track Supabase query performance

---

## Security Checklist

- [x] Environment variables set in Vercel (not in code)
- [x] `.env.local` excluded from Git
- [x] Supabase credentials secured
- [x] HTTPS enforced (automatic with Vercel)
- [ ] Consider enabling Supabase RLS policies
- [ ] Consider adding user authentication
- [ ] Consider implementing rate limiting

---

## Success Criteria

✅ **Deployment Successful** when:
1. Production URL loads without errors
2. File upload works and shows cloud backup
3. Page refresh automatically loads data
4. Cloud sync indicator shows "Cloud Synced"
5. Statistical ROP remains active after refresh
6. 15-day lead time calculations work
7. All three file types (inventory, sales, campaigns) persist

---

## Next Steps After Deployment

1. **Share Production URL** with stakeholders
2. **Upload Real Data** (January 2026 files)
3. **Monitor Usage** for first 24 hours
4. **Collect Feedback** from users
5. **Plan v1.2** features based on feedback

---

## Support

**Issues?** Check:
1. Browser console for errors
2. Vercel logs: `vercel logs --follow`
3. Supabase logs in dashboard
4. Network tab for failed requests

**Still stuck?** Review:
- `V1.1_PRODUCTION_READY_FINAL.md`
- `CLOUD_DATA_PERSISTENCE_IMPLEMENTATION_COMPLETE.md`
- `TEST_CLOUD_PERSISTENCE.md`

---

**Ready to deploy? Run: `vercel --prod` 🚀**
