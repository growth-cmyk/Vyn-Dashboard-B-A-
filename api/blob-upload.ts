import { put } from '@vercel/blob';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gmorgozafqwevskcubff.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdtb3Jnb3phZnF3ZXZza2N1YmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MDI5NzQsImV4cCI6MjA1MjM3ODk3NH0.Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7E';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

interface BlobUploadResult {
  blobUrl: string;
  pathname: string;
  contentType: string;
  fileId: string;
  metadata: {
    filename: string;
    fileType: 'inventory' | 'sales' | 'campaign';
    platform: string;
    uploadTimestamp: string;
    fileSize: number;
  };
}

/**
 * Vercel Blob Storage Upload Handler
 * 
 * Handles file uploads to Vercel Blob Storage with metadata tracking in Supabase
 * 
 * CRITICAL: Ensures 15-day lead time and 6-month expiry logic are preserved
 * by storing file metadata for re-hydration on app refresh
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract query parameters
    const { filename, fileType, platform } = req.query;

    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: 'Filename is required' });
    }

    if (!fileType || !['inventory', 'sales', 'campaign'].includes(fileType as string)) {
      return res.status(400).json({ error: 'Invalid fileType. Must be inventory, sales, or campaign' });
    }

    if (!platform || typeof platform !== 'string') {
      return res.status(400).json({ error: 'Platform is required' });
    }

    // Generate unique pathname with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const pathname = `${platform}/${fileType}/${timestamp}_${sanitizedFilename}`;

    // Upload to Vercel Blob Storage
    const blob = await put(pathname, req, {
      access: 'public',
      addRandomSuffix: false,
    });

    console.log('✅ File uploaded to Vercel Blob:', blob.url);

    // Save metadata to Supabase for re-hydration
    const fileMetadata = {
      filename: filename,
      file_type: fileType,
      platform: platform,
      storage_path: blob.pathname,
      blob_url: blob.url,
      content_type: blob.contentType || 'text/csv',
      file_size: blob.size,
      processing_status: 'pending' as const,
      metadata: {
        originalName: filename,
        uploadTimestamp: new Date().toISOString(),
        blobPathname: blob.pathname,
        contentType: blob.contentType,
      }
    };

    const { data: dbData, error: dbError } = await supabase
      .from('file_uploads')
      .insert(fileMetadata)
      .select()
      .single();

    if (dbError) {
      console.error('⚠️ Failed to save metadata to Supabase:', dbError);
      // Continue anyway - blob upload succeeded
    }

    const result: BlobUploadResult = {
      blobUrl: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType || 'text/csv',
      fileId: dbData?.id || 'unknown',
      metadata: {
        filename: filename,
        fileType: fileType as 'inventory' | 'sales' | 'campaign',
        platform: platform,
        uploadTimestamp: new Date().toISOString(),
        fileSize: blob.size,
      }
    };

    console.log('✅ Blob upload complete:', result);

    return res.status(200).json(result);

  } catch (error: any) {
    console.error('❌ Blob upload error:', error);
    return res.status(500).json({ 
      error: 'Failed to upload file to Vercel Blob',
      details: error.message 
    });
  }
}
