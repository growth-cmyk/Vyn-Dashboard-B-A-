import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
// @ts-ignore - react-window types issue
import { FixedSizeList as List } from 'react-window';
import type { InventoryItem, StockAnalysis } from '../types';
import { AnalyticsService } from '../services';
import { 
  ChevronUp, 
  ChevronDown, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  ArrowUpDown,
  Eye,
  EyeOff
} from 'lucide-react';
import { SparklineCard } from './AdvancedSparkline';
import { cn } from '../utils/cn';

interface VirtualizedTableProps {
  inventoryData: InventoryItem[];
  selectedItems: Set<string>;
  expandedItems: Set<string>;
  onItemSelection: (itemKey: string) => void;
  onItemExpansion: (itemKey: string) => void;
  sortConfig: { field: string; direction: 'asc' | 'desc' };
  onSort: (field: string) => void;
  height?: number;
}

interface RowData {
  items: (InventoryItem & { analysis: StockAnalysis })[];
  selectedItems: Set<string>;
  expandedItems: Set<string>;
  onItemSelection: (itemKey: string) => void;
  onItemExpansion: (itemKey: string) => void;
}

const ITEM_HEIGHT = 80; // Height of each row in pixels
const EXPANDED_ITEM_HEIGHT = 200; // Height when expanded

/**
 * VirtualizedTable - High-performance table component for large datasets
 * Uses react-window for virtualization to maintain 60FPS with hundreds of rows
 */
