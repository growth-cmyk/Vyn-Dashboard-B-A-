import React, { useState, useMemo } from 'react';
import { Download, AlertCircle, TrendingUp, TrendingDown, Minus, Package } from 'lucide-react';
import type { InventoryItem, Platform } from '../types';
import { PLATFORM } from '../types';
import { predictionService, type PriorityShippingItem } from '../services/PredictionService';
import { AnalyticsService } from '../services/AnalyticsService';
import { VisualProgressRing } from './VisualProgressRing';
import { CollapsibleDetailTable } from './CollapsibleDetailTable';

interface RegionalOperationsViewProps {
  inventoryData: InventoryItem[];
  activePlatform?: Platform;
}

interface SKUMovementStats {
  moving: number;
  idle: number;
  critical: number;
}

interface SKUMovementItem {
  sku: string;
  productName: string;
  status: 'Moving' | 'Idle' | 'Critical';
  velocity: number;
  currentStock: number;
  daysOfStock: number;
  lastMovement: number;
}

export const RegionalOperationsView: React.FC<RegionalOperationsViewProps> = ({
  inventoryData,
  activePlatform = PLATFORM.BLINKIT
}) => {
  const [selectedFeeder, setSelectedFeeder] = useState<string>('');
  const [isGeneratingManifest, setIsGeneratingManifest] = useState(false);

  // Get unique feeder warehouses
  const feederWarehouses = useMemo(() => {
    const warehouses = new Set<string>();
    inventoryData.forEach(item => {
      if (item.warehouseFacilityId) {
        warehouses.add(item.warehouseFacilityId);
      }
    });
    return Array.from(warehouses).sort();
  }, [inventoryData]);

  // Filter inventory by selected feeder
  const filteredInventory = useMemo(() => {
    if (!selectedFeeder) return inventoryData;
    return inventoryData.filter(item => item.warehouseFacilityId === selectedFeeder);
  }, [inventoryData, selectedFeeder]);

  // Calculate SKU movement classification
  const skuMovementData = useMemo((): { stats: SKUMovementStats; items: SKUMovementItem[] } => {
    const stats: SKUMovementStats = { moving: 0, idle: 0, critical: 0 };
    const items: SKUMovementItem[] = [];

    filteredInventory.forEach(item => {
      const velocity = AnalyticsService.calculateSalesVelocity(item);
      const daysOfCover = AnalyticsService.calculateDaysOfCover(item, velocity);
      const rop = velocity * 7 + velocity * 3; // Simple ROP calculation
      
      // Estimate last movement (days since last sale) - simplified
      const lastMovement = velocity > 0 ? Math.round(1 / velocity) : 999;

      // Classify movement status
      let status: 'Moving' | 'Idle' | 'Critical';
      if (item.totalSellable < rop || daysOfCover < 7) {
        status = 'Critical';
        stats.critical++;
      } else if (velocity < 1 || lastMovement > 30) {
        status = 'Idle';
        stats.idle++;
      } else {
        status = 'Moving';
        stats.moving++;
      }

      items.push({
        sku: item.itemId,
        productName: item.itemName,
        status,
        velocity,
        currentStock: item.totalSellable,
        daysOfStock: daysOfCover === Infinity ? 999 : Math.round(daysOfCover),
        lastMovement
      });
    });

    return { stats, items };
  }, [filteredInventory]);

  // Generate priority shipping list
  const priorityShippingList = useMemo((): PriorityShippingItem[] => {
    return predictionService.generatePriorityShippingList(
      filteredInventory,
      selectedFeeder || undefined
    );
  }, [filteredInventory, selectedFeeder]);

  // Calculate urgency distribution
  const urgencyDistribution = useMemo(() => {
    const dist = { level1: 0, level2: 0, level3: 0 };
    priorityShippingList.forEach(item => {
      if (item.urgencyLevel.level === 1) dist.level1++;
      else if (item.urgencyLevel.level === 2) dist.level2++;
      else dist.level3++;
    });
    return dist;
  }, [priorityShippingList]);

  // Generate CSV manifest
  const generateShippingManifest = () => {
    setIsGeneratingManifest(true);

    try {
      // Create CSV content
      const headers = [
        'SKU',
        'Product Name',
        'Current Stock',
        'Quantity to Ship',
        'Target Feeder',
        'Urgency Level',
        'Stockout Date'
      ];

      const rows = priorityShippingList.map(item => [
        item.sku,
        item.productName,
        item.currentStock.toString(),
        item.quantityToShip.toString(),
        item.targetFeeder,
        item.urgencyLevel.label,
        item.stockoutDate ? item.stockoutDate.toISOString().split('T')[0] : 'N/A'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const date = new Date().toISOString().split('T')[0];
      const feederName = selectedFeeder || 'all';
      link.setAttribute('href', url);
      link.setAttribute('download', `shipping_manifest_${feederName}_${date}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to generate manifest:', error);
      alert('Failed to generate shipping manifest. Please try again.');
    } finally {
      setIsGeneratingManifest(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Moving': return 'text-green-600 bg-green-50';
      case 'Idle': return 'text-yellow-600 bg-yellow-50';
      case 'Critical': return 'text-red-600 bg-red-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const getUrgencyColor = (level: number) => {
    switch (level) {
      case 1: return 'text-red-600 bg-red-50';
      case 2: return 'text-yellow-600 bg-yellow-50';
      case 3: return 'text-green-600 bg-green-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Regional Operations
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Tactical inventory management and shipping prioritization
        </p>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Feeder Selector + SKU Movement */}
        <div className="space-y-6">
          {/* Feeder Warehouse Selector */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Feeder Warehouse
            </h2>
            <select
              value={selectedFeeder}
              onChange={(e) => setSelectedFeeder(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="">All Warehouses</option>
              {feederWarehouses.map(warehouse => (
                <option key={warehouse} value={warehouse}>
                  {warehouse}
                </option>
              ))}
            </select>
            <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              {filteredInventory.length} SKUs in selected warehouse
            </div>
          </div>

          {/* SKU Movement Dashboard */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">
              SKU Movement Status
            </h2>

            {/* Visual Distribution */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <VisualProgressRing
                  value={skuMovementData.stats.moving}
                  max={filteredInventory.length}
                  size="medium"
                  color="green"
                  label="Moving"
                  showPercentage={false}
                />
                <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {skuMovementData.stats.moving}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Moving
                </div>
              </div>

              <div className="text-center">
                <VisualProgressRing
                  value={skuMovementData.stats.idle}
                  max={filteredInventory.length}
                  size="medium"
                  color="yellow"
                  label="Idle"
                  showPercentage={false}
                />
                <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {skuMovementData.stats.idle}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Idle
                </div>
              </div>

              <div className="text-center">
                <VisualProgressRing
                  value={skuMovementData.stats.critical}
                  max={filteredInventory.length}
                  size="medium"
                  color="red"
                  label="Critical"
                  showPercentage={false}
                />
                <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {skuMovementData.stats.critical}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Critical
                </div>
              </div>
            </div>

            {/* Collapsible SKU Details */}
            <CollapsibleDetailTable
              title="SKU Movement Details"
              data={skuMovementData.items.slice(0, 50).map(item => ({
                'SKU': item.sku,
                'Product': item.productName,
                'Status': item.status,
                'Velocity': item.velocity.toFixed(2),
                'Stock': item.currentStock,
                'Days': item.daysOfStock === 999 ? '∞' : item.daysOfStock
              }))}
              columns={[
                { key: 'SKU', header: 'SKU' },
                { key: 'Product', header: 'Product' },
                { key: 'Status', header: 'Status' },
                { key: 'Velocity', header: 'Velocity' },
                { key: 'Stock', header: 'Stock' },
                { key: 'Days', header: 'Days' }
              ]}
              defaultCollapsed={true}
              maxHeight={300}
            />
          </div>
        </div>

        {/* Right Column: Priority Shipping Panel */}
        <div className="space-y-6">
          {/* Urgency Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Urgency Distribution
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {urgencyDistribution.level1}
                </div>
                <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                  Level 1 Critical
                </div>
              </div>
              <div className="text-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {urgencyDistribution.level2}
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                  Level 2 High
                </div>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {urgencyDistribution.level3}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Level 3 Medium
                </div>
              </div>
            </div>
          </div>

          {/* Priority Shipping List */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Priority Shipping List
              </h2>
              <button
                onClick={generateShippingManifest}
                disabled={isGeneratingManifest || priorityShippingList.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-vyndo-primary-500 hover:bg-vyndo-primary-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>
                  {isGeneratingManifest ? 'Generating...' : 'Generate Shipping Manifest'}
                </span>
              </button>
            </div>

            {priorityShippingList.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No items require shipping at this time</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {priorityShippingList.slice(0, 20).map((item, index) => (
                  <div
                    key={`${item.sku}-${index}`}
                    className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.productName}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          SKU: {item.sku}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getUrgencyColor(item.urgencyLevel.level)}`}>
                        {item.urgencyLevel.label}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="text-slate-600 dark:text-slate-400 text-xs">Current</div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.currentStock}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-600 dark:text-slate-400 text-xs">To Ship</div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.quantityToShip}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-600 dark:text-slate-400 text-xs">ROP</div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {Math.round(item.statisticalROP)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-600 dark:text-slate-400 text-xs">Stockout</div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.stockoutDate 
                            ? new Date(item.stockoutDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                            : 'N/A'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
