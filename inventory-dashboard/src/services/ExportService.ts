import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type {
  InventoryItem,
  SalesRecord,
  FilterCriteria
} from '../types';
import { AnalyticsService } from './AnalyticsService';
import { FilterService } from './FilterService';

/**
 * Export formats supported by the service
 */
export type ExportFormat = 'csv' | 'xlsx';

/**
 * Export options for customizing output
 */
export interface ExportOptions {
  format: ExportFormat;
  includeHeaders: boolean;
  filename?: string;
  sheets?: {
    inventory?: boolean;
    sales?: boolean;
    analytics?: boolean;
    summary?: boolean;
  };
}

/**
 * Summary data for export reports
 */
export interface ExportSummary {
  totalItems: number;
  totalLocations: number;
  totalSalesRecords: number;
  totalRevenue: number;
  outOfStockItems: number;
  understockItems: number;
  overstockItems: number;
  exportDate: string;
  filterSummary: string;
}

/**
 * Service for exporting filtered data to various formats
 */
export class ExportService {
  /**
   * Export filtered inventory data to CSV format
   * @param inventoryData Filtered inventory data
   * @param options Export options
   * @returns CSV content as string
   */
  static exportInventoryToCSV(
    inventoryData: InventoryItem[],
    options: Partial<ExportOptions> = {}
  ): string {
    const headers = [
      'Item ID',
      'Item Name',
      'Brand Name',
      'UPC',
      'UOM',
      'Warehouse Facility ID',
      'Warehouse Facility Name',
      'Total Sellable',
      'Incoming Scheduled',
      'Total Unsellable',
      'Last 7 Days Sales',
      'Last 15 Days Sales',
      'Last 30 Days Sales'
    ];

    const rows = inventoryData.map(item => [
      item.itemId,
      item.itemName,
      item.brandName,
      item.upc,
      item.uom,
      item.warehouseFacilityId,
      item.warehouseFacilityName,
      item.totalSellable,
      item.incomingScheduled,
      item.totalUnsellable,
      item.last7Days,
      item.last15Days,
      item.last30Days
    ]);

    const csvData = options.includeHeaders !== false ? [headers, ...rows] : rows;
    
    return Papa.unparse(csvData, {
      header: false,
      skipEmptyLines: true
    });
  }

  /**
   * Export filtered sales data to CSV format
   * @param salesData Filtered sales data
   * @param options Export options
   * @returns CSV content as string
   */
  static exportSalesToCSV(
    salesData: SalesRecord[],
    options: Partial<ExportOptions> = {}
  ): string {
    const headers = [
      'Order ID',
      'Order Date',
      'Item ID',
      'Product Name',
      'Brand Name',
      'UPC',
      'Supply City',
      'Supply State',
      'Customer City',
      'Customer State',
      'Quantity',
      'Selling Price',
      'Total Revenue'
    ];

    const rows = salesData.map(record => [
      record.orderId,
      record.orderDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
      record.itemId,
      record.productName,
      record.brandName,
      record.upc,
      record.supplyCity,
      record.supplyState,
      record.customerCity,
      record.customerState,
      record.quantity,
      record.sellingPrice,
      record.quantity * record.sellingPrice // Calculate total revenue
    ]);

    const csvData = options.includeHeaders !== false ? [headers, ...rows] : rows;
    
    return Papa.unparse(csvData, {
      header: false,
      skipEmptyLines: true
    });
  }

