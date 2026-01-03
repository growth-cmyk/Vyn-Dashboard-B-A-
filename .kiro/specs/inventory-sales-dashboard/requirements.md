# Requirements Document

## Introduction

A lightweight inventory and sales dashboard for Vyndo products that displays current stock levels, sales data, and identifies out-of-stock, overstock, and understock situations by location and SKU.

## Glossary

- **Dashboard**: Web interface showing inventory and sales data
- **SKU**: Stock Keeping Unit - unique product identifier
- **Days of Cover**: Days current inventory will last based on sales velocity
- **Out of Stock**: Zero sellable inventory
- **Overstock**: Inventory exceeding optimal levels
- **Understock**: Low inventory but not out of stock
- **Expiry Risk**: Inventory with excessive days of cover (>90 days) at risk of expiration
- **Replenishment Calculator**: Tool to calculate optimal reorder quantities
- **Lead Time**: Time between placing an order and receiving inventory (default 7 days)
- **Safety Stock**: Buffer inventory to prevent stockouts (default 3 days of sales)
- **Inventory Snapshotting**: Historical tracking of inventory levels over time

## Requirements

### Requirement 1

**User Story:** As a user, I want to view inventory levels and sales data, so that I can monitor stock status across locations.

#### Acceptance Criteria

1. WHEN the dashboard loads THEN the system SHALL display current inventory levels for all SKUs by location
2. WHEN viewing data THEN the system SHALL show sellable inventory, sales quantities, and product details
3. WHEN filtering by location or SKU THEN the system SHALL update all displays accordingly

### Requirement 2

**User Story:** As a user, I want to identify stock issues, so that I can take appropriate action.

#### Acceptance Criteria

1. WHEN analyzing inventory THEN the system SHALL calculate days of cover using sales velocity
2. WHEN stock levels are critical THEN the system SHALL identify out-of-stock, overstock, and understock items
3. WHEN displaying stock status THEN the system SHALL use color coding for quick identification

### Requirement 3

**User Story:** As a user, I want to analyze data by time periods, so that I can understand trends.

#### Acceptance Criteria

1. WHEN selecting time periods THEN the system SHALL show sales data for last month, MTD, and YTD
2. WHEN viewing sales data THEN the system SHALL display quantities and revenue by location and SKU
3. WHEN comparing periods THEN the system SHALL calculate percentage changes

### Requirement 4

**User Story:** As a business user, I want a professional-grade analytics cockpit with branded styling, so that I can efficiently navigate and analyze inventory data in a premium interface.

#### Acceptance Criteria

1. WHEN accessing the dashboard THEN the system SHALL display a fixed sidebar navigation with modern aesthetic using Lucide icons
2. WHEN viewing the interface THEN the system SHALL apply Vyndo brand colors and typography consistently throughout
3. WHEN using the dashboard THEN the system SHALL provide a responsive layout with light-gray background and white data cards
4. WHEN viewing key metrics THEN the system SHALL display KPI summary cards in a Bento Grid layout with sparkline charts
5. WHEN interacting with data tables THEN the system SHALL provide sticky headers, status badges, progress bars, and quick action buttons
6. WHEN uploading data THEN the system SHALL provide drag-and-drop interface with progress stepper and toast notifications

### Requirement 5

**User Story:** As a supply chain manager, I want advanced inventory management aligned with Vyndo's 4-Month Strategic Roadmap, so that I can optimize stock levels, prevent expiry, and automate replenishment decisions.

#### Acceptance Criteria

1. WHEN analyzing stock status THEN the system SHALL classify inventory using 6-month expiry-based thresholds: Understock (<14 days), Healthy (14-45 days), Overstock (45-90 days), Expiry Risk (>90 days)
2. WHEN viewing understock items THEN the system SHALL trigger 'Restock' alerts with recommended reorder quantities calculated as: (Lead Time * Sales Velocity) + Safety Stock - Current Stock
3. WHEN identifying overstock items (45-90 days) THEN the system SHALL display 'Freeze POs' amber status to prevent additional ordering
4. WHEN detecting expiry risk items (>90 days) THEN the system SHALL trigger 'Flash Promo' red alerts to accelerate inventory movement
5. WHEN uploading inventory data THEN the system SHALL save historical snapshots to build inventory trend charts over time
6. WHEN viewing the Action Center THEN the system SHALL display a 'Replenishment Planner' section with calculated reorder quantities for all understock items
7. WHEN processing CSV files THEN the system SHALL handle Master Inventory sheets with 'Item ID', 'Location', and 'Total Sellable' as primary keys
8. WHEN viewing inventory trends THEN the system SHALL display historical 'Total Sellable' values as line charts showing inventory movement over time