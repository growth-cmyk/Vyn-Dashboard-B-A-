# Design Document

## Overview

The Inventory and Sales Dashboard is a lightweight web application that provides real-time visibility into inventory levels, sales performance, and stock status across multiple locations. The dashboard processes CSV data files to calculate key metrics like days of cover, identify stock issues, and enable data-driven inventory management decisions.

## Architecture

The system follows a modern client-side architecture with enhanced UI/UX components:

- **Data Processing Layer**: Handles CSV file parsing and data transformation
- **Analytics Engine**: Calculates metrics like days of cover, stock classifications, and sales aggregations
- **Visualization Layer**: Renders charts, tables, and interactive filters with Vyndo branding
- **UI Framework**: Professional-grade interface with sidebar navigation, Bento Grid KPIs, and branded styling
- **Export Module**: Generates downloadable reports in CSV/Excel formats

The application is built as a single-page web application using React/TypeScript with Tailwind CSS, implementing the Vyndo brand identity and modern dashboard patterns.

### Vyndo Brand Integration

**Color Palette**
- Primary (Vyndo Orange): #F36F21 - Action buttons, brand accents, primary highlights
- Success (Millet Green): #2D6A4F - Adequate stock levels, positive growth indicators  
- Warning (Harvest Gold): #FFB703 - Understock/Low stock alerts
- Danger (Alert Red): #D90429 - Out of stock, critical errors
- Neutral Background: #F9FAFB - Subtle gray for main workspace
- Surface/Card Color: #FFFFFF - White cards with subtle shadow-sm
- Typography: #1A1A1A - Near-black for readability

**Design Language**
- Typography: Inter/Outfit sans-serif, semibold headings, monospace for data tables
- Corners: rounded-xl (12px) for approachable feel
- Borders: Minimal with border-slate-100 for subtle separation
- Icons: Lucide-react library with 2px stroke width consistency

### UI Architecture Components

**Sidebar Navigation**
- Fixed left sidebar with Dashboard Overview, Inventory Health, Sales Performance, Action Center, Data Management
- Lucide icons: LayoutGrid, Package, TrendingUp, AlertCircle, UploadCloud
- Responsive design with collapsible mobile view

**Bento Grid KPI Dashboard**
- Total Inventory Value card with sparkline trend
- Out-of-Stock Risk counter with red urgent theme
- Low Stock Alerts with amber warning theme  
- Top Selling SKU with performance metrics
- Chart.js integration for 7-day trend visualization

**Enhanced Data Tables**
- Sticky headers for scroll persistence
- Pill-style status badges with brand colors
- Progress bars for Days of Cover visualization
- Quick action buttons with slide-over detail sheets
- Responsive design with horizontal scroll on mobile

## Components and Interfaces

### Data Models

**InventoryItem**
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
}
```

**SalesRecord**
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
}
```

**StockAnalysis (Updated for Strategic Roadmap)**
```typescript
interface StockAnalysis {
  itemId: string;
  warehouseFacilityId: string;
  currentStock: number;
  salesVelocity: number;
  daysOfCover: number;
  stockStatus: 'out-of-stock' | 'understock' | 'healthy' | 'overstock' | 'expiry-risk';
  recommendedAction: string;
  reorderQuantity?: number; // For understock items
  leadTime: number; // Default 7 days
  safetyStock: number; // Default 3 days * sales velocity
}
```

**InventorySnapshot**
```typescript
interface InventorySnapshot {
  timestamp: Date;
  itemId: string;
  warehouseFacilityId: string;
  totalSellable: number;
  uploadSource: string; // File name or identifier
}
```

**ReplenishmentRecommendation**
```typescript
interface ReplenishmentRecommendation {
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
```

### Core Services

**DataService**
- `loadInventoryData(file: File): Promise<InventoryItem[]>`
- `loadSalesData(file: File): Promise<SalesRecord[]>`
- `validateDataIntegrity(inventory: InventoryItem[], sales: SalesRecord[]): ValidationResult`

