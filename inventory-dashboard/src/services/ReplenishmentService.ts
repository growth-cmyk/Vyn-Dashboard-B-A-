import type {
  InventoryItem,
  StockAnalysis,
  ReplenishmentRecommendation,
  Platform,
  StatisticalROPResult
} from '../types';
import { PLATFORM, Z_TABLE, DEFAULT_SERVICE_LEVEL, DEFAULT_Z_SCORE } from '../types';
import { PlatformContextService } from './PlatformContextService';
import { AnalyticsService } from './AnalyticsService';
import { DataService } from './DataService';

/**
 * Service for platform-aware replenishment calculations
 * Handles different lead times and business rules for Blinkit vs Amazon
 * NOW INCLUDES: Statistical ROP Model with standard deviation and service levels
 */
export class ReplenishmentService {
  /**
   * Calculate recommended reorder quantity with platform-specific lead times
   * Formula: (Lead Time * Sales Velocity) + Safety Stock - Current Stock
   * 
   * @param item - Inventory item
   * @param salesVelocity - Daily sales velocity
   * @param platform - Platform to use for lead time calculation
   * @param safetyDays - Safety stock in days (default 3)
   * @returns Recommended reorder quantity
   */
  static calculateReorderQuantity(
    item: InventoryItem, 
    salesVelocity: number, 
    platform: Platform,
    safetyDays: number = 3
  ): number {
    if (salesVelocity <= 0) {
      return 0; // No reorder needed if no sales velocity
    }

    const leadTime = this.getPlatformLeadTime(platform);
    const safetyStock = safetyDays * salesVelocity;
    const reorderQuantity = (leadTime * salesVelocity) + safetyStock - item.totalSellable;
    
    // Return 0 if calculated quantity is negative (already have enough stock)
    return Math.max(0, Math.ceil(reorderQuantity));
  }

  /**
   * Get platform-specific lead time
   * Blinkit: 15 days (Vyndo warehouse to Blinkit darkstores)
   * Amazon: 7 days (Standard Amazon fulfillment)
   * 
   * @param platform - Platform to get lead time for
   * @returns Lead time in days
   */
  static getPlatformLeadTime(platform: Platform): number {
    return PlatformContextService.getPlatformLeadTime(platform);
  }

  /**
   * Get platform-specific safety stock days
   * Currently uniform across platforms but can be customized
   * 
   * @param platform - Platform to get safety stock for
   * @returns Safety stock days
   */
  static getPlatformSafetyStock(platform: Platform, salesVelocity: number): number {
    const safetyDays = PlatformContextService.getPlatformSafetyStockDays(platform);
    return safetyDays * salesVelocity;
  }

  /**
   * Perform platform-aware stock analysis
   * Uses platform-specific lead times for calculations
   * 
   * @param inventory - Inventory item to analyze
   * @param platform - Platform context for calculations
   * @param safetyDays - Safety stock in days (default 3)
   * @returns Complete stock analysis with platform-specific recommendations
   */
  static analyzeStockForPlatform(
    inventory: InventoryItem, 
    platform: Platform,
    safetyDays: number = 3
  ): StockAnalysis {
    const leadTime = this.getPlatformLeadTime(platform);
    
    // Use existing AnalyticsService logic but with platform-specific lead time
    return AnalyticsService.analyzeStock(inventory, leadTime, safetyDays);
  }

  /**
   * Generate platform-specific replenishment recommendations
   * Filters and calculates recommendations based on platform context
   * 
   * @param inventory - Array of inventory items
   * @param platform - Platform to generate recommendations for
   * @returns Array of replenishment recommendations sorted by urgency
   */
  static generatePlatformRecommendations(
    inventory: InventoryItem[], 
    platform: Platform
  ): ReplenishmentRecommendation[] {
    // Filter inventory by platform if not 'All'
    const platformInventory = PlatformContextService.filterDataByPlatform(inventory, platform);
    
    // Analyze each item with platform-specific parameters
    const analyses = platformInventory.map(item => 
      this.analyzeStockForPlatform(item, item.platform || platform)
    );

    // Generate recommendations using existing logic
    return AnalyticsService.generateReplenishmentRecommendations(platformInventory, analyses);
  }

