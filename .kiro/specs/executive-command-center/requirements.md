# Requirements Document: Executive Command Center v2.0

## Introduction

This specification defines the transformation of the existing v1.1 inventory dashboard into a professional SaaS-grade Executive Command Center. The system will provide two distinct user experiences: a high-level strategic view for founders showing brand health and risk metrics, and a tactical operations view for warehouse employees showing regional SKU movement and priority shipping lists. The transformation emphasizes visual-first design, predictive analytics, and actionable workflows.

## Glossary

- **Executive_Command_Center**: The v2.0 inventory dashboard system providing strategic and operational views
- **Brand_Health_Score**: Aggregate metric representing overall inventory performance across all platforms
- **Cash_at_Risk**: Total monetary value of inventory currently in expiry risk status
- **Feeder_Warehouse**: Regional distribution center (e.g., Lucknow L4, Mumbai M2)
- **SKU**: Stock Keeping Unit, unique product identifier
- **Statistical_ROP**: Reorder Point calculated using statistical methods based on historical data
- **Stockout_Date**: Predicted date when a SKU will reach zero inventory
- **Priority_Shipping_List**: Ordered list of SKUs requiring immediate replenishment based on urgency
- **Urgency_Level**: Classification of replenishment priority (Level 1: Critical, Level 2: High, Level 3: Medium)
- **Visual_Progress_Ring**: Circular progress indicator showing stock level percentage
- **Geographic_Sales_Map**: Visual representation of sales performance across different regions
- **SKU_Movement_Status**: Classification of SKU activity (Moving, Idle, Critical)
- **Shipping_Manifest**: Document listing SKUs to be shipped from warehouse to feeder location
- **Ad_Efficiency_Map**: Visual representation comparing advertising spend to revenue by geographic region
- **ROI_Ratio**: Return on Investment calculated as (Revenue - Ad_Spend) / Ad_Spend

## Requirements

### Requirement 1: Executive Summary Dashboard

**User Story:** As a founder, I want to see high-level brand health and risk metrics in a visual format, so that I can quickly assess business performance and identify critical issues.

#### Acceptance Criteria

1. WHEN a founder accesses the Executive Summary view, THE Executive_Command_Center SHALL display a Brand_Health_Score aggregated across Blinkit and Amazon platforms
2. WHEN displaying geographic performance, THE Executive_Command_Center SHALL render a Geographic_Sales_Map showing sales data for Ahmedabad, Mumbai, and Bangalore regions
3. WHEN calculating risk metrics, THE Executive_Command_Center SHALL compute Cash_at_Risk as the sum of inventory values for all SKUs in expiry risk status
4. WHEN presenting the Cash_at_Risk metric, THE Executive_Command_Center SHALL display it prominently with visual indicators for risk severity
5. THE Executive_Command_Center SHALL replace table-heavy views with visual charts and graphics in the Executive Summary

### Requirement 2: Regional Operations View

**User Story:** As a warehouse employee, I want to view SKU movement data for specific feeder warehouses, so that I can understand which products are performing well and which are sitting idle at my location.

#### Acceptance Criteria

1. WHEN an employee accesses the Regional Operations tab, THE Executive_Command_Center SHALL provide a dropdown selector for choosing a Feeder_Warehouse
2. WHEN a Feeder_Warehouse is selected, THE Executive_Command_Center SHALL display all SKUs associated with that location
3. FOR each SKU at the selected location, THE Executive_Command_Center SHALL classify it with a SKU_Movement_Status (Moving, Idle, or Critical)
4. WHEN displaying SKU data, THE Executive_Command_Center SHALL show movement velocity metrics for each SKU
5. THE Executive_Command_Center SHALL use visual indicators (progress rings, color coding) to represent SKU movement status

### Requirement 3: Predictive Stockout Analysis

**User Story:** As a warehouse manager, I want to see predicted stockout dates for every SKU, so that I can proactively plan replenishment before inventory runs out.

#### Acceptance Criteria

1. WHEN calculating predictions, THE Executive_Command_Center SHALL use 12 months of historical sales data
2. FOR each active SKU, THE Executive_Command_Center SHALL compute a Stockout_Date based on current inventory and historical velocity
3. WHEN displaying SKU information, THE Executive_Command_Center SHALL show the Stockout_Date alongside current stock levels
4. WHEN a Stockout_Date is within 7 days, THE Executive_Command_Center SHALL highlight the SKU with critical urgency indicators
5. THE Executive_Command_Center SHALL update Stockout_Date predictions daily based on latest sales data

### Requirement 4: Priority Shipping List Generation

**User Story:** As a warehouse employee, I want an automatically generated priority shipping list, so that I know exactly which SKUs to pack and ship to which feeder warehouses first.

#### Acceptance Criteria

1. WHEN generating the Priority_Shipping_List, THE Executive_Command_Center SHALL calculate Urgency_Level for each SKU using the formula: (Sales_Velocity × Stockout_Risk) / Current_Stock
2. THE Executive_Command_Center SHALL classify SKUs into three Urgency_Levels: Level 1 (Critical: High velocity + Low stock), Level 2 (High: Medium velocity or Medium stock), Level 3 (Medium: Low velocity or High stock)
3. WHEN displaying the Priority_Shipping_List, THE Executive_Command_Center SHALL sort SKUs by Urgency_Level (Level 1 first, then Level 2, then Level 3)
4. FOR each SKU in the Priority_Shipping_List, THE Executive_Command_Center SHALL specify the target Feeder_Warehouse destination
5. WHEN an employee requests a Shipping_Manifest, THE Executive_Command_Center SHALL generate a downloadable document containing the Priority_Shipping_List with quantities and destinations

### Requirement 5: Statistical ROP Integration

