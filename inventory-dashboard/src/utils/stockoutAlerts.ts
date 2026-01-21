/**
 * Stockout Alert Utilities
 * 
 * Calculates whether any SKUs have stockout dates within 7 days
 * Used for notification badge on Regional Operations tab
 */

import type { InventoryItem } from '../types';
import { AnalyticsService } from '../services/AnalyticsService';

/**
 * Check if any SKUs have stockout dates within the next 7 days
 * 
 * @param inventory - Array of inventory items
 * @returns true if any SKU has stockout date within 7 days
 */
export function hasStockoutAlert(inventory: InventoryItem[]): boolean {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  for (const item of inventory) {
    const velocity = AnalyticsService.calculateSalesVelocity(item);
    
    if (velocity > 0) {
      const daysUntilStockout = item.totalSellable / velocity;
      
      if (daysUntilStockout <= 7) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Count SKUs with stockout dates within the next 7 days
 * 
 * @param inventory - Array of inventory items
 * @returns Number of SKUs with imminent stockout
 */
export function countStockoutAlerts(inventory: InventoryItem[]): number {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  let count = 0;

  for (const item of inventory) {
    const velocity = AnalyticsService.calculateSalesVelocity(item);
    
    if (velocity > 0) {
      const daysUntilStockout = item.totalSellable / velocity;
      
      if (daysUntilStockout <= 7) {
        count++;
      }
    }
  }

  return count;
}
