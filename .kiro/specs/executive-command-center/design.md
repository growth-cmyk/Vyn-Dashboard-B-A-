# Design Document: Executive Command Center v2.0

## Overview

The Executive Command Center v2.0 transforms the existing inventory dashboard from a table-heavy data display into a visual-first, decision-oriented command center. The system implements a "Decision-First" UI architecture where visual gauges, charts, and progress indicators take precedence over tabular data. The design introduces three major architectural components: (1) a high-density executive dashboard with collapsible detail views, (2) a PredictionService for calculating stockout dates and urgency levels, and (3) a regional operations workflow that generates location-specific shipping manifests.

The system serves two distinct user personas with separate navigation paths: founders who need strategic brand health metrics and risk visibility, and warehouse employees who need tactical SKU movement data and priority shipping lists. All visualizations follow a consistent color scheme (green=healthy, yellow=warning, red=critical) and replace static tables with interactive charts backed by collapsible detail views.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Executive Command Center                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  Executive View  │         │  Regional Ops    │          │
│  │  (Founders)      │         │  (Employees)     │          │
│  └────────┬─────────┘         └────────┬─────────┘          │
│           │                            │                     │
│           └────────────┬───────────────┘                     │
│                        │                                     │
│           ┌────────────▼────────────┐                        │
│           │   Presentation Layer    │                        │
│           │  - Visual Components    │                        │
│           │  - Chart Renderers      │                        │
│           │  - Progress Rings       │                        │
│           └────────────┬────────────┘                        │
│                        │                                     │
│           ┌────────────▼────────────┐                        │
│           │    Service Layer        │                        │
│           │  - PredictionService    │                        │
│           │  - AnalyticsService     │                        │
│           │  - DataService          │                        │
│           │  - ReplenishmentService │                        │
│           │  - MarketingService     │                        │
│           └────────────┬────────────┘                        │
│                        │                                     │
│           ┌────────────▼────────────┐                        │
│           │     Data Layer          │                        │
│           │  - Supabase             │                        │
│           │  - Vercel Blob          │                        │
│           │  - Local State          │                        │
│           └─────────────────────────┘                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Decision-First UI Architecture

The UI follows a "visual-first, details-on-demand" pattern:

1. **Primary Layer**: Large visual gauges, charts, and progress rings
2. **Secondary Layer**: Collapsible tables and detailed breakdowns
3. **Action Layer**: Prominent buttons for workflow execution

Each view prioritizes visual comprehension over data density. Users see the "what" (charts) before the "how much" (tables).

### Component Hierarchy

```
ExecutiveCommandCenter
├── NavigationToggle (Executive / Regional Ops)
├── ExecutiveDashboard
│   ├── BrandHealthGauge
│   ├── CashAtRiskCard
│   ├── GeographicSalesMap
│   ├── AdEfficiencyMap
│   └── CollapsibleDetailTables
└── RegionalOperationsView
    ├── FeederWarehouseSelector
    ├── SKUMovementDashboard
    │   ├── MovementStatusChart
    │   ├── VelocityProgressRings
    │   └── CollapsibleSKUTable
    └── PriorityShippingPanel
        ├── UrgencyLevelChart
        ├── ShippingListTable
        └── GenerateManifestButton
```

## Components and Interfaces

### 1. PredictionService

The PredictionService is the core analytical engine that calculates stockout predictions and urgency levels.

**Interface:**

```typescript
interface PredictionService {
  // Calculate projected stockout date for a SKU
  calculateStockoutDate(
    sku: string,
    currentStock: number,
    salesHistory: SalesDataPoint[]
  ): Date | null;

  // Calculate urgency level for replenishment
  calculateUrgencyLevel(
    sku: string,
    currentStock: number,
    statisticalROP: number,
    salesVelocity: number
  ): UrgencyLevel;

  // Generate priority shipping list for all SKUs
  generatePriorityShippingList(
    inventory: InventoryItem[],
    feederWarehouse?: string
  ): PriorityShippingItem[];

  // Get 12-month sales velocity
  calculateSalesVelocity(
    salesHistory: SalesDataPoint[]
  ): number;
}

interface SalesDataPoint {
  date: Date;
  quantity: number;
  sku: string;
  platform: 'blinkit' | 'amazon';
}

interface UrgencyLevel {
  level: 1 | 2 | 3;
  label: 'Critical' | 'High' | 'Medium';
  color: 'red' | 'yellow' | 'green';
}

interface PriorityShippingItem {
  sku: string;
  productName: string;
  currentStock: number;
  statisticalROP: number;
  stockoutDate: Date | null;
  urgencyLevel: UrgencyLevel;
  targetFeeder: string;
  quantityToShip: number;
}
```

