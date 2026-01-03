import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Package, 
  MapPin, 
  Target,
  Calendar,
  BarChart3
} from 'lucide-react';
import { ModernCard, ModernCardHeader, ModernCardTitle, ModernCardContent } from './ModernCard';
import { cn } from '../utils/cn';
import type { InventoryItem, SalesRecord } from '../types';
import { AnalyticsService } from '../services';
import { HistoryService } from '../services/HistoryService';
import { STOCK_STATUS } from '../types';

interface BentoKpiCardsProps {
  inventoryData: InventoryItem[];
  salesData: SalesRecord[];
  onRestockUrgencyClick?: () => void;
  onExpiryRiskClick?: () => void;
  onTopLocationClick?: (location: string) => void;
}

/**
 * InventoryHealthTrend - Primary slot (2x2) with integrated chart
 */
export const InventoryHealthTrend: React.FC<{ inventoryData: InventoryItem[] }> = ({ 
  inventoryData 
}) => {
  const healthMetrics = useMemo(() => {
    if (inventoryData.length === 0) return null;

    const analyses = inventoryData.map(item => AnalyticsService.analyzeStock(item));
    const healthyCount = analyses.filter(a => a.stockStatus === STOCK_STATUS.HEALTHY).length;
    const healthPercentage = (healthyCount / inventoryData.length) * 100;
    
    // Get historical data for trend
    const snapshots = HistoryService.getInventorySnapshots();
    const trendData = snapshots.slice(-7).map(snapshot => ({
      date: snapshot.timestamp,
      healthPercentage: (snapshot.totalUnits > 0 ? 80 : 0) // Placeholder calculation
    }));

    return {
      current: healthPercentage,
      trend: trendData,
      isImproving: trendData.length > 1 ? 
        trendData[trendData.length - 1].healthPercentage > trendData[0].healthPercentage : true
    };
  }, [inventoryData]);

  if (!healthMetrics) {
    return (
      <ModernCard variant="glass" gradient className="h-full">
        <ModernCardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-vyndo-neutral-400 mx-auto mb-4" />
            <p className="text-sm text-vyndo-neutral-600">Upload data to view health trend</p>
          </div>
        </ModernCardContent>
      </ModernCard>
    );
  }

  return (
    <ModernCard variant="glass" gradient className="h-full relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-vyndo-success-50/50 to-vyndo-primary-50/30 pointer-events-none" />
      
      <ModernCardHeader className="relative z-10">
        <div className="flex items-center justify-between">
          <ModernCardTitle level={3} className="text-vyndo-neutral-900">
            Inventory Health Trend
          </ModernCardTitle>
          <div className={cn(
            'flex items-center text-sm font-medium',
            healthMetrics.isImproving ? 'text-vyndo-success-600' : 'text-vyndo-warning-600'
          )}>
            {healthMetrics.isImproving ? (
              <TrendingUp className="h-4 w-4 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 mr-1" />
            )}
            {healthMetrics.isImproving ? 'Improving' : 'Declining'}
          </div>
        </div>
      </ModernCardHeader>

      <ModernCardContent className="relative z-10">
        {/* Main Metric */}
        <div className="mb-6">
          <div className="text-4xl font-bold text-vyndo-neutral-900 mb-2">
            {healthMetrics.current.toFixed(1)}%
          </div>
          <div className="text-sm text-vyndo-neutral-600">
            Items in healthy stock range (14-45 days)
          </div>
        </div>

        {/* Mini Trend Chart */}
        <div className="space-y-2">
          <div className="text-xs text-vyndo-neutral-500 uppercase tracking-wide">
            7-Day Trend
          </div>
          <div className="flex items-end space-x-1 h-16">
            {healthMetrics.trend.map((point, index) => (
              <div
                key={index}
                className="flex-1 bg-vyndo-success-200 rounded-t-sm transition-all duration-300"
                style={{ 
                  height: `${Math.max(4, (point.healthPercentage / 100) * 100)}%`,
                  opacity: 0.6 + (index / healthMetrics.trend.length) * 0.4
                }}
              />
            ))}
          </div>
        </div>
      </ModernCardContent>
    </ModernCard>
  );
};

/**
 * SalesPerformance - Secondary slot (2x1) with monthly trend
 */
