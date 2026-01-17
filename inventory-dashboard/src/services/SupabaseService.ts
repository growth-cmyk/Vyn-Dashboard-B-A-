import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { InventorySnapshot, Platform } from '../types';

// Marketing types for cloud operations
interface MarketingSnapshot {
  campaignName: string;
  campaignType: string;
  sku?: string;
  platform: Platform;
  date: Date;
  budgetConsumed: number;
  directSales: number;
  indirectSales?: number;
  impressions?: number;
  uniqueClicks?: number;
  ctr: number;
  addToCart?: number;
  indirectAddToCart?: number;
  quantitiesSold?: number;
  indirectQuantitiesSold?: number;
  newUsersAcquired?: number;
  uploadTimestamp: Date;
  uploadSource: string;
  metadata?: any;
}

// Supabase configuration from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://gmorgozafqwevskcubff.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdtb3Jnb3phZnF3ZXZza2N1YmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MDI5NzQsImV4cCI6MjA1MjM3ODk3NH0.Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7E';

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2
};

interface UploadResult {
  fileId: string;
  url: string;
  path: string;
  metadata: {
    filename: string;
    fileSize: number;
    platform: Platform;
    uploadTimestamp: Date;
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  };
}

interface StorageUsage {
  totalSize: number;
  usedSize: number;
  availableSize: number;
  fileCount: number;
}

interface DatabaseUsage {
  totalSize: number;
  usedSize: number;
  availableSize: number;
  tables: {
    inventory_history: { rowCount: number; size: number };
    file_uploads: { rowCount: number; size: number };
  };
}

