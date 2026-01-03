import type {
  SalesRecord,
  AmazonMetrics,
  Platform
} from '../types';
import { PLATFORM } from '../types';

/**
 * Service for Amazon-specific analytics and payout calculations
 * Handles referral fees, estimated payouts, and Amazon-specific metrics
 */
export class AmazonAnalyticsService {
  private static readonly DEFAULT_REFERRAL_FEE_RATE = 0.15; // 15% default referral fee

  /**
   * Calculate estimated payout for Amazon sales
   * Formula: Gross Revenue - (Gross Revenue * Referral Fee Rate)
   * 
   * @param grossRevenue - Total gross revenue from Amazon sales
   * @param referralFeeRate - Amazon referral fee rate (default 15%)
   * @returns Amazon metrics including estimated payout
   */
  static calculateEstimatedPayout(
    grossRevenue: number, 
    referralFeeRate: number = this.DEFAULT_REFERRAL_FEE_RATE
  ): AmazonMetrics {
    const referralFee = grossRevenue * referralFeeRate;
    const estimatedPayout = grossRevenue - referralFee;

    return {
      grossRevenue,
      referralFee,
      estimatedPayout,
      feePercentage: referralFeeRate * 100
    };
  }

  /**
   * Aggregate Amazon metrics from sales records
   * Calculates total revenue, fees, and estimated payouts
   * 
   * @param sales - Array of Amazon sales records
   * @param referralFeeRate - Amazon referral fee rate (default 15%)
   * @returns Aggregated Amazon metrics
   */
  static aggregateAmazonMetrics(
    sales: SalesRecord[], 
    referralFeeRate: number = this.DEFAULT_REFERRAL_FEE_RATE
  ): AmazonMetrics {
    // Filter for Amazon sales only
    const amazonSales = sales.filter(sale => sale.platform === PLATFORM.AMAZON);
    
    if (amazonSales.length === 0) {
      return {
        grossRevenue: 0,
        referralFee: 0,
        estimatedPayout: 0,
        feePercentage: referralFeeRate * 100
      };
    }

    const grossRevenue = amazonSales.reduce((total, sale) => {
      return total + (sale.quantity * sale.sellingPrice);
    }, 0);

    return this.calculateEstimatedPayout(grossRevenue, referralFeeRate);
  }

  /**
   * Compare Amazon vs Blinkit performance
   * Provides side-by-side comparison of key metrics
   * 
   * @param amazonSales - Amazon sales records
   * @param blinkitSales - Blinkit sales records
   * @returns Comparison metrics between platforms
   */
  static compareAmazonVsBlinkit(
    amazonSales: SalesRecord[], 
    blinkitSales: SalesRecord[]
  ): {
    amazon: {
      totalRevenue: number;
      totalUnits: number;
      averageOrderValue: number;
      estimatedPayout: number;
      feeImpact: number;
    };
    blinkit: {
      totalRevenue: number;
      totalUnits: number;
      averageOrderValue: number;
      netRevenue: number; // Same as total since no fees
    };
    comparison: {
      revenueAdvantage: Platform;
      volumeAdvantage: Platform;
      profitabilityAdvantage: Platform;
      efficiencyAdvantage: Platform;
    };
  } {
    // Calculate Amazon metrics
    const amazonMetrics = this.aggregateAmazonMetrics(amazonSales);
    const amazonUnits = amazonSales.reduce((sum, sale) => sum + sale.quantity, 0);
    const amazonAOV = amazonUnits > 0 ? amazonMetrics.grossRevenue / amazonSales.length : 0;

    // Calculate Blinkit metrics
    const blinkitRevenue = blinkitSales.reduce((total, sale) => {
      return total + (sale.quantity * sale.sellingPrice);
    }, 0);
    const blinkitUnits = blinkitSales.reduce((sum, sale) => sum + sale.quantity, 0);
    const blinkitAOV = blinkitSales.length > 0 ? blinkitRevenue / blinkitSales.length : 0;

    return {
      amazon: {
        totalRevenue: amazonMetrics.grossRevenue,
        totalUnits: amazonUnits,
        averageOrderValue: amazonAOV,
        estimatedPayout: amazonMetrics.estimatedPayout,
        feeImpact: amazonMetrics.referralFee
      },
      blinkit: {
        totalRevenue: blinkitRevenue,
        totalUnits: blinkitUnits,
        averageOrderValue: blinkitAOV,
        netRevenue: blinkitRevenue // No platform fees for Blinkit
      },
      comparison: {
        revenueAdvantage: amazonMetrics.grossRevenue > blinkitRevenue ? PLATFORM.AMAZON : PLATFORM.BLINKIT,
        volumeAdvantage: amazonUnits > blinkitUnits ? PLATFORM.AMAZON : PLATFORM.BLINKIT,
        profitabilityAdvantage: amazonMetrics.estimatedPayout > blinkitRevenue ? PLATFORM.AMAZON : PLATFORM.BLINKIT,
        efficiencyAdvantage: amazonAOV > blinkitAOV ? PLATFORM.AMAZON : PLATFORM.BLINKIT
      }
    };
  }

