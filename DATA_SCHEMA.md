# Vyndo Analytics Platform v2.0 - Data Schema

## Overview
This document defines all data structures, types, and schemas used in the Vyndo Analytics Platform, including cloud persistence models, statistical ROP calculations, and Executive Command Center v2.0 predictive analytics types.

## Core Data Types

### Platform
```typescript
type Platform = 'Blinkit' | 'Amazon' | 'All';
```

### UserRole (NEW in v2.0)
```typescript
type UserRole = 'founder' | 'warehouse';
```

### InventoryItem
```typescript
interface InventoryItem {
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
  platform?: Platform;
  uploadDate?: Date | string;
  monthlyDemand?: number[]; // 12-month demand history for Statistical ROP
}
```

### SalesRecord
```typescript
interface SalesRecord {
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
  platform?: Platform;
  platformSpecificData?: {
    amazonSku?: string;
    blinkitItemId?: string;
    referralFee?: number;
    estimatedPayout?: number;
  };
}
```

### AdCampaignRecord
```typescript
interface AdCampaignRecord {
  date: Date;
  campaignName: string;
  campaignType: 'Product Recommendation' | 'Product Listing' | 'Brand Booster';
  impressions: number;
  ctr: number;
  budgetConsumed: number;
  directSales: number;
  indirectSales?: number;
  totalRoAS: number;
  platform?: Platform;
  sku?: string;
  newUsersAcquired?: number;
  uniqueClicks?: number;
  addToCart?: number;
  indirectAddToCart?: number;
  quantitiesSold?: number;
  indirectQuantitiesSold?: number;
}
```

## Executive Command Center v2.0 Types (NEW)

### SalesDataPoint
```typescript
interface SalesDataPoint {
  date: Date;
  quantity: number;
  sku: string;
  platform: 'blinkit' | 'amazon';
}
```

### UrgencyLevel
```typescript
interface UrgencyLevel {
  level: 1 | 2 | 3;
  label: 'Critical' | 'High' | 'Medium';
  color: 'red' | 'yellow' | 'green';
}
```

### PriorityShippingItem
```typescript
interface PriorityShippingItem {
  sku: string;
  productName: string;
  currentStock: number;
  statisticalROP: number;
  stockoutDate: Date | null;
  urgencyLevel: UrgencyLevel;
  targetFeeder: string;
  quantityToShip: number;
  salesVelocity: number;
}
```

### BrandHealthMetrics
```typescript
interface BrandHealthMetrics {
  overallScore: number;           // 0-100
  stockAvailability: number;      // 0-100
  turnoverRate: number;           // 0-100
  expiryRisk: number;             // 0-100
  replenishmentEfficiency: number; // 0-100
  platformScores?: {
    blinkit?: number;
    amazon?: number;
  };
  trend?: 'up' | 'down' | 'stable';
  trendPercentage?: number;
}
```

### GeographicDataPoint
```typescript
interface GeographicDataPoint {
  region: string;                 // 'Ahmedabad', 'Mumbai', 'Bangalore'
  salesVolume: number;            // Total units sold
  revenue: number;                // Total revenue
  growthRate: number;             // Percentage growth
  roi?: number;                   // Return on investment
  marketShare?: number;           // Percentage of total market
}
```

### SKUMovementStatus (NEW in v2.0)
```typescript
type SKUMovementStatus = 'Moving' | 'Idle' | 'Critical';

interface SKUMovementItem {
  sku: string;
  productName: string;
  status: SKUMovementStatus;
  velocity: number;               // Units per day
  currentStock: number;
  daysOfStock: number;
  lastMovement: number;           // Days since last sale
}

interface SKUMovementStats {
  moving: number;                 // Count of Moving SKUs
  idle: number;                   // Count of Idle SKUs
  critical: number;               // Count of Critical SKUs
}
```

## Cloud Persistence Models

### InventorySnapshot
```typescript
interface InventorySnapshot {
  timestamp: Date;
  itemId: string;
  warehouseFacilityId: string;
  totalSellable: number;
  uploadSource: string;
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
  fileUploadDate?: Date;
  isFileBasedHistory?: boolean;
}
```

### SyncStatus
```typescript
interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: Date | null;
  pendingOperations: number;
  status: 'synced' | 'syncing' | 'failed' | 'offline';
  message: string;
}
```

### BlobUploadResult
```typescript
interface BlobUploadResult {
  blobUrl: string;
  pathname: string;
  contentType: string;
  fileId: string;
  metadata: {
    filename: string;
    fileType: 'inventory' | 'sales' | 'campaign';
    platform: string;
    uploadTimestamp: string;
    fileSize: number;
  };
}
```

## Statistical ROP Models

