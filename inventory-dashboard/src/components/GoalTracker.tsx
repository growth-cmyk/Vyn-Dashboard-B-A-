import React, { useMemo } from 'react';
import { Target, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import type { InventoryItem } from '../types';
import { AnalyticsService } from '../services';
import { HistoryService } from '../services/HistoryService';
import { STOCK_STATUS } from '../types';

interface GoalTrackerProps {
  inventoryData: InventoryItem[];
}

interface GoalMetric {
  name: string;
  target: string;
  actual: number;
  actualDisplay: string;
  progress: number; // 0-100
  status: 'excellent' | 'good' | 'warning' | 'critical';
  description: string;
}

export const GoalTracker: React.FC<GoalTrackerProps> = ({ inventoryData }) => {
  const goalMetrics = useMemo((): GoalMetric[] => {
    if (inventoryData.length === 0) {
      return [];
    }

    // Calculate current metrics
    const analyses = inventoryData.map(item => AnalyticsService.analyzeStock(item));
    
    // 1. Average Days of Cover (Target ≤ 30 days)
    const validDaysOfCover = analyses
      .map(a => a.daysOfCover)
      .filter(doc => doc !== Infinity && doc > 0);
    
    const avgDaysOfCover = validDaysOfCover.length > 0 
      ? validDaysOfCover.reduce((sum, doc) => sum + doc, 0) / validDaysOfCover.length 
      : 0;

    // 2. Stockout Rate (Target < 5%)
    const outOfStockCount = analyses.filter(a => a.stockStatus === STOCK_STATUS.OUT_OF_STOCK).length;
    const stockoutRate = (outOfStockCount / inventoryData.length) * 100;

    // 3. Overstock Value Reduction (Target -40% from baseline)
    const snapshots = HistoryService.getInventorySnapshots();
    const currentOverstockItems = analyses.filter(a => 
      a.stockStatus === STOCK_STATUS.OVERSTOCK || a.stockStatus === STOCK_STATUS.EXPIRY_RISK
    );
    
    const currentOverstockValue = currentOverstockItems.reduce((sum, analysis) => {
      const item = inventoryData.find(inv => 
        inv.itemId === analysis.itemId && 
        inv.warehouseFacilityId === analysis.warehouseFacilityId
      );
      return sum + (item ? item.totalSellable * 100 : 0); // Estimate ₹100 per unit
    }, 0);

    let overstockReduction = 0;
    if (snapshots.length > 0) {
      const firstSnapshot = snapshots[0];
      const baselineOverstockValue = (firstSnapshot.overstockCount + firstSnapshot.expiryRiskCount) * 100 * 50; // Estimate
      overstockReduction = baselineOverstockValue > 0 
        ? ((baselineOverstockValue - currentOverstockValue) / baselineOverstockValue) * 100
        : 0;
    }

    return [
      {
        name: 'Average Days of Cover',
        target: '≤ 30 days',
        actual: avgDaysOfCover,
        actualDisplay: `${avgDaysOfCover.toFixed(1)} days`,
        progress: Math.min(100, Math.max(0, (30 - avgDaysOfCover) / 30 * 100)),
        status: avgDaysOfCover <= 30 ? 'excellent' : avgDaysOfCover <= 45 ? 'good' : avgDaysOfCover <= 60 ? 'warning' : 'critical',
        description: 'Optimal inventory turnover rate'
      },
      {
        name: 'Stockout Rate',
        target: '< 5%',
        actual: stockoutRate,
        actualDisplay: `${stockoutRate.toFixed(1)}%`,
        progress: Math.min(100, Math.max(0, (5 - stockoutRate) / 5 * 100)),
        status: stockoutRate < 2 ? 'excellent' : stockoutRate < 5 ? 'good' : stockoutRate < 10 ? 'warning' : 'critical',
        description: 'Percentage of SKUs out of stock'
      },
      {
        name: 'Overstock Value Reduction',
        target: '-40%',
        actual: overstockReduction,
        actualDisplay: `${overstockReduction >= 0 ? '+' : ''}${overstockReduction.toFixed(1)}%`,
        progress: Math.min(100, Math.max(0, overstockReduction / 40 * 100)),
        status: overstockReduction >= 40 ? 'excellent' : overstockReduction >= 20 ? 'good' : overstockReduction >= 0 ? 'warning' : 'critical',
        description: 'Reduction in excess inventory value'
      }
    ];
  }, [inventoryData]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'good':
        return <TrendingUp className="h-5 w-5 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Target className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'good':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getProgressBarColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-500';
      case 'good':
        return 'bg-blue-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (inventoryData.length === 0) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center mb-4">
          <Target className="h-6 w-6 text-blue-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">4-Month Strategic Goals</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-sm">Upload inventory data to track strategic goals</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Target className="h-6 w-6 text-blue-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">4-Month Strategic Goals</h3>
        </div>
        <div className="text-sm text-gray-500">
          Based on Vyndo Strategic Roadmap
        </div>
      </div>

      <div className="space-y-4">
        {goalMetrics.map((metric, index) => (
          <div key={index} className={`p-4 rounded-lg border ${getStatusColor(metric.status)}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                {getStatusIcon(metric.status)}
                <div className="ml-3">
                  <h4 className="text-sm font-medium">{metric.name}</h4>
                  <p className="text-xs text-gray-600">{metric.description}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">Target: {metric.target}</div>
                <div className="text-sm">Actual: {metric.actualDisplay}</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Progress to Goal</span>
                <span>{Math.round(metric.progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(metric.status)}`}
                  style={{ width: `${Math.min(100, metric.progress)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Strategic Insight */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Strategic Focus:</strong> These metrics align with Vyndo's 4-month inventory optimization goals. 
          Green indicators show excellent progress toward reducing overstock while maintaining service levels.
        </p>
      </div>
    </div>
  );
};