  /**
   * Calculate Amazon fee impact analysis
   * Shows how referral fees affect profitability
   * 
   * @param sales - Amazon sales records
   * @param alternativeFeeRates - Array of fee rates to compare (e.g., [0.10, 0.12, 0.15, 0.18])
   * @returns Fee impact analysis across different rates
   */
  static analyzeFeeImpact(
    sales: SalesRecord[], 
    alternativeFeeRates: number[] = [0.10, 0.12, 0.15, 0.18, 0.20]
  ): {
    currentMetrics: AmazonMetrics;
    feeScenarios: Array<{
      feeRate: number;
      metrics: AmazonMetrics;
      payoutDifference: number;
      percentageImpact: number;
    }>;
  } {
    const amazonSales = sales.filter(sale => sale.platform === PLATFORM.AMAZON);
    const currentMetrics = this.aggregateAmazonMetrics(amazonSales);

    const feeScenarios = alternativeFeeRates.map(feeRate => {
      const metrics = this.aggregateAmazonMetrics(amazonSales, feeRate);
      const payoutDifference = metrics.estimatedPayout - currentMetrics.estimatedPayout;
      const percentageImpact = currentMetrics.estimatedPayout > 0 
        ? (payoutDifference / currentMetrics.estimatedPayout) * 100 
        : 0;

      return {
        feeRate,
        metrics,
        payoutDifference,
        percentageImpact
      };
    });

    return {
      currentMetrics,
      feeScenarios
    };
  }

