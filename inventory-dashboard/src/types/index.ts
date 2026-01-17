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
  // NEW: Historical demand data for Statistical ROP Model
  /**
   * Array of 12 months of sales data (oldest to newest)
   * Index 0 = 12 months ago, Index 11 = current month
   * Used for calculating standard deviation and statistical safety stock
   * If not available, system falls back to simple ROP calculation
   */
  monthlyDemand?: number[];
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
 * Represents an advertising campaign record from Excel data
 */
export interface AdCampaignRecord {
  date: Date;
  campaignName: string;
  campaignType: CampaignType;
  impressions: number;
  ctr: number; // Click-through rate as percentage (0-100)
  budgetConsumed: number;
  directSales: number;
  indirectSales?: number; // Optional, may not be in all tabs
  totalRoAS: number;
  // Platform support - defaults to 'Blinkit' for backward compatibility
  platform?: Platform;
  // Derived fields
  sku?: string; // Extracted from campaign data if available
  newUsersAcquired?: number; // From listing/recommendation tabs
  uniqueClicks?: number; // For funnel analysis
  addToCart?: number; // For funnel analysis (Direct ATC)
  indirectAddToCart?: number; // For funnel analysis (Indirect ATC)
  quantitiesSold?: number; // For funnel analysis (Direct Quantities)
  indirectQuantitiesSold?: number; // For funnel analysis (Indirect Quantities)
}

/**
 * Campaign type classification based on Excel tab source
 */
export type CampaignType = 'Product Recommendation' | 'Product Listing' | 'Brand Booster';

/**
 * Campaign type constants for type safety
 */
export const CAMPAIGN_TYPE = {
  PRODUCT_RECOMMENDATION: 'Product Recommendation' as const,
  PRODUCT_LISTING: 'Product Listing' as const,
  BRAND_BOOSTER: 'Brand Booster' as const
} as const;

/**
 * Marketing KPI aggregation for dashboard display
 */
export interface MarketingKPIs {
  totalAdSpend: number;
  totalAdSales: number;
  averageRoAS: number;
  newCustomerAcquisition: number;
  campaignCount: number;
  topPerformingCampaign: string;
  totalImpressions: number;
  totalClicks: number;
  overallCTR: number;
}

/**
 * Ad-Inventory synchronization item for strategic analysis
 */
export interface AdInventorySyncItem {
  sku: string;
  campaignName: string;
  adSpend: number;
  inventoryStatus: StockStatus;
  strategicAction: StrategicAction;
  daysOfCover?: number;
  recommendedAction: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  // NEW: ROP-based fields for enhanced decision-making
  currentStock?: number;
  rop?: number;
  safetyStock?: number;
}

/**
 * Strategic action recommendations for ad-inventory correlation
 */
export type StrategicAction = 
  | 'SCALE ADS'
  | 'PAUSE ADS' 
  | 'OPTIMIZE'
  | 'MONITOR'
  | 'High ROI Opportunity: Scale Ads' 
  | 'Pause Ads: Low Inventory Risk' 
  | 'Monitor' 
  | 'Optimize Campaign';

/**
 * Strategic action constants for type safety
 * ENHANCED: Clear action labels for Elite SaaS interface
 */
export const STRATEGIC_ACTION = {
  SCALE_ADS: 'SCALE ADS' as const,
  PAUSE_ADS: 'PAUSE ADS' as const,
  MONITOR: 'MONITOR' as const,
  OPTIMIZE: 'OPTIMIZE' as const
} as const;

/**
 * Campaign performance trend data for charts
 */
export interface CampaignTrendData {
  date: string; // ISO date string
  adSpend: number;
  adRevenue: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
}

/**
 * Funnel analysis data for conversion tracking
 */
export interface FunnelAnalysisData {
  stage: 'Impressions' | 'Unique Clicks' | 'Add to Cart' | 'Quantities Sold';
  value: number;
  conversionRate?: number; // Percentage to next stage
}

/**
 * CSV column mapping for campaign data (flexible to handle different Excel formats)
 */
export interface CampaignCSVSchema {
  [key: string]: string | number | Date; // Flexible to handle various column names
}

/**
 * Excel tab configuration for campaign data processing
 */
export interface ExcelTabConfig {
  tabName: string;
  campaignType: CampaignType;
  requiredColumns: string[];
  optionalColumns: string[];
  defaultValues: Record<string, any>;
}

/**
 * Marketing filter criteria extending base FilterCriteria
 */
export interface MarketingFilterCriteria extends FilterCriteria {
  campaignTypes?: CampaignType[];
  minAdSpend?: number;
  maxAdSpend?: number;
  minRoAS?: number;
  maxRoAS?: number;
  strategicActions?: StrategicAction[];
}

/**
 * Excel tab configurations for campaign data processing
 * Updated to match exact Excel headers and handle missing columns gracefully
 */
