import Papa from 'papaparse';
import type {
  InventoryItem,
  SalesRecord,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  InventoryCSVSchema,
  SalesCSVSchema,
  AmazonSalesRecord,
  AmazonCSVSchema,
  CumulativeHistoryData
} from '../types';
import {
  REQUIRED_INVENTORY_COLUMNS,
  REQUIRED_SALES_COLUMNS,
  REQUIRED_AMAZON_COLUMNS,
  PLATFORM
} from '../types';

/**
 * Service for loading and processing CSV data files
 */
export class DataService {
  /**
   * Load and parse inventory data from CSV file (supports both detailed and master inventory formats)
   * Enhanced version that detects and processes cumulative history
   */
  static async loadInventoryData(file: File): Promise<InventoryItem[]> {
    const result = await this.loadMasterInventoryDataWithHistory(file);
    // Return only the current items (latest date slice) for backward compatibility
    return result.items;
  }

  /**
   * Enhanced loader that detects cumulative history and returns both current items and history data
   */
  static async loadMasterInventoryDataWithHistory(file: File): Promise<{
    items: InventoryItem[];
    cumulativeHistory: CumulativeHistoryData | null;
    isHistoryFile: boolean;
  }> {
    try {
      const csvData = await this.parseCSVFile<any>(file);
      
      // First, check for cumulative history (date columns)
      const cumulativeHistory = this.parseFileBasedHistory(csvData);
      const isHistoryFile = cumulativeHistory !== null;
      
      let processedData: any[];
      
      if (isHistoryFile && cumulativeHistory) {
        // Use only the latest date's data for current operations
        const latestDateKey = cumulativeHistory.latestDate.toISOString().split('T')[0];
        processedData = cumulativeHistory.dataByDate.get(latestDateKey) || [];
        console.log(`Cumulative file detected: ${cumulativeHistory.totalDaysOfHistory} days of history found`);
        console.log(`Date range: ${cumulativeHistory.earliestDate.toLocaleDateString()} to ${cumulativeHistory.latestDate.toLocaleDateString()}`);
      } else {
        // No date column found, process all data as current
        processedData = csvData;
      }
      
      // Detect CSV format based on available columns
      const firstRow = processedData[0];
      if (!firstRow) {
        throw new Error('No valid data rows found in CSV file');
      }
      
      const availableColumns = Object.keys(firstRow);
      
      // Check if this is a Master Inventory format (simplified)
      const isMasterFormat = this.isMasterInventoryFormat(availableColumns);
      
      let items: InventoryItem[];
      
      if (isMasterFormat) {
        // Detected Master Inventory CSV format
        const validationResult = this.validateMasterInventoryCSV(processedData);
        
        // Only throw error for critical validation failures
        const criticalErrors = validationResult.errors.filter(e => 
          e.message.includes('required') || 
          e.message.includes('empty') ||
          e.message.includes('missing required')
        );
        
        if (criticalErrors.length > 0) {
          throw new Error(`Critical master inventory data errors: ${criticalErrors.map(e => e.message).join(', ')}`);
        }
        
        // Log warnings but don't fail
        if (validationResult.warnings.length > 0 || validationResult.errors.length > 0) {
          console.warn('Master inventory data validation issues:', {
            warnings: validationResult.warnings,
            errors: validationResult.errors
          });
        }

        items = this.transformMasterInventoryData(processedData);
      } else {
        // Detected detailed inventory CSV format
        const validationResult = this.validateInventoryCSV(processedData);
        
        // Only throw error for critical validation failures
        const criticalErrors = validationResult.errors.filter(e => 
          e.message.includes('required') || 
          e.message.includes('empty') ||
          e.message.includes('missing required')
        );
        
        if (criticalErrors.length > 0) {
          throw new Error(`Critical inventory data errors: ${criticalErrors.map(e => e.message).join(', ')}`);
        }
        
        // Log warnings but don't fail
        if (validationResult.warnings.length > 0 || validationResult.errors.length > 0) {
          console.warn('Inventory data validation issues:', {
            warnings: validationResult.warnings,
            errors: validationResult.errors
          });
        }

        items = this.transformInventoryData(processedData);
      }
      
      // Add upload date to items if from history file
      if (isHistoryFile && cumulativeHistory) {
        items = items.map(item => ({
          ...item,
          uploadDate: cumulativeHistory.latestDate
        }));
      }
      
      return {
        items,
        cumulativeHistory,
        isHistoryFile
      };
    } catch (error) {
      throw new Error(`Failed to load inventory data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load and parse Master Inventory data (simplified format with Item ID, Location, Total Sellable)
   */
  static async loadMasterInventoryData(csvData: any[]): Promise<InventoryItem[]> {
    try {
      const validationResult = this.validateMasterInventoryCSV(csvData);
      
      // Only throw error for critical validation failures
      const criticalErrors = validationResult.errors.filter(e => 
        e.message.includes('required') || 
        e.message.includes('empty') ||
        e.message.includes('missing required')
      );
      
      if (criticalErrors.length > 0) {
        throw new Error(`Critical master inventory data errors: ${criticalErrors.map(e => e.message).join(', ')}`);
      }
      
      // Log warnings but don't fail
      if (validationResult.warnings.length > 0 || validationResult.errors.length > 0) {
        console.warn('Master inventory data validation issues:', {
          warnings: validationResult.warnings,
          errors: validationResult.errors
        });
      }

      return this.transformMasterInventoryData(csvData);
    } catch (error) {
      throw new Error(`Failed to load master inventory data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load and parse sales data from CSV file
   */
  static async loadSalesData(file: File): Promise<SalesRecord[]> {
    try {
      const csvData = await this.parseCSVFile<SalesCSVSchema>(file);
      const validationResult = this.validateSalesCSV(csvData);
      
      // Only throw error for critical validation failures
      const criticalErrors = validationResult.errors.filter(e => 
        e.message.includes('required') || 
        e.message.includes('empty') ||
        e.message.includes('missing required')
      );
      
      if (criticalErrors.length > 0) {
        throw new Error(`Critical sales data errors: ${criticalErrors.map(e => e.message).join(', ')}`);
      }
      
      // Log warnings but don't fail
      if (validationResult.warnings.length > 0 || validationResult.errors.length > 0) {
        console.warn('Sales data validation issues:', {
          warnings: validationResult.warnings,
          errors: validationResult.errors
        });
      }

      return this.transformSalesData(csvData);
    } catch (error) {
      throw new Error(`Failed to load sales data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect data format from CSV file headers
   */
  static async detectDataFormat(file: File): Promise<'blinkit' | 'amazon' | 'unknown'> {
    try {
      const csvData = await this.parseCSVFile<any>(file);
      
      if (csvData.length === 0) {
        return 'unknown';
      }

      const firstRow = csvData[0];
      const availableColumns = Object.keys(firstRow);
      const normalizedColumns = availableColumns.map(col => 
        col.toLowerCase().replace(/[^a-z0-9]/g, '')
      );

      // Check for Amazon-specific headers
      const hasAmazonHeaders = REQUIRED_AMAZON_COLUMNS.every(col => 
        normalizedColumns.includes(col.toLowerCase().replace(/[^a-z0-9]/g, ''))
      );

      if (hasAmazonHeaders) {
        return 'amazon';
      }

      // Check for Blinkit-specific headers
      const hasBlinkitHeaders = REQUIRED_SALES_COLUMNS.some(col => 
        normalizedColumns.includes(col.toLowerCase().replace(/[^a-z0-9]/g, ''))
      );

      if (hasBlinkitHeaders) {
        return 'blinkit';
      }

      return 'unknown';
    } catch (error) {
      console.error('Error detecting data format:', error);
      return 'unknown';
    }
  }

  /**
   * Load and parse Amazon sales data from CSV file
   */
  static async loadAmazonSalesData(file: File): Promise<SalesRecord[]> {
    try {
      const csvData = await this.parseCSVFile<AmazonCSVSchema>(file);
      const validationResult = this.validateAmazonSchema(csvData);
      
      // Only throw error for critical validation failures
      const criticalErrors = validationResult.errors.filter(e => 
        e.message.includes('required') || 
        e.message.includes('empty') ||
        e.message.includes('missing required')
      );
      
      if (criticalErrors.length > 0) {
        throw new Error(`Critical Amazon data errors: ${criticalErrors.map(e => e.message).join(', ')}`);
      }
      
      // Log warnings but don't fail
      if (validationResult.warnings.length > 0 || validationResult.errors.length > 0) {
        console.warn('Amazon data validation issues:', {
          warnings: validationResult.warnings,
          errors: validationResult.errors
        });
      }

      return this.transformAmazonSalesData(csvData);
    } catch (error) {
      throw new Error(`Failed to load Amazon sales data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate Amazon CSV schema
   */
  static validateAmazonSchema(data: AmazonCSVSchema[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (data.length === 0) {
      errors.push({
        field: 'file',
        message: 'CSV file is empty or contains no valid data rows'
      });
      return { isValid: false, errors, warnings };
    }

    // Check for required columns
    const firstRow = data[0];
    const availableColumns = Object.keys(firstRow);
    
    REQUIRED_AMAZON_COLUMNS.forEach(requiredColumn => {
      if (!availableColumns.includes(requiredColumn)) {
        errors.push({
          field: requiredColumn,
          message: `Required Amazon column '${requiredColumn}' is missing from CSV`
        });
      }
    });

    // Validate each row
    data.forEach((row, index) => {
      // Check required fields
      if (!row.sku || row.sku.toString().trim() === '') {
        errors.push({
          field: 'sku',
          message: 'SKU is required and cannot be empty',
          rowIndex: index + 1,
          value: row.sku
        });
      }

      // Validate date
      if (!row['order-date'] || row['order-date'].toString().trim() === '') {
        errors.push({
          field: 'order-date',
          message: 'Order date is required and cannot be empty',
          rowIndex: index + 1,
          value: row['order-date']
        });
      } else {
        const date = this.parseDate(row['order-date'].toString());
        if (!date || isNaN(date.getTime())) {
          warnings.push({
            field: 'order-date',
            message: `Could not parse date "${row['order-date']}" (row ${index + 1}), using current date as fallback`,
            rowIndex: index + 1,
            value: row['order-date']
          });
        }
      }

      // Validate numeric fields
      const numericFields = ['units-ordered', 'item-price'];
      numericFields.forEach(field => {
        const value = row[field as keyof AmazonCSVSchema];
        if (value === undefined || value === '' || value === null) {
          errors.push({
            field,
            message: `${field} is required`,
            rowIndex: index + 1,
            value
          });
        } else {
          const numValue = parseFloat(value.toString());
          if (isNaN(numValue)) {
            errors.push({
              field,
              message: `${field} must be a valid number`,
              rowIndex: index + 1,
              value
            });
          } else if (numValue < 0) {
            errors.push({
              field,
              message: `${field} cannot be negative`,
              rowIndex: index + 1,
              value
            });
          }
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Map Amazon sales record to internal SalesRecord structure
   */
  static mapAmazonToSalesRecord(amazonRecord: AmazonSalesRecord): SalesRecord {
    return {
      orderId: `AMZ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique order ID
      orderDate: this.parseDate(amazonRecord['order-date']) || new Date(),
      itemId: amazonRecord.sku,
      productName: `Amazon Product ${amazonRecord.sku}`, // Amazon doesn't provide product name in basic reports
      brandName: 'Amazon', // Default brand for Amazon products
      upc: '', // Not available in Amazon reports
      supplyCity: '', // Not available in Amazon reports
      supplyState: '', // Not available in Amazon reports
      customerCity: amazonRecord['customer-city'] || '',
      customerState: amazonRecord['customer-state'] || '',
      quantity: amazonRecord['units-ordered'],
      sellingPrice: amazonRecord['item-price'],
      // Platform-specific data
      platform: PLATFORM.AMAZON,
      platformSpecificData: {
        amazonSku: amazonRecord.sku,
        referralFee: amazonRecord['item-price'] * 0.15, // 15% referral fee
        estimatedPayout: amazonRecord['item-price'] * 0.85 // Revenue minus 15% fee
      }
    };
  }

  /**
   * Validate data integrity between inventory and sales datasets
   */
  static validateDataIntegrity(inventory: InventoryItem[], sales: SalesRecord[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for SKUs in sales data that don't exist in inventory
    const inventoryItemIds = new Set(inventory.map(item => item.itemId));
    const salesItemIds = new Set(sales.map(record => record.itemId));

    salesItemIds.forEach(itemId => {
      if (!inventoryItemIds.has(itemId)) {
        warnings.push({
          field: 'itemId',
          message: `Sales record contains item ID '${itemId}' not found in inventory data`,
          value: itemId
        });
      }
    });

    // Check for inventory items with no sales data
    inventoryItemIds.forEach(itemId => {
      if (!salesItemIds.has(itemId)) {
        warnings.push({
          field: 'itemId',
          message: `Inventory item '${itemId}' has no corresponding sales records`,
          value: itemId
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Parse date string in DD-MM-YYYY format
   */
  private static parseDate(dateString: string): Date | null {
    if (!dateString || dateString.trim() === '') {
      return null;
    }

    // Try DD-MM-YYYY format first (common in the CSV)
    const ddmmyyyyMatch = dateString.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Try MM/DD/YYYY format
    const mmddyyyyMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mmddyyyyMatch) {
      const [, month, day, year] = mmddyyyyMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Try YYYY-MM-DD format
    const yyyymmddMatch = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (yyyymmddMatch) {
      const [, year, month, day] = yyyymmddMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Fall back to JavaScript's Date constructor
    const fallbackDate = new Date(dateString);
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate;
    }

    return null;
  }

  /**
   * Parse CSV file using Papa Parse
   */
  private static parseCSVFile<T>(file: File): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No file provided'));
        return;
      }

      if (!file.name.toLowerCase().endsWith('.csv')) {
        reject(new Error('File must be a CSV file'));
        return;
      }

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => {
          // Normalize header names by removing spaces and converting to lowercase
          return header.trim()
            .replace(/\s+/g, '')
            .replace(/[^a-zA-Z0-9]/g, '')
            .toLowerCase();
        },
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`));
            return;
          }

          resolve(results.data as T[]);
        },
        error: (error) => {
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        }
      });
    });
  }

  /**
   * Validate inventory CSV data structure and content
   */
  private static validateInventoryCSV(data: InventoryCSVSchema[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (data.length === 0) {
      errors.push({
        field: 'file',
        message: 'CSV file is empty or contains no valid data rows'
      });
      return { isValid: false, errors, warnings };
    }

    // Check for required columns
    const firstRow = data[0];
    const availableColumns = Object.keys(firstRow);
    
    REQUIRED_INVENTORY_COLUMNS.forEach(requiredColumn => {
      if (!availableColumns.includes(requiredColumn)) {
        errors.push({
          field: requiredColumn,
          message: `Required column '${requiredColumn}' is missing from CSV`
        });
      }
    });

    // Validate each row
    data.forEach((row, index) => {
      // Check required fields
      if (!row.itemid || row.itemid.trim() === '') {
        errors.push({
          field: 'itemid',
          message: 'Item ID is required and cannot be empty',
          rowIndex: index + 1,
          value: row.itemid
        });
      }

      if (!row.itemname || row.itemname.trim() === '') {
        errors.push({
          field: 'itemname',
          message: 'Item name is required and cannot be empty',
          rowIndex: index + 1,
          value: row.itemname
        });
      }

      if (!row.warehousefacilityid || row.warehousefacilityid.trim() === '') {
        errors.push({
          field: 'warehousefacilityid',
          message: 'Warehouse facility ID is required and cannot be empty',
          rowIndex: index + 1,
          value: row.warehousefacilityid
        });
      }

      // Validate numeric fields
      const numericFields = ['totalsellable', 'incomingscheduled', 'totalunsellable', 'last7days', 'last15days', 'last30days'];
      numericFields.forEach(field => {
        const value = row[field as keyof InventoryCSVSchema];
        if (value !== undefined && value !== '' && value !== null) {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            errors.push({
              field,
              message: `${field} must be a valid number`,
              rowIndex: index + 1,
              value
            });
          } else if (numValue < 0) {
            errors.push({
              field,
              message: `${field} cannot be negative`,
              rowIndex: index + 1,
              value
            });
          }
        }
      });

      // Check for required totalSellable
      if (row.totalsellable === undefined || row.totalsellable === '' || row.totalsellable === null) {
        errors.push({
          field: 'totalsellable',
          message: 'Total sellable quantity is required',
          rowIndex: index + 1,
          value: row.totalsellable
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate sales CSV data structure and content
   */
  private static validateSalesCSV(data: SalesCSVSchema[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (data.length === 0) {
      errors.push({
        field: 'file',
        message: 'CSV file is empty or contains no valid data rows'
      });
      return { isValid: false, errors, warnings };
    }

    // Check for required columns
    const firstRow = data[0];
    const availableColumns = Object.keys(firstRow);
    
    REQUIRED_SALES_COLUMNS.forEach(requiredColumn => {
      if (!availableColumns.includes(requiredColumn)) {
        errors.push({
          field: requiredColumn,
          message: `Required column '${requiredColumn}' is missing from CSV`
        });
      }
    });

    // Validate each row
    data.forEach((row, index) => {
      // Check required fields
      if (!row.orderid || row.orderid.trim() === '') {
        errors.push({
          field: 'orderid',
          message: 'Order ID is required and cannot be empty',
          rowIndex: index + 1,
          value: row.orderid
        });
      }

      if (!row.itemid || row.itemid.trim() === '') {
        errors.push({
          field: 'itemid',
          message: 'Item ID is required and cannot be empty',
          rowIndex: index + 1,
          value: row.itemid
        });
      }

      if (!row.productname || row.productname.trim() === '') {
        errors.push({
          field: 'productname',
          message: 'Product name is required and cannot be empty',
          rowIndex: index + 1,
          value: row.productname
        });
      }

      // Validate date
      if (!row.orderdate || row.orderdate.trim() === '') {
        errors.push({
          field: 'orderdate',
          message: 'Order date is required and cannot be empty',
          rowIndex: index + 1,
          value: row.orderdate
        });
      } else {
        // Try to parse date in DD-MM-YYYY format first
        const date = this.parseDate(row.orderdate);
        if (!date || isNaN(date.getTime())) {
          warnings.push({
            field: 'orderdate',
            message: `Could not parse date "${row.orderdate}" (row ${index + 1}), using current date as fallback`,
            rowIndex: index + 1,
            value: row.orderdate
          });
        }
      }

      // Validate numeric fields
      const numericFields = ['quantity', 'sellingpricers'];
      numericFields.forEach(field => {
        const value = row[field as keyof SalesCSVSchema];
        if (value === undefined || value === '' || value === null) {
          errors.push({
            field,
            message: `${field} is required`,
            rowIndex: index + 1,
            value
          });
        } else {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            errors.push({
              field,
              message: `${field} must be a valid number`,
              rowIndex: index + 1,
              value
            });
          } else if (numValue < 0) {
            errors.push({
              field,
              message: `${field} cannot be negative`,
              rowIndex: index + 1,
              value
            });
          }
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Transform raw CSV data to InventoryItem objects
   */
  private static transformInventoryData(csvData: InventoryCSVSchema[]): InventoryItem[] {
    return csvData.map(row => ({
      itemId: row.itemid?.trim() || '',
      itemName: row.itemname?.trim() || '',
      brandName: row.brandname?.trim() || '',
      upc: row.upc?.trim() || '',
      uom: row.uom?.trim() || '',
      warehouseFacilityId: row.warehousefacilityid?.trim() || '',
      warehouseFacilityName: row.warehousefacilityname?.trim() || '',
      totalSellable: this.parseNumber(row.totalsellable, 0),
      incomingScheduled: this.parseNumber(row.incomingscheduled, 0),
      totalUnsellable: this.parseNumber(row.totalunsellable, 0),
      last7Days: this.parseNumber(row.last7days, 0),
      last15Days: this.parseNumber(row.last15days, 0),
      last30Days: this.parseNumber(row.last30days, 0),
      // Default to Blinkit platform for backward compatibility
      platform: PLATFORM.BLINKIT
    }));
  }

  /**
   * Transform raw CSV data to SalesRecord objects
   */
  private static transformSalesData(csvData: SalesCSVSchema[]): SalesRecord[] {
    return csvData.map(row => ({
      orderId: row.orderid?.trim() || '',
      orderDate: this.parseDate(row.orderdate) || new Date(),
      itemId: row.itemid?.trim() || '',
      productName: row.productname?.trim() || '',
      brandName: row.brandname?.trim() || '',
      upc: row.upc?.trim() || '',
      supplyCity: row.supplycity?.trim() || '',
      supplyState: row.supplystate?.trim() || '',
      customerCity: row.customercity?.trim() || '',
      customerState: row.customerstate?.trim() || '',
      quantity: this.parseNumber(row.quantity, 0),
      sellingPrice: this.parseNumber(row.sellingpricers, 0),
      // Default to Blinkit platform for backward compatibility
      platform: PLATFORM.BLINKIT,
      platformSpecificData: {
        blinkitItemId: row.itemid?.trim() || ''
      }
    }));
  }

  /**
   * Transform Amazon CSV data to SalesRecord objects
   */
  private static transformAmazonSalesData(csvData: AmazonCSVSchema[]): SalesRecord[] {
    return csvData.map(row => {
      const itemPrice = this.parseNumber(row['item-price'], 0);
      const unitsOrdered = this.parseNumber(row['units-ordered'], 0);
      const referralFee = itemPrice * 0.15; // 15% referral fee
      const estimatedPayout = itemPrice - referralFee;

      return {
        orderId: `AMZ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique order ID
        orderDate: this.parseDate(row['order-date']) || new Date(),
        itemId: row.sku?.trim() || '',
        productName: `Amazon Product ${row.sku?.trim() || 'Unknown'}`, // Amazon doesn't provide product name in basic reports
        brandName: 'Amazon', // Default brand for Amazon products
        upc: '', // Not available in Amazon reports
        supplyCity: '', // Not available in Amazon reports
        supplyState: '', // Not available in Amazon reports
        customerCity: row['customer-city']?.trim() || '',
        customerState: row['customer-state']?.trim() || '',
        quantity: unitsOrdered,
        sellingPrice: itemPrice,
        // Platform-specific data
        platform: PLATFORM.AMAZON,
        platformSpecificData: {
          amazonSku: row.sku?.trim() || '',
          referralFee: referralFee,
          estimatedPayout: estimatedPayout
        }
      };
    });
  }

  /**
   * Detect Upload Date column in CSV data
   * Supports common column names: 'Upload Date', 'Date', 'Timestamp', etc.
   */
  static detectUploadDateColumn(csvData: any[]): string | null {
    if (!csvData || csvData.length === 0) {
      return null;
    }

    const firstRow = csvData[0];
    const availableColumns = Object.keys(firstRow);
    
    // Common date column patterns (case-insensitive, handles spaces, underscores, hyphens)
    const dateColumnPatterns = [
      /^upload[\s_-]*date$/i,
      /^date$/i,
      /^timestamp$/i,
      /^created[\s_-]*date$/i,
      /^entry[\s_-]*date$/i,
      /^record[\s_-]*date$/i,
      /^data[\s_-]*date$/i
    ];

    // Find the first column that matches a date pattern
    for (const column of availableColumns) {
      const normalizedColumn = column.trim();
      for (const pattern of dateColumnPatterns) {
        if (pattern.test(normalizedColumn)) {
          // Validate that this column actually contains date-like values
          if (this.validateDateColumn(csvData, column)) {
            return column;
          }
        }
      }
    }

    return null;
  }

  /**
   * Validate that a column contains parseable date values
   */
  private static validateDateColumn(csvData: any[], columnName: string): boolean {
    if (!csvData || csvData.length === 0) {
      return false;
    }

    // Check first few rows to see if they contain valid dates
    const sampleSize = Math.min(5, csvData.length);
    let validDateCount = 0;

    for (let i = 0; i < sampleSize; i++) {
      const value = csvData[i][columnName];
      if (value && value.toString().trim() !== '') {
        const parsedDate = this.parseDate(value.toString());
        if (parsedDate && !isNaN(parsedDate.getTime())) {
          validDateCount++;
        }
      }
    }

    // At least 60% of sample values should be valid dates
    return validDateCount / sampleSize >= 0.6;
  }

  /**
   * Check if the CSV data represents inventory data based on column names
   */
  // private static isInventoryData(columns: string[]): boolean {
  //   const normalizedColumns = columns.map(col => 
  //     col.toLowerCase().replace(/[^a-z0-9]/g, '')
  //   );
  //   
  //   return normalizedColumns.some(col => 
  //     col.includes('totalsellable') || col.includes('sellable') || col.includes('stock')
  //   ) && normalizedColumns.some(col => 
  //     col.includes('itemid') || col.includes('item')
  //   );
  // }

  /**
   * Validate data quality and detect gaps in cumulative history
   */
  static validateDataQuality(cumulativeHistory: CumulativeHistoryData): {
    hasGaps: boolean;
    gaps: Array<{ start: Date; end: Date; daysMissing: number }>;
    warnings: string[];
  } {
    const result = {
      hasGaps: false,
      gaps: [] as Array<{ start: Date; end: Date; daysMissing: number }>,
      warnings: [] as string[]
    };

    if (!cumulativeHistory || cumulativeHistory.uploadDates.length < 2) {
      return result;
    }

    // Sort dates to ensure chronological order
    const sortedDates = [...cumulativeHistory.uploadDates].sort((a, b) => a.getTime() - b.getTime());
    
    // Check for gaps larger than 7 days
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = sortedDates[i - 1];
      const currentDate = sortedDates[i];
      const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 7) {
        result.hasGaps = true;
        result.gaps.push({
          start: prevDate,
          end: currentDate,
          daysMissing: daysDiff - 1
        });
      }
    }

    // Generate warning messages
    if (result.hasGaps) {
      result.gaps.forEach(gap => {
        const startStr = gap.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endStr = gap.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        result.warnings.push(`Missing data detected between ${startStr} and ${endStr} (${gap.daysMissing} days)`);
      });
    }

    // Check for unrealistic date ranges
    const totalDays = Math.floor((cumulativeHistory.latestDate.getTime() - cumulativeHistory.earliestDate.getTime()) / (1000 * 60 * 60 * 24));
    if (totalDays > 365 * 5) {
      result.warnings.push('Data spans more than 5 years - please verify date accuracy');
    }

    // Check for future dates
    const now = new Date();
    const futureDates = sortedDates.filter(date => date > now);
    if (futureDates.length > 0) {
      result.warnings.push('Future dates detected - please verify date accuracy');
    }

    return result;
  }

  /**
   * Parse and group CSV data by upload dates to create cumulative history
   */
  static parseFileBasedHistory(csvData: any[]): CumulativeHistoryData | null {
    const dateColumn = this.detectUploadDateColumn(csvData);
    
    if (!dateColumn) {
      return null;
    }

    const dataByDate = new Map<string, any[]>();
    const uniqueDates = new Set<string>(); // Use string keys to avoid duplicate Date objects
    const errors: string[] = [];

    // Group data by date, handling empty cells and malformed dates
    csvData.forEach((row, index) => {
      const dateValue = row[dateColumn];
      
      if (!dateValue || dateValue.toString().trim() === '') {
        // Skip rows with empty date cells
        return;
      }

      const parsedDate = this.parseDate(dateValue.toString());
      
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        // Log malformed date but don't crash - skip this row
        errors.push(`Row ${index + 1}: Could not parse date "${dateValue}"`);
        return;
      }

      const dateKey = parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      uniqueDates.add(dateKey);
      
      if (!dataByDate.has(dateKey)) {
        dataByDate.set(dateKey, []);
      }
      
      // Add the parsed date to the row for later use
      const rowWithDate = { ...row, uploadDate: parsedDate };
      dataByDate.get(dateKey)!.push(rowWithDate);
    });

    if (uniqueDates.size === 0) {
      console.warn('No valid dates found in Upload Date column');
      return null;
    }

    // Log parsing errors as warnings but continue processing
    if (errors.length > 0) {
      console.warn('Date parsing warnings:', errors);
    }

    // Convert string dates back to Date objects and sort
    const sortedDates = Array.from(uniqueDates)
      .map(dateStr => new Date(dateStr))
      .sort((a, b) => a.getTime() - b.getTime());
    
    return {
      uploadDates: sortedDates,
      dataByDate,
      latestDate: sortedDates[sortedDates.length - 1],
      earliestDate: sortedDates[0],
      totalDaysOfHistory: uniqueDates.size
    };
  }

  /**
   * Safely parse a string to number with fallback
   */
  private static parseNumber(value: string | undefined | null, fallback: number = 0): number {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }
    
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }

  /**
   * Detect if CSV is in Master Inventory format (simplified with Item ID, Location, Total Sellable)
   */
  private static isMasterInventoryFormat(columns: string[]): boolean {
    // Normalize column names for comparison
    const normalizedColumns = columns.map(col => 
      col.toLowerCase().replace(/[^a-z0-9]/g, '')
    );
    
    // Check for master inventory key columns
    const hasItemId = normalizedColumns.some(col => 
      col.includes('itemid') || col.includes('item') || col.includes('sku')
    );
    const hasLocation = normalizedColumns.some(col => 
      col.includes('location') || col.includes('warehouse') || col.includes('facility')
    );
    const hasTotalSellable = normalizedColumns.some(col => 
      col.includes('totalsellable') || col.includes('sellable') || col.includes('stock') || col.includes('quantity')
    );
    
    // Check if it's missing detailed inventory columns
    const hasDetailedColumns = normalizedColumns.some(col => 
      col.includes('brandname') || col.includes('upc') || col.includes('last7days') || col.includes('last15days')
    );
    
    // It's master format if it has the key columns but lacks detailed columns
    return hasItemId && hasLocation && hasTotalSellable && !hasDetailedColumns;
  }

  /**
   * Validate Master Inventory CSV data structure and content
   */
  private static validateMasterInventoryCSV(data: any[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (data.length === 0) {
      errors.push({
        field: 'file',
        message: 'CSV file is empty or contains no valid data rows'
      });
      return { isValid: false, errors, warnings };
    }

    // Check for required columns in master format
    const firstRow = data[0];
    const availableColumns = Object.keys(firstRow);
    const normalizedColumns = availableColumns.map(col => 
      col.toLowerCase().replace(/[^a-z0-9]/g, '')
    );
    
    // Find the actual column names for required fields
    const itemIdColumn = availableColumns.find((_, index) => {
      const normalized = normalizedColumns[index];
      return normalized.includes('itemid') || normalized.includes('item') || normalized.includes('sku');
    });
    
    const locationColumn = availableColumns.find((_, index) => {
      const normalized = normalizedColumns[index];
      return normalized.includes('location') || normalized.includes('warehouse') || normalized.includes('facility');
    });
    
    const sellableColumn = availableColumns.find((_, index) => {
      const normalized = normalizedColumns[index];
      return normalized.includes('totalsellable') || normalized.includes('sellable') || normalized.includes('stock') || normalized.includes('quantity');
    });

    if (!itemIdColumn) {
      errors.push({
        field: 'itemId',
        message: 'Required column for Item ID is missing (expected: Item ID, Item, or SKU)'
      });
    }

    if (!locationColumn) {
      errors.push({
        field: 'location',
        message: 'Required column for Location is missing (expected: Location, Warehouse, or Facility)'
      });
    }

    if (!sellableColumn) {
      errors.push({
        field: 'sellable',
        message: 'Required column for Total Sellable is missing (expected: Total Sellable, Sellable, Stock, or Quantity)'
      });
    }

    // Validate each row
    data.forEach((row, index) => {
      // Check required fields using detected column names
      if (itemIdColumn && (!row[itemIdColumn] || row[itemIdColumn].toString().trim() === '')) {
        errors.push({
          field: 'itemId',
          message: 'Item ID is required and cannot be empty',
          rowIndex: index + 1,
          value: row[itemIdColumn]
        });
      }

      if (locationColumn && (!row[locationColumn] || row[locationColumn].toString().trim() === '')) {
        errors.push({
          field: 'location',
          message: 'Location is required and cannot be empty',
          rowIndex: index + 1,
          value: row[locationColumn]
        });
      }

      if (sellableColumn) {
        const value = row[sellableColumn];
        if (value === undefined || value === '' || value === null) {
          errors.push({
            field: 'sellable',
            message: 'Total sellable quantity is required',
            rowIndex: index + 1,
            value
          });
        } else {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            errors.push({
              field: 'sellable',
              message: 'Total sellable must be a valid number',
              rowIndex: index + 1,
              value
            });
          } else if (numValue < 0) {
            errors.push({
              field: 'sellable',
              message: 'Total sellable cannot be negative',
              rowIndex: index + 1,
              value
            });
          }
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Transform Master Inventory CSV data to InventoryItem objects
   */
  private static transformMasterInventoryData(csvData: any[]): InventoryItem[] {
    if (csvData.length === 0) return [];

    // Detect column mappings
    const firstRow = csvData[0];
    const availableColumns = Object.keys(firstRow);
    const normalizedColumns = availableColumns.map(col => 
      col.toLowerCase().replace(/[^a-z0-9]/g, '')
    );
    
    // Find the actual column names for required fields
    const itemIdColumn = availableColumns.find((_, index) => {
      const normalized = normalizedColumns[index];
      return normalized.includes('itemid') || normalized.includes('item') || normalized.includes('sku');
    });
    
    const locationColumn = availableColumns.find((_, index) => {
      const normalized = normalizedColumns[index];
      return normalized.includes('location') || normalized.includes('warehouse') || normalized.includes('facility');
    });
    
    const sellableColumn = availableColumns.find((_, index) => {
      const normalized = normalizedColumns[index];
      return normalized.includes('totalsellable') || normalized.includes('sellable') || normalized.includes('stock') || normalized.includes('quantity');
    });

    // Optional columns that might be present
    const nameColumn = availableColumns.find((_, index) => {
      const normalized = normalizedColumns[index];
      return normalized.includes('name') || normalized.includes('product') || normalized.includes('description');
    });

    return csvData.map(row => ({
      itemId: itemIdColumn ? (row[itemIdColumn]?.toString().trim() || '') : '',
      itemName: nameColumn ? (row[nameColumn]?.toString().trim() || '') : `Item ${itemIdColumn ? (row[itemIdColumn] || 'Unknown') : 'Unknown'}`,
      brandName: '', // Not available in master format
      upc: '', // Not available in master format
      uom: '', // Not available in master format
      warehouseFacilityId: locationColumn ? (row[locationColumn]?.toString().trim() || '') : '',
      warehouseFacilityName: locationColumn ? (row[locationColumn]?.toString().trim() || '') : '',
      totalSellable: sellableColumn ? this.parseNumber(row[sellableColumn], 0) : 0,
      incomingScheduled: 0, // Not available in master format
      totalUnsellable: 0, // Not available in master format
      last7Days: 0, // Not available in master format - will need to be calculated from sales data
      last15Days: 0, // Not available in master format
      last30Days: 0, // Not available in master format
      // Default to Blinkit platform for backward compatibility
      platform: PLATFORM.BLINKIT
    }));
  }
}