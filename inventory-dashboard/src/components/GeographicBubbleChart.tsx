/**
 * GeographicBubbleChart - Sales performance visualization by region
 * 
 * Features:
 * - Bubble size proportional to sales volume
 * - Color intensity based on ROI/growth rate
 * - Interactive click handlers for region details
 * - Supports Ahmedabad, Mumbai, Bangalore
 * 
 * Uses Vyndo brand orange (#ef5326) for color intensity
 * 
 * Requirements: 1.2, 9.1, 9.2, 9.3
 */

import React, { useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';

export interface GeographicDataPoint {
  region: 'Ahmedabad' | 'Mumbai' | 'Bangalore';
  salesVolume: number; // Total sales in units or revenue
  growthRate: number; // Percentage growth (0-100+)
  roi: number; // ROI percentage (can be negative)
  marketShare: number; // Percentage of total market
  x?: number; // X coordinate for positioning
  y?: number; // Y coordinate for positioning
}

export interface GeographicBubbleChartProps {
  data: GeographicDataPoint[];
  onBubbleClick?: (dataPoint: GeographicDataPoint) => void;
  showLegend?: boolean;
  height?: number;
  className?: string;
}

/**
 * Calculate bubble size based on sales volume
 * Returns a value between 400 and 4000 for proper visualization
 */
const calculateBubbleSize = (salesVolume: number, allVolumes: number[]): number => {
  const minVolume = Math.min(...allVolumes);
  const maxVolume = Math.max(...allVolumes);
  
  if (minVolume === maxVolume) return 2000; // All same size
  
  // Normalize to 400-4000 range
  const normalized = (salesVolume - minVolume) / (maxVolume - minVolume);
  return 400 + normalized * 3600;
};

/**
 * Calculate color intensity based on ROI
 * Returns hex color with varying opacity of Vyndo orange (#ef5326)
 */
const calculateColorIntensity = (roi: number, allROIs: number[]): string => {
  const minROI = Math.min(...allROIs);
  const maxROI = Math.max(...allROIs);
  
  if (minROI === maxROI) return '#ef5326'; // Default Vyndo orange
  
  // Normalize ROI to 0-1 range
  const normalized = (roi - minROI) / (maxROI - minROI);
  
  // Map to opacity: 0.3 (light) to 1.0 (dark)
  const opacity = 0.3 + normalized * 0.7;
  
  // Convert to rgba
  const r = 239; // #ef
  const g = 83;  // #53
  const b = 38;  // #26
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Assign X,Y coordinates for geographic positioning
 */
const assignCoordinates = (region: string): { x: number; y: number } => {
  // Rough geographic positioning (not to scale)
  const coordinates: Record<string, { x: number; y: number }> = {
    Ahmedabad: { x: 30, y: 40 }, // Northwest
    Mumbai: { x: 25, y: 60 }, // West coast
    Bangalore: { x: 50, y: 80 }, // South
  };
  
  return coordinates[region] || { x: 50, y: 50 };
};

export const GeographicBubbleChart: React.FC<GeographicBubbleChartProps> = ({
  data,
  onBubbleClick,
  showLegend = true,
  height = 400,
  className = '',
}) => {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Prepare data with coordinates and calculated sizes
  const allVolumes = data.map((d) => d.salesVolume);
  const allROIs = data.map((d) => d.roi);

  const chartData = data.map((point) => {
    const coords = assignCoordinates(point.region);
    return {
      ...point,
      x: coords.x,
      y: coords.y,
      z: calculateBubbleSize(point.salesVolume, allVolumes),
      color: calculateColorIntensity(point.roi, allROIs),
    };
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-2">{data.region}</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Sales Volume:</span>
            <span className="font-semibold">
              {data.salesVolume.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Growth Rate:</span>
            <span className="font-semibold text-green-600">
              {data.growthRate > 0 ? '+' : ''}
              {data.growthRate.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">ROI:</span>
            <span
              className={`font-semibold ${
                data.roi >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {data.roi > 0 ? '+' : ''}
              {data.roi.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Market Share:</span>
            <span className="font-semibold">{data.marketShare.toFixed(1)}%</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t text-xs text-gray-500">
          Click for details
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 100]}
            hide
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0, 100]}
            hide
          />
          <ZAxis
            type="number"
            dataKey="z"
            range={[400, 4000]}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              height={36}
              content={() => (
                <div className="flex justify-center gap-6 text-sm mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ef5326] opacity-30" />
                    <span className="text-gray-600">Low ROI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ef5326] opacity-65" />
                    <span className="text-gray-600">Medium ROI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ef5326]" />
                    <span className="text-gray-600">High ROI</span>
                  </div>
                </div>
              )}
            />
          )}

          <Scatter
            data={chartData}
            onClick={(data) => {
              if (onBubbleClick) {
                onBubbleClick(data);
              }
            }}
            onMouseEnter={(data) => setHoveredRegion(data.region)}
            onMouseLeave={() => setHoveredRegion(null)}
            cursor="pointer"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                stroke={hoveredRegion === entry.region ? '#1f2937' : 'transparent'}
                strokeWidth={hoveredRegion === entry.region ? 3 : 0}
                className="transition-all duration-200"
              />
            ))}
          </Scatter>

          {/* Region labels */}
          {chartData.map((entry, index) => (
            <text
              key={`label-${index}`}
              x={`${entry.x}%`}
              y={`${entry.y}%`}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs font-semibold fill-white pointer-events-none"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
            >
              {entry.region}
            </text>
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};
