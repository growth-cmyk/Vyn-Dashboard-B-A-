# Design Document: Statistical Safety Stock & Reorder Point (ROP) Model

## Overview

This design implements a Statistical Safety Stock & Reorder Point (ROP) Model that replaces the simple lead time + safety days calculation with a statistically rigorous approach based on demand variability. The model uses standard deviation of historical monthly demand and service level targets (Z-scores) to calculate optimal safety stock and reorder points.

**Key Formula:**
```
Safety Stock = σ × √(Lead Time in Months) × Z + Forecast Qty
ROP = (Avg Daily Demand × Lead Time in Days) + Safety Stock
```

Where:
- σ = Standard deviation of monthly demand
- Z = Z-score for desired service level (e.g., 1.64 for 95%)
- Lead Time in Months = Lead Time in Days / 30
- Forecast Qty = User-provided expected demand spike

## Architecture

### Component Structure

```
ReplenishmentService (Enhanced)
├── Z_TABLE (constant)
├── calculateStatisticalROP()
├── calculateAverageMonthlyDemand()
├── calculateStandardDeviation()
├── calculateSafetyStock()
└── calculateReorderPoint()

InventoryItem (Enhanced Type)
└── monthlyDemand?: number[] (12 months)

ReplenishmentPlanner (Enhanced UI)
├── Service Level Dropdown
├── Forecast Qty Input Fields
├── ROP Column with Tooltip
└── Statistical Indicators
```

### Data Flow

```
1. User uploads inventory data with monthlyDemand
2. ReplenishmentService.calculateStatisticalROP() is called
3. Calculate avg monthly demand and standard deviation
4. Lookup Z-score from Z_TABLE based on service level
5. Calculate Safety Stock using statistical formula
6. Calculate ROP = Demand during Lead Time + Safety Stock
7. Display ROP in UI with tooltip showing breakdown
8. Marketing module checks: Current Stock < ROP → PAUSE ADS
```

## Components and Interfaces

### 1. Z-Table Constant

```typescript
// Z-score mappings for service levels
export const Z_TABLE: Record<number, number> = {
  85: 1.04,
  90: 1.28,
  95: 1.64,
  98: 2.05,
  99: 2.33,
  99.8: 2.88
} as const;

export const DEFAULT_SERVICE_LEVEL = 95;
export const DEFAULT_Z_SCORE = Z_TABLE[DEFAULT_SERVICE_LEVEL];
```

### 2. Enhanced InventoryItem Type

```typescript
export interface InventoryItem {
  // ... existing fields ...
  
  // NEW: Historical demand data for statistical calculations
  monthlyDemand?: number[]; // Array of 12 months (oldest to newest)
  // Example: [120, 135, 142, 128, 150, 145, 138, 155, 160, 148, 152, 158]
}
```

### 3. Statistical ROP Calculation Interface

```typescript
export interface StatisticalROPResult {
  rop: number; // Reorder Point
  safetyStock: number; // Calculated safety stock
  avgMonthlyDemand: number; // Average of 12 months
  avgDailyDemand: number; // Monthly / 30
  standardDeviation: number; // σ of monthly demand
  serviceLevel: number; // Selected service level %
  zScore: number; // Z-score used
  leadTimeMonths: number; // Lead time converted to months
  forecastQty: number; // User-provided forecast
  demandDuringLeadTime: number; // Avg Daily Demand × Lead Time Days
  calculationMethod: 'statistical' | 'simple'; // Which method was used
}
```

### 4. ReplenishmentService Methods

