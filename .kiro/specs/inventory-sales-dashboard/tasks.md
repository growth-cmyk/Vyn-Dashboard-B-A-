# Implementation Plan

- [x] 1. Set up project structure and dep
endencies





  - Check for all required system dependencies (Node.js, npm/yarn, Python if needed)
  - Create React/TypeScript project with Vite
  - Install dependencies: Chart.js, Papa Parse (CSV), Tailwind CSS, Lucide icons
  - Set up basic folder structure (components, services, types, utils)
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Create data models and types





  - Define TypeScript interfaces for InventoryItem, SalesRecord, StockAnalysis
  - Create enums for StockStatus and TimePeriod
  - Define validation schemas for CSV data
  - _Requirements: 1.2, 2.1, 2.2_

- [ ]* 2.1 Write property test for data model validation
  - **Property 1: Data Display Completeness**
  - **Validates: Requirements 1.2**

- [x] 3. Implement CSV data loading service





  - Create DataService class with file parsing methods
  - Implement CSV validation and error handling
  - Add data transformation utilities
  - _Requirements: 1.1, 1.2_

- [ ]* 3.1 Write property test for CSV parsing
  - **Property 6: Time Period Sales Aggregation**
  - **Validates: Requirements 3.1**

- [x] 4. Build analytics calculation engine




  - Implement days of cover calculation function
  - Create stock status classification logic
  - Build sales aggregation by time period functions
  - Add percentage change calculations
  - _Requirements: 2.1, 2.2, 3.1, 3.3_

- [ ]* 4.1 Write property test for days of cover calculation
  - **Property 3: Days of Cover Calculation**
  - **Validates: Requirements 2.1**

- [ ]* 4.2 Write property test for stock classification
  - **Property 4: Stock Status Classification**
  - **Validates: Requirements 2.2**

- [ ]* 4.3 Write property test for percentage calculations
  - **Property 8: Percentage Change Calculation**
  - **Validates: Requirements 3.3**

- [x] 5. Create filtering and search functionality




  - Implement FilterService with location and SKU filtering
  - Add time period filtering for sales data
  - Create search utilities for product names
  - _Requirements: 1.3, 3.1_

- [ ]* 5.1 Write property test for filter consistency
  - **Property 2: Filter Consistency**
  - **Validates: Requirements 1.3**

- [x] 6. Build main dashboard layout




  - Create responsive dashboard container component
  - Implement file upload interface
  - Add navigation and filter controls
  - Create loading and error states
  - _Requirements: 1.1, 1.3_

- [x] 7. Implement inventory overview components




  - Create inventory table with sortable columns
  - Add stock status indicators with color coding
  - Implement location-based grouping
  - _Requirements: 1.1, 1.2, 2.3_

- [ ]* 7.1 Write property test for visual indicators
  - **Property 5: Visual Status Indicators**
  - **Validates: Requirements 2.3**

- [x] 8. Build sales analytics components




  - Create sales summary cards for different time periods
  - Implement sales by location and SKU tables
  - Add trend indicators and percentage changes
  - _Requirements: 3.1, 3.2, 3.3_

- [ ]* 8.1 Write property test for sales dimensions
  - **Property 7: Sales Data Dimensions**
  - **Validates: Requirements 3.2**

- [x] 9. Create stock analysis dashboard




  - Build out-of-stock alerts component
  - Implement overstock and understock identification
  - Add days of cover visualization
  - Create action recommendations panel
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 10. Add interactive charts and visualizations




  - Implement inventory level charts by location
  - Create sales trend charts for time periods
  - Add stock status distribution pie charts
  - Implement drill-down functionality
  - _Requirements: 1.3, 3.1, 3.2_

- [x] 11. Implement data export functionality






  - Add CSV export for filtered data
  - Create Excel export with multiple sheets
  - Implement report generation with summaries
  - _Requirements: 1.3, 3.1, 3.2_

- [x] 12. Final integration and testing









  - Integrate all components into main dashboard
  - Test with provided CSV files
  - Ensure all tests pass, ask the user if questions arise
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

