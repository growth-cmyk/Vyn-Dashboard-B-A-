# Design Document: Multi-Platform Expansion

## Overview

The Multi-Platform Expansion enhances the existing Vyndo inventory dashboard to support both Amazon and Blinkit sales channels. The design maintains strict data separation while providing unified analytics capabilities, platform-specific business logic, and adaptive user interfaces that respond to the selected platform context.

The expansion preserves all existing functionality while adding platform-aware components, services, and data models that enable seamless switching between Blinkit-only, Amazon-only, and unified multi-platform views.

## Architecture

The multi-platform architecture extends the existing system with platform-aware layers while maintaining the immutable business logic principle:

### Platform-Aware Data Layer
- **Platform Context Service**: Manages active platform state and filtering logic
- **Enhanced Data Service**: Supports Amazon CSV parsing alongside existing Blinkit formats
- **Platform-Tagged Models**: All data models extended with platform identification
- **Cross-Platform Aggregation**: Services for combining metrics across platforms

### Platform-Specific Business Logic
- **Adaptive Replenishment Service**: Applies platform-specific lead times (Blinkit: 15 days, Amazon: 7 days)
- **Platform Fee Calculations**: Amazon-specific payout calculations with referral fee deductions
- **Channel-Specific Analytics**: Separate calculation engines for platform-unique metrics

### Adaptive UI Layer
- **Platform Switcher Component**: Top-level navigation for platform selection
- **Theme-Aware Components**: Dynamic color schemes based on active platform
- **Conditional Rendering**: Platform-specific UI elements and metrics
- **Unified View Components**: Cross-platform analytics and comparisons

## Components and Interfaces

### Enhanced Data Models

**Platform Identifier**
```typescript
type Platform = 'Blinkit' | 'Amazon' | 'All';

interface PlatformContext {
  activePlatform: Platform;
  availablePlatforms: Platform[];
  platformConfig: PlatformConfig;
}

interface PlatformConfig {
  [key: string]: {
    leadTime: number;
    referralFee?: number;
    brandColors: ColorPalette;
    displayName: string;
    icon: string;
  };
}
```

**Enhanced Data Models**
```typescript
interface PlatformAwareSalesRecord extends SalesRecord {
  platform: Platform;
  platformSpecificData?: {
    amazonSku?: string;
    blinkitItemId?: string;
    referralFee?: number;
    estimatedPayout?: number;
  };
}

interface PlatformAwareInventoryItem extends InventoryItem {
  platform: Platform;
  platformSpecificMetrics?: {
    platformLeadTime: number;
    platformSafetyStock: number;
    channelSpecificVelocity: number;
  };
}

interface PlatformAwareInventorySnapshot extends InventorySnapshot {
  platform: Platform;
  platformMetadata: {
    uploadSource: string;
    dataFormat: 'blinkit' | 'amazon';
    recordCount: number;
  };
}
```

**Amazon-Specific Models**
```typescript
interface AmazonSalesRecord {
  sku: string;
  'units-ordered': number;
  'item-price': number;
  'order-date': string;
  'customer-city'?: string;
  'customer-state'?: string;
  // Additional Amazon-specific fields
}

interface AmazonMetrics {
  grossRevenue: number;
  referralFee: number;
  estimatedPayout: number;
  feePercentage: number;
}
```

### Enhanced Services

**PlatformContextService**
```typescript
class PlatformContextService {
  static setActivePlatform(platform: Platform): void;
  static getActivePlatform(): Platform;
  static getPlatformConfig(platform: Platform): PlatformConfig;
  static filterDataByPlatform<T extends { platform: Platform }>(data: T[], platform: Platform): T[];
  static aggregateAcrossPlatforms<T>(data: T[], aggregationFn: (items: T[]) => any): any;
}
```

