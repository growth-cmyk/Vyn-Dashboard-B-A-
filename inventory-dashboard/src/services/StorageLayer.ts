import type { InventorySnapshot, Platform } from '../types';
import { supabaseService } from './SupabaseService';

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: Date | null;
  pendingOperations: number;
  status: 'synced' | 'syncing' | 'failed' | 'offline';
  message: string;
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  errors: string[];
}

export interface FileMetadata {
  filename: string;
  fileSize: number;
  platform: Platform;
  uploadTimestamp: Date;
}

export class StorageLayer {
  private syncStatus: SyncStatus;
  private syncCallbacks: ((status: SyncStatus) => void)[] = [];
  private pendingOperations: Promise<any>[] = [];

  constructor() {
    this.syncStatus = {
      isOnline: navigator.onLine,
      lastSyncTime: null,
      pendingOperations: 0,
      status: 'offline',
      message: 'Initializing...'
    };

    // Monitor network status
    window.addEventListener('online', () => this.updateNetworkStatus(true));
    window.addEventListener('offline', () => this.updateNetworkStatus(false));
    
    // Initialize connection check
    this.checkCloudConnection();
  }

  private async checkCloudConnection(): Promise<void> {
    try {
      const isConnected = await supabaseService.checkConnection();
      this.updateSyncStatus({
        isOnline: isConnected,
        status: isConnected ? 'synced' : 'offline',
        message: isConnected ? 'Connected to cloud' : 'Cloud unavailable - using local storage'
      });
    } catch (error: any) {
      this.updateSyncStatus({
        isOnline: false,
        status: 'failed',
        message: 'Failed to connect to cloud storage'
      });
    }
  }