  /**
   * Export stock analysis data to CSV format
   * @param inventoryData Inventory data for analysis
   * @param options Export options
   * @returns CSV content as string
   */
  static exportStockAnalysisToCSV(
    inventoryData: InventoryItem[],
    options: Partial<ExportOptions> = {}
  ): string {
    const stockAnalysis = inventoryData.map(item => {
      const salesVelocity = AnalyticsService.calculateSalesVelocity(item);
      const daysOfCover = AnalyticsService.calculateDaysOfCover(item, salesVelocity);
      const stockStatus = AnalyticsService.classifyStockStatusStrategic(daysOfCover);
      
      return {
        itemId: item.itemId,
        itemName: item.itemName,
        warehouseFacilityId: item.warehouseFacilityId,
        warehouseFacilityName: item.warehouseFacilityName,
        currentStock: item.totalSellable,
        salesVelocity,
        daysOfCover,
        stockStatus,
        recommendedAction: this.getRecommendedAction(stockStatus, daysOfCover)
      };
    });

    const headers = [
      'Item ID',
      'Item Name',
      'Warehouse Facility ID',
      'Warehouse Facility Name',
      'Current Stock',
      'Sales Velocity (per day)',
      'Days of Cover',
      'Stock Status',
      'Recommended Action'
    ];

    const rows = stockAnalysis.map(analysis => [
      analysis.itemId,
      analysis.itemName,
      analysis.warehouseFacilityId,
      analysis.warehouseFacilityName,
      analysis.currentStock,
      analysis.salesVelocity.toFixed(2),
      analysis.daysOfCover.toFixed(1),
      analysis.stockStatus,
      analysis.recommendedAction
    ]);

    const csvData = options.includeHeaders !== false ? [headers, ...rows] : rows;
    
    return Papa.unparse(csvData, {
      header: false,
      skipEmptyLines: true
    });
  }

