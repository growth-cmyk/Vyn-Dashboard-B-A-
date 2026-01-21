# Implementation Plan: Executive Command Center v2.0

## Overview

This implementation plan transforms the v1.1 inventory dashboard into a professional SaaS-grade Executive Command Center with visual-first design, predictive analytics, and role-based views. The plan is organized into five logical sprints: (1) Prediction Engine core logic, (2) Visual component library, (3) Executive Dashboard for founders, (4) Regional Operations for employees, and (5) Role-based navigation and security.

## Tasks

### Sprint 1: The Prediction Engine (The Brain)

- [x] 1. Implement PredictionService core calculation methods
  - [x] 1.1 Create PredictionService.ts with interface and class structure
    - Define all interfaces: `PredictionService`, `SalesDataPoint`, `UrgencyLevel`, `PriorityShippingItem`
    - Implement service class with dependency injection for data access
    - Add platform-specific lead time constants: BLINKIT_LEAD_TIME = 15 days, AMAZON_LEAD_TIME = 7 days
    - _Requirements: 3.1, 3.2, 4.1, 5.1_

  - [x] 1.2 Implement calculateSalesVelocity method
    - Filter sales history to last 12 months (365 days)
    - Calculate average daily sales: total_sales / days_with_data
    - Handle edge case: return 0 if no sales data exists
    - _Requirements: 3.1, 3.2_

  - [x] 1.3 Implement calculateStockoutDate method
    - Use formula: current_date + (current_stock / sales_velocity)
    - Return null if sales_velocity is 0
    - Round result to nearest day
    - _Requirements: 3.2_

  - [x] 1.4 Write property test for stockout date calculation
    - **Property 5: Stockout Date Calculation Formula**
    - **Validates: Requirements 3.2**
    - Generate random SKUs with various stock levels and velocities
    - Verify: stockout_date = current_date + (current_stock / sales_velocity)
    - Verify: null returned when velocity = 0

  - [x] 1.5 Implement calculateUrgencyLevel method
    - Calculate stockout_risk: 1.0 if (current_stock < statistical_ROP), else 0.5
    - Calculate urgency_score: (sales_velocity × stockout_risk) / current_stock
    - Classify: Level 1 if (score > 0.5 OR stock < ROP), Level 2 if (score > 0.2 AND score ≤ 0.5), Level 3 if (score ≤ 0.2)
    - _Requirements: 4.1, 4.2, 5.2_

  - [x] 1.6 Write property test for urgency level calculation
    - **Property 7: Urgency Level Calculation and Classification**
    - **Validates: Requirements 4.1, 4.2**
    - Generate random SKUs with various velocity, stock, and ROP values
    - Verify urgency score formula is correct
    - Verify classification rules are applied correctly

  - [x] 1.7 Write property test for ROP-based urgency elevation
    - **Property 10: ROP-Based Urgency Elevation**
    - **Validates: Requirements 5.2**
    - Generate random SKUs where current_stock < statistical_ROP
    - Verify urgency level is always Level 1 (Critical)

  - [x] 1.8 Implement generatePriorityShippingList method
    - Filter inventory by target feeder warehouse (if specified)
    - Calculate urgency level for each SKU
    - Sort by: urgency level (1→2→3), then stockout date (earliest first), then sales velocity (highest first)
    - Calculate quantity_to_ship: (statistical_ROP × 1.5) - current_stock, min 1, max available stock
    - _Requirements: 4.3, 4.4, 4.5_

  - [x] 1.9 Write property test for priority list sort order
    - **Property 8: Priority Shipping List Sort Order**
    - **Validates: Requirements 4.3**
    - Generate random priority lists with mixed urgency levels
    - Verify sort order: Level 1 before Level 2 before Level 3
    - Verify secondary sort by stockout date
    - Verify tertiary sort by sales velocity

  - [x] 1.10 Write property test for shipping manifest completeness
    - **Property 9: Shipping Manifest Completeness**
    - **Validates: Requirements 4.4, 4.5**
    - Generate random shipping manifests
    - Verify every item has non-null target_feeder
    - Verify every item has positive quantity_to_ship
    - Verify all required fields are present

- [ ] 2. Checkpoint - Ensure PredictionService tests pass
  - Run all property tests for PredictionService
  - Verify edge cases: zero velocity, missing data, negative stock
  - Ask the user if questions arise

### Sprint 2: High-Impact Visual Library

