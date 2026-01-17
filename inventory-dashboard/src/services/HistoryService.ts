import type { InventoryItem, Platform, InventorySnapshot, CumulativeHistoryData } from '../types';
import { PLATFORM } from '../types';
import { storageLayer } from './StorageLayer';
// import { AnalyticsService } from './AnalyticsService';

/**
 * Legacy inventory snapshot for backward compatibility
 */
export interface LegacyInventorySnapshot {
  timestamp: Date;
  uploadSource: string;
  totalUnits: number;
  outOfStockCount: number;
  understockCount: number;
  overstockCount: number;
  expiryRiskCount: number;
  totalValue: number; // Estimated based on average selling price
  itemCount: number;
  locationCount: number;
}

/**
 * Individual item snapshot for detailed tracking (now platform-aware)
 */
export interface ItemSnapshot {
  timestamp: Date;
  itemId: string;
  warehouseFacilityId: string;
  totalSellable: number;
  uploadSource: string;
  // Platform support for independent tracking
  platform: Platform;
  platformMetadata: {
    uploadSource: string;
    dataFormat: 'blinkit' | 'amazon';
    recordCount: number;
  };
}

/**
 * Trend data for visualization
 */
export interface TrendData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }[];
}

/**
 * Service for managing inventory history and snapshots
 */
export class HistoryService {
  private static readonly SNAPSHOT_KEY = 'vyndo_inventory_snapshots';
  private static readonly ITEM_SNAPSHOT_KEY = 'vyndo_item_snapshots';
  private static readonly MAX_SNAPSHOTS = 500; // Support full year (~365 days) plus buffer for Year-to-Date strategy
  private static readonly MAX_STORAGE_SIZE_MB = 5; // 5MB localStorage limit
  private static readonly COMPRESSION_THRESHOLD_DAYS = 90; // Compress data older than 90 days

