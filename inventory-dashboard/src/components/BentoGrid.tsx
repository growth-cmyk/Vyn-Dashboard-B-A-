import React from 'react';
import { cn } from '../utils/cn';

export interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

export interface BentoGridItemProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

/**
 * BentoGrid - Dynamic asymmetric grid layout for dashboard components
 * 
 * Grid Layout (Desktop - 12 columns):
 * - Primary Chart: col-span-8 row-span-2
 * - Small KPIs: col-span-4 
 * - Goal Tracker: col-span-12
 * 
 * Mobile: Stacks linearly for optimal touch interaction
 */
export const BentoGrid: React.FC<BentoGridProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cn(
      // Base grid setup - 12-column system
      'grid gap-6 w-full',
      // Desktop: 12-column asymmetric layout
      'lg:grid-cols-12 lg:auto-rows-min',
      // Tablet: 6-column layout
      'md:grid-cols-6 md:gap-5',
      // Mobile: Single column stack
      'grid-cols-1',
      // Animation support
      'transition-all duration-300 ease-out',
      className
    )}>
      {children}
    </div>
  );
};

/**
 * BentoGridItem - Individual grid item with size variants
 * 
 * Size Variants:
 * - sm (col-span-4): Small KPI cards
 * - md (col-span-6): Medium feature cards
 * - lg (col-span-8 row-span-2): Primary chart
 * - xl (col-span-12): Full width components
 */
export const BentoGridItem: React.FC<BentoGridItemProps> = ({ 
  children, 
  size = 'sm', 
  className,
  onClick 
}) => {
  const sizeClasses = cn({
    // Small (col-span-4) - KPI cards
    'lg:col-span-4 md:col-span-3': size === 'sm',
    
    // Medium (col-span-6) - Secondary features
    'lg:col-span-6 md:col-span-3': size === 'md',
    
    // Large (col-span-8 row-span-2) - Primary chart
    'lg:col-span-8 lg:row-span-2 md:col-span-6': size === 'lg',
    
    // Extra Large (col-span-12) - Full width
    'lg:col-span-12 md:col-span-6': size === 'xl',
  });

  const interactiveClasses = onClick ? 'cursor-pointer' : '';

  return (
    <div 
      className={cn(
        sizeClasses,
        interactiveClasses,
        // Entry animations
        'animate-in fade-in slide-in-from-bottom-4 duration-500',
        // Stagger animation delay based on size (larger items animate first)
        {
          'animation-delay-0': size === 'lg' || size === 'xl',
          'animation-delay-100': size === 'md',
          'animation-delay-200': size === 'sm',
        },
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

BentoGrid.displayName = 'BentoGrid';
BentoGridItem.displayName = 'BentoGridItem';