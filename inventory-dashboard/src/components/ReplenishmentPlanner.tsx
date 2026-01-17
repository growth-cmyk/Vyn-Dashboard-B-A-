import React, { useState, useMemo, useEffect } from 'react';
import { Package, Settings, Download, AlertCircle, Clock, TrendingUp, Calendar, Info, AlertTriangle } from 'lucide-react';
import type { InventoryItem, CumulativeHistoryData, Platform } from '../types';
import { Z_TABLE } from '../types';
import { AnalyticsService, ExportService, HistoryService } from '../services';
import { ReplenishmentService } from '../services/ReplenishmentService';
import { storageLayer } from '../services/StorageLayer';

interface ReplenishmentPlannerProps {
  inventoryData: InventoryItem[];
  cumulativeHistory?: CumulativeHistoryData | null;
  platform?: Platform;
}

// Local storage keys for persistence (fallback only)
const STORAGE_KEYS = {
  LEAD_TIME: 'vyndo_replenishment_lead_time',
  SAFETY_DAYS: 'vyndo_replenishment_safety_days',
  SERVICE_LEVEL: 'vyndo_service_level',
  FORECAST_QUANTITIES: 'vyndo_forecast_quantities'
};

// Service level options for statistical ROP
const SERVICE_LEVELS = [85, 90, 95, 98, 99, 99.8];

