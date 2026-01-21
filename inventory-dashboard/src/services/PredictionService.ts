/**
 * PredictionService - Core analytical engine for Executive Command Center v2.0
 * 
 * Calculates stockout predictions, urgency levels, and priority shipping lists
 * using 12-month historical sales data and Statistical ROP thresholds.
 * 
 * Key Features:
 * - Stockout date prediction based on sales velocity
 * - Urgency level classification (Level 1: Critical, Level 2: High, Level 3: Medium)
 * - Priority shipping list generation sorted by urgency
 * - Platform-specific lead time support (Blinkit: 15 days, Amazon: 7 days)
 */

import type { InventoryItem, Platform } from '../types';

// ============================================================================
// Platform Constants
// ============================================================================

export const BLINKIT_LEAD_TIME = 15; // days
export const AMAZON_LEAD_TIME = 7;   // days

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Sales data point for velocity calculations
 */
export interface SalesDataPoint {
  date: Date;
  quantity: number;
  sku: string;
  platform: 'blinkit' | 'amazon';
}

/**
 * Urgency level classification for replenishment priority
 */
export interface UrgencyLevel {
  level: 1 | 2 | 3;
  label: 'Critical' | 'High' | 'Medium';
  color: 'red' | 'yellow' | 'green';
}

/**
 * Priority shipping item with urgency and destination
 */
export interface PriorityShippingItem {
  sku: string;
  productName: string;
  currentStock: number;
  statisticalROP: number;
  stockoutDate: Date | null;
  urgencyLevel: UrgencyLevel;
  targetFeeder: string;
  quantityToShip: number;
  salesVelocity: number;
}

// ============================================================================
// PredictionService Class
// ============================================================================

export class PredictionService {
  /**
   * Calculate average daily sales velocity over the last 12 months
   * 
   * @param salesHistory - Array of sales data points
   * @returns Average daily sales (units/day), or 0 if no data
   * 
   * Requirements: 3.1, 3.2
   */
  calculateSalesVelocity(salesHistory: SalesDataPoint[]): number {
    if (!salesHistory || salesHistory.length === 0) {
      return 0;
    }

    // Filter to last 12 months (365 days)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setDate(twelveMonthsAgo.getDate() - 365);

    const recentSales = salesHistory.filter(
      (sale) => new Date(sale.date) >= twelveMonthsAgo
    );

    if (recentSales.length === 0) {
      return 0;
    }

    // Calculate total sales
    const totalSales = recentSales.reduce((sum, sale) => sum + sale.quantity, 0);

    // Calculate days with data
    const uniqueDates = new Set(
      recentSales.map((sale) => new Date(sale.date).toISOString().split('T')[0])
    );
    const daysWithData = uniqueDates.size;

    if (daysWithData === 0) {
      return 0;
    }

    // Average daily sales
    return totalSales / daysWithData;
  }

  /**
   * Calculate projected stockout date for a SKU
   * 
   * Formula: Stockout Date = Current Date + (Current Stock / Sales Velocity)
   * 
   * @param sku - SKU identifier
   * @param currentStock - Current inventory level
   * @param salesHistory - Historical sales data
   * @returns Projected stockout date, or null if velocity is 0
   * 
   * Requirements: 3.2
   */
  calculateStockoutDate(
    sku: string,
    currentStock: number,
    salesHistory: SalesDataPoint[]
  ): Date | null {
    const salesVelocity = this.calculateSalesVelocity(salesHistory);

    // If no sales velocity, no stockout prediction possible
    if (salesVelocity === 0) {
      return null;
    }

    // Calculate days until stockout
    const daysUntilStockout = currentStock / salesVelocity;

    // Create stockout date
    const stockoutDate = new Date();
    stockoutDate.setDate(stockoutDate.getDate() + Math.round(daysUntilStockout));

    return stockoutDate;
  }