### StatisticalROPResult
```typescript
interface StatisticalROPResult {
  rop: number;                    // Calculated Reorder Point (units)
  safetyStock: number;            // Calculated Safety Stock (units)
  avgMonthlyDemand: number;       // Average monthly demand over 12 months
  avgDailyDemand: number;         // Average daily demand
  standardDeviation: number;      // Standard deviation of monthly demand (σ)
  serviceLevel: number;           // Selected service level (%)
  zScore: number;                 // Z-score used for safety stock calculation
  leadTimeMonths: number;         // Lead time converted to months
  forecastQty: number;            // User-provided forecast quantity
  demandDuringLeadTime: number;   // Expected demand during lead time
  calculationMethod: 'statistical' | 'simple';
}
```

### Z-Score Table
```typescript
const Z_TABLE: Record<number, number> = {
  85: 1.04,   // 85% service level
  90: 1.28,   // 90% service level
  95: 1.64,   // 95% service level (default)
  98: 2.05,   // 98% service level
  99: 2.33,   // 99% service level
  99.8: 2.88  // 99.8% service level
};
```

## Supabase Database Schema

### inventory_history Table
```sql
CREATE TABLE inventory_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id VARCHAR(255) NOT NULL,
  warehouse_id VARCHAR(255) NOT NULL,
  total_sellable INTEGER NOT NULL,
  platform VARCHAR(50) NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL,
  snapshot_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  upload_source VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inventory_history_item_warehouse ON inventory_history (item_id, warehouse_id);
CREATE INDEX idx_inventory_history_platform_date ON inventory_history (platform, upload_date);
CREATE INDEX idx_inventory_history_snapshot_time ON inventory_history (snapshot_timestamp);
```

### file_uploads Table
```sql
CREATE TABLE file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  blob_url VARCHAR(500),
  upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processing_status VARCHAR(50) DEFAULT 'pending',
  platform VARCHAR(50) NOT NULL,
  record_count INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_file_uploads_platform ON file_uploads (platform);
CREATE INDEX idx_file_uploads_upload_time ON file_uploads (upload_timestamp);
CREATE INDEX idx_file_uploads_status ON file_uploads (processing_status);
```

### marketing_history Table
```sql
CREATE TABLE marketing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name VARCHAR(255) NOT NULL,
  campaign_type VARCHAR(100) NOT NULL,
  sku VARCHAR(255),
  platform VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  budget_consumed DECIMAL(10,2) NOT NULL DEFAULT 0,
  direct_sales DECIMAL(10,2) NOT NULL DEFAULT 0,
  indirect_sales DECIMAL(10,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,2) DEFAULT 0,
  add_to_cart INTEGER DEFAULT 0,
  indirect_add_to_cart INTEGER DEFAULT 0,
  quantities_sold INTEGER DEFAULT 0,
  indirect_quantities_sold INTEGER DEFAULT 0,
  new_users_acquired INTEGER DEFAULT 0,
  upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  upload_source VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_marketing_history_campaign_date ON marketing_history (campaign_name, date);
CREATE INDEX idx_marketing_history_platform_date ON marketing_history (platform, date);
CREATE INDEX idx_marketing_history_sku ON marketing_history (sku);
```

### user_preferences Table
```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL DEFAULT 'default_user',
  service_level DECIMAL(5,2) NOT NULL DEFAULT 95.0,
  forecast_quantities JSONB DEFAULT '{}'::JSONB,
  lead_time INTEGER DEFAULT 15,
  safety_days INTEGER DEFAULT 3,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences (user_id);
```

### sku_demand_history Table
```sql
CREATE TABLE sku_demand_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL DEFAULT 'default_user',
  item_id VARCHAR(255) NOT NULL,
  month_index INTEGER NOT NULL CHECK (month_index >= 0 AND month_index < 12),
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, item_id, month_index)
);

CREATE INDEX idx_sku_demand_history_user_item ON sku_demand_history (user_id, item_id);
CREATE INDEX idx_sku_demand_history_item_month ON sku_demand_history (item_id, month_index);
```

## CSV File Schemas

### Inventory CSV (Blinkit Format)
```csv
itemid,itemname,brandname,upc,uom,warehousefacilityid,warehousefacilityname,totalsellable,incomingscheduled,totalunsellable,last7days,last15days,last30days
```

### Sales CSV (Blinkit Format)
```csv
orderid,orderdate,itemid,productname,brandname,upc,supplycity,supplystate,customercity,customerstate,quantity,sellingpricers
```

### Amazon Sales CSV
```csv
sku,units-ordered,item-price,order-date,customer-city,customer-state
```

### Campaign Excel (Multi-Tab)
Tabs: PRODUCT_RECOMMENDATION, PRODUCT_LISTING, BRAND_BOOSTER

Required Columns:
- Date
- Campaign Name
- Estimated Budget Consumed
- Direct Sales