  /**
   * Get Amazon performance trends over time
   * Analyzes revenue, fees, and payout trends
   * 
   * @param sales - Amazon sales records
   * @param groupBy - Time grouping ('daily' | 'weekly' | 'monthly')
   * @returns Time-series data for Amazon performance
   */
  static getAmazonPerformanceTrends(
    sales: SalesRecord[], 
    groupBy: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Array<{
    period: string;
    grossRevenue: number;
    referralFee: number;
    estimatedPayout: number;
    orderCount: number;
    unitsSold: number;
  }> {
    const amazonSales = sales.filter(sale => sale.platform === PLATFORM.AMAZON);
    
    if (amazonSales.length === 0) {
      return [];
    }

    // Group sales by time period
    const groupedSales = new Map<string, SalesRecord[]>();

    amazonSales.forEach(sale => {
      let periodKey: string;
      const date = new Date(sale.orderDate);

      switch (groupBy) {
        case 'daily':
          periodKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
          periodKey = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          periodKey = date.toISOString().split('T')[0];
      }

      if (!groupedSales.has(periodKey)) {
        groupedSales.set(periodKey, []);
      }
      groupedSales.get(periodKey)!.push(sale);
    });

    // Calculate metrics for each period
    const trends = Array.from(groupedSales.entries()).map(([period, periodSales]) => {
      const metrics = this.aggregateAmazonMetrics(periodSales);
      const orderCount = periodSales.length;
      const unitsSold = periodSales.reduce((sum, sale) => sum + sale.quantity, 0);

      return {
        period,
        grossRevenue: metrics.grossRevenue,
        referralFee: metrics.referralFee,
        estimatedPayout: metrics.estimatedPayout,
        orderCount,
        unitsSold
      };
    });

    // Sort by period
    return trends.sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Calculate Amazon category performance
   * Analyzes performance by product categories (if available)
   * 
   * @param sales - Amazon sales records
   * @returns Performance metrics by category
   */
  static getAmazonCategoryPerformance(sales: SalesRecord[]): Array<{
    category: string;
    grossRevenue: number;
    estimatedPayout: number;
    unitsSold: number;
    averagePrice: number;
    feeImpact: number;
  }> {
    const amazonSales = sales.filter(sale => sale.platform === PLATFORM.AMAZON);
    
    // Group by brand name as a proxy for category
    const categoryMap = new Map<string, SalesRecord[]>();
    
    amazonSales.forEach(sale => {
      const category = sale.brandName || 'Unknown';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(sale);
    });

    return Array.from(categoryMap.entries()).map(([category, categorySales]) => {
      const metrics = this.aggregateAmazonMetrics(categorySales);
      const unitsSold = categorySales.reduce((sum, sale) => sum + sale.quantity, 0);
      const averagePrice = unitsSold > 0 ? metrics.grossRevenue / unitsSold : 0;

      return {
        category,
        grossRevenue: metrics.grossRevenue,
        estimatedPayout: metrics.estimatedPayout,
        unitsSold,
        averagePrice,
        feeImpact: metrics.referralFee
      };
    }).sort((a, b) => b.grossRevenue - a.grossRevenue); // Sort by revenue descending
  }

  /**
   * Get Amazon payout summary for a specific time period
   * Provides a comprehensive summary of Amazon financial performance
   * 
   * @param sales - Amazon sales records
   * @param startDate - Start date for analysis
   * @param endDate - End date for analysis
   * @returns Comprehensive Amazon payout summary
   */
  static getAmazonPayoutSummary(
    sales: SalesRecord[], 
    startDate?: Date, 
    endDate?: Date
  ): {
    period: { start: Date; end: Date };
    metrics: AmazonMetrics;
    orderMetrics: {
      totalOrders: number;
      averageOrderValue: number;
      totalUnits: number;
      averageUnitsPerOrder: number;
    };
    topProducts: Array<{
      itemId: string;
      productName: string;
      revenue: number;
      units: number;
      estimatedPayout: number;
    }>;
    dailyBreakdown: Array<{
      date: string;
      revenue: number;
      payout: number;
      orders: number;
    }>;
  } {
    let filteredSales = sales.filter(sale => sale.platform === PLATFORM.AMAZON);

    // Apply date filtering if provided
    if (startDate || endDate) {
      filteredSales = filteredSales.filter(sale => {
        const saleDate = new Date(sale.orderDate);
        if (startDate && saleDate < startDate) return false;
        if (endDate && saleDate > endDate) return false;
        return true;
      });
    }

    const actualStart = startDate || (filteredSales.length > 0 ? new Date(Math.min(...filteredSales.map(s => s.orderDate.getTime()))) : new Date());
    const actualEnd = endDate || (filteredSales.length > 0 ? new Date(Math.max(...filteredSales.map(s => s.orderDate.getTime()))) : new Date());

    // Calculate main metrics
    const metrics = this.aggregateAmazonMetrics(filteredSales);

    // Calculate order metrics
    const totalOrders = filteredSales.length;
    const totalUnits = filteredSales.reduce((sum, sale) => sum + sale.quantity, 0);
    const averageOrderValue = totalOrders > 0 ? metrics.grossRevenue / totalOrders : 0;
    const averageUnitsPerOrder = totalOrders > 0 ? totalUnits / totalOrders : 0;

    // Get top products
    const productMap = new Map<string, { revenue: number; units: number; productName: string }>();
    filteredSales.forEach(sale => {
      const key = sale.itemId;
      if (!productMap.has(key)) {
        productMap.set(key, { revenue: 0, units: 0, productName: sale.productName });
      }
      const product = productMap.get(key)!;
      product.revenue += sale.quantity * sale.sellingPrice;
      product.units += sale.quantity;
    });

    const topProducts = Array.from(productMap.entries())
      .map(([itemId, data]) => ({
        itemId,
        productName: data.productName,
        revenue: data.revenue,
        units: data.units,
        estimatedPayout: data.revenue * 0.85 // 15% fee deduction
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Get daily breakdown
    const dailyMap = new Map<string, { revenue: number; orders: number }>();
    filteredSales.forEach(sale => {
      const dateKey = sale.orderDate.toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { revenue: 0, orders: 0 });
      }
      const day = dailyMap.get(dateKey)!;
      day.revenue += sale.quantity * sale.sellingPrice;
      day.orders += 1;
    });

    const dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        payout: data.revenue * 0.85, // 15% fee deduction
        orders: data.orders
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      period: { start: actualStart, end: actualEnd },
      metrics,
      orderMetrics: {
        totalOrders,
        averageOrderValue,
        totalUnits,
        averageUnitsPerOrder
      },
      topProducts,
      dailyBreakdown
    };
  }

  /**
   * Validate Amazon metrics calculation
   * Ensures calculations are mathematically correct
   * 
   * @param sales - Amazon sales records
   * @param expectedMetrics - Expected metrics for validation
   * @returns Validation result
   */
  static validateAmazonMetrics(
    sales: SalesRecord[], 
    expectedMetrics?: Partial<AmazonMetrics>
  ): {
    isValid: boolean;
    calculatedMetrics: AmazonMetrics;
    discrepancies: string[];
  } {
    const calculatedMetrics = this.aggregateAmazonMetrics(sales);
    const discrepancies: string[] = [];

    // Validate internal consistency
    const expectedReferralFee = calculatedMetrics.grossRevenue * (calculatedMetrics.feePercentage / 100);
    const expectedPayout = calculatedMetrics.grossRevenue - expectedReferralFee;

    if (Math.abs(calculatedMetrics.referralFee - expectedReferralFee) > 0.01) {
      discrepancies.push(`Referral fee calculation inconsistent: ${calculatedMetrics.referralFee} vs expected ${expectedReferralFee}`);
    }

    if (Math.abs(calculatedMetrics.estimatedPayout - expectedPayout) > 0.01) {
      discrepancies.push(`Estimated payout calculation inconsistent: ${calculatedMetrics.estimatedPayout} vs expected ${expectedPayout}`);
    }

    // Validate against expected metrics if provided
    if (expectedMetrics) {
      Object.entries(expectedMetrics).forEach(([key, expectedValue]) => {
        const actualValue = calculatedMetrics[key as keyof AmazonMetrics];
        if (typeof expectedValue === 'number' && Math.abs(actualValue - expectedValue) > 0.01) {
          discrepancies.push(`${key} mismatch: ${actualValue} vs expected ${expectedValue}`);
        }
      });
    }

    return {
      isValid: discrepancies.length === 0,
      calculatedMetrics,
      discrepancies
    };
  }
}