**Enhanced DataService**
```typescript
class DataService {
  // Existing methods preserved
  static loadInventoryData(file: File): Promise<InventoryItem[]>;
  static loadSalesData(file: File): Promise<SalesRecord[]>;
  
  // New Amazon support
  static loadAmazonSalesData(file: File): Promise<PlatformAwareSalesRecord[]>;
  static detectDataFormat(file: File): Promise<'blinkit' | 'amazon' | 'unknown'>;
  static validateAmazonSchema(headers: string[]): ValidationResult;
  static mapAmazonToSalesRecord(amazonRecord: AmazonSalesRecord): PlatformAwareSalesRecord;
}
```

**Enhanced ReplenishmentService**
```typescript
class ReplenishmentService {
  static calculateReorderQuantity(
    item: PlatformAwareInventoryItem, 
    salesVelocity: number, 
    platform: Platform
  ): number;
  
  static getPlatformLeadTime(platform: Platform): number;
  static getPlatformSafetyStock(platform: Platform, salesVelocity: number): number;
  static generatePlatformRecommendations(
    inventory: PlatformAwareInventoryItem[], 
    platform: Platform
  ): ReplenishmentRecommendation[];
}
```

**AmazonAnalyticsService**
```typescript
class AmazonAnalyticsService {
  static calculateEstimatedPayout(grossRevenue: number, referralFeeRate: number = 0.15): AmazonMetrics;
  static aggregateAmazonMetrics(sales: PlatformAwareSalesRecord[]): AmazonMetrics;
  static compareAmazonVsBlinkit(amazonSales: PlatformAwareSalesRecord[], blinkitSales: PlatformAwareSalesRecord[]): ComparisonMetrics;
}
```

### UI Components

**PlatformSwitcher Component**
```typescript
interface PlatformSwitcherProps {
  activePlatform: Platform;
  onPlatformChange: (platform: Platform) => void;
  availablePlatforms: Platform[];
}

const PlatformSwitcher: React.FC<PlatformSwitcherProps> = ({
  activePlatform,
  onPlatformChange,
  availablePlatforms
}) => {
  // Renders platform selection with Lucide icons
  // Layers (Unified), ShoppingBag (Blinkit), Box (Amazon)
};
```

**Platform-Aware Theme Provider**
```typescript
interface PlatformThemeProps {
  platform: Platform;
  children: React.ReactNode;
}

const PlatformThemeProvider: React.FC<PlatformThemeProps> = ({ platform, children }) => {
  // Applies platform-specific color schemes
  // Amazon: Blue/Yellow accents
  // Blinkit: Vyndo Orange
  // Unified: Neutral/Combined
};
```

**Amazon Metrics Card**
```typescript
interface AmazonMetricsCardProps {
  salesData: PlatformAwareSalesRecord[];
  referralFeeRate: number;
}

const AmazonEstimatedPayoutCard: React.FC<AmazonMetricsCardProps> = ({
  salesData,
  referralFeeRate
}) => {
  // Displays gross revenue, fees, and estimated payout
  // Shows fee calculation transparency
};
```

## Data Models

### Platform Configuration

The system maintains platform-specific configurations that drive business logic and UI behavior:

```typescript
const PLATFORM_CONFIG: Record<Platform, PlatformConfig> = {
  'Blinkit': {
    leadTime: 15,
    brandColors: {
      primary: '#F36F21', // Vyndo Orange
      accent: '#2D6A4F'   // Millet Green
    },
    displayName: 'Blinkit',
    icon: 'ShoppingBag'
  },
  'Amazon': {
    leadTime: 7,
    referralFee: 0.15,
    brandColors: {
      primary: '#FF9900', // Amazon Orange
      accent: '#146EB4'   // Amazon Blue
    },
    displayName: 'Amazon',
    icon: 'Box'
  },
  'All': {
    leadTime: 0, // Calculated per item
    brandColors: {
      primary: '#6B7280', // Neutral Gray
      accent: '#4F46E5'   // Neutral Purple
    },
    displayName: 'All Platforms',
    icon: 'Layers'
  }
};
```

### Data Flow Architecture

1. **Upload Phase**: Files are analyzed to detect platform (Blinkit vs Amazon format)
2. **Processing Phase**: Data is parsed using platform-specific parsers and tagged with platform ID
3. **Storage Phase**: Platform-aware snapshots are saved with platform metadata
4. **Analytics Phase**: Calculations use platform-specific business rules
5. **Display Phase**: UI adapts colors, metrics, and filtering based on active platform

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property 1: Platform Data Separation**
*For any* data operation, records from different platforms should remain properly separated and tagged with correct platform identifiers
**Validates: Requirements 1.2, 1.3**