Optional Columns:
- Impressions
- CTR
- Indirect Sales
- Total RoAS
- New Users Acquired
- Unique Clicks
- Direct ATC
- Indirect ATC
- Quantities Sold

## Business Logic Constants

### Platform Configuration
```typescript
const PLATFORM_CONFIG: Record<Platform, PlatformConfig> = {
  'Blinkit': {
    leadTime: 15,
    brandColors: { primary: '#F36F21', accent: '#2D6A4F' },
    displayName: 'Blinkit',
    icon: 'ShoppingBag'
  },
  'Amazon': {
    leadTime: 7,
    referralFee: 0.15,
    brandColors: { primary: '#FF9900', accent: '#146EB4' },
    displayName: 'Amazon',
    icon: 'Box'
  },
  'All': {
    leadTime: 0,
    brandColors: { primary: '#6B7280', accent: '#4F46E5' },
    displayName: 'All Platforms',
    icon: 'Layers'
  }
};
```

### PredictionService Constants (NEW in v2.0)
```typescript
export const BLINKIT_LEAD_TIME = 15; // days
export const AMAZON_LEAD_TIME = 7;   // days
```

### Stock Status Thresholds
```typescript
const STOCK_THRESHOLDS = {
  OUT_OF_STOCK: 0,
  UNDERSTOCK_DAYS: 14,
  HEALTHY_MIN_DAYS: 14,
  HEALTHY_MAX_DAYS: 45,
  OVERSTOCK_DAYS: 45,
  EXPIRY_RISK_DAYS: 180
};
```

### SKU Movement Thresholds (NEW in v2.0)
```typescript
const SKU_MOVEMENT_THRESHOLDS = {
  MOVING_VELOCITY_MIN: 5,           // units/day
  MOVING_LAST_MOVEMENT_MAX: 7,      // days
  IDLE_VELOCITY_MAX: 1,             // units/day
  IDLE_LAST_MOVEMENT_MIN: 30,       // days
  CRITICAL_STOCKOUT_DAYS: 7         // days
};
```

### Stockout Alert Threshold (NEW in v2.0)
```typescript
const STOCKOUT_ALERT_THRESHOLD = 7; // days
```

## Data Validation Rules

### Required Inventory Fields
- itemId (non-empty string)
- itemName (non-empty string)
- brandName (non-empty string)
- warehouseFacilityId (non-empty string)
- warehouseFacilityName (non-empty string)
- totalSellable (non-negative number)

### Required Sales Fields
- orderId (non-empty string)
- orderDate (valid date)
- itemId (non-empty string)
- productName (non-empty string)
- quantity (positive number)
- sellingPrice (non-negative number)

### Required Campaign Fields
- date (valid date)
- campaignName (non-empty string)
- budgetConsumed (non-negative number)
- directSales (non-negative number)

## Data Flow Architecture

### Upload Flow
1. User uploads CSV/Excel file
2. DataService parses and validates file
3. Data transformed to internal models
4. StorageLayer saves to localStorage (immediate)
5. StorageLayer syncs to Supabase (if online)
6. BlobStorageService uploads file to Vercel Blob
7. File metadata saved to file_uploads table
8. Dashboard updates with new data

### Re-hydration Flow
1. App loads, checks for blob URLs in Supabase
2. BlobStorageService downloads latest files
3. DataService processes downloaded files
4. Dashboard populates with re-hydrated data
5. User sees last uploaded data automatically

### Demand Map Flow
1. User uploads Sales CSV
2. DataService.buildDemandMapFromSales() extracts 12-month demand
3. Demand map stored in memory (Map<itemId, number[]>)
4. StorageLayer.syncDemandHistory() saves to Supabase
5. AnalyticsService.calculateStatisticalROP() uses demand map
6. On app reload, demand map loaded from Supabase

### Priority Shipping Flow (NEW in v2.0)
1. User selects feeder warehouse in Regional Operations
2. PredictionService.generatePriorityShippingList() calculates urgency
3. List sorted by urgency level, stockout date, sales velocity
4. User clicks "Generate Shipping Manifest"
5. CSV file generated with all required columns
6. Browser downloads manifest file

### Stockout Alert Flow (NEW in v2.0)
1. App loads inventory data for active platform
2. stockoutAlerts.hasStockoutAlert() checks all SKUs
3. If any SKU has daysUntilStockout ≤ 7, alert triggered
4. Pulsing red dot appears on Regional Operations tab
5. Alert only visible in Warehouse Team role
6. Alert updates in real-time as inventory changes

## Version History
- **v1.0.0**: Initial data schema with core models
- **v1.1.0**: Added cloud persistence models, Statistical ROP types, demand history schema
- **v2.0.0**: Added Executive Command Center types, PredictionService models, role-based types, stockout alert schema

