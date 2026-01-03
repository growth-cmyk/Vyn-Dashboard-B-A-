import React, { useMemo, useCallback } from 'react';
import { ModernCard, ModernCardHeader, ModernCardTitle, ModernCardContent } from './ModernCard';
import { Package, DollarSign, AlertTriangle } from 'lucide-react';
import { cn } from '../utils/cn';
import type { InventoryItem } from '../types';

export interface CapitalTreemapProps {
  inventoryData: InventoryItem[];
  onCategoryClick?: (category: string) => void;
  className?: string;
}

interface TreemapNode {
  id: string;
  name: string;
  category: string;
  units: number;
  estimatedValue: number;
  percentage: number;
  color: string;
  textColor: string;
}

/**
 * CapitalTreemap - Treemap visualization for inventory capital analysis
 * 
 * Features:
 * - Grouping: Product Category or Product Name
 * - Size: Total Sellable Units
 * - Color: Total Value (Sellable * Estimated MRP)
 * - Shows where working capital is trapped
 * - Interactive category drill-down
 */
export const CapitalTreemap: React.FC<CapitalTreemapProps> = ({
  inventoryData,
  onCategoryClick,
  className
}) => {
  const treemapData = useMemo(() => {
    if (inventoryData.length === 0) return { nodes: [], totalValue: 0, totalUnits: 0 };

    // Group by brand name (category) and calculate totals
    const categoryMap = new Map<string, { units: number; value: number; items: InventoryItem[] }>();
    
    inventoryData.forEach(item => {
      const category = item.brandName || 'Unknown Brand';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { units: 0, value: 0, items: [] });
      }
      
      const categoryData = categoryMap.get(category)!;
      categoryData.units += item.totalSellable;
      // Estimate MRP as ₹100 per unit (can be made configurable)
      categoryData.value += item.totalSellable * 100;
      categoryData.items.push(item);
    });

    const totalUnits = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.units, 0);
    const totalValue = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.value, 0);
    const maxValue = Math.max(...Array.from(categoryMap.values()).map(cat => cat.value));

    // Create treemap nodes
    const nodes: TreemapNode[] = Array.from(categoryMap.entries())
      .map(([category, data]) => {
        const percentage = totalUnits > 0 ? (data.units / totalUnits) * 100 : 0;
        const valueIntensity = maxValue > 0 ? data.value / maxValue : 0;
        
        // Color based on value intensity (red = high capital trapped)
        let color: string;
        let textColor: string;
        
        if (valueIntensity > 0.8) {
          color = 'bg-vyndo-danger-500';
          textColor = 'text-white';
        } else if (valueIntensity > 0.6) {
          color = 'bg-vyndo-danger-400';
          textColor = 'text-white';
        } else if (valueIntensity > 0.4) {
          color = 'bg-vyndo-warning-400';
          textColor = 'text-vyndo-neutral-900';
        } else if (valueIntensity > 0.2) {
          color = 'bg-vyndo-warning-300';
          textColor = 'text-vyndo-neutral-900';
        } else {
          color = 'bg-vyndo-success-300';
          textColor = 'text-vyndo-neutral-900';
        }

        return {
          id: category,
          name: category,
          category,
          units: data.units,
          estimatedValue: data.value,
          percentage,
          color,
          textColor
        };
      })
      .sort((a, b) => b.estimatedValue - a.estimatedValue) // Sort by value descending
      .slice(0, 12); // Limit to top 12 for better visualization

    return { nodes, totalValue, totalUnits };
  }, [inventoryData]);

  const handleNodeClick = useCallback((node: TreemapNode) => {
    onCategoryClick?.(node.category);
  }, [onCategoryClick]);

  // Calculate grid layout based on percentage
  const getGridSize = (percentage: number): string => {
    if (percentage > 25) return 'col-span-3 row-span-2'; // Large
    if (percentage > 15) return 'col-span-2 row-span-2'; // Medium-large
    if (percentage > 8) return 'col-span-2 row-span-1';  // Medium
    if (percentage > 4) return 'col-span-1 row-span-1';  // Small
    return 'col-span-1 row-span-1'; // Tiny
  };

  if (treemapData.nodes.length === 0) {
    return (
      <ModernCard variant="elevated" className={cn('h-full', className)}>
        <ModernCardHeader>
          <ModernCardTitle level={3} className="flex items-center">
            <Package className="h-5 w-5 mr-2 text-vyndo-primary-600" />
            Capital Distribution Treemap
          </ModernCardTitle>
        </ModernCardHeader>
        <ModernCardContent>
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-vyndo-neutral-400 mx-auto mb-4" />
            <p className="text-sm text-vyndo-neutral-600">
              No inventory data available for capital analysis
            </p>
          </div>
        </ModernCardContent>
      </ModernCard>
    );
  }

  return (
    <ModernCard variant="elevated" className={cn('h-full', className)}>
      <ModernCardHeader>
        <div className="flex items-center justify-between">
          <ModernCardTitle level={3} className="flex items-center">
            <Package className="h-5 w-5 mr-2 text-vyndo-primary-600" />
            Capital Distribution Treemap
          </ModernCardTitle>
          <div className="flex items-center text-sm text-vyndo-neutral-600">
            <DollarSign className="h-4 w-4 mr-1" />
            ₹{treemapData.totalValue.toLocaleString('en-IN')} total
          </div>
        </div>
        <p className="text-sm text-vyndo-neutral-600 mt-2">
          Working capital distribution by product category. Darker colors indicate higher capital concentration.
        </p>
      </ModernCardHeader>

      <ModernCardContent>
        {/* Legend */}
        <div className="flex items-center justify-between mb-4 p-3 bg-vyndo-neutral-50 rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-vyndo-neutral-600">Capital Intensity:</span>
              <div className="flex space-x-1">
                <div className="w-4 h-4 bg-vyndo-success-300 rounded-sm"></div>
                <div className="w-4 h-4 bg-vyndo-warning-300 rounded-sm"></div>
                <div className="w-4 h-4 bg-vyndo-warning-400 rounded-sm"></div>
                <div className="w-4 h-4 bg-vyndo-danger-400 rounded-sm"></div>
                <div className="w-4 h-4 bg-vyndo-danger-500 rounded-sm"></div>
              </div>
              <span className="text-xs text-vyndo-neutral-600">High</span>
            </div>
          </div>
          <div className="text-xs text-vyndo-neutral-600">
            Size = Units • Color = Value
          </div>
        </div>

        {/* Treemap Grid */}
        <div className="grid grid-cols-6 grid-rows-4 gap-2 h-80">
          {treemapData.nodes.map((node) => (
            <button
              key={node.id}
              onClick={() => handleNodeClick(node)}
              className={cn(
                'relative rounded-lg p-3 transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer border border-white/20',
                node.color,
                node.textColor,
                getGridSize(node.percentage)
              )}
              title={`${node.name}\nUnits: ${node.units.toLocaleString()}\nValue: ₹${node.estimatedValue.toLocaleString('en-IN')}\nPercentage: ${node.percentage.toFixed(1)}%`}
            >
              {/* Category Name */}
              <div className="text-xs font-semibold mb-1 truncate">
                {node.name}
              </div>
              
              {/* Units */}
              <div className="text-lg font-bold mb-1">
                {node.units > 1000000 
                  ? `${(node.units / 1000000).toFixed(1)}M`
                  : node.units > 1000
                  ? `${(node.units / 1000).toFixed(0)}K`
                  : node.units.toLocaleString()
                }
              </div>
              
              {/* Value */}
              <div className="text-xs opacity-90">
                ₹{node.estimatedValue > 1000000 
                  ? `${(node.estimatedValue / 1000000).toFixed(1)}M`
                  : node.estimatedValue > 100000
                  ? `${(node.estimatedValue / 100000).toFixed(1)}L`
                  : node.estimatedValue > 1000
                  ? `${(node.estimatedValue / 1000).toFixed(0)}K`
                  : node.estimatedValue.toLocaleString('en-IN')
                }
              </div>
              
              {/* Percentage */}
              <div className="absolute top-1 right-1 text-xs opacity-75">
                {node.percentage.toFixed(1)}%
              </div>
            </button>
          ))}
        </div>

        {/* Top Categories Summary */}
        <div className="mt-6 space-y-2">
          <h4 className="text-sm font-medium text-vyndo-neutral-700">
            Top Capital Concentrations
          </h4>
          <div className="space-y-1">
            {treemapData.nodes.slice(0, 3).map((node, index) => (
              <div key={node.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className={cn('w-3 h-3 rounded-sm', node.color)}></div>
                  <span className="text-vyndo-neutral-700 truncate max-w-[150px]">
                    {index + 1}. {node.name}
                  </span>
                </div>
                <div className="text-vyndo-neutral-600">
                  ₹{(node.estimatedValue / 100000).toFixed(1)}L ({node.percentage.toFixed(1)}%)
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strategic Insights */}
        <div className="mt-6 p-4 bg-vyndo-danger-50 border border-vyndo-danger-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-vyndo-danger-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-vyndo-danger-800 mb-1">
                Capital Optimization Alert
              </h4>
              <p className="text-sm text-vyndo-danger-700">
                Red areas show where the largest portion of Vyndo's working capital is trapped. 
                Focus on moving these high-value, slow-moving categories to optimize cash flow 
                and reduce inventory carrying costs.
              </p>
            </div>
          </div>
        </div>
      </ModernCardContent>
    </ModernCard>
  );
};

export default CapitalTreemap;