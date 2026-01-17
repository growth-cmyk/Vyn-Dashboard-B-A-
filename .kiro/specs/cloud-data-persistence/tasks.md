# Implementation Plan: Cloud Data Persistence

## Overview

This implementation plan transforms the inventory system from localStorage-only to cloud-first data persistence using Supabase (PostgreSQL Database + Storage Buckets). The approach implements a hybrid storage strategy that prioritizes cloud operations while maintaining localStorage fallback for offline scenarios.

## Tasks

### Phase 1: Infrastructure Setup (Supabase Client & Authentication)

- [x] 1. Set up Supabase client and authentication
  - Install @supabase/supabase-js dependency
  - Create Supabase client configuration with environment variables
  - Set up authentication context and error handling
  - _Requirements: 9.1, 9.2, 9.3_

- [ ]* 1.1 Write property test for environment configuration fallback
  - **Property 1: Environment Configuration Fallback**
  - **Validates: Requirements 9.3**

- [x] 1.2 Create SupabaseService.ts core service
  - Implement SupabaseService class with connection management
  - Add retry logic with exponential backoff for failed operations
  - Implement health check and connection status monitoring
  - _Requirements: 6.4, 6.5, 7.3_

- [ ]* 1.3 Write property test for retry logic consistency
  - **Property 8: Retry Logic Consistency**
  - **Validates: Requirements 7.3**

- [x] 1.4 Implement database operations in SupabaseService
  - Add saveInventorySnapshots method for bulk snapshot storage
  - Implement getInventoryHistory with pagination and filtering
  - Create getLatestSnapshot method for current data retrieval
  - _Requirements: 2.4, 2.5, 3.1_

- [ ]* 1.5 Write property test for API response consistency
  - **Property 3: API Response Consistency**
  - **Validates: Requirements 2.3, 2.4, 2.5**

### Phase 2: Storage Layer Implementation (Hybrid Logic)

- [x] 2. Create unified Storage Layer architecture
  - Implement StorageLayer class as interface between UI and services
  - Add SyncStatus interface and status management
  - Create unified methods for saveInventorySnapshot and getInventoryHistory
  - _Requirements: 1.1, 1.2, 1.5_

- [ ]* 2.1 Write property test for dual storage coordination
  - **Property 1: Dual Storage Coordination**
  - **Validates: Requirements 1.2, 3.3**

- [x] 2.2 Implement cloud-first hybrid storage logic
  - Add cloud availability detection and fallback mechanisms
  - Implement data synchronization between cloud and localStorage
  - Create conflict resolution logic prioritizing newer timestamps
  - _Requirements: 1.4, 3.4, 3.5_

- [ ]* 2.3 Write property test for cloud unavailable fallback
  - **Property 2: Cloud Unavailable Fallback**
  - **Validates: Requirements 1.4, 3.4, 4.5**

- [ ]* 2.4 Write property test for cloud data priority
  - **Property 4: Cloud Data Priority**
  - **Validates: Requirements 3.5**

- [x] 2.5 Implement file upload and storage operations
  - Add uploadFile method to store files in Supabase Storage
  - Implement file metadata generation and database storage
  - Create file retrieval with cloud-first, local fallback logic
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 2.6 Write property test for comprehensive file upload
  - **Property 5: Comprehensive File Upload**
  - **Validates: Requirements 4.1, 4.2, 4.3**

- [ ]* 2.7 Write property test for hybrid data retrieval
  - **Property 6: Hybrid Data Retrieval**
  - **Validates: Requirements 4.4**

### Phase 3: Service Integration and Data Migration

- [x] 3. Refactor HistoryService for cloud integration
  - Modify HistoryService to use StorageLayer instead of direct localStorage
  - Update saveInventorySnapshot to work through Storage Layer
  - Enhance generateInventoryTrendData to fetch from cloud-first storage
  - _Requirements: 3.1, 3.2, 3.3_

- [ ]* 3.1 Write property test for comprehensive validation and error handling
  - **Property 7: Comprehensive Validation and Error Handling**
  - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**

- [x] 3.2 Implement data migration from localStorage to Supabase
  - Create migration function to transfer existing localStorage snapshots
  - Add data integrity verification between local and cloud storage
  - Implement migration error handling and retry mechanisms
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ]* 3.3 Write property test for migration data integrity
  - **Property 11: Migration Data Integrity**
  - **Validates: Requirements 10.2**

