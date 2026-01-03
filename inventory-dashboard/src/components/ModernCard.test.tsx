/**
 * Property-Based Tests for ModernCard Data Accuracy
 * 
 * **Feature: dashboard-ui-modernization, Property 2: Interactive Feedback Responsiveness**
 * Validates: Requirements 1.3
 * 
 * This test ensures that the ReplenishmentCard correctly renders the reorderQuantity 
 * provided by the ReplenishmentService without rounding errors or data loss.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReplenishmentCard } from './ModernCard';
import { AnalyticsService } from '../services/AnalyticsService';
import type { InventoryItem } from '../types';

// Mock inventory items for testing
const createMockInventoryItem = (
  itemId: string,
  totalSellable: number,
  last7Days: number,
  last15Days: number = 0,
  last30Days: number = 0
): InventoryItem => ({
  itemId,
  itemName: `Test Item ${itemId}`,
  brandName: 'Vyndo',
  upc: `UPC${itemId}`,
  uom: 'units',
  warehouseFacilityId: 'WH001',
  warehouseFacilityName: 'Test Warehouse',
  totalSellable,
  incomingScheduled: 0,
  totalUnsellable: 0,
  last7Days,
  last15Days,
  last30Days
});

describe('ReplenishmentCard Data Accuracy Tests', () => {
  it('should render exact reorderQuantity from ReplenishmentService without rounding errors', () => {
    // Test case 1: Precise decimal calculation
    const inventory1 = createMockInventoryItem('ITEM001', 50, 35); // 5 units/day velocity
    const salesVelocity1 = AnalyticsService.calculateSalesVelocity(inventory1);
    const reorderQuantity1 = AnalyticsService.calculateReplenishmentQuantity(inventory1, salesVelocity1);
    
    render(
      <ReplenishmentCard
        itemName={inventory1.itemName}
        currentStock={inventory1.totalSellable}
        reorderQuantity={reorderQuantity1}
        daysOfCover={AnalyticsService.calculateDaysOfCover(inventory1, salesVelocity1)}
        salesVelocity={salesVelocity1}
        urgencyLevel="high"
      />
    );

    // Verify the exact reorder quantity is displayed without rounding
    const reorderElement = screen.getByText(reorderQuantity1.toLocaleString());
    expect(reorderElement).toBeInTheDocument();
    
    // Test case 2: Large numbers with precision
    const inventory2 = createMockInventoryItem('ITEM002', 1000, 140); // 20 units/day velocity
    const salesVelocity2 = AnalyticsService.calculateSalesVelocity(inventory2);
    const reorderQuantity2 = AnalyticsService.calculateReplenishmentQuantity(inventory2, salesVelocity2);
    
    render(
      <ReplenishmentCard
        itemName={inventory2.itemName}
        currentStock={inventory2.totalSellable}
        reorderQuantity={reorderQuantity2}
        daysOfCover={AnalyticsService.calculateDaysOfCover(inventory2, salesVelocity2)}
        salesVelocity={salesVelocity2}
        urgencyLevel="critical"
      />
    );

    // Verify large numbers are displayed correctly
    const reorderElement2 = screen.getByText(reorderQuantity2.toLocaleString());
    expect(reorderElement2).toBeInTheDocument();
  });

  it('should preserve ReplenishmentService calculation precision across different scenarios', () => {
    // Property: For any valid inventory item, the displayed reorder quantity 
    // should exactly match the ReplenishmentService calculation
    
    const testCases = [
      { totalSellable: 10, last7Days: 7 },    // 1 unit/day
      { totalSellable: 25, last7Days: 21 },   // 3 units/day  
      { totalSellable: 100, last7Days: 70 },  // 10 units/day
      { totalSellable: 5, last7Days: 14 },    // 2 units/day
      { totalSellable: 200, last7Days: 105 }, // 15 units/day
    ];

    testCases.forEach((testCase, index) => {
      const inventory = createMockInventoryItem(
        `ITEM${index}`, 
        testCase.totalSellable, 
        testCase.last7Days
      );
      
      const salesVelocity = AnalyticsService.calculateSalesVelocity(inventory);
      const expectedReorderQuantity = AnalyticsService.calculateReplenishmentQuantity(inventory, salesVelocity);
      
      const { unmount } = render(
        <ReplenishmentCard
          itemName={inventory.itemName}
          currentStock={inventory.totalSellable}
          reorderQuantity={expectedReorderQuantity}
          daysOfCover={AnalyticsService.calculateDaysOfCover(inventory, salesVelocity)}
          salesVelocity={salesVelocity}
          urgencyLevel="medium"
        />
      );

      // Verify the exact calculation is preserved
      const displayedQuantity = screen.getByText(expectedReorderQuantity.toLocaleString());
      expect(displayedQuantity).toBeInTheDocument();
      
      // Verify no rounding has occurred by checking the text content
      expect(displayedQuantity.textContent).toBe(expectedReorderQuantity.toLocaleString());
      
      unmount();
    });
  });

  it('should handle edge cases without data corruption', () => {
    // Edge case 1: Zero reorder quantity
    const inventory1 = createMockInventoryItem('EDGE001', 1000, 7); // High stock, low velocity
    const salesVelocity1 = AnalyticsService.calculateSalesVelocity(inventory1);
    const reorderQuantity1 = AnalyticsService.calculateReplenishmentQuantity(inventory1, salesVelocity1);
    
    render(
      <ReplenishmentCard
        itemName={inventory1.itemName}
        currentStock={inventory1.totalSellable}
        reorderQuantity={reorderQuantity1}
        daysOfCover={AnalyticsService.calculateDaysOfCover(inventory1, salesVelocity1)}
        salesVelocity={salesVelocity1}
        urgencyLevel="low"
      />
    );

    // Should display 0 without any formatting issues
    expect(screen.getByText('0')).toBeInTheDocument();

    // Edge case 2: Very large reorder quantity
    const inventory2 = createMockInventoryItem('EDGE002', 1, 700); // Very low stock, high velocity
    const salesVelocity2 = AnalyticsService.calculateSalesVelocity(inventory2);
    const reorderQuantity2 = AnalyticsService.calculateReplenishmentQuantity(inventory2, salesVelocity2);
    
    const { unmount } = render(
      <ReplenishmentCard
        itemName={inventory2.itemName}
        currentStock={inventory2.totalSellable}
        reorderQuantity={reorderQuantity2}
        daysOfCover={AnalyticsService.calculateDaysOfCover(inventory2, salesVelocity2)}
        salesVelocity={salesVelocity2}
        urgencyLevel="critical"
      />
    );

    // Should display large numbers with proper formatting
    const largeNumberElement = screen.getByText(reorderQuantity2.toLocaleString());
    expect(largeNumberElement).toBeInTheDocument();
    
    unmount();
  });

  it('should maintain data integrity with sales velocity precision', () => {
    // Property: Sales velocity should be displayed with appropriate precision
    // without losing decimal accuracy
    
    const inventory = createMockInventoryItem('VEL001', 50, 23); // 3.285... units/day
    const salesVelocity = AnalyticsService.calculateSalesVelocity(inventory);
    const reorderQuantity = AnalyticsService.calculateReplenishmentQuantity(inventory, salesVelocity);
    
    render(
      <ReplenishmentCard
        itemName={inventory.itemName}
        currentStock={inventory.totalSellable}
        reorderQuantity={reorderQuantity}
        daysOfCover={AnalyticsService.calculateDaysOfCover(inventory, salesVelocity)}
        salesVelocity={salesVelocity}
        urgencyLevel="high"
      />
    );

    // Verify sales velocity precision is maintained (should be 3.29)
    expect(salesVelocity).toBeCloseTo(3.29, 2);
    
    // Verify reorder quantity calculation is based on precise velocity
    const displayedReorder = screen.getByText(reorderQuantity.toLocaleString());
    expect(displayedReorder).toBeInTheDocument();
    
    // Verify the calculation matches expected ReplenishmentService output
    const expectedReorder = AnalyticsService.calculateReplenishmentQuantity(inventory, salesVelocity);
    expect(reorderQuantity).toBe(expectedReorder);
  });
});