  /**
   * Calculate total replenishment value for a platform
   * Estimates the total cost of recommended replenishments
   * 
   * @param recommendations - Array of replenishment recommendations
   * @param averageUnitCost - Average cost per unit (default $50)
   * @returns Total estimated replenishment cost
   */
  static calculateReplenishmentValue(
    recommendations: ReplenishmentRecommendation[],
    averageUnitCost: number = 50
  ): number {
    return recommendations.reduce((total, rec) => {
      return total + (rec.recommendedOrderQuantity * averageUnitCost);
    }, 0);
  }

  /**
   * Get replenishment summary by platform
   * Provides overview of replenishment needs across platforms
   * 
   * @param inventory - Array of inventory items
   * @returns Summary of replenishment needs by platform
   */
  static getReplenishmentSummary(inventory: InventoryItem[]): {
    [key in Platform]?: {
      totalItems: number;
      understockItems: number;
      totalRecommendedQuantity: number;
      estimatedValue: number;
      averageLeadTime: number;
    };
  } {
    const summary: any = {};
    const platforms = [PLATFORM.BLINKIT, PLATFORM.AMAZON];

    platforms.forEach(platform => {
      const platformInventory = PlatformContextService.filterDataByPlatform(inventory, platform);
      
      if (platformInventory.length === 0) {
        return; // Skip platforms with no data
      }

      const recommendations = this.generatePlatformRecommendations(platformInventory, platform);
      const understockItems = recommendations.length;
      const totalRecommendedQuantity = recommendations.reduce((sum, rec) => sum + rec.recommendedOrderQuantity, 0);
      const estimatedValue = this.calculateReplenishmentValue(recommendations);
      const averageLeadTime = this.getPlatformLeadTime(platform);

      summary[platform] = {
        totalItems: platformInventory.length,
        understockItems,
        totalRecommendedQuantity,
        estimatedValue,
        averageLeadTime
      };
    });

    return summary;
  }

  /**
   * Compare replenishment efficiency across platforms
   * Analyzes which platform has better inventory management
   * 
   * @param inventory - Array of inventory items
   * @returns Comparison metrics between platforms
   */
  static compareReplenishmentEfficiency(inventory: InventoryItem[]): {
    blinkit: { stockoutRate: number; overstockRate: number; averageDaysOfCover: number };
    amazon: { stockoutRate: number; overstockRate: number; averageDaysOfCover: number };
    comparison: {
      betterStockoutManagement: Platform;
      betterOverstockManagement: Platform;
      moreEfficientInventory: Platform;
    };
  } {
    const blinkitInventory = PlatformContextService.filterDataByPlatform(inventory, PLATFORM.BLINKIT);
    const amazonInventory = PlatformContextService.filterDataByPlatform(inventory, PLATFORM.AMAZON);

    const calculateMetrics = (items: InventoryItem[], platform: Platform) => {
      if (items.length === 0) {
        return { stockoutRate: 0, overstockRate: 0, averageDaysOfCover: 0 };
      }

      const analyses = items.map(item => this.analyzeStockForPlatform(item, platform));
      const stockouts = analyses.filter(a => a.stockStatus === 'out-of-stock' || a.stockStatus === 'understock').length;
      const overstocks = analyses.filter(a => a.stockStatus === 'overstock' || a.stockStatus === 'expiry-risk').length;
      const totalDaysOfCover = analyses.reduce((sum, a) => sum + (isFinite(a.daysOfCover) ? a.daysOfCover : 0), 0);

      return {
        stockoutRate: (stockouts / items.length) * 100,
        overstockRate: (overstocks / items.length) * 100,
        averageDaysOfCover: totalDaysOfCover / items.length
      };
    };

    const blinkitMetrics = calculateMetrics(blinkitInventory, PLATFORM.BLINKIT);
    const amazonMetrics = calculateMetrics(amazonInventory, PLATFORM.AMAZON);

    return {
      blinkit: blinkitMetrics,
      amazon: amazonMetrics,
      comparison: {
        betterStockoutManagement: blinkitMetrics.stockoutRate < amazonMetrics.stockoutRate ? PLATFORM.BLINKIT : PLATFORM.AMAZON,
        betterOverstockManagement: blinkitMetrics.overstockRate < amazonMetrics.overstockRate ? PLATFORM.BLINKIT : PLATFORM.AMAZON,
        moreEfficientInventory: Math.abs(blinkitMetrics.averageDaysOfCover - 30) < Math.abs(amazonMetrics.averageDaysOfCover - 30) ? PLATFORM.BLINKIT : PLATFORM.AMAZON
      }
    };
  }

