import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { Calendar, MapPin, TrendingUp, BarChart3, PieChart, History, Sparkles } from 'lucide-react';
import type { InventoryItem, SalesRecord, TimePeriod, CumulativeHistoryData, Platform } from '../types';
import { AnalyticsService } from '../services';
import { HistoryService } from '../services/HistoryService';
import { TIME_PERIOD, STOCK_STATUS } from '../types';
import { EnhancedCharts } from './EnhancedCharts';
import { TopSkuMovementChart } from './TopSkuMovementChart';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale
);

interface ChartsProps {
  inventoryData: InventoryItem[];
  salesData: SalesRecord[];
  timePeriod?: TimePeriod;
  activeFilterLabel?: string;
  onDrillDown?: (type: 'location' | 'sku' | 'status', value: string) => void;
  cumulativeHistory?: CumulativeHistoryData | null;
  platform?: Platform;
}

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface ChartContainerProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const ChartContainer: React.FC<ChartContainerProps> = ({ title, icon, children, className = '' }) => (
  <div className={`glass-card border-slate-200/60 rounded-2xl mt-8 mb-8 ${className}`}> {/* Added consistent top and bottom margins */}
    <div className="px-6 py-4 border-b border-slate-200/60"> {/* Subtle border */}
      <h3 className="text-lg font-semibold text-slate-900 flex items-center"> {/* Professional font weight */}
        {icon}
        <span className="ml-2">{title}</span>
      </h3>
    </div>
    <div className="p-6"> {/* Removed fixed height to allow for proper spacing */}
      {children}
    </div>
  </div>
);

