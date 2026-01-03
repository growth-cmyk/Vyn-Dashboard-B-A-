import { describe, it, expect } from 'vitest';
import { AnalyticsService } from './AnalyticsService';
import type { SalesRecord } from '../types';

describe('AnalyticsService - Top SKU City Trends', () => {
  const mockSalesData: SalesRecord[] = [
    {
      orderId: 'order1',
      orderDate: new Date('2024-01-01'),
      itemId: 'item1',
      productName: 'Product A',
      brandName: 'Brand X',
      upc: '123456789',
      supplyCity: 'Mumbai',
      supplyState: 'Maharashtra',
      customerCity: 'Mumbai',
      customerState: 'Maharashtra',
      quantity: 10,
      sellingPrice: 100
    },
    {
      orderId: 'order2',
      orderDate: new Date('2024-01-01'),
      itemId: 'item1',
      productName: 'Product A',
      brandName: 'Brand X',
      upc: '123456789',
      supplyCity: 'Delhi',
      supplyState: 'Delhi',
      customerCity: 'Delhi',
      customerState: 'Delhi',
      quantity: 5,
      sellingPrice: 100
    },
    {
      orderId: 'order3',
      orderDate: new Date('2024-01-02'),
      itemId: 'item2',
      productName: 'Product B',
      brandName: 'Brand Y',
      upc: '987654321',
      supplyCity: 'Mumbai',
      supplyState: 'Maharashtra',
      customerCity: 'Mumbai',
      customerState: 'Maharashtra',
      quantity: 8,
      sellingPrice: 150
    }
  ];

  it('should identify top SKUs by revenue', () => {
    const result = AnalyticsService.getTopSkuCityTrends(mockSalesData);
    
    expect(result.topSkus).toHaveLength(2);
    expect(result.topSkus[0].itemId).toBe('item1'); // Higher total revenue (1500)
    expect(result.topSkus[0].totalRevenue).toBe(1500);
    expect(result.topSkus[1].itemId).toBe('item2'); // Lower total revenue (1200)
    expect(result.topSkus[1].totalRevenue).toBe(1200);
  });

  it('should generate city trends for each SKU', () => {
    const result = AnalyticsService.getTopSkuCityTrends(mockSalesData);
    
    // Check that city trends exist for both SKUs
    expect(result.cityTrends.has('item1')).toBe(true);
    expect(result.cityTrends.has('item2')).toBe(true);
    
    // Check city trends for item1
    const item1Trends = result.cityTrends.get('item1')!;
    expect(item1Trends.has('Mumbai')).toBe(true);
    expect(item1Trends.has('Delhi')).toBe(true);
    
    // Check Mumbai trends for item1
    const mumbaiTrends = item1Trends.get('Mumbai')!;
    expect(mumbaiTrends).toHaveLength(1);
    expect(mumbaiTrends[0].date).toBe('2024-01-01');
    expect(mumbaiTrends[0].revenue).toBe(1000);
  });

  it('should handle empty sales data', () => {
    const result = AnalyticsService.getTopSkuCityTrends([]);
    
    expect(result.topSkus).toHaveLength(0);
    expect(result.cityTrends.size).toBe(0);
  });

  it('should limit to top 10 SKUs', () => {
    // Create 15 different SKUs
    const largeSalesData: SalesRecord[] = Array.from({ length: 15 }, (_, i) => ({
      orderId: `order${i}`,
      orderDate: new Date('2024-01-01'),
      itemId: `item${i}`,
      productName: `Product ${i}`,
      brandName: 'Brand',
      upc: `${i}`.padStart(9, '0'),
      supplyCity: 'Mumbai',
      supplyState: 'Maharashtra',
      customerCity: 'Mumbai',
      customerState: 'Maharashtra',
      quantity: 1,
      sellingPrice: 100 + i // Different revenues
    }));

    const result = AnalyticsService.getTopSkuCityTrends(largeSalesData);
    
    expect(result.topSkus).toHaveLength(10);
    // Should be sorted by revenue (descending)
    expect(result.topSkus[0].totalRevenue).toBeGreaterThan(result.topSkus[1].totalRevenue);
  });
});