  /**
   * Get platform configuration summary
   * Returns the business rules for each platform
   * 
   * @returns Platform configuration details
   */
  static getPlatformConfiguration(): {
    [key in Platform]: {
      leadTime: number;
      safetyStockDays: number;
      reorderThreshold: number;
      displayName: string;
    };
  } {
    return {
      [PLATFORM.BLINKIT]: {
        leadTime: this.getPlatformLeadTime(PLATFORM.BLINKIT),
        safetyStockDays: PlatformContextService.getPlatformSafetyStockDays(PLATFORM.BLINKIT),
        reorderThreshold: this.getPlatformLeadTime(PLATFORM.BLINKIT) + PlatformContextService.getPlatformSafetyStockDays(PLATFORM.BLINKIT),
        displayName: PlatformContextService.getPlatformDisplayName(PLATFORM.BLINKIT)
      },
      [PLATFORM.AMAZON]: {
        leadTime: this.getPlatformLeadTime(PLATFORM.AMAZON),
        safetyStockDays: PlatformContextService.getPlatformSafetyStockDays(PLATFORM.AMAZON),
        reorderThreshold: this.getPlatformLeadTime(PLATFORM.AMAZON) + PlatformContextService.getPlatformSafetyStockDays(PLATFORM.AMAZON),
        displayName: PlatformContextService.getPlatformDisplayName(PLATFORM.AMAZON)
      },
      [PLATFORM.ALL]: {
        leadTime: 0, // Variable based on item platform
        safetyStockDays: 3, // Standard across platforms
        reorderThreshold: 0, // Variable based on item platform
        displayName: PlatformContextService.getPlatformDisplayName(PLATFORM.ALL)
      }
    };
  }

  /**
   * Validate replenishment recommendation
   * Ensures recommendation makes business sense
   * 
   * @param recommendation - Replenishment recommendation to validate
   * @param platform - Platform context
   * @returns Validation result with any warnings
   */
  static validateRecommendation(
    recommendation: ReplenishmentRecommendation,
    platform: Platform
  ): {
    isValid: boolean;
    warnings: string[];
    adjustedQuantity?: number;
  } {
    const warnings: string[] = [];
    let adjustedQuantity: number | undefined;

    // Check for unreasonably large orders
    const maxReasonableOrder = recommendation.salesVelocity * 180; // 6 months of sales
    if (recommendation.recommendedOrderQuantity > maxReasonableOrder) {
      warnings.push(`Recommended quantity (${recommendation.recommendedOrderQuantity}) exceeds 6 months of sales`);
      adjustedQuantity = Math.ceil(maxReasonableOrder);
    }

    // Check for very small orders that might not be cost-effective
    const minOrderQuantity = Math.ceil(recommendation.salesVelocity * 7); // 1 week minimum
    if (recommendation.recommendedOrderQuantity < minOrderQuantity && recommendation.recommendedOrderQuantity > 0) {
      warnings.push(`Recommended quantity (${recommendation.recommendedOrderQuantity}) is very small, consider minimum order of ${minOrderQuantity}`);
      adjustedQuantity = minOrderQuantity;
    }

    // Platform-specific validations
    if (platform === PLATFORM.AMAZON) {
      // Amazon might have minimum order quantities or packaging requirements
      if (recommendation.recommendedOrderQuantity > 0 && recommendation.recommendedOrderQuantity < 10) {
        warnings.push('Amazon orders typically have minimum quantities of 10 units');
        adjustedQuantity = 10;
      }
    }

    return {
      isValid: warnings.length === 0,
      warnings,
      adjustedQuantity
    };
  }

