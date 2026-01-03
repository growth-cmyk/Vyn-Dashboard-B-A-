import React, { forwardRef } from 'react';
import { cn } from '../utils/cn';

export interface ModernCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'elevated' | 'flat' | 'interactive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  gradient?: boolean;
  children: React.ReactNode;
  asChild?: boolean;
}

/**
 * ModernCard - A versatile card component with glassmorphism and elevation effects
 * 
 * Variants:
 * - glass: High-transparency for background elements with backdrop blur
 * - elevated: High-shadow for critical action items (like 'Restock Now')
 * - flat: Minimal styling for subtle content containers
 * - interactive: Hover animations with scale and translate effects
 * 
 * Sizes:
 * - sm: Compact cards for KPI metrics
 * - md: Standard cards for most content
 * - lg: Large cards for detailed information
 * - xl: Extra large cards for dashboard sections
 */
export const ModernCard = forwardRef<HTMLDivElement, ModernCardProps>(
  ({ 
    variant = 'elevated', 
    size = 'md', 
    gradient = false, 
    className, 
    children, 
    asChild = false,
    ...props 
  }, ref) => {
    
    // Base styles that apply to all variants - LARGE ROUNDED CORNERS
    const baseStyles = cn(
      'rounded-2xl border transition-smooth', // Changed to rounded-2xl (16px)
      'focus-within:ring-2 focus-within:ring-vyndo-primary-500 focus-within:ring-offset-2',
      // Size variants
      {
        'p-3': size === 'sm',
        'p-4': size === 'md', 
        'p-6': size === 'lg',
        'p-8': size === 'xl',
      }
    );

    // Variant-specific styles - SUBTLE BORDERS, NO HARSH BLACK
    const variantStyles = cn({
      // Glass variant - Real glassmorphism with subtle borders
      'glass-card border-slate-200/60 dark:glass-card-dark dark:border-slate-600/40': variant === 'glass',
      
      // Elevated variant - Glassmorphism with elevation
      'glass-card border-slate-200/60 shadow-elevated dark:glass-card-dark dark:border-slate-600/40 dark:shadow-elevated hover:elevated-lg hover:shadow-elevated-lg': variant === 'elevated',
      
      // Flat variant - Minimal glassmorphism
      'glass-card border-slate-200/40 shadow-sm dark:glass-card-dark dark:border-slate-600/30': variant === 'flat',
      
      // Interactive variant - Hover animations with glassmorphism
      'interactive-card glass-card border-slate-200/60 shadow-sm dark:glass-card-dark dark:border-slate-600/40 hover:-translate-y-1 hover:scale-[1.01] cursor-pointer active:translate-y-0 active:scale-100': variant === 'interactive',
    });

    // Gradient overlay styles
    const gradientStyles = cn({
      'relative overflow-hidden': gradient,
      'before:absolute before:inset-0 before:bg-gradient-to-br before:from-vyndo-primary-50/50 before:to-vyndo-success-50/50 before:pointer-events-none': gradient,
      'dark:before:from-vyndo-primary-900/20 dark:before:to-vyndo-success-900/20': gradient,
    });

    // Combine all styles
    const cardStyles = cn(baseStyles, variantStyles, gradientStyles, className);

    const cardContent = (
      <div 
        ref={ref}
        className={cardStyles}
        {...props}
      >
        {gradient && <div className="relative z-10">{children}</div>}
        {!gradient && children}
      </div>
    );

    return cardContent;
  }
);

ModernCard.displayName = 'ModernCard';

/**
 * ModernCardHeader - Header section for cards with consistent styling
 */
export interface ModernCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const ModernCardHeader = forwardRef<HTMLDivElement, ModernCardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 pb-4', className)}
      {...props}
    >
      {children}
    </div>
  )
);

ModernCardHeader.displayName = 'ModernCardHeader';

/**
 * ModernCardTitle - Title component with proper typography
 */
export interface ModernCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export const ModernCardTitle = forwardRef<HTMLHeadingElement, ModernCardTitleProps>(
  ({ className, children, level = 3, ...props }, ref) => {
    const headingProps = {
      ref: ref as any,
      className: cn(
        'font-semibold leading-none tracking-tight text-vyndo-neutral-900 dark:text-vyndo-neutral-100',
        {
          'text-2xl': level === 1,
          'text-xl': level === 2,
          'text-lg': level === 3,
          'text-base': level === 4,
          'text-sm': level === 5,
          'text-xs': level === 6,
        },
        className
      ),
      ...props,
      children
    };

    switch (level) {
      case 1:
        return <h1 {...headingProps} />;
      case 2:
        return <h2 {...headingProps} />;
      case 3:
        return <h3 {...headingProps} />;
      case 4:
        return <h4 {...headingProps} />;
      case 5:
        return <h5 {...headingProps} />;
      case 6:
        return <h6 {...headingProps} />;
      default:
        return <h3 {...headingProps} />;
    }
  }
);

ModernCardTitle.displayName = 'ModernCardTitle';

/**
 * ModernCardDescription - Description text with muted styling
 */
export interface ModernCardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export const ModernCardDescription = forwardRef<HTMLParagraphElement, ModernCardDescriptionProps>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-vyndo-neutral-600 dark:text-vyndo-neutral-400', className)}
      {...props}
    >
      {children}
    </p>
  )
);

ModernCardDescription.displayName = 'ModernCardDescription';

/**
 * ModernCardContent - Main content area
 */
export interface ModernCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const ModernCardContent = forwardRef<HTMLDivElement, ModernCardContentProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('pt-0', className)}
      {...props}
    >
      {children}
    </div>
  )
);