**AnalyticsService (Updated for Strategic Roadmap)**
- `calculateDaysOfCover(inventory: InventoryItem, salesVelocity: number): number`
- `classifyStockStatusStrategic(daysOfCover: number): StockStatus` // Updated thresholds
- `calculateReplenishmentQuantity(item: InventoryItem, salesVelocity: number, leadTime?: number, safetyDays?: number): number`
- `aggregateSalesByPeriod(sales: SalesRecord[], period: TimePeriod): SalesAggregation`
- `identifyStockIssues(analysis: StockAnalysis[]): StockIssueReport`
- `generateReplenishmentRecommendations(inventory: InventoryItem[], analyses: StockAnalysis[]): ReplenishmentRecommendation[]`

**HistoryService (New)**
- `saveInventorySnapshot(inventory: InventoryItem[], uploadSource: string): Promise<void>`
- `getInventoryHistory(itemId?: string, facilityId?: string): Promise<InventorySnapshot[]>`
- `generateInventoryTrendData(itemId: string, facilityId: string): Promise<TrendData>`
- `clearHistoryData(): Promise<void>`

**DataService (Enhanced)**
- `loadInventoryData(file: File): Promise<InventoryItem[]>`
- `loadSalesData(file: File): Promise<SalesRecord[]>`
- `loadMasterInventoryData(file: File): Promise<InventoryItem[]>` // New for simplified CSV format
- `validateDataIntegrity(inventory: InventoryItem[], sales: SalesRecord[]): ValidationResult`

**FilterService**
- `filterByLocation(data: any[], locations: string[]): any[]`
- `filterBySKU(data: any[], skus: string[]): any[]`
- `filterByTimePeriod(sales: SalesRecord[], period: TimePeriod): SalesRecord[]`

### Strategic Roadmap Components

**Replenishment Planner**
- Integrated into Action Center/Stock Analysis tab
- Displays calculated reorder quantities for all understock items
- Sortable by urgency score (sales velocity / days of cover)
- Export functionality for purchase orders
- Configurable lead time and safety stock parameters

**Inventory History Tracker**
- Local storage-based historical data persistence
- Automatic snapshot creation on each data upload
- Trend visualization using Chart.js line charts
- Item-level and facility-level trend analysis
- Data retention management (configurable retention period)

**Enhanced Stock Classification System**
- Updated thresholds aligned with 6-month expiry cycles
- Color-coded status indicators with action labels
- Automated alert generation for critical statuses
- Integration with existing KPI dashboard and tables

**Master Inventory CSV Support**
- Flexible CSV parser supporting simplified formats
- Primary key matching on Item ID + Location + Total Sellable
- Backward compatibility with existing detailed inventory format
- Enhanced validation for different CSV schemas

## Data Models

The system processes three main data entities:

1. **Inventory Data**: Current stock levels, incoming inventory, and historical sales velocity by location
2. **Sales Data**: Transaction records with location, product, and financial details
3. **Analytics Data**: Calculated metrics including days of cover, stock classifications, and performance indicators

Data relationships are established through common identifiers (Item ID, UPC) and location mappings between inventory facilities and sales regions.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property 1: Data Display Completeness**
*For any* loaded inventory dataset, the dashboard should display all required data fields (sellable inventory, sales quantities, product details) for every item-location combination
**Validates: Requirements 1.2**

**Property 2: Filter Consistency**
*For any* filter selection (location or SKU), all dashboard displays should update to show only data matching the filter criteria
**Validates: Requirements 1.3**

**Property 3: Days of Cover Calculation**
*For any* inventory item with positive sales velocity, the days of cover calculation should equal current sellable inventory divided by daily sales velocity
**Validates: Requirements 2.1**

**Property 4: Stock Status Classification (Updated for Strategic Roadmap)**
*For any* calculated days of cover value, the stock status classification should correctly categorize items using 6-month expiry-based thresholds: Understock (<14 days), Healthy (14-45 days), Overstock (45-90 days), Expiry Risk (>90 days)
**Validates: Requirements 5.1**

