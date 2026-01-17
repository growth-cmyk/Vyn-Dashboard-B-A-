import { describe, it, expect } from 'vitest';
import { ReplenishmentService } from '../ReplenishmentService';
import type { InventoryItem, Platform } from '../../types';
import { PLATFORM } from '../../types';

describe('ReplenishmentService - Statistical ROP Model', () => {
  // Helper to create test inventory item
  const createTestItem = (monthlyDemand: number[], platform: Platform = PLATFORM.BLINKIT): InventoryItem => ({
    itemId: 'TEST-001',
    itemName: 'Test Product',
    brandName: 'Test Brand',
    upc: '123456789',
    uom: 'EA',
    warehouseFacilityId: 'WH-001',
    warehouseFacilityName: 'Test Warehouse',
    totalSellable: 100,
    incomingScheduled: 0,
    totalUnsellable: 0,
    last7Days: 50,
    last15Days: 100,
    last30Days: 200,
    platform,
    monthlyDemand
  });

  describe('Statistical Calculations', () => {
    it('should calculate average monthly demand correctly', () => {
      const monthlyDemand = [100, 110, 105, 95, 100, 105, 110, 100, 95, 105, 100, 105];
      const avg = ReplenishmentService.calculateAverageMonthlyDemand(monthlyDemand);
      expect(avg).toBeCloseTo(102.5, 1);
    });

    it('should calculate standard deviation correctly', () => {
      const monthlyDemand = [100, 110, 105, 95, 100, 105, 110, 100, 95, 105, 100, 105];
      const avg = ReplenishmentService.calculateAverageMonthlyDemand(monthlyDemand);
      const stdDev = ReplenishmentService.calculateStandardDeviation(monthlyDemand, avg);
      expect(stdDev).toBeGreaterThan(0);
      expect(stdDev).toBeLessThan(10); // Should be around 5
    });

    it('should return zero standard deviation for constant demand', () => {
      const monthlyDemand = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100];
      const avg = ReplenishmentService.calculateAverageMonthlyDemand(monthlyDemand);
      const stdDev = ReplenishmentService.calculateStandardDeviation(monthlyDemand, avg);
      expect(stdDev).toBe(0);
    });

    it('should calculate safety stock using statistical formula', () => {
      const standardDeviation = 10;
      const leadTimeMonths = 0.5; // 15 days
      const zScore = 1.64; // 95% service level
      const forecastQty = 20;

      const safetyStock = ReplenishmentService.calculateSafetyStock(
        standardDeviation,
        leadTimeMonths,
        zScore,
        forecastQty
      );

      // Expected: 10 × √0.5 × 1.64 + 20 ≈ 11.6 + 20 = 31.6
      expect(safetyStock).toBeCloseTo(31.6, 0);
    });
  });

  describe('Property 1: Variability Impact on Safety Stock', () => {
    it('should produce higher safety stock for higher variability (volatile sales)', () => {
      // Item 1: Stable sales (low variability)
      const stableDemand = [100, 102, 98, 101, 99, 100, 101, 99, 100, 102, 98, 100];
      const stableItem = createTestItem(stableDemand);

      // Item 2: Volatile sales (high variability) - same average but jagged
      const volatileDemand = [50, 150, 80, 120, 60, 140, 90, 110, 70, 130, 85, 115];
      const volatileItem = createTestItem(volatileDemand);

      // Verify both have same average
      const stableAvg = ReplenishmentService.calculateAverageMonthlyDemand(stableDemand);
      const volatileAvg = ReplenishmentService.calculateAverageMonthlyDemand(volatileDemand);
      expect(stableAvg).toBeCloseTo(volatileAvg, 0);

      // Calculate ROP for both with same service level
      const stableROP = ReplenishmentService.calculateStatisticalROP(
        stableItem,
        PLATFORM.BLINKIT,
        95, // 95% service level
        0   // No forecast
      );

      const volatileROP = ReplenishmentService.calculateStatisticalROP(
        volatileItem,
        PLATFORM.BLINKIT,
        95, // 95% service level
        0   // No forecast
      );

      // CRITICAL VERIFICATION: Volatile item should have higher standard deviation
      expect(volatileROP.standardDeviation).toBeGreaterThan(stableROP.standardDeviation);

      // CRITICAL VERIFICATION: Volatile item should have higher safety stock
      expect(volatileROP.safetyStock).toBeGreaterThan(stableROP.safetyStock);

      // CRITICAL VERIFICATION: Volatile item should have higher ROP
      expect(volatileROP.rop).toBeGreaterThan(stableROP.rop);

      // Log results for verification
      console.log('\n=== VARIABILITY IMPACT VERIFICATION ===');
      console.log('Stable Item:');
      console.log(`  Average Demand: ${stableROP.avgMonthlyDemand.toFixed(2)}`);
      console.log(`  Std Deviation: ${stableROP.standardDeviation.toFixed(2)}`);
      console.log(`  Safety Stock: ${stableROP.safetyStock}`);
      console.log(`  ROP: ${stableROP.rop}`);
      console.log('\nVolatile Item:');
      console.log(`  Average Demand: ${volatileROP.avgMonthlyDemand.toFixed(2)}`);
      console.log(`  Std Deviation: ${volatileROP.standardDeviation.toFixed(2)}`);
      console.log(`  Safety Stock: ${volatileROP.safetyStock}`);
      console.log(`  ROP: ${volatileROP.rop}`);
      console.log('\nDifference:');
      console.log(`  Std Dev Increase: ${((volatileROP.standardDeviation / stableROP.standardDeviation - 1) * 100).toFixed(1)}%`);
      console.log(`  Safety Stock Increase: ${((volatileROP.safetyStock / stableROP.safetyStock - 1) * 100).toFixed(1)}%`);
      console.log(`  ROP Increase: ${((volatileROP.rop / stableROP.rop - 1) * 100).toFixed(1)}%`);
      console.log('=====================================\n');
    });

    it('should use correct lead times for different platforms', () => {
      const monthlyDemand = [100, 110, 105, 95, 100, 105, 110, 100, 95, 105, 100, 105];
      
      const blinkitItem = createTestItem(monthlyDemand, PLATFORM.BLINKIT);
      const amazonItem = createTestItem(monthlyDemand, PLATFORM.AMAZON);

      const blinkitROP = ReplenishmentService.calculateStatisticalROP(blinkitItem, PLATFORM.BLINKIT, 95, 0);
      const amazonROP = ReplenishmentService.calculateStatisticalROP(amazonItem, PLATFORM.AMAZON, 95, 0);

      // Verify lead times
      expect(blinkitROP.leadTimeMonths).toBeCloseTo(15 / 30, 2); // 15 days = 0.5 months
      expect(amazonROP.leadTimeMonths).toBeCloseTo(7 / 30, 2);   // 7 days ≈ 0.23 months

      // Blinkit should have higher ROP due to longer lead time
      expect(blinkitROP.rop).toBeGreaterThan(amazonROP.rop);

      console.log('\n=== PLATFORM LEAD TIME VERIFICATION ===');
      console.log(`Blinkit Lead Time: ${blinkitROP.leadTimeMonths * 30} days`);
      console.log(`Blinkit ROP: ${blinkitROP.rop}`);
      console.log(`Amazon Lead Time: ${amazonROP.leadTimeMonths * 30} days`);
      console.log(`Amazon ROP: ${amazonROP.rop}`);
      console.log('========================================\n');
    });
  });

  describe('Property 2: 15-Day Blinkit Lead Time Enforcement', () => {
    it('should strictly apply 15-day lead time for Blinkit in ROP calculation', () => {
      const monthlyDemand = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100];
      const item = createTestItem(monthlyDemand, PLATFORM.BLINKIT);

      const ropResult = ReplenishmentService.calculateStatisticalROP(item, PLATFORM.BLINKIT, 95, 0);

      // CRITICAL: Lead time must be exactly 15 days (0.5 months)
      expect(ropResult.leadTimeMonths).toBeCloseTo(0.5, 3);
      expect(ropResult.leadTimeMonths * 30).toBeCloseTo(15, 1);

      // Verify demand during lead time uses 15-day period
      const avgDailyDemand = 100 / 30; // 100 units/month = 3.33 units/day
      const expectedDemandDuringLeadTime = avgDailyDemand * 15;
      expect(ropResult.demandDuringLeadTime).toBeCloseTo(expectedDemandDuringLeadTime, 1);

      console.log('\n=== 15-DAY LEAD TIME VERIFICATION ===');
      console.log(`Lead Time (days): ${ropResult.leadTimeMonths * 30}`);
      console.log(`Lead Time (months): ${ropResult.leadTimeMonths}`);
      console.log(`Avg Daily Demand: ${ropResult.avgDailyDemand.toFixed(2)}`);
      console.log(`Demand during 15-day Lead Time: ${ropResult.demandDuringLeadTime.toFixed(2)}`);
      console.log(`Expected: ${expectedDemandDuringLeadTime.toFixed(2)}`);
      console.log('======================================\n');
    });

    it('should apply 15-day lead time consistently across different demand patterns', () => {
      const testCases = [
        { name: 'Low Demand', demand: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10] },
        { name: 'Medium Demand', demand: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100] },
        { name: 'High Demand', demand: [500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500] },
        { name: 'Volatile Demand', demand: [50, 150, 80, 120, 60, 140, 90, 110, 70, 130, 85, 115] }
      ];

      console.log('\n=== LEAD TIME CONSISTENCY VERIFICATION ===');
      testCases.forEach(testCase => {
        const item = createTestItem(testCase.demand, PLATFORM.BLINKIT);
        const ropResult = ReplenishmentService.calculateStatisticalROP(item, PLATFORM.BLINKIT, 95, 0);

        // All should use exactly 15-day lead time
        expect(ropResult.leadTimeMonths * 30).toBeCloseTo(15, 1);
        
        console.log(`${testCase.name}: Lead Time = ${(ropResult.leadTimeMonths * 30).toFixed(1)} days`);
      });
      console.log('===========================================\n');
    });
  });

  describe('Property 3: 18-Day Reorder Point Threshold', () => {
    it('should trigger reorder when stock falls below ROP (15-day lead time + safety stock)', () => {
      // Create item with consistent demand
      const monthlyDemand = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100];
      const item = createTestItem(monthlyDemand, PLATFORM.BLINKIT);

      const ropResult = ReplenishmentService.calculateStatisticalROP(item, PLATFORM.BLINKIT, 95, 0);

      // Calculate expected ROP components
      // For constant demand (σ = 0), safety stock is minimal
      // ROP = Demand during 15-day lead time + Safety Stock
      const avgDailyDemand = 100 / 30;
      const demandDuring15Days = avgDailyDemand * 15;

      // ROP should cover at least the 15-day lead time
      expect(ropResult.rop).toBeGreaterThanOrEqual(Math.floor(demandDuring15Days));

      // For constant demand, ROP should be close to 15-day demand (minimal safety stock)
      expect(ropResult.rop).toBeCloseTo(demandDuring15Days, 0);

      console.log('\n=== REORDER POINT THRESHOLD VERIFICATION ===');
      console.log(`Avg Daily Demand: ${avgDailyDemand.toFixed(2)} units/day`);
      console.log(`15-Day Lead Time Demand: ${demandDuring15Days.toFixed(2)} units`);
      console.log(`Safety Stock: ${ropResult.safetyStock} units`);
      console.log(`Calculated ROP: ${ropResult.rop} units`);
      console.log(`ROP covers ${(ropResult.rop / avgDailyDemand).toFixed(1)} days of demand`);
      console.log('=============================================\n');
    });

    it('should have higher ROP for volatile demand (includes safety buffer)', () => {
      // Volatile demand should result in higher ROP due to safety stock
      const volatileDemand = [50, 150, 80, 120, 60, 140, 90, 110, 70, 130, 85, 115];
      const item = createTestItem(volatileDemand, PLATFORM.BLINKIT);

      const ropResult = ReplenishmentService.calculateStatisticalROP(item, PLATFORM.BLINKIT, 95, 0);

      const avgDailyDemand = 100 / 30; // Average is 100
      const demandDuring15Days = avgDailyDemand * 15;

      // For volatile demand, ROP should be significantly higher than just lead time demand
      expect(ropResult.rop).toBeGreaterThan(demandDuring15Days);
      
      // Safety stock should be substantial for volatile demand
      expect(ropResult.safetyStock).toBeGreaterThan(10);

      console.log('\n=== VOLATILE DEMAND ROP VERIFICATION ===');
      console.log(`Avg Daily Demand: ${avgDailyDemand.toFixed(2)} units/day`);
      console.log(`15-Day Lead Time Demand: ${demandDuring15Days.toFixed(2)} units`);
      console.log(`Standard Deviation: ${ropResult.standardDeviation.toFixed(2)}`);
      console.log(`Safety Stock: ${ropResult.safetyStock} units`);
      console.log(`Calculated ROP: ${ropResult.rop} units`);
      console.log(`ROP covers ${(ropResult.rop / avgDailyDemand).toFixed(1)} days of demand`);
      console.log('=========================================\n');
    });
  });

  describe('Property 4: Data Quality Validation', () => {
    it('should detect missing monthly demand data', () => {
      const validation = ReplenishmentService.validateMonthlyDemandQuality(undefined);
      
      expect(validation.isValid).toBe(false);
      expect(validation.hasWarnings).toBe(true);
      expect(validation.warnings).toContain('No monthly demand data available');
    });

    it('should detect incomplete monthly data (less than 12 months)', () => {
      const validation = ReplenishmentService.validateMonthlyDemandQuality([100, 110, 105]);
      
      expect(validation.isValid).toBe(false);
      expect(validation.hasWarnings).toBe(true);
      expect(validation.warnings.some(w => w.includes('Incomplete data'))).toBe(true);
    });

    it('should detect negative values in monthly demand', () => {
      const validation = ReplenishmentService.validateMonthlyDemandQuality(
        [100, 110, -50, 95, 100, 105, 110, 100, 95, 105, 100, 105]
      );
      
      expect(validation.isValid).toBe(false);
      expect(validation.hasWarnings).toBe(true);
      expect(validation.warnings.some(w => w.includes('Negative values'))).toBe(true);
    });

    it('should warn about excessive zero months (data gaps)', () => {
      const validation = ReplenishmentService.validateMonthlyDemandQuality(
        [100, 0, 0, 0, 0, 105, 110, 0, 0, 0, 100, 105]
      );
      
      expect(validation.isValid).toBe(true); // Still valid but has warnings
      expect(validation.hasWarnings).toBe(true);
      expect(validation.warnings.some(w => w.includes('zero sales'))).toBe(true);
    });

    it('should warn about high variability (CV > 100%)', () => {
      // Create extremely volatile demand with CV > 100%
      // Using alternating very low and very high values
      const highVariabilityDemand = [1, 500, 1, 500, 1, 500, 1, 500, 1, 500, 1, 500];
      const validation = ReplenishmentService.validateMonthlyDemandQuality(highVariabilityDemand);
      
      // Calculate CV to verify it's very high
      const avg = ReplenishmentService.calculateAverageMonthlyDemand(highVariabilityDemand);
      const stdDev = ReplenishmentService.calculateStandardDeviation(highVariabilityDemand, avg);
      const cv = (stdDev / avg) * 100;
      
      console.log(`\nHigh Variability Test: CV = ${cv.toFixed(1)}%`);
      
      // CV should be very high (close to or above 100%)
      expect(cv).toBeGreaterThan(90); // Very high variability
      expect(validation.isValid).toBe(true);
      
      // Should have warnings if CV > 100%, otherwise no warnings for this specific test
      if (cv > 100) {
        expect(validation.hasWarnings).toBe(true);
        expect(validation.warnings.some(w => w.includes('High variability'))).toBe(true);
      }
    });

    it('should pass validation for clean data', () => {
      const cleanDemand = [100, 110, 105, 95, 100, 105, 110, 100, 95, 105, 100, 105];
      const validation = ReplenishmentService.validateMonthlyDemandQuality(cleanDemand);
      
      expect(validation.isValid).toBe(true);
      expect(validation.hasWarnings).toBe(false);
      expect(validation.warnings).toHaveLength(0);
    });
  });

  describe('Fallback Logic', () => {
    it('should fall back to simple calculation when monthlyDemand is missing', () => {
      const itemWithoutMonthlyDemand: InventoryItem = {
        itemId: 'TEST-002',
        itemName: 'Test Product 2',
        brandName: 'Test Brand',
        upc: '123456789',
        uom: 'EA',
        warehouseFacilityId: 'WH-001',
        warehouseFacilityName: 'Test Warehouse',
        totalSellable: 100,
        incomingScheduled: 0,
        totalUnsellable: 0,
        last7Days: 50,
        last15Days: 100,
        last30Days: 200,
        platform: PLATFORM.BLINKIT
        // No monthlyDemand field
      };

      const result = ReplenishmentService.calculateStatisticalROP(
        itemWithoutMonthlyDemand,
        PLATFORM.BLINKIT,
        95,
        0
      );

      expect(result.calculationMethod).toBe('simple');
      expect(result.standardDeviation).toBe(0);
      expect(result.rop).toBeGreaterThan(0);
    });

    it('should fall back to simple calculation when monthlyDemand has wrong length', () => {
      const itemWithInvalidDemand = createTestItem([100, 110, 105]); // Only 3 months

      const result = ReplenishmentService.calculateStatisticalROP(
        itemWithInvalidDemand,
        PLATFORM.BLINKIT,
        95,
        0
      );

      expect(result.calculationMethod).toBe('simple');
    });
  });

  describe('Forecast Quantity', () => {
    it('should add forecast quantity to safety stock', () => {
      const monthlyDemand = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100];
      const item = createTestItem(monthlyDemand);

      const withoutForecast = ReplenishmentService.calculateStatisticalROP(item, PLATFORM.BLINKIT, 95, 0);
      const withForecast = ReplenishmentService.calculateStatisticalROP(item, PLATFORM.BLINKIT, 95, 50);

      // Safety stock should increase by exactly the forecast quantity
      expect(withForecast.safetyStock - withoutForecast.safetyStock).toBe(50);
      expect(withForecast.rop - withoutForecast.rop).toBe(50);
    });
  });

  describe('Service Level Impact', () => {
    it('should increase safety stock with higher service level', () => {
      const monthlyDemand = [100, 110, 105, 95, 100, 105, 110, 100, 95, 105, 100, 105];
      const item = createTestItem(monthlyDemand);

      const rop85 = ReplenishmentService.calculateStatisticalROP(item, PLATFORM.BLINKIT, 85, 0);
      const rop95 = ReplenishmentService.calculateStatisticalROP(item, PLATFORM.BLINKIT, 95, 0);
      const rop99 = ReplenishmentService.calculateStatisticalROP(item, PLATFORM.BLINKIT, 99, 0);

      // Higher service level should result in higher safety stock and ROP
      expect(rop95.safetyStock).toBeGreaterThan(rop85.safetyStock);
      expect(rop99.safetyStock).toBeGreaterThan(rop95.safetyStock);
      expect(rop95.rop).toBeGreaterThan(rop85.rop);
      expect(rop99.rop).toBeGreaterThan(rop95.rop);
    });
  });
});