**User Story:** As a supply chain analyst, I want the priority shipping list to use statistical reorder points, so that replenishment decisions are based on data-driven thresholds rather than arbitrary rules.

#### Acceptance Criteria

1. WHEN calculating priority rankings, THE Executive_Command_Center SHALL use Statistical_ROP values computed from 12-month historical data
2. WHEN a SKU's current stock falls below its Statistical_ROP, THE Executive_Command_Center SHALL automatically elevate its Urgency_Level
3. THE Executive_Command_Center SHALL recalculate Statistical_ROP values monthly based on rolling 12-month windows
4. WHEN displaying SKU details, THE Executive_Command_Center SHALL show both current stock and Statistical_ROP threshold
5. THE Executive_Command_Center SHALL use Statistical_ROP as a primary factor in Priority_Shipping_List generation

### Requirement 6: Visual-First Interface Design

**User Story:** As a user, I want a modern visual interface with minimal tables, so that I can quickly understand data through charts and graphics rather than reading dense text.

#### Acceptance Criteria

1. WHEN displaying stock levels, THE Executive_Command_Center SHALL use Visual_Progress_Rings instead of numeric-only displays
2. THE Executive_Command_Center SHALL replace all table-only views with chart-based visualizations (bar charts, line charts, area charts, or bubble charts)
3. WHEN showing KPI metrics, THE Executive_Command_Center SHALL use large, prominent numbers with visual trend indicators (up/down arrows, sparklines)
4. THE Executive_Command_Center SHALL use color coding consistently: green for healthy, yellow for warning, red for critical
5. WHERE tables are necessary for detailed data, THE Executive_Command_Center SHALL provide them as expandable sections below primary visual displays

### Requirement 7: Actionable Button-Based Workflows

**User Story:** As a user, I want clear action buttons for every workflow, so that I understand what actions I can take and can execute them with a single click.

#### Acceptance Criteria

1. THE Executive_Command_Center SHALL replace text-only action links with prominent button components
2. WHEN a Priority_Shipping_List is ready, THE Executive_Command_Center SHALL display a "Generate Shipping Manifest" button
3. WHEN displaying replenishment recommendations, THE Executive_Command_Center SHALL provide "Create Purchase Order" and "Schedule Transfer" buttons
4. THE Executive_Command_Center SHALL use descriptive button labels that clearly indicate the action outcome (e.g., "Export Regional Report" instead of "Export")
5. WHEN a button action is processing, THE Executive_Command_Center SHALL show loading states with progress indicators

### Requirement 8: Multi-Platform Brand Health Aggregation

**User Story:** As a founder, I want to see combined performance metrics across Blinkit and Amazon, so that I can understand total brand health rather than viewing platforms separately.

#### Acceptance Criteria

1. WHEN calculating Brand_Health_Score, THE Executive_Command_Center SHALL aggregate data from both Blinkit and Amazon platforms
2. THE Executive_Command_Center SHALL compute platform-specific sub-scores and display them alongside the total Brand_Health_Score
3. WHEN displaying geographic performance, THE Executive_Command_Center SHALL combine sales data from both platforms for each region
4. THE Executive_Command_Center SHALL allow founders to toggle between combined view and platform-specific views
5. WHEN aggregating metrics, THE Executive_Command_Center SHALL normalize values to account for different platform scales

### Requirement 9: Geographic Performance Visualization

**User Story:** As a founder, I want to see sales performance by geographic region, so that I can identify which markets are performing well and which need attention.

#### Acceptance Criteria

1. THE Executive_Command_Center SHALL display sales data for Ahmedabad, Mumbai, and Bangalore regions
2. WHEN rendering the Geographic_Sales_Map, THE Executive_Command_Center SHALL use bubble size to represent sales volume
3. THE Executive_Command_Center SHALL use color intensity to represent sales growth rate (darker = higher growth)
4. WHEN a founder clicks on a region bubble, THE Executive_Command_Center SHALL display detailed metrics for that region
5. THE Executive_Command_Center SHALL update geographic data in real-time as new sales are recorded

### Requirement 10: Role-Based View Separation

**User Story:** As a system administrator, I want clear separation between executive and employee views, so that each user type sees information relevant to their role.

#### Acceptance Criteria

1. THE Executive_Command_Center SHALL provide two distinct navigation paths: "Executive Dashboard" and "Regional Operations"
2. WHEN a user with founder role accesses the system, THE Executive_Command_Center SHALL default to the Executive Dashboard view
3. WHEN a user with employee role accesses the system, THE Executive_Command_Center SHALL default to the Regional Operations view
4. THE Executive_Command_Center SHALL allow users to switch between views using a prominent navigation toggle
5. WHERE role-specific features exist, THE Executive_Command_Center SHALL hide or disable features not applicable to the current user role

### Requirement 11: Marketing ROI Visualization

**User Story:** As a founder, I want to see advertising efficiency by geographic region, so that I can identify where marketing budget is generating returns and where it is being wasted.

#### Acceptance Criteria

1. WHEN displaying the Executive Summary, THE Executive_Command_Center SHALL render an Ad_Efficiency_Map showing advertising spend and revenue by city
2. THE Executive_Command_Center SHALL use orange bubbles to represent advertising spend magnitude for each region
3. THE Executive_Command_Center SHALL use green bubbles to represent revenue magnitude for each region
4. WHEN calculating ad efficiency, THE Executive_Command_Center SHALL compute ROI ratio as (Revenue - Ad_Spend) / Ad_Spend for each region
5. WHEN a founder clicks on a region in the Ad_Efficiency_Map, THE Executive_Command_Center SHALL display detailed breakdown of ad spend, revenue, and ROI percentage