- [x] 3. Create visual component library
  - [x] 3.1 Implement VisualProgressRing component
    - Create TypeScript component with props: value, max, size, color, label, showPercentage
    - Use SVG circle with stroke-dasharray for progress visualization
    - Implement size variants: small (60px), medium (100px), large (150px)
    - Apply color coding: green, yellow, red based on prop
    - _Requirements: 6.1_

  - [x] 3.2 Implement BrandHealthGauge component
    - Create gauge visualization using VisualProgressRing or custom SVG arc
    - Display overall score (0-100) with color coding: 80-100 green, 60-79 light green, 40-59 yellow, 0-39 red
    - Show platform sub-scores (Blinkit, Amazon) as smaller gauges
    - Display trend indicator (up/down arrow) with percentage change
    - _Requirements: 1.1, 8.1, 8.2_

  - [x] 3.3 Write unit test for brand health score calculation
    - Test score aggregation from Blinkit and Amazon platforms
    - Test color coding thresholds (80, 60, 40)
    - Test trend calculation (up/down/stable)

  - [x] 3.4 Write property test for multi-platform data aggregation
    - **Property 13: Multi-Platform Data Aggregation**
    - **Validates: Requirements 8.1, 8.3**
    - Generate random platform-specific metrics
    - Verify aggregated value equals sum or weighted average
    - Verify no platform data is excluded

  - [x] 3.5 Implement GeographicBubbleChart component
    - Create bubble chart using recharts or d3.js
    - Support props: data, xAxis, yAxis, bubbleSize, colorScheme, onBubbleClick
    - Render bubbles for Ahmedabad, Mumbai, Bangalore
    - Implement click handler to show region details
    - _Requirements: 1.2, 9.1, 9.2, 9.3_

  - [x] 3.6 Write property test for visual data mapping consistency
    - **Property 15: Visual Data Mapping Consistency**
    - **Validates: Requirements 9.2, 9.3**
    - Generate random bubble chart data
    - Verify bubble size is proportional to magnitude value
    - Verify color intensity is proportional to growth metric

  - [x] 3.7 Implement CollapsibleDetailTable component
    - Create table component with expand/collapse functionality
    - Props: title, data, columns, defaultCollapsed, maxHeight
    - Use smooth animation for expand/collapse transition
    - Default to collapsed state (visual-first approach)
    - _Requirements: 6.5_

  - [x] 3.8 Implement StatusColorCoding utility
    - Create utility function: getStatusColor(status: string): string
    - Map status values to colors: green (healthy, moving, good, excellent), yellow (warning, medium, idle), red (critical, high, expiry_risk)
    - Export as reusable utility for consistent color coding
    - _Requirements: 6.4_

  - [x] 3.9 Write property test for status color coding consistency
    - **Property 11: Status Color Coding Consistency**
    - **Validates: Requirements 6.4**
    - Generate random status values
    - Verify color mapping is consistent across all status types
    - Verify green/yellow/red categories are correct

- [ ] 4. Checkpoint - Ensure visual components render correctly
  - Test all visual components in isolation
  - Verify responsive behavior and animations
  - Ask the user if questions arise

### Sprint 3: The Founder's Command Center