ModernCardContent.displayName = 'ModernCardContent';

/**
 * ModernCardFooter - Footer section for actions
 */
export interface ModernCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const ModernCardFooter = forwardRef<HTMLDivElement, ModernCardFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-4', className)}
      {...props}
    >
      {children}
    </div>
  )
);

ModernCardFooter.displayName = 'ModernCardFooter';

/**
 * ReplenishmentCard - Specialized card for displaying reorder quantities
 * This component ensures data accuracy from ReplenishmentService without rounding errors
 */
export interface ReplenishmentCardProps {
  itemName: string;
  currentStock: number;
  reorderQuantity: number;
  daysOfCover: number;
  salesVelocity: number;
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
  onReorderClick?: () => void;
}

export const ReplenishmentCard = forwardRef<HTMLDivElement, ReplenishmentCardProps>(
  ({ 
    itemName, 
    currentStock, 
    reorderQuantity, 
    daysOfCover, 
    salesVelocity,
    urgencyLevel,
    onReorderClick,
    ...props 
  }, ref) => {
    
    // Determine card variant based on urgency
    const getCardVariant = (): ModernCardProps['variant'] => {
      switch (urgencyLevel) {
        case 'critical':
          return 'elevated'; // High shadow for critical items
        case 'high':
          return 'interactive'; // Interactive for high priority
        default:
          return 'flat'; // Minimal for lower priority
      }
    };

    // Get urgency styling
    const getUrgencyStyles = () => {
      switch (urgencyLevel) {
        case 'critical':
          return {
            borderColor: 'border-vyndo-danger-200',
            textColor: 'text-vyndo-danger-700',
            bgColor: 'bg-vyndo-danger-50',
            badgeColor: 'bg-vyndo-danger-500 text-white'
          };
        case 'high':
          return {
            borderColor: 'border-vyndo-warning-200',
            textColor: 'text-vyndo-warning-700',
            bgColor: 'bg-vyndo-warning-50',
            badgeColor: 'bg-vyndo-warning-500 text-white'
          };
        case 'medium':
          return {
            borderColor: 'border-vyndo-primary-200',
            textColor: 'text-vyndo-primary-700',
            bgColor: 'bg-vyndo-primary-50',
            badgeColor: 'bg-vyndo-primary-500 text-white'
          };
        default:
          return {
            borderColor: 'border-vyndo-neutral-200',
            textColor: 'text-vyndo-neutral-700',
            bgColor: 'bg-vyndo-neutral-50',
            badgeColor: 'bg-vyndo-neutral-500 text-white'
          };
      }
    };

    const urgencyStyles = getUrgencyStyles();

    return (
      <ModernCard
        ref={ref}
        variant={getCardVariant()}
        className={cn('border-l-4 rounded-2xl', urgencyStyles.borderColor)} // Added rounded-2xl
        {...props}
      >
        <ModernCardHeader>
          <div className="flex items-center justify-between">
            <ModernCardTitle level={4} className="truncate">
              {itemName}
            </ModernCardTitle>
            <span className={cn('px-2 py-1 rounded-2xl text-xs font-medium', urgencyStyles.badgeColor)}> {/* Changed to rounded-2xl */}
              {urgencyLevel.toUpperCase()}
            </span>
          </div>
        </ModernCardHeader>

        <ModernCardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-xs text-vyndo-neutral-500 uppercase tracking-wide">Current Stock</div>
              <div className="text-lg font-mono font-semibold text-vyndo-neutral-900 dark:text-vyndo-neutral-100">
                {currentStock.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-vyndo-neutral-500 uppercase tracking-wide">Days of Cover</div>
              <div className={cn('text-lg font-mono font-semibold', urgencyStyles.textColor)}>
                {daysOfCover === Infinity ? '∞' : Math.round(daysOfCover * 10) / 10}
              </div>
            </div>
          </div>

          <div className={cn('p-3 rounded-2xl', urgencyStyles.bgColor)}> {/* Changed to rounded-2xl */}
            <div className="text-xs text-vyndo-neutral-600 uppercase tracking-wide mb-1">
              Recommended Reorder Quantity
            </div>
            <div className="text-2xl font-mono font-bold text-vyndo-neutral-900 dark:text-vyndo-neutral-100">
              {/* Preserve exact reorderQuantity from ReplenishmentService without rounding */}
              {reorderQuantity.toLocaleString()}
            </div>
            <div className="text-xs text-vyndo-neutral-500 mt-1">
              Based on {salesVelocity.toFixed(2)} units/day velocity
            </div>
          </div>
        </ModernCardContent>

        {onReorderClick && (
          <ModernCardFooter>
            <button
              onClick={onReorderClick}
              className={cn(
                'w-full px-4 py-2 rounded-2xl font-medium text-sm transition-smooth', // Changed to rounded-2xl
                'focus:outline-none focus:ring-2 focus:ring-offset-2',
                urgencyLevel === 'critical' 
                  ? 'bg-vyndo-danger-500 hover:bg-vyndo-danger-600 text-white focus:ring-vyndo-danger-500'
                  : 'bg-vyndo-primary-500 hover:bg-vyndo-primary-600 text-white focus:ring-vyndo-primary-500'
              )}
            >
              {urgencyLevel === 'critical' ? 'Restock Now' : 'Create Purchase Order'}
            </button>
          </ModernCardFooter>
        )}
      </ModernCard>
    );
  }
);

ReplenishmentCard.displayName = 'ReplenishmentCard';