  // ============================================================================
  // Statistical ROP Model - Core Calculation Methods
  // ============================================================================

  /**
   * Calculate Statistical Reorder Point (ROP) using standard deviation and service level
   * 
   * Formula:
   * - Safety Stock = σ × √(Lead Time in Months) × Z + Forecast Qty
   * - ROP = (Avg Daily Demand × Lead Time in Days) + Safety Stock
   * 
   * ENHANCED: Fetches demand from DataService demand map (built from Sales CSV)
   * 
   * @param item - Inventory item with Item ID for demand lookup
   * @param platform - Platform for lead time lookup (Blinkit: 15 days, Amazon: 7 days)
   * @param serviceLevel - Target service level percentage (85-99.8%)
   * @param forecastQty - Expected demand spike (e.g., festival season)
   * @returns Complete ROP calculation result with all components
   */
  static calculateStatisticalROP(
    item: InventoryItem,
    platform: Platform,
    serviceLevel: number = DEFAULT_SERVICE_LEVEL,
    forecastQty: number = 0
  ): StatisticalROPResult {
    // Validate and sanitize inputs
    const sanitizedForecast = Math.max(0, forecastQty || 0);
    
    // CRITICAL: Fetch demand from DataService demand map (built from Sales CSV)
    // This replaces the need for monthlyDemand in the Inventory file
    const demandMap = DataService.getDemandMap();
    let monthlyDemand = demandMap.get(item.itemId);
    
    // Fallback: If not in demand map, check if item has monthlyDemand property (for backward compatibility)
    if (!monthlyDemand && item.monthlyDemand) {
      monthlyDemand = item.monthlyDemand;
    }
    
    // Check if demand data is available from Sales file or item property
    if (!this.validateMonthlyDemand(monthlyDemand)) {
      // Fall back to simple ROP calculation using inventory file data
      return this.calculateSimpleROP(item, platform, sanitizedForecast);
    }

    // Step 1: Calculate average monthly demand
    const avgMonthlyDemand = this.calculateAverageMonthlyDemand(monthlyDemand!);
    const avgDailyDemand = avgMonthlyDemand / 30;

    // Step 2: Calculate standard deviation (σ)
    const standardDeviation = this.calculateStandardDeviation(monthlyDemand!, avgMonthlyDemand);

    // Step 3: Get Z-score for service level
    const zScore = this.getZScore(serviceLevel);

    // Step 4: Get platform-specific lead time (CRITICAL: 15 days Blinkit, 7 days Amazon)
    const leadTimeDays = this.getPlatformLeadTime(platform);
    const leadTimeMonths = leadTimeDays / 30;

    // Step 5: Calculate safety stock using statistical formula
    // Formula: σ × √(Lead Time in Months) × Z + Forecast Qty
    const safetyStock = this.calculateSafetyStock(
      standardDeviation,
      leadTimeMonths,
      zScore,
      sanitizedForecast
    );

    // Step 6: Calculate demand during lead time
    const demandDuringLeadTime = avgDailyDemand * leadTimeDays;

    // Step 7: Calculate ROP
    // Formula: (Avg Daily Demand × Lead Time in Days) + Safety Stock
    const rop = demandDuringLeadTime + safetyStock;

    console.log(`📊 Statistical ROP for ${item.itemName} (${item.itemId}):`, {
      monthlyDemand,
      avgMonthlyDemand: avgMonthlyDemand.toFixed(2),
      avgDailyDemand: avgDailyDemand.toFixed(2),
      standardDeviation: standardDeviation.toFixed(2),
      serviceLevel,
      zScore,
      leadTimeDays,
      safetyStock: Math.ceil(safetyStock),
      rop: Math.ceil(rop),
      source: 'Sales File'
    });

    return {
      rop: Math.ceil(rop),
      safetyStock: Math.ceil(safetyStock),
      avgMonthlyDemand,
      avgDailyDemand,
      standardDeviation,
      serviceLevel,
      zScore,
      leadTimeMonths,
      forecastQty: sanitizedForecast,
      demandDuringLeadTime,
      calculationMethod: 'statistical'
    };
  }

