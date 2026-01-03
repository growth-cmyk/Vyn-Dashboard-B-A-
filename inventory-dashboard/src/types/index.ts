// Core data models for inventory and sales dashboard

/**
 * Platform identifier for multi-channel support
 */
export type Platform = 'Blinkit' | 'Amazon' | 'All';

/**
 * Platform constants for type safety
 */
export const PLATFORM = {
  BLINKIT: 'Blinkit' as const,
  AMAZON: 'Amazon' as const,
  ALL: 'All' as const
} as const;

/**
 * Platform-specific configuration
 */
export interface PlatformConfig {
  leadTime: number;
  referralFee?: number;
  brandColors: {
    primary: string;
    accent: string;
  };
  displayName: string;
  icon: string;
}

/**
 * Platform context for managing active platform state
 */
export interface PlatformContext {
  activePlatform: Platform;
  availablePlatforms: Platform[];
  platformConfig: Record<Platform, PlatformConfig>;
}

/**
 * Amazon-specific sales record structure (matches Amazon CSV headers)
 */
export interface AmazonSalesRecord {
  sku: string;
  'units-ordered': number;
  'item-price': number;
  'order-date': string;
  'customer-city'?: string;
  'customer-state'?: string;
  // Additional Amazon-specific fields can be added here
}

/**
 * Amazon-specific metrics for payout calculations
 */
export interface AmazonMetrics {
  grossRevenue: number;
  referralFee: number;
  estimatedPayout: number;
  feePercentage: number;
}

/**
 * Cumulative history data structure for file-based historical tracking
 */
export interface CumulativeHistoryData {
  uploadDates: Date[];
  dataByDate: Map<string, any[]>; // ISO date string -> inventory items
  latestDate: Date;
  earliestDate: Date;
  totalDaysOfHistory: number;
}

/**
 * Represents an inventory item with stock levels and sales velocity data
 */
export interface InventoryItem {
  itemId: string;
  itemName: string;
  brandName: string;
  upc: string;
  uom: string;
  warehouseFacilityId: string;
  warehouseFacilityName: string;
  totalSellable: number;
  incomingScheduled: number;
  totalUnsellable: number;
  last7Days: number;
  last15Days: number;
  last30Days: number;
  // Platform support - defaults to 'Blinkit' for backward compatibility
  platform?: Platform;
  platformSpecificMetrics?: {
    platformLeadTime: number;
    platformSafetyStock: number;
    channelSpecificVelocity: number;
  };
  // NEW: Upload date support for file-based history
  uploadDate?: Date | string; // Optional for backward compatibility
}

/**
 * Represents a sales transaction record
 */
export interface SalesRecord {
  orderId: string;
  orderDate: Date;
  itemId: string;
  productName: string;
  brandName: string;
  upc: string;
  supplyCity: string;
  supplyState: string;
  customerCity: string;
  customerState: string;
  quantity: number;
  sellingPrice: number;
  // Platform support - defaults to 'Blinkit' for backward compatibility
  platform?: Platform;
  platformSpecificData?: {
    amazonSku?: string;
    blinkitItemId?: string;
    referralFee?: number;
    estimatedPayout?: number;
  };
}

/**
 * Represents calculated stock analysis for an item at a location (Updated for Strategic Roadmap)
 */
export interface StockAnalysis {
  itemId: string;
  warehouseFacilityId: string;
  currentStock: number;
  salesVelocity: number;
  daysOfCover: number;
  stockStatus: StockStatus;
  recommendedAction: string;
  reorderQuantity?: number; // For understock items
  leadTime: number; // Default 7 days
  safetyStock: number; // Default 3 days * sales velocity
}

/**
 * Replenishment recommendation for understock items
 */
export interface ReplenishmentRecommendation {
  itemId: string;
  itemName: string;
  warehouseFacilityId: string;
  warehouseFacilityName: string;
  currentStock: number;
  salesVelocity: number;
  daysOfCover: number;
  recommendedOrderQuantity: number;
  leadTime: number;
  safetyStock: number;
  urgencyScore: number; // For sorting by priority
}

/**
 * Stock status classification based on 6-month expiry thresholds (Strategic Roadmap)
 */
export type StockStatus = 'out-of-stock' | 'understock' | 'healthy' | 'overstock' | 'expiry-risk';