export const VirtualizedTable: React.FC<VirtualizedTableProps> = ({
  inventoryData,
  selectedItems,
  expandedItems,
  onItemSelection,
  onItemExpansion,
  sortConfig,
  onSort,
  height = 600
}) => {
  const listRef = useRef<any>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate stock analysis for all items (memoized for performance)
  const inventoryWithAnalysis = useMemo(() => {
    return inventoryData.map(item => ({
      ...item,
      analysis: AnalyticsService.analyzeStock(item)
    }));
  }, [inventoryData]);

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Generate sparkline data for sales velocity
  const generateSparklineData = useCallback((item: InventoryItem) => {
    const data = [];
    const baseVelocity = item.last7Days / 7;
    
    for (let i = 6; i >= 0; i--) {
      const variation = (Math.random() - 0.5) * 0.4;
      const value = Math.max(0, baseVelocity * (1 + variation));
      data.push({
        value,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        label: `Day ${7 - i}`
      });
    }
    
    return data;
  }, []);

  // Get urgency badge styling
  const getUrgencyBadge = useCallback((analysis: StockAnalysis) => {
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
  }, []);

  // Get stock status icon
  const getStockStatusIcon = useCallback((status: string) => {
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
      default:
        return null;
    }
  }, []);

  // Get stock status color
  const getStockStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'out-of-stock':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      case 'understock':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800';
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      case 'overstock':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
      case 'expiry-risk':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      default:
        return 'bg-gray-100 text-gray-800 border-slate-200/50 dark:bg-gray-900/20 dark:text-gray-300 dark:border-slate-700/50';
    }
  }, []);

  // Format days of cover
  const formatDaysOfCover = useCallback((days: number) => {
    if (days === Infinity) return '∞';
    if (days === 0) return '0';
    return Math.round(days * 10) / 10;
  }, []);

  // Row renderer for virtualized list
  const Row = useCallback(({ index, style, data }: { index: number; style: React.CSSProperties; data: RowData }) => {
    const item = data.items[index];
    const itemKey = `${item.itemId}-${item.warehouseFacilityId}`;
    const isExpanded = data.expandedItems.has(itemKey);
    const isSelected = data.selectedItems.has(itemKey);
    const urgencyBadge = getUrgencyBadge(item.analysis);
    const sparklineData = generateSparklineData(item);

    return (
      <div style={style} className={cn(
        // Zebra stripe pattern - no grid lines
        index % 2 === 0 ? 'bg-white/70' : 'bg-slate-50/50',
        'border-b border-slate-200/60 backdrop-blur-sm' // Subtle border
      )}>
        <div className="flex items-center px-6 py-4 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
          {/* Checkbox */}
          <div className="w-12 flex-shrink-0">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => data.onItemSelection(itemKey)}
              className="rounded-2xl border-slate-300/60 text-vyndo-primary-600 focus:ring-vyndo-primary-500 dark:border-slate-600 dark:bg-slate-700"
            />
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate"> {/* Professional font weight */}
                  {item.itemName}
                </div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 truncate"> {/* Professional font weight */}
                  {item.brandName} • {item.warehouseFacilityName}
                </div>
              </div>
              <button
                onClick={() => data.onItemExpansion(itemKey)}
                className="ml-2 p-1 rounded-2xl hover:bg-slate-100/70 dark:hover:bg-slate-700 transition-colors" // Large rounded corners
                title={isExpanded ? 'Hide details' : 'Show details'}
              >
                {isExpanded ? 
                  <EyeOff className="h-4 w-4 text-slate-500 dark:text-slate-400" /> : 
                  <Eye className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                }
              </button>
            </div>
          </div>

          {/* Stock Level */}
          <div className="w-24 text-right">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100"> {/* Professional font weight */}
              {item.totalSellable.toLocaleString()}
            </div>
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400"> {/* Professional font weight */}
              {item.uom}
            </div>
          </div>

          {/* Days of Cover */}
          <div className="w-32 text-right">
            <div className="flex items-center justify-end space-x-2">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100"> {/* Professional font weight */}
                  {formatDaysOfCover(item.analysis.daysOfCover)} days
                </div>
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400"> {/* Professional font weight */}
                  {item.analysis.salesVelocity.toFixed(1)}/day
                </div>
              </div>
              {urgencyBadge && (
                <span className={cn(urgencyBadge.className, 'rounded-2xl')}> {/* Large rounded corners */}
                  {urgencyBadge.text}
                </span>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="w-32 text-right">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-medium border ${getStockStatusColor(item.analysis.stockStatus)}`}> {/* Large rounded corners */}
              {getStockStatusIcon(item.analysis.stockStatus)}
              <span className="ml-1 capitalize">{item.analysis.stockStatus.replace('-', ' ')}</span>
            </span>
          </div>

          {/* Sparkline */}
          <div className="w-20 h-8">
            <SparklineCard
              title=""
              data={sparklineData}
              currentValue={item.analysis.salesVelocity}
              unit="/day"
            />
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="px-6 py-4 bg-slate-50/30 dark:bg-slate-800/30 backdrop-blur-sm border-t border-slate-200/60"> {/* Subtle border */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 7-Day Sales Trend */}
              <div>
                <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"> {/* Professional font weight */}
                  7-Day Sales Trend
                </h5>
                <SparklineCard
                  title="Sales Velocity"
                  data={sparklineData}
                  currentValue={item.analysis.salesVelocity}
                  unit=" units/day"
                />
              </div>

              {/* Warehouse Details */}
              <div>
                <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"> {/* Professional font weight */}
                  Warehouse Details
                </h5>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Location:</span> {/* Professional font weight */}
                    <span className="font-medium text-slate-900 dark:text-slate-100">{item.warehouseFacilityName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Facility ID:</span> {/* Professional font weight */}
                    <span className="font-medium text-slate-900 dark:text-slate-100">{item.warehouseFacilityId}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Sellable:</span> {/* Professional font weight */}
                    <span className="font-medium text-vyndo-success-600 dark:text-green-400">{item.totalSellable.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Unsellable:</span> {/* Professional font weight */}
                    <span className="font-medium text-vyndo-danger-600 dark:text-red-400">{item.totalUnsellable.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Sales History */}
              <div>
                <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"> {/* Professional font weight */}
                  Sales History
                </h5>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Last 7 days:</span> {/* Professional font weight */}
                    <span className="font-medium text-slate-900 dark:text-slate-100">{item.last7Days} units</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Last 15 days:</span> {/* Professional font weight */}
                    <span className="font-medium text-slate-900 dark:text-slate-100">{item.last15Days} units</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Last 30 days:</span> {/* Professional font weight */}
                    <span className="font-medium text-slate-900 dark:text-slate-100">{item.last30Days} units</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Safety Stock:</span> {/* Professional font weight */}
                    <span className="font-medium text-vyndo-primary-600 dark:text-orange-400">{item.analysis.safetyStock.toFixed(0)} units</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }, [getUrgencyBadge, generateSparklineData, getStockStatusIcon, getStockStatusColor, formatDaysOfCover]);

  // Calculate item size based on expansion state
  const getItemSize = useCallback((index: number) => {
    const item = inventoryWithAnalysis[index];
    const itemKey = `${item.itemId}-${item.warehouseFacilityId}`;
    return expandedItems.has(itemKey) ? EXPANDED_ITEM_HEIGHT : ITEM_HEIGHT;
  }, [inventoryWithAnalysis, expandedItems]);

  // Sortable header component
  const SortableHeader: React.FC<{ field: string; children: React.ReactNode; className?: string }> = ({ 
    field, 
    children, 
    className = '' 
  }) => (
    <th
      className={`px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-700 transition-colors rounded-2xl ${className}`} // Professional font weight and large rounded corners
      onClick={() => onSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        <ArrowUpDown className="h-3 w-3 opacity-50" />
        {sortConfig.field === field && (
          sortConfig.direction === 'asc' ? 
            <ChevronUp className="h-4 w-4 text-vyndo-primary-600 dark:text-orange-400" /> : 
            <ChevronDown className="h-4 w-4 text-vyndo-primary-600 dark:text-orange-400" />
        )}
      </div>
    </th>
  );

  const rowData: RowData = {
    items: inventoryWithAnalysis,
    selectedItems,
    expandedItems,
    onItemSelection,
    onItemExpansion
  };

  return (
    <div ref={containerRef} className="w-full">
      {/* Table Header */}
      <div className="glass-card border-slate-200/60 backdrop-blur-xl rounded-2xl mb-4"> {/* Glassmorphism header */}
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="w-12 px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"> {/* Professional font weight */}
                <input
                  type="checkbox"
                  checked={selectedItems.size === inventoryData.length && inventoryData.length > 0}
                  onChange={() => {/* Handle select all */}}
                  className="rounded-2xl border-slate-300/60 text-vyndo-primary-600 focus:ring-vyndo-primary-500 dark:border-slate-600 dark:bg-slate-700" // Large rounded corners
                />
              </th>
              <SortableHeader field="itemName" className="flex-1">Product</SortableHeader>
              <SortableHeader field="totalSellable" className="w-24 text-right">Stock</SortableHeader>
              <SortableHeader field="daysOfCover" className="w-32 text-right">Days of Cover</SortableHeader>
              <SortableHeader field="stockStatus" className="w-32 text-right">Status</SortableHeader>
              <th className="w-20 px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"> {/* Professional font weight */}
                Trend
              </th>
            </tr>
          </thead>
        </table>
      </div>

      {/* Virtualized List */}
      <div className="glass-card border-slate-200/60 rounded-2xl overflow-hidden"> {/* Glassmorphism container */}
        <List
          ref={listRef}
          height={height}
          itemCount={inventoryWithAnalysis.length}
          itemSize={getItemSize}
          itemData={rowData}
          width={containerWidth}
          overscanCount={5} // Render 5 extra items for smooth scrolling
        >
          {Row}
        </List>
      </div>
    </div>
  );
};

export default VirtualizedTable;