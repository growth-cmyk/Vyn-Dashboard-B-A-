import React, { useState, useMemo, useEffect } from 'react';
import { Package, Settings, Download, AlertCircle, Clock, TrendingUp, Calendar } from 'lucide-react';
import type { InventoryItem, CumulativeHistoryData, Platform } from '../types';
import { AnalyticsService, ExportService, HistoryService } from '../services';

interface ReplenishmentPlannerProps {
  inventoryData: InventoryItem[];
  cumulativeHistory?: CumulativeHistoryData | null;
  platform?: Platform;
}

// Local storage keys for persistence
const STORAGE_KEYS = {
  LEAD_TIME: 'vyndo_replenishment_lead_time',
  SAFETY_DAYS: 'vyndo_replenishment_safety_days'
};

export const ReplenishmentPlanner: React.FC<ReplenishmentPlannerProps> = ({ 
  inventoryData, 
  cumulativeHistory, 
  platform: _platform 
}) => {
  // Load settings from localStorage or use defaults
  const [leadTime, setLeadTime] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LEAD_TIME);
    return saved ? parseInt(saved, 10) : 15; // Updated default to 15 days
  });
  
  const [safetyDays, setSafetyDays] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SAFETY_DAYS);
    return saved ? parseInt(saved, 10) : 3; // Remains 3 days
  });
  
  const [showConfig, setShowConfig] = useState(false);

  // Filter inventory to latest date when cumulative history is available
  const currentInventoryData = useMemo(() => {
    if (cumulativeHistory && cumulativeHistory.uploadDates.length > 0) {
      // Use latest date slice for replenishment calculations
      return HistoryService.getLatestDateSlice(cumulativeHistory);
    }
    // Fallback to provided inventory data
    return inventoryData;
  }, [inventoryData, cumulativeHistory]);

  // Get the data date for display
  const dataDate = useMemo(() => {
    if (cumulativeHistory && cumulativeHistory.latestDate) {
      return cumulativeHistory.latestDate;
    }
    // Fallback to current date if no cumulative history
    return new Date();
  }, [cumulativeHistory]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LEAD_TIME, leadTime.toString());
  }, [leadTime]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SAFETY_DAYS, safetyDays.toString());
  }, [safetyDays]);

  // Handle setting changes with validation
  const handleLeadTimeChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 30) {
      setLeadTime(numValue);
    }
  };

  const handleSafetyDaysChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 14) {
      setSafetyDays(numValue);
    }
  };

  // Calculate replenishment recommendations with current parameters
  const recommendations = useMemo(() => {
    if (currentInventoryData.length === 0) return [];

    // Analyze all items with current lead time and safety stock settings
    const analyses = currentInventoryData.map(item => 
      AnalyticsService.analyzeStock(item, leadTime, safetyDays)
    );

    // Generate recommendations for items that need restocking
    return AnalyticsService.generateReplenishmentRecommendations(currentInventoryData, analyses);
  }, [currentInventoryData, leadTime, safetyDays]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalReorderQuantity = recommendations.reduce((sum, rec) => sum + rec.recommendedOrderQuantity, 0);
    const totalCurrentStock = recommendations.reduce((sum, rec) => sum + rec.currentStock, 0);
    const avgUrgencyScore = recommendations.length > 0 
      ? recommendations.reduce((sum, rec) => sum + rec.urgencyScore, 0) / recommendations.length 
      : 0;

    return {
      itemsNeedingRestock: recommendations.length,
      totalReorderQuantity,
      totalCurrentStock,
      avgUrgencyScore: Math.round(avgUrgencyScore * 100) / 100
    };
  }, [recommendations]);

  // Export purchase order CSV
  const handleExportPurchaseOrder = () => {
    if (recommendations.length === 0) {
      alert('No items need restocking at this time.');
      return;
    }

    const csvData = recommendations.map(rec => ({
      'SKU ID': rec.itemId,
      'Product Name': rec.itemName,
      'Location': rec.warehouseFacilityName,
      'Current Stock': rec.currentStock,
      'Recommended Order Quantity': rec.recommendedOrderQuantity,
      'Sales Velocity (Daily)': rec.salesVelocity.toFixed(2),
      'Days of Cover': Math.round(rec.daysOfCover),
      'Urgency Score': rec.urgencyScore.toFixed(2),
      'Lead Time (Days)': rec.leadTime,
      'Safety Stock (Days)': Math.round(rec.safetyStock / rec.salesVelocity)
    }));

    ExportService.exportToCSV(csvData, `purchase-order-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Format days of cover display
  const formatDaysOfCover = (days: number) => {
    if (days === 0) return '0 days';
    if (days === Infinity) return '∞ days';
    if (days > 365) return `${Math.round(days / 365)} years`;
    if (days > 30) return `${Math.round(days / 30)} months`;
    return `${Math.round(days)} days`;
  };

  if (currentInventoryData.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-vyndo-text mb-2">No Inventory Data</h3>
        <p className="text-sm mb-4">Upload inventory data to generate replenishment recommendations.</p>
        <button className="bg-vyndo-orange text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors">
          Upload Data to Start
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-vyndo-text flex items-center">
                <Package className="h-6 w-6 mr-2 text-vyndo-orange" />
                Replenishment Planner
              </h2>
              <div className="flex items-center space-x-4 mt-1">
                <p className="text-sm text-gray-600">
                  Automated reorder recommendations based on sales velocity and lead times
                </p>
                <div className="flex items-center px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                  <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Data Date: {dataDate.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </button>
              <button
                onClick={handleExportPurchaseOrder}
                disabled={recommendations.length === 0}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-vyndo-orange rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Purchase Order
              </button>
            </div>
          </div>
        </div>

        {/* Configuration Panel */}
        {showConfig && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-md font-medium text-gray-900 mb-3">Replenishment Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lead Time (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={leadTime}
                  onChange={(e) => handleLeadTimeChange(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-vyndo-orange focus:ring-vyndo-orange"
                />
                <p className="text-xs text-gray-500 mt-1">Time between placing order and receiving inventory (saved automatically)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Safety Stock (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={safetyDays}
                  onChange={(e) => handleSafetyDaysChange(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-vyndo-orange focus:ring-vyndo-orange"
                />
                <p className="text-xs text-gray-500 mt-1">Buffer stock to prevent stockouts (saved automatically)</p>
              </div>
            </div>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Formula:</strong> Recommended Order = (Lead Time × Daily Sales) + Safety Stock - Current Stock
              </p>
            </div>
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Supply Chain Note:</strong> Lead Time includes 15-day transit from Vyndo Warehouse to Blinkit Darkstores.
              </p>
            </div>
          </div>
        )}

        {/* Summary Statistics */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-vyndo-text">{summaryStats.itemsNeedingRestock}</div>
              <div className="text-sm text-gray-600">Items Need Restock</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-vyndo-orange">{summaryStats.totalReorderQuantity.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Units to Order</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700">{summaryStats.totalCurrentStock.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Current Stock (Low Items)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{summaryStats.avgUrgencyScore}</div>
              <div className="text-sm text-gray-600">Avg Urgency Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Replenishment Recommendations Table */}
      {recommendations.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Restock Recommendations</h3>
            <p className="text-sm text-gray-600 mt-1">
              Items sorted by urgency (highest sales velocity + lowest days of cover first)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sales Velocity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days of Cover
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recommended Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Urgency
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recommendations.map((rec) => (
                  <tr key={`${rec.itemId}-${rec.warehouseFacilityId}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{rec.itemName}</div>
                      <div className="text-sm text-gray-500">{rec.itemId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rec.warehouseFacilityName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{rec.currentStock.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">units</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{rec.salesVelocity.toFixed(1)}</div>
                      <div className="text-xs text-gray-500">units/day</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 mr-1" />
                        <span className={`text-sm font-medium ${
                          rec.daysOfCover <= 0 ? 'text-red-600' : 
                          rec.daysOfCover < 7 ? 'text-amber-600' : 'text-gray-900'
                        }`}>
                          {formatDaysOfCover(rec.daysOfCover)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-bold text-vyndo-orange">
                        {rec.recommendedOrderQuantity.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        Lead: {rec.leadTime}d + Safety: {Math.round(rec.safetyStock)}u
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {rec.urgencyScore > 10 ? (
                          <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                        ) : rec.urgencyScore > 5 ? (
                          <TrendingUp className="h-4 w-4 text-amber-500 mr-1" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-400 mr-1" />
                        )}
                        <span className={`text-sm font-medium ${
                          rec.urgencyScore > 10 ? 'text-red-600' :
                          rec.urgencyScore > 5 ? 'text-amber-600' : 'text-gray-600'
                        }`}>
                          {rec.urgencyScore.toFixed(1)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
          <Package className="mx-auto h-12 w-12 text-green-400 mb-4" />
          <h3 className="text-lg font-medium text-vyndo-text mb-2">All Items Well Stocked</h3>
          <p className="text-gray-600 mb-4">
            No items currently need restocking based on your lead time ({leadTime} days) and safety stock ({safetyDays} days) settings.
          </p>
          <div className="text-sm text-gray-500">
            Current thresholds: Items with &lt;{leadTime + safetyDays} days of cover will appear here.
          </div>
        </div>
      )}
    </div>
  );
};