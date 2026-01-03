import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { 
  BarChart3, 
  MapPin, 
  Package, 
  TrendingUp, 
  Calendar,
  Crosshair,
  Target
} from 'lucide-react';
import { ModernCard, ModernCardHeader, ModernCardTitle, ModernCardContent } from './ModernCard';
import { SalesHeatmap } from './SalesHeatmap';
import { CapitalTreemap } from './CapitalTreemap';
import { SparklineCard } from './AdvancedSparkline';
import { cn } from '../utils/cn';
import type { InventoryItem, SalesRecord, CumulativeHistoryData, Platform } from '../types';
import { AnalyticsService } from '../services';
import { HistoryService } from '../services/HistoryService';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale
);

interface EnhancedChartsProps {
  inventoryData: InventoryItem[];
  salesData: SalesRecord[];
  onDrillDown?: (type: 'location' | 'sku' | 'status', value: string) => void;
  cumulativeHistory?: CumulativeHistoryData | null;
  platform?: Platform;
}

/**
 * EnhancedCharts - Advanced visualization suite with modern analytics
 * 
 * Features:
 * - Sales Density Heatmap
 * - Capital Distribution Treemap  
 * - Interactive Time-Series with Replenishment Forecast
 * - Sparkline Integration
 * - Crosshair Tooltips
 */
