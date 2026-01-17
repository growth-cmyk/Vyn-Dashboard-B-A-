# Vyndo Analytics Platform v1.1 - Project Context

## Overview
Vyndo Analytics Platform is a comprehensive inventory and sales analytics dashboard designed for multi-channel e-commerce operations. The platform provides real-time insights into inventory levels, sales performance, and replenishment recommendations across multiple platforms (Blinkit, Amazon) with **cloud-based data persistence** and **statistical ROP modeling**.

## Core Features

### 1. Multi-Platform Support
- **Blinkit Integration**: 15-day lead time, Vyndo brand colors
- **Amazon Integration**: 7-day lead time, 15% referral fee calculations
- **Platform Switcher**: Seamless switching between platforms with independent data tracking

### 2. Inventory Management
- Real-time stock level monitoring
- Automated replenishment recommendations with **Statistical ROP Model**
- Stock status classification (out-of-stock, understock, healthy, overstock, expiry-risk)
- 6-month expiry risk detection
- Historical inventory tracking with **file-based cumulative history**
- **Cloud-synced demand history** for 12-month statistical analysis

### 3. Sales Analytics
- Sales velocity calculations
- Revenue tracking with platform-specific metrics
- Time-period analysis (7-day, 15-day, 30-day, MTD, YTD)
- Geographic distribution analysis
- Top SKU performance tracking
- **Automated demand map generation** from sales data

### 4. Marketing Analytics
- Campaign performance tracking (Product Recommendation, Product Listing, Brand Booster)
- ROAS (Return on Ad Spend) calculations
- Funnel analysis (Impressions → Clicks → Add to Cart → Sales)
- Ad-Inventory synchronization for strategic decision-making
- Budget optimization recommendations

### 5. Replenishment Planning (Statistical ROP Model)
- **Statistical ROP calculations** using 12-month demand history
- **Service level configuration** (85%, 90%, 95%, 98%, 99%, 99.8%)
- **Standard deviation-based safety stock** calculations
- Lead time and safety stock considerations
- Urgency scoring for prioritization
- Platform-specific replenishment strategies
- **Cloud-synced user preferences** for ROP settings

### 6. Cloud Data Persistence (NEW in v1.1)
- **Supabase integration** for PostgreSQL cloud storage
- **Vercel Blob Storage** for file uploads and re-hydration
- **Offline-first architecture** with automatic cloud sync
- **Data migration tools** for moving localStorage to cloud
- **Real-time sync status** indicators
- **Automatic retry logic** with exponential backoff

## Technical Architecture

### Frontend Stack
- **React 19.2.0** with TypeScript
- **Vite 7.2.4** for build tooling
- **Tailwind CSS 4.1.18** for styling
- **Chart.js** for data visualization
- **Lucide React** for icons

### Cloud Infrastructure (NEW in v1.1)
- **Supabase** for PostgreSQL database and storage
- **Vercel Blob Storage** for file persistence
- **Vercel Serverless Functions** for API endpoints

### Data Processing
- **Papa Parse** for CSV parsing
- **XLSX** for Excel file processing
- **React Window** for virtualized tables
- **Fast-check** for property-based testing

### State Management
- React hooks for local state
- Service layer pattern for business logic
- **StorageLayer** for unified cloud/local persistence
- **SupabaseService** for cloud operations
- **BlobStorageService** for file storage

## Key Services

### StorageLayer (NEW in v1.1)
- Unified interface for cloud and local storage
- Automatic fallback to localStorage when offline
- Sync status management and callbacks
- Data migration from localStorage to cloud
- Pending operation queue for offline sync
- Support for inventory, sales, marketing, and demand history

### SupabaseService (NEW in v1.1)
- PostgreSQL database operations
- File upload/download to Supabase Storage
- Retry logic with exponential backoff
- Connection health checks
- Usage monitoring and quota management
- RLS (Row Level Security) policy enforcement

### BlobStorageService (NEW in v1.1)
- Vercel Blob Storage integration
- File upload via serverless API
- Dashboard re-hydration from blob URLs
- 15-day lead time and 6-month expiry logic preservation
- Automatic file metadata tracking

### DataService
- CSV/Excel file parsing and validation
- Data transformation and normalization
- Multi-format support (Blinkit, Amazon, Master Inventory)
- Schema validation and error handling
- **Demand map generation** from sales data
- **Cloud sync integration** for demand history

### AnalyticsService
- Stock analysis and classification
- Sales velocity calculations
- **Statistical ROP calculations** with Z-scores
- Replenishment recommendations
- Platform-specific metric calculations
- **12-month demand history** integration

### MarketingService
- Campaign data processing
- ROAS calculations
- Funnel analysis
- Ad-Inventory correlation

## Business Logic

### Statistical ROP Calculation (NEW in v1.1)
```
ROP = Demand During Lead Time + Safety Stock

Where:
- Demand During Lead Time = Avg Daily Demand × Lead Time (days)
- Safety Stock = Z-score × σ × √(Lead Time in months)
- σ = Standard Deviation of monthly demand over 12 months
- Z-score = Based on service level (e.g., 1.64 for 95%)
```

### Service Level Z-Scores
- 85%: 1.04
- 90%: 1.28
- **95%: 1.64 (default)**
- 98%: 2.05
- 99%: 2.33
- 99.8%: 2.88

### Stock Status Classification
- **Out of Stock**: totalSellable = 0
- **Understock**: daysOfCover < leadTime + safetyDays
- **Healthy**: leadTime + safetyDays ≤ daysOfCover < 180 days
- **Overstock**: daysOfCover ≥ 180 days (6-month expiry risk)
- **Expiry Risk**: daysOfCover > 180 days

### Platform-Specific Lead Times
- **Blinkit**: 15 days
- **Amazon**: 7 days

### Cloud Sync Strategy
1. **Always save to localStorage first** (immediate backup)
2. **Try cloud save if online** (Supabase + Vercel Blob)
3. **Queue for sync if offline** (pending operations)
4. **Auto-sync when back online** (with retry logic)
5. **Cloud-first reads** with localStorage fallback

## Database Schema (Supabase)

### Tables
- **inventory_history**: Historical inventory snapshots
- **file_uploads**: File metadata and blob URLs
- **marketing_history**: Campaign performance data
- **user_preferences**: ROP settings and forecast quantities
- **sku_demand_history**: 12-month demand data per SKU

### Storage Buckets
- **inventory-files**: CSV/Excel file storage

### Security
- Row Level Security (RLS) enabled on all tables
- Authenticated user policies
- Public read access for anon key

## Environment Variables

### Required for Cloud Persistence
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Vercel Blob Storage (auto-configured by Vercel)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
```

## Deployment (Vercel)

### Build Configuration
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Environment Variables (Vercel Dashboard)
```
VITE_SUPABASE_URL=https://gmorgozafqwevskcubff.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx (auto-configured)
```

### Serverless Functions
- **API Route**: `/api/blob-upload`
- **Runtime**: Node.js 20.x
- **Max Duration**: 10s

## Version History
- **v0.0.0**: Initial development version
- **v1.0.0**: Core functionality and multi-platform support
- **v1.1.0**: Cloud data persistence, Statistical ROP Model, Vercel Blob Storage integration
