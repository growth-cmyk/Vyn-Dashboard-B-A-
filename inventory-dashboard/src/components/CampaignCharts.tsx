import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp, Filter } from 'lucide-react';
import type { CampaignTrendData, FilterCriteria, TimePeriod } from '../types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CampaignChartsProps {
  trendData: CampaignTrendData[];
  isLoading?: boolean;
  className?: string;
  filters?: FilterCriteria;
  onFilterChange?: (filters: Partial<FilterCriteria>) => void;
  isFiltering?: boolean;
}

export const CampaignCharts: React.FC<CampaignChartsProps> = ({
  trendData,
  isLoading = false,
  className = '',
  filters = {},
  onFilterChange: _onFilterChange,
  isFiltering = false
}) => {
  // Helper function to get time period label
  const getTimePeriodLabel = (period?: TimePeriod): string => {
    switch (period) {
      case 'last-7-days':
        return 'Last 7 Days';
      case 'last-15-days':
        return 'Last 15 Days';
      case 'last-30-days':
        return 'Last 30 Days';
      case 'mtd':
        return 'Month to Date';
      case 'ytd':
        return 'Year to Date';
      case 'last-month':
        return 'Last Month';
      default:
        return 'All Time';
    }
  };

  // Show loading state when filtering or initial loading
  if (isLoading || isFiltering) {
    return (
      <div className={`bg-white/90 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-t-2 border-[#ef5326] rounded-3xl p-8 min-h-[400px] ${className}`}>
        <div className="flex items-center justify-center h-80 text-slate-500">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">
              {isFiltering ? 'Applying Filters' : 'Processing Trend Data'}
            </div>
            <div className="text-sm">
              {isFiltering ? 'Updating charts with filtered data...' : 'Analyzing campaign performance over time...'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (trendData.length === 0) {
    return (
      <div className={`bg-white/90 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-t-2 border-[#ef5326] rounded-3xl p-8 min-h-[400px] ${className}`}>
        <div className="flex items-center justify-center h-80 text-slate-500">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">
              {Object.keys(filters).length > 0 ? 'No Data Matches Filters' : 'No Campaign Data Available'}
            </div>
            <div className="text-sm">
              {Object.keys(filters).length > 0 
                ? 'Try adjusting your filter criteria to see trend data'
                : 'Upload campaign data to view trend analysis'
              }
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white/90 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-t-2 border-[#ef5326] rounded-3xl p-8 min-h-[400px] ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center">
          <TrendingUp className="h-6 w-6 mr-3 text-[#ef5326] stroke-[1.5]" />
          Spend vs Revenue Trend
          {filters.timePeriod && (
            <span className="ml-3 text-sm font-normal text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              {getTimePeriodLabel(filters.timePeriod)}
            </span>
          )}
        </h3>
        <div className="flex items-center space-x-6">
          {/* Filter indicator */}
          {Object.keys(filters).length > 0 && (
            <div className="flex items-center text-xs text-slate-500">
              <Filter className="h-3 w-3 mr-1" />
              <span>Filtered</span>
            </div>
          )}
          {/* Legend */}
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-[#ef5326] rounded-full mr-2 shadow-sm"></div>
              <span className="text-slate-600 font-medium">Ad Spend</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-[#2d6a4f] rounded-full mr-2 shadow-sm"></div>
              <span className="text-slate-600 font-medium">Revenue</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="h-80">
        <Line
          data={{
            labels: trendData.map(point => 
              new Date(point.date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })
            ),
            datasets: [
              {
                label: 'Ad Spend',
                data: trendData.map(point => point.adSpend),
                borderColor: '#ef5326', // Vyndo Orange
                backgroundColor: 'rgba(239, 83, 38, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                pointBackgroundColor: '#ef5326',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: false,
                yAxisID: 'y'
              },
              {
                label: 'Revenue',
                data: trendData.map(point => point.adRevenue),
                borderColor: '#2d6a4f', // Millet Green
                backgroundColor: 'rgba(45, 106, 79, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                pointBackgroundColor: '#2d6a4f',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: '+1',
                yAxisID: 'y1'
              }
            ]
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
              mode: 'index',
              intersect: false,
            },
            plugins: {
              legend: {
                display: false // Legend is handled by custom UI above
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                borderColor: '#374151',
                borderWidth: 1,
                cornerRadius: 8,
                displayColors: true,
                callbacks: {
                  label: function(context: any) {
                    const label = context.dataset.label || '';
                    const value = context.parsed?.y || 0;
                    return `${label}: ₹${value.toLocaleString()}`;
                  }
                }
              }
            },
            scales: {
              x: {
                display: true,
                grid: {
                  color: 'rgba(148, 163, 184, 0.1)',
                  display: true
                },
                ticks: {
                  autoSkip: true,
                  maxTicksLimit: 6,
                  color: '#64748b',
                  font: {
                    size: 12
                  }
                }
              },
              y: {
                type: 'linear',
                display: true,
                position: 'left',
                grid: {
                  color: 'rgba(148, 163, 184, 0.1)',
                  display: true
                },
                ticks: {
                  color: '#64748b',
                  font: {
                    size: 12
                  },
                  callback: function(value: any) {
                    const numValue = Number(value);
                    return '₹' + (numValue >= 1000 ? (numValue / 1000).toFixed(0) + 'K' : numValue);
                  }
                }
              },
              y1: {
                type: 'linear',
                display: true,
                position: 'right',
                grid: {
                  drawOnChartArea: false,
                },
                ticks: {
                  color: '#64748b',
                  font: {
                    size: 12
                  },
                  callback: function(value: any) {
                    const numValue = Number(value);
                    return '₹' + (numValue >= 1000 ? (numValue / 1000).toFixed(0) + 'K' : numValue);
                  }
                }
              }
            },
            elements: {
              line: {
                tension: 0.4
              }
            }
          }}
        />
      </div>
    </div>
  );
};