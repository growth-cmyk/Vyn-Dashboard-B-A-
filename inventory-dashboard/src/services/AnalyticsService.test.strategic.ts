import { AnalyticsService } from './AnalyticsService';
import type { InventoryItem } from '../types';

// Test data for verification
const mockInventoryItem: InventoryItem = {
  itemId: 'TEST-001',
  itemName: 'Test Product',
  brandName: 'Test Brand',
  upc: '123456789',
  uom: 'EA',
  warehouseFacilityId: 'WH-001',
  warehouseFacilityName: 'Test Warehouse',
  totalSellable: 100,
  incomingScheduled: 0,
  totalUnsellable: 0,
  last7Days: 70, // 10 units per day velocity
  last15Days: 150,
  last30Days: 300
};

// Test Strategic Roadmap Stock Classification
console.log('=== Strategic Roadmap Stock Classification Tests ===');

// Test case 1: Item with 120 days of cover should be 'Expiry Risk'
const highStockItem = { ...mockInventoryItem, totalSellable: 1200 }; // 1200 units / 10 per day = 120 days
const highStockAnalysis = AnalyticsService.analyzeStock(highStockItem);
console.log(`Test 1 - High Stock (120 days):`, {
  daysOfCover: highStockAnalysis.daysOfCover,
  status: highStockAnalysis.stockStatus,
  action: highStockAnalysis.recommendedAction,
  expected: 'expiry-risk'
});

// Test case 2: Item with 10 days of cover should be 'Understock' (now <18 days)
const lowStockItem = { ...mockInventoryItem, totalSellable: 100 }; // 100 units / 10 per day = 10 days
const lowStockAnalysis = AnalyticsService.analyzeStock(lowStockItem);
console.log(`Test 2 - Low Stock (10 days):`, {
  daysOfCover: lowStockAnalysis.daysOfCover,
  status: lowStockAnalysis.stockStatus,
  action: lowStockAnalysis.recommendedAction,
  reorderQuantity: lowStockAnalysis.reorderQuantity,
  expected: 'understock (updated threshold: <18 days)'
});

// Test case 3: Item with 30 days of cover should be 'Healthy' (18-45 days)
const healthyStockItem = { ...mockInventoryItem, totalSellable: 300 }; // 300 units / 10 per day = 30 days
const healthyStockAnalysis = AnalyticsService.analyzeStock(healthyStockItem);
console.log(`Test 3 - Healthy Stock (30 days):`, {
  daysOfCover: healthyStockAnalysis.daysOfCover,
  status: healthyStockAnalysis.stockStatus,
  action: healthyStockAnalysis.recommendedAction,
  expected: 'healthy (18-45 days range)'
});

// Test case 4: Item with 60 days of cover should be 'Overstock'
const overstockItem = { ...mockInventoryItem, totalSellable: 600 }; // 600 units / 10 per day = 60 days
const overstockAnalysis = AnalyticsService.analyzeStock(overstockItem);
console.log(`Test 4 - Overstock (60 days):`, {
  daysOfCover: overstockAnalysis.daysOfCover,
  status: overstockAnalysis.stockStatus,
  action: overstockAnalysis.recommendedAction,
  expected: 'overstock'
});

// Test Replenishment Calculator
console.log('\n=== Replenishment Calculator Tests ===');

const replenishmentQuantity = AnalyticsService.calculateReplenishmentQuantity(
  lowStockItem, // 100 units current stock
  10, // 10 units per day velocity
  15, // 15 days lead time (updated for Vyndo supply chain)
  3 // 3 days safety stock
);

console.log(`Replenishment Calculation:`, {
  currentStock: lowStockItem.totalSellable,
  salesVelocity: 10,
  leadTime: 15, // Updated
  safetyDays: 3,
  formula: '(15 * 10) + (3 * 10) - 100',
  calculation: '150 + 30 - 100 = 80',
  result: replenishmentQuantity,
  expected: 80 // Now needs more stock due to longer lead time
});

// Test with very low stock
const veryLowStockItem = { ...mockInventoryItem, totalSellable: 20 }; // 20 units
const veryLowReplenishment = AnalyticsService.calculateReplenishmentQuantity(
  veryLowStockItem,
  10, // 10 units per day
  15, // 15 days lead time (updated)
  3 // 3 days safety stock
);

console.log(`Very Low Stock Replenishment:`, {
  currentStock: veryLowStockItem.totalSellable,
  salesVelocity: 10,
  formula: '(15 * 10) + (3 * 10) - 20',
  calculation: '150 + 30 - 20 = 160',
  result: veryLowReplenishment,
  expected: 160 // Much higher due to 15-day lead time
});

console.log('\n=== Verification Complete ===');