export const EXCEL_TAB_CONFIGS: Record<string, ExcelTabConfig> = {
  'PRODUCT_RECOMMENDATION': {
    tabName: 'PRODUCT_RECOMMENDATION',
    campaignType: CAMPAIGN_TYPE.PRODUCT_RECOMMENDATION,
    requiredColumns: ['Date', 'Campaign Name', 'Estimated Budget Consumed', 'Direct Sales'],
    optionalColumns: ['Impressions', 'CTR', 'Indirect Sales', 'Total RoAS', 'New Users Acquired', 'Unique Clicks', 'Direct ATC', 'Indirect ATC', 'Quantities Sold', 'Direct Quantities Sold', 'Indirect Quantities Sold'],
    defaultValues: {
      impressions: 0,
      ctr: 0,
      indirectSales: 0,
      totalRoAS: 0,
      newUsersAcquired: 0,
      uniqueClicks: 0,
      addToCart: 0,
      indirectAddToCart: 0,
      quantitiesSold: 0,
      indirectQuantitiesSold: 0
    }
  },
  'PRODUCT_LISTING': {
    tabName: 'PRODUCT_LISTING',
    campaignType: CAMPAIGN_TYPE.PRODUCT_LISTING,
    requiredColumns: ['Date', 'Campaign Name', 'Estimated Budget Consumed', 'Direct Sales'],
    optionalColumns: ['Impressions', 'CTR', 'Indirect Sales', 'Total RoAS', 'New Users Acquired', 'Unique Clicks', 'Direct ATC', 'Indirect ATC', 'Quantities Sold', 'Direct Quantities Sold', 'Indirect Quantities Sold'],
    defaultValues: {
      impressions: 0,
      ctr: 0,
      indirectSales: 0,
      totalRoAS: 0,
      newUsersAcquired: 0,
      uniqueClicks: 0,
      addToCart: 0,
      indirectAddToCart: 0,
      quantitiesSold: 0,
      indirectQuantitiesSold: 0
    }
  },
  'BRAND_BOOSTER': {
    tabName: 'BRAND_BOOSTER',
    campaignType: CAMPAIGN_TYPE.BRAND_BOOSTER,
    requiredColumns: ['Date', 'Campaign Name', 'Estimated Budget Consumed'],
    optionalColumns: ['Impressions', 'CTR', 'Direct Sales', 'Indirect Sales', 'Total RoAS', 'Unique Clicks', 'Direct ATC', 'Indirect ATC', 'Quantities Sold', 'Direct Quantities Sold', 'Indirect Quantities Sold'],
    defaultValues: {
      impressions: 0,
      ctr: 0,
      directSales: 0,
      indirectSales: 0,
      totalRoAS: 0,
      uniqueClicks: 0,
      addToCart: 0,
      indirectAddToCart: 0,
      quantitiesSold: 0,
      indirectQuantitiesSold: 0
    }
  }
} as const;
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


// ============================================================================
// Statistical ROP Model - Z-Table and Service Level Configuration
// ============================================================================

/**
 * Z-score mappings for service levels (Standard Normal Distribution)
 * Used for calculating statistical safety stock based on desired service level
 * 
 * Service Level = Probability of not experiencing a stockout during replenishment cycle
 * Z-score = Number of standard deviations from the mean
 * 
 * Example: 95% service level means 95% probability of meeting demand during lead time
 */
export const Z_TABLE: Record<number, number> = {
  85: 1.04,   // 85% service level
  90: 1.28,   // 90% service level
  95: 1.64,   // 95% service level (default)
  98: 2.05,   // 98% service level
  99: 2.33,   // 99% service level
  99.8: 2.88  // 99.8% service level
} as const;

/**
 * Default service level for statistical ROP calculations
 * 95% provides good balance between inventory costs and stockout risk
 */
export const DEFAULT_SERVICE_LEVEL = 95;

/**
 * Default Z-score corresponding to 95% service level
 */
export const DEFAULT_Z_SCORE = Z_TABLE[DEFAULT_SERVICE_LEVEL];

/**
 * Available service levels for user selection
 */
export const SERVICE_LEVELS = [85, 90, 95, 98, 99, 99.8] as const;

/**
 * Statistical ROP calculation result
 * Contains all components of the Reorder Point calculation using statistical methods
 */
export interface StatisticalROPResult {
  /** Calculated Reorder Point (units) */
  rop: number;
  
  /** Calculated Safety Stock (units) */
  safetyStock: number;
  
  /** Average monthly demand over 12 months (units/month) */
  avgMonthlyDemand: number;
  
  /** Average daily demand (units/day) */
  avgDailyDemand: number;
  
  /** Standard deviation of monthly demand (σ) */
  standardDeviation: number;
  
  /** Selected service level (%) */
  serviceLevel: number;
  
  /** Z-score used for safety stock calculation */
  zScore: number;
  
  /** Lead time converted to months */
  leadTimeMonths: number;
  
  /** User-provided forecast quantity for demand spikes */
  forecastQty: number;
  
  /** Expected demand during lead time (units) */
  demandDuringLeadTime: number;
  
  /** Calculation method used */
  calculationMethod: 'statistical' | 'simple';
}

/**
 * Enhanced replenishment recommendation with Statistical ROP
 */
export interface EnhancedReplenishmentRecommendation extends ReplenishmentRecommendation {
  /** Statistical ROP calculation result */
  ropCalculation?: StatisticalROPResult;
  
  /** Current stock compared to ROP (negative = need to order) */
  currentStockVsROP?: number;
  
  /** Days until stock reaches ROP at current sales velocity */
  daysUntilROP?: number;
}
