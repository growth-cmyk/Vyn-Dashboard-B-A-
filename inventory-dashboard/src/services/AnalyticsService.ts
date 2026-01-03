import type {
  InventoryItem,
  SalesRecord,
  StockAnalysis,
  StockStatus,
  TimePeriod,
  SalesAggregation,
  StockIssueReport,
  ReplenishmentRecommendation
} from '../types';
import { STOCK_STATUS, TIME_PERIOD } from '../types';

/**
 * Service for performing analytics calculations on inventory and sales data
 */
export class AnalyticsService {
  /**
   * Calculate days of cover for an inventory item based on sales velocity
   * Days of cover = Current sellable inventory / Daily sales velocity
   * 
   * @param inventory - The inventory item
   * @param salesVelocity - Daily sales velocity (units per day)
   * @returns Number of days the current inventory will last
   */
  static calculateDaysOfCover(inventory: InventoryItem, salesVelocity: number): number {
    // If no sales velocity (zero or negative), return Infinity for adequate stock
    if (salesVelocity <= 0) {
      return inventory.totalSellable > 0 ? Infinity : 0;
    }

    // If no sellable inventory, return 0
    if (inventory.totalSellable <= 0) {
      return 0;
    }

    // Calculate days of cover
    return inventory.totalSellable / salesVelocity;
  }

  /**
   * Classify stock status based on days of cover using Strategic Roadmap with Vyndo's 15-day supply chain
   * - Out of stock: ≤0 days
   * - Understock: 1-17 days (Trigger 'Restock Now' - Lead Time + Safety)
   * - Healthy: 18-45 days (Green status)
   * - Overstock: 46-90 days (Amber status - 'Freeze POs')
   * - Expiry Risk: 91-150 days (Red status - 'Trigger Flash Promo')
   * - Critical Expiry: >150 days (Critical Red - 6-month shelf life exceeded)
   * 
   * @param daysOfCover - Number of days of inventory cover
   * @returns Stock status classification
   */
  static classifyStockStatusStrategic(daysOfCover: number): StockStatus {
    if (daysOfCover <= 0) {
      return STOCK_STATUS.OUT_OF_STOCK;
    } else if (daysOfCover < 18) { // Lead Time (15) + Safety (3) = 18 days
      return STOCK_STATUS.UNDERSTOCK;
    } else if (daysOfCover <= 45) {
      return STOCK_STATUS.HEALTHY;
    } else if (daysOfCover <= 90) {
      return STOCK_STATUS.OVERSTOCK;
    } else {
      return STOCK_STATUS.EXPIRY_RISK; // Includes both 91-150 and >150 days
    }
  }

  /**
   * Calculate recommended reorder quantity for replenishment
   * Formula: (Lead Time * Sales Velocity) + Safety Stock - Current Stock
   * 
   * @param item - Inventory item
   * @param salesVelocity - Daily sales velocity
   * @param leadTime - Lead time in days (default 15 - Vyndo warehouse to Blinkit darkstores)
   * @param safetyDays - Safety stock in days (default 3)
   * @returns Recommended reorder quantity
   */
  static calculateReplenishmentQuantity(
    item: InventoryItem, 
    salesVelocity: number, 
    leadTime: number = 15, // Updated default to match Vyndo supply chain
    safetyDays: number = 3
  ): number {
    if (salesVelocity <= 0) {
      return 0; // No reorder needed if no sales velocity
    }

    const safetyStock = safetyDays * salesVelocity;
    const reorderQuantity = (leadTime * salesVelocity) + safetyStock - item.totalSellable;
    
    // Return 0 if calculated quantity is negative (already have enough stock)
    return Math.max(0, Math.ceil(reorderQuantity));
  }

