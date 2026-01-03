import React, { useMemo, useCallback, useState } from 'react';
import { ModernCard, ModernCardHeader, ModernCardTitle, ModernCardContent } from './ModernCard';
import { MapPin, Calendar, TrendingUp } from 'lucide-react';
import { cn } from '../utils/cn';
import type { SalesRecord } from '../types';

export interface SalesHeatmapProps {
  salesData: SalesRecord[];
  onCityClick?: (city: string) => void;
  className?: string;
}

interface HeatmapCell {
  date: string;
  city: string;
  revenue: number;
  intensity: number; // 0-1 normalized
  displayDate: string;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: {
    city: string;
    date: string;
    revenue: number;
  } | null;
}

/**
 * SalesHeatmap - Professional heatmap visualization for sales density analysis
 * 
 * Features:
 * - Clean visual grid with color-coded squares (no text clutter)
 * - Interactive tooltips on hover
 * - Professional legend with color scale
 * - Rotated date labels for better readability
 * - Dark mode support
 */
export const SalesHeatmap: React.FC<SalesHeatmapProps> = ({
  salesData,
  onCityClick,
  className
}) => {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: null
  });

  const heatmapData = useMemo(() => {
    if (salesData.length === 0) return { cells: [], cities: [], dates: [], maxRevenue: 0 };

    // Get date range (last 30 days or available data range)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Filter sales to last 30 days
    const recentSales = salesData.filter(sale => {
      const saleDate = new Date(sale.orderDate);
      return saleDate >= thirtyDaysAgo && saleDate <= now;
    });

    if (recentSales.length === 0) return { cells: [], cities: [], dates: [], maxRevenue: 0 };

    // Get unique cities and dates
    const cities = Array.from(new Set(recentSales.map(sale => sale.supplyCity)))
      .filter(city => city && city.trim() !== '')
      .sort();
    
    // Generate date range (last 14 days for better visualization)
    const dates: string[] = [];
    const displayDates: string[] = [];
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    for (let d = new Date(fourteenDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dates.push(dateStr);
      displayDates.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }

    // Create revenue map: city-date -> revenue
    const revenueMap = new Map<string, number>();
    let maxRevenue = 0;

    recentSales.forEach(sale => {
      const saleDate = new Date(sale.orderDate);
      const dateStr = saleDate.toISOString().split('T')[0];
      
      if (dates.includes(dateStr)) {
        const key = `${sale.supplyCity}-${dateStr}`;
        const revenue = sale.quantity * sale.sellingPrice;
        revenueMap.set(key, (revenueMap.get(key) || 0) + revenue);
        maxRevenue = Math.max(maxRevenue, revenueMap.get(key)!);
      }
    });

    // Create heatmap cells
    const cells: HeatmapCell[] = [];
    
    dates.forEach((date, dateIndex) => {
      cities.forEach(city => {
        const key = `${city}-${date}`;
        const revenue = revenueMap.get(key) || 0;
        const intensity = maxRevenue > 0 ? revenue / maxRevenue : 0;
        
        cells.push({
          date,
          city,
          revenue,
          intensity,
          displayDate: displayDates[dateIndex]
        });
      });
    });

    return {
      cells,
      cities: cities.slice(0, 8), // Limit to top 8 cities for better visualization
      dates: displayDates,
      maxRevenue
    };
  }, [salesData]);

  const handleCellHover = useCallback((
    event: React.MouseEvent,
    cell: HeatmapCell | null
  ) => {
    if (!cell) {
      setTooltip(prev => ({ ...prev, visible: false }));
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      content: {
        city: cell.city,
        date: cell.displayDate,
        revenue: cell.revenue
      }
    });
  }, []);

  const handleCellLeave = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  const handleCityClick = useCallback((city: string) => {
    onCityClick?.(city);
  }, [onCityClick]);

  if (heatmapData.cells.length === 0) {
    return (
      <ModernCard variant="elevated" className={cn('h-full', className)}>
        <ModernCardHeader>
          <ModernCardTitle level={3} className="flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-vyndo-primary-600" />
            Sales Density Heatmap
          </ModernCardTitle>
        </ModernCardHeader>
        <ModernCardContent>
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-sm text-slate-600">
              No recent sales data available for heatmap visualization
            </p>
          </div>
        </ModernCardContent>
      </ModernCard>
    );
  }

  // Calculate city totals for sorting
  const cityTotals = heatmapData.cities.map(city => {
    const total = heatmapData.cells
      .filter(cell => cell.city === city)
      .reduce((sum, cell) => sum + cell.revenue, 0);
    return { city, total };
  }).sort((a, b) => b.total - a.total);

  const sortedCities = cityTotals.map(item => item.city);

  return (
    <div className="relative">
      <ModernCard variant="elevated" className={cn('h-full', className)}>
        <ModernCardHeader>
          <div className="flex items-center justify-between">
            <ModernCardTitle level={3} className="flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-vyndo-primary-600" />
              Sales Density Heatmap
            </ModernCardTitle>
            <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
              <Calendar className="h-4 w-4 mr-1" />
              Last 14 days
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Revenue intensity by city and date. Hover for details, click cities to filter.
          </p>
        </ModernCardHeader>

        <ModernCardContent>
          {/* Professional Heatmap Grid - FIXED BREATHING ROOM */}
          <div className="overflow-x-auto">
            <div className="min-w-[800px]" style={{ marginTop: '60px' }}> {/* Added 60px margin for rotated labels */}
              {/* Header with rotated date labels */}
              <div className="grid grid-cols-[160px_repeat(14,1fr)] gap-3 mb-6 pb-16"> {/* Added pb-16 for rotated date spacing */}
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 p-2">
                  Cities
                </div>
                {heatmapData.dates.map((date, index) => (
                  <div key={index} className="flex justify-center h-16 items-end"> {/* Increased height and aligned to bottom */}
                    <span 
                      className="text-xs font-medium text-slate-600 dark:text-slate-400 transform -rotate-45 origin-bottom whitespace-nowrap"
                      style={{ transformOrigin: 'bottom center' }}
                    >
                      {date}
                    </span>
                  </div>
                ))}
              </div>

              {/* Heatmap rows with clean squares */}
              <div className="space-y-3"> {/* Increased row spacing */}
                {sortedCities.map(city => (
                  <div key={city} className="grid grid-cols-[160px_repeat(14,1fr)] gap-3 items-center"> {/* Increased city column width and gap */}
                    {/* Fixed width city label with SOLID WHITE BACKGROUND for sliding effect */}
                    <button
                      onClick={() => handleCityClick(city)}
                      style={{
                        width: '128px',
                        fontSize: '12px',
                        fontWeight: '600',
                        textAlign: 'left',
                        padding: '8px 16px 8px 8px',
                        borderRadius: '8px',
                        backgroundColor: 'white', /* SOLID WHITE BACKGROUND */
                        color: '#374151',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        lineHeight: '1.6',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        position: 'sticky',
                        left: 0,
                        zIndex: 10,
                        boxShadow: '2px 0 4px rgba(0,0,0,0.1)' /* Shadow for depth */
                      }}
                      title={city}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFF7ED';
                        e.currentTarget.style.color = '#ef5326';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.color = '#374151';
                      }}
                    >
                      {city}
                    </button>
                    
                    {/* Clean heat squares (no text) - HARDCODED STYLES FOR VISIBILITY */}
                    {heatmapData.dates.map((displayDate, dateIndex) => {
                      const cell = heatmapData.cells.find(c => 
                        c.city === city && c.displayDate === displayDate
                      );
                      
                      if (!cell) {
                        return (
                          <div
                            key={dateIndex}
                            style={{ 
                              width: '40px', 
                              height: '40px', 
                              backgroundColor: '#E5E7EB', 
                              borderRadius: '8px',
                              display: 'flex',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => handleCellHover(e, null)}
                            onMouseLeave={handleCellLeave}
                          />
                        );
                      }

                      // HARDCODED COLOR LOGIC FOR IMMEDIATE VISIBILITY
                      let backgroundColor = '#E5E7EB'; // Default gray
                      if (cell.revenue > 0) {
                        if (cell.intensity < 0.2) backgroundColor = '#FED7AA';      // Light orange
                        else if (cell.intensity < 0.4) backgroundColor = '#FDBA74'; // Medium light orange
                        else if (cell.intensity < 0.6) backgroundColor = '#FB923C'; // Medium orange
                        else if (cell.intensity < 0.8) backgroundColor = '#EA580C'; // Dark orange
                        else backgroundColor = '#ef5326'; // Vyndo Orange
                      }

                      return (
                        <div
                          key={dateIndex}
                          style={{ 
                            width: '40px', 
                            height: '40px', 
                            backgroundColor,
                            borderRadius: '8px',
                            display: 'flex',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: '1px solid rgba(0,0,0,0.1)'
                          }}
                          onMouseEnter={(e) => handleCellHover(e, cell)}
                          onMouseLeave={handleCellLeave}
                          onClick={() => handleCityClick(city)}
                          onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'scale(1.1)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Professional Legend */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Heat Scale:</span>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 dark:text-slate-500">₹0</span>
                <div className="flex space-x-1">
                  <div className="w-4 h-4 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"></div>
                  <div className="w-4 h-4 bg-orange-100 rounded border border-orange-200"></div>
                  <div className="w-4 h-4 bg-orange-200 rounded border border-orange-300"></div>
                  <div className="w-4 h-4 bg-orange-300 rounded border border-orange-400"></div>
                  <div className="w-4 h-4 bg-orange-400 rounded border border-orange-500"></div>
                  <div className="w-4 h-4 bg-orange-500 rounded border border-orange-600"></div>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-500">
                  ₹{heatmapData.maxRevenue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Strategic Insights */}
          <div className="mt-6 p-4 bg-vyndo-primary-50/60 dark:bg-vyndo-primary-900/20 border border-vyndo-primary-200/60 dark:border-vyndo-primary-800/60 rounded-2xl">
            <div className="flex items-start space-x-3">
              <TrendingUp className="h-5 w-5 text-vyndo-primary-600 dark:text-vyndo-primary-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-vyndo-primary-800 dark:text-vyndo-primary-200 mb-1">
                  Strategic Insight
                </h4>
                <p className="text-sm font-medium text-vyndo-primary-700 dark:text-vyndo-primary-300">
                  This heatmap reveals which warehouses are 'hot' and when. Use this data to move slow stock 
                  from low-performing locations to high-demand zones, optimizing inventory distribution 
                  according to Vyndo's Phase 2 roadmap.
                </p>
              </div>
            </div>
          </div>
        </ModernCardContent>
      </ModernCard>

      {/* Premium Tooltip */}
      {tooltip.visible && tooltip.content && (
        <div
          className="fixed z-[9999] px-3 py-2 bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-lg shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          <div className="font-semibold">{tooltip.content.city}</div>
          <div className="text-slate-300 dark:text-slate-400">{tooltip.content.date}</div>
          <div className="font-semibold text-orange-400">
            ₹{tooltip.content.revenue.toLocaleString('en-IN')}
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
        </div>
      )}
    </div>
  );
};

export default SalesHeatmap;