  /**
   * Save bulk snapshots from cumulative history data
   * This method processes historical data from files with Upload Date columns
   * and creates individual snapshots for each unique date, using the file dates
   * instead of the current timestamp.
   */
  static async saveBulkSnapshots(
    cumulativeHistory: CumulativeHistoryData,
    uploadSource: string,
    platform: Platform = PLATFORM.BLINKIT,
    dataFormat: 'blinkit' | 'amazon' = 'blinkit'
  ): Promise<void> {
    try {
      const allSnapshots: InventorySnapshot[] = [];
      const allItemSnapshots: ItemSnapshot[] = [];

      // Process each unique date in the cumulative history
      for (const uploadDate of cumulativeHistory.uploadDates) {
        const dateKey = uploadDate.toISOString().split('T')[0];
        const inventoryForDate = cumulativeHistory.dataByDate.get(dateKey) || [];

        if (inventoryForDate.length === 0) continue;

        // Calculate summary statistics for this date
        const totalUnits = inventoryForDate.reduce((sum: number, item: any) => {
          // Handle both raw CSV data (strings) and transformed data (numbers)
          let sellable = 0;
          if (typeof item.totalSellable === 'number') {
            sellable = item.totalSellable;
          } else if (item.totalSellable) {
            sellable = parseFloat(item.totalSellable.toString()) || 0;
          } else if (item.totalsellable) {
            // Handle raw CSV data with lowercase normalized keys
            sellable = parseFloat(item.totalsellable.toString()) || 0;
          } else if (item['Total Sellable']) {
            // Handle raw CSV column names
            sellable = parseFloat(item['Total Sellable'].toString()) || 0;
          }
          
          return sum + sellable;
        }, 0);

        // Create platform-aware snapshot using the file's upload date
        const snapshot: InventorySnapshot = {
          timestamp: uploadDate, // Use the date from the file, not new Date()
          itemId: '', // Not used in summary snapshots
          warehouseFacilityId: '', // Not used in summary snapshots
          totalSellable: totalUnits,
          uploadSource,
          platform,
          platformMetadata: {
            uploadSource,
            dataFormat,
            recordCount: inventoryForDate.length
          }
        };

        allSnapshots.push(snapshot);

        // Create individual item snapshots for detailed tracking
        const itemSnapshots: ItemSnapshot[] = inventoryForDate.map((item: any) => ({
          timestamp: uploadDate, // Use the date from the file, not new Date()
          itemId: item.itemId || '',
          warehouseFacilityId: item.warehouseFacilityId || '',
          totalSellable: item.totalSellable || 0,
          uploadSource,
          platform,
          platformMetadata: {
            uploadSource,
            dataFormat,
            recordCount: inventoryForDate.length
          }
        }));

        allItemSnapshots.push(...itemSnapshots);
      }

      // Get existing snapshots and merge with new ones (deduplication by timestamp)
      const existingSnapshots = await this.getInventoryHistory(undefined, undefined, platform);
      const existingItemSnapshots = await this.getItemSnapshots(undefined, undefined, platform);

      // Create a map for deduplication based on timestamp
      const snapshotMap = new Map<string, InventorySnapshot>();
      const itemSnapshotMap = new Map<string, ItemSnapshot>();

      // Add existing snapshots to maps
      existingSnapshots.forEach(snapshot => {
        const key = snapshot.timestamp.toISOString().split('T')[0];
        snapshotMap.set(key, snapshot);
      });

      existingItemSnapshots.forEach(snapshot => {
        const key = `${snapshot.timestamp.toISOString().split('T')[0]}_${snapshot.itemId}_${snapshot.warehouseFacilityId}`;
        itemSnapshotMap.set(key, snapshot);
      });

      // Add new snapshots to maps (this will overwrite duplicates)
      allSnapshots.forEach(snapshot => {
        const key = snapshot.timestamp.toISOString().split('T')[0];
        snapshotMap.set(key, snapshot);
      });

      allItemSnapshots.forEach(snapshot => {
        const key = `${snapshot.timestamp.toISOString().split('T')[0]}_${snapshot.itemId}_${snapshot.warehouseFacilityId}`;
        itemSnapshotMap.set(key, snapshot);
      });

      // Convert maps back to arrays and sort by timestamp
      const deduplicatedSnapshots = Array.from(snapshotMap.values())
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const deduplicatedItemSnapshots = Array.from(itemSnapshotMap.values())
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Keep only the most recent snapshots per platform
      if (deduplicatedSnapshots.length > this.MAX_SNAPSHOTS) {
        deduplicatedSnapshots.splice(0, deduplicatedSnapshots.length - this.MAX_SNAPSHOTS);
      }

      // Keep only recent item snapshots (365 days for SKU movement analysis)
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const recentItemSnapshots = deduplicatedItemSnapshots.filter(
        snapshot => new Date(snapshot.timestamp) > oneYearAgo
      );

      // Store with platform-specific keys
      const platformKey = `${this.SNAPSHOT_KEY}_${platform.toLowerCase()}`;
      const platformItemKey = `${this.ITEM_SNAPSHOT_KEY}_${platform.toLowerCase()}`;
      
      localStorage.setItem(platformKey, JSON.stringify(deduplicatedSnapshots));
      localStorage.setItem(platformItemKey, JSON.stringify(recentItemSnapshots));

      // Check storage limits and compress if needed
      const storageCheck = await this.checkAndManageStorage(platform);
      if (storageCheck.wasCompressed) {
        console.log(`Storage compressed: saved ${storageCheck.compressionResult?.spaceSavedKB}KB, new size: ${storageCheck.stats.sizeMB.toFixed(2)}MB`);
      }

      console.log(`Bulk snapshots saved: ${allSnapshots.length} summary snapshots and ${allItemSnapshots.length} item snapshots for platform ${platform}`);
      console.log(`Date range: ${cumulativeHistory.earliestDate.toLocaleDateString()} to ${cumulativeHistory.latestDate.toLocaleDateString()}`);
      console.log(`Storage usage: ${storageCheck.stats.sizeMB.toFixed(2)}MB / ${this.MAX_STORAGE_SIZE_MB}MB`);

    } catch (error) {
      console.error('Failed to save bulk snapshots:', error);
    }
  }