```typescript
export class ReplenishmentService {
  /**
   * Calculate Statistical Reorder Point (ROP)
   * Uses standard deviation and service level to determine optimal reorder point
   * 
   * @param item - Inventory item with monthlyDemand data
   * @param platform - Platform for lead time lookup
   * @param serviceLevel - Target service level (85-99.8%)
   * @param forecastQty - Expected demand spike (default 0)
   * @returns Complete ROP calculation result
   */
  static calculateStatisticalROP(
    item: InventoryItem,
    platform: Platform,
    serviceLevel: number = DEFAULT_SERVICE_LEVEL,
    forecastQty: number = 0
  ): StatisticalROPResult {
    // Validate monthlyDemand availability
    if (!item.monthlyDemand || item.monthlyDemand.length !== 12) {
      return this.calculateSimpleROP(item, platform, forecastQty);
    }

    // Step 1: Calculate average monthly demand
    const avgMonthlyDemand = this.calculateAverageMonthlyDemand(item.monthlyDemand);
    const avgDailyDemand = avgMonthlyDemand / 30;

    // Step 2: Calculate standard deviation
    const standardDeviation = this.calculateStandardDeviation(item.monthlyDemand, avgMonthlyDemand);

    // Step 3: Get Z-score for service level
    const zScore = this.getZScore(serviceLevel);

    // Step 4: Get platform lead time
    const leadTimeDays = this.getPlatformLeadTime(platform);
    const leadTimeMonths = leadTimeDays / 30;

    // Step 5: Calculate safety stock
    // Formula: σ × √(Lead Time in Months) × Z + Forecast Qty
    const safetyStock = this.calculateSafetyStock(
      standardDeviation,
      leadTimeMonths,
      zScore,
      forecastQty
    );

    // Step 6: Calculate demand during lead time
    const demandDuringLeadTime = avgDailyDemand * leadTimeDays;

    // Step 7: Calculate ROP
    // Formula: (Avg Daily Demand × Lead Time in Days) + Safety Stock
    const rop = demandDuringLeadTime + safetyStock;

    return {
      rop: Math.ceil(rop),
      safetyStock: Math.ceil(safetyStock),
      avgMonthlyDemand,
      avgDailyDemand,
      standardDeviation,
      serviceLevel,
      zScore,
      leadTimeMonths,
      forecastQty,
      demandDuringLeadTime,
      calculationMethod: 'statistical'
    };
  }

  /**
   * Calculate average monthly demand from 12-month history
   */
  static calculateAverageMonthlyDemand(monthlyDemand: number[]): number {
    const sum = monthlyDemand.reduce((acc, val) => acc + val, 0);
    return sum / monthlyDemand.length;
  }

  /**
   * Calculate standard deviation of monthly demand
   * Formula: σ = sqrt(sum((x - mean)²) / n)
   */
  static calculateStandardDeviation(monthlyDemand: number[], mean: number): number {
    const squaredDifferences = monthlyDemand.map(x => Math.pow(x - mean, 2));
    const variance = squaredDifferences.reduce((acc, val) => acc + val, 0) / monthlyDemand.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate safety stock using statistical formula
   * Formula: σ × √(Lead Time in Months) × Z + Forecast Qty
   */
  static calculateSafetyStock(
    standardDeviation: number,
    leadTimeMonths: number,
    zScore: number,
    forecastQty: number
  ): number {
    const statisticalSafetyStock = standardDeviation * Math.sqrt(leadTimeMonths) * zScore;
    return statisticalSafetyStock + forecastQty;
  }

  /**
   * Get Z-score for service level from Z_TABLE
   */
  static getZScore(serviceLevel: number): number {
    return Z_TABLE[serviceLevel] || DEFAULT_Z_SCORE;
  }

  /**
   * Fallback to simple ROP calculation when monthlyDemand not available
   */
  private static calculateSimpleROP(
    item: InventoryItem,
    platform: Platform,
    forecastQty: number
  ): StatisticalROPResult {
    // Use existing logic with last30Days as proxy
    const avgDailyDemand = item.last30Days / 30;
    const leadTimeDays = this.getPlatformLeadTime(platform);
    const simpleSafetyStock = (3 * avgDailyDemand) + forecastQty; // 3 days safety
    const demandDuringLeadTime = avgDailyDemand * leadTimeDays;
    const rop = demandDuringLeadTime + simpleSafetyStock;

    return {
      rop: Math.ceil(rop),
      safetyStock: Math.ceil(simpleSafetyStock),
      avgMonthlyDemand: avgDailyDemand * 30,
      avgDailyDemand,
      standardDeviation: 0, // Not calculated
      serviceLevel: 95,
      zScore: 1.64,
      leadTimeMonths: leadTimeDays / 30,
      forecastQty,
      demandDuringLeadTime,
      calculationMethod: 'simple'
    };
  }
}
```

## Data Models

### Enhanced Replenishment Recommendation

```typescript
export interface ReplenishmentRecommendation {
  // ... existing fields ...
  
  // NEW: Statistical ROP fields
  rop: number; // Reorder Point
  ropCalculation: StatisticalROPResult; // Full calculation details
  currentStockVsROP: number; // Current Stock - ROP (negative = need to order)
  daysUntilROP: number; // Days until stock reaches ROP
}
```

### Forecast Quantity Storage

```typescript
// LocalStorage structure for forecast quantities
interface ForecastQuantityStorage {
  [itemId: string]: {
    [warehouseId: string]: number; // Forecast quantity
  };
}

const STORAGE_KEY = 'vyndo_forecast_quantities';
```

## UI Components

### 1. Service Level Dropdown

