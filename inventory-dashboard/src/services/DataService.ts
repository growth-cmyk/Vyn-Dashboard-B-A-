import Papa from 'papaparse';
import * as XLSX from 'xlsx';
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
  CumulativeHistoryData,
  AdCampaignRecord,
  CampaignCSVSchema,
  ExcelTabConfig
} from '../types';
import {
  REQUIRED_INVENTORY_COLUMNS,
  REQUIRED_SALES_COLUMNS,
  REQUIRED_AMAZON_COLUMNS,
  PLATFORM,
  EXCEL_TAB_CONFIGS
} from '../types';

/**
 * Service for loading and processing CSV data files
 */
export class DataService {
  // GLOBAL DEMAND MAP: Maps Item ID to 12-month historical demand array
  // Format: { itemId: [month1Qty, month2Qty, ..., month12Qty] }
  private static demandMap: Map<string, number[]> = new Map();

  /**
   * Get the global demand map (for use by AnalyticsService)
   */
  static getDemandMap(): Map<string, number[]> {
    return this.demandMap;
  }

  /**
   * Clear the demand map (useful for testing or resetting)
   */
  static clearDemandMap(): void {
    this.demandMap.clear();
  }

  /**
   * Initialize demand map from cloud storage on app startup
   */
  static async initializeDemandMap(): Promise<void> {
    try {
      const { storageLayer } = await import('./StorageLayer');
      const cloudDemand = await storageLayer.getDemandHistory();
      
      if (cloudDemand && cloudDemand.size > 0) {
        this.demandMap = cloudDemand;
        console.log(`✅ Loaded ${cloudDemand.size} items from cloud demand history`);
      } else {
        console.log('ℹ️ No cloud demand history found - will build from next sales upload');
      }
    } catch (error) {
      console.warn('Failed to load demand history from cloud:', error);
      // Continue without cloud data - will build from next sales upload
    }
  }

  /**
   * Sync demand map to cloud storage after building from sales data
   */
  private static async syncDemandMapToCloud(): Promise<void> {
    try {
      const { storageLayer } = await import('./StorageLayer');
      await storageLayer.syncDemandHistory(this.demandMap);
      console.log('✅ Demand map synced to cloud storage');
    } catch (error) {
      console.warn('Failed to sync demand map to cloud:', error);
      // Continue without cloud sync - data is still available in memory
    }
  }

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
   * ENHANCED: Builds global demand map for Statistical ROP calculations
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

      const salesRecords = this.transformSalesData(csvData);
      
      // BUILD DEMAND MAP: Group sales by Item ID and Month, sum quantities
      this.buildDemandMapFromSales(salesRecords);
      
      // SYNC TO CLOUD: Save demand map to cloud storage
      await this.syncDemandMapToCloud();
      
