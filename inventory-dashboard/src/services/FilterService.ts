import type {
  InventoryItem,
  SalesRecord,
  TimePeriod,
  FilterCriteria
} from '../types';
import { TIME_PERIOD } from '../types';

/**
 * Service for filtering and searching inventory and sales data
 */
export class FilterService {
  /**
   * Filter data by location (warehouse facility)
   * @param data Array of data items with location information
   * @param locations Array of location IDs or names to filter by
   * @returns Filtered array containing only items from specified locations
   */
  static filterByLocation<T extends { warehouseFacilityId: string; warehouseFacilityName?: string }>(
    data: T[],
    locations: string[]
  ): T[] {
    if (!locations || locations.length === 0) {
      return data;
    }

    const normalizedLocations = locations.map(loc => loc.toLowerCase().trim());
    
    return data.filter(item => {
      const facilityId = item.warehouseFacilityId.toLowerCase().trim();
      const facilityName = item.warehouseFacilityName?.toLowerCase().trim() || '';
      
      return normalizedLocations.some(location => 
        facilityId.includes(location) || 
        facilityName.includes(location) ||
        location.includes(facilityId) ||
        location.includes(facilityName)
      );
    });
  }

  /**
   * Filter data by SKU (item ID or UPC)
   * @param data Array of data items with SKU information
   * @param skus Array of SKU identifiers to filter by
   * @returns Filtered array containing only items with specified SKUs
   */
  static filterBySKU<T extends { itemId: string; upc?: string }>(
    data: T[],
    skus: string[]
  ): T[] {
    if (!skus || skus.length === 0) {
      return data;
    }

    const normalizedSkus = skus.map(sku => sku.toLowerCase().trim());
    
    return data.filter(item => {
      const itemId = item.itemId.toLowerCase().trim();
      const upc = item.upc?.toLowerCase().trim() || '';
      
      return normalizedSkus.some(sku => 
        itemId.includes(sku) || 
        upc.includes(sku) ||
        sku.includes(itemId) ||
        (upc && sku.includes(upc))
      );
    });
  }

  /**
   * Filter sales data by time period
   * @param sales Array of sales records
   * @param period Time period to filter by
   * @returns Filtered sales records within the specified time period
   */
  static filterByTimePeriod(sales: SalesRecord[], period: TimePeriod): SalesRecord[] {
    if (!period) {
      return sales;
    }

    const now = new Date();
    const startDate = this.getTimePeriodStartDate(period, now);
    
    return sales.filter(record => {
      const orderDate = new Date(record.orderDate);
      return orderDate >= startDate && orderDate <= now;
    });
  }

  /**
   * Filter sales data by custom date range
   * @param sales Array of sales records
   * @param startDate Start date for filtering (inclusive)
   * @param endDate End date for filtering (inclusive)
   * @returns Filtered sales records within the specified date range
   */
  static filterByDateRange(sales: SalesRecord[], startDate: Date, endDate: Date): SalesRecord[] {
    if (!startDate || !endDate) {
      return sales;
    }

    return sales.filter(record => {
      const orderDate = new Date(record.orderDate);
      return orderDate >= startDate && orderDate <= endDate;
    });
  }

  /**
   * Search inventory items by product name or brand name
   * @param inventory Array of inventory items
   * @param searchTerm Search term to match against product/brand names
   * @returns Filtered inventory items matching the search term
   */
  static searchInventoryByName(inventory: InventoryItem[], searchTerm: string): InventoryItem[] {
    if (!searchTerm || searchTerm.trim() === '') {
      return inventory;
    }

    const normalizedSearchTerm = searchTerm.toLowerCase().trim();
    
    return inventory.filter(item => {
      const itemName = item.itemName.toLowerCase();
      const brandName = item.brandName.toLowerCase();
      const itemId = item.itemId.toLowerCase();
      const upc = item.upc?.toLowerCase() || '';
      
      return itemName.includes(normalizedSearchTerm) ||
             brandName.includes(normalizedSearchTerm) ||
             itemId.includes(normalizedSearchTerm) ||
             upc.includes(normalizedSearchTerm);
    });
  }

  /**
   * Search sales records by product name or brand name
   * @param sales Array of sales records
   * @param searchTerm Search term to match against product/brand names
   * @returns Filtered sales records matching the search term
   */
  static searchSalesByName(sales: SalesRecord[], searchTerm: string): SalesRecord[] {
    if (!searchTerm || searchTerm.trim() === '') {
      return sales;
    }

    const normalizedSearchTerm = searchTerm.toLowerCase().trim();
    
    return sales.filter(record => {
      const productName = record.productName.toLowerCase();
      const brandName = record.brandName?.toLowerCase() || '';
      const itemId = record.itemId.toLowerCase();
      const upc = record.upc?.toLowerCase() || '';
      
      return productName.includes(normalizedSearchTerm) ||
             brandName.includes(normalizedSearchTerm) ||
             itemId.includes(normalizedSearchTerm) ||
             upc.includes(normalizedSearchTerm);
    });
  }

  /**
   * Apply multiple filter criteria to inventory data
   * @param inventory Array of inventory items
   * @param criteria Filter criteria to apply
   * @returns Filtered inventory items matching all specified criteria
   */
  static applyInventoryFilters(inventory: InventoryItem[], criteria: FilterCriteria): InventoryItem[] {
    let filtered = inventory;

    if (criteria.locations && criteria.locations.length > 0) {
      filtered = this.filterByLocation(filtered, criteria.locations);
    }

    if (criteria.skus && criteria.skus.length > 0) {
      filtered = this.filterBySKU(filtered, criteria.skus);
    }

    if (criteria.searchTerm) {
      filtered = this.searchInventoryByName(filtered, criteria.searchTerm);
    }

    return filtered;
  }

