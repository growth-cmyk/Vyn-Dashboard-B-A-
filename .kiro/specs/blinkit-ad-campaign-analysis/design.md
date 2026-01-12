# Design Document: Blinkit Ad Campaign Analysis

## Overview

The Blinkit Ad Campaign Analysis module integrates advertising campaign data with existing inventory management to provide comprehensive marketing analytics and strategic insights. This system enables data-driven decision making by analyzing campaign performance, ROI metrics, and identifying strategic opportunities for ad spend optimization based on inventory levels.

The module extends the existing dashboard architecture with a new "Marketing Analysis" tab, implementing the same Premium Glassmorphism design system and 12-column Bento Grid layout used throughout the application.

## Architecture

### High-Level Architecture

The marketing analytics module follows the existing service-oriented architecture pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                    Marketing Dashboard UI                    │
├─────────────────────────────────────────────────────────────┤
│  Marketing KPI Cards  │  Campaign Charts  │  Sync Table    │
├─────────────────────────────────────────────────────────────┤
│              MarketingService (New)                         │
├─────────────────────────────────────────────────────────────┤
│  DataService (Enhanced)  │  AnalyticsService (Existing)    │
├─────────────────────────────────────────────────────────────┤
│              Multi-Tab Excel Parser (New)                   │
└─────────────────────────────────────────────────────────────┘
```

### Integration Points

1. **DataService Enhancement**: Extends existing CSV parsing to handle multi-tab Excel files using the `xlsx` library
2. **MarketingService**: New service for campaign analytics and cross-service synchronization
3. **AnalyticsService Integration**: Leverages existing stock status classification for ad-inventory correlation
4. **UI Integration**: Adds new tab to existing dashboard navigation system

## Components and Interfaces

### 1. Enhanced DataService

**New Methods:**
- `loadExcelCampaignData(file: File): Promise<AdCampaignRecord[]>`
- `parseMultiTabExcel(file: File): Promise<Map<string, any[]>>`
- `validateCampaignData(data: any[], tabName: string): ValidationResult`

**Excel Processing Logic:**
```typescript
// Handle multi-tab Excel files
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
const sheets = ['PRODUCT_RECOMMENDATION', 'PRODUCT_LISTING', 'BRAND_BOOSTER'];

