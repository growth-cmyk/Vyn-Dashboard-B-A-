# Requirements Document

## Introduction

This document specifies the requirements for integrating Vercel Blob Storage into the inventory dashboard application to enable persistent cloud-based file storage. The feature will automatically save uploaded files (inventory CSV, sales CSV, campaign Excel) to Vercel Blob Storage and re-hydrate the dashboard on app refresh without requiring users to manually re-upload files.

The implementation builds upon existing infrastructure:
- Serverless API route (`/api/blob-upload`) for secure uploads
- `BlobStorageService` with upload, download, and re-hydration methods
- `useBlobRehydration` React hook for automatic data loading
- Supabase `file_uploads` table for metadata tracking

## Glossary

- **Blob_Storage**: Vercel's cloud file storage service for persisting uploaded files
- **Re-hydration**: The process of automatically downloading and processing files from Blob Storage on app startup
- **Dashboard_Content**: The main React component that displays inventory, sales, and campaign data
- **File_Upload_Handler**: Functions that process user file uploads (inventory, sales, campaigns)
- **Loading_State**: UI feedback mechanism showing progress during file operations
- **Business_Logic**: Critical calculations including 15-day lead time, 6-month expiry thresholds, and Statistical ROP
- **Platform**: The e-commerce channel (Blinkit or Amazon) for which data is being processed
- **Demand_Map**: Statistical ROP model built from sales data for replenishment calculations

## Requirements

### Requirement 1: Automatic Dashboard Re-hydration

**User Story:** As a user, I want the dashboard to automatically load my previously uploaded data when I refresh the page, so that I don't have to re-upload files every time.

#### Acceptance Criteria

1. WHEN the app initializes, THE Dashboard_Content SHALL check Blob_Storage for previously uploaded files
2. WHEN files are found in Blob_Storage, THE Dashboard_Content SHALL automatically download and process them
3. WHEN files are processed, THE Dashboard_Content SHALL populate the dashboard with inventory, sales, and campaign data
4. WHEN no files are found in Blob_Storage, THE Dashboard_Content SHALL display the empty state with upload prompts
5. WHEN re-hydration completes successfully, THE Dashboard_Content SHALL display the data without requiring manual upload

### Requirement 2: Re-hydration Loading Feedback

**User Story:** As a user, I want to see clear loading indicators during re-hydration, so that I know the system is working and understand what's happening.

#### Acceptance Criteria

1. WHEN re-hydration starts, THE Dashboard_Content SHALL display a loading indicator
2. WHILE re-hydration is in progress, THE Dashboard_Content SHALL show the current operation status
3. WHEN re-hydration completes, THE Dashboard_Content SHALL hide the loading indicator
4. WHEN re-hydration takes longer than 3 seconds, THE Dashboard_Content SHALL display a progress message
5. WHEN re-hydration completes, THE Dashboard_Content SHALL display a success notification with file count

### Requirement 3: Re-hydration Error Handling

**User Story:** As a user, I want clear error messages when re-hydration fails, so that I understand what went wrong and can take corrective action.

#### Acceptance Criteria

1. IF Blob_Storage is unavailable, THEN THE Dashboard_Content SHALL display a warning message and fall back to manual upload
2. IF file download fails, THEN THE Dashboard_Content SHALL display an error message with retry option
3. IF file processing fails, THEN THE Dashboard_Content SHALL display an error message identifying the problematic file
4. WHEN an error occurs, THE Dashboard_Content SHALL preserve any successfully loaded data
5. WHEN an error occurs, THE Dashboard_Content SHALL allow users to manually upload files as a fallback

### Requirement 4: Business Logic Preservation

**User Story:** As a developer, I want all business logic to be preserved during re-hydration, so that calculations remain accurate and consistent.

#### Acceptance Criteria

1. WHEN inventory files are re-hydrated, THE Dashboard_Content SHALL apply the 15-day lead time for Blinkit platform
2. WHEN inventory files are re-hydrated, THE Dashboard_Content SHALL apply 6-month expiry thresholds (91+ days = expiry risk)
3. WHEN sales files are re-hydrated, THE Dashboard_Content SHALL rebuild the Statistical ROP Demand_Map
4. WHEN campaign files are re-hydrated, THE Dashboard_Content SHALL preserve all marketing strategic action logic
5. WHEN files are re-hydrated, THE Dashboard_Content SHALL produce identical results to manual file uploads

### Requirement 5: Platform-Aware Re-hydration