export const Charts: React.FC<ChartsProps> = ({ 
  inventoryData, 
  salesData, 
  timePeriod, 
  activeFilterLabel, 
  onDrillDown,
  cumulativeHistory,
  platform 
}) => {
  // Use the timePeriod prop directly instead of local state to ensure proper synchronization
  const selectedTimePeriod = timePeriod || TIME_PERIOD.LAST_30_DAYS;
  
  // State for chart view mode
  const [isEnhancedMode, setIsEnhancedMode] = useState(true);
  
  // State for date range filtering (only for file-based history)
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });

  // Reset date range when cumulative history changes
  React.useEffect(() => {
    if (cumulativeHistory) {
      setDateRange({ startDate: null, endDate: null });
    }
  }, [cumulativeHistory]);

  // Get time period label for display
  const getTimePeriodLabel = (period: TimePeriod): string => {
    switch (period) {
      case TIME_PERIOD.LAST_7_DAYS:
        return 'Last 7 Days';
      case TIME_PERIOD.LAST_15_DAYS:
        return 'Last 15 Days';
      case TIME_PERIOD.LAST_30_DAYS:
        return 'Last 30 Days';
      case TIME_PERIOD.MONTH_TO_DATE:
        return 'Month to Date';
      case TIME_PERIOD.YEAR_TO_DATE:
        return 'Year to Date';
      case TIME_PERIOD.LAST_MONTH:
        return 'Last Month';
      default:
        return 'All Time';
    }
  };
  
  // Use the activeFilterLabel from parent or fallback to local function
  const displayLabel = activeFilterLabel || getTimePeriodLabel(selectedTimePeriod);

  // Generate inventory health trend data from history
  const inventoryHealthTrendData = useMemo(() => {
    // Prioritize file-based cumulative history over localStorage snapshots
    if (cumulativeHistory && cumulativeHistory.uploadDates.length > 0) {
      // Use file-based dates for immediate chart population
      let trendData = HistoryService.generateFileBasedTrendData(cumulativeHistory, platform);
      
      // Apply date range filtering if specified
      if (dateRange.startDate || dateRange.endDate) {
        const filteredLabels: string[] = [];
        const filteredDatasets = trendData.datasets.map(dataset => ({
          ...dataset,
          data: [] as number[]
        }));

        // Sort dates to ensure chronological order
        const sortedDates = [...cumulativeHistory.uploadDates].sort((a, b) => a.getTime() - b.getTime());
        
        sortedDates.forEach((date, index) => {
          const isInRange = (!dateRange.startDate || date >= dateRange.startDate) &&
                           (!dateRange.endDate || date <= dateRange.endDate);
          
          if (isInRange) {
            filteredLabels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            trendData.datasets.forEach((dataset, datasetIndex) => {
              filteredDatasets[datasetIndex].data.push(dataset.data[index] || 0);
            });
          }
        });

        trendData = {
          labels: filteredLabels,
          datasets: filteredDatasets
        };
      }
      
      return {
        labels: trendData.labels,
        datasets: [
          {
            label: 'Total Units',
            data: trendData.datasets[0]?.data || [],
            borderColor: '#ef5326', // Vyndo Orange
            backgroundColor: 'rgba(239, 83, 38, 0.1)',
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#ef5326',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            fill: false,
          },
          {
            label: 'Out of Stock Items',
            data: trendData.datasets[1]?.data || [],
            borderColor: '#D90429', // Alert Red
            backgroundColor: 'rgba(217, 4, 41, 0.1)',
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: '#D90429',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            fill: false,
          },
          {
            label: 'Expiry Risk Items (>90 Days DOC)',
            data: trendData.datasets[2]?.data || [],
            borderColor: '#FFB703', // Harvest Gold
            backgroundColor: 'rgba(255, 183, 3, 0.1)',
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: '#FFB703',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            fill: false,
          }
        ]
      };
    }

    // Fallback to localStorage-based snapshots for backward compatibility
    const snapshots = HistoryService.getInventorySnapshots();
    
    if (snapshots.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    // Sort snapshots by timestamp for chronological progression
    const sortedSnapshots = snapshots.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    const labels = sortedSnapshots.map(snapshot => 
      snapshot.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );

    return {
      labels,
      datasets: [
        {
          label: 'Total Units',
          data: sortedSnapshots.map(s => s.totalUnits),
          borderColor: '#ef5326', // Vyndo Orange
          backgroundColor: 'rgba(239, 83, 38, 0.1)',
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#ef5326',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          fill: false,
        },
        {
          label: 'Out of Stock Items',
          data: sortedSnapshots.map(s => s.outOfStockCount),
          borderColor: '#D90429', // Alert Red
          backgroundColor: 'rgba(217, 4, 41, 0.1)',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: '#D90429',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          fill: false,
        },
        {
          label: 'Expiry Risk Items (>90 Days DOC)',
          data: sortedSnapshots.map(s => s.expiryRiskCount),
          borderColor: '#FFB703', // Harvest Gold
          backgroundColor: 'rgba(255, 183, 3, 0.1)',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: '#FFB703',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          fill: false,
        }
      ]
    };
  }, [cumulativeHistory, platform, dateRange]);

  const inventoryHealthTrendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        bottom: 40 // Extra padding for X-axis labels
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 12,
            weight: 500,
          },
          color: '#1A1A1A',
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 600,
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label;
            const value = context.parsed.y;
            if (label === 'Total Units') {
              return `${label}: ${value.toLocaleString()} units`;
            }
            return `${label}: ${value} items`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        title: {
          display: true,
          text: 'Date',
          font: {
            size: 12,
            weight: 600,
          },
          color: '#6B7280',
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#6B7280',
          autoSkip: true,
          maxTicksLimit: 10,
          maxRotation: 45, // Rotate labels to prevent overlap
          minRotation: 0
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        title: {
          display: true,
          text: 'Count',
          font: {
            size: 12,
            weight: 600,
          },
          color: '#6B7280',
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#6B7280',
          callback: function(value: any) {
            if (value >= 1000000) {
              return (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
              return (value / 1000).toFixed(0) + 'K';
            }
            return value;
          },
        },
      },
    },
  };

  // Calculate inventory levels by location
  const inventoryByLocation = useMemo(() => {
    const locationMap = new Map<string, { totalStock: number; itemCount: number; locations: string[] }>();
    
    inventoryData.forEach(item => {
      const locationKey = item.warehouseFacilityName;
      if (!locationMap.has(locationKey)) {
        locationMap.set(locationKey, { 
          totalStock: 0, 
          itemCount: 0, 
          locations: [item.warehouseFacilityId] 
        });
      }
      const location = locationMap.get(locationKey)!;
      location.totalStock += item.totalSellable;
      location.itemCount += 1;
    });

    return locationMap;
  }, [inventoryData]);

  // Calculate stock status distribution (Updated for Strategic Roadmap)
  const stockStatusDistribution = useMemo(() => {
    const statusCounts = {
      [STOCK_STATUS.OUT_OF_STOCK]: 0,
      [STOCK_STATUS.UNDERSTOCK]: 0,
      [STOCK_STATUS.HEALTHY]: 0,
      [STOCK_STATUS.OVERSTOCK]: 0,
      [STOCK_STATUS.EXPIRY_RISK]: 0,
    };

    inventoryData.forEach(item => {
      const analysis = AnalyticsService.analyzeStock(item);
      statusCounts[analysis.stockStatus]++;
    });

    return statusCounts;
  }, [inventoryData]);

  // Calculate sales data based on selected time period with proper granularity
  const salesChartData = useMemo(() => {
    if (salesData.length === 0) return { labels: [], revenues: [], isDaily: false };

    const now = new Date();
    let startDate: Date;
    let isDaily = false;
    
    // Determine time range and granularity
    switch (selectedTimePeriod) {
      case TIME_PERIOD.LAST_7_DAYS:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        isDaily = true;
        break;
      case TIME_PERIOD.LAST_15_DAYS:
        startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
        isDaily = true;
        break;
      case TIME_PERIOD.LAST_30_DAYS:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        isDaily = true;
        break;
      case TIME_PERIOD.MONTH_TO_DATE:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        isDaily = true;
        break;
      case TIME_PERIOD.YEAR_TO_DATE:
        // YTD starts from April for Vyndo business year
        startDate = new Date(now.getFullYear(), 3, 1); // April 1st
        isDaily = false; // Monthly for YTD
        break;
      case TIME_PERIOD.LAST_MONTH:
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate = lastMonth;
        isDaily = true;
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        isDaily = true;
    }

    if (isDaily) {
      // Generate complete daily range with zero-filling
      const dailyData = new Map<string, number>();
      const labels: string[] = [];
      const revenues: number[] = [];
      
      // Create all dates in range
      const currentDate = new Date(startDate);
      while (currentDate <= now) {
        const dayKey = currentDate.toISOString().split('T')[0];
        dailyData.set(dayKey, 0); // Initialize with 0
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Fill in actual sales data
      salesData.forEach(sale => {
        const saleDate = new Date(sale.orderDate);
        if (saleDate >= startDate && saleDate <= now) {
          const dayKey = saleDate.toISOString().split('T')[0];
          if (dailyData.has(dayKey)) {
            const grossAmount = sale.quantity * sale.sellingPrice;
            dailyData.set(dayKey, dailyData.get(dayKey)! + grossAmount);
          }
        }
      });

      // Convert to arrays maintaining chronological order
      const sortedEntries = Array.from(dailyData.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      
      sortedEntries.forEach(([dayKey, revenue]) => {
        const date = new Date(dayKey);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        revenues.push(revenue);
      });

      return { labels, revenues, isDaily: true };
    } else {
      // Monthly data for YTD (April to current month)
      const monthlyData = new Map<string, number>();
      const labels: string[] = [];
      const revenues: number[] = [];
      
      // Create all months from April to current month
      const currentMonth = new Date(startDate);
      while (currentMonth <= now) {
        const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
        monthlyData.set(monthKey, 0); // Initialize with 0
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }
      
      // Fill in actual sales data
      salesData.forEach(sale => {
        const saleDate = new Date(sale.orderDate);
        if (saleDate >= startDate && saleDate <= now) {
          const monthKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
          if (monthlyData.has(monthKey)) {
            const grossAmount = sale.quantity * sale.sellingPrice;
            monthlyData.set(monthKey, monthlyData.get(monthKey)! + grossAmount);
          }
        }
      });

      // Convert to arrays maintaining chronological order
      const sortedEntries = Array.from(monthlyData.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      
      sortedEntries.forEach(([monthKey, revenue]) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
        revenues.push(revenue);
      });

      return { labels, revenues, isDaily: false };
    }
  }, [salesData, selectedTimePeriod]);

  // Calculate sales by location for selected period (using already filtered sales data)
  const salesByLocationData = useMemo(() => {
    return AnalyticsService.aggregateSalesByLocation(salesData, selectedTimePeriod);
  }, [salesData, selectedTimePeriod]);

  // Inventory Level Chart by Location
  const inventoryChartData = {
    labels: Array.from(inventoryByLocation.keys()),
    datasets: [
      {
        label: 'Total Stock Units',
        data: Array.from(inventoryByLocation.values()).map(loc => loc.totalStock),
        backgroundColor: 'rgba(239, 83, 38, 0.8)', // Vyndo Orange
        borderColor: '#ef5326',
        borderWidth: 1,
      },
      {
        label: 'Item Count',
        data: Array.from(inventoryByLocation.values()).map(loc => loc.itemCount),
        backgroundColor: 'rgba(45, 106, 79, 0.8)', // Millet Green
        borderColor: '#2D6A4F',
        borderWidth: 1,
        yAxisID: 'y1',
      },
    ],
  };

  const inventoryChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        bottom: 40 // Extra padding for rotated X-axis labels
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          afterLabel: (context: any) => {
            if (context.datasetIndex === 0) {
              return `${context.parsed.y.toLocaleString()} units`;
            }
            return `${context.parsed.y} items`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Warehouse Locations',
        },
        ticks: {
          maxRotation: 45, // Rotate labels to prevent overlap
          minRotation: 45
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Stock Units',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Item Count',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
    onClick: (_event: any, elements: any[]) => {
      if (elements.length > 0 && onDrillDown) {
        const index = elements[0].index;
        const locationName = Array.from(inventoryByLocation.keys())[index];
        onDrillDown('location', locationName);
      }
    },
  };

  // Sales Trend Chart (Daily or Monthly based on time period)
  const salesTrendData = {
    labels: salesChartData.labels,
    datasets: [
      {
        label: 'Sum of Revenue',
        data: salesChartData.revenues,
        borderColor: '#ef5326', // Vyndo Orange
        backgroundColor: 'rgba(239, 83, 38, 0.1)',
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#ef5326',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        fill: true,
      },
    ],
  };

  const salesTrendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        bottom: 40 // Extra padding for X-axis labels
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 12,
            weight: 500,
          },
          color: '#1A1A1A',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 600,
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          label: (context: any) => {
            return `Revenue: ₹${context.parsed.y.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        title: {
          display: true,
          text: salesChartData.isDaily ? 'Day' : 'Month',
          font: {
            size: 12,
            weight: 600,
          },
          color: '#6B7280',
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#6B7280',
          autoSkip: true,
          maxTicksLimit: 10,
          maxRotation: 45, // Rotate labels to prevent overlap
          minRotation: 0
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        title: {
          display: true,
          text: 'Sum of Revenue (₹)',
          font: {
            size: 12,
            weight: 600,
          },
          color: '#6B7280',
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#6B7280',
          callback: function(value: any) {
            if (value >= 1000000) {
              return '₹' + (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
              return '₹' + (value / 1000).toFixed(0) + 'K';
            }
            return '₹' + value;
          },
        },
      },
    },
  };

  // Stock Status Distribution Pie Chart (Updated for Strategic Roadmap)
  const stockStatusData = {
    labels: ['Out of Stock', 'Restock Now', 'Healthy', 'Freeze POs', 'Flash Promo'],
    datasets: [
      {
        data: [
          stockStatusDistribution[STOCK_STATUS.OUT_OF_STOCK],
          stockStatusDistribution[STOCK_STATUS.UNDERSTOCK],
          stockStatusDistribution[STOCK_STATUS.HEALTHY],
          stockStatusDistribution[STOCK_STATUS.OVERSTOCK],
          stockStatusDistribution[STOCK_STATUS.EXPIRY_RISK],
        ],
        backgroundColor: [
          '#D90429',   // Alert Red for out of stock
          '#FFB703',   // Harvest Gold for understock (restock now)
          '#2D6A4F',   // Millet Green for healthy
          '#FFB703',   // Harvest Gold for overstock (freeze POs)
          '#D90429',   // Alert Red for expiry risk (flash promo)
        ],
        borderColor: [
          '#D90429',
          '#FFB703',
          '#2D6A4F',
          '#FFB703',
          '#D90429',
        ],
        borderWidth: 2,
      },
    ],
  };

  const stockStatusOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const total = context.dataset.data.reduce((sum: number, value: number) => sum + value, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${context.parsed} items (${percentage}%)`;
          },
        },
      },
    },
    onClick: (_event: any, elements: any[]) => {
      if (elements.length > 0 && onDrillDown) {
        const index = elements[0].index;
        const statusLabels = ['out-of-stock', 'understock', 'healthy', 'overstock', 'expiry-risk'];
        onDrillDown('status', statusLabels[index]);
      }
    },
  };

  // Sales by Location Chart for Selected Period
  const locationSalesData = {
    labels: Array.from(salesByLocationData.keys()),
    datasets: [
      {
        label: 'Revenue (₹)',
        data: Array.from(salesByLocationData.values()).map(data => data.totalRevenue),
        backgroundColor: 'rgba(45, 106, 79, 0.8)', // Millet Green
        borderColor: '#2D6A4F',
        borderWidth: 1,
      },
    ],
  };

  const locationSalesOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        bottom: 40 // Extra padding for X-axis labels
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          afterLabel: (context: any) => {
            const locationData = Array.from(salesByLocationData.values())[context.dataIndex];
            return [
              `Quantity: ${locationData.totalQuantity.toLocaleString()} units`,
              `Items: ${locationData.itemCount} different products`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Locations',
        },
        ticks: {
          maxRotation: 45, // Rotate labels to prevent overlap
          minRotation: 45
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Revenue (₹)',
        },
      },
    },
    onClick: (_event: any, elements: any[]) => {
      if (elements.length > 0 && onDrillDown) {
        const index = elements[0].index;
        const locationName = Array.from(salesByLocationData.keys())[index];
        onDrillDown('location', locationName);
      }
    },
  };

  if (inventoryData.length === 0 && salesData.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-vyndo-text mb-2">No Data for Charts</h3>
        <p className="text-sm mb-4">Upload inventory and sales data to view interactive charts and visualizations.</p>
        <button className="glass-card border-slate-200/60 text-vyndo-primary-600 px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-vyndo-primary-50 transition-colors"> {/* Glassmorphism, large rounded corners, professional font weight */}
          Upload Data to Start
        </button>
      </div>
    );
  }

  // Enhanced Charts Mode - Use the new advanced visualization suite
  if (isEnhancedMode) {
    return (
      <div className="space-y-6">
        {/* View Mode Toggle */}
        <div className="glass-card border-slate-200/60 rounded-2xl p-4"> {/* Glassmorphism and large rounded corners */}
          <div className="flex items-center justify-between">
            <h2 style={{ 
              fontSize: '20px', /* Reduced from text-xl */
              fontWeight: 'bold', 
              color: '#1F2937',
              display: 'flex',
              alignItems: 'center'
            }}>
              <BarChart3 style={{ width: '20px', height: '20px', marginRight: '8px', color: '#3B82F6' }} />
              Interactive Charts & Visualizations
            </h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-600"> {/* Professional font weight */}
                  Filtered by: {displayLabel}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsEnhancedMode(true)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '9999px',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    backgroundColor: isEnhancedMode ? '#ef5326' : 'transparent',
                    color: isEnhancedMode ? 'white' : '#64748b',
                    boxShadow: isEnhancedMode ? '0 4px 12px rgba(239, 83, 38, 0.4)' : 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => {
                    if (!isEnhancedMode) {
                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                      e.currentTarget.style.color = '#374151';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isEnhancedMode) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#64748b';
                    }
                  }}
                >
                  <Sparkles style={{ width: '16px', height: '16px' }} />
                  <span>Enhanced</span>
                </button>
                <button
                  onClick={() => setIsEnhancedMode(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '9999px',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    backgroundColor: !isEnhancedMode ? '#ef5326' : 'transparent',
                    color: !isEnhancedMode ? 'white' : '#64748b',
                    boxShadow: !isEnhancedMode ? '0 4px 12px rgba(239, 83, 38, 0.4)' : 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => {
                    if (isEnhancedMode) {
                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                      e.currentTarget.style.color = '#374151';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (isEnhancedMode) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#64748b';
                    }
                  }}
                >
                  <BarChart3 style={{ width: '16px', height: '16px' }} />
                  <span>Classic</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Charts Component */}
        <EnhancedCharts
          inventoryData={inventoryData}
          salesData={salesData}
          onDrillDown={onDrillDown}
          cumulativeHistory={cumulativeHistory}
          platform={platform}
        />
      </div>
    );
  }

  // Classic Charts Mode - Original implementation
  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="glass-card border-slate-200/60 rounded-2xl p-4"> {/* Glassmorphism and large rounded corners */}
        <div className="flex items-center justify-between">
          <h2 style={{ 
            fontSize: '20px', /* Reduced from text-xl */
            fontWeight: 'bold', 
            color: '#1F2937',
            display: 'flex',
            alignItems: 'center'
          }}>
            <BarChart3 style={{ width: '20px', height: '20px', marginRight: '8px', color: '#3B82F6' }} />
            Interactive Charts & Visualizations
          </h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-600"> {/* Professional font weight */}
                Filtered by: {displayLabel}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsEnhancedMode(true)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  backgroundColor: isEnhancedMode ? '#ef5326' : 'transparent',
                  color: isEnhancedMode ? 'white' : '#64748b',
                  boxShadow: isEnhancedMode ? '0 4px 12px rgba(239, 83, 38, 0.4)' : 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => {
                  if (!isEnhancedMode) {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                    e.currentTarget.style.color = '#374151';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isEnhancedMode) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#64748b';
                  }
                }}
              >
                <Sparkles style={{ width: '16px', height: '16px' }} />
                <span>Enhanced</span>
              </button>
              <button
                onClick={() => setIsEnhancedMode(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  backgroundColor: !isEnhancedMode ? '#ef5326' : 'transparent',
                  color: !isEnhancedMode ? 'white' : '#64748b',
                  boxShadow: !isEnhancedMode ? '0 4px 12px rgba(239, 83, 38, 0.4)' : 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => {
                  if (isEnhancedMode) {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                    e.currentTarget.style.color = '#374151';
                  }
                }}
                onMouseOut={(e) => {
                  if (isEnhancedMode) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#64748b';
                  }
                }}
              >
                <BarChart3 style={{ width: '16px', height: '16px' }} />
                <span>Classic</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid with proper spacing */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 space-y-12">
        {/* Strategic Insights Section - Contained */}
        <div className="xl:col-span-2 mb-8">
          <div className="bg-slate-50 p-4 rounded-2xl mb-8">
            <p className="text-sm font-medium text-blue-800">
              <strong>Strategic Insight:</strong> This trend shows if our 4-month strategy is reducing overstock. 
              Declining expiry risk items (&gt;90 days DOC) indicates successful inventory optimization.
            </p>
          </div>
        </div>

        {/* Inventory Health Trend - Strategic Roadmap Feature */}
        {inventoryHealthTrendData.labels.length > 0 && (
          <ChartContainer
            title="Inventory Health Trend"
            icon={<History className="h-5 w-5 text-blue-600" />}
            className="xl:col-span-2 mt-12 mb-12"
          >
            {/* Date Range Selector for File-Based History */}
            {cumulativeHistory && cumulativeHistory.uploadDates.length > 1 && (
              <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-slate-700">Historical Date Range Filter</h4>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <label className="text-xs text-slate-600">Start Date:</label>
                      <input
                        type="date"
                        value={dateRange.startDate ? dateRange.startDate.toISOString().split('T')[0] : ''}
                        min={cumulativeHistory.earliestDate.toISOString().split('T')[0]}
                        max={cumulativeHistory.latestDate.toISOString().split('T')[0]}
                        onChange={(e) => setDateRange(prev => ({ 
                          ...prev, 
                          startDate: e.target.value ? new Date(e.target.value) : null 
                        }))}
                        className="text-xs border border-slate-300 rounded px-2 py-1"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-xs text-slate-600">End Date:</label>
                      <input
                        type="date"
                        value={dateRange.endDate ? dateRange.endDate.toISOString().split('T')[0] : ''}
                        min={cumulativeHistory.earliestDate.toISOString().split('T')[0]}
                        max={cumulativeHistory.latestDate.toISOString().split('T')[0]}
                        onChange={(e) => setDateRange(prev => ({ 
                          ...prev, 
                          endDate: e.target.value ? new Date(e.target.value) : null 
                        }))}
                        className="text-xs border border-slate-300 rounded px-2 py-1"
                      />
                    </div>
                    <button
                      onClick={() => setDateRange({ startDate: null, endDate: null })}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Clear Filter
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Available range: {cumulativeHistory.earliestDate.toLocaleDateString()} to {cumulativeHistory.latestDate.toLocaleDateString()}
                  {(dateRange.startDate || dateRange.endDate) && (
                    <span className="ml-2 text-blue-600">
                      • Filtered: {dateRange.startDate?.toLocaleDateString() || 'Start'} to {dateRange.endDate?.toLocaleDateString() || 'End'}
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="h-[400px] w-full relative pb-16"> {/* Increased height and bottom padding for X-axis labels */}
              <Line data={inventoryHealthTrendData} options={inventoryHealthTrendOptions} />
            </div>
          </ChartContainer>
        )}

        {/* Inventory Levels by Location */}
        {inventoryData.length > 0 && (
          <ChartContainer
            title="Inventory Levels by Location"
            icon={<MapPin className="h-5 w-5 text-blue-600" />}
            className="xl:col-span-2 mt-12 mb-12"
          >
            <div className="h-[400px] w-full relative pb-16"> {/* Increased height and bottom padding for X-axis labels */}
              <Bar data={inventoryChartData} options={inventoryChartOptions} />
            </div>
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <p className="text-sm font-medium text-slate-600">
                Click on bars to drill down into location details
              </p>
            </div>
          </ChartContainer>
        )}

        {/* Sales Trends */}
        {salesData.length > 0 && (
          <ChartContainer
            title={`Sales Trends - ${displayLabel}`}
            icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
            className="mt-12 mb-12"
          >
            <div className="h-[400px] w-full relative pb-16"> {/* Increased height and bottom padding for X-axis labels */}
              <Line data={salesTrendData} options={salesTrendOptions} />
            </div>
          </ChartContainer>
        )}

        {/* Stock Status Distribution */}
        {inventoryData.length > 0 && (
          <ChartContainer
            title="Stock Status Distribution"
            icon={<PieChart className="h-5 w-5 text-blue-600" />}
            className="mt-12 mb-12"
          >
            <div className="h-[400px] w-full relative pb-16"> {/* Increased height and bottom padding */}
              <Doughnut data={stockStatusData} options={stockStatusOptions} />
            </div>
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <p className="text-sm font-medium text-slate-600">
                Click on segments to filter by stock status
              </p>
            </div>
          </ChartContainer>
        )}

        {/* Sales by Location for Selected Period */}
        {salesData.length > 0 && (
          <ChartContainer
            title={`Sales by Location - ${displayLabel}`}
            icon={<BarChart3 className="h-5 w-5 text-blue-600" />}
            className="xl:col-span-2 mt-12 mb-12"
          >
            <div className="h-[400px] w-full relative pb-16"> {/* Increased height and bottom padding for X-axis labels */}
              <Bar data={locationSalesData} options={locationSalesOptions} />
            </div>
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <p className="text-sm font-medium text-slate-600">
                Click on bars to drill down into location sales details
              </p>
            </div>
          </ChartContainer>
        )}

        {/* Top SKU Multi-City Movement Chart - Hero SKU Strategy */}
        {salesData.length > 0 && (
          <div className="xl:col-span-2 mt-12 mb-12">
            <TopSkuMovementChart 
              salesData={salesData}
            />
          </div>
        )}
      </div>

      {/* Chart Summary with proper spacing */}
      <div className="glass-card border-slate-200/60 rounded-2xl p-6 mt-12"> {/* Added top margin */}
        <h3 className="text-lg font-semibold text-slate-900 mb-4"> {/* Professional font weight */}
          Chart Insights
        </h3>
        <div className="mb-6 p-4 bg-blue-50/60 border border-blue-200/60 rounded-2xl"> {/* Increased margin and padding */}
          <p className="text-sm font-medium text-blue-800"> {/* Professional font weight */}
            <strong>Current Filter:</strong> {displayLabel} 
            {salesData.length > 0 && ` • ${salesData.length} sales records`}
            {inventoryHealthTrendData.labels.length > 0 && ` • ${inventoryHealthTrendData.labels.length} days of history captured`}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {inventoryData.length > 0 && (
            <>
              <div>
                <p className="font-semibold text-slate-600">Total Locations</p> {/* Professional font weight */}
                <p className="font-semibold text-slate-900">{inventoryByLocation.size}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-600">Items Needing Attention</p> {/* Professional font weight */}
                <p className="font-semibold text-red-600">
                  {stockStatusDistribution[STOCK_STATUS.OUT_OF_STOCK] + 
                   stockStatusDistribution[STOCK_STATUS.UNDERSTOCK]}
                </p>
              </div>
            </>
          )}
          {salesData.length > 0 && (
            <>
              <div>
                <p className="font-semibold text-slate-600">Sales Locations</p> {/* Professional font weight */}
                <p className="font-semibold text-slate-900">{salesByLocationData.size}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-600">Period Revenue</p> {/* Professional font weight */}
                <p className="font-semibold text-green-600">
                  ₹{Array.from(salesByLocationData.values())
                    .reduce((sum, data) => sum + data.totalRevenue, 0)
                    .toLocaleString('en-IN')}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};