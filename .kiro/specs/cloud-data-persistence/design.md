# Design Document: Cloud Data Persistence

## Overview

This design outlines the implementation of cloud-based data persistence using Supabase (PostgreSQL Database + Storage Buckets) to replace the current localStorage-only approach. The system will ensure uploaded data and historical snapshots are permanently stored in the cloud while maintaining hybrid functionality for offline scenarios.

The key architectural shift involves:
1. **Storage Layer Introduction** - New layer between UI and Services for unified data persistence
2. **Supabase Integration** - PostgreSQL for structured data, Storage Buckets for files
3. **Hybrid Storage Strategy** - Cloud-first with localStorage fallback
4. **Business Logic Preservation** - No changes to existing calculations

## Architecture

### Current State Analysis

The existing system uses:
- `HistoryService.ts` for localStorage-based snapshot management
- `DataService.ts` for CSV parsing and validation
- Direct localStorage operations throughout components

### Enhanced Architecture with Storage Layer

```mermaid
graph TD
    A[UI Components] --> B[Storage Layer]
    B --> C[SupabaseService]
    B --> D[LocalStorageService]
    C --> E[Supabase Database]
    C --> F[Supabase Storage]
    B --> G[Existing Services]
    G --> H[AnalyticsService]
    G --> I[HistoryService]
    G --> J[DataService]
    
    subgraph "API Routes"
        K[/api/upload] --> C
        L[/api/history] --> C
    end
    
    subgraph "Business Logic (Unchanged)"
        M[15-day Lead Time]
        N[6-month Expiry Math]
        O[Replenishment Logic]
    end
    
    H --> M
    H --> N
    H --> O
```

### Storage Layer Architecture

The Storage Layer acts as a unified interface that:
- Prioritizes cloud operations (Supabase)
- Falls back to localStorage when cloud is unavailable
- Provides consistent API to existing services
- Handles sync operations transparently

## Components and Interfaces

### 1. Storage Layer Interface

#### StorageLayer Class
```typescript
export class StorageLayer {
  private supabaseService: SupabaseService;
  private localStorageService: LocalStorageService;
  private syncStatus: SyncStatus;

  // Unified interface for all storage operations
  async saveInventorySnapshot(snapshot: InventorySnapshot): Promise<void>;
  async getInventoryHistory(platform?: Platform): Promise<InventorySnapshot[]>;
  async uploadFile(file: File, metadata: FileMetadata): Promise<UploadResult>;
  async getFileData(fileId: string): Promise<FileData | null>;
  
  // Sync management
  async syncToCloud(): Promise<SyncResult>;
  getSyncStatus(): SyncStatus;
  onSyncStatusChange(callback: (status: SyncStatus) => void): void;
}
```

#### SyncStatus Interface
```typescript
export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: Date | null;
  pendingOperations: number;
  status: 'synced' | 'syncing' | 'failed' | 'offline';
  message: string;
}
```

### 2. Supabase Database Schema

#### inventory_history Table
```sql
CREATE TABLE inventory_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id VARCHAR(255) NOT NULL,
  warehouse_id VARCHAR(255) NOT NULL,
  total_sellable INTEGER NOT NULL,
  platform VARCHAR(50) NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL,
  snapshot_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  upload_source VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_inventory_history_item_warehouse (item_id, warehouse_id),
  INDEX idx_inventory_history_platform_date (platform, upload_date),
  INDEX idx_inventory_history_snapshot_time (snapshot_timestamp)
);
```