**Stockout Date Calculation:**

```
Formula: Stockout Date = Current Date + (Current Stock / Sales Velocity)

Where:
- Sales Velocity = Average daily sales over last 12 months
- Current Stock = Available inventory units
- If Sales Velocity = 0, Stockout Date = null (no movement)
```

**Urgency Level Calculation:**

```
Urgency Score = (Sales Velocity × Stockout Risk) / Current Stock

Where:
- Stockout Risk = 1.0 if (Current Stock < Statistical ROP), else 0.5
- Sales Velocity = Average daily sales

Classification:
- Level 1 (Critical): Urgency Score > 0.5 OR Current Stock < Statistical ROP
- Level 2 (High): Urgency Score > 0.2 AND Urgency Score <= 0.5
- Level 3 (Medium): Urgency Score <= 0.2
```

### 2. ExecutiveDashboard Component

**Interface:**

```typescript
interface ExecutiveDashboardProps {
  dateRange: DateRange;
  platforms: ('blinkit' | 'amazon')[];
}

interface BrandHealthMetrics {
  overallScore: number; // 0-100
  blinkitScore: number;
  amazonScore: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

interface CashAtRiskMetrics {
  totalValue: number;
  skuCount: number;
  byPlatform: {
    blinkit: number;
    amazon: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface GeographicPerformance {
  region: 'Ahmedabad' | 'Mumbai' | 'Bangalore';
  salesVolume: number;
  growthRate: number;
  marketShare: number;
}

interface AdEfficiencyMetrics {
  region: 'Ahmedabad' | 'Mumbai' | 'Bangalore';
  adSpend: number;
  revenue: number;
  roi: number; // (Revenue - AdSpend) / AdSpend
}
```

**Brand Health Score Calculation:**

```
Brand Health Score = Weighted Average of:
- Stock Availability (40%): Percentage of SKUs in stock
- Turnover Rate (30%): Inventory turnover velocity
- Expiry Risk (20%): Inverse of expiry risk percentage
- Replenishment Efficiency (10%): Percentage of on-time replenishments

Score Range: 0-100
- 80-100: Excellent (Green)
- 60-79: Good (Light Green)
- 40-59: Warning (Yellow)
- 0-39: Critical (Red)
```

### 3. RegionalOperationsView Component

**Interface:**

```typescript
interface RegionalOperationsViewProps {
  selectedFeeder: string | null;
  onFeederChange: (feeder: string) => void;
}

interface FeederWarehouse {
  id: string;
  name: string;
  location: string;
  skuCount: number;
}

interface SKUMovementData {
  sku: string;
  productName: string;
  currentStock: number;
  movementStatus: 'Moving' | 'Idle' | 'Critical';
  velocity: number; // units per day
  daysOfStock: number;
  lastMovementDate: Date;
}
```

**SKU Movement Status Classification:**

```
Movement Status Logic:
- Moving: Velocity > 5 units/day AND Last Movement < 7 days ago
- Idle: Velocity < 1 unit/day OR Last Movement > 30 days ago
- Critical: Current Stock < Statistical ROP OR Stockout Date < 7 days
```

### 4. PriorityShippingPanel Component

**Interface:**

```typescript
interface PriorityShippingPanelProps {
  feederWarehouse: string;
  shippingList: PriorityShippingItem[];
  onGenerateManifest: () => void;
}

interface ShippingManifest {
  manifestId: string;
  generatedDate: Date;
  targetFeeder: string;
  items: PriorityShippingItem[];
  totalItems: number;
  totalValue: number;
}
```

**Priority Shipping List Generation Logic:**

```
1. Filter inventory by target feeder warehouse
2. Calculate urgency level for each SKU
3. Sort by:
   - Primary: Urgency Level (1 → 2 → 3)
   - Secondary: Stockout Date (earliest first)
   - Tertiary: Sales Velocity (highest first)
4. Group by urgency level
5. Calculate quantity to ship:
   - Quantity = (Statistical ROP × 1.5) - Current Stock
   - Minimum: 1 unit
   - Maximum: Available warehouse stock
```