  /**
   * Aggregate sales data by time period
   * 
   * @param sales - Array of sales records
   * @param period - Time period to aggregate by
   * @returns Aggregated sales data for the specified period
   */
  static aggregateSalesByPeriod(sales: SalesRecord[], period: TimePeriod): SalesAggregation {
    const filteredSales = this.filterSalesByTimePeriod(sales, period);
    
    if (filteredSales.length === 0) {
      return {
        period,
        totalQuantity: 0,
        totalRevenue: 0,
        itemCount: 0,
        locationCount: 0,
        averagePrice: 0
      };
    }

    const totalQuantity = filteredSales.reduce((sum, record) => sum + record.quantity, 0);
    const totalRevenue = filteredSales.reduce((sum, record) => sum + (record.quantity * record.sellingPrice), 0);
    
    // Count unique items and locations
    const uniqueItems = new Set(filteredSales.map(record => record.itemId));
    const uniqueLocations = new Set(filteredSales.map(record => `${record.supplyCity}-${record.supplyState}`));
    
    const averagePrice = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;

    return {
      period,
      totalQuantity,
      totalRevenue,
      itemCount: uniqueItems.size,
      locationCount: uniqueLocations.size,
      averagePrice
    };
  }

  /**
   * Calculate percentage change between two values
   * Formula: ((current - previous) / previous) * 100
   * 
   * @param currentValue - Current period value
   * @param previousValue - Previous period value
   * @returns Percentage change (positive for increase, negative for decrease)
   */
  static calculatePercentageChange(currentValue: number, previousValue: number): number {
    // Handle edge cases
    if (previousValue === 0) {
      return currentValue > 0 ? 100 : 0;
    }

    if (currentValue === 0 && previousValue === 0) {
      return 0;
    }

    return ((currentValue - previousValue) / previousValue) * 100;
  }

  /**
   * Calculate daily sales velocity from inventory item's historical data
   * Uses the most recent period available (7 days preferred, then 15, then 30)
   * 
   * @param inventory - Inventory item with sales history
   * @returns Daily sales velocity (units per day)
   */
  static calculateSalesVelocity(inventory: InventoryItem): number {
    // Prefer 7-day data for most recent velocity
    if (inventory.last7Days > 0) {
      return inventory.last7Days / 7;
    }
    
    // Fall back to 15-day data
    if (inventory.last15Days > 0) {
      return inventory.last15Days / 15;
    }
    
    // Fall back to 30-day data
    if (inventory.last30Days > 0) {
      return inventory.last30Days / 30;
    }
    
    // No sales history available
    return 0;
  }

  /**
   * Perform complete stock analysis for an inventory item (Updated for Strategic Roadmap)
   * 
   * @param inventory - Inventory item to analyze
   * @param leadTime - Lead time in days (default 15 - Vyndo warehouse to Blinkit darkstores)
   * @param safetyDays - Safety stock in days (default 3)
   * @returns Complete stock analysis with recommendations
   */
  static analyzeStock(inventory: InventoryItem, leadTime: number = 15, safetyDays: number = 3): StockAnalysis {
    const salesVelocity = this.calculateSalesVelocity(inventory);
    const daysOfCover = this.calculateDaysOfCover(inventory, salesVelocity);
    const stockStatus = this.classifyStockStatusStrategic(daysOfCover);
    const safetyStock = safetyDays * salesVelocity;
    
    let recommendedAction = '';
    let reorderQuantity: number | undefined;
    
    switch (stockStatus) {
      case STOCK_STATUS.OUT_OF_STOCK:
        recommendedAction = 'Urgent: Restock immediately to avoid lost sales';
        reorderQuantity = this.calculateReplenishmentQuantity(inventory, salesVelocity, leadTime, safetyDays);
        break;
      case STOCK_STATUS.UNDERSTOCK:
        recommendedAction = 'Restock Now - Below 14-day threshold';
        reorderQuantity = this.calculateReplenishmentQuantity(inventory, salesVelocity, leadTime, safetyDays);
        break;
      case STOCK_STATUS.HEALTHY:
        recommendedAction = 'Stable - Monitor regularly and reorder when approaching reorder point';
        break;
      case STOCK_STATUS.OVERSTOCK:
        recommendedAction = 'Freeze POs - Excess inventory (45-90 days), halt new orders';
        break;
      case STOCK_STATUS.EXPIRY_RISK:
        recommendedAction = 'Flash Promo Required - High expiry risk (>90 days), accelerate sales';
        break;
    }

    return {
      itemId: inventory.itemId,
      warehouseFacilityId: inventory.warehouseFacilityId,
      currentStock: inventory.totalSellable,
      salesVelocity,
      daysOfCover,
      stockStatus,
      recommendedAction,
      reorderQuantity,
      leadTime,
      safetyStock
    };
  }