  /**
   * Save inventory snapshot using Storage Layer (cloud-first with localStorage fallback)
   */
  static async saveInventorySnapshot(
    inventory: InventoryItem[], 
    uploadSource: string,
    _salesData?: any[],
    platform: Platform = PLATFORM.BLINKIT,
    dataFormat: 'blinkit' | 'amazon' = 'blinkit'
  ): Promise<void> {
    try {
      const timestamp = new Date();
      
      // Calculate summary statistics
      const totalUnits = inventory.reduce((sum, item) => sum + item.totalSellable, 0);

      // Create individual snapshots for each item
      const snapshots: InventorySnapshot[] = inventory.map(item => ({
        timestamp,
        itemId: item.itemId,
        warehouseFacilityId: item.warehouseFacilityId,
        totalSellable: item.totalSellable,
        uploadSource,
        platform,
        platformMetadata: {
          uploadSource,
          dataFormat,
          recordCount: inventory.length
        }
      }));

      // Save through Storage Layer (handles cloud + local)
      await storageLayer.saveInventorySnapshot(snapshots);

      console.log(`Inventory snapshot saved: ${inventory.length} items, ${totalUnits} total units for platform ${platform}`);
    } catch (error) {
      console.error('Failed to save inventory snapshot:', error);
      // Fallback to local storage if Storage Layer fails
      this.saveToLocalStorageOnly(inventory, uploadSource, platform, dataFormat);
    }
  }

