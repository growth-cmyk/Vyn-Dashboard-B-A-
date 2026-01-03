# Requirements Document: Multi-Platform Expansion (Amazon + Blinkit)

## Introduction

This document outlines the expansion of the Vyndo inventory dashboard to support both Amazon and Blinkit sales channels while maintaining strict data separation and platform-specific business logic. The system must provide unified analytics capabilities while preserving the integrity of platform-specific metrics and calculations.

## Glossary

- **Platform**: Sales channel (Blinkit or Amazon)
- **Unified View**: Combined analytics across all platforms
- **Platform Switcher**: UI control for selecting active platform view
- **Platform-Aware**: Components that adapt behavior based on selected platform
- **Cross-Platform Metrics**: Analytics that aggregate data across multiple platforms
- **Platform-Specific Logic**: Business rules that vary by sales channel
- **Amazon Referral Fee**: Platform commission (15% placeholder)
- **Estimated Payout**: Revenue minus platform fees for Amazon

## Requirements

### Requirement 1: Platform-Aware Data Architecture

**User Story:** As a system architect, I want platform-aware data management, so that Amazon and Blinkit data remain properly separated while enabling unified analytics.

#### Acceptance Criteria

1. WHEN the application initializes THEN the system SHALL support an activePlatform state variable with values 'Blinkit' | 'Amazon' | 'All'
2. WHEN processing data uploads THEN the system SHALL tag all records with their source platform identifier
3. WHEN storing inventory snapshots THEN the system SHALL include platform ID for independent historical tracking
4. WHEN filtering data THEN the system SHALL respect platform selection across all components and services
5. WHEN switching platforms THEN the system SHALL maintain separate state contexts for each platform

### Requirement 2: Amazon Data Integration

**User Story:** As a data manager, I want to upload Amazon sales reports, so that I can analyze Amazon channel performance alongside Blinkit data.

#### Acceptance Criteria

1. WHEN uploading Amazon CSV files THEN the system SHALL parse headers like 'sku', 'units-ordered', and 'item-price'
2. WHEN processing Amazon data THEN the system SHALL map Amazon fields to internal SalesRecord model structure
3. WHEN validating Amazon files THEN the system SHALL provide clear error messages for missing or incorrect headers
4. WHEN Amazon data is loaded THEN the system SHALL automatically tag records with 'Amazon' platform identifier
5. WHEN displaying upload history THEN the system SHALL show platform source for each data snapshot

### Requirement 3: Platform-Specific Supply Chain Logic

**User Story:** As a supply chain manager, I want platform-specific lead times, so that replenishment calculations reflect actual operational differences between Amazon and Blinkit.

#### Acceptance Criteria

1. WHEN calculating replenishment for Blinkit items THEN the system SHALL use 15-day lead time
2. WHEN calculating replenishment for Amazon items THEN the system SHALL use 7-day lead time
3. WHEN displaying replenishment recommendations THEN the system SHALL show the lead time used in calculations
4. WHEN switching between platforms THEN the system SHALL recalculate all metrics using platform-specific parameters
5. WHEN viewing unified data THEN the system SHALL apply appropriate lead times based on each item's platform source

### Requirement 4: Platform Switcher Interface

**User Story:** As a business user, I want a platform switcher, so that I can focus on specific channel data or view unified analytics across all platforms.

#### Acceptance Criteria

1. WHEN accessing the dashboard THEN the system SHALL display a platform switcher at the top of the sidebar
2. WHEN viewing platform options THEN the system SHALL show Unified View (Layers icon), Blinkit (ShoppingBag icon), and Amazon (Box icon)
3. WHEN selecting a platform THEN the system SHALL filter all charts, KPI cards, and tables to show only that platform's data
4. WHEN switching to unified view THEN the system SHALL display aggregated metrics across all platforms
5. WHEN platform is selected THEN the system SHALL provide clear visual indication of active platform throughout the interface

### Requirement 5: Amazon-Specific Metrics

**User Story:** As an Amazon seller, I want Amazon-specific financial metrics, so that I can understand net profitability after platform fees.

#### Acceptance Criteria

1. WHEN viewing Amazon sales analytics THEN the system SHALL display an 'Estimated Payout' card
2. WHEN calculating estimated payout THEN the system SHALL subtract 15% referral fee from gross revenue
3. WHEN displaying Amazon metrics THEN the system SHALL clearly indicate fee calculations and assumptions
4. WHEN comparing platforms THEN the system SHALL show both gross and net revenue for Amazon
5. WHEN exporting Amazon data THEN the system SHALL include estimated payout calculations in reports

### Requirement 6: Platform-Aware Visual Theming

**User Story:** As a user, I want visual platform indicators, so that I can immediately identify which platform data I'm viewing.

#### Acceptance Criteria

1. WHEN Amazon platform is active THEN the system SHALL use Amazon blue/yellow accent colors in charts and highlights
2. WHEN Blinkit platform is active THEN the system SHALL use Vyndo orange branding colors
3. WHEN unified view is active THEN the system SHALL use neutral or combined color schemes
4. WHEN switching platforms THEN the system SHALL smoothly transition color themes across all components
5. WHEN viewing platform-specific data THEN the system SHALL maintain consistent color coding throughout the interface

### Requirement 7: Cross-Platform Analytics

**User Story:** As a business analyst, I want unified analytics, so that I can compare performance and identify opportunities across all sales channels.

#### Acceptance Criteria

1. WHEN viewing unified dashboard THEN the system SHALL display combined KPI metrics across all platforms
2. WHEN analyzing trends THEN the system SHALL show platform breakdown within unified charts
3. WHEN comparing performance THEN the system SHALL provide side-by-side platform metrics
4. WHEN filtering unified data THEN the system SHALL maintain platform attribution in all displays
5. WHEN exporting unified reports THEN the system SHALL include platform-specific breakdowns

### Requirement 8: Platform-Aware Inventory Management

**User Story:** As an inventory manager, I want platform-specific stock analysis, so that I can optimize inventory levels for each sales channel independently.

#### Acceptance Criteria

1. WHEN viewing inventory overview THEN the system SHALL show stock levels by platform when platform is selected
2. WHEN calculating days of cover THEN the system SHALL use platform-specific sales velocity
3. WHEN generating replenishment recommendations THEN the system SHALL group suggestions by platform
4. WHEN viewing stock alerts THEN the system SHALL indicate which platform requires attention
5. WHEN managing inventory THEN the system SHALL support platform-specific safety stock and lead time configurations

### Requirement 9: Data Integrity and Validation

**User Story:** As a system administrator, I want robust data validation, so that platform mixing errors are prevented and data quality is maintained.

#### Acceptance Criteria

1. WHEN uploading files THEN the system SHALL validate platform-specific CSV schemas
2. WHEN processing mixed data THEN the system SHALL prevent accidental platform data mixing
3. WHEN detecting data inconsistencies THEN the system SHALL provide clear error messages with platform context
4. WHEN validating calculations THEN the system SHALL ensure platform-specific business rules are applied correctly
5. WHEN auditing data THEN the system SHALL provide platform traceability for all records and calculations