export class SupabaseService {
  private supabase: SupabaseClient;
  private isInitialized: boolean = false;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const { data, error } = await this.supabase.from('inventory_history').select('count', { count: 'exact', head: true });
      if (error && error.code !== 'PGRST116') { // PGRST116 is "relation does not exist"
        console.warn('Supabase connection issue:', error.message);
      }
      this.isInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize Supabase connection:', error);
      this.isInitialized = false;
    }
  }
  // Health check and connection status
  async checkConnection(): Promise<boolean> {
    try {
      const { error } = await this.supabase.from('inventory_history').select('count', { count: 'exact', head: true });
      return !error;
    } catch (error) {
      console.warn('Supabase connection check failed:', error);
      return false;
    }
  }

  // Retry wrapper for operations
  private async withRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === config.maxAttempts) {
          throw lastError;
        }
        
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
          config.maxDelay
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  // Database operations
  async saveInventorySnapshots(snapshots: InventorySnapshot[]): Promise<void> {
    return this.withRetry(async () => {
      const dbSnapshots = snapshots.map(snapshot => ({
        item_id: snapshot.itemId,
        warehouse_id: snapshot.warehouseFacilityId,
        total_sellable: snapshot.totalSellable,
        platform: snapshot.platform,
        upload_date: snapshot.timestamp,
        snapshot_timestamp: snapshot.timestamp,
        upload_source: snapshot.uploadSource,
        metadata: {
          platformMetadata: snapshot.platformMetadata
        }
      }));

      const { error } = await this.supabase
        .from('inventory_history')
        .insert(dbSnapshots);

      if (error) {
        throw new Error(`Failed to save inventory snapshots: ${error.message}`);
      }
    });
  }

  async getInventoryHistory(
    platform?: Platform,
    limit: number = 100,
    offset: number = 0
  ): Promise<InventorySnapshot[]> {
    return this.withRetry(async () => {
      let query = this.supabase
        .from('inventory_history')
        .select('*')
        .order('snapshot_timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (platform) {
        query = query.eq('platform', platform);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch inventory history: ${error.message}`);
      }

      return (data || []).map(row => ({
        timestamp: new Date(row.snapshot_timestamp),
        itemId: row.item_id,
        warehouseFacilityId: row.warehouse_id,
        totalSellable: row.total_sellable,
        uploadSource: row.upload_source || 'unknown',
        platform: row.platform as Platform,
        platformMetadata: row.metadata?.platformMetadata || {
          uploadSource: row.upload_source || 'unknown',
          dataFormat: 'blinkit',
          recordCount: 1
        }
      }));
    });
  }

  async getLatestSnapshot(platform: Platform): Promise<InventorySnapshot | null> {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase
        .from('inventory_history')
        .select('*')
        .eq('platform', platform)
        .order('snapshot_timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No data found
        }
        throw new Error(`Failed to fetch latest snapshot: ${error.message}`);
      }

      if (!data) return null;

      return {
        timestamp: new Date(data.snapshot_timestamp),
        itemId: data.item_id,
        warehouseFacilityId: data.warehouse_id,
        totalSellable: data.total_sellable,
        uploadSource: data.upload_source || 'unknown',
        platform: data.platform as Platform,
        platformMetadata: data.metadata?.platformMetadata || {
          uploadSource: data.upload_source || 'unknown',
          dataFormat: 'blinkit',
          recordCount: 1
        }
      };
    });
  }
  // File operations
  async uploadFile(file: File, platform: Platform): Promise<UploadResult> {
    return this.withRetry(async () => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${timestamp}_${file.name}`;
      const filePath = `uploads/${platform}/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${fileName}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('inventory-files')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('inventory-files')
        .getPublicUrl(filePath);

      // Save file metadata to database
      const fileMetadata = {
        filename: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: filePath,
        platform: platform,
        processing_status: 'pending' as const,
        metadata: {
          originalName: file.name,
          uploadTimestamp: new Date()
        }
      };

      const { data: dbData, error: dbError } = await this.supabase
        .from('file_uploads')
        .insert(fileMetadata)
        .select()
        .single();

      if (dbError) {
        throw new Error(`Failed to save file metadata: ${dbError.message}`);
      }

      return {
        fileId: dbData.id,
        url: urlData.publicUrl,
        path: filePath,
        metadata: {
          filename: file.name,
          fileSize: file.size,
          platform: platform,
          uploadTimestamp: new Date(),
          processingStatus: 'pending' as const
        }
      };
    });
  }

  async downloadFile(filePath: string): Promise<Blob | null> {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase.storage
        .from('inventory-files')
        .download(filePath);

      if (error) {
        throw new Error(`Failed to download file: ${error.message}`);
      }

      return data;
    });
  }

  async deleteFile(filePath: string): Promise<boolean> {
    return this.withRetry(async () => {
      const { error } = await this.supabase.storage
        .from('inventory-files')
        .remove([filePath]);

      if (error) {
        throw new Error(`Failed to delete file: ${error.message}`);
      }

      return true;
    });
  }

  // Usage monitoring
  async getStorageUsage(): Promise<StorageUsage> {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase.storage
        .from('inventory-files')
        .list();

      if (error) {
        throw new Error(`Failed to get storage usage: ${error.message}`);
      }

      const totalSize = (data || []).reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
      const fileCount = (data || []).length;

      return {
        totalSize,
        usedSize: totalSize,
        availableSize: 1024 * 1024 * 1024 - totalSize, // 1GB - used
        fileCount
      };
    });
  }

  async getDatabaseUsage(): Promise<DatabaseUsage> {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase.rpc('get_storage_usage');

      if (error) {
        throw new Error(`Failed to get database usage: ${error.message}`);
      }

      const usage = data || [];
      const inventoryHistory = usage.find((row: any) => row.table_name === 'inventory_history') || { row_count: 0, size_bytes: 0 };
      const fileUploads = usage.find((row: any) => row.table_name === 'file_uploads') || { row_count: 0, size_bytes: 0 };
      const marketingHistory = usage.find((row: any) => row.table_name === 'marketing_history') || { row_count: 0, size_bytes: 0 };

      const totalUsed = inventoryHistory.size_bytes + fileUploads.size_bytes + marketingHistory.size_bytes;

      return {
        totalSize: 500 * 1024 * 1024, // 500MB free tier
        usedSize: totalUsed,
        availableSize: 500 * 1024 * 1024 - totalUsed,
        tables: {
          inventory_history: {
            rowCount: inventoryHistory.row_count,
            size: inventoryHistory.size_bytes
          },
          file_uploads: {
            rowCount: fileUploads.row_count,
            size: fileUploads.size_bytes
          }
        }
      };
    });
  }

  // Marketing operations
  async saveMarketingSnapshots(snapshots: MarketingSnapshot[]): Promise<void> {
    return this.withRetry(async () => {
      const dbSnapshots = snapshots.map(snapshot => ({
        campaign_name: snapshot.campaignName,
        campaign_type: snapshot.campaignType,
        sku: snapshot.sku,
        platform: snapshot.platform,
        date: snapshot.date.toISOString().split('T')[0], // Date only
        budget_consumed: snapshot.budgetConsumed,
        direct_sales: snapshot.directSales,
        indirect_sales: snapshot.indirectSales || 0,
        impressions: snapshot.impressions || 0,
        unique_clicks: snapshot.uniqueClicks || 0,
        ctr: snapshot.ctr,
        add_to_cart: snapshot.addToCart || 0,
        indirect_add_to_cart: snapshot.indirectAddToCart || 0,
        quantities_sold: snapshot.quantitiesSold || 0,
        indirect_quantities_sold: snapshot.indirectQuantitiesSold || 0,
        new_users_acquired: snapshot.newUsersAcquired || 0,
        upload_timestamp: snapshot.uploadTimestamp,
        upload_source: snapshot.uploadSource,
        metadata: snapshot.metadata || {}
      }));

      const { error } = await this.supabase
        .from('marketing_history')
        .insert(dbSnapshots);

      if (error) {
        throw new Error(`Failed to save marketing snapshots: ${error.message}`);
      }
    });
  }

  async getMarketingHistory(
    platform?: Platform,
    limit: number = 100,
    offset: number = 0
  ): Promise<MarketingSnapshot[]> {
    return this.withRetry(async () => {
      let query = this.supabase
        .from('marketing_history')
        .select('*')
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (platform) {
        query = query.eq('platform', platform);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch marketing history: ${error.message}`);
      }

      return (data || []).map(row => ({
        campaignName: row.campaign_name,
        campaignType: row.campaign_type,
        sku: row.sku,
        platform: row.platform as Platform,
        date: new Date(row.date),
        budgetConsumed: row.budget_consumed,
        directSales: row.direct_sales,
        indirectSales: row.indirect_sales,
        impressions: row.impressions,
        uniqueClicks: row.unique_clicks,
        ctr: row.ctr,
        addToCart: row.add_to_cart,
        indirectAddToCart: row.indirect_add_to_cart,
        quantitiesSold: row.quantities_sold,
        indirectQuantitiesSold: row.indirect_quantities_sold,
        newUsersAcquired: row.new_users_acquired,
        uploadTimestamp: new Date(row.upload_timestamp),
        uploadSource: row.upload_source,
        metadata: row.metadata
      }));
    });
  }

  // User preferences operations for ROP settings cloud sync
  async saveUserPreferences(preferences: {
    serviceLevel: number;
    forecastQuantities: Record<string, number>;
    leadTime?: number;
    safetyDays?: number;
  }): Promise<void> {
    return this.withRetry(async () => {
      const userId = 'default_user'; // Single user for now

      const { error } = await this.supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          service_level: preferences.serviceLevel,
          forecast_quantities: preferences.forecastQuantities,
          lead_time: preferences.leadTime || 15,
          safety_days: preferences.safetyDays || 3,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        throw new Error(`Failed to save user preferences: ${error.message}`);
      }
    });
  }

  async getUserPreferences(): Promise<{
    serviceLevel: number;
    forecastQuantities: Record<string, number>;
    leadTime: number;
    safetyDays: number;
  } | null> {
    return this.withRetry(async () => {
      const userId = 'default_user'; // Single user for now

      const { data, error } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No preferences found
        }
        throw new Error(`Failed to fetch user preferences: ${error.message}`);
      }

      if (!data) return null;

      return {
        serviceLevel: data.service_level,
        forecastQuantities: data.forecast_quantities || {},
        leadTime: data.lead_time || 15,
        safetyDays: data.safety_days || 3
      };
    });
  }

  // Demand history for Statistical ROP - Cloud Sync
  async saveDemandHistory(demandMap: Map<string, number[]>): Promise<void> {
    return this.withRetry(async () => {
      const userId = 'default_user'; // Single user for now
      
      // Convert Map to array of records for database storage
      const demandRecords = Array.from(demandMap.entries()).flatMap(([itemId, monthlyDemand]) => 
        monthlyDemand.map((quantity, monthIndex) => ({
          user_id: userId,
          item_id: itemId,
          month_index: monthIndex,
          quantity: quantity,
          updated_at: new Date().toISOString()
        }))
      );

      if (demandRecords.length === 0) {
        return; // Nothing to save
      }

      // Delete existing demand history for this user before inserting new data
      const { error: deleteError } = await this.supabase
        .from('sku_demand_history')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.warn('Failed to clear old demand history:', deleteError.message);
      }

      // Insert new demand history in batches (Supabase has a limit)
      const batchSize = 1000;
      for (let i = 0; i < demandRecords.length; i += batchSize) {
        const batch = demandRecords.slice(i, i + batchSize);
        const { error } = await this.supabase
          .from('sku_demand_history')
          .insert(batch);

        if (error) {
          throw new Error(`Failed to save demand history batch: ${error.message}`);
        }
      }
    });
  }

  async getDemandHistory(): Promise<Map<string, number[]>> {
    return this.withRetry(async () => {
      const userId = 'default_user'; // Single user for now
      
      const { data, error } = await this.supabase
        .from('sku_demand_history')
        .select('item_id, month_index, quantity')
        .eq('user_id', userId)
        .order('item_id')
        .order('month_index');

      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01') {
          // No data found or table doesn't exist yet
          return new Map();
        }
        throw new Error(`Failed to get demand history: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return new Map();
      }

      // Convert array of records back to Map<itemId, monthlyDemand[]>
      const demandMap = new Map<string, number[]>();
      
      data.forEach((record: any) => {
        const itemId = record.item_id;
        const monthIndex = record.month_index;
        const quantity = record.quantity;
        
        if (!demandMap.has(itemId)) {
          demandMap.set(itemId, new Array(12).fill(0));
        }
        
        const monthlyDemand = demandMap.get(itemId)!;
        if (monthIndex >= 0 && monthIndex < 12) {
          monthlyDemand[monthIndex] = quantity;
        }
      });

      return demandMap;
    });
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();