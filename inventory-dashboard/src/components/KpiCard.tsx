import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { ModernCard } from './ModernCard';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number[]; // 7-day trend data
  trendColor?: string;
  valueColor?: string;
  icon?: React.ReactNode;
  isLoading?: boolean;
  hasData?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  trend = [],
  trendColor = '#ef5326',
  valueColor,
  icon,
  isLoading = false,
  hasData = true
}) => {
  // Generate sparkline chart data
  const chartData = {
    labels: ['', '', '', '', '', '', ''], // Empty labels for clean look
    datasets: [
      {
        data: trend.length === 7 ? trend : [0, 0, 0, 0, 0, 0, 0],
        borderColor: trendColor,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 3,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#FFFFFF',
        titleColor: '#1A1A1A',
        bodyColor: '#1A1A1A',
        borderColor: '#ef5326',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: () => '',
          label: (context: any) => `Value: ${context.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
      },
    },
    elements: {
      point: {
        radius: 0,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  const displayValue = isLoading ? '...' : hasData ? value : '--';
  const displaySubtitle = isLoading ? 'Loading...' : hasData ? subtitle : 'No Data';

  return (
    <ModernCard variant="elevated" className="h-48 flex flex-col justify-between hover:shadow-lg transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {icon && (
          <div className="text-gray-400">
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex-1 flex flex-col justify-center">
        <div 
          className={`text-2xl font-semibold ${
            valueColor || 'text-vyndo-text'
          }`}
        >
          {displayValue}
        </div>
        {displaySubtitle && (
          <div className="text-sm text-gray-500 mt-1">
            {displaySubtitle}
          </div>
        )}
      </div>

      {/* Sparkline Chart */}
      {hasData && trend.length > 0 && (
        <div className="h-16 w-full mt-auto overflow-hidden">
          <Line data={chartData} options={chartOptions} />
        </div>
      )}

      {/* Empty state for chart */}
      {(!hasData || trend.length === 0) && (
        <div className="h-16 w-full mt-auto flex items-center justify-center">
          <div className="text-xs text-gray-400">
            {hasData ? 'No trend data' : 'Upload data to see trends'}
          </div>
        </div>
      )}
    </ModernCard>
  );
};