#### file_uploads Table
```sql
CREATE TABLE file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processing_status VARCHAR(50) DEFAULT 'pending',
  platform VARCHAR(50) NOT NULL,
  record_count INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Supabase Storage Buckets

#### Bucket Structure
```typescript
// Storage bucket organization
const STORAGE_BUCKETS = {
  'inventory-files': {
    public: false,
    allowedMimeTypes: ['text/csv', 'application/vnd.ms-excel'],
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    path: 'uploads/{platform}/{year}/{month}/{filename}'
  }
};
```

#### File Naming Convention
```typescript
// File path structure in Supabase Storage
const generateFilePath = (platform: Platform, filename: string): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  
  return `uploads/${platform}/${year}/${month}/${timestamp}_${filename}`;
};
```

### 4. SupabaseService Implementation

#### Core SupabaseService Class
```typescript
export class SupabaseService {
  private supabase: SupabaseClient;
  private isInitialized: boolean = false;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
  }

  // File operations
  async uploadFile(file: File, platform: Platform): Promise<UploadResult>;
  async downloadFile(filePath: string): Promise<Blob | null>;
  async deleteFile(filePath: string): Promise<boolean>;

  // Database operations
  async saveInventorySnapshots(snapshots: InventorySnapshot[]): Promise<void>;
  async getInventoryHistory(
    platform?: Platform,
    limit?: number,
    offset?: number
  ): Promise<InventorySnapshot[]>;
  async getLatestSnapshot(platform: Platform): Promise<InventorySnapshot | null>;

  // Health and monitoring
  async checkConnection(): Promise<boolean>;
  async getStorageUsage(): Promise<StorageUsage>;
  async getDatabaseUsage(): Promise<DatabaseUsage>;
}
```

#### Error Handling and Retry Logic
```typescript
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

class SupabaseService {
  private async withRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === config.maxAttempts) {
          throw lastError;
        }
        
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
          config.maxDelay
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}
```

### 5. Enhanced HistoryService Integration

#### Modified HistoryService
```typescript
export class HistoryService {
  private static storageLayer: StorageLayer;

  // Enhanced methods with cloud integration
  static async saveInventorySnapshot(
    items: InventoryItem[],
    uploadSource: string,
    platform: Platform
  ): Promise<void> {
    const snapshots = this.convertToSnapshots(items, uploadSource, platform);
    
    // Save through Storage Layer (handles cloud + local)
    await this.storageLayer.saveInventorySnapshot(snapshots);
  }

  static async generateInventoryTrendData(
    itemId?: string,
    facilityId?: string,
    platform?: Platform
  ): Promise<TrendData> {
    // Fetch from Storage Layer (cloud-first, local fallback)
    const history = await this.storageLayer.getInventoryHistory(platform);
    
    // Existing business logic unchanged
    return this.calculateTrendData(history, itemId, facilityId);
  }

  // New cloud-specific methods
  static async syncPendingData(): Promise<SyncResult> {
    return await this.storageLayer.syncToCloud();
  }

