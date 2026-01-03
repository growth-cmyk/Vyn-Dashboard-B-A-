# Requirements Document: Reliable Inventory History Management

## Introduction

This document outlines the enhancement of inventory history management to provide more reliable and accurate historical tracking. The system will transition from localStorage-based snapshots to file-based cumulative history using Upload Date columns, enabling better trend analysis and data integrity.

## Glossary

- **Master Inventory File**: Single CSV file containing inventory data with Upload Date column
- **Upload Date Column**: Date field in CSV indicating when inventory data was recorded
- **Cumulative History**: Multiple date entries within a single file representing historical data points
- **Current View**: Dashboard display showing only the most recent date's data
- **Inventory Health Trend**: Line chart showing historical metrics over time
- **Date Grouping**: Aggregation of inventory metrics by unique Upload Date values
- **Most Recent Snapshot**: Latest date found in the uploaded file for current view display

## Requirements

### Requirement 1: Enhanced Data Structure Detection

**User Story:** As a data manager, I want the system to automatically detect Upload Date columns in my Master Inventory file, so that I can maintain historical data in a single file.

#### Acceptance Criteria

1. WHEN uploading a CSV file THEN the system SHALL scan for columns named 'Upload Date', 'Date', or similar date identifiers
2. WHEN an Upload Date column is detected THEN the system SHALL parse and validate all date values in that column
3. WHEN multiple unique dates exist in one file THEN the system SHALL treat the file as cumulative history
4. WHEN no date column is found THEN the system SHALL fall back to current timestamp-based processing
5. WHEN date parsing fails THEN the system SHALL provide clear error messages indicating invalid date formats

### Requirement 2: File-Based Trend Chart Logic

**User Story:** As a business analyst, I want the Inventory Health Trend chart to use actual file dates, so that I can see accurate historical progression without relying on upload timing.

#### Acceptance Criteria

1. WHEN processing cumulative history files THEN the system SHALL extract unique dates from the Upload Date column
2. WHEN calculating trend metrics THEN the system SHALL group 'Total Units', 'Out of Stock', and 'Expiry Risk' by Upload Date
3. WHEN rendering the trend chart THEN the system SHALL plot data points using the file's Upload Date values as x-axis
4. WHEN multiple entries exist for the same date THEN the system SHALL aggregate metrics appropriately
5. WHEN displaying trend data THEN the system SHALL sort dates chronologically for proper line chart progression

### Requirement 3: Current View Data Filtering

**User Story:** As an inventory manager, I want the current dashboard view to show only the most recent data, so that I can focus on current inventory status while maintaining historical context.

#### Acceptance Criteria

1. WHEN displaying dashboard tables THEN the system SHALL filter data to show only the most recent Upload Date found in the file
2. WHEN showing Bento cards and KPIs THEN the system SHALL calculate metrics using only the latest date's inventory data
3. WHEN applying replenishment logic THEN the system SHALL use the 15-day lead time and 18-day reorder point on current data only
4. WHEN switching between views THEN the system SHALL maintain the current/historical data separation
5. WHEN no date column exists THEN the system SHALL display all data as current view

### Requirement 4: Cumulative History UI Feedback

**User Story:** As a user, I want clear feedback about detected history, so that I understand how my data is being processed and displayed.

#### Acceptance Criteria

1. WHEN uploading a file with multiple dates THEN the system SHALL display "Cumulative file detected: [X] days of history found" in the Data Management tab
2. WHEN showing history summary THEN the system SHALL indicate the date range covered (earliest to latest)
3. WHEN displaying the trend chart THEN the system SHALL show data points immediately after file upload
4. WHEN no cumulative history is detected THEN the system SHALL indicate "Single snapshot uploaded" or similar feedback
5. WHEN processing files THEN the system SHALL provide progress feedback during date detection and grouping

### Requirement 5: Backward Compatibility

**User Story:** As an existing user, I want my current workflow to continue working, so that the new history features don't disrupt my established processes.

#### Acceptance Criteria

1. WHEN uploading files without date columns THEN the system SHALL process them using the existing localStorage snapshot method
2. WHEN viewing historical trends THEN the system SHALL combine file-based dates with existing localStorage snapshots where appropriate
3. WHEN switching between old and new data formats THEN the system SHALL handle both seamlessly
4. WHEN existing localStorage data exists THEN the system SHALL preserve it while adding new file-based capabilities
5. WHEN users haven't adopted date columns THEN the system SHALL continue providing full functionality

### Requirement 6: Data Integrity and Validation

**User Story:** As a system administrator, I want robust validation of date-based data, so that historical accuracy is maintained and errors are caught early.

#### Acceptance Criteria

1. WHEN parsing Upload Date columns THEN the system SHALL validate date formats and reject invalid entries
2. WHEN detecting duplicate dates with conflicting data THEN the system SHALL provide clear conflict resolution options
3. WHEN processing large history files THEN the system SHALL maintain performance while ensuring data accuracy
4. WHEN date ranges are unrealistic THEN the system SHALL warn users about potential data quality issues
5. WHEN aggregating metrics by date THEN the system SHALL ensure mathematical accuracy and handle edge cases

### Requirement 7: Enhanced Analytics Capabilities

**User Story:** As a business analyst, I want improved historical analytics, so that I can identify trends and patterns more effectively than with snapshot-based data.

#### Acceptance Criteria

1. WHEN viewing trend charts THEN the system SHALL provide smooth line progression based on actual historical dates
2. WHEN analyzing inventory patterns THEN the system SHALL enable date-range filtering and zoom capabilities
3. WHEN comparing periods THEN the system SHALL support month-over-month and period-over-period analysis using file dates
4. WHEN exporting historical data THEN the system SHALL include Upload Date information in all exports
5. WHEN displaying metrics THEN the system SHALL show both current status and historical context where relevant