import { useEffect, useState } from 'react';
import { BlobStorageService } from '../services/BlobStorageService';
import { DataService } from '../services/DataService';
import type { InventoryItem, SalesRecord, AdCampaignRecord } from '../types';

export interface RehydrationState {
  isRehydrating: boolean;
  isComplete: boolean;
  error: string | null;
  hasData: boolean;
}

export interface RehydrationData {
  inventory: InventoryItem[];
  sales: SalesRecord[];
  campaigns: AdCampaignRecord[];
}

/**
 * useBlobRehydration - Automatically re-hydrate dashboard from Vercel Blob Storage
 * 
 * Features:
 * - Fetches latest files from Vercel Blob on app startup
 * - Processes files with full business logic (15-day lead time, 6-month expiry)
 * - Provides loading states for UI feedback
 * - Handles errors gracefully
 * 
 * CRITICAL: Maintains 15-day lead time and 6-month expiry logic
 */
export function useBlobRehydration(platform: string = 'Blinkit') {
  const [state, setState] = useState<RehydrationState>({
    isRehydrating: false,
    isComplete: false,
    error: null,
    hasData: false,
  });

  const [data, setData] = useState<RehydrationData>({
    inventory: [],
    sales: [],
    campaigns: [],
  });

  useEffect(() => {
    let isMounted = true;

    async function rehydrate() {
      try {
        setState(prev => ({ ...prev, isRehydrating: true, error: null }));

        console.log('🔄 Starting dashboard re-hydration from Vercel Blob...');

        // Check if blob storage is available
        const isAvailable = await BlobStorageService.checkBlobStorageAvailability();
        if (!isAvailable) {
          console.log('ℹ️ Blob storage not available, skipping re-hydration');
          if (isMounted) {
            setState({
              isRehydrating: false,
              isComplete: true,
              error: null,
              hasData: false,
            });
          }
          return;
        }

        // Fetch files from Blob Storage
        const files = await BlobStorageService.rehydrateDashboard(platform);

        if (!isMounted) return;

        // Process files if available
        const rehydratedData: RehydrationData = {
          inventory: [],
          sales: [],
          campaigns: [],
        };

        let hasAnyData = false;

        // Process inventory file
        if (files.inventory) {
          console.log('📦 Processing inventory file from Blob...');
          const inventoryData = await DataService.loadInventoryData(files.inventory);
          rehydratedData.inventory = inventoryData;
          hasAnyData = true;
          console.log(`✅ Loaded ${inventoryData.length} inventory items`);
        }

        // Process sales file
        if (files.sales) {
          console.log('📦 Processing sales file from Blob...');
          const salesData = await DataService.loadSalesData(files.sales);
          rehydratedData.sales = salesData;
          hasAnyData = true;
          console.log(`✅ Loaded ${salesData.length} sales records`);
        }

        // Process campaign file
        if (files.campaign) {
          console.log('📦 Processing campaign file from Blob...');
          const campaignData = await DataService.loadExcelCampaignData(files.campaign);
          rehydratedData.campaigns = campaignData;
          hasAnyData = true;
          console.log(`✅ Loaded ${campaignData.length} campaign records`);
        }

        if (!isMounted) return;

        // Update state with rehydrated data
        setData(rehydratedData);
        setState({
          isRehydrating: false,
          isComplete: true,
          error: null,
          hasData: hasAnyData,
        });

        if (hasAnyData) {
          console.log('✅ Dashboard re-hydration complete!');
        } else {
          console.log('ℹ️ No data found in Blob Storage');
        }

      } catch (error) {
        console.error('❌ Re-hydration error:', error);
        if (isMounted) {
          setState({
            isRehydrating: false,
            isComplete: true,
            error: error instanceof Error ? error.message : 'Failed to re-hydrate dashboard',
            hasData: false,
          });
        }
      }
    }

    // Start re-hydration on mount
    rehydrate();

    return () => {
      isMounted = false;
    };
  }, [platform]);

  return { state, data };
}