  /**
   * Validate monthly demand data with detailed quality checks
   * 
   * Checks for:
   * - Missing or undefined data
   * - Incorrect array length (must be 12 months)
   * - Negative values
   * - Non-numeric values
   * - Infinite values
   * - Missing months (zero values that might indicate data gaps)
   * 
   * @param monthlyDemand - Array of monthly demand values
   * @returns Object with validation result and warnings
   */
  static validateMonthlyDemand(monthlyDemand: number[] | undefined): boolean {
    if (!monthlyDemand) return false;
    if (!Array.isArray(monthlyDemand)) return false;
    if (monthlyDemand.length !== 12) return false;
    if (monthlyDemand.some(val => typeof val !== 'number' || val < 0 || !isFinite(val))) return false;
    return true;
  }

  /**
   * Detailed data quality validation for monthly demand
   * Returns validation result with specific warnings
   * 
   * @param monthlyDemand - Array of monthly demand values
   * @returns Validation result with warnings array
   */
  static validateMonthlyDemandQuality(monthlyDemand: number[] | undefined): {
    isValid: boolean;
    hasWarnings: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Basic validation
    if (!monthlyDemand) {
      return { isValid: false, hasWarnings: true, warnings: ['No monthly demand data available'] };
    }

    if (!Array.isArray(monthlyDemand)) {
      return { isValid: false, hasWarnings: true, warnings: ['Monthly demand is not an array'] };
    }

    if (monthlyDemand.length !== 12) {
      warnings.push(`Incomplete data: ${monthlyDemand.length} months instead of 12`);
      return { isValid: false, hasWarnings: true, warnings };
    }

    // Check for negative values
    const negativeMonths = monthlyDemand
      .map((val, idx) => ({ val, idx }))
      .filter(({ val }) => val < 0);
    
    if (negativeMonths.length > 0) {
      warnings.push(`Negative values found in ${negativeMonths.length} month(s)`);
      return { isValid: false, hasWarnings: true, warnings };
    }

    // Check for non-numeric or infinite values
    const invalidValues = monthlyDemand
      .map((val, idx) => ({ val, idx }))
      .filter(({ val }) => typeof val !== 'number' || !isFinite(val));
    
    if (invalidValues.length > 0) {
      warnings.push(`Invalid values found in ${invalidValues.length} month(s)`);
      return { isValid: false, hasWarnings: true, warnings };
    }

    // Check for missing months (zero values that might indicate data gaps)
    const zeroMonths = monthlyDemand.filter(val => val === 0).length;
    if (zeroMonths > 3) {
      warnings.push(`${zeroMonths} months with zero sales (possible data gaps)`);
    }

    // Check for extreme variability (coefficient of variation > 100%)
    const avg = this.calculateAverageMonthlyDemand(monthlyDemand);
    if (avg > 0) {
      const stdDev = this.calculateStandardDeviation(monthlyDemand, avg);
      const coefficientOfVariation = (stdDev / avg) * 100;
      
      if (coefficientOfVariation > 100) {
        warnings.push(`High variability detected (CV: ${coefficientOfVariation.toFixed(0)}%)`);
      }
    }

    return {
      isValid: true,
      hasWarnings: warnings.length > 0,
      warnings
    };
  }

  /**
   * Calculate average monthly demand from 12-month history
   * 
   * @param monthlyDemand - Array of 12 monthly demand values
   * @returns Average monthly demand
   */
  static calculateAverageMonthlyDemand(monthlyDemand: number[]): number {
    const sum = monthlyDemand.reduce((acc, val) => acc + val, 0);
    return sum / monthlyDemand.length;
  }