- [ ] 5. Implement ExecutiveDashboard view
  - [x] 5.1 Create ExecutiveDashboard component structure
    - Create main component with layout grid (2x2 or 3x2)
    - Add date range selector and platform filter (Blinkit, Amazon, Both)
    - Implement data fetching from AnalyticsService and DataService
    - _Requirements: 1.1, 8.4_

  - [x] 5.2 Integrate BrandHealthGauge into dashboard
    - Calculate brand health score using weighted formula: Stock Availability (40%), Turnover Rate (30%), Expiry Risk (20%), Replenishment Efficiency (10%)
    - Fetch platform-specific data from Supabase
    - Display overall score and platform sub-scores
    - _Requirements: 1.1, 8.1, 8.2_

  - [x] 5.3 Implement Cash at Risk metric card
    - Calculate total value of inventory in expiry risk status
    - Display prominently with large number and visual indicator
    - Show breakdown by platform (Blinkit, Amazon)
    - Apply severity color coding: low (green), medium (yellow), high (orange), critical (red)
    - _Requirements: 1.3, 1.4_

  - [ ] 5.4 Write property test for cash at risk calculation
    - **Property 1: Cash at Risk Calculation Accuracy**
    - **Validates: Requirements 1.3**
    - Generate random inventory items with expiry risk status
    - Verify calculated value equals sum of (unit_price × quantity) for expiry risk items

  - [x] 5.5 Integrate GeographicSalesMap
    - Fetch sales data for Ahmedabad, Mumbai, Bangalore from AnalyticsService
    - Aggregate data from both Blinkit and Amazon platforms
    - Render bubble chart with sales volume as bubble size
    - Use color intensity for growth rate visualization
    - Implement click handler to show region detail modal
    - _Requirements: 1.2, 9.1, 9.2, 9.3, 9.4_

  - [ ] 5.6 Write property test for geographic data aggregation
    - **Property 13: Multi-Platform Data Aggregation** (already tested in 3.4, verify integration)
    - Test with geographic-specific data
    - Verify all three regions are included

  - [x] 5.7 Implement Ad Efficiency Map
    - Fetch ad spend and revenue data by region from MarketingService
    - Render bubble chart with orange bubbles for ad spend, green bubbles for revenue
    - Calculate ROI: (revenue - ad_spend) / ad_spend
    - Display ROI percentage on bubble hover
    - Implement click handler to show detailed breakdown
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ] 5.8 Write property test for ROI calculation
    - **Property 17: ROI Calculation Formula**
    - **Validates: Requirements 11.4**
    - Generate random ad spend and revenue data
    - Verify ROI = (revenue - ad_spend) / ad_spend
    - Verify null or infinity for zero ad spend

  - [x] 5.9 Add collapsible detail tables to dashboard
    - Add "View Details" expandable section below each visual
    - Include tables for: SKU-level brand health, region-level sales breakdown, ad campaign details
    - Default to collapsed state
    - _Requirements: 6.5_

- [ ] 6. Checkpoint - Ensure Executive Dashboard displays correctly
  - Verify all metrics calculate correctly
  - Test with real data from Supabase
  - Verify visual-first layout (charts before tables)
  - Ask the user if questions arise

### Sprint 4: Tactical Regional Operations (Employee View)

- [ ] 7. Implement RegionalOperationsView
  - [x] 7.1 Create RegionalOperationsView component structure
    - Create main component with two-column layout: left (feeder selector + SKU list), right (priority shipping panel)
    - Add FeederWarehouseSelector dropdown component
    - Fetch feeder warehouse list from DataService
    - _Requirements: 2.1_

  - [x] 7.2 Implement feeder warehouse filtering logic
    - Filter inventory by selected feeder warehouse
    - Display SKU count for selected feeder
    - Update SKU list when feeder selection changes
    - _Requirements: 2.2_

  - [ ] 7.3 Write property test for feeder warehouse filtering
    - **Property 2: Feeder Warehouse Filtering Completeness**
    - **Validates: Requirements 2.2**
    - Generate random feeder warehouses and SKUs
    - Verify filtered list contains all and only SKUs matching selected feeder

  - [x] 7.4 Implement SKU movement classification
    - For each SKU, calculate movement status: Moving (velocity > 5 AND last_movement < 7 days), Idle (velocity < 1 OR last_movement > 30 days), Critical (stock < ROP OR stockout_date < 7 days)
    - Display status badge with color coding
    - Show velocity metrics (units/day) and days of stock
    - _Requirements: 2.3, 2.4_

  - [ ] 7.5 Write property test for SKU movement classification
    - **Property 3: SKU Movement Classification Validity**
    - **Validates: Requirements 2.3**
    - Generate random SKUs with various velocity and stock data
    - Verify each SKU gets exactly one status: Moving, Idle, or Critical
    - Verify classification rules are applied correctly

  - [x] 7.6 Create SKUMovementDashboard component
    - Display visual chart showing distribution of Moving/Idle/Critical SKUs
    - Use VisualProgressRing for each SKU showing stock level percentage
    - Add CollapsibleDetailTable for SKU-level details
    - _Requirements: 2.5_

  - [x] 7.7 Implement PriorityShippingPanel component
    - Display priority shipping list generated by PredictionService
    - Show urgency level distribution chart (Level 1, 2, 3 counts)
    - Render table with columns: SKU, Product Name, Current Stock, ROP, Stockout Date, Urgency Level, Quantity to Ship, Target Feeder
    - Sort by urgency level (already sorted by PredictionService)
    - _Requirements: 4.3, 4.4_

  - [x] 7.8 Implement "Generate Shipping Manifest" button
    - Create button component with descriptive label: "Generate Shipping Manifest"
    - On click, generate CSV file with priority shipping list
    - CSV columns: SKU, Product Name, Current Stock, Quantity to Ship, Target Feeder, Urgency Level, Stockout Date
    - Trigger browser download with filename: `shipping_manifest_{feeder}_{date}.csv`
    - Show loading state during generation
    - _Requirements: 4.5, 7.2, 7.5_

  - [ ] 7.9 Write property test for async loading states
    - **Property 12: Async Action Loading States**
    - **Validates: Requirements 7.5**
    - Simulate async button actions (manifest generation, data fetch)
    - Verify loading indicator appears during operation
    - Verify loading indicator disappears on completion or error

  - [ ] 7.10 Write unit test for manifest CSV generation
    - Test CSV format and column headers
    - Test data accuracy (SKU, quantities, urgency levels)
    - Test filename format