export const ReplenishmentPlanner: React.FC<ReplenishmentPlannerProps> = ({ 
  inventoryData, 
  cumulativeHistory, 
  platform: _platform 
}) => {
  // Load settings from cloud/localStorage
  const [leadTime, setLeadTime] = useState(15); // Default 15 days
  const [safetyDays, setSafetyDays] = useState(3); // Default 3 days
  const [serviceLevel, setServiceLevel] = useState(95); // Default 95%
  const [forecastQuantities, setForecastQuantities] = useState<Record<string, number>>({});
  const [showConfig, setShowConfig] = useState(false);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);

  // Load preferences from cloud on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const cloudPrefs = await storageLayer.getUserPreferences();
        
        if (cloudPrefs) {
          setServiceLevel(cloudPrefs.serviceLevel);
          setForecastQuantities(cloudPrefs.forecastQuantities);
          setLeadTime(cloudPrefs.leadTime);
          setSafetyDays(cloudPrefs.safetyDays);
        } else {
          // Fallback to localStorage if no cloud data
          const savedServiceLevel = localStorage.getItem(STORAGE_KEYS.SERVICE_LEVEL);
          const savedForecastQty = localStorage.getItem(STORAGE_KEYS.FORECAST_QUANTITIES);
          const savedLeadTime = localStorage.getItem(STORAGE_KEYS.LEAD_TIME);
          const savedSafetyDays = localStorage.getItem(STORAGE_KEYS.SAFETY_DAYS);
          
          if (savedServiceLevel) setServiceLevel(parseFloat(savedServiceLevel));
          if (savedForecastQty) setForecastQuantities(JSON.parse(savedForecastQty));
          if (savedLeadTime) setLeadTime(parseInt(savedLeadTime, 10));
          if (savedSafetyDays) setSafetyDays(parseInt(savedSafetyDays, 10));
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      } finally {
        setIsLoadingPreferences(false);
      }
    };

    loadPreferences();
  }, []);

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

  // Sync preferences to cloud when they change
  const syncPreferences = async (updates: Partial<{
    serviceLevel: number;
    forecastQuantities: Record<string, number>;
    leadTime: number;
    safetyDays: number;
  }>) => {
    const preferences = {
      serviceLevel: updates.serviceLevel ?? serviceLevel,
      forecastQuantities: updates.forecastQuantities ?? forecastQuantities,
      leadTime: updates.leadTime ?? leadTime,
      safetyDays: updates.safetyDays ?? safetyDays
    };

    try {
      await storageLayer.syncUserPreferences(preferences);
    } catch (error) {
      console.error('Failed to sync preferences:', error);
    }
  };

  // Handle setting changes with cloud sync
  const handleLeadTimeChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 30) {
      setLeadTime(numValue);
      syncPreferences({ leadTime: numValue });
    }
  };

  const handleSafetyDaysChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 14) {
      setSafetyDays(numValue);
      syncPreferences({ safetyDays: numValue });
    }
  };

  const handleServiceLevelChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && SERVICE_LEVELS.includes(numValue)) {
      setServiceLevel(numValue);
      syncPreferences({ serviceLevel: numValue });
    }
  };

  const handleForecastQuantityChange = (itemKey: string, value: number) => {
    const newForecastQuantities = {
      ...forecastQuantities,
      [itemKey]: Math.max(0, value || 0)
    };
    setForecastQuantities(newForecastQuantities);
    syncPreferences({ forecastQuantities: newForecastQuantities });
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

  // Export purchase order CSV with Statistical ROP data
  const handleExportPurchaseOrder = () => {
    if (recommendations.length === 0) {
      alert('No items need restocking at this time.');
      return;
    }

    const csvData = recommendations.map(rec => {
      const itemKey = `${rec.itemId}-${rec.warehouseFacilityId}`;
      const forecastQty = forecastQuantities[itemKey] || 0;
      
      // Calculate ROP using ReplenishmentService
      const ropResult = ReplenishmentService.calculateStatisticalROP(
        currentInventoryData.find(item => 
          item.itemId === rec.itemId && 
          item.warehouseFacilityId === rec.warehouseFacilityId
        )!,
        'Blinkit',
        serviceLevel,
        forecastQty
      );

      return {
        'SKU ID': rec.itemId,
        'Product Name': rec.itemName,
        'Location': rec.warehouseFacilityName,
        'Current Stock': rec.currentStock,
        'ROP (Reorder Point)': ropResult.rop,
        'Current Stock vs ROP': rec.currentStock - ropResult.rop,
        'Safety Stock': ropResult.safetyStock,
        'Recommended Order Quantity': rec.recommendedOrderQuantity,
        'Sales Velocity (Daily)': rec.salesVelocity.toFixed(2),
        'Days of Cover': Math.round(rec.daysOfCover),
        'Service Level (%)': ropResult.serviceLevel,
        'Standard Deviation (σ)': ropResult.standardDeviation.toFixed(2),
        'Calculation Method': ropResult.calculationMethod === 'statistical' ? 'Statistical' : 'Simple (No Monthly Data)',
        'Historical Data Source': ropResult.calculationMethod === 'statistical' ? 'Sales File (12 Months)' : 'Simple Fallback',
        'Lead Time (Days)': rec.leadTime,
        'Forecast Qty': forecastQty,
        'Urgency Score': rec.urgencyScore.toFixed(2)
      };
    });

    // Generate filename with service level: vyndo-po-95pct-2026-01-15.csv
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `vyndo-po-${serviceLevel}pct-${dateStr}.csv`;
    
    ExportService.exportToCSV(csvData, filename);
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

  if (isLoadingPreferences) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-vyndo-orange border-t-transparent mx-auto mb-4"></div>
        <h3 className="text-lg font-medium text-vyndo-text mb-2">Loading ROP Settings</h3>
        <p className="text-sm">Syncing your preferences from cloud...</p>
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
            <h3 className="text-md font-medium text-gray-900 mb-3">Statistical ROP Model Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lead Time (Days) - Read Only
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={leadTime}
                  disabled
                  className="w-full rounded-lg border-gray-300 bg-gray-100 shadow-sm cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Platform-specific: 15 days (Blinkit), 7 days (Amazon)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Level (%)
                </label>
                <select
                  value={serviceLevel}
                  onChange={(e) => handleServiceLevelChange(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-vyndo-orange focus:ring-vyndo-orange"
                >
                  {SERVICE_LEVELS.map(level => (
                    <option key={level} value={level}>
                      {level}% (Z = {Z_TABLE[level]})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Target probability of not stocking out (saved automatically)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Safety Stock (Days) - Legacy
                </label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={safetyDays}
                  onChange={(e) => handleSafetyDaysChange(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-vyndo-orange focus:ring-vyndo-orange"
                />
                <p className="text-xs text-gray-500 mt-1">Used for items without monthly demand data</p>
              </div>
            </div>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>ROP Formula:</strong> ROP = (Avg Daily Demand × Lead Time) + Safety Stock
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Safety Stock = σ × √(Lead Time in Months) × Z + Forecast Qty
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
                    Safety Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      ROP (Reorder Point)
                      <div className="group relative ml-1">
                        <Info className="h-4 w-4 text-gray-400 cursor-help" />
                        <div 
                          className="hidden group-hover:block absolute rounded-xl shadow-2xl -left-24 top-6"
                          style={{ 
                            backgroundColor: '#2a0e06', 
                            opacity: 1, 
                            zIndex: 9999, 
                            position: 'absolute',
                            border: '2px solid #ef5326',
                            padding: '16px',
                            color: '#ffffff',
                            fontSize: '12px',
                            minWidth: '280px',
                            maxWidth: '400px',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                          }}
                        >
                          ROP = (Demand during Lead Time) + Safety Stock
                        </div>
                      </div>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Forecast Qty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Historical Data Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Quality
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Urgency
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recommendations.map((rec) => {
                  const itemKey = `${rec.itemId}-${rec.warehouseFacilityId}`;
                  const forecastQty = forecastQuantities[itemKey] || 0;
                  
                  // Get the full inventory item for validation
                  const fullItem = currentInventoryData.find(item => 
                    item.itemId === rec.itemId && 
                    item.warehouseFacilityId === rec.warehouseFacilityId
                  )!;
                  
                  // Validate data quality
                  const dataQuality = ReplenishmentService.validateMonthlyDemandQuality(fullItem.monthlyDemand);
                  
                  // Calculate ROP using ReplenishmentService
                  const ropResult = ReplenishmentService.calculateStatisticalROP(
                    fullItem,
                    'Blinkit',
                    serviceLevel,
                    forecastQty
                  );
                  
                  return (
                    <tr key={itemKey} className="hover:bg-gray-50">
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
                        <div className="text-sm font-medium text-gray-900">{ropResult.safetyStock}</div>
                        <div className="text-xs text-gray-500">
                          {ropResult.calculationMethod === 'statistical' ? 'Statistical' : 'Simple'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center group relative">
                          <div className="text-lg font-bold text-vyndo-orange">
                            {ropResult.rop.toLocaleString()}
                          </div>
                          <Info className="h-4 w-4 text-gray-400 ml-2 cursor-help" />
                          <div 
                            className="hidden group-hover:block absolute rounded-xl shadow-2xl left-0 top-8"
                            style={{ 
                              backgroundColor: '#2a0e06', 
                              opacity: 1, 
                              zIndex: 9999, 
                              position: 'absolute',
                              border: '2px solid #ef5326',
                              padding: '16px',
                              color: '#ffffff',
                              fontSize: '12px',
                              minWidth: '320px',
                              maxWidth: '400px',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                            }}
                          >
                            <div className="font-semibold pb-2 mb-2" style={{ borderBottom: '1px solid #ef5326', color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>ROP Calculation</div>
                            <div style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>Avg Daily Demand: {ropResult.avgDailyDemand.toFixed(2)} units/day</div>
                            <div style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>Lead Time: {Math.round(ropResult.leadTimeMonths * 30)} days</div>
                            <div style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>Demand during Lead Time: {Math.round(ropResult.demandDuringLeadTime)} units</div>
                            <div className="pt-2 mt-2" style={{ borderTop: '1px solid #ef5326' }}>
                              <div style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>Service Level: {ropResult.serviceLevel}% (Z = {ropResult.zScore})</div>
                              {ropResult.calculationMethod === 'statistical' && (
                                <div style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>Std Deviation (σ): {ropResult.standardDeviation.toFixed(2)} units/month</div>
                              )}
                              <div style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>Safety Stock: {ropResult.safetyStock} units</div>
                              {forecastQty > 0 && (
                                <div style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>Forecast Qty: +{forecastQty} units</div>
                              )}
                            </div>
                            <div className="pt-2 mt-2 font-semibold" style={{ borderTop: '1px solid #ef5326', color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                              ROP = {Math.round(ropResult.demandDuringLeadTime)} + {ropResult.safetyStock} = {ropResult.rop} units
                            </div>
                            <div className="italic mt-2" style={{ color: '#ffffff', opacity: 0.8, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                              Method: {ropResult.calculationMethod === 'statistical' ? 'Statistical' : 'Simple (no monthly data)'}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {rec.currentStock < ropResult.rop ? 'Below ROP' : 'Above ROP'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          value={forecastQty}
                          onChange={(e) => handleForecastQuantityChange(itemKey, parseInt(e.target.value) || 0)}
                          className="w-20 rounded border-gray-300 text-sm focus:border-vyndo-orange focus:ring-vyndo-orange"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ropResult.calculationMethod === 'statistical' ? (
                          <div className="flex items-center text-green-600">
                            <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm font-medium">Sales File (12 Months)</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-amber-600">
                            <AlertTriangle className="h-5 w-5 mr-1" />
                            <span className="text-sm font-medium">Simple Fallback</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {!dataQuality.isValid || dataQuality.hasWarnings ? (
                          <div className="group relative">
                            <AlertTriangle className="h-5 w-5 text-amber-500 cursor-help" />
                            <div 
                              className="hidden group-hover:block absolute rounded-xl shadow-2xl right-0 top-6"
                              style={{ 
                                backgroundColor: '#2a0e06', 
                                opacity: 1, 
                                zIndex: 9999, 
                                position: 'absolute',
                                border: '2px solid #ef5326',
                                padding: '16px',
                                color: '#ffffff',
                                fontSize: '12px',
                                minWidth: '320px',
                                maxWidth: '400px',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                              }}
                            >
                              <div className="font-semibold mb-3" style={{ color: '#fbbf24', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>⚠️ Data Quality Issues Detected</div>
                              
                              {/* Show specific reasons */}
                              <div className="space-y-1 mb-3" style={{ color: '#ffffff' }}>
                                {dataQuality.warnings.map((warning, idx) => {
                                  // Parse warning to show specific details
                                  if (warning.includes('months of data')) {
                                    const monthCount = warning.match(/\d+/)?.[0] || '0';
                                    return (
                                      <div key={idx} className="flex items-start" style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                        <span className="mr-2">•</span>
                                        <span>Only <strong>{monthCount} months</strong> of sales history found (need 12 for accurate ROP)</span>
                                      </div>
                                    );
                                  } else if (warning.includes('No demand data')) {
                                    return (
                                      <div key={idx} className="flex items-start" style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                        <span className="mr-2">•</span>
                                        <span>No sales data available for this SKU</span>
                                      </div>
                                    );
                                  } else if (warning.includes('High variability')) {
                                    return (
                                      <div key={idx} className="flex items-start" style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                        <span className="mr-2">•</span>
                                        <span>Sales pattern is highly variable (CV &gt; 50%)</span>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div key={idx} className="flex items-start" style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                        <span className="mr-2">•</span>
                                        <span>{warning}</span>
                                      </div>
                                    );
                                  }
                                })}
                              </div>
                              
                              {/* Show fallback method */}
                              <div className="italic mt-3 pt-3" style={{ color: '#ffffff', borderTop: '1px solid #ef5326', opacity: 0.9, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                <strong>Fallback:</strong> Using {ropResult.calculationMethod} calculation
                              </div>
                              
                              {/* Show recommendation */}
                              <div className="mt-3 pt-3" style={{ color: '#93c5fd', borderTop: '1px solid #ef5326', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                <strong>💡 Tip:</strong> Upload more sales history for better accuracy
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-green-600 text-sm">✓ OK</div>
                        )}
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
                  );
                })}
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