- [ ]* 3.4 Write property test for intelligent data merging
  - **Property 12: Intelligent Data Merging**
  - **Validates: Requirements 10.5**

- [x] 3.5 Ensure business logic preservation
  - Verify 15-day Blinkit lead time calculations work with cloud data
  - Test 6-month expiry math with Supabase-sourced data
  - Ensure replenishment algorithms operate on same data structures
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 3.6 Write property test for business logic preservation
  - **Property 10: Business Logic Preservation**
  - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

### Phase 4: API Routes Implementation

- [x] 4. Create serverless API routes for cloud operations
  - Implement /api/upload route for file uploads to Supabase Storage
  - Create /api/history route with GET/POST operations for Supabase Database
  - Add proper error handling and response formatting
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4.1 Add file validation and security measures
  - Implement file type and size validation for uploads
  - Add HTTPS encryption verification for all API calls
  - Create proper error messages for validation failures
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 4.2 Implement capacity management and monitoring
  - Add storage usage monitoring for Supabase free tier limits
  - Create data rotation and cleanup strategies for old files
  - Implement warnings when approaching 80% of free tier limits
  - _Requirements: 7.5, 11.2, 11.3, 11.4, 11.5_

- [ ]* 4.3 Write property test for capacity management
  - **Property 9: Capacity Management**
  - **Validates: Requirements 7.5, 11.2, 11.3, 11.4**

- [ ]* 4.4 Write property test for usage monitoring and warnings
  - **Property 13: Usage Monitoring and Warnings**
  - **Validates: Requirements 11.5**

### Phase 5: UI Integration (Sync Indicators and Timeline)

- [x] 5. Implement cloud sync status indicators
  - Add Cloud Sync indicator component to sidebar
  - Implement status colors (green/yellow/red) based on sync state
  - Create status messages for different sync scenarios
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5.1 Enhance upload timeline with cloud sync steps
  - Add "Syncing to Cloud..." step to file upload timeline
  - Update timeline progress based on cloud sync status
  - Implement error states and retry options in timeline
  - _Requirements: 5.5_

- [x] 5.2 Create sync status management system
  - Implement SyncStatus state management across components
  - Add real-time sync status updates and notifications
  - Create manual sync trigger for failed operations
  - _Requirements: 3.4, 4.5_

- [x] 5.3 Add offline mode detection and UI feedback
  - Implement network status detection
  - Show offline mode indicators when cloud is unavailable
  - Provide clear messaging about localStorage fallback mode
  - _Requirements: 1.4, 9.3_

### Phase 6: Testing and Validation

- [ ] 6. Comprehensive testing implementation
  - Write unit tests for SupabaseService operations
  - Create integration tests for Storage Layer functionality
  - Test migration scenarios with various localStorage states
  - _Requirements: All_

- [ ]* 6.1 Write integration tests for complete cloud sync workflow
  - Test end-to-end file upload and cloud storage
  - Verify data synchronization between cloud and local storage
  - Test offline mode and recovery scenarios
  - Validate business logic preservation across data sources

- [ ] 6.2 Performance and reliability testing
  - Test file upload performance within 10-second requirement
  - Verify database query performance within 2-second requirement
  - Test concurrent operations and data consistency
  - _Requirements: 7.1, 7.2, 7.4_

- [ ] 6.3 Security and validation testing
  - Test RLS policies and data access controls
  - Verify file type and size validation
  - Test authentication and authorization flows
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 7. Final integration and deployment preparation
  - Verify all environment variables are properly configured
  - Test deployment with production Supabase instance
  - Validate free tier usage monitoring and cleanup
  - Ensure all existing functionality remains intact
  - _Requirements: 9.4, 9.5, 11.1_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all property-based tests pass with minimum 100 iterations
  - Verify unit tests cover edge cases and error conditions
  - Validate integration tests demonstrate complete functionality
  - Ask the user if questions arise about any failing tests

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties using fast-check library
- Unit tests validate specific examples and edge cases
- Integration tests ensure end-to-end functionality works correctly
- All tests should use TypeScript with Vitest testing framework
- Property tests must run minimum 100 iterations and be tagged with feature and property information
- Business logic preservation is critical - no changes to existing calculations
- Hybrid storage strategy ensures offline functionality while prioritizing cloud operations