      return salesRecords;
    } catch (error) {
      throw new Error(`Failed to load sales data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build demand map from sales records
   * Groups sales by Item ID and Month, sums quantities to create 12-month demand history
   * 
   * Logic:
   * 1. Parse Order Date (DD-MM-YYYY format)
   * 2. Extract month from date
   * 3. Group by Item ID and Month
   * 4. Sum Quantity for each group
   * 5. Store as 12-month array (oldest to newest)
   */
  private static buildDemandMapFromSales(salesRecords: SalesRecord[]): void {
    console.log('🔧 Building demand map from sales data...');
    
    // Clear existing demand map
    this.demandMap.clear();
    
    // Group sales by Item ID and Month
    const salesByItemAndMonth = new Map<string, Map<string, number>>();
    
    salesRecords.forEach(record => {
      const itemId = record.itemId;
      const orderDate = record.orderDate;
      
      // Extract month key (YYYY-MM format)
      const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Initialize nested map if needed
      if (!salesByItemAndMonth.has(itemId)) {
        salesByItemAndMonth.set(itemId, new Map());
      }
      
      const monthMap = salesByItemAndMonth.get(itemId)!;
      
      // Sum quantities for this month
      const currentQty = monthMap.get(monthKey) || 0;
      monthMap.set(monthKey, currentQty + record.quantity);
    });
    
    // Convert to 12-month arrays (oldest to newest)
    const now = new Date();
    const monthKeys: string[] = [];
    
    // Generate last 12 months in chronological order (oldest to newest)
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthKeys.push(monthKey);
    }
    
    // Build demand arrays for each item
    salesByItemAndMonth.forEach((monthMap, itemId) => {
      const demandArray = monthKeys.map(monthKey => monthMap.get(monthKey) || 0);
      this.demandMap.set(itemId, demandArray);
      
      console.log(`📊 Demand map for Item ${itemId}:`, demandArray);
    });
    
    console.log(`✅ Demand map built: ${this.demandMap.size} items with historical demand`);
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
   * Load and parse campaign data from multi-tab Excel file
   * Handles PRODUCT_RECOMMENDATION, PRODUCT_LISTING, and BRAND_BOOSTER tabs
   */
  static async loadExcelCampaignData(file: File): Promise<AdCampaignRecord[]> {
    try {
      console.log('Loading Excel campaign data from file:', file.name);
      const tabDataMap = await this.parseMultiTabExcel(file);
      const allCampaigns: AdCampaignRecord[] = [];

      console.log('Found tabs in Excel file:', Array.from(tabDataMap.keys()));

      // Process each recognized tab and ensure ALL campaigns are concatenated
      for (const [tabName, tabData] of tabDataMap.entries()) {
        console.log(`Processing tab: ${tabName} with ${tabData.length} rows`);
        const config = EXCEL_TAB_CONFIGS[tabName];
        if (!config) {
          console.warn(`Unrecognized tab: ${tabName}, skipping...`);
          continue;
        }

        // Validate tab data
        const validationResult = this.validateCampaignData(tabData, tabName);
        
        // Only throw error for critical validation failures
        const criticalErrors = validationResult.errors.filter(e => 
          e.message.includes('required') || 
          e.message.includes('empty') ||
          e.message.includes('missing required')
        );
        
        if (criticalErrors.length > 0) {
          console.error(`Critical errors in tab ${tabName}:`, criticalErrors);
          // Continue processing other tabs instead of failing completely
          continue;
        }
        
        // Log warnings but don't fail
        if (validationResult.warnings.length > 0 || validationResult.errors.length > 0) {
          console.warn(`Campaign data validation issues in tab ${tabName}:`, {
            warnings: validationResult.warnings,
            errors: validationResult.errors
          });
        }

        // Transform tab data to campaign records
        const campaigns = this.transformCampaignData(tabData, config);
        console.log(`Transformed ${campaigns.length} campaigns from tab ${tabName}`);
        
        // CRITICAL FIX 1: Add platform tag to ALL campaigns
        const campaignsWithPlatform = campaigns.map(campaign => ({
          ...campaign,
          platform: PLATFORM.BLINKIT // Ensure all campaigns are tagged with Blinkit platform
        }));
        
        // CRITICAL: Ensure all campaigns from ALL tabs are concatenated
        allCampaigns.push(...campaignsWithPlatform);
        console.log(`Total campaigns so far: ${allCampaigns.length}`);
      }

      console.log(`✅ FINAL RESULT: ${allCampaigns.length} campaigns loaded from ${tabDataMap.size} tabs`);
      
      // CRITICAL FIX 3: Ensure array is completely flat (defensive programming)
      const flattenedCampaigns = allCampaigns.flat();
      console.log(`🔧 FLATTENED RESULT: ${flattenedCampaigns.length} campaigns after flattening`);
      
      if (flattenedCampaigns.length > 0) {
        const dateRange = {
          earliest: new Date(Math.min(...flattenedCampaigns.map(c => c.date.getTime()))).toISOString().split('T')[0],
          latest: new Date(Math.max(...flattenedCampaigns.map(c => c.date.getTime()))).toISOString().split('T')[0]
        };
        console.log('Date range:', dateRange.earliest, 'to', dateRange.latest);
        
        // Log campaign type distribution
        const typeDistribution = flattenedCampaigns.reduce((acc, campaign) => {
          acc[campaign.campaignType] = (acc[campaign.campaignType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('Campaign type distribution:', typeDistribution);
        
        // Log budget totals by type
        const budgetByType = flattenedCampaigns.reduce((acc, campaign) => {
          acc[campaign.campaignType] = (acc[campaign.campaignType] || 0) + (campaign.budgetConsumed || 0);
          return acc;
        }, {} as Record<string, number>);
        console.log('Budget consumed by type:', budgetByType);
      } else {
        console.error('❌ NO CAMPAIGNS LOADED - Check Excel file format and headers');
      }

      return flattenedCampaigns;
    } catch (error) {
      console.error('Excel campaign data loading failed:', error);
      throw new Error(`Failed to load Excel campaign data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse multi-tab Excel file and return data by tab name
   * Supports .xlsx and .xls formats
   */
  static async parseMultiTabExcel(file: File): Promise<Map<string, any[]>> {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No file provided'));
        return;
      }

      // Check file extension
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        reject(new Error('File must be an Excel file (.xlsx or .xls)'));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            reject(new Error('Failed to read file data'));
            return;
          }

          // Parse Excel workbook
          const workbook = XLSX.read(data, { type: 'array' });
          const tabDataMap = new Map<string, any[]>();

          // Process each sheet that matches our expected tab names (case-insensitive)
          const expectedTabs = ['PRODUCT_RECOMMENDATION', 'PRODUCT_LISTING', 'BRAND_BOOSTER'];
          
          for (const expectedTab of expectedTabs) {
            // Find matching sheet name (case-insensitive, trimmed)
            const matchingSheetName = workbook.SheetNames.find(sheetName => 
              sheetName.trim().toUpperCase() === expectedTab.toUpperCase()
            );
            
            if (matchingSheetName) {
              console.log(`Processing Excel tab: "${matchingSheetName}" (matched ${expectedTab})`);
              const worksheet = workbook.Sheets[matchingSheetName];
              
              // Convert sheet to JSON with header row
              const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1, // Use first row as headers
                defval: '', // Default value for empty cells
                blankrows: false // Skip blank rows
              });

              if (jsonData.length > 1) { // Must have at least header + 1 data row
                // Convert to object format with EXACT headers (no normalization)
                const headers = (jsonData[0] as string[]).map(header => 
                  String(header).trim() // Only trim whitespace, keep exact case
                );
                
                const dataRows = jsonData.slice(1) as any[][];
                const exactData = dataRows.map(row => {
                  const obj: any = {};
                  headers.forEach((header, index) => {
                    obj[header] = row[index] || '';
                  });
                  return obj;
                });

                tabDataMap.set(expectedTab, exactData); // Use expected tab name as key
                console.log(`Processed tab ${expectedTab}: ${exactData.length} rows with headers:`, headers);
              } else {
                console.warn(`Tab ${matchingSheetName} is empty or has no data rows`);
              }
            } else {
              console.warn(`Expected tab ${expectedTab} not found in Excel file`);
            }
          }

          if (tabDataMap.size === 0) {
            reject(new Error('No valid campaign data tabs found. Expected: PRODUCT_RECOMMENDATION, PRODUCT_LISTING, or BRAND_BOOSTER'));
            return;
          }

          resolve(tabDataMap);
        } catch (error) {
          reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read Excel file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Validate campaign data structure and content for a specific tab
   * RELAXED: Only critical errors for missing required columns, warnings for missing optional data
   */
  static validateCampaignData(data: CampaignCSVSchema[], tabName: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (data.length === 0) {
      errors.push({
        field: 'file',
        message: `Tab ${tabName} is empty or contains no valid data rows`
      });
      return { isValid: false, errors, warnings };
    }

    const config = EXCEL_TAB_CONFIGS[tabName];
    if (!config) {
      errors.push({
        field: 'tab',
        message: `Unrecognized tab name: ${tabName}`
      });
      return { isValid: false, errors, warnings };
    }

    // Check for required columns
    const firstRow = data[0];
    const availableColumns = Object.keys(firstRow);
    const normalizedAvailableColumns = availableColumns.map(col => 
      this.normalizeColumnName(col)
    );

    // RELAXED: Only check for CRITICAL required columns, warn about missing optional ones
    config.requiredColumns.forEach(requiredColumn => {
      const normalizedRequired = this.normalizeColumnName(requiredColumn);
      
      // Special handling for budget column - accept both "Budget Consumed" and "Estimated Budget Consumed"
      let columnFound = false;
      if (requiredColumn === 'Estimated Budget Consumed') {
        columnFound = normalizedAvailableColumns.includes(normalizedRequired) || 
                     normalizedAvailableColumns.includes(this.normalizeColumnName('Budget Consumed'));
      } else {
        columnFound = normalizedAvailableColumns.includes(normalizedRequired);
      }
      
      if (!columnFound) {
        // CRITICAL: Only fail for absolutely essential columns
        if (requiredColumn === 'Date' || requiredColumn === 'Campaign Name' || requiredColumn === 'Estimated Budget Consumed') {
          errors.push({
            field: requiredColumn,
            message: `Critical column '${requiredColumn}' is missing from tab ${tabName}`
          });
        } else {
          // RELAXED: Warn about missing columns but don't fail
          warnings.push({
            field: requiredColumn,
            message: `Column '${requiredColumn}' is missing from tab ${tabName}, will use default value`
          });
        }
      }
    });

    // RELAXED: Validate each row but don't fail on missing optional data
    data.forEach((row, index) => {
      // Check CRITICAL required fields only
      const criticalFields = ['Date', 'Campaign Name', 'Estimated Budget Consumed'];
      
      // Special case for BRAND_BOOSTER: Direct Sales is optional
      if (tabName !== 'BRAND_BOOSTER') {
        criticalFields.push('Direct Sales');
      }

      criticalFields.forEach(fieldName => {
        const normalizedField = this.normalizeColumnName(fieldName);
        let matchingColumn = availableColumns.find(col => 
          this.normalizeColumnName(col) === normalizedField
        );
        
        // Special handling for budget column - accept both "Budget Consumed" and "Estimated Budget Consumed"
        if (!matchingColumn && fieldName === 'Estimated Budget Consumed') {
          matchingColumn = availableColumns.find(col => 
            this.normalizeColumnName(col) === this.normalizeColumnName('Budget Consumed')
          );
        }
        
        if (matchingColumn) {
          const value = row[matchingColumn];
          if (value === undefined || value === '' || value === null) {
            // RELAXED: Only error for truly critical fields
            if (fieldName === 'Date' || fieldName === 'Campaign Name') {
              errors.push({
                field: fieldName,
                message: `${fieldName} is required and cannot be empty`,
                rowIndex: index + 1,
                value
              });
            } else {
              // RELAXED: Warn but don't fail for missing budget/sales data
              warnings.push({
                field: fieldName,
                message: `${fieldName} is missing in row ${index + 1}, will use default value 0`,
                rowIndex: index + 1,
                value
              });
            }
          }
        }
      });

      // Validate date field specifically
      const dateColumn = availableColumns.find(col => 
        this.normalizeColumnName(col) === 'date'
      );
      if (dateColumn && row[dateColumn]) {
        const date = this.parseDate(row[dateColumn].toString());
        if (!date || isNaN(date.getTime())) {
          warnings.push({
            field: 'date',
            message: `Could not parse date "${row[dateColumn]}" in tab ${tabName} (row ${index + 1})`,
            rowIndex: index + 1,
            value: row[dateColumn]
          });
        }
      }

      // RELAXED: Validate numeric fields but don't fail on parse errors
      const numericFields = ['impressions', 'ctr', 'estimatedbudgetconsumed', 'directsales', 'indirectsales', 'totalroas'];
      numericFields.forEach(field => {
        const matchingColumn = availableColumns.find(col => 
          this.normalizeColumnName(col) === field
        );
        
        if (matchingColumn && row[matchingColumn] !== undefined && row[matchingColumn] !== '') {
          // Use robust numeric parsing
          const cleanValue = String(row[matchingColumn]).replace(/[^\d.-]/g, '');
          const numValue = parseFloat(cleanValue);
          if (isNaN(numValue)) {
            warnings.push({
              field: field,
              message: `${field} "${row[matchingColumn]}" could not be parsed as number in tab ${tabName} (row ${index + 1}), will use 0`,
              rowIndex: index + 1,
              value: row[matchingColumn]
            });
          } else if (numValue < 0) {
            warnings.push({
              field: field,
              message: `${field} is negative (${numValue}) in tab ${tabName} (row ${index + 1})`,
              rowIndex: index + 1,
              value: row[matchingColumn]
            });
          }
        }
      });

      // RELAXED: Special validation for CTR (should be 0-100) - warn only
      const ctrColumn = availableColumns.find(col => 
        this.normalizeColumnName(col) === 'ctr'
      );
      if (ctrColumn && row[ctrColumn] !== undefined && row[ctrColumn] !== '') {
        const cleanValue = String(row[ctrColumn]).replace(/[^\d.-]/g, '');
        const ctrValue = parseFloat(cleanValue);
        if (!isNaN(ctrValue) && (ctrValue < 0 || ctrValue > 100)) {
          warnings.push({
            field: 'ctr',
            message: `CTR value ${ctrValue} is outside expected range 0-100% in tab ${tabName} (row ${index + 1})`,
            rowIndex: index + 1,
            value: row[ctrColumn]
          });
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
   * Transform raw campaign data to AdCampaignRecord objects
   * Handles missing columns gracefully with default values
   * ENHANCED: Robust numeric cleaning to handle ₹ symbols and commas
   * CRITICAL FIX: Proper funnel column mapping for all tabs
   */
  private static transformCampaignData(data: CampaignCSVSchema[], config: ExcelTabConfig): AdCampaignRecord[] {
    console.log(`🔧 TRANSFORMING ${config.tabName} with ${data.length} rows`);
    
    return data.map(row => {
      // Use EXACT Excel header names - no normalization for critical fields
      const dateColumn = 'Date';
      const campaignNameColumn = 'Campaign Name';
      const impressionsColumn = 'Impressions';
      const ctrColumn = 'CTR';
      // Handle both "Budget Consumed" and "Estimated Budget Consumed"
      const budgetColumn = row['Estimated Budget Consumed'] !== undefined ? 'Estimated Budget Consumed' : 'Budget Consumed';
      const directSalesColumn = 'Direct Sales'; // EXACT header
      const indirectSalesColumn = 'Indirect Sales';
      const roasColumn = 'Total RoAS'; // EXACT header
      const newUsersColumn = 'New Users Acquired'; // EXACT header
      const uniqueClicksColumn = 'Unique Clicks'; // EXACT header
      const directAtcColumn = 'Direct ATC'; // EXACT header
      const indirectAtcColumn = 'Indirect ATC';
      const quantitiesColumn = 'Quantities Sold';

      // Parse and validate values with enhanced logging and EXACT header matching
      const date = row[dateColumn] ? (this.parseDate(String(row[dateColumn])) || new Date()) : new Date();
      const campaignName = row[campaignNameColumn] ? String(row[campaignNameColumn]).trim() : '';
      
      // ENHANCED: Robust numeric parsing with currency symbol and comma handling
      const parseRobustNumber = (value: any): number => {
        if (value === undefined || value === null || value === '') return 0;
        // Use robust cleaning: remove ₹ symbols, commas, and other non-numeric characters except digits, dots, and minus
        const cleanValue = String(value).replace(/[^\d.-]/g, '');
        return parseFloat(cleanValue) || 0;
      };

      const impressions = parseRobustNumber(row[impressionsColumn]);
      const ctr = parseRobustNumber(row[ctrColumn]);
      const budgetConsumed = parseRobustNumber(row[budgetColumn]);
      
      console.log(`Parsing row - Budget from '${budgetColumn}':`, row[budgetColumn], '→', budgetConsumed);
      
      // Handle BRAND_BOOSTER missing Direct Sales gracefully
      const directSales = row[directSalesColumn] ? 
        parseRobustNumber(row[directSalesColumn]) : 
        (config.defaultValues.directSales || 0);
      
      console.log(`Parsing row - Direct Sales from '${directSalesColumn}':`, row[directSalesColumn], '→', directSales);
      
      const indirectSales = row[indirectSalesColumn] ? 
        parseRobustNumber(row[indirectSalesColumn]) || undefined : 
        (config.defaultValues.indirectSales || undefined);
      
      // Calculate RoAS if not provided
      let totalRoAS = row[roasColumn] ? parseRobustNumber(row[roasColumn]) : 0;
      if (totalRoAS === 0 && budgetConsumed > 0) {
        const totalSales = directSales + (indirectSales || 0);
        totalRoAS = totalSales / budgetConsumed;
      }

      // CRITICAL FIX: Extract optional fields with EXACT headers and robust parsing
      const newUsersAcquired = row[newUsersColumn] ? parseRobustNumber(row[newUsersColumn]) || undefined : undefined;
      
      // CRITICAL FIX: Unique Clicks mapping - ensure this is properly captured from ALL tabs
      // If 'Unique Clicks' column exists, use it; otherwise calculate from Impressions * (CTR / 100)
      let uniqueClicks = 0;
      if (row[uniqueClicksColumn] !== undefined && row[uniqueClicksColumn] !== '') {
        uniqueClicks = parseRobustNumber(row[uniqueClicksColumn]);
        console.log(`🔧 FUNNEL DEBUG - Tab: ${config.tabName}, Using existing Unique Clicks:`, row[uniqueClicksColumn], '→', uniqueClicks);
      } else if (impressions > 0 && ctr > 0) {
        uniqueClicks = Math.round(impressions * (ctr / 100));
        console.log(`🔧 FUNNEL DEBUG - Tab: ${config.tabName}, Calculated Unique Clicks: ${impressions} * (${ctr} / 100) =`, uniqueClicks);
      } else {
        console.log(`🔧 FUNNEL DEBUG - Tab: ${config.tabName}, No Unique Clicks data available, using 0`);
      }
      
      // CRITICAL FIX: Handle both Direct ATC and Indirect ATC with proper fallback
      const directAtc = parseRobustNumber(row[directAtcColumn]);
      const indirectAtc = parseRobustNumber(row[indirectAtcColumn]);
      const addToCart = directAtc; // Direct ATC for backward compatibility
      const indirectAddToCart = indirectAtc; // NEW: Separate Indirect ATC
      
      console.log(`🔧 FUNNEL DEBUG - Tab: ${config.tabName}, Direct ATC:`, directAtc, 'Indirect ATC:', indirectAtc);
      
      // CRITICAL FIX: Handle both Direct Quantities and Indirect Quantities
      const directQuantitiesColumn = 'Direct Quantities Sold'; // EXACT header
      const indirectQuantitiesColumn = 'Indirect Quantities Sold'; // EXACT header
      
      const directQuantities = row[directQuantitiesColumn] ? parseRobustNumber(row[directQuantitiesColumn]) : 0;
      const indirectQuantities = row[indirectQuantitiesColumn] ? parseRobustNumber(row[indirectQuantitiesColumn]) : 0;
      
      // Keep backward compatibility with single quantitiesSold field
      const quantitiesSold = row[quantitiesColumn] ? parseRobustNumber(row[quantitiesColumn]) : directQuantities;
      const indirectQuantitiesSold = indirectQuantities;

      console.log(`🔧 FUNNEL DEBUG - Tab: ${config.tabName}, Direct Quantities:`, directQuantities, 'Indirect Quantities:', indirectQuantities);

      // SAFETY CHECK: If AddToCart > UniqueClicks, flag in console logs
      const totalATC = directAtc + indirectAtc;
      if (totalATC > uniqueClicks && uniqueClicks > 0) {
        console.warn(`⚠️ FUNNEL ANOMALY - Tab: ${config.tabName}, Campaign: ${campaignName}, ATC (${totalATC}) > Clicks (${uniqueClicks})`);
      }

      // Try to extract SKU from campaign name or other fields
      const sku = this.extractSkuFromCampaignName(campaignName);

      // Log parsed campaign data for debugging
      console.log(`🔧 PARSED CAMPAIGN - Tab: ${config.tabName}:`, {
        date: date.toISOString().split('T')[0],
        campaignName,
        campaignType: config.campaignType,
        budgetConsumed,
        directSales,
        indirectSales,
        totalRoAS,
        newUsersAcquired,
        uniqueClicks,
        addToCart: directAtc,
        indirectAddToCart: indirectAtc,
        quantitiesSold,
        indirectQuantitiesSold
      });

      return {
        date,
        campaignName,
        campaignType: config.campaignType,
        impressions,
        ctr,
        budgetConsumed,
        directSales,
        indirectSales,
        totalRoAS,
        platform: PLATFORM.BLINKIT, // CRITICAL FIX 1: Ensure all campaigns have platform tag
        sku,
        newUsersAcquired,
        uniqueClicks,
        addToCart,
        indirectAddToCart, // NEW: Separate Indirect ATC field
        quantitiesSold,
        indirectQuantitiesSold // NEW: Separate Indirect Quantities field
      };
    });
  }

  /**
   * Normalize column names for flexible matching
   * Removes spaces, special characters, and converts to lowercase
   */
  private static normalizeColumnName(columnName: string): string {
    return columnName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Extract SKU from campaign name using common patterns
   * Looks for alphanumeric codes that might represent SKUs
   */
  private static extractSkuFromCampaignName(campaignName: string): string | undefined {
    if (!campaignName) return undefined;
    
    // Common SKU patterns: alphanumeric codes, often with dashes or underscores
    const skuPatterns = [
      /\b([A-Z0-9]{3,}-[A-Z0-9]{2,})\b/i, // Pattern like ABC123-XY
      /\b([A-Z]{2,}[0-9]{3,})\b/i,         // Pattern like ABC123
      /\b([0-9]{3,}[A-Z]{2,})\b/i,         // Pattern like 123ABC
      /SKU[:\s]*([A-Z0-9-_]+)/i,           // Explicit SKU: prefix
      /\b([A-Z0-9_-]{5,})\b/i              // Generic alphanumeric code
    ];

    for (const pattern of skuPatterns) {
      const match = campaignName.match(pattern);
      if (match && match[1]) {
        return match[1].toUpperCase();
      }
    }

    return undefined;
  }

  /**
   * Parse date string in various formats commonly found in Excel
   */
  /**
   * Parse date string in various formats commonly found in Excel
   * Handles Excel serial numbers and various string formats
   * FIXED: Timezone offset issue - ensures dates stay in local time
   */
  private static parseDate(dateString: string | number): Date | null {
    if (dateString === undefined || dateString === null || dateString === '') {
      return null;
    }

    // Convert to string for processing
    const dateStr = String(dateString).trim();
    
    if (dateStr === '') {
      return null;
    }

    // Handle Excel serial date numbers (e.g., 46023 for 01-01-2026)
    const numericDate = parseFloat(dateStr);
    if (!isNaN(numericDate) && numericDate > 25569) { // Excel epoch starts at 1900-01-01
      try {
        // Use XLSX library's built-in date parsing if available
        if (typeof XLSX.SSF !== 'undefined' && XLSX.SSF.parse_date_code) {
          const excelDate = XLSX.SSF.parse_date_code(numericDate);
          if (excelDate) {
            const jsDate = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
            // CRITICAL FIX: Set to noon to prevent timezone shifts
            jsDate.setHours(12, 0, 0, 0);
            console.log('Parsed Excel Serial Date:', numericDate, '→', jsDate.toISOString().split('T')[0]);
            return jsDate;
          }
        }
        
        // Fallback: Manual Excel serial date conversion
        // Excel serial date: days since 1900-01-01 (with leap year bug correction)
        const excelEpoch = new Date(1900, 0, 1);
        const jsDate = new Date(excelEpoch.getTime() + (numericDate - 2) * 24 * 60 * 60 * 1000);
        if (!isNaN(jsDate.getTime())) {
          // CRITICAL FIX: Set to noon to prevent timezone shifts
          jsDate.setHours(12, 0, 0, 0);
          console.log('Parsed Excel Serial Date (fallback):', numericDate, '→', jsDate.toISOString().split('T')[0]);
          return jsDate;
        }
      } catch (error) {
        console.warn('Excel date parsing failed for:', numericDate, error);
      }
    }

    // Try DD-MM-YYYY format first (common in the CSV)
    const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        // CRITICAL FIX: Set to noon to prevent timezone shifts
        date.setHours(12, 0, 0, 0);
        console.log('Parsed DD-MM-YYYY Date:', dateStr, '→', date.toISOString().split('T')[0]);
        return date;
      }
    }

    // Try MM/DD/YYYY format
    const mmddyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mmddyyyyMatch) {
      const [, month, day, year] = mmddyyyyMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        // CRITICAL FIX: Set to noon to prevent timezone shifts
        date.setHours(12, 0, 0, 0);
        console.log('Parsed MM/DD/YYYY Date:', dateStr, '→', date.toISOString().split('T')[0]);
        return date;
      }
    }

    // Try YYYY-MM-DD format (ISO)
    const yyyymmddMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (yyyymmddMatch) {
      const [, year, month, day] = yyyymmddMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        // CRITICAL FIX: Set to noon to prevent timezone shifts
        date.setHours(12, 0, 0, 0);
        console.log('Parsed YYYY-MM-DD Date:', dateStr, '→', date.toISOString().split('T')[0]);
        return date;
      }
    }

    // Try DD/MM/YYYY format
    const ddmmyyyy2Match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy2Match) {
      const [, day, month, year] = ddmmyyyy2Match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        // CRITICAL FIX: Set to noon to prevent timezone shifts
        date.setHours(12, 0, 0, 0);
        console.log('Parsed DD/MM/YYYY Date:', dateStr, '→', date.toISOString().split('T')[0]);
        return date;
      }
    }

    // Fall back to JavaScript's Date constructor
    const fallbackDate = new Date(dateStr);
    if (!isNaN(fallbackDate.getTime())) {
      // CRITICAL FIX: Set to noon to prevent timezone shifts
      fallbackDate.setHours(12, 0, 0, 0);
      console.log('Parsed Fallback Date:', dateStr, '→', fallbackDate.toISOString().split('T')[0]);
      return fallbackDate;
    }

    console.warn('Failed to parse date:', dateStr);
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