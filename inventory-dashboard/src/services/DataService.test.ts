import { describe, it, expect } from 'vitest';
import { DataService } from './DataService';

/**
 * Property-Based Tests for Reliable Inventory History Management
 * Feature: reliable-inventory-history
 */

describe('DataService Property Tests', () => {
  /**
   * Property 1: Date Column Detection and Parsing
   * Feature: reliable-inventory-history, Property 1: Date Column Detection and Parsing
   * Validates: Requirements 1.1, 1.2, 1.5
   */
  describe('Property 1: Date Column Detection and Parsing', () => {
    it('should detect date columns regardless of naming convention', () => {
      // Test various date column names
      const dateColumnVariations = [
        'Upload Date',
        'Date',
        'Timestamp',
        'Created Date',
        'Entry Date',
        'Record Date',
        'Data Date',
        'upload date', // lowercase
        'UPLOAD DATE', // uppercase
        'Upload_Date', // underscore
        'Upload-Date'  // hyphen
      ];

      dateColumnVariations.forEach(columnName => {
        const csvData = [
          { [columnName]: '2024-01-01', 'Item ID': 'TEST001', 'Stock': '100' },
          { [columnName]: '2024-01-02', 'Item ID': 'TEST002', 'Stock': '200' },
          { [columnName]: '2024-01-03', 'Item ID': 'TEST003', 'Stock': '300' }
        ];

        const result = DataService.detectUploadDateColumn(csvData);
        expect(result).toBe(columnName);
      });
    });

    it('should parse various date formats correctly', () => {
      const dateFormats = [
        { format: 'DD-MM-YYYY', dates: ['01-01-2024', '15-06-2024', '31-12-2024'] },
        { format: 'MM/DD/YYYY', dates: ['01/01/2024', '06/15/2024', '12/31/2024'] },
        { format: 'YYYY-MM-DD', dates: ['2024-01-01', '2024-06-15', '2024-12-31'] }
      ];

      dateFormats.forEach(({ dates }) => {
        const csvData = dates.map((date, index) => ({
          'Upload Date': date,
          'Item ID': `TEST${index + 1}`,
          'Stock': `${(index + 1) * 100}`
        }));

        const result = DataService.detectUploadDateColumn(csvData);
        expect(result).toBe('Upload Date');

        const history = DataService.parseFileBasedHistory(csvData);
        expect(history).not.toBeNull();
        expect(history!.uploadDates).toHaveLength(dates.length);
      });
    });

    it('should provide clear error messages for invalid date formats', () => {
      // Mix valid and invalid dates - ensure >60% are valid so column is detected
      const csvDataWithInvalidDates = [
        { 'Upload Date': '2024-01-01', 'Item ID': 'TEST001', 'Stock': '100' }, // Valid
        { 'Upload Date': '2024-01-02', 'Item ID': 'TEST002', 'Stock': '200' }, // Valid
        { 'Upload Date': '2024-01-03', 'Item ID': 'TEST003', 'Stock': '300' }, // Valid
        { 'Upload Date': 'completely-invalid', 'Item ID': 'TEST004', 'Stock': '400' }, // Invalid
        { 'Upload Date': 'not-a-date-at-all', 'Item ID': 'TEST005', 'Stock': '500' }  // Invalid
      ];

      // Mock console.warn to capture warnings
      const originalWarn = console.warn;
      const warnings: string[] = [];
      console.warn = (...args: any[]) => {
        warnings.push(args.join(' '));
      };

      const result = DataService.parseFileBasedHistory(csvDataWithInvalidDates);
      
      // Restore console.warn
      console.warn = originalWarn;

      // Should still return a result because majority of dates are valid
      expect(result).not.toBeNull();
      expect(result!.totalDaysOfHistory).toBe(3); // Only 3 valid dates
      
      // Should have logged warnings about invalid dates
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some(w => w.includes('Date parsing warnings'))).toBe(true);
    });
  });

  /**
   * Property 2: Cumulative History Classification
   * Feature: reliable-inventory-history, Property 2: Cumulative History Classification
   * Validates: Requirements 1.3, 1.4
   */
  describe('Property 2: Cumulative History Classification', () => {
    it('should classify files with multiple unique dates as cumulative history', () => {
      const multiDateCsvData = [
        { 'Upload Date': '2024-01-01', 'Item ID': 'TEST001', 'Stock': '100' },
        { 'Upload Date': '2024-01-02', 'Item ID': 'TEST001', 'Stock': '110' },
        { 'Upload Date': '2024-01-03', 'Item ID': 'TEST001', 'Stock': '120' },
        { 'Upload Date': '2024-01-04', 'Item ID': 'TEST002', 'Stock': '200' }
      ];

      const result = DataService.parseFileBasedHistory(multiDateCsvData);
      
      expect(result).not.toBeNull();
      expect(result!.totalDaysOfHistory).toBe(4);
      expect(result!.uploadDates).toHaveLength(4);
      expect(result!.dataByDate.size).toBe(4);
    });

    it('should fall back to timestamp-based processing when no date column exists', () => {
      const noDatesData = [
        { 'Item ID': 'TEST001', 'Stock': '100', 'Location': 'WH001' },
        { 'Item ID': 'TEST002', 'Stock': '200', 'Location': 'WH002' },
        { 'Item ID': 'TEST003', 'Stock': '300', 'Location': 'WH003' }
      ];

      const dateColumn = DataService.detectUploadDateColumn(noDatesData);
      expect(dateColumn).toBeNull();

      const history = DataService.parseFileBasedHistory(noDatesData);
      expect(history).toBeNull();
    });

    it('should handle single date files correctly', () => {
      const singleDateData = [
        { 'Upload Date': '2024-01-01', 'Item ID': 'TEST001', 'Stock': '100' },
        { 'Upload Date': '2024-01-01', 'Item ID': 'TEST002', 'Stock': '200' },
        { 'Upload Date': '2024-01-01', 'Item ID': 'TEST003', 'Stock': '300' }
      ];

      const result = DataService.parseFileBasedHistory(singleDateData);
      
      expect(result).not.toBeNull();
      expect(result!.totalDaysOfHistory).toBe(1); // Only 1 unique date
      expect(result!.uploadDates).toHaveLength(1);
      expect(result!.dataByDate.size).toBe(1);
      
      // All items should be grouped under the single date
      const dateKeys = Array.from(result!.dataByDate.keys());
      expect(dateKeys).toHaveLength(1);
      const singleDateData_result = result!.dataByDate.get(dateKeys[0]);
      expect(singleDateData_result).toHaveLength(3);
    });
  });

  /**
   * Property 3: Date Processing and Aggregation
   * Feature: reliable-inventory-history, Property 3: Date Processing and Aggregation
   * Validates: Requirements 2.1, 2.4, 2.5
   */
  describe('Property 3: Date Processing and Aggregation', () => {
    it('should extract unique dates and sort chronologically', () => {
      // Unsorted dates in CSV
      const unsortedData = [
        { 'Upload Date': '2024-01-03', 'Item ID': 'TEST001', 'Stock': '100' },
        { 'Upload Date': '2024-01-01', 'Item ID': 'TEST002', 'Stock': '200' },
        { 'Upload Date': '2024-01-05', 'Item ID': 'TEST003', 'Stock': '300' },
        { 'Upload Date': '2024-01-02', 'Item ID': 'TEST004', 'Stock': '400' },
        { 'Upload Date': '2024-01-04', 'Item ID': 'TEST005', 'Stock': '500' }
      ];

      const result = DataService.parseFileBasedHistory(unsortedData);
      
      expect(result).not.toBeNull();
      expect(result!.uploadDates).toHaveLength(5);
      
      // Verify chronological sorting - check that dates are in ascending order
      const sortedDates = result!.uploadDates.map(d => d.toISOString().split('T')[0]);
      
      // Just verify they are sorted, don't hardcode specific dates due to timezone issues
      for (let i = 1; i < sortedDates.length; i++) {
        expect(new Date(sortedDates[i]).getTime()).toBeGreaterThanOrEqual(new Date(sortedDates[i-1]).getTime());
      }
      
      // Verify we have the expected number of unique dates
      expect(result!.totalDaysOfHistory).toBe(5);
    });

    it('should handle duplicate dates by grouping items appropriately', () => {
      const duplicateDatesData = [
        { 'Upload Date': '2024-01-01', 'Item ID': 'TEST001', 'Stock': '100' },
        { 'Upload Date': '2024-01-01', 'Item ID': 'TEST002', 'Stock': '200' },
        { 'Upload Date': '2024-01-02', 'Item ID': 'TEST003', 'Stock': '300' },
        { 'Upload Date': '2024-01-02', 'Item ID': 'TEST004', 'Stock': '400' },
        { 'Upload Date': '2024-01-02', 'Item ID': 'TEST005', 'Stock': '500' }
      ];

      const result = DataService.parseFileBasedHistory(duplicateDatesData);
      
      expect(result).not.toBeNull();
      expect(result!.totalDaysOfHistory).toBe(2); // Only 2 unique dates
      expect(result!.uploadDates).toHaveLength(2);
      expect(result!.dataByDate.size).toBe(2);
      
      // Check grouping - get the actual date keys from the map
      const dateKeys = Array.from(result!.dataByDate.keys());
      expect(dateKeys).toHaveLength(2);
      
      // Find the data for each date (handle potential timezone issues)
      const firstDateData = result!.dataByDate.get(dateKeys[0]);
      const secondDateData = result!.dataByDate.get(dateKeys[1]);
      
      // One date should have 2 items, the other should have 3 items
      const itemCounts = [firstDateData?.length || 0, secondDateData?.length || 0].sort();
      expect(itemCounts).toEqual([2, 3]);
    });

    it('should skip empty date cells gracefully', () => {
      const dataWithEmptyDates = [
        { 'Upload Date': '2024-01-01', 'Item ID': 'TEST001', 'Stock': '100' },
        { 'Upload Date': '', 'Item ID': 'TEST002', 'Stock': '200' }, // Empty date
        { 'Upload Date': '2024-01-02', 'Item ID': 'TEST003', 'Stock': '300' },
        { 'Upload Date': null, 'Item ID': 'TEST004', 'Stock': '400' }, // Null date
        { 'Upload Date': '2024-01-03', 'Item ID': 'TEST005', 'Stock': '500' }
      ];

      const result = DataService.parseFileBasedHistory(dataWithEmptyDates);
      
      expect(result).not.toBeNull();
      expect(result!.totalDaysOfHistory).toBe(3); // Only valid dates counted
      expect(result!.uploadDates).toHaveLength(3);
      expect(result!.dataByDate.size).toBe(3);
      
      // Verify only valid date entries are included - check each date key exists
      const dateKeys = Array.from(result!.dataByDate.keys());
      expect(dateKeys).toHaveLength(3);
      
      // Each date should have exactly 1 item
      dateKeys.forEach(dateKey => {
        const dateData = result!.dataByDate.get(dateKey);
        expect(dateData).toHaveLength(1);
      });
    });
  });

  /**
   * Integration test for loadMasterInventoryDataWithHistory
   * Validates that the enhanced loader returns latest date slice for current operations
   */
  describe('Enhanced Loader Integration', () => {
    it('should return latest date slice as main items array for current operations', async () => {
      // Create a mock file with cumulative history
      const csvContent = `Upload Date,Item ID,Location,Total Sellable
2024-01-01,TEST001,WH001,100
2024-01-01,TEST002,WH001,200
2024-01-02,TEST001,WH001,110
2024-01-02,TEST002,WH001,210
2024-01-03,TEST001,WH001,120
2024-01-03,TEST002,WH001,220`;

      const mockFile = new File([csvContent], 'test-inventory.csv', { type: 'text/csv' });
      
      // Mock the parseCSVFile method to return our test data
      const originalParseCSVFile = (DataService as any).parseCSVFile;
      (DataService as any).parseCSVFile = async () => [
        { 'Upload Date': '2024-01-01', 'Item ID': 'TEST001', 'Location': 'WH001', 'Total Sellable': '100' },
        { 'Upload Date': '2024-01-01', 'Item ID': 'TEST002', 'Location': 'WH001', 'Total Sellable': '200' },
        { 'Upload Date': '2024-01-02', 'Item ID': 'TEST001', 'Location': 'WH001', 'Total Sellable': '110' },
        { 'Upload Date': '2024-01-02', 'Item ID': 'TEST002', 'Location': 'WH001', 'Total Sellable': '210' },
        { 'Upload Date': '2024-01-03', 'Item ID': 'TEST001', 'Location': 'WH001', 'Total Sellable': '120' },
        { 'Upload Date': '2024-01-03', 'Item ID': 'TEST002', 'Location': 'WH001', 'Total Sellable': '220' }
      ];

      try {
        const result = await DataService.loadMasterInventoryDataWithHistory(mockFile);
        
        // Should detect as history file
        expect(result.isHistoryFile).toBe(true);
        expect(result.cumulativeHistory).not.toBeNull();
        expect(result.cumulativeHistory!.totalDaysOfHistory).toBe(3);
        
        // Main items array should contain only latest date (2024-01-03) data
        expect(result.items).toHaveLength(2);
        expect(result.items[0].totalSellable).toBe(120); // Latest value for TEST001
        expect(result.items[1].totalSellable).toBe(220); // Latest value for TEST002
        
        // Items should have uploadDate set to latest date
        expect(result.items[0].uploadDate).toEqual(result.cumulativeHistory!.latestDate);
        expect(result.items[1].uploadDate).toEqual(result.cumulativeHistory!.latestDate);
        
        // Verify business logic preservation - 15-day lead time should apply to current data
        // This ensures ReplenishmentPlanner gets current stock levels, not historical sums
        expect(result.items[0].totalSellable).toBe(120); // Current stock, not 100+110+120=330
        expect(result.items[1].totalSellable).toBe(220); // Current stock, not 200+210+220=630
        
      } finally {
        // Restore original method
        (DataService as any).parseCSVFile = originalParseCSVFile;
      }
    });

    it('should maintain backward compatibility for files without date columns', async () => {
      const csvContent = `Item ID,Location,Total Sellable
TEST001,WH001,100
TEST002,WH001,200`;

      const mockFile = new File([csvContent], 'test-inventory.csv', { type: 'text/csv' });
      
      // Mock the parseCSVFile method
      const originalParseCSVFile = (DataService as any).parseCSVFile;
      (DataService as any).parseCSVFile = async () => [
        { 'Item ID': 'TEST001', 'Location': 'WH001', 'Total Sellable': '100' },
        { 'Item ID': 'TEST002', 'Location': 'WH001', 'Total Sellable': '200' }
      ];

      try {
        const result = await DataService.loadMasterInventoryDataWithHistory(mockFile);
        
        // Should NOT detect as history file
        expect(result.isHistoryFile).toBe(false);
        expect(result.cumulativeHistory).toBeNull();
        
        // Should return all data as current
        expect(result.items).toHaveLength(2);
        expect(result.items[0].totalSellable).toBe(100);
        expect(result.items[1].totalSellable).toBe(200);
        
        // Items should not have uploadDate for non-history files
        expect(result.items[0].uploadDate).toBeUndefined();
        expect(result.items[1].uploadDate).toBeUndefined();
        
      } finally {
        // Restore original method
        (DataService as any).parseCSVFile = originalParseCSVFile;
      }
    });
  });
});