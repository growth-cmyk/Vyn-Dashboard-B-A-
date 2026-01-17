# Cloud Data Persistence - Testing Guide

## Quick Test Procedure

### Prerequisites
1. Ensure you have the January 2026 inventory and sales CSV files ready
2. Ensure Vercel Blob Storage is enabled in your Vercel project
3. Ensure Supabase is configured and accessible

### Test 1: Inventory Upload & Re-hydration
1. **Navigate** to Data Management view
2. **Upload** your inventory CSV file (e.g., "Blinkit - InventoryData - 1 To 14.csv")
3. **Observe** the LoadingTimeline:
   - ✓ Reading file...
   - ✓ Processing data...
   - ✓ ☁️ Backing up to Cloud...
   - ✓ Complete!
4. **Verify** inventory data displays in dashboard
5. **Check** console for: "✅ Inventory file backed up to Vercel Blob"
6. **Refresh** the browser (F5 or Ctrl+R)
7. **Observe** re-hydration indicator: "🔄 Re-hydrating from Cloud..."
8. **Verify** inventory data automatically loads without manual upload
9. **Check** console for: "✅ Inventory file re-hydrated: [filename]"

### Test 2: Sales Upload & Re-hydration
1. **Navigate** to Data Management view
2. **Upload** your sales CSV file (e.g., "Dec 1 To 14 - Blinkit Sales Report.csv")
3. **Observe** the LoadingTimeline with cloud backup step
4. **Verify** sales data displays in dashboard
5. **Refresh** the browser
6. **Verify** sales data automatically loads
7. **Check** console for re-hydration messages

### Test 3: Campaign Upload & Re-hydration
1. **Navigate** to Data Management view
2. **Upload** your campaign Excel file
3. **Observe** the LoadingTimeline
4. **Verify** automatic navigation to Marketing Analysis
5. **Refresh** the browser
6. **Verify** campaign data automatically loads

### Test 4: Business Logic Verification

#### 15-Day Lead Time (Blinkit)
1. Upload Blinkit inventory data
2. Navigate to Replenishment Planner
3. **Verify** lead time calculations show 15 days for Blinkit items
4. Refresh browser
5. **Verify** lead time calculations remain 15 days after re-hydration

#### 6-Month Expiry Logic
1. Upload inventory data with various expiry dates
2. Navigate to Stock Analysis
3. **Verify** items with 91+ days show expiry risk
4. Refresh browser
5. **Verify** expiry risk calculations remain correct after re-hydration

#### Statistical ROP Demand Map
1. Upload sales data
2. Navigate to Replenishment Planner
3. **Verify** ROP calculations use demand map
4. Refresh browser
5. **Verify** ROP calculations work with re-hydrated sales data

### Test 5: Error Handling

#### Cloud Unavailable
1. Disconnect from internet (or block Vercel Blob domain)
2. Upload a file
3. **Verify** LoadingTimeline shows: "⚠️ Cloud backup failed (data saved locally)"
4. **Verify** data still displays correctly
5. **Verify** dashboard functions normally

#### Invalid File
1. Upload a non-CSV file to inventory upload
2. **Verify** error message displays
3. **Verify** LoadingTimeline shows error state

### Test 6: Platform Switching
1. Upload Blinkit inventory data
2. Switch to Amazon platform
3. **Verify** empty state (no Amazon data)
4. Upload Amazon inventory data
5. Switch back to Blinkit
6. **Verify** Blinkit data still displays
7. Refresh browser
8. **Verify** Blinkit data re-hydrates correctly

## Expected Console Output

### Successful Upload
```
📦 Uploading inventory file to Vercel Blob: Blinkit - InventoryData - 1 To 14.csv
✅ File uploaded to Vercel Blob: https://[blob-url]
✅ Inventory file backed up to Vercel Blob
```

### Successful Re-hydration
```
🔄 Starting dashboard re-hydration from Vercel Blob...
ℹ️ No blob URL found for sales (Blinkit)
📥 Downloading file from Vercel Blob: https://[blob-url]
✅ File downloaded from Vercel Blob: 12345 bytes
✅ Inventory file re-hydrated: Blinkit - InventoryData - 1 To 14.csv
📦 Processing inventory file from Blob...
✅ Loaded 150 inventory items
✅ Dashboard re-hydration complete!
🔄 Applying re-hydrated data to dashboard...
```

### Cloud Backup Failure (Graceful)
```
📦 Uploading inventory file to Vercel Blob: test.csv
❌ Blob upload error: [error message]
⚠️ Cloud backup failed, but data is saved locally: [error details]
```

## Verification Checklist

### Upload Flow
- [ ] LoadingTimeline displays during upload
- [ ] Cloud backup step shows in timeline
- [ ] Console shows "✅ File uploaded to Vercel Blob"
- [ ] Data displays correctly in dashboard
- [ ] Supabase `file_uploads` table has new entry

### Re-hydration Flow
- [ ] Re-hydration indicator shows on page load
- [ ] Console shows "🔄 Starting dashboard re-hydration..."
- [ ] Console shows "✅ Dashboard re-hydration complete!"
- [ ] Data automatically populates without manual upload
- [ ] All three file types (inventory, sales, campaign) re-hydrate

### Business Logic
- [ ] 15-day lead time applied after re-hydration
- [ ] 6-month expiry logic works after re-hydration
- [ ] Statistical ROP calculations work with re-hydrated data
- [ ] Campaign strategic actions preserved after re-hydration

### Error Handling
- [ ] Cloud failure shows warning but continues
- [ ] Invalid files show error messages
- [ ] Empty state shows when no data available
- [ ] Platform switching works correctly

## Troubleshooting

### Re-hydration Not Working
1. Check browser console for errors
2. Verify Supabase connection: Check `file_uploads` table
3. Verify Vercel Blob: Check Vercel dashboard for uploaded files
4. Check network tab for API calls to `/api/blob-upload`

### Cloud Backup Failing
1. Verify `BLOB_READ_WRITE_TOKEN` environment variable in Vercel
2. Check Vercel Blob Storage is enabled in project settings
3. Verify file size is under 5MB
4. Check network tab for 500 errors on `/api/blob-upload`

### Business Logic Not Preserved
1. Verify DataService is processing re-hydrated files
2. Check console for "Processing inventory file from Blob..."
3. Verify file format matches expected CSV structure
4. Check platform detection is working correctly

## Success Criteria

✅ **All tests pass**
✅ **January 2026 data persists after refresh**
✅ **Business logic calculations remain accurate**
✅ **Error handling works gracefully**
✅ **Platform switching maintains separate data**

## Next Steps After Testing

1. Deploy to Vercel production
2. Monitor Vercel Blob usage metrics
3. Monitor Supabase storage usage
4. Collect user feedback on re-hydration UX
5. Consider implementing property-based tests (optional tasks)