  /**
   * Calculate standard deviation of monthly demand
   * 
   * Formula: σ = sqrt(sum((x - mean)²) / n)
   * 
   * @param monthlyDemand - Array of 12 monthly demand values
   * @param mean - Average monthly demand
   * @returns Standard deviation (σ)
   */
  static calculateStandardDeviation(monthlyDemand: number[], mean: number): number {
    // Handle edge case: all values are the same (zero variance)
    const allSame = monthlyDemand.every(val => val === monthlyDemand[0]);
    if (allSame) return 0;

    // Calculate variance: sum of squared differences from mean
    const squaredDifferences = monthlyDemand.map(x => Math.pow(x - mean, 2));
    const variance = squaredDifferences.reduce((acc, val) => acc + val, 0) / monthlyDemand.length;
    
    // Standard deviation is square root of variance
    return Math.sqrt(variance);
  }

  /**
   * Calculate safety stock using statistical formula
   * 
   * Formula: σ × √(Lead Time in Months) × Z + Forecast Qty
   * 
   * Where:
   * - σ = Standard deviation of monthly demand
   * - Lead Time in Months = Lead Time in Days / 30
   * - Z = Z-score for desired service level
   * - Forecast Qty = User-provided expected demand spike
   * 
   * @param standardDeviation - Standard deviation (σ) of monthly demand
   * @param leadTimeMonths - Lead time converted to months
   * @param zScore - Z-score for service level
   * @param forecastQty - Expected demand spike
   * @returns Calculated safety stock
   */
  static calculateSafetyStock(
    standardDeviation: number,
    leadTimeMonths: number,
    zScore: number,
    forecastQty: number
  ): number {
    // Statistical component: σ × √(Lead Time in Months) × Z
    const statisticalSafetyStock = standardDeviation * Math.sqrt(leadTimeMonths) * zScore;
    
    // Total safety stock includes forecast quantity
    return statisticalSafetyStock + forecastQty;
  }

  /**
   * Get Z-score for service level from Z_TABLE
   * 
   * @param serviceLevel - Target service level percentage
   * @returns Z-score (defaults to 1.64 for 95% if not found)
   */
  static getZScore(serviceLevel: number): number {
    return Z_TABLE[serviceLevel] || DEFAULT_Z_SCORE;
  }

  /**
   * Fallback to simple ROP calculation when monthlyDemand not available
   * Uses existing last30Days data as proxy for demand
   * 
   * @param item - Inventory item
   * @param platform - Platform for lead time lookup
   * @param forecastQty - Expected demand spike
   * @returns StatisticalROPResult with simple calculation method
   */
  private static calculateSimpleROP(
    item: InventoryItem,
    platform: Platform,
    forecastQty: number
  ): StatisticalROPResult {
    // Use last30Days as proxy for monthly demand
    const avgDailyDemand = item.last30Days / 30;
    const avgMonthlyDemand = item.last30Days;
    
    // Get platform-specific lead time
    const leadTimeDays = this.getPlatformLeadTime(platform);
    const leadTimeMonths = leadTimeDays / 30;
    
    // Simple safety stock: 3 days of demand + forecast
    const simpleSafetyStock = (3 * avgDailyDemand) + forecastQty;
    
    // Demand during lead time
    const demandDuringLeadTime = avgDailyDemand * leadTimeDays;
    
    // ROP = Demand during lead time + Safety stock
    const rop = demandDuringLeadTime + simpleSafetyStock;

    return {
      rop: Math.ceil(rop),
      safetyStock: Math.ceil(simpleSafetyStock),
      avgMonthlyDemand,
      avgDailyDemand,
      standardDeviation: 0, // Not calculated in simple method
      serviceLevel: DEFAULT_SERVICE_LEVEL,
      zScore: DEFAULT_Z_SCORE,
      leadTimeMonths,
      forecastQty,
      demandDuringLeadTime,
      calculationMethod: 'simple'
    };
  }
}
