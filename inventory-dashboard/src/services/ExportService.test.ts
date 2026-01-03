import { describe, it, expect } from 'vitest';
import { ExportService } from './ExportService';
import type { InventoryItem, SalesRecord, FilterCriteria } from '../types';

// Mock data for testing
const mockInventoryData: InventoryItem[] = [
  {
    itemId: 'TEST001',
    itemName: 'Test Product 1',
    brandName: 'Test Brand',
    upc: '123456789',
    uom: 'EA',
    warehouseFacilityId: 'WH001',
    warehouseFacilityName: 'Test Warehouse',
    totalSellable: 100,
    incomingScheduled: 50,
    totalUnsellable: 5,
    last7Days: 10,
    last15Days: 25,
    last30Days: 45
  },
  {
    itemId: 'TEST002',
    itemName: 'Test Product 2',
    brandName: 'Test Brand',
    upc: '987654321',
    uom: 'EA',
    warehouseFacilityId: 'WH002',
    warehouseFacilityName: 'Test Warehouse 2',
    totalSellable: 0,
    incomingScheduled: 20,
    totalUnsellable: 2,
    last7Days: 5,
    last15Days: 12,
    last30Days: 20
  }
];

const mockSalesData: SalesRecord[] = [
  {
    orderId: 'ORD001',
    orderDate: new Date('2024-01-15'),
    itemId: 'TEST001',
    productName: 'Test Product 1',
    brandName: 'Test Brand',
    upc: '123456789',
    supplyCity: 'Test City',
    supplyState: 'Test State',
    customerCity: 'Customer City',
    customerState: 'Customer State',
    quantity: 2,
    sellingPrice: 10.50
  },
  {
    orderId: 'ORD002',
    orderDate: new Date('2024-01-16'),
    itemId: 'TEST002',
    productName: 'Test Product 2',
    brandName: 'Test Brand',
    upc: '987654321',
    supplyCity: 'Test City',
    supplyState: 'Test State',
    customerCity: 'Customer City 2',
    customerState: 'Customer State 2',
    quantity: 1,
    sellingPrice: 25.00
  }
];

const mockFilters: FilterCriteria = {
  locations: ['WH001'],
  searchTerm: 'Test'
};

describe('ExportService', () => {
  describe('exportInventoryToCSV', () => {
    it('should export inventory data to CSV format', () => {
      const csvContent = ExportService.exportInventoryToCSV(mockInventoryData);
      
      expect(csvContent).toContain('Item ID,Item Name,Brand Name');
      expect(csvContent).toContain('TEST001,Test Product 1,Test Brand');
      expect(csvContent).toContain('TEST002,Test Product 2,Test Brand');
      expect(csvContent).toContain('100'); // totalSellable for first item
      expect(csvContent).toContain('0'); // totalSellable for second item (out of stock)
    });

    it('should include headers by default', () => {
      const csvContent = ExportService.exportInventoryToCSV(mockInventoryData);
      
      expect(csvContent).toMatch(/^Item ID,Item Name,Brand Name/);
    });

    it('should exclude headers when specified', () => {
      const csvContent = ExportService.exportInventoryToCSV(mockInventoryData, {
        format: 'csv',
        includeHeaders: false
      });
      
      expect(csvContent).not.toMatch(/^Item ID,Item Name,Brand Name/);
      expect(csvContent).toContain('TEST001,Test Product 1,Test Brand');
    });
  });

  describe('exportSalesToCSV', () => {
    it('should export sales data to CSV format', () => {
      const csvContent = ExportService.exportSalesToCSV(mockSalesData);
      
      expect(csvContent).toContain('Order ID,Order Date,Item ID');
      expect(csvContent).toContain('ORD001,2024-01-15,TEST001');
      expect(csvContent).toContain('ORD002,2024-01-16,TEST002');
      expect(csvContent).toContain('21'); // 2 * 10.50 = 21 (total revenue for first order)
      expect(csvContent).toContain('25'); // 1 * 25.00 = 25 (total revenue for second order)
    });

    it('should format dates correctly', () => {
      const csvContent = ExportService.exportSalesToCSV(mockSalesData);
      
      expect(csvContent).toContain('2024-01-15');
      expect(csvContent).toContain('2024-01-16');
    });
  });

  describe('exportStockAnalysisToCSV', () => {
    it('should export stock analysis data to CSV format', () => {
      const csvContent = ExportService.exportStockAnalysisToCSV(mockInventoryData);
      
      expect(csvContent).toContain('Item ID,Item Name,Warehouse Facility ID');
      expect(csvContent).toContain('Days of Cover,Stock Status,Recommended Action');
      expect(csvContent).toContain('TEST001,Test Product 1,WH001');
      expect(csvContent).toContain('TEST002,Test Product 2,WH002');
    });

    it('should classify stock status correctly', () => {
      const csvContent = ExportService.exportStockAnalysisToCSV(mockInventoryData);
      
      // TEST002 has 0 sellable inventory, should be out-of-stock
      expect(csvContent).toContain('out-of-stock');
      expect(csvContent).toContain('URGENT: Restock immediately');
    });
  });

  describe('exportToExcel', () => {
    it('should generate Excel workbook as ArrayBuffer', () => {
      const excelBuffer = ExportService.exportToExcel(
        mockInventoryData,
        mockSalesData,
        mockFilters
      );
      
      expect(excelBuffer).toBeInstanceOf(ArrayBuffer);
      expect(excelBuffer.byteLength).toBeGreaterThan(0);
    });

    it('should handle empty data gracefully', () => {
      const excelBuffer = ExportService.exportToExcel([], [], {});
      
      expect(excelBuffer).toBeInstanceOf(ArrayBuffer);
      expect(excelBuffer.byteLength).toBeGreaterThan(0);
    });
  });

  describe('generateReport', () => {
    it('should generate comprehensive report in Excel format', () => {
      const report = ExportService.generateReport(
        mockInventoryData,
        mockSalesData,
        mockFilters,
        'xlsx'
      );
      
      expect(report).toBeInstanceOf(ArrayBuffer);
      expect((report as ArrayBuffer).byteLength).toBeGreaterThan(0);
    });

    it('should generate comprehensive report in CSV format', () => {
      const report = ExportService.generateReport(
        mockInventoryData,
        mockSalesData,
        mockFilters,
        'csv'
      );
      
      expect(typeof report).toBe('string');
      expect(report as string).toContain('=== EXPORT SUMMARY ===');
      expect(report as string).toContain('=== INVENTORY DATA ===');
      expect(report as string).toContain('=== SALES DATA ===');
      expect(report as string).toContain('=== STOCK ANALYSIS ===');
    });
  });

  describe('generateFilename', () => {
    it('should generate filename with timestamp', () => {
      const filename = ExportService.generateFilename('test_export', 'csv', {});
      
      expect(filename).toMatch(/^test_export_\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('should include filter indicators in filename', () => {
      const filters: FilterCriteria = {
        locations: ['WH001', 'WH002'],
        skus: ['TEST001'],
        timePeriod: 'last-30-days'
      };
      
      const filename = ExportService.generateFilename('test_export', 'xlsx', filters);
      
      expect(filename).toContain('_loc-2');
      expect(filename).toContain('_sku-1');
      expect(filename).toContain('_last-30-days');
      expect(filename.endsWith('.xlsx')).toBe(true);
    });
  });
});