- [ ] 13. Phase 1: Layout & Navigation (UI/UX Transformation)
  - Implement fixed sidebar navigation with Vyndo branding
  - Add Lucide-react icons for Dashboard Overview (LayoutGrid), Inventory Health (Package), Sales Performance (TrendingUp), Action Center (AlertCircle), Data Management (UploadCloud)
  - Create main content area with light-gray background (#F9FAFB) and white data cards
  - Ensure responsive design using Tailwind CSS
  - _Requirements: 4.1, 4.2, 4.3_

- [ ]* 13.1 Write property test for sidebar navigation
  - **Property 9: Sidebar Navigation Consistency**
  - **Validates: Requirements 4.1**

- [ ] 14. Phase 2: High-Level Analytics (KPI Bento Grid)
  - Create KPI Summary Row with Bento Grid layout
  - Implement Total Inventory Value card with sparkline chart
  - Add Out-of-Stock Risk counter with red urgent theme
  - Create Low Stock Alerts card with amber theme
  - Build Top Selling SKU card with performance metrics
  - Integrate Chart.js for 7-day trend visualization
  - _Requirements: 4.4_

- [ ]* 14.1 Write property test for KPI accuracy
  - **Property 12: KPI Card Data Accuracy**
  - **Validates: Requirements 4.4**

- [ ] 15. Phase 3: Inventory Intelligence (Action-Oriented Table)
  - Implement sticky headers for inventory table
  - Create pill-style status badges with brand colors
  - Add progress bars for Days of Cover visualization
  - Build Quick Actions column with View Details buttons
  - Create slide-over (Sheet) component for SKU details
  - _Requirements: 4.5_

- [ ]* 15.1 Write property test for brand color application
  - **Property 10: Brand Color Application**
  - **Validates: Requirements 4.2**

- [ ] 16. Phase 4: Sales Insights (Intelligent Charting)
  - Implement stacked bar chart for sales by warehouse location
  - Add toggle to switch between bar and line chart views
  - Sync Chart.js theme with Vyndo brand colors
  - Create comparison toggle for Last 30 Days vs Previous 30 Days
  - _Requirements: 3.1, 3.2, 4.2_

- [ ] 17. Phase 5: Data Onboarding (Upload UX)
  - Create drag-and-drop zone for CSV uploads with dashed border
  - Implement progress stepper: File Uploaded → Validating Schema → Calculating Metrics → Dashboard Ready
  - Add toast notifications for validation errors with specific missing headers
  - _Requirements: 4.6_

- [ ]* 17.1 Write property test for responsive layout
  - **Property 11: Responsive Layout Integrity**
  - **Validates: Requirements 4.3**

- [ ] 18. Final UI/UX Integration and Testing
  - Integrate all UI/UX phases into cohesive dashboard
  - Test responsive behavior across device sizes
  - Validate brand consistency throughout interface
  - Ensure all UI tests pass, ask the user if questions arise
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 19. Strategic Roadmap Phase 1: Enhanced Stock Classification System


  - Update AnalyticsService.classifyStockStatus to use new 6-month expiry thresholds
  - Implement Understock (<14 days), Healthy (14-45 days), Overstock (45-90 days), Expiry Risk (>90 days)
  - Update stock status constants and types to include 'healthy' and 'expiry-risk'
  - Modify StockAnalysis component to display new status labels and colors
  - _Requirements: 5.1_

- [ ]* 19.1 Write property test for strategic stock classification
  - **Property 4: Stock Status Classification (Updated for Strategic Roadmap)**
  - **Validates: Requirements 5.1**

- [x] 20. Strategic Roadmap Phase 2: Replenishment Calculator


  - Create ReplenishmentService with calculateReorderQuantity function
  - Implement formula: (Lead Time * Sales Velocity) + Safety Stock - Current Stock
  - Add configurable parameters: Lead Time (default 7 days), Safety Stock (default 3 days * velocity)
  - Create ReplenishmentRecommendation interface and data model
  - _Requirements: 5.2_

- [ ]* 20.1 Write property test for replenishment calculation
  - **Property 13: Replenishment Calculation Accuracy**
  - **Validates: Requirements 5.2**

- [x] 21. Strategic Roadmap Phase 3: Replenishment Planner UI


  - Add 'Replenishment Planner' section to Action Center/Stock Analysis tab
  - Display calculated reorder quantities for all understock items
  - Implement urgency-based sorting (sales velocity / days of cover)
  - Add export functionality for purchase order generation
  - Create configuration panel for lead time and safety stock parameters
  - _Requirements: 5.6_

- [x] 22. Strategic Roadmap Phase 4: Enhanced Status Indicators and Actions



  - Update visual indicators for new stock statuses with action labels
  - Implement 'Restock' alerts for understock items (amber with alert icon)
  - Add 'Freeze POs' status for overstock items (45-90 days, amber with pause icon)
  - Create 'Flash Promo' alerts for expiry risk items (>90 days, red with lightning icon)
  - Update KPI cards to reflect new classification system
  - _Requirements: 5.2, 5.3, 5.4_

- [ ]* 22.1 Write property test for enhanced visual indicators
  - **Property 5: Visual Status Indicators (Updated for Strategic Roadmap)**
  - **Validates: Requirements 5.2, 5.3, 5.4**

- [x] 23. Strategic Roadmap Phase 5: Inventory History Service



  - Create HistoryService for local storage-based inventory tracking
  - Implement saveInventorySnapshot function to store timestamped data
  - Add getInventoryHistory and generateInventoryTrendData functions
  - Create InventorySnapshot interface and data persistence logic
  - Implement automatic snapshot creation on each data upload
  - _Requirements: 5.5_

- [ ]* 23.1 Write property test for inventory snapshot persistence
  - **Property 14: Inventory Snapshot Persistence**
  - **Validates: Requirements 5.5**

- [x] 24. Strategic Roadmap Phase 6: Inventory Trend Visualization



  - Create InventoryTrendChart component using Chart.js
  - Display historical Total Sellable values as line charts
  - Add item-level and facility-level trend analysis
  - Integrate trend charts into Charts & Visualizations tab
  - Implement date range selection for trend analysis
  - _Requirements: 5.8_

- [ ]* 24.1 Write property test for historical trend visualization
  - **Property 15: Historical Trend Visualization**
  - **Validates: Requirements 5.8**

- [x] 25. Strategic Roadmap Phase 7: Master Inventory CSV Support


  - Enhance DataService to support simplified CSV formats
  - Add loadMasterInventoryData function for 'Item ID', 'Location', 'Total Sellable' parsing
  - Implement flexible CSV schema detection and validation
  - Maintain backward compatibility with existing detailed inventory format
  - Update file upload UI to handle both CSV formats
  - _Requirements: 5.7_

- [ ]* 25.1 Write property test for master inventory CSV processing
  - **Property 16: Master Inventory CSV Processing**
  - **Validates: Requirements 5.7**

- [x] 26. Strategic Roadmap Integration and Testing



  - Integrate all strategic roadmap features into main dashboard
  - Test new stock classification system with sample data
  - Validate replenishment calculations and recommendations
  - Test inventory history tracking and trend visualization
  - Ensure backward compatibility with existing functionality
  - Ensure all strategic roadmap tests pass, ask the user if questions arise
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_