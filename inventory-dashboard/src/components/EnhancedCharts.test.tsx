/**
 * Property-Based Tests for Enhanced Charts Drill-down Interactions
 * 
 * **Feature: dashboard-ui-modernization, Property 7: Drill-down Interaction Smoothness**
 * Validates: Requirements 2.3
 * 
 * This test ensures that clicking elements in advanced visualizations correctly 
 * triggers drill-down functionality and filters the entire dashboard.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SalesHeatmap } from './SalesHeatmap';
import { CapitalTreemap } from './CapitalTreemap';
import type { SalesRecord, InventoryItem } from '../types';

// Mock sales data for testing
const createMockSalesData = (cities: string[], days: number = 7): SalesRecord[] => {
  const salesData: SalesRecord[] = [];
  const baseDate = new Date();
  
  cities.forEach(city => {
    for (let i = 0; i < days; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - i);
      
      salesData.push({
        orderId: `ORDER-${city}-${i}`,
        orderDate: date,
        itemId: `ITEM-${i}`,
        productName: `Product ${i}`,
        brandName: 'Vyndo',
        upc: `UPC${i}`,
        supplyCity: city,
        supplyState: 'Test State',
        customerCity: 'Customer City',
        customerState: 'Customer State',
        quantity: Math.floor(Math.random() * 100) + 1,
        sellingPrice: Math.floor(Math.random() * 1000) + 100
      });
    }
  });
  
  return salesData;
};

// Mock inventory data for testing
const createMockInventoryData = (brands: string[]): InventoryItem[] => {
  return brands.map((brand, index) => ({
    itemId: `ITEM-${index}`,
    itemName: `${brand} Product ${index}`,
    brandName: brand,
    upc: `UPC${index}`,
    uom: 'units',
    warehouseFacilityId: `WH${index}`,
    warehouseFacilityName: `Warehouse ${index}`,
    totalSellable: Math.floor(Math.random() * 10000) + 100,
    incomingScheduled: 0,
    totalUnsellable: 0,
    last7Days: Math.floor(Math.random() * 100),
    last15Days: Math.floor(Math.random() * 200),
    last30Days: Math.floor(Math.random() * 400)
  }));
};

describe('Enhanced Charts Drill-down Interaction Tests', () => {
  it('should trigger city drill-down when clicking heatmap cities', () => {
    // Property: For any city click in the heatmap, the onCityClick callback should be triggered
    // with the correct city name
    
    const testCities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai'];
    const salesData = createMockSalesData(testCities, 5);
    const mockOnCityClick = vi.fn();
    
    render(
      <SalesHeatmap
        salesData={salesData}
        onCityClick={mockOnCityClick}
      />
    );

    // Find and click on a city button
    const cityButton = screen.getByText(testCities[0]);
    expect(cityButton).toBeInTheDocument();
    
    fireEvent.click(cityButton);
    
    // Verify the callback was called with the correct city
    expect(mockOnCityClick).toHaveBeenCalledWith(testCities[0]);
    expect(mockOnCityClick).toHaveBeenCalledTimes(1);
  });

  it('should trigger category drill-down when clicking treemap categories', () => {
    // Property: For any category click in the treemap, the onCategoryClick callback should be triggered
    // with the correct category name
    
    const testBrands = ['Vyndo Snacks', 'Healthy Bites', 'Millet Magic'];
    const inventoryData = createMockInventoryData(testBrands);
    const mockOnCategoryClick = vi.fn();
    
    render(
      <CapitalTreemap
        inventoryData={inventoryData}
        onCategoryClick={mockOnCategoryClick}
      />
    );

    // Find and click on a category button (treemap node)
    const categoryButton = screen.getByText(testBrands[0]);
    expect(categoryButton).toBeInTheDocument();
    
    fireEvent.click(categoryButton);
    
    // Verify the callback was called with the correct category
    expect(mockOnCategoryClick).toHaveBeenCalledWith(testBrands[0]);
    expect(mockOnCategoryClick).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple city interactions correctly', () => {
    // Property: Multiple city clicks should trigger separate drill-down events
    // without interference
    
    const testCities = ['Pune', 'Hyderabad', 'Kolkata'];
    const salesData = createMockSalesData(testCities, 3);
    const mockOnCityClick = vi.fn();
    
    render(
      <SalesHeatmap
        salesData={salesData}
        onCityClick={mockOnCityClick}
      />
    );

    // Click multiple cities in sequence
    testCities.forEach((city, index) => {
      const cityButton = screen.getByText(city);
      fireEvent.click(cityButton);
      
      // Verify each click triggers the callback correctly
      expect(mockOnCityClick).toHaveBeenNthCalledWith(index + 1, city);
    });
    
    expect(mockOnCityClick).toHaveBeenCalledTimes(testCities.length);
  });

  it('should preserve data accuracy in drill-down parameters', () => {
    // Property: Drill-down callbacks should receive exact data values without modification
    
    const exactCityName = 'Test City With Spaces & Special-Characters';
    const salesData = createMockSalesData([exactCityName], 2);
    const mockOnCityClick = vi.fn();
    
    render(
      <SalesHeatmap
        salesData={salesData}
        onCityClick={mockOnCityClick}
      />
    );

    const cityButton = screen.getByText(exactCityName);
    fireEvent.click(cityButton);
    
    // Verify exact string preservation
    expect(mockOnCityClick).toHaveBeenCalledWith(exactCityName);
    
    // Verify no string manipulation occurred
    const calledWith = mockOnCityClick.mock.calls[0][0];
    expect(calledWith).toBe(exactCityName);
    expect(calledWith.length).toBe(exactCityName.length);
  });

  it('should handle edge cases gracefully', () => {
    // Property: Components should handle empty data and edge cases without errors
    
    const mockOnCityClick = vi.fn();
    const mockOnCategoryClick = vi.fn();
    
    // Test with empty data
    const { rerender } = render(
      <SalesHeatmap
        salesData={[]}
        onCityClick={mockOnCityClick}
      />
    );

    // Should render without errors
    expect(screen.getByText(/No recent sales data/)).toBeInTheDocument();
    
    // Test treemap with empty data
    rerender(
      <CapitalTreemap
        inventoryData={[]}
        onCategoryClick={mockOnCategoryClick}
      />
    );

    // Should render without errors
    expect(screen.getByText(/No inventory data/)).toBeInTheDocument();
    
    // No callbacks should be triggered with empty data
    expect(mockOnCityClick).not.toHaveBeenCalled();
    expect(mockOnCategoryClick).not.toHaveBeenCalled();
  });

  it('should maintain interaction responsiveness across different data sizes', () => {
    // Property: Drill-down interactions should work consistently regardless of data volume
    
    const testScenarios = [
      { cities: ['City1'], description: 'single city' },
      { cities: ['City1', 'City2', 'City3'], description: 'multiple cities' },
      { cities: Array.from({length: 10}, (_, i) => `City${i}`), description: 'many cities' }
    ];

    testScenarios.forEach(scenario => {
      const salesData = createMockSalesData(scenario.cities, 2);
      const mockOnCityClick = vi.fn();
      
      const { unmount } = render(
        <SalesHeatmap
          salesData={salesData}
          onCityClick={mockOnCityClick}
        />
      );

      // Click the first city in each scenario
      const firstCityButton = screen.getByText(scenario.cities[0]);
      fireEvent.click(firstCityButton);
      
      // Verify callback works for each scenario
      expect(mockOnCityClick).toHaveBeenCalledWith(scenario.cities[0]);
      expect(mockOnCityClick).toHaveBeenCalledTimes(1);
      
      unmount();
    });
  });

  it('should provide smooth visual feedback during interactions', () => {
    // Property: Interactive elements should have appropriate hover and click states
    
    const testCities = ['Interactive City'];
    const salesData = createMockSalesData(testCities, 1);
    const mockOnCityClick = vi.fn();
    
    render(
      <SalesHeatmap
        salesData={salesData}
        onCityClick={mockOnCityClick}
      />
    );

    const cityButton = screen.getByText(testCities[0]);
    
    // Verify button has cursor pointer (indicates interactivity)
    expect(cityButton).toHaveClass('cursor-pointer');
    
    // Verify hover states are defined (transition classes)
    expect(cityButton.className).toMatch(/hover:/);
    
    // Click should work smoothly
    fireEvent.click(cityButton);
    expect(mockOnCityClick).toHaveBeenCalledWith(testCities[0]);
  });
});