sheets.forEach(sheetName => {
  if (workbook.SheetNames.includes(sheetName)) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    // Process and validate data
  }
});
```

**Error Handling:**
- Graceful handling of missing tabs
- BRAND_BOOSTER tab may lack "Direct Sales" column - assign null/0 values
- Validation for required columns per tab type

### 2. New MarketingService

**Core Responsibilities:**
- Campaign data aggregation and analysis
- RoAS calculations: `(Direct Sales + Indirect Sales) / Estimated Budget Consumed`
- Cross-service integration with AnalyticsService for inventory status
- Strategic recommendation generation

**Key Methods:**
```typescript
class MarketingService {
  static calculateRoAS(campaign: AdCampaignRecord): number
  static aggregateKPIMetrics(campaigns: AdCampaignRecord[]): MarketingKPIs
  static generateAdInventorySync(campaigns: AdCampaignRecord[], inventory: InventoryItem[]): AdInventorySyncItem[]
  static getStrategicRecommendation(adSpend: number, stockStatus: StockStatus): string
}
```

**Cross-Service Communication:**
```typescript
// MarketingService reaches out to AnalyticsService
const stockAnalysis = AnalyticsService.analyzeStock(inventoryItem);
const recommendation = this.getStrategicRecommendation(
  campaignSpend, 
  stockAnalysis.stockStatus
);
```

### 3. New Marketing Dashboard Components

**MarketingAnalysis.tsx** - Main container component
**MarketingKPICards.tsx** - Top row KPI display
**CampaignCharts.tsx** - Spend vs Revenue trends and Funnel analysis
**AdInventorySync.tsx** - Strategic correlation table

## Data Models

### AdCampaignRecord Interface

```typescript
interface AdCampaignRecord {
  date: Date;
  campaignName: string;
  campaignType: 'Product Recommendation' | 'Product Listing' | 'Brand Booster';
  impressions: number;
  ctr: number; // Click-through rate as percentage
  budgetConsumed: number;
  directSales: number;
  indirectSales?: number; // Optional, may not be in all tabs
  totalRoAS: number;
  // Derived fields
  sku?: string; // Extracted from campaign data if available
  newUsersAcquired?: number; // From listing/recommendation tabs
}
```

### MarketingKPIs Interface

```typescript
interface MarketingKPIs {
  totalAdSpend: number;
  totalAdSales: number;
  averageRoAS: number;
  newCustomerAcquisition: number;
  campaignCount: number;
  topPerformingCampaign: string;
}
```

### AdInventorySyncItem Interface

```typescript
interface AdInventorySyncItem {
  sku: string;
  campaignName: string;
  adSpend: number;
  inventoryStatus: StockStatus;
  strategicAction: 'High ROI Opportunity: Scale Ads' | 'Pause Ads: Low Inventory Risk' | 'Monitor';
  daysOfCover?: number;
  recommendedAction: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated to eliminate redundancy:

- Tab mapping properties (1.2, 1.3, 1.4, 2.3) can be combined into a single comprehensive tab-to-type mapping property
- Data validation properties (2.1, 2.2, 2.4, 2.5, 2.6, 2.7) can be combined into a comprehensive data validation property
- Filter responsiveness properties (4.5, 5.6, 7.1, 7.2, 7.3) can be combined into a comprehensive filter integration property
- Chart styling properties (5.2, 5.3) can be combined into a single color scheme property

### Core Properties

**Property 1: Multi-tab Excel Processing**
*For any* Excel file with valid campaign tabs, the parser should successfully process all recognized tabs (PRODUCT_RECOMMENDATION, PRODUCT_LISTING, BRAND_BOOSTER) and handle missing tabs gracefully
**Validates: Requirements 1.1, 1.6**

**Property 2: Campaign Type Mapping**
*For any* valid tab name, the system should correctly map PRODUCT_RECOMMENDATION to "Product Recommendation", PRODUCT_LISTING to "Product Listing", and BRAND_BOOSTER to "Brand Booster"
**Validates: Requirements 1.2, 1.3, 1.4, 2.3**

**Property 3: Data Extraction Completeness**
*For any* valid campaign data row, the system should extract all required fields (Date, Campaign Name, Impressions, CTR, Budget Consumed, Direct Sales, Total RoAS) with proper data types
**Validates: Requirements 1.5**

**Property 4: AdCampaignRecord Validation**
*For any* created AdCampaignRecord, all fields should meet validation criteria: valid date, non-empty campaign name, non-negative impressions/budget/sales, CTR between 0-100%, and correctly calculated RoAS
**Validates: Requirements 2.1, 2.2, 2.4, 2.5, 2.6, 2.7, 2.8**

**Property 5: KPI Calculation Accuracy**
*For any* set of campaign records, Total Ad Spend should equal sum of Budget Consumed, Total Ad Sales should equal sum of Direct + Indirect Sales, and Average RoAS should be correctly calculated from all campaigns
**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

**Property 6: Strategic Recommendation Logic**
*For any* SKU with high ad spend, if inventory status is "Flash Promo" then recommendation should be "High ROI Opportunity: Scale Ads", if status is "Restock Now" then recommendation should be "Pause Ads: Low Inventory Risk"
**Validates: Requirements 6.2, 6.3**

**Property 7: Ad-Inventory Sync Completeness**
*For any* generated sync table, each row should contain SKU identifier, current inventory status, ad spend amount, and strategic recommendation
**Validates: Requirements 6.1, 6.4**

**Property 8: Global Filter Integration**
*For any* filter change (time period or platform), all marketing dashboard components (KPI cards, charts, tables) should update to reflect only the filtered data
**Validates: Requirements 4.5, 5.6, 7.1, 7.2, 7.3**

**Property 9: Filter State Persistence**
*For any* navigation between dashboard tabs, filter settings should remain unchanged and continue to affect displayed data
**Validates: Requirements 3.5, 7.4**

**Property 10: Export Data Integrity**
*For any* export operation, the exported data should include all visible KPI metrics, respect current filter settings, and maintain proper formatting with column headers
**Validates: Requirements 8.2, 8.3, 8.5**

**Property 11: Real-time Recommendation Updates**
*For any* change in inventory status, strategic recommendations in the Ad-Inventory Sync table should update immediately to reflect the new status
**Validates: Requirements 6.5**

**Property 12: Table Sorting Functionality**
*For any* sort operation on the Ad-Inventory Sync table, records should be correctly ordered by ad spend amount or inventory risk level
**Validates: Requirements 6.6**

## Error Handling

### Excel File Processing Errors

1. **Missing Tabs**: If expected tabs are not found, log warning and continue with available tabs
2. **Malformed Data**: Skip invalid rows and continue processing valid records
3. **Missing Columns**: For BRAND_BOOSTER tab lacking "Direct Sales", assign 0 value
4. **Date Parsing**: Handle various date formats and provide fallback for unparseable dates
5. **Numeric Validation**: Convert string numbers and handle non-numeric values gracefully

### Data Integration Errors

1. **SKU Mismatch**: When campaign SKUs don't match inventory items, flag for manual review
2. **Missing Inventory Data**: Handle cases where advertised SKUs have no inventory records
3. **Calculation Errors**: Validate RoAS calculations and handle division by zero scenarios

### UI Error States

1. **Empty Data**: Display appropriate messaging when no campaign data is available
2. **Filter No Results**: Show empty state when filters return no matching records
3. **Chart Rendering**: Handle cases with insufficient data for meaningful visualizations
4. **Export Failures**: Provide user feedback for failed export operations

## Testing Strategy

### Dual Testing Approach

The system will be validated using both unit tests and property-based tests:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs
- Both approaches are complementary and necessary for comprehensive coverage

### Property-Based Testing Configuration

- **Testing Library**: fast-check for TypeScript/JavaScript property-based testing
- **Test Iterations**: Minimum 100 iterations per property test
- **Test Tagging**: Each property test tagged with format: **Feature: blinkit-ad-campaign-analysis, Property {number}: {property_text}**

### Unit Testing Focus Areas

- Excel file parsing with various tab configurations
- Campaign type mapping edge cases
- RoAS calculation accuracy with boundary values
- Strategic recommendation logic with different inventory states
- UI component rendering with empty and populated data states
- Filter integration across dashboard components
- Export functionality with different data sets

### Property Testing Focus Areas

- Data validation across randomly generated campaign records
- KPI calculations with various campaign data combinations
- Filter responsiveness with random filter combinations
- Strategic recommendations with random inventory/campaign pairings
- Export integrity with random data sets and filter states

### Integration Testing

- End-to-end Excel upload and processing workflow
- Cross-service communication between MarketingService and AnalyticsService
- Dashboard navigation and state management
- Real-time updates when inventory data changes

## UI Design Specifications

### Marketing Cockpit Layout

The Marketing Analysis dashboard implements a 12-column Bento Grid layout with Premium Glassmorphism styling:

```
┌─────────────────────────────────────────────────────────────┐
│                    Marketing Analysis                        │
├─────────────────────────────────────────────────────────────┤
│  Total Ad    │  Total Ad   │  Average   │  New Customer    │
│  Spend       │  Sales      │  RoAS      │  Acquisition     │
│  (3 cols)    │  (3 cols)   │  (3 cols)  │  (3 cols)        │
├─────────────────────────────────────────────────────────────┤
│              Spend vs Revenue Trend Chart                   │
│                     (12 cols)                               │
├─────────────────────────────────────────────────────────────┤
│  Funnel Analysis Chart    │    Ad vs Inventory Sync Table  │
│      (6 cols)             │           (6 cols)              │
└─────────────────────────────────────────────────────────────┘
```

### Color Scheme

- **Ad Spend Lines**: Vyndo Orange (#ef5326)
- **Revenue Lines**: Millet Green (#2d6a4f)
- **Background**: Premium Glassmorphism with backdrop blur
- **Cards**: White background with subtle shadows and rounded corners

### Ad vs Inventory Sync Table

**Centerpiece Component** with columns:
- Campaign Name
- Ad Spend (formatted as currency)
- Inventory Status (color-coded badges)
- Strategic Action (actionable recommendations)

**Interactive Features:**
- Sortable by Ad Spend and Inventory Risk Level
- Filterable by inventory status
- Exportable with recommendations included
- Real-time updates when inventory changes

### Navigation Integration

- **Tab Icon**: Megaphone (primary) or BarChart (alternative)
- **Tab Label**: "Marketing Analysis"
- **Position**: Added to existing sidebar navigation
- **State Management**: Integrates with existing global filter system

<function_calls>
<invoke name="prework">
<parameter name="featureName">blinkit-ad-campaign-analysis