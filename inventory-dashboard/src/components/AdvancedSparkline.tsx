import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../utils/cn';

export interface SparklineDataPoint {
  value: number;
  date?: Date;
  label?: string;
}

export interface AdvancedSparklineProps {
  data: SparklineDataPoint[];
  width?: number;
  height?: number;
  showTrend?: boolean;
  showLastValue?: boolean;
  className?: string;
  strokeWidth?: number;
}

/**
 * AdvancedSparkline - Reusable sparkline component with trend-based coloring
 * 
 * Features:
 * - Millet Green for growth trends
 * - Vyndo Red for decline trends
 * - Neutral for flat trends
 * - Smooth SVG path rendering
 * - Optional trend indicators and last value display
 */
export const AdvancedSparkline: React.FC<AdvancedSparklineProps> = ({
  data,
  width = 120,
  height = 40,
  showTrend = true,
  showLastValue = false,
  className,
  strokeWidth = 2
}) => {
  const sparklineData = useMemo(() => {
    if (data.length < 2) {
      return {
        path: '',
        trend: 'flat' as const,
        trendPercentage: 0,
        lastValue: data[0]?.value || 0,
        color: 'stroke-vyndo-neutral-400'
      };
    }

    // Calculate min/max for normalization
    const values = data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue;

    // Handle flat line case
    if (valueRange === 0) {
      const y = height / 2;
      const path = `M 0 ${y} L ${width} ${y}`;
      return {
        path,
        trend: 'flat' as const,
        trendPercentage: 0,
        lastValue: data[data.length - 1].value,
        color: 'stroke-vyndo-neutral-400'
      };
    }

    // Generate SVG path
    const stepX = width / (data.length - 1);
    let path = '';

    data.forEach((point, index) => {
      const x = index * stepX;
      const y = height - ((point.value - minValue) / valueRange) * height;
      
      if (index === 0) {
        path += `M ${x} ${y}`;
      } else {
        path += ` L ${x} ${y}`;
      }
    });

    // Calculate trend
    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const trendPercentage = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
    
    let trend: 'up' | 'down' | 'flat';
    let color: string;
    
    if (Math.abs(trendPercentage) < 1) {
      trend = 'flat';
      color = 'stroke-vyndo-neutral-400';
    } else if (trendPercentage > 0) {
      trend = 'up';
      color = 'stroke-vyndo-success-500'; // Millet Green
    } else {
      trend = 'down';
      color = 'stroke-vyndo-danger-500'; // Vyndo Red
    }

    return {
      path,
      trend,
      trendPercentage,
      lastValue,
      color
    };
  }, [data, width, height]);

  const getTrendIcon = () => {
    switch (sparklineData.trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-vyndo-success-600" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-vyndo-danger-600" />;
      default:
        return <Minus className="h-3 w-3 text-vyndo-neutral-500" />;
    }
  };

  const getTrendColor = () => {
    switch (sparklineData.trend) {
      case 'up':
        return 'text-vyndo-success-600';
      case 'down':
        return 'text-vyndo-danger-600';
      default:
        return 'text-vyndo-neutral-500';
    }
  };

  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ width, height }}>
        <div className="text-xs text-vyndo-neutral-400">No data</div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {/* Sparkline SVG */}
      <div className="relative" style={{ width, height }}>
        <svg
          width={width}
          height={height}
          className="overflow-visible"
          viewBox={`0 0 ${width} ${height}`}
        >
          {/* Background grid (optional) */}
          <defs>
            <pattern
              id="sparkline-grid"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 10 0 L 0 0 0 10"
                fill="none"
                stroke="rgba(0,0,0,0.05)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          
          {/* Main sparkline path */}
          <path
            d={sparklineData.path}
            fill="none"
            className={cn(sparklineData.color, 'transition-colors duration-300')}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Data points (for hover) */}
          {data.length <= 10 && data.map((point, index) => {
            const values = data.map(d => d.value);
            const minValue = Math.min(...values);
            const maxValue = Math.max(...values);
            const valueRange = maxValue - minValue;
            
            if (valueRange === 0) return null;
            
            const x = (index / (data.length - 1)) * width;
            const y = height - ((point.value - minValue) / valueRange) * height;
            
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="2"
                className={cn(
                  sparklineData.color.replace('stroke-', 'fill-'),
                  'opacity-0 hover:opacity-100 transition-opacity duration-200'
                )}
              >
                <title>
                  {point.label || `Point ${index + 1}`}: {point.value.toLocaleString()}
                  {point.date && ` (${point.date.toLocaleDateString()})`}
                </title>
              </circle>
            );
          })}
        </svg>
      </div>

      {/* Trend Indicator */}
      {showTrend && (
        <div className="flex items-center space-x-1">
          {getTrendIcon()}
          <span className={cn('text-xs font-medium', getTrendColor())}>
            {Math.abs(sparklineData.trendPercentage) < 0.1 
              ? '0%' 
              : `${sparklineData.trendPercentage > 0 ? '+' : ''}${sparklineData.trendPercentage.toFixed(1)}%`
            }
          </span>
        </div>
      )}

      {/* Last Value */}
      {showLastValue && (
        <div className="text-xs font-medium text-vyndo-neutral-700">
          {sparklineData.lastValue.toLocaleString()}
        </div>
      )}
    </div>
  );
};

/**
 * SparklineCard - Wrapper component for sparklines in cards
 */
export interface SparklineCardProps {
  title: string;
  data: SparklineDataPoint[];
  currentValue?: number;
  unit?: string;
  className?: string;
}

export const SparklineCard: React.FC<SparklineCardProps> = ({
  title,
  data,
  currentValue,
  unit = '',
  className
}) => {
  return (
    <div className={cn('p-3 bg-white rounded-lg border border-vyndo-neutral-200', className)}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-vyndo-neutral-700">{title}</h4>
        {currentValue !== undefined && (
          <span className="text-lg font-bold text-vyndo-neutral-900">
            {currentValue.toLocaleString()}{unit}
          </span>
        )}
      </div>
      <AdvancedSparkline
        data={data}
        width={100}
        height={30}
        showTrend={true}
        className="justify-end"
      />
    </div>
  );
};

export default AdvancedSparkline;