### 5. Visual Components

**VisualProgressRing:**

```typescript
interface VisualProgressRingProps {
  value: number; // 0-100
  max: number;
  size: 'small' | 'medium' | 'large';
  color: 'green' | 'yellow' | 'red';
  label: string;
  showPercentage: boolean;
}
```

**GeographicBubbleChart:**

```typescript
interface BubbleChartProps {
  data: BubbleDataPoint[];
  xAxis: string;
  yAxis: string;
  bubbleSize: string; // data field for bubble size
  colorScheme: 'single' | 'gradient' | 'categorical';
  onBubbleClick: (dataPoint: BubbleDataPoint) => void;
}

interface BubbleDataPoint {
  id: string;
  x: number;
  y: number;
  size: number;
  color?: string;
  label: string;
  metadata: Record<string, any>;
}
```

**CollapsibleDetailTable:**

```typescript
interface CollapsibleDetailTableProps {
  title: string;
  data: any[];
  columns: ColumnDefinition[];
  defaultCollapsed: boolean;
  maxHeight?: number;
}
```

## Data Models

### Extended Inventory Item

```typescript
interface InventoryItemV2 extends InventoryItem {
  // Existing fields from v1.1
  id: string;
  sku: string;
  productName: string;
  currentStock: number;
  platform: 'blinkit' | 'amazon';
  
  // New v2.0 fields
  statisticalROP: number;
  stockoutDate: Date | null;
  urgencyLevel: UrgencyLevel;
  movementStatus: 'Moving' | 'Idle' | 'Critical';
  salesVelocity: number;
  daysOfStock: number;
  targetFeeder: string;
  lastMovementDate: Date;
}
```

### Sales History

```typescript
interface SalesHistory {
  sku: string;
  dataPoints: SalesDataPoint[];
  aggregatedMetrics: {
    totalSales12Months: number;
    averageDailySales: number;
    peakSalesDate: Date;
    lowestSalesDate: Date;
  };
}
```

### Geographic Performance Data

```typescript
interface GeographicData {
  region: 'Ahmedabad' | 'Mumbai' | 'Bangalore';
  metrics: {
    salesVolume: number;
    revenue: number;
    growthRate: number;
    marketShare: number;
    adSpend: number;
    roi: number;
  };
  platformBreakdown: {
    blinkit: number;
    amazon: number;
  };
  topSKUs: {
    sku: string;
    sales: number;
  }[];
}
```

### Shipping Manifest Data

