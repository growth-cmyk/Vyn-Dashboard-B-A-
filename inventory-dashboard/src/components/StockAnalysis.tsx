import React, { useMemo } from 'react';
import { AlertTriangle, AlertCircle, TrendingUp, TrendingDown, Clock, Package, CheckCircle } from 'lucide-react';
import type { InventoryItem } from '../types';
import { AnalyticsService } from '../services';
import { STOCK_STATUS } from '../types';

interface StockAnalysisProps {
  inventoryData: InventoryItem[];
}

export const StockAnalysis: React.FC<StockAnalysisProps> = ({ inventoryData }) => {
  // Calculate stock analyses for all inventory items
  const stockAnalyses = useMemo(() => {
    return inventoryData.map(item => AnalyticsService.analyzeStock(item));
  }, [inventoryData]);

  // Generate stock issue report
  const stockIssueReport = useMemo(() => {
    return AnalyticsService.identifyStockIssues(stockAnalyses);
  }, [stockAnalyses]);

  // Get stock status color and icon (Updated for Strategic Roadmap)
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case STOCK_STATUS.OUT_OF_STOCK:
        return {
          color: 'text-red-600 bg-red-50 border-red-200',
          icon: AlertTriangle,
          label: 'Out of Stock'
        };
      case STOCK_STATUS.UNDERSTOCK:
        return {
          color: 'text-amber-600 bg-amber-50 border-amber-200',
          icon: AlertCircle,
          label: 'Restock Now'
        };
      case STOCK_STATUS.HEALTHY:
        return {
          color: 'text-green-600 bg-green-50 border-green-200',
          icon: CheckCircle,
          label: 'Healthy'
        };
      case STOCK_STATUS.OVERSTOCK:
        return {
          color: 'text-amber-600 bg-amber-50 border-amber-200',
          icon: TrendingUp,
          label: 'Freeze POs'
        };
      case STOCK_STATUS.EXPIRY_RISK:
        return {
          color: 'text-red-600 bg-red-50 border-red-200',
          icon: AlertTriangle,
          label: 'Flash Promo'
        };
      default:
        return {
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          icon: Package,
          label: 'Unknown'
        };
    }
  };

  // Format days of cover display
  const formatDaysOfCover = (days: number) => {
    if (days === 0) return '0 days';
    if (days === Infinity) return '∞ days';
    if (days > 365) return `${Math.round(days / 365)} years`;
    if (days > 30) return `${Math.round(days / 30)} months`;
    return `${Math.round(days)} days`;
  };

  if (inventoryData.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Package className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-vyndo-text">No inventory data</h3>
        <p className="mt-1 text-sm text-gray-500 mb-4">
          Upload inventory data to view stock analysis.
        </p>
        <button className="bg-vyndo-orange text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors">
          Upload Data to Start
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stock Issue Summary Cards (Updated for Strategic Roadmap) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Out of Stock Alert */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">Out of Stock</p>
              <p className="text-2xl font-bold text-red-900">{stockIssueReport.outOfStockItems.length}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-red-700">
            Urgent action required
          </p>
        </div>

        {/* Understock Alert */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-amber-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-amber-800">Restock Now</p>
              <p className="text-2xl font-bold text-amber-900">{stockIssueReport.understockItems.length}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-amber-700">
            &lt;18 days cover
          </p>
        </div>

        {/* Overstock Alert */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-amber-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-amber-800">Freeze POs</p>
              <p className="text-2xl font-bold text-amber-900">{stockIssueReport.overstockItems.length}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-amber-700">
            45-90 days cover
          </p>
        </div>

        {/* Expiry Risk Alert */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">Flash Promo</p>
              <p className="text-2xl font-bold text-red-900">{stockIssueReport.expiryRiskItems?.length || 0}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-red-700">
            &gt;90 days cover
          </p>
        </div>

        {/* Total Issues */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-gray-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-800">Total Issues</p>
              <p className="text-2xl font-bold text-gray-900">{stockIssueReport.totalIssues}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-700">
            {stockIssueReport.criticalIssues} critical
          </p>
        </div>
      </div>

      {/* Critical Issues Section */}
      {stockIssueReport.criticalIssues > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              Critical Stock Issues
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Items requiring immediate attention
            </p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {/* Out of Stock Items */}
              {stockIssueReport.outOfStockItems.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-red-800 mb-3">
                    Out of Stock ({stockIssueReport.outOfStockItems.length} items)
                  </h4>
                  <div className="space-y-2">
                    {stockIssueReport.outOfStockItems.map((analysis) => {
                      const item = inventoryData.find(inv => inv.itemId === analysis.itemId);
                      return (
                        <div key={`${analysis.itemId}-${analysis.warehouseFacilityId}`} 
                             className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-red-900 truncate">{item?.itemName || analysis.itemId}</p>
                            <p className="text-sm text-red-700 truncate">{item?.warehouseFacilityName}</p>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <p className="text-sm font-medium text-red-800">0 units</p>
                            <p className="text-xs text-red-600">Velocity: {analysis.salesVelocity.toFixed(1)}/day</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Understock Items */}
              {stockIssueReport.understockItems.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-amber-800 mb-3">
                    Restock Now ({stockIssueReport.understockItems.length} items)
                  </h4>
                  <div className="space-y-2">
                    {stockIssueReport.understockItems.map((analysis) => {
                      const item = inventoryData.find(inv => inv.itemId === analysis.itemId);
                      return (
                        <div key={`${analysis.itemId}-${analysis.warehouseFacilityId}`} 
                             className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-amber-900 truncate">{item?.itemName || analysis.itemId}</p>
                            <p className="text-sm text-amber-700 truncate">{item?.warehouseFacilityName}</p>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <p className="text-sm font-medium text-amber-800">
                              {analysis.currentStock} units
                            </p>
                            <p className="text-xs text-amber-600">
                              {formatDaysOfCover(analysis.daysOfCover)} left
                              {analysis.reorderQuantity && ` • Reorder: ${analysis.reorderQuantity}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Expiry Risk Items */}
              {stockIssueReport.expiryRiskItems && stockIssueReport.expiryRiskItems.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-red-800 mb-3">
                    Flash Promo Required ({stockIssueReport.expiryRiskItems.length} items)
                  </h4>
                  <div className="space-y-2">
                    {stockIssueReport.expiryRiskItems.map((analysis) => {
                      const item = inventoryData.find(inv => inv.itemId === analysis.itemId);
                      return (
                        <div key={`${analysis.itemId}-${analysis.warehouseFacilityId}`} 
                             className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-red-900 truncate">{item?.itemName || analysis.itemId}</p>
                            <p className="text-sm text-red-700 truncate">{item?.warehouseFacilityName}</p>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <p className="text-sm font-medium text-red-800">
                              {analysis.currentStock} units
                            </p>
                            <p className="text-xs text-red-600">
                              {formatDaysOfCover(analysis.daysOfCover)} runway
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Days of Cover Visualization */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="h-5 w-5 text-blue-500 mr-2" />
            Days of Cover Analysis
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Inventory runway based on current sales velocity
          </p>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
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
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockAnalyses.map((analysis) => {
                  const item = inventoryData.find(inv => inv.itemId === analysis.itemId);
                  const statusDisplay = getStatusDisplay(analysis.stockStatus);
                  const StatusIcon = statusDisplay.icon;
                  
                  return (
                    <tr key={`${analysis.itemId}-${analysis.warehouseFacilityId}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item?.itemName || analysis.itemId}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item?.brandName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item?.warehouseFacilityName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {analysis.currentStock.toLocaleString()} {item?.uom}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {analysis.salesVelocity.toFixed(1)}/day
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDaysOfCover(analysis.daysOfCover)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusDisplay.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusDisplay.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Recommendations Panel */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <TrendingDown className="h-5 w-5 text-green-500 mr-2" />
            Action Recommendations
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Suggested actions based on stock analysis
          </p>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {/* High Priority Actions */}
            {stockIssueReport.criticalIssues > 0 && (
              <div>
                <h4 className="text-md font-medium text-red-800 mb-3 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  High Priority Actions (Sorted by Urgency)
                </h4>
                <div className="space-y-3">
                  {/* Sort by urgency: highest sales velocity + lowest days of cover first */}
                  {[...stockIssueReport.outOfStockItems, ...stockIssueReport.understockItems]
                    .sort((a, b) => {
                      // Calculate urgency score: higher sales velocity and lower days of cover = more urgent
                      const urgencyA = a.salesVelocity / Math.max(a.daysOfCover, 0.1);
                      const urgencyB = b.salesVelocity / Math.max(b.daysOfCover, 0.1);
                      return urgencyB - urgencyA; // Sort descending (most urgent first)
                    })
                    .map((analysis) => {
                      const item = inventoryData.find(inv => inv.itemId === analysis.itemId);
                      const isOutOfStock = analysis.daysOfCover <= 0;
                      return (
                        <div key={`${analysis.itemId}-${analysis.warehouseFacilityId}`} 
                             className={`p-4 border rounded-lg ${isOutOfStock ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className={`font-medium ${isOutOfStock ? 'text-red-900' : 'text-yellow-900'}`}>
                                {item?.itemName || analysis.itemId}
                              </p>
                              <p className={`text-sm mt-1 ${isOutOfStock ? 'text-red-700' : 'text-yellow-700'}`}>
                                {analysis.recommendedAction}
                              </p>
                              <p className={`text-xs mt-1 ${isOutOfStock ? 'text-red-600' : 'text-yellow-600'}`}>
                                Sales Velocity: {analysis.salesVelocity.toFixed(1)}/day • 
                                Days of Cover: {analysis.daysOfCover <= 0 ? '0' : Math.round(analysis.daysOfCover)} • 
                                Location: {item?.warehouseFacilityName}
                              </p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${isOutOfStock ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'}`}>
                              {isOutOfStock ? 'URGENT' : 'SOON'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Optimization Opportunities */}
            {stockIssueReport.overstockItems.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-amber-800 mb-3 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Freeze POs - Optimization Opportunities
                </h4>
                <div className="space-y-3">
                  {stockIssueReport.overstockItems.map((analysis) => {
                    const item = inventoryData.find(inv => inv.itemId === analysis.itemId);
                    return (
                      <div key={`${analysis.itemId}-${analysis.warehouseFacilityId}`} 
                           className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-amber-900">
                              {item?.itemName || analysis.itemId}
                            </p>
                            <p className="text-sm text-amber-700 mt-1">
                              {analysis.recommendedAction}
                            </p>
                            <p className="text-xs text-amber-600 mt-1">
                              Current runway: {formatDaysOfCover(analysis.daysOfCover)}
                            </p>
                          </div>
                          <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded">
                            FREEZE POs
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Summary Statistics */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-800 mb-3">Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Items</p>
                  <p className="font-semibold text-gray-900">{stockAnalyses.length}</p>
                </div>
                <div>
                  <p className="text-gray-600">Healthy Stock</p>
                  <p className="font-semibold text-green-600">
                    {stockAnalyses.filter(a => a.stockStatus === STOCK_STATUS.HEALTHY).length}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Need Restock</p>
                  <p className="font-semibold text-amber-600">{stockIssueReport.criticalIssues}</p>
                </div>
                <div>
                  <p className="text-gray-600">Freeze POs</p>
                  <p className="font-semibold text-amber-600">{stockIssueReport.overstockItems.length}</p>
                </div>
                <div>
                  <p className="text-gray-600">Flash Promo</p>
                  <p className="font-semibold text-red-600">{stockIssueReport.expiryRiskItems?.length || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};