  /**
   * Identify stock issues across multiple inventory items (Updated for Strategic Roadmap)
   * 
   * @param analyses - Array of stock analyses
   * @returns Summary report of stock issues
   */
  static identifyStockIssues(analyses: StockAnalysis[]): StockIssueReport {
    const outOfStockItems = analyses.filter(analysis => analysis.stockStatus === STOCK_STATUS.OUT_OF_STOCK);
    const understockItems = analyses.filter(analysis => analysis.stockStatus === STOCK_STATUS.UNDERSTOCK);
    const overstockItems = analyses.filter(analysis => analysis.stockStatus === STOCK_STATUS.OVERSTOCK);
    const expiryRiskItems = analyses.filter(analysis => analysis.stockStatus === STOCK_STATUS.EXPIRY_RISK);
    
    const totalIssues = outOfStockItems.length + understockItems.length + overstockItems.length + expiryRiskItems.length;
    const criticalIssues = outOfStockItems.length + understockItems.length;

    return {
      outOfStockItems,
      understockItems,
      overstockItems,
      expiryRiskItems,
      totalIssues,
      criticalIssues
    };
  }

  /**
   * Generate replenishment recommendations for understock items
   * 
   * @param inventory - Array of inventory items
   * @param analyses - Array of stock analyses
   * @returns Array of replenishment recommendations sorted by urgency
   */
  static generateReplenishmentRecommendations(
    inventory: InventoryItem[], 
    analyses: StockAnalysis[]
  ): ReplenishmentRecommendation[] {
    const recommendations: ReplenishmentRecommendation[] = [];

    analyses.forEach(analysis => {
      // Only generate recommendations for understock and out-of-stock items
      if (analysis.stockStatus === STOCK_STATUS.UNDERSTOCK || analysis.stockStatus === STOCK_STATUS.OUT_OF_STOCK) {
        const item = inventory.find(inv => 
          inv.itemId === analysis.itemId && 
          inv.warehouseFacilityId === analysis.warehouseFacilityId
        );

        if (item && analysis.reorderQuantity && analysis.reorderQuantity > 0) {
          // Calculate urgency score: higher sales velocity and lower days of cover = more urgent
          const urgencyScore = analysis.salesVelocity / Math.max(analysis.daysOfCover, 0.1);

          recommendations.push({
            itemId: analysis.itemId,
            itemName: item.itemName,
            warehouseFacilityId: analysis.warehouseFacilityId,
            warehouseFacilityName: item.warehouseFacilityName,
            currentStock: analysis.currentStock,
            salesVelocity: analysis.salesVelocity,
            daysOfCover: analysis.daysOfCover,
            recommendedOrderQuantity: analysis.reorderQuantity,
            leadTime: analysis.leadTime,
            safetyStock: analysis.safetyStock,
            urgencyScore
          });
        }
      }
    });

    // Sort by urgency score (most urgent first)
    return recommendations.sort((a, b) => b.urgencyScore - a.urgencyScore);
  }

