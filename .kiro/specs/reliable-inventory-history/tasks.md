# Implementation Plan: Reliable Inventory History Management

## Overview

This implementation plan transforms the inventory history system from localStorage-based snapshots to file-based cumulative history using Upload Date columns. The approach prioritizes file-based dates for trend analysis while maintaining backward compatibility and protecting current operational logic.

## Tasks

### Phase 1: Data Logic Refactor

- [-] 1. Enhance DataService.ts with date column detection
  - Implement `detectUploadDateColumn()` method to scan for date columns ('Upload Date', 'Date', 'Timestamp', etc.)
  - Add date format validation supporting DD-MM-YYYY, MM/DD/YYYY, YYYY-MM-DD, and ISO formats
  - Create `parseFileBasedHistory()` method to group inventory items by unique dates
  - _Requirements: 1.1, 1.2, 2.1_

- [x] 1.1 Write property test for date column detection
  - **Property 1: Date Column Detection and Parsing**
  - **Validates: Requirements 1.1, 1.2, 1.5**

- [x] 1.2 Add CumulativeHistoryData interface to types/index.ts
  - Define interface with uploadDates array, dataByDate Map, and metadata fields
  - Add enhanced InventorySnapshot interface with fileUploadDate and isFileBasedHistory fields
  - Update InventoryItem interface with optional uploadDate field
  - _Requirements: 1.3, 2.1_

- [x] 1.3 Write property test for cumulative history classification
  - **Property 2: Cumulative History Classification**
  - **Validates: Requirements 1.3, 1.4**

- [x] 1.4 Implement enhanced loadMasterInventoryDataWithHistory method
  - Modify existing loadInventoryData to detect and process date columns
  - Return both inventory items and cumulative history data when dates are found
  - Maintain backward compatibility for files without date columns
  - _Requirements: 1.4, 1.5_

- [x] 1.5 Write property test for date processing and aggregation
  - **Property 3: Date Processing and Aggregation**
  - **Validates: Requirements 2.1, 2.4, 2.5**

### Phase 2: History Coordination

- [x] 2. Refactor HistoryService.ts as History Coordinator
  - Add `processFileBasedHistory()` method to handle cumulative data storage
  - Implement `generateFileBasedTrendData()` to create trends from file dates
  - Create `getLatestDateSlice()` method to extract current view data
  - _Requirements: 2.2, 2.3, 3.1_

- [x] 2.1 Write property test for trend chart file-based data
  - **Property 4: Trend Chart File-Based Data**
  - **Validates: Requirements 2.2, 2.3**

- [x] 2.2 Enhance generateInventoryTrendData with file-based priority
  - Modify existing method to prioritize file-based dates over localStorage snapshots
  - Implement immediate chart population when file contains multiple dates
  - Add `getCombinedHistoryData()` to merge file and localStorage data
  - _Requirements: 2.4, 2.5, 4.3_

- [x] 2.3 Write property test for current view data filtering
  - **Property 5: Current View Data Filtering**
  - **Validates: Requirements 3.1, 3.2, 3.5**

- [x] 2.4 Add sessionStorage support for current file cumulative data
  - Store file-based history in sessionStorage for immediate access
  - Maintain localStorage for cross-session persistence
  - Implement data cleanup and size management
  - _Requirements: 5.2, 5.4_

- [x] 2.5 Write property test for business logic preservation
  - **Property 6: Business Logic Preservation**
  - **Validates: Requirements 3.3, 3.4**

### Phase 3: Dashboard Integration

- [x] 3. Update dashboard components for latest date filtering
  - Modify InventoryOverview.tsx to use getLatestDateSlice for table data
  - Update KpiDashboard.tsx to calculate metrics from current date only
  - Ensure ReplenishmentPlanner.tsx receives only latest date inventory
  - _Requirements: 3.1, 3.2, 3.3_

- [ ]* 3.1 Write property test for UI feedback accuracy
  - **Property 7: UI Feedback Accuracy**
  - **Validates: Requirements 4.1, 4.2, 4.4**

- [x] 3.2 Enhance chart components for file-based trend data
  - Update Charts.tsx to use file-based dates for x-axis when available
  - Modify trend chart rendering to s how immediate data points after upload
  - Implement chronological date sorting for proper line progression
  - _Requirements: 2.3, 4.3_

- [ ]* 3.3 Write property test for immediate chart population
  - **Property 8: Immediate Chart Population**
  - **Validates: Requirements 4.3**

- [x] 3.4 Protect ReplenishmentPlanner business logic
  - Ensure 15-day lead time calculations use only latest date data
  - Verify 18-day reorder point logic applies to current view only
  - Add guardrails to prevent historical data from affecting replenishment
  - _Requirements: 3.3, 3.4_

### Phase 4: UI Feedback & Validation

- [x] 4. Implement cumulative history detection UI feedback
  - Add "Cumulative file detected: [X] days of history found" message to Data Management tab
  - Display date range information (earliest to latest dates)
  - Show appropriate feedback for single-date files
  - _Requirements: 4.1, 4.2, 4.4_

