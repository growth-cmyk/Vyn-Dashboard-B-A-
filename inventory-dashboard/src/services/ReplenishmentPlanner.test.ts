import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsService, HistoryService } from './index';
import type { InventoryItem } from '../types';

// Test data for verification
const mockInventoryItems: InventoryItem[] = [
  {
    itemId: 'SKU-001',
    itemName: 'Test Product A',
    brandName: 'Test Brand',
    upc: '123456789',
    uom: 'EA',
    warehouseFacilityId: 'WH-001',
    warehouseFacilityName: 'Main Warehouse',
    totalSellable: 50, // Low stock - should need reorder
    incomingScheduled: 0,
    totalUnsellable: 0,
    last7Days: 70, // 10 units per day velocity
    last15Days: 150,
    last30Days: 300
  },
  {
    itemId: 'SKU-002',
    itemName: 'Test Product B',
    brandName: 'Test Brand',
    upc: '987654321',
    uom: 'EA',
    warehouseFacilityId: 'WH-001',
    warehouseFacilityName: 'Main Warehouse',
    totalSellable: 500, // High stock - should be healthy
    incomingScheduled: 0,
    totalUnsellable: 0,
    last7Days: 35, // 5 units per day velocity
    last15Days: 75,
    last30Days: 150
  },
  {
    itemId: 'SKU-003',
    itemName: 'Test Product C',
    brandName: 'Test Brand',
    upc: '456789123',
    uom: 'EA',
    warehouseFacilityId: 'WH-002',
    warehouseFacilityName: 'Secondary Warehouse',
    totalSellable: 0, // Out of stock
    incomingScheduled: 0,
    totalUnsellable: 0,
    last7Days: 21, // 3 units per day velocity
    last15Days: 45,
    last30Days: 90
  }
];

describe('Replenishment Planner Tests', () => {
  beforeEach(() => {
    // Clear history before each test
    HistoryService.clearHistoryData();
  });

  it('should generate correct replenishment recommendations', () => {
    const analyses = mockInventoryItems.map(item => AnalyticsService.analyzeStock(item));
    const recommendations = AnalyticsService.generateReplenishmentRecommendations(mockInventoryItems, analyses);

    // Should generate recommendations for understock and out-of-stock items only
    expect(recommendations).toHaveLength(2); // SKU-001 and SKU-003

    // Verify SKU-003 (out of stock) has highest urgency
    const sku003Rec = recommendations.find(r => r.itemId === 'SKU-003');
    expect(sku003Rec).toBeDefined();
    expect(sku003Rec!.urgencyScore).toBeGreaterThan(0);

    // Verify SKU-001 (understock) is included
    const sku001Rec = recommendations.find(r => r.itemId === 'SKU-001');
    expect(sku001Rec).toBeDefined();

    // Verify SKU-002 (healthy stock) is NOT included
    const sku002Rec = recommendations.find(r => r.itemId === 'SKU-002');
    expect(sku002Rec).toBeUndefined();
  });

  it('should calculate reorder quantities correctly', () => {
    const analyses = mockInventoryItems.map(item => AnalyticsService.analyzeStock(item));
    const recommendations = AnalyticsService.generateReplenishmentRecommendations(mockInventoryItems, analyses);

    recommendations.forEach(rec => {
      // Verify calculation: (leadTime * salesVelocity) + safetyStock - currentStock
      const expectedOrder = (rec.leadTime * rec.salesVelocity) + rec.safetyStock - rec.currentStock;
      const expectedOrderCeiled = Math.max(0, Math.ceil(expectedOrder));
      expect(rec.recommendedOrderQuantity).toBe(expectedOrderCeiled);
    });
  });

  it('should save and retrieve inventory snapshots', async () => {
    // Save a snapshot
    await HistoryService.saveInventorySnapshot(mockInventoryItems, 'test-upload.csv');

    // Get snapshots using the correct method
    const snapshots = HistoryService.getInventoryHistory();
    expect(snapshots).toHaveLength(1);

    const snapshot = snapshots[0];
    expect(snapshot.totalSellable).toBe(550); // 50 + 500 + 0
    expect(snapshot.platformMetadata.recordCount).toBe(3);
  });

  it('should generate trend data correctly', async () => {
    // Save a snapshot first
    await HistoryService.saveInventorySnapshot(mockInventoryItems, 'test-upload.csv');

    // Generate trend data
    const trendData = HistoryService.generateInventoryTrendData();
    expect(trendData.labels).toHaveLength(1);
    expect(trendData.datasets).toBeDefined();
  });

  it('should track storage statistics', async () => {
    // Save a snapshot
    await HistoryService.saveInventorySnapshot(mockInventoryItems, 'test-upload.csv');

    // Check storage stats
    const stats = HistoryService.getStorageStats();
    expect(stats.snapshots).toBe(1);
    expect(stats.itemSnapshots).toBeGreaterThan(0);
    expect(stats.sizeKB).toBeGreaterThan(0);
  });
});