  /**
   * Get inventory history using Storage Layer (cloud-first with localStorage fallback)
   */
  static async getInventoryHistory(
    _itemId?: string, 
    _facilityId?: string, 
    platform?: Platform
  ): Promise<InventorySnapshot[]> {
    try {
      // Fetch from Storage Layer (cloud-first, local fallback)
      const snapshots = await storageLayer.getInventoryHistory(platform);
      
      // Sort by timestamp
      return snapshots.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (error) {
      console.error('Failed to load inventory history from Storage Layer:', error);
      // Fallback to direct localStorage access
      return this.getFromLocalStorageOnly(_itemId, _facilityId, platform);
    }
  }

  /**
   * Get item snapshots for specific item/facility with platform filtering
   */
  static getItemSnapshots(
    itemId?: string, 
    facilityId?: string, 
    platform?: Platform
  ): ItemSnapshot[] {
    try {
      let allSnapshots: ItemSnapshot[] = [];

      if (platform && platform !== PLATFORM.ALL) {
        // Get snapshots for specific platform
        const platformItemKey = `${this.ITEM_SNAPSHOT_KEY}_${platform.toLowerCase()}`;
        const data = localStorage.getItem(platformItemKey);
        if (data) {
          const snapshots = JSON.parse(data);
          allSnapshots = snapshots.map((snapshot: any) => ({
            ...snapshot,
            timestamp: new Date(snapshot.timestamp)
          }));
        }
      } else {
        // Get snapshots for all platforms
        const platforms = [PLATFORM.BLINKIT, PLATFORM.AMAZON];
        for (const p of platforms) {
          const platformItemKey = `${this.ITEM_SNAPSHOT_KEY}_${p.toLowerCase()}`;
          const data = localStorage.getItem(platformItemKey);
          if (data) {
            const snapshots = JSON.parse(data);
            const platformSnapshots = snapshots.map((snapshot: any) => ({
              ...snapshot,
              timestamp: new Date(snapshot.timestamp),
              platform: p // Ensure platform is set
            }));
            allSnapshots.push(...platformSnapshots);
          }
        }
      }

      // Filter by itemId and/or facilityId if provided
      if (itemId) {
        allSnapshots = allSnapshots.filter(s => s.itemId === itemId);
      }
      if (facilityId) {
        allSnapshots = allSnapshots.filter(s => s.warehouseFacilityId === facilityId);
      }

      return allSnapshots.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (error) {
      console.error('Failed to load item snapshots:', error);
      return [];
    }
  }

  /**
   * Generate trend data from file-based cumulative history
   * This method prioritizes file-based dates over localStorage snapshots
   */
  static generateFileBasedTrendData(
    cumulativeData: CumulativeHistoryData,
    _platform?: Platform
  ): TrendData {
    if (!cumulativeData || cumulativeData.uploadDates.length === 0) {
      return {
        labels: [],
        datasets: [{
          label: 'Total Units',
          data: [],
          borderColor: '#F36F21',
          backgroundColor: 'rgba(243, 111, 33, 0.1)'
        }]
      };
    }

    // Sort dates chronologically
    const sortedDates = [...cumulativeData.uploadDates].sort((a, b) => a.getTime() - b.getTime());
    
    const labels = sortedDates.map(date => 
      date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );

    const totalUnitsData = sortedDates.map(date => {
      const dateKey = date.toISOString().split('T')[0];
      const inventoryForDate = cumulativeData.dataByDate.get(dateKey) || [];
      return inventoryForDate.reduce((sum: number, item: any) => sum + (item.totalSellable || 0), 0);
    });

    const outOfStockData = sortedDates.map(date => {
      const dateKey = date.toISOString().split('T')[0];
      const inventoryForDate = cumulativeData.dataByDate.get(dateKey) || [];
      return inventoryForDate.filter((item: any) => (item.totalSellable || 0) === 0).length;
    });

    const expiryRiskData = sortedDates.map(date => {
      const dateKey = date.toISOString().split('T')[0];
      const inventoryForDate = cumulativeData.dataByDate.get(dateKey) || [];
      // Simple heuristic: items with very low stock relative to recent sales
      return inventoryForDate.filter((item: any) => {
        const stock = item.totalSellable || 0;
        const recentSales = item.last7Days || 0;
        return stock > 0 && stock < (recentSales * 2); // Less than 2 days of stock
      }).length;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Total Units',
          data: totalUnitsData,
          borderColor: '#F36F21',
          backgroundColor: 'rgba(243, 111, 33, 0.1)'
        },
        {
          label: 'Out of Stock Count',
          data: outOfStockData,
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)'
        },
        {
          label: 'Expiry Risk Count',
          data: expiryRiskData,
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.1)'
        }
      ]
    };
  }

  /**
   * Get the latest date slice from cumulative history for current view
   */
  static getLatestDateSlice(cumulativeData: CumulativeHistoryData): InventoryItem[] {
    if (!cumulativeData || cumulativeData.uploadDates.length === 0) {
      return [];
    }

    const latestDateKey = cumulativeData.latestDate.toISOString().split('T')[0];
    const latestData = cumulativeData.dataByDate.get(latestDateKey) || [];
    
    return latestData.map((item: any) => ({
      ...item,
      uploadDate: cumulativeData.latestDate
    }));
  }

  /**
   * Process file-based cumulative history and store in sessionStorage for immediate access
   */
  static async processFileBasedHistory(
    cumulativeData: CumulativeHistoryData,
    uploadSource: string,
    platform: Platform = PLATFORM.BLINKIT
  ): Promise<void> {
    try {
      // Store in sessionStorage for immediate access during current session
      const sessionKey = `vyndo_current_file_history_${platform.toLowerCase()}`;
      const historyData = {
        cumulativeData: {
          ...cumulativeData,
          // Convert Map to array of [key, value] pairs for JSON serialization
          dataByDate: Array.from(cumulativeData.dataByDate.entries())
        },
        uploadSource,
        platform,
        processedAt: new Date().toISOString()
      };
      
      sessionStorage.setItem(sessionKey, JSON.stringify(historyData));
      
      // Also save bulk snapshots to localStorage for persistence
      await this.saveBulkSnapshots(cumulativeData, uploadSource, platform);
      
      console.log(`File-based history processed for platform ${platform}: ${cumulativeData.totalDaysOfHistory} days`);
    } catch (error) {
      console.error('Failed to process file-based history:', error);
    }
  }

  /**
   * Get combined history data prioritizing file-based dates over localStorage
   */
  static async getCombinedHistoryData(
    fileHistory?: CumulativeHistoryData,
    platform?: Platform
  ): Promise<TrendData> {
    // If we have file-based history, prioritize it
    if (fileHistory) {
      return this.generateFileBasedTrendData(fileHistory, platform);
    }

    // Fallback to localStorage-based trend data
    return await this.generateInventoryTrendData(undefined, undefined, platform);
  }

  /**
   * Generate trend data for visualization with cloud-first approach
   * Enhanced to prioritize cloud data over localStorage snapshots
   */
  static async generateInventoryTrendData(
    itemId?: string, 
    facilityId?: string, 
    platform?: Platform
  ): Promise<TrendData> {
    // First, check if we have current file-based history in sessionStorage
    if (platform && platform !== PLATFORM.ALL) {
      const sessionKey = `vyndo_current_file_history_${platform.toLowerCase()}`;
      const sessionData = sessionStorage.getItem(sessionKey);
      
      if (sessionData) {
        try {
          const { cumulativeData } = JSON.parse(sessionData);
          if (cumulativeData && !itemId && !facilityId) {
            // Parse dates from JSON and reconstruct the Map (they become strings/objects when serialized)
            const dataByDateMap = new Map<string, any[]>();
            if (cumulativeData.dataByDate) {
              // Handle both Map serialization formats
              if (Array.isArray(cumulativeData.dataByDate)) {
                // Map was serialized as array of [key, value] pairs
                cumulativeData.dataByDate.forEach(([key, value]: [string, any[]]) => {
                  dataByDateMap.set(key, value);
                });
              } else if (typeof cumulativeData.dataByDate === 'object') {
                // Map was serialized as plain object
                Object.entries(cumulativeData.dataByDate).forEach(([key, value]) => {
                  dataByDateMap.set(key, value as any[]);
                });
              }
            }
            
            const parsedCumulativeData = {
              ...cumulativeData,
              uploadDates: cumulativeData.uploadDates.map((d: string | Date) => new Date(d)),
              latestDate: new Date(cumulativeData.latestDate),
              earliestDate: new Date(cumulativeData.earliestDate),
              dataByDate: dataByDateMap
            };
            // Use file-based data for summary trends
            return this.generateFileBasedTrendData(parsedCumulativeData, platform);
          }
        } catch (error) {
          console.warn('Failed to parse session file history:', error);
        }
      }
    }

    // Fallback to cloud/localStorage-based snapshots via Storage Layer
    try {
      const snapshots = itemId || facilityId 
        ? this.getItemSnapshots(itemId, facilityId, platform)
        : await this.getInventoryHistory(itemId, facilityId, platform);

      if (snapshots.length === 0) {
        return {
          labels: [],
          datasets: [{
            label: 'Total Units',
            data: [],
            borderColor: '#F36F21',
            backgroundColor: 'rgba(243, 111, 33, 0.1)'
          }]
        };
      }

      const labels = snapshots.map(snapshot => 
        snapshot.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      );

      if (itemId || facilityId) {
        // Item-level trend data
        const itemSnapshots = snapshots as ItemSnapshot[];
        return {
          labels,
          datasets: [{
            label: 'Stock Level',
            data: itemSnapshots.map(s => s.totalSellable),
            borderColor: '#F36F21',
            backgroundColor: 'rgba(243, 111, 33, 0.1)'
          }]
        };
      } else {
        // Summary trend data
        const summarySnapshots = snapshots as InventorySnapshot[];
        return {
          labels,
          datasets: [
            {
              label: 'Total Units',
              data: summarySnapshots.map(s => s.totalSellable),
              borderColor: '#F36F21',
              backgroundColor: 'rgba(243, 111, 33, 0.1)'
            }
          ]
        };
      }
    } catch (error) {
      console.error('Failed to generate trend data:', error);
      return {
        labels: [],
        datasets: [{
          label: 'Total Units',
          data: [],
          borderColor: '#F36F21',
          backgroundColor: 'rgba(243, 111, 33, 0.1)'
        }]
      };
    }
  }

  /**
   * Sync pending data to cloud (exposed method for manual sync)
   */
  static async syncPendingData(): Promise<any> {
    return await storageLayer.syncToCloud();
  }

  /**
   * Get current sync status
   */
  static getSyncStatus(): any {
    return storageLayer.getSyncStatus();
  }

  /**
   * Subscribe to sync status changes
   */
  static onSyncStatusChange(callback: (status: any) => void): void {
    storageLayer.onSyncStatusChange(callback);
  }

  /**
   * Fallback method for localStorage-only operations (when Storage Layer fails)
   */
  private static saveToLocalStorageOnly(
    inventory: InventoryItem[], 
    uploadSource: string,
    platform: Platform = PLATFORM.BLINKIT,
    dataFormat: 'blinkit' | 'amazon' = 'blinkit'
  ): void {
    try {
      const timestamp = new Date();
      const totalUnits = inventory.reduce((sum, item) => sum + item.totalSellable, 0);

      // Create platform-aware snapshot
      const snapshot: InventorySnapshot = {
        timestamp,
        itemId: '', // Not used in summary snapshots
        warehouseFacilityId: '', // Not used in summary snapshots
        totalSellable: totalUnits,
        uploadSource,
        platform,
        platformMetadata: {
          uploadSource,
          dataFormat,
          recordCount: inventory.length
        }
      };

      // Save platform-specific snapshots
      const existingSnapshots = this.getFromLocalStorageOnly(undefined, undefined, platform);
      existingSnapshots.push(snapshot);
      
      // Keep only the most recent snapshots per platform
      if (existingSnapshots.length > this.MAX_SNAPSHOTS) {
        existingSnapshots.splice(0, existingSnapshots.length - this.MAX_SNAPSHOTS);
      }
      
      // Store with platform-specific key
      const platformKey = `${this.SNAPSHOT_KEY}_${platform.toLowerCase()}`;
      localStorage.setItem(platformKey, JSON.stringify(existingSnapshots));

      console.log(`Fallback: Inventory snapshot saved to localStorage only for platform ${platform}`);
    } catch (error) {
      console.error('Failed to save to localStorage fallback:', error);
    }
  }

  /**
   * Fallback method for localStorage-only retrieval (when Storage Layer fails)
   */
  private static getFromLocalStorageOnly(
    _itemId?: string, 
    _facilityId?: string, 
    platform?: Platform
  ): InventorySnapshot[] {
    try {
      let allSnapshots: InventorySnapshot[] = [];

      if (platform && platform !== PLATFORM.ALL) {
        // Get snapshots for specific platform
        const platformKey = `${this.SNAPSHOT_KEY}_${platform.toLowerCase()}`;
        const data = localStorage.getItem(platformKey);
        if (data) {
          const snapshots = JSON.parse(data);
          allSnapshots = snapshots.map((snapshot: any) => ({
            ...snapshot,
            timestamp: new Date(snapshot.timestamp)
          }));
        }
      } else {
        // Get snapshots for all platforms
        const platforms = [PLATFORM.BLINKIT, PLATFORM.AMAZON];
        for (const p of platforms) {
          const platformKey = `${this.SNAPSHOT_KEY}_${p.toLowerCase()}`;
          const data = localStorage.getItem(platformKey);
          if (data) {
            const snapshots = JSON.parse(data);
            const platformSnapshots = snapshots.map((snapshot: any) => ({
              ...snapshot,
              timestamp: new Date(snapshot.timestamp),
              platform: p // Ensure platform is set
            }));
            allSnapshots.push(...platformSnapshots);
          }
        }
      }

      // Sort by timestamp
      return allSnapshots.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (error) {
      console.error('Failed to load from localStorage fallback:', error);
      return [];
    }
  }
  static clearHistoryData(platform?: Platform): void {
    try {
      if (platform && platform !== PLATFORM.ALL) {
        // Clear specific platform data
        const platformKey = `${this.SNAPSHOT_KEY}_${platform.toLowerCase()}`;
        const platformItemKey = `${this.ITEM_SNAPSHOT_KEY}_${platform.toLowerCase()}`;
        localStorage.removeItem(platformKey);
        localStorage.removeItem(platformItemKey);
      } else {
        // Clear all platform data
        const platforms = [PLATFORM.BLINKIT, PLATFORM.AMAZON];
        for (const p of platforms) {
          const platformKey = `${this.SNAPSHOT_KEY}_${p.toLowerCase()}`;
          const platformItemKey = `${this.ITEM_SNAPSHOT_KEY}_${p.toLowerCase()}`;
          localStorage.removeItem(platformKey);
          localStorage.removeItem(platformItemKey);
        }
        
        // Also clear legacy keys for backward compatibility
        localStorage.removeItem(this.SNAPSHOT_KEY);
        localStorage.removeItem(this.ITEM_SNAPSHOT_KEY);
      }
      // History cleared successfully
    } catch (error) {
      console.error('Failed to clear history data:', error);
    }
  }

  /**
   * Get storage usage statistics with platform breakdown
   */
  static async getStorageStats(platform?: Platform): Promise<{ 
    snapshots: number; 
    itemSnapshots: number; 
    sizeKB: number;
    sizeMB: number;
    isNearLimit: boolean;
    platformBreakdown?: Record<Platform, { snapshots: number; itemSnapshots: number }>;
  }> {
    try {
      if (platform && platform !== PLATFORM.ALL) {
        // Get stats for specific platform
        const snapshots = (await this.getInventoryHistory(undefined, undefined, platform)).length;
        const itemSnapshots = (await this.getItemSnapshots(undefined, undefined, platform)).length;
        
        const platformKey = `${this.SNAPSHOT_KEY}_${platform.toLowerCase()}`;
        const platformItemKey = `${this.ITEM_SNAPSHOT_KEY}_${platform.toLowerCase()}`;
        const snapshotData = localStorage.getItem(platformKey) || '';
        const itemSnapshotData = localStorage.getItem(platformItemKey) || '';
        const sizeBytes = snapshotData.length + itemSnapshotData.length;
        const sizeKB = Math.round(sizeBytes / 1024);
        const sizeMB = sizeBytes / (1024 * 1024);
        const isNearLimit = sizeMB > (this.MAX_STORAGE_SIZE_MB * 0.8); // 80% threshold

        return { snapshots, itemSnapshots, sizeKB, sizeMB, isNearLimit };
      } else {
        // Get stats for all platforms
        let totalSnapshots = 0;
        let totalItemSnapshots = 0;
        let totalSize = 0;
        const platformBreakdown: Record<Platform, { snapshots: number; itemSnapshots: number }> = {} as any;

        const platforms = [PLATFORM.BLINKIT, PLATFORM.AMAZON];
        for (const p of platforms) {
          const snapshots = (await this.getInventoryHistory(undefined, undefined, p)).length;
          const itemSnapshots = (await this.getItemSnapshots(undefined, undefined, p)).length;
          
          platformBreakdown[p] = { snapshots, itemSnapshots };
          totalSnapshots += snapshots;
          totalItemSnapshots += itemSnapshots;

          const platformKey = `${this.SNAPSHOT_KEY}_${p.toLowerCase()}`;
          const platformItemKey = `${this.ITEM_SNAPSHOT_KEY}_${p.toLowerCase()}`;
          const snapshotData = localStorage.getItem(platformKey) || '';
          const itemSnapshotData = localStorage.getItem(platformItemKey) || '';
          totalSize += snapshotData.length + itemSnapshotData.length;
        }

        const sizeKB = Math.round(totalSize / 1024);
        const sizeMB = totalSize / (1024 * 1024);
        const isNearLimit = sizeMB > (this.MAX_STORAGE_SIZE_MB * 0.8); // 80% threshold
        
        return { 
          snapshots: totalSnapshots, 
          itemSnapshots: totalItemSnapshots, 
          sizeKB,
          sizeMB,
          isNearLimit,
          platformBreakdown
        };
      }
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return { snapshots: 0, itemSnapshots: 0, sizeKB: 0, sizeMB: 0, isNearLimit: false };
    }
  }

  /**
   * Compress old data to reduce storage usage
   * Compresses snapshots older than COMPRESSION_THRESHOLD_DAYS
   */
  static async compressOldData(platform?: Platform): Promise<{ 
    compressedSnapshots: number; 
    spaceSavedKB: number; 
    newSizeMB: number; 
  }> {
    try {
      const compressionDate = new Date(Date.now() - this.COMPRESSION_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
      let totalCompressed = 0;
      let totalSpaceSaved = 0;

      const platforms = platform && platform !== PLATFORM.ALL ? [platform] : [PLATFORM.BLINKIT, PLATFORM.AMAZON];

      for (const p of platforms) {
        const platformKey = `${this.SNAPSHOT_KEY}_${p.toLowerCase()}`;
        const platformItemKey = `${this.ITEM_SNAPSHOT_KEY}_${p.toLowerCase()}`;
        
        // Get current data
        const snapshots = await this.getInventoryHistory(undefined, undefined, p);
        const itemSnapshots = await this.getItemSnapshots(undefined, undefined, p);
        
        // Separate old and recent data
        const recentSnapshots = snapshots.filter(s => s.timestamp > compressionDate);
        const oldSnapshots = snapshots.filter(s => s.timestamp <= compressionDate);
        
        const recentItemSnapshots = itemSnapshots.filter(s => s.timestamp > compressionDate);
        const oldItemSnapshots = itemSnapshots.filter(s => s.timestamp <= compressionDate);

        // Compress old data by keeping only daily summaries
        const compressedOldSnapshots = this.compressSnapshotsByDay(oldSnapshots);
        const compressedOldItemSnapshots = this.compressItemSnapshotsByDay(oldItemSnapshots);

        // Calculate space saved
        const originalSize = JSON.stringify(oldSnapshots).length + JSON.stringify(oldItemSnapshots).length;
        const compressedSize = JSON.stringify(compressedOldSnapshots).length + JSON.stringify(compressedOldItemSnapshots).length;
        const spaceSaved = originalSize - compressedSize;

        // Combine recent and compressed old data
        const finalSnapshots = [...recentSnapshots, ...compressedOldSnapshots];
        const finalItemSnapshots = [...recentItemSnapshots, ...compressedOldItemSnapshots];

        // Store compressed data
        localStorage.setItem(platformKey, JSON.stringify(finalSnapshots));
        localStorage.setItem(platformItemKey, JSON.stringify(finalItemSnapshots));

        totalCompressed += oldSnapshots.length - compressedOldSnapshots.length;
        totalSpaceSaved += spaceSaved;
      }

      const stats = await this.getStorageStats(platform);
      
      return {
        compressedSnapshots: totalCompressed,
        spaceSavedKB: Math.round(totalSpaceSaved / 1024),
        newSizeMB: stats.sizeMB
      };
    } catch (error) {
      console.error('Failed to compress old data:', error);
      return { compressedSnapshots: 0, spaceSavedKB: 0, newSizeMB: 0 };
    }
  }

  /**
   * Compress snapshots by keeping only one per day (the latest)
   */
  private static compressSnapshotsByDay(snapshots: InventorySnapshot[]): InventorySnapshot[] {
    const dailySnapshots = new Map<string, InventorySnapshot>();
    
    snapshots.forEach(snapshot => {
      const dateKey = snapshot.timestamp.toISOString().split('T')[0];
      const existing = dailySnapshots.get(dateKey);
      
      // Keep the latest snapshot for each day
      if (!existing || snapshot.timestamp > existing.timestamp) {
        dailySnapshots.set(dateKey, snapshot);
      }
    });
    
    return Array.from(dailySnapshots.values());
  }

  /**
   * Compress item snapshots by keeping only daily summaries for each item
   */
  private static compressItemSnapshotsByDay(itemSnapshots: ItemSnapshot[]): ItemSnapshot[] {
    const dailyItemSnapshots = new Map<string, ItemSnapshot>();
    
    itemSnapshots.forEach(snapshot => {
      const dateKey = snapshot.timestamp.toISOString().split('T')[0];
      const itemKey = `${dateKey}_${snapshot.itemId}_${snapshot.warehouseFacilityId}`;
      const existing = dailyItemSnapshots.get(itemKey);
      
      // Keep the latest snapshot for each item per day
      if (!existing || snapshot.timestamp > existing.timestamp) {
        dailyItemSnapshots.set(itemKey, snapshot);
      }
    });
    
    return Array.from(dailyItemSnapshots.values());
  }

  /**
   * Check storage limits and automatically compress if needed
   */
  static async checkAndManageStorage(platform?: Platform): Promise<{
    wasCompressed: boolean;
    stats: Awaited<ReturnType<typeof HistoryService.getStorageStats>>;
    compressionResult?: Awaited<ReturnType<typeof HistoryService.compressOldData>>;
  }> {
    const stats = await this.getStorageStats(platform);
    
    if (stats.isNearLimit) {
      console.warn(`Storage approaching limit: ${stats.sizeMB.toFixed(2)}MB / ${this.MAX_STORAGE_SIZE_MB}MB`);
      const compressionResult = await this.compressOldData(platform);
      const newStats = await this.getStorageStats(platform);
      
      return {
        wasCompressed: true,
        stats: newStats,
        compressionResult
      };
    }
    
    return {
      wasCompressed: false,
      stats
    };
  }

  /**
   * Legacy method for backward compatibility
   */
  static getInventorySnapshots(): LegacyInventorySnapshot[] {
    // This method is kept for backward compatibility
    // New code should use getInventoryHistory instead
    return [];
  }

  /**
   * Helper method to get average price for an item from sales data
   */
  // private static getAveragePrice(itemId: string, salesData: any[]): number {
  //   const itemSales = salesData.filter(sale => sale.itemId === itemId);
  //   if (itemSales.length === 0) return 100; // Default price
    
  //   const totalRevenue = itemSales.reduce((sum, sale) => sum + (sale.quantity * sale.sellingPrice), 0);
  //   const totalQuantity = itemSales.reduce((sum, sale) => sum + sale.quantity, 0);
    
  //   return totalQuantity > 0 ? totalRevenue / totalQuantity : 100;
  // }
}