  /**
   * Filter sales records by time period
   * 
   * @param sales - Array of sales records
   * @param period - Time period to filter by
   * @returns Filtered sales records within the specified period
   */
  private static filterSalesByTimePeriod(sales: SalesRecord[], period: TimePeriod): SalesRecord[] {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case TIME_PERIOD.LAST_7_DAYS:
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case TIME_PERIOD.LAST_15_DAYS:
        startDate = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000));
        break;
      case TIME_PERIOD.LAST_30_DAYS:
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        break;
      case TIME_PERIOD.LAST_MONTH:
        // Last calendar month
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return sales.filter(record => 
          record.orderDate >= lastMonth && record.orderDate < thisMonth
        );
      case TIME_PERIOD.MONTH_TO_DATE:
        // Current month from 1st to today
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case TIME_PERIOD.YEAR_TO_DATE:
        // For Vyndo data, YTD starts from April (month 3, 0-indexed)
        // This aligns with the business year and available sales data
        startDate = new Date(now.getFullYear(), 3, 1); // April 1st
        break;
      default:
        return sales;
    }

    return sales.filter(record => record.orderDate >= startDate && record.orderDate <= now);
  }

  /**
   * Calculate sales aggregation by location
   * 
   * @param sales - Array of sales records
   * @param period - Time period to aggregate by
   * @returns Map of location to sales aggregation
   */
  static aggregateSalesByLocation(sales: SalesRecord[], period: TimePeriod): Map<string, SalesAggregation> {
    const filteredSales = this.filterSalesByTimePeriod(sales, period);
    const locationMap = new Map<string, SalesRecord[]>();

    // Group sales by location
    filteredSales.forEach(record => {
      const location = `${record.supplyCity}-${record.supplyState}`;
      if (!locationMap.has(location)) {
        locationMap.set(location, []);
      }
      locationMap.get(location)!.push(record);
    });

    // Calculate aggregation for each location
    const result = new Map<string, SalesAggregation>();
    locationMap.forEach((locationSales, location) => {
      result.set(location, this.aggregateSalesByPeriod(locationSales, period));
    });

    return result;
  }

  /**
   * Calculate sales aggregation by SKU
   * 
   * @param sales - Array of sales records
   * @param period - Time period to aggregate by
   * @returns Map of SKU to sales aggregation
   */
  static aggregateSalesBySKU(sales: SalesRecord[], period: TimePeriod): Map<string, SalesAggregation> {
    const filteredSales = this.filterSalesByTimePeriod(sales, period);
    const skuMap = new Map<string, SalesRecord[]>();

    // Group sales by SKU
    filteredSales.forEach(record => {
      if (!skuMap.has(record.itemId)) {
        skuMap.set(record.itemId, []);
      }
      skuMap.get(record.itemId)!.push(record);
    });

    // Calculate aggregation for each SKU
    const result = new Map<string, SalesAggregation>();
    skuMap.forEach((skuSales, sku) => {
      result.set(sku, this.aggregateSalesByPeriod(skuSales, period));
    });

    return result;
  }

  /**
   * Get Top SKU City Trends for Hero SKU strategy
   * Identifies Top 10 SKUs by total revenue and provides daily sales trends by city
   * 
   * @param salesData - Array of sales records
   * @returns Object containing top SKUs and their city-wise daily trends
   */
  static getTopSkuCityTrends(salesData: SalesRecord[]): {
    topSkus: Array<{ itemId: string; itemName: string; totalRevenue: number }>;
    cityTrends: Map<string, Map<string, Array<{ date: string; revenue: number }>>>;
  } {
    // Calculate total revenue by SKU
    const skuRevenue = new Map<string, { itemName: string; totalRevenue: number }>();
    
    salesData.forEach(record => {
      const revenue = record.quantity * record.sellingPrice;
      if (!skuRevenue.has(record.itemId)) {
        skuRevenue.set(record.itemId, {
          itemName: record.productName, // Use productName from SalesRecord
          totalRevenue: 0
        });
      }
      skuRevenue.get(record.itemId)!.totalRevenue += revenue;
    });

    // Get top 10 SKUs by revenue
    const topSkus = Array.from(skuRevenue.entries())
      .map(([itemId, data]) => ({
        itemId,
        itemName: data.itemName,
        totalRevenue: data.totalRevenue
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // Calculate daily trends by city for each top SKU
    const cityTrends = new Map<string, Map<string, Array<{ date: string; revenue: number }>>>();

    topSkus.forEach(sku => {
      const skuSales = salesData.filter(record => record.itemId === sku.itemId);
      const cityDailyRevenue = new Map<string, Map<string, number>>();

      // Group by city and date
      skuSales.forEach(record => {
        const city = record.supplyCity;
        const date = record.orderDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        const revenue = record.quantity * record.sellingPrice;

        if (!cityDailyRevenue.has(city)) {
          cityDailyRevenue.set(city, new Map());
        }
        
        const cityData = cityDailyRevenue.get(city)!;
        if (!cityData.has(date)) {
          cityData.set(date, 0);
        }
        cityData.set(date, cityData.get(date)! + revenue);
      });

      // Convert to array format sorted by date
      const cityTrendsForSku = new Map<string, Array<{ date: string; revenue: number }>>();
      
      cityDailyRevenue.forEach((dateRevenue, city) => {
        const trends = Array.from(dateRevenue.entries())
          .map(([date, revenue]) => ({ date, revenue }))
          .sort((a, b) => a.date.localeCompare(b.date));
        
        cityTrendsForSku.set(city, trends);
      });

      cityTrends.set(sku.itemId, cityTrendsForSku);
    });

    return {
      topSkus,
      cityTrends
    };
  }
}