**User Story:** As a user working with multiple platforms, I want re-hydration to respect platform selection, so that I see the correct data for my chosen platform.

#### Acceptance Criteria

1. WHEN re-hydration occurs, THE Dashboard_Content SHALL fetch files for the currently active Platform
2. WHEN Platform changes, THE Dashboard_Content SHALL re-hydrate data for the new Platform
3. WHEN files for a Platform are not found, THE Dashboard_Content SHALL display an empty state for that Platform
4. WHEN multiple Platforms have data, THE Dashboard_Content SHALL maintain separate data sets per Platform
5. WHEN re-hydration completes, THE Dashboard_Content SHALL display data filtered by the active Platform

### Requirement 6: Graceful Degradation

**User Story:** As a user, I want the app to work even if Blob Storage is unavailable, so that I can still use the dashboard with manual uploads.

#### Acceptance Criteria

1. WHEN Blob_Storage availability check fails, THE Dashboard_Content SHALL skip re-hydration and proceed to manual upload mode
2. WHEN Blob_Storage is unavailable, THE Dashboard_Content SHALL display a notice explaining manual upload is required
3. WHEN Blob_Storage becomes available again, THE Dashboard_Content SHALL resume automatic re-hydration on next refresh
4. WHEN in manual upload mode, THE Dashboard_Content SHALL still attempt to upload files to Blob_Storage for future sessions
5. WHEN Blob_Storage is unavailable, THE Dashboard_Content SHALL maintain full functionality with manual uploads

### Requirement 7: Re-hydration State Management

**User Story:** As a developer, I want proper state management during re-hydration, so that the UI remains responsive and data is correctly synchronized.

#### Acceptance Criteria

1. WHEN re-hydration starts, THE Dashboard_Content SHALL set isRehydrating state to true
2. WHEN re-hydration completes, THE Dashboard_Content SHALL set isRehydrating state to false
3. WHEN re-hydrated data is received, THE Dashboard_Content SHALL update inventoryData, salesData, and campaignData states
4. WHEN re-hydration is in progress, THE Dashboard_Content SHALL disable file upload controls
5. WHEN re-hydration completes, THE Dashboard_Content SHALL enable file upload controls

### Requirement 8: Re-hydration Performance

**User Story:** As a user, I want re-hydration to complete quickly, so that I can start working with my data without long wait times.

#### Acceptance Criteria

1. WHEN re-hydration starts, THE Dashboard_Content SHALL fetch all file metadata in parallel
2. WHEN downloading files, THE Dashboard_Content SHALL download inventory, sales, and campaign files concurrently
3. WHEN processing files, THE Dashboard_Content SHALL process them in the optimal order (inventory first, then sales, then campaigns)
4. WHEN re-hydration completes in under 2 seconds, THE Dashboard_Content SHALL skip the loading indicator
5. WHEN re-hydration takes longer than 5 seconds, THE Dashboard_Content SHALL display detailed progress information

### Requirement 9: Data Consistency Validation

**User Story:** As a user, I want to be notified if re-hydrated data has quality issues, so that I can address data problems early.

#### Acceptance Criteria

1. WHEN inventory data is re-hydrated, THE Dashboard_Content SHALL validate data quality using DataService.validateDataQuality()
2. WHEN data quality warnings are detected, THE Dashboard_Content SHALL display them to the user
3. WHEN cumulative history is detected, THE Dashboard_Content SHALL display a success message with date range
4. WHEN re-hydrated data has missing required fields, THE Dashboard_Content SHALL display an error and skip that file
5. WHEN re-hydrated data is valid, THE Dashboard_Content SHALL proceed without warnings

### Requirement 10: Integration with Existing Upload Flow

**User Story:** As a user, I want manual file uploads to work seamlessly alongside automatic re-hydration, so that I can update data whenever needed.

#### Acceptance Criteria

1. WHEN a user manually uploads a file after re-hydration, THE Dashboard_Content SHALL replace the re-hydrated data with the new upload
2. WHEN a manual upload completes, THE Dashboard_Content SHALL upload the file to Blob_Storage for future re-hydration
3. WHEN a manual upload fails, THE Dashboard_Content SHALL preserve the re-hydrated data
4. WHEN both re-hydrated and manually uploaded data exist, THE Dashboard_Content SHALL prioritize the most recent data
5. WHEN a user uploads a file for a different Platform, THE Dashboard_Content SHALL maintain separate data sets per Platform