  static getSyncStatus(): SyncStatus {
    return this.storageLayer.getSyncStatus();
  }
}
```

### 6. API Routes Implementation

#### /api/upload Route
```typescript
// pages/api/upload.ts
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = new IncomingForm();
    const { files, fields } = await parseForm(form, req);
    
    const file = files.file as File;
    const platform = fields.platform as Platform;
    
    // Upload to Supabase Storage
    const supabaseService = new SupabaseService();
    const uploadResult = await supabaseService.uploadFile(file, platform);
    
    // Save metadata to database
    await supabaseService.saveFileMetadata({
      filename: file.name,
      fileSize: file.size,
      platform,
      storagePath: uploadResult.path
    });

    res.status(200).json({
      success: true,
      fileId: uploadResult.fileId,
      url: uploadResult.url,
      metadata: uploadResult.metadata
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Upload failed',
      message: error.message 
    });
  }
}
```

#### /api/history Route
```typescript
// pages/api/history.ts
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabaseService = new SupabaseService();

  if (req.method === 'GET') {
    try {
      const { platform, limit, offset } = req.query;
      
      const history = await supabaseService.getInventoryHistory(
        platform as Platform,
        parseInt(limit as string) || 100,
        parseInt(offset as string) || 0
      );

      res.status(200).json({ history });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to fetch history',
        message: error.message 
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { snapshots } = req.body;
      
      await supabaseService.saveInventorySnapshots(snapshots);
      
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to save history',
        message: error.message 
      });
    }
  }
}
```

## Data Models

### Enhanced Interfaces

#### UploadResult Interface
```typescript
export interface UploadResult {
  fileId: string;
  url: string;
  path: string;
  metadata: {
    filename: string;
    fileSize: number;
    platform: Platform;
    uploadTimestamp: Date;
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  };
}
```

#### StorageUsage Interface
```typescript
export interface StorageUsage {
  totalSize: number;
  usedSize: number;
  availableSize: number;
  fileCount: number;
  buckets: {
    [bucketName: string]: {
      size: number;
      fileCount: number;
    };
  };
}
```

#### DatabaseUsage Interface
```typescript
export interface DatabaseUsage {
  totalSize: number;
  usedSize: number;
  availableSize: number;
  tables: {
    inventory_history: {
      rowCount: number;
      size: number;
    };
    file_uploads: {
      rowCount: number;
      size: number;
    };
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

<function_calls>
<invoke name="prework">
<parameter name="featureName">cloud-data-persistence

### Property Reflection

After reviewing all testable properties from the prework analysis, I've identified several areas where properties can be consolidated to eliminate redundancy:

**Consolidation Opportunities:**
- Properties 1.2 and 3.3 (dual storage coordination) can be combined into a comprehensive storage coordination property
- Properties 1.4, 3.4, and 4.5 (fallback behavior) can be merged into a single fallback property
- Properties 2.3, 2.4, and 2.5 (API response behavior) can be consolidated into one API consistency property
- Properties 4.1, 4.2, and 4.3 (file upload operations) can be combined into a comprehensive file upload property
- Properties 6.2, 6.3, 6.4, and 6.5 (validation and error handling) can be merged into one validation property
- Properties 8.1, 8.2, 8.3, 8.4, and 8.5 (business logic preservation) can be consolidated into one preservation property

This consolidation ensures each property provides unique validation value while avoiding overlapping test coverage.

### Correctness Properties

Based on the prework analysis and property reflection, here are the consolidated correctness properties:

**Property 1: Dual Storage Coordination**
*For any* data persistence operation, the Storage Layer should handle both cloud (Supabase) and local storage coordination, ensuring data is saved to both locations when cloud is available
**Validates: Requirements 1.2, 3.3**

**Property 2: Cloud Unavailable Fallback**
*For any* storage operation when cloud is unavailable, the system should gracefully fall back to localStorage, continue operating normally, and retry cloud sync when connection is restored
**Validates: Requirements 1.4, 3.4, 4.5**

**Property 3: API Response Consistency**
*For any* API request to `/api/upload` or `/api/history`, the routes should return consistent response formats with proper URLs, metadata, and timestamps according to the operation type
**Validates: Requirements 2.3, 2.4, 2.5**

**Property 4: Cloud Data Priority**
*For any* data conflict between cloud and local storage, the system should prioritize cloud data when it's newer and update localStorage accordingly
**Validates: Requirements 3.5**

**Property 5: Comprehensive File Upload**
*For any* file upload operation, the system should store the original file in Supabase Storage, save processed data to Supabase Database, and generate complete metadata including timestamps and processing status
**Validates: Requirements 4.1, 4.2, 4.3**

**Property 6: Hybrid Data Retrieval**
*For any* file data request, the system should fetch from Supabase Storage when available, otherwise fall back to local processing, maintaining consistent data access patterns
**Validates: Requirements 4.4**

**Property 7: Comprehensive Validation and Error Handling**
*For any* cloud storage operation, the system should validate data structure and size limits, implement proper error handling for network failures, and provide appropriate fallback behavior for timeouts
**Validates: Requirements 6.2, 6.3, 6.4, 6.5**

**Property 8: Retry Logic Consistency**
*For any* failed cloud operation, the system should retry up to 3 times with exponential backoff before falling back to local storage
**Validates: Requirements 7.3**

**Property 9: Capacity Management**
*For any* storage system approaching capacity limits, the system should implement data rotation, archival strategies, and cleanup procedures to maintain operation within free tier limits
**Validates: Requirements 7.5, 11.2, 11.3, 11.4**

**Property 10: Business Logic Preservation**
*For any* data source (cloud or local), all existing business calculations including 15-day lead times, 6-month expiry math, and replenishment algorithms should produce identical results and maintain unchanged functionality
**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

**Property 11: Migration Data Integrity**
*For any* migration operation from localStorage to Supabase, the system should preserve all existing snapshot timestamps and metadata while ensuring data integrity between local and cloud storage
**Validates: Requirements 10.2**

**Property 12: Intelligent Data Merging**
*For any* scenario where both local and cloud data exist, the system should merge data intelligently by preferring newer timestamps and maintaining data consistency
**Validates: Requirements 10.5**

**Property 13: Usage Monitoring and Warnings**
*For any* storage usage scenario, the system should monitor Supabase usage and provide warnings when approaching 80% of free tier limits (400MB database / 800MB storage)
**Validates: Requirements 11.5**

## Error Handling

### Network and Connectivity Errors
- **Connection Failures**: Implement exponential backoff retry logic with maximum 3 attempts
- **Timeout Handling**: Set reasonable timeouts (10s for uploads, 5s for queries) with graceful fallback
- **Offline Mode**: Detect network status and automatically switch to localStorage-only mode

### Supabase Service Errors
- **Authentication Failures**: Log errors and fall back to localStorage with user notification
- **Rate Limiting**: Implement request queuing and throttling to respect Supabase limits
- **Storage Quota Exceeded**: Implement automatic cleanup and data archival strategies

### Data Integrity Errors
- **Sync Conflicts**: Implement timestamp-based conflict resolution favoring newer data
- **Corrupted Data**: Validate data structure before storage and provide recovery mechanisms
- **Migration Failures**: Ensure partial migrations can be resumed and don't corrupt existing data

### API Route Errors
- **File Upload Failures**: Provide detailed error messages and maintain local file processing capability
- **Database Operation Failures**: Implement transaction rollback and data consistency checks
- **Validation Errors**: Return specific validation messages for file type, size, and data structure issues

## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests:**
- Specific examples of API route functionality with known inputs and expected outputs
- Edge cases like network failures, authentication errors, and data corruption scenarios
- Integration between StorageLayer, SupabaseService, and existing services
- UI component behavior for sync status indicators and error messages
- Migration scenarios with various localStorage data configurations

**Property-Based Tests:**
- Universal properties across all valid storage operations and data types
- Comprehensive input coverage through randomized test data generation
- Data integrity preservation across sync operations and network failures
- Business logic consistency across different data sources (cloud vs local)
- Performance characteristics under various data sizes and network conditions

**Property Test Configuration:**
- Minimum 100 iterations per property test to ensure statistical confidence
- Each property test tagged with: **Feature: cloud-data-persistence, Property {number}: {property_text}**
- Use fast-check library for TypeScript property-based testing
- Custom generators for inventory data, file uploads, and network failure scenarios

**Test Data Generation:**
- Various file types and sizes (CSV files from 1KB to 5MB)
- Different network conditions (online, offline, intermittent connectivity)
- Multiple data scenarios (empty cloud, empty local, conflicting timestamps)
- Edge cases (storage quota limits, authentication failures, corrupted data)
- Concurrent operations to test data consistency

**Integration Testing:**
- End-to-end file upload and cloud sync workflows
- Cross-browser compatibility for Supabase client operations
- Environment variable configuration testing (development vs production)
- Migration testing with various localStorage data states
- Performance testing under Supabase free tier constraints

### Testing Framework Integration

**Vitest + fast-check Configuration:**
```typescript
// Example property test structure
describe('Property Tests: Dual Storage Coordination', () => {
  it('should save to both cloud and local storage when cloud is available', 
    fc.property(
      fc.array(fc.record({
        itemId: fc.string(),
        totalSellable: fc.integer({ min: 0 }),
        platform: fc.constantFrom('blinkit', 'amazon')
      })),
      async (inventoryItems) => {
        const storageLayer = new StorageLayer();
        await storageLayer.saveInventorySnapshot(inventoryItems);
        
        // Verify both cloud and local storage contain the data
        const cloudData = await supabaseService.getInventoryHistory();
        const localData = localStorage.getItem('inventory_snapshots');
        
        expect(cloudData).toBeDefined();
        expect(localData).toBeDefined();
      }
    )
  );
});
```

**Performance Benchmarks:**
- File upload should complete within 10 seconds for files up to 5MB
- Database queries should return within 2 seconds for typical data volumes
- Sync operations should not block UI for more than 500ms
- Memory usage should remain under 100MB during large file processing

**Error Recovery Testing:**
- Simulate Supabase service outages and verify localStorage fallback
- Test recovery from corrupted localStorage data
- Verify graceful degradation when environment variables are missing
- Ensure data consistency after network interruptions during sync operations

**Supabase Integration Testing:**
- Test against actual Supabase development instance
- Verify database schema migrations and data integrity
- Test storage bucket operations with various file types
- Validate authentication and authorization flows
- Monitor and test free tier usage limits