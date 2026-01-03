import React, { Suspense, lazy } from 'react';
import { ModernCard, ModernCardContent } from './ModernCard';
import { LoadingTimeline } from './LoadingTimeline';

// Lazy load the EnhancedCharts component
const EnhancedCharts = lazy(() => import('./EnhancedCharts').then(module => ({ default: module.EnhancedCharts })));

interface LazyEnhancedChartsProps {
  inventoryData: any[];
  salesData: any[];
}

/**
 * LazyEnhancedCharts - Lazy-loaded version of EnhancedCharts for better performance
 * Reduces initial bundle size and improves dashboard load time
 */
export const LazyEnhancedCharts: React.FC<LazyEnhancedChartsProps> = (props) => {
  return (
    <Suspense 
      fallback={
        <ModernCard variant="glass" className="h-96">
          <ModernCardContent className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto">
                <LoadingTimeline isActive={true} onComplete={() => {}} />
              </div>
              <div className="text-sm text-vyndo-neutral-600 dark:text-slate-400">
                Loading advanced charts...
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>
      }
    >
      <EnhancedCharts {...props} />
    </Suspense>
  );
};

export default LazyEnhancedCharts;