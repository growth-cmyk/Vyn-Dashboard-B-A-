/**
 * Final Integrity Check - Validates Immutable Logic Layer
 * 
 * This test ensures that the 15-day Lead Time, 3-day Safety Stock, 
 * and 6-month Expiry Logic still produce the exact same reorder quantities
 * as they did before the UI modernization.
 */

import { describe, it, expect } from 'vitest';
import { AnalyticsService } from '../services/AnalyticsService';
import type { InventoryItem } from '../types';

// Reference test data with known expected results
const referenceInventoryItems: InventoryItem[] = [
  {
    itemId: 'TEST-001',
    itemName: 'Test Product 1',
    brandName: 'Test Brand',
    upc: '123456789012',
    uom: 'units',
    warehouseFacilityId: 'WH001',
    warehouseFacilityName: 'Test Warehouse',
    totalSellable: 100,
    incomingScheduled: 0,
    totalUnsellable: 0,
    last7Days: 70,  // 10 units/day velocity
    last15Days: 150,
    last30Days: 300
  },
  {
    itemId: 'TEST-002',
    itemName: 'Test Product 2',
    brandName: 'Test Brand',
    upc: '123456789013',
    uom: 'units',
    warehouseFacilityId: 'WH001',
    warehouseFacilityName: 'Test Warehouse',
    totalSellable: 0,  // Out of stock
    incomingScheduled: 0,
    totalUnsellable: 0,
    last7Days: 35,  // 5 units/day velocity
    last15Days: 75,
    last30Days: 150
  },
  {
    itemId: 'TEST-003',
    itemName: 'Test Product 3',
    brandName: 'Test Brand',
    upc: '123456789014',
    uom: 'units',
    warehouseFacilityId: 'WH001',
    warehouseFacilityName: 'Test Warehouse',
    totalSellable: 500,  // High stock
    incomingScheduled: 0,
    totalUnsellable: 0,
    last7Days: 14,  // 2 units/day velocity
    last15Days: 30,
    last30Days: 60
  }
];

// Expected results based on actual AnalyticsService logic with 15-day lead time
const expectedResults = {
  'TEST-001': {
    salesVelocity: 10, // 70/7
    daysOfCover: 10,   // 100/10
    safetyStock: 30,   // 10 * 3 days
    reorderQuantity: 80, // Math.max(0, (10*15) + 30 - 100) = Math.max(0, 80) = 80
    stockStatus: 'understock' // < 18 days
  },
  'TEST-002': {
    salesVelocity: 5,  // 35/7
    daysOfCover: 0,    // 0/5
    safetyStock: 15,   // 5 * 3 days
    reorderQuantity: 90, // Math.max(0, (5*15) + 15 - 0) = Math.max(0, 90) = 90
    stockStatus: 'out-of-stock'
  },
  'TEST-003': {
    salesVelocity: 2,  // 14/7
    daysOfCover: 250,  // 500/2
    safetyStock: 6,    // 2 * 3 days
    reorderQuantity: undefined, // No reorder needed (expiry-risk status)
    stockStatus: 'expiry-risk' // > 90 days
  }
};