```typescript
interface ShippingManifestData {
  manifestId: string;
  generatedDate: Date;
  generatedBy: string;
  targetFeeder: string;
  status: 'draft' | 'approved' | 'shipped' | 'completed';
  items: {
    sku: string;
    productName: string;
    quantity: number;
    urgencyLevel: UrgencyLevel;
    estimatedValue: number;
  }[];
  totals: {
    itemCount: number;
    totalQuantity: number;
    totalValue: number;
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Cash at Risk Calculation Accuracy

*For any* set of inventory items with expiry risk status, the calculated Cash_at_Risk value should equal the sum of (unit_price × quantity) for all items marked as expiry risk.

**Validates: Requirements 1.3**

### Property 2: Feeder Warehouse Filtering Completeness

*For any* selected feeder warehouse, the displayed SKU list should contain all and only those SKUs where the target_feeder field matches the selected warehouse.

**Validates: Requirements 2.2**

### Property 3: SKU Movement Classification Validity

*For any* SKU with sales history and stock data, the assigned movement status should be exactly one of {Moving, Idle, Critical} based on the classification rules: Moving (velocity > 5 AND last_movement < 7 days), Idle (velocity < 1 OR last_movement > 30 days), Critical (stock < ROP OR stockout_date < 7 days).

**Validates: Requirements 2.3**

### Property 4: Prediction Time Window Constraint

*For any* stockout date or ROP calculation, the sales history data used should include only data points from the last 12 months (365 days) from the calculation date.

**Validates: Requirements 3.1, 5.1**

### Property 5: Stockout Date Calculation Formula

*For any* SKU with positive sales velocity, the calculated stockout date should equal current_date + (current_stock / sales_velocity) rounded to the nearest day. For SKUs with zero velocity, stockout date should be null.

**Validates: Requirements 3.2**

### Property 6: Critical Stockout Highlighting

*For any* SKU where the stockout date is within 7 days of the current date, the urgency level should be set to Level 1 (Critical) and the visual indicator should use red color coding.

**Validates: Requirements 3.4**

### Property 7: Urgency Level Calculation and Classification

*For any* SKU, the urgency level should be calculated using the formula: urgency_score = (sales_velocity × stockout_risk) / current_stock, where stockout_risk = 1.0 if (current_stock < statistical_ROP) else 0.5, and classified as: Level 1 if (urgency_score > 0.5 OR current_stock < statistical_ROP), Level 2 if (urgency_score > 0.2 AND urgency_score ≤ 0.5), Level 3 if (urgency_score ≤ 0.2).

**Validates: Requirements 4.1, 4.2**

### Property 8: Priority Shipping List Sort Order

*For any* generated priority shipping list, the items should be sorted first by urgency level (1 before 2 before 3), then by stockout date (earliest first), then by sales velocity (highest first).

**Validates: Requirements 4.3**

### Property 9: Shipping Manifest Completeness

*For any* generated shipping manifest, every item should have a non-null target_feeder value, a positive quantity_to_ship value, and all required fields (sku, product_name, urgency_level, estimated_value).

**Validates: Requirements 4.4, 4.5**

### Property 10: ROP-Based Urgency Elevation

*For any* SKU where current_stock < statistical_ROP, the urgency level should be automatically elevated to at least Level 1 (Critical), regardless of other factors.

**Validates: Requirements 5.2**

### Property 11: Status Color Coding Consistency

*For any* status value displayed in the system, the color mapping should be consistent: green for {healthy, moving, good, excellent}, yellow for {warning, medium, idle}, red for {critical, high, expiry_risk}.

**Validates: Requirements 6.4**

### Property 12: Async Action Loading States

*For any* button action that triggers an asynchronous operation (API call, calculation, file generation), the UI should display a loading indicator from the moment the action is triggered until the operation completes or errors.

**Validates: Requirements 7.5**

### Property 13: Multi-Platform Data Aggregation

*For any* metric that combines Blinkit and Amazon data (brand health score, geographic sales, revenue), the aggregated value should equal the sum or weighted average of the platform-specific values, and no data from either platform should be excluded.

**Validates: Requirements 8.1, 8.3**

### Property 14: Platform Metric Normalization

*For any* aggregated metric combining platforms with different scales, the normalization should apply a consistent scaling factor such that platform contributions are proportional to their market size or transaction volume.

**Validates: Requirements 8.5**

### Property 15: Visual Data Mapping Consistency

*For any* bubble chart visualization (geographic sales, ad efficiency), the bubble size should be monotonically proportional to the magnitude value (larger value = larger bubble), and color intensity should be monotonically proportional to the growth/efficiency metric (higher value = darker/more intense color).

**Validates: Requirements 9.2, 9.3**

### Property 16: Role-Based Feature Visibility

*For any* user role and feature combination, if a feature is marked as role-specific, it should be visible/enabled only when the current user's role matches the feature's allowed roles, otherwise it should be hidden or disabled.

**Validates: Requirements 10.5**

### Property 17: ROI Calculation Formula

*For any* region with ad spend and revenue data, the calculated ROI should equal (revenue - ad_spend) / ad_spend, expressed as a decimal (e.g., 0.5 for 50% ROI). For regions with zero ad spend, ROI should be null or infinity.

**Validates: Requirements 11.4**

## Error Handling

### Prediction Service Errors

**Missing Sales History:**
- If a SKU has less than 30 days of sales history, stockout prediction should return null
- Display message: "Insufficient data for prediction (minimum 30 days required)"
- Fallback: Use manual ROP if available, otherwise mark as "Data Pending"

**Zero Velocity Edge Case:**
- If sales velocity is zero (no sales in 12 months), stockout date should be null
- Movement status should be "Idle"
- Urgency level should be Level 3 (Medium) unless stock exceeds 2× ROP

**Negative Stock:**
- If current stock is negative (data error), log error and exclude from calculations
- Display warning: "Data integrity issue detected for SKU {sku}"
- Notify admin for manual correction

### Data Aggregation Errors

**Missing Platform Data:**
- If one platform has no data for a metric, use only available platform data
- Display indicator showing which platforms contributed to the metric
- Do not fail the entire calculation

**Geographic Data Gaps:**
- If a region has no sales data, display as "No Data" rather than zero
- Exclude from bubble charts to avoid misleading visualizations
- Show in detail tables with "N/A" values

### UI Component Errors

**Chart Rendering Failures:**
- If a chart fails to render, display fallback table view
- Log error with chart type and data shape for debugging
- Show user message: "Visualization unavailable, showing data table"

**Manifest Generation Failures:**
- If manifest generation fails, preserve the priority list in UI
- Allow user to retry or export as CSV instead
- Log error with stack trace for investigation

### Validation Errors

**Invalid Feeder Selection:**
- If selected feeder warehouse doesn't exist, reset to default
- Display error: "Selected warehouse not found, please choose another"

**Invalid Date Ranges:**
- If date range is invalid (end before start), use default last 30 days
- Display warning and allow user to correct

## Testing Strategy

### Dual Testing Approach

The Executive Command Center will use both unit testing and property-based testing to ensure comprehensive coverage:

**Unit Tests** will focus on:
- Specific examples of calculations (e.g., stockout date for known inputs)
- Edge cases (zero velocity, negative stock, missing data)
- UI component rendering (buttons exist, charts display)
- Integration points between services
- Error handling scenarios

**Property-Based Tests** will focus on:
- Universal calculation correctness (Properties 1, 5, 7, 9, 17)
- Data filtering and aggregation (Properties 2, 4, 13, 14)
- Classification and sorting logic (Properties 3, 8, 10)
- Visual consistency rules (Properties 11, 15)
- Role-based access control (Property 16)

### Property-Based Testing Configuration

**Library Selection:**
- **TypeScript/JavaScript**: Use `fast-check` library for property-based testing
- Minimum 100 iterations per property test
- Each test must reference its design document property in a comment

**Test Tagging Format:**
```typescript
// Feature: executive-command-center, Property 5: Stockout Date Calculation Formula
test('stockout date calculation', () => {
  fc.assert(
    fc.property(
      fc.record({
        currentStock: fc.integer({ min: 1, max: 10000 }),
        salesVelocity: fc.float({ min: 0.1, max: 100 }),
        currentDate: fc.date()
      }),
      ({ currentStock, salesVelocity, currentDate }) => {
        const result = calculateStockoutDate(currentStock, salesVelocity, currentDate);
        const expectedDays = Math.round(currentStock / salesVelocity);
        const expectedDate = addDays(currentDate, expectedDays);
        return isSameDay(result, expectedDate);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Test Coverage Requirements

**Service Layer:**
- PredictionService: 100% coverage of calculation methods
- All 17 correctness properties must have corresponding property tests
- Edge cases: zero velocity, missing data, negative values

**Component Layer:**
- Executive Dashboard: Render tests for all visual components
- Regional Operations: Interaction tests for feeder selection and filtering
- Priority Shipping Panel: Manifest generation and button states

**Integration Tests:**
- End-to-end flow: Select feeder → View SKUs → Generate manifest
- Multi-platform aggregation: Verify Blinkit + Amazon data combines correctly
- Role-based routing: Verify founders see executive view, employees see regional ops

### Performance Testing

**Calculation Performance:**
- Stockout predictions for 1000+ SKUs should complete in < 2 seconds
- Priority list generation should complete in < 1 second
- Brand health score calculation should complete in < 500ms

**UI Rendering Performance:**
- Initial dashboard load should complete in < 3 seconds
- Chart rendering should complete in < 1 second
- Switching between views should be instant (< 100ms)

### Manual Testing Checklist

**Visual Verification:**
- [ ] Brand Health Gauge displays correctly with proper color coding
- [ ] Geographic Sales Map shows all three regions with appropriate bubble sizes
- [ ] Ad Efficiency Map uses orange for ad spend, green for revenue
- [ ] Progress rings animate smoothly and show accurate percentages
- [ ] Collapsible tables expand/collapse without layout shifts

**Workflow Verification:**
- [ ] Founder can access Executive Dashboard and see all metrics
- [ ] Employee can select feeder warehouse and see filtered SKUs
- [ ] Priority Shipping List sorts correctly by urgency level
- [ ] Generate Manifest button creates downloadable document
- [ ] Role toggle switches between Executive and Regional views

**Data Accuracy:**
- [ ] Cash at Risk matches manual calculation of expiry risk inventory
- [ ] Stockout dates align with current stock / velocity formula
- [ ] Urgency levels match the classification rules
- [ ] ROI calculations match (revenue - ad_spend) / ad_spend formula
