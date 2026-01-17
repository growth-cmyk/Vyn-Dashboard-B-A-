# Vercel Environment Variables - Vyndo Analytics v1.1

## Instructions
Copy these EXACT keys and values into your Vercel Dashboard under:
**Project Settings → Environment Variables**

## Required Environment Variables

### 1. Supabase URL
**Key:**
```
VITE_SUPABASE_URL
```

**Value:**
```
https://gmorgozafqwevskcubff.supabase.co
```

**Environment:** Production, Preview, Development (select all)

---

### 2. Supabase Anon Key
**Key:**
```
VITE_SUPABASE_ANON_KEY
```

**Value:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdtb3Jnb3phZnF3ZXZza2N1YmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MDI5NzQsImV4cCI6MjA1MjM3ODk3NH0.Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7E
```

**Environment:** Production, Preview, Development (select all)

---

### 3. Vercel Blob Storage Token (Auto-Configured)
**Key:**
```
BLOB_READ_WRITE_TOKEN
```

**Value:**
```
(This is automatically configured by Vercel when you enable Blob Storage)
```

**Environment:** Production, Preview, Development (select all)

**Note:** If not auto-configured, you can manually add it from Vercel Blob Storage settings.

---

## How to Add Environment Variables in Vercel

1. Go to your Vercel Dashboard
2. Select your project: **Vyndo Analytics Platform**
3. Click **Settings** in the top navigation
4. Click **Environment Variables** in the left sidebar
5. For each variable above:
   - Click **Add New**
   - Enter the **Key** (e.g., `VITE_SUPABASE_URL`)
   - Enter the **Value** (copy exactly from above)
   - Select **Production**, **Preview**, and **Development**
   - Click **Save**

## Verification

After adding all environment variables:

1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Wait for build to complete
4. Visit your live site
5. Check browser console for successful Supabase connection
6. Upload a file to verify Blob Storage is working

## Troubleshooting

### If Supabase connection fails:
- Verify `VITE_SUPABASE_URL` matches exactly (no trailing slash)
- Verify `VITE_SUPABASE_ANON_KEY` is copied completely (it's a long JWT token)
- Check browser console for specific error messages

### If Blob Storage fails:
- Ensure `BLOB_READ_WRITE_TOKEN` is set (check Vercel Blob Storage settings)
- Verify `/api/blob-upload.ts` serverless function is deployed
- Check Vercel function logs for errors

### If environment variables don't take effect:
- Redeploy the project after adding variables
- Clear browser cache and hard refresh (Ctrl+Shift+R)
- Check that variables are set for the correct environment (Production)

## Security Notes

- These environment variables are safe to use in production
- The Supabase anon key is designed for client-side use
- Row Level Security (RLS) policies protect your data
- Never commit these values to public repositories (use .env.example instead)

## Next Steps

After configuring environment variables:

1. ✅ Redeploy your Vercel project
2. ✅ Test file upload functionality
3. ✅ Verify cloud sync indicator shows "Connected"
4. ✅ Upload inventory/sales/campaign files
5. ✅ Refresh page to test re-hydration
6. ✅ Check Supabase dashboard for data persistence

---

**Version:** 1.1.0  
**Last Updated:** January 17, 2026  
**Status:** Production Ready ✅
