import React from 'react';
import { BentoGrid, BentoGridItem } from './BentoGrid';
import {
  InventoryHealthTrend,
  SalesPerformance,
  FourMonthGoalTracker,
  RestockUrgency,
  ExpiryRisk,
  TopPerformingLocation,
  ActiveSkuCount
} from './BentoKpiCards';
import type { InventoryItem, SalesRecord } from '../types';

export interface BentoDashboardProps {
  inventoryData: InventoryItem[];
  salesData: SalesRecord[];
  onRestockUrgencyClick?: () => void;
  onExpiryRiskClick?: () => void;
  onTopLocationClick?: (location: string) => void;
}

/**
 * BentoDashboard - Modern asymmetric dashboard layout
 * 
 * Layout Structure (Desktop 4x4 Grid):
 * ┌─────────────┬─────────────┬─────┬─────┐
 * │             │             │  3  │  4  │
 * │      1      │      2      ├─────┼─────┤
 * │  (Health)   │   (Sales)   │  5  │  6  │
 * │             │             │     │     │
 * ├─────────────┴─────────────┼─────┴─────┤
 * │                           │           │
 * │         Goal Tracker      │    7      │
 * │                           │           │
 * └───────────────────────────┴───────────┘
 * 
 * 1. Inventory Health Trend (2x2) - Primary
 * 2. Sales Performance (2x1) - Secondary  
 * 3. Restock Urgency (1x1) - Tertiary
 * 4. Expiry Risk (1x1) - Tertiary
 * 5. Top Location (1x1) - Tertiary
 * 6. Active SKUs (1x1) - Tertiary
 * 7. 4-Month Goal Tracker (2x1) - Secondary
 */
export const BentoDashboard: React.FC<BentoDashboardProps> = ({
  inventoryData,
  salesData,
  onRestockUrgencyClick,
  onExpiryRiskClick,
  onTopLocationClick
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100"> {/* Professional font weight */}
            Dashboard Overview
          </h2>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1"> {/* Professional font weight */}
            Real-time inventory and sales performance metrics
          </p>
        </div>
        
        {/* Data Status Indicator */}
        <div className="flex items-center space-x-4 text-sm font-medium text-slate-600 dark:text-slate-400"> {/* Professional font weight */}
          {inventoryData.length > 0 && (
            <span>{inventoryData.length.toLocaleString()} inventory items</span>
          )}
          {inventoryData.length > 0 && salesData.length > 0 && (
            <span className="text-slate-400">•</span>
          )}
          {salesData.length > 0 && (
            <span>{salesData.length.toLocaleString()} sales records</span>
          )}
        </div>
      </div>

      {/* Bento Grid Layout */}
      <BentoGrid>
        {/* Primary Slot: Inventory Health Trend (col-span-8 row-span-2) */}
        <BentoGridItem size="lg">
          <InventoryHealthTrend inventoryData={inventoryData} />
        </BentoGridItem>

        {/* Small KPIs: (col-span-4 each) */}
        <BentoGridItem size="sm">
          <RestockUrgency 
            inventoryData={inventoryData} 
            onClick={onRestockUrgencyClick}
          />
        </BentoGridItem>

        <BentoGridItem size="sm">
          <ExpiryRisk 
            inventoryData={inventoryData} 
            onClick={onExpiryRiskClick}
          />
        </BentoGridItem>

        <BentoGridItem size="sm">
          <TopPerformingLocation 
            salesData={salesData} 
            onClick={onTopLocationClick}
          />
        </BentoGridItem>

        <BentoGridItem size="sm">
          <ActiveSkuCount inventoryData={inventoryData} />
        </BentoGridItem>

        {/* Goal Tracker: (col-span-12) */}
        <BentoGridItem size="xl">
          <FourMonthGoalTracker inventoryData={inventoryData} />
        </BentoGridItem>

        {/* Secondary Slot: Sales Performance (col-span-6) */}
        <BentoGridItem size="md">
          <SalesPerformance salesData={salesData} />
        </BentoGridItem>
      </BentoGrid>

      {/* Strategic Insight Footer */}
      {inventoryData.length > 0 && (
        <div className="mt-8 p-4 bg-vyndo-primary-50/60 dark:bg-vyndo-primary-900/20 border border-vyndo-primary-200/60 dark:border-vyndo-primary-800/60 rounded-2xl"> {/* Subtle borders and large rounded corners */}
          <p className="text-sm font-medium text-vyndo-primary-800 dark:text-vyndo-primary-200"> {/* Professional font weight */}
            <strong>Strategic Focus:</strong> Click on metric cards to drill down into specific areas. 
            The dashboard automatically updates based on your inventory and sales data to provide 
            actionable insights aligned with Vyndo's 4-month optimization goals.
          </p>
        </div>
      )}
    </div>
  );
};

export default BentoDashboard;