export const SalesPerformance: React.FC<{ salesData: SalesRecord[] }> = ({ 
  salesData 
}) => {
  const salesMetrics = useMemo(() => {
    if (salesData.length === 0) return null;

    const mtdSales = AnalyticsService.aggregateSalesByPeriod(salesData, 'mtd');
    const lastMonthSales = AnalyticsService.aggregateSalesByPeriod(salesData, 'last-month');
    
    const growth = lastMonthSales.totalRevenue > 0 
      ? ((mtdSales.totalRevenue - lastMonthSales.totalRevenue) / lastMonthSales.totalRevenue) * 100
      : 0;

    return {
      revenue: mtdSales.totalRevenue,
      growth,
      isPositive: growth >= 0
    };
  }, [salesData]);

  return (
    <ModernCard variant="elevated" className="h-full relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-vyndo-primary-50/30 to-transparent pointer-events-none" />
      
      <ModernCardHeader className="relative z-10">
        <ModernCardTitle level={4}>Sales Performance</ModernCardTitle>
      </ModernCardHeader>

      <ModernCardContent className="relative z-10">
        {salesMetrics ? (
          <>
            <div className="text-2xl font-bold text-vyndo-neutral-900 mb-1">
              ₹{(salesMetrics.revenue / 100000).toFixed(1)}L
            </div>
            <div className="text-sm text-vyndo-neutral-600 mb-3">
              Month-to-date revenue
            </div>
            <div className={cn(
              'flex items-center text-sm font-medium',
              salesMetrics.isPositive ? 'text-vyndo-success-600' : 'text-vyndo-danger-600'
            )}>
              {salesMetrics.isPositive ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              {salesMetrics.growth >= 0 ? '+' : ''}{salesMetrics.growth.toFixed(1)}% vs last month
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <TrendingUp className="h-8 w-8 text-vyndo-neutral-400 mx-auto mb-2" />
            <p className="text-sm text-vyndo-neutral-600">No sales data</p>
          </div>
        )}
      </ModernCardContent>
    </ModernCard>
  );
};

/**
 * FourMonthGoalTracker - Secondary slot (2x1) preserving existing logic
 */
export const FourMonthGoalTracker: React.FC<{ inventoryData: InventoryItem[] }> = ({ 
  inventoryData 
}) => {
  const goalMetrics = useMemo(() => {
    if (inventoryData.length === 0) return null;

    const analyses = inventoryData.map(item => AnalyticsService.analyzeStock(item));
    
    // Average Days of Cover (Target ≤ 30 days) - PRESERVED LOGIC
    const validDaysOfCover = analyses
      .map(a => a.daysOfCover)
      .filter(doc => doc !== Infinity && doc > 0);
    
    const avgDaysOfCover = validDaysOfCover.length > 0 
      ? validDaysOfCover.reduce((sum, doc) => sum + doc, 0) / validDaysOfCover.length 
      : 0;

    const progress = Math.min(100, Math.max(0, (30 - avgDaysOfCover) / 30 * 100));
    const status = avgDaysOfCover <= 30 ? 'excellent' : avgDaysOfCover <= 45 ? 'good' : 'warning';

    return {
      avgDaysOfCover,
      progress,
      status,
      target: 30
    };
  }, [inventoryData]);

  return (
    <ModernCard variant="elevated" className="h-full relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-vyndo-warning-50/30 to-transparent pointer-events-none" />
      
      <ModernCardHeader className="relative z-10">
        <div className="flex items-center">
          <Target className="h-5 w-5 text-vyndo-primary-600 mr-2" />
          <ModernCardTitle level={4}>4-Month Goal</ModernCardTitle>
        </div>
      </ModernCardHeader>

      <ModernCardContent className="relative z-10">
        {goalMetrics ? (
          <>
            <div className="text-2xl font-bold text-vyndo-neutral-900 mb-1">
              {goalMetrics.avgDaysOfCover.toFixed(1)} days
            </div>
            <div className="text-sm text-vyndo-neutral-600 mb-3">
              Avg. days of cover (Target: ≤{goalMetrics.target})
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-vyndo-neutral-600">
                <span>Progress to Goal</span>
                <span>{Math.round(goalMetrics.progress)}%</span>
              </div>
              <div className="w-full bg-vyndo-neutral-200 rounded-full h-2">
                <div 
                  className={cn(
                    'h-2 rounded-full transition-all duration-500',
                    {
                      'bg-vyndo-success-500': goalMetrics.status === 'excellent',
                      'bg-vyndo-primary-500': goalMetrics.status === 'good',
                      'bg-vyndo-warning-500': goalMetrics.status === 'warning',
                    }
                  )}
                  style={{ width: `${Math.min(100, goalMetrics.progress)}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <Target className="h-8 w-8 text-vyndo-neutral-400 mx-auto mb-2" />
            <p className="text-sm text-vyndo-neutral-600">No data available</p>
          </div>
        )}
      </ModernCardContent>
    </ModernCard>
  );
};

/**
 * RestockUrgency - Tertiary slot (1x1) with click handler
 */
export const RestockUrgency: React.FC<{ 
  inventoryData: InventoryItem[];
  onClick?: () => void;
}> = ({ inventoryData, onClick }) => {
  const urgentCount = useMemo(() => {
    if (inventoryData.length === 0) return 0;
    
    const analyses = inventoryData.map(item => AnalyticsService.analyzeStock(item));
    return analyses.filter(a => 
      a.stockStatus === STOCK_STATUS.OUT_OF_STOCK || 
      a.stockStatus === STOCK_STATUS.UNDERSTOCK
    ).length;
  }, [inventoryData]);

  return (
    <ModernCard 
      variant="interactive" 
      className="h-full relative overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      {/* Background gradient - red theme for urgency */}
      <div className="absolute inset-0 bg-gradient-to-br from-vyndo-danger-50/50 to-transparent pointer-events-none" />
      
      <ModernCardContent className="relative z-10 text-center">
        <AlertTriangle className="h-8 w-8 text-vyndo-danger-500 mx-auto mb-3" />
        <div className="text-3xl font-bold text-vyndo-danger-700 mb-1">
          {urgentCount}
        </div>
        <div className="text-sm text-vyndo-neutral-600">
          Restock Urgency
        </div>
      </ModernCardContent>
    </ModernCard>
  );
};

/**
 * ExpiryRisk - Tertiary slot (1x1) with click handler
 */
export const ExpiryRisk: React.FC<{ 
  inventoryData: InventoryItem[];
  onClick?: () => void;
}> = ({ inventoryData, onClick }) => {
  const expiryMetrics = useMemo(() => {
    if (inventoryData.length === 0) return { count: 0, percentage: 0 };
    
    const analyses = inventoryData.map(item => AnalyticsService.analyzeStock(item));
    const expiryCount = analyses.filter(a => a.stockStatus === STOCK_STATUS.EXPIRY_RISK).length;
    const percentage = (expiryCount / inventoryData.length) * 100;
    
    return { count: expiryCount, percentage };
  }, [inventoryData]);

  return (
    <ModernCard 
      variant="interactive" 
      className="h-full relative overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      {/* Background gradient - red theme for expiry risk */}
      <div className="absolute inset-0 bg-gradient-to-br from-vyndo-danger-50/50 to-transparent pointer-events-none" />
      
      <ModernCardContent className="relative z-10 text-center">
        <Calendar className="h-8 w-8 text-vyndo-danger-500 mx-auto mb-3" />
        <div className="text-3xl font-bold text-vyndo-danger-700 mb-1">
          {expiryMetrics.percentage.toFixed(1)}%
        </div>
        <div className="text-sm text-vyndo-neutral-600">
          Expiry Risk
        </div>
      </ModernCardContent>
    </ModernCard>
  );
};

/**
 * TopPerformingLocation - Tertiary slot (1x1)
 */
export const TopPerformingLocation: React.FC<{ 
  salesData: SalesRecord[];
  onClick?: (location: string) => void;
}> = ({ salesData, onClick }) => {
  const topLocation = useMemo(() => {
    if (salesData.length === 0) return null;
    
    const locationSales = AnalyticsService.aggregateSalesByLocation(salesData, 'mtd');
    let topLoc = { name: '', revenue: 0 };
    
    locationSales.forEach((sales, location) => {
      if (sales.totalRevenue > topLoc.revenue) {
        topLoc = { name: location, revenue: sales.totalRevenue };
      }
    });
    
    return topLoc.name ? topLoc : null;
  }, [salesData]);

  return (
    <ModernCard 
      variant="interactive" 
      className="h-full relative overflow-hidden cursor-pointer"
      onClick={() => topLocation && onClick?.(topLocation.name)}
    >
      {/* Background gradient - success theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-vyndo-success-50/50 to-transparent pointer-events-none" />
      
      <ModernCardContent className="relative z-10 text-center">
        <MapPin className="h-8 w-8 text-vyndo-success-600 mx-auto mb-3" />
        {topLocation ? (
          <>
            <div className="text-lg font-bold text-vyndo-success-700 mb-1 truncate">
              {topLocation.name.split('-')[0]}
            </div>
            <div className="text-sm text-vyndo-neutral-600">
              Top Location
            </div>
          </>
        ) : (
          <div className="text-sm text-vyndo-neutral-600">
            No sales data
          </div>
        )}
      </ModernCardContent>
    </ModernCard>
  );
};

/**
 * ActiveSkuCount - Tertiary slot (1x1)
 */
export const ActiveSkuCount: React.FC<{ inventoryData: InventoryItem[] }> = ({ 
  inventoryData 
}) => {
  const activeCount = useMemo(() => {
    return inventoryData.filter(item => item.totalSellable > 0).length;
  }, [inventoryData]);

  return (
    <ModernCard variant="flat" className="h-full relative overflow-hidden">
      {/* Background gradient - neutral theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-vyndo-neutral-50/50 to-transparent pointer-events-none" />
      
      <ModernCardContent className="relative z-10 text-center">
        <Package className="h-8 w-8 text-vyndo-primary-600 mx-auto mb-3" />
        <div className="text-3xl font-bold text-vyndo-primary-700 mb-1">
          {activeCount.toLocaleString()}
        </div>
        <div className="text-sm text-vyndo-neutral-600">
          Active SKUs
        </div>
      </ModernCardContent>
    </ModernCard>
  );
};

export type { BentoKpiCardsProps };