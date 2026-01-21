import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Filter, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { InventoryItem, SalesRecord, Platform } from '../types';
import { PLATFORM } from '../types';
import { BrandHealthGauge } from './BrandHealthGauge';
import { GeographicBubbleChart, type GeographicDataPoint } from './GeographicBubbleChart';
import { CollapsibleDetailTable } from './CollapsibleDetailTable';
import { AnalyticsService } from '../services/AnalyticsService';
import { DataService } from '../services/DataService';

interface ExecutiveDashboardProps {
  inventoryData: InventoryItem[];
  salesData: SalesRecord[];
  activePlatform?: Platform;
}

interface CashAtRiskData {
  totalValue: number;
  itemCount: number;
  byPlatform: {
    blinkit: number;
    amazon: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  inventoryData,
  salesData,
  activePlatform = PLATFORM.ALL
}) => {
  const [dateRange, setDateRange] = useState<'7d' | '15d' | '30d' | 'mtd' | 'ytd'>('30d');
  const [platformFilter, setPlatformFilter] = useState<Platform>(activePlatform);

  // Update platform filter when activePlatform prop changes
  useEffect(() => {
    setPlatformFilter(activePlatform);
  }, [activePlatform]);

  // Filter data by platform
  const filteredInventory = useMemo(() => {
    if (platformFilter === PLATFORM.ALL) return inventoryData;
    return inventoryData.filter(item => item.platform === platformFilter);
  }, [inventoryData, platformFilter]);

  const filteredSales = useMemo(() => {
    if (platformFilter === PLATFORM.ALL) return salesData;
    return salesData.filter(record => record.platform === platformFilter);
  }, [salesData, platformFilter]);

  // Calculate Cash at Risk (items with >90 days DOC)
  const cashAtRiskData = useMemo((): CashAtRiskData => {
    let totalValue = 0;
    let itemCount = 0;
    const byPlatform = { blinkit: 0, amazon: 0 };

    filteredInventory.forEach(item => {
      const velocity = AnalyticsService.calculateSalesVelocity(item);
      const daysOfCover = AnalyticsService.calculateDaysOfCover(item, velocity);
      
      if (daysOfCover > 90) {
        // Estimate value: assume average price of ₹100 per unit (can be enhanced with actual pricing data)
        const estimatedValue = item.totalSellable * 100;
        totalValue += estimatedValue;
        itemCount++;

        if (item.platform === PLATFORM.BLINKIT) {
          byPlatform.blinkit += estimatedValue;
        } else if (item.platform === PLATFORM.AMAZON) {
          byPlatform.amazon += estimatedValue;
        }
      }
    });

    // Determine severity based on total value
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (totalValue > 10000000) severity = 'critical'; // >1 Crore
    else if (totalValue > 5000000) severity = 'high'; // >50 Lakhs
    else if (totalValue > 1000000) severity = 'medium'; // >10 Lakhs

    return { totalValue, itemCount, byPlatform, severity };
  }, [filteredInventory]);

  // Calculate Brand Health Score
  const brandHealthScore = useMemo(() => {
    // Simplified calculation - can be enhanced with actual metrics
    const totalItems = filteredInventory.length;
    if (totalItems === 0) return { overall: 0, blinkit: 0, amazon: 0, trend: 'stable' as const };

    let healthyCount = 0;
    let blinkitHealthy = 0;
    let amazonHealthy = 0;
    let blinkitTotal = 0;
    let amazonTotal = 0;

    filteredInventory.forEach(item => {
      const velocity = AnalyticsService.calculateSalesVelocity(item);
      const daysOfCover = AnalyticsService.calculateDaysOfCover(item, velocity);
      const status = AnalyticsService.classifyStockStatusStrategic(daysOfCover);

      if (status === 'healthy') {
        healthyCount++;
        if (item.platform === PLATFORM.BLINKIT) {
          blinkitHealthy++;
        } else if (item.platform === PLATFORM.AMAZON) {
          amazonHealthy++;
        }
      }

      if (item.platform === PLATFORM.BLINKIT) blinkitTotal++;
      else if (item.platform === PLATFORM.AMAZON) amazonTotal++;
    });

    const overall = Math.round((healthyCount / totalItems) * 100);
    const blinkit = blinkitTotal > 0 ? Math.round((blinkitHealthy / blinkitTotal) * 100) : 0;
    const amazon = amazonTotal > 0 ? Math.round((amazonHealthy / amazonTotal) * 100) : 0;
    const trend = 'stable' as const; // Placeholder - would need historical data

    return { overall, blinkit, amazon, trend };
  }, [filteredInventory]);

  // Calculate Geographic Sales Data
  const geographicSalesData = useMemo((): GeographicDataPoint[] => {
    const cityMap = new Map<string, { volume: number; revenue: number }>();

    filteredSales.forEach(record => {
      const city = record.supplyCity || record.customerCity || 'Unknown';
      if (!cityMap.has(city)) {
        cityMap.set(city, { volume: 0, revenue: 0 });
      }
      const data = cityMap.get(city)!;
      data.volume += record.quantity;
      data.revenue += record.quantity * record.sellingPrice;
    });

    // Convert to GeographicDataPoint format
    const validRegions = ['Ahmedabad', 'Mumbai', 'Bangalore'];
    const totalRevenue = Array.from(cityMap.values()).reduce((sum, data) => sum + data.revenue, 0);

    return Array.from(cityMap.entries())
      .filter(([city]) => validRegions.includes(city))
      .map(([city, data]) => ({
        region: city as 'Ahmedabad' | 'Mumbai' | 'Bangalore',
        salesVolume: data.volume,
        growthRate: 0, // Placeholder - would need historical data
        roi: 0, // Placeholder - would need campaign data
        marketShare: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
      }))
      .sort((a, b) => b.salesVolume - a.salesVolume);
  }, [filteredSales]);

  // Calculate Ad Efficiency Data (placeholder - would need actual ad campaign data)
  const adEfficiencyData = useMemo((): GeographicDataPoint[] => {
    // This would be populated from MarketingService with actual campaign data
    return [
      { region: 'Mumbai', salesVolume: 150000, growthRate: 15, roi: 200, marketShare: 40 },
      { region: 'Bangalore', salesVolume: 100000, growthRate: 10, roi: 150, marketShare: 30 },
      { region: 'Ahmedabad', salesVolume: 90000, growthRate: 20, roi: 200, marketShare: 30 }
    ];
  }, []);

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${value.toLocaleString('en-IN')}`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Executive Dashboard
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Strategic overview of inventory health and business performance
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Date Range Selector */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="7d">Last 7 Days</option>
              <option value="15d">Last 15 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="mtd">Month to Date</option>
              <option value="ytd">Year to Date</option>
            </select>
          </div>

          {/* Platform Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as Platform)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value={PLATFORM.ALL}>All Platforms</option>
              <option value={PLATFORM.BLINKIT}>Blinkit</option>
              <option value={PLATFORM.AMAZON}>Amazon</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2x2 Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Left: Brand Health Gauge */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Brand Health Score
          </h2>
          <BrandHealthGauge
            overallMetrics={{
              stockAvailability: brandHealthScore.overall,
              turnoverRate: 75, // Placeholder
              expiryRisk: 20, // Placeholder
              replenishmentEfficiency: 80 // Placeholder
            }}
            blinkitMetrics={{
              stockAvailability: brandHealthScore.blinkit,
              turnoverRate: 75,
              expiryRisk: 20,
              replenishmentEfficiency: 80
            }}
            amazonMetrics={{
              stockAvailability: brandHealthScore.amazon,
              turnoverRate: 70,
              expiryRisk: 25,
              replenishmentEfficiency: 75
            }}
            showPlatformBreakdown={platformFilter === PLATFORM.ALL}
            trend={brandHealthScore.trend}
          />
        </div>

        {/* Top Right: Cash at Risk Card */}
        <div className={`rounded-2xl shadow-sm border p-6 ${getSeverityColor(cashAtRiskData.severity)}`}>
          <h2 className="text-lg font-semibold mb-2">
            Cash at Risk
          </h2>
          <p className="text-sm opacity-80 mb-4">
            Inventory with &gt;90 days of cover
          </p>
          
          <div className="space-y-4">
            <div>
              <div className="text-4xl font-bold">
                {formatCurrency(cashAtRiskData.totalValue)}
              </div>
              <div className="text-sm mt-1 opacity-80">
                {cashAtRiskData.itemCount} items at risk
              </div>
            </div>

            {platformFilter === PLATFORM.ALL && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-current/20">
                <div>
                  <div className="text-xs opacity-70 mb-1">Blinkit</div>
                  <div className="text-lg font-semibold">
                    {formatCurrency(cashAtRiskData.byPlatform.blinkit)}
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-70 mb-1">Amazon</div>
                  <div className="text-lg font-semibold">
                    {formatCurrency(cashAtRiskData.byPlatform.amazon)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Left: Geographic Sales Map */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Geographic Sales Distribution
          </h2>
          <GeographicBubbleChart
            data={geographicSalesData}
            showLegend={true}
          />
        </div>

        {/* Bottom Right: Ad Efficiency Map */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Ad Efficiency by Region
          </h2>
          <GeographicBubbleChart
            data={adEfficiencyData}
            showLegend={true}
          />
        </div>
      </div>

      {/* Collapsible Detail Tables */}
      <div className="space-y-4">
        {/* SKU-Level Brand Health Details */}
        <CollapsibleDetailTable
          title="SKU-Level Brand Health Details"
          data={filteredInventory.slice(0, 50).map(item => {
            const velocity = AnalyticsService.calculateSalesVelocity(item);
            const daysOfCover = AnalyticsService.calculateDaysOfCover(item, velocity);
            const status = AnalyticsService.classifyStockStatusStrategic(daysOfCover);
            
            return {
              'SKU': item.itemId,
              'Product Name': item.itemName,
              'Platform': item.platform || 'Blinkit',
              'Current Stock': item.totalSellable,
              'Days of Cover': daysOfCover === Infinity ? '∞' : Math.round(daysOfCover),
              'Status': status,
              'Warehouse': item.warehouseFacilityName
            };
          })}
          columns={[
            { key: 'SKU', header: 'SKU' },
            { key: 'Product Name', header: 'Product Name' },
            { key: 'Platform', header: 'Platform' },
            { key: 'Current Stock', header: 'Current Stock' },
            { key: 'Days of Cover', header: 'Days of Cover' },
            { key: 'Status', header: 'Status' },
            { key: 'Warehouse', header: 'Warehouse' }
          ]}
          defaultCollapsed={true}
        />

        {/* Region-Level Sales Breakdown */}
        <CollapsibleDetailTable
          title="Region-Level Sales Breakdown"
          data={geographicSalesData.map(item => ({
            'City': item.region,
            'Sales Volume': item.salesVolume.toLocaleString(),
            'Market Share': `${item.marketShare.toFixed(1)}%`,
            'Growth Rate': `${item.growthRate.toFixed(1)}%`
          }))}
          columns={[
            { key: 'City', header: 'City' },
            { key: 'Sales Volume', header: 'Sales Volume' },
            { key: 'Market Share', header: 'Market Share' },
            { key: 'Growth Rate', header: 'Growth Rate' }
          ]}
          defaultCollapsed={true}
        />

        {/* Ad Campaign Details */}
        <CollapsibleDetailTable
          title="Ad Campaign Performance Details"
          data={adEfficiencyData.map(item => ({
            'Region': item.region,
            'Sales Volume': item.salesVolume.toLocaleString(),
            'ROI': `${item.roi}%`,
            'Market Share': `${item.marketShare.toFixed(1)}%`
          }))}
          columns={[
            { key: 'Region', header: 'Region' },
            { key: 'Sales Volume', header: 'Sales Volume' },
            { key: 'ROI', header: 'ROI' },
            { key: 'Market Share', header: 'Market Share' }
          ]}
          defaultCollapsed={true}
        />
      </div>
    </div>
  );
};
