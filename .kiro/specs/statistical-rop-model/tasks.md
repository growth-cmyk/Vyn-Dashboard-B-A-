# Implementation Plan: Statistical Safety Stock & Reorder Point (ROP) Model

## Overview

This implementation plan upgrades the replenishment logic from a simple lead time + safety days calculation to a Statistical Safety Stock & Reorder Point (ROP) Model. The approach uses standard deviation of historical monthly demand and service level targets (Z-scores) to calculate optimal safety stock that accounts for demand variability.

## Tasks

### Phase 1: Data Infrastructure & Constants

- [x] 1. Add Z-Table constant and service level configuration
  - Create Z_TABLE constant mapping service levels to Z-scores (85% → 1.04, 90% → 1.28, 95% → 1.64, 98% → 2.05, 99% → 2.33, 99.8% → 2.88)
  - Add DEFAULT_SERVICE_LEVEL = 95 and DEFAULT_Z_SCORE = 1.64
  - Export constants from types/index.ts for reuse
  - _Requirements: 1.1, 1.2, 1.4, 1.5_

- [x] 2. Update InventoryItem type with monthly demand
  - Add optional monthlyDemand?: number[] field to InventoryItem interface
  - Add JSDoc comment explaining: "Array of 12 months of sales data (oldest to newest)"
  - Update InventoryValidationSchema to include monthlyDemand validation
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 3. Create StatisticalROPResult interface
  - Define complete interface with all ROP calculation fields
  - Include: rop, safetyStock, avgMonthlyDemand, avgDailyDemand, standardDeviation, serviceLevel, zScore, leadTimeMonths, forecastQty, demandDuringLeadTime, calculationMethod
  - Add to types/index.ts and export
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

### Phase 2: Statistical Calculation Methods

- [x] 4. Implement statistical helper methods in ReplenishmentService
  - [x] 4.1 Implement calculateAverageMonthlyDemand(monthlyDemand: number[]): number
    - Calculate sum of 12 months and divide by 12
    - Handle edge case: empty array returns 0
    - _Requirements: 3.2_

  - [x] 4.2 Implement calculateStandardDeviation(monthlyDemand: number[], mean: number): number
    - Use formula: sqrt(sum((x - mean)²) / n)
    - Handle edge case: single value or all same values returns 0
    - _Requirements: 3.3, 9.3_

  - [x] 4.3 Implement getZScore(serviceLevel: number): number
    - Lookup Z-score from Z_TABLE
    - Default to 1.64 (95%) if service level not found
    - _Requirements: 1.3, 1.5_

  - [x] 4.4 Implement calculateSafetyStock(standardDeviation, leadTimeMonths, zScore, forecastQty): number
    - Use formula: σ × √(Lead Time in Months) × Z + Forecast Qty
    - Return Math.ceil() for whole units
    - _Requirements: 3.4_

- [x] 5. Implement main calculateStatisticalROP method
  - Check if monthlyDemand is available and valid (length === 12)
  - If not available, call calculateSimpleROP() fallback
  - Calculate average monthly demand and daily demand (monthly / 30)
  - Calculate standard deviation
  - Get Z-score for service level
  - Convert lead time to months (days / 30)
  - Calculate safety stock using statistical formula
  - Calculate demand during lead time (avg daily × lead time days)
  - Calculate ROP = demand during lead time + safety stock
  - Return complete StatisticalROPResult object
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 6. Implement calculateSimpleROP fallback method
  - Use existing logic with last30Days as proxy for demand
  - Calculate simple safety stock: (3 days × avg daily demand) + forecast qty
  - Return StatisticalROPResult with calculationMethod: 'simple'
  - Ensure backward compatibility with items lacking monthlyDemand
  - _Requirements: 10.1, 10.2, 10.3_

### Phase 3: UI Configuration Panel Enhancements

- [x] 7. Add Service Level dropdown to ReplenishmentPlanner
  - Create SERVICE_LEVELS constant: [85, 90, 95, 98, 99, 99.8]
  - Add state: serviceLevel with localStorage persistence ('vyndo_service_level')
  - Render dropdown in configuration panel with Z-scores shown: "95% (Z = 1.64)"
  - Update all ROP calculations when service level changes
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 8. Update configuration panel UI
  - Replace "Lead Time" and "Safety Stock" labels with "Statistical ROP Model" header
  - Keep lead time display as read-only (platform-specific: 15 days Blinkit, 7 days Amazon)
  - Add service level dropdown below lead time
  - Update formula display to show: "ROP = (Avg Daily Demand × Lead Time) + Safety Stock"
  - Add note: "Safety Stock = σ × √(Lead Time in Months) × Z + Forecast Qty"
  - _Requirements: 11.1, 7.1, 7.2, 7.3_

### Phase 4: Replenishment Table Enhancements

