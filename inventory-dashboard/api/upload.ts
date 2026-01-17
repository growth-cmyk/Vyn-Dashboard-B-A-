import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

// Supabase configuration
const SUPABASE_URL = 'https://gmorgozafqwevskcubff.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdtb3Jnb3phZnF3ZXZza2N1YmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MDI5NzQsImV4cCI6MjA1MjM3ODk3NH0.Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7E';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

interface UploadResult {
  fileId: string;
  url: string;
  path: string;
  metadata: {
    filename: string;
    fileSize: number;
    platform: string;
    uploadTimestamp: Date;
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the multipart form data
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB limit
      allowEmptyFiles: false,
    });

    const [fields, files] = await form.parse(req);
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const platform = Array.isArray(fields.platform) ? fields.platform[0] : fields.platform;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' });
    }

    // Validate file type
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    if (!allowedTypes.includes(file.mimetype || '')) {
      return res.status(400).json({ error: 'Invalid file type. Only CSV and Excel files are allowed.' });
    }

    // Read file content
    const fileContent = fs.readFileSync(file.filepath);
    
    // Generate file path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${timestamp}_${file.originalFilename}`;
    const filePath = `uploads/${platform}/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${fileName}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('inventory-files')
      .upload(filePath, fileContent, {
        contentType: file.mimetype || 'application/octet-stream',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ error: `Failed to upload file: ${uploadError.message}` });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('inventory-files')
      .getPublicUrl(filePath);

    // Save file metadata to database
    const fileMetadata = {
      filename: file.originalFilename || 'unknown',
      file_size: file.size,
      file_type: file.mimetype || 'application/octet-stream',
      storage_path: filePath,
      platform: platform,
      processing_status: 'pending' as const,
      metadata: {
        originalName: file.originalFilename,
        uploadTimestamp: new Date()
      }
    };

    const { data: dbData, error: dbError } = await supabase
      .from('file_uploads')
      .insert(fileMetadata)
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      return res.status(500).json({ error: `Failed to save file metadata: ${dbError.message}` });
    }

    const result: UploadResult = {
      fileId: dbData.id,
      url: urlData.publicUrl,
      path: filePath,
      metadata: {
        filename: file.originalFilename || 'unknown',
        fileSize: file.size,
        platform: platform,
        uploadTimestamp: new Date(),
        processingStatus: 'pending' as const
      }
    };

    // Clean up temporary file
    fs.unlinkSync(file.filepath);

    return res.status(200).json(result);

  } catch (error: any) {
    console.error('Upload API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}