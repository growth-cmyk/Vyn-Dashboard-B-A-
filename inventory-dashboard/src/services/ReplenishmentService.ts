import type {
  InventoryItem,
  StockAnalysis,
  ReplenishmentRecommendation,
  Platform
} from '../types';
import { PLATFORM } from '../types';
import { PlatformContextService } from './PlatformContextService';
import { AnalyticsService } from './AnalyticsService';

/**
 * Service for platform-aware replenishment calculations
 * Handles different lead times and business rules for Blinkit vs Amazon
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
}