  /**
   * Calculate urgency level for replenishment
   * 
   * Formula: Urgency Score = (Sales Velocity × Stockout Risk) / Current Stock
   * 
   * Stockout Risk:
   * - 1.0 if Current Stock < Statistical ROP
   * - 0.5 otherwise
   * 
   * Classification:
   * - Level 1 (Critical): Urgency Score > 0.5 OR Current Stock < Statistical ROP
   * - Level 2 (High): Urgency Score > 0.2 AND Urgency Score ≤ 0.5
   * - Level 3 (Medium): Urgency Score ≤ 0.2
   * 
   * @param sku - SKU identifier
   * @param currentStock - Current inventory level
   * @param statisticalROP - Statistical Reorder Point
   * @param salesVelocity - Average daily sales
   * @returns Urgency level classification
   * 
   * Requirements: 4.1, 4.2, 5.2
   */
  calculateUrgencyLevel(
    sku: string,
    currentStock: number,
    statisticalROP: number,
    salesVelocity: number
  ): UrgencyLevel {
    // Determine stockout risk
    const stockoutRisk = currentStock < statisticalROP ? 1.0 : 0.5;

    // Calculate urgency score
    // Handle division by zero: if current stock is 0, urgency is critical
    const urgencyScore =
      currentStock === 0
        ? Infinity
        : (salesVelocity * stockoutRisk) / currentStock;

    // Classify urgency level
    // CRITICAL: Stock below ROP OR urgency score > 0.5
    if (currentStock < statisticalROP || urgencyScore > 0.5) {
      return {
        level: 1,
        label: 'Critical',
        color: 'red',
      };
    }

    // HIGH: Urgency score > 0.2 AND ≤ 0.5
    if (urgencyScore > 0.2) {
      return {
        level: 2,
        label: 'High',
        color: 'yellow',
      };
    }

    // MEDIUM: Urgency score ≤ 0.2
    return {
      level: 3,
      label: 'Medium',
      color: 'green',
    };
  }

  /**
   * Generate priority shipping list for all SKUs
   * 
   * Sort Order:
   * 1. Primary: Urgency Level (1 → 2 → 3)
   * 2. Secondary: Stockout Date (earliest first)
   * 3. Tertiary: Sales Velocity (highest first)
   * 
   * Quantity to Ship:
   * - Formula: (Statistical ROP × 1.5) - Current Stock
   * - Minimum: 1 unit
   * - Maximum: Available warehouse stock
   * 
   * @param inventory - Array of inventory items
   * @param feederWarehouse - Optional filter by target feeder
   * @returns Sorted priority shipping list
   * 
   * Requirements: 4.3, 4.4, 4.5
   */
  generatePriorityShippingList(
    inventory: InventoryItem[],
    feederWarehouse?: string
  ): PriorityShippingItem[] {
    const priorityList: PriorityShippingItem[] = [];

    for (const item of inventory) {
      // Filter by feeder warehouse if specified
      if (feederWarehouse && item.warehouseFacilityId !== feederWarehouse) {
        continue;
      }

      // Calculate sales velocity from historical data
      // For v2.0, we'll use the existing velocity fields as a proxy
      // In production, this would use actual sales history
      const salesVelocity = item.last30Days ? item.last30Days / 30 : 0;

      // Get Statistical ROP (from v1.1 implementation)
      // For now, use a simple calculation: 7 days * velocity + safety stock
      const statisticalROP = salesVelocity * 7 + salesVelocity * 3;

      // Calculate stockout date
      // Using simplified approach without full sales history
      const stockoutDate =
        salesVelocity > 0
          ? new Date(
              Date.now() + (item.totalSellable / salesVelocity) * 24 * 60 * 60 * 1000
            )
          : null;

      // Calculate urgency level
      const urgencyLevel = this.calculateUrgencyLevel(
        item.itemId,
        item.totalSellable,
        statisticalROP,
        salesVelocity
      );

      // Calculate quantity to ship
      const targetStock = statisticalROP * 1.5;
      const quantityNeeded = targetStock - item.totalSellable;
      const quantityToShip = Math.max(1, Math.min(quantityNeeded, item.totalSellable));

      priorityList.push({
        sku: item.itemId,
        productName: item.itemName,
        currentStock: item.totalSellable,
        statisticalROP,
        stockoutDate,
        urgencyLevel,
        targetFeeder: item.warehouseFacilityId,
        quantityToShip: Math.round(quantityToShip),
        salesVelocity,
      });
    }

    // Sort by priority
    return priorityList.sort((a, b) => {
      // Primary: Urgency Level (1 before 2 before 3)
      if (a.urgencyLevel.level !== b.urgencyLevel.level) {
        return a.urgencyLevel.level - b.urgencyLevel.level;
      }

      // Secondary: Stockout Date (earliest first)
      if (a.stockoutDate && b.stockoutDate) {
        return a.stockoutDate.getTime() - b.stockoutDate.getTime();
      }
      if (a.stockoutDate && !b.stockoutDate) return -1;
      if (!a.stockoutDate && b.stockoutDate) return 1;

      // Tertiary: Sales Velocity (highest first)
      return b.salesVelocity - a.salesVelocity;
    });
  }

  /**
   * Get platform-specific lead time
   * 
   * @param platform - Platform identifier
   * @returns Lead time in days
   */
  getPlatformLeadTime(platform: Platform): number {
    if (platform === 'Blinkit') {
      return BLINKIT_LEAD_TIME;
    }
    if (platform === 'Amazon') {
      return AMAZON_LEAD_TIME;
    }
    // Default to Blinkit lead time for 'All' or unknown platforms
    return BLINKIT_LEAD_TIME;
  }
}

// Export singleton instance
export const predictionService = new PredictionService();