```typescript
// In ReplenishmentPlanner.tsx
const SERVICE_LEVELS = [85, 90, 95, 98, 99, 99.8];

const [serviceLevel, setServiceLevel] = useState(() => {
  const saved = localStorage.getItem('vyndo_service_level');
  return saved ? parseFloat(saved) : 95;
});

<select
  value={serviceLevel}
  onChange={(e) => {
    const level = parseFloat(e.target.value);
    setServiceLevel(level);
    localStorage.setItem('vyndo_service_level', level.toString());
  }}
  className="rounded-lg border-gray-300"
>
  {SERVICE_LEVELS.map(level => (
    <option key={level} value={level}>
      {level}% (Z = {Z_TABLE[level]})
    </option>
  ))}
</select>
```

### 2. Forecast Quantity Input

```typescript
// In replenishment table row
const [forecastQty, setForecastQty] = useState(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const data = JSON.parse(saved);
    return data[item.itemId]?.[item.warehouseFacilityId] || 0;
  }
  return 0;
});

const handleForecastChange = (value: number) => {
  setForecastQty(value);
  
  // Save to localStorage
  const saved = localStorage.getItem(STORAGE_KEY);
  const data = saved ? JSON.parse(saved) : {};
  if (!data[item.itemId]) data[item.itemId] = {};
  data[item.itemId][item.warehouseFacilityId] = value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

<input
  type="number"
  min="0"
  value={forecastQty}
  onChange={(e) => handleForecastChange(parseInt(e.target.value) || 0)}
  className="w-24 rounded border-gray-300"
  placeholder="0"
/>
```

### 3. ROP Tooltip

```typescript
// Tooltip component for ROP breakdown
const ROPTooltip: React.FC<{ ropResult: StatisticalROPResult }> = ({ ropResult }) => {
  return (
    <div className="text-xs space-y-1">
      <div className="font-semibold border-b pb-1">ROP Calculation</div>
      <div>Avg Daily Demand: {ropResult.avgDailyDemand.toFixed(2)} units/day</div>
      <div>Lead Time: {Math.round(ropResult.leadTimeMonths * 30)} days</div>
      <div>Demand during Lead Time: {Math.round(ropResult.demandDuringLeadTime)} units</div>
      <div className="border-t pt-1">
        <div>Service Level: {ropResult.serviceLevel}% (Z = {ropResult.zScore})</div>
        <div>Std Deviation (σ): {ropResult.standardDeviation.toFixed(2)} units/month</div>
        <div>Safety Stock: {ropResult.safetyStock} units</div>
        {ropResult.forecastQty > 0 && (
          <div>Forecast Qty: +{ropResult.forecastQty} units</div>
        )}
      </div>
      <div className="border-t pt-1 font-semibold">
        ROP = {Math.round(ropResult.demandDuringLeadTime)} + {ropResult.safetyStock} = {ropResult.rop} units
      </div>
      <div className="text-gray-500 italic">
        Method: {ropResult.calculationMethod === 'statistical' ? 'Statistical' : 'Simple (no monthly data)'}
      </div>
    </div>
  );
};
```

## Error Handling

### Edge Cases

1. **Missing Monthly Demand**: Fall back to simple calculation using last30Days
2. **Zero Standard Deviation**: Safety Stock = Forecast Qty only (no variability buffer)
3. **Invalid Service Level**: Default to 95% (Z = 1.64)
4. **Negative Forecast Qty**: Treat as 0
5. **All Zero Monthly Demand**: Return ROP = Forecast Qty

### Validation

```typescript
static validateMonthlyDemand(monthlyDemand: number[]): boolean {
  if (!Array.isArray(monthlyDemand)) return false;
  if (monthlyDemand.length !== 12) return false;
  if (monthlyDemand.some(val => typeof val !== 'number' || val < 0)) return false;
  return true;
}
```

## Testing Strategy

### Unit Tests

1. **Z-Table Lookup**: Verify correct Z-scores for all service levels
2. **Average Calculation**: Test with various monthly demand patterns
3. **Standard Deviation**: Verify formula correctness with known datasets
4. **Safety Stock Formula**: Test with different σ, lead times, and Z-scores
5. **ROP Calculation**: End-to-end test with complete data

### Property-Based Tests

**Property 1: Higher Variability Increases Safety Stock**
*For any* two items with the same average monthly demand but different standard deviations, the item with higher σ should have higher safety stock

**Property 2: Higher Service Level Increases Safety Stock**
*For any* item, increasing the service level should increase the safety stock (higher Z-score)

**Property 3: ROP Always Positive**
*For any* valid inventory item with positive demand, ROP should be greater than zero

**Property 4: Forecast Quantity Additivity**
*For any* item, adding forecast quantity X should increase safety stock by exactly X units