/**
 * Stock status constants for type safety (Updated for Strategic Roadmap)
 */
export const STOCK_STATUS = {
  OUT_OF_STOCK: 'out-of-stock' as const,
  UNDERSTOCK: 'understock' as const,
  HEALTHY: 'healthy' as const,
  OVERSTOCK: 'overstock' as const,
  EXPIRY_RISK: 'expiry-risk' as const
} as const;

/**
 * Time period options for sales analysis
 */
export type TimePeriod = 'last-month' | 'mtd' | 'ytd' | 'last-7-days' | 'last-15-days' | 'last-30-days';

/**
 * Time period constants for type safety
 */
export const TIME_PERIOD = {
  LAST_MONTH: 'last-month' as const,
  MONTH_TO_DATE: 'mtd' as const,
  YEAR_TO_DATE: 'ytd' as const,
  LAST_7_DAYS: 'last-7-days' as const,
  LAST_15_DAYS: 'last-15-days' as const,
  LAST_30_DAYS: 'last-30-days' as const
} as const;

/**
 * Validation result for data integrity checks
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  rowIndex?: number;
  value?: any;
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  field: string;
  message: string;
  rowIndex?: number;
  value?: any;
}

/**
 * Sales aggregation result for time periods
 */
export interface SalesAggregation {
  period: TimePeriod;
  totalQuantity: number;
  totalRevenue: number;
  itemCount: number;
  locationCount: number;
  averagePrice: number;
}

/**
 * Stock issue report summary (Updated for Strategic Roadmap)
 */
export interface StockIssueReport {
  outOfStockItems: StockAnalysis[];
  understockItems: StockAnalysis[];
  overstockItems: StockAnalysis[];
  expiryRiskItems?: StockAnalysis[]; // New for Strategic Roadmap
  totalIssues: number;
  criticalIssues: number;
}

/**
 * CSV column mapping for inventory data (matches actual CSV headers)
 */
export interface InventoryCSVSchema {
  itemid: string;
  itemname: string;
  brandname: string;
  upc: string;
  uom: string;
  warehousefacilityid: string;
  warehousefacilityname: string;
  totalsellable: string;
  incomingscheduled: string;
  totalunsellable: string;
  last7days: string;
  last15days: string;
  last30days: string;
}

/**
 * CSV column mapping for sales data (matches actual CSV headers)
 */
export interface SalesCSVSchema {
  orderid: string;
  orderdate: string;
  itemid: string;
  productname: string;
  brandname: string;
  upc: string;
  supplycity: string;
  supplystate: string;
  customercity: string;
  customerstate: string;
  quantity: string;
  sellingpricers: string;
}

/**
 * CSV column mapping for Amazon sales data (matches Amazon CSV headers)
 */
export interface AmazonCSVSchema {
  sku: string;
  'units-ordered': string;
  'item-price': string;
  'order-date': string;
  'customer-city'?: string;
  'customer-state'?: string;
  // Additional Amazon fields can be mapped here
}

/**
 * Platform-aware inventory snapshot for historical tracking
 */
export interface InventorySnapshot {
  timestamp: Date;
  itemId: string;
  warehouseFacilityId: string;
  totalSellable: number;
  uploadSource: string;
  // Platform support for independent tracking
  platform: Platform;
  platformMetadata: {
    uploadSource: string;
    dataFormat: 'blinkit' | 'amazon';
    recordCount: number;
    dateRange?: {
      earliest: Date;
      latest: Date;
      uniqueDates: number;
    };
  };
  // NEW: File-based date support
  fileUploadDate?: Date; // When present, indicates file-based history
  isFileBasedHistory?: boolean; // Flag to distinguish from localStorage snapshots
}

/**
 * CSV column mapping for Master Inventory data (simplified format)
 * Flexible schema that can handle various column names for the same data
 */
export interface MasterInventoryCSVSchema {
  [key: string]: string; // Flexible to handle different column names
}

/**
 * Required columns for inventory CSV validation
 */
export const REQUIRED_INVENTORY_COLUMNS: (keyof InventoryCSVSchema)[] = [
  'itemid',
  'itemname',
  'brandname',
  'warehousefacilityid',
  'warehousefacilityname',
  'totalsellable'
];