export const EnhancedCharts: React.FC<EnhancedChartsProps> = ({
  inventoryData,
  salesData,
  onDrillDown,
  cumulativeHistory,
  platform
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'heatmap' | 'treemap' | 'forecast'>('overview');

  // Enhanced time-series data with replenishment forecast
  const forecastData = useMemo(() => {
    // Prioritize file-based cumulative history over localStorage snapshots
    if (cumulativeHistory && cumulativeHistory.uploadDates.length > 0) {
      // Use file-based dates for immediate chart population
      const trendData = HistoryService.generateFileBasedTrendData(cumulativeHistory, platform);
      
      if (trendData.labels.length === 0) {
        return {
          labels: [],
          datasets: []
        };
      }

      // Calculate safety stock baseline (global average)
      const analyses = inventoryData.map(item => AnalyticsService.analyzeStock(item));
      const avgSafetyStock = analyses.length > 0 
        ? analyses.reduce((sum, a) => sum + a.safetyStock, 0) / analyses.length 
        : 0;

      // Generate replenishment forecast using file-based data
      const totalUnitsData = trendData.datasets[0]?.data || [];
      let forecastData: number[] = [];
      
      if (totalUnitsData.length >= 2) {
        const recentValues = totalUnitsData.slice(-3);
        const trendSlope = recentValues.length >= 2 
          ? (recentValues[recentValues.length - 1] - recentValues[0]) / recentValues.length
          : 0;
        const lastValue = totalUnitsData[totalUnitsData.length - 1] || 0;
        
        // Project 7 days into the future
        for (let i = 1; i <= 7; i++) {
          forecastData.push(Math.max(0, lastValue + (trendSlope * i)));
        }
      }

      return {
        labels: [...trendData.labels, ...Array.from({length: 7}, (_, i) => `+${i+1}d`)],
        datasets: [
          {
            label: 'Total Inventory',
            data: [...totalUnitsData, ...Array(7).fill(null)],
            borderColor: '#ef5326', // Vyndo Orange
            backgroundColor: 'rgba(239, 83, 38, 0.1)',
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#ef5326',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            fill: false,
          },
          {
            label: 'Replenishment Forecast',
            data: [...Array(totalUnitsData.length).fill(null), ...forecastData],
            borderColor: '#FFB703', // Harvest Gold
            backgroundColor: 'rgba(255, 183, 3, 0.1)',
            borderDash: [5, 5],
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: '#FFB703',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            fill: false,
          },
          {
            label: 'Safety Stock Baseline',
            data: Array(trendData.labels.length + 7).fill(avgSafetyStock),
            borderColor: '#2D6A4F', // Millet Green
            backgroundColor: 'rgba(45, 106, 79, 0.05)',
            borderDash: [2, 2],
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
          }
        ]
      };
    }

    // Fallback to localStorage-based snapshots for backward compatibility
    const snapshots = HistoryService.getInventorySnapshots();
    
    if (snapshots.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    // Sort snapshots by timestamp for chronological progression
    const sortedSnapshots = snapshots.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    const labels = sortedSnapshots.map(snapshot => 
      snapshot.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );

    // Calculate safety stock baseline (global average)
    const analyses = inventoryData.map(item => AnalyticsService.analyzeStock(item));
    const avgSafetyStock = analyses.length > 0 
      ? analyses.reduce((sum, a) => sum + a.safetyStock, 0) / analyses.length 
      : 0;

    // Generate replenishment forecast (simple linear projection)
    const recentTrend = sortedSnapshots.slice(-3);
    let forecastData: number[] = [];
    
    if (recentTrend.length >= 2) {
      const trendSlope = (recentTrend[recentTrend.length - 1].totalUnits - recentTrend[0].totalUnits) / recentTrend.length;
      const lastValue = recentTrend[recentTrend.length - 1].totalUnits;
      
      // Project 7 days into the future
      for (let i = 1; i <= 7; i++) {
        forecastData.push(Math.max(0, lastValue + (trendSlope * i)));
      }
    }

    return {
      labels: [...labels, ...Array.from({length: 7}, (_, i) => `+${i+1}d`)],
      datasets: [
        {
          label: 'Total Inventory',
          data: [...sortedSnapshots.map(s => s.totalUnits), ...Array(7).fill(null)],
          borderColor: '#ef5326', // Vyndo Orange
          backgroundColor: 'rgba(239, 83, 38, 0.1)',
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#ef5326',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          fill: false,
        },
        {
          label: 'Replenishment Forecast',
          data: [...Array(sortedSnapshots.length).fill(null), ...forecastData],
          borderColor: '#FFB703', // Harvest Gold
          backgroundColor: 'rgba(255, 183, 3, 0.1)',
          borderDash: [5, 5],
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: '#FFB703',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          fill: false,
        },
        {
          label: 'Safety Stock Baseline',
          data: Array(labels.length + 7).fill(avgSafetyStock),
          borderColor: '#2D6A4F', // Millet Green
          backgroundColor: 'rgba(45, 106, 79, 0.05)',
          borderDash: [2, 2],
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
        }
      ]
    };
  }, [inventoryData, cumulativeHistory, platform]);

  const forecastOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 12,
            weight: 500,
          },
          color: '#1A1A1A',
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 600,
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label;
            const value = context.parsed.y;
            if (value === null) return '';
            
            if (label === 'Safety Stock Baseline') {
              return `${label}: ${value.toFixed(0)} units (target)`;
            }
            return `${label}: ${value.toLocaleString()} units`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        title: {
          display: true,
          text: 'Timeline (Historical + Forecast)',
          font: {
            size: 12,
            weight: 600,
          },
          color: '#6B7280',
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#6B7280',
          autoSkip: true,
          maxTicksLimit: 15,
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        title: {
          display: true,
          text: 'Inventory Units',
          font: {
            size: 12,
            weight: 600,
          },
          color: '#6B7280',
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#6B7280',
          callback: function(value: any) {
            if (value >= 1000000) {
              return (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
              return (value / 1000).toFixed(0) + 'K';
            }
            return value;
          },
        },
      },
    },
  };

  // Sparkline data for KPI cards
  const sparklineData = useMemo(() => {
    const snapshots = HistoryService.getInventorySnapshots().slice(-7);
    
    return {
      inventory: snapshots.map((s, i) => ({
        value: s.totalUnits,
        date: s.timestamp,
        label: `Day ${i + 1}`
      })),
      outOfStock: snapshots.map((s, i) => ({
        value: s.outOfStockCount,
        date: s.timestamp,
        label: `Day ${i + 1}`
      })),
      expiryRisk: snapshots.map((s, i) => ({
        value: s.expiryRiskCount,
        date: s.timestamp,
        label: `Day ${i + 1}`
      }))
    };
  }, []);

  const handleCityClick = (city: string) => {
    onDrillDown?.('location', city);
  };

  const handleCategoryClick = (category: string) => {
    onDrillDown?.('sku', category);
  };

  if (inventoryData.length === 0 && salesData.length === 0) {
    return (
      <div className="text-center py-12 text-vyndo-neutral-500">
        <BarChart3 className="mx-auto h-12 w-12 text-vyndo-neutral-400 mb-4" />
        <h3 className="text-lg font-medium text-vyndo-neutral-900 mb-2">No Data for Advanced Analytics</h3>
        <p className="text-sm mb-4">Upload inventory and sales data to view advanced visualizations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <ModernCard variant="glass">
        <ModernCardHeader>
          <div className="flex items-center justify-between">
            <ModernCardTitle level={2} className="flex items-center">
              <BarChart3 className="h-6 w-6 mr-2 text-vyndo-primary-600" />
              Advanced Analytics & Visualizations
            </ModernCardTitle>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-vyndo-neutral-500" />
              <span className="text-sm text-vyndo-neutral-600">
                Real-time insights with predictive analytics
              </span>
            </div>
          </div>
          
          {/* Tab Navigation - Premium Pills */}
          <div className="flex space-x-2 mt-4">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'heatmap', label: 'Sales Heatmap', icon: MapPin },
              { id: 'treemap', label: 'Capital Analysis', icon: Package },
              { id: 'forecast', label: 'Forecast', icon: TrendingUp }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'nav-pill flex items-center space-x-2',
                    activeTab === tab.id
                      ? 'nav-pill-active'
                      : 'nav-pill-inactive'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </ModernCardHeader>
      </ModernCard>

      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sparkline KPI Cards */}
          <SparklineCard
            title="Total Inventory Trend"
            data={sparklineData.inventory}
            currentValue={sparklineData.inventory[sparklineData.inventory.length - 1]?.value || 0}
            unit=" units"
          />
          <SparklineCard
            title="Out of Stock Items"
            data={sparklineData.outOfStock}
            currentValue={sparklineData.outOfStock[sparklineData.outOfStock.length - 1]?.value || 0}
            unit=" items"
          />
          <SparklineCard
            title="Expiry Risk Items"
            data={sparklineData.expiryRisk}
            currentValue={sparklineData.expiryRisk[sparklineData.expiryRisk.length - 1]?.value || 0}
            unit=" items"
          />
        </div>
      )}

      {activeTab === 'heatmap' && (
        <SalesHeatmap
          salesData={salesData}
          onCityClick={handleCityClick}
        />
      )}

      {activeTab === 'treemap' && (
        <CapitalTreemap
          inventoryData={inventoryData}
          onCategoryClick={handleCategoryClick}
        />
      )}

      {activeTab === 'forecast' && forecastData.labels.length > 0 && (
        <ModernCard variant="elevated">
          <ModernCardHeader>
            <div className="flex items-center justify-between">
              <ModernCardTitle level={3} className="flex items-center">
                <Crosshair className="h-5 w-5 mr-2 text-vyndo-primary-600" />
                Interactive Replenishment Forecast
              </ModernCardTitle>
              <div className="flex items-center text-sm text-vyndo-neutral-600">
                <Target className="h-4 w-4 mr-1" />
                With Safety Stock Baseline
              </div>
            </div>
            <p className="text-sm text-vyndo-neutral-600 mt-2">
              Historical inventory levels with 7-day replenishment forecast and safety stock targets.
              Hover for crosshair tooltips with exact values.
            </p>
          </ModernCardHeader>
          
          <ModernCardContent>
            <div className="h-[500px] w-full relative">
              <Line data={forecastData} options={forecastOptions} />
            </div>
            
            {/* Forecast Insights */}
            <div className="mt-6 p-4 bg-vyndo-warning-50 border border-vyndo-warning-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <TrendingUp className="h-5 w-5 text-vyndo-warning-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-vyndo-warning-800 mb-1">
                    Replenishment Forecast
                  </h4>
                  <p className="text-sm text-vyndo-warning-700">
                    The dashed orange line shows projected inventory levels based on recent trends. 
                    The green baseline indicates minimum safety stock levels to prevent stockouts. 
                    Plan replenishment orders when forecast approaches the safety baseline.
                  </p>
                </div>
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>
      )}

      {/* Strategic Summary */}
      <ModernCard variant="glass" gradient>
        <ModernCardContent>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-vyndo-neutral-900 mb-2">
              Advanced Analytics Summary
            </h3>
            <p className="text-sm text-vyndo-neutral-600 max-w-2xl mx-auto">
              These advanced visualizations reveal patterns in sales density, capital distribution, 
              and inventory forecasting to support Vyndo's strategic inventory optimization goals. 
              Click on elements to drill down into specific areas for detailed analysis.
            </p>
          </div>
        </ModernCardContent>
      </ModernCard>
    </div>
  );
};

export default EnhancedCharts;