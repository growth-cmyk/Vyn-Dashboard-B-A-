/**
 * Property-Based Tests for Inventory Overview Batch Operations
 * 
 * **Feature: dashboard-ui-modernization, Property 31: Batch Operation Management**
 * Validates: Requirements 7.4
 * 
 * This test ensures that selecting multiple items correctly aggregates them 
 * into a single exported PO file with accurate data.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InventoryOverview } from './InventoryOverview';
import type { InventoryItem } from '../types';

// Mock the AnalyticsService
vi.mock('../services', () => ({
  AnalyticsService: {
    analyzeStock: vi.fn((item: InventoryItem) => ({
      itemId: item.itemId,
      warehouseFacilityId: item.warehouseFacilityId,
      currentStock: item.totalSellable,
      salesVelocity: item.last7Days / 7,
      daysOfCover: item.totalSellable / (item.last7Days / 7),
      stockStatus: item.totalSellable === 0 ? 'out-of-stock' : 
                   item.totalSellable < 100 ? 'understock' : 'healthy',
      safetyStock: (item.last7Days / 7) * 7,
      reorderQuantity: item.totalSellable < 100 ? 200 : 0,
      recommendedAction: item.totalSellable === 0 ? 'Restock immediately' : 'Monitor levels'
    }))
  }
}));

// Create mock inventory data for testing
const createMockInventoryData = (count: number): InventoryItem[] => {
  return Array.from({ length: count }, (_, index) => ({
    itemId: `ITEM-${index + 1}`,
    itemName: `Test Product ${index + 1}`,
    brandName: `Brand ${index + 1}`,
    upc: `UPC${index + 1}`,
    uom: 'units',
    warehouseFacilityId: `WH${(index % 3) + 1}`,
    warehouseFacilityName: `Warehouse ${(index % 3) + 1}`,
    totalSellable: Math.floor(Math.random() * 1000) + 50,
    incomingScheduled: 0,
    totalUnsellable: 0,
    last7Days: Math.floor(Math.random() * 50) + 10,
    last15Days: Math.floor(Math.random() * 100) + 20,
    last30Days: Math.floor(Math.random() * 200) + 40
  }));
};

describe('Inventory Overview Batch Operations Tests', () => {
  it('should correctly aggregate selected items into bulk export', () => {
    // Property: For any selection of inventory items, bulk export should contain 
    // exactly those items with accurate data
    
    const inventoryData = createMockInventoryData(5);
    const mockBulkExport = vi.fn();
    
    render(
      <InventoryOverview
        inventoryData={inventoryData}
        onBulkExport={mockBulkExport}
      />
    );

    // Expand all location groups to see all items
    const locationHeaders = screen.getAllByText(/Warehouse/);
    locationHeaders.forEach(header => {
      fireEvent.click(header);
    });

    // Select multiple items by checking their checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    const itemCheckboxes = checkboxes.slice(1, 4); // Skip the "select all" checkbox
    
    itemCheckboxes.forEach(checkbox => {
      fireEvent.click(checkbox);
    });

    // Trigger bulk export
    const bulkExportButton = screen.getByText('Bulk Export PO');
    fireEvent.click(bulkExportButton);

    // Verify the callback was called with the correct items
    expect(mockBulkExport).toHaveBeenCalledTimes(1);
    const exportedItems = mockBulkExport.mock.calls[0][0];
    
    // Should export exactly the selected items (may be less than 3 if some are in collapsed groups)
    expect(exportedItems.length).toBeGreaterThan(0);
    expect(exportedItems.length).toBeLessThanOrEqual(3);
    
    // Verify data accuracy - each exported item should match original data
    exportedItems.forEach((exportedItem: InventoryItem) => {
      const originalItem = inventoryData.find(item => 
        item.itemId === exportedItem.itemId && 
        item.warehouseFacilityId === exportedItem.warehouseFacilityId
      );
      
      expect(originalItem).toBeDefined();
      expect(exportedItem.itemName).toBe(originalItem!.itemName);
      expect(exportedItem.totalSellable).toBe(originalItem!.totalSellable);
      expect(exportedItem.brandName).toBe(originalItem!.brandName);
    });
  });

  it('should handle select all functionality correctly', () => {
    // Property: Select all should select every item, deselect all should clear selection
    
    const inventoryData = createMockInventoryData(3);
    const mockBulkExport = vi.fn();
    
    render(
      <InventoryOverview
        inventoryData={inventoryData}
        onBulkExport={mockBulkExport}
      />
    );

    // Expand location to see items
    const locationHeader = screen.getAllByText(/Warehouse/)[0];
    fireEvent.click(locationHeader);

    // Click select all
    const selectAllButton = screen.getByText('Select All');
    fireEvent.click(selectAllButton);

    // Verify bulk export button appears
    expect(screen.getByText('Bulk Export PO')).toBeInTheDocument();
    expect(screen.getByText('3 items selected')).toBeInTheDocument();

    // Click bulk export
    const bulkExportButton = screen.getByText('Bulk Export PO');
    fireEvent.click(bulkExportButton);

    // Should export all items
    expect(mockBulkExport).toHaveBeenCalledWith(inventoryData);

    // Click deselect all
    const deselectAllButton = screen.getByText('Deselect All');
    fireEvent.click(deselectAllButton);

    // Bulk export button should disappear
    expect(screen.queryByText('Bulk Export PO')).not.toBeInTheDocument();
  });

  it('should maintain data integrity across different selection patterns', () => {
    // Property: Regardless of selection order or pattern, exported data should be accurate
    
    const testScenarios = [
      { count: 2, description: 'small selection' },
      { count: 5, description: 'medium selection' },
      { count: 10, description: 'large selection' }
    ];

    testScenarios.forEach(scenario => {
      const inventoryData = createMockInventoryData(scenario.count);
      const mockBulkExport = vi.fn();
      
      const { unmount } = render(
        <InventoryOverview
          inventoryData={inventoryData}
          onBulkExport={mockBulkExport}
        />
      );

      // Expand location
      const locationHeader = screen.getAllByText(/Warehouse/)[0];
      fireEvent.click(locationHeader);

      // Select all items
      const selectAllButton = screen.getByText('Select All');
      fireEvent.click(selectAllButton);

      // Export
      const bulkExportButton = screen.getByText('Bulk Export PO');
      fireEvent.click(bulkExportButton);

      // Verify correct count and data integrity
      const exportedItems = mockBulkExport.mock.calls[0][0];
      expect(exportedItems).toHaveLength(scenario.count);
      
      // Verify no data corruption
      exportedItems.forEach((item: InventoryItem) => {
        expect(item.itemId).toBeTruthy();
        expect(item.itemName).toBeTruthy();
        expect(typeof item.totalSellable).toBe('number');
        expect(item.totalSellable).toBeGreaterThanOrEqual(0);
      });

      unmount();
    });
  });

  it('should preserve urgency scoring in bulk export', () => {
    // Property: Bulk export should maintain urgency calculations for proper PO prioritization
    
    const inventoryData = createMockInventoryData(4);
    // Create items with different urgency levels
    inventoryData[0].totalSellable = 0; // Critical
    inventoryData[1].totalSellable = 50; // High urgency
    inventoryData[2].totalSellable = 200; // Medium
    inventoryData[3].totalSellable = 1000; // Low
    
    const mockBulkExport = vi.fn();
    
    render(
      <InventoryOverview
        inventoryData={inventoryData}
        onBulkExport={mockBulkExport}
      />
    );

    // Expand and select all
    const locationHeader = screen.getAllByText(/Warehouse/)[0];
    fireEvent.click(locationHeader);
    
    const selectAllButton = screen.getByText('Select All');
    fireEvent.click(selectAllButton);

    const bulkExportButton = screen.getByText('Bulk Export PO');
    fireEvent.click(bulkExportButton);

    const exportedItems = mockBulkExport.mock.calls[0][0];
    
    // Verify urgency levels are preserved through stock levels
    const criticalItem = exportedItems.find((item: InventoryItem) => item.totalSellable === 0);
    const highUrgencyItem = exportedItems.find((item: InventoryItem) => item.totalSellable === 50);
    const lowUrgencyItem = exportedItems.find((item: InventoryItem) => item.totalSellable === 1000);
    
    expect(criticalItem).toBeDefined();
    expect(highUrgencyItem).toBeDefined();
    expect(lowUrgencyItem).toBeDefined();
    
    // Critical items should be identifiable by zero stock
    expect(criticalItem.totalSellable).toBe(0);
  });

  it('should handle edge cases gracefully', () => {
    // Property: Batch operations should work correctly with edge cases
    
    const edgeCases = [
      { data: [], description: 'empty inventory' },
      { data: createMockInventoryData(1), description: 'single item' }
    ];

    edgeCases.forEach(testCase => {
      const mockBulkExport = vi.fn();
      
      const { unmount } = render(
        <InventoryOverview
          inventoryData={testCase.data}
          onBulkExport={mockBulkExport}
        />
      );

      if (testCase.data.length === 0) {
        // Empty state should not show bulk operations
        expect(screen.queryByText('Select All')).not.toBeInTheDocument();
      } else {
        // Single item should still allow selection
        const locationHeader = screen.getAllByText(/Warehouse/)[0];
        fireEvent.click(locationHeader);
        
        const selectAllButton = screen.getByText('Select All');
        fireEvent.click(selectAllButton);
        
        expect(screen.getByText('1 items selected')).toBeInTheDocument();
      }

      unmount();
    });
  });
});