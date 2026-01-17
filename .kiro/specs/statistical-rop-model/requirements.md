# Requirements Document: Statistical Safety Stock & Reorder Point (ROP) Model

## Introduction

This document outlines the upgrade from the current simple replenishment logic to a Statistical Safety Stock & Reorder Point (ROP) Model based on standard deviation and service level targets. The system will calculate safety stock using statistical methods that account for demand variability, providing more accurate reorder points that balance inventory costs with stockout risk.

## Glossary

- **Z-Score**: Statistical measure representing the number of standard deviations from the mean, used to calculate safety stock based on desired service level
- **Service Level**: Target probability of not experiencing a stockout during a replenishment cycle (e.g., 95% = 1.64 standard deviations)
- **Standard Deviation (σ)**: Measure of demand variability over time, calculated from historical monthly demand
- **Safety Stock**: Buffer inventory calculated using statistical methods to protect against demand variability
- **Reorder Point (ROP)**: Inventory level that triggers a new purchase order, calculated as demand during lead time plus safety stock
- **Monthly Demand**: Historical sales data for the last 12 months, used to calculate average demand and standard deviation
- **Forecast Quantity**: User-provided expected demand spike (e.g., festival season) added to safety stock calculation

## Requirements

### Requirement 1: Z-Table Integration

**User Story:** As a system, I want hardcoded Z-score mappings for service levels, so that safety stock calculations are statistically accurate.

#### Acceptance Criteria

1. THE System SHALL define a constant Z_TABLE mapping service levels to Z-scores
2. THE Z_TABLE SHALL include mappings for: 85% → 1.04, 90% → 1.28, 95% → 1.64, 98% → 2.05, 99% → 2.33, 99.8% → 2.88
3. WHEN calculating safety stock THEN the system SHALL use the Z-score corresponding to the selected service level
4. THE Z_TABLE SHALL be immutable and defined as a TypeScript constant
5. WHEN an invalid service level is requested THEN the system SHALL default to 95% (Z = 1.64)

### Requirement 2: Historical Demand Data Structure

**User Story:** As a developer, I want inventory items to include 12 months of historical demand, so that statistical calculations can be performed.

#### Acceptance Criteria

1. THE InventoryItem type SHALL include a monthlyDemand array containing 12 months of sales data
2. WHEN monthlyDemand is not available THEN the system SHALL fall back to existing last7Days/last15Days/last30Days calculations
3. THE monthlyDemand array SHALL be ordered from oldest to newest (index 0 = 12 months ago, index 11 = current month)
4. WHEN calculating statistics THEN the system SHALL use all 12 months of data if available
5. THE system SHALL validate that monthlyDemand contains exactly 12 numeric values when present

### Requirement 3: Statistical ROP Calculation

**User Story:** As a system, I want to calculate Reorder Point using statistical methods, so that inventory recommendations account for demand variability.

#### Acceptance Criteria

1. THE System SHALL implement a calculateStatisticalROP method in ReplenishmentService
2. WHEN calculating ROP THEN the system SHALL compute: Average Monthly Demand = sum(monthlyDemand) / 12
3. WHEN calculating ROP THEN the system SHALL compute: Standard Deviation (σ) = sqrt(sum((x - mean)²) / 12)
4. WHEN calculating Safety Stock THEN the system SHALL use formula: σ × √(Lead Time in Months) × Z + Forecast Qty
5. WHEN calculating ROP THEN the system SHALL use formula: (Avg Daily Demand × Lead Time in Days) + Safety Stock

### Requirement 4: Service Level Configuration

**User Story:** As a user, I want to select a service level percentage, so that I can control the trade-off between inventory costs and stockout risk.

#### Acceptance Criteria

1. THE Replenishment Planner SHALL display a Service Level dropdown in the configuration panel
2. THE dropdown SHALL offer options: 85%, 90%, 95%, 98%, 99%, 99.8%
3. WHEN the service level is changed THEN all ROP calculations SHALL update immediately
4. THE selected service level SHALL be persisted to localStorage for future sessions
5. THE default service level SHALL be 95% for new users

### Requirement 5: Forecast Quantity Input

**User Story:** As a user, I want to add forecast quantities for expected demand spikes, so that safety stock accounts for upcoming events like festivals.

#### Acceptance Criteria

1. THE replenishment table SHALL include a Forecast Qty input field for each item
2. WHEN a forecast quantity is entered THEN it SHALL be added to the safety stock calculation
3. THE forecast quantity SHALL default to 0 if not specified
4. WHEN forecast quantity is changed THEN the ROP SHALL recalculate immediately
5. THE forecast quantities SHALL be persisted to localStorage per item

### Requirement 6: ROP Math Breakdown Tooltip

**User Story:** As a user, I want to see how ROP is calculated, so that I understand the recommendation logic.

#### Acceptance Criteria

1. THE ROP value in the table SHALL display an info icon with a tooltip
2. WHEN hovering over the info icon THEN the tooltip SHALL show: "ROP = (Avg Daily Demand × Lead Time) + Safety Stock"
3. THE tooltip SHALL display the actual calculated values: "ROP = (X units/day × Y days) + Z units = Total"
4. THE tooltip SHALL show the service level and Z-score used: "Service Level: 95% (Z = 1.64)"
5. THE tooltip SHALL show the standard deviation: "Demand Variability (σ): X units/month"

### Requirement 7: Platform Lead Time Preservation

**User Story:** As a system, I want to maintain existing platform-specific lead times, so that business logic remains consistent.

#### Acceptance Criteria

1. THE System SHALL continue using 15-day lead time for Blinkit
2. THE System SHALL continue using 7-day lead time for Amazon
3. WHEN calculating ROP THEN the system SHALL use the platform-specific lead time
4. WHEN calculating Safety Stock THEN Lead Time in Months SHALL be: Lead Time in Days / 30
5. THE platform lead times SHALL remain configurable in PlatformContextService

### Requirement 8: Marketing Module Integration

**User Story:** As a marketer, I want ads to pause when inventory falls below ROP, so that we don't advertise products we can't fulfill.

#### Acceptance Criteria

1. WHEN Current Stock < ROP THEN the Marketing module SHALL trigger "PAUSE ADS" action
2. THE AdInventorySyncItem SHALL use ROP instead of simple days of cover for strategic actions
3. WHEN Current Stock >= ROP AND Current Stock < (ROP + Safety Stock) THEN action SHALL be "MONITOR"
4. WHEN Current Stock >= (ROP + Safety Stock) THEN action SHALL be "SCALE ADS" if performance is good
5. THE Marketing module SHALL display ROP value in the inventory sync table

### Requirement 9: Demand Variability Verification

**User Story:** As a developer, I want to verify that high variability increases safety stock, so that the statistical model works correctly.

#### Acceptance Criteria

1. WHEN an item has high standard deviation (volatile sales) THEN Safety Stock SHALL be higher than stable items
2. WHEN an item has zero standard deviation (constant sales) THEN Safety Stock SHALL equal Forecast Qty only
3. THE system SHALL calculate standard deviation correctly using the formula: sqrt(sum((x - mean)²) / n)
4. WHEN comparing two items with same average demand but different σ THEN the higher σ item SHALL have higher ROP
5. THE system SHALL handle edge cases: all zeros, single non-zero value, negative values (treat as zero)

### Requirement 10: Backward Compatibility

**User Story:** As a system, I want to support items without monthly demand data, so that existing functionality continues to work.

#### Acceptance Criteria

1. WHEN monthlyDemand is not available THEN the system SHALL use the existing simple formula
2. WHEN monthlyDemand is available THEN the system SHALL use the statistical ROP formula
3. THE replenishment table SHALL indicate which calculation method is used (icon or badge)
4. WHEN exporting purchase orders THEN the CSV SHALL include the calculation method used
5. THE system SHALL not break or error when processing items without monthlyDemand

### Requirement 11: UI Enhancements

**User Story:** As a user, I want clear visual indicators of the new statistical model, so that I understand the improved accuracy.

#### Acceptance Criteria

1. THE configuration panel SHALL display "Statistical ROP Model" when service level is configured
2. THE replenishment table SHALL show "ROP" column instead of "Recommended Order"
3. THE table SHALL include a "Safety Stock" column showing the calculated buffer
4. THE urgency score SHALL be recalculated based on: (ROP - Current Stock) / Sales Velocity
5. THE export CSV SHALL include columns: ROP, Safety Stock, Service Level, Standard Deviation

### Requirement 12: Performance Optimization

**User Story:** As a system, I want efficient statistical calculations, so that the UI remains responsive with large datasets.

#### Acceptance Criteria

1. WHEN calculating statistics for 1000+ items THEN the UI SHALL remain responsive (<2 seconds)
2. THE statistical calculations SHALL be memoized to avoid redundant computation
3. WHEN service level changes THEN only the Z-score lookup and safety stock SHALL recalculate
4. THE system SHALL use efficient array operations for standard deviation calculation
5. WHEN forecast quantities change THEN only affected items SHALL recalculate