  /**
   * Export data to Excel format with multiple sheets
   * @param inventoryData Filtered inventory data
   * @param salesData Filtered sales data
   * @param filters Applied filter criteria
   * @param options Export options
   * @returns Excel workbook as ArrayBuffer
   */
  static exportToExcel(
    inventoryData: InventoryItem[],
    salesData: SalesRecord[],
    filters: FilterCriteria,
    options: Partial<ExportOptions> = {}
  ): ArrayBuffer {
    const workbook = XLSX.utils.book_new();
    const sheets = options.sheets || {
      inventory: true,
      sales: true,
      analytics: true,
      summary: true
    };

    // Summary Sheet
    if (sheets.summary) {
      const summary = this.generateExportSummary(inventoryData, salesData, filters);
      const summaryData = [
        ['Export Summary Report'],
        ['Generated on:', summary.exportDate],
        [''],
        ['Data Overview'],
        ['Total Items:', summary.totalItems],
        ['Total Locations:', summary.totalLocations],
        ['Total Sales Records:', summary.totalSalesRecords],
        ['Total Revenue:', `$${summary.totalRevenue.toLocaleString()}`],
        [''],
        ['Stock Status Summary'],
        ['Out of Stock Items:', summary.outOfStockItems],
        ['Understock Items:', summary.understockItems],
        ['Overstock Items:', summary.overstockItems],
        [''],
        ['Applied Filters'],
        [summary.filterSummary]
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    }

    // Inventory Sheet
    if (sheets.inventory && inventoryData.length > 0) {
      const inventoryHeaders = [
        'Item ID', 'Item Name', 'Brand Name', 'UPC', 'UOM',
        'Warehouse Facility ID', 'Warehouse Facility Name',
        'Total Sellable', 'Incoming Scheduled', 'Total Unsellable',
        'Last 7 Days Sales', 'Last 15 Days Sales', 'Last 30 Days Sales'
      ];

      const inventoryRows = inventoryData.map(item => [
        item.itemId,
        item.itemName,
        item.brandName,
        item.upc,
        item.uom,
        item.warehouseFacilityId,
        item.warehouseFacilityName,
        item.totalSellable,
        item.incomingScheduled,
        item.totalUnsellable,
        item.last7Days,
        item.last15Days,
        item.last30Days
      ]);

      const inventoryData2D = [inventoryHeaders, ...inventoryRows];
      const inventorySheet = XLSX.utils.aoa_to_sheet(inventoryData2D);
      XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventory');
    }

    // Sales Sheet
    if (sheets.sales && salesData.length > 0) {
      const salesHeaders = [
        'Order ID', 'Order Date', 'Item ID', 'Product Name', 'Brand Name', 'UPC',
        'Supply City', 'Supply State', 'Customer City', 'Customer State',
        'Quantity', 'Selling Price', 'Total Revenue'
      ];

      const salesRows = salesData.map(record => [
        record.orderId,
        record.orderDate.toISOString().split('T')[0],
        record.itemId,
        record.productName,
        record.brandName,
        record.upc,
        record.supplyCity,
        record.supplyState,
        record.customerCity,
        record.customerState,
        record.quantity,
        record.sellingPrice,
        record.quantity * record.sellingPrice
      ]);

      const salesData2D = [salesHeaders, ...salesRows];
      const salesSheet = XLSX.utils.aoa_to_sheet(salesData2D);
      XLSX.utils.book_append_sheet(workbook, salesSheet, 'Sales');
    }

    // Analytics Sheet
    if (sheets.analytics && inventoryData.length > 0) {
      const analyticsHeaders = [
        'Item ID', 'Item Name', 'Warehouse Facility ID', 'Warehouse Facility Name',
        'Current Stock', 'Sales Velocity (per day)', 'Days of Cover', 'Stock Status', 'Recommended Action'
      ];

      const analyticsRows = inventoryData.map(item => {
        const salesVelocity = AnalyticsService.calculateSalesVelocity(item);
        const daysOfCover = AnalyticsService.calculateDaysOfCover(item, salesVelocity);
        const stockStatus = AnalyticsService.classifyStockStatusStrategic(daysOfCover);
        
        return [
          item.itemId,
          item.itemName,
          item.warehouseFacilityId,
          item.warehouseFacilityName,
          item.totalSellable,
          parseFloat(salesVelocity.toFixed(2)),
          parseFloat(daysOfCover.toFixed(1)),
          stockStatus,
          this.getRecommendedAction(stockStatus, daysOfCover)
        ];
      });

      const analyticsData2D = [analyticsHeaders, ...analyticsRows];
      const analyticsSheet = XLSX.utils.aoa_to_sheet(analyticsData2D);
      XLSX.utils.book_append_sheet(workbook, analyticsSheet, 'Stock Analysis');
    }

    return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  }

  /**
   * Generate a comprehensive report with summaries
   * @param inventoryData Filtered inventory data
   * @param salesData Filtered sales data
   * @param filters Applied filter criteria
   * @param format Export format
   * @returns Report content as string or ArrayBuffer
   */
  static generateReport(
    inventoryData: InventoryItem[],
    salesData: SalesRecord[],
    filters: FilterCriteria,
    format: ExportFormat = 'xlsx'
  ): string | ArrayBuffer {
    if (format === 'xlsx') {
      return this.exportToExcel(inventoryData, salesData, filters, {
        format,
        includeHeaders: true,
        sheets: {
          inventory: true,
          sales: true,
          analytics: true,
          summary: true
        }
      });
    } else {
      // For CSV, create a comprehensive report with all data
      const summary = this.generateExportSummary(inventoryData, salesData, filters);
      const inventoryCSV = this.exportInventoryToCSV(inventoryData);
      const salesCSV = this.exportSalesToCSV(salesData);
      const analyticsCSV = this.exportStockAnalysisToCSV(inventoryData);

      return [
        '=== EXPORT SUMMARY ===',
        `Generated on: ${summary.exportDate}`,
        `Total Items: ${summary.totalItems}`,
        `Total Locations: ${summary.totalLocations}`,
        `Total Sales Records: ${summary.totalSalesRecords}`,
        `Total Revenue: $${summary.totalRevenue.toLocaleString()}`,
        `Out of Stock Items: ${summary.outOfStockItems}`,
        `Understock Items: ${summary.understockItems}`,
        `Overstock Items: ${summary.overstockItems}`,
        `Applied Filters: ${summary.filterSummary}`,
        '',
        '=== INVENTORY DATA ===',
        inventoryCSV,
        '',
        '=== SALES DATA ===',
        salesCSV,
        '',
        '=== STOCK ANALYSIS ===',
        analyticsCSV
      ].join('\n');
    }
  }

  /**
   * Download exported data as a file
   * @param content File content (string or ArrayBuffer)
   * @param filename Filename for download
   * @param format File format
   */
  static downloadFile(
    content: string | ArrayBuffer,
    filename: string,
    format: ExportFormat
  ): void {
    const mimeType = format === 'xlsx' 
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv';

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Generate export summary with key metrics
   * @param inventoryData Filtered inventory data
   * @param salesData Filtered sales data
   * @param filters Applied filter criteria
   * @returns Export summary object
   */
  private static generateExportSummary(
    inventoryData: InventoryItem[],
    salesData: SalesRecord[],
    filters: FilterCriteria
  ): ExportSummary {
    const uniqueLocations = FilterService.getUniqueLocations(inventoryData);
    const totalRevenue = salesData.reduce((sum, record) => 
      sum + (record.quantity * record.sellingPrice), 0
    );

    // Calculate stock status counts
    let outOfStockItems = 0;
    let understockItems = 0;
    let overstockItems = 0;

    inventoryData.forEach(item => {
      const salesVelocity = AnalyticsService.calculateSalesVelocity(item);
      const daysOfCover = AnalyticsService.calculateDaysOfCover(item, salesVelocity);
      const stockStatus = AnalyticsService.classifyStockStatusStrategic(daysOfCover);

      switch (stockStatus) {
        case 'out-of-stock':
          outOfStockItems++;
          break;
        case 'understock':
          understockItems++;
          break;
        case 'overstock':
          overstockItems++;
          break;
      }
    });

    return {
      totalItems: inventoryData.length,
      totalLocations: uniqueLocations.length,
      totalSalesRecords: salesData.length,
      totalRevenue,
      outOfStockItems,
      understockItems,
      overstockItems,
      exportDate: new Date().toISOString().split('T')[0],
      filterSummary: FilterService.getFilterSummary(filters)
    };
  }

  /**
   * Get recommended action based on stock status
   * @param stockStatus Current stock status
   * @param daysOfCover Days of cover remaining
   * @returns Recommended action string
   */
  private static getRecommendedAction(stockStatus: string, daysOfCover: number): string {
    switch (stockStatus) {
      case 'out-of-stock':
        return 'URGENT: Restock immediately';
      case 'understock':
        return daysOfCover <= 3 ? 'HIGH PRIORITY: Restock within 1-2 days' : 'Restock soon';
      case 'overstock':
        return daysOfCover > 60 ? 'Consider reducing orders or promotions' : 'Monitor inventory levels';
      case 'adequate':
        return 'No action needed';
      default:
        return 'Review inventory status';
    }
  }

  /**
   * Generate filename with timestamp and filters
   * @param baseFilename Base filename
   * @param format File format
   * @param filters Applied filters
   * @returns Generated filename
   */
  static generateFilename(
    baseFilename: string,
    format: ExportFormat,
    filters: FilterCriteria
  ): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const extension = format === 'xlsx' ? 'xlsx' : 'csv';
    
    let filename = `${baseFilename}_${timestamp}`;
    
    // Add filter indicators to filename
    if (filters.locations && filters.locations.length > 0) {
      filename += `_loc-${filters.locations.length}`;
    }
    
    if (filters.skus && filters.skus.length > 0) {
      filename += `_sku-${filters.skus.length}`;
    }
    
    if (filters.timePeriod) {
      filename += `_${filters.timePeriod}`;
    }
    
    return `${filename}.${extension}`;
  }

  /**
   * Generic CSV export for any data array
   * 
   * @param data - Array of objects to export
   * @param filename - Output filename
   * @returns CSV content as string
   */
  static exportToCSV(data: any[], filename: string): void {
    try {
      const csv = Papa.unparse(data, {
        header: true,
        skipEmptyLines: true
      });

      // Create and trigger download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      throw new Error('Failed to export data to CSV');
    }
  }
}