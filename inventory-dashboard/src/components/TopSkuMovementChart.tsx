import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp, Target, Star } from 'lucide-react';
import { ModernCard, ModernCardHeader, ModernCardTitle, ModernCardContent } from './ModernCard';
import type { SalesRecord } from '../types';
import { AnalyticsService } from '../services';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface TopSkuMovementChartProps {
  salesData: SalesRecord[];
}

/**
 * TopSkuMovementChart - Hero SKU Multi-City Movement Visualization
 * 
 * Features:
 * - Top 10 SKUs by revenue with pill selector
 * - Multi-line chart showing city-wise sales trends
 * - Interactive legend for city filtering
 * - Branded color palette with Vyndo Orange for top city
 */
export const TopSkuMovementChart: React.FC<TopSkuMovementChartProps> = ({
  salesData
}) => {
  const [selectedSkuId, setSelectedSkuId] = useState<string>('');

  // Get top SKU trends data
  const topSkuData = useMemo(() => {
    return AnalyticsService.getTopSkuCityTrends(salesData);
  }, [salesData]);

  // Set default selected SKU to the top one
  React.useEffect(() => {
    if (topSkuData.topSkus.length > 0 && !selectedSkuId) {
      setSelectedSkuId(topSkuData.topSkus[0].itemId);
    }
  }, [topSkuData.topSkus, selectedSkuId]);

  // Generate chart data for selected SKU
  const chartData = useMemo(() => {
    if (!selectedSkuId || !topSkuData.cityTrends.has(selectedSkuId)) {
      return { labels: [], datasets: [] };
    }

    const cityTrends = topSkuData.cityTrends.get(selectedSkuId)!;
    
    // Get all unique dates and sort them
    const allDates = new Set<string>();
    cityTrends.forEach(trends => {
      trends.forEach(trend => allDates.add(trend.date));
    });
    const sortedDates = Array.from(allDates).sort();

    // Create labels from dates
    const labels = sortedDates.map(date => {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    // Color palette - Vyndo Orange for top city, various shades for others
    const colors = [
      '#ef5326', // Vyndo Orange for top city
      '#2D6A4F', // Millet Green
      '#FFB703', // Harvest Gold
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#10B981', // Emerald
      '#6366F1', // Indigo
      '#EC4899', // Pink
    ];

    // Calculate total revenue by city to determine ranking
    const cityRevenues = new Map<string, number>();
    cityTrends.forEach((trends, city) => {
      const totalRevenue = trends.reduce((sum, trend) => sum + trend.revenue, 0);
      cityRevenues.set(city, totalRevenue);
    });

    // Sort cities by revenue (descending)
    const sortedCities = Array.from(cityRevenues.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([city]) => city);

    // Create datasets for each city
    const datasets = sortedCities.map((city, index) => {
      const trends = cityTrends.get(city) || [];
      
      // Create data array with proper alignment to dates
      const data = sortedDates.map(date => {
        const trend = trends.find(t => t.date === date);
        return trend ? trend.revenue : 0;
      });

      return {
        label: city,
        data,
        borderColor: colors[index % colors.length],
        backgroundColor: `${colors[index % colors.length]}20`, // 20% opacity
        tension: 0.4,
        borderWidth: index === 0 ? 3 : 2, // Thicker line for top city
        pointRadius: index === 0 ? 4 : 3,
        pointHoverRadius: index === 0 ? 6 : 5,
        pointBackgroundColor: colors[index % colors.length],
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        fill: false,
      };
    });

    return { labels, datasets };
  }, [selectedSkuId, topSkuData.cityTrends]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        bottom: 20
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
          padding: 15,
        },
        onClick: (_e: any, legendItem: any, legend: any) => {
          // Standard Chart.js legend click behavior for hiding/showing lines
          const index = legendItem.datasetIndex;
          const chart = legend.chart;
          const meta = chart.getDatasetMeta(index);
          
          meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : null;
          chart.update();
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
          title: (context: any) => {
            return `${context[0].label}`;
          },
          label: (context: any) => {
            const city = context.dataset.label;
            const revenue = context.parsed.y;
            return `${city}: ₹${revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
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
          text: 'Timeline',
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
          maxTicksLimit: 15,
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
          text: 'Revenue (₹)',
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

  if (topSkuData.topSkus.length === 0) {
    return (
      <ModernCard variant="glass" className="col-span-12">
        <ModernCardContent>
          <div className="text-center py-12 text-slate-500">
            <TrendingUp className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Sales Data Available</h3>
            <p className="text-sm">Upload sales data to view Top SKU Multi-City Movement trends.</p>
          </div>
        </ModernCardContent>
      </ModernCard>
    );
  }

  const selectedSku = topSkuData.topSkus.find(sku => sku.itemId === selectedSkuId);

  return (
    <ModernCard variant="glass" className="col-span-12 mt-12 mb-12">
      <ModernCardHeader>
        <div className="flex items-center justify-between mb-4">
          <ModernCardTitle level={3} className="flex items-center">
            <Star className="h-5 w-5 mr-2 text-vyndo-primary-600" />
            Top SKU Multi-City Movement
          </ModernCardTitle>
          <div className="flex items-center text-sm text-slate-600">
            <Target className="h-4 w-4 mr-1" />
            Hero SKU Strategy Analytics
          </div>
        </div>

        {/* SKU Selector Pills */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Top 10 SKUs by Revenue</h4>
          <div className="flex flex-wrap gap-2">
            {topSkuData.topSkus.map((sku, index) => (
              <button
                key={sku.itemId}
                onClick={() => setSelectedSkuId(sku.itemId)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                  ${selectedSkuId === sku.itemId
                    ? 'bg-vyndo-primary-500 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }
                `}
                title={`Revenue: ₹${sku.totalRevenue.toLocaleString('en-IN')}`}
              >
                <span className="flex items-center space-x-2">
                  <span className={`
                    w-2 h-2 rounded-full
                    ${index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-slate-300'}
                  `} />
                  <span className="truncate max-w-[120px]">{sku.itemName}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected SKU Info */}
        {selectedSku && (
          <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-semibold text-slate-900">{selectedSku.itemName}</h5>
                <p className="text-sm text-slate-600">
                  Total Revenue: ₹{selectedSku.totalRevenue.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Click legend cities to hide/show lines</p>
                <p className="text-xs text-slate-500">Thicker line = Top performing city</p>
              </div>
            </div>
          </div>
        )}
      </ModernCardHeader>

      <ModernCardContent>
        <div className="h-[450px] w-full relative">
          <Line data={chartData} options={chartOptions} />
        </div>

        {/* Strategic Insights */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start space-x-3">
            <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800 mb-1">
                Hero SKU Strategy Insights
              </h4>
              <p className="text-sm text-blue-700">
                Track your top-performing SKUs across multiple cities to identify expansion opportunities 
                and optimize inventory distribution. The thickest line represents your highest-revenue city 
                for the selected SKU. Use this data to focus marketing efforts and inventory allocation 
                on your most profitable products and locations.
              </p>
            </div>
          </div>
        </div>
      </ModernCardContent>
    </ModernCard>
  );
};

export default TopSkuMovementChart;