/**
 * Required columns for Master Inventory CSV (flexible matching)
 */
export const REQUIRED_MASTER_INVENTORY_FIELDS = [
  'itemId', // Can match: Item ID, Item, SKU
  'location', // Can match: Location, Warehouse, Facility
  'totalSellable' // Can match: Total Sellable, Sellable, Stock, Quantity
] as const;

/**
 * Required columns for sales CSV validation
 */
export const REQUIRED_SALES_COLUMNS: (keyof SalesCSVSchema)[] = [
  'orderid',
  'orderdate',
  'itemid',
  'productname',
  'quantity',
  'sellingpricers'
];

/**
 * Required columns for Amazon CSV validation
 */
export const REQUIRED_AMAZON_COLUMNS: (keyof AmazonCSVSchema)[] = [
  'sku',
  'units-ordered',
  'item-price',
  'order-date'
];

/**
 * Platform configuration with business rules and theming
 */
export const PLATFORM_CONFIG: Record<Platform, PlatformConfig> = {
  'Blinkit': {
    leadTime: 15, // 15-day lead time for Blinkit
    brandColors: {
      primary: '#F36F21', // Vyndo Orange
      accent: '#2D6A4F'   // Millet Green
    },
    displayName: 'Blinkit',
    icon: 'ShoppingBag'
  },
  'Amazon': {
    leadTime: 7, // 7-day lead time for Amazon
    referralFee: 0.15, // 15% referral fee
    brandColors: {
      primary: '#FF9900', // Amazon Orange
      accent: '#146EB4'   // Amazon Blue
    },
    displayName: 'Amazon',
    icon: 'Box'
  },
  'All': {
    leadTime: 0, // Calculated per item based on platform
    brandColors: {
      primary: '#6B7280', // Neutral Gray
      accent: '#4F46E5'   // Neutral Purple
    },
    displayName: 'All Platforms',
    icon: 'Layers'
  }
};

/**
 * Validation schema for inventory items
 */
export interface InventoryValidationSchema {
  itemId: {
    required: true;
    type: 'string';
    minLength: 1;
  };
  itemName: {
    required: true;
    type: 'string';
    minLength: 1;
  };
  brandName: {
    required: true;
    type: 'string';
    minLength: 1;
  };
  upc: {
    required: false;
    type: 'string';
  };
  uom: {
    required: false;
    type: 'string';
  };
  warehouseFacilityId: {
    required: true;
    type: 'string';
    minLength: 1;
  };
  warehouseFacilityName: {
    required: true;
    type: 'string';
    minLength: 1;
  };
  totalSellable: {
    required: true;
    type: 'number';
    min: 0;
  };
  incomingScheduled: {
    required: false;
    type: 'number';
    min: 0;
  };
  totalUnsellable: {
    required: false;
    type: 'number';
    min: 0;
  };
  last7Days: {
    required: false;
    type: 'number';
    min: 0;
  };
  last15Days: {
    required: false;
    type: 'number';
    min: 0;
  };
  last30Days: {
    required: false;
    type: 'number';
    min: 0;
  };
}

/**
 * Filter criteria for inventory and sales data
 */
export interface FilterCriteria {
  locations?: string[];
  skus?: string[];
  searchTerm?: string;
  timePeriod?: TimePeriod;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Validation schema for sales records
 */
export interface SalesValidationSchema {
  orderId: {
    required: true;
    type: 'string';
    minLength: 1;
  };
  orderDate: {
    required: true;
    type: 'date';
  };
  itemId: {
    required: true;
    type: 'string';
    minLength: 1;
  };
  productName: {
    required: true;
    type: 'string';
    minLength: 1;
  };
  brandName: {
    required: false;
    type: 'string';
  };
  upc: {
    required: false;
    type: 'string';
  };
  supplyCity: {
    required: false;
    type: 'string';
  };
  supplyState: {
    required: false;
    type: 'string';
  };
  customerCity: {
    required: false;
    type: 'string';
  };
  customerState: {
    required: false;
    type: 'string';
  };
  quantity: {
    required: true;
    type: 'number';
    min: 0;
  };
  sellingPrice: {
    required: true;
    type: 'number';
    min: 0;
  };
}