- [ ]* 4.1 Write property test for backward compatibility
  - **Property 9: Backward Compatibility**
  - **Validates: Requirements 5.1, 5.4, 5.5**

- [x] 4.2 Add progress feedback during file processing
  - Implement loading states for date detection and grouping
  - Show processing progress for large files
  - Provide clear error messages for date parsing failures
  - _Requirements: 1.5, 4.5_

- [ ]* 4.3 Write property test for data format compatibility
  - **Property 10: Data Format Compatibility**
  - **Validates: Requirements 5.2, 5.3**

- [x] 4.3 Implement data quality validation and warnings
  - Add validation for unrealistic date ranges (>5 years, future dates)
  - Warn about duplicate dates with conflicting data
  - Provide suggestions for data quality improvements
  - _Requirements: 6.1, 6.4_

- [ ]* 4.4 Write property test for date validation and quality
  - **Property 11: Date Validation and Quality**
  - **Validates: Requirements 6.1, 6.4, 6.5**

### Phase 5: Backward Compatibility & Enhanced Analytics

- [ ] 5. Ensure backward compatibility for existing workflows
  - Verify files without date columns process using localStorage snapshots
  - Maintain existing CSV validation and transformation logic
  - Preserve all current functionality for users who haven't adopted date columns
  - _Requirements: 5.1, 5.5_

- [ ]* 5.1 Write property test for enhanced analytics features
  - **Property 12: Enhanced Analytics Features**
  - **Validates: Requirements 7.2, 7.3, 7.4, 7.5**

- [x] 5.2 Add enhanced analytics capabilities
  - Implement date-range filtering for historical analysis
  - Add month-over-month and period-over-period comparison using file dates
  - Include Upload Date information in all data exports
  - Display both current status and historical context in relevant views
  - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [ ] 5.3 Implement error handling and recovery mechanisms
  - Add graceful handling of corrupted localStorage data
  - Implement retry logic for file processing failures
  - Ensure data consistency after unexpected shutdowns
  - _Requirements: 6.2, 6.3_

- [x] 6. Final integration and validation checkpoint
  - Verify all components work together seamlessly
  - Test file upload to chart rendering end-to-end workflow
  - Ensure performance meets requirements (2s processing, 500ms chart updates)
  - Validate memory usage stays under 50MB for typical files
  - _Requirements: All_

- [ ]* 6.1 Write integration tests for complete workflow
  - Test end-to-end file upload and processing
  - Verify chart rendering with file-based data
  - Test platform switching with cumulative history
  - Validate localStorage and sessionStorage interactions

- [ ] 7. Final checkpoint - Ensure all tests pass
  - Ensure all property-based tests pass with minimum 100 iterations
  - Verify unit tests cover edge cases and error conditions
  - Validate integration tests demonstrate complete functionality
  - Ask the user if questions arise about any failing tests

## Completed Additional Tasks

### Data Retention Fixes for Year-to-Date Strategy (COMPLETED)

**TASK**: Fix Data Retention Issues for Year-to-Date Strategy

**STATUS**: ✅ COMPLETED

**DETAILS**: Successfully implemented all critical fixes for data retention to support Year-to-Date strategy:

1. **Increased Snapshot Capacity**: Changed MAX_SNAPSHOTS from 100 to 500 to support full year (~365 days) plus buffer
2. **Extended Item Retention**: Changed item-level snapshot retention from 30 days to 365 days for comprehensive SKU movement analysis  
3. **Platform-Specific Lead Times Verified**: Confirmed AnalyticsService.analyzeStock correctly uses platform-specific lead times:
   - Amazon: 7 days (via ReplenishmentService.analyzeStockForPlatform)
   - Blinkit: 15 days (default in AnalyticsService.analyzeStock)
4. **Storage Management**: Added 5MB localStorage limit monitoring with automatic data compression for records older than 90 days

**IMPLEMENTATION DETAILS**:
- Modified HistoryService.ts constants: MAX_SNAPSHOTS = 500, added compression thresholds
- Updated item snapshot retention logic from 30 days to 365 days in both saveBulkSnapshots and saveInventorySnapshot
- Added comprehensive storage monitoring with getStorageStats, compressOldData, and checkAndManageStorage methods
- Implemented automatic compression that keeps daily summaries for old data while preserving recent detailed records
- Verified platform-specific lead times are correctly handled through ReplenishmentService for component usage

**VERIFICATION**: All integration tests pass, confirming April-to-December timeline preservation and proper platform-specific calculations.

**FILES MODIFIED**:
- `inventory-dashboard/src/services/HistoryService.ts` - Enhanced with storage management and extended retention
- Platform-specific lead times verified in existing ReplenishmentService and PlatformContextService

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties using fast-check library
- Unit tests validate specific examples and edge cases
- Integration tests ensure end-to-end functionality works correctly
- All tests should use TypeScript with Vitest testing framework
- Property tests must run minimum 100 iterations and be tagged with feature and property information