**Property 2: Platform-Specific Lead Time Application**
*For any* replenishment calculation, the system should apply the correct lead time (15 days for Blinkit, 7 days for Amazon) based on the item's platform
**Validates: Requirements 3.1, 3.2**

**Property 3: Amazon CSV Parsing Accuracy**
*For any* Amazon CSV file with headers 'sku', 'units-ordered', 'item-price', the parser should correctly map these to internal SalesRecord structure
**Validates: Requirements 2.1, 2.2**

**Property 4: Platform Switcher Filtering**
*For any* platform selection, all dashboard components should display only data matching the selected platform filter
**Validates: Requirements 4.3, 4.4**

**Property 5: Amazon Payout Calculation**
*For any* Amazon sales data, the estimated payout should equal gross revenue minus 15% referral fee
**Validates: Requirements 5.1, 5.2**

**Property 6: Platform-Aware Visual Theming**
*For any* platform selection, the UI should apply the correct color scheme (Amazon blue/yellow, Blinkit orange, or unified neutral)
**Validates: Requirements 6.1, 6.2**

**Property 7: Cross-Platform Aggregation**
*For any* unified view request, metrics should correctly aggregate data across all platforms while maintaining platform attribution
**Validates: Requirements 7.1, 7.2**

**Property 8: Platform-Specific Inventory Snapshots**
*For any* inventory data upload, snapshots should be stored with correct platform ID for independent historical tracking
**Validates: Requirements 1.3, 8.5**

**Property 9: Platform Context Consistency**
*For any* platform switch operation, all components should consistently reflect the new platform context without data mixing
**Validates: Requirements 4.5, 9.4**

**Property 10: Amazon Schema Validation**
*For any* file upload attempt, Amazon files should be validated against Amazon-specific schema requirements
**Validates: Requirements 2.3, 9.1**

## Error Handling

### Platform-Specific Error Handling
- **Format Detection Errors**: Clear messaging when CSV format cannot be determined
- **Schema Validation Errors**: Platform-specific error messages for missing or incorrect headers
- **Data Mixing Prevention**: Warnings when attempting to mix platform data inappropriately
- **Calculation Errors**: Platform-aware error handling for business logic failures

### Cross-Platform Error Handling
- **Aggregation Errors**: Graceful handling when cross-platform calculations fail
- **Theme Switching Errors**: Fallback to default theme if platform theme fails to load
- **Filter State Errors**: Recovery mechanisms for platform filter state corruption
- **Data Consistency Errors**: Validation and correction of platform attribution inconsistencies

## Testing Strategy

### Unit Testing
- Test platform-specific parsers with sample Amazon and Blinkit CSV files
- Test replenishment calculations with different lead times for each platform
- Test platform filtering logic across all data types
- Test Amazon payout calculations with various fee scenarios
- Test theme switching and color application logic

### Property-Based Testing
The system will use property-based testing to verify multi-platform correctness properties:

Each correctness property will be implemented as a property-based test that:
- Generates random but valid multi-platform data scenarios
- Executes platform-specific business logic
- Verifies platform separation and correct calculations
- Runs a minimum of 100 iterations per property to ensure reliability

### Integration Testing
- Test complete workflows from Amazon CSV upload to dashboard display
- Test platform switching with real data across all dashboard components
- Test cross-platform aggregation and unified view functionality
- Test data persistence and retrieval with platform context
- Test theme consistency across platform switches

### Cross-Platform Compatibility Testing
- Validate Amazon CSV parsing with various Amazon report formats
- Test platform-specific business logic with edge cases
- Verify UI consistency across different platform contexts
- Test performance with large multi-platform datasets
- Validate data integrity across platform boundaries

The comprehensive testing approach ensures the multi-platform expansion maintains data integrity, applies correct business logic, and provides consistent user experience across all platform contexts.