import { describe, it, expect, beforeEach } from 'vitest';
import { DataService } from '../DataService';
import type { SalesRecord } from '../../types';
import { PLATFORM } from '../../types';

describe('DataService - Demand Map Automation', () => {
  beforeEach(() => {
    // Clear demand map before each test
    DataService.clearDemandMap();
  });

  describe('buildDemandMapFromSales', () => {
    it('should build demand map from sales records', () => {
      // Create mock sales records for Vyndo Masala Ragi Bhakhri
      const now = new Date();
      const salesRecords: SalesRecord[] = [
        {
          orderId: '923905594',
          orderDate: new Date(now.getFullYear(), now.getMonth() - 1, 1), // Last month
          itemId: '10196943',
          productName: 'Vyndo Masala Ragi Bhakhri',
          brandName: 'Vyndo',
          upc: '8.91E+12',
          supplyCity: 'Ahmedabad',
          supplyState: 'Gujarat',
          customerCity: 'Ahmedabad',
          customerState: 'Gujarat',
          quantity: 5,
          sellingPrice: 198,
          platform: PLATFORM.BLINKIT
        },
        {
          orderId: '922541722',
          orderDate: new Date(now.getFullYear(), now.getMonth() - 1, 2), // Last month
          itemId: '10196943',
          productName: 'Vyndo Masala Ragi Bhakhri',
          brandName: 'Vyndo',
          upc: '8.91E+12',
          supplyCity: 'Ahmedabad',
          supplyState: 'Gujarat',
          customerCity: 'Ahmedabad',
          customerState: 'Gujarat',
          quantity: 3,
          sellingPrice: 198,
          platform: PLATFORM.BLINKIT
        },
        {
          orderId: '924865757',
          orderDate: new Date(now.getFullYear(), now.getMonth(), 2), // Current month
          itemId: '10196943',
          productName: 'Vyndo Masala Ragi Bhakhri',
          brandName: 'Vyndo',
          upc: '8.91E+12',
          supplyCity: 'Ahmedabad',
          supplyState: 'Gujarat',
          customerCity: 'Ahmedabad',
          customerState: 'Gujarat',
          quantity: 7,
          sellingPrice: 198,
          platform: PLATFORM.BLINKIT
        }
      ];

      // Build demand map (this is called internally by loadSalesData)
      // We're testing the private method indirectly through the public API
      const demandMap = DataService.getDemandMap();
      
      // Manually trigger the build (simulating what loadSalesData does)
      // @ts-ignore - accessing private method for testing
      DataService.buildDemandMapFromSales(salesRecords);

      // Verify demand map was built
      const updatedDemandMap = DataService.getDemandMap();
      expect(updatedDemandMap.size).toBeGreaterThan(0);
      
      // Verify the item exists in demand map
      const demand = updatedDemandMap.get('10196943');
      expect(demand).toBeDefined();
      expect(demand).toHaveLength(12); // 12 months
      
      // Verify quantities are summed correctly
      // Last month should have 5 + 3 = 8 units
      // Current month should have 7 units
      const lastMonthIndex = 10; // Second to last in array (oldest to newest)
      const currentMonthIndex = 11; // Last in array
      
      expect(demand![lastMonthIndex]).toBe(8);
      expect(demand![currentMonthIndex]).toBe(7);
    });

    it('should handle multiple SKUs correctly', () => {
      const now = new Date();
      const salesRecords: SalesRecord[] = [
        {
          orderId: '1',
          orderDate: new Date(now.getFullYear(), now.getMonth(), 1),
          itemId: '10196943', // Masala Ragi
          productName: 'Vyndo Masala Ragi Bhakhri',
          brandName: 'Vyndo',
          upc: '8.91E+12',
          supplyCity: 'Ahmedabad',
          supplyState: 'Gujarat',
          customerCity: 'Ahmedabad',
          customerState: 'Gujarat',
          quantity: 10,
          sellingPrice: 198,
          platform: PLATFORM.BLINKIT
        },
        {
          orderId: '2',
          orderDate: new Date(now.getFullYear(), now.getMonth(), 1),
          itemId: '10197316', // Farali
          productName: 'Vyndo Farali Bhakhri',
          brandName: 'Vyndo',
          upc: '8.91E+12',
          supplyCity: 'Surat',
          supplyState: 'Gujarat',
          customerCity: 'Surat',
          customerState: 'Gujarat',
          quantity: 5,
          sellingPrice: 198,
          platform: PLATFORM.BLINKIT
        }
      ];

      // @ts-ignore - accessing private method for testing
      DataService.buildDemandMapFromSales(salesRecords);

      const demandMap = DataService.getDemandMap();
      
      // Verify both SKUs are in the map
      expect(demandMap.has('10196943')).toBe(true);
      expect(demandMap.has('10197316')).toBe(true);
      
      // Verify quantities are correct
      const masalaDemand = demandMap.get('10196943');
      const faraliDemand = demandMap.get('10197316');
      
      expect(masalaDemand![11]).toBe(10); // Current month
      expect(faraliDemand![11]).toBe(5);  // Current month
    });

    it('should create 12-month array with zeros for missing months', () => {
      const now = new Date();
      const salesRecords: SalesRecord[] = [
        {
          orderId: '1',
          orderDate: new Date(now.getFullYear(), now.getMonth(), 1), // Only current month
          itemId: '10196943',
          productName: 'Vyndo Masala Ragi Bhakhri',
          brandName: 'Vyndo',
          upc: '8.91E+12',
          supplyCity: 'Ahmedabad',
          supplyState: 'Gujarat',
          customerCity: 'Ahmedabad',
          customerState: 'Gujarat',
          quantity: 10,
          sellingPrice: 198,
          platform: PLATFORM.BLINKIT
        }
      ];

      // @ts-ignore - accessing private method for testing
      DataService.buildDemandMapFromSales(salesRecords);

      const demandMap = DataService.getDemandMap();
      const demand = demandMap.get('10196943');
      
      // Verify array has 12 months
      expect(demand).toHaveLength(12);
      
      // Verify current month has data
      expect(demand![11]).toBe(10);
      
      // Verify other months are zero
      for (let i = 0; i < 11; i++) {
        expect(demand![i]).toBe(0);
      }
    });
  });

  describe('getDemandMap', () => {
    it('should return empty map initially', () => {
      const demandMap = DataService.getDemandMap();
      expect(demandMap.size).toBe(0);
    });

    it('should return populated map after building', () => {
      const now = new Date();
      const salesRecords: SalesRecord[] = [
        {
          orderId: '1',
          orderDate: new Date(now.getFullYear(), now.getMonth(), 1),
          itemId: '10196943',
          productName: 'Vyndo Masala Ragi Bhakhri',
          brandName: 'Vyndo',
          upc: '8.91E+12',
          supplyCity: 'Ahmedabad',
          supplyState: 'Gujarat',
          customerCity: 'Ahmedabad',
          customerState: 'Gujarat',
          quantity: 10,
          sellingPrice: 198,
          platform: PLATFORM.BLINKIT
        }
      ];

      // @ts-ignore - accessing private method for testing
      DataService.buildDemandMapFromSales(salesRecords);

      const demandMap = DataService.getDemandMap();
      expect(demandMap.size).toBe(1);
      expect(demandMap.has('10196943')).toBe(true);
    });
  });

  describe('clearDemandMap', () => {
    it('should clear the demand map', () => {
      const now = new Date();
      const salesRecords: SalesRecord[] = [
        {
          orderId: '1',
          orderDate: new Date(now.getFullYear(), now.getMonth(), 1),
          itemId: '10196943',
          productName: 'Vyndo Masala Ragi Bhakhri',
          brandName: 'Vyndo',
          upc: '8.91E+12',
          supplyCity: 'Ahmedabad',
          supplyState: 'Gujarat',
          customerCity: 'Ahmedabad',
          customerState: 'Gujarat',
          quantity: 10,
          sellingPrice: 198,
          platform: PLATFORM.BLINKIT
        }
      ];

      // @ts-ignore - accessing private method for testing
      DataService.buildDemandMapFromSales(salesRecords);

      let demandMap = DataService.getDemandMap();
      expect(demandMap.size).toBe(1);

      // Clear the map
      DataService.clearDemandMap();

      demandMap = DataService.getDemandMap();
      expect(demandMap.size).toBe(0);
    });
  });
});
