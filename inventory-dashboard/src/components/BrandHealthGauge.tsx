/**
 * BrandHealthGauge - High-level brand health visualization for Executive View
 * 
 * Calculates brand health score using weighted formula:
 * - Stock Availability (40%)
 * - Turnover Rate (30%)
 * - Expiry Risk (20%)
 * - Replenishment Efficiency (10%)
 * 
 * Color Coding:
 * - 80-100: Excellent (Green)
 * - 60-79: Good (Light Green)
 * - 40-59: Warning (Yellow)
 * - 0-39: Critical (Red)
 * 
 * Requirements: 1.1, 8.1, 8.2
 */

import React from 'react';
import { VisualProgressRing } from './VisualProgressRing';

export interface BrandHealthMetrics {
  stockAvailability: number; // 0-100 percentage
  turnoverRate: number; // 0-100 percentage
  expiryRisk: number; // 0-100 percentage (inverted: lower is better)
  replenishmentEfficiency: number; // 0-100 percentage
}

export interface PlatformHealthScore {
  platform: 'Blinkit' | 'Amazon';
  score: number;
  color: string;
}

export interface BrandHealthGaugeProps {
  overallMetrics: BrandHealthMetrics;
  blinkitMetrics?: BrandHealthMetrics;
  amazonMetrics?: BrandHealthMetrics;
  showPlatformBreakdown?: boolean;
  trend?: 'up' | 'down' | 'stable';
  trendPercentage?: number;
  className?: string;
}

/**
 * Calculate brand health score using weighted formula
 */
export const calculateBrandHealthScore = (metrics: BrandHealthMetrics): number => {
  const {
    stockAvailability,
    turnoverRate,
    expiryRisk,
    replenishmentEfficiency,
  } = metrics;

  // Weighted calculation
  const score =
    stockAvailability * 0.4 + // 40% weight
    turnoverRate * 0.3 + // 30% weight
    (100 - expiryRisk) * 0.2 + // 20% weight (inverted: lower risk = higher score)
    replenishmentEfficiency * 0.1; // 10% weight

  return Math.round(Math.min(100, Math.max(0, score)));
};

/**
 * Get color based on score thresholds
 */
export const getScoreColor = (score: number): 'green' | 'yellow' | 'red' => {
  if (score >= 80) return 'green'; // Excellent
  if (score >= 60) return 'green'; // Good (light green, but using green)
  if (score >= 40) return 'yellow'; // Warning
  return 'red'; // Critical
};

/**
 * Get status label based on score
 */
export const getScoreLabel = (score: number): string => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Warning';
  return 'Critical';
};

export const BrandHealthGauge: React.FC<BrandHealthGaugeProps> = ({
  overallMetrics,
  blinkitMetrics,
  amazonMetrics,
  showPlatformBreakdown = true,
  trend,
  trendPercentage,
  className = '',
}) => {
  // Calculate overall score
  const overallScore = calculateBrandHealthScore(overallMetrics);
  const overallColor = getScoreColor(overallScore);
  const overallLabel = getScoreLabel(overallScore);

  // Calculate platform scores
  const blinkitScore = blinkitMetrics
    ? calculateBrandHealthScore(blinkitMetrics)
    : null;
  const amazonScore = amazonMetrics
    ? calculateBrandHealthScore(amazonMetrics)
    : null;

  // Trend icon
  const getTrendIcon = () => {
    if (!trend || trend === 'stable') return '→';
    if (trend === 'up') return '↑';
    return '↓';
  };

  const getTrendColor = () => {
    if (!trend || trend === 'stable') return 'text-gray-500';
    if (trend === 'up') return 'text-green-600';
    return 'text-red-600';
  };

  return (
    <div className={`flex flex-col items-center gap-6 p-6 ${className}`}>
      {/* Main Gauge */}
      <div className="flex flex-col items-center gap-3">
        <h3 className="text-lg font-semibold text-gray-700">
          Brand Health Score
        </h3>
        
        <VisualProgressRing
          value={overallScore}
          max={100}
          size="large"
          color={overallColor}
          showPercentage={false}
          className="relative"
        />
        
        <div className="flex flex-col items-center gap-1">
          <div className="text-3xl font-bold text-gray-900">
            {overallScore}
            <span className="text-lg text-gray-500">/100</span>
          </div>
          
          <div
            className={`text-sm font-medium ${
              overallColor === 'green'
                ? 'text-green-600'
                : overallColor === 'yellow'
                ? 'text-yellow-600'
                : 'text-red-600'
            }`}
          >
            {overallLabel}
          </div>
          
          {trend && trendPercentage !== undefined && (
            <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
              <span className="text-lg">{getTrendIcon()}</span>
              <span>{Math.abs(trendPercentage)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Platform Breakdown */}
      {showPlatformBreakdown && (blinkitScore !== null || amazonScore !== null) && (
        <div className="w-full border-t pt-6">
          <h4 className="text-sm font-medium text-gray-600 mb-4 text-center">
            Platform Breakdown
          </h4>
          
          <div className="flex justify-center gap-8">
            {/* Blinkit Score */}
            {blinkitScore !== null && (
              <div className="flex flex-col items-center gap-2">
                <VisualProgressRing
                  value={blinkitScore}
                  max={100}
                  size="small"
                  color={getScoreColor(blinkitScore)}
                  showPercentage={false}
                />
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-700">
                    Blinkit
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {blinkitScore}
                  </div>
                </div>
              </div>
            )}

            {/* Amazon Score */}
            {amazonScore !== null && (
              <div className="flex flex-col items-center gap-2">
                <VisualProgressRing
                  value={amazonScore}
                  max={100}
                  size="small"
                  color={getScoreColor(amazonScore)}
                  showPercentage={false}
                />
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-700">
                    Amazon
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {amazonScore}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metrics Breakdown */}
      <div className="w-full border-t pt-4">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Stock Availability:</span>
            <span className="font-semibold">{Math.round(overallMetrics.stockAvailability)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Turnover Rate:</span>
            <span className="font-semibold">{Math.round(overallMetrics.turnoverRate)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Expiry Risk:</span>
            <span className="font-semibold">{Math.round(overallMetrics.expiryRisk)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Replenishment:</span>
            <span className="font-semibold">{Math.round(overallMetrics.replenishmentEfficiency)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