  private updateNetworkStatus(isOnline: boolean): void {
    this.updateSyncStatus({
      isOnline,
      status: isOnline ? 'synced' : 'offline',
      message: isOnline ? 'Back online' : 'Offline - using local storage'
    });

    if (isOnline) {
      this.syncPendingData();
    }
  }

  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    this.syncStatus = { ...this.syncStatus, ...updates };
    this.syncCallbacks.forEach(callback => callback(this.syncStatus));
  }

  // Unified interface for saving inventory snapshots
  async saveInventorySnapshot(snapshots: InventorySnapshot[]): Promise<void> {
    this.updateSyncStatus({
      status: 'syncing',
      pendingOperations: this.syncStatus.pendingOperations + 1,
      message: 'Saving inventory data...'
    });

    try {
      // Always save to localStorage first (immediate backup)
      this.saveToLocalStorage(snapshots);

      // Try to save to cloud if online
      if (this.syncStatus.isOnline) {
        await supabaseService.saveInventorySnapshots(snapshots);
        this.updateSyncStatus({
          status: 'synced',
          lastSyncTime: new Date(),
          pendingOperations: Math.max(0, this.syncStatus.pendingOperations - 1),
          message: 'All data saved to cloud'
        });
      } else {
        // Queue for later sync
        this.queueForSync('snapshots', snapshots);
        this.updateSyncStatus({
          status: 'offline',
          pendingOperations: Math.max(0, this.syncStatus.pendingOperations - 1),
          message: 'Saved locally - will sync when online'
        });
      }
    } catch (error: any) {
      console.error('Failed to save to cloud:', error);
      this.updateSyncStatus({
        status: 'failed',
        pendingOperations: Math.max(0, this.syncStatus.pendingOperations - 1),
        message: 'Cloud save failed - data stored locally'
      });
    }
  }
  // Unified interface for getting inventory history
  async getInventoryHistory(platform?: Platform): Promise<InventorySnapshot[]> {
    try {
      // Try cloud first if online
      if (this.syncStatus.isOnline) {
        const cloudData = await supabaseService.getInventoryHistory(platform);
        
        // If we got cloud data, update local cache and return it
        if (cloudData && cloudData.length > 0) {
          this.updateLocalCache(cloudData);
          return cloudData;
        }
      }
    } catch (error: any) {
      console.warn('Failed to fetch from cloud, falling back to local:', error);
    }

    // Fallback to localStorage
    return this.getFromLocalStorage(platform);
  }

  // File upload with cloud-first approach
  async uploadFile(file: File, metadata: FileMetadata): Promise<any> {
    this.updateSyncStatus({
      status: 'syncing',
      pendingOperations: this.syncStatus.pendingOperations + 1,
      message: 'Uploading file...'
    });

    try {
      if (this.syncStatus.isOnline) {
        const result = await supabaseService.uploadFile(file, metadata.platform);
        this.updateSyncStatus({
          status: 'synced',
          lastSyncTime: new Date(),
          pendingOperations: Math.max(0, this.syncStatus.pendingOperations - 1),
          message: 'File uploaded to cloud'
        });
        return result;
      } else {
        // Store locally and queue for sync
        const localResult = this.storeFileLocally(file, metadata);
        this.queueForSync('file', { file, metadata });
        this.updateSyncStatus({
          status: 'offline',
          pendingOperations: Math.max(0, this.syncStatus.pendingOperations - 1),
          message: 'File stored locally - will upload when online'
        });
        return localResult;
      }
    } catch (error: any) {
      console.error('File upload failed:', error);
      const localResult = this.storeFileLocally(file, metadata);
      this.queueForSync('file', { file, metadata });
      this.updateSyncStatus({
        status: 'failed',
        pendingOperations: Math.max(0, this.syncStatus.pendingOperations - 1),
        message: 'Upload failed - file stored locally'
      });
      return localResult;
    }
  }

  // Get file data with cloud-first fallback
  async getFileData(fileId: string): Promise<any> {
    try {
      if (this.syncStatus.isOnline) {
        // Try to get from cloud first
        const cloudFile = await supabaseService.downloadFile(fileId);
        if (cloudFile) {
          return cloudFile;
        }
      }
    } catch (error: any) {
      console.warn('Failed to fetch file from cloud:', error);
    }

    // Fallback to local storage
    return this.getFileFromLocal(fileId);
  }

  // Sync management
  async syncToCloud(): Promise<SyncResult> {
    if (!this.syncStatus.isOnline) {
      return {
        success: false,
        syncedCount: 0,
        errors: ['Not online']
      };
    }

    this.updateSyncStatus({
      status: 'syncing',
      message: 'Syncing pending data to cloud...'
    });

    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      errors: []
    };

    try {
      const pendingData = this.getPendingSync();
      
      for (const item of pendingData) {
        try {
          if (item.type === 'snapshots') {
            await supabaseService.saveInventorySnapshots(item.data);
          } else if (item.type === 'file') {
            await supabaseService.uploadFile(item.data.file, item.data.metadata.platform);
          } else if (item.type === 'marketing') {
            await supabaseService.saveMarketingSnapshots(item.data);
          } else if (item.type === 'preferences') {
            await supabaseService.saveUserPreferences(item.data);
          } else if (item.type === 'demand') {
            // Convert array back to Map for syncing
            const demandMap = new Map(item.data);
            await supabaseService.saveDemandHistory(demandMap);
          }
          result.syncedCount++;
        } catch (error: any) {
          result.errors.push(`Failed to sync ${item.type}: ${error.message}`);
        }
      }

      if (result.errors.length === 0) {
        this.clearPendingSync();
        this.updateSyncStatus({
          status: 'synced',
          lastSyncTime: new Date(),
          message: `Synced ${result.syncedCount} items to cloud`
        });
      } else {
        this.updateSyncStatus({
          status: 'failed',
          message: `Sync completed with ${result.errors.length} errors`
        });
        result.success = false;
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Sync failed: ${error.message}`);
      this.updateSyncStatus({
        status: 'failed',
        message: 'Sync failed - will retry later'
      });
    }

    return result;
  }

  // Status management
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  onSyncStatusChange(callback: (status: SyncStatus) => void): void {
    this.syncCallbacks.push(callback);
  }

  // Automatic sync when coming back online
  private async syncPendingData(): Promise<void> {
    const pendingCount = this.getPendingSync().length;
    if (pendingCount > 0) {
      setTimeout(() => this.syncToCloud(), 1000); // Delay to ensure connection is stable
    }
  }
  // Private localStorage operations
  private saveToLocalStorage(snapshots: InventorySnapshot[]): void {
    try {
      const existingData = localStorage.getItem('inventory_snapshots');
      const existing = existingData ? JSON.parse(existingData) : [];
      
      const combined = [...existing, ...snapshots];
      localStorage.setItem('inventory_snapshots', JSON.stringify(combined));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  private getFromLocalStorage(platform?: Platform): InventorySnapshot[] {
    try {
      const data = localStorage.getItem('inventory_snapshots');
      if (!data) return [];
      
      const snapshots = JSON.parse(data);
      return platform 
        ? snapshots.filter((s: InventorySnapshot) => s.platform === platform)
        : snapshots;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return [];
    }
  }

  private updateLocalCache(cloudData: InventorySnapshot[]): void {
    try {
      // Merge cloud data with local, preferring newer timestamps
      const localData = this.getFromLocalStorage();
      const merged = this.mergeByTimestamp(localData, cloudData);
      localStorage.setItem('inventory_snapshots', JSON.stringify(merged));
    } catch (error) {
      console.error('Failed to update local cache:', error);
    }
  }

  private mergeByTimestamp(local: InventorySnapshot[], cloud: InventorySnapshot[]): InventorySnapshot[] {
    const merged = new Map<string, InventorySnapshot>();
    
    // Add local data first
    local.forEach(item => {
      const key = `${item.itemId}-${item.warehouseFacilityId}-${item.timestamp.getTime()}`;
      merged.set(key, item);
    });
    
    // Add cloud data, overwriting if newer
    cloud.forEach(item => {
      const key = `${item.itemId}-${item.warehouseFacilityId}-${item.timestamp.getTime()}`;
      const existing = merged.get(key);
      
      if (!existing || new Date(item.timestamp) > new Date(existing.timestamp)) {
        merged.set(key, item);
      }
    });
    
    return Array.from(merged.values()).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // File operations for local storage
  private storeFileLocally(file: File, metadata: FileMetadata): any {
    const fileId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const localFile = {
      fileId,
      url: URL.createObjectURL(file),
      path: `local/${fileId}`,
      metadata: {
        ...metadata,
        processingStatus: 'pending' as const
      }
    };
    
    try {
      const existingFiles = localStorage.getItem('local_files');
      const files = existingFiles ? JSON.parse(existingFiles) : [];
      files.push(localFile);
      localStorage.setItem('local_files', JSON.stringify(files));
    } catch (error) {
      console.error('Failed to store file locally:', error);
    }
    
    return localFile;
  }

  private getFileFromLocal(fileId: string): any {
    try {
      const data = localStorage.getItem('local_files');
      if (!data) return null;
      
      const files = JSON.parse(data);
      return files.find((f: any) => f.fileId === fileId);
    } catch (error) {
      console.error('Failed to get file from local storage:', error);
      return null;
    }
  }

  // Pending sync queue management
  private queueForSync(type: string, data: any): void {
    try {
      const existing = localStorage.getItem('pending_sync');
      const queue = existing ? JSON.parse(existing) : [];
      
      queue.push({
        type,
        data,
        timestamp: new Date().toISOString()
      });
      
      localStorage.setItem('pending_sync', JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to queue for sync:', error);
    }
  }

  private getPendingSync(): any[] {
    try {
      const data = localStorage.getItem('pending_sync');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get pending sync data:', error);
      return [];
    }
  }

  private clearPendingSync(): void {
    try {
      localStorage.removeItem('pending_sync');
    } catch (error) {
      console.error('Failed to clear pending sync:', error);
    }
  }

  // Data migration functionality
  async migrateLocalDataToCloud(): Promise<{ success: boolean; migratedCount: number; errors: string[] }> {
    const result: { success: boolean; migratedCount: number; errors: string[] } = {
      success: true,
      migratedCount: 0,
      errors: []
    };

    if (!this.syncStatus.isOnline) {
      result.success = false;
      result.errors.push('Cannot migrate - not online');
      return result;
    }

    this.updateSyncStatus({
      status: 'syncing',
      message: 'Migrating local data to cloud...'
    });

    try {
      // Get all local data
      const localSnapshots = this.getFromLocalStorage();
      
      if (localSnapshots.length === 0) {
        this.updateSyncStatus({
          status: 'synced',
          message: 'No local data to migrate'
        });
        return result;
      }

      // Check if cloud already has data
      const cloudSnapshots = await supabaseService.getInventoryHistory();
      
      // Merge data intelligently - prefer newer timestamps
      const mergedData = this.mergeByTimestamp(cloudSnapshots, localSnapshots);
      
      // Only upload new/updated data to avoid duplicates
      const newData = mergedData.filter(snapshot => {
        return !cloudSnapshots.some(cloudSnapshot => 
          cloudSnapshot.itemId === snapshot.itemId &&
          cloudSnapshot.warehouseFacilityId === snapshot.warehouseFacilityId &&
          Math.abs(new Date(cloudSnapshot.timestamp).getTime() - new Date(snapshot.timestamp).getTime()) < 1000 // Within 1 second
        );
      });

      if (newData.length > 0) {
        await supabaseService.saveInventorySnapshots(newData);
        result.migratedCount = newData.length;
      }

      // Verify data integrity
      const verificationResult = await this.verifyDataIntegrity();
      if (!verificationResult.success) {
        result.errors.push(...verificationResult.errors);
        result.success = false;
      }

      this.updateSyncStatus({
        status: result.success ? 'synced' : 'failed',
        lastSyncTime: new Date(),
        message: result.success 
          ? `Migration completed: ${result.migratedCount} items migrated`
          : 'Migration completed with errors'
      });

    } catch (error: any) {
      result.success = false;
      result.errors.push(`Migration failed: ${error.message}`);
      this.updateSyncStatus({
        status: 'failed',
        message: 'Migration failed - data remains in local storage'
      });
    }

    return result;
  }

  async verifyDataIntegrity(): Promise<{ success: boolean; errors: string[] }> {
    const result: { success: boolean; errors: string[] } = { success: true, errors: [] };

    try {
      const localData = this.getFromLocalStorage();
      const cloudData = await supabaseService.getInventoryHistory();

      // Check if we have reasonable data coverage
      if (localData.length > 0 && cloudData.length === 0) {
        result.success = false;
        result.errors.push('Local data exists but cloud data is empty');
      }

      // Check for significant data loss (more than 10% difference)
      if (localData.length > 0 && cloudData.length < localData.length * 0.9) {
        result.success = false;
        result.errors.push(`Potential data loss: Local has ${localData.length} items, cloud has ${cloudData.length}`);
      }

      // Verify recent data exists in cloud
      const recentLocal = localData.filter(item => 
        new Date(item.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      );
      
      const recentCloud = cloudData.filter(item => 
        new Date(item.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );

      if (recentLocal.length > 0 && recentCloud.length === 0) {
        result.success = false;
        result.errors.push('Recent local data not found in cloud');
      }

    } catch (error: any) {
      result.success = false;
      result.errors.push(`Verification failed: ${error.message}`);
    }

    return result;
  }

  // Marketing operations with cloud-first approach
  async saveMarketingData(marketingData: any[]): Promise<void> {
    this.updateSyncStatus({
      status: 'syncing',
      pendingOperations: this.syncStatus.pendingOperations + 1,
      message: 'Saving marketing data...'
    });

    try {
      // Always save to localStorage first (immediate backup)
      this.saveMarketingToLocalStorage(marketingData);

      // Try to save to cloud if online
      if (this.syncStatus.isOnline) {
        await supabaseService.saveMarketingSnapshots(marketingData);
        this.updateSyncStatus({
          status: 'synced',
          lastSyncTime: new Date(),
          pendingOperations: Math.max(0, this.syncStatus.pendingOperations - 1),
          message: 'Marketing data saved to cloud'
        });
      } else {
        // Queue for later sync
        this.queueForSync('marketing', marketingData);
        this.updateSyncStatus({
          status: 'offline',
          pendingOperations: Math.max(0, this.syncStatus.pendingOperations - 1),
          message: 'Marketing data saved locally - will sync when online'
        });
      }
    } catch (error: any) {
      console.error('Failed to save marketing data to cloud:', error);
      this.updateSyncStatus({
        status: 'failed',
        pendingOperations: Math.max(0, this.syncStatus.pendingOperations - 1),
        message: 'Marketing cloud save failed - data stored locally'
      });
    }
  }

  async getMarketingHistory(platform?: Platform): Promise<any[]> {
    try {
      // Try cloud first if online
      if (this.syncStatus.isOnline) {
        const cloudData = await supabaseService.getMarketingHistory(platform);
        
        // If we got cloud data, update local cache and return it
        if (cloudData && cloudData.length > 0) {
          this.updateMarketingLocalCache(cloudData);
          return cloudData;
        }
      }
    } catch (error: any) {
      console.warn('Failed to fetch marketing data from cloud, falling back to local:', error);
    }

    // Fallback to localStorage
    return this.getMarketingFromLocalStorage(platform);
  }

  // Private marketing localStorage operations
  private saveMarketingToLocalStorage(marketingData: any[]): void {
    try {
      const existingData = localStorage.getItem('marketing_snapshots');
      const existing = existingData ? JSON.parse(existingData) : [];
      
      const combined = [...existing, ...marketingData];
      localStorage.setItem('marketing_snapshots', JSON.stringify(combined));
    } catch (error: any) {
      console.error('Failed to save marketing data to localStorage:', error);
    }
  }

  private getMarketingFromLocalStorage(platform?: Platform): any[] {
    try {
      const data = localStorage.getItem('marketing_snapshots');
      if (!data) return [];
      
      const snapshots = JSON.parse(data);
      return platform 
        ? snapshots.filter((s: any) => s.platform === platform)
        : snapshots;
    } catch (error: any) {
      console.error('Failed to read marketing data from localStorage:', error);
      return [];
    }
  }

  private updateMarketingLocalCache(cloudData: any[]): void {
    try {
      // Merge cloud data with local, preferring newer timestamps
      const localData = this.getMarketingFromLocalStorage();
      const merged = this.mergeMarketingByTimestamp(localData, cloudData);
      localStorage.setItem('marketing_snapshots', JSON.stringify(merged));
    } catch (error: any) {
      console.error('Failed to update marketing local cache:', error);
    }
  }

  private mergeMarketingByTimestamp(local: any[], cloud: any[]): any[] {
    const merged = new Map<string, any>();
    
    // Add local data first
    local.forEach(item => {
      const key = `${item.campaignName}-${item.date}-${item.platform}`;
      merged.set(key, item);
    });
    
    // Add cloud data, overwriting if newer
    cloud.forEach(item => {
      const key = `${item.campaignName}-${item.date}-${item.platform}`;
      const existing = merged.get(key);
      
      if (!existing || new Date(item.uploadTimestamp) > new Date(existing.uploadTimestamp)) {
        merged.set(key, item);
      }
    });
    
    return Array.from(merged.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }
  async shouldMigrate(): Promise<boolean> {
    try {
      const localData = this.getFromLocalStorage();
      if (localData.length === 0) return false;

      if (!this.syncStatus.isOnline) return false;

      const cloudData = await supabaseService.getInventoryHistory();
      
      // If cloud is empty but we have local data, migration is needed
      if (cloudData.length === 0 && localData.length > 0) return true;

      // If local has significantly more recent data, migration might be needed
      const recentLocal = localData.filter(item => 
        new Date(item.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      );
      
      const recentCloud = cloudData.filter(item => 
        new Date(item.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      );

      return recentLocal.length > recentCloud.length;
    } catch (error: any) {
      console.warn('Failed to check migration status:', error);
      return false;
    }
  }

  // User preferences sync for ROP settings
  async syncUserPreferences(preferences: {
    serviceLevel: number;
    forecastQuantities: Record<string, number>;
    leadTime?: number;
    safetyDays?: number;
  }): Promise<void> {
    this.updateSyncStatus({
      status: 'syncing',
      pendingOperations: this.syncStatus.pendingOperations + 1,
      message: 'Syncing ROP preferences...'
    });

    try {
      // Always save to localStorage first (immediate backup)
      this.savePreferencesToLocalStorage(preferences);

      // Try to save to cloud if online
      if (this.syncStatus.isOnline) {
        await supabaseService.saveUserPreferences(preferences);
        this.updateSyncStatus({
          status: 'synced',
          lastSyncTime: new Date(),
          pendingOperations: Math.max(0, this.syncStatus.pendingOperations - 1),
          message: 'ROP preferences saved to cloud'
        });
      } else {
        // Queue for later sync
        this.queueForSync('preferences', preferences);
        this.updateSyncStatus({
          status: 'offline',
          pendingOperations: Math.max(0, this.syncStatus.pendingOperations - 1),
          message: 'Preferences saved locally - will sync when online'
        });
      }
    } catch (error: any) {
      console.error('Failed to save preferences to cloud:', error);
      this.updateSyncStatus({
        status: 'failed',
        pendingOperations: Math.max(0, this.syncStatus.pendingOperations - 1),
        message: 'Cloud save failed - preferences stored locally'
      });
    }
  }

  async getUserPreferences(): Promise<{
    serviceLevel: number;
    forecastQuantities: Record<string, number>;
    leadTime: number;
    safetyDays: number;
  } | null> {
    try {
      // Try cloud first if online
      if (this.syncStatus.isOnline) {
        const cloudPrefs = await supabaseService.getUserPreferences();
        
        // If we got cloud data, update local cache and return it
        if (cloudPrefs) {
          this.savePreferencesToLocalStorage(cloudPrefs);
          return cloudPrefs;
        }
      }
    } catch (error: any) {
      console.warn('Failed to fetch preferences from cloud, falling back to local:', error);
    }

    // Fallback to localStorage
    return this.getPreferencesFromLocalStorage();
  }

  // Private preferences localStorage operations
  private savePreferencesToLocalStorage(preferences: {
    serviceLevel: number;
    forecastQuantities: Record<string, number>;
    leadTime?: number;
    safetyDays?: number;
  }): void {
    try {
      localStorage.setItem('vyndo_user_preferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save preferences to localStorage:', error);
    }
  }

  private getPreferencesFromLocalStorage(): {
    serviceLevel: number;
    forecastQuantities: Record<string, number>;
    leadTime: number;
    safetyDays: number;
  } | null {
    try {
      const data = localStorage.getItem('vyndo_user_preferences');
      if (!data) return null;
      
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to read preferences from localStorage:', error);
      return null;
    }
  }

  // Demand history sync for Statistical ROP
  async syncDemandHistory(demandMap: Map<string, number[]>): Promise<void> {
    this.updateSyncStatus({
      status: 'syncing',
      pendingOperations: this.syncStatus.pendingOperations + 1,
      message: 'Syncing demand history...'
    });

    try {
      // Always save to localStorage first (immediate backup)
      this.saveDemandToLocalStorage(demandMap);

      // Try to save to cloud if online
      if (this.syncStatus.isOnline) {
        await supabaseService.saveDemandHistory(demandMap);
        this.updateSyncStatus({
          status: 'synced',
          lastSyncTime: new Date(),
          pendingOperations: Math.max(0, this.syncStatus.pendingOperations - 1),
          message: 'Demand history saved to cloud'
        });
      } else {
        // Queue for later sync
        this.queueForSync('demand', Array.from(demandMap.entries()));
        this.updateSyncStatus({
          status: 'offline',
          pendingOperations: Math.max(0, this.syncStatus.pendingOperations - 1),
          message: 'Demand history saved locally - will sync when online'
        });
      }
    } catch (error: any) {
      console.error('Failed to save demand history to cloud:', error);
      this.updateSyncStatus({
        status: 'failed',
        pendingOperations: Math.max(0, this.syncStatus.pendingOperations - 1),
        message: 'Cloud save failed - demand history stored locally'
      });
    }
  }

  async getDemandHistory(): Promise<Map<string, number[]>> {
    try {
      // Try cloud first if online
      if (this.syncStatus.isOnline) {
        const cloudDemand = await supabaseService.getDemandHistory();
        
        // If we got cloud data, update local cache and return it
        if (cloudDemand && cloudDemand.size > 0) {
          this.saveDemandToLocalStorage(cloudDemand);
          return cloudDemand;
        }
      }
    } catch (error: any) {
      console.warn('Failed to fetch demand history from cloud, falling back to local:', error);
    }

    // Fallback to localStorage
    return this.getDemandFromLocalStorage();
  }

  // Private demand localStorage operations
  private saveDemandToLocalStorage(demandMap: Map<string, number[]>): void {
    try {
      const demandArray = Array.from(demandMap.entries());
      localStorage.setItem('vyndo_demand_history', JSON.stringify(demandArray));
    } catch (error: any) {
      console.error('Failed to save demand history to localStorage:', error);
    }
  }

  private getDemandFromLocalStorage(): Map<string, number[]> {
    try {
      const data = localStorage.getItem('vyndo_demand_history');
      if (!data) return new Map();
      
      const demandArray = JSON.parse(data);
      return new Map(demandArray);
    } catch (error: any) {
      console.error('Failed to read demand history from localStorage:', error);
      return new Map();
    }
  }
}

// Export singleton instance
export const storageLayer = new StorageLayer();