  /**
   * Apply multiple filter criteria to sales data
   * @param sales Array of sales records
   * @param criteria Filter criteria to apply
   * @returns Filtered sales records matching all specified criteria
   */
  static applySalesFilters(sales: SalesRecord[], criteria: FilterCriteria): SalesRecord[] {
    let filtered = sales;

    if (criteria.locations && criteria.locations.length > 0) {
      // Filter by supply location for sales data
      filtered = filtered.filter(record => {
        const normalizedLocations = criteria.locations!.map(loc => loc.toLowerCase().trim());
        const supplyCity = record.supplyCity.toLowerCase().trim();
        const supplyState = record.supplyState.toLowerCase().trim();
        const customerCity = record.customerCity.toLowerCase().trim();
        const customerState = record.customerState.toLowerCase().trim();
        
        return normalizedLocations.some(location => 
          supplyCity.includes(location) || 
          supplyState.includes(location) ||
          customerCity.includes(location) ||
          customerState.includes(location) ||
          location.includes(supplyCity) ||
          location.includes(supplyState) ||
          location.includes(customerCity) ||
          location.includes(customerState)
        );
      });
    }

    if (criteria.skus && criteria.skus.length > 0) {
      filtered = this.filterBySKU(filtered, criteria.skus);
    }

    if (criteria.searchTerm) {
      filtered = this.searchSalesByName(filtered, criteria.searchTerm);
    }

    if (criteria.timePeriod) {
      filtered = this.filterByTimePeriod(filtered, criteria.timePeriod);
    }

    if (criteria.startDate && criteria.endDate) {
      filtered = this.filterByDateRange(filtered, criteria.startDate, criteria.endDate);
    }

    return filtered;
  }

  /**
   * Get unique locations from inventory data
   * @param inventory Array of inventory items
   * @returns Array of unique location objects with ID and name
   */
  static getUniqueLocations(inventory: InventoryItem[]): Array<{ id: string; name: string }> {
    const locationMap = new Map<string, string>();
    
    inventory.forEach(item => {
      if (item.warehouseFacilityId && !locationMap.has(item.warehouseFacilityId)) {
        locationMap.set(item.warehouseFacilityId, item.warehouseFacilityName || item.warehouseFacilityId);
      }
    });

    return Array.from(locationMap.entries()).map(([id, name]) => ({ id, name }));
  }

  /**
   * Get unique SKUs from inventory data
   * @param inventory Array of inventory items
   * @returns Array of unique SKU objects with ID and name
   */
  static getUniqueSKUs(inventory: InventoryItem[]): Array<{ id: string; name: string }> {
    const skuMap = new Map<string, string>();
    
    inventory.forEach(item => {
      if (item.itemId && !skuMap.has(item.itemId)) {
        skuMap.set(item.itemId, item.itemName || item.itemId);
      }
    });

    return Array.from(skuMap.entries()).map(([id, name]) => ({ id, name }));
  }

  /**
   * Get unique brands from inventory data
   * @param inventory Array of inventory items
   * @returns Array of unique brand names
   */
  static getUniqueBrands(inventory: InventoryItem[]): string[] {
    const brands = new Set<string>();
    
    inventory.forEach(item => {
      if (item.brandName && item.brandName.trim() !== '') {
        brands.add(item.brandName.trim());
      }
    });

    return Array.from(brands).sort();
  }

  /**
   * Calculate start date for a given time period
   * @param period Time period enum value
   * @param referenceDate Reference date (usually current date)
   * @returns Start date for the time period
   */
  private static getTimePeriodStartDate(period: TimePeriod, referenceDate: Date): Date {
    const date = new Date(referenceDate);
    
    switch (period) {
      case TIME_PERIOD.LAST_7_DAYS:
        date.setDate(date.getDate() - 7);
        break;
      
      case TIME_PERIOD.LAST_15_DAYS:
        date.setDate(date.getDate() - 15);
        break;
      
      case TIME_PERIOD.LAST_30_DAYS:
        date.setDate(date.getDate() - 30);
        break;
      
      case TIME_PERIOD.LAST_MONTH:
        date.setMonth(date.getMonth() - 1);
        break;
      
      case TIME_PERIOD.MONTH_TO_DATE:
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        break;
      
      case TIME_PERIOD.YEAR_TO_DATE:
        // For Vyndo data, YTD starts from April (month 3, 0-indexed)
        // This aligns with the business year and available sales data
        date.setMonth(3, 1); // April 1st
        date.setHours(0, 0, 0, 0);
        break;
      
      default:
        // Default to last 30 days
        date.setDate(date.getDate() - 30);
        break;
    }
    
    return date;
  }

  /**
   * Create a filter summary for display purposes
   * @param criteria Applied filter criteria
   * @returns Human-readable filter summary
   */
  static getFilterSummary(criteria: FilterCriteria): string {
    const parts: string[] = [];

    if (criteria.locations && criteria.locations.length > 0) {
      parts.push(`Locations: ${criteria.locations.join(', ')}`);
    }

    if (criteria.skus && criteria.skus.length > 0) {
      parts.push(`SKUs: ${criteria.skus.join(', ')}`);
    }

    if (criteria.searchTerm) {
      parts.push(`Search: "${criteria.searchTerm}"`);
    }

    if (criteria.timePeriod) {
      parts.push(`Period: ${criteria.timePeriod.replace(/-/g, ' ')}`);
    }

    if (criteria.startDate && criteria.endDate) {
      parts.push(`Date Range: ${criteria.startDate.toLocaleDateString()} - ${criteria.endDate.toLocaleDateString()}`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'No filters applied';
  }
}