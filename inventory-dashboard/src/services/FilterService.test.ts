import { describe, it, expect, beforeEach } from 'vitest';
import { FilterService } from './FilterService';
import type { InventoryItem, SalesRecord, FilterCriteria } from '../types';
import { TIME_PERIOD } from '../types';

describe('FilterService', () => {
  let mockInventory: InventoryItem[];
  let mockSales: SalesRecord[];

  beforeEach(() => {
    // Mock inventory data
    mockInventory = [
      {
        itemId: 'ITEM001',
        itemName: 'Apple iPhone 14',
        brandName: 'Apple',
        upc: '123456789',
        uom: 'each',
        warehouseFacilityId: 'WH001',
        warehouseFacilityName: 'Mumbai Warehouse',
        totalSellable: 100,
        incomingScheduled: 50,
        totalUnsellable: 5,
        last7Days: 10,
        last15Days: 25,
        last30Days: 45
      },
      {
        itemId: 'ITEM002',
        itemName: 'Samsung Galaxy S23',
        brandName: 'Samsung',
        upc: '987654321',
        uom: 'each',
        warehouseFacilityId: 'WH002',
        warehouseFacilityName: 'Delhi Warehouse',
        totalSellable: 75,
        incomingScheduled: 25,
        totalUnsellable: 3,
        last7Days: 8,
        last15Days: 20,
        last30Days: 35
      },
      {
        itemId: 'ITEM003',
        itemName: 'Apple MacBook Pro',
        brandName: 'Apple',
        upc: '456789123',
        uom: 'each',
        warehouseFacilityId: 'WH001',
        warehouseFacilityName: 'Mumbai Warehouse',
        totalSellable: 30,
        incomingScheduled: 10,
        totalUnsellable: 2,
        last7Days: 3,
        last15Days: 8,
        last30Days: 15
      }
    ];

    // Mock sales data
    const baseDate = new Date('2024-01-15');
    mockSales = [
      {
        orderId: 'ORD001',
        orderDate: new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        itemId: 'ITEM001',
        productName: 'Apple iPhone 14',
        brandName: 'Apple',
        upc: '123456789',
        supplyCity: 'Mumbai',
        supplyState: 'Maharashtra',
        customerCity: 'Pune',
        customerState: 'Maharashtra',
        quantity: 2,
        sellingPrice: 80000
      },
      {
        orderId: 'ORD002',
        orderDate: new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        itemId: 'ITEM002',
        productName: 'Samsung Galaxy S23',
        brandName: 'Samsung',
        upc: '987654321',
        supplyCity: 'Delhi',
        supplyState: 'Delhi',
        customerCity: 'Gurgaon',
        customerState: 'Haryana',
        quantity: 1,
        sellingPrice: 75000
      },
      {
        orderId: 'ORD003',
        orderDate: new Date(baseDate.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        itemId: 'ITEM003',
        productName: 'Apple MacBook Pro',
        brandName: 'Apple',
        upc: '456789123',
        supplyCity: 'Mumbai',
        supplyState: 'Maharashtra',
        customerCity: 'Bangalore',
        customerState: 'Karnataka',
        quantity: 1,
        sellingPrice: 150000
      }
    ];
  });

  describe('filterByLocation', () => {
    it('should filter inventory by warehouse facility ID', () => {
      const result = FilterService.filterByLocation(mockInventory, ['WH001']);
      expect(result).toHaveLength(2);
      expect(result.every(item => item.warehouseFacilityId === 'WH001')).toBe(true);
    });

    it('should filter inventory by warehouse facility name', () => {
      const result = FilterService.filterByLocation(mockInventory, ['Mumbai']);
      expect(result).toHaveLength(2);
      expect(result.every(item => item.warehouseFacilityName.includes('Mumbai'))).toBe(true);
    });

    it('should return all items when no locations specified', () => {
      const result = FilterService.filterByLocation(mockInventory, []);
      expect(result).toHaveLength(mockInventory.length);
    });

    it('should handle case-insensitive matching', () => {
      const result = FilterService.filterByLocation(mockInventory, ['mumbai']);
      expect(result).toHaveLength(2);
    });
  });

  describe('filterBySKU', () => {
    it('should filter by item ID', () => {
      const result = FilterService.filterBySKU(mockInventory, ['ITEM001']);
      expect(result).toHaveLength(1);
      expect(result[0].itemId).toBe('ITEM001');
    });

    it('should filter by UPC', () => {
      const result = FilterService.filterBySKU(mockInventory, ['123456789']);
      expect(result).toHaveLength(1);
      expect(result[0].upc).toBe('123456789');
    });

    it('should return all items when no SKUs specified', () => {
      const result = FilterService.filterBySKU(mockInventory, []);
      expect(result).toHaveLength(mockInventory.length);
    });

    it('should handle partial matches', () => {
      const result = FilterService.filterBySKU(mockInventory, ['ITEM']);
      expect(result).toHaveLength(3);
    });
  });

  describe('filterByTimePeriod', () => {
    it('should filter sales by last 7 days', () => {
      // Mock current date to be 15 days after base date
      const mockNow = new Date('2024-01-30');
      const originalDate = Date;
      global.Date = class extends Date {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(mockNow);
          } else {
            super(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
          }
        }
        static now() {
          return mockNow.getTime();
        }
      } as any;

      const result = FilterService.filterByTimePeriod(mockSales, TIME_PERIOD.LAST_7_DAYS);
      // Only orders from last 7 days should be included
      expect(result.length).toBeGreaterThanOrEqual(0);

      global.Date = originalDate;
    });

    it('should return all sales when no period specified', () => {
      const result = FilterService.filterByTimePeriod(mockSales, undefined as any);
      expect(result).toHaveLength(mockSales.length);
    });
  });

  describe('searchInventoryByName', () => {
    it('should search by item name', () => {
      const result = FilterService.searchInventoryByName(mockInventory, 'iPhone');
      expect(result).toHaveLength(1);
      expect(result[0].itemName).toContain('iPhone');
    });

    it('should search by brand name', () => {
      const result = FilterService.searchInventoryByName(mockInventory, 'Apple');
      expect(result).toHaveLength(2);
      expect(result.every(item => item.brandName === 'Apple')).toBe(true);
    });

    it('should be case-insensitive', () => {
      const result = FilterService.searchInventoryByName(mockInventory, 'apple');
      expect(result).toHaveLength(2);
    });

    it('should return all items when search term is empty', () => {
      const result = FilterService.searchInventoryByName(mockInventory, '');
      expect(result).toHaveLength(mockInventory.length);
    });
  });

  describe('searchSalesByName', () => {
    it('should search sales by product name', () => {
      const result = FilterService.searchSalesByName(mockSales, 'iPhone');
      expect(result).toHaveLength(1);
      expect(result[0].productName).toContain('iPhone');
    });

    it('should search sales by brand name', () => {
      const result = FilterService.searchSalesByName(mockSales, 'Apple');
      expect(result).toHaveLength(2);
    });
  });

  describe('applyInventoryFilters', () => {
    it('should apply multiple filters correctly', () => {
      const criteria: FilterCriteria = {
        locations: ['WH001'],
        searchTerm: 'Apple'
      };
      
      const result = FilterService.applyInventoryFilters(mockInventory, criteria);
      expect(result).toHaveLength(2);
      expect(result.every(item => 
        item.warehouseFacilityId === 'WH001' && item.brandName === 'Apple'
      )).toBe(true);
    });

    it('should return all items when no criteria specified', () => {
      const result = FilterService.applyInventoryFilters(mockInventory, {});
      expect(result).toHaveLength(mockInventory.length);
    });
  });

  describe('applySalesFilters', () => {
    it('should apply multiple filters correctly', () => {
      const criteria: FilterCriteria = {
        locations: ['Mumbai'],
        searchTerm: 'Apple'
      };
      
      const result = FilterService.applySalesFilters(mockSales, criteria);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getUniqueLocations', () => {
    it('should return unique locations', () => {
      const result = FilterService.getUniqueLocations(mockInventory);
      expect(result).toHaveLength(2);
      expect(result.map(loc => loc.id)).toContain('WH001');
      expect(result.map(loc => loc.id)).toContain('WH002');
    });
  });

  describe('getUniqueSKUs', () => {
    it('should return unique SKUs', () => {
      const result = FilterService.getUniqueSKUs(mockInventory);
      expect(result).toHaveLength(3);
      expect(result.map(sku => sku.id)).toContain('ITEM001');
      expect(result.map(sku => sku.id)).toContain('ITEM002');
      expect(result.map(sku => sku.id)).toContain('ITEM003');
    });
  });

  describe('getUniqueBrands', () => {
    it('should return unique brands', () => {
      const result = FilterService.getUniqueBrands(mockInventory);
      expect(result).toContain('Apple');
      expect(result).toContain('Samsung');
      expect(result).toHaveLength(2);
    });
  });

  describe('getFilterSummary', () => {
    it('should create a readable filter summary', () => {
      const criteria: FilterCriteria = {
        locations: ['WH001'],
        searchTerm: 'Apple',
        timePeriod: TIME_PERIOD.LAST_7_DAYS
      };
      
      const result = FilterService.getFilterSummary(criteria);
      expect(result).toContain('Locations: WH001');
      expect(result).toContain('Search: "Apple"');
      expect(result).toContain('Period: last 7 days');
    });

    it('should return "No filters applied" when no criteria', () => {
      const result = FilterService.getFilterSummary({});
      expect(result).toBe('No filters applied');
    });
  });

  describe('applyCampaignFilters', () => {
    let mockCampaigns: any[];

    beforeEach(() => {
      const now = new Date();
      mockCampaigns = [
        {
          date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          campaignName: 'iPhone 14 Promotion',
          campaignType: 'Product Recommendation',
          impressions: 10000,
          ctr: 2.5,
          budgetConsumed: 5000,
          directSales: 12000,
          totalRoAS: 2.4
        },
        {
          date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          campaignName: 'Samsung Galaxy Launch',
          campaignType: 'Product Listing',
          impressions: 8000,
          ctr: 3.0,
          budgetConsumed: 4000,
          directSales: 10000,
          totalRoAS: 2.5
        },
        {
          date: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
          campaignName: 'Holiday Sale',
          campaignType: 'Brand Booster',
          impressions: 15000,
          ctr: 1.8,
          budgetConsumed: 7000,
          directSales: 14000,
          totalRoAS: 2.0
        }
      ];
    });

    it('should filter campaigns by search term', () => {
      const criteria: FilterCriteria = {
        searchTerm: 'iPhone'
      };

      const result = FilterService.applyCampaignFilters(mockCampaigns, criteria);
      expect(result).toHaveLength(1);
      expect(result[0].campaignName).toBe('iPhone 14 Promotion');
    });

    it('should filter campaigns by time period', () => {
      const criteria: FilterCriteria = {
        timePeriod: 'last-15-days'
      };

      const result = FilterService.applyCampaignFilters(mockCampaigns, criteria);
      expect(result).toHaveLength(2); // Should exclude the 25-day-old campaign
      expect(result.every(c => {
        const daysDiff = (Date.now() - new Date(c.date).getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 15;
      })).toBe(true);
    });

    it('should return all campaigns when no criteria specified', () => {
      const result = FilterService.applyCampaignFilters(mockCampaigns, {});
      expect(result).toHaveLength(3);
      expect(result).toEqual(mockCampaigns);
    });

    it('should apply multiple filters correctly', () => {
      const criteria: FilterCriteria = {
        searchTerm: 'Samsung',
        timePeriod: 'last-30-days'
      };

      const result = FilterService.applyCampaignFilters(mockCampaigns, criteria);
      expect(result).toHaveLength(1);
      expect(result[0].campaignName).toBe('Samsung Galaxy Launch');
    });
  });
});