**Property 5: Visual Status Indicators (Updated for Strategic Roadmap)**
*For any* stock status classification, the system should apply consistent color coding and action labels: red for out-of-stock, amber for understock with 'Restock' alerts, green for healthy, amber for overstock with 'Freeze POs', red for expiry risk with 'Flash Promo'
**Validates: Requirements 5.2, 5.3, 5.4**

**Property 6: Time Period Sales Aggregation**
*For any* time period selection, the sales data aggregation should include only transactions within the specified date range and correctly sum quantities and revenue
**Validates: Requirements 3.1**

**Property 7: Sales Data Dimensions**
*For any* sales data display, the aggregated results should include breakdowns by both location and SKU dimensions
**Validates: Requirements 3.2**

**Property 8: Percentage Change Calculation**
*For any* two time periods with sales data, the percentage change calculation should equal ((current period - previous period) / previous period) * 100
**Validates: Requirements 3.3**

**Property 9: Sidebar Navigation Consistency**
*For any* navigation action, the sidebar should maintain active state highlighting and proper icon display according to current page
**Validates: Requirements 4.1**

**Property 10: Brand Color Application**
*For any* UI element requiring status indication, the system should apply the correct Vyndo brand color (green for adequate, amber for warning, red for danger, orange for primary actions)
**Validates: Requirements 4.2**

**Property 11: Responsive Layout Integrity**
*For any* screen size, the layout should maintain proper spacing, card visibility, and navigation accessibility without horizontal overflow
**Validates: Requirements 4.3**

**Property 12: KPI Card Data Accuracy**
*For any* KPI summary card, the displayed metrics should accurately reflect the underlying data calculations and update when filters are applied
**Validates: Requirements 4.4**

**Property 13: Replenishment Calculation Accuracy**
*For any* understock item, the recommended reorder quantity should equal (Lead Time * Sales Velocity) + (Safety Stock Days * Sales Velocity) - Current Stock, with default values of 7 days lead time and 3 days safety stock
**Validates: Requirements 5.2**

**Property 14: Inventory Snapshot Persistence**
*For any* inventory data upload, the system should save a timestamped snapshot of Total Sellable values to enable historical trend analysis
**Validates: Requirements 5.5**

**Property 15: Historical Trend Visualization**
*For any* inventory item with multiple snapshots, the trend chart should display chronological Total Sellable values as a line chart showing inventory movement over time
**Validates: Requirements 5.8**

**Property 16: Master Inventory CSV Processing**
*For any* CSV file upload, the system should correctly parse files with 'Item ID', 'Location', and 'Total Sellable' as primary keys, handling both detailed inventory sheets and simplified master sheets
**Validates: Requirements 5.7**

## Error Handling

The system implements graceful error handling for common scenarios:

- **File Format Errors**: Display clear messages for invalid CSV formats or missing required columns
- **Data Validation Errors**: Highlight inconsistencies between inventory and sales data (mismatched SKUs, locations)
- **Calculation Errors**: Handle division by zero in days of cover calculations and display appropriate indicators
- **Performance Issues**: Implement data pagination and lazy loading for large datasets
- **Browser Compatibility**: Provide fallbacks for older browsers and file API limitations

## Testing Strategy

### Unit Testing
- Test individual calculation functions (days of cover, percentage changes, aggregations)
- Test data parsing and validation logic
- Test filter and search functionality
- Test component rendering with various data states

### Property-Based Testing
The system will use property-based testing to verify correctness properties across a wide range of inputs. We'll use a JavaScript property testing library like fast-check to generate random test data and verify that our properties hold consistently.

Each correctness property will be implemented as a property-based test that:
- Generates random but valid input data
- Executes the system functionality
- Verifies the expected property holds true
- Runs a minimum of 100 iterations per property

### Integration Testing
- Test end-to-end data flow from file upload to dashboard display
- Test cross-component interactions and state management
- Test export functionality with various data selections
- Test responsive design across different screen sizes

The dual testing approach ensures both specific functionality works correctly (unit tests) and general correctness properties hold across all valid inputs (property tests).