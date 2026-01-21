/**
 * VisualProgressRing - Circular SVG progress indicator
 * 
 * Features:
 * - Dynamic color coding: Green (>50%), Yellow (ROP-50%), Red (<ROP)
 * - Smooth animations
 * - Size variants: small (60px), medium (100px), large (150px)
 * - Percentage display
 * 
 * Requirements: 6.1
 */

import React from 'react';

export interface VisualProgressRingProps {
  value: number; // Current value
  max: number; // Maximum value
  rop?: number; // Reorder Point threshold (optional)
  size?: 'small' | 'medium' | 'large';
  color?: 'green' | 'yellow' | 'red' | 'auto'; // 'auto' uses ROP-based coloring
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

const SIZE_CONFIG = {
  small: { diameter: 60, strokeWidth: 6, fontSize: 'text-xs' },
  medium: { diameter: 100, strokeWidth: 8, fontSize: 'text-sm' },
  large: { diameter: 150, strokeWidth: 10, fontSize: 'text-lg' },
};

const COLOR_MAP = {
  green: '#10b981', // Emerald green
  yellow: '#f59e0b', // Amber yellow
  red: '#ef4444', // Red
};

export const VisualProgressRing: React.FC<VisualProgressRingProps> = ({
  value,
  max,
  rop,
  size = 'medium',
  color = 'auto',
  label,
  showPercentage = true,
  className = '',
}) => {
  const config = SIZE_CONFIG[size];
  const { diameter, strokeWidth, fontSize } = config;
  
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Determine color based on ROP thresholds
  const getColor = (): string => {
    if (color !== 'auto') {
      return COLOR_MAP[color];
    }

    // Auto color based on ROP and percentage
    if (rop !== undefined) {
      const ropPercentage = (rop / max) * 100;
      
      if (value < rop) {
        return COLOR_MAP.red; // Below ROP = Critical (Red)
      } else if (percentage <= 50) {
        return COLOR_MAP.yellow; // ROP to 50% = Warning (Yellow)
      } else {
        return COLOR_MAP.green; // Above 50% = Healthy (Green)
      }
    }

    // Fallback: percentage-based coloring without ROP
    if (percentage > 50) {
      return COLOR_MAP.green;
    } else if (percentage > 20) {
      return COLOR_MAP.yellow;
    } else {
      return COLOR_MAP.red;
    }
  };

  const ringColor = getColor();

  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
      <svg
        width={diameter}
        height={diameter}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
        
        {/* Center text */}
        <text
          x={diameter / 2}
          y={diameter / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className={`${fontSize} font-semibold fill-current transform rotate-90`}
          style={{ transformOrigin: `${diameter / 2}px ${diameter / 2}px` }}
        >
          {showPercentage ? `${Math.round(percentage)}%` : value}
        </text>
      </svg>
      
      {label && (
        <span className="text-xs text-gray-600 text-center max-w-[120px]">
          {label}
        </span>
      )}
    </div>
  );
};
