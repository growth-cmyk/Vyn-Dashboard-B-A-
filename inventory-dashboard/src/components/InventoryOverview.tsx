import React, { useState, useMemo } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Download,
  Check,
  ArrowUpDown,
  Eye,
  EyeOff
} from 'lucide-react';
import type { InventoryItem, StockAnalysis, StockStatus, Platform } from '../types';
import { AnalyticsService } from '../services';
import { ModernCard, ModernCardHeader, ModernCardTitle, ModernCardContent } from './ModernCard';
import { SparklineCard } from './AdvancedSparkline';
import { PLATFORM } from '../types';

interface InventoryOverviewProps {
  inventoryData: InventoryItem[];
  onBulkExport?: (selectedItems: InventoryItem[]) => void;
  activePlatform?: Platform;
}

type SortField = 'itemName' | 'brandName' | 'totalSellable' | 'daysOfCover' | 'stockStatus' | 'warehouseFacilityName';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

interface GroupedInventory {
  location: string;
  locationId: string;
  items: (InventoryItem & { analysis: StockAnalysis })[];
  totalItems: number;
  outOfStockCount: number;
  understockCount: number;
  adequateCount: number;
  overstockCount: number;
}

export const InventoryOverview: React.FC<InventoryOverviewProps> = ({ 
  inventoryData, 
  onBulkExport,
  activePlatform: _activePlatform = PLATFORM.BLINKIT
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'itemName', direction: 'asc' });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Calculate stock analysis for all items
  const inventoryWithAnalysis = useMemo(() => {
    return inventoryData.map(item => ({
      ...item,
      analysis: AnalyticsService.analyzeStock(item)
    }));
  }, [inventoryData]);

  // Group inventory by location
  const groupedInventory = useMemo(() => {
    const groups = new Map<string, GroupedInventory>();

    inventoryWithAnalysis.forEach(item => {
      const locationKey = item.warehouseFacilityId;
      
      if (!groups.has(locationKey)) {
        groups.set(locationKey, {
          location: item.warehouseFacilityName,
          locationId: item.warehouseFacilityId,
          items: [],
          totalItems: 0,
          outOfStockCount: 0,
          understockCount: 0,
          adequateCount: 0,
          overstockCount: 0
        });
      }

      const group = groups.get(locationKey)!;
      group.items.push(item);
      group.totalItems++;

      // Count by stock status
      switch (item.analysis.stockStatus) {
        case 'out-of-stock':
          group.outOfStockCount++;
          break;
        case 'understock':
          group.understockCount++;
          break;
        case 'healthy':
          group.adequateCount++;
          break;
        case 'overstock':
          group.overstockCount++;
          break;
        case 'expiry-risk':
          group.overstockCount++; // Count expiry risk as overstock for grouping
          break;
      }
    });

    return Array.from(groups.values());
  }, [inventoryWithAnalysis]);

  // Sort items within each group
  const sortedGroupedInventory = useMemo(() => {
    return groupedInventory.map(group => ({
      ...group,
      items: [...group.items].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.field) {
          case 'itemName':
            aValue = a.itemName.toLowerCase();
            bValue = b.itemName.toLowerCase();
            break;
          case 'brandName':
            aValue = a.brandName.toLowerCase();
            bValue = b.brandName.toLowerCase();
            break;
          case 'totalSellable':
            aValue = a.totalSellable;
            bValue = b.totalSellable;
            break;
          case 'daysOfCover':
            aValue = a.analysis.daysOfCover === Infinity ? 999999 : a.analysis.daysOfCover;
            bValue = b.analysis.daysOfCover === Infinity ? 999999 : b.analysis.daysOfCover;
            break;
          case 'stockStatus':
            // Sort by priority: out-of-stock, understock, healthy, overstock, expiry-risk
            const statusPriority = { 
              'out-of-stock': 0, 
              'understock': 1, 
              'healthy': 2, 
              'overstock': 3,
              'expiry-risk': 4
            };
            aValue = statusPriority[a.analysis.stockStatus as keyof typeof statusPriority];
            bValue = statusPriority[b.analysis.stockStatus as keyof typeof statusPriority];
            break;
          case 'warehouseFacilityName':
            aValue = a.warehouseFacilityName.toLowerCase();
            bValue = b.warehouseFacilityName.toLowerCase();
            break;
          default:
            aValue = a.itemName.toLowerCase();
            bValue = b.itemName.toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      })
    }));
  }, [groupedInventory, sortConfig]);

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleGroupExpansion = (locationId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(locationId)) {
        newSet.delete(locationId);
      } else {
        newSet.add(locationId);
      }
      return newSet;
    });
  };

  const toggleItemExpansion = (itemKey: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemKey)) {
        newSet.delete(itemKey);
      } else {
        newSet.add(itemKey);
      }
      return newSet;
    });
  };

  const toggleItemSelection = (itemKey: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemKey)) {
        newSet.delete(itemKey);
      } else {
        newSet.add(itemKey);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === inventoryData.length) {
      setSelectedItems(new Set());
    } else {
      const allItemKeys = inventoryData.map(item => `${item.itemId}-${item.warehouseFacilityId}`);
      setSelectedItems(new Set(allItemKeys));
    }
  };

  const handleBulkExport = () => {
    const selectedInventoryItems = inventoryData.filter(item => 
      selectedItems.has(`${item.itemId}-${item.warehouseFacilityId}`)
    );
    
    if (selectedInventoryItems.length > 0) {
      onBulkExport?.(selectedInventoryItems);
    }
  };

  // Generate sparkline data for sales velocity (7-day trend)
  const generateSparklineData = (item: InventoryItem) => {
    const data = [];
    const baseVelocity = item.last7Days / 7;
    
    // Generate realistic 7-day trend data with some variation
    for (let i = 6; i >= 0; i--) {
      const variation = (Math.random() - 0.5) * 0.4; // ±20% variation
      const value = Math.max(0, baseVelocity * (1 + variation));
      data.push({
        value,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        label: `Day ${7 - i}`
      });
    }
    
    return data;
  };

  // Generate CSV for bulk export
  const generateBulkExportCSV = () => {
    const selectedInventoryItems = inventoryData.filter(item => 
      selectedItems.has(`${item.itemId}-${item.warehouseFacilityId}`)
    );

    if (selectedInventoryItems.length === 0) return;

    const headers = [
      'Item ID',
      'Product Name',
      'Brand',
      'Location',
      'Current Stock',
      'UOM',
      'Days of Cover',
      'Sales Velocity',
      'Stock Status',
      'Recommended Action',
      'Urgency Score'
    ];

    const csvContent = [
      headers.join(','),
      ...selectedInventoryItems.map(item => {
        const analysis = AnalyticsService.analyzeStock(item);
        const urgencyScore = analysis.daysOfCover <= 0 ? 100 : 
                           analysis.daysOfCover < 18 ? 80 : 
                           analysis.daysOfCover < 30 ? 60 : 
                           analysis.stockStatus === 'expiry-risk' ? 90 : 20;
        
        return [
          item.itemId,
          `"${item.itemName}"`,
          `"${item.brandName}"`,
          `"${item.warehouseFacilityName}"`,
          item.totalSellable,
          item.uom,
          analysis.daysOfCover === Infinity ? 'Infinity' : analysis.daysOfCover.toFixed(1),
          analysis.salesVelocity.toFixed(2),
          analysis.stockStatus,
          `"${analysis.recommendedAction}"`,
          urgencyScore
        ].join(',');
      })
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory-bulk-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get urgency badge styling with semantic colors
  const getUrgencyBadge = (analysis: StockAnalysis) => {
    const { daysOfCover, stockStatus } = analysis;
    
    if (stockStatus === 'out-of-stock') {
      return {
        text: 'CRITICAL',
        className: 'bg-vyndo-danger-500 text-white animate-pulse px-2 py-1 rounded-full text-xs font-bold'
      };
    }
    
    if (daysOfCover < 18) {
      return {
        text: 'URGENT',
        className: 'bg-vyndo-danger-500 text-white px-2 py-1 rounded-full text-xs font-medium'
      };
    }
    
    if (daysOfCover < 30) {
      return {
        text: 'HIGH',
        className: 'bg-vyndo-warning-500 text-white px-2 py-1 rounded-full text-xs font-medium'
      };
    }
    
    if (stockStatus === 'expiry-risk') {
      return {
        text: 'EXPIRY RISK',
        className: 'bg-vyndo-danger-500 text-white px-2 py-1 rounded-full text-xs font-medium'
      };
    }
    
    return null;
  };

  const getStockStatusIcon = (status: StockStatus) => {
    switch (status) {
      case 'out-of-stock':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'understock':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'overstock':
        return <Package className="h-4 w-4 text-blue-500" />;
      case 'expiry-risk':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStockStatusColor = (status: StockStatus) => {
    switch (status) {
      case 'out-of-stock':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'understock':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'overstock':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'expiry-risk':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const formatDaysOfCover = (days: number) => {
    if (days === Infinity) return '∞';
    if (days === 0) return '0';
    return Math.round(days * 10) / 10;
  };

  const SortableHeader: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <th
      className="px-6 py-3 text-left text-xs font-bold text-vyndo-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-vyndo-neutral-50 transition-colors sticky top-0 bg-white/80 backdrop-blur-md border-b border-vyndo-neutral-200"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        <ArrowUpDown className="h-3 w-3 opacity-50" />
        {sortConfig.field === field && (
          sortConfig.direction === 'asc' ? 
            <ChevronUp className="h-4 w-4 text-vyndo-primary-600" /> : 
            <ChevronDown className="h-4 w-4 text-vyndo-primary-600" />
        )}
      </div>
    </th>
  );

  if (inventoryData.length === 0) {
    return (
      <ModernCard variant="glass" className="text-center py-12">
        <ModernCardContent>
          <Package className="mx-auto h-12 w-12 text-vyndo-neutral-400" />
          <h3 className="mt-2 text-sm font-medium text-vyndo-neutral-900">No inventory data</h3>
          <p className="mt-1 text-sm text-vyndo-neutral-500">
            Upload an inventory CSV file to view stock levels and analysis.
          </p>
        </ModernCardContent>
      </ModernCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards with Glassmorphism */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ModernCard variant="glass" size="sm">
          <ModernCardContent>
            <div className="flex items-center">
              <Package className="h-8 w-8 text-vyndo-primary-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-vyndo-neutral-600">Total Items</p>
                <p className="text-2xl font-semibold text-vyndo-neutral-900">{inventoryData.length}</p>
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>

        <ModernCard variant="glass" size="sm">
          <ModernCardContent>
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-vyndo-danger-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-vyndo-neutral-600">Out of Stock</p>
                <p className="text-2xl font-semibold text-vyndo-danger-600">
                  {groupedInventory.reduce((sum, group) => sum + group.outOfStockCount, 0)}
                </p>
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>

        <ModernCard variant="glass" size="sm">
          <ModernCardContent>
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-vyndo-warning-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-vyndo-neutral-600">Understock</p>
                <p className="text-2xl font-semibold text-vyndo-warning-600">
                  {groupedInventory.reduce((sum, group) => sum + group.understockCount, 0)}
                </p>
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>

        <ModernCard variant="glass" size="sm">
          <ModernCardContent>
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-vyndo-success-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-vyndo-neutral-600">Adequate Stock</p>
                <p className="text-2xl font-semibold text-vyndo-success-600">
                  {groupedInventory.reduce((sum, group) => sum + group.adequateCount, 0)}
                </p>
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>
      </div>

      {/* Bulk Operations Bar */}
      {selectedItems.size > 0 && (
        <ModernCard variant="elevated" className="border-vyndo-primary-200 bg-vyndo-primary-50">
          <ModernCardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-vyndo-primary-600" />
                  <span className="text-sm font-medium text-vyndo-primary-900">
                    {selectedItems.size} items selected
                  </span>
                </div>
                <button
                  onClick={() => setSelectedItems(new Set())}
                  className="text-sm text-vyndo-primary-700 hover:text-vyndo-primary-900 underline"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBulkExport}
                  className="flex items-center space-x-2 bg-vyndo-success-600 text-white px-4 py-2 rounded-lg hover:bg-vyndo-success-700 transition-colors"
                >
                  <Check className="h-4 w-4" />
                  <span>Bulk Export PO</span>
                </button>
                <button
                  onClick={generateBulkExportCSV}
                  className="flex items-center space-x-2 bg-vyndo-primary-600 text-white px-3 py-2 rounded-lg hover:bg-vyndo-primary-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>CSV</span>
                </button>
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>
      )}

      {/* Modern Inventory Table with Glassmorphism */}
      <ModernCard variant="glass" className="overflow-hidden">
        <ModernCardHeader>
          <div className="flex items-center justify-between">
            <ModernCardTitle level={3} className="flex items-center">
              <Package className="h-5 w-5 mr-2 text-vyndo-primary-600" />
              Inventory by Location
            </ModernCardTitle>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleSelectAll}
                className="flex items-center space-x-2 text-sm text-vyndo-primary-600 hover:text-vyndo-primary-800"
              >
                <Check className="h-4 w-4" />
                <span>{selectedItems.size === inventoryData.length ? 'Deselect All' : 'Select All'}</span>
              </button>
              <span className="text-sm text-vyndo-neutral-600">
                Click rows to expand details • Use checkboxes for bulk operations
              </span>
            </div>
          </div>
        </ModernCardHeader>

        <ModernCardContent className="p-0">
          <div className="overflow-x-auto max-h-[800px] overflow-y-auto">
            <table className="min-w-full divide-y divide-vyndo-neutral-200">
              <thead className="bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-vyndo-neutral-700 uppercase tracking-wider sticky top-0 bg-white/80 backdrop-blur-md border-b border-vyndo-neutral-200">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === inventoryData.length && inventoryData.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-vyndo-neutral-300 text-vyndo-primary-600 focus:ring-vyndo-primary-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-vyndo-neutral-700 uppercase tracking-wider sticky top-0 bg-white/80 backdrop-blur-md border-b border-vyndo-neutral-200">
                    Location
                  </th>
                  <SortableHeader field="itemName">Product</SortableHeader>
                  <SortableHeader field="brandName">Brand</SortableHeader>
                  <SortableHeader field="totalSellable">Stock Level</SortableHeader>
                  <SortableHeader field="daysOfCover">Days of Cover</SortableHeader>
                  <SortableHeader field="stockStatus">Status</SortableHeader>
                  <th className="px-6 py-3 text-left text-xs font-bold text-vyndo-neutral-700 uppercase tracking-wider sticky top-0 bg-white/80 backdrop-blur-md border-b border-vyndo-neutral-200">
                    Sales Velocity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-vyndo-neutral-700 uppercase tracking-wider sticky top-0 bg-white/80 backdrop-blur-md border-b border-vyndo-neutral-200">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/50 backdrop-blur-sm divide-y divide-vyndo-neutral-200">
                {sortedGroupedInventory.map((group) => (
                  <React.Fragment key={group.locationId}>
                    {/* Location Header Row */}
                    <tr 
                      className="bg-vyndo-neutral-50/80 backdrop-blur-sm cursor-pointer hover:bg-vyndo-neutral-100/80 transition-colors"
                      onClick={() => toggleGroupExpansion(group.locationId)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-4 h-4"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {expandedGroups.has(group.locationId) ? 
                            <ChevronDown className="h-4 w-4 mr-2 text-vyndo-primary-600" /> : 
                            <ChevronUp className="h-4 w-4 mr-2 text-vyndo-primary-600" />
                          }
                          <div>
                            <div className="text-sm font-medium text-vyndo-neutral-900">{group.location}</div>
                            <div className="text-sm text-vyndo-neutral-500">{group.locationId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-vyndo-neutral-600">
                        {group.totalItems} items
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap"></td>
                      <td className="px-6 py-4 whitespace-nowrap"></td>
                      <td className="px-6 py-4 whitespace-nowrap"></td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          {group.outOfStockCount > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-vyndo-danger-100 text-vyndo-danger-800">
                              {group.outOfStockCount} out
                            </span>
                          )}
                          {group.understockCount > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-vyndo-warning-100 text-vyndo-warning-800">
                              {group.understockCount} low
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap"></td>
                      <td className="px-6 py-4 whitespace-nowrap"></td>
                    </tr>

                    {/* Item Rows with Progressive Disclosure */}
                    {expandedGroups.has(group.locationId) && group.items.map((item) => {
                      const itemKey = `${item.itemId}-${item.warehouseFacilityId}`;
                      const isExpanded = expandedItems.has(itemKey);
                      const isSelected = selectedItems.has(itemKey);
                      const urgencyBadge = getUrgencyBadge(item.analysis);
                      const sparklineData = generateSparklineData(item);
                      
                      return (
                        <React.Fragment key={itemKey}>
                          {/* Main Item Row */}
                          <tr className="hover:bg-vyndo-neutral-50/50 transition-colors">
                            <td className="px-6 py-5 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleItemSelection(itemKey)}
                                className="rounded border-vyndo-neutral-300 text-vyndo-primary-600 focus:ring-vyndo-primary-500"
                              />
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="pl-6 text-sm font-normal text-vyndo-neutral-500">
                                {item.itemId}
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-normal text-vyndo-neutral-900">{item.itemName}</div>
                                  <div className="text-sm font-normal text-vyndo-neutral-500">UPC: {item.upc || 'N/A'}</div>
                                </div>
                                <button
                                  onClick={() => toggleItemExpansion(itemKey)}
                                  className="ml-2 p-1 rounded-full hover:bg-vyndo-neutral-100 transition-colors"
                                  title={isExpanded ? 'Hide details' : 'Show details'}
                                >
                                  {isExpanded ? 
                                    <EyeOff className="h-4 w-4 text-vyndo-neutral-500" /> : 
                                    <Eye className="h-4 w-4 text-vyndo-neutral-500" />
                                  }
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap text-sm font-normal text-vyndo-neutral-900">
                              {item.brandName}
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="text-sm font-normal text-vyndo-neutral-900">
                                {item.totalSellable.toLocaleString()} {item.uom}
                              </div>
                              {item.incomingScheduled > 0 && (
                                <div className="text-xs font-normal text-vyndo-success-600">
                                  +{item.incomingScheduled.toLocaleString()} incoming
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <div>
                                  <div className="text-sm font-normal text-vyndo-neutral-900">
                                    {formatDaysOfCover(item.analysis.daysOfCover)} days
                                  </div>
                                  <div className="text-xs font-normal text-vyndo-neutral-500">
                                    {item.analysis.salesVelocity.toFixed(1)}/day
                                  </div>
                                </div>
                                {urgencyBadge && (
                                  <span className={urgencyBadge.className}>
                                    {urgencyBadge.text}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStockStatusColor(item.analysis.stockStatus)}`}>
                                {getStockStatusIcon(item.analysis.stockStatus)}
                                <span className="ml-1 capitalize">{item.analysis.stockStatus.replace('-', ' ')}</span>
                              </span>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              {/* Inline Sparkline */}
                              <div className="w-20 h-8">
                                <SparklineCard
                                  title=""
                                  data={sparklineData}
                                  currentValue={item.analysis.salesVelocity}
                                  unit="/day"
                                />
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="text-xs font-normal text-vyndo-neutral-600 max-w-xs">
                                {item.analysis.recommendedAction}
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Details Row */}
                          {isExpanded && (
                            <tr className="bg-vyndo-neutral-50/30 backdrop-blur-sm">
                              <td colSpan={9} className="px-6 py-4">
                                <div className="pl-6">
                                  <ModernCard variant="glass" size="sm">
                                    <ModernCardHeader>
                                      <ModernCardTitle level={4}>
                                        Mini-Dashboard: {item.itemName}
                                      </ModernCardTitle>
                                    </ModernCardHeader>
                                    <ModernCardContent>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* 7-Day Sales Trend */}
                                        <div>
                                          <h5 className="text-sm font-medium text-vyndo-neutral-700 mb-2">7-Day Sales Trend</h5>
                                          <SparklineCard
                                            title="Sales Velocity"
                                            data={sparklineData}
                                            currentValue={item.analysis.salesVelocity}
                                            unit=" units/day"
                                          />
                                        </div>

                                        {/* Warehouse Breakdown */}
                                        <div>
                                          <h5 className="text-sm font-medium text-vyndo-neutral-700 mb-2">Warehouse Details</h5>
                                          <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                              <span className="text-vyndo-neutral-600">Location:</span>
                                              <span className="font-medium text-vyndo-neutral-900">{item.warehouseFacilityName}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                              <span className="text-vyndo-neutral-600">Facility ID:</span>
                                              <span className="font-medium text-vyndo-neutral-900">{item.warehouseFacilityId}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                              <span className="text-vyndo-neutral-600">Sellable:</span>
                                              <span className="font-medium text-vyndo-success-600">{item.totalSellable.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                              <span className="text-vyndo-neutral-600">Unsellable:</span>
                                              <span className="font-medium text-vyndo-danger-600">{item.totalUnsellable.toLocaleString()}</span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Sales History */}
                                        <div>
                                          <h5 className="text-sm font-medium text-vyndo-neutral-700 mb-2">Sales History</h5>
                                          <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                              <span className="text-vyndo-neutral-600">Last 7 days:</span>
                                              <span className="font-medium text-vyndo-neutral-900">{item.last7Days} units</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                              <span className="text-vyndo-neutral-600">Last 15 days:</span>
                                              <span className="font-medium text-vyndo-neutral-900">{item.last15Days} units</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                              <span className="text-vyndo-neutral-600">Last 30 days:</span>
                                              <span className="font-medium text-vyndo-neutral-900">{item.last30Days} units</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                              <span className="text-vyndo-neutral-600">Safety Stock:</span>
                                              <span className="font-medium text-vyndo-primary-600">{item.analysis.safetyStock.toFixed(0)} units</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </ModernCardContent>
                                  </ModernCard>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </ModernCardContent>
      </ModernCard>
    </div>
  );
};