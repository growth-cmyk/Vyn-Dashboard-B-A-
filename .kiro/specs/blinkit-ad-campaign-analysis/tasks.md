# Implementation Plan: Blinkit Ad Campaign Analysis

## Overview

This implementation plan transforms the marketing analytics design into a series of incremental development tasks. The plan is organized into 5 logical sprints, building from data infrastructure through to the complete marketing cockpit with strategic insights.

## Tasks

### Sprint 1: Data Infrastructure & Excel Parsing

- [x] 1. Install xlsx library and update dependencies
  - Add xlsx library to package.json dependencies
  - Update TypeScript types for Excel processing
  - _Requirements: 1.1, 1.6_

- [x] 2. Create AdCampaignRecord interface and types
  - Define AdCampaignRecord interface in types/index.ts
  - Add MarketingKPIs and AdInventorySyncItem interfaces
  - Add campaign-related type constants and enums
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 2.1 Write property test for AdCampaignRecord validation
  - **Property 4: AdCampaignRecord Validation**
  - **Validates: Requirements 2.1, 2.2, 2.4, 2.5, 2.6, 2.7, 2.8**

- [x] 3. Enhance DataService with multi-tab Excel parsing
  - Implement loadExcelCampaignData method using xlsx library
  - Add parseMultiTabExcel method for handling multiple sheets
  - Implement tab-to-campaign-type mapping logic
  - Handle BRAND_BOOSTER missing Direct Sales column gracefully
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 3.1 Write property test for multi-tab Excel processing
  - **Property 1: Multi-tab Excel Processing**
  - **Validates: Requirements 1.1, 1.6**

- [x] 3.2 Write property test for campaign type mapping
  - **Property 2: Campaign Type Mapping**
  - **Validates: Requirements 1.2, 1.3, 1.4, 2.3**

- [x] 3.3 Write property test for data extraction completeness
  - **Property 3: Data Extraction Completeness**
  - **Validates: Requirements 1.5**

- [x] 4. Create MarketingService for analytics and calculations
  - Implement calculateRoAS method with proper formula
  - Add aggregateKPIMetrics for dashboard KPI calculations
  - Implement generateAdInventorySync for strategic correlation
  - Add cross-service integration with AnalyticsService
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.1, 6.2, 6.3, 6.4_

- [x] 4.1 Write property test for KPI calculation accuracy
  - **Property 5: KPI Calculation Accuracy**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [x] 4.2 Write property test for strategic recommendation logic
  - **Property 6: Strategic Recommendation Logic**
  - **Validates: Requirements 6.2, 6.3**

- [x] 4.3 Write property test for ad-inventory sync completeness
  - **Property 7: Ad-Inventory Sync Completeness**
  - **Validates: Requirements 6.1, 6.4**

- [x] 5. Sprint 1 Checkpoint - Data Infrastructure Complete
  - All core property tests pass for MarketingService and AdCampaignRecord validation
  - Excel parsing functionality is implemented and working (DataService tests show processing)
  - Property-based testing validates core business logic with 100+ iterations each

### Sprint 2: Marketing Dashboard UI Foundation

- [x] 6. Add Marketing Analysis navigation to sidebar
  - Update MainLayout.tsx to include Marketing Analysis tab
  - Add Megaphone icon from lucide-react
  - Implement navigation state management
  - _Requirements: 3.1, 3.2_

- [x] 7. Create MarketingAnalysis container component
  - Build main MarketingAnalysis.tsx component
  - Implement Premium Glassmorphism styling
  - Set up 12-column Bento Grid layout structure
  - Add loading and error states
  - _Requirements: 3.3, 3.4_

- [x] 8. Implement MarketingKPICards component
  - Create top-row KPI cards for Total Ad Spend, Total Ad Sales, Average RoAS, New Customer Acquisition
  - Apply Vyndo branding and styling
  - Add responsive grid layout (3 columns each)
  - Implement empty state handling
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

- [ ]* 8.1 Write unit tests for MarketingKPICards component
  - Test KPI display with various data sets
  - Test empty state rendering
  - _Requirements: 4.6_

- [x] 9. Integrate marketing data upload in DashboardContent
  - Add Excel file upload handler for campaign data
  - Integrate with enhanced DataService methods
  - Add campaign data state management
  - Implement error handling and user feedback
  - _Requirements: 1.1, 1.6_

- [x] 10. Sprint 2 Checkpoint - UI Foundation Complete
  - Ensure all tests pass, ask the user if questions arise.

### Sprint 3: Advanced Marketing Visualizations