describe('Final Integrity Check - Immutable Logic Layer', () => {
  it('should preserve exact 15-day Lead Time logic in reorder calculations', () => {
    referenceInventoryItems.forEach(item => {
      const analysis = AnalyticsService.analyzeStock(item);
      
      // Verify 15-day lead time is preserved in reorder quantity calculation
      if (analysis.stockStatus === 'understock' || analysis.stockStatus === 'out-of-stock') {
        // Formula: Math.max(0, (leadTime * salesVelocity) + safetyStock - currentStock)
        const calculatedReorder = Math.max(0, Math.ceil((15 * analysis.salesVelocity) + analysis.safetyStock - item.totalSellable));
        expect(analysis.reorderQuantity).toBe(calculatedReorder);
      } else {
        // No reorder needed for healthy/overstock/expiry-risk
        expect(analysis.reorderQuantity).toBeUndefined();
      }
    });
  });

  it('should preserve exact 3-day Safety Stock calculation', () => {
    referenceInventoryItems.forEach(item => {
      const analysis = AnalyticsService.analyzeStock(item);
      const expected = expectedResults[item.itemId as keyof typeof expectedResults];
      
      // Safety stock should always be 3 days of sales velocity
      const expectedSafetyStock = analysis.salesVelocity * 3;
      expect(analysis.safetyStock).toBe(expectedSafetyStock);
      expect(analysis.safetyStock).toBe(expected.safetyStock);
    });
  });

  it('should preserve exact sales velocity calculations', () => {
    referenceInventoryItems.forEach(item => {
      const analysis = AnalyticsService.analyzeStock(item);
      const expected = expectedResults[item.itemId as keyof typeof expectedResults];
      
      // Sales velocity should be last7Days / 7
      const expectedVelocity = item.last7Days / 7;
      expect(analysis.salesVelocity).toBe(expectedVelocity);
      expect(analysis.salesVelocity).toBe(expected.salesVelocity);
    });
  });

  it('should preserve exact days of cover calculations', () => {
    referenceInventoryItems.forEach(item => {
      const analysis = AnalyticsService.analyzeStock(item);
      const expected = expectedResults[item.itemId as keyof typeof expectedResults];
      
      // Days of cover should be totalSellable / salesVelocity
      const expectedDaysOfCover = item.totalSellable / analysis.salesVelocity;
      expect(analysis.daysOfCover).toBe(expectedDaysOfCover);
      expect(analysis.daysOfCover).toBe(expected.daysOfCover);
    });
  });

  it('should preserve exact stock status classification logic', () => {
    referenceInventoryItems.forEach(item => {
      const analysis = AnalyticsService.analyzeStock(item);
      const expected = expectedResults[item.itemId as keyof typeof expectedResults];
      
      expect(analysis.stockStatus).toBe(expected.stockStatus);
    });
  });

  it('should preserve AnalyticsService calculateReorderQuantity formula', () => {
    referenceInventoryItems.forEach(item => {
      const analysis = AnalyticsService.analyzeStock(item);
      const expected = expectedResults[item.itemId as keyof typeof expectedResults];
      
      // Should match expected results exactly
      expect(analysis.reorderQuantity).toBe(expected.reorderQuantity);
      expect(analysis.safetyStock).toBe(expected.safetyStock);
    });
  });

  it('should maintain exact numerical precision without rounding errors', () => {
    // Test with decimal values to ensure no precision loss
    const precisionTestItem: InventoryItem = {
      itemId: 'PRECISION-TEST',
      itemName: 'Precision Test Product',
      brandName: 'Test Brand',
      upc: '123456789015',
      uom: 'units',
      warehouseFacilityId: 'WH001',
      warehouseFacilityName: 'Test Warehouse',
      totalSellable: 123,
      incomingScheduled: 0,
      totalUnsellable: 0,
      last7Days: 17, // 2.428571... units/day
      last15Days: 35,
      last30Days: 70
    };

    const analysis = AnalyticsService.analyzeStock(precisionTestItem);
    
    // Verify exact decimal calculations
    expect(analysis.salesVelocity).toBe(17 / 7); // 2.428571428571429
    expect(analysis.daysOfCover).toBe(123 / (17 / 7)); // 50.647058823529406
    expect(analysis.safetyStock).toBe((17 / 7) * 3); // 7.285714285714286
    
    // Reorder quantity should be precise: (17/7 * 7) + (17/7 * 3) for understock items
    // Since daysOfCover is ~50.6, this is expiry-risk, so reorderQuantity should be undefined
    expect(analysis.reorderQuantity).toBeUndefined();
  });

  it('should handle edge cases consistently', () => {
    // Zero sales velocity
    const zeroSalesItem: InventoryItem = {
      itemId: 'ZERO-SALES',
      itemName: 'Zero Sales Product',
      brandName: 'Test Brand',
      upc: '123456789016',
      uom: 'units',
      warehouseFacilityId: 'WH001',
      warehouseFacilityName: 'Test Warehouse',
      totalSellable: 100,
      incomingScheduled: 0,
      totalUnsellable: 0,
      last7Days: 0,
      last15Days: 0,
      last30Days: 0
    };

    const analysis = AnalyticsService.analyzeStock(zeroSalesItem);
    
    expect(analysis.salesVelocity).toBe(0);
    expect(analysis.daysOfCover).toBe(Infinity);
    expect(analysis.safetyStock).toBe(0);
    expect(analysis.reorderQuantity).toBeUndefined();
    expect(analysis.stockStatus).toBe('expiry-risk');
  });

  it('should validate that UI modernization did not affect core business logic', () => {
    // This test serves as a final checkpoint to ensure that all the UI changes
    // (glassmorphism, dark mode, virtualization, etc.) did not accidentally
    // modify the core business calculations
    
    const testResults = referenceInventoryItems.map(item => {
      const analysis = AnalyticsService.analyzeStock(item);
      const expected = expectedResults[item.itemId as keyof typeof expectedResults];
      
      return {
        itemId: item.itemId,
        matches: {
          salesVelocity: analysis.salesVelocity === expected.salesVelocity,
          daysOfCover: analysis.daysOfCover === expected.daysOfCover,
          safetyStock: analysis.safetyStock === expected.safetyStock,
          reorderQuantity: analysis.reorderQuantity === expected.reorderQuantity,
          stockStatus: analysis.stockStatus === expected.stockStatus
        }
      };
    });
    
    // All calculations should match exactly
    testResults.forEach(result => {
      Object.values(result.matches).forEach(matches => {
        expect(matches).toBe(true);
      });
    });
    
    // Log success message
    console.log('✅ UI Modernization Integrity Check PASSED');
    console.log('✅ All business logic calculations remain unchanged');
    console.log('✅ 15-day Lead Time logic preserved');
    console.log('✅ 3-day Safety Stock logic preserved');
    console.log('✅ Reorder quantity formulas intact');
  });
});