- [x] 9. Add Forecast Qty input column to replenishment table
  - Create ForecastQuantityStorage interface for localStorage structure
  - Add state management for forecast quantities per item
  - Render input field in table with placeholder "0"
  - Persist changes to localStorage ('vyndo_forecast_quantities')
  - Recalculate ROP immediately when forecast changes
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10. Replace "Recommended Order" with "ROP" column
  - Update column header to "ROP (Reorder Point)"
  - Display calculated ROP value with info icon
  - Show calculation method badge: "Statistical" or "Simple"
  - Update urgency score calculation: (ROP - Current Stock) / Sales Velocity
  - _Requirements: 11.2, 11.4, 10.3_

- [x] 11. Add Safety Stock column to table
  - Insert column after "Days of Cover"
  - Display calculated safety stock value
  - Show breakdown: "Statistical: X + Forecast: Y = Total"
  - Color code: green if adequate, amber if low
  - _Requirements: 11.3_

- [x] 12. Implement ROP tooltip with math breakdown
  - Create ROPTooltip component
  - Display on hover over info icon next to ROP value
  - Show: Avg Daily Demand, Lead Time, Demand during Lead Time
  - Show: Service Level, Z-score, Standard Deviation
  - Show: Safety Stock breakdown (statistical + forecast)
  - Show: Final ROP formula with actual values
  - Show: Calculation method (statistical vs simple)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

### Phase 5: Marketing Module Integration

- [x] 13. Update strategic action logic to use ROP
  - Modify determineStrategicAction() in MarketingService or AdInventorySyncService
  - Implement logic: Current Stock < ROP → "PAUSE ADS"
  - Implement logic: Current Stock >= ROP AND < (ROP + Safety Stock) → "MONITOR"
  - Implement logic: Current Stock >= (ROP + Safety Stock) AND good performance → "SCALE ADS"
  - Otherwise → "OPTIMIZE"
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 14. Add ROP display to Ad-Inventory Sync table
  - Add ROP column to marketing sync table
  - Display current stock vs ROP comparison
  - Show visual indicator: red if below ROP, green if above
  - Add tooltip explaining ROP-based logic
  - _Requirements: 8.5_

### Phase 6: Export and Data Handling

- [x] 15. Update CSV export to include ROP data
  - Add columns: ROP, Safety Stock, Service Level, Standard Deviation, Calculation Method
  - Include forecast quantity in export
  - Add column: "Current Stock vs ROP" (difference)
  - Update export filename to include service level: "purchase-order-95pct-{date}.csv"
  - _Requirements: 11.5_

- [x] 16. Add validation for monthly demand data
  - Create validateMonthlyDemand() helper function
  - Check: array length === 12
  - Check: all values are numbers >= 0
  - Log warnings for invalid data but don't break
  - _Requirements: 2.4, 2.5, 9.5_

### Phase 7: Testing and Verification

- [ ] 17. Create unit tests for statistical calculations
  - Test calculateAverageMonthlyDemand with various inputs
  - Test calculateStandardDeviation with known datasets
  - Test getZScore for all service levels
  - Test calculateSafetyStock with different parameters
  - Test edge cases: zero variance, all zeros, single non-zero
  - _Requirements: 9.1, 9.2, 9.3, 9.5_

- [ ]* 17.1 Write property test for variability impact
  - **Property 1: Variability Impact on Safety Stock**
  - **Validates: Requirements 9.1, 9.4**

- [ ]* 17.2 Write property test for service level monotonicity
  - **Property 2: Service Level Monotonicity**
  - **Validates: Requirements 4.3, 3.4**

- [ ]* 17.3 Write property test for ROP non-negativity
  - **Property 3: ROP Non-Negativity**
  - **Validates: Requirements 3.5, 9.5**

- [ ]* 17.4 Write property test for forecast additivity
  - **Property 4: Forecast Additivity**
  - **Validates: Requirements 5.2, 3.4**

- [ ]* 17.5 Write property test for zero variability edge case
  - **Property 5: Zero Variability Edge Case**
  - **Validates: Requirements 9.2, 9.5**

- [ ] 18. Verify high variability increases safety stock
  - Create test items with same average but different standard deviations
  - Calculate ROP for both items
  - Assert: higher σ item has higher safety stock
  - Document test results showing variability impact
  - _Requirements: 9.1, 9.4_

- [ ] 19. Integration testing
  - Test service level change updates all ROPs immediately
  - Test forecast quantity persistence across page reloads
  - Test marketing PAUSE ADS trigger when stock < ROP
  - Test backward compatibility with items lacking monthlyDemand
  - Test performance with 1000+ items (<2 seconds)
  - _Requirements: 10.1, 10.2, 10.4, 12.1, 12.2_

- [ ] 20. Final checkpoint - Verify all calculations
  - Ensure statistical ROP matches Excel logic exactly
  - Verify Z-scores match standard normal distribution
  - Confirm lead time preservation (15 days Blinkit, 7 days Amazon)
  - Validate UI displays all required information
  - Test export CSV includes all new columns
  - Ask the user if questions arise about any discrepancies

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Statistical calculations must match Excel formulas exactly
- Backward compatibility is critical - items without monthlyDemand must continue working
- UI should clearly indicate which calculation method is used (statistical vs simple)
- Marketing module integration ensures ads pause when inventory is below ROP
- Performance target: <2 seconds for 1000+ items
- All localStorage keys should use 'vyndo_' prefix for consistency