- [x] 11. Create CampaignCharts component for trend analysis
  - Implement Spend vs Revenue Trend chart with dual y-axes
  - Use Chart.js with react-chartjs-2 for visualization
  - Apply Vyndo Orange (#ef5326) for spend lines
  - Apply Millet Green (#2d6a4f) for revenue lines
  - _Requirements: 5.1, 5.2, 5.3_

- [ ]* 11.1 Write unit tests for trend chart configuration
  - Test dual-axis setup and color scheme
  - Test chart rendering with sample data
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 12. Implement Funnel Analysis chart
  - Create funnel visualization showing Impressions → Unique Clicks → ATC → Quantities Sold
  - Use bar chart format for conversion progression
  - Add percentage conversion rates between stages
  - Implement responsive design for mobile devices
  - _Requirements: 5.4, 5.5_

- [ ]* 12.1 Write unit tests for funnel analysis chart
  - Test funnel stage progression and calculations
  - Test conversion rate accuracy
  - _Requirements: 5.4, 5.5_

- [x] 13. Add chart filter integration
  - Implement time period filtering for all charts
  - Ensure charts update when global filters change
  - Add chart-specific loading states
  - _Requirements: 5.6_

- [ ]* 13.1 Write property test for chart filter responsiveness
  - **Property 8: Global Filter Integration (Charts)**
  - **Validates: Requirements 5.6**

- [ ] 14. Sprint 3 Checkpoint - Visualizations Complete
  - Ensure all tests pass, ask the user if questions arise.

### Sprint 4: Strategic Integration & Sync Table

- [x] 15. Create AdInventorySync centerpiece table component
  - Build table with columns: Campaign Name, Ad Spend, Inventory Status, Strategic Action
  - Implement sortable functionality by ad spend and inventory risk
  - Add color-coded inventory status badges
  - Apply Premium table styling with glassmorphism effects
  - _Requirements: 6.1, 6.4, 6.6_

- [ ]* 15.1 Write property test for table sorting functionality
  - **Property 12: Table Sorting Functionality**
  - **Validates: Requirements 6.6**

- [x] 16. Implement strategic recommendation engine
  - Add logic for "High ROI Opportunity: Scale Ads" recommendations
  - Add logic for "Pause Ads: Low Inventory Risk" warnings
  - Integrate with AnalyticsService for real-time inventory status
  - Implement recommendation badge styling and colors
  - _Requirements: 6.2, 6.3, 6.5_

- [x] 16.1 Write property test for real-time recommendation updates
  - **Property 11: Real-time Recommendation Updates with RoAS > 2.0 Logic**
  - **Validates: Requirements 6.5, Enhanced RoAS Performance Criteria**
  - **COMPLETED**: Enhanced strategic recommendation engine with RoAS > 2.0 logic

- [x] 17. Add cross-service integration with AnalyticsService
  - Implement MarketingService methods to query inventory status
  - Add SKU matching logic between campaigns and inventory
  - Handle cases where campaign SKUs don't match inventory items
  - Add error handling for missing inventory data
  - _Requirements: 6.1, 6.5_

- [x] 18. Sprint 4 Checkpoint - Strategic Integration Complete
  - Ensure all tests pass, ask the user if questions arise.
  - **COMPLETED**: All strategic integration features implemented and tested

### Sprint 5: Final Polish & Global Integration

- [x] 19. Integrate global Time Period and Platform filters
  - Connect marketing dashboard to existing filter system
  - Ensure all components (KPIs, charts, table) respond to filter changes
  - Implement filter state persistence across tab navigation
  - Add filter summary display for marketing data
  - ENHANCED: Platform-aware lead time switching (15-day Blinkit, 7-day Amazon)
  - _Requirements: 3.5, 7.1, 7.2, 7.3, 7.4_

- [ ]* 19.1 Write property test for global filter integration
  - **Property 8: Global Filter Integration**
  - **Validates: Requirements 4.5, 5.6, 7.1, 7.2, 7.3**

- [ ]* 19.2 Write property test for filter state persistence
  - **Property 9: Filter State Persistence**
  - **Validates: Requirements 3.5, 7.4**

- [x] 20. Implement marketing data export functionality
  - Add export controls for campaign performance data
  - Ensure exports include all visible KPI metrics and chart data
  - Implement filtered data export (respect current filter settings)
  - Add Ad-Inventory Sync table export with recommendations
  - Maintain proper data formatting and column headers
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 20.1 Write property test for export data integrity
  - **Property 10: Export Data Integrity**
  - **Validates: Requirements 8.2, 8.3, 8.5**

- [x] 21. Add empty state handling and error boundaries
  - Implement empty state messaging when no campaign data is available
  - Add empty state for filtered results with no matches
  - Create error boundaries for chart rendering failures
  - Add user feedback for export operation failures
  - _Requirements: 4.6, 7.5_

- [ ]* 21.1 Write unit tests for empty state handling
  - Test empty data scenarios across all components
  - Test filter no-results scenarios
  - _Requirements: 4.6, 7.5_

- [x] 22. Performance optimization and final testing
  - Optimize Excel parsing for large files
  - Add memoization for expensive calculations
  - Implement lazy loading for chart components
  - Add comprehensive integration tests
  - Remove debug console logs for production
  - Ensure consistent "Vyndo" branding throughout
  - _Requirements: All_

- [ ]* 22.1 Write integration tests for complete workflow
  - Test end-to-end Excel upload and processing
  - Test cross-service communication
  - Test dashboard navigation and state management

- [x] 23. Final Sprint Checkpoint - Marketing Analytics Complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify Marketing Analysis Bento Grid displays correctly
  - Confirm strategic recommendations are working
  - Validate export functionality
  - Final audit of 15-day Blinkit/7-day Amazon lead times confirmed
  - All Sprint 5 tasks completed for v1.0 launch

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical breakpoints
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- The implementation builds incrementally from data layer to complete UI
- Cross-service integration ensures seamless operation with existing inventory analytics