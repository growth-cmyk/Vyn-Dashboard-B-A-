/**
 * BlobStorageService - Handles Vercel Blob Storage operations
 * 
 * Features:
 * - Upload files to Vercel Blob Storage via serverless API
 * - Store blob URLs in Supabase for persistence
 * - Re-hydrate dashboard from blob URLs on app refresh
 * - Maintain 15-day lead time and 6-month expiry logic
 */

import { supabaseService } from './SupabaseService';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://gmorgozafqwevskcubff.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdtb3Jnb3phZnF3ZXZza2N1YmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MDI5NzQsImV4cCI6MjA1MjM3ODk3NH0.Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7E';

export interface BlobUploadResult {
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

export interface BlobFileMetadata {
  id: string;
  filename: string;
  fileType: 'inventory' | 'sales' | 'campaign';
  platform: string;
  blobUrl: string;
  pathname: string;
  uploadTimestamp: Date;
  fileSize: number;
}

export class BlobStorageService {
  private static readonly BLOB_UPLOAD_ENDPOINT = '/api/blob-upload';

  /**
   * Upload file to Vercel Blob Storage
   * 
   * @param file - File to upload
   * @param fileType - Type of file (inventory, sales, campaign)
   * @param platform - Platform identifier (Blinkit, Amazon)
   * @returns Blob upload result with URL and metadata
   */
  static async uploadFile(
    file: File,
    fileType: 'inventory' | 'sales' | 'campaign',
    platform: string
  ): Promise<BlobUploadResult> {
    try {
      console.log(`📦 Uploading ${fileType} file to Vercel Blob:`, file.name);

      // Construct upload URL with query parameters
      const uploadUrl = `${this.BLOB_UPLOAD_ENDPOINT}?filename=${encodeURIComponent(file.name)}&fileType=${fileType}&platform=${platform}`;

      // Upload file to Vercel Blob via serverless API
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: file,
        headers: {
          'Content-Type': file.type || 'text/csv',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Blob upload failed: ${errorData.error || response.statusText}`);
      }

      const result: BlobUploadResult = await response.json();
      console.log('✅ File uploaded to Vercel Blob:', result.blobUrl);

      return result;
    } catch (error) {
      console.error('❌ Blob upload error:', error);
      throw new Error(`Failed to upload file to Vercel Blob: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get latest blob URL for a specific file type and platform
   * Used for re-hydration on app refresh
   * 
   * @param fileType - Type of file to retrieve
   * @param platform - Platform identifier
   * @returns Latest blob URL or null if not found
   */
  static async getLatestBlobUrl(
    fileType: 'inventory' | 'sales' | 'campaign',
    platform: string
  ): Promise<BlobFileMetadata | null> {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      const { data, error } = await supabase
        .from('file_uploads')
        .select('*')
        .eq('file_type', fileType)
        .eq('platform', platform)
        .not('blob_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        console.log(`ℹ️ No blob URL found for ${fileType} (${platform})`);
        return null;
      }

      return {
        id: data.id,
        filename: data.filename,
        fileType: data.file_type as 'inventory' | 'sales' | 'campaign',
        platform: data.platform,
        blobUrl: data.blob_url,
        pathname: data.storage_path,
        uploadTimestamp: new Date(data.created_at),
        fileSize: data.file_size || 0,
      };
    } catch (error) {
      console.error('❌ Error fetching blob URL:', error);
      return null;
    }
  }

  /**
   * Download file from Vercel Blob Storage
   * 
   * @param blobUrl - Blob URL to download from
   * @returns File content as Blob
   */
  static async downloadFile(blobUrl: string): Promise<Blob> {
    try {
      console.log('📥 Downloading file from Vercel Blob:', blobUrl);

      const response = await fetch(blobUrl);

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('✅ File downloaded from Vercel Blob:', blob.size, 'bytes');

      return blob;
    } catch (error) {
      console.error('❌ Blob download error:', error);
      throw new Error(`Failed to download file from Vercel Blob: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Re-hydrate dashboard from latest blob URLs
   * Fetches latest inventory and sales files from Vercel Blob and processes them
   * 
   * CRITICAL: Maintains 15-day lead time and 6-month expiry logic
   * 
   * @param platform - Platform to re-hydrate for
   * @returns Object with inventory and sales data, or null if no data found
   */
  static async rehydrateDashboard(platform: string): Promise<{
    inventory: File | null;
    sales: File | null;
    campaign: File | null;
  }> {
    try {
      console.log(`🔄 Re-hydrating dashboard for platform: ${platform}`);

      // Fetch latest blob URLs
      const [inventoryMeta, salesMeta, campaignMeta] = await Promise.all([
        this.getLatestBlobUrl('inventory', platform),
        this.getLatestBlobUrl('sales', platform),
        this.getLatestBlobUrl('campaign', platform),
      ]);

      // Download files from blob URLs
      const results = {
        inventory: null as File | null,
        sales: null as File | null,
        campaign: null as File | null,
      };

      if (inventoryMeta) {
        const blob = await this.downloadFile(inventoryMeta.blobUrl);
        results.inventory = new File([blob], inventoryMeta.filename, { type: 'text/csv' });
        console.log('✅ Inventory file re-hydrated:', inventoryMeta.filename);
      }

      if (salesMeta) {
        const blob = await this.downloadFile(salesMeta.blobUrl);
        results.sales = new File([blob], salesMeta.filename, { type: 'text/csv' });
        console.log('✅ Sales file re-hydrated:', salesMeta.filename);
      }

      if (campaignMeta) {
        const blob = await this.downloadFile(campaignMeta.blobUrl);
        results.campaign = new File([blob], campaignMeta.filename, { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        console.log('✅ Campaign file re-hydrated:', campaignMeta.filename);
      }

      return results;
    } catch (error) {
      console.error('❌ Dashboard re-hydration error:', error);
      throw new Error(`Failed to re-hydrate dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if blob storage is available and configured
   */
  static async checkBlobStorageAvailability(): Promise<boolean> {
    try {
      const response = await fetch(this.BLOB_UPLOAD_ENDPOINT, {
        method: 'OPTIONS',
      });
      return response.ok || response.status === 405; // 405 = Method Not Allowed (endpoint exists)
    } catch (error) {
      console.warn('⚠️ Blob storage not available:', error);
      return false;
    }
  }
}