- [ ] 8. Checkpoint - Ensure Regional Operations view works end-to-end
  - Test feeder selection and SKU filtering
  - Verify priority list generation and sorting
  - Test manifest CSV download
  - Ask the user if questions arise

### Sprint 5: Persona-Based Navigation & Security

- [ ] 9. Implement role-based navigation and access control
  - [x] 9.1 Create NavigationToggle component
    - Add toggle switch in sidebar: "Executive Dashboard" / "Regional Operations"
    - Implement routing to switch between views
    - Persist selected view in local storage
    - _Requirements: 10.1, 10.4_

  - [x] 9.2 Implement role-based default routing
    - Create user role detection logic (founder vs employee)
    - Route founders to Executive Dashboard by default
    - Route employees to Regional Operations by default
    - _Requirements: 10.2, 10.3_

  - [x] 9.3 Implement role-based feature visibility
    - Create RoleGuard utility component
    - Hide/disable features not applicable to current user role
    - Apply to: Ad Efficiency Map (founders only), Generate Manifest button (employees only)
    - _Requirements: 10.5_

  - [ ] 9.4 Write property test for role-based feature visibility
    - **Property 16: Role-Based Feature Visibility**
    - **Validates: Requirements 10.5**
    - Generate random user roles and feature combinations
    - Verify features are visible only for allowed roles
    - Verify features are hidden/disabled for disallowed roles

  - [ ] 9.5 Update existing services for v2.0 compatibility
    - Extend AnalyticsService with brand health score calculation
    - Extend DataService with feeder warehouse queries
    - Extend MarketingService with ad efficiency metrics
    - Ensure backward compatibility with v1.1 features
    - _Requirements: 1.1, 2.1, 11.1_

  - [ ] 9.6 Write property test for prediction time window constraint
    - **Property 4: Prediction Time Window Constraint**
    - **Validates: Requirements 3.1, 5.1**
    - Generate random sales history with dates spanning multiple years
    - Verify calculations use only last 12 months (365 days)
    - Verify older data is excluded

  - [ ] 9.7 Write property test for platform metric normalization
    - **Property 14: Platform Metric Normalization**
    - **Validates: Requirements 8.5**
    - Generate random platform metrics with different scales
    - Verify normalization applies consistent scaling factor
    - Verify platform contributions are proportional

  - [x] 9.8 Integrate v2.0 components into main App routing
    - Update App.tsx with new routes: /executive, /regional-ops
    - Add navigation guards for role-based access
    - Update sidebar navigation with new menu items
    - Preserve existing v1.1 routes for backward compatibility
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ] 9.9 Update TypeScript types and interfaces
    - Create types/v2.ts with all new interfaces
    - Extend existing InventoryItem type with v2.0 fields
    - Export all types for use across components
    - _Requirements: All_

- [ ] 10. Final checkpoint - End-to-end testing and polish
  - Run all property tests (minimum 100 iterations each)
  - Run all unit tests
  - Test role-based navigation and access control
  - Verify visual consistency across all views
  - Test with production data from Supabase
  - Ensure all buttons have descriptive labels
  - Verify loading states for all async actions
  - Test responsive behavior on different screen sizes
  - Ask the user if questions arise

## Notes

- All property-based tests use fast-check library with minimum 100 iterations
- Each property test references its design document property number
- Visual components prioritize charts over tables (Decision-First UI Architecture)
- Platform lead times are constants: Blinkit = 15 days, Amazon = 7 days
- Color coding is consistent: green (healthy), yellow (warning), red (critical)
- All async actions show loading states with progress indicators
- Role-based features are hidden/disabled for unauthorized roles
- Backward compatibility with v1.1 features is maintained