**Property 5: Zero Variability Edge Case**
*For any* item with zero standard deviation, safety stock should equal forecast quantity only

### Integration Tests

1. **UI Updates**: Verify service level change updates all ROPs immediately
2. **Forecast Persistence**: Verify forecast quantities save/load from localStorage
3. **Marketing Integration**: Verify PAUSE ADS triggers when Current Stock < ROP
4. **Backward Compatibility**: Verify items without monthlyDemand use simple calculation

## Performance Considerations

### Optimization Strategies

1. **Memoization**: Cache statistical calculations per item
2. **Batch Processing**: Calculate all ROPs in single pass
3. **Lazy Evaluation**: Only recalculate when inputs change
4. **Efficient Array Operations**: Use reduce/map for statistical calculations

### Performance Targets

- Calculate ROP for 1000 items: < 500ms
- UI update after service level change: < 100ms
- Forecast quantity input response: < 50ms

## Marketing Module Integration

### Strategic Action Logic

```typescript
// In MarketingService or AdInventorySyncService
static determineStrategicAction(
  currentStock: number,
  rop: number,
  safetyStock: number,
  campaignPerformance: number // RoAS or similar metric
): StrategicAction {
  if (currentStock < rop) {
    return 'PAUSE ADS'; // Below reorder point - risk of stockout
  } else if (currentStock < rop + safetyStock) {
    return 'MONITOR'; // In safety stock zone - watch closely
  } else if (campaignPerformance > 3.0) {
    return 'SCALE ADS'; // Good stock + good performance = scale
  } else {
    return 'OPTIMIZE'; // Good stock but performance needs work
  }
}
```

### Display in Marketing Module

```typescript
// Show ROP in Ad-Inventory Sync table
<td>
  <div className="text-sm">
    <div>Current: {currentStock}</div>
    <div className="text-gray-500">ROP: {rop}</div>
    <div className={currentStock < rop ? 'text-red-600' : 'text-green-600'}>
      {currentStock < rop ? 'Below ROP' : 'Above ROP'}
    </div>
  </div>
</td>
```

## Migration Strategy

### Phase 1: Add Optional Fields
- Add monthlyDemand as optional field to InventoryItem
- Implement statistical calculations alongside existing logic
- No breaking changes to existing functionality

### Phase 2: UI Enhancement
- Add service level dropdown (default 95%)
- Add forecast quantity inputs (default 0)
- Show both old and new calculations side-by-side

### Phase 3: Marketing Integration
- Update strategic action logic to use ROP
- Add ROP display to Ad-Inventory Sync table
- Maintain backward compatibility for items without ROP

### Phase 4: Full Rollout
- Make statistical ROP the primary display
- Keep simple calculation as fallback
- Update all exports to include ROP data

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Variability Impact on Safety Stock
*For any* two inventory items with identical average monthly demand and service level, the item with higher standard deviation should have higher safety stock
**Validates: Requirements 9.1, 9.4**

### Property 2: Service Level Monotonicity
*For any* inventory item, increasing the service level should monotonically increase the safety stock and ROP
**Validates: Requirements 4.3, 3.4**

### Property 3: ROP Non-Negativity
*For any* inventory item with non-negative demand and valid parameters, the calculated ROP should be greater than or equal to zero
**Validates: Requirements 3.5, 9.5**

### Property 4: Forecast Additivity
*For any* inventory item, adding a forecast quantity X should increase the safety stock by exactly X units
**Validates: Requirements 5.2, 3.4**

### Property 5: Zero Variability Edge Case
*For any* inventory item with zero standard deviation (constant demand), the safety stock should equal the forecast quantity only
**Validates: Requirements 9.2, 9.5**

### Property 6: Backward Compatibility
*For any* inventory item without monthlyDemand data, the system should successfully calculate a valid ROP using the simple method
**Validates: Requirements 10.1, 10.2, 10.5**

### Property 7: Z-Score Lookup Consistency
*For any* valid service level in the Z_TABLE, the returned Z-score should match the statistical standard normal distribution values
**Validates: Requirements 1.2, 1.5**

### Property 8: Lead Time Conversion Accuracy
*For any* platform lead time in days, converting to months (days / 30) and using in safety stock calculation should produce mathematically consistent results
**Validates: Requirements 7.4, 3.4**

### Property 9: Marketing Trigger Correctness
*For any* inventory item, when current stock falls below ROP, the marketing module should trigger "PAUSE ADS" action
**Validates: Requirements 8.1, 8.2**

### Property 10: Statistical Calculation Determinism
*For any* inventory item with the same monthlyDemand, service level, and forecast quantity, repeated ROP calculations should